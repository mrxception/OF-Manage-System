"use client"

import React, { useMemo } from "react"
import {
  LineChart as RLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Label,
} from "recharts"

export type TimeSeriesRow = { date: string; [series: string]: number | string | null | undefined }

interface Props {
  data: TimeSeriesRow[]
  seriesKeys: string[]
  metricLabel: string
  domain: [number, number]
  legend?: { label: string; color: string }[]
  colorMap?: Record<string, string>
}

function fmtDate(d: string) {
  if (!d) return d
  if (d.includes("-")) {
    const parts = d.split("-").map((x) => x.trim())
    if (parts.length === 3) {
      const y = Number(parts[0])
      const m = Number(parts[1])
      const day = Number(parts[2])
      if (Number.isFinite(y) && Number.isFinite(m) && Number.isFinite(day)) return `${day}/${m}/${y}`
    }
  }
  if (d.includes("/")) {
    const parts = d.split("/").map((x) => x.trim())
    if (parts.length === 3) {
      const a = Number(parts[0])
      const b = Number(parts[1])
      const c = Number(parts[2])
      if (Number.isFinite(a) && Number.isFinite(b) && Number.isFinite(c)) {
        if (c > 1900) return `${a}/${b}/${c}`
        return `${Number(parts[2])}/${Number(parts[1])}/${Number(parts[0])}`
      }
    }
  }
  return d
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null
  return (
    <div className="rounded-md border border-border bg-card/90 p-3 shadow-lg">
      <p className="font-semibold text-foreground">{fmtDate(label)}</p>
      <ul className="mt-2 space-y-1 text-sm">
        {payload
          .slice()
          .sort((a: any, b: any) => (Number(b?.value ?? 0) || 0) - (Number(a?.value ?? 0) || 0))
          .map((pld: any, i: number) => (
            <li key={i} style={{ color: pld?.color ?? "inherit" }}>
              {`${pld.name}: ${Number(pld.value ?? 0).toLocaleString()}`}
            </li>
          ))}
      </ul>
    </div>
  )
}

export default function PerformanceLineChart({ data, seriesKeys, metricLabel, domain, legend, colorMap }: Props) {
  const tickColor = "var(--muted-foreground)"
  const gridStroke = "color-mix(in oklch, var(--muted-foreground) 15%, transparent)"
  const cs = typeof window !== "undefined" ? getComputedStyle(document.documentElement) : (null as any)
  const primary = cs?.getPropertyValue("--sidebar-primary")?.trim() || "var(--sidebar-primary)"

  const palette = useMemo(
    () => [
      primary,
      "rgb(20,184,166)",
      "rgb(59,130,246)",
      "rgb(168,85,247)",
      "rgb(234,179,8)",
      "rgb(239,68,68)",
      "rgb(34,197,94)",
    ],
    [primary]
  )

  const colors = useMemo(() => {
    const m: Record<string, string> = {}
    for (let i = 0; i < seriesKeys.length; i++) {
      const k = seriesKeys[i]
      const forced = colorMap?.[k]
      m[k] = forced || palette[i % palette.length]
    }
    return m
  }, [seriesKeys, palette, colorMap])

  const [min, max] = domain
  const paddedDomain: [number, number] = [min, Math.ceil((max || 10) * 1.05)]

  const LegendContent = () => {
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
      <RLineChart data={data} margin={{ top: legend?.length ? 10 : 6, right: 24, left: 40, bottom: 6 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke as any} />
        <XAxis dataKey="date" tick={{ fill: tickColor }} stroke={tickColor} tickFormatter={fmtDate} />
        <YAxis
          tick={{ fill: tickColor }}
          stroke={tickColor}
          tickFormatter={(t) => Number(t).toLocaleString()}
          domain={paddedDomain}
          allowDataOverflow
        >
          <Label value={metricLabel} angle={-90} position="insideLeft" style={{ textAnchor: "middle", fill: tickColor }} />
        </YAxis>

        <Tooltip content={<CustomTooltip />} />
        {legend?.length ? <Legend verticalAlign="top" align="left" height={36} content={<LegendContent />} /> : <Legend iconSize={10} />}

        {seriesKeys.map((k) => (
          <Line
            key={k}
            type="monotone"
            dataKey={k}
            name={k}
            stroke={colors[k] || primary}
            strokeWidth={2}
            dot={{ r: 2, stroke: colors[k] || primary, fill: colors[k] || primary }}
            activeDot={{ r: 4, stroke: colors[k] || primary, fill: colors[k] || primary }}
            connectNulls
            isAnimationActive={false}
          />
        ))}
      </RLineChart>
    </ResponsiveContainer>
  )
}
