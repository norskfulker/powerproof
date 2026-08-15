/**
 * Strips sourcing intent words from user input, leaving only the product keyword.
 * "find bluetooth speakers supplier in india" → "bluetooth speakers"
 * "I need to procure 300kW EV chargers" → "300kW EV chargers"
 * "bluetooth speakers" → "bluetooth speakers" (unchanged)
 */

const INTENT_PREFIXES = [
  'i want to find',
  'i need to find',
  'i want to buy',
  'i need to buy',
  'i want to source',
  'i need to source',
  'i want to procure',
  'i need to procure',
  'i am looking for',
  'looking for',
  'i need',
  'i want',
  'find me',
  'find a',
  'find',
  'source',
  'procure',
  'buy',
  'get me',
  'get a',
  'get',
  'purchase',
  'order',
  'need a',
  'need',
  'want a',
  'want',
  'search for',
  'search',
  'show me',
  'show',
]

const INTENT_SUFFIXES = [
  'supplier',
  'suppliers',
  'manufacturer',
  'manufacturers',
  'vendor',
  'vendors',
  'wholesaler',
  'wholesalers',
  'factory',
  'factories',
  'from china',
  'from india',
  'from alibaba',
  'in india',
  'in china',
  'online',
  'wholesale',
  'bulk',
  'oem supplier',
  'cheap',
  'affordable',
  'best price',
]

export function extractProductKeyword(input: string): string {
  let cleaned = input.trim().toLowerCase()

  const sortedPrefixes = [...INTENT_PREFIXES].sort((a, b) => b.length - a.length)
  for (const prefix of sortedPrefixes) {
    if (cleaned.startsWith(prefix + ' ') || cleaned === prefix) {
      cleaned = cleaned.slice(prefix.length).trim()
      break
    }
  }

  const sortedSuffixes = [...INTENT_SUFFIXES].sort((a, b) => b.length - a.length)
  for (const suffix of sortedSuffixes) {
    if (cleaned.endsWith(' ' + suffix) || cleaned === suffix) {
      cleaned = cleaned.slice(0, cleaned.length - suffix.length).trim()
      break
    }
  }

  const original = input.trim()
  const lowerOriginal = original.toLowerCase()
  const startIdx = lowerOriginal.indexOf(cleaned)
  if (startIdx >= 0 && cleaned.length > 0) {
    return original.slice(startIdx, startIdx + cleaned.length).trim()
  }

  return input.trim()
}
