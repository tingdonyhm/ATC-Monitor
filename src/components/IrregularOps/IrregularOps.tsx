import React, { useState } from 'react'
import { useAviationStack } from '../../hooks/useAviationStack'
import { IrregularFlight } from '../../types/flight'
import { fmtTime, tzOffsetLabel } from '../../utils/time'

export const FALLBACK_IROPS: IrregularFlight[] = [
  { callsign: 'UAL234', airline: 'United Airlines', departure: 'ORD', arrival: 'LAX', status: 'cancelled', delay: null, scheduledDep: '2024-01-15T08:00:00+00:00', estimatedDep: '2024-01-15T08:00:00+00:00' },
  { callsign: 'DAL891', airline: 'Delta Air Lines', departure: 'ATL', arrival: 'JFK', status: 'active', delay: 95, scheduledDep: '2024-01-15T09:30:00+00:00', estimatedDep: '2024-01-15T11:05:00+00:00' },
  { callsign: 'BAW117', airline: 'British Airways', departure: 'LHR', arrival: 'BOS', status: 'diverted', delay: 120, scheduledDep: '2024-01-15T10:00:00+00:00', estimatedDep: '2024-01-15T12:00:00+00:00' },
  { callsign: 'AAL445', airline: 'American Airlines', departure: 'MIA', arrival: 'DFW', status: 'cancelled', delay: null, scheduledDep: '2024-01-15T11:00:00+00:00', estimatedDep: '2024-01-15T11:00:00+00:00' },
  { callsign: 'DLH401', airline: 'Lufthansa', departure: 'FRA', arrival: 'JFK', status: 'active', delay: 75, scheduledDep: '2024-01-15T12:00:00+00:00', estimatedDep: '2024-01-15T13:15:00+00:00' },
  { callsign: 'SWA772', airline: 'Southwest Airlines', departure: 'DEN', arrival: 'PHX', status: 'cancelled', delay: null, scheduledDep: '2024-01-15T13:00:00+00:00', estimatedDep: '2024-01-15T13:00:00+00:00' },
  { callsign: 'AFR321', airline: 'Air France', departure: 'CDG', arrival: 'LAX', status: 'active', delay: 110, scheduledDep: '2024-01-15T14:00:00+00:00', estimatedDep: '2024-01-15T15:50:00+00:00' },
  { callsign: 'QTR552', airline: 'Qatar Airways', departure: 'DOH', arrival: 'LHR', status: 'diverted', delay: 60, scheduledDep: '2024-01-15T15:00:00+00:00', estimatedDep: '2024-01-15T16:00:00+00:00' },
  { callsign: 'IGO341', airline: 'IndiGo', departure: 'DEL', arrival: 'BOM', status: 'active', delay: 45, scheduledDep: '2024-01-15T06:00:00+00:00', estimatedDep: '2024-01-15T06:45:00+00:00' },
  { callsign: 'AIC102', airline: 'Air India', departure: 'BOM', arrival: 'LHR', status: 'active', delay: 88, scheduledDep: '2024-01-15T07:00:00+00:00', estimatedDep: '2024-01-15T08:28:00+00:00' },
  { callsign: 'UAE519', airline: 'Emirates', departure: 'DXB', arrival: 'SYD', status: 'cancelled', delay: null, scheduledDep: '2024-01-15T16:00:00+00:00', estimatedDep: '2024-01-15T16:00:00+00:00' },
  { callsign: 'KLM671', airline: 'KLM', departure: 'AMS', arrival: 'NRT', status: 'active', delay: 55, scheduledDep: '2024-01-15T08:30:00+00:00', estimatedDep: '2024-01-15T09:25:00+00:00' },
  { callsign: 'SIA471', airline: 'Singapore Airlines', departure: 'SIN', arrival: 'LHR', status: 'active', delay: 40, scheduledDep: '2024-01-15T09:00:00+00:00', estimatedDep: '2024-01-15T09:40:00+00:00' },
  { callsign: 'ETH612', airline: 'Ethiopian Airlines', departure: 'ADD', arrival: 'DXB', status: 'diverted', delay: 90, scheduledDep: '2024-01-15T10:30:00+00:00', estimatedDep: '2024-01-15T12:00:00+00:00' },
  { callsign: 'THA661', airline: 'Thai Airways', departure: 'BKK', arrival: 'NRT', status: 'cancelled', delay: null, scheduledDep: '2024-01-15T11:30:00+00:00', estimatedDep: '2024-01-15T11:30:00+00:00' },
  { callsign: 'MAS370', airline: 'Malaysia Airlines', departure: 'KUL', arrival: 'SIN', status: 'active', delay: 30, scheduledDep: '2024-01-15T12:30:00+00:00', estimatedDep: '2024-01-15T13:00:00+00:00' },
  { callsign: 'QFA121', airline: 'Qantas', departure: 'SYD', arrival: 'MEL', status: 'active', delay: 65, scheduledDep: '2024-01-15T07:00:00+00:00', estimatedDep: '2024-01-15T08:05:00+00:00' },
  { callsign: 'TAM3456', airline: 'LATAM Airlines', departure: 'GRU', arrival: 'EZE', status: 'cancelled', delay: null, scheduledDep: '2024-01-15T14:00:00+00:00', estimatedDep: '2024-01-15T14:00:00+00:00' },
  { callsign: 'SVA115', airline: 'Saudia', departure: 'RUH', arrival: 'LHR', status: 'active', delay: 50, scheduledDep: '2024-01-15T05:00:00+00:00', estimatedDep: '2024-01-15T05:50:00+00:00' },
  { callsign: 'JAL716', airline: 'Japan Airlines', departure: 'NRT', arrival: 'SYD', status: 'diverted', delay: 75, scheduledDep: '2024-01-15T08:00:00+00:00', estimatedDep: '2024-01-15T09:15:00+00:00' },
]

const statusConfig = {
  cancelled: { color: 'text-red-alert', bg: 'bg-red-alert/10', border: 'border-red-alert/30', label: 'CANCELLED', dot: '#ff4444' },
  diverted:  { color: 'text-amber-warn', bg: 'bg-amber-warn/10', border: 'border-amber-warn/30', label: 'DIVERTED', dot: '#ff9900' },
  active:    { color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/30', label: 'DELAYED', dot: '#facc15' },
  scheduled: { color: 'text-slate-400',  bg: 'bg-slate-400/10',  border: 'border-slate-400/30',  label: 'SCHEDULED', dot: '#94a3b8' },
  landed:    { color: 'text-green-status', bg: 'bg-green-status/10', border: 'border-green-status/30', label: 'LANDED', dot: '#22c55e' },
  incident:  { color: 'text-red-alert',  bg: 'bg-red-alert/10',  border: 'border-red-alert/30',  label: 'INCIDENT', dot: '#ff4444' },
} as const

type FilterType = 'all' | 'cancelled' | 'diverted' | 'active'

export function IrregularOps() {
  const { data, isSample } = useAviationStack()
  const flights: IrregularFlight[] = (data && data.length > 0) ? data : FALLBACK_IROPS

  const [filter, setFilter] = useState<FilterType>('all')
  const [search, setSearch] = useState('')
  const [airlineFilter, setAirlineFilter] = useState('all')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  const handleCopy = (text: string) => {
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(text)
      setTimeout(() => setCopied(c => (c === text ? null : c)), 1500)
    }).catch(() => {})
  }

  const cancelled = flights.filter(f => f.status === 'cancelled').length
  const diverted  = flights.filter(f => f.status === 'diverted').length
  const delayed   = flights.filter(f => f.status === 'active').length

  const airlines = ['all', ...Array.from(new Set(flights.map(f => f.airline))).sort()]

  const filtered = flights.filter(f => {
    const matchFilter = filter === 'all' || f.status === filter
    const matchAirline = airlineFilter === 'all' || f.airline === airlineFilter
    const matchSearch = search === '' ||
      f.callsign.toLowerCase().includes(search.toLowerCase()) ||
      f.airline.toLowerCase().includes(search.toLowerCase()) ||
      f.departure.toLowerCase().includes(search.toLowerCase()) ||
      f.arrival.toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchAirline && matchSearch
  })

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: '#0a0f1e' }}>

      {/* Total header */}
      <div className="flex items-center justify-between px-4 pt-2 sm:pt-4 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Irregular Operations</span>
          {isSample && (
            <span className="text-[9px] font-bold uppercase tracking-wider text-amber-400 bg-amber-400/10 border border-amber-400/40 px-1.5 py-0.5 rounded">
              Sample Data
            </span>
          )}
        </div>
        <span className="text-xs font-bold font-mono text-white bg-white/10 border border-white/20 px-2 py-0.5 rounded">
          {flights.length} total
        </span>
      </div>
      {isSample && (
        <div className="px-4 pb-2 text-[10px] text-amber-400/70 leading-snug">
          Live delay/cancellation feed unavailable on the free tier — showing illustrative sample flights. Click any aircraft on the map for real schedule data.
        </div>
      )}

      {/* Stats summary */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 px-3 sm:px-4 pb-2">
        <div className="rounded-lg border border-red-alert/30 bg-red-alert/10 p-1.5 sm:p-3 text-center">
          <div className="text-lg sm:text-2xl font-bold text-red-400 font-mono">{cancelled}</div>
          <div className="text-[10px] text-red-400/70 uppercase tracking-widest mt-0.5">Cancelled</div>
        </div>
        <div className="rounded-lg border border-amber-warn/30 bg-amber-warn/10 p-1.5 sm:p-3 text-center">
          <div className="text-lg sm:text-2xl font-bold text-amber-400 font-mono">{diverted}</div>
          <div className="text-[10px] text-amber-400/70 uppercase tracking-widest mt-0.5">Diverted</div>
        </div>
        <div className="rounded-lg border border-yellow-400/30 bg-yellow-400/10 p-1.5 sm:p-3 text-center">
          <div className="text-lg sm:text-2xl font-bold text-yellow-400 font-mono">{delayed}</div>
          <div className="text-[10px] text-yellow-400/70 uppercase tracking-widest mt-0.5">Delayed</div>
        </div>
      </div>

      {/* Search bar */}
      <div className="px-4 pb-2">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            type="text"
            placeholder="Search flight, airline, airport..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-2 text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:border-cyan-accent/50"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">✕</button>
          )}
        </div>
      </div>

      {/* Airline filter dropdown */}
      <div className="px-4 pb-2">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
          </svg>
          <select
            value={airlineFilter}
            onChange={e => setAirlineFilter(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-cyan-accent/50 appearance-none cursor-pointer"
            style={{ background: '#0d1526' }}
          >
            {airlines.map(a => (
              <option key={a} value={a} style={{ background: '#0d1526' }}>
                {a === 'all' ? `All Airlines (${flights.length})` : a}
              </option>
            ))}
          </select>
          <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 9l6 6 6-6"/>
          </svg>
        </div>
      </div>

      {/* Filter buttons */}
      <div className="flex gap-2 px-4 pb-3">
        {(['all', 'cancelled', 'diverted', 'active'] as FilterType[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded text-[10px] font-semibold uppercase tracking-wider border transition-all ${
              filter === f
                ? f === 'cancelled' ? 'bg-red-alert/20 border-red-alert text-red-400'
                : f === 'diverted'  ? 'bg-amber-warn/20 border-amber-warn text-amber-400'
                : f === 'active'    ? 'bg-yellow-400/20 border-yellow-400 text-yellow-400'
                : 'bg-cyan-accent/20 border-cyan-accent text-cyan-accent'
                : 'border-white/10 text-slate-500 hover:text-slate-300 hover:border-white/20'
            }`}
          >
            {f === 'active' ? 'Delayed' : f === 'all' ? `All (${flights.length})` : f}
          </button>
        ))}
      </div>

      {/* Flight list */}
      <div className="flex-1 overflow-auto px-4 pb-4">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
            <span className="text-slate-500 text-xs">No flights match your search</span>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((flight, i) => {
              const cfg = statusConfig[flight.status] ?? statusConfig.active
              const isOpen = expanded === flight.callsign + i
              return (
                <div key={i} className={`p-3 rounded-lg border ${cfg.border} ${cfg.bg} hover:brightness-110 transition-all`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: cfg.dot }} />
                      <span className="text-sm font-bold font-mono text-white select-text">{flight.callsign}</span>
                      <button
                        onClick={() => handleCopy(flight.callsign)}
                        title="Copy flight number"
                        className="text-slate-500 hover:text-cyan-400 text-[11px] flex-shrink-0"
                      >
                        {copied === flight.callsign ? '✓' : '⧉'}
                      </button>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${cfg.color} ${cfg.border}`}>
                        {cfg.label}
                      </span>
                      <button
                        onClick={() => setExpanded(isOpen ? null : flight.callsign + i)}
                        title={isOpen ? 'Hide details' : 'Show details'}
                        className="text-slate-500 hover:text-cyan-400"
                      >
                        <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-300 mb-1.5 font-mono">
                    <span className="bg-white/5 px-1.5 py-0.5 rounded">{flight.departure}</span>
                    <svg className="w-3 h-3 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                    <span className="bg-white/5 px-1.5 py-0.5 rounded">{flight.arrival}</span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span>{flight.airline}</span>
                    {flight.delay && flight.delay > 0 && (
                      <span className="text-yellow-400 font-semibold">dep +{flight.delay}m</span>
                    )}
                  </div>

                  {/* Arrival timing */}
                  {(() => {
                    const sched = fmtTime(flight.scheduledArr)
                    const eta = fmtTime(flight.estimatedArr)
                    if (!sched && !eta) return null
                    // Only treat as "revised later" when there's a genuine positive delay.
                    const isLate = flight.arrDelay != null && flight.arrDelay > 0 && sched && eta && sched !== eta
                    return (
                      <div className="mt-1.5 pt-1.5 border-t border-white/5 flex items-center justify-between text-[10px] font-mono">
                        <span className="text-slate-500 uppercase tracking-wider">Arrival</span>
                        <div className="flex items-center gap-1.5">
                          {isLate ? (
                            <>
                              <span className="text-slate-600 line-through">{sched}</span>
                              <span className="text-cyan-300 font-semibold">{eta}</span>
                              <span className="text-red-400 font-semibold">+{flight.arrDelay}m</span>
                            </>
                          ) : flight.status === 'cancelled' ? (
                            <>
                              <span className="text-slate-400">{sched || eta}</span>
                              <span className="text-red-400 font-semibold">CANCELLED</span>
                            </>
                          ) : (
                            <span className="text-slate-300">{eta || sched}</span>
                          )}
                        </div>
                      </div>
                    )
                  })()}

                  {/* Expanded detail */}
                  {isOpen && (
                    <div className="mt-2 pt-2 border-t border-white/10 space-y-2 text-[10px] font-mono">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-black/20 rounded p-2">
                          <div className="text-slate-500 uppercase tracking-wider mb-1">
                            Departure · {flight.departure}
                            {tzOffsetLabel(flight.scheduledDep) && <span className="text-slate-600 normal-case"> ({tzOffsetLabel(flight.scheduledDep)})</span>}
                          </div>
                          <div className="text-slate-300">Sched: <span className="text-white">{fmtTime(flight.scheduledDep) || '—'}</span></div>
                          {fmtTime(flight.estimatedDep) && fmtTime(flight.estimatedDep) !== fmtTime(flight.scheduledDep) && (
                            <div className="text-cyan-300">Actual: {fmtTime(flight.estimatedDep)}</div>
                          )}
                          <div className="text-slate-500 mt-1">Term {flight.depTerminal || '—'} · Gate {flight.depGate || '—'}</div>
                        </div>
                        <div className="bg-black/20 rounded p-2">
                          <div className="text-slate-500 uppercase tracking-wider mb-1">
                            Arrival · {flight.arrival}
                            {tzOffsetLabel(flight.scheduledArr) && <span className="text-slate-600 normal-case"> ({tzOffsetLabel(flight.scheduledArr)})</span>}
                          </div>
                          <div className="text-slate-300">Sched: <span className="text-white">{fmtTime(flight.scheduledArr) || '—'}</span></div>
                          {fmtTime(flight.estimatedArr) && fmtTime(flight.estimatedArr) !== fmtTime(flight.scheduledArr) && (
                            <div className="text-cyan-300">ETA: {fmtTime(flight.estimatedArr)}</div>
                          )}
                          <div className="text-slate-500 mt-1">Term {flight.arrTerminal || '—'} · Gate {flight.arrGate || '—'}</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-slate-400">
                        <span>{flight.aircraft || 'Aircraft N/A'}{flight.reg ? ` · ${flight.reg}` : ''}</span>
                        {flight.rawStatus && <span className="text-slate-500 uppercase">{flight.rawStatus}</span>}
                      </div>
                      <div className="text-[9px] text-slate-600">Local airport time (DST auto-applied per date).</div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
