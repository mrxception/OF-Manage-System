// bar-chart.tsx
"use client"

import React, { useMemo } from "react"
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Label, Cell, Legend } from "recharts"

type AxisDomain = [number, number]
type MetricKey =
  | "Value"
  | "Avg_Upvotes_Per_Post"
  | "Median_Upvotes"
  | "Total_Upvotes"
  | "Total_Comments"
  | "WPI_Score"

interface Props {
  data: any[]
  domain: AxisDomain
  metric: MetricKey
  label: string
  legend?: { label: string; color: string }[]
}

const CustomTooltip = ({ active, payload, label, metric }: any) => {
  if (!active || !payload || !payload.length) return null
  const row = payload[0]?.payload || {}
  const val = Number(row[metric] ?? 0)
  return (
    <div className="bg-card/90 backdrop-blur p-3 rounded-md border border-border shadow-lg">
      <p className="font-bold" style={{ color: row?.__color || "var(--sidebar-primary)" }}>
        {row?.Subreddit || "Subreddit"}
      </p>
      <p className="text-sm">{`${label}: ${Number.isFinite(val) ? val.toLocaleString() : "0"}`}</p>
      {Number.isFinite(Number(row?.Total_Posts)) && (
        <p className="text-sm text-muted-foreground">{`Total Posts: ${Number(row.Total_Posts ?? 0).toLocaleString()}`}</p>
      )}
      {row?.__userLabel && <p className="text-sm text-muted-foreground">{row.__userLabel}</p>}
    </div>
  )
}

export default function BarChartView({ data, domain, metric, label, legend }: Props) {
  const chartData = useMemo(() => {
    if (!Array.isArray(data)) return []
    return [...data].reverse()
  }, [data])

  const tickColor = "var(--muted-foreground)"
  const gridStroke = "color-mix(in oklch, var(--muted-foreground) 15%, transparent)"

  const LegendContent = (props: any) => {
    if (!legend || legend.length === 0) return null
    return (
      <div className="flex items-center gap-4 flex-wrap">
        {legend.map((it) => (
          <div key={it.label} className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ background: it.color }} aria-hidden="true" />
            <span className="text-sm text-muted-foreground">{it.label}</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={chartData} layout="vertical" margin={{ top: legend?.length ? 10 : 20, right: 40, left: 60, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke as any} />
        <XAxis
          type="number"
          domain={domain}
          allowDataOverflow
          tick={{ fill: tickColor }}
          stroke={tickColor}
          tickCount={12}
          allowDecimals={false}
          tickFormatter={(t) => new Intl.NumberFormat(undefined, { maximumFractionDigits: 0, minimumFractionDigits: 0 }).format(Number(t))}
        >
          <Label value={label} offset={-15} position="insideBottom" fill={tickColor} />
        </XAxis>
        <YAxis dataKey="Subreddit" type="category" tick={{ fill: tickColor }} stroke={tickColor} width={140} interval={0} />
        <Tooltip content={<CustomTooltip metric={metric} label={label} />} cursor={{ fill: "rgba(125,125,125,0.06)" }} />
        {legend?.length ? <Legend verticalAlign="top" align="left" height={36} content={<LegendContent />} /> : null}
        <Bar dataKey={metric} name={label} isAnimationActive={false}>
          {chartData.map((entry: any, i: number) => (
            <Cell key={`c-${i}`} fill={entry?.__color || "var(--sidebar-primary)"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
