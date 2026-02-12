// bar-chart-section.tsx
"use client"

import React from "react"
import BarChartView from "./bar-chart"

type MetricKey = "Avg_Upvotes_Per_Post" | "Median_Upvotes" | "Total_Upvotes" | "Total_Comments" | "WPI_Score"

type UserDataset = { username: string; rows: any[] }

interface Props {
  users: UserDataset[]
  s: { [k: string]: string }
  averageMetricKey: "avg" | "median"
  onMetricChange: (key: "avg" | "median") => void
  title?: string
  topN?: number
}

export default function BarChartSection({
  users,
  s,
  averageMetricKey,
  onMetricChange,
  title = "Top 25 Subreddits by Upvotes",
  topN = 25,
}: Props) {
  const [open, setOpen] = React.useState(true)

  const metric: MetricKey = averageMetricKey === "median" ? "Median_Upvotes" : "Avg_Upvotes_Per_Post"
  const label = metric === "Median_Upvotes" ? "Median Upvotes" : "Average Upvotes (Mean)"

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
        .filter((r) => Number.isFinite(Number(r?.[metric])))
        .sort((a, b) => Number(b?.[metric] ?? 0) - Number(a?.[metric] ?? 0))
        .slice(0, topN)

      return {
        username: u.username,
        color: palette[idx % palette.length],
        items: arr.map((r) => ({
          Subreddit: r?.Subreddit ?? "",
          Value: Number(r?.[metric] ?? 0),
          Total_Posts: Number(r?.Total_Posts ?? 0),
          __user: `u${idx + 1}`,
          __userLabel: `u/${u.username}`,
          __color: palette[idx % palette.length],
        })),
      }
    })
  }, [cleanUsers, metric, topN, palette])

  const combined = React.useMemo(() => {
    const merged = perUserTop.flatMap((u) => u.items)
    return merged.sort((x, y) => {
      const dv = (y.Value ?? 0) - (x.Value ?? 0)
      if (dv !== 0) return dv
      if (x.__user !== y.__user) return String(x.__user).localeCompare(String(y.__user))
      return String(x.Subreddit).localeCompare(String(y.Subreddit))
    })
  }, [perUserTop])

  const hasAny = combined.length > 0

  const rowHeight = 22
  const extra = 160
  const minH = 450
  const maxH = 1400
  const chartHeight = Math.min(maxH, Math.max(minH, combined.length * rowHeight + extra))

  const autoMax = React.useMemo(() => {
    const vals = combined.map((r) => Number(r.Value || 0))
    const m = vals.length ? Math.max(...vals) : 0
    return Math.ceil((m || 10) * 1.05)
  }, [combined])

  const [domain, setDomain] = React.useState<[number, number]>([0, autoMax])
  React.useEffect(() => {
    setDomain(([min]) => [min, autoMax])
  }, [autoMax])

  const [maxInput, setMaxInput] = React.useState<string>("")
  React.useEffect(() => setMaxInput(""), [metric])

  const applyMax = (v: string) => {
    if (v === "") {
      setDomain(([min]) => [min, autoMax])
      return
    }
    const n = Number(v)
    if (!Number.isFinite(n) || n <= 0) return
    setDomain(([min]) => [min, n])
  }

  if (!hasAny) return null

  const legend = perUserTop.map((u) => ({ label: `u/${u.username}`, color: u.color }))

  return (
    <div className="rounded-lg border border-border bg-card">
      <header className="p-6 cursor-pointer flex justify-between items-start" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-controls="barchart-content">
        <div className="flex items-center gap-2 text-xl font-bold">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ color: "var(--sidebar-primary)" }}>
            <path d="M3 21h18 M7 18v-8h3v8H7Z M12.5 18V6h3v12h-3Z M18 18v-5h3v5h-3Z" />
          </svg>
          <h2 className="text-xl font-bold">{title}</h2>
        </div>
        <svg className={`w-6 h-6 transition-transform duration-300 ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </header>

      {open && (
        <div id="barchart-content" className="px-6 pb-6">
          <div className="border-t border-border pt-4">
            <div className="flex items-center gap-4 flex-wrap justify-between mb-4">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">Average Type:</span>
                  <div className="flex rounded bg-muted p-1">
                    <button
                      type="button"
                      onClick={() => onMetricChange("avg")}
                      className={`px-3 py-1 text-sm rounded ${averageMetricKey === "avg" ? "bg-card text-foreground font-semibold shadow" : "text-muted-foreground"}`}
                    >
                      Mean Average
                    </button>
                    <button
                      type="button"
                      onClick={() => onMetricChange("median")}
                      className={`px-3 py-1 text-sm rounded ${averageMetricKey === "median" ? "bg-card text-foreground font-semibold shadow" : "text-muted-foreground"}`}
                    >
                      Median Average
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Maximum Upvotes Displayed:</span>
                  <input
                    type="number"
                    placeholder={`Auto (${autoMax.toLocaleString()})`}
                    value={maxInput}
                    onChange={(e) => setMaxInput(e.target.value)}
                    onBlur={() => applyMax(maxInput)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.currentTarget.blur()
                    }}
                    className="w-36 bg-muted border border-border rounded text-sm py-1 pr-1 pl-2 text-foreground"
                  />
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

            <div style={{ height: `${Math.round(chartHeight / 1.8)}px` }}>
              <BarChartView data={combined} domain={domain} metric="Value" label={label} legend={legend} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
