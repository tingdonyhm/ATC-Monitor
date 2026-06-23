import https from 'node:https'

// Real irregular-ops feed built from AeroDataBox airport FIDS (departures).
// We sample a few major hubs and surface cancelled / diverted / delayed flights.
const AIRPORTS = ['JFK', 'LAX', 'ORD', 'LHR', 'FRA', 'DXB']

function pad(n) { return String(n).padStart(2, '0') }
function fmt(d) {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`
}

function fetchAirport(key, iata, fromStr, toStr) {
  return new Promise((resolve) => {
    const path = `/flights/airports/iata/${iata}/${fromStr}/${toStr}?direction=Departure&withCancelled=true&withCodeshared=false&withLeg=true`
    const options = {
      hostname: 'aerodatabox.p.rapidapi.com',
      port: 443,
      path,
      method: 'GET',
      headers: {
        'x-rapidapi-key': key,
        'x-rapidapi-host': 'aerodatabox.p.rapidapi.com',
        'Accept': 'application/json',
      },
      timeout: 8000,
    }
    const r = https.request(options, (resp) => {
      const chunks = []
      resp.on('data', c => chunks.push(c))
      resp.on('end', () => {
        try {
          const j = JSON.parse(Buffer.concat(chunks).toString('utf8'))
          resolve({ iata, departures: j.departures || [] })
        } catch { resolve({ iata, departures: [] }) }
      })
    })
    r.on('timeout', () => { r.destroy(); resolve({ iata, departures: [] }) })
    r.on('error', () => resolve({ iata, departures: [] }))
    r.end()
  })
}

function delayMinutes(mv) {
  const s = mv?.scheduledTime?.utc
  const a = mv?.revisedTime?.utc || mv?.predictedTime?.utc || mv?.runwayTime?.utc
  if (!s || !a) return null
  const ms = new Date(a).getTime() - new Date(s).getTime()
  if (Number.isNaN(ms)) return null
  return Math.round(ms / 60000)
}

function mapStatus(raw, delay) {
  const s = (raw || '').toLowerCase()
  if (s.includes('cancel')) return 'cancelled'
  if (s.includes('divert')) return 'diverted'
  if (delay != null && delay > 15) return 'active' // delayed
  return null // not irregular
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 's-maxage=900') // 15 min cache to protect quota

  const key = process.env.AERODATABOX_API_KEY
  if (!key) return res.status(500).json({ error: 'AERODATABOX_API_KEY not set' })

  const now = new Date()
  const from = new Date(now.getTime() - 3 * 3600 * 1000)
  const to = new Date(now.getTime() + 3 * 3600 * 1000)
  const fromStr = fmt(from), toStr = fmt(to)

  const sleep = (ms) => new Promise(r => setTimeout(r, ms))

  try {
    // Fetch sequentially with a gap — the BASIC plan has a per-second rate limit,
    // so firing all airports at once triggers 429s.
    const results = []
    for (const a of AIRPORTS) {
      results.push(await fetchAirport(key, a, fromStr, toStr))
      await sleep(350)
    }
    const flights = []
    for (const { iata, departures } of results) {
      for (const f of departures) {
        const dep = f.departure || {}
        const arr = f.arrival || {}
        const delay = delayMinutes(dep)
        const arrDelay = delayMinutes(arr)
        const status = mapStatus(f.status, delay)
        if (!status) continue
        flights.push({
          callsign: f.number ? f.number.replace(/\s+/g, '') : 'N/A',
          airline: f.airline?.name || '',
          departure: iata,
          arrival: arr.airport?.iata || arr.airport?.icao || '???',
          status,
          delay: status === 'cancelled' ? null : delay,
          scheduledDep: dep.scheduledTime?.local || null,
          estimatedDep: dep.revisedTime?.local || dep.scheduledTime?.local || null,
          scheduledArr: arr.scheduledTime?.local || null,
          estimatedArr: arr.revisedTime?.local || arr.predictedTime?.local || arr.scheduledTime?.local || null,
          arrDelay: status === 'cancelled' ? null : arrDelay,
          depTerminal: dep.terminal || null,
          depGate: dep.gate || null,
          arrTerminal: arr.terminal || null,
          arrGate: arr.gate || null,
          aircraft: f.aircraft?.model || null,
          reg: f.aircraft?.reg || null,
          rawStatus: f.status || null,
        })
      }
    }
    // de-dupe by callsign, sort: cancelled/diverted first, then by delay desc
    const seen = new Set()
    const deduped = flights.filter(f => {
      if (seen.has(f.callsign)) return false
      seen.add(f.callsign); return true
    }).sort((a, b) => (b.delay ?? 999) - (a.delay ?? 999))

    res.status(200).json({ flights: deduped, _source: 'aerodatabox-fids', updated: now.toISOString() })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
