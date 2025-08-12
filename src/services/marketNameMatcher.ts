/**
 * Market Name Matcher Service
 * Provides intelligent market name matching with normalization and fuzzy matching
 * to achieve 100% success rate in territory analysis
 */

export interface MatchResult {
  matched: boolean;
  confidence: number;
  normalizedMarketName: string;
  normalizedInputName: string;
  matchType: 'exact' | 'normalized' | 'fuzzy' | 'keyword';
  suggestions?: string[];
}

export interface MatchContext {
  availableMarkets: string[];
  threshold?: number; // Minimum confidence threshold (default: 0.8)
  enableFuzzy?: boolean; // Enable fuzzy matching (default: true)
  enableKeyword?: boolean; // Enable keyword matching (default: true)
}

/**
 * Normalizes market names for better matching
 */
export function normalizeMarketName(name: string): string {
  if (!name) return '';
  
  return name
    // Remove extra whitespace and normalize
    .trim()
    .replace(/\s+/g, ' ')
    // Normalize common abbreviations
    .replace(/\bSt\./g, 'Saint')
    .replace(/\bFt\./g, 'Fort')
    .replace(/\bMt\./g, 'Mount')
    // Remove common suffixes and extra geographic info for core matching
    .replace(/,\s*[A-Z]{2}(-[A-Z]{2})*$/g, '') // Remove state suffixes like ", CA" or ", NY-NJ-PA"
    .toLowerCase();
}

/**
 * Extracts core city name from full CBSA name
 */
export function extractCoreMarketName(name: string): string {
  if (!name) return '';
  
  return name
    // Take everything before the first comma (main city)
    .split(',')[0]
    // Handle hyphenated cities (take first part)
    .split('-')[0]
    .trim()
    .toLowerCase();
}

/**
 * Calculates Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
  
  for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= b.length; j++) matrix[j][0] = j;
  
  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const substitutionCost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // insertion
        matrix[j - 1][i] + 1, // deletion
        matrix[j - 1][i - 1] + substitutionCost // substitution
      );
    }
  }
  
  return matrix[b.length][a.length];
}

/**
 * Calculates similarity score between two strings (0-1)
 */
function calculateSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  
  const distance = levenshteinDistance(a, b);
  const maxLength = Math.max(a.length, b.length);
  
  return maxLength === 0 ? 1 : 1 - (distance / maxLength);
}

/**
 * Performs keyword-based matching
 */
function findKeywordMatches(inputName: string, availableMarkets: string[]): Array<{market: string, score: number}> {
  const inputWords = inputName.toLowerCase().split(/[\s-,]+/).filter(word => word.length > 2);
  
  return availableMarkets.map(market => {
    const marketWords = market.toLowerCase().split(/[\s-,]+/).filter(word => word.length > 2);
    const matchedWords = inputWords.filter(word => 
      marketWords.some(marketWord => marketWord.includes(word) || word.includes(marketWord))
    );
    
    const score = matchedWords.length / Math.max(inputWords.length, 1);
    return { market, score };
  }).filter(result => result.score > 0);
}

/**
 * Main market matching function with comprehensive fallback strategies
 */
export function findMarketMatch(inputName: string, context: MatchContext): MatchResult {
  const { availableMarkets, threshold = 0.8, enableFuzzy = true, enableKeyword = true } = context;
  
  if (!inputName || !availableMarkets.length) {
    return {
      matched: false,
      confidence: 0,
      normalizedMarketName: '',
      normalizedInputName: inputName,
      matchType: 'exact'
    };
  }

  const normalizedInput = normalizeMarketName(inputName);
  const coreInput = extractCoreMarketName(inputName);
  
  // Strategy 1: Exact match
  for (const market of availableMarkets) {
    if (market === inputName) {
      return {
        matched: true,
        confidence: 1.0,
        normalizedMarketName: market,
        normalizedInputName: inputName,
        matchType: 'exact'
      };
    }
  }
  
  // Strategy 2: Normalized match
  const normalizedMarkets = availableMarkets.map(market => ({
    original: market,
    normalized: normalizeMarketName(market),
    core: extractCoreMarketName(market)
  }));
  
  for (const { original, normalized, core } of normalizedMarkets) {
    if (normalized === normalizedInput || core === coreInput) {
      return {
        matched: true,
        confidence: 0.95,
        normalizedMarketName: original,
        normalizedInputName: inputName,
        matchType: 'normalized'
      };
    }
  }
  
  if (!enableFuzzy && !enableKeyword) {
    return {
      matched: false,
      confidence: 0,
      normalizedMarketName: '',
      normalizedInputName: inputName,
      matchType: 'exact',
      suggestions: availableMarkets.slice(0, 3)
    };
  }
  
  let bestMatch: { market: string, confidence: number, type: 'fuzzy' | 'keyword' } | null = null;
  
  // Strategy 3: Fuzzy matching
  if (enableFuzzy) {
    for (const { original, normalized, core } of normalizedMarkets) {
      const fullSimilarity = calculateSimilarity(normalizedInput, normalized);
      const coreSimilarity = calculateSimilarity(coreInput, core);
      const confidence = Math.max(fullSimilarity, coreSimilarity);
      
      if (confidence >= threshold && (!bestMatch || confidence > bestMatch.confidence)) {
        bestMatch = { market: original, confidence, type: 'fuzzy' };
      }
    }
  }
  
  // Strategy 4: Keyword matching
  if (enableKeyword) {
    const keywordMatches = findKeywordMatches(inputName, availableMarkets);
    for (const { market, score } of keywordMatches) {
      const confidence = score * 0.9; // Slightly lower confidence for keyword matches
      if (confidence >= threshold && (!bestMatch || confidence > bestMatch.confidence)) {
        bestMatch = { market, confidence, type: 'keyword' };
      }
    }
  }
  
  if (bestMatch) {
    return {
      matched: true,
      confidence: bestMatch.confidence,
      normalizedMarketName: bestMatch.market,
      normalizedInputName: inputName,
      matchType: bestMatch.type
    };
  }
  
  // No match found - provide suggestions
  const suggestions = normalizedMarkets
    .map(({ original, normalized }) => ({
      market: original,
      similarity: calculateSimilarity(normalizedInput, normalized)
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 3)
    .map(s => s.market);
  
  return {
    matched: false,
    confidence: 0,
    normalizedMarketName: '',
    normalizedInputName: inputName,
    matchType: 'fuzzy',
    suggestions
  };
}

/**
 * Batch matching function for multiple market names
 */
export function batchMatchMarkets(
  inputNames: string[], 
  availableMarkets: string[],
  options?: Partial<MatchContext>
): Array<{ input: string; result: MatchResult }> {
  const context: MatchContext = {
    availableMarkets,
    threshold: 0.8,
    enableFuzzy: true,
    enableKeyword: true,
    ...options
  };
  
  return inputNames.map(input => ({
    input,
    result: findMarketMatch(input, context)
  }));
}