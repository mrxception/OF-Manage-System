// box-plot-section.tsx
"use client"

import React from "react"
import BoxPlot from "./box-plot"

type AxisDomain = [number, number] | ["auto", number] | [number, "auto"] | ["auto", "auto"]
type UserDataset = { username: string; rows: any[] }

interface Props {
  users: UserDataset[]
  s: { [k: string]: string }
  averageMetricKey: "avg" | "median"
  title?: string
  topN?: number
}

type BoxRow = {
  subreddit: string
  min: number
  q1: number
  median: number
  q3: number
  max: number
  value: number
  __user: string
  __color: string
  __username: string
}

export default function BoxPlotSection({ users, s, averageMetricKey, title = "Upvote Predictability Box Plot", topN = 25 }: Props) {
  const [isOpen, setIsOpen] = React.useState(true)
  const [domain, setDomain] = React.useState<AxisDomain>([0, "auto"])
  const [localMax, setLocalMax] = React.useState("")

  const metricField = averageMetricKey === "median" ? "Median_Upvotes" : "Avg_Upvotes_Per_Post"

  const cleanUsers = React.useMemo(
    () =>
      (users || [])
        .map((u) => ({ username: (u.username || "").trim(), rows: Array.isArray(u.rows) ? u.rows : [] }))
        .filter((u) => u.username && u.rows.length > 0),
    [users]
  )

  const palette = React.useMemo(
    () => [
      "var(--sidebar-primary)",
      "rgb(20,184,166)",
      "rgb(59,130,246)",
      "rgb(168,85,247)",
      "rgb(234,179,8)",
      "rgb(239,68,68)",
      "rgb(34,197,94)",
    ],
    []
  )

  const perUserTop = React.useMemo(() => {
    return cleanUsers.map((u, idx) => {
      const arr = u.rows
        .filter((r) => Number.isFinite(Number(r?.[metricField])))
        .sort((a, b) => Number(b?.[metricField] ?? 0) - Number(a?.[metricField] ?? 0))
        .slice(0, topN)

      const color = palette[idx % palette.length]
      return {
        username: u.username,
        color,
        items: arr.map((r) => ({
          subreddit: String(r?.Subreddit ?? ""),
          min: Number(r?.Min_Upvotes ?? 0),
          q1: Number(r?.Q1_Upvotes ?? 0),
          median: Number(r?.Median_Upvotes ?? 0),
          q3: Number(r?.Q3_Upvotes ?? 0),
          max: Number(r?.Max_Upvotes ?? 0),
          value: Number(r?.[metricField] ?? 0),
          __user: `u${idx + 1}`,
          __color: color,
          __username: u.username,
        })),
      }
    })
  }, [cleanUsers, metricField, topN, palette])

  const combined: BoxRow[] = React.useMemo(() => {
    const merged = perUserTop.flatMap((u) => u.items)
    return merged.sort((a, b) => {
      const dv = (b.value ?? 0) - (a.value ?? 0)
      if (dv !== 0) return dv
      if (a.__user !== b.__user) return String(a.__user).localeCompare(String(b.__user))
      return String(a.subreddit).localeCompare(String(b.subreddit))
    })
  }, [perUserTop])

  const autoMax = React.useMemo(() => {
    const vals = combined.map((r) => Number(r.max ?? 0))
    return Math.ceil((Math.max(0, ...vals) || 10) * 1.05)
  }, [combined])

  const commit = () => {
    if (localMax === "") setDomain(([lo]) => [lo, "auto"])
    else {
      const n = Number(localMax)
      if (Number.isFinite(n) && n >= 0) setDomain(([lo]) => [lo, n])
    }
  }

  const rowHeight = 22
  const extra = 160
  const minH = 450
  const maxH = 1400
  const chartHeight = Math.min(maxH, Math.max(minH, combined.length * rowHeight + extra))

  if (!combined.length) return null

  const legend = perUserTop.map((u) => ({ label: `u/${u.username}`, color: u.color }))

  return (
    <div className="rounded-lg border border-border bg-card">
      <header className="p-6 cursor-pointer flex justify-between items-start" onClick={() => setIsOpen((v) => !v)} aria-expanded={isOpen} aria-controls="boxplot-content">
        <div className="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ color: "var(--sidebar-primary)" }}>
            <path d="M6 6v12 M18 8v8 M8 9h8v6H8Z M8 12h8" />
          </svg>
          <h3 className="text-xl font-bold">
            {title} ({averageMetricKey === "avg" ? "Average" : "Median"})
          </h3>
        </div>

        <svg className={`w-6 h-6 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </header>

      {isOpen && (
        <div id="boxplot-content" className="px-6 pb-6">
          <div className="border-t border-border pt-4">
            <div className="flex items-center gap-4 flex-wrap justify-between mb-4">
              <div className="flex justify-end items-center gap-2">
                <span className="text-sm text-muted-foreground">Maximum Upvotes Displayed:</span>
                <input
                  type="number"
                  placeholder={`Auto (${autoMax.toLocaleString()})`}
                  value={localMax}
                  onChange={(e) => setLocalMax(e.target.value)}
                  onBlur={commit}
                  onKeyDown={(e) => e.key === "Enter" && (e.currentTarget as HTMLInputElement).blur()}
                  className="w-32 bg-muted border border-border rounded text-sm py-1 pr-1 pl-2 text-foreground"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {legend.map((it) => (
                  <div key={it.label} className="flex items-center gap-2">
                    <span className="inline-block w-3 h-3 rounded-sm" style={{ background: it.color }} aria-hidden="true" />
                    <span className="text-sm text-muted-foreground">{it.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ height: `${Math.round(chartHeight / 1.8)}px` }}>
              <BoxPlot rows={combined} domain={domain} legend={legend} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
