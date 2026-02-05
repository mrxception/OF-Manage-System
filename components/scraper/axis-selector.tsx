// axis-selector.tsx
"use client"

import React from "react"

interface AxisSelectorProps {
  label: string
  value: string
  onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void
  options: { value: string; label: string }[]
}

export default function AxisSelector({ label, value, onChange, options }: AxisSelectorProps) {
  return (
    <div className="flex-1 min-w-[160px] flex items-center gap-2">
      <label htmlFor={`${label}-select`} className="text-sm font-medium text-muted-foreground whitespace-nowrap">
        {label}:
      </label>
      <select
        id={`${label}-select`}
        value={value}
        onChange={onChange}
        className="block w-full pl-3 pr-10 py-1.5 text-sm rounded border border-border bg-muted text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} className="bg-card text-foreground">
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}
