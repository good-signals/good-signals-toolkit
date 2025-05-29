
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Enhanced JSON extraction with multiple recovery strategies
function extractJSON(text: string): any {
  console.log('Attempting to extract JSON from OpenAI response...');
  console.log('Response length:', text.length);
  console.log('First 200 chars:', text.substring(0, 200));
  console.log('Last 200 chars:', text.substring(Math.max(0, text.length - 200)));
  
  // Clean the text first - remove any leading/trailing whitespace and non-printable characters
  const cleanedText = text.trim().replace(/[\x00-\x1F\x7F-\x9F]/g, '');
  
  // Strategy 1: Try to find JSON in markdown code blocks first
  const markdownJsonMatch = cleanedText.match(/```json\s*\n?([\s\S]*?)\n?```/i);
  if (markdownJsonMatch) {
    console.log('Found JSON in markdown code block');
    try {
      const jsonContent = markdownJsonMatch[1].trim();
      const parsed = JSON.parse(jsonContent);
      console.log('Successfully parsed JSON from markdown block');
      return parsed;
    } catch (e) {
      console.log('Failed to parse JSON from markdown block:', e.message);
    }
  }

  // Strategy 2: Try to find any code block
  const codeBlockMatch = cleanedText.match(/```\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) {
    console.log('Found JSON in generic code block');
    try {
      const jsonContent = codeBlockMatch[1].trim();
      const parsed = JSON.parse(jsonContent);
      console.log('Successfully parsed JSON from code block');
      return parsed;
    } catch (e) {
      console.log('Failed to parse JSON from code block:', e.message);
    }
  }

  // Strategy 3: Look for JSON object starting with { and ending with }
  const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    console.log('Found JSON object in response');
    try {
      let jsonStr = jsonMatch[0];
      
      // Clean up common JSON issues more aggressively
      jsonStr = jsonStr
        // Remove any trailing text after the last }
        .replace(/}\s*[^}]*$/, '}')
        // Fix trailing commas
        .replace(/,(\s*[}\]])/g, '$1')
        // Fix missing commas between objects
        .replace(/}\s*{/g, '},{')
        // Fix missing commas between array elements
        .replace(/}\s*\]/g, '}]')
        // Fix unescaped quotes in strings (basic attempt)
        .replace(/([^\\])"/g, '$1\\"')
        // Fix the fix above for legitimate JSON quotes
        .replace(/\\":/g, '":')
        .replace(/:\s*\\"/g, ': "')
        .replace(/,\s*\\"/g, ', "')
        .replace(/{\s*\\"/g, '{ "')
        .replace(/\[\s*\\"/g, '[ "');
      
      const parsed = JSON.parse(jsonStr);
      console.log('Successfully parsed cleaned JSON object');
      return parsed;
    } catch (e) {
      console.log('Failed to parse JSON object after cleaning:', e.message);
      
      // Strategy 4: Try to extract key components manually
      try {
        console.log('Attempting manual JSON reconstruction');
        const titleMatch = cleanedText.match(/"suggested_title":\s*"([^"]+)"/);
        const summaryMatch = cleanedText.match(/"prompt_summary":\s*"([^"]+)"/);
        
        if (titleMatch && summaryMatch) {
          console.log('Found basic components, creating minimal valid response');
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

  // Strategy 5: Try to parse the entire text as JSON (last resort)
  try {
    console.log('Attempting to parse entire response as JSON');
    const parsed = JSON.parse(cleanedText);
    console.log('Successfully parsed entire response as JSON');
    return parsed;
  } catch (e) {
    console.log('Failed to parse entire response as JSON:', e.message);
  }

  console.error('All JSON extraction strategies failed');
  throw new Error('Unable to extract valid JSON from OpenAI response. The AI may have provided malformed output.');
}

// Enhanced validation with detailed error reporting
function validateResponse(data: any): { isValid: boolean; errors: string[] } {
  console.log('Validating response structure...');
  const errors: string[] = [];
  
  if (!data || typeof data !== 'object') {
    errors.push('Response is not a valid object');
    return { isValid: false, errors };
  }

  if (!data.suggested_title || typeof data.suggested_title !== 'string') {
    errors.push('Missing or invalid suggested_title');
  }

  if (!data.prompt_summary || typeof data.prompt_summary !== 'string') {
    errors.push('Missing or invalid prompt_summary');
  }

  if (!Array.isArray(data.scores)) {
    errors.push('Missing or invalid scores array');
  } else {
    // Validate score structure more thoroughly
    let validScores = 0;
    for (let i = 0; i < data.scores.length; i++) {
      const score = data.scores[i];
      if (score && 
          typeof score.market === 'string' && score.market.trim() !== '' &&
          typeof score.score === 'number' && score.score >= 0 && score.score <= 100 &&
          typeof score.reasoning === 'string' && score.reasoning.trim() !== '') {
        validScores++;
      } else {
        console.log(`Invalid score structure at index ${i}:`, score);
      }
    }

    if (validScores === 0 && data.scores.length > 0) {
      errors.push('No valid market scores found in response');
    }
    
    console.log(`Found ${validScores} valid scores out of ${data.scores.length} total`);
  }

  const isValid = errors.length === 0;
  console.log(`Response validation ${isValid ? 'passed' : 'failed'} with ${errors.length} errors`);
  
  return { isValid, errors };
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

    // Enhanced system prompt with clear JSON structure and examples
    const getSystemPrompt = (mode: string, isChunked: boolean) => {
      const jsonExample = `{
  "suggested_title": "Taco Affinity",
  "prompt_summary": "I assessed markets based on Hispanic population, taco restaurant density, and cultural factors that indicate strong taco affinity.",
  "scores": [
    {
      "market": "Los Angeles-Long Beach-Anaheim, CA",
      "score": 87,
      "reasoning": "High Hispanic population (45%) with extensive authentic taco culture and numerous taquerias.",
      "sources": []
    },
    {
      "market": "Dallas-Fort Worth-Arlington, TX", 
      "score": 78,
      "reasoning": "Strong Tex-Mex culture with growing taco scene and significant Hispanic community.",
      "sources": []
    }
  ]
}`;

      const basePrompt = `You are an expert market analyst helping users score U.S. markets based on their criteria.

CRITICAL JSON REQUIREMENTS - MUST FOLLOW EXACTLY:
1. You MUST respond with ONLY valid JSON - no explanations, markdown, or text outside the JSON
2. Your response must match this EXACT structure:
${jsonExample}

3. REQUIRED FIELDS (all must be present):
   - "suggested_title": Short catchy title (2-4 words max)
   - "prompt_summary": Brief explanation of your scoring approach
   - "scores": Array of market score objects
   
4. Each score object MUST have:
   - "market": Exact market name from the provided list
   - "score": Number between 0-100 (integers only)
   - "reasoning": Clear explanation of the score
   - "sources": Empty array []

5. JSON FORMATTING RULES:
   - Use double quotes only
   - No trailing commas
   - No line breaks inside string values
   - Escape any quotes within strings using \"
   - End with a single } character`;

      const speedOptimizations = mode === 'fast' 
        ? `\nSPEED MODE: Provide efficient scoring with concise reasoning (1-2 sentences max per market).`
        : `\nDETAILED MODE: Provide comprehensive analysis with thorough reasoning for each market score.`;

      const chunkingInstructions = isChunked
        ? `\nCHUNKED PROCESSING: You are processing ${cbsaData.length} markets (chunk ${chunkIndex + 1}/${totalChunks}). Maintain consistent scoring standards.`
        : '';

      return `${basePrompt}${speedOptimizations}${chunkingInstructions}

TASK: Score these ${cbsaData.length} U.S. markets based on the user's criteria: "${userPrompt}"

MARKETS TO SCORE: ${cbsaData.map((cbsa: any) => `${cbsa.name} (Pop: ${cbsa.population.toLocaleString()})`).join(', ')}

Remember: Respond with ONLY the JSON object, nothing else.`;
    };

    console.log('Sending request to OpenAI API...');
    
    // Configure model based on analysis mode
    const modelConfig = {
      model: 'gpt-4o-mini',
      temperature: analysisMode === 'fast' ? 0.2 : 0.1,
      max_tokens: analysisMode === 'fast' ? 4000 : 8000,
      response_format: { type: "json_object" }
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
            content: `Score these markets: ${userPrompt}`
          }
        ],
        top_p: 0.9,
        frequency_penalty: 0.3,
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

    // Extract and validate JSON from AI response
    let parsedResponse;
    try {
      parsedResponse = extractJSON(aiContent);
      
      const validation = validateResponse(parsedResponse);
      if (!validation.isValid) {
        console.error('Response validation failed:', validation.errors);
        throw new Error(`Response validation failed: ${validation.errors.join(', ')}`);
      }
      
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError.message);
      console.error('Raw AI content preview:', aiContent.substring(0, 500));
      
      // Provide more specific error guidance
      let errorMessage = 'Failed to parse AI response. ';
      if (parseError.message.includes('JSON')) {
        errorMessage += 'The AI provided malformed JSON. Try using Fast Analysis mode or simplifying your prompt.';
      } else {
        errorMessage += 'Please try again with a simpler prompt or use Fast Analysis mode for better reliability.';
      }
      
      throw new Error(errorMessage);
    }

    // Final validation to ensure we have usable data
    if (!parsedResponse.scores || parsedResponse.scores.length === 0) {
      console.error('No market scores found in validated response');
      throw new Error('Analysis completed but no market scores were generated. Please try rephrasing your criteria or use Fast Analysis mode.');
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
