
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
          metricsSummary += `- ${setting.label}: Score ${detail.score !== null ? detail.score.toFixed(2) : 'N/A'} (Entered: ${detail.enteredValue ?? 'N/A'}, Target: ${detail.targetValue ?? 'N/A'})\n`;
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
      Generate an executive summary for a commercial real estate site assessment.
      Focus on providing a general overview of the site's potential, highlighting major opportunities, recommending how to capitalize on them, calling out areas of risk, and suggesting mitigations.

      Site Details:
      - Assessment Name: ${assessmentName}
      - Address: ${address || 'Not specified'}
      - Overall Site Signal Score: ${overallSiteSignalScore !== null ? overallSiteSignalScore.toFixed(2) : 'N/A'} (out of 1.0)
      - Assessment Completion: ${completionPercentage !== null ? completionPercentage.toFixed(2) + '%' : 'N/A'}
      - Signal Score Thresholds: Good > ${accountSignalGoodThreshold || 0.75}, Bad < ${accountSignalBadThreshold || 0.50}

      ${metricsSummary}

      ${siteVisitSummary}

      Structure the summary with the following sections:
      1.  **Executive Overview:** A brief (2-3 sentences) overall assessment of the site's viability and potential based on the scores and data.
      2.  **Performance Highlights:** Identify the top 2-3 scoring categories or key metrics that stand out positively.
      3.  **Key Opportunities & Recommendations:** Based on strong performing areas or unmet potential, list 2-3 specific, actionable opportunities and how to capitalize on them.
      4.  **Areas of Risk & Mitigation Strategies:** Identify 2-3 categories or metrics that pose risks or performed poorly. Suggest specific, actionable mitigation strategies for each.
      5.  **Site Visit Insights Integration:** (If site visit data is available) Briefly incorporate key takeaways from the physical site visit ratings (e.g., visibility, accessibility, aesthetics) into the overall picture.
      6.  **Strategic Conclusion & Next Steps:** Conclude with a concise strategic recommendation (e.g., pursue, monitor, reconsider) and suggest 1-2 immediate next steps for the user.

      Keep the tone professional, analytical, and actionable. The summary should be concise yet comprehensive.
      Do not invent data not provided. If specific data is missing for a section, acknowledge it or focus on available information.
    `;

    console.log("Sending prompt to OpenAI GPT-4o-mini. Prompt length:", prompt.length);

    const completion = await openai.createChatCompletion({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a commercial real estate analyst providing executive summaries for site assessments." },
        { role: "user", content: prompt },
      ],
      temperature: 0.5, // Lower temperature for more factual and less creative output
      max_tokens: 700, // Adjust as needed for summary length
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
