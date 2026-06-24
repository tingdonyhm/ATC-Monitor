import React, { useState, useMemo } from 'react'
import { useRoutes } from '../../hooks/useRoutes'

const QUICK_AIRPORTS = ['JFK', 'LHR', 'DXB', 'LAX', 'SIN', 'FRA', 'DEL', 'BOM', 'HKG', 'ORD']

function fmtTime(iso?: string | null): string | null {
  if (!iso) return null
  const m = iso.match(/[ T](\d{2}:\d{2})/)
  return m ? m[1] : null
}

export function RouteGuide() {
  const [airport, setAirport] = useState('JFK')
  const [input, setInput] = useState('JFK')
  const [airline, setAirline] = useState('all')
  const { data: routes, isLoading, isError } = useRoutes(airport)

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

  const submit = () => {
    const code = input.trim().toUpperCase()
    if (/^[A-Z]{3}$/.test(code)) { setAirport(code); setAirline('all') }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: '#0a0f1e' }}>
      <div className="px-4 pt-3 pb-2 border-b border-white/10">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-slate-200">Route Guide</span>
          <span className="text-[10px] text-slate-500">— departures in the next 12h</span>
        </div>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <input
            value={input}
            onChange={e => setInput(e.target.value.toUpperCase().slice(0, 3))}
            onKeyDown={e => { if (e.key === 'Enter') submit() }}
            placeholder="IATA (e.g. JFK)"
            className="w-28 bg-white/5 border border-white/10 rounded px-3 py-1.5 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-accent/50"
          />
          <button onClick={submit} className="px-3 py-1.5 rounded bg-cyan-accent text-navy text-xs font-bold">Go</button>
          <select
            value={airline}
            onChange={e => setAirline(e.target.value)}
            className="bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-accent/50"
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
              onClick={() => { setInput(a); setAirport(a); setAirline('all') }}
              className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-all ${airport === a ? 'border-cyan-accent/50 text-cyan-accent bg-cyan-accent/10' : 'border-white/10 text-slate-500 hover:text-slate-300'}`}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {isLoading ? (
          <div className="text-center text-xs text-slate-500 py-10">Loading routes from {airport}…</div>
        ) : isError ? (
          <div className="text-center text-xs text-slate-500 py-10">Couldn't load routes for {airport}. Try another airport.</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-xs text-slate-500 py-10">No departures found from {airport} in the next 12 hours.</div>
        ) : (
          <>
            <div className="text-[11px] text-slate-500 mb-3">
              <span className="text-cyan-400 font-bold font-mono">{airport}</span> → {filtered.length} destination{filtered.length === 1 ? '' : 's'}
              {airline !== 'all' && <span> · {airline}</span>}
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map(r => (
                <div key={r.dest} className="rounded-lg border border-white/10 p-3" style={{ background: '#0d1526' }}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-cyan-accent">✈</span>
                      <span className="text-base font-bold font-mono text-white">{r.dest}</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">{r.count} dep</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mb-2 truncate">{r.name}</div>
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
    </div>
  )
}
