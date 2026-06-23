import https from 'node:https'
import { hexToCountry } from './_country.js'

// adsb.lol /v2/all no longer exists. We fan out to point queries over busy
// global regions (250nm radius each) in parallel, then merge + dedupe by hex.
const REGIONS = [
  [40.6, -73.7],  // New York
  [34.0, -118.2], // Los Angeles
  [41.9, -87.6],  // Chicago
  [33.6, -84.4],  // Atlanta
  [51.5, -0.1],   // London
  [50.0, 8.5],    // Frankfurt
  [41.0, 28.8],   // Istanbul
  [25.2, 55.3],   // Dubai
  [28.5, 77.1],   // Delhi
  [1.3, 103.8],   // Singapore
  [35.6, 139.7],  // Tokyo
  [22.3, 114.1],  // Hong Kong
  [-33.8, 151.2], // Sydney
  [-23.5, -46.6], // São Paulo
]

function fetchPoint(lat, lon) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'api.adsb.lol',
      port: 443,
      path: `/v2/point/${lat}/${lon}/250`,
      method: 'GET',
      headers: { 'Accept': 'application/json', 'User-Agent': 'atc-monitor/1.0' },
      timeout: 7000,
    }
    const r = https.request(options, (resp) => {
      const chunks = []
      resp.on('data', c => chunks.push(c))
      resp.on('end', () => {
        try {
          const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'))
          resolve(parsed.ac || [])
        } catch { resolve([]) }
      })
    })
    r.on('timeout', () => { r.destroy(); resolve([]) })
    r.on('error', () => resolve([]))
    r.end()
  })
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 's-maxage=55')

  try {
    const results = await Promise.all(REGIONS.map(([la, lo]) => fetchPoint(la, lo)))
    const byHex = new Map()
    for (const list of results) {
      for (const a of list) {
        if (a.lat == null || a.lon == null) continue
        const hex = (a.hex || '').toLowerCase()
        if (hex && !byHex.has(hex)) byHex.set(hex, a)
      }
    }
    const states = [...byHex.values()].map(a => ({
      icao24: (a.hex || '').toLowerCase(),
      callsign: a.flight ? a.flight.trim() : null,
      originCountry: hexToCountry(a.hex) || a.r || '',
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
    res.status(500).json({ error: e.message })
  }
}
