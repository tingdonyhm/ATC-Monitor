import React, { useEffect, useState } from 'react'

interface Props {
  intervalSeconds: number
  lastRefresh: number
  onManualRefresh: () => void
  isLoading: boolean
}

export function RefreshTimer({ intervalSeconds, lastRefresh, onManualRefresh, isLoading }: Props) {
  const [countdown, setCountdown] = useState(intervalSeconds)

  useEffect(() => {
    setCountdown(intervalSeconds)
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) return intervalSeconds
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [lastRefresh, intervalSeconds])

  const progress = ((intervalSeconds - countdown) / intervalSeconds) * 100

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-navy-card rounded-lg border border-white/10">
      <div className="relative w-8 h-8">
        <svg className="w-8 h-8 -rotate-90" viewBox="0 0 32 32">
          <circle cx="16" cy="16" r="13" fill="none" stroke="#1a2235" strokeWidth="3" />
          <circle
            cx="16" cy="16" r="13"
            fill="none"
            stroke="#00d4ff"
            strokeWidth="3"
            strokeDasharray={`${2 * Math.PI * 13}`}
            strokeDashoffset={`${2 * Math.PI * 13 * (1 - progress / 100)}`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.9s linear' }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-mono text-cyan-accent">
          {countdown}
        </span>
      </div>
      <div className="flex flex-col">
        <span className="text-[10px] text-slate-500 uppercase tracking-wider">Next refresh</span>
        <span className="text-xs text-slate-300 font-mono">{countdown}s</span>
      </div>
      <button
        onClick={onManualRefresh}
        disabled={isLoading}
        className="ml-2 p-1.5 rounded hover:bg-cyan-accent/10 text-cyan-accent disabled:opacity-40 transition-colors"
        title="Refresh now"
      >
        <svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M23 4v6h-6M1 20v-6h6" />
          <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
        </svg>
      </button>
    </div>
  )
}
