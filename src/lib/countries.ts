export interface Country {
  code: string
  name: string
  flag: string
  currency: string
  currencySymbol: string
  locale: string
}

export const DEFAULT_COUNTRY_CODE = 'IN'
export const DEFAULT_COUNTRY_NAME = 'India'

export const SUPPORTED_COUNTRIES: Country[] = [
  { code: 'IN', name: 'India', flag: '🇮🇳', currency: 'INR', currencySymbol: '₹', locale: 'en-IN' },
  { code: 'US', name: 'United States', flag: '🇺🇸', currency: 'USD', currencySymbol: '$', locale: 'en-US' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', currency: 'GBP', currencySymbol: '£', locale: 'en-GB' },
  { code: 'AE', name: 'UAE', flag: '🇦🇪', currency: 'AED', currencySymbol: 'AED', locale: 'en-AE' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬', currency: 'SGD', currencySymbol: 'S$', locale: 'en-SG' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺', currency: 'AUD', currencySymbol: 'A$', locale: 'en-AU' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', currency: 'CAD', currencySymbol: 'C$', locale: 'en-CA' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬', currency: 'NGN', currencySymbol: '₦', locale: 'en-NG' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪', currency: 'KES', currencySymbol: 'KSh', locale: 'en-KE' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦', currency: 'ZAR', currencySymbol: 'R', locale: 'en-ZA' },
  { code: 'TZ', name: 'Tanzania', flag: '🇹🇿', currency: 'TZS', currencySymbol: 'TSh', locale: 'en-TZ' },
  { code: 'GH', name: 'Ghana', flag: '🇬🇭', currency: 'GHS', currencySymbol: '₵', locale: 'en-GH' },
]

export const INR_RATES: Record<string, number> = {
  INR: 1,
  USD: 0.012,
  GBP: 0.0095,
  AED: 0.044,
  SGD: 0.016,
  AUD: 0.018,
  CAD: 0.016,
  NGN: 18.5,
  KES: 1.56,
  ZAR: 0.22,
  TZS: 0.035,
  GHS: 0.18,
}

const ISO_ALPHA2_COUNTRY_CODES = [
  'AD','AE','AF','AG','AI','AL','AM','AO','AQ','AR','AS','AT','AU','AW','AX','AZ','BA','BB','BD','BE','BF','BG','BH','BI','BJ','BL','BM','BN','BO','BQ','BR','BS','BT','BV','BW','BY','BZ','CA','CC','CD','CF','CG','CH','CI','CK','CL','CM','CN','CO','CR','CU','CV','CW','CX','CY','CZ','DE','DJ','DK','DM','DO','DZ','EC','EE','EG','EH','ER','ES','ET','FI','FJ','FK','FM','FO','FR','GA','GB','GD','GE','GF','GG','GH','GI','GL','GM','GN','GP','GQ','GR','GS','GT','GU','GW','GY','HK','HM','HN','HR','HT','HU','ID','IE','IL','IM','IN','IO','IQ','IR','IS','IT','JE','JM','JO','JP','KE','KG','KH','KI','KM','KN','KP','KR','KW','KY','KZ','LA','LB','LC','LI','LK','LR','LS','LT','LU','LV','LY','MA','MC','MD','ME','MF','MG','MH','MK','ML','MM','MN','MO','MP','MQ','MR','MS','MT','MU','MV','MW','MX','MY','MZ','NA','NC','NE','NF','NG','NI','NL','NO','NP','NR','NU','NZ','OM','PA','PE','PF','PG','PH','PK','PL','PM','PN','PR','PS','PT','PW','PY','QA','RE','RO','RS','RU','RW','SA','SB','SC','SD','SE','SG','SH','SI','SJ','SK','SL','SM','SN','SO','SR','SS','ST','SV','SX','SY','SZ','TC','TD','TF','TG','TH','TJ','TK','TL','TM','TN','TO','TR','TT','TV','TW','TZ','UA','UG','UM','US','UY','UZ','VA','VC','VE','VG','VI','VN','VU','WF','WS','YE','YT','ZA','ZM','ZW','XK',
] as const

const ISO_ALPHA2_SET = new Set<string>(ISO_ALPHA2_COUNTRY_CODES)

const ISO_ALPHA3_TO_ALPHA2: Record<string, string> = {
  USA: 'US', GBR: 'GB', IND: 'IN', GHA: 'GH', ARE: 'AE', AUS: 'AU', CAN: 'CA', SGP: 'SG', NGA: 'NG',
  KEN: 'KE', ZAF: 'ZA', TZA: 'TZ', DEU: 'DE', FRA: 'FR', ESP: 'ES', ITA: 'IT', NLD: 'NL', BEL: 'BE',
  SWE: 'SE', NOR: 'NO', DNK: 'DK', FIN: 'FI', CHE: 'CH', AUT: 'AT', IRL: 'IE', PRT: 'PT', GRC: 'GR',
  POL: 'PL', CZE: 'CZ', SVK: 'SK', HUN: 'HU', ROU: 'RO', BGR: 'BG', HRV: 'HR', SVN: 'SI', SRB: 'RS',
  BIH: 'BA', MNE: 'ME', MKD: 'MK', ALB: 'AL', MDA: 'MD', UKR: 'UA', BLR: 'BY', RUS: 'RU', TUR: 'TR',
  CYP: 'CY', GEO: 'GE', ARM: 'AM', AZE: 'AZ', ISR: 'IL', PSE: 'PS', SAU: 'SA', QAT: 'QA', KWT: 'KW',
  OMN: 'OM', BHR: 'BH', IRN: 'IR', IRQ: 'IQ', JOR: 'JO', LBN: 'LB', SYR: 'SY', YEM: 'YE', AFG: 'AF',
  PAK: 'PK', BGD: 'BD', LKA: 'LK', NPL: 'NP', BTN: 'BT', MDV: 'MV', CHN: 'CN', JPN: 'JP', KOR: 'KR',
  PRK: 'KP', TWN: 'TW', HKG: 'HK', MAC: 'MO', MNG: 'MN', KAZ: 'KZ', UZB: 'UZ', TKM: 'TM', KGZ: 'KG',
  TJK: 'TJ', THA: 'TH', VNM: 'VN', KHM: 'KH', LAO: 'LA', MMR: 'MM', MYS: 'MY', IDN: 'ID', PHL: 'PH',
  BRN: 'BN', TLS: 'TL', PNG: 'PG', NZL: 'NZ', FJI: 'FJ', WSM: 'WS', TON: 'TO', VUT: 'VU', SLB: 'SB',
  FSM: 'FM', PLW: 'PW', MHL: 'MH', NRU: 'NR', KIR: 'KI', TUV: 'TV', EGY: 'EG', DZA: 'DZ', MAR: 'MA',
  TUN: 'TN', LBY: 'LY', SDN: 'SD', SSD: 'SS', ETH: 'ET', SOM: 'SO', DJI: 'DJ', ERI: 'ER', UGA: 'UG',
  RWA: 'RW', BDI: 'BI', COD: 'CD', COG: 'CG', GAB: 'GA', GNQ: 'GQ', CMR: 'CM', CAF: 'CF', TCD: 'TD',
  NER: 'NE', MLI: 'ML', MRT: 'MR', SEN: 'SN', GMB: 'GM', GIN: 'GN', GNB: 'GW', SLE: 'SL', LBR: 'LR',
  CIV: 'CI', TGO: 'TG', BEN: 'BJ', BFA: 'BF', CPV: 'CV', STP: 'ST', AGO: 'AO', ZMB: 'ZM',
  ZWE: 'ZW', MOZ: 'MZ', MWI: 'MW', NAM: 'NA', BWA: 'BW', SWZ: 'SZ', LSO: 'LS', MDG: 'MG', MUS: 'MU',
  SYC: 'SC', COM: 'KM', MEX: 'MX', GTM: 'GT', BLZ: 'BZ', HND: 'HN', SLV: 'SV', NIC: 'NI',
  CRI: 'CR', PAN: 'PA', CUB: 'CU', HTI: 'HT', DOM: 'DO', JAM: 'JM', TTO: 'TT', BRB: 'BB', BHS: 'BS',
  ATG: 'AG', DMA: 'DM', GRD: 'GD', KNA: 'KN', LCA: 'LC', VCT: 'VC', ARG: 'AR', BOL: 'BO', BRA: 'BR',
  CHL: 'CL', COL: 'CO', ECU: 'EC', GUY: 'GY', PRY: 'PY', PER: 'PE', SUR: 'SR', URY: 'UY', VEN: 'VE',
}

const COUNTRY_NAME_ALIASES: Record<string, string> = {
  usa: 'US',
  us: 'US',
  uk: 'GB',
  uae: 'AE',
  russia: 'RU',
  'south korea': 'KR',
  'north korea': 'KP',
  vietnam: 'VN',
  laos: 'LA',
  syria: 'SY',
  bolivia: 'BO',
  moldova: 'MD',
  tanzania: 'TZ',
  'ivory coast': 'CI',
  'cote divoire': 'CI',
  'czech republic': 'CZ',
  palestine: 'PS',
  kosovo: 'XK',
}

function normalizeCountry(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/gi, ' ')
    .trim()
    .toLowerCase()
}

const INTL_REGION_DISPLAY_NAMES =
  typeof Intl !== 'undefined' && typeof Intl.DisplayNames === 'function'
    ? new Intl.DisplayNames(['en'], { type: 'region' })
    : null

const ISO_NAME_TO_CODE = (() => {
  const map = new Map<string, string>()
  for (const [key, value] of Object.entries(COUNTRY_NAME_ALIASES)) {
    map.set(normalizeCountry(key), value)
  }
  for (const code of ISO_ALPHA2_COUNTRY_CODES) {
    const label = INTL_REGION_DISPLAY_NAMES?.of(code)
    if (label) map.set(normalizeCountry(label), code)
  }
  return map
})()

export function convertFromINR(amountINR: number, toCurrency: string): number {
  const rate = INR_RATES[toCurrency] ?? 1
  return amountINR * rate
}

export function getCountryByCode(code: string): Country {
  return (
    SUPPORTED_COUNTRIES.find((c) => c.code === code) ??
    SUPPORTED_COUNTRIES.find((c) => c.code === DEFAULT_COUNTRY_CODE) ??
    SUPPORTED_COUNTRIES[0]
  )
}

export const DEFAULT_COUNTRY = getCountryByCode(DEFAULT_COUNTRY_CODE)


/** Plain-English country name for AI prompts — market is India-only. */
export function countryNameForPrompt(_value?: string | null): string {
  return DEFAULT_COUNTRY_NAME
}

/** Resolve a display name like "India" to ISO 3166-1 alpha-2 for flag images. Defaults to India. */
export function getCountryCodeFromName(name: string | null | undefined): string {
  const n = normalizeCountry(String(name ?? ''))
  if (!n) return DEFAULT_COUNTRY_CODE

  if (/^[a-z]{2}$/.test(n)) {
    const code = n.toUpperCase()
    return ISO_ALPHA2_SET.has(code) ? code : DEFAULT_COUNTRY_CODE
  }

  if (/^[a-z]{3}$/.test(n)) {
    const fromAlpha3 = ISO_ALPHA3_TO_ALPHA2[n.toUpperCase()]
    if (fromAlpha3) return fromAlpha3
  }

  const direct = ISO_NAME_TO_CODE.get(n)
  if (direct) return direct

  const found = SUPPORTED_COUNTRIES.find((c) => normalizeCountry(c.name) === n)
  if (found) return found.code

  for (const [countryName, code] of ISO_NAME_TO_CODE.entries()) {
    if (n.includes(countryName) || countryName.includes(n)) return code
  }

  return DEFAULT_COUNTRY_CODE
}

