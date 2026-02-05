"use client"

import React from "react"

interface KPIItemProps {
  title: string
  value: string | number
  note?: string
  ariaLabel?: string
  icon?: keyof typeof ICONS
  iconSize?: number
  customIcon?: React.ComponentType<{ size: number }>
}

export default function KPIItem({
  title,
  value,
  note,
  ariaLabel,
  icon = "search",
  iconSize = 24,
  customIcon,
}: KPIItemProps) {
  const Icon = (customIcon ?? ICONS[icon] ?? ICONS.search) as React.ComponentType<{ size: number }>
  const pillSize = Math.max(28, iconSize + 10)

  return (
    <div
      aria-label={ariaLabel || title}
      className="flex flex-col justify-center min-h-[110px] rounded-lg border border-border bg-card p-4 hover:bg-card/80"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-medium text-muted-foreground">
          <b>{title}</b>
        </div>
        <div
          aria-hidden="true"
          className="grid place-items-center rounded-md border border-border bg-muted/20"
          style={{ width: pillSize, height: pillSize }}
        >
          <Icon size={iconSize} />
        </div>
      </div>

      <div className="text-2xl font-bold text-foreground">{value ?? "—"}</div>

      {note && (
        <div className="mt-3 text-xs text-muted-foreground/80 text-left">{note}</div>
      )}
    </div>
  )
}

function SvgBase({
  children,
  title,
  size = 18,
}: {
  children: React.ReactNode
  title: string
  size?: number
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      aria-label={title}
      role="img"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  )
}

const ICONS = {
  search: ({ size }: { size: number }) => (
    <SvgBase title="Search" size={size}>
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </SvgBase>
  ),
  trend: ({ size }: { size: number }) => (
    <SvgBase title="Trending up" size={size}>
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </SvgBase>
  ),
  trophy: ({ size }: { size: number }) => (
    <SvgBase title="Trophy" size={size}>
      <path d="M8 21h8" />
      <path d="M12 17v4" />
      <path d="M7 4h10v4a5 5 0 0 1-10 0V4Z" />
      <path d="M17 8h1a4 4 0 0 0 4-4v0h-5" />
      <path d="M7 8H6a4 4 0 0 1-4-4v0h5" />
    </SvgBase>
  ),
  target: ({ size }: { size: number }) => (
    <SvgBase title="Target" size={size}>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </SvgBase>
  ),
}
