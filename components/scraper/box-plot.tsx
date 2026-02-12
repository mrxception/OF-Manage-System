// box-plot.tsx
"use client"

import React, { useMemo } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Label, Legend } from "recharts"

type AxisDomain = [number, number] | ["auto", number] | [number, "auto"] | ["auto", "auto"]

interface Row {
  subreddit: string
  min: number
  q1: number
  median: number
  q3: number
  max: number
  value: number
  __user: string
  __color: string
  __username: string
}

interface Props {
  rows: Row[]
  domain: AxisDomain
  legend?: { label: string; color: string }[]
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload || !payload.length) return null
  const d = payload[0]?.payload as Row
  if (!d) return null
  return (
    <div className="bg-card/90 backdrop-blur p-3 rounded-md border border-border shadow-lg">
      <p className="font-bold" style={{ color: d.__color }}>{`${d.subreddit} — u/${d.__username}`}</p>
      <ul className="text-sm space-y-1 mt-1">
        <li>
          <span className="font-semibold">Max:</span> {Number(d.max ?? 0).toLocaleString()}
        </li>
        <li>
          <span className="font-semibold">Q3:</span> {Number(d.q3 ?? 0).toLocaleString()}
        </li>
        <li className="font-bold">
          <span className="font-semibold">Median:</span> {Number(d.median ?? 0).toLocaleString()}
        </li>
        <li>
          <span className="font-semibold">Q1:</span> {Number(d.q1 ?? 0).toLocaleString()}
        </li>
        <li>
          <span className="font-semibold">Min:</span> {Number(d.min ?? 0).toLocaleString()}
        </li>
      </ul>
    </div>
  )
}

const CustomBoxPlotShape = (props: any) => {
  const { x, y, width, height, payload } = props
  const accent = String(payload?.__color || "var(--sidebar-primary)")
  const whisker = "rgba(160,174,192,0.9)"

  const maxVal = Math.max(1, Number(payload?.max ?? 1))
  const scale = width / maxVal

  const minX = x + Number(payload?.min ?? 0) * scale
  const q1X = x + Number(payload?.q1 ?? 0) * scale
  const medianX = x + Number(payload?.median ?? 0) * scale
  const q3X = x + Number(payload?.q3 ?? 0) * scale
  const maxX = x + Number(payload?.max ?? 0) * scale

  const BOX_HEIGHT_RATIO = 0.72
  const boxHeight = height * BOX_HEIGHT_RATIO
  const boxY = y + (height - boxHeight) / 2
  const whiskerY = y + height / 2

  const MIN_BOX_PX = 6
  const iqrWidth = Math.max(MIN_BOX_PX, q3X - q1X)

  const minV = Number(payload?.min ?? 0)
  const q1V = Number(payload?.q1 ?? 0)
  const medV = Number(payload?.median ?? 0)
  const q3V = Number(payload?.q3 ?? 0)
  const maxV2 = Number(payload?.max ?? 0)

  const allEqual = minV === q1V && q1V === medV && medV === q3V && q3V === maxV2

  if (allEqual) {
    const cx = minX
    const PILL_W = 10
    const PILL_R = Math.min(boxHeight / 2, 5)
    return (
      <g>
        <line x1={cx - 12} y1={whiskerY} x2={cx + 12} y2={whiskerY} stroke={whisker} strokeWidth={2} />
        <rect x={cx - PILL_W / 2} y={boxY} width={PILL_W} height={boxHeight} rx={PILL_R} ry={PILL_R} fill={accent} stroke={accent} />
        <line x1={cx} y1={boxY} x2={cx} y2={boxY + boxHeight} stroke="oklch(0.8 0.12 60)" strokeWidth={2.25} />
      </g>
    )
  }

  return (
    <g>
      <line x1={minX} y1={whiskerY} x2={q1X} y2={whiskerY} stroke={whisker} strokeWidth={2} />
      <line x1={q3X} y1={whiskerY} x2={maxX} y2={whiskerY} stroke={whisker} strokeWidth={2} />

      <line x1={minX} y1={boxY} x2={minX} y2={boxY + boxHeight} stroke={whisker} strokeWidth={2} />
      <line x1={maxX} y1={boxY} x2={maxX} y2={boxY + boxHeight} stroke={whisker} strokeWidth={2} />

      <rect
        x={Math.min(q1X, q3X)}
        y={boxY}
        width={Math.abs(iqrWidth)}
        height={boxHeight}
        fill={accent}
        fillOpacity={0.65}
        stroke={accent}
        strokeWidth={1.5}
      />

      <line x1={medianX} y1={boxY} x2={medianX} y2={boxY + boxHeight} stroke="oklch(0.8 0.12 60)" strokeWidth={2.25} />
    </g>
  )
}

export default function BoxPlot({ rows, domain, legend }: Props) {
  const data = useMemo(() => (Array.isArray(rows) ? [...rows].reverse() : []), [rows])

  const tickColor = "var(--muted-foreground)"
  const gridStroke = "color-mix(in oklch, var(--muted-foreground) 15%, transparent)"

  const finalDomain: [number, number] = useMemo(() => {
    const values = data.length ? data.map((d) => Number(d.max ?? 0)) : [0]
    const lo = domain[0] === "auto" ? 0 : Number(domain[0])
    const hi = domain[1] === "auto" ? Math.ceil((Math.max(...values) || 10) * 1.05) : Number(domain[1])
    return [Number.isFinite(lo) ? lo : 0, Number.isFinite(hi) ? hi : 10]
  }, [data, domain])

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
      <BarChart data={data} layout="vertical" margin={{ top: legend?.length ? 10 : 24, right: 40, left: 50, bottom: 32 }} barCategoryGap="15%" barGap={8}>
        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke as any} />
        <XAxis
          type="number"
          tick={{ fill: tickColor }}
          stroke={tickColor}
          domain={finalDomain}
          allowDataOverflow
          tickCount={12}
          allowDecimals={false}
          tickFormatter={(t) => new Intl.NumberFormat(undefined, { maximumFractionDigits: 0, minimumFractionDigits: 0 }).format(Number(t))}
        >
          <Label value="Upvotes Distribution" offset={-15} position="insideBottom" fill={tickColor} />
        </XAxis>
        <YAxis dataKey="subreddit" type="category" tick={{ fill: tickColor }} stroke={tickColor} width={160} interval={0} />
        <Tooltip cursor={{ fill: "rgba(125,125,125,0.05)" }} content={<CustomTooltip />} />
        {legend?.length ? <Legend verticalAlign="top" align="left" height={36} content={<LegendContent />} /> : null}
        <Bar dataKey="max" fill="transparent" isAnimationActive={false} shape={<CustomBoxPlotShape />} />
      </BarChart>
    </ResponsiveContainer>
  )
}
