"use client"

import React from "react"

type Flags = { inclVote: boolean; inclComm: boolean; inclMed: boolean; inclSubs: boolean; inclPER: boolean }

type TS = {
  upvotes: Array<{ date: string; [k: string]: number | string | null }>
  comments: Array<{ date: string; [k: string]: number | string | null }>
  subreddits: string[]
}

type AxisDomain = [number, number] | ["auto", number] | [number, "auto"] | ["auto", "auto"]

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

interface PdfSectionProps {
  username: string
  username2?: string
  dateRange: string
  rows: any[]
  rows2?: any[]
  excelFlags: Flags
  selectors?: { kpi?: string; table?: string; scatter?: string; bar?: string; line?: string; insights?: string }
  timeSeries?: TS
  timeSeries2?: TS
  lineMetric?: "avg_upvotes" | "avg_comments" | "total_upvotes"
  lineGranularity?: "day" | "week" | "month"
  insights?: string[]
  scatter?: ScatterState
}

type Phase = "idle" | "capturing" | "sending" | "generating" | "downloading" | "done" | "error"

export default function PdfSection({
  username,
  username2,
  dateRange,
  rows,
  rows2,
  excelFlags,
  insights,
  scatter,
  selectors,
  timeSeries,
  timeSeries2,
  lineMetric = "avg_upvotes",
  lineGranularity = "day",
}: PdfSectionProps) {
  const [phase, setPhase] = React.useState<Phase>("idle")
  const [err, setErr] = React.useState<string | null>(null)

  const label =
    phase === "idle" ? "Export Full Report to PDF" :
    phase === "capturing" ? "Preparing…" :
    phase === "sending" ? "Uploading…" :
    phase === "generating" ? "Rendering PDF…" :
    phase === "downloading" ? "Downloading…" :
    phase === "done" ? "Saved ✓" :
    "Retry Export"

  const busy = phase !== "idle" && phase !== "done" && phase !== "error"

  function pickOuterHTML(sel?: string) {
    if (!sel) return null
    const el = document.querySelector(sel) as HTMLElement | null
    return el ? el.outerHTML : null
  }

  function pickFirstSVG(sel?: string) {
    if (!sel) return null
    const el = document.querySelector(sel) as HTMLElement | null
    const svg = el?.querySelector("svg")
    return svg ? svg.outerHTML : null
  }

  async function handleExport() {
    try {
      setErr(null)
      setPhase("capturing")
      const payload = {
        title: `Overview for Reddit account u/${username}`,
        username,
        username2: username2 || "",
        dateRange,
        flags: excelFlags,
        rows,
        rows2: rows2 || [],
        insights: insights || [],
        scatter,
        timeSeries,
        timeSeries2,
        lineMetric,
        lineGranularity,
        captures: {
          kpiHTML: pickOuterHTML(selectors?.kpi),
          tableHTML: pickOuterHTML(selectors?.table),
          scatterSVG: pickFirstSVG(selectors?.scatter),
          barSVG: pickFirstSVG(selectors?.bar),
          lineSVG: pickFirstSVG(selectors?.line),
          insightsHTML: pickOuterHTML(selectors?.insights),
        },
      }

      setPhase("sending")
      const ctrl = new AbortController()
      const t = setTimeout(() => ctrl.abort(), 90000)
      const res = await fetch("/api/export-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: ctrl.signal
      })
      clearTimeout(t)
      if (!res.ok) throw new Error("Failed to generate PDF")
      setPhase("generating")
      const blob = await res.blob()
      setPhase("downloading")
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      const ts = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")
      a.href = url
      a.download = `${username || "report"}-spa-${ts}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      setPhase("done")
      setTimeout(() => setPhase("idle"), 1500)
    } catch (e: any) {
      setErr(e?.message || "Export failed")
      setPhase("error")
    }
  }

  function fallbackPrint() {
    setErr(null)
    window.print()
  }

  if (!rows || rows.length === 0) return null
  
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center -mt-10">
      <button
        type="button"
        className="inline-flex items-center rounded-md px-6 py-3 text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
        onClick={handleExport}
        disabled={busy}
      >
        {busy && (
          <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" opacity="0.25" />
            <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" fill="none" />
          </svg>
        )}
        {label}
      </button>

      {phase !== "idle" && (
        <div className="mt-4 text-sm">
          {phase === "capturing" && <span className="text-muted-foreground">Capturing current selections…</span>}
          {phase === "sending" && <span className="text-muted-foreground">Uploading to server…</span>}
          {phase === "generating" && <span className="text-muted-foreground">Headless Chromium is rendering…</span>}
          {phase === "downloading" && <span className="text-muted-foreground">Downloading file…</span>}
          {phase === "done" && <span className="text-muted-foreground">Done.</span>}
          {phase === "error" && <span className="text-destructive">{err}</span>}
        </div>
      )}
    </div>
  )
}
