
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userPrompt, cbsaData } = await req.json();
    
    if (!userPrompt || !cbsaData) {
      throw new Error('Missing required parameters: userPrompt and cbsaData');
    }

    const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');
    if (!perplexityApiKey) {
      throw new Error('Perplexity API key not configured');
    }

    // Prepare the system prompt with CBSA data
    const systemPrompt = `You are part of the Territory Targeter tool inside the Good Signals platform. Your job is to help users assess and score U.S. markets based on criteria they provide in natural language.

Your task:
1. Interpret the user's criteria prompt (e.g., "Score markets based on Gen Z presence and cultural fit for a youth-oriented sneaker brand").
2. Score the top 100 U.S. markets (by CBSA) from 0–100, where 100 = strongest fit and 0 = weakest.
3. For each market, provide a brief explanation of the score.
4. Add a plainspoken paragraph to the executive summary section explaining your logic, the data you considered, and any key assumptions.
5. Use a professional but clear and approachable tone (no jargon, plain English).

Return the following JSON object:

{
  "prompt_summary": "[One-paragraph explanation of how you approached the user's prompt]",
  "scores": [
    {
      "market": "Los Angeles-Long Beach-Anaheim, CA",
      "score": 87,
      "reasoning": "Strong Gen Z population, vibrant sneaker culture, and high social media engagement."
    },
    {
      "market": "Des Moines-West Des Moines, IA",
      "score": 42,
      "reasoning": "Smaller Gen Z segment and fewer cultural touchpoints with youth sneaker trends."
    }
    // Repeat for all markets provided
  ]
}

Guidelines:
- If data is missing, give a conservative score and explain.
- Do not make specific business recommendations—only assess signal strength.
- Stay consistent in your scoring logic.
- Include sources in your reasoning where possible.

Here are the CBSA markets to score: ${cbsaData.map((cbsa: any) => `${cbsa.name} (Population: ${cbsa.population.toLocaleString()})`).join(', ')}`;

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-sonar-large-128k-online',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: `User's scoring criteria: ${userPrompt}`
          }
        ],
        temperature: 0.2,
        top_p: 0.9,
        max_tokens: 8000,
        return_images: false,
        return_related_questions: false,
        search_recency_filter: 'month',
        frequency_penalty: 1,
        presence_penalty: 0
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Perplexity API error:', errorText);
      throw new Error(`Perplexity API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Perplexity response:', data);

    const aiContent = data.choices[0]?.message?.content;
    if (!aiContent) {
      throw new Error('No content received from Perplexity API');
    }

    // Parse the JSON response from AI
    let parsedResponse;
    try {
      // Extract JSON from the response (in case there's additional text)
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No valid JSON found in AI response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      throw new Error('Failed to parse AI response. Please try again.');
    }

    return new Response(JSON.stringify({
      success: true,
      data: parsedResponse
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in territory-scoring function:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
