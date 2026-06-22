import React, { useState, useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useOpenSky } from './hooks/useOpenSky'
import { useAviationStack } from './hooks/useAviationStack'
import { useFlightRoutes } from './hooks/useFlightRoutes'
import { FlightMap } from './components/Map/FlightMap'
import { FlightTable } from './components/FlightTable/FlightTable'
import { IrregularOps, FALLBACK_IROPS } from './components/IrregularOps/IrregularOps'
import { StatsBar } from './components/StatsBar/StatsBar'
import { RefreshTimer } from './components/RefreshTimer/RefreshTimer'
import { AircraftState } from './types/flight'
import { getAirportName } from './data/airports'

interface Alert {
  id: number
  callsign: string
  status: string
  color: string
}

function playAlertSound(type: 'cancelled' | 'diverted' | 'delayed') {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = type === 'cancelled' ? 220 : type === 'diverted' ? 330 : 440
    gain.gain.setValueAtTime(0.15, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.6)
  } catch { /* audio not available */ }
}

export default function App() {
  const { data: aircraft = [], isLoading, dataUpdatedAt } = useOpenSky()
  const { data: iropsRaw = [] } = useAviationStack()
  const iropsFlights = iropsRaw.length > 0 ? iropsRaw : FALLBACK_IROPS
  const { data: routeMap = {} } = useFlightRoutes()
  const [selectedAircraft, setSelectedAircraft] = useState<AircraftState | null>(null)
  const [activeTab, setActiveTab] = useState<'map' | 'table' | 'irops'>('map')
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [soundEnabled, setSoundEnabled] = useState(true)
  const prevIropsRef = useRef<Set<string>>(new Set())
  const alertIdRef = useRef(0)
  const qc = useQueryClient()

  // Detect new IROPs and fire alerts
  useEffect(() => {
    const prevKeys = prevIropsRef.current
    const newAlerts: Alert[] = []

    for (const f of iropsFlights) {
      const key = `${f.callsign}-${f.status}`
      if (!prevKeys.has(key)) {
        const color = f.status === 'cancelled' ? '#ff4444' : f.status === 'diverted' ? '#ff9900' : '#ffdd00'
        newAlerts.push({ id: alertIdRef.current++, callsign: f.callsign, status: f.status, color })
        if (soundEnabled) playAlertSound(f.status as any)
      }
    }

    prevIropsRef.current = new Set(iropsFlights.map(f => `${f.callsign}-${f.status}`))

    if (newAlerts.length > 0) {
      setAlerts(prev => [...prev, ...newAlerts].slice(-5))
      setTimeout(() => {
        setAlerts(prev => prev.filter(a => !newAlerts.find(n => n.id === a.id)))
      }, 5000)
    }
  }, [iropsFlights])

  const handleRefresh = () => {
    qc.invalidateQueries({ queryKey: ['opensky'] })
  }

  return (
    <div className="flex flex-col h-screen bg-navy overflow-hidden" style={{ background: '#0a0f1e' }}>
      {/* Alert banner */}
      {alerts.length > 0 && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-[2000] flex flex-col gap-1 pointer-events-none">
          {alerts.map(alert => (
            <div
              key={alert.id}
              className="flex items-center gap-3 px-4 py-2 rounded-lg border backdrop-blur-md shadow-xl animate-pulse"
              style={{ background: `${alert.color}18`, borderColor: `${alert.color}60`, color: alert.color }}
            >
              <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L1 21h22L12 2zm0 3.5L20.5 19h-17L12 5.5zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z"/>
              </svg>
              <span className="text-xs font-bold font-mono uppercase tracking-wider">
                {alert.callsign} — {alert.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-cyan-accent/20" style={{ background: '#080d1a' }}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <svg className="w-7 h-7 text-cyan-accent" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
            </svg>
            <div>
              <h1 className="text-lg font-bold text-white tracking-wider glow-text leading-none">ATC MONITOR</h1>
              <p className="text-[10px] text-cyan-accent/60 tracking-widest uppercase">Live Air Traffic Control</p>
            </div>
          </div>
        </div>

        <nav className="flex items-center gap-1">
          {(['map', 'table', 'irops'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition-all ${
                activeTab === tab
                  ? 'bg-cyan-accent text-navy font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              {tab === 'map' ? 'Live Map' : tab === 'table' ? 'Flight List' : 'IROPs'}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {/* Sound toggle */}
          <button
            onClick={() => setSoundEnabled(s => !s)}
            title={soundEnabled ? 'Mute alerts' : 'Enable alerts'}
            className={`p-1.5 rounded border transition-all ${soundEnabled ? 'border-cyan-accent/40 text-cyan-accent' : 'border-white/10 text-slate-500'}`}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {soundEnabled
                ? <><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"/></>
                : <><path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></>
              }
            </svg>
          </button>

          <RefreshTimer
            intervalSeconds={10}
            lastRefresh={dataUpdatedAt / 1000}
            onManualRefresh={handleRefresh}
            isLoading={isLoading}
          />
        </div>
      </header>

      {/* Stats Bar */}
      <StatsBar aircraft={aircraft} lastUpdated={dataUpdatedAt ? dataUpdatedAt / 1000 : null} />

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        {activeTab === 'map' && (
          <div className="flex h-full">
            <div className="flex-1 min-w-0">
              <FlightMap
                aircraft={aircraft}
                selectedAircraft={selectedAircraft}
                onSelectAircraft={setSelectedAircraft}
                iropsFlights={iropsFlights}
                routeMap={routeMap}
              />
            </div>
            {selectedAircraft && (
              <div className="w-72 flex-shrink-0">
                <AircraftDetail aircraft={selectedAircraft} onClose={() => setSelectedAircraft(null)} />
              </div>
            )}
          </div>
        )}

        {activeTab === 'table' && (
          <FlightTable
            aircraft={aircraft}
            selectedAircraft={selectedAircraft}
            onSelectAircraft={setSelectedAircraft}
          />
        )}

        {activeTab === 'irops' && <IrregularOps />}
      </main>
    </div>
  )
}

function AircraftDetail({ aircraft, onClose }: { aircraft: AircraftState; onClose: () => void }) {
  const fmtAlt = (m: number | null) => m !== null ? `${Math.round(m * 3.28084).toLocaleString()} ft` : 'N/A'
  const fmtSpd = (ms: number | null) => ms !== null ? `${Math.round(ms * 1.944)} kts` : 'N/A'
  const fmtVr  = (ms: number | null) => ms !== null ? `${ms > 0 ? '+' : ''}${ms.toFixed(1)} m/s` : 'N/A'

  // Altitude band label
  const altBand = () => {
    if (aircraft.baroAltitude === null) return null
    const ft = aircraft.baroAltitude * 3.28084
    if (ft < 5000)  return { label: 'Low Altitude',    color: '#22c55e' }
    if (ft < 20000) return { label: 'Mid Altitude',    color: '#f59e0b' }
    if (ft < 35000) return { label: 'Cruise',          color: '#00d4ff' }
    return               { label: 'High Cruise',       color: '#a78bfa' }
  }
  const band = altBand()

  return (
    <div className="h-full overflow-auto p-4 border-l border-cyan-accent/20" style={{ background: '#0d1526' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-cyan-accent font-bold font-mono text-lg glow-text">
          {aircraft.callsign || aircraft.icao24.toUpperCase()}
        </span>
        <button onClick={onClose} className="text-slate-500 hover:text-slate-200 transition-colors p-1">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>

      {/* Status badges */}
      <div className="flex flex-wrap gap-2 mb-4">
        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs border ${
          aircraft.onGround ? 'bg-slate-700/50 text-slate-300 border-slate-600' : 'bg-green-500/10 text-green-400 border-green-500/30'
        }`}>
          <div className={`w-1.5 h-1.5 rounded-full ${aircraft.onGround ? 'bg-slate-400' : 'bg-green-400 animate-pulse'}`} />
          {aircraft.onGround ? 'On Ground' : 'In Flight'}
        </span>
        {band && (
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs border" style={{ background: `${band.color}15`, color: band.color, borderColor: `${band.color}40` }}>
            {band.label}
          </span>
        )}
      </div>

      {/* Route card */}
      {(aircraft.departure || aircraft.arrival) && (
        <div className="bg-white/5 rounded-lg border border-white/10 p-3 mb-3">
          <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-2">Route</div>
          <div className="flex items-center justify-between gap-2">
            <div className="text-center">
              <div className="text-xl font-bold font-mono text-white">{aircraft.departure || '???'}</div>
              <div className="text-[10px] text-slate-500">{getAirportNameSafe(aircraft.departure)}</div>
            </div>
            <div className="flex-1 flex flex-col items-center gap-1">
              <svg className="w-full h-4 text-cyan-accent/40" viewBox="0 0 60 10" preserveAspectRatio="none">
                <line x1="0" y1="5" x2="55" y2="5" stroke="currentColor" strokeWidth="1" strokeDasharray="3 2"/>
                <polygon points="55,2 60,5 55,8" fill="currentColor"/>
              </svg>
              <span className="text-[9px] text-slate-600 font-mono">IN FLIGHT</span>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold font-mono text-white">{aircraft.arrival || '???'}</div>
              <div className="text-[10px] text-slate-500">{getAirportNameSafe(aircraft.arrival)}</div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <DetailSection title="Identification">
          <DetailRow label="ICAO24" value={aircraft.icao24.toUpperCase()} />
          <DetailRow label="Callsign" value={aircraft.callsign || '—'} />
          <DetailRow label="Origin" value={aircraft.originCountry} />
          {aircraft.squawk && <DetailRow label="Squawk" value={aircraft.squawk} />}
        </DetailSection>

        <DetailSection title="Position">
          <DetailRow label="Latitude"  value={aircraft.latitude  !== null ? aircraft.latitude.toFixed(4)  + '°' : 'N/A'} />
          <DetailRow label="Longitude" value={aircraft.longitude !== null ? aircraft.longitude.toFixed(4) + '°' : 'N/A'} />
          <DetailRow label="Baro Alt"  value={fmtAlt(aircraft.baroAltitude)} />
          <DetailRow label="Geo Alt"   value={fmtAlt(aircraft.geoAltitude)} />
        </DetailSection>

        <DetailSection title="Movement">
          <DetailRow label="Speed"    value={fmtSpd(aircraft.velocity)} />
          <DetailRow label="Heading"  value={aircraft.trueTrack !== null ? `${Math.round(aircraft.trueTrack)}°` : 'N/A'} />
          <DetailRow label="Vert Rate" value={fmtVr(aircraft.verticalRate)} />
        </DetailSection>
      </div>
    </div>
  )
}

function getAirportNameSafe(code: string | undefined): string {
  if (!code) return ''
  const name = getAirportName(code)
  return name !== code ? name : ''
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] text-cyan-accent/60 uppercase tracking-widest mb-1.5 font-semibold">{title}</div>
      <div className="bg-white/3 rounded p-2 space-y-1.5 border border-white/5">
        {children}
      </div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-[10px] text-slate-500">{label}</span>
      <span className="text-xs text-slate-200 font-mono">{value}</span>
    </div>
  )
}
