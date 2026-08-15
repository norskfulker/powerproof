/** ISO 3166-1 alpha-2 for flags; E.164-style dial codes for profile phone. */
export type PhoneDialEntry = { code: string; label: string; iso: string }

export const PHONE_DIAL_CODES: PhoneDialEntry[] = [
  { code: '+91', label: 'India (+91)', iso: 'in' },
  { code: '+1', label: 'United States / Canada (+1)', iso: 'us' },
  { code: '+44', label: 'United Kingdom (+44)', iso: 'gb' },
  { code: '+971', label: 'UAE (+971)', iso: 'ae' },
  { code: '+966', label: 'Saudi Arabia (+966)', iso: 'sa' },
  { code: '+65', label: 'Singapore (+65)', iso: 'sg' },
  { code: '+60', label: 'Malaysia (+60)', iso: 'my' },
  { code: '+61', label: 'Australia (+61)', iso: 'au' },
  { code: '+49', label: 'Germany (+49)', iso: 'de' },
  { code: '+33', label: 'France (+33)', iso: 'fr' },
  { code: '+39', label: 'Italy (+39)', iso: 'it' },
  { code: '+81', label: 'Japan (+81)', iso: 'jp' },
  { code: '+82', label: 'South Korea (+82)', iso: 'kr' },
  { code: '+86', label: 'China (+86)', iso: 'cn' },
  { code: '+55', label: 'Brazil (+55)', iso: 'br' },
  { code: '+27', label: 'South Africa (+27)', iso: 'za' },
  { code: '+234', label: 'Nigeria (+234)', iso: 'ng' },
  { code: '+254', label: 'Kenya (+254)', iso: 'ke' },
  { code: '+880', label: 'Bangladesh (+880)', iso: 'bd' },
  { code: '+92', label: 'Pakistan (+92)', iso: 'pk' },
  { code: '+94', label: 'Sri Lanka (+94)', iso: 'lk' },
  { code: '+977', label: 'Nepal (+977)', iso: 'np' },
  { code: '+7', label: 'Russia (+7)', iso: 'ru' },
  { code: '+90', label: 'Turkey (+90)', iso: 'tr' },
  { code: '+62', label: 'Indonesia (+62)', iso: 'id' },
  { code: '+63', label: 'Philippines (+63)', iso: 'ph' },
  { code: '+66', label: 'Thailand (+66)', iso: 'th' },
  { code: '+84', label: 'Vietnam (+84)', iso: 'vn' },
  { code: '+20', label: 'Egypt (+20)', iso: 'eg' },
  { code: '+973', label: 'Bahrain (+973)', iso: 'bh' },
  { code: '+968', label: 'Oman (+968)', iso: 'om' },
  { code: '+974', label: 'Qatar (+974)', iso: 'qa' },
  { code: '+31', label: 'Netherlands (+31)', iso: 'nl' },
  { code: '+34', label: 'Spain (+34)', iso: 'es' },
  { code: '+41', label: 'Switzerland (+41)', iso: 'ch' },
  { code: '+46', label: 'Sweden (+46)', iso: 'se' },
  { code: '+47', label: 'Norway (+47)', iso: 'no' },
  { code: '+48', label: 'Poland (+48)', iso: 'pl' },
  { code: '+64', label: 'New Zealand (+64)', iso: 'nz' },
  { code: '+52', label: 'Mexico (+52)', iso: 'mx' },
  { code: '+54', label: 'Argentina (+54)', iso: 'ar' },
  { code: '+57', label: 'Colombia (+57)', iso: 'co' },
]

/** Default E.164 prefix for a workspace / profile country (ISO 3166-1 alpha-2). */
export function dialCodeForCountryIso(
  countryIso: string | null | undefined,
  codes: PhoneDialEntry[] = PHONE_DIAL_CODES,
): string {
  const iso = String(countryIso ?? '')
    .trim()
    .toUpperCase()
  if (!iso) return codes[0]?.code ?? '+91'
  const lower = iso.toLowerCase()
  const hit = codes.find((c) => c.iso.toLowerCase() === lower)
  return hit?.code ?? codes[0]?.code ?? '+91'
}

/** Parse stored `+CC …` phone into dial prefix + national digits (longest-prefix match). */
export function splitStoredPhone(
  phone: string | null | undefined,
  codes: PhoneDialEntry[] = PHONE_DIAL_CODES,
): { prefix: string; number: string } {
  const raw = String(phone ?? '').trim()
  if (!raw) return { prefix: codes[0]?.code ?? '+91', number: '' }
  const sorted = [...codes].sort((a, b) => b.code.length - a.code.length)
  for (const d of sorted) {
    if (raw.startsWith(d.code)) {
      return { prefix: d.code, number: raw.slice(d.code.length).replace(/^\s+/, '') }
    }
  }
  const m = raw.match(/^(\+\d{1,4})\s*(.*)$/)
  if (m) return { prefix: m[1], number: m[2].trim() }
  return { prefix: codes[0]?.code ?? '+91', number: raw }
}
