import React, { useState, useEffect, useMemo } from 'react'
import { MapContainer, TileLayer, Polyline, CircleMarker, Tooltip, useMap } from 'react-leaflet'
import L from 'leaflet'
import { useFlightInfo } from '../../hooks/useFlightInfo'
import { tzOffsetLabel } from '../../utils/time'
import { AIRPORT_COORDS } from '../../data/airportData'

const EXAMPLES = ['AA1715', 'BA117', 'CA981', 'EK202', 'SQ322', 'QF1', 'AI101', 'EK29']

function greatCircle(from: [number, number], to: [number, number], steps = 64): [number, number][] {
  const toRad = (d: number) => (d * Math.PI) / 180
  const toDeg = (r: number) => (r * 180) / Math.PI
  const lat1 = toRad(from[0]), lon1 = toRad(from[1]), lat2 = toRad(to[0]), lon2 = toRad(to[1])
  const d = 2 * Math.asin(Math.sqrt(Math.sin((lat2 - lat1) / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin((lon2 - lon1) / 2) ** 2))
  if (d === 0) return [from, to]
  const pts: [number, number][] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const A = Math.sin((1 - t) * d) / Math.sin(d), B = Math.sin(t * d) / Math.sin(d)
    const x = A * Math.cos(lat1) * Math.cos(lon1) + B * Math.cos(lat2) * Math.cos(lon2)
    const y = A * Math.cos(lat1) * Math.sin(lon1) + B * Math.cos(lat2) * Math.sin(lon2)
    const z = A * Math.sin(lat1) + B * Math.sin(lat2)
    pts.push([toDeg(Math.atan2(z, Math.sqrt(x * x + y * y))), toDeg(Math.atan2(y, x))])
  }
  return pts
}

function FitRoute({ points }: { points: [number, number][] }) {
  const map = useMap()
  useEffect(() => {
    if (points.length < 2) return
    try { map.fitBounds(L.latLngBounds(points), { padding: [50, 50], maxZoom: 6 }) } catch { /* noop */ }
  }, [points, map])
  return null
}

function RouteArc({ dep, arr }: { dep: [number, number]; arr: [number, number] }) {
  const arc = useMemo(() => greatCircle(dep, arr), [dep, arr])
  return (
    <MapContainer preferCanvas center={dep} zoom={3} minZoom={1} worldCopyJump
      style={{ height: '100%', width: '100%', background: '#0a0f1e' }} zoomControl={false} attributionControl={false}>
      <TileLayer url="https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png" maxZoom={19} />
      <FitRoute points={[dep, arr]} />
      <Polyline positions={arc} pathOptions={{ color: '#00d4ff', weight: 2, opacity: 0.8 }} />
      <CircleMarker center={dep} radius={6} pathOptions={{ color: '#fff', fillColor: '#22c55e', fillOpacity: 1, weight: 2 }} />
      <CircleMarker center={arr} radius={6} pathOptions={{ color: '#fff', fillColor: '#ef4444', fillOpacity: 1, weight: 2 }} />
    </MapContainer>
  )
}

export function FlightStatusPage() {
  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)
  const dateOptions = Array.from({ length: 21 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() + (i - 10))
    return d.toISOString().slice(0, 10)
  })

  const [input, setInput] = useState('')
  const [query, setQuery] = useState('')
  const [date, setDate] = useState(todayStr)
  const [myTime, setMyTime] = useState(false)
  const apiDate = date === todayStr ? undefined : date
  const myTz = Intl.DateTimeFormat().resolvedOptions().timeZone

  const { data: flight, isLoading } = useFlightInfo(query, apiDate)

  const fmt = (iso?: string | null) => {
    if (!iso) return null
    if (myTime) {
      const d = new Date(iso.replace(' ', 'T'))
      if (!Number.isNaN(d.getTime())) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
    }
    const m = iso.match(/[ T](\d{2}:\d{2})/)
    const tz = tzOffsetLabel(iso)
    return m ? `${m[1]}${tz ? ` ${tz}` : ''}` : iso
  }
  const delayMins = (sched?: string | null, actual?: string | null) => {
    if (!sched || !actual) return null
    const d = (new Date(actual.replace(' ', 'T')).getTime() - new Date(sched.replace(' ', 'T')).getTime()) / 60000
    return Number.isNaN(d) ? null : Math.round(d)
  }

  const submit = () => setQuery(input.trim().toUpperCase())

  return (
    <div className="h-full overflow-auto p-4 sm:p-6" style={{ background: '#0a0f1e' }}>
      <div className="max-w-3xl mx-auto">
        <h2 className="text-lg font-bold text-slate-100 mb-1">Flight Status</h2>
        <p className="text-xs text-slate-500 mb-4">Check any flight's route, schedule, delays, terminals and gates — past or upcoming.</p>

        <div className="flex items-center gap-2 flex-wrap mb-4">
          <input
            value={input}
            onChange={e => setInput(e.target.value.toUpperCase())}
            onKeyDown={e => { if (e.key === 'Enter') submit() }}
            placeholder="Flight number — e.g. AA1715, CA981, BA117"
            className="flex-1 min-w-[200px] bg-white/5 border border-white/10 rounded px-3 py-2 text-sm font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-accent/50"
          />
          <button onClick={submit} className="px-4 py-2 rounded bg-cyan-accent text-navy text-sm font-bold">Check</button>
          <select
            value={date}
            onChange={e => setDate(e.target.value)}
            className="bg-white/5 border border-white/10 rounded px-2 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-accent/50"
            style={{ background: '#0d1526' }}
          >
            {dateOptions.map(d => (
              <option key={d} value={d} style={{ background: '#0d1526' }}>{d === todayStr ? `Today (${d})` : d}</option>
            ))}
          </select>
          <button
            onClick={() => setMyTime(m => !m)}
            title={`Toggle airport-local vs your time (${myTz})`}
            className={`text-[11px] px-2 py-2 rounded border transition-all ${myTime ? 'border-cyan-accent/50 text-cyan-300 bg-cyan-accent/10' : 'border-white/10 text-slate-400'}`}
          >
            {myTime ? '🕒 My time' : '🕒 Airport time'}
          </button>
        </div>

        {!query ? (
          <div className="py-10 border border-dashed border-white/10 rounded-xl flex flex-col items-center gap-4">
            <svg className="w-12 h-12 text-cyan-accent/40" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
            </svg>
            <div className="text-xs text-slate-500">Enter a flight number above, or try one of these:</div>
            <div className="flex flex-wrap justify-center gap-2 max-w-md">
              {EXAMPLES.map(ex => (
                <button
                  key={ex}
                  onClick={() => { setInput(ex); setQuery(ex) }}
                  className="px-3 py-1 rounded-full text-xs font-mono border border-cyan-accent/30 text-cyan-300 hover:bg-cyan-accent/10 transition-all"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        ) : isLoading ? (
          <div className="text-center text-xs text-slate-500 py-16">Looking up {query}…</div>
        ) : !flight ? (
          <div className="text-center text-xs text-slate-500 py-16 border border-white/10 rounded-xl">
            No schedule found for <span className="font-mono text-slate-300">{query}</span> on {date}.<br />
            <span className="text-slate-600">It may not operate that day, the number isn't a scheduled flight, or the schedule data source has hit its monthly free limit.</span>
          </div>
        ) : (() => {
          const cancelled = /cancel/i.test(flight.status || '')
          const depDelay = delayMins(flight.departure.scheduled, flight.departure.actual)
          const arrDelay = delayMins(flight.arrival.scheduled, flight.arrival.actual)
          const worst = Math.max(depDelay ?? -999, arrDelay ?? -999)
          const isDelayed = !cancelled && worst > 15
          const badge = cancelled
            ? { text: 'CANCELLED', cls: 'border-red-500/50 text-red-400 bg-red-500/10' }
            : isDelayed
            ? { text: `DELAYED +${worst}m`, cls: 'border-amber-400/50 text-amber-400 bg-amber-400/10' }
            : { text: flight.status || 'SCHEDULED', cls: 'border-cyan-accent/40 text-cyan-300' }
          const depActual = depDelay !== null && depDelay > 5 ? flight.departure.actual : null
          const arrActual = arrDelay !== null && arrDelay > 5 ? flight.arrival.actual : null
          return (
            <div className="rounded-2xl border border-cyan-accent/20 p-5" style={{ background: '#0d1526' }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold font-mono text-cyan-400">{flight.number || query}</span>
                    <a
                      href={`https://www.google.com/search?q=${encodeURIComponent(`${flight.airline || ''} flight ${flight.number || query} status`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Look up this flight on Google"
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-cyan-accent/40 text-cyan-300 hover:bg-cyan-accent/15 text-[10px] font-semibold transition-all"
                    >
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14L21 3"/>
                      </svg>
                      Google
                    </a>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">{flight.airline || '—'}</div>
                </div>
                <span className={`text-[11px] font-bold uppercase px-2.5 py-1 rounded border ${badge.cls}`}>{badge.text}</span>
              </div>
              <div className="flex items-center justify-between mb-4">
                <div className="text-left">
                  <div className="text-3xl font-black font-mono text-white">{flight.departure.airport || '—'}</div>
                  <div className="text-[10px] text-slate-500 max-w-[140px] truncate">{flight.departure.name || ''}</div>
                </div>
                <div className="text-cyan-accent text-2xl px-3">✈</div>
                <div className="text-right">
                  <div className="text-3xl font-black font-mono text-white">{flight.arrival.airport || '—'}</div>
                  <div className="text-[10px] text-slate-500 max-w-[140px] truncate ml-auto">{flight.arrival.name || ''}</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="bg-black/20 rounded-lg p-3">
                  <div className="text-slate-500 uppercase tracking-wider mb-1 text-[10px]">Departure</div>
                  <div className="text-slate-300">Sched: <span className="text-white">{fmt(flight.departure.scheduled) || '—'}</span></div>
                  {depActual && <div className="text-amber-300">Actual: {fmt(depActual)} <span className="text-red-400">+{depDelay}m</span></div>}
                  <div className="text-slate-500 mt-1 text-[11px]">Term {flight.departure.terminal || '—'} · Gate {flight.departure.gate || '—'}</div>
                </div>
                <div className="bg-black/20 rounded-lg p-3">
                  <div className="text-slate-500 uppercase tracking-wider mb-1 text-[10px]">Arrival</div>
                  <div className="text-slate-300">Sched: <span className="text-white">{fmt(flight.arrival.scheduled) || '—'}</span></div>
                  {arrActual && <div className="text-amber-300">ETA: {fmt(arrActual)} <span className="text-red-400">+{arrDelay}m</span></div>}
                  <div className="text-slate-500 mt-1 text-[11px]">Term {flight.arrival.terminal || '—'} · Gate {flight.arrival.gate || '—'}</div>
                </div>
              </div>
              <div className="text-[10px] text-slate-600 mt-3">{myTime ? `Your time · ${myTz}` : 'Local airport time'} (DST auto-applied). Source: AeroDataBox.</div>

              {(() => {
                const dep = flight.departure.airport ? AIRPORT_COORDS[flight.departure.airport] as [number, number] | undefined : undefined
                const arr = flight.arrival.airport ? AIRPORT_COORDS[flight.arrival.airport] as [number, number] | undefined : undefined
                if (!dep || !arr) return null
                return (
                  <div className="mt-4 rounded-xl overflow-hidden border border-white/10" style={{ height: 320 }}>
                    <RouteArc dep={dep} arr={arr} />
                  </div>
                )
              })()}
            </div>
          )
        })()}
      </div>
    </div>
  )
}
