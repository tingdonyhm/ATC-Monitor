import React, { useState } from 'react'
import { useFlightInfo } from '../../hooks/useFlightInfo'
import { tzOffsetLabel } from '../../utils/time'

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
      <div className="max-w-2xl mx-auto">
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
          <div className="text-center text-xs text-slate-600 py-16 border border-dashed border-white/10 rounded-xl">
            Enter a flight number above and press Check.
          </div>
        ) : isLoading ? (
          <div className="text-center text-xs text-slate-500 py-16">Looking up {query}…</div>
        ) : !flight ? (
          <div className="text-center text-xs text-slate-500 py-16 border border-white/10 rounded-xl">
            No schedule found for <span className="font-mono text-slate-300">{query}</span> on {date}.<br />
            <span className="text-slate-600">It may not operate that day, or the number isn't a scheduled flight.</span>
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
                  <div className="text-xl font-bold font-mono text-cyan-400">{flight.number || query}</div>
                  <div className="text-xs text-slate-400">{flight.airline || '—'}</div>
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
            </div>
          )
        })()}
      </div>
    </div>
  )
}
