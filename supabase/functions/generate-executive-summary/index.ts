
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

    // Build Target Metrics list
    let targetMetricsList = "";
    const settingsForMetrics = targetMetricSet.user_custom_metrics_settings || [];
    const metricLabels = settingsForMetrics.map((setting: any) => setting.label).join(", ");
    if (metricLabels) {
      targetMetricsList = `Target Metrics used: ${metricLabels}.`;
    }

    // Build detailed site data for analysis
    let siteDataSummary = "Site Data Analysis:\n";
    metricCategories.forEach((category: string) => {
      siteDataSummary += `\n${category}:\n`;
      const settingsForCategory = targetMetricSet.user_custom_metrics_settings.filter((s: any) => s.category === category);
      settingsForCategory.forEach((setting: any) => {
        const detail = detailedMetricScores[setting.metric_identifier];
        if (detail) {
          siteDataSummary += `• ${setting.label}: ${detail.enteredValue ?? 'N/A'} (Score: ${detail.score !== null ? detail.score.toFixed(2) : 'N/A'}, Target: ${detail.targetValue ?? 'N/A'})\n`;
          if(detail.notes) siteDataSummary += `  Notes: ${detail.notes}\n`;
        }
      });
    });

    // Add site visit ratings if available
    if (siteVisitRatings && siteVisitRatings.length > 0) {
      siteDataSummary += "\nSite Visit Criteria:\n";
      siteVisitRatings.forEach((rating: any) => {
        siteDataSummary += `• ${rating.label}: Grade ${rating.rating_grade}`;
        if (rating.rating_description) siteDataSummary += ` (${rating.rating_description})`;
        siteDataSummary += "\n";
        if(rating.notes) siteDataSummary += `  Notes: ${rating.notes}\n`;
      });
    }

    const prompt = `
      You are an AI assistant that writes a concise, plain-spoken executive summary of a retail/restaurant site assessment. Use the following instructions:

      1. Lead with the most important finding about the site.
      2. Mention exactly which Target Metrics were used in your analysis.
      3. Highlight areas where the site is performing strongly and recommend how the brand can capitalize on those strengths.
      4. Call out any high-risk factors (e.g., weak trade area, oversaturation, high expenses) and offer concrete suggestions for mitigating each risk.
      5. Keep the tone generally conservative—err on the side of caution when interpreting marginal results.
      6. Make it brief (no more than 150 words) so executives can read it at a glance.
      7. End with exactly this disclaimer: "This executive summary was generated by AI and should be reviewed by brand stakeholders."

      Assessment Details:
      - Assessment Name: ${assessmentName}
      - Address: ${address || 'Not specified'}
      - Overall Site Signal Score: ${overallSiteSignalScore !== null ? overallSiteSignalScore.toFixed(2) : 'N/A'} (out of 1.0)
      - Assessment Completion: ${completionPercentage !== null ? completionPercentage.toFixed(2) + '%' : 'N/A'}
      - Signal Score Thresholds: Good > ${accountSignalGoodThreshold || 0.75}, Bad < ${accountSignalBadThreshold || 0.50}
      - ${targetMetricsList}

      ${siteDataSummary}

      Write a summary that follows this structure:
      - Start with the site name/location and lead with the most important finding
      - Mention the Target Metrics used
      - Detail strengths and how to leverage them
      - Call out risks and mitigation strategies
      - Keep it under 150 words
      - End with the exact disclaimer provided

      Focus on actionable insights based on the actual data provided. Be specific about metric values when relevant to strengths or risks.
    `;

    console.log("Sending prompt to OpenAI GPT-4o-mini. Prompt length:", prompt.length);

    const completion = await openai.createChatCompletion({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a commercial real estate analyst providing executive summaries for site assessments. Follow the exact format and instructions provided. Keep responses under 150 words and always end with the specified disclaimer." },
        { role: "user", content: prompt },
      ],
      temperature: 0.2, // Lower temperature for more consistent output
      max_tokens: 300, // Reduced to enforce brevity
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
