import * as React from "react"
import { Check, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

type Ctx = {
  open: boolean
  setOpen: (v: boolean) => void
  value: string
  onValueChange: (v: string) => void
  disabled?: boolean
  query: string
  setQuery: (v: string) => void
  activeIndex: number
  setActiveIndex: (v: number) => void
  registerVisibleCount: (n: number) => void
  visibleCount: number
  getLabelForValue: (v: string) => string | undefined
}

const ComboBoxContext = React.createContext<Ctx | null>(null)

function useComboBox() {
  const ctx = React.useContext(ComboBoxContext)
  if (!ctx) throw new Error("ComboBox components must be used within <ComboBox />")
  return ctx
}

function getText(node: React.ReactNode): string {
  if (node == null) return ""
  if (typeof node === "string" || typeof node === "number") return String(node)
  if (Array.isArray(node)) return node.map(getText).join("")
  if (React.isValidElement(node)) {
    const el = node as React.ReactElement<any>
    return getText(el.props?.children)
  }
  return ""
}

function normalize(s: string) {
  return s.trim().toLowerCase()
}

type ComboBoxProps = {
  value: string
  onValueChange: (v: string) => void
  disabled?: boolean
  children: React.ReactNode
}

const ComboBox = ({ value, onValueChange, disabled, children }: ComboBoxProps) => {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [activeIndex, setActiveIndex] = React.useState(0)
  const [visibleCount, setVisibleCount] = React.useState(0)

  const rootRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent | TouchEvent) => {
      const el = rootRef.current
      if (!el) return
      if (!el.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onDown)
    document.addEventListener("touchstart", onDown)
    return () => {
      document.removeEventListener("mousedown", onDown)
      document.removeEventListener("touchstart", onDown)
    }
  }, [open])

  React.useEffect(() => {
    if (!open) {
      setQuery("")
      setActiveIndex(0)
    }
  }, [open])

  React.useEffect(() => {
    if (visibleCount <= 0) {
      setActiveIndex(0)
      return
    }
    setActiveIndex(i => Math.max(0, Math.min(i, visibleCount - 1)))
  }, [visibleCount])

  const getLabelForValue = React.useCallback(
    (v: string) => {
      const arr = React.Children.toArray(children)

      const walk = (nodes: React.ReactNode[]): string | undefined => {
        for (const n of nodes) {
          if (!React.isValidElement(n)) continue
          const anyProps: any = n.props
          const anyType: any = n.type
          if (anyProps?.value === v && anyType?.displayName === "ComboBoxItem") {
            return getText(anyProps.children).trim()
          }
          if (anyProps?.children) {
            const found = walk(React.Children.toArray(anyProps.children))
            if (found) return found
          }
        }
        return undefined
      }

      return walk(arr)
    },
    [children],
  )

  const ctx: Ctx = {
    open,
    setOpen,
    value,
    onValueChange,
    disabled,
    query,
    setQuery,
    activeIndex,
    setActiveIndex,
    registerVisibleCount: setVisibleCount,
    visibleCount,
    getLabelForValue,
  }

  return (
    <ComboBoxContext.Provider value={ctx}>
      <div ref={rootRef} className="relative">
        {children}
      </div>
    </ComboBoxContext.Provider>
  )
}

type ComboBoxTriggerProps = React.ButtonHTMLAttributes<HTMLButtonElement>

const ComboBoxTrigger = React.forwardRef<HTMLButtonElement, ComboBoxTriggerProps>(
  ({ className, children, ...props }, ref) => {
    const { open, setOpen, disabled, setActiveIndex } = useComboBox()

    return (
      <button
        ref={ref}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        className={cn(
          "flex w-full items-center justify-between rounded-md px-3 py-2 text-sm outline-none transition-shadow",
          "bg-[var(--color-card)] text-[var(--color-foreground)] border border-[var(--color-border)]",
          "data-[placeholder]:text-[var(--color-muted-foreground)] hover:border-[var(--color-primary)]",
          "focus:ring-[3px] focus:ring-[var(--ring)] focus:ring-offset-2 focus:ring-offset-[var(--color-background)]",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "[&>span]:line-clamp-1",
          open ? "border-[var(--color-primary)]" : "",
          className,
        )}
        onClick={() => {
          if (disabled) return
          setActiveIndex(0)
          setOpen(!open)
        }}
        {...props}
      >
        {children}
        <ChevronDown className="h-4 w-4 text-[var(--color-muted-foreground)]" />
      </button>
    )
  },
)
ComboBoxTrigger.displayName = "ComboBoxTrigger"

type ComboBoxValueProps = {
  placeholder?: string
  className?: string
}

const ComboBoxValue = ({ placeholder = "Select…", className }: ComboBoxValueProps) => {
  const { value, getLabelForValue } = useComboBox()
  const label = value ? getLabelForValue(value) : ""

  return (
    <span className={cn("flex-1 text-left", !label ? "text-[var(--color-muted-foreground)]" : "", className)}>
      {label || placeholder}
    </span>
  )
}
ComboBoxValue.displayName = "ComboBoxValue"

type ComboBoxContentProps = {
  className?: string
  children: React.ReactNode
  emptyText?: string
  searchPlaceholder?: string
}

const ComboBoxContent = ({
  className,
  children,
  emptyText = "No results found.",
  searchPlaceholder = "Search…",
}: ComboBoxContentProps) => {
  const {
    open,
    setOpen,
    query,
    setQuery,
    activeIndex,
    setActiveIndex,
    registerVisibleCount,
    visibleCount,
    onValueChange,
    disabled,
  } = useComboBox()

  const inputRef = React.useRef<HTMLInputElement | null>(null)
  const listRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    if (open) requestAnimationFrame(() => inputRef.current?.focus())
  }, [open])

  const flatItems = React.useMemo(() => {
    const out: { value: string; label: string; node: React.ReactElement<any> }[] = []

    const walk = (nodes: React.ReactNode) => {
      React.Children.forEach(nodes, child => {
        if (!React.isValidElement(child)) return
        const anyType: any = child.type
        const anyProps: any = child.props

        if (anyType?.displayName === "ComboBoxItem") {
          out.push({
            value: anyProps.value,
            label: getText(anyProps.children).trim(),
            node: child as React.ReactElement<any>,
          })
          return
        }

        if (anyProps?.children) walk(anyProps.children)
      })
    }

    walk(children)
    return out
  }, [children])

  const filtered = React.useMemo(() => {
    const q = normalize(query)
    if (!q) return flatItems
    return flatItems.filter(i => normalize(i.label).includes(q))
  }, [flatItems, query])

  React.useEffect(() => {
    registerVisibleCount(filtered.length)
  }, [filtered.length, registerVisibleCount])

  React.useEffect(() => {
    if (!open) return
    const el = listRef.current?.querySelector<HTMLElement>(`[data-cb-index="${activeIndex}"]`)
    el?.scrollIntoView({ block: "nearest" })
  }, [activeIndex, open])

  const commit = (val: string) => {
    onValueChange(val)
    setOpen(false)
  }

  const onKeyDown: React.KeyboardEventHandler<HTMLDivElement> = e => {
    if (!open || disabled) return

    if (e.key === "Escape") {
      e.preventDefault()
      setOpen(false)
      return
    }

    if (e.key === "ArrowDown") {
      e.preventDefault()
      if (visibleCount <= 0) return
      setActiveIndex(Math.min(activeIndex + 1, visibleCount - 1))
      return
    }

    if (e.key === "ArrowUp") {
      e.preventDefault()
      if (visibleCount <= 0) return
      setActiveIndex(Math.max(activeIndex - 1, 0))
      return
    }

    if (e.key === "Home") {
      e.preventDefault()
      setActiveIndex(0)
      return
    }

    if (e.key === "End") {
      e.preventDefault()
      if (visibleCount <= 0) return
      setActiveIndex(visibleCount - 1)
      return
    }

    if (e.key === "Enter") {
      e.preventDefault()
      const item = filtered[activeIndex]
      if (item) commit(item.value)
      return
    }
  }

  if (!open) return null

  return (
    <div
      className={cn(
        "absolute z-50 mt-1 w-full overflow-hidden rounded-md border shadow-md",
        "bg-[var(--color-popover)] text-[var(--color-popover-foreground)] border-[var(--color-border)]",
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        className,
      )}
      role="dialog"
      aria-label="Options"
      data-state="open"
      onKeyDown={onKeyDown}
    >
      <div className="p-2 border-b border-[var(--color-border)]">
        <input
          ref={inputRef}
          value={query}
          onChange={e => {
            setQuery(e.target.value)
            setActiveIndex(0)
          }}
          placeholder={searchPlaceholder}
          className={cn(
            "w-full rounded-md px-2 py-1.5 text-sm outline-none",
            "bg-[var(--color-card)] text-[var(--color-foreground)] border border-[var(--color-border)]",
            "focus:ring-[1px] focus:ring-[var(--ring)] focus:ring-offset-2 focus:ring-offset-[var(--color-background)]",
          )}
        />
      </div>

      <div ref={listRef} role="listbox" className="max-h-72 overflow-auto p-1">
        {filtered.length === 0 ? (
          <div className="px-2 py-2 text-sm text-[var(--color-muted-foreground)]">{emptyText}</div>
        ) : (
          filtered.map((it, idx) =>
            React.cloneElement(it.node as React.ReactElement<any>, { "data-cb-index": idx, key: it.value } as any),
          )
        )}
      </div>
    </div>
  )
}
ComboBoxContent.displayName = "ComboBoxContent"

type ComboBoxItemProps = React.HTMLAttributes<HTMLDivElement> & {
  value: string
  "data-cb-index"?: number
}

const ComboBoxItem = React.forwardRef<HTMLDivElement, ComboBoxItemProps>(({ className, children, value, ...props }, ref) => {
  const { value: selected, onValueChange, setOpen, activeIndex, setActiveIndex } = useComboBox()

  const idx = Number((props as any)["data-cb-index"] ?? -1)
  const isActive = idx === activeIndex
  const isSelected = selected === value

  return (
    <div
      ref={ref}
      role="option"
      aria-selected={isSelected}
      tabIndex={-1}
      className={cn(
        "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        isActive ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]" : "",
        !isActive ? "hover:bg-[var(--color-primary)] hover:text-[var(--color-primary-foreground)]" : "",
        className,
      )}
      onMouseEnter={() => {
        if (idx >= 0) setActiveIndex(idx)
      }}
      onMouseDown={e => {
        e.preventDefault()
      }}
      onClick={() => {
        onValueChange(value)
        setOpen(false)
      }}
      {...props}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        {isSelected ? <Check className="h-4 w-4 text-[var(--color-primary-foreground)]" /> : null}
      </span>
      <span className="line-clamp-1">{children}</span>
    </div>
  )
})
ComboBoxItem.displayName = "ComboBoxItem"

export { ComboBox, ComboBoxTrigger, ComboBoxValue, ComboBoxContent, ComboBoxItem }
