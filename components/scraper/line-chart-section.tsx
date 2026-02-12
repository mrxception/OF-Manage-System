"use client"

import React from "react"
import PerformanceLineChart, { TimeSeriesRow } from "./line-chart"

type TS = {
  upvotes: Array<{ date: string; [k: string]: number | string | null }>
  comments: Array<{ date: string; [k: string]: number | string | null }>
  subreddits: string[]
}

type Metric = "avg_upvotes" | "avg_comments" | "total_upvotes"
type Granularity = "day" | "week" | "month"

type UserTS = { username: string; timeSeries: TS }

interface Props {
  users?: UserTS[]

  username?: string
  username2?: string
  rows: any[]
  rows2?: any[]
  timeSeries?: TS
  timeSeries2?: TS
}

function toUtcDate(s: string) {
  if (!s) return null as Date | null
  if (s.includes("-")) {
    const parts = s.split("-").map((x) => x.trim())
    if (parts.length === 3) {
      const y = Number(parts[0])
      const m = Number(parts[1])
      const d = Number(parts[2])
      if (Number.isFinite(y) && Number.isFinite(m) && Number.isFinite(d)) return new Date(Date.UTC(y, m - 1, d))
    }
  }
  if (s.includes("/")) {
    const parts = s.split("/").map((x) => x.trim())
    if (parts.length === 3) {
      const a = Number(parts[0])
      const b = Number(parts[1])
      const c = Number(parts[2])
      if (Number.isFinite(a) && Number.isFinite(b) && Number.isFinite(c)) {
        if (c > 1900) return new Date(Date.UTC(c, b - 1, a))
        return new Date(Date.UTC(a, b - 1, c))
      }
    }
  }
  const t = Date.parse(s)
  if (!Number.isNaN(t)) return new Date(t)
  return null as Date | null
}

function keyDay(d: Date) {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, "0")
  const day = String(d.getUTCDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function startOfWeekUTC(d: Date) {
  const dow = d.getUTCDay() === 0 ? 7 : d.getUTCDay()
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  start.setUTCDate(start.getUTCDate() - (dow - 1))
  return start
}

function keyWeek(d: Date) {
  const s = startOfWeekUTC(d)
  return keyDay(s)
}

function keyMonth(d: Date) {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, "0")
  return `${y}-${m}-01`
}

function summarize(
  base: Array<{ date: string; [k: string]: number | string | null }>,
  keys: string[],
  how: Metric
): Array<{ date: string; v: number | null }> {
  const out: Array<{ date: string; v: number | null }> = []
  let lastAvg: number | null = null

  for (const r of base) {
    const nums: number[] = []
    for (const k of keys) {
      const v = r[k]
      if (typeof v === "number" && isFinite(v)) nums.push(v)
    }

    let val: number | null = null
    if (how === "total_upvotes") {
      val = nums.length ? nums.reduce((a, b) => a + b, 0) : null
    } else {
      val = nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null
    }

    if ((how === "avg_upvotes" || how === "avg_comments") && val == null && lastAvg != null) val = lastAvg
    if (val != null) lastAvg = val
    out.push({ date: r.date, v: val })
  }

  return out
}

function aggregate(series: Array<{ date: string; v: number | null }>, granularity: Granularity, how: Metric) {
  if (granularity === "day") return series

  const buckets: Record<string, { sum: number; count: number }> = {}
  for (const r of series) {
    const d = toUtcDate(r.date)
    if (!d) continue
    const key = granularity === "week" ? keyWeek(d) : keyMonth(d)
    if (!buckets[key]) buckets[key] = { sum: 0, count: 0 }
    if (typeof r.v === "number" && isFinite(r.v)) {
      buckets[key].sum += r.v
      buckets[key].count += 1
    }
  }

  const rows = Object.keys(buckets).sort()
  return rows.map((k) => {
    const b = buckets[k]
    const value = how === "total_upvotes" ? b.sum : b.count ? b.sum / b.count : null
    return { date: k, v: value }
  })
}

function yMax(data: Array<{ date: string; v: number | null }>): number {
  let m = 0
  for (const r of data) {
    const v = Number(r.v ?? 0)
    if (isFinite(v)) m = Math.max(m, v)
  }
  return m || 0
}

export default function LineChartSection({ users, username, username2, rows, rows2, timeSeries, timeSeries2 }: Props) {
  const [isOpen, setIsOpen] = React.useState(true)
  const [metric, setMetric] = React.useState<Metric>("avg_upvotes")
  const [granularity, setGranularity] = React.useState<Granularity>("day")

  const cleanUsers: UserTS[] = React.useMemo(() => {
    if (Array.isArray(users) && users.length) {
      return users
        .map((u) => ({ username: (u.username || "").trim(), timeSeries: u.timeSeries }))
        .filter((u) => u.username && u.timeSeries && (u.timeSeries.upvotes?.length || u.timeSeries.comments?.length))
    }

    if (!timeSeries) return []
    const arr: UserTS[] = [{ username: (username || "user1").trim(), timeSeries }]
    if (timeSeries2 && (username2 || "").trim()) arr.push({ username: (username2 as string).trim(), timeSeries: timeSeries2 })
    return arr
  }, [users, timeSeries, timeSeries2, username, username2])

  const primary = "var(--sidebar-primary)"

  const palette = React.useMemo(
    () => [
      primary,
      "rgb(20,184,166)",
      "rgb(59,130,246)",
      "rgb(168,85,247)",
      "rgb(234,179,8)",
      "rgb(239,68,68)",
      "rgb(34,197,94)",
    ],
    []
  )

  const metricLabel = metric === "avg_upvotes" ? "Average Upvotes" : metric === "avg_comments" ? "Average Root Comments" : "Total Upvotes"

  const perUserSeries = React.useMemo(() => {
    return cleanUsers.map((u) => {
      const ts = u.timeSeries
      const base = metric === "avg_comments" ? ts.comments : ts.upvotes
      const keys = ts.subreddits || []
      const daily = summarize(base || [], keys, metric)
      const agg = aggregate(daily, granularity, metric)
      return { username: u.username, label: `u/${u.username}`, series: agg }
    })
  }, [cleanUsers, metric, granularity])

  const allDates = React.useMemo(() => {
    const s = new Set<string>()
    for (const u of perUserSeries) for (const r of u.series) s.add(r.date)
    return Array.from(s).sort()
  }, [perUserSeries])

  const data: TimeSeriesRow[] = React.useMemo(() => {
    const maps = perUserSeries.map((u) => ({ key: u.label, map: new Map(u.series.map((r) => [r.date, r.v])) }))
    return allDates.map((d) => {
      const row: TimeSeriesRow = { date: d }
      for (const m of maps) row[m.key] = (m.map.get(d) ?? null) as any
      return row
    })
  }, [allDates, perUserSeries])

  const computedMax = React.useMemo(() => {
    let m = 0
    for (const u of perUserSeries) m = Math.max(m, yMax(u.series))
    return m
  }, [perUserSeries])

  const finalMax = Math.ceil(computedMax || 0)
  const domain: [number, number] = [0, Math.max(10, finalMax)]

  const legend = perUserSeries.map((u, idx) => ({ label: u.label, color: palette[idx % palette.length] }))
  const colorMap = Object.fromEntries(legend.map((l) => [l.label, l.color]))

  if (!cleanUsers.length) return null
  if (!rows || rows.length === 0) return null
  
  return (
    <div className="rounded-lg border border-border bg-card">
      <header
        className="p-6 cursor-pointer flex justify-between items-start"
        onClick={() => setIsOpen((v) => !v)}
        aria-expanded={isOpen}
        aria-controls="linechart-content"
      >
        <div className="flex items-center gap-2 text-xl font-bold">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            style={{ color: "var(--sidebar-primary)" }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3v18h18M5 14l4-4 4 4 4-6 3 4" />
          </svg>
          <h3>Performance Over Time</h3>
        </div>
        <svg className={`w-6 h-6 transition-transform duration-300 flex-shrink-0 ${isOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </header>

      {isOpen && (
        <div id="linechart-content" className="px-6 pb-6">
          <div className="border-t border-border pt-4 space-y-4">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-4 justify-between">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">Metric:</span>
                  <div className="flex rounded-md bg-muted p-1">
                    <button
                      onClick={() => setMetric("avg_upvotes")}
                      className={`px-3 py-1 text-sm rounded ${metric === "avg_upvotes" ? "bg-card text-foreground font-semibold shadow" : "text-muted-foreground"}`}
                    >
                      Average Upvotes
                    </button>
                    <button
                      onClick={() => setMetric("avg_comments")}
                      className={`px-3 py-1 text-sm rounded ${metric === "avg_comments" ? "bg-card text-foreground font-semibold shadow" : "text-muted-foreground"}`}
                    >
                      Average Root Comments
                    </button>
                    <button
                      onClick={() => setMetric("total_upvotes")}
                      className={`px-3 py-1 text-sm rounded ${metric === "total_upvotes" ? "bg-card text-foreground font-semibold shadow" : "text-muted-foreground"}`}
                    >
                      Total Upvotes
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">Date:</span>
                  <div className="flex rounded-md bg-muted p-1">
                    <button
                      onClick={() => setGranularity("day")}
                      className={`px-3 py-1 text-sm rounded ${granularity === "day" ? "bg-card text-foreground font-semibold shadow" : "text-muted-foreground"}`}
                    >
                      Day
                    </button>
                    <button
                      onClick={() => setGranularity("week")}
                      className={`px-3 py-1 text-sm rounded ${granularity === "week" ? "bg-card text-foreground font-semibold shadow" : "text-muted-foreground"}`}
                    >
                      Week
                    </button>
                    <button
                      onClick={() => setGranularity("month")}
                      className={`px-3 py-1 text-sm rounded ${granularity === "month" ? "bg-card text-foreground font-semibold shadow" : "text-muted-foreground"}`}
                    >
                      Month
                    </button>
                  </div>
                </div>
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

            <div style={{ height: 400 }} className="mt-2">
              <PerformanceLineChart
                data={data}
                seriesKeys={legend.map((l) => l.label)}
                metricLabel={metricLabel}
                domain={domain}
                legend={legend}
                colorMap={colorMap}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
