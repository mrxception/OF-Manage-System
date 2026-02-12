"use client"

import React from "react"
import { Checkbox } from "@/components/ui/checkbox"

type UserSlot = { username: string; rows: any[] }

interface ExcelSheetSectionProps {
  hasTop10: boolean
  users: UserSlot[]
  fmtUTC: (iso: string) => string
  s: { [key: string]: string }
  defaults: { inclVote: boolean; inclComm: boolean; inclMed: boolean; inclSubs: boolean; inclPER: boolean }
  subsAvailable: boolean
  onExport: (
    kind: "data" | "raw",
    userIndex: number,
    opts: { inclVote: boolean; inclComm: boolean; inclMed: boolean; inclSubs: boolean; inclPER: boolean }
  ) => void
}

function measureTextPxCached(text: string, font: string, cache: Map<string, number>) {
  const key = font + "|" + (text || "")
  const hit = cache.get(key)
  if (hit != null) return hit
  const canvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d")!
  ctx.font = font
  const w = Math.ceil(ctx.measureText(text || "").width)
  cache.set(key, w)
  return w
}

function parsePostFrequency(val: string) {
  if (!val) return 0
  const dayMatch = val.match(/([\d.]+)\s*posts?\s*per\s*day/i)
  if (dayMatch) return parseFloat(dayMatch[1])
  const perMatch = val.match(/1\s*post\s*per\s*(\d+)/i)
  if (perMatch) {
    const d = parseFloat(perMatch[1])
    return d > 0 ? 1 / d : 0
  }
  return 0
}

function ratingWeight(val: string) {
  const map: Record<string, number> = { Excellent: 5, Good: 4, Average: 3, Underperforming: 2, Poor: 1 }
  return map[String(val)] ?? 0
}

export default function ExcelSheetSection({ hasTop10, users, fmtUTC, s, defaults, subsAvailable, onExport }: ExcelSheetSectionProps) {
  const normUsers = React.useMemo(() => {
    const arr = Array.isArray(users) ? users : []
    return arr
      .map((u) => ({ username: (u?.username || "").trim(), rows: Array.isArray(u?.rows) ? u.rows : [] }))
      .filter((u) => u.rows.length > 0)
  }, [users])

  const primary = normUsers[0] || { username: "", rows: [] }
  const rows = primary.rows
  const compare = normUsers.length > 1

  const containerRef = React.useRef<HTMLDivElement>(null)
  const [isOpen, setIsOpen] = React.useState(true)
  const [inclVote, setInclVote] = React.useState(defaults.inclVote)
  const [inclComm, setInclComm] = React.useState(defaults.inclComm)
  const [inclMed, setInclMed] = React.useState(defaults.inclMed)
  const [inclSubs, setInclSubs] = React.useState(subsAvailable ? defaults.inclSubs : false)
  const [inclPER, setInclPER] = React.useState(subsAvailable ? defaults.inclPER : false)

  const nonSortableSingle = React.useMemo(() => new Set(["Subreddit"]), [])
  const nonSortableCompare = React.useMemo(() => new Set(["Subreddit"]), [])
  const [sortKeySingle, setSortKeySingle] = React.useState<string | null>(null)
  const [sortDirSingle, setSortDirSingle] = React.useState<"asc" | "desc">("desc")
  const [sortKeyComp, setSortKeyComp] = React.useState<string | null>(null)
  const [sortDirComp, setSortDirComp] = React.useState<"asc" | "desc">("desc")
  const [colMinPx, setColMinPx] = React.useState<number[]>([])
  const [gridCols, setGridCols] = React.useState<string>("")
  const [toastMsg, setToastMsg] = React.useState<string | null>(null)
  const copyTimerRef = React.useRef<number | null>(null)

  const notify = React.useCallback((msg: string) => {
    setToastMsg(msg)
    if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current)
    copyTimerRef.current = window.setTimeout(() => setToastMsg(null), 1000)
  }, [])

  React.useEffect(() => () => { if (copyTimerRef.current) window.clearTimeout(copyTimerRef.current) }, [])

  const writeClipboard = React.useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      const ta = document.createElement("textarea")
      ta.value = text
      ta.style.position = "fixed"
      ta.style.opacity = "0"
      document.body.appendChild(ta)
      ta.select()
      let ok = true
      try { document.execCommand("copy") } catch { ok = false }
      document.body.removeChild(ta)
      return ok
    }
  }, [])

  const cols = React.useMemo(() => {
    const list: Array<{ key: string; label: string }> = [
      { key: "Subreddit", label: "subreddit name" },
      { key: "Total_Posts", label: "number of posts" },
      { key: "Avg_Upvotes_Per_Post", label: "av. upvotes (mean)" },
      { key: "Avg_Comments_Per_Post", label: "av. root comments" },
      { key: "Post_Frequency", label: "post frequency" },
    ]
    if (inclMed) list.splice(5, 0, { key: "Median_Upvotes", label: "median upvotes" })
    if (inclVote) list.push({ key: "Total_Upvotes", label: "total upvotes" })
    if (inclComm) list.push({ key: "Total_Comments", label: "total root comments" })
    if (subsAvailable && inclSubs) list.push({ key: "Subreddit_Subscribers", label: "subreddit member count" })
    if (subsAvailable && inclPER) { list.push({ key: "WPI_Score", label: "wpi score" }); list.push({ key: "WPI_Rating", label: "wpi rating" }) }
    list.push({ key: "LastDateTimeUTC", label: "last post date UTC" })
    return list
  }, [inclMed, inclVote, inclComm, inclSubs, inclPER, subsAvailable])

  const metrics = React.useMemo(() => cols.filter(c => c.key !== "Subreddit"), [cols])

  const preRow = React.useCallback((r: any) => {
    const o: any = { ...r }
    if (r) {
      const nU = Number(r.Total_Upvotes)
      const nC = Number(r.Total_Comments)
      const nS = Number(r.Subreddit_Subscribers)
      const nW = Number(r.WPI_Score)
      const aU = Number(r.Avg_Upvotes_Per_Post)
      const aC = Number(r.Avg_Comments_Per_Post)
      o._fmt = {
        Total_Upvotes: Number.isFinite(nU) ? nU.toLocaleString() : r.Total_Upvotes ?? "",
        Total_Comments: Number.isFinite(nC) ? nC.toLocaleString() : r.Total_Comments ?? "",
        Subreddit_Subscribers: Number.isFinite(nS) ? nS.toLocaleString() : r.Subreddit_Subscribers ?? "",
        WPI_Score: Number.isFinite(nW) ? nW.toLocaleString() : r.WPI_Score ?? "",
        Avg_Upvotes_Per_Post: Number.isFinite(aU) ? Math.round(aU).toLocaleString() : r.Avg_Upvotes_Per_Post ?? "",
        Avg_Comments_Per_Post: Number.isFinite(aC) ? Math.round(aC).toLocaleString() : r.Avg_Comments_Per_Post ?? "",
        LastDateTimeUTC: r.LastDateTimeUTC ? fmtUTC(r.LastDateTimeUTC) : "",
      }
    }
    return o
  }, [fmtUTC])

  const preRowsSingle = React.useMemo(() => (rows || []).map(preRow), [rows, preRow])

  const getSortVal = React.useCallback((r: any, key: string) => {
    const v = r?.[key]
    if (key === "Post_Frequency") return parsePostFrequency(String(v || ""))
    if (key === "WPI_Rating") return ratingWeight(String(v || ""))
    if (key === "LastDateTimeUTC") {
      const t = Date.parse(String(v || ""))
      return Number.isFinite(t) ? t : -Infinity
    }
    if (typeof v === "number") return v
    if (v == null) return -Infinity
    const num = Number(String(v).replace(/,/g, ""))
    if (!Number.isNaN(num) && String(v).trim() !== "") return num
    return String(v)
  }, [])

  const sortedRowsSingle = React.useMemo(() => {
    if (!Array.isArray(preRowsSingle) || !sortKeySingle || nonSortableSingle.has(sortKeySingle)) return preRowsSingle
    const arr = preRowsSingle.slice()
    arr.sort((a, b) => {
      const va = getSortVal(a, sortKeySingle)
      const vb = getSortVal(b, sortKeySingle)
      if (typeof va === "number" && typeof vb === "number") return sortDirSingle === "asc" ? va - vb : vb - va
      const sa = String(va)
      const sb = String(vb)
      const cmp = sa.localeCompare(sb, undefined, { numeric: true, sensitivity: "base" })
      return sortDirSingle === "asc" ? cmp : -cmp
    })
    return arr
  }, [preRowsSingle, sortKeySingle, sortDirSingle, nonSortableSingle, getSortVal])

  const onHeaderClickSingle = (key: string) => {
    if (nonSortableSingle.has(key)) return
    if (sortKeySingle !== key) {
      setSortKeySingle(key)
      setSortDirSingle("desc")
      return
    }
    setSortDirSingle(d => (d === "desc" ? "asc" : "desc"))
  }

  const widthCacheRef = React.useRef<Map<string, number>>(new Map())
  const lastMeasuredHashRef = React.useRef<string>("")

  const measureColumnsOnce = React.useCallback(() => {
    if (compare) return
    const el = containerRef.current
    if (!el) return
    const font = getComputedStyle(document.body).font || "14px system-ui, -apple-system, Segoe UI, Arial, sans-serif"
    const PADDING = 16
    const ICON_PAD = 16
    const MIN = 104
    const MAX = 380
    const SAMPLE_ROWS = 50
    const hash = cols.map(c => c.key + ":" + c.label).join("|") + "::" + String(sortedRowsSingle.length)
    if (hash === lastMeasuredHashRef.current && colMinPx.length) return
    lastMeasuredHashRef.current = hash
    const mins = cols.map((c) => {
      let need = measureTextPxCached(c.label, font, widthCacheRef.current) + ICON_PAD
      const limit = Math.min(sortedRowsSingle.length, SAMPLE_ROWS)
      for (let i = 0; i < limit; i++) {
        const r = sortedRowsSingle[i]
        let v: any = r?.[c.key]
        if (c.key === "LastDateTimeUTC") v = r?._fmt?.LastDateTimeUTC || ""
        else if (c.key === "Total_Upvotes") v = r?._fmt?.Total_Upvotes ?? r?.Total_Upvotes ?? ""
        else if (c.key === "Total_Comments") v = r?._fmt?.Total_Comments ?? r?.Total_Comments ?? ""
        else if (c.key === "Subreddit_Subscribers") v = r?._fmt?.Subreddit_Subscribers ?? r?.Subreddit_Subscribers ?? ""
        else if (c.key === "WPI_Score") v = r?._fmt?.WPI_Score ?? r?.WPI_Score ?? ""
        else if (c.key === "Avg_Upvotes_Per_Post") v = r?._fmt?.Avg_Upvotes_Per_Post ?? r?.Avg_Upvotes_Per_Post ?? ""
        else if (c.key === "Avg_Comments_Per_Post") v = r?._fmt?.Avg_Comments_Per_Post ?? r?.Avg_Comments_Per_Post ?? ""
        else v = v ?? ""
        const w = measureTextPxCached(String(v), font, widthCacheRef.current)
        if (w > need) need = w
      }
      return Math.max(MIN, Math.min(MAX, need + PADDING))
    })
    setColMinPx(mins)
  }, [compare, cols, sortedRowsSingle, colMinPx.length])

  const computeGrid = React.useCallback(() => {
    if (compare) return
    if (!containerRef.current || colMinPx.length === 0) return
    const el = containerRef.current
    const contentWidth = Math.floor(el.clientWidth)
    const sum = colMinPx.reduce((t, x) => t + x, 48)
    if (sum <= contentWidth) setGridCols(`48px ${colMinPx.map((w) => `minmax(${w}px, 1fr)`).join(" ")}`)
    else setGridCols(`48px ${colMinPx.map((w) => `${w}px`).join(" ")}`)
  }, [compare, colMinPx])

  const rafIdRef = React.useRef<number | null>(null)
  const lastWidthRef = React.useRef<number>(0)

  const onResize = React.useCallback(() => {
    if (!containerRef.current) return
    const w = containerRef.current.clientWidth
    if (w === lastWidthRef.current) return
    lastWidthRef.current = w
    if (rafIdRef.current != null) cancelAnimationFrame(rafIdRef.current)
    rafIdRef.current = requestAnimationFrame(() => {
      measureColumnsOnce()
      computeGrid()
    })
  }, [measureColumnsOnce, computeGrid])

  React.useEffect(() => {
    if (!isOpen || compare) return
    measureColumnsOnce()
    computeGrid()
  }, [isOpen, compare, measureColumnsOnce, computeGrid])

  React.useEffect(() => {
    if (compare) return
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(onResize)
    ro.observe(el)
    return () => {
      ro.disconnect()
      if (rafIdRef.current != null) cancelAnimationFrame(rafIdRef.current)
    }
  }, [compare, onResize])

  const bySubs = React.useMemo(() => {
    const arr = normUsers.map(() => new Map<string, any>())
    normUsers.forEach((u, i) => {
      for (const r of u.rows || []) if (r?.Subreddit) arr[i].set(r.Subreddit, r)
    })
    return arr
  }, [normUsers])

  const overlapSubs: string[] = React.useMemo(() => {
    if (!compare) return []
    const sets = normUsers.map((u) => new Set<string>((u.rows || []).map((r: any) => r?.Subreddit).filter(Boolean)))
    if (sets.length === 0) return []
    const [first, ...rest] = sets
    const inter: string[] = []
    first.forEach((su) => {
      if (rest.every((s) => s.has(su))) inter.push(su)
    })
    inter.sort((x, y) => x.localeCompare(y))
    return inter
  }, [compare, normUsers])

  const sortedSubsComp = React.useMemo(() => {
    const base = overlapSubs
    if (!sortKeyComp) return base
    const [metric, whoStr] = sortKeyComp.split("__")
    const who = Number(whoStr)
    const arr = base.slice()

    const getVal = (sub: string) => {
      const src = bySubs[who]?.get(sub)
      const v = src ? src[metric] : null
      if (metric === "Post_Frequency") return parsePostFrequency(String(v || ""))
      if (metric === "WPI_Rating") return ratingWeight(String(v || ""))
      if (metric === "LastDateTimeUTC") {
        const t = Date.parse(String(v || ""))
        return Number.isFinite(t) ? t : -Infinity
      }
      if (typeof v === "number") return v
      if (v == null) return -Infinity
      const num = Number(String(v).replace(/,/g, ""))
      if (!Number.isNaN(num) && String(v).trim() !== "") return num
      return String(v)
    }

    arr.sort((a, b) => {
      const va = getVal(a)
      const vb = getVal(b)
      if (typeof va === "number" && typeof vb === "number") return sortDirComp === "asc" ? va - vb : vb - va
      const sa = String(va)
      const sb = String(vb)
      const cmp = sa.localeCompare(sb, undefined, { numeric: true, sensitivity: "base" })
      return sortDirComp === "asc" ? cmp : -cmp
    })

    return arr
  }, [overlapSubs, sortKeyComp, sortDirComp, bySubs])

  const onHeaderClickComp = (compoundKey: string) => {
    const [metric] = compoundKey.split("__")
    if (nonSortableCompare.has(metric)) return
    if (sortKeyComp !== compoundKey) {
      setSortKeyComp(compoundKey)
      setSortDirComp("desc")
      return
    }
    setSortDirComp(d => (d === "desc" ? "asc" : "desc"))
  }

  const gridTemplateColumnsComp = React.useMemo(() => {
    const num = "48px"
    const left = "minmax(200px, 280px)"
    const each = "minmax(140px, 1fr)"
    const segs: string[] = [num, left]
    for (const _ of metrics) for (let i = 0; i < normUsers.length; i++) segs.push(each)
    return segs.join(" ")
  }, [metrics, normUsers.length])

  const renderCellValue = (metricKey: string, rowObj: any) => {
    if (!rowObj) return ""
    if (metricKey === "LastDateTimeUTC") return rowObj._fmt?.LastDateTimeUTC ?? (rowObj.LastDateTimeUTC ? fmtUTC(rowObj.LastDateTimeUTC) : "")
    if (metricKey === "Total_Upvotes") return rowObj._fmt?.Total_Upvotes ?? rowObj.Total_Upvotes ?? ""
    if (metricKey === "Total_Comments") return rowObj._fmt?.Total_Comments ?? rowObj.Total_Comments ?? ""
    if (metricKey === "Subreddit_Subscribers") return rowObj._fmt?.Subreddit_Subscribers ?? rowObj.Subreddit_Subscribers ?? ""
    if (metricKey === "WPI_Score") return rowObj._fmt?.WPI_Score ?? rowObj.WPI_Score ?? ""
    if (metricKey === "Avg_Upvotes_Per_Post") return rowObj._fmt?.Avg_Upvotes_Per_Post ?? rowObj.Avg_Upvotes_Per_Post ?? ""
    if (metricKey === "Avg_Comments_Per_Post") return rowObj._fmt?.Avg_Comments_Per_Post ?? rowObj.Avg_Comments_Per_Post ?? ""
    return rowObj[metricKey] ?? ""
  }

  const onTableClick = React.useCallback(async (e: React.MouseEvent) => {
    const t = e.target as HTMLElement
    const target = t.closest("[data-sub]") as HTMLElement | null
    if (!target) return
    const name = target.getAttribute("data-sub") || ""
    if (!name) return
    const ok = await writeClipboard(name)
    if (ok) notify("Subreddit copied!")
  }, [notify, writeClipboard])

  const copyAllSubs = React.useCallback(async () => {
    if (!rows || rows.length === 0) return
    const list = compare ? sortedSubsComp : (sortedRowsSingle || []).map((r: any) => r?.Subreddit).filter(Boolean)
    if (!list.length) return
    const ok = await writeClipboard(list.join("\n"))
    if (ok) notify("Subreddits copied!")
  }, [compare, sortedRowsSingle, sortedSubsComp, rows, writeClipboard, notify])

  if (!rows || rows.length === 0) return null

  const CheckboxRow = () => (
    <div className="mt-1 mb-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      <label htmlFor="inclVote" className="flex items-center gap-2 cursor-pointer">
        <Checkbox id="inclVote" checked={inclVote} onCheckedChange={(v) => setInclVote(Boolean(v))} className="size-5 rounded-full border-1 bg-[var(--color-background)] border-[var(--color-primary)]" />
        <span className="text-sm text-foreground">Total upvotes</span>
      </label>
      <label htmlFor="inclComm" className="flex items-center gap-2 cursor-pointer">
        <Checkbox id="inclComm" checked={inclComm} onCheckedChange={(v) => setInclComm(Boolean(v))} className="size-5 rounded-full border-1 bg-[var(--color-background)] border-[var(--color-primary)]" />
        <span className="text-sm text-foreground">Total comments</span>
      </label>
      <label htmlFor="inclMed" className="flex items-center gap-2 cursor-pointer">
        <Checkbox id="inclMed" checked={inclMed} onCheckedChange={(v) => setInclMed(Boolean(v))} className="size-5 rounded-full border-1 bg-[var(--color-background)] border-[var(--color-primary)]" />
        <span className="text-sm text-foreground">Median average upvotes per post</span>
      </label>
      {subsAvailable && (
        <>
          <label htmlFor="inclSubs" className="flex items-center gap-2 cursor-pointer">
            <Checkbox id="inclSubs" checked={inclSubs} onCheckedChange={(v) => setInclSubs(Boolean(v))} className="size-5 rounded-full border-1 bg-[var(--color-background)] border-[var(--color-primary)]" />
            <span className="text-sm text-foreground">Subreddit member count</span>
          </label>
          <label htmlFor="inclPER" className="flex items-center gap-2 cursor-pointer">
            <Checkbox id="inclPER" checked={inclPER} onCheckedChange={(v) => setInclPER(Boolean(v))} className="size-5 rounded-full border-1 bg-[var(--color-background)] border-[var(--color-primary)]" />
            <span className="text-sm text-foreground">Performance rating</span>
          </label>
        </>
      )}
    </div>
  )

  const titleNames = compare
    ? normUsers.map((u) => (u.username ? `u/${u.username}` : "user")).join(" vs ")
    : (primary.username ? `u/${primary.username}` : "")

  return (
    <div className="rounded-lg border border-border bg-card" id="excel-table">
      <header className="p-6 cursor-pointer flex justify-between items-center" onClick={() => setIsOpen(v => !v)} aria-expanded={isOpen} aria-controls="excel-content">
        <div className="flex items-center gap-2 text-xl font-bold">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ color: "var(--sidebar-primary)" }}>
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M3 9h18M9 3v18" />
          </svg>
          <h3 className="text-xl font-bold">Subreddit Performance Table{titleNames ? ` for ${titleNames}` : ""}</h3>
        </div>
        <svg className={`w-6 h-6 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </header>

      {isOpen && (
        <div id="excel-content" className="px-4 md:px-6 pb-4 md:pb-6">
          {!compare && (
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className={s.hint}>Displaying {rows.length} subreddits (scroll to view all)</p>
            </div>
          )}
          {compare && (
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className={s.hint}>Displaying {overlapSubs.length} overlapping subreddits {overlapSubs.length === 0 ? "(none)" : "(scroll to view all)"}</p>
            </div>
          )}

          <CheckboxRow />

          {hasTop10 && !compare && (
            <div className={s.clipWrap}>
              <div className={s.tableContainer} ref={containerRef} onClick={onTableClick}>
                <div
                  className={s.excel}
                  role="table"
                  aria-label="Subreddit Performance (single)"
                  style={{ gridTemplateColumns: gridCols || `48px repeat(${cols.length}, minmax(156px, 1fr))`, minWidth: "860px" }}
                >
                  <div className={`${s.cell} ${s.corner}`} aria-hidden="true"> </div>
                  {cols.map((c, i) => {
                    const clickable = !nonSortableSingle.has(c.key)
                    const label = sortKeySingle === c.key ? `${c.label} ${sortDirSingle === "desc" ? "▼" : "▲"}` : c.label
                    const isSub = c.key === "Subreddit"
                    return (
                      <div
                        key={`col-${c.key}`}
                        className={`${s.cell} ${s.colhead}`}
                        role="columnheader"
                        aria-colindex={i + 1}
                        title={c.label}
                        onClick={() => clickable && onHeaderClickSingle(c.key)}
                        style={{ cursor: clickable ? "pointer" : "default" }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span>{label}</span>
                          {isSub && (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); copyAllSubs() }}
                              aria-label="Copy all subreddits"
                              className="rounded hover:text-primary transition-colors"
                              title="Copy all subreddits"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 -960 960 960" fill="currentColor">
                                <path d="M360-240q-33 0-56.5-23.5T280-320v-480q0-33 23.5-56.5T360-880h360q33 0 56.5 23.5T800-800v480q0 33-23.5 56.5T720-240H360Zm0-80h360v-480H360v480ZM200-80q-33 0-56.5-23.5T120-160v-560h80v560h440v80H200Zm160-240v-480 480Z" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  {sortedRowsSingle.map((row: any, r: number) => (
                    <React.Fragment key={`row-${r}`}>
                      <div className={`${s.cell} ${s.rowhead}`} role="rowheader">{r + 1}</div>
                      {cols.map((c) => {
                        const isSub = c.key === "Subreddit"
                        let val: any
                        if (c.key === "Subreddit") val = row?.Subreddit ?? ""
                        else if (c.key === "LastDateTimeUTC") val = row?._fmt?.LastDateTimeUTC ?? ""
                        else if (c.key === "Total_Upvotes") val = row?._fmt?.Total_Upvotes ?? ""
                        else if (c.key === "Total_Comments") val = row?._fmt?.Total_Comments ?? ""
                        else if (c.key === "Subreddit_Subscribers") val = row?._fmt?.Subreddit_Subscribers ?? ""
                        else if (c.key === "WPI_Score") val = row?._fmt?.WPI_Score ?? ""
                        else if (c.key === "Avg_Upvotes_Per_Post") val = row?._fmt?.Avg_Upvotes_Per_Post ?? ""
                        else if (c.key === "Avg_Comments_Per_Post") val = row?._fmt?.Avg_Comments_Per_Post ?? ""
                        else val = row?.[c.key] ?? ""
                        return (
                          <div
                            key={`${r}-${c.key}`}
                            className={`${s.cell} ${isSub ? "cursor-pointer select-none" : ""}`}
                            role="cell"
                            title={String(val ?? "")}
                            data-sub={isSub ? String(val ?? "") : undefined}
                          >
                            {val ?? ""}
                          </div>
                        )
                      })}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          )}

          {hasTop10 && compare && overlapSubs.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">No Subreddits overlap</div>
          )}

          {hasTop10 && compare && overlapSubs.length > 0 && (
            <div className={s.clipWrap}>
              <div className={s.tableContainer} ref={containerRef}>
                <div
                  className={s.stickyHeaderGroup}
                  style={{ gridTemplateColumns: gridTemplateColumnsComp }}
                  role="presentation"
                >
                  <div className={`${s.thCell} ${s.thRow1}`} />
                  <div className={`${s.thCell} ${s.thRow1}`} />
                  {metrics.map((m) => (
                    <div key={`g-${m.key}`} className={`${s.thCell} ${s.thRow1}`} style={{ gridColumn: `span ${normUsers.length}` }}>
                      {m.label}
                    </div>
                  ))}

                  <div className={s.thCell} />
                  <div className={s.thCell}>
                    <div className="flex items-center justify-between gap-2">
                      <span>Subreddit</span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); copyAllSubs() }}
                        aria-label="Copy all subreddits"
                        className="rounded hover:text-primary transition-colors"
                        title="Copy all subreddits"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 -960 960 960" fill="currentColor">
                          <path d="M360-240q-33 0-56.5-23.5T280-320v-480q0-33 23.5-56.5T360-880h360q33 0 56.5 23.5T800-800v480q0 33-23.5 56.5T720-240H360Zm0-80h360v-480H360v480ZM200-80q-33 0-56.5-23.5T120-160v-560h80v560h440v80H200Zm160-240v-480 480Z" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {metrics.map((m) =>
                    normUsers.map((u, ui) => (
                      <div
                        key={`h-${m.key}-${ui}`}
                        className={s.thCell}
                        onClick={() => onHeaderClickComp(`${m.key}__${ui}`)}
                        style={{ cursor: nonSortableCompare.has(m.key) ? "default" : "pointer" }}
                      >
                        {sortKeyComp === `${m.key}__${ui}` ? `${u.username || `user${ui + 1}`} ${sortDirComp === "desc" ? "▼" : "▲"}` : (u.username || `user${ui + 1}`)}
                      </div>
                    ))
                  )}
                </div>

                <div
                  className={s.excel}
                  style={{ gridTemplateColumns: gridTemplateColumnsComp, minWidth: "860px" }}
                  role="table"
                  aria-label="Subreddit Performance (compare)"
                >
                  <div className={`${s.cell} ${s.corner} ${s.headerSpacer}`} />
                  <div className={`${s.cell} ${s.colhead} ${s.headerSpacer}`} />
                  {metrics.map((m) => (
                    <div key={`p1-${m.key}`} className={`${s.cell} ${s.colhead} ${s.headerSpacer}`} style={{ gridColumn: `span ${normUsers.length}` }} />
                  ))}
                  <div className={`${s.cell} ${s.colhead} ${s.headerSpacer}`} />
                  <div className={`${s.cell} ${s.colhead} ${s.headerSpacer}`} />
                  {metrics.map((m) =>
                    normUsers.map((_, ui) => (
                      <div key={`p2-${m.key}-${ui}`} className={`${s.cell} ${s.colhead} ${s.headerSpacer}`} />
                    ))
                  )}

                  {sortedSubsComp.map((sub, rIndex) => (
                    <React.Fragment key={`row-${sub}`}>
                      <div className={`${s.cell} ${s.rowhead}`}>{rIndex + 1}</div>
                      <div
                        className={`${s.cell} ${s.rowhead} cursor-pointer select-none`}
                        style={{ textAlign: "left", fontWeight: 600 }}
                        title="Click to copy subreddit"
                        onClick={() => writeClipboard(sub).then(ok => ok && notify("Subreddit copied!"))}
                        aria-label={`Copy subreddit ${sub}`}
                      >
                        {sub}
                      </div>

                      {metrics.map((m) =>
                        normUsers.map((_, ui) => {
                          const raw = bySubs[ui]?.get(sub)
                          const pr = preRow(raw)
                          const v = renderCellValue(m.key, pr)
                          return (
                            <div key={`${sub}-${m.key}-${ui}`} className={s.cell} role="cell" title={String(v ?? "")}>
                              {v ?? ""}
                            </div>
                          )
                        })
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="mt-4 flex items-center justify-end gap-2 flex-wrap">
            {!compare && (
              <>
                <button
                  type="button"
                  className={`inline-flex items-center rounded-md px-3 py-2 text-sm font-medium ${s.mini}`}
                  onClick={() => onExport("data", 0, { inclVote, inclComm, inclMed, inclSubs: subsAvailable && inclSubs, inclPER: subsAvailable && inclPER })}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2M12 3v12m0 0 4-4m-4 4-4-4" /></svg>
                  Export Data to Excel
                </button>
                <button
                  type="button"
                  className={`inline-flex items-center rounded-md px-3 py-2 text-sm font-medium ${s.mini}`}
                  onClick={() => onExport("raw", 0, { inclVote, inclComm, inclMed, inclSubs: subsAvailable, inclPER: subsAvailable && inclPER })}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2M12 3v12m0 0 4-4m-4 4-4-4" /></svg>
                  Export Individual Post Data to Excel
                </button>
              </>
            )}

            {compare && (
              <>
                {normUsers.map((u, ui) => (
                  <React.Fragment key={`exp-${ui}`}>
                    <button
                      type="button"
                      className={`inline-flex items-center rounded-md px-3 py-2 text-sm font-medium ${s.mini}`}
                      onClick={() => onExport("data", ui, { inclVote, inclComm, inclMed, inclSubs: subsAvailable && inclSubs, inclPER: subsAvailable && inclPER })}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2M12 3v12m0 0 4-4m-4 4-4-4" /></svg>
                      Export Data ({u.username ? `u/${u.username}` : `user${ui + 1}`})
                    </button>
                    <button
                      type="button"
                      className={`inline-flex items-center rounded-md px-3 py-2 text-sm font-medium ${s.mini}`}
                      onClick={() => onExport("raw", ui, { inclVote, inclComm, inclMed, inclSubs: subsAvailable, inclPER: subsAvailable && inclPER })}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2M12 3v12m0 0 4-4m-4 4-4-4" /></svg>
                      Export Raw ({u.username ? `u/${u.username}` : `user${ui + 1}`})
                    </button>
                  </React.Fragment>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {toastMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] rounded-md bg-foreground text-background px-3 py-2 text-sm shadow-lg" role="status" aria-live="polite">
          {toastMsg}
        </div>
      )}
    </div>
  )
}
