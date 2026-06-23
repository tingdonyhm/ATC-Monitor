import https from 'node:https'

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 's-maxage=55')

  const options = {
    hostname: 'api.airplanes.live',
    port: 443,
    path: '/v2/all',
    method: 'GET',
    headers: { 'Accept': 'application/json', 'User-Agent': 'atc-monitor/1.0' },
    timeout: 8000,
  }

  const request = https.request(options, (response) => {
    const chunks = []
    response.on('data', chunk => chunks.push(chunk))
    response.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8')
        const parsed = JSON.parse(raw)
        const aircraft = (parsed.ac || [])
          .filter(a => a.lat != null && a.lon != null)
          .slice(0, 3000)
        const states = aircraft.map(a => ({
          icao24: (a.hex || '').toLowerCase(),
          callsign: a.flight ? a.flight.trim() : null,
          originCountry: a.r || '',
          timePosition: Math.floor(Date.now() / 1000),
          lastContact: Math.floor(Date.now() / 1000),
          longitude: a.lon,
          latitude: a.lat,
          baroAltitude: a.alt_baro != null && a.alt_baro !== 'ground' ? Number(a.alt_baro) * 0.3048 : null,
          onGround: a.alt_baro === 'ground' || a.gs == null || a.gs < 30,
          velocity: a.gs != null ? Number(a.gs) * 0.514444 : null,
          trueTrack: a.track != null ? Number(a.track) : null,
          verticalRate: a.baro_rate != null ? Number(a.baro_rate) * 0.00508 : null,
          geoAltitude: a.alt_geom != null ? Number(a.alt_geom) * 0.3048 : null,
          squawk: a.squawk || null,
          spi: false,
          positionSource: 0,
        }))
        res.status(200).json({ time: Math.floor(Date.now() / 1000), states, _source: 'adsb.lol' })
      } catch (e) {
        res.status(500).json({ error: 'Parse error: ' + e.message })
      }
    })
  })

  request.on('timeout', () => { request.destroy(); res.status(504).json({ error: 'timeout' }) })
  request.on('error', e => res.status(500).json({ error: e.message, code: e.code }))
  request.end()
}
