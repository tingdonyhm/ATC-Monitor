import https from 'node:https'
import { hexToCountry } from './_country.js'

// adsb.lol /v2/all no longer exists. We fan out to point queries over busy
// global regions (250nm radius each) in parallel, then merge + dedupe by hex.
const REGIONS = [
  // North America
  [40.6, -73.7],  // New York
  [34.0, -118.2], // Los Angeles
  [41.9, -87.6],  // Chicago
  [33.6, -84.4],  // Atlanta
  [25.8, -80.3],  // Miami
  [32.9, -97.0],  // Dallas
  [39.7, -104.9], // Denver
  [47.4, -122.3], // Seattle
  [37.6, -122.4], // San Francisco
  [43.7, -79.6],  // Toronto
  [19.4, -99.1],  // Mexico City
  // Europe
  [51.5, -0.1],   // London
  [48.9, 2.4],    // Paris
  [50.0, 8.5],    // Frankfurt
  [52.3, 4.8],    // Amsterdam
  [40.5, -3.6],   // Madrid
  [41.9, 12.5],   // Rome
  [41.0, 28.8],   // Istanbul
  [55.8, 37.6],   // Moscow
  // Middle East / Africa
  [25.2, 55.3],   // Dubai
  [25.3, 51.6],   // Doha
  [30.1, 31.4],   // Cairo
  [-26.1, 28.2],  // Johannesburg
  [6.6, 3.3],     // Lagos
  // South Asia
  [28.5, 77.1],   // Delhi
  [19.1, 72.9],   // Mumbai
  [13.0, 77.6],   // Bangalore
  [13.0, 80.2],   // Chennai
  [22.6, 88.4],   // Kolkata
  // East / SE Asia
  [1.3, 103.8],   // Singapore
  [13.7, 100.5],  // Bangkok
  [-6.1, 106.7],  // Jakarta
  [14.5, 121.0],  // Manila
  [35.6, 139.7],  // Tokyo
  [22.3, 114.1],  // Hong Kong
  [31.2, 121.5],  // Shanghai
  // Oceania / South America
  [-33.8, 151.2], // Sydney
  [-37.0, 144.8], // Melbourne
  [-23.5, -46.6], // São Paulo
  [-34.8, -58.5], // Buenos Aires
]

function requestPoint(host, lat, lon) {
  return new Promise((resolve) => {
    const options = {
      hostname: host,
      port: 443,
      path: `/v2/point/${lat}/${lon}/250`,
      method: 'GET',
      headers: { 'Accept': 'application/json', 'User-Agent': 'atc-monitor/1.0' },
      timeout: 5000,
    }
    const r = https.request(options, (resp) => {
      const chunks = []
      resp.on('data', c => chunks.push(c))
      resp.on('end', () => {
        if (resp.statusCode !== 200) return resolve({ ok: false, ac: [] })
        try {
          const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'))
          resolve({ ok: true, ac: parsed.ac || [] })
        } catch { resolve({ ok: false, ac: [] }) }
      })
    })
    r.on('timeout', () => { r.destroy(); resolve({ ok: false, ac: [] }) })
    r.on('error', () => resolve({ ok: false, ac: [] }))
    r.end()
  })
}

// Primary: airplanes.live. If a region fails, fall back to adsb.lol for resilience.
async function fetchPoint(lat, lon) {
  const primary = await requestPoint('api.airplanes.live', lat, lon)
  if (primary.ok && primary.ac.length > 0) return primary.ac
  const fallback = await requestPoint('api.adsb.lol', lat, lon)
  return fallback.ac
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 's-maxage=55')

  try {
    // airplanes.live doesn't rate-limit point queries, so fan out in parallel.
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
