// kpi-section.tsx
"use client"

import React, { useMemo } from "react"
import KPIItem from "./kpi-item"

type KPIUser = { username: string; rows: any[]; cqs?: string | null }

interface KPIProps {
  users?: KPIUser[]
  dateRange?: string
  limit?: number
  inclPER?: boolean
}

export default function KPI({ users = [], dateRange = "all", limit = 1000, inclPER = false }: KPIProps) {
  const compute = (arrIn: any[]) => {
    const arr = Array.isArray(arrIn) ? arrIn : []
    const sum = (xs: any[], f: (x: any) => number) => xs.reduce((t, x) => t + (Number(f(x)) || 0), 0)
    const toInt = (n: number) => (Number.isFinite(n) ? Math.round(n) : 0)
    const hasMedian = arr.some((r) => typeof r.Median_Upvotes_Per_Post === "number")
    const avgKey = hasMedian ? "Median_Upvotes_Per_Post" : "Avg_Upvotes_Per_Post"
    const totalPosts = toInt(sum(arr, (r) => r.Total_Posts || 0))
    const timeNote = "The number of posts from the past month"
    const haveTotals = arr.some((r) => typeof r.Total_Upvotes === "number")
    const overallUpvotes = toInt(
      haveTotals ? sum(arr, (r) => r.Total_Upvotes || 0) : sum(arr, (r) => (r[avgKey] || 0) * (r.Total_Posts || 0))
    )
    const topSub = arr.slice().sort((a, b) => (b[avgKey] || 0) - (a[avgKey] || 0))[0] || null
    const opp = arr
      .map((r) => {
        const avg = Number(r[avgKey] || 0)
        const posts = Math.max(1, Number(r.Total_Posts || 0))
        const subs = Math.max(0, Number(r.Subreddit_Subscribers || 0))
        const subFactor = subs > 0 ? Math.log1p(subs) : 1
        const wpi = inclPER ? Math.max(1, Number(r.WPI_Score || 1)) : 1
        const score = (avg * subFactor * wpi) / Math.sqrt(posts)
        return { name: r.Subreddit, score }
      })
      .sort((a, b) => b.score - a.score)[0]
    return {
      totalPosts,
      overallUpvotes,
      topSubreddit: topSub?.Subreddit || "—",
      biggestOpportunity: opp?.name || "—",
      avgKeyLabel: hasMedian ? "Median Upvotes Per Post" : "Avg Upvotes Per Post",
      timeNote,
    }
  }

  const normalized = useMemo(() => {
    const arr = Array.isArray(users) ? users : []
    return arr
      .map((u) => ({
        username: (u?.username || "").trim() || "User",
        rows: Array.isArray(u?.rows) ? u.rows : [],
        cqs: typeof u?.cqs === "string" ? u.cqs : null,
      }))
      .filter((u) => u.rows.length > 0)
  }, [users])

  const computed = useMemo(
    () => normalized.map((u) => ({ ...u, k: compute(u.rows) })),
    [normalized, dateRange, limit, inclPER]
  )

  if (computed.length === 0) return null

  if (computed.length === 1) {
    const u = computed[0]
    return (
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4" id="kpi-section">
        <KPIItem icon="search" title="Total Posts Analyzed" value={u.k.totalPosts.toLocaleString()} note={u.k.timeNote} ariaLabel="Total posts analyzed" />
        <KPIItem icon="trend" title="Overall Upvote Score" value={u.k.overallUpvotes.toLocaleString()} note="Sum of upvotes across analyzed posts" ariaLabel="Overall upvote score" />
        <KPIItem icon="shield" title="Contributor Quality Score" value={u.cqs || "—"} note="CQS rating" ariaLabel="Contributor quality score" />
        <KPIItem icon="trophy" title="Top Subreddit" value={u.k.topSubreddit} note={`Highest ${u.k.avgKeyLabel}`} ariaLabel="Top subreddit by average upvotes" />
        <KPIItem icon="target" title="Biggest Opportunity" value={u.k.biggestOpportunity} note="High potential performance but under utilized" ariaLabel="Biggest opportunity subreddit" />
      </div>
    )
  }

  return (
    <div className="mt-4 space-y-6" id="kpi-section">
      {computed.map((u, idx) => (
        <div key={`${u.username}-${idx}`} className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <KPIItem icon="search" title={`Total Posts • ${u.username}`} value={u.k.totalPosts.toLocaleString()} note={u.k.timeNote} ariaLabel={`Total posts analyzed ${u.username}`} />
          <KPIItem icon="trend" title={`Overall Upvote Score • ${u.username}`} value={u.k.overallUpvotes.toLocaleString()} note="Sum of upvotes across analyzed posts" ariaLabel={`Overall upvote score ${u.username}`} />
          <KPIItem icon="shield" title={`Contributor Quality Score • ${u.username}`} value={u.cqs || "—"} note="CQS rating" ariaLabel={`Contributor quality score ${u.username}`} />
          <KPIItem icon="trophy" title={`Top Subreddit • ${u.username}`} value={u.k.topSubreddit} note={`Highest ${u.k.avgKeyLabel}`} ariaLabel={`Top subreddit by average upvotes ${u.username}`} />
          <KPIItem icon="target" title={`Biggest Opportunity • ${u.username}`} value={u.k.biggestOpportunity} note="High potential performance but under utilized" ariaLabel={`Biggest opportunity subreddit ${u.username}`} />
        </div>
      ))}
    </div>
  )
}
