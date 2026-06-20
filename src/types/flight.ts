export interface AircraftState {
  icao24: string
  callsign: string | null
  originCountry: string
  timePosition: number | null
  lastContact: number
  longitude: number | null
  latitude: number | null
  baroAltitude: number | null
  onGround: boolean
  velocity: number | null
  trueTrack: number | null
  verticalRate: number | null
  geoAltitude: number | null
  squawk: string | null
  spi: boolean
  positionSource: number
}

export interface OpenSkyResponse {
  time: number
  states: (string | number | boolean | null)[][]
}

export interface AviationFlight {
  flight_date: string
  flight_status: string
  departure: {
    airport: string
    iata: string
    icao: string
    scheduled: string
    estimated: string
    actual: string | null
    delay: number | null
  }
  arrival: {
    airport: string
    iata: string
    icao: string
    scheduled: string
    estimated: string
    actual: string | null
    delay: number | null
  }
  airline: {
    name: string
    iata: string
    icao: string
  }
  flight: {
    number: string
    iata: string
    icao: string
    codeshared: null
  }
}

export interface AviationStackResponse {
  pagination: {
    limit: number
    offset: number
    count: number
    total: number
  }
  data: AviationFlight[]
}

export type FlightStatus = 'scheduled' | 'active' | 'landed' | 'cancelled' | 'incident' | 'diverted'

export interface IrregularFlight {
  callsign: string
  airline: string
  departure: string
  arrival: string
  status: FlightStatus
  delay: number | null
  scheduledDep: string
  estimatedDep: string
}
