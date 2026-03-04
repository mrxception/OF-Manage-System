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
import KPI from "./kpi-section"
import PdfSection from "./pdf-section"

type UsernameOption = { id: string; name: string; username: string }
type ManagerOption = { id: string; name: string; usernames: UsernameOption[] }
type CompareSlot = { baseId: string; managerId: string; usernameId: string }

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
  cqs?: string | null
}

export default function Scraper() {
  const [baseConfigs, setBaseConfigs] = useState<{ id: string; name: string }[]>([])
  const [basesLoading, setBasesLoading] = useState(true)
  const [baseId, setBaseId] = useState("")

  const [managersMap, setManagersMap] = useState<Record<string, ManagerOption[]>>({})
  const [managersLoading, setManagersLoading] = useState(false)
  const [managersError, setManagersError] = useState<string | null>(null)

  const [managerId, setManagerId] = useState("")
  const [usernameId, setUsernameId] = useState("")

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

  function getSelectedUsername(bId: string, mgrId: string, usrId: string): UsernameOption | null {
    const mgrs = managersMap[bId] || []
    const mgr = mgrs.find((m) => m.id === mgrId)
    if (!mgr) return null
    const usr = mgr.usernames.find((mm) => mm.id === usrId)
    return usr || null
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
    setBasesLoading(true)
    fetch("/api/scraper?type=bases")
      .then(res => res.json())
      .then(data => {
        if (alive && data.bases) setBaseConfigs(data.bases)
      })
      .catch(() => {
        if (alive) setStatus("Failed to load Airtable bases.")
      })
      .finally(() => {
        if (alive) setBasesLoading(false)
      })
    return () => { alive = false }
  }, [])

  useEffect(() => {
    const neededBases = Array.from(new Set([baseId, ...comparisons.map((c) => c.baseId)].filter(Boolean)))
    const toFetch = neededBases.filter((id) => !managersMap[id])

    if (toFetch.length === 0) return

    let alive = true
    setManagersLoading(true)
    setManagersError(null)

    Promise.all(
      toFetch.map((id) =>
        fetch(`/api/scraper?configId=${id}`, { cache: "no-store" })
          .then((res) => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            return res.json()
          })
          .then((data) => ({ id, managers: data.managers || [] }))
      )
    )
      .then((results) => {
        if (!alive) return
        setManagersMap((prev) => {
          const next = { ...prev }
          results.forEach((r) => {
            next[r.id] = r.managers
          })
          return next
        })
      })
      .catch((e: any) => {
        if (alive) setManagersError(e.message || "Failed to load managers.")
      })
      .finally(() => {
        if (alive) setManagersLoading(false)
      })

    return () => {
      alive = false
    }
  }, [baseId, comparisons, managersMap])

  async function readServerError(res: Response) {
    let reason = res.statusText
    try {
      const j = await res.json()
      if (j?.error) reason = j.error
    } catch {}
    return reason || `HTTP ${res.status}`
  }

  async function loadSavedByUsername(token: string, username: string, bId: string) {
    const r = await fetch("/api/scraper/model", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ username, baseId: bId }),
    })

    if (r.status === 404) return { ok: false as const, notFound: true as const, payload: null, cqs: null as string | null }
    if (!r.ok) {
      const reason = await readServerError(r)
      return { ok: false as const, notFound: false as const, payload: null, cqs: null as string | null, reason }
    }

    const j = await r.json()
    return {
      ok: true as const,
      notFound: false as const,
      payload: j?.payload ?? null,
      cqs: typeof j?.cqs === "string" ? j.cqs : null,
    }
  }

  function normalizeUserFromPayload(username: string, payload: any, cqs?: string | null): UserDataset {
    const rows = Array.isArray(payload?.preview) ? payload.preview : Array.isArray(payload?.preview2) ? payload.preview2 : []
    const rawRows = Array.isArray(payload?.rawRows) ? payload.rawRows : Array.isArray(payload?.rawRows2) ? payload.rawRows2 : null
    const timeSeries = payload?.timeSeries ?? payload?.timeSeries2 ?? null
    return { username, rows, rawRows, timeSeries, cqs: typeof cqs === "string" ? cqs : null }
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

    if (!baseId) {
      setStatus("Please select a model (base).")
      setMsg({ type: "err", text: "Please select a model (base)." })
      return
    }

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

    const primary = getSelectedUsername(baseId, managerId, usernameId)
    if (!primary) {
      setStatus("Please select a manager and username.")
      setMsg({ type: "err", text: "Please select a manager and username." })
      return
    }

    const resolvedComparisons = comparisons.map((c) => getSelectedUsername(c.baseId, c.managerId, c.usernameId))
    if (comparisons.length > 0 && resolvedComparisons.some((x) => !x)) {
      setStatus("Please complete all comparison selections (base + manager + username).")
      setMsg({ type: "err", text: "Please complete all comparison selections." })
      return
    }

    const frozen1 = (primary.username || "").trim()
    const frozenCompUsernames = resolvedComparisons
      .filter((x): x is UsernameOption => !!x)
      .map((x) => (x.username || "").trim())
      .filter(Boolean)
      .slice(0, 5)

    const frozenAll = [frozen1, ...frozenCompUsernames].filter(Boolean)

    const frozenAllWithBase = [
      { username: frozen1, baseId: baseId },
      ...resolvedComparisons
        .map((x, i) => (x ? { username: x.username.trim(), baseId: comparisons[i].baseId } : null))
        .filter(Boolean)
    ] as { username: string; baseId: string }[]

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

    const saved = await Promise.all(frozenAllWithBase.map((u) => loadSavedByUsername(token, u.username, u.baseId)))

    const allFound = saved.every((x) => x.ok && x.payload)
    if (allFound) {
      const mergedUsers = frozenAll.map((uname, i) => normalizeUserFromPayload(uname, saved[i].payload, saved[i].cqs))
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
      mergedUsers.push({
        username: frozen1,
        rows: Array.isArray(payload?.preview) ? payload.preview : [],
        rawRows: Array.isArray(payload?.rawRows) ? payload.rawRows : null,
        timeSeries: payload?.timeSeries ?? null,
        cqs: typeof payload?.cqs === "string" ? payload.cqs : null,
      })

      const previews: any[] = Array.isArray(payload?.previews) ? payload.previews : []
      const rawRowsList: any[] = Array.isArray(payload?.rawRowsList) ? payload.rawRowsList : []
      const timeSeriesList: any[] = Array.isArray(payload?.timeSeriesList) ? payload.timeSeriesList : []

      frozenCompUsernames.forEach((uname, idx) => {
        const rows = Array.isArray(previews[idx]) ? previews[idx] : Array.isArray(payload?.[`preview${idx + 2}`]) ? payload[`preview${idx + 2}`] : []
        const raw = Array.isArray(rawRowsList[idx]) ? rawRowsList[idx] : Array.isArray(payload?.[`rawRows${idx + 2}`]) ? payload[`rawRows${idx + 2}`] : null
        const ts = timeSeriesList[idx] ?? payload?.[`timeSeries${idx + 2}`] ?? null
        mergedUsers.push({ username: uname, rows, rawRows: raw, timeSeries: ts, cqs: null })
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

  const usersForSections = usersData.map((u) => ({ username: u.username, rows: u.rows, cqs: u.cqs ?? null }))

  const usersForPdf = usersData
    .filter((u) => u?.username && Array.isArray(u?.rows) && u.rows.length > 0)
    .map((u) => ({
      username: u.username,
      rows: u.rows,
      timeSeries: u.timeSeries ?? null,
      cqs: u.cqs ?? null,
    }))
    
  return (
    <div className={`min-h-screen bg-background p-4 md:p-6 ${s.bgPattern}`}>
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-lg p-4 md:p-6">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Subreddit Performance Analysis (SPA)</h1>
          <p className="text-sm md:text-base text-muted-foreground mb-6">
            Select a model (base), manager, and username to analyze subreddit performance. Add up to 5 comparison usernames.
          </p>

          {basesLoading ? (
            <div className="flex flex-col items-center justify-center p-12 space-y-4 border border-border/60 rounded-xl bg-card/80 backdrop-blur shadow-lg shadow-black/20">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm font-medium text-muted-foreground">Fetching Airtable Bases...</p>
            </div>
          ) : (
            <Form
              progRef={progRef}
              status={uiStatus}
              busy={uiBusy}
              onSubmit={onSubmit}
              baseConfigs={baseConfigs}
              baseId={baseId}
              setBaseId={(v) => {
                setBaseId(v)
                setManagerId("")
                setUsernameId("")
              }}
              managersMap={managersMap}
              managers={managersMap[baseId] || []}
              managerId={managerId}
              setManagerId={(v) => {
                setManagerId(v)
                setUsernameId("")
              }}
              usernameId={usernameId}
              setUsernameId={setUsernameId}
              comparisons={comparisons}
              setComparisons={setComparisons}
              s={s}
            />
          )}
        </div>

        <KPI users={usersForSections} dateRange={dateRange} limit={runLimit} inclPER={false} />

        <ExcelSheetSection
          hasTop10={hasRows}
          users={usersForSections as any}
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

        <ScatterPlotSection users={usersForSections as any} s={s} onScatterState={setScatter} />

        <BarChartSection users={usersForSections as any} s={s} averageMetricKey={averageMetricKey} onMetricChange={setAverageMetricKey} />

        <BoxPlotSection users={usersForSections as any} s={s} averageMetricKey={averageMetricKey} />

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
          users={usersForPdf}
          dateRange={dateRange}
          excelFlags={runDefaults}
          lineMetric="avg_upvotes"
          lineGranularity="day"
          insights={insights}
          scatter={scatter}
        />
      </div>
    </div>
  )
}