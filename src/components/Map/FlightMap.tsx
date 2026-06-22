import React, { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Polyline, Marker, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'
import { AircraftState, IrregularFlight } from '../../types/flight'
import { AircraftMarker } from './AircraftMarker'
import { getAirportCoords, getAirportName } from '../../data/airports'
import { FlightRoute } from '../../hooks/useFlightRoutes'

function MapResizer() {
  const map = useMap()
  useEffect(() => {
    setTimeout(() => map.invalidateSize(), 100)
  }, [map])
  return null
}

interface Props {
  aircraft: AircraftState[]
  selectedAircraft: AircraftState | null
  onSelectAircraft: (ac: AircraftState) => void
  iropsFlights?: IrregularFlight[]
  routeMap?: Record<string, FlightRoute>
}

// Calculate destination point given start lat/lon, bearing (degrees), distance (km)
function destinationPoint(lat: number, lon: number, bearing: number, distanceKm: number): [number, number] {
  const R = 6371
  const d = distanceKm / R
  const brng = (bearing * Math.PI) / 180
  const lat1 = (lat * Math.PI) / 180
  const lon1 = (lon * Math.PI) / 180

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brng)
  )
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(brng) * Math.sin(d) * Math.cos(lat1),
      Math.cos(d) - Math.sin(lat1) * Math.sin(lat2)
    )

  return [(lat2 * 180) / Math.PI, ((lon2 * 180) / Math.PI + 540) % 360 - 180]
}

// Project how far ahead to draw the line based on speed (velocity in m/s)
// Shows roughly 30 minutes of flight path
function projectionDistanceKm(velocityMs: number | null): number {
  const speed = velocityMs ?? 200 // default ~200 m/s
  return (speed * 1800) / 1000 // 30 min in km
}

function iropsRouteColor(status: string): string {
  if (status === 'cancelled') return '#ff4444'
  if (status === 'diverted') return '#ff9900'
  return '#ffdd00'
}

// Interpolate a point along a great-circle route (t = 0..1)
function interpolateGreatCircle(dep: [number, number], arr: [number, number], t: number): [number, number] {
  const toRad = (d: number) => (d * Math.PI) / 180
  const toDeg = (r: number) => (r * 180) / Math.PI
  const lat1 = toRad(dep[0]), lon1 = toRad(dep[1])
  const lat2 = toRad(arr[0]), lon2 = toRad(arr[1])
  const d = 2 * Math.asin(Math.sqrt(
    Math.pow(Math.sin((lat2 - lat1) / 2), 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin((lon2 - lon1) / 2), 2)
  ))
  if (d === 0) return dep
  const A = Math.sin((1 - t) * d) / Math.sin(d)
  const B = Math.sin(t * d) / Math.sin(d)
  const x = A * Math.cos(lat1) * Math.cos(lon1) + B * Math.cos(lat2) * Math.cos(lon2)
  const y = A * Math.cos(lat1) * Math.sin(lon1) + B * Math.cos(lat2) * Math.sin(lon2)
  const z = A * Math.sin(lat1) + B * Math.sin(lat2)
  return [toDeg(Math.atan2(z, Math.sqrt(x * x + y * y))), toDeg(Math.atan2(y, x))]
}

// Bearing between two points (degrees)
function bearingBetween(from: [number, number], to: [number, number]): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const toDeg = (r: number) => (r * 180) / Math.PI
  const lat1 = toRad(from[0]), lat2 = toRad(to[0])
  const dLon = toRad(to[1] - from[1])
  const y = Math.sin(dLon) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon)
  return (toDeg(Math.atan2(y, x)) + 360) % 360
}

// Stable hash 0..1 from a string
function hashProgress(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0xffffffff
  return (h >>> 0) / 0xffffffff
}

// Average flight duration estimate in seconds (10 hours)
const FLIGHT_DURATION_S = 36000

export function FlightMap({ aircraft, selectedAircraft, onSelectAircraft, iropsFlights = [], routeMap = {} }: Props) {
  const [showRoutes, setShowRoutes] = useState(true)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [])

  // Build irops routes (departure → arrival airport lines)
  const iropsRoutes = iropsFlights
    .map(f => {
      const dep = getAirportCoords(f.departure)
      const arr = getAirportCoords(f.arrival)
      if (!dep || !arr) return null
      return { dep, arr, callsign: f.callsign, departure: f.departure, arrival: f.arrival, status: f.status }
    })
    .filter(Boolean) as { dep: [number, number]; arr: [number, number]; callsign: string; departure: string; arrival: string; status: string }[]

  // On-time flight routes with animated real-time positions
  const onTimeRoutes = aircraft
    .filter(ac => ac.departure && ac.arrival)
    .map(ac => {
      const dep = getAirportCoords(ac.departure!)
      const arr = getAirportCoords(ac.arrival!)
      if (!dep || !arr) return null
      const baseProgress = hashProgress(ac.icao24)
      const progress = (baseProgress + tick / FLIGHT_DURATION_S) % 1
      const pos = interpolateGreatCircle(dep, arr, progress)
      const nextPos = interpolateGreatCircle(dep, arr, Math.min(progress + 0.001, 1))
      const heading = bearingBetween(pos, nextPos)
      return { dep, arr, icao24: ac.icao24, callsign: ac.callsign, pos, heading }
    })
    .filter(Boolean) as { dep: [number, number]; arr: [number, number]; icao24: string; callsign: string; pos: [number, number]; heading: number }[]

  // In-flight aircraft with valid position and heading
  const flyingAircraft = aircraft.filter(
    ac => !ac.onGround && ac.latitude !== null && ac.longitude !== null && ac.trueTrack !== null
  )

  return (
    <div className="relative w-full h-full rounded-lg overflow-hidden border border-cyan-accent/20 card-glow">
      <MapContainer
        center={[20, 10]}
        zoom={3}
        minZoom={2}
        maxZoom={18}
        worldCopyJump={false}
        maxBounds={[[-85, -180], [85, 180]]}
        maxBoundsViscosity={1.0}
        style={{ height: '100%', width: '100%', background: '#cce8f4', position: 'absolute', top: 0, left: 0 }}
        zoomControl={true}
        attributionControl={false}
      >
        <MapResizer />
        <TileLayer
          url="https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          maxZoom={19}
        />

        {showRoutes && (
          <>
            {/* Heading projection lines for every in-flight aircraft */}
            {flyingAircraft.map(ac => {
              const dist = projectionDistanceKm(ac.velocity)
              const end = destinationPoint(ac.latitude!, ac.longitude!, ac.trueTrack!, dist)
              const isSelected = selectedAircraft?.icao24 === ac.icao24
              return (
                <React.Fragment key={`heading-${ac.icao24}`}>
                  <Polyline
                    positions={[[ac.latitude!, ac.longitude!], end]}
                    pathOptions={{
                      color: isSelected ? '#ffaa00' : '#00d4ff',
                      weight: isSelected ? 2 : 1,
                      opacity: isSelected ? 0.9 : 0.25,
                      dashArray: '4 6',
                    }}
                  />
                  {isSelected && ac.arrival && (
                    <Marker
                      position={end}
                      icon={L.divIcon({
                        className: '',
                        html: `<div style="background:#ffaa00;color:#000;font-size:11px;font-weight:bold;padding:2px 6px;border-radius:4px;white-space:nowrap;font-family:monospace;">✈ ${ac.arrival}</div>`,
                        iconAnchor: [0, 0],
                      })}
                    />
                  )}
                </React.Fragment>
              )
            })}

            {/* On-time flight airport-to-airport route lines */}
            {onTimeRoutes.map((route, i) => (
              <Polyline
                key={`ontime-${i}`}
                positions={[route.dep, route.arr]}
                pathOptions={{
                  color: '#00d4ff',
                  weight: 2,
                  opacity: 0.75,
                }}
              />
            ))}

            {/* IROPs full airport-to-airport route lines */}
            {iropsRoutes.map((route, i) => (
              <Polyline
                key={`irops-${i}`}
                positions={[route.dep, route.arr]}
                pathOptions={{
                  color: iropsRouteColor(route.status),
                  weight: 2,
                  opacity: 0.75,
                  dashArray: route.status === 'cancelled' ? '6 4' : undefined,
                }}
              />
            ))}
          </>
        )}

        {/* Animated aircraft markers for on-time route flights */}
        {onTimeRoutes.map(route => {
          const ac = aircraft.find(a => a.icao24 === route.icao24)
          if (!ac) return null
          const isSelected = selectedAircraft?.icao24 === route.icao24
          return (
            <Marker
              key={`anim-${route.icao24}`}
              position={route.pos}
              icon={L.divIcon({
                className: '',
                html: `<div style="transform:rotate(${route.heading}deg);font-size:${isSelected ? 20 : 14}px;line-height:1;filter:${isSelected ? 'drop-shadow(0 0 4px #ffaa00)' : 'drop-shadow(0 0 3px #00d4ff)'}">✈</div>`,
                iconAnchor: [8, 8],
              })}
              eventHandlers={{ click: () => onSelectAircraft(ac) }}
            />
          )
        })}

        {/* Static markers for aircraft without routes */}
        {aircraft
          .filter(ac => !ac.departure || !ac.arrival)
          .map(ac => (
            <AircraftMarker
              key={ac.icao24}
              aircraft={ac}
              isSelected={selectedAircraft?.icao24 === ac.icao24}
              onSelect={onSelectAircraft}
            />
          ))
        }
      </MapContainer>

      {/* Legend */}
      <div className="absolute top-2 left-2 z-[1000] space-y-1">
        <div className="bg-navy/80 backdrop-blur-sm px-2 py-1 rounded text-[10px] font-mono text-cyan-accent border border-cyan-accent/30">
          {aircraft.length} aircraft tracked
        </div>

        <div className="bg-navy/80 backdrop-blur-sm px-2 py-1 rounded text-[10px] font-mono border border-white/10 space-y-0.5">
          <div className="flex items-center gap-1.5">
            <span style={{ color: '#00d4ff' }}>——</span>
            <span className="text-slate-400">On-time route</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span style={{ color: '#00d4ff' }}>- -</span>
            <span className="text-slate-400">Projected path (30 min)</span>
          </div>
          {iropsRoutes.length > 0 && (
            <>
              <div className="flex items-center gap-1.5">
                <span style={{ color: '#ffdd00' }}>——</span>
                <span className="text-slate-400">Delayed route</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span style={{ color: '#ff9900' }}>——</span>
                <span className="text-slate-400">Diverted route</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span style={{ color: '#ff4444' }}>- -</span>
                <span className="text-slate-400">Cancelled route</span>
              </div>
            </>
          )}
        </div>

        <button
          onClick={() => setShowRoutes(r => !r)}
          className="bg-navy/80 backdrop-blur-sm px-2 py-1 rounded text-[10px] font-mono border border-white/10 text-slate-300 hover:text-cyan-accent transition-colors w-full text-left"
        >
          {showRoutes ? '✦ Hide routes' : '✦ Show routes'}
        </button>
      </div>
    </div>
  )
}
