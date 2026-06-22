import React, { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Polyline, Marker, Popup, CircleMarker, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'
import { AircraftState, IrregularFlight } from '../../types/flight'
import { AircraftMarker } from './AircraftMarker'
import { getAirportCoords, getAirportName, AIRPORTS_BY_IATA } from '../../data/airports'
import { FlightRoute } from '../../hooks/useFlightRoutes'

function MapResizer() {
  const map = useMap()
  useEffect(() => { setTimeout(() => map.invalidateSize(), 100) }, [map])
  return null
}

interface Props {
  aircraft: AircraftState[]
  selectedAircraft: AircraftState | null
  onSelectAircraft: (ac: AircraftState) => void
  iropsFlights?: IrregularFlight[]
  routeMap?: Record<string, FlightRoute>
  conflicts?: Set<string>
}

function destinationPoint(lat: number, lon: number, bearing: number, distanceKm: number): [number, number] {
  const R = 6371, d = distanceKm / R, brng = (bearing * Math.PI) / 180
  const lat1 = (lat * Math.PI) / 180, lon1 = (lon * Math.PI) / 180
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(brng))
  const lon2 = lon1 + Math.atan2(Math.sin(brng) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2))
  return [(lat2 * 180) / Math.PI, ((lon2 * 180) / Math.PI + 540) % 360 - 180]
}

function projectionDistanceKm(velocityMs: number | null): number {
  return ((velocityMs ?? 200) * 1800) / 1000
}

function greatCircleArc(dep: [number, number], arr: [number, number], steps = 40): [number, number][] {
  const toRad = (d: number) => (d * Math.PI) / 180
  const toDeg = (r: number) => (r * 180) / Math.PI
  const lat1 = toRad(dep[0]), lon1 = toRad(dep[1])
  const lat2 = toRad(arr[0]), lon2 = toRad(arr[1])
  const d = 2 * Math.asin(Math.sqrt(
    Math.pow(Math.sin((lat2 - lat1) / 2), 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin((lon2 - lon1) / 2), 2)
  ))
  if (d === 0) return [dep, arr]
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps
    const A = Math.sin((1 - t) * d) / Math.sin(d)
    const B = Math.sin(t * d) / Math.sin(d)
    const x = A * Math.cos(lat1) * Math.cos(lon1) + B * Math.cos(lat2) * Math.cos(lon2)
    const y = A * Math.cos(lat1) * Math.sin(lon1) + B * Math.cos(lat2) * Math.sin(lon2)
    const z = A * Math.sin(lat1) + B * Math.sin(lat2)
    return [toDeg(Math.atan2(z, Math.sqrt(x * x + y * y))), toDeg(Math.atan2(y, x))] as [number, number]
  })
}

function bearingBetween(from: [number, number], to: [number, number]): number {
  const toRad = (d: number) => (d * Math.PI) / 180
  const toDeg = (r: number) => (r * 180) / Math.PI
  const lat1 = toRad(from[0]), lat2 = toRad(to[0])
  const dLon = toRad(to[1] - from[1])
  const y = Math.sin(dLon) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon)
  return (toDeg(Math.atan2(y, x)) + 360) % 360
}

function hashProgress(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0xffffffff
  return (h >>> 0) / 0xffffffff
}

function iropsRouteColor(status: string): string {
  if (status === 'cancelled') return '#ff4444'
  if (status === 'diverted') return '#ff9900'
  return '#ffdd00'
}

function altitudeColor(baroAlt: number | null): string {
  if (baroAlt === null) return '#00d4ff'
  const ft = baroAlt * 3.28084
  if (ft < 5000)  return '#22c55e'
  if (ft < 20000) return '#f59e0b'
  if (ft < 35000) return '#00d4ff'
  return '#a78bfa'
}

function airportDotIcon(color: string) {
  return L.divIcon({
    html: `<div style="width:8px;height:8px;border-radius:50%;background:${color};border:2px solid rgba(255,255,255,0.7);box-shadow:0 0 6px ${color}"></div>`,
    className: '',
    iconSize: [8, 8],
    iconAnchor: [4, 4],
  })
}

function getTerminatorPoints(): [number, number][] {
  const now = new Date()
  const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000)
  const declination = -23.45 * Math.cos((2 * Math.PI / 365) * (dayOfYear + 10))
  const utcHours = now.getUTCHours() + now.getUTCMinutes() / 60
  const subSolarLon = -(utcHours - 12) * 15
  const decRad = (declination * Math.PI) / 180
  const points: [number, number][] = []
  for (let lon = -180; lon <= 180; lon += 3) {
    const lonRad = ((lon - subSolarLon) * Math.PI) / 180
    const lat = Math.atan(-Math.cos(lonRad) / Math.tan(decRad)) * 180 / Math.PI
    points.push([lat, lon])
  }
  return points.sort((a, b) => a[1] - b[1])
}

const FLIGHT_DURATION_S = 36000
const TRAIL_LENGTH = 8

const MAP_TILES = {
  voyager: 'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
  dark:    'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
  satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
}

const FIR_POLYGONS: { name: string; color: string; points: [number, number][] }[] = [
  {
    name: 'KZFW', color: '#00d4ff',
    points: [[36.5,-103],[36.5,-94],[32,-94],[29.5,-98],[25.8,-97],[25.8,-104],[28,-106],[32,-107],[36.5,-103]],
  },
  {
    name: 'EGTT', color: '#a78bfa',
    points: [[61,-8],[61,2],[51,2],[49,-2],[49,-8],[51,-10],[55,-10],[61,-8]],
  },
  {
    name: 'EDYY', color: '#f59e0b',
    points: [[55,2],[55,15],[50,15],[48,10],[48,2],[51,2],[55,2]],
  },
  {
    name: 'RJJJ', color: '#22c55e',
    points: [[40,124],[40,136],[34,136],[30,130],[30,124],[34,122],[40,124]],
  },
  {
    name: 'YBBB', color: '#ff9900',
    points: [[-10,130],[-10,145],[-26,145],[-26,130],[-20,126],[-10,130]],
  },
]

export function FlightMap({ aircraft, selectedAircraft, onSelectAircraft, iropsFlights = [], routeMap = {}, conflicts = new Set() }: Props) {
  const [showRoutes, setShowRoutes] = useState(true)
  const [showWeather, setShowWeather] = useState(false)
  const [showHeatmap, setShowHeatmap] = useState(false)
  const [showTerminator, setShowTerminator] = useState(false)
  const [showCongestion, setShowCongestion] = useState(false)
  const [showFIR, setShowFIR] = useState(false)
  const [mapStyle, setMapStyle] = useState<keyof typeof MAP_TILES>('satellite')
  const [tick, setTick] = useState(0)
  const trailsRef = useRef<Record<string, [number, number][]>>({})

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000)
    return () => clearInterval(id)
  }, [])

  const iropsRoutes = iropsFlights
    .map(f => {
      const dep = getAirportCoords(f.departure)
      const arr = getAirportCoords(f.arrival)
      if (!dep || !arr) return null
      return { dep, arr, arc: greatCircleArc(dep, arr), callsign: f.callsign, departure: f.departure, arrival: f.arrival, status: f.status }
    })
    .filter(Boolean) as { dep: [number,number]; arr: [number,number]; arc: [number,number][]; callsign: string; departure: string; arrival: string; status: string }[]

  const onTimeRoutes = aircraft
    .filter(ac => ac.departure && ac.arrival)
    .map(ac => {
      const dep = getAirportCoords(ac.departure!)
      const arr = getAirportCoords(ac.arrival!)
      if (!dep || !arr) return null
      const arc = greatCircleArc(dep, arr, 100)
      const baseProgress = hashProgress(ac.icao24)
      const progress = (baseProgress + tick / FLIGHT_DURATION_S) % 1
      const idx = Math.min(Math.round(progress * 100), 99)
      const pos = arc[idx] ?? dep
      const nextPos = arc[Math.min(idx + 1, 100)] ?? pos
      const heading = bearingBetween(pos, nextPos)
      const color = altitudeColor(ac.baroAltitude)

      const trail = trailsRef.current[ac.icao24] ?? []
      if (trail.length === 0 || trail[trail.length - 1][0] !== pos[0]) {
        trail.push(pos)
        if (trail.length > TRAIL_LENGTH) trail.shift()
        trailsRef.current[ac.icao24] = trail
      }

      return { dep, arr, arc, icao24: ac.icao24, callsign: ac.callsign, pos, heading, color, trail: [...trail] }
    })
    .filter(Boolean) as { dep: [number,number]; arr: [number,number]; arc: [number,number][]; icao24: string; callsign: string; pos: [number,number]; heading: number; color: string; trail: [number,number][] }[]

  const flyingAircraft = aircraft.filter(
    ac => !ac.onGround && ac.latitude !== null && ac.longitude !== null && ac.trueTrack !== null
  )

  // Heatmap cells
  const heatCells: { pos: [number,number]; count: number }[] = []
  if (showHeatmap) {
    const grid: Record<string, { pos: [number,number]; count: number }> = {}
    for (const ac of aircraft) {
      if (ac.latitude === null || ac.longitude === null) continue
      const key = `${Math.round(ac.latitude / 5) * 5},${Math.round(ac.longitude / 5) * 5}`
      if (!grid[key]) grid[key] = { pos: [Math.round(ac.latitude / 5) * 5, Math.round(ac.longitude / 5) * 5], count: 0 }
      grid[key].count++
    }
    heatCells.push(...Object.values(grid))
  }

  // Airport traffic counts (inbound / outbound)
  const airportInbound: Record<string, number> = {}
  const airportOutbound: Record<string, number> = {}
  for (const ac of aircraft) {
    if (ac.departure) airportOutbound[ac.departure] = (airportOutbound[ac.departure] ?? 0) + 1
    if (ac.arrival) airportInbound[ac.arrival] = (airportInbound[ac.arrival] ?? 0) + 1
  }
  const airportCounts: Record<string, number> = {}
  const allCodes = new Set([...Object.keys(airportInbound), ...Object.keys(airportOutbound)])
  for (const code of allCodes) {
    airportCounts[code] = (airportInbound[code] ?? 0) + (airportOutbound[code] ?? 0)
  }

  function congestionColor(total: number): string {
    if (total < 3) return '#22c55e'
    if (total <= 6) return '#f59e0b'
    return '#ef4444'
  }

  const isDark = mapStyle === 'dark' || mapStyle === 'satellite'
  const strokeColor = isDark ? '#001a2e' : '#004466'

  const terminatorPoints = showTerminator ? getTerminatorPoints() : []

  // Aircraft in conflict that have lat/lon
  const conflictAircraft = aircraft.filter(
    ac => conflicts.has(ac.icao24) && ac.latitude !== null && ac.longitude !== null
  )

  return (
    <div className="relative w-full h-full rounded-lg overflow-hidden border border-cyan-accent/20 card-glow">
      <MapContainer
        center={[25, 15]}
        zoom={3}
        minZoom={2}
        maxZoom={18}
        worldCopyJump={false}
        maxBounds={[[-85, -180], [85, 180]]}
        maxBoundsViscosity={1.0}
        style={{ height: '100%', width: '100%', background: '#cce8f4', position: 'absolute', top: 0, left: 0 }}
        zoomControl={false}
        attributionControl={false}
      >
        <MapResizer />
        <TileLayer url={MAP_TILES[mapStyle]} maxZoom={19} />

        {/* Weather overlay */}
        {showWeather && (
          <TileLayer
            url="https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=demo"
            opacity={0.5}
            maxZoom={19}
          />
        )}

        {/* Terminator line */}
        {showTerminator && terminatorPoints.length > 0 && (
          <Polyline
            positions={terminatorPoints}
            pathOptions={{ color: '#f97316', dashArray: '8 4', weight: 2, opacity: 0.8 }}
          />
        )}

        {/* FIR overlays */}
        {showFIR && FIR_POLYGONS.map(fir => (
          <React.Fragment key={`fir-${fir.name}`}>
            <Polyline
              positions={fir.points}
              pathOptions={{ color: fir.color, weight: 1.5, opacity: 0.7, dashArray: '6 4' }}
            />
            <Marker
              position={fir.points[Math.floor(fir.points.length / 2)]}
              icon={L.divIcon({
                className: '',
                html: `<div style="color:${fir.color};font-size:11px;font-weight:bold;font-family:monospace;text-shadow:0 0 6px #000,0 0 10px #000;white-space:nowrap">${fir.name}</div>`,
                iconAnchor: [20, 8],
              })}
            />
          </React.Fragment>
        ))}

        {/* Heatmap circles */}
        {showHeatmap && heatCells.map((cell, i) => (
          <CircleMarker
            key={`heat-${i}`}
            center={cell.pos}
            radius={cell.count * 6}
            pathOptions={{ color: 'transparent', fillColor: '#ff6600', fillOpacity: Math.min(0.15 * cell.count, 0.6) }}
          />
        ))}

        {/* Airport traffic bubbles */}
        {Object.entries(airportCounts).map(([code, count]) => {
          const coords = getAirportCoords(code)
          if (!coords) return null
          const name = getAirportName(code)
          const color = showCongestion ? congestionColor(count) : '#06b6d4'
          const inb = airportInbound[code] ?? 0
          const outb = airportOutbound[code] ?? 0
          return (
            <CircleMarker
              key={`bubble-${code}`}
              center={coords}
              radius={4 + count * 2}
              pathOptions={{ color, fillColor: color, fillOpacity: 0.3, weight: 1 }}
            >
              <Tooltip direction="top" offset={[0, -4]} opacity={0.9}>
                <span style={{ fontFamily: 'monospace', fontSize: 11 }}>
                  {code} — {name}: {count} flights (↑{outb} ↓{inb})
                </span>
              </Tooltip>
            </CircleMarker>
          )
        })}

        {/* Conflict markers */}
        {conflictAircraft.map(ac => (
          <CircleMarker
            key={`conflict-${ac.icao24}`}
            center={[ac.latitude!, ac.longitude!]}
            radius={20}
            pathOptions={{ color: 'red', fillColor: 'red', fillOpacity: 0.15, weight: 1.5, dashArray: '6 3' }}
          />
        ))}

        {showRoutes && (
          <>
            {/* Heading projection lines */}
            {flyingAircraft.map(ac => {
              const dist = projectionDistanceKm(ac.velocity)
              const end = destinationPoint(ac.latitude!, ac.longitude!, ac.trueTrack!, dist)
              const isSelected = selectedAircraft?.icao24 === ac.icao24
              const speedMs = ac.velocity ?? 200
              const pred10 = destinationPoint(ac.latitude!, ac.longitude!, ac.trueTrack!, speedMs * 600 / 1000)
              const pred20 = destinationPoint(ac.latitude!, ac.longitude!, ac.trueTrack!, speedMs * 1200 / 1000)
              const pred30 = destinationPoint(ac.latitude!, ac.longitude!, ac.trueTrack!, speedMs * 1800 / 1000)
              return (
                <React.Fragment key={`heading-${ac.icao24}`}>
                  <Polyline
                    positions={[[ac.latitude!, ac.longitude!], end]}
                    pathOptions={{ color: isSelected ? '#ffaa00' : '#00d4ff', weight: isSelected ? 2 : 1, opacity: isSelected ? 0.9 : 0.2, dashArray: '4 6' }}
                  />
                  {/* 10/20/30 min prediction waypoints */}
                  {[{ pos: pred10, label: '+10m' }, { pos: pred20, label: '+20m' }, { pos: pred30, label: '+30m' }].map(({ pos, label }) => (
                    <React.Fragment key={`pred-${ac.icao24}-${label}`}>
                      <CircleMarker
                        center={pos}
                        radius={isSelected ? 4 : 2}
                        pathOptions={{ color: isSelected ? '#ffaa00' : '#00d4ff', fillColor: isSelected ? '#ffaa00' : '#00d4ff', fillOpacity: 0.7, weight: 1, opacity: isSelected ? 0.8 : 0.3 }}
                      />
                      {isSelected && (
                        <Marker
                          position={pos}
                          icon={L.divIcon({
                            className: '',
                            html: `<div style="background:rgba(0,0,0,0.7);color:#ffaa00;font-size:10px;font-weight:bold;padding:1px 5px;border-radius:3px;white-space:nowrap;font-family:monospace;border:1px solid #ffaa0060">${label}</div>`,
                            iconAnchor: [0, 0],
                          })}
                        />
                      )}
                    </React.Fragment>
                  ))}
                  {isSelected && ac.arrival && (
                    <Marker
                      position={end}
                      icon={L.divIcon({
                        className: '',
                        html: `<div style="background:#ffaa00;color:#000;font-size:11px;font-weight:bold;padding:2px 7px;border-radius:4px;white-space:nowrap;font-family:monospace;box-shadow:0 2px 8px rgba(0,0,0,0.5)">✈ ${ac.arrival}</div>`,
                        iconAnchor: [0, 0],
                      })}
                    />
                  )}
                </React.Fragment>
              )
            })}

            {/* On-time curved routes + trails + airport dots */}
            {onTimeRoutes.map((route, i) => (
              <React.Fragment key={`ontime-${i}`}>
                <Polyline positions={route.arc} pathOptions={{ color: route.color, weight: 1.5, opacity: 0.45 }} />
                {route.trail.length > 1 && route.trail.map((pt, ti) => {
                  if (ti === 0) return null
                  return (
                    <Polyline
                      key={`trail-${i}-${ti}`}
                      positions={[route.trail[ti - 1], pt]}
                      pathOptions={{ color: route.color, weight: 2.5, opacity: (ti / route.trail.length) * 0.8 }}
                    />
                  )
                })}
                <Marker position={route.dep} icon={airportDotIcon(route.color)}>
                  <Popup className="airport-popup">
                    <div style={{ fontFamily: 'monospace', fontSize: 12, minWidth: 130 }}>
                      <div style={{ fontWeight: 'bold', color: '#00d4ff', marginBottom: 4 }}>{route.callsign}</div>
                      <div style={{ color: '#666' }}>Departure</div>
                      <div style={{ fontWeight: 'bold' }}>{aircraft.find(a => a.icao24 === route.icao24)?.departure ?? ''}</div>
                      <div style={{ color: '#666', marginTop: 4 }}>{getAirportName(aircraft.find(a => a.icao24 === route.icao24)?.departure ?? '')}</div>
                    </div>
                  </Popup>
                </Marker>
                <Marker position={route.arr} icon={airportDotIcon(route.color)}>
                  <Popup className="airport-popup">
                    <div style={{ fontFamily: 'monospace', fontSize: 12, minWidth: 130 }}>
                      <div style={{ fontWeight: 'bold', color: '#00d4ff', marginBottom: 4 }}>{route.callsign}</div>
                      <div style={{ color: '#666' }}>Arrival</div>
                      <div style={{ fontWeight: 'bold' }}>{aircraft.find(a => a.icao24 === route.icao24)?.arrival ?? ''}</div>
                      <div style={{ color: '#666', marginTop: 4 }}>{getAirportName(aircraft.find(a => a.icao24 === route.icao24)?.arrival ?? '')}</div>
                    </div>
                  </Popup>
                </Marker>
              </React.Fragment>
            ))}

            {/* IROPs routes + airport dots */}
            {iropsRoutes.map((route, i) => {
              const color = iropsRouteColor(route.status)
              return (
                <React.Fragment key={`irops-${i}`}>
                  <Polyline positions={route.arc} pathOptions={{ color, weight: 2, opacity: 0.85, dashArray: route.status === 'cancelled' ? '8 5' : undefined }} />
                  <Marker position={route.dep} icon={airportDotIcon(color)}>
                    <Popup><div style={{ fontFamily: 'monospace', fontSize: 12 }}><b>{route.callsign}</b><br/>{route.departure} → {route.arrival}<br/><span style={{ color: color, textTransform: 'uppercase' }}>{route.status}</span></div></Popup>
                  </Marker>
                  <Marker position={route.arr} icon={airportDotIcon(color)}>
                    <Popup><div style={{ fontFamily: 'monospace', fontSize: 12 }}><b>{route.callsign}</b><br/>{route.departure} → {route.arrival}<br/><span style={{ color: color, textTransform: 'uppercase' }}>{route.status}</span></div></Popup>
                  </Marker>
                </React.Fragment>
              )
            })}
          </>
        )}

        {/* Animated aircraft markers */}
        {onTimeRoutes.map(route => {
          const ac = aircraft.find(a => a.icao24 === route.icao24)
          if (!ac) return null
          const isSelected = selectedAircraft?.icao24 === route.icao24
          const color = isSelected ? '#ffaa00' : route.color
          const size = isSelected ? 26 : 18
          const glow = isSelected ? `drop-shadow(0 0 5px #ffaa00) drop-shadow(0 0 10px #ff8800)` : `drop-shadow(0 0 4px ${color})`
          const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" style="filter:${glow}"><g transform="rotate(${route.heading}, 12, 12)"><path d="M12 2L8 10H4L6 12H9L7 20H10L12 16L14 20H17L15 12H18L20 10H16L12 2Z" fill="${color}" stroke="${isSelected ? '#cc5500' : strokeColor}" stroke-width="1"/></g></svg>`
          return (
            <Marker
              key={`anim-${route.icao24}`}
              position={route.pos}
              icon={L.divIcon({ html: svg, className: 'aircraft-icon', iconSize: [size, size], iconAnchor: [size / 2, size / 2] })}
              zIndexOffset={isSelected ? 1000 : 100}
              eventHandlers={{ click: () => onSelectAircraft(ac) }}
            />
          )
        })}

        {/* Static markers for aircraft without routes */}
        {aircraft.filter(ac => !ac.departure || !ac.arrival).map(ac => (
          <AircraftMarker key={ac.icao24} aircraft={ac} isSelected={selectedAircraft?.icao24 === ac.icao24} onSelect={onSelectAircraft} />
        ))}
      </MapContainer>

      {/* Control panel — top left */}
      <div className="absolute top-3 left-3 z-[1000] flex flex-col gap-2">
        {/* Live stats */}
        <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md border border-cyan-accent/30 px-3 py-1.5 rounded-lg">
          <div className="w-2 h-2 rounded-full bg-cyan-accent animate-pulse" />
          <span className="text-xs font-mono font-bold text-cyan-accent">{aircraft.length}</span>
          <span className="text-[10px] text-slate-400 uppercase tracking-wider">aircraft live</span>
        </div>

        {/* Legend */}
        <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-lg px-3 py-2 space-y-1.5">
          <div className="text-[9px] text-slate-500 uppercase tracking-widest mb-1">Route Legend</div>
          {[
            { color: '#00d4ff', dash: false, label: 'On-time (cruise)' },
            { color: '#22c55e', dash: false, label: 'On-time (low alt)' },
            { color: '#f59e0b', dash: false, label: 'On-time (mid alt)' },
            { color: '#a78bfa', dash: false, label: 'On-time (high alt)' },
            { color: '#00d4ff', dash: true,  label: 'Projected path' },
            { color: '#ffdd00', dash: false, label: 'Delayed' },
            { color: '#ff9900', dash: false, label: 'Diverted' },
            { color: '#ff4444', dash: true,  label: 'Cancelled' },
          ].map(({ color, dash, label }) => (
            <div key={label} className="flex items-center gap-2">
              <svg width="20" height="6">
                <line x1="0" y1="3" x2="20" y2="3" stroke={color} strokeWidth="2" strokeDasharray={dash ? '4 3' : undefined} />
              </svg>
              <span className="text-[10px] text-slate-400">{label}</span>
            </div>
          ))}
        </div>

        {/* Toggle buttons */}
        <div className="flex flex-col gap-1">
          {[
            { label: showRoutes     ? '◉ Hide routes'     : '○ Show routes',     action: () => setShowRoutes(r => !r),         active: showRoutes },
            { label: showWeather    ? '◉ Hide weather'    : '○ Show weather',    action: () => setShowWeather(w => !w),        active: showWeather },
            { label: showHeatmap    ? '◉ Hide heatmap'    : '○ Show heatmap',    action: () => setShowHeatmap(h => !h),        active: showHeatmap },
            { label: showTerminator ? '◉ Hide terminator' : '○ Show terminator', action: () => setShowTerminator(t => !t),     active: showTerminator },
            { label: showCongestion ? '◉ Hide congestion' : '○ Congestion',      action: () => setShowCongestion(c => !c),     active: showCongestion },
            { label: showFIR        ? '◉ Hide FIR'        : '○ Show FIR',        action: () => setShowFIR(f => !f),            active: showFIR },
          ].map(btn => (
            <button
              key={btn.label}
              onClick={btn.action}
              className={`bg-black/60 backdrop-blur-md border px-3 py-1.5 rounded-lg text-[10px] font-mono transition-all text-left ${
                btn.active ? 'border-cyan-accent/50 text-cyan-accent' : 'border-white/10 text-slate-400 hover:text-cyan-accent hover:border-cyan-accent/30'
              }`}
            >
              {btn.label}
            </button>
          ))}

          {/* Map style toggle */}
          <div className="flex gap-1">
            {(Object.keys(MAP_TILES) as (keyof typeof MAP_TILES)[]).map(style => (
              <button
                key={style}
                onClick={() => setMapStyle(style)}
                className={`flex-1 bg-black/60 backdrop-blur-md border px-2 py-1.5 rounded-lg text-[9px] font-mono uppercase tracking-wider transition-all ${
                  mapStyle === style ? 'border-cyan-accent/50 text-cyan-accent' : 'border-white/10 text-slate-500 hover:text-slate-300'
                }`}
              >
                {style}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
