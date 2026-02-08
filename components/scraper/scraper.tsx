"use client"

import { useEffect, useRef, useState } from "react"
import React from "react"
import s from "@/styles/scraper.module.css"
import Form from "./form"
import ExcelSheetSection from "./excel-sheet-section"
import ScatterPlotSection from "./scatter-plot-section"
import BarChartSection from "./bar-chart-section"
import BoxPlotSection from "./box-plot-section"
import LineChartSection from "./line-chart-section"
import KeyInsightsSection from "./key-insights-section"
import KPI from "./kpi-section"
import PdfSection from "./pdf-section"

type ModelOption = { id: string; name: string; username: string }
type ManagerOption = { id: string; name: string; models: ModelOption[] }

export default function Scraper() {
  const managers: ManagerOption[] = [
    {
      id: "mgr_1",
      name: "Manager A",
      models: [
        { id: "mdl_1", name: "Model 1", username: "spez" },
        { id: "mdl_2", name: "Model 2", username: "reddit" },
      ],
    },
    {
      id: "mgr_2",
      name: "Manager B",
      models: [{ id: "mdl_3", name: "Model 3", username: "example_user" }],
    },
  ]

  const [compareEnabled, setCompareEnabled] = useState(false)

  const [managerId, setManagerId] = useState("")
  const [modelId, setModelId] = useState("")

  const [managerId2, setManagerId2] = useState("")
  const [modelId2, setModelId2] = useState("")

  const [runUsername2, setRunUsername2] = useState("")
  const [runUsername, setRunUsername] = useState("")

  const dateRange = "all"
  const limit = 100
  const [runLimit, setRunLimit] = useState<number>(100)

  const runDefaults = { inclVote: false, inclComm: false, inclMed: false, inclSubs: true, inclPER: false }
  const [averageMetricKey, setAverageMetricKey] = React.useState<"avg" | "median">("avg")
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState("Idle")
  const [msg, setMsg] = useState<{ type: string; text: string } | null>(null)
  const [preview, setPreview] = useState<any[]>([])
  const [preview2, setPreview2] = useState<any[] | null>(null)
  const [rawRows, setRawRows] = useState<any[] | null>(null)
  const [rawRows2, setRawRows2] = useState<any[] | null>(null)
  const [spanDays, setSpanDays] = useState<number | null>(null)
  const sidRef = useRef(globalThis.crypto?.randomUUID?.() ? crypto.randomUUID() : String(Math.random()))
  const progRef = useRef<HTMLElement>(null)
  const [timeSeries, setTimeSeries] = useState<{ upvotes: Array<{ date: string; [k: string]: number | string | null }>; comments: Array<{ date: string; [k: string]: number | string | null }>; subreddits: string[] } | null>(null)
  const [timeSeries2, setTimeSeries2] = useState<{ upvotes: Array<{ date: string; [k: string]: number | string | null }>; comments: Array<{ date: string; [k: string]: number | string | null }>; subreddits: string[] } | null>(null)
  const [insights, setInsights] = useState<string[]>([])
  type AxisDomain = [number, number] | ["auto", number] | [number, "auto"] | ["auto", "auto"]
  type AxisChoice = "Total_Posts" | "Average_Upvotes" | "Avg_Comments_Per_Post" | "Total_Upvotes" | "Total_Comments" | "Subreddit_Subscribers"
  type ScatterState = { xAxisChoice: AxisChoice; yAxisChoice: AxisChoice; averageMetricKey: "avg" | "median"; xDomain: AxisDomain; yDomain: AxisDomain }
  const [scatter, setScatter] = useState<ScatterState | undefined>(undefined)
  const [showTiers, setShowTiers] = useState(false)

  function setProgress(frac: number) {
    if (!progRef.current) return
    const clamped = Math.max(0, Math.min(1, frac))
    progRef.current.style.width = clamped * 100 + "%"
    const bar = progRef.current.parentElement
    if (bar) {
      bar.setAttribute("role", "progressbar")
      bar.setAttribute("aria-valuemin", "0")
      bar.setAttribute("aria-valuemax", "100")
      bar.setAttribute("aria-valuenow", String(Math.round(clamped * 100)))
    }
  }

  function getSelectedModel(mgrId: string, mdlId: string): ModelOption | null {
    const mgr = managers.find(m => m.id === mgrId)
    if (!mgr) return null
    const mdl = mgr.models.find(mm => mm.id === mdlId)
    return mdl || null
  }

  useEffect(() => {
    const cleanup = () => {
      fetch(`/api/scrape?sid=${encodeURIComponent(sidRef.current)}`, { method: "DELETE", keepalive: true }).catch(() => {})
    }
    window.addEventListener("beforeunload", cleanup)
    return () => cleanup()
  }, [])

  async function downloadExport(
    kind: "data" | "raw",
    target: "u1" | "u2",
    opts: { inclVote: boolean; inclComm: boolean; inclMed: boolean; inclSubs: boolean; inclPER: boolean }
  ) {
    try {
      const payload: any = {
        kind,
        username: target === "u2" ? runUsername2 : runUsername,
        inclSubs: 1,
        inclVote: opts.inclVote ? 1 : 0,
        inclComm: opts.inclComm ? 1 : 0,
        inclPER: opts.inclPER ? 1 : 0,
        inclMed: opts.inclMed ? 1 : 0,
      }
      if (kind === "data") {
        payload.rows = target === "u2" ? preview2 || [] : preview
      } else {
        payload.rawRows = target === "u2" ? rawRows2 || [] : rawRows || []
      }
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error("Export failed")
      const blob = await res.blob()
      const cd = res.headers.get("content-disposition") || ""
      const m = /filename\*=UTF-8''([^;]+)|filename="([^"]+)"/i.exec(cd)
      const fname = decodeURIComponent(m?.[1] || m?.[2] || `${payload.username}_${kind}.xlsx`)
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = fname
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      setMsg({ type: "err", text: "Failed to export file." })
    }
  }

  async function readServerError(res: Response) {
    let reason = res.statusText
    try {
      const j = await res.json()
      if (j?.error) reason = j.error
    } catch {}
    return reason || `HTTP ${res.status}`
  }

  function applyPayload(p: any) {
    setPreview(Array.isArray(p.preview) ? p.preview : [])
    setPreview2(Array.isArray(p.preview2) ? p.preview2 : null)
    setRawRows(Array.isArray(p.rawRows) ? p.rawRows : null)
    setRawRows2(Array.isArray(p.rawRows2) ? p.rawRows2 : null)
    setTimeSeries(p.timeSeries ?? null)
    setTimeSeries2(p.timeSeries2 ?? null)
    setSpanDays(typeof p.datasetSpanDays === "number" && isFinite(p.datasetSpanDays) ? p.datasetSpanDays : null)
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const m1 = getSelectedModel(managerId, modelId)
    const m2 = compareEnabled ? getSelectedModel(managerId2, modelId2) : null

    if (!m1) {
      setStatus("Please select a manager and model.")
      setMsg({ type: "err", text: "Please select a manager and model." })
      return
    }
    if (compareEnabled && !m2) {
      setStatus("Please select the comparison manager and model.")
      setMsg({ type: "err", text: "Please select the comparison manager and model." })
      return
    }

    const frozen1 = (m1.username || "").trim()
    const frozen2 = compareEnabled ? (m2?.username || "").trim() : ""

    setRunUsername(frozen1)
    setRunUsername2(frozen2)
    setRunLimit(limit)
    setMsg(null)

    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
    if (!token) {
      setStatus("Please log in to use this feature.")
      setMsg({ type: "err", text: "Please log in to use this feature." })
      return
    }

    setBusy(true)
    setStatus("Checking limits…")

    try {
      const pre = await fetch("/api/usage", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ feature: "scraper", op: "check" }),
      })
      if (!pre.ok) {
        let reason = pre.statusText
        let open = false
        try {
          const j = await pre.json()
          if (j?.error) reason = j.error
          if (typeof j?.showTiers === "boolean") {
            open = j.showTiers
          } else {
            if (pre.status === 429) open = true
            if (typeof reason === "string" && /weekly|subscription/i.test(reason)) open = true
          }
        } catch {}
        setShowTiers(open)
        setStatus(reason)
        setMsg({ type: "err", text: reason })
        setBusy(false)
        return
      }
    } catch (err: any) {
      setStatus("Failed to check limits.")
      setMsg({ type: "err", text: err?.message || "Failed to check limits." })
      setBusy(false)
      return
    }

    setStatus("Starting…")
    setProgress(0)
    setPreview([])
    setPreview2(null)
    setRawRows(null)
    setRawRows2(null)
    setSpanDays(null)

    let stopPoll = false
    ;(async function poll() {
      while (!stopPoll) {
        try {
          const r = await fetch(`/api/scrape?sid=${encodeURIComponent(sidRef.current)}&progress=1`, { cache: "no-store" })
          if (r.ok) {
            const p = await r.json()
            const total = p.total || limit || 1
            const fetched = p.fetched || 0
            const frac = Math.max(0, Math.min(1, total ? fetched / total : 0))
            setProgress(frac)
            setStatus(`${p.phase || "Working…"} ${fetched}/${total}`)
            if (p.done && frac < 1) setProgress(1)
          }
        } catch {}
        await new Promise(r => setTimeout(r, 400))
      }
    })()

    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          username: frozen1,
          username2: frozen2 || undefined,
          limit,
          dateRange,
          inclSubs: 1,
          inclVote: 0,
          inclComm: 0,
          inclPER: 0,
          inclMed: 0,
          sid: sidRef.current,
        }),
      })
      if (!res.ok) {
        const reason = await readServerError(res)
        setProgress(0)
        setStatus(reason)
        setMsg({ type: "err", text: reason })
        return
      }
      const payload = await res.json()
      applyPayload(payload)
      setProgress(1)
      setStatus("Ready.")
    } catch (err: any) {
      setProgress(0)
      setStatus(err?.message || "Failed.")
      setMsg({ type: "err", text: `Failed: ${err?.message?.includes?.("User not found") ? "Reddit username not found." : err?.message || "Unknown error"}` })
    } finally {
      stopPoll = true
      setBusy(false)
    }
  }

  const hasRows = Array.isArray(preview) && preview.length > 0

  return (
    <div className={`min-h-screen bg-background p-4 md:p-6 ${s.bgPattern}`}>
      <div className="mx-auto max-w-4xl space-y-6">
        {/* <div className="rounded-lg border border-border bg-card p-4 md:p-6"> */}
        <div className="rounded-lg p-4 md:p-6">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Subreddit Performance Analysis (SPA)</h1>
          <p className="text-sm md:text-base text-muted-foreground mb-6">Select a manager and model to analyze subreddit performance. Optionally compare against a second model.</p>
          <Form
            progRef={progRef}
            status={status}
            busy={busy}
            onSubmit={onSubmit}
            managers={managers}
            managerId={managerId}
            setManagerId={(v) => {
              setManagerId(v)
              setModelId("")
            }}
            modelId={modelId}
            setModelId={setModelId}
            compareEnabled={compareEnabled}
            setCompareEnabled={(v) => {
              setCompareEnabled(v)
              if (!v) {
                setManagerId2("")
                setModelId2("")
              }
            }}
            managerId2={managerId2}
            setManagerId2={(v) => {
              setManagerId2(v)
              setModelId2("")
            }}
            modelId2={modelId2}
            setModelId2={setModelId2}
            s={s}
          />
        </div>

        <KPI rows={preview} rows2={preview2 ?? undefined} dateRange={dateRange} limit={runLimit} inclPER={false} username={runUsername} username2={runUsername2} />
        <ExcelSheetSection
          hasTop10={hasRows}
          username={runUsername}
          username2={runUsername2}
          rows={preview}
          rows2={preview2 ?? undefined}
          fmtUTC={(iso) => {
            if (!iso) return ""
            const d = new Date(iso)
            const dd = String(d.getUTCDate()).padStart(2, "0")
            const mm = String(d.getUTCMonth() + 1).padStart(2, "0")
            const yy = String(d.getUTCFullYear()).slice(-2)
            const hh = String(d.getUTCHours()).padStart(2, "0")
            const min = String(d.getUTCMinutes()).padStart(2, "0")
            return `${dd}/${mm}/${yy} ${hh}:${min}`
          }}
          s={s}
          defaults={runDefaults}
          subsAvailable={true}
          onExport={(kind, target, opts) => downloadExport(kind, target, opts)}
        />
        <ScatterPlotSection rows={preview} rows2={preview2 ?? undefined} username={runUsername} username2={runUsername2} s={s} onScatterState={setScatter} />
        <BarChartSection rows={preview} rows2={preview2 ?? undefined} username={runUsername} username2={runUsername2} s={s} averageMetricKey={averageMetricKey} onMetricChange={setAverageMetricKey} />
        <BoxPlotSection rows={preview} rows2={preview2 ?? undefined} username={runUsername} username2={runUsername2} s={s} averageMetricKey={averageMetricKey} />
        <LineChartSection username={runUsername} username2={runUsername2} rows={preview} rows2={preview2 ?? undefined} timeSeries={timeSeries ?? undefined} timeSeries2={timeSeries2 ?? undefined} />
        <KeyInsightsSection rows={preview} onInsights={setInsights} />
        <PdfSection
          username={runUsername}
          username2={runUsername2}
          dateRange={dateRange}
          rows={preview}
          rows2={preview2 ?? []}
          excelFlags={runDefaults}
          timeSeries={timeSeries ?? undefined}
          timeSeries2={timeSeries2 ?? undefined}
          lineMetric="avg_upvotes"
          lineGranularity="day"
          insights={insights}
          scatter={scatter}
          selectors={{ kpi: "#kpi-section", table: "#excel-table", scatter: "#scatter-mean-vs-posts", bar: "#bar-top25-upvotes", line: "#line-performance-over-time", insights: "#key-insights-section" }}
        />
      </div>
    </div>
  )
}
