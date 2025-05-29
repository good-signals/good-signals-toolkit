
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simplified JSON extraction for OpenAI (more reliable than Perplexity)
function extractJSON(text: string): any {
  console.log('Attempting to extract JSON from OpenAI response...');
  console.log('Response length:', text.length);
  
  // Try to find JSON in markdown code blocks first
  const markdownJsonMatch = text.match(/```json\s*\n?([\s\S]*?)\n?```/i);
  if (markdownJsonMatch) {
    console.log('Found JSON in markdown code block');
    try {
      const jsonContent = markdownJsonMatch[1].trim();
      return JSON.parse(jsonContent);
    } catch (e) {
      console.log('Failed to parse JSON from markdown block:', e.message);
    }
  }

  // Try to find any code block
  const codeBlockMatch = text.match(/```\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) {
    console.log('Found JSON in generic code block');
    try {
      const jsonContent = codeBlockMatch[1].trim();
      return JSON.parse(jsonContent);
    } catch (e) {
      console.log('Failed to parse JSON from code block:', e.message);
    }
  }

  // Look for JSON object starting with { and ending with }
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    console.log('Found JSON object in response');
    try {
      return JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.log('Failed to parse JSON object:', e.message);
    }
  }

  // Try to parse the entire text as JSON (last resort)
  try {
    console.log('Attempting to parse entire response as JSON');
    return JSON.parse(text.trim());
  } catch (e) {
    console.log('Failed to parse entire response as JSON:', e.message);
  }

  throw new Error('No valid JSON found in OpenAI response');
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

  // Validate a few scores to ensure proper structure
  let validScores = 0;
  for (let i = 0; i < Math.min(3, data.scores.length); i++) {
    const score = data.scores[i];
    if (score.market && typeof score.score === 'number' && score.reasoning) {
      validScores++;
    } else {
      console.log(`Invalid score structure at index ${i}:`, score);
    }
  }

  if (validScores === 0 && data.scores.length > 0) {
    console.log('No valid scores found in response');
    return false;
  }

  console.log(`Response validation passed with ${data.scores.length} scores (${validScores} validated)`);
  return true;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userPrompt, cbsaData, analysisMode = 'detailed', isChunked = false, chunkIndex = 0, totalChunks = 1 } = await req.json();
    
    if (!userPrompt || !cbsaData) {
      throw new Error('Missing required parameters: userPrompt and cbsaData');
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    console.log(`Processing ${analysisMode} analysis for ${cbsaData.length} markets with prompt: "${userPrompt.substring(0, 100)}..."`);
    if (isChunked) {
      console.log(`Processing chunk ${chunkIndex + 1}/${totalChunks}`);
    }

    // Enhanced system prompt optimized for OpenAI
    const getSystemPrompt = (mode: string, isChunked: boolean) => {
      const basePrompt = `You are part of the Territory Targeter tool inside the Good Signals platform. Your job is to help users assess and score U.S. markets based on criteria they provide in natural language.

CRITICAL: You MUST respond with ONLY valid JSON. Do not include any markdown, explanations, or text outside the JSON object. Ensure your JSON is complete and properly formatted.`;

      const speedOptimizations = mode === 'fast' 
        ? `
SPEED MODE: Provide quick, efficient scoring with concise reasoning. Focus on the most obvious and direct factors related to the user's criteria. Keep reasoning brief (1-2 sentences max).`
        : `
DETAILED MODE: Provide comprehensive analysis with thorough research-based scoring. Include multiple factors and data sources in your reasoning. When possible, include specific sources or data points you reference.`;

      const chunkingInstructions = isChunked
        ? `
CHUNKED PROCESSING: You are processing a subset of markets. Maintain consistent scoring standards across all chunks. Use the same title and summary approach for all chunks of this analysis.`
        : '';

      return `${basePrompt}${speedOptimizations}${chunkingInstructions}

Your task:
1. Interpret the user's criteria prompt (e.g., "Score markets based on Gen Z presence and cultural fit for a youth-oriented sneaker brand").
2. Generate a short, catchy title for this analysis (e.g., "Gen Z Sneaker Culture" or "Taco Affinity").
3. Score the provided U.S. markets (by CBSA) from 0–100, where 100 = strongest fit and 0 = weakest.
4. For each market, provide ${mode === 'fast' ? 'brief' : 'detailed'} explanation of the score${mode === 'detailed' ? ' and include sources when possible' : ''}.
5. Add a ${mode === 'fast' ? 'concise' : 'comprehensive'} paragraph to the executive summary section explaining your logic, the data you considered, and any key assumptions.
6. Use a professional but clear and approachable tone (no jargon, plain English).

Return EXACTLY this JSON structure with NO additional text or formatting:

{
  "suggested_title": "Taco Affinity",
  "prompt_summary": "[${mode === 'fast' ? 'Concise' : 'Detailed'} explanation of how you approached the user's prompt]",
  "scores": [
    {
      "market": "Los Angeles-Long Beach-Anaheim, CA",
      "score": 87,
      "reasoning": "${mode === 'fast' ? 'Strong Gen Z population and vibrant sneaker culture.' : 'Strong Gen Z population (32% under 25), vibrant sneaker culture with major retailers like Flight Club and Stadium Goods, and high social media engagement rates.'}",
      "sources": ${mode === 'detailed' ? '["U.S. Census Bureau", "Social Media Analytics Report 2024"]' : '[]'}
    }
  ]
}

Guidelines:
- Keep the suggested_title short, memorable, and relevant to the criteria (2-4 words max)
- ${mode === 'fast' ? 'Prioritize speed over exhaustive research' : 'Use comprehensive research and multiple data sources'}
- ${mode === 'detailed' ? 'Include specific sources in the sources array when you reference data' : 'Keep sources array empty for fast mode'}
- If data is missing, give a conservative score and explain.
- Do not make specific business recommendations—only assess signal strength.
- Stay consistent in your scoring logic${isChunked ? ' across all chunks' : ''}.
- ${mode === 'fast' ? 'Keep reasoning concise (1-2 sentences)' : 'Include sources in your reasoning where possible and list them in the sources array'}.
- ENSURE your JSON response is complete and properly terminated.

Here are the CBSA markets to score: ${cbsaData.map((cbsa: any) => `${cbsa.name} (Population: ${cbsa.population.toLocaleString()})`).join(', ')}`;
    };

    console.log('Sending request to OpenAI API...');
    
    // Configure model based on analysis mode
    const modelConfig = {
      model: 'gpt-4o-mini',
      temperature: analysisMode === 'fast' ? 0.3 : 0.1,
      max_tokens: analysisMode === 'fast' ? 4000 : 8000
    };
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...modelConfig,
        messages: [
          {
            role: 'system',
            content: getSystemPrompt(analysisMode, isChunked)
          },
          {
            role: 'user',
            content: `User's scoring criteria: ${userPrompt}`
          }
        ],
        top_p: 0.9,
        frequency_penalty: 0.5,
        presence_penalty: 0.1
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Received response from OpenAI API');

    const aiContent = data.choices[0]?.message?.content;
    if (!aiContent) {
      throw new Error('No content received from OpenAI API');
    }

    console.log('AI response length:', aiContent.length);
    console.log('First 200 chars:', aiContent.substring(0, 200));
    console.log('Last 200 chars:', aiContent.substring(Math.max(0, aiContent.length - 200)));

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
      console.error('Raw AI content (last 500 chars):', aiContent.substring(Math.max(0, aiContent.length - 500)));
      
      throw new Error(`Failed to parse AI response: ${parseError.message}. Please try again or use Fast Analysis mode for better reliability.`);
    }

    console.log(`Successfully processed ${parsedResponse.scores.length} market scores in ${analysisMode} mode`);

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
      error: error.message,
      details: error.stack || 'No stack trace available'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
