import { NextResponse } from "next/server"
import { query } from "@/lib/db"

export const runtime = "nodejs"

type AirtableRecord = {
  id: string
  fields: Record<string, any>
}

type AirtableListResponse = {
  records: AirtableRecord[]
  offset?: string
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get("type")
  const configId = searchParams.get("configId")

  if (type === "bases") {
    try {
      const bases = await query("SELECT id, base_name as name FROM airtable_bases ORDER BY sort_order ASC")
      return NextResponse.json({ bases })
    } catch (err: any) {
      return NextResponse.json({ error: "Failed to fetch bases", details: err?.message }, { status: 500 })
    }
  }

  if (!configId) {
    return NextResponse.json({ error: "Missing configId parameter." }, { status: 400 })
  }

  try {
    const configRows = await query("SELECT * FROM airtable_bases WHERE id = ?", [configId]) as any[]
    
    if (!configRows || configRows.length === 0) {
      return NextResponse.json({ error: "Configuration not found in database." }, { status: 404 })
    }

    const config = configRows[0]
    const apiKey = process.env.AIRTABLE_API_KEY
    const baseId = config.base_id
    const tableId = config.table_id
    const viewId = config.view_id
    const assignedField = process.env.AIRTABLE_ASSIGNED_VA_FIELD || "Assigned VA"
    const usernameField = process.env.AIRTABLE_USERNAME_FIELD || "Username"

    if (!apiKey || !baseId || !tableId) {
      return NextResponse.json(
        { error: "Missing Airtable credentials or table configuration." },
        { status: 500 }
      )
    }

    const urlBase = `https://api.airtable.com/v0/${encodeURIComponent(baseId)}/${encodeURIComponent(tableId)}`

    const all: AirtableRecord[] = []
    let offset = ""

    while (true) {
      const u = new URL(urlBase)
      u.searchParams.set("pageSize", "100")
      u.searchParams.append("fields[]", assignedField)
      u.searchParams.append("fields[]", usernameField)
      if (viewId) u.searchParams.set("view", viewId)
      if (offset) u.searchParams.set("offset", offset)

      const r = await fetch(u.toString(), {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      })

      if (!r.ok) {
        const text = await r.text().catch(() => "")
        return NextResponse.json(
          { error: `Airtable request failed: HTTP ${r.status} ${r.statusText}`, details: text || undefined },
          { status: 502 }
        )
      }

      const j = (await r.json()) as AirtableListResponse
      all.push(...(Array.isArray(j.records) ? j.records : []))

      if (!j.offset) break
      offset = j.offset
    }

    const map = new Map<string, { id: string; name: string; usernames: { id: string; name: string; username: string }[] }>()

    for (const rec of all) {
      const fields = rec.fields || {}
      const assignedRaw = fields[assignedField]
      const usernameRaw = fields[usernameField]

      const usernamesArr: string[] =
        typeof usernameRaw === "string"
          ? [usernameRaw]
          : Array.isArray(usernameRaw)
            ? usernameRaw.filter((x) => typeof x === "string")
            : []

      const managers: string[] =
        typeof assignedRaw === "string"
          ? [assignedRaw]
          : Array.isArray(assignedRaw)
            ? assignedRaw.filter((x) => typeof x === "string")
            : []

      if (managers.length === 0 || usernamesArr.length === 0) continue

      for (const mgrName of managers) {
        const mgr = mgrName.trim()
        if (!mgr) continue

        const mgrId = `va_${slugify(mgr)}`
        const existing = map.get(mgrId) || { id: mgrId, name: mgr, usernames: [] }

        for (const u of usernamesArr) {
          const un = u.trim()
          if (!un) continue
          const usernameId = `u_${slugify(un)}`
          if (!existing.usernames.some((m) => m.id === usernameId)) {
            existing.usernames.push({ id: usernameId, name: un, username: un })
          }
        }

        map.set(mgrId, existing)
      }
    }

    const formattedManagers = Array.from(map.values())
      .map((m) => ({
        ...m,
        usernames: m.usernames.slice().sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .sort((a, b) => a.name.localeCompare(b.name))

    return NextResponse.json({
      managers: formattedManagers,
      meta: {
        usedView: !!viewId,
        assignedField,
        usernameField,
        totalRecordsFetched: all.length,
      },
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: "Unexpected server error while fetching Airtable.", details: err?.message || String(err) },
      { status: 500 }
    )
  }
}