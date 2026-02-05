"use client"

import React from "react"
import AxisSelector from "./axis-selector"
import ScatterPlot from "./scatter-plot"

type AxisDomain = [number, number] | ["auto", number] | [number, "auto"] | ["auto", "auto"]

type AxisKey =
  | "Total_Posts"
  | "Avg_Upvotes_Per_Post"
  | "Median_Upvotes"
  | "Avg_Comments_Per_Post"
  | "Total_Upvotes"
  | "Total_Comments"
  | "Subreddit_Subscribers"

type AxisChoice =
  | "Total_Posts"
  | "Average_Upvotes"
  | "Avg_Comments_Per_Post"
  | "Total_Upvotes"
  | "Total_Comments"
  | "Subreddit_Subscribers"

type ScatterState = {
  xAxisChoice: AxisChoice
  yAxisChoice: AxisChoice
  averageMetricKey: "avg" | "median"
  xDomain: AxisDomain
  yDomain: AxisDomain
}

type Point = {
  subreddit: string
  members: number
  Total_Posts: number
  Avg_Upvotes_Per_Post: number
  Median_Upvotes: number
  Avg_Comments_Per_Post: number
  Total_Upvotes: number
  Total_Comments: number
  Subreddit_Subscribers: number
}

interface Props {
  rows: any[]
  rows2?: any[]
  username: string
  username2?: string
  s: { [k: string]: string }
  defaultX?: AxisChoice
  defaultY?: AxisChoice
  onScatterState?: (s: ScatterState) => void
}

export default function ScatterPlotSection({
  rows,
  rows2,
  username,
  username2,
  s,
  defaultX = "Total_Posts",
  defaultY = "Average_Upvotes",
  onScatterState,
}: Props) {
  const [isOpen, setIsOpen] = React.useState(true)

  const [xAxisChoice, setXAxisChoice] = React.useState<AxisChoice>(defaultX)
  const [yAxisChoice, setYAxisChoice] = React.useState<AxisChoice>(defaultY)
  const [averageMetricKey, setAverageMetricKey] = React.useState<"avg" | "median">("avg")

  const [xDomain, setXDomain] = React.useState<AxisDomain>([0, "auto"])
  const [yDomain, setYDomain] = React.useState<AxisDomain>([0, "auto"])

  React.useEffect(() => {
    if (!onScatterState) return
    onScatterState({ xAxisChoice, yAxisChoice, averageMetricKey, xDomain, yDomain })
  }, [xAxisChoice, yAxisChoice, averageMetricKey, xDomain, yDomain, onScatterState])

  const mapRows = React.useCallback(
    (arr: any[]): Point[] =>
      (arr || []).map((r: any) => ({
        subreddit: r?.Subreddit ?? "",
        members: Number(r?.Subreddit_Subscribers ?? 0),
        Total_Posts: Number(r?.Total_Posts ?? 0),
        Avg_Upvotes_Per_Post: Number(r?.Avg_Upvotes_Per_Post ?? 0),
        Median_Upvotes: Number(r?.Median_Upvotes ?? 0),
        Avg_Comments_Per_Post: Number(r?.Avg_Comments_Per_Post ?? 0),
        Total_Upvotes: Number(r?.Total_Upvotes ?? 0),
        Total_Comments: Number(r?.Total_Comments ?? 0),
        Subreddit_Subscribers: Number(r?.Subreddit_Subscribers ?? 0),
      })),
    []
  )

  const all1 = React.useMemo<Point[]>(() => mapRows(rows || []), [rows, mapRows])
  const all2 = React.useMemo<Point[]>(() => mapRows(rows2 || []), [rows2, mapRows])

  const hasSubs = React.useMemo(() => [...all1, ...all2].some(p => p.Subreddit_Subscribers > 0), [all1, all2])

  const AXIS_OPTIONS: { value: AxisChoice; label: string }[] = React.useMemo(() => {
    const base: { value: AxisChoice; label: string }[] = [
      { value: "Total_Posts", label: "Number of Posts" },
      { value: "Average_Upvotes", label: "Average Upvotes" },
      { value: "Avg_Comments_Per_Post", label: "Average Root Comments" },
      { value: "Total_Upvotes", label: "Total Upvotes" },
      { value: "Total_Comments", label: "Total Root Comments" },
    ]
    if (hasSubs) base.push({ value: "Subreddit_Subscribers", label: "Subscribers" })
    return base
  }, [hasSubs])

  const resolveKey = React.useCallback(
    (choice: AxisChoice): AxisKey => {
      if (choice === "Average_Upvotes") {
        return averageMetricKey === "median" ? "Median_Upvotes" : "Avg_Upvotes_Per_Post"
      }
      return choice as AxisKey
    },
    [averageMetricKey]
  )

  const xKey: AxisKey = React.useMemo(() => resolveKey(xAxisChoice), [xAxisChoice, resolveKey])
  const yKey: AxisKey = React.useMemo(() => resolveKey(yAxisChoice), [yAxisChoice, resolveKey])

  const labelFor = React.useCallback(
    (choice: AxisChoice) => {
      if (choice === "Average_Upvotes") {
        return averageMetricKey === "median" ? "Average Upvotes (Median)" : "Average Upvotes (Mean)"
      }
      const found = AXIS_OPTIONS.find(o => o.value === choice)?.label
      return found || String(choice)
    },
    [AXIS_OPTIONS, averageMetricKey]
  )

  const xLabel = React.useMemo(() => labelFor(xAxisChoice), [labelFor, xAxisChoice])
  const yLabel = React.useMemo(() => labelFor(yAxisChoice), [labelFor, yAxisChoice])

  const hasSecond = React.useMemo(() => Array.isArray(rows2) && rows2.length > 0 && !!username2, [rows2, username2])

  const datasets = React.useMemo(
    () =>
      hasSecond
        ? [
            { label: `u/${username || "user1"}`, data: all1, color: "var(--sidebar-primary)" },
            { label: `u/${username2 || "user2"}`, data: all2, color: "rgb(20,184,166)" },
          ]
        : [{ label: `u/${username || "user"}`, data: all1, color: "var(--sidebar-primary)" }],
    [hasSecond, all1, all2, username, username2]
  )

  const autoMaxFor = React.useCallback(
    (k: AxisKey) => {
      const vals = [...all1, ...all2].map(d => Number((d as any)[k] ?? 0))
      const max = vals.length ? Math.max(...vals) : 0
      return Math.ceil((max || 10) * 1.05)
    },
    [all1, all2]
  )

  const AxisDomainControl: React.FC<{
    label: string
    domain: AxisDomain
    autoMax: number
    onChange: (d: AxisDomain) => void
  }> = ({ label, domain, autoMax, onChange }) => {
    const [local, setLocal] = React.useState(domain[1] === "auto" ? "" : String(domain[1]))
    React.useEffect(() => {
      setLocal(domain[1] === "auto" ? "" : String(domain[1]))
    }, [domain])
    const apply = (v: string) => {
      if (v === "") {
        onChange([domain[0], "auto"])
        return
      }
      const n = Number(v)
      if (!Number.isFinite(n) || n < 0) return
      onChange([domain[0], n])
    }
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">{label}:</span>
        <input
          type="number"
          inputMode="numeric"
          placeholder={`Auto (${autoMax.toLocaleString()})`}
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          onBlur={() => apply(local)}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur()
          }}
          className="w-32 bg-muted border border-border rounded text-sm py-1 pr-1 pl-2 text-foreground"
        />
      </div>
    )
  }

  if (!rows || rows.length === 0) return null

  const autoX = autoMaxFor(xKey)
  const autoY = autoMaxFor(yKey)
  const showAvgToggle = xAxisChoice === "Average_Upvotes" || yAxisChoice === "Average_Upvotes"

  return (
    <div className="rounded-lg border border-border bg-card">
      <header
        className="p-6 cursor-pointer flex justify-between items-center"
        onClick={() => setIsOpen(v => !v)}
        aria-expanded={isOpen}
        aria-controls="scatterplot-content"
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
            {/* axes */}
            <path d="M3 21h18M3 21V3" />
            {/* points */}
            <circle cx="9" cy="15" r="1.5" fill="currentColor" />
            <circle cx="13" cy="9" r="1.5" fill="currentColor" />
            <circle cx="18" cy="13" r="1.5" fill="currentColor" />
          </svg>
          <h2 className="text-xl font-bold">{`Subreddit Performance: ${yLabel} vs. ${xLabel}`}</h2>
        </div>
        <svg
          className={`w-6 h-6 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </header>

      {isOpen && (
        <div id="scatterplot-content" className="px-6 pb-6">
          <div className="border-t border-border pt-4 space-y-4">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
              <AxisSelector label="X-Axis" value={xAxisChoice} onChange={(e) => setXAxisChoice(e.target.value as AxisChoice)} options={AXIS_OPTIONS} />
              <AxisSelector label="Y-Axis" value={yAxisChoice} onChange={(e) => setYAxisChoice(e.target.value as AxisChoice)} options={AXIS_OPTIONS} />
              <AxisDomainControl label={`${xLabel} Max`} domain={xDomain} autoMax={autoX} onChange={setXDomain} />
              <AxisDomainControl label={`${yLabel} Max`} domain={yDomain} autoMax={autoY} onChange={setYDomain} />
            </div>

            {showAvgToggle && (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">Average Type:</span>
                <div className="flex rounded bg-muted p-1">
                  <button onClick={() => setAverageMetricKey("avg")} className={`px-3 py-1 text-sm rounded ${averageMetricKey === "avg" ? "bg-card text-foreground font-semibold shadow" : "text-muted-foreground"}`}>
                    Mean Average
                  </button>
                  <button onClick={() => setAverageMetricKey("median")} className={`px-3 py-1 text-sm rounded ${averageMetricKey === "median" ? "bg-card text-foreground font-semibold shadow" : "text-muted-foreground"}`}>
                    Median Average
                  </button>
                </div>
              </div>
            )}
          </div>

          <div style={{ height: "500px" }} className="mt-4">
            <ScatterPlot
              datasets={datasets}
              xAxis={xKey}
              yAxis={yKey}
              xDomain={xDomain}
              yDomain={yDomain}
              xAxisLabel={xLabel}
              yAxisLabel={yLabel}
              height={500}
            />
          </div>
        </div>
      )}
    </div>
  )
}
