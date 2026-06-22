import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useOpenSky } from './hooks/useOpenSky'
import { useAviationStack } from './hooks/useAviationStack'
import { useFlightRoutes } from './hooks/useFlightRoutes'
import { useAircraftPhoto } from './hooks/useAircraftPhoto'
import { FlightMap } from './components/Map/FlightMap'
import { FlightTable } from './components/FlightTable/FlightTable'
import { IrregularOps, FALLBACK_IROPS } from './components/IrregularOps/IrregularOps'
import { StatsBar } from './components/StatsBar/StatsBar'
import { RefreshTimer } from './components/RefreshTimer/RefreshTimer'
import { StatsDashboard } from './components/Stats/StatsDashboard'
import { FlightLog, LogEvent } from './components/FlightLog/FlightLog'
import { AircraftState } from './types/flight'
import { getAirportName, getAirportCoords, AIRPORTS_BY_IATA } from './data/airports'

interface Alert {
  id: number
  callsign: string
  status: string
  color: string
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
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
  const [activeTab, setActiveTab] = useState<'map' | 'table' | 'irops' | 'stats'>('map')
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [log, setLog] = useState<LogEvent[]>([])
  const [showLog, setShowLog] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [conflicts, setConflicts] = useState<Set<string>>(new Set())
  const prevIropsRef = useRef<Set<string>>(new Set())
  const alertIdRef = useRef(0)
  const logIdRef = useRef(0)
  const hasRestoredRef = useRef(false)
  const searchRef = useRef<HTMLDivElement>(null)
  const qc = useQueryClient()

  // URL hash restoration
  useEffect(() => {
    if (hasRestoredRef.current) return
    hasRestoredRef.current = true
    const hash = window.location.hash.slice(1)
    if (hash && aircraft.length > 0) {
      const found = aircraft.find(ac => ac.icao24 === hash)
      if (found) {
        setSelectedAircraft(found)
        setActiveTab('map')
      }
    }
  }, [aircraft])

  // Fullscreen listener
  useEffect(() => {
    const handler = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

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

  // Aircraft data update: log events + conflict detection
  useEffect(() => {
    if (aircraft.length === 0) return

    const now = new Date()
    const timeStr = now.toLocaleTimeString('en-US', { hour12: false })
    const newEvents: LogEvent[] = []

    // Sample a few aircraft for log events
    const sample = aircraft.slice(0, 3)
    for (const ac of sample) {
      if (ac.callsign && !ac.onGround) {
        const kts = ac.velocity ? Math.round(ac.velocity * 1.944) : 0
        const ft = ac.baroAltitude ? Math.round(ac.baroAltitude * 3.28084) : 0
        newEvents.push({
          id: logIdRef.current++,
          time: timeStr,
          type: 'info',
          message: `${ac.callsign.trim()} — ${ft.toLocaleString()}ft @ ${kts}kts`,
        })
      }
    }

    if (newEvents.length > 0) {
      setLog(prev => [...prev, ...newEvents].slice(-50))
    }

    // Conflict detection
    const inFlight = aircraft.filter(ac => !ac.onGround && ac.latitude !== null && ac.longitude !== null)
    const newConflicts = new Set<string>()
    for (let i = 0; i < inFlight.length; i++) {
      for (let j = i + 1; j < inFlight.length; j++) {
        const a = inFlight[i], b = inFlight[j]
        const dist = haversineKm(a.latitude!, a.longitude!, b.latitude!, b.longitude!)
        if (dist < 92.6) {
          newConflicts.add(a.icao24)
          newConflicts.add(b.icao24)
        }
      }
    }
    setConflicts(newConflicts)

    if (newConflicts.size > 0) {
      const conflictTime = new Date().toLocaleTimeString('en-US', { hour12: false })
      setLog(prev => [...prev, {
        id: logIdRef.current++,
        time: conflictTime,
        type: 'alert',
        message: `⚠ ${newConflicts.size} aircraft in potential conflict proximity`,
      }].slice(-50))
    }
  }, [aircraft])

  // Close search on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleRefresh = () => {
    qc.invalidateQueries({ queryKey: ['opensky'] })
  }

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
    } else {
      document.exitFullscreen().catch(() => {})
    }
  }

  // Search filtering
  const searchResults = searchQuery.trim().length > 0
    ? aircraft.filter(ac => {
        const q = searchQuery.trim().toLowerCase()
        return (ac.callsign?.toLowerCase().includes(q)) || ac.icao24.toLowerCase().includes(q)
      }).slice(0, 5)
    : []

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
      <header className="flex items-center justify-between px-4 py-2 border-b border-cyan-accent/20 gap-2" style={{ background: '#080d1a' }}>
        <div className="flex items-center gap-2 flex-shrink-0">
          <svg className="w-6 h-6 text-cyan-accent" viewBox="0 0 24 24" fill="currentColor">
            <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
          </svg>
          <div>
            <h1 className="text-base font-bold text-white tracking-wider glow-text leading-none">ATC MONITOR</h1>
            <p className="text-[9px] text-cyan-accent/60 tracking-widest uppercase">Live Air Traffic Control</p>
          </div>
        </div>

        <nav className="flex items-center gap-1 flex-shrink-0">
          {(['map', 'table', 'irops', 'stats'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition-all ${
                activeTab === tab
                  ? 'bg-cyan-accent text-navy font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              {tab === 'map' ? 'Live Map' : tab === 'table' ? 'Flights' : tab === 'irops' ? 'IROPs' : 'Stats'}
            </button>
          ))}
        </nav>

        {/* Search bar */}
        <div ref={searchRef} className="relative flex-1 max-w-xs">
          <input
            type="text"
            placeholder="Search callsign / ICAO…"
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setSearchOpen(true) }}
            onFocus={() => setSearchOpen(true)}
            className="w-full bg-white/5 border border-white/10 rounded px-3 py-1 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-accent/40"
          />
          {searchOpen && searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 z-[3000] rounded-lg border border-white/10 overflow-hidden" style={{ background: '#0d1526' }}>
              {searchResults.map(ac => (
                <button
                  key={ac.icao24}
                  onClick={() => {
                    setSelectedAircraft(ac)
                    setActiveTab('map')
                    setSearchQuery('')
                    setSearchOpen(false)
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
                >
                  <span className="text-xs font-bold font-mono text-cyan-400">{ac.callsign?.trim() || ac.icao24.toUpperCase()}</span>
                  <span className="text-[10px] text-slate-500">{ac.icao24.toUpperCase()} · {ac.originCountry}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Log toggle */}
          <button
            onClick={() => setShowLog(s => !s)}
            title="Toggle flight log"
            className={`px-2 py-1 rounded border text-xs transition-all ${showLog ? 'border-cyan-accent/40 text-cyan-accent' : 'border-white/10 text-slate-500 hover:text-slate-300'}`}
          >
            📋 Log
          </button>

          {/* Fullscreen button */}
          <button
            onClick={handleFullscreen}
            title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            className="px-2 py-1 rounded border border-white/10 text-slate-500 hover:text-slate-300 text-xs transition-all"
          >
            {isFullscreen ? '✕ Exit Full' : '⛶'}
          </button>

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
      <main className="flex-1 overflow-hidden relative">
        {activeTab === 'map' && (
          <div className="flex h-full">
            <div className="flex-1 min-w-0">
              <FlightMap
                aircraft={aircraft}
                selectedAircraft={selectedAircraft}
                onSelectAircraft={setSelectedAircraft}
                iropsFlights={iropsFlights}
                routeMap={routeMap}
                conflicts={conflicts}
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

        {activeTab === 'stats' && <StatsDashboard aircraft={aircraft} />}

        {/* Flight Log panel */}
        {showLog && (
          <div className="absolute top-0 right-0 w-64 h-full z-50 overflow-hidden" style={{ background: '#080d1a', borderLeft: '1px solid rgba(6,182,212,0.2)' }}>
            <FlightLog events={log} />
          </div>
        )}
      </main>
    </div>
  )
}

function AircraftDetail({ aircraft, onClose }: { aircraft: AircraftState; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  const { data: photoUrl } = useAircraftPhoto(aircraft.icao24)

  const fmtAlt = (m: number | null) => m !== null ? `${Math.round(m * 3.28084).toLocaleString()} ft` : 'N/A'
  const fmtSpd = (ms: number | null) => ms !== null ? `${Math.round(ms * 1.944)} kts` : 'N/A'
  const fmtVr  = (ms: number | null) => ms !== null ? `${ms > 0 ? '+' : ''}${ms.toFixed(1)} m/s` : 'N/A'

  const ft = aircraft.baroAltitude !== null ? aircraft.baroAltitude * 3.28084 : 0
  const kts = aircraft.velocity !== null ? Math.round(aircraft.velocity * 1.944) : 0
  const heading = aircraft.trueTrack ?? 0

  const band = (() => {
    if (aircraft.baroAltitude === null) return { label: 'Unknown', color: '#64748b' }
    if (ft < 5000)  return { label: 'Low Altitude', color: '#22c55e' }
    if (ft < 20000) return { label: 'Mid Altitude', color: '#f59e0b' }
    if (ft < 35000) return { label: 'Cruise', color: '#00d4ff' }
    return { label: 'High Cruise', color: '#a78bfa' }
  })()

  const speedPct = Math.min((kts / 600) * 100, 100)
  const altPct = Math.min((ft / 45000) * 100, 100)
  const vr = aircraft.verticalRate ?? 0
  const vrPct = Math.min(Math.abs(vr) / 20, 1) * 50

  // ETA calculation
  let etaText: string | null = null
  if (aircraft.arrival && aircraft.velocity && aircraft.velocity > 0 && aircraft.latitude !== null && aircraft.longitude !== null) {
    const arrCoords = getAirportCoords(aircraft.arrival)
    if (arrCoords) {
      const distKm = haversineKm(aircraft.latitude, aircraft.longitude, arrCoords[0], arrCoords[1])
      const hours = distKm / (aircraft.velocity * 3.6)
      const mins = Math.round(hours * 60)
      etaText = mins > 0 ? `~${mins} min` : 'Arriving'
    }
  }

  // Nearby airports
  const nearbyAirports = (() => {
    if (aircraft.latitude === null || aircraft.longitude === null) return []
    const entries = Object.values(AIRPORTS_BY_IATA)
    return entries
      .map(ap => ({
        code: ap.iata,
        name: ap.name,
        distNm: haversineKm(aircraft.latitude!, aircraft.longitude!, ap.lat, ap.lon) * 0.539957,
      }))
      .sort((a, b) => a.distNm - b.distNm)
      .slice(0, 3)
  })()

  const handleShare = () => {
    const url = window.location.origin + '/#' + aircraft.icao24
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {})
  }

  return (
    <div className="h-full overflow-auto border-l border-cyan-accent/20 flex flex-col" style={{ background: '#080d1a' }}>

      {/* Header banner */}
      <div className="px-4 pt-4 pb-3 border-b border-white/5" style={{ background: '#0d1526' }}>
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="text-xl font-bold font-mono text-cyan-accent" style={{ textShadow: '0 0 12px #00d4ff88' }}>
              {aircraft.callsign || aircraft.icao24.toUpperCase()}
            </div>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5">{aircraft.icao24.toUpperCase()} · {aircraft.originCountry}</div>
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <button
              onClick={handleShare}
              title="Copy share link"
              className="text-slate-500 hover:text-cyan-400 transition-colors text-xs px-1.5 py-0.5 rounded border border-white/10 hover:border-cyan-accent/30"
            >
              {copied ? 'Copied!' : '🔗'}
            </button>
            <button onClick={onClose} className="text-slate-600 hover:text-slate-300 transition-colors">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-semibold border ${
            aircraft.onGround ? 'bg-slate-700/50 text-slate-300 border-slate-600' : 'bg-green-500/10 text-green-400 border-green-500/30'
          }`}>
            <div className={`w-1.5 h-1.5 rounded-full ${aircraft.onGround ? 'bg-slate-400' : 'bg-green-400 animate-pulse'}`} />
            {aircraft.onGround ? 'On Ground' : 'In Flight'}
          </span>
          <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-semibold border"
            style={{ background: `${band.color}15`, color: band.color, borderColor: `${band.color}40` }}>
            {band.label}
          </span>
          {etaText && (
            <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-semibold border bg-purple-500/10 text-purple-300 border-purple-500/30">
              ETA {etaText}
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">

        {/* Aircraft photo or SVG plane */}
        <div className="rounded-xl overflow-hidden border border-white/10" style={{ background: '#0d1526' }}>
          {photoUrl ? (
            <img src={photoUrl} alt={aircraft.callsign || aircraft.icao24} className="rounded-lg w-full object-cover" style={{ maxHeight: 128 }} />
          ) : (
            <div className="flex items-center justify-center py-4" style={{ minHeight: 80 }}>
              <svg viewBox="0 0 64 64" width="64" height="64" className="text-cyan-accent/30">
                <path d="M32 4L20 28H8L14 34H24L18 56H26L32 44L38 56H46L40 34H50L56 28H44L32 4Z" fill="currentColor"/>
              </svg>
            </div>
          )}
        </div>

        {/* Route card */}
        {(aircraft.departure || aircraft.arrival) && (
          <div className="rounded-xl border border-cyan-accent/20 overflow-hidden" style={{ background: '#0d1a2e' }}>
            <div className="flex items-stretch">
              <div className="flex-1 p-3 text-center border-r border-white/5">
                <div className="text-[9px] text-slate-600 uppercase tracking-widest mb-1">From</div>
                <div className="text-2xl font-black font-mono text-white">{aircraft.departure || '???'}</div>
                <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">{getAirportNameSafe(aircraft.departure) || '—'}</div>
              </div>
              <div className="flex flex-col items-center justify-center px-3 gap-1">
                <svg className="w-5 h-5 text-cyan-accent/60" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
                </svg>
                <div className="text-[8px] text-slate-600 font-mono uppercase tracking-widest">enroute</div>
              </div>
              <div className="flex-1 p-3 text-center border-l border-white/5">
                <div className="text-[9px] text-slate-600 uppercase tracking-widest mb-1">To</div>
                <div className="text-2xl font-black font-mono text-white">{aircraft.arrival || '???'}</div>
                <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">{getAirportNameSafe(aircraft.arrival) || '—'}</div>
              </div>
            </div>
          </div>
        )}

        {/* Compass + instruments row */}
        <div className="grid grid-cols-2 gap-3">
          {/* Compass */}
          <div className="rounded-xl border border-white/10 p-3 flex flex-col items-center" style={{ background: '#0d1526' }}>
            <div className="text-[9px] text-slate-600 uppercase tracking-widest mb-2">Heading</div>
            <svg viewBox="0 0 80 80" className="w-16 h-16">
              <circle cx="40" cy="40" r="36" fill="#0a0f1e" stroke="#1e3a4a" strokeWidth="2"/>
              <circle cx="40" cy="40" r="33" fill="none" stroke="#0d2035" strokeWidth="1"/>
              {[0,90,180,270].map(deg => {
                const r = (deg * Math.PI) / 180
                return <line key={deg} x1={40 + 28 * Math.sin(r)} y1={40 - 28 * Math.cos(r)} x2={40 + 33 * Math.sin(r)} y2={40 - 33 * Math.cos(r)} stroke="#00d4ff" strokeWidth="1.5"/>
              })}
              {Array.from({length: 36}, (_, i) => i * 10).filter(d => d % 90 !== 0).map(deg => {
                const r = (deg * Math.PI) / 180
                return <line key={deg} x1={40 + 30 * Math.sin(r)} y1={40 - 30 * Math.cos(r)} x2={40 + 33 * Math.sin(r)} y2={40 - 33 * Math.cos(r)} stroke="#1e3a4a" strokeWidth="1"/>
              })}
              <text x="40" y="12" textAnchor="middle" fill="#00d4ff" fontSize="7" fontFamily="monospace" fontWeight="bold">N</text>
              <g transform={`rotate(${heading}, 40, 40)`}>
                <polygon points="40,10 37,40 40,46 43,40" fill="#00d4ff" opacity="0.9"/>
                <polygon points="40,70 37,40 40,46 43,40" fill="#ff4444" opacity="0.7"/>
              </g>
              <circle cx="40" cy="40" r="3" fill="#00d4ff"/>
            </svg>
            <div className="text-sm font-bold font-mono text-white mt-1">{Math.round(heading)}°</div>
          </div>

          {/* Vert rate gauge */}
          <div className="rounded-xl border border-white/10 p-3 flex flex-col items-center" style={{ background: '#0d1526' }}>
            <div className="text-[9px] text-slate-600 uppercase tracking-widest mb-2">Vert Rate</div>
            <div className="relative flex items-center justify-center w-16 h-16">
              <svg viewBox="0 0 80 80" className="w-16 h-16">
                <circle cx="40" cy="40" r="36" fill="#0a0f1e" stroke="#1e3a4a" strokeWidth="2"/>
                <line x1="40" y1="12" x2="40" y2="68" stroke="#1e3a4a" strokeWidth="1"/>
                <line x1="12" y1="40" x2="68" y2="40" stroke="#1e3a4a" strokeWidth="0.5"/>
                {vr !== 0 && (
                  <rect
                    x="36" y={vr > 0 ? 40 - vrPct * 0.56 * 40 : 40}
                    width="8" height={Math.abs(vrPct) * 0.56}
                    fill={vr > 0 ? '#22c55e' : '#ef4444'} opacity="0.8" rx="2"
                  />
                )}
                {vr > 0
                  ? <polygon points="40,14 36,22 44,22" fill="#22c55e"/>
                  : vr < 0
                  ? <polygon points="40,66 36,58 44,58" fill="#ef4444"/>
                  : <circle cx="40" cy="40" r="4" fill="#64748b"/>
                }
              </svg>
            </div>
            <div className={`text-sm font-bold font-mono mt-1 ${vr > 0 ? 'text-green-400' : vr < 0 ? 'text-red-400' : 'text-slate-400'}`}>
              {fmtVr(aircraft.verticalRate)}
            </div>
          </div>
        </div>

        {/* Speed bar */}
        <div className="rounded-xl border border-white/10 p-3" style={{ background: '#0d1526' }}>
          <div className="flex justify-between items-center mb-2">
            <span className="text-[9px] text-slate-600 uppercase tracking-widest">Airspeed</span>
            <span className="text-sm font-bold font-mono text-white">{fmtSpd(aircraft.velocity)}</span>
          </div>
          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${speedPct}%`, background: 'linear-gradient(90deg, #00d4ff, #0099cc)' }} />
          </div>
          <div className="flex justify-between text-[9px] text-slate-700 mt-1 font-mono">
            <span>0</span><span>300 kts</span><span>600 kts</span>
          </div>
        </div>

        {/* Altitude bar */}
        <div className="rounded-xl border border-white/10 p-3" style={{ background: '#0d1526' }}>
          <div className="flex justify-between items-center mb-2">
            <span className="text-[9px] text-slate-600 uppercase tracking-widest">Altitude</span>
            <span className="text-sm font-bold font-mono text-white">{fmtAlt(aircraft.baroAltitude)}</span>
          </div>
          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${altPct}%`, background: `linear-gradient(90deg, #22c55e, ${band.color})` }} />
          </div>
          <div className="flex justify-between text-[9px] text-slate-700 mt-1 font-mono">
            <span>GND</span><span>FL150</span><span>FL450</span>
          </div>
        </div>

        {/* Nearby airports */}
        {nearbyAirports.length > 0 && (
          <div className="rounded-xl border border-white/10 overflow-hidden" style={{ background: '#0d1526' }}>
            <div className="px-3 py-2 border-b border-white/5">
              <span className="text-[10px] text-cyan-400/60 uppercase tracking-widest font-semibold">Nearby Airports</span>
            </div>
            {nearbyAirports.map(ap => (
              <div key={ap.code} className="flex justify-between items-center px-3 py-2 border-b border-white/5 last:border-0">
                <div>
                  <span className="text-xs font-bold font-mono text-white">{ap.code}</span>
                  <span className="text-[10px] text-slate-500 ml-2">{ap.name}</span>
                </div>
                <span className="text-xs text-slate-300 font-mono">{Math.round(ap.distNm)} nm</span>
              </div>
            ))}
          </div>
        )}

        {/* Data rows */}
        <div className="rounded-xl border border-white/10 overflow-hidden" style={{ background: '#0d1526' }}>
          {[
            { label: 'ICAO24',    value: aircraft.icao24.toUpperCase() },
            { label: 'Squawk',    value: aircraft.squawk || '—' },
            { label: 'Latitude',  value: aircraft.latitude  !== null ? aircraft.latitude.toFixed(4)  + '°' : 'N/A' },
            { label: 'Longitude', value: aircraft.longitude !== null ? aircraft.longitude.toFixed(4) + '°' : 'N/A' },
            { label: 'Geo Alt',   value: fmtAlt(aircraft.geoAltitude) },
          ].map(({ label, value }, i, arr) => (
            <div key={label} className={`flex justify-between items-center px-3 py-2 ${i < arr.length - 1 ? 'border-b border-white/5' : ''}`}>
              <span className="text-[10px] text-slate-600 uppercase tracking-wider">{label}</span>
              <span className="text-xs text-slate-200 font-mono">{value}</span>
            </div>
          ))}
        </div>

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
