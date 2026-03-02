// app/api/admin/airtable-bases/route.ts
import { NextRequest, NextResponse } from "next/server"
import { verifyAdminToken } from "@/lib/auth"
import { query } from "@/lib/db"
import { parseAirtableLink } from "@/lib/airtable-link"
import { fetchTableNameFromAirtable, fetchBaseNameFromAirtable } from "@/lib/airtable-meta"

function getBearerToken(req: NextRequest) {
  const raw = req.headers.get("authorization") || ""
  if (!raw.startsWith("Bearer ")) return null
  const token = raw.slice("Bearer ".length).trim()
  return token.length ? token : null
}

export async function GET(req: NextRequest) {
  try {
    const token = getBearerToken(req)
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (!verifyAdminToken(token)) return NextResponse.json({ error: "Admin access required" }, { status: 403 })

    const rows = await query(
      `
      SELECT id, base_id, table_id, view_id, table_name, base_name, sort_order, created_at
      FROM airtable_bases
      ORDER BY sort_order ASC, id ASC
      `,
    )

    return NextResponse.json({ bases: rows })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = getBearerToken(req)
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (!verifyAdminToken(token)) return NextResponse.json({ error: "Admin access required" }, { status: 403 })

    const body = await req.json().catch(() => null)
    const link = (body?.link ?? "") as string
    const parsed = parseAirtableLink(link)
    if (!parsed) return NextResponse.json({ error: "Invalid Airtable link" }, { status: 400 })

    const { baseId, tableId, viewId } = parsed

    const maxRow = await query<{ max_order: number | null }>(
      `SELECT MAX(sort_order) AS max_order FROM airtable_bases`,
    )
    const nextOrder = Number(maxRow?.[0]?.max_order ?? 0) + 1

    const tableName = await fetchTableNameFromAirtable(baseId, tableId)
    const baseName = await fetchBaseNameFromAirtable(baseId)

    await query(
      `
      INSERT INTO airtable_bases (base_id, table_id, view_id, table_name, base_name, sort_order)
      VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        table_name = COALESCE(VALUES(table_name), table_name),
        base_name = COALESCE(VALUES(base_name), base_name)
      `,
      [baseId, tableId, viewId, tableName, baseName, nextOrder],
    )

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const token = getBearerToken(req)
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (!verifyAdminToken(token)) return NextResponse.json({ error: "Admin access required" }, { status: 403 })

    const body = await req.json().catch(() => null)
    const orderedIds = (body?.orderedIds ?? []) as number[]
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return NextResponse.json({ error: "orderedIds is required" }, { status: 400 })
    }

    for (let i = 0; i < orderedIds.length; i++) {
      const id = Number(orderedIds[i])
      if (!Number.isFinite(id)) continue
      await query(`UPDATE airtable_bases SET sort_order = ? WHERE id = ?`, [i, id])
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const token = getBearerToken(req)
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (!verifyAdminToken(token)) return NextResponse.json({ error: "Admin access required" }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const idRaw = searchParams.get("id")
    if (!idRaw) return NextResponse.json({ error: "id is required" }, { status: 400 })
    const id = Number(idRaw)
    if (!Number.isFinite(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 })

    await query(`DELETE FROM airtable_bases WHERE id = ?`, [id])

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const missingBases = await query(
      `SELECT id, base_id FROM airtable_bases WHERE base_name IS NULL`
    );

    for (const row of missingBases) {
      const baseName = await fetchBaseNameFromAirtable(row.base_id);

      if (baseName) {
        await query(
          `UPDATE airtable_bases SET base_name = ? WHERE id = ?`,
          [baseName, row.id]
        );
      }
    }

    return NextResponse.json({ success: true, updatedCount: missingBases.length });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}