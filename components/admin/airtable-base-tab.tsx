// components/admin/airtable-base-tab.tsx
"use client"

import { useEffect, useMemo, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"

type AirtableBaseRow = {
  id: number
  base_id: string
  table_id: string
  view_id: string | null
  table_name: string | null
  base_name: string | null
  sort_order: number
}

function getToken() {
  return localStorage.getItem("token")
}

export function AirtableBaseTab() {
  const { toast } = useToast()

  const [link, setLink] = useState("")
  const [rows, setRows] = useState<AirtableBaseRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [dragId, setDragId] = useState<number | null>(null)

  const ordered = useMemo(() => [...rows].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)), [rows])

  const load = async () => {
    const token = getToken()
    if (!token) return
    setLoading(true)
    try {
      const res = await fetch("/api/admin/airtable-bases", {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to load bases")
      setRows(data.bases || [])
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to load", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const addBase = async () => {
    const token = getToken()
    if (!token) return
    const v = link.trim()
    if (!v) return

    setBusy(true)
    try {
      const res = await fetch("/api/admin/airtable-bases", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ link: v }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "Failed to save")

      setLink("")
      toast({ title: "Saved", description: "Airtable base added" })
      await load()
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to save", variant: "destructive" })
    } finally {
      setBusy(false)
    }
  }

  const removeBase = async (id: number) => {
    const token = getToken()
    if (!token) return

    if (!confirm("Delete this Airtable base entry?")) return

    setBusy(true)
    try {
      const res = await fetch(`/api/admin/airtable-bases?id=${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.error || "Failed to delete")

      toast({ title: "Deleted", description: "Removed" })
      await load()
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to delete", variant: "destructive" })
    } finally {
      setBusy(false)
    }
  }

  const persistOrder = async (next: AirtableBaseRow[]) => {
    const token = getToken()
    if (!token) return
    const orderedIds = next.map((x) => x.id)

    const res = await fetch("/api/admin/airtable-bases", {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ orderedIds }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data?.error || "Failed to reorder")
  }

  const onDropOn = async (overId: number) => {
    if (dragId == null || dragId === overId) return
    const list = [...ordered]
    const from = list.findIndex((x) => x.id === dragId)
    const to = list.findIndex((x) => x.id === overId)
    if (from === -1 || to === -1) return

    const [moved] = list.splice(from, 1)
    list.splice(to, 0, moved)

    // optimistic UI
    const withOrder = list.map((x, idx) => ({ ...x, sort_order: idx }))
    setRows(withOrder)

    try {
      await persistOrder(withOrder)
      toast({ title: "Saved", description: "Order updated" })
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Reorder failed", variant: "destructive" })
      await load()
    } finally {
      setDragId(null)
    }
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xl font-semibold">Airtable base</h2>
          <p className="text-sm text-muted-foreground">Paste a base/table/view link, then drag to reorder.</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mb-6">
        <input
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          placeholder="Paste Airtable link (app.../tbl.../viw...)"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") addBase()
          }}
          disabled={busy}
        />
        <Button onClick={addBase} disabled={busy || !link.trim()}>
          Save
        </Button>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : ordered.length === 0 ? (
        <div className="text-sm text-muted-foreground">No saved bases yet.</div>
      ) : (
        <div className="space-y-2">
          {ordered.map((r) => {
            const label = r.table_name ? r.table_name : `${r.base_id} / ${r.table_id}${r.view_id ? ` / ${r.view_id}` : ""}`

            return (
              <div
                key={r.id}
                draggable={!busy}
                onDragStart={() => setDragId(r.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => onDropOn(r.id)}
                className="flex items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-3"
                title="Drag to reorder"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{label}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    base: {r.base_id} • table: {r.table_id}
                    {r.view_id ? ` • view: ${r.view_id}` : ""}
                  </div>
                </div>

                <Button variant="destructive" size="sm" onClick={() => removeBase(r.id)} disabled={busy}>
                  Delete
                </Button>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
