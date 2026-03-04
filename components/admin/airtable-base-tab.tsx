"use client"

import { useEffect, useMemo, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { RefreshCw } from "lucide-react"

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
  return typeof window !== 'undefined' ? localStorage.getItem("token") : null
}

export function AirtableBaseTab() {
  const { toast } = useToast()

  const [link, setLink] = useState("")
  const [rows, setRows] = useState<AirtableBaseRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [dragId, setDragId] = useState<number | null>(null)

  const ordered = useMemo(() => [...rows].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)), [rows])
  
  const needsSync = useMemo(() => rows.some(r => !r.base_name), [rows])

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

  const syncBaseNames = async () => {
    const token = getToken()
    if (!token) return
    setBusy(true)
    try {
      const res = await fetch("/api/admin/airtable-bases", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || "Failed to sync")
      
      toast({ title: "Sync Complete", description: `Updated ${data.updatedCount} base names.` })
      await load()
    } catch (e: any) {
      toast({ title: "Sync Error", description: e.message, variant: "destructive" })
    } finally {
      setBusy(false)
    }
  }

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
      if (!res.ok) throw new Error("Failed to delete")

      toast({ title: "Deleted", description: "Removed" })
      await load()
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Failed to delete", variant: "destructive" })
    } finally {
      setBusy(false)
    }
  }

  const onDropOn = async (overId: number) => {
    if (dragId == null || dragId === overId) return
    const list = [...ordered]
    const from = list.findIndex((x) => x.id === dragId)
    const to = list.findIndex((x) => x.id === overId)
    if (from === -1 || to === -1) return

    const [moved] = list.splice(from, 1)
    list.splice(to, 0, moved)
    const withOrder = list.map((x, idx) => ({ ...x, sort_order: idx }))
    setRows(withOrder)

    try {
      const token = getToken()
      await fetch("/api/admin/airtable-bases", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ orderedIds: withOrder.map(x => x.id) }),
      })
      toast({ title: "Saved", description: "Order updated" })
    } catch (e: any) {
      toast({ title: "Error", description: "Reorder failed", variant: "destructive" })
      await load()
    } finally {
      setDragId(null)
    }
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xl font-semibold">Airtable Bases</h2>
          <p className="text-sm text-muted-foreground">Paste a base/table/view link, then drag to reorder.</p>
        </div>
        {/* Sync Button: Only shows if there are missing base names */}
        {needsSync && !loading && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={syncBaseNames} 
            disabled={busy}
            className="text-amber-600 border-amber-200 hover:bg-amber-50"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${busy ? 'animate-spin' : ''}`} />
            Sync Names
          </Button>
        )}
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
            const label = r.base_name && r.table_name 
              ? `${r.base_name} › ${r.table_name}`
              : r.table_name || `${r.base_id} / ${r.table_id}`

            return (
              <div
                key={r.id}
                draggable={!busy}
                onDragStart={() => setDragId(r.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => onDropOn(r.id)}
                className="flex items-center justify-between gap-3 rounded-md border border-border bg-card px-3 py-3 hover:border-primary/50 transition-colors"
                title="Drag to reorder"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{label}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    ID: {r.base_id.slice(0, 8)}... • Table: {r.table_id.slice(0, 8)}...
                    {r.view_id ? ` • View: ${r.view_id.slice(0, 8)}...` : ""}
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