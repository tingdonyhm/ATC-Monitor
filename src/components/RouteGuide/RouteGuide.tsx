import React, { useState, useMemo, useEffect } from 'react'
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'
import { useRoutes, RouteDestination } from '../../hooks/useRoutes'
import { AIRPORTS, AIRPORT_COORDS } from '../../data/airportData'

const QUICK_AIRPORTS = ['JFK', 'LHR', 'DXB', 'LAX', 'SIN', 'FRA', 'DEL', 'BOM', 'HKG', 'HND']

const MAP_TILES: Record<string, string> = {
  voyager: 'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
  dark: 'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
  satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
}

// Searchable index built once: [iata, name, city] lowercased for matching.
const SEARCH_INDEX = Object.entries(AIRPORTS).map(([iata, a]) => ({
  iata, name: a.n, city: a.c, hay: `${iata} ${a.c} ${a.n}`.toLowerCase(),
}))

function airportLabel(iata: string): string {
  const a = AIRPORTS[iata]
  return a ? `${iata} — ${a.c || a.n}` : iata
}

function fmtTime(iso?: string | null): string | null {
  if (!iso) return null
  const m = iso.match(/[ T](\d{2}:\d{2})/)
  return m ? m[1] : null
}

function greatCircle(from: [number, number], to: [number, number], steps = 48): [number, number][] {
  const toRad = (d: number) => (d * Math.PI) / 180
  const toDeg = (r: number) => (r * 180) / Math.PI
  const lat1 = toRad(from[0]), lon1 = toRad(from[1]), lat2 = toRad(to[0]), lon2 = toRad(to[1])
  const d = 2 * Math.asin(Math.sqrt(Math.sin((lat2 - lat1) / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin((lon2 - lon1) / 2) ** 2))
  if (d === 0) return [from, to]
  const pts: [number, number][] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const A = Math.sin((1 - t) * d) / Math.sin(d)
    const B = Math.sin(t * d) / Math.sin(d)
    const x = A * Math.cos(lat1) * Math.cos(lon1) + B * Math.cos(lat2) * Math.cos(lon2)
    const y = A * Math.cos(lat1) * Math.sin(lon1) + B * Math.cos(lat2) * Math.sin(lon2)
    const z = A * Math.sin(lat1) + B * Math.sin(lat2)
    pts.push([toDeg(Math.atan2(z, Math.sqrt(x * x + y * y))), toDeg(Math.atan2(y, x))])
  }
  return pts
}

function MapAutoFit({ points }: { points: [number, number][] }) {
  const map = useMap()
  useEffect(() => {
    if (points.length === 0) return
    if (points.length === 1) { map.setView(points[0], 4); return }
    try { map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 7 }) } catch { /* noop */ }
  }, [points, map])
  return null
}

function RouteMap({ origin, originCode, routes, hovered, onSelect, mapStyle }: { origin: [number, number] | null; originCode: string; routes: RouteDestination[]; hovered: string | null; onSelect?: (dest: string | null) => void; mapStyle: string }) {
  const arcs = useMemo(() => {
    if (!origin) return []
    return routes
      .map(r => ({ dest: r.dest, name: r.name, coords: AIRPORT_COORDS[r.dest] as [number, number] | undefined, count: r.count }))
      .filter(r => r.coords)
      .map(r => ({ dest: r.dest, name: r.name, to: r.coords!, count: r.count, arc: greatCircle(origin, r.coords!) }))
  }, [origin, routes])

  const allPoints = useMemo<[number, number][]>(() => {
    const pts: [number, number][] = origin ? [origin] : []
    arcs.forEach(a => pts.push(a.to))
    return pts
  }, [origin, arcs])

  return (
    <MapContainer
      preferCanvas
      center={origin ?? [20, 0]}
      zoom={3}
      minZoom={2}
      worldCopyJump
      style={{ height: '100%', width: '100%', background: '#0a0f1e' }}
      zoomControl={false}
      attributionControl={false}
    >
      <TileLayer url={MAP_TILES[mapStyle] || MAP_TILES.dark} maxZoom={19} />
      <MapAutoFit points={allPoints} />
      {arcs.map(a => {
        const isHot = hovered === a.dest
        return (
          <Polyline
            key={a.dest}
            positions={a.arc}
            pathOptions={{ color: isHot ? '#ffaa00' : '#00d4ff', weight: isHot ? 3 : 1.5, opacity: isHot ? 0.95 : 0.4 }}
            eventHandlers={{
              click: () => onSelect?.(a.dest),
              mouseover: () => onSelect?.(a.dest),
            }}
          >
            <Tooltip sticky direction="top" opacity={0.95}>
              <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{originCode} → {a.dest} · {a.name} · {a.count} dep</span>
            </Tooltip>
          </Polyline>
        )
      })}
      {arcs.map(a => (
        <CircleMarker
          key={`m-${a.dest}`}
          center={a.to}
          radius={hovered === a.dest ? 6 : 3.5}
          pathOptions={{ color: hovered === a.dest ? '#ffaa00' : '#00d4ff', fillColor: hovered === a.dest ? '#ffaa00' : '#00d4ff', fillOpacity: 0.9, weight: 1 }}
          eventHandlers={{ click: () => onSelect?.(a.dest), mouseover: () => onSelect?.(a.dest) }}
        >
          <Tooltip direction="top" offset={[0, -2]} opacity={0.95}>
            <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{originCode} → {a.dest} · {a.name} · {a.count} dep</span>
          </Tooltip>
        </CircleMarker>
      ))}
      {origin && (
        <CircleMarker center={origin} radius={7} pathOptions={{ color: '#fff', fillColor: '#22c55e', fillOpacity: 1, weight: 2 }} />
      )}
    </MapContainer>
  )
}

export function RouteGuide() {
  const [airport, setAirport] = useState('')
  const [input, setInput] = useState('')
  const [airline, setAirline] = useState('all')
  const [hovered, setHovered] = useState<string | null>(null)
  const [mapStyle, setMapStyle] = useState('satellite')
  const [showSug, setShowSug] = useState(false)
  const { data: routes, isLoading, isError } = useRoutes(airport)

  const suggestions = useMemo(() => {
    const q = input.trim().toLowerCase()
    if (q.length < 2) return []
    const starts = SEARCH_INDEX.filter(a => a.iata.toLowerCase() === q || a.city.toLowerCase().startsWith(q))
    const contains = SEARCH_INDEX.filter(a => !starts.includes(a) && a.hay.includes(q))
    return [...starts, ...contains].slice(0, 8)
  }, [input])

  const allAirlines = useMemo(() => {
    const s = new Set<string>()
    routes?.forEach(r => r.airlines.forEach(a => s.add(a.airline)))
    return ['all', ...[...s].sort()]
  }, [routes])

  const filtered = useMemo(() => {
    if (!routes) return []
    if (airline === 'all') return routes
    return routes
      .map(r => ({ ...r, airlines: r.airlines.filter(a => a.airline === airline) }))
      .filter(r => r.airlines.length > 0)
  }, [routes, airline])

  const origin = AIRPORT_COORDS[airport] as [number, number] | undefined

  const pick = (iata: string) => {
    setAirport(iata)
    setInput(airportLabel(iata))
    setAirline('all')
    setShowSug(false)
  }
  const submit = () => {
    const code = input.trim().toUpperCase()
    if (/^[A-Z]{3}$/.test(code) && AIRPORTS[code]) { pick(code); return }
    if (suggestions.length > 0) pick(suggestions[0].iata)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: '#0a0f1e' }}>
      <div className="px-4 pt-3 pb-2 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-slate-200">Route Guide</span>
          <span className="text-[10px] text-slate-500">— nonstop departures in the next 12h</span>
        </div>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <div className="relative">
            <input
              value={input}
              onChange={e => { setInput(e.target.value); setShowSug(true) }}
              onFocus={() => setShowSug(true)}
              onBlur={() => setTimeout(() => setShowSug(false), 150)}
              onKeyDown={e => { if (e.key === 'Enter') submit() }}
              placeholder="City or airport (e.g. Tokyo or HND)"
              className="w-60 bg-white/5 border border-white/10 rounded px-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-accent/50"
            />
            {showSug && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 z-[3000] rounded-lg border border-white/10 overflow-hidden max-h-72 overflow-y-auto" style={{ background: '#0d1526' }}>
                {suggestions.map(s => (
                  <button
                    key={s.iata}
                    onMouseDown={() => pick(s.iata)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-white/5 border-b border-white/5 last:border-0"
                  >
                    <span className="text-xs font-bold font-mono text-cyan-400 w-9">{s.iata}</span>
                    <span className="text-[11px] text-slate-300 truncate">{s.city}<span className="text-slate-600"> — {s.name}</span></span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={submit} className="px-3 py-1.5 rounded bg-cyan-accent text-navy text-xs font-bold">Go</button>
          <select
            value={airline}
            onChange={e => setAirline(e.target.value)}
            className="bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-accent/50 max-w-[200px]"
            style={{ background: '#0d1526' }}
          >
            {allAirlines.map(a => (
              <option key={a} value={a} style={{ background: '#0d1526' }}>{a === 'all' ? 'All airlines' : a}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-1.5 mt-2 flex-wrap">
          {QUICK_AIRPORTS.map(a => (
            <button
              key={a}
              onClick={() => pick(a)}
              className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-all ${airport === a ? 'border-cyan-accent/50 text-cyan-accent bg-cyan-accent/10' : 'border-white/10 text-slate-500 hover:text-slate-300'}`}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        {/* Left: destination list */}
        <div className="w-full md:w-[42%] lg:w-[36%] overflow-auto p-3 border-r border-white/10 flex-shrink-0">
          {!airport ? (
            <div className="text-center text-xs text-slate-500 py-10 px-4">
              Search a departure airport above (city or IATA) to see all its destinations and airlines.
            </div>
          ) : isLoading ? (
            <div className="text-center text-xs text-slate-500 py-10">Loading routes from {airport}…</div>
          ) : isError ? (
            <div className="text-center text-xs text-slate-500 py-10">Couldn't load routes for {airport}.</div>
          ) : filtered.length === 0 ? (
            <div className="text-center text-xs text-slate-500 py-10">No departures from {airport} in the next 12h.</div>
          ) : (
            <>
              <div className="text-[11px] text-slate-500 mb-2">
                <span className="text-cyan-400 font-bold font-mono">{airportLabel(airport)}</span> → {filtered.length} destination{filtered.length === 1 ? '' : 's'}
                {airline !== 'all' && <span> · {airline}</span>}
              </div>
              <div className="space-y-2">
                {filtered.map(r => (
                  <div
                    key={r.dest}
                    onMouseEnter={() => setHovered(r.dest)}
                    onMouseLeave={() => setHovered(h => (h === r.dest ? null : h))}
                    className={`rounded-lg border p-2.5 transition-all ${hovered === r.dest ? 'border-amber-400/60 bg-amber-400/5' : 'border-white/10'}`}
                    style={{ background: hovered === r.dest ? undefined : '#0d1526' }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-cyan-accent">✈</span>
                        <span className="text-sm font-bold font-mono text-white">{r.dest}</span>
                        <span className="text-[8px] font-bold uppercase tracking-wide text-green-400 bg-green-500/10 border border-green-500/30 rounded px-1">Nonstop</span>
                        {!AIRPORT_COORDS[r.dest] && <span className="text-[8px] text-slate-600">(no map)</span>}
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">{r.count} dep</span>
                    </div>
                    <div className="text-[10px] text-slate-500 mb-1.5 truncate">{r.name}</div>
                    <div className="space-y-1">
                      {r.airlines.map(a => (
                        <div key={a.airline} className="text-[10px]">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-300 truncate">{a.airline}</span>
                            <span className="text-slate-600 font-mono ml-2 flex-shrink-0">{a.count}×</span>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {a.flights.filter(f => f.number).map((f, i) => (
                              <span key={i} className="font-mono text-[9px] text-cyan-300/80 bg-cyan-accent/5 border border-cyan-accent/20 rounded px-1">
                                {f.number}{fmtTime(f.time) ? ` ${fmtTime(f.time)}` : ''}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Right: map with route arcs */}
        <div className="hidden md:block flex-1 relative">
          {!airport ? (
            <div className="flex items-center justify-center h-full text-xs text-slate-600">Pick an airport to map its routes.</div>
          ) : !origin ? (
            <div className="flex items-center justify-center h-full text-xs text-slate-600">No coordinates for {airport}.</div>
          ) : (
            <>
              <RouteMap origin={origin} originCode={airport} routes={filtered} hovered={hovered} onSelect={setHovered} mapStyle={mapStyle} />
              <div className="absolute top-3 right-3 z-[1000] flex gap-1">
                {Object.keys(MAP_TILES).map(style => (
                  <button
                    key={style}
                    onClick={() => setMapStyle(style)}
                    className={`bg-black/60 backdrop-blur-md border px-2 py-1 rounded text-[9px] font-mono uppercase tracking-wider transition-all ${mapStyle === style ? 'border-cyan-accent/50 text-cyan-accent' : 'border-white/10 text-slate-400 hover:text-slate-200'}`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
