import { NextResponse } from "next/server"

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

export async function GET() {
  const apiKey = process.env.AIRTABLE_API_KEY
  const baseId = process.env.AIRTABLE_BASE_ID
  const tableId = process.env.AIRTABLE_TABLE_ID

  const viewId = process.env.AIRTABLE_VIEW_ID || ""
  const assignedField = process.env.AIRTABLE_ASSIGNED_VA_FIELD || "Assigned VA"
  const usernameField = process.env.AIRTABLE_USERNAME_FIELD || "Username"

  if (!apiKey || !baseId || !tableId) {
    return NextResponse.json(
      { error: "Missing Airtable env vars. Required: AIRTABLE_API_KEY, AIRTABLE_BASE_ID, AIRTABLE_TABLE_ID" },
      { status: 500 }
    )
  }

  const urlBase = `https://api.airtable.com/v0/${encodeURIComponent(baseId)}/${encodeURIComponent(tableId)}`

  const all: AirtableRecord[] = []
  let offset = ""

  try {
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

    const map = new Map<string, { id: string; name: string; models: { id: string; name: string; username: string }[] }>()

    for (const rec of all) {
      const fields = rec.fields || {}
      const assignedRaw = fields[assignedField]
      const usernameRaw = fields[usernameField]

      const usernames: string[] =
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

      if (managers.length === 0 || usernames.length === 0) continue

      for (const mgrName of managers) {
        const mgr = mgrName.trim()
        if (!mgr) continue

        const mgrId = `va_${slugify(mgr)}`
        const existing = map.get(mgrId) || { id: mgrId, name: mgr, models: [] }

        for (const u of usernames) {
          const un = u.trim()
          if (!un) continue
          const modelId = `u_${slugify(un)}`
          if (!existing.models.some((m) => m.id === modelId)) {
            existing.models.push({ id: modelId, name: un, username: un })
          }
        }

        map.set(mgrId, existing)
      }
    }

    const managers = Array.from(map.values())
      .map((m) => ({
        ...m,
        models: m.models.slice().sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .sort((a, b) => a.name.localeCompare(b.name))

    return NextResponse.json({
      managers,
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
