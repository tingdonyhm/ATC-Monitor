import https from 'node:https'

// Route guide: all departures from an airport over the next ~12h, grouped into
// destinations + operating airlines. Uses AeroDataBox airport FIDS.
function pad(n) { return String(n).padStart(2, '0') }
function fmt(d) {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`
}

// "DL44" -> "DL 044": space + 3-digit min so Google recognizes it as a flight.
function normalizeFlightNumber(raw) {
  if (!raw) return null
  const cs = raw.replace(/\s+/g, ' ').trim().toUpperCase()
  const m = cs.match(/^([A-Z0-9]+?)\s*(\d+)([A-Z]?)$/)
  if (!m) return cs
  const num = m[2].length < 3 ? m[2].padStart(3, '0') : m[2]
  return `${m[1]} ${num}${m[3]}`
}

function fetchFIDS(key, iata, fromStr, toStr) {
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
      timeout: 9000,
    }
    const r = https.request(options, (resp) => {
      const chunks = []
      resp.on('data', c => chunks.push(c))
      resp.on('end', () => {
        if (resp.statusCode !== 200) return resolve({ error: resp.statusCode, departures: [] })
        try {
          const j = JSON.parse(Buffer.concat(chunks).toString('utf8'))
          resolve({ error: null, departures: j.departures || [] })
        } catch { resolve({ error: 'parse', departures: [] }) }
      })
    })
    r.on('timeout', () => { r.destroy(); resolve({ error: 'timeout', departures: [] }) })
    r.on('error', (e) => resolve({ error: e.message, departures: [] }))
    r.end()
  })
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 's-maxage=21600') // 6 h — routes barely change; protect quota

  const key = process.env.AERODATABOX_API_KEY
  if (!key) return res.status(500).json({ error: 'AERODATABOX_API_KEY not set' })

  const airport = String(req.query.airport || '').trim().toUpperCase()
  if (!/^[A-Z]{3}$/.test(airport)) return res.status(400).json({ error: 'Provide a 3-letter IATA code' })

  const now = new Date()
  const to = new Date(now.getTime() + 12 * 3600 * 1000) // next 12h
  const result = await fetchFIDS(key, airport, fmt(now), fmt(to))
  if (result.error) return res.status(502).json({ error: `AeroDataBox: ${result.error}`, routes: [] })

  // Group by destination; collect airlines + next departure per destination.
  const byDest = new Map()
  for (const f of result.departures) {
    const arr = f.arrival || {}
    const destIata = arr.airport?.iata
    if (!destIata) continue
    const airline = f.airline?.name || 'Unknown'
    const t = arr.airport?.timeZone // not always present
    let entry = byDest.get(destIata)
    if (!entry) {
      entry = { dest: destIata, name: arr.airport?.name || destIata, airlines: new Map(), count: 0 }
      byDest.set(destIata, entry)
    }
    entry.count++
    const al = entry.airlines.get(airline) || { airline, flights: [] }
    al.flights.push({
      number: normalizeFlightNumber(f.number),
      time: f.departure?.scheduledTime?.local || null,
      status: f.status || null,
    })
    entry.airlines.set(airline, al)
  }

  const routes = [...byDest.values()]
    .map(e => ({
      dest: e.dest,
      name: e.name,
      count: e.count,
      airlines: [...e.airlines.values()].map(a => ({ airline: a.airline, count: a.flights.length, flights: a.flights.slice(0, 6) }))
        .sort((a, b) => b.count - a.count),
    }))
    .sort((a, b) => b.count - a.count)

  res.status(200).json({ airport, routes, total: routes.length, _source: 'aerodatabox-fids' })
}
