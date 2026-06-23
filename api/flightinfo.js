import https from 'node:https'

// AeroDataBox (via RapidAPI) — real flight schedule lookup by flight number/callsign.
// Requires env var AERODATABOX_API_KEY (your RapidAPI key).
export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 's-maxage=300') // schedules change slowly; cache 5 min

  const key = process.env.AERODATABOX_API_KEY
  if (!key) return res.status(500).json({ error: 'AERODATABOX_API_KEY not set' })

  const number = String(req.query.number || '').trim().toUpperCase()
  if (!number) return res.status(400).json({ error: 'Missing number' })

  const options = {
    hostname: 'aerodatabox.p.rapidapi.com',
    port: 443,
    path: `/flights/number/${encodeURIComponent(number)}?withAircraftImage=false&withLocation=false`,
    method: 'GET',
    headers: {
      'X-RapidAPI-Key': key,
      'X-RapidAPI-Host': 'aerodatabox.p.rapidapi.com',
      'Accept': 'application/json',
    },
    timeout: 8000,
  }

  const request = https.request(options, (response) => {
    const chunks = []
    response.on('data', c => chunks.push(c))
    response.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8')
      if (response.statusCode !== 200) {
        return res.status(response.statusCode).json({ error: `AeroDataBox ${response.statusCode}`, body: raw.slice(0, 200) })
      }
      try {
        const data = JSON.parse(raw)
        const list = Array.isArray(data) ? data : []
        if (list.length === 0) return res.status(200).json({ flight: null })
        // Pick the most recent / active leg
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
    })
  })

  request.on('timeout', () => { request.destroy(); res.status(504).json({ error: 'timeout' }) })
  request.on('error', e => res.status(500).json({ error: e.message, code: e.code }))
  request.end()
}
