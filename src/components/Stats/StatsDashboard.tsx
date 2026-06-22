import React from 'react'

interface Props {
  aircraft: any[]
}

export function StatsDashboard({ aircraft }: Props) {
  const countryCounts: Record<string, number> = {}
  for (const ac of aircraft) {
    if (ac.originCountry) {
      countryCounts[ac.originCountry] = (countryCounts[ac.originCountry] ?? 0) + 1
    }
  }
  const topCountries = Object.entries(countryCounts).sort((a, b) => b[1] - a[1]).slice(0, 10)

  // Airline counts (derive from callsign prefix — first 3 chars)
  const airlineCounts: Record<string, number> = {}
  for (const ac of aircraft) {
    if (ac.callsign && ac.callsign.trim().length >= 3) {
      const code = ac.callsign.trim().slice(0, 3).toUpperCase()
      airlineCounts[code] = (airlineCounts[code] ?? 0) + 1
    }
  }
  const topAirlines = Object.entries(airlineCounts).sort((a, b) => b[1] - a[1]).slice(0, 10)

  // Route popularity
  const routeCounts: Record<string, number> = {}
  for (const ac of aircraft) {
    if (ac.departure && ac.arrival) {
      const key = `${ac.departure}→${ac.arrival}`
      routeCounts[key] = (routeCounts[key] ?? 0) + 1
    }
  }
  const topRoutes = Object.entries(routeCounts).sort((a, b) => b[1] - a[1]).slice(0, 10)

  let slow = 0, medium = 0, fast = 0
  for (const ac of aircraft) {
    if (ac.velocity == null) continue
    const kts = ac.velocity * 1.944
    if (kts < 200) slow++
    else if (kts < 400) medium++
    else fast++
  }

  let ground = 0, low = 0, mid = 0, cruise = 0
  for (const ac of aircraft) {
    if (ac.baroAltitude == null || ac.baroAltitude <= 0) { ground++; continue }
    const ft = ac.baroAltitude * 3.28084
    if (ft <= 0) ground++
    else if (ft < 10000) low++
    else if (ft < 35000) mid++
    else cruise++
  }

  const inFlight = aircraft.filter(ac => !ac.onGround && ac.velocity != null)
  const avgSpeed = inFlight.length > 0
    ? Math.round(inFlight.reduce((s, ac) => s + ac.velocity * 1.944, 0) / inFlight.length)
    : 0
  const withAlt = aircraft.filter(ac => ac.baroAltitude != null && ac.baroAltitude > 0)
  const avgAlt = withAlt.length > 0
    ? Math.round(withAlt.reduce((s, ac) => s + ac.baroAltitude * 3.28084, 0) / withAlt.length)
    : 0

  const maxCountry = topCountries[0]?.[1] ?? 1
  const maxSpeed = Math.max(slow, medium, fast, 1)
  const maxAlt = Math.max(ground, low, mid, cruise, 1)
  const maxAirline = topAirlines[0]?.[1] ?? 1

  const BAR_W = 180
  const BAR_H = 16

  function BarChart({ data, colors }: { data: { label: string; value: number; max: number }[]; colors: string[] }) {
    return (
      <div className="space-y-2">
        {data.map((d, i) => (
          <div key={d.label} className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 font-mono w-24 truncate flex-shrink-0">{d.label}</span>
            <svg width={BAR_W} height={BAR_H} className="flex-shrink-0">
              <rect x={0} y={2} width={BAR_W} height={BAR_H - 4} rx={3} fill="#0d1526" />
              <rect x={0} y={2} width={Math.round((d.value / d.max) * BAR_W)} height={BAR_H - 4} rx={3} fill={colors[i % colors.length]} opacity={0.85} />
            </svg>
            <span className="text-[10px] text-slate-300 font-mono w-8 text-right">{d.value}</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto p-4 space-y-6" style={{ background: '#0a0f1e' }}>
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total Flights', value: aircraft.length.toLocaleString() },
          { label: 'Avg Speed', value: `${avgSpeed} kts` },
          { label: 'Avg Altitude', value: `${avgAlt.toLocaleString()} ft` },
          { label: 'Countries', value: Object.keys(countryCounts).length.toString() },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-cyan-500/20 p-3 text-center" style={{ background: '#0d1526' }}>
            <div className="text-xl font-bold font-mono text-cyan-400" style={{ textShadow: '0 0 10px #06b6d488' }}>{value}</div>
            <div className="text-[10px] text-slate-500 uppercase tracking-wider mt-1">{label}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-white/10 p-4" style={{ background: '#0d1526' }}>
        <div className="text-[10px] text-cyan-400/60 uppercase tracking-widest mb-3 font-semibold">Top 10 Countries</div>
        <BarChart
          data={topCountries.map(([name, val]) => ({ label: name, value: val, max: maxCountry }))}
          colors={['#06b6d4', '#0891b2', '#0e7490', '#155e75', '#164e63', '#06b6d4', '#0891b2', '#0e7490', '#155e75', '#164e63']}
        />
      </div>

      {topAirlines.length > 0 && (
        <div className="rounded-xl border border-white/10 p-4" style={{ background: '#0d1526' }}>
          <div className="text-[10px] text-cyan-400/60 uppercase tracking-widest mb-3 font-semibold">Top 10 Airlines by Flight Count</div>
          <BarChart
            data={topAirlines.map(([code, val]) => ({ label: code, value: val, max: maxAirline }))}
            colors={['#a78bfa', '#8b5cf6', '#7c3aed', '#6d28d9', '#5b21b6', '#a78bfa', '#8b5cf6', '#7c3aed', '#6d28d9', '#5b21b6']}
          />
        </div>
      )}

      <div className="rounded-xl border border-white/10 p-4" style={{ background: '#0d1526' }}>
        <div className="text-[10px] text-cyan-400/60 uppercase tracking-widest mb-3 font-semibold">Speed Distribution</div>
        <BarChart
          data={[
            { label: 'Slow <200kts', value: slow, max: maxSpeed },
            { label: 'Med 200-400', value: medium, max: maxSpeed },
            { label: 'Fast >400kts', value: fast, max: maxSpeed },
          ]}
          colors={['#22c55e', '#f59e0b', '#ef4444']}
        />
      </div>

      <div className="rounded-xl border border-white/10 p-4" style={{ background: '#0d1526' }}>
        <div className="text-[10px] text-cyan-400/60 uppercase tracking-widest mb-3 font-semibold">Altitude Distribution</div>
        <BarChart
          data={[
            { label: 'Ground ≤0ft', value: ground, max: maxAlt },
            { label: 'Low <10k ft', value: low, max: maxAlt },
            { label: 'Mid 10-35k', value: mid, max: maxAlt },
            { label: 'Cruise >35k', value: cruise, max: maxAlt },
          ]}
          colors={['#64748b', '#22c55e', '#f59e0b', '#a78bfa']}
        />
      </div>

      {topRoutes.length > 0 && (
        <div className="rounded-xl border border-white/10 p-4" style={{ background: '#0d1526' }}>
          <div className="text-[10px] text-cyan-400/60 uppercase tracking-widest mb-3 font-semibold">Top 10 Busiest Routes</div>
          <div className="space-y-2">
            {topRoutes.map(([route, count], i) => (
              <div key={route} className="flex items-center justify-between gap-2">
                <span className="text-[10px] text-slate-400 font-mono">{i + 1}. {route}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono text-cyan-400 border border-cyan-500/30" style={{ background: '#0a1628' }}>{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
