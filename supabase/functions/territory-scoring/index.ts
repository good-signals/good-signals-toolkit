
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Enhanced JSON extraction for OpenAI responses
function extractJSON(text: string): any {
  console.log('Attempting to extract JSON from OpenAI response...');
  console.log('Response length:', text.length);
  
  // Clean the text first - remove any leading/trailing whitespace and non-printable characters
  const cleanedText = text.trim().replace(/[\x00-\x1F\x7F-\x9F]/g, '');
  
  // Try to find JSON in markdown code blocks first
  const markdownJsonMatch = cleanedText.match(/```json\s*\n?([\s\S]*?)\n?```/i);
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
  const codeBlockMatch = cleanedText.match(/```\s*\n?([\s\S]*?)\n?```/);
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
  const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    console.log('Found JSON object in response');
    try {
      // Clean up common JSON issues
      let jsonStr = jsonMatch[0];
      
      // Fix common JSON issues
      jsonStr = jsonStr
        // Fix unescaped quotes in strings
        .replace(/(?<!\\)"/g, (match, offset, string) => {
          // Check if this quote is inside a string value
          const beforeQuote = string.substring(0, offset);
          const openQuotes = (beforeQuote.match(/(?<!\\)"/g) || []).length;
          return openQuotes % 2 === 1 ? '\\"' : '"';
        })
        // Fix trailing commas
        .replace(/,(\s*[}\]])/g, '$1')
        // Fix missing commas between objects
        .replace(/}\s*{/g, '},{')
        // Fix newlines in strings
        .replace(/\n/g, '\\n')
        // Fix tab characters
        .replace(/\t/g, '\\t');
      
      return JSON.parse(jsonStr);
    } catch (e) {
      console.log('Failed to parse JSON object:', e.message);
      
      // Try to extract just the data we need manually
      try {
        const titleMatch = cleanedText.match(/"suggested_title":\s*"([^"]+)"/);
        const summaryMatch = cleanedText.match(/"prompt_summary":\s*"([^"]+)"/);
        const scoresMatch = cleanedText.match(/"scores":\s*\[([\s\S]*?)\]/);
        
        if (titleMatch && summaryMatch && scoresMatch) {
          console.log('Attempting manual JSON reconstruction');
          return {
            suggested_title: titleMatch[1],
            prompt_summary: summaryMatch[1],
            scores: []
          };
        }
      } catch (manualError) {
        console.log('Manual extraction also failed:', manualError.message);
      }
    }
  }

  // Try to parse the entire text as JSON (last resort)
  try {
    console.log('Attempting to parse entire response as JSON');
    return JSON.parse(cleanedText);
  } catch (e) {
    console.log('Failed to parse entire response as JSON:', e.message);
  }

  throw new Error('No valid JSON found in OpenAI response');
}

// Enhanced validation with better error messages
function validateResponse(data: any): boolean {
  console.log('Validating response structure...');
  
  if (!data || typeof data !== 'object') {
    console.log('Response is not an object:', typeof data);
    return false;
  }

  if (!data.suggested_title || typeof data.suggested_title !== 'string') {
    console.log('Missing or invalid suggested_title:', data.suggested_title);
    return false;
  }

  if (!data.prompt_summary || typeof data.prompt_summary !== 'string') {
    console.log('Missing or invalid prompt_summary:', data.prompt_summary);
    return false;
  }

  if (!Array.isArray(data.scores)) {
    console.log('Missing or invalid scores array:', data.scores);
    return false;
  }

  // Validate score structure
  let validScores = 0;
  for (let i = 0; i < Math.min(3, data.scores.length); i++) {
    const score = data.scores[i];
    if (score && 
        typeof score.market === 'string' && 
        typeof score.score === 'number' && 
        typeof score.reasoning === 'string') {
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

    // Enhanced system prompt optimized for OpenAI with stricter JSON requirements
    const getSystemPrompt = (mode: string, isChunked: boolean) => {
      const basePrompt = `You are part of the Territory Targeter tool inside the Good Signals platform. Your job is to help users assess and score U.S. markets based on criteria they provide in natural language.

CRITICAL JSON REQUIREMENTS:
- You MUST respond with ONLY valid JSON
- No markdown, explanations, or text outside the JSON object
- Ensure all strings are properly escaped
- No trailing commas
- No line breaks inside string values
- Test your JSON before responding`;

      const speedOptimizations = mode === 'fast' 
        ? `\nSPEED MODE: Provide quick, efficient scoring with concise reasoning. Focus on the most obvious factors. Keep reasoning brief (1-2 sentences max).`
        : `\nDETAILED MODE: Provide comprehensive analysis with thorough research-based scoring. Include multiple factors in your reasoning.`;

      const chunkingInstructions = isChunked
        ? `\nCHUNKED PROCESSING: You are processing a subset of markets. Maintain consistent scoring standards across all chunks.`
        : '';

      return `${basePrompt}${speedOptimizations}${chunkingInstructions}

Your task:
1. Interpret the user's criteria prompt
2. Generate a short, catchy title for this analysis (2-4 words max)
3. Score the provided U.S. markets (by CBSA) from 0–100, where 100 = strongest fit
4. For each market, provide ${mode === 'fast' ? 'brief' : 'detailed'} explanation of the score
5. Add a ${mode === 'fast' ? 'concise' : 'comprehensive'} paragraph explaining your logic

Return EXACTLY this JSON structure with NO additional text:

{
  "suggested_title": "Taco Affinity",
  "prompt_summary": "[Explanation of how you approached the user's criteria]",
  "scores": [
    {
      "market": "Los Angeles-Long Beach-Anaheim, CA",
      "score": 87,
      "reasoning": "${mode === 'fast' ? 'Strong taco culture and demographics.' : 'Strong taco culture with high Hispanic population and numerous authentic restaurants.'}",
      "sources": []
    }
  ]
}

Guidelines:
- Keep suggested_title short and memorable (2-4 words max)
- ${mode === 'fast' ? 'Keep reasoning concise (1-2 sentences)' : 'Provide detailed reasoning with specific factors'}
- Stay consistent in scoring logic${isChunked ? ' across all chunks' : ''}
- If data is missing, give a conservative score and explain
- ENSURE your JSON response is complete and properly formatted

Markets to score: ${cbsaData.map((cbsa: any) => `${cbsa.name} (Pop: ${cbsa.population.toLocaleString()})`).join(', ')}`;
    };

    console.log('Sending request to OpenAI API...');
    
    // Configure model based on analysis mode
    const modelConfig = {
      model: 'gpt-4o-mini',
      temperature: analysisMode === 'fast' ? 0.3 : 0.1,
      max_tokens: analysisMode === 'fast' ? 4000 : 8000,
      response_format: { type: "json_object" } // Force JSON response
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
      console.error('Raw AI content:', aiContent);
      
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
