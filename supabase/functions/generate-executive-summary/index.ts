
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Configuration, OpenAIApi } from "https://esm.sh/openai@3.3.0"; // Using a specific version

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
if (!openAIApiKey) {
  console.error("Missing OPENAI_API_KEY environment variable.");
}

const configuration = new Configuration({
  apiKey: openAIApiKey,
});
const openai = new OpenAIApi(configuration);

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (!openAIApiKey) {
    return new Response(JSON.stringify({ error: "OpenAI API key not configured." }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const {
      assessmentName,
      address,
      overallSiteSignalScore,
      completionPercentage,
      detailedMetricScores, // Expected to be Map<string, { score: number | null; enteredValue: any; targetValue: any; higherIsBetter: boolean; label: string; category: string; notes?: string | null; imageUrl?: string | null }>
      siteVisitRatings, // Expected to be Array<{ criterion_key: string; rating_grade: string; notes?: string | null; rating_description?: string | null; label: string }>
      accountSignalGoodThreshold,
      accountSignalBadThreshold,
      metricCategories, // Array of string categories
      targetMetricSet // { user_custom_metrics_settings: [{ metric_identifier: string, label: string, category: string }] }
    } = await req.json();

    if (!assessmentName || !detailedMetricScores || !targetMetricSet) {
        return new Response(JSON.stringify({ error: "Missing required assessment data for summary generation." }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    console.log("Received data for summary generation:", { assessmentName, overallSiteSignalScore, completionPercentage });

    let metricsSummary = "Metric Scores by Category:\n";
    metricCategories.forEach((category: string) => {
      metricsSummary += `\nCategory: ${category}\n`;
      const settingsForCategory = targetMetricSet.user_custom_metrics_settings.filter((s: any) => s.category === category);
      settingsForCategory.forEach((setting: any) => {
        const detail = detailedMetricScores[setting.metric_identifier]; // Accessing map-like object
        if (detail) {
          metricsSummary += `- ${setting.label}: Score ${detail.score !== null ? detail.score.toFixed(2) : 'N/A'} (Entered: ${detail.enteredValue ?? 'N/A'}, Target: ${detail.targetValue ?? 'N/A'}, Higher is Better: ${detail.higherIsBetter ? 'Yes' : 'No'})\n`;
          if(detail.notes) metricsSummary += `  Notes: ${detail.notes}\n`;
        }
      });
    });

    let siteVisitSummary = "Site Visit Ratings:\n";
    if (siteVisitRatings && siteVisitRatings.length > 0) {
      siteVisitRatings.forEach((rating: any) => {
        siteVisitSummary += `- ${rating.label}: ${rating.rating_grade} (${rating.rating_description || 'No description'})\n`;
        if(rating.notes) siteVisitSummary += `  Notes: ${rating.notes}\n`;
      });
    } else {
      siteVisitSummary += "No site visit ratings provided or applicable.\n";
    }

    const prompt = `
      You are writing a plainspoken, concise executive summary of a site assessment for a retail or restaurant brand. Your tone should be friendly but conservative — helpful, realistic, and easy to understand for executives and non-technical users alike.

      Site Details:
      - Assessment Name: ${assessmentName}
      - Address: ${address || 'Not specified'}
      - Overall Site Signal Score: ${overallSiteSignalScore !== null ? overallSiteSignalScore.toFixed(2) : 'N/A'} (out of 1.0)
      - Assessment Completion: ${completionPercentage !== null ? completionPercentage.toFixed(2) + '%' : 'N/A'}
      - Signal Score Thresholds: Good > ${accountSignalGoodThreshold || 0.75}, Bad < ${accountSignalBadThreshold || 0.50}
      - Target Metric Set Used: ${targetMetricSet.name || 'Unknown'}

      ${metricsSummary}

      ${siteVisitSummary}

      The summary should follow this structure:

      1. **Headline Signal** (1–2 sentences):
      Briefly state how the site performed overall based on its scores across key metrics. Mention the name of the Target Metric Set used for the evaluation.

      2. **Strengths & How to Leverage Them** (3–5 sentences):
      Highlight 2–3 areas where the site performed particularly well. For each, explain how the brand might capitalize on these strengths (e.g., high foot traffic might support premium pricing or brand awareness).

      3. **Risks & How to Address Them** (3–5 sentences):
      Call out 1–3 areas where the site is underperforming or carries risk. For each, provide a practical recommendation for how the brand could mitigate the issue (e.g., additional marketing, staffing strategies, or renegotiating terms).

      4. **Closing Note & Disclaimer** (1 sentence):
      Wrap up with a cautious outlook or reinforcement of the site's overall signal — avoid making definitive recommendations like "go/no-go." End with this exact disclaimer:

      This summary was generated by AI based on available data and target metrics. It should be reviewed and validated by your internal team.

      Context You Must Consider When Generating the Summary:

      - Each metric has a "higher is better" or "lower is better" flag. Evaluate accordingly.
      - Don't assume what kind of brand it is unless explicitly stated, but feel free to note how strengths or weaknesses could align with different brand strategies (e.g., value vs premium).
      - Use language like "shows potential," "may benefit from," "suggests caution," rather than definitive terms like "will succeed" or "should open here."
      - Avoid technical jargon. Assume your reader has 60 seconds to scan this and wants actionable insights.
      - Do not invent data not provided. If specific data is missing for a section, acknowledge it or focus on available information.
    `;

    console.log("Sending prompt to OpenAI GPT-4o-mini. Prompt length:", prompt.length);

    const completion = await openai.createChatCompletion({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a commercial real estate analyst providing executive summaries for site assessments. Follow the exact structure and tone specified in the prompt." },
        { role: "user", content: prompt },
      ],
      temperature: 0.3, // Lower temperature for more consistent and conservative output
      max_tokens: 800, // Increased to accommodate the structured format
    });

    const generatedSummary = completion.data.choices[0].message?.content?.trim();
    console.log("OpenAI response received. Summary length:", generatedSummary?.length);

    if (!generatedSummary) {
      throw new Error("OpenAI returned an empty summary.");
    }

    return new Response(JSON.stringify({ executiveSummary: generatedSummary }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-executive-summary function:', error.response ? error.response.data : error.message);
    return new Response(JSON.stringify({ error: `Failed to generate summary: ${error.message}` }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
