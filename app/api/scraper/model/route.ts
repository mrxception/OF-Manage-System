import { NextResponse } from "next/server"
import { verifyToken } from "@/lib/auth"
import { queryOne } from "@/lib/db"

export const runtime = "nodejs"

function tokenFromReq(req: Request): string | null {
  const h = req.headers.get("authorization") || ""
  const m = /^Bearer\s+(.+)$/i.exec(h)
  if (m?.[1]) return m[1]
  const ck = req.headers.get("cookie") || ""
  const part = ck
    .split(";")
    .map(s => s.trim())
    .find(s => s.startsWith("token="))
  return part ? decodeURIComponent(part.split("=").slice(1).join("=")) : null
}

export async function POST(req: Request) {
  try {
    const tok = tokenFromReq(req)
    if (!tok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const me = verifyToken(tok)
    const userId = (me as any)?.userId ?? (me as any)?.id
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await req.json().catch(() => null)
    const username = String(body?.username || "").trim()
    const baseId = body?.baseId

    if (!username) return NextResponse.json({ error: "Username required" }, { status: 400 })

    let row;
    if (baseId) {
      row = await queryOne<{ payload: any; cqs: string }>(
        "SELECT payload, cqs FROM saved_scrapes WHERE username = ? AND airtable_base_id = ? ORDER BY scraped_at DESC LIMIT 1",
        [username, baseId]
      )
    } else {
      row = await queryOne<{ payload: any; cqs: string }>(
        "SELECT payload, cqs FROM saved_scrapes WHERE username = ? ORDER BY scraped_at DESC LIMIT 1",
        [username]
      )
    }

    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 })

    const payload = typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload
    return NextResponse.json({ payload, cqs: row.cqs }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Internal error" }, { status: 500 })
  }
}