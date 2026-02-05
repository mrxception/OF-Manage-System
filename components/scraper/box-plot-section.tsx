"use client"

import React from "react"
import BoxPlot from "./box-plot"

type AxisDomain = [number, number] | ["auto", number] | [number, "auto"] | ["auto", "auto"]

interface Props {
  rows: any[]
  rows2?: any[]
  username?: string
  username2?: string
  s: { [k: string]: string }
  averageMetricKey: "avg" | "median"
}

const Tooltip: React.FC<{ text: React.ReactNode; children: React.ReactNode }> = ({ text, children }) => {
  const [open, setOpen] = React.useState(false)
  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {children}
      <div
        className="absolute z-20 top-full left-1/2 -translate-x-1/2 mt-2 w-80 bg-card border border-border text-sm p-3 rounded-md shadow-md transition-opacity duration-200 pointer-events-none"
        style={{ opacity: open ? 1 : 0 }}
      >
        {text}
      </div>
    </div>
  )
}

export default function BoxPlotSection({
  rows,
  rows2,
  username,
  username2,
  averageMetricKey,
}: Props) {
  const [isOpen, setIsOpen] = React.useState(true)
  const [domain, setDomain] = React.useState<AxisDomain>([0, "auto"])
  const [localMax, setLocalMax] = React.useState("")

  const metricField = averageMetricKey === "median" ? "Median_Upvotes" : "Avg_Upvotes_Per_Post"
  const teal = "rgb(20,184,166)"
  const primary = "var(--sidebar-primary)"
  const hasSecond = Array.isArray(rows2) && rows2.length > 0

  // Top 25 per user (same logic as bar chart), then combine and mix by the chosen metric
  const top25u1 = React.useMemo(() => {
    return [...(rows || [])]
      .filter((r) => Number.isFinite(Number(r?.[metricField])))
      .sort((a, b) => Number(b?.[metricField] ?? 0) - Number(a?.[metricField] ?? 0))
      .slice(0, 25)
  }, [rows, metricField])

  const top25u2 = React.useMemo(() => {
    const arr = Array.isArray(rows2) ? rows2 : []
    return [...arr]
      .filter((r) => Number.isFinite(Number(r?.[metricField])))
      .sort((a, b) => Number(b?.[metricField] ?? 0) - Number(a?.[metricField] ?? 0))
      .slice(0, 25)
  }, [rows2, metricField])

  type BoxRow = {
    subreddit: string
    min: number
    q1: number
    median: number
    q3: number
    max: number
    value: number       // the metric used for mixing sort
    __user: "u1" | "u2"
    __color: string
    __username: string
  }

  const combined: BoxRow[] = React.useMemo(() => {
    const mapIt = (arr: any[], who: "u1" | "u2", color: string, uname: string) =>
      arr.map((r) => ({
        subreddit: String(r?.Subreddit ?? ""),
        min: Number(r?.Min_Upvotes ?? 0),
        q1: Number(r?.Q1_Upvotes ?? 0),
        median: Number(r?.Median_Upvotes ?? 0),
        q3: Number(r?.Q3_Upvotes ?? 0),
        max: Number(r?.Max_Upvotes ?? 0),
        value: Number(r?.[metricField] ?? 0),
        __user: who,
        __color: color,
        __username: uname || (who === "u1" ? "user1" : "user2"),
      }))

    const a = mapIt(top25u1, "u1", primary, username || "")
    const b = hasSecond ? mapIt(top25u2, "u2", teal, username2 || "") : []
    // Mix both lists by the chosen metric, descending
    return [...a, ...b].sort((x, y) => y.value - x.value)
  }, [top25u1, top25u2, metricField, primary, teal, username, username2, hasSecond])

  const rowHeight = 22; // px per bar
  const extra = 140;    // axis/legend/margins headroom
  const minH = 450;
  const maxH = 1400;
  const chartHeight = Math.min(maxH, Math.max(minH, combined.length * rowHeight + extra));

  const autoMax = React.useMemo(() => {
    const vals = combined.map((r) => r.max)
    return Math.ceil((Math.max(0, ...vals) || 10) * 1.05)
  }, [combined])

  const commit = () => {
    if (localMax === "") setDomain(([lo]) => [lo, "auto"])
    else {
      const n = Number(localMax)
      if (Number.isFinite(n) && n >= 0) setDomain(([lo]) => [lo, n])
    }
  }

  if (!combined.length) return null

  return (
    <div className="rounded-lg border border-border bg-card">
      <header
        className="p-6 cursor-pointer flex justify-between items-start"
        onClick={() => setIsOpen((v) => !v)}
        aria-expanded={isOpen}
        aria-controls="boxplot-content"
      >
        <div className="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            style={{ color: "var(--sidebar-primary)" }}>
            <path d="M6 6v12 M18 8v8 M8 9h8v6H8Z M8 12h8" />
          </svg>

          <h3 className="text-xl font-bold">
            Upvote Predictability Box Plot ({averageMetricKey === "avg" ? "Average" : "Median"})
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

              <div className="flex justify-end items-center gap-2 mb-4">
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

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-3 h-3 rounded-sm" style={{ background: primary }} />
                  <span className="text-sm text-muted-foreground">{`u/${username || "user1"}`}</span>
                </div>
                {hasSecond && (
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-3 h-3 rounded-sm" style={{ background: teal }} />
                    <span className="text-sm text-muted-foreground">{`u/${username2 || "user2"}`}</span>
                  </div>
                )}
              </div>
            </div>
            <div style={{ height: `${chartHeight / 1.8}px` }}>
              <BoxPlot rows={combined} domain={domain} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
