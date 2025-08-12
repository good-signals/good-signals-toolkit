import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Enhanced JSON extraction function with better error handling
function extractJSON(text: string): any {
  console.log('Attempting to extract JSON from response...');
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
  // Try to find complete JSON objects
  const jsonMatches = text.match(/\{[\s\S]*?\}/g);
  if (jsonMatches) {
    // Try each match, starting with the longest one
    const sortedMatches = jsonMatches.sort((a, b) => b.length - a.length);
    
    for (const match of sortedMatches) {
      console.log('Trying JSON object of length:', match.length);
      try {
        const parsed = JSON.parse(match);
        // Basic validation to ensure it looks like our expected structure
        if (parsed && typeof parsed === 'object' && parsed.suggested_title && Array.isArray(parsed.scores)) {
          console.log('Successfully parsed JSON object');
          return parsed;
        }
      } catch (e) {
        console.log('Failed to parse JSON object:', e.message);
        continue;
      }
    }
  }

  // If we get here, try to repair truncated JSON
  console.log('Attempting to repair truncated JSON...');
  try {
    // Find the start of the JSON
    const jsonStart = text.indexOf('{');
    if (jsonStart !== -1) {
      let jsonText = text.substring(jsonStart);
      
      // Try to find where the scores array ends and repair it
      const scoresMatch = jsonText.match(/"scores":\s*\[([\s\S]*)/);
      if (scoresMatch) {
        const beforeScores = jsonText.substring(0, jsonText.indexOf('"scores"'));
        const scoresContent = scoresMatch[1];
        
        // Count complete score objects
        const completeScores = [];
        const scoreMatches = scoresContent.match(/\{[^{}]*"market"[^{}]*"score"[^{}]*"reasoning"[^{}]*\}/g);
        
        if (scoreMatches && scoreMatches.length > 0) {
          console.log(`Found ${scoreMatches.length} complete score objects`);
          
          // Reconstruct the JSON with complete scores only
          const repairedJson = beforeScores + '"scores": [' + scoreMatches.join(', ') + ']}';
          
          try {
            return JSON.parse(repairedJson);
          } catch (e) {
            console.log('Failed to parse repaired JSON:', e.message);
          }
        }
      }
    }
  } catch (e) {
    console.log('JSON repair failed:', e.message);
  }

  // Try to parse the entire text as JSON (last resort)
  try {
    console.log('Attempting to parse entire response as JSON');
    return JSON.parse(text.trim());
  } catch (e) {
    console.log('Failed to parse entire response as JSON:', e.message);
  }

  throw new Error('No valid JSON found in response. Response may be truncated or malformed.');
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
  let validScores = 0;
  for (let i = 0; i < Math.min(5, data.scores.length); i++) {
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

// Normalize and salvage AI responses into our expected structure
function normalizeScoreItem(item: any): { market: string; score: number; reasoning?: string; sources?: string[] } | null {
  if (!item || typeof item !== 'object') return null;
  const market = item.market || item.market_name || item.cbsa || item.name;
  let score: any = item.score ?? item.rating ?? item.value;
  if (typeof score === 'string') {
    // Extract number from strings like "85%" or "Score: 85/100"
    const numMatch = score.match(/\d+(?:\.\d+)?/);
    score = numMatch ? parseFloat(numMatch[0]) : NaN;
  }
  if (typeof score !== 'number' || Number.isNaN(score)) return null;
  // Clamp 0-100
  score = Math.max(0, Math.min(100, score));
  const reasoning = item.reasoning || item.explanation || item.notes || item.justification || '';
  let sources: string[] = [];
  if (Array.isArray(item.sources)) {
    sources = item.sources
      .map((s: any) => {
        if (typeof s === 'string') return s;
        if (s && typeof s.url === 'string') return s.url;
        return '';
      })
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0);
  } else if (typeof item.sources === 'string') {
    sources = item.sources
      .split(/[;,|\n]/)
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0);
  }
  if (!market || typeof market !== 'string') return null;
  return { market, score, reasoning, sources };
}

function normalizeParsedResponse(data: any, fallbackTitle: string, fallbackSummary: string) {
  const title = typeof data?.suggested_title === 'string' && data.suggested_title.trim() !== ''
    ? data.suggested_title
    : fallbackTitle;
  const summary = typeof data?.prompt_summary === 'string' && data.prompt_summary.trim() !== ''
    ? data.prompt_summary
    : fallbackSummary;
  const rawScores = Array.isArray(data?.scores)
    ? data.scores
    : (Array.isArray(data?.results) ? data.results : (Array.isArray(data?.markets) ? data.markets : []));
  const scores = rawScores
    .map((s: any) => normalizeScoreItem(s))
    .filter((s: any) => s !== null);
  return { suggested_title: title || 'Analysis Results', prompt_summary: summary || '', scores };
}

// ---- Source diversification helpers ----
function normalizeUrl(raw: string): string | null {
  try {
    const str = (raw || '').trim();
    if (!str) return null;
    const url = new URL(/^https?:\/\//i.test(str) ? str : `https://${str}`);
    url.hostname = url.hostname.toLowerCase().replace(/^www\./, '');
    url.hash = '';
    const params = Array.from(url.searchParams.entries())
      .filter(([k]) => {
        const key = k.toLowerCase();
        return !(key.startsWith('utm_') || key === 'ref' || key === 'source' || key === 'fbclid' || key === 'gclid');
      })
      .sort((a, b) => a[0].localeCompare(b[0]));
    url.search = '';
    if (params.length) url.search = `?${new URLSearchParams(params).toString()}`;
    url.pathname = url.pathname.replace(/\/+$/, '');
    return url.toString();
  } catch {
    return null;
  }
}

function registrableDomain(raw: string): string | null {
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    const parts = host.split('.');
    if (parts.length <= 2) return host;
    const tld = parts[parts.length - 1];
    const sld = parts[parts.length - 2];
    return `${sld}.${tld}`;
  } catch {
    return null;
  }
}

function diversifySources(scores: any[], maxPerMarket = 3, maxGlobalShare = 0.3) {
  const perMarket = scores.map((item) => {
    const sources: string[] = Array.isArray(item.sources) ? item.sources.filter(Boolean) : [];
    const uniqueByUrl = Array.from(
      new Map(
        sources
          .map((s) => [normalizeUrl(s) || s.trim(), s.trim()])
          .filter(([k]) => !!k)
      ).values()
    );
    const seen = new Set<string>();
    const uniqByDomain: string[] = [];
    for (const src of uniqueByUrl) {
      const d = registrableDomain(src) || src;
      if (seen.has(d)) continue;
      seen.add(d);
      uniqByDomain.push(src);
      if (uniqByDomain.length >= maxPerMarket) break;
    }
    return { ...item, sources: uniqByDomain };
  });

  const domainCounts = new Map<string, number>();
  for (const item of perMarket) {
    const domains = new Set<string>();
    for (const src of item.sources || []) {
      const d = registrableDomain(src) || src;
      domains.add(d);
    }
    for (const d of domains) domainCounts.set(d, (domainCounts.get(d) || 0) + 1);
  }

  const total = perMarket.length || 1;
  const overRep = new Set<string>();
  for (const [d, cnt] of domainCounts.entries()) {
    if (cnt / total > maxGlobalShare) overRep.add(d);
  }
  if (overRep.size) {
    console.log('[territory-scoring] Overrepresented domains:', Array.from(overRep));
  }

  const balanced = perMarket.map((item) => {
    if ((item.sources?.length || 0) <= 1) return item;
    const kept: string[] = [];
    for (const src of item.sources || []) {
      const d = registrableDomain(src) || src;
      if (overRep.has(d)) {
        if (item.sources.length - kept.length > 1) continue; // keep at least one
      }
      kept.push(src);
    }
    return { ...item, sources: kept.length ? kept.slice(0, maxPerMarket) : item.sources?.slice(0, 1) };
  });

  const finalCounts = new Map<string, number>();
  for (const item of balanced) {
    const domains = new Set<string>();
    for (const src of item.sources || []) {
      const d = registrableDomain(src) || src;
      domains.add(d);
    }
    for (const d of domains) finalCounts.set(d, (finalCounts.get(d) || 0) + 1);
  }
  console.log('[territory-scoring] Domain distribution after balancing:', Array.from(finalCounts.entries()));

  return balanced;
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

    const perplexityApiKey = Deno.env.get('PERPLEXITY_API_KEY');
    if (!perplexityApiKey) {
      throw new Error('Perplexity API key not configured');
    }

    console.log(`Processing ${analysisMode} analysis for ${cbsaData.length} markets with prompt: "${userPrompt.substring(0, 100)}..."`);
    if (isChunked) {
      console.log(`Processing chunk ${chunkIndex + 1}/${totalChunks}`);
    }

    // Enhanced system prompt optimized for speed and chunked processing
    const getSystemPrompt = (mode: string, isChunked: boolean) => {
      const basePrompt = `You are part of the Territory Targeter tool inside the Good Signals platform. Your job is to help users assess and score U.S. markets based on criteria they provide in natural language.

CRITICAL: You MUST respond with ONLY valid JSON. Do not include any markdown, explanations, or text outside the JSON object. Ensure your JSON is complete and properly formatted.`;

      const speedOptimizations = mode === 'fast' 
        ? `
SPEED MODE: Provide quick, efficient scoring with concise reasoning. Focus on the most obvious and direct factors related to the user's criteria. Keep reasoning brief (1-2 sentences max). ALWAYS include at least 1-3 authoritative source URLs per market.`
        : `
DETAILED MODE: Provide comprehensive analysis with thorough research-based scoring. Include multiple factors and data sources in your reasoning. ALWAYS include at least 1-3 authoritative source URLs per market.`;

      const chunkingInstructions = isChunked
        ? `
CHUNKED PROCESSING: You are processing a subset of markets. Maintain consistent scoring standards across all chunks. Use the same title and summary approach for all chunks of this analysis.`
        : '';

      return `${basePrompt}${speedOptimizations}${chunkingInstructions}

Your task:
1. Interpret the user's criteria prompt (e.g., "Score markets based on Gen Z presence and cultural fit for a youth-oriented sneaker brand").
2. Generate a short, catchy title for this analysis (e.g., "Gen Z Sneaker Culture" or "Taco Affinity").
3. Score the provided U.S. markets (by CBSA) from 0–100, where 100 = strongest fit and 0 = weakest.
4. For each market, provide ${mode === 'fast' ? 'brief' : 'detailed'} explanation of the score and include 1–3 authoritative source URLs in the "sources" array.
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
      "sources": ["https://www.census.gov", "https://www.bls.gov"]
    }
  ]
}

Guidelines:
- Keep the suggested_title short, memorable, and relevant to the criteria (2-4 words max)
- ${mode === 'fast' ? 'Prioritize speed, but still cite sources' : 'Use comprehensive research and multiple data sources'}
- Include specific sources in the sources array for each market (1–3 authoritative URLs). Use distinct domains per market; include at least one local/market-specific source when possible (city/metro government, economic development, chamber, transit, or reputable local report/news). Use deep links (not homepages). Avoid repeating the same domain across many markets unless linking to a market-specific page.
- If data is missing, give a conservative score and explain.
- Do not make specific business recommendations—only assess signal strength.
- Stay consistent in your scoring logic${isChunked ? ' across all chunks' : ''}.
- ${mode === 'fast' ? 'Keep reasoning concise (1-2 sentences)' : 'Provide thorough reasoning (2-4 sentences)'}
- ENSURE your JSON response is complete and properly terminated.

Here are the CBSA markets to score: ${cbsaData.map((cbsa: any) => cbsa.name).join(', ')}`;
    };

    console.log('Sending request to Perplexity API...');
    
    // Adjust model and parameters based on analysis mode
    const modelConfig = analysisMode === 'fast' 
      ? {
          model: 'sonar', // Lightweight, cost-effective search model
          temperature: 0.2,
          max_tokens: 6000
        }
      : {
          model: 'sonar-pro', // Advanced search model for detailed analysis
          temperature: 0.1,
          max_tokens: 8000 // sonar-pro has 8k max output limit
        };
    
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityApiKey}`,
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
        return_images: false,
        return_related_questions: false,
        search_recency_filter: 'month',
        frequency_penalty: 1,
        presence_penalty: 0
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Perplexity API error:', response.status, response.statusText, errorText);
      throw new Error(`Perplexity API returned ${response.status}: ${response.statusText}. Details: ${errorText}`);
    }

    const data = await response.json();
    console.log('Received response from Perplexity API');

    const aiContent = data.choices[0]?.message?.content;
    if (!aiContent) {
      throw new Error('No content received from Perplexity API');
    }

    console.log('AI response length:', aiContent.length);
    console.log('First 200 chars:', aiContent.substring(0, 200));
    console.log('Last 200 chars:', aiContent.substring(Math.max(0, aiContent.length - 200)));

// Extract, normalize, and validate JSON from AI response
let parsedResponse;
try {
  const raw = extractJSON(aiContent);
  const normalized = normalizeParsedResponse(
    raw,
    isChunked && chunkIndex > 0 ? '' : 'Analysis Results',
    isChunked && chunkIndex > 0 ? '' : `Summary for: ${userPrompt.substring(0, 80)}...`
  );
  if (!validateResponse(normalized)) {
    throw new Error('Response validation failed - invalid structure');
  }
  parsedResponse = normalized;
} catch (parseError) {
  console.error('Failed to parse Perplexity response:', parseError.message);
  console.error('Raw AI content (first 1000 chars):', aiContent.substring(0, 1000));
  console.error('Raw AI content (last 1000 chars):', aiContent.substring(Math.max(0, aiContent.length - 1000)));

  // Fallback to OpenAI if available
  const openaiKey = Deno.env.get('OPENAI_API_KEY');
  if (openaiKey) {
    try {
      console.log('Attempting fallback via OpenAI (gpt-4o-mini)...');
      const oaRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: getSystemPrompt(analysisMode, isChunked) },
            { role: 'user', content: `User's scoring criteria: ${userPrompt}` },
          ],
          temperature: 0.2,
          top_p: 0.9,
          max_tokens: 2000,
        })
      });
      if (!oaRes.ok) {
        const t = await oaRes.text();
        throw new Error(`OpenAI returned ${oaRes.status}: ${oaRes.statusText}. Details: ${t}`);
      }
      const oaJson = await oaRes.json();
      const oaContent = oaJson.choices?.[0]?.message?.content || '';
      if (!oaContent) throw new Error('OpenAI returned empty content');
      const raw2 = extractJSON(oaContent);
      const normalized2 = normalizeParsedResponse(
        raw2,
        'Analysis Results',
        `Summary for: ${userPrompt.substring(0, 80)}...`
      );
      if (!validateResponse(normalized2)) {
        throw new Error('OpenAI response validation failed - invalid structure');
      }
      parsedResponse = normalized2;
      console.log('OpenAI fallback succeeded.');
    } catch (oaError) {
      console.error('OpenAI fallback failed:', oaError.message);
      throw new Error(`Failed to parse AI responses. Perplexity error: ${parseError.message}. OpenAI fallback error: ${oaError.message}`);
    }
  } else {
    // No fallback possible
    throw new Error(`Failed to parse AI response and no OpenAI fallback configured: ${parseError.message}`);
  }
}

console.log('Applying source diversification safeguards');
const diversifiedData = { ...parsedResponse, scores: diversifySources(parsedResponse.scores) };

return new Response(JSON.stringify({
  success: true,
  data: diversifiedData
}), {
  headers: { ...corsHeaders, 'Content-Type': 'application/json' },
});

  } catch (error) {
    console.error('Error in territory-scoring function:', error);
    
    // Return detailed error information for debugging
    return new Response(JSON.stringify({
      success: false,
      error: `Analysis failed: ${error.message}`,
      details: {
        errorType: error.constructor.name,
        stack: error.stack || 'No stack trace available',
        timestamp: new Date().toISOString()
      }
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
