"use client"

import React from "react"
import BarChartView from "./bar-chart"

type MetricKey =
  | "Avg_Upvotes_Per_Post"
  | "Median_Upvotes"
  | "Total_Upvotes"
  | "Total_Comments"
  | "WPI_Score"

interface Props {
  rows: any[]
  rows2?: any[]
  username?: string
  username2?: string
  s: { [k: string]: string }
  averageMetricKey: "avg" | "median"
  onMetricChange: (key: "avg" | "median") => void
  title?: string
}

export default function BarChartSection({
  rows,
  rows2,
  username,
  username2,
  s,
  averageMetricKey,
  onMetricChange,
  title = "Top 25 Subreddits by Upvotes",
}: Props) {
  const [open, setOpen] = React.useState(true)

  const metric: MetricKey =
    averageMetricKey === "median" ? "Median_Upvotes" : "Avg_Upvotes_Per_Post"

  const label =
    metric === "Median_Upvotes" ? "Median Upvotes" : "Average Upvotes (Mean)"

  // top 25 for each dataset (sorted like the original)
  const top25User1 = React.useMemo(() => {
    const arr = Array.isArray(rows) ? rows : []
    return [...arr]
      .filter((r) => Number.isFinite(Number(r?.[metric])))
      .sort((a, b) => Number(b?.[metric] ?? 0) - Number(a?.[metric] ?? 0))
      .slice(0, 25)
  }, [rows, metric])

  const top25User2 = React.useMemo(() => {
    const arr = Array.isArray(rows2) ? rows2 : []
    return [...arr]
      .filter((r) => Number.isFinite(Number(r?.[metric])))
      .sort((a, b) => Number(b?.[metric] ?? 0) - Number(a?.[metric] ?? 0))
      .slice(0, 25)
  }, [rows2, metric])

  const hasSecond = Array.isArray(rows2) && rows2.length > 0

  // combine into a single list of up to 50 items; color by user
  const combined = React.useMemo(() => {
    const primary = "var(--sidebar-primary)"
    const teal = "rgb(20,184,166)" // same teal as scatter

    const mapIt = (arr: any[], who: "u1" | "u2") =>
      arr.map((r) => ({
        Subreddit: r?.Subreddit ?? "",
        Value: Number(r?.[metric] ?? 0),
        Total_Posts: Number(r?.Total_Posts ?? 0),
        __user: who,
        __color: who === "u1" ? primary : teal,
      }))

    const a = mapIt(top25User1, "u1")
    const b = hasSecond ? mapIt(top25User2, "u2") : []

    // merge then sort across BOTH lists so colors mix
    // tie-breaker keeps a stable, mixed order when values are equal
    return [...a, ...b].sort((x, y) => {
      const dv = (y.Value ?? 0) - (x.Value ?? 0)
      if (dv !== 0) return dv
      // tie-break: put different users next to each other
      if (x.__user !== y.__user) return x.__user === "u1" ? -1 : 1
      // final fallback: alpha by subreddit
      return String(x.Subreddit).localeCompare(String(y.Subreddit))
    })
  }, [top25User1, top25User2, metric, hasSecond])

  const rowHeight = 22; // px per bar
  const extra = 140;    // axis/legend/margins headroom
  const minH = 450;
  const maxH = 1400;
  const chartHeight = Math.min(maxH, Math.max(minH, combined.length * rowHeight + extra));

  // domain across both lists
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

  const onMaxChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setMaxInput(e.target.value)
  const onMaxBlur = () => applyMax(maxInput)
  const onMaxKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") e.currentTarget.blur()
  }

  if (!rows || rows.length === 0) return null

  return (
    <div className="rounded-lg border border-border bg-card">
      <header
        className="p-6 cursor-pointer flex justify-between items-start"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="barchart-content"
      >
        <div className="flex items-center gap-2 text-xl font-bold">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            style={{ color: "var(--sidebar-primary)" }}
          >
            <path d="M3 21h18 M7 18v-8h3v8H7Z M12.5 18V6h3v12h-3Z M18 18v-5h3v5h-3Z" />
          </svg>
          <h2 className="text-xl font-bold">
            {title}
          </h2>
        </div>
        <svg
          className={`w-6 h-6 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </header>

      {open && (
        <div id="barchart-content" className="px-6 pb-6">
          <div className="border-t border-border pt-4">
            <div className="flex items-center gap-4 flex-wrap justify-between mb-4">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    Average Type:
                  </span>
                  <div className="flex rounded bg-muted p-1">
                    <button
                      onClick={() => onMetricChange("avg")}
                      className={`px-3 py-1 text-sm rounded ${averageMetricKey === "avg"
                        ? "bg-card text-foreground font-semibold shadow"
                        : "text-muted-foreground"
                        }`}
                    >
                      Mean Average
                    </button>
                    <button
                      onClick={() => onMetricChange("median")}
                      className={`px-3 py-1 text-sm rounded ${averageMetricKey === "median"
                        ? "bg-card text-foreground font-semibold shadow"
                        : "text-muted-foreground"
                        }`}
                    >
                      Median Average
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                    Maximum Upvotes Displayed:
                  </span>
                  <input
                    type="number"
                    placeholder={`Auto (${autoMax.toLocaleString()})`}
                    value={maxInput}
                    onChange={onMaxChange}
                    onBlur={onMaxBlur}
                    onKeyDown={onMaxKeyDown}
                    className="w-36 bg-muted border border-border rounded text-sm py-1 pr-1 pl-2 text-foreground"
                  />
                </div>
              </div>

              {/* Legend like scatter-plot */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block w-3 h-3 rounded-sm"
                    style={{ background: "var(--sidebar-primary)" }}
                    aria-hidden="true"
                  />
                  <span className="text-sm text-muted-foreground">
                    {`u/${username || "user1"}`}
                  </span>
                </div>
                {hasSecond && (
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block w-3 h-3 rounded-sm"
                      style={{ background: "rgb(20,184,166)" }}
                      aria-hidden="true"
                    />
                    <span className="text-sm text-muted-foreground">
                      {`u/${username2 || "user2"}`}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Keep your original height for now */}
            <div style={{ height: `${chartHeight/1.8}px` }}>
              {/* Use the normalized 'Value' metric so we can mix both lists */}
              <BarChartView data={combined} domain={domain} metric="Value" label={label} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
