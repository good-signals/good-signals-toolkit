
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Enhanced JSON extraction function
function extractJSON(text: string): any {
  console.log('Attempting to extract JSON from response...');
  
  // Try to find JSON in markdown code blocks first
  const markdownJsonMatch = text.match(/```json\s*\n?([\s\S]*?)\n?```/i);
  if (markdownJsonMatch) {
    console.log('Found JSON in markdown code block');
    try {
      return JSON.parse(markdownJsonMatch[1].trim());
    } catch (e) {
      console.log('Failed to parse JSON from markdown block:', e.message);
    }
  }

  // Try to find any code block
  const codeBlockMatch = text.match(/```\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) {
    console.log('Found JSON in generic code block');
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch (e) {
      console.log('Failed to parse JSON from code block:', e.message);
    }
  }

  // Look for JSON object starting with { and ending with }
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    console.log('Found JSON object pattern');
    try {
      return JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.log('Failed to parse JSON object:', e.message);
    }
  }

  // Try to parse the entire text as JSON
  try {
    console.log('Attempting to parse entire response as JSON');
    return JSON.parse(text.trim());
  } catch (e) {
    console.log('Failed to parse entire response as JSON:', e.message);
  }

  throw new Error('No valid JSON found in response');
}

// Validate the parsed response structure
function validateResponse(data: any): boolean {
  if (!data || typeof data !== 'object') {
    console.log('Response is not an object');
    return false;
  }

  if (!data.suggested_title || typeof data.suggested_title !== 'string') {
    console.log('Missing or invalid suggested_title');
    return false;
  }

  if (!data.prompt_summary || typeof data.prompt_summary !== 'string') {
    console.log('Missing or invalid prompt_summary');
    return false;
  }

  if (!Array.isArray(data.scores)) {
    console.log('Missing or invalid scores array');
    return false;
  }

  // Validate first few scores to ensure proper structure
  for (let i = 0; i < Math.min(3, data.scores.length); i++) {
    const score = data.scores[i];
    if (!score.market || typeof score.score !== 'number' || !score.reasoning) {
      console.log(`Invalid score structure at index ${i}`);
      return false;
    }
  }

  console.log(`Response validation passed with ${data.scores.length} scores`);
  return true;
}

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

    console.log(`Processing request for ${cbsaData.length} markets with prompt: "${userPrompt.substring(0, 100)}..."`);

    // Enhanced system prompt for better JSON output
    const systemPrompt = `You are part of the Territory Targeter tool inside the Good Signals platform. Your job is to help users assess and score U.S. markets based on criteria they provide in natural language.

CRITICAL: You MUST respond with ONLY valid JSON. Do not include any markdown, explanations, or text outside the JSON object.

Your task:
1. Interpret the user's criteria prompt (e.g., "Score markets based on Gen Z presence and cultural fit for a youth-oriented sneaker brand").
2. Generate a short, catchy title for this analysis (e.g., "Gen Z Sneaker Culture" or "Taco Affinity").
3. Score the top 100 U.S. markets (by CBSA) from 0–100, where 100 = strongest fit and 0 = weakest.
4. For each market, provide a brief explanation of the score.
5. Add a plainspoken paragraph to the executive summary section explaining your logic, the data you considered, and any key assumptions.
6. Use a professional but clear and approachable tone (no jargon, plain English).

Return EXACTLY this JSON structure with NO additional text or formatting:

{
  "suggested_title": "Taco Affinity",
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
  ]
}

Guidelines:
- Keep the suggested_title short, memorable, and relevant to the criteria (2-4 words max)
- If data is missing, give a conservative score and explain.
- Do not make specific business recommendations—only assess signal strength.
- Stay consistent in your scoring logic.
- Include sources in your reasoning where possible.

Here are the CBSA markets to score: ${cbsaData.map((cbsa: any) => `${cbsa.name} (Population: ${cbsa.population.toLocaleString()})`).join(', ')}`;

    console.log('Sending request to Perplexity API...');
    
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
        temperature: 0.1, // Lower temperature for more consistent JSON output
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
    console.log('Received response from Perplexity API');

    const aiContent = data.choices[0]?.message?.content;
    if (!aiContent) {
      throw new Error('No content received from Perplexity API');
    }

    console.log('AI response length:', aiContent.length);

    // Extract and validate JSON from AI response
    let parsedResponse;
    try {
      parsedResponse = extractJSON(aiContent);
      
      if (!validateResponse(parsedResponse)) {
        throw new Error('Response validation failed - invalid structure');
      }
      
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError.message);
      console.error('Raw AI content (first 500 chars):', aiContent.substring(0, 500));
      throw new Error(`Failed to parse AI response: ${parseError.message}`);
    }

    console.log(`Successfully processed ${parsedResponse.scores.length} market scores`);

    return new Response(JSON.stringify({
      success: true,
      data: parsedResponse
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in territory-scoring function:', error);
    
    // Return detailed error information for debugging
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      details: error.stack || 'No stack trace available'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
