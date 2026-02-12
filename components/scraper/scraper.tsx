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
type CompareSlot = { managerId: string; modelId: string }

type TS = {
  upvotes: Array<{ date: string; [k: string]: number | string | null }>
  comments: Array<{ date: string; [k: string]: number | string | null }>
  subreddits: string[]
}

type UserDataset = {
  username: string
  rows: any[]
  rawRows?: any[] | null
  timeSeries?: TS | null
}

export default function Scraper() {
  const [managers, setManagers] = useState<ManagerOption[]>([])
  const [managersLoading, setManagersLoading] = useState(true)
  const [managersError, setManagersError] = useState<string | null>(null)

  const [managerId, setManagerId] = useState("")
  const [modelId, setModelId] = useState("")

  const [comparisons, setComparisons] = useState<CompareSlot[]>([])

  const [runUsernames, setRunUsernames] = useState<string[]>([])

  const dateRange = "all"
  const limit = 100
  const [runLimit, setRunLimit] = useState<number>(100)

  const runDefaults = { inclVote: false, inclComm: false, inclMed: false, inclSubs: true, inclPER: false }
  const [averageMetricKey, setAverageMetricKey] = React.useState<"avg" | "median">("avg")
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState("Idle")
  const [msg, setMsg] = useState<{ type: string; text: string } | null>(null)

  const [usersData, setUsersData] = useState<UserDataset[]>([])

  const [spanDays, setSpanDays] = useState<number | null>(null)
  const sidRef = useRef(globalThis.crypto?.randomUUID?.() ? crypto.randomUUID() : String(Math.random()))
  const progRef = useRef<HTMLElement>(null)

  const [insights, setInsights] = useState<string[]>([])

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
    const mgr = managers.find((m) => m.id === mgrId)
    if (!mgr) return null
    const mdl = mgr.models.find((mm) => mm.id === mdlId)
    return mdl || null
  }

  useEffect(() => {
    const cleanup = () => {
      fetch(`/api/scrape?sid=${encodeURIComponent(sidRef.current)}`, { method: "DELETE", keepalive: true }).catch(
        () => {}
      )
    }
    window.addEventListener("beforeunload", cleanup)
    return () => cleanup()
  }, [])

  useEffect(() => {
    let alive = true

    ;(async () => {
      try {
        setManagersLoading(true)
        setManagersError(null)

        const r = await fetch("/api/scraper", { cache: "no-store" })
        if (!r.ok) {
          const j = await r.json().catch(() => null)
          const reason = (j && typeof j.error === "string" && j.error) || `Failed to load managers (HTTP ${r.status})`
          throw new Error(reason)
        }

        const j = await r.json()
        const arr = Array.isArray(j?.managers) ? j.managers : []
        if (alive) setManagers(arr)
      } catch (e: any) {
        if (alive) {
          setManagers([])
          setManagersError(e?.message || "Failed to load managers.")
        }
      } finally {
        if (alive) setManagersLoading(false)
      }
    })()

    return () => {
      alive = false
    }
  }, [])

  async function readServerError(res: Response) {
    let reason = res.statusText
    try {
      const j = await res.json()
      if (j?.error) reason = j.error
    } catch {}
    return reason || `HTTP ${res.status}`
  }

  async function loadSavedByUsername(token: string, username: string) {
    const r = await fetch("/api/scraper/model", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ username }),
    })

    if (r.status === 404) return { ok: false as const, notFound: true as const, payload: null }
    if (!r.ok) {
      const reason = await readServerError(r)
      return { ok: false as const, notFound: false as const, payload: null, reason }
    }

    const j = await r.json()
    return { ok: true as const, notFound: false as const, payload: j?.payload ?? null }
  }

  function normalizeUserFromPayload(username: string, payload: any): UserDataset {
    const rows = Array.isArray(payload?.preview) ? payload.preview : Array.isArray(payload?.preview2) ? payload.preview2 : []
    const rawRows = Array.isArray(payload?.rawRows) ? payload.rawRows : Array.isArray(payload?.rawRows2) ? payload.rawRows2 : null
    const timeSeries = payload?.timeSeries ?? payload?.timeSeries2 ?? null
    return { username, rows, rawRows, timeSeries }
  }

  function applyMergedUsers(mergedUsers: UserDataset[], meta?: any) {
    setUsersData(mergedUsers)
    setSpanDays(typeof meta?.datasetSpanDays === "number" && isFinite(meta.datasetSpanDays) ? meta.datasetSpanDays : null)
  }

  async function downloadExport(
    kind: "data" | "raw",
    userIndex: number,
    opts: { inclVote: boolean; inclComm: boolean; inclMed: boolean; inclSubs: boolean; inclPER: boolean }
  ) {
    const u = usersData[userIndex]

    if (!u?.username) {
      setMsg({ type: "err", text: "No user selected for export." })
      return
    }

    const payload: any = {
      kind,
      username: u.username,
      inclSubs: 1,
      inclVote: opts.inclVote ? 1 : 0,
      inclComm: opts.inclComm ? 1 : 0,
      inclPER: opts.inclPER ? 1 : 0,
      inclMed: opts.inclMed ? 1 : 0,
    }

    if (kind === "data") payload.rows = u.rows || []
    else payload.rawRows = u.rawRows || []

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
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (managersLoading) {
      setStatus("Loading managers…")
      setMsg({ type: "err", text: "Managers are still loading. Please wait." })
      return
    }

    if (managersError) {
      setStatus(managersError)
      setMsg({ type: "err", text: managersError })
      return
    }

    const primary = getSelectedModel(managerId, modelId)
    if (!primary) {
      setStatus("Please select a manager and model.")
      setMsg({ type: "err", text: "Please select a manager and model." })
      return
    }

    const resolvedComparisons = comparisons.map((c) => getSelectedModel(c.managerId, c.modelId))
    if (comparisons.length > 0 && resolvedComparisons.some((x) => !x)) {
      setStatus("Please complete all comparison selections (manager + model).")
      setMsg({ type: "err", text: "Please complete all comparison selections (manager + model)." })
      return
    }

    const frozen1 = (primary.username || "").trim()
    const frozenCompUsernames = resolvedComparisons
      .filter((x): x is ModelOption => !!x)
      .map((x) => (x.username || "").trim())
      .filter(Boolean)
      .slice(0, 5)

    const frozenAll = [frozen1, ...frozenCompUsernames].filter(Boolean)

    setRunUsernames(frozenAll)
    setRunLimit(limit)
    setMsg(null)

    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null
    if (!token) {
      setStatus("Please log in to use this feature.")
      setMsg({ type: "err", text: "Please log in to use this feature." })
      return
    }

    setStatus("Loading saved results…")

    const saved = await Promise.all(frozenAll.map((u) => loadSavedByUsername(token, u)))

    const allFound = saved.every((x) => x.ok && x.payload)
    if (allFound) {
      const mergedUsers = frozenAll.map((uname, i) => normalizeUserFromPayload(uname, saved[i].payload))
      applyMergedUsers(mergedUsers, saved[0].payload)
      setProgress(1)
      setStatus("Ready.")
      return
    }

    const anyHardError = saved.find((x) => !x.ok && !x.notFound)
    if (anyHardError) {
      setMsg({ type: "err", text: (anyHardError as any).reason || "Failed to load saved results." })
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
    setUsersData([])
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
        await new Promise((r) => setTimeout(r, 400))
      }
    })()

    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          username: frozen1,
          compareUsernames: frozenCompUsernames,
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

      const mergedUsers: UserDataset[] = []
      mergedUsers.push({ username: frozen1, rows: Array.isArray(payload?.preview) ? payload.preview : [], rawRows: Array.isArray(payload?.rawRows) ? payload.rawRows : null, timeSeries: payload?.timeSeries ?? null })

      const previews: any[] = Array.isArray(payload?.previews) ? payload.previews : []
      const rawRowsList: any[] = Array.isArray(payload?.rawRowsList) ? payload.rawRowsList : []
      const timeSeriesList: any[] = Array.isArray(payload?.timeSeriesList) ? payload.timeSeriesList : []

      frozenCompUsernames.forEach((uname, idx) => {
        const rows = Array.isArray(previews[idx]) ? previews[idx] : Array.isArray(payload?.[`preview${idx + 2}`]) ? payload[`preview${idx + 2}`] : []
        const raw = Array.isArray(rawRowsList[idx]) ? rawRowsList[idx] : Array.isArray(payload?.[`rawRows${idx + 2}`]) ? payload[`rawRows${idx + 2}`] : null
        const ts = timeSeriesList[idx] ?? payload?.[`timeSeries${idx + 2}`] ?? null
        mergedUsers.push({ username: uname, rows, rawRows: raw, timeSeries: ts })
      })

      applyMergedUsers(mergedUsers, payload)
      setProgress(1)
      setStatus("Ready.")
    } catch (err: any) {
      setProgress(0)
      setStatus(err?.message || "Failed.")
      setMsg({
        type: "err",
        text: `Failed: ${
          err?.message?.includes?.("User not found") ? "Reddit username not found." : err?.message || "Unknown error"
        }`,
      })
    } finally {
      stopPoll = true
      setBusy(false)
    }
  }

  const uiBusy = busy || managersLoading
  const uiStatus = managersError ? managersError : status

  const hasRows = usersData[0]?.rows && Array.isArray(usersData[0].rows) && usersData[0].rows.length > 0

  const usersForSections = usersData.map((u) => ({ username: u.username, rows: u.rows }))
  const usernamesForPdf = usersData.map((u) => u.username)
  const primaryUsername = usernamesForPdf[0] || ""
  const secondaryUsername = usernamesForPdf[1] || ""

  const timeSeriesPrimary = usersData[0]?.timeSeries ?? undefined
  const timeSeriesSecondary = usersData[1]?.timeSeries ?? undefined

  return (
    <div className={`min-h-screen bg-background p-4 md:p-6 ${s.bgPattern}`}>
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-lg p-4 md:p-6">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Subreddit Performance Analysis (SPA)</h1>
          <p className="text-sm md:text-base text-muted-foreground mb-6">
            Select a manager and model to analyze subreddit performance. Add up to 5 comparison models.
          </p>

          <Form
            progRef={progRef}
            status={uiStatus}
            busy={uiBusy}
            onSubmit={onSubmit}
            managers={managers}
            managerId={managerId}
            setManagerId={(v) => {
              setManagerId(v)
              setModelId("")
            }}
            modelId={modelId}
            setModelId={setModelId}
            comparisons={comparisons}
            setComparisons={setComparisons}
            s={s}
          />
        </div>

        <KPI users={usersForSections} dateRange={dateRange} limit={runLimit} inclPER={false} />

        <ExcelSheetSection
          hasTop10={hasRows}
          users={usersForSections}
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
          onExport={(kind, userIndex, opts) => downloadExport(kind, userIndex, opts)}
        />

        <ScatterPlotSection users={usersForSections} s={s} onScatterState={setScatter} />

        <BarChartSection users={usersForSections} s={s} averageMetricKey={averageMetricKey} onMetricChange={setAverageMetricKey} />

        <BoxPlotSection users={usersForSections} s={s} averageMetricKey={averageMetricKey} />

        <LineChartSection
          rows={usersData[0]?.rows || []}
          users={usersData
            .filter((u) => u?.username && u?.timeSeries)
            .map((u) => ({
              username: u.username,
              timeSeries: u.timeSeries as TS,
            }))}
        />

        <PdfSection
          username={primaryUsername}
          username2={secondaryUsername}
          dateRange={dateRange}
          rows={usersData[0]?.rows || []}
          rows2={(usersData[1]?.rows as any[]) || []}
          excelFlags={runDefaults}
          timeSeries={timeSeriesPrimary}
          timeSeries2={timeSeriesSecondary}
          lineMetric="avg_upvotes"
          lineGranularity="day"
          insights={insights}
          scatter={scatter}
          selectors={{
            kpi: "#kpi-section",
            table: "#excel-table",
            scatter: "#scatter-mean-vs-posts",
            bar: "#bar-top25-upvotes",
            line: "#line-performance-over-time",
            insights: "#key-insights-section",
          }}
        />
      </div>
    </div>
  )
}
