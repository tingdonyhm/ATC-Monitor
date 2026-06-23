import https from 'node:https'

// AeroDataBox (via RapidAPI) — real flight schedule lookup by flight number/callsign.
// Requires env var AERODATABOX_API_KEY (your RapidAPI key).
function request(key, number, date) {
  // With a date -> historical/future schedule; without -> nearest current.
  const datePath = date ? `/${date}` : ''
  return new Promise((resolve) => {
    const options = {
      hostname: 'aerodatabox.p.rapidapi.com',
      port: 443,
      path: `/flights/number/${encodeURIComponent(number)}${datePath}?withAircraftImage=false&withLocation=false`,
      method: 'GET',
      headers: {
        'x-rapidapi-key': key,
        'x-rapidapi-host': 'aerodatabox.p.rapidapi.com',
        'Accept': 'application/json',
      },
      timeout: 8000,
    }
    const r = https.request(options, (response) => {
      const chunks = []
      response.on('data', c => chunks.push(c))
      response.on('end', () => resolve({ status: response.statusCode, body: Buffer.concat(chunks).toString('utf8') }))
    })
    r.on('timeout', () => { r.destroy(); resolve({ status: 504, body: '' }) })
    r.on('error', (e) => resolve({ status: 500, body: e.message }))
    r.end()
  })
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 's-maxage=300')

  const key = process.env.AERODATABOX_API_KEY
  if (!key) return res.status(500).json({ error: 'AERODATABOX_API_KEY not set' })

  const number = String(req.query.number || '').trim().toUpperCase()
  if (!number) return res.status(400).json({ error: 'Missing number' })

  // Optional date YYYY-MM-DD (validated to avoid path injection).
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(req.query.date || '')) ? req.query.date : null

  const sleep = (ms) => new Promise(r => setTimeout(r, ms))

  // Retry once on a per-second rate-limit (429).
  let resp = await request(key, number, date)
  if (resp.status === 429) {
    await sleep(1200)
    resp = await request(key, number, date)
  }

  if (resp.status !== 200) {
    return res.status(resp.status).json({ error: `AeroDataBox ${resp.status}`, body: resp.body.slice(0, 200) })
  }

  try {
    const data = JSON.parse(resp.body)
    const list = Array.isArray(data) ? data : []
    if (list.length === 0) return res.status(200).json({ flight: null })
    const f = list[list.length - 1]
    const flight = {
      number: f.number || number,
      airline: f.airline?.name || null,
      status: f.status || null,
      departure: {
        airport: f.departure?.airport?.iata || f.departure?.airport?.icao || null,
        name: f.departure?.airport?.name || null,
        scheduled: f.departure?.scheduledTime?.local || null,
        actual: f.departure?.revisedTime?.local || f.departure?.runwayTime?.local || null,
        terminal: f.departure?.terminal || null,
        gate: f.departure?.gate || null,
      },
      arrival: {
        airport: f.arrival?.airport?.iata || f.arrival?.airport?.icao || null,
        name: f.arrival?.airport?.name || null,
        scheduled: f.arrival?.scheduledTime?.local || null,
        actual: f.arrival?.revisedTime?.local || f.arrival?.predictedTime?.local || null,
        terminal: f.arrival?.terminal || null,
        gate: f.arrival?.gate || null,
      },
    }
    res.status(200).json({ flight })
  } catch (e) {
    res.status(500).json({ error: 'Parse error: ' + e.message })
  }
}
