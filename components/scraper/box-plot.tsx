"use client"

import React, { useMemo } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Label } from "recharts"

type AxisDomain = [number, number] | ["auto", number] | [number, "auto"] | ["auto", "auto"]

interface Props {
  // expects the combined, mixed rows with colors from the section
  rows: Array<{
    subreddit: string
    min: number
    q1: number
    median: number
    q3: number
    max: number
    value: number
    __user: "u1" | "u2"
    __color: string
    __username: string
  }>
  domain: AxisDomain
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload || !payload.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-card/90 backdrop-blur p-3 rounded-md border border-border shadow-lg">
      <p className="font-bold" style={{ color: d.__color }}>{`${d.subreddit} — u/${d.__username}`}</p>
      <ul className="text-sm space-y-1 mt-1">
        <li><span className="font-semibold">Max:</span> {d.max.toLocaleString()}</li>
        <li><span className="font-semibold">Q3:</span> {d.q3.toLocaleString()}</li>
        <li className="font-bold"><span className="font-semibold">Median:</span> {d.median.toLocaleString()}</li>
        <li><span className="font-semibold">Q1:</span> {d.q1.toLocaleString()}</li>
        <li><span className="font-semibold">Min:</span> {d.min.toLocaleString()}</li>
      </ul>
    </div>
  )
}
/*
const CustomBoxPlotShape = (props: any) => {
  const { x, y, width, height, payload } = props
  const accent = payload.__color as string
  const whisker = "rgba(160,174,192,0.9)"

  const scale = width / Math.max(1, payload.max || 1)

  const minX = x + payload.min * scale
  const q1X = x + payload.q1 * scale
  const medianX = x + payload.median * scale
  const q3X = x + payload.q3 * scale
  const maxX = x + payload.max * scale 

  const BOX_HEIGHT_RATIO = 0.72
  const boxHeight = height * BOX_HEIGHT_RATIO
  const boxY = y + (height - boxHeight) / 2
  const whiskerY = y + height / 2

  const MIN_BOX_PX = 6
  const iqrWidth = Math.max(MIN_BOX_PX, q3X - q1X)

  const allEqual =
    payload.min === payload.q1 &&
    payload.q1 === payload.median &&
    payload.median === payload.q3 &&
    payload.q3 === payload.max

  if (allEqual) {
    const cx = minX
    const PILL_W = 10
    const PILL_R = Math.min(boxHeight / 2, 5)
    return (
      <g>
        <line x1={cx - 12} y1={whiskerY} x2={cx + 12} y2={whiskerY} stroke={whisker} strokeWidth={2}/>
        <rect
          x={cx - PILL_W / 2}
          y={boxY}
          width={PILL_W}
          height={boxHeight}
          rx={PILL_R}
          ry={PILL_R}
          fill={accent}
          stroke={accent}
        />
        <line x1={cx} y1={boxY} x2={cx} y2={boxY + boxHeight} stroke="oklch(0.8 0.12 60)" strokeWidth={2.25}/>
      </g>
    )
  }

  return (
    <g>
      <line x1={minX} y1={whiskerY} x2={q1X} y2={whiskerY} stroke={whisker} strokeWidth={2} />
      <line x1={q3X}  y1={whiskerY} x2={maxX} y2={whiskerY} stroke={whisker} strokeWidth={2} />

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

      <line x1={medianX} y1={boxY} x2={medianX} y2={boxY + boxHeight} stroke="oklch(0.8 0.12 60)" strokeWidth={2.25}/>
    </g>
  )
}
*/

const CustomBoxPlotShape = (props: any) => {
  const { x, y, width, height, payload } = props
  const accent = payload.__color as string
  const whisker = "rgba(160,174,192,0.9)"

  // guard against zero max
  const scale = width / Math.max(1, payload.max || 1)

  const minX = x + payload.min * scale
  const q1X = x + payload.q1 * scale
  const medianX = x + payload.median * scale
  const q3X = x + payload.q3 * scale
  const maxX = x + payload.max * scale // use payload.max, not x+width, so zero-domain cases behave

  const BOX_HEIGHT_RATIO = 0.72
  const boxHeight = height * BOX_HEIGHT_RATIO
  const boxY = y + (height - boxHeight) / 2
  const whiskerY = y + height / 2

  // ensure very narrow IQRs are visible
  const MIN_BOX_PX = 6
  const iqrWidth = Math.max(MIN_BOX_PX, q3X - q1X)

  // If all five stats are the same, draw a tiny pill + whisker cap instead of skipping
  const allEqual =
    payload.min === payload.q1 &&
    payload.q1 === payload.median &&
    payload.median === payload.q3 &&
    payload.q3 === payload.max

  if (allEqual) {
    const cx = minX
    const PILL_W = 10
    const PILL_R = Math.min(boxHeight / 2, 5)
    return (
      <g>
        {/* small whisker line */}
        <line x1={cx - 12} y1={whiskerY} x2={cx + 12} y2={whiskerY} stroke={whisker} strokeWidth={2}/>
        {/* tiny pill (represents IQR collapsed to a point) */}
        <rect
          x={cx - PILL_W / 2}
          y={boxY}
          width={PILL_W}
          height={boxHeight}
          rx={PILL_R}
          ry={PILL_R}
          fill={accent}
          stroke={accent}
        />
        {/* median marker */}
        <line x1={cx} y1={boxY} x2={cx} y2={boxY + boxHeight} stroke="oklch(0.8 0.12 60)" strokeWidth={2.25}/>
      </g>
    )
  }

  // Normal box-plot
  return (
    <g>
      {/* whiskers */}
      <line x1={minX} y1={whiskerY} x2={q1X} y2={whiskerY} stroke={whisker} strokeWidth={2} />
      <line x1={q3X}  y1={whiskerY} x2={maxX} y2={whiskerY} stroke={whisker} strokeWidth={2} />

      {/* end caps */}
      <line x1={minX} y1={boxY} x2={minX} y2={boxY + boxHeight} stroke={whisker} strokeWidth={2} />
      <line x1={maxX} y1={boxY} x2={maxX} y2={boxY + boxHeight} stroke={whisker} strokeWidth={2} />

      {/* IQR box */}
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

      {/* median */}
      <line x1={medianX} y1={boxY} x2={medianX} y2={boxY + boxHeight} stroke="oklch(0.8 0.12 60)" strokeWidth={2.25}/>
    </g>
  )
}


export default function BoxPlot({ rows, domain }: Props) {
  const data = useMemo(() => {
    // keep mixed, descending order from the section
    return Array.isArray(rows) ? [...rows].reverse() : []
  }, [rows])

  const tickColor = "var(--muted-foreground)"
  const gridStroke = "color-mix(in oklch, var(--muted-foreground) 15%, transparent)"

  const finalDomain: [number, number] = useMemo(() => {
    const values = data.length ? data.map((d) => d.max) : [0]
    const lo = typeof domain[0] === "number" ? domain[0] : 0
    const hi = typeof domain[1] === "number" ? domain[1] : Math.ceil((Math.max(...values) || 10) * 1.05)
    return [lo, hi]
  }, [data, domain])

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 24, right: 40, left: 50, bottom: 32 }}
        barCategoryGap="15%"
        barGap={8}
      >
        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke as any} />
        <XAxis
          type="number"
          tick={{ fill: tickColor }}
          stroke={tickColor}
          domain={finalDomain}
          allowDataOverflow
          tickCount={12}
          allowDecimals={false}
          tickFormatter={(t) =>
            new Intl.NumberFormat(undefined, { maximumFractionDigits: 0, minimumFractionDigits: 0 }).format(Number(t))
          }
        >
          <Label value="Upvotes Distribution" offset={-15} position="insideBottom" fill={tickColor} />
        </XAxis>
        <YAxis
          dataKey="subreddit"
          type="category"
          tick={{ fill: tickColor }}
          stroke={tickColor}
          width={160}
          interval={0}
        />
        <Tooltip cursor={{ fill: "rgba(125,125,125,0.05)" }} content={<CustomTooltip />} />
        <Bar dataKey="max" fill="transparent" isAnimationActive={false} shape={<CustomBoxPlotShape />} />
      </BarChart>
    </ResponsiveContainer>
  )
}
