
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Enhanced JSON extraction with aggressive cleaning and multiple recovery strategies
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
      
      // Enhanced JSON cleaning with multiple passes
      jsonStr = cleanJsonString(jsonStr);
      
      const parsed = JSON.parse(jsonStr);
      console.log('Successfully parsed cleaned JSON object');
      return parsed;
    } catch (e) {
      console.log('Failed to parse JSON object after cleaning:', e.message);
      
      // Strategy 4: Try to fix incomplete JSON structures
      try {
        console.log('Attempting aggressive JSON repair...');
        const repairedJson = repairIncompleteJson(jsonMatch[0]);
        const parsed = JSON.parse(repairedJson);
        console.log('Successfully parsed repaired JSON');
        return parsed;
      } catch (repairError) {
        console.log('JSON repair also failed:', repairError.message);
      }
      
      // Strategy 5: Try to extract key components manually
      try {
        console.log('Attempting manual JSON reconstruction');
        const manualResult = extractManualComponents(cleanedText);
        if (manualResult) {
          return manualResult;
        }
      } catch (manualError) {
        console.log('Manual extraction also failed:', manualError.message);
      }
    }
  }

  // Strategy 6: Try to parse the entire text as JSON (last resort)
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

// Enhanced JSON cleaning function
function cleanJsonString(jsonStr: string): string {
  return jsonStr
    // Remove any trailing text after the last }
    .replace(/}\s*[^}]*$/, '}')
    // Fix trailing commas
    .replace(/,(\s*[}\]])/g, '$1')
    // Fix missing commas between objects
    .replace(/}\s*{/g, '},{')
    // Fix missing commas between array elements
    .replace(/}\s*\]/g, '}]')
    // Fix incomplete string values (remove quotes that aren't properly closed)
    .replace(/"[^"]*$/g, '""')
    // Fix empty property values
    .replace(/:\s*""\s*""/g, ': ""')
    // Remove incomplete properties at the end
    .replace(/,\s*"[^"]*"?\s*:\s*"?[^"}]*$/, '')
    // Ensure proper closing
    .replace(/[^}]*$/, '}');
}

// Repair incomplete JSON structures
function repairIncompleteJson(jsonStr: string): string {
  console.log('Attempting to repair incomplete JSON...');
  
  // Count opening and closing braces
  const openBraces = (jsonStr.match(/\{/g) || []).length;
  const closeBraces = (jsonStr.match(/\}/g) || []).length;
  
  // Count opening and closing brackets
  const openBrackets = (jsonStr.match(/\[/g) || []).length;
  const closeBrackets = (jsonStr.match(/\]/g) || []).length;
  
  let repaired = jsonStr;
  
  // Add missing closing brackets
  for (let i = 0; i < openBrackets - closeBrackets; i++) {
    repaired += ']';
  }
  
  // Add missing closing braces
  for (let i = 0; i < openBraces - closeBraces; i++) {
    repaired += '}';
  }
  
  // Clean up any trailing commas or incomplete entries
  repaired = cleanJsonString(repaired);
  
  console.log('Repaired JSON structure');
  return repaired;
}

// Extract components manually as fallback
function extractManualComponents(text: string): any | null {
  console.log('Extracting components manually...');
  
  const titleMatch = text.match(/"suggested_title":\s*"([^"]+)"/);
  const summaryMatch = text.match(/"prompt_summary":\s*"([^"]+)"/);
  
  if (titleMatch && summaryMatch) {
    console.log('Found basic components, creating minimal valid response');
    
    // Try to extract some market scores if available
    const scoreMatches = [...text.matchAll(/"market":\s*"([^"]+)"[^}]*"score":\s*(\d+)[^}]*"reasoning":\s*"([^"]+)"/g)];
    
    const scores = scoreMatches.slice(0, 10).map(match => ({
      market: match[1],
      score: parseInt(match[2]),
      reasoning: match[3],
      sources: []
    }));
    
    return {
      suggested_title: titleMatch[1],
      prompt_summary: summaryMatch[1],
      scores: scores
    };
  }
  
  return null;
}

// Enhanced validation with detailed error reporting and recovery suggestions
function validateResponse(data: any): { isValid: boolean; errors: string[]; canRetry: boolean } {
  console.log('Validating response structure...');
  const errors: string[] = [];
  let canRetry = true;
  
  if (!data || typeof data !== 'object') {
    errors.push('Response is not a valid object');
    return { isValid: false, errors, canRetry: true };
  }

  if (!data.suggested_title || typeof data.suggested_title !== 'string') {
    errors.push('Missing or invalid suggested_title');
  }

  if (!data.prompt_summary || typeof data.prompt_summary !== 'string') {
    errors.push('Missing or invalid prompt_summary');
  }

  if (!Array.isArray(data.scores)) {
    errors.push('Missing or invalid scores array');
    canRetry = true;
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
      canRetry = true;
    } else if (validScores < data.scores.length * 0.5) {
      // If less than 50% of scores are valid, suggest retry
      errors.push(`Only ${validScores} out of ${data.scores.length} scores are valid`);
      canRetry = true;
    }
    
    console.log(`Found ${validScores} valid scores out of ${data.scores.length} total`);
  }

  const isValid = errors.length === 0;
  console.log(`Response validation ${isValid ? 'passed' : 'failed'} with ${errors.length} errors`);
  
  return { isValid, errors, canRetry };
}

// Progressive retry with simpler prompts
async function callOpenAIWithRetry(userPrompt: string, cbsaData: any[], analysisMode: string, retryAttempt: number = 0): Promise<any> {
  const maxRetries = 3;
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  // Progressive simplification of prompts and settings
  const getRetryConfig = (attempt: number) => {
    switch (attempt) {
      case 0: // First attempt - original approach
        return {
          temperature: analysisMode === 'fast' ? 0.1 : 0.05,
          max_tokens: analysisMode === 'fast' ? 4000 : 8000,
          systemPrompt: getDetailedSystemPrompt(analysisMode, cbsaData.length),
          description: 'detailed analysis'
        };
      case 1: // Second attempt - simplified prompt
        return {
          temperature: 0.1,
          max_tokens: 3000,
          systemPrompt: getSimplifiedSystemPrompt(cbsaData.length),
          description: 'simplified analysis'
        };
      case 2: // Third attempt - basic prompt
        return {
          temperature: 0.05,
          max_tokens: 2000,
          systemPrompt: getBasicSystemPrompt(cbsaData.length),
          description: 'basic analysis'
        };
      default:
        throw new Error('Maximum retry attempts exceeded');
    }
  };

  const config = getRetryConfig(retryAttempt);
  console.log(`Attempt ${retryAttempt + 1}/${maxRetries}: ${config.description}`);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: config.temperature,
        max_tokens: config.max_tokens,
        response_format: { type: "json_object" },
        top_p: 0.8,
        frequency_penalty: 0.1,
        presence_penalty: 0.1,
        messages: [
          {
            role: 'system',
            content: config.systemPrompt
          },
          {
            role: 'user',
            content: `Score these markets based on: ${userPrompt}`
          }
        ]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const aiContent = data.choices[0]?.message?.content;
    
    if (!aiContent) {
      throw new Error('No content received from OpenAI API');
    }

    console.log(`Attempt ${retryAttempt + 1} - AI response length:`, aiContent.length);

    // Try to extract and validate JSON
    let parsedResponse;
    try {
      parsedResponse = extractJSON(aiContent);
      const validation = validateResponse(parsedResponse);
      
      if (validation.isValid) {
        console.log(`Attempt ${retryAttempt + 1} succeeded`);
        return parsedResponse;
      } else if (retryAttempt < maxRetries - 1 && validation.canRetry) {
        console.log(`Attempt ${retryAttempt + 1} failed validation, retrying with simpler approach...`);
        console.log('Validation errors:', validation.errors);
        return await callOpenAIWithRetry(userPrompt, cbsaData, analysisMode, retryAttempt + 1);
      } else {
        throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
      }
    } catch (parseError) {
      console.error(`Attempt ${retryAttempt + 1} parse error:`, parseError.message);
      
      if (retryAttempt < maxRetries - 1) {
        console.log('Retrying with simpler approach...');
        return await callOpenAIWithRetry(userPrompt, cbsaData, analysisMode, retryAttempt + 1);
      } else {
        throw new Error(`All retry attempts failed. Last error: ${parseError.message}`);
      }
    }
  } catch (error) {
    console.error(`Attempt ${retryAttempt + 1} failed:`, error.message);
    
    if (retryAttempt < maxRetries - 1) {
      console.log('Retrying with simpler approach...');
      return await callOpenAIWithRetry(userPrompt, cbsaData, analysisMode, retryAttempt + 1);
    } else {
      throw error;
    }
  }
}

// System prompts with progressive simplification
function getDetailedSystemPrompt(analysisMode: string, marketCount: number): string {
  const jsonExample = `{
  "suggested_title": "Market Analysis",
  "prompt_summary": "Brief explanation of scoring methodology.",
  "scores": [
    {
      "market": "New York-Newark-Jersey City, NY-NJ-PA",
      "score": 85,
      "reasoning": "High population and economic indicators support strong performance.",
      "sources": []
    }
  ]
}`;

  return `You are a market analyst. Respond with ONLY valid JSON in this exact format:

${jsonExample}

CRITICAL REQUIREMENTS:
- Start response with { and end with }
- Include exactly these fields: suggested_title, prompt_summary, scores
- Each score needs: market (exact name), score (0-100 integer), reasoning (clear explanation), sources (empty array)
- Provide scores for ALL ${marketCount} markets requested
- Keep reasoning concise but informative
- Use only double quotes, no trailing commas

${analysisMode === 'fast' ? 'FAST MODE: Be efficient with 1-2 sentence reasoning.' : 'DETAILED MODE: Provide thorough analysis.'}`;
}

function getSimplifiedSystemPrompt(marketCount: number): string {
  return `Respond with valid JSON only. Format:
{
  "suggested_title": "Short Title",
  "prompt_summary": "Brief explanation of your scoring approach.",
  "scores": [
    {
      "market": "Market Name",
      "score": 75,
      "reasoning": "Brief explanation.",
      "sources": []
    }
  ]
}

Score all ${marketCount} markets. Keep explanations short. Use exact market names provided.`;
}

function getBasicSystemPrompt(marketCount: number): string {
  return `Return JSON with market scores. Required format:
{"suggested_title":"Title","prompt_summary":"Summary","scores":[{"market":"Name","score":75,"reasoning":"Brief reason","sources":[]}]}

Score all ${marketCount} markets with brief reasoning.`;
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

    console.log(`Processing ${analysisMode} analysis for ${cbsaData.length} markets with prompt: "${userPrompt.substring(0, 100)}..."`);
    if (isChunked) {
      console.log(`Processing chunk ${chunkIndex + 1}/${totalChunks}`);
    }

    console.log('Starting progressive retry approach...');
    
    // Use the new progressive retry approach
    const parsedResponse = await callOpenAIWithRetry(userPrompt, cbsaData, analysisMode);

    // Final validation to ensure we have usable data
    if (!parsedResponse.scores || parsedResponse.scores.length === 0) {
      console.error('No market scores found in final response');
      throw new Error(`Analysis completed but no market scores were generated. Try simplifying your prompt or using a different approach.`);
    }

    // Count valid scores
    const validScores = parsedResponse.scores.filter((score: any) => 
      score && 
      typeof score.market === 'string' && 
      typeof score.score === 'number' && 
      score.score >= 0 && score.score <= 100 &&
      typeof score.reasoning === 'string'
    );

    if (validScores.length === 0) {
      throw new Error(`No valid market scores found in the analysis. Try using Fast Analysis mode or simplifying your prompt.`);
    }

    console.log(`Successfully processed ${validScores.length} valid market scores in ${analysisMode} mode`);

    return new Response(JSON.stringify({
      success: true,
      data: {
        ...parsedResponse,
        scores: validScores // Only return valid scores
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in territory-scoring function:', error);
    
    // Provide enhanced error messaging with specific suggestions
    let userFriendlyMessage = error.message;
    if (error.message.includes('JSON') || error.message.includes('parse')) {
      userFriendlyMessage = 'The analysis encountered a formatting issue. Try using Fast Analysis mode or simplifying your prompt for better reliability.';
    } else if (error.message.includes('no market scores') || error.message.includes('No valid market scores')) {
      userFriendlyMessage = 'The analysis completed but couldn\'t generate valid scores. Try rephrasing your criteria to be more specific, or use Fast Analysis mode.';
    } else if (error.message.includes('retry attempts')) {
      userFriendlyMessage = 'Multiple analysis attempts failed. Try using Fast Analysis mode with a simpler, more direct prompt (e.g., "high income areas" instead of complex multi-factor criteria).';
    }
    
    return new Response(JSON.stringify({
      success: false,
      error: userFriendlyMessage,
      details: error.stack || 'No stack trace available'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
