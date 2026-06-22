import React from 'react'
import { IrregularFlight } from '../../types/flight'

interface Props {
  flights: IrregularFlight[]
}

export function DelayLeaderboard({ flights }: Props) {
  const top10 = flights
    .filter(f => f.delay !== null && f.delay > 0)
    .sort((a, b) => (b.delay ?? 0) - (a.delay ?? 0))
    .slice(0, 10)

  const maxDelay = top10[0]?.delay ?? 1

  return (
    <div className="rounded-xl border border-white/10 overflow-hidden" style={{ background: '#0d1526' }}>
      <div className="px-4 py-2.5 border-b border-white/10 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-widest text-cyan-400">Delay Leaderboard</span>
        <span className="text-[10px] text-slate-500 font-mono">Top delays</span>
      </div>
      {top10.length === 0 ? (
        <div className="px-4 py-6 text-center text-xs text-slate-600">No delayed flights</div>
      ) : (
        <div className="divide-y divide-white/5">
          {top10.map((f, i) => {
            const pct = Math.round(((f.delay ?? 0) / maxDelay) * 100)
            return (
              <div key={f.callsign} className="flex items-center gap-3 px-4 py-2.5">
                <span className="text-xs font-bold font-mono w-4 text-slate-500">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold font-mono text-white">{f.callsign}</span>
                    <span className="text-[10px] text-slate-500">{f.airline}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-slate-400">{f.departure} → {f.arrival}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #f97316, #ef4444)' }}
                    />
                  </div>
                </div>
                <span className="text-sm font-bold font-mono text-red-400 flex-shrink-0">+{f.delay}m</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
