import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { AircraftState, OpenSkyResponse } from '../types/flight'

const t = () => Date.now() / 1000
const MOCK_AIRCRAFT: AircraftState[] = [
  // USA
  { icao24: 'a1b2c3', callsign: 'UAL123', originCountry: 'United States', timePosition: t(), lastContact: t(), longitude: -87.6298, latitude: 41.8781, baroAltitude: 10668, onGround: false, velocity: 245, trueTrack: 45, verticalRate: 0, geoAltitude: 10700, squawk: '1234', spi: false, positionSource: 0 },
  { icao24: 'b2c3d4', callsign: 'DAL456', originCountry: 'United States', timePosition: t(), lastContact: t(), longitude: -73.9857, latitude: 40.7484, baroAltitude: 11278, onGround: false, velocity: 258, trueTrack: 270, verticalRate: -2, geoAltitude: 11300, squawk: '2345', spi: false, positionSource: 0 },
  { icao24: 'c3d4e5', callsign: 'AAL789', originCountry: 'United States', timePosition: t(), lastContact: t(), longitude: -118.2437, latitude: 34.0522, baroAltitude: 9144, onGround: false, velocity: 235, trueTrack: 180, verticalRate: 5, geoAltitude: 9200, squawk: '3456', spi: false, positionSource: 0 },
  { icao24: 'd4e5f6', callsign: 'SWA101', originCountry: 'United States', timePosition: t(), lastContact: t(), longitude: -95.3698, latitude: 29.7604, baroAltitude: 7620, onGround: false, velocity: 220, trueTrack: 90, verticalRate: 10, geoAltitude: 7650, squawk: '4567', spi: false, positionSource: 0 },
  { icao24: 'e1f2a3', callsign: 'FDX707', originCountry: 'United States', timePosition: t(), lastContact: t(), longitude: -90.1994, latitude: 38.627, baroAltitude: 8534, onGround: false, velocity: 230, trueTrack: 75, verticalRate: 12, geoAltitude: 8600, squawk: '1357', spi: false, positionSource: 0 },
  { icao24: 'f2a3b4', callsign: 'UPS808', originCountry: 'United States', timePosition: t(), lastContact: t(), longitude: -85.7585, latitude: 38.2527, baroAltitude: 9449, onGround: false, velocity: 238, trueTrack: 290, verticalRate: 0, geoAltitude: 9450, squawk: '2468', spi: false, positionSource: 0 },
  // Europe
  { icao24: 'e5f6a7', callsign: 'BAW112', originCountry: 'United Kingdom', timePosition: t(), lastContact: t(), longitude: -0.1276, latitude: 51.5074, baroAltitude: 12192, onGround: false, velocity: 265, trueTrack: 315, verticalRate: 0, geoAltitude: 12200, squawk: '5678', spi: false, positionSource: 0 },
  { icao24: 'f6a7b8', callsign: 'DLH202', originCountry: 'Germany', timePosition: t(), lastContact: t(), longitude: 8.6821, latitude: 50.1109, baroAltitude: 11582, onGround: false, velocity: 255, trueTrack: 60, verticalRate: -5, geoAltitude: 11600, squawk: '6789', spi: false, positionSource: 0 },
  { icao24: 'a7b8c9', callsign: 'AFR303', originCountry: 'France', timePosition: t(), lastContact: t(), longitude: 2.3488, latitude: 48.8534, baroAltitude: 10972, onGround: false, velocity: 248, trueTrack: 200, verticalRate: 3, geoAltitude: 11000, squawk: '7890', spi: false, positionSource: 0 },
  { icao24: 'a3b4c5', callsign: 'KLM909', originCountry: 'Netherlands', timePosition: t(), lastContact: t(), longitude: 4.7683, latitude: 52.3086, baroAltitude: 10363, onGround: false, velocity: 252, trueTrack: 110, verticalRate: -3, geoAltitude: 10400, squawk: '3579', spi: false, positionSource: 0 },
  { icao24: 'f8a9b0', callsign: 'IBE400', originCountry: 'Spain', timePosition: t(), lastContact: t(), longitude: -3.7038, latitude: 40.4168, baroAltitude: 10668, onGround: false, velocity: 250, trueTrack: 30, verticalRate: 0, geoAltitude: 10700, squawk: '8024', spi: false, positionSource: 0 },
  { icao24: 'a9b0c1', callsign: 'THY500', originCountry: 'Turkey', timePosition: t(), lastContact: t(), longitude: 28.9784, latitude: 41.0082, baroAltitude: 11582, onGround: false, velocity: 258, trueTrack: 245, verticalRate: -2, geoAltitude: 11600, squawk: '9135', spi: false, positionSource: 0 },
  // India
  { icao24: 'ind001', callsign: 'AIC101', originCountry: 'India', timePosition: t(), lastContact: t(), longitude: 72.8656, latitude: 19.0896, baroAltitude: 9144, onGround: false, velocity: 220, trueTrack: 90, verticalRate: 0, geoAltitude: 9200, squawk: '1111', spi: false, positionSource: 0 },
  { icao24: 'ind002', callsign: 'IGO202', originCountry: 'India', timePosition: t(), lastContact: t(), longitude: 77.1, latitude: 28.5562, baroAltitude: 10668, onGround: false, velocity: 235, trueTrack: 180, verticalRate: -3, geoAltitude: 10700, squawk: '1112', spi: false, positionSource: 0 },
  { icao24: 'ind003', callsign: 'SEJ303', originCountry: 'India', timePosition: t(), lastContact: t(), longitude: 80.1709, latitude: 12.9941, baroAltitude: 8534, onGround: false, velocity: 210, trueTrack: 270, verticalRate: 5, geoAltitude: 8600, squawk: '1113', spi: false, positionSource: 0 },
  { icao24: 'ind004', callsign: 'AIC404', originCountry: 'India', timePosition: t(), lastContact: t(), longitude: 88.4467, latitude: 22.6547, baroAltitude: 11278, onGround: false, velocity: 245, trueTrack: 45, verticalRate: 0, geoAltitude: 11300, squawk: '1114', spi: false, positionSource: 0 },
  { icao24: 'ind005', callsign: 'IGO505', originCountry: 'India', timePosition: t(), lastContact: t(), longitude: 78.4294, latitude: 17.2403, baroAltitude: 7620, onGround: false, velocity: 200, trueTrack: 135, verticalRate: 8, geoAltitude: 7650, squawk: '1115', spi: false, positionSource: 0 },
  { icao24: 'ind006', callsign: 'GOW606', originCountry: 'India', timePosition: t(), lastContact: t(), longitude: 85.8, latitude: 20.3, baroAltitude: 9754, onGround: false, velocity: 225, trueTrack: 315, verticalRate: -2, geoAltitude: 9800, squawk: '1116', spi: false, positionSource: 0 },
  { icao24: 'ind007', callsign: 'AIC707', originCountry: 'India', timePosition: t(), lastContact: t(), longitude: 74.5, latitude: 15.3, baroAltitude: 10058, onGround: false, velocity: 230, trueTrack: 60, verticalRate: 0, geoAltitude: 10100, squawk: '1117', spi: false, positionSource: 0 },
  { icao24: 'ind008', callsign: 'IGO808', originCountry: 'India', timePosition: t(), lastContact: t(), longitude: 76.9, latitude: 11.0, baroAltitude: 8839, onGround: false, velocity: 215, trueTrack: 200, verticalRate: 3, geoAltitude: 8900, squawk: '1118', spi: false, positionSource: 0 },
  // Middle East
  { icao24: 'b8c9d0', callsign: 'UAE404', originCountry: 'United Arab Emirates', timePosition: t(), lastContact: t(), longitude: 55.2708, latitude: 25.2048, baroAltitude: 13106, onGround: false, velocity: 275, trueTrack: 135, verticalRate: 0, geoAltitude: 13100, squawk: '8901', spi: false, positionSource: 0 },
  { icao24: 'me0001', callsign: 'QTR101', originCountry: 'Qatar', timePosition: t(), lastContact: t(), longitude: 51.608, latitude: 25.2731, baroAltitude: 12192, onGround: false, velocity: 270, trueTrack: 90, verticalRate: 0, geoAltitude: 12200, squawk: '2001', spi: false, positionSource: 0 },
  // Asia
  { icao24: 'b4c5d6', callsign: 'SIA010', originCountry: 'Singapore', timePosition: t(), lastContact: t(), longitude: 103.8198, latitude: 1.3521, baroAltitude: 13411, onGround: false, velocity: 278, trueTrack: 355, verticalRate: 0, geoAltitude: 13400, squawk: '4680', spi: false, positionSource: 0 },
  { icao24: 'c5d6e7', callsign: 'CPA100', originCountry: 'Hong Kong', timePosition: t(), lastContact: t(), longitude: 114.1694, latitude: 22.3193, baroAltitude: 12192, onGround: false, velocity: 265, trueTrack: 80, verticalRate: 6, geoAltitude: 12200, squawk: '5791', spi: false, positionSource: 0 },
  { icao24: 'd0e1f2', callsign: 'JAL606', originCountry: 'Japan', timePosition: t(), lastContact: t(), longitude: 139.6917, latitude: 35.6895, baroAltitude: 11887, onGround: false, velocity: 258, trueTrack: 25, verticalRate: -8, geoAltitude: 11900, squawk: '0123', spi: false, positionSource: 0 },
  // Australia & others
  { icao24: 'c9d0e1', callsign: 'QFA505', originCountry: 'Australia', timePosition: t(), lastContact: t(), longitude: 151.2093, latitude: -33.8688, baroAltitude: 12497, onGround: false, velocity: 262, trueTrack: 340, verticalRate: 0, geoAltitude: 12500, squawk: '9012', spi: false, positionSource: 0 },
  { icao24: 'd6e7f8', callsign: 'TAM200', originCountry: 'Brazil', timePosition: t(), lastContact: t(), longitude: -46.6333, latitude: -23.5505, baroAltitude: 11278, onGround: false, velocity: 255, trueTrack: 160, verticalRate: -4, geoAltitude: 11300, squawk: '6802', spi: false, positionSource: 0 },
  { icao24: 'e7f8a9', callsign: 'ACA300', originCountry: 'Canada', timePosition: t(), lastContact: t(), longitude: -79.3832, latitude: 43.6532, baroAltitude: 10058, onGround: false, velocity: 242, trueTrack: 220, verticalRate: 0, geoAltitude: 10100, squawk: '7913', spi: false, positionSource: 0 },
  { icao24: 'b0c1d2', callsign: 'ETH600', originCountry: 'Ethiopia', timePosition: t(), lastContact: t(), longitude: 38.7578, latitude: 9.032, baroAltitude: 12802, onGround: false, velocity: 270, trueTrack: 5, verticalRate: 0, geoAltitude: 12800, squawk: '0246', spi: false, positionSource: 0 },
]

function parseStates(raw: (string | number | boolean | null)[][]): AircraftState[] {
  return raw
    .filter(s => s[5] !== null && s[6] !== null)
    .slice(0, 500)
    .map(s => ({
      icao24: String(s[0] ?? ''),
      callsign: s[1] ? String(s[1]).trim() : null,
      originCountry: String(s[2] ?? ''),
      timePosition: s[3] as number | null,
      lastContact: s[4] as number,
      longitude: s[5] as number | null,
      latitude: s[6] as number | null,
      baroAltitude: s[7] as number | null,
      onGround: Boolean(s[8]),
      velocity: s[9] as number | null,
      trueTrack: s[10] as number | null,
      verticalRate: s[11] as number | null,
      geoAltitude: s[13] as number | null,
      squawk: s[14] ? String(s[14]) : null,
      spi: Boolean(s[15]),
      positionSource: s[16] as number ?? 0,
    }))
}

const OPENSKY_AUTH = {
  username: import.meta.env.VITE_OPENSKY_USERNAME as string | undefined,
  password: import.meta.env.VITE_OPENSKY_PASSWORD as string | undefined,
}

async function fetchOpenSky(): Promise<AircraftState[]> {
  const authConfig = OPENSKY_AUTH.username && OPENSKY_AUTH.password
    ? { auth: { username: OPENSKY_AUTH.username, password: OPENSKY_AUTH.password } }
    : {}
  try {
    const res = await axios.get<OpenSkyResponse>('/opensky/api/states/all', {
      timeout: 15000,
      ...authConfig,
    })
    if (res.data?.states && Array.isArray(res.data.states) && res.data.states.length > 0) {
      return parseStates(res.data.states)
    }
  } catch {
    // fall through to mock
  }
  // Try one more time with a short delay
  try {
    await new Promise(r => setTimeout(r, 2000))
    const res = await axios.get<OpenSkyResponse>('/opensky/api/states/all', {
      timeout: 15000,
      ...authConfig,
    })
    if (res.data?.states && Array.isArray(res.data.states) && res.data.states.length > 0) {
      return parseStates(res.data.states)
    }
  } catch {
    // fall through to mock
  }
  return MOCK_AIRCRAFT
}

export function useOpenSky() {
  return useQuery({
    queryKey: ['opensky'],
    queryFn: fetchOpenSky,
    refetchInterval: 10000,
    staleTime: 8000,
  })
}
