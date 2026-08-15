/** Country options for War Room — edge functions match on `label` (country name). */
export const WAR_ROOM_COUNTRY_OPTIONS = [
  { code: 'IN', label: 'India', flag: '🇮🇳' },
  { code: 'US', label: 'USA', flag: '🇺🇸' },
  { code: 'NG', label: 'Nigeria', flag: '🇳🇬' },
  { code: 'KE', label: 'Kenya', flag: '🇰🇪' },
  { code: 'ID', label: 'Indonesia', flag: '🇮🇩' },
  { code: 'BR', label: 'Brazil', flag: '🇧🇷' },
  { code: 'PH', label: 'Philippines', flag: '🇵🇭' },
  { code: 'PK', label: 'Pakistan', flag: '🇵🇰' },
  { code: 'BD', label: 'Bangladesh', flag: '🇧🇩' },
  { code: 'VN', label: 'Vietnam', flag: '🇻🇳' },
  { code: 'EG', label: 'Egypt', flag: '🇪🇬' },
  { code: 'MX', label: 'Mexico', flag: '🇲🇽' },
  { code: 'GH', label: 'Ghana', flag: '🇬🇭' },
  { code: 'TZ', label: 'Tanzania', flag: '🇹🇿' },
  { code: 'UG', label: 'Uganda', flag: '🇺🇬' },
  { code: 'ET', label: 'Ethiopia', flag: '🇪🇹' },
  { code: 'SG', label: 'Singapore', flag: '🇸🇬' },
  { code: 'AE', label: 'UAE', flag: '🇦🇪' },
  { code: 'GB', label: 'UK', flag: '🇬🇧' },
  { code: 'DE', label: 'Germany', flag: '🇩🇪' },
  { code: 'AU', label: 'Australia', flag: '🇦🇺' },
  { code: 'JP', label: 'Japan', flag: '🇯🇵' },
  { code: 'KR', label: 'South Korea', flag: '🇰🇷' },
] as const

export type WarRoomCountry = (typeof WAR_ROOM_COUNTRY_OPTIONS)[number]['label']

/** Flat label list (legacy imports). */
export const WAR_ROOM_COUNTRIES: readonly WarRoomCountry[] = WAR_ROOM_COUNTRY_OPTIONS.map(
  (o) => o.label,
)

/** Options for `CountrySelect` — label is the edge-function country name. */
export const WAR_ROOM_COUNTRY_SELECT_OPTIONS = WAR_ROOM_COUNTRY_OPTIONS.map((o) => ({
  name: o.label,
  code: o.code,
}))

export const WAR_ROOM_DEFAULT_COUNTRY: WarRoomCountry = 'India'

export function warRoomCountryFlag(name: string): string | null {
  return WAR_ROOM_COUNTRY_OPTIONS.find((o) => o.label === name)?.flag ?? null
}

export function isWarRoomCountry(value: string): value is WarRoomCountry {
  return WAR_ROOM_COUNTRIES.includes(value as WarRoomCountry)
}

export function normalizeWarRoomCountry(value: string): WarRoomCountry {
  return isWarRoomCountry(value) ? value : WAR_ROOM_DEFAULT_COUNTRY
}
