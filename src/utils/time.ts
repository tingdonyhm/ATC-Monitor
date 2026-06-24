// AeroDataBox returns local times as ISO strings with a date-specific UTC offset,
// e.g. "2026-06-23 16:15+04:00" or "2026-06-23T16:15-05:00". Because the offset is
// computed per-date by the source, daylight-saving is already correct for every
// region of the world — we just need to parse and present it.

// "16:15" (airport local wall-clock time)
export function fmtTime(iso?: string | null): string | null {
  if (!iso) return null
  const m = iso.match(/[ T](\d{2}:\d{2})/)
  return m ? m[1] : null
}

// "06-24" (month-day of the local date)
export function fmtDate(iso?: string | null): string | null {
  if (!iso) return null
  const m = iso.match(/(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[2]}-${m[3]}` : null
}

// Whole-day difference between two local date strings (b - a), e.g. +1 for next-day.
export function dayDiff(a?: string | null, b?: string | null): number {
  const da = a?.match(/(\d{4})-(\d{2})-(\d{2})/)
  const db = b?.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (!da || !db) return 0
  const ta = Date.UTC(+da[1], +da[2] - 1, +da[3])
  const tb = Date.UTC(+db[1], +db[2] - 1, +db[3])
  return Math.round((tb - ta) / 86400000)
}

// "UTC+4", "UTC-5:30", "UTC" — derived from the offset embedded in the string.
export function tzOffsetLabel(iso?: string | null): string | null {
  if (!iso) return null
  const m = iso.match(/([+-])(\d{2}):(\d{2})$/)
  if (!m) return /Z$/.test(iso) ? 'UTC' : null
  const sign = m[1]
  const h = parseInt(m[2], 10)
  const min = parseInt(m[3], 10)
  if (h === 0 && min === 0) return 'UTC'
  return `UTC${sign}${h}${min ? ':' + String(min).padStart(2, '0') : ''}`
}

// "16:15 UTC+4"
export function fmtTimeTZ(iso?: string | null): string | null {
  const t = fmtTime(iso)
  if (!t) return null
  const tz = tzOffsetLabel(iso)
  return tz ? `${t} ${tz}` : t
}

// Same instant converted to the VIEWER's device timezone (auto DST via the OS/Intl).
// "21:15" in the user's local time. Needs the absolute instant, so it parses the
// full offset-bearing string.
export function fmtViewerTime(iso?: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso.replace(' ', 'T'))
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
}
