// app/api/admin/users/route.ts
import { type NextRequest, NextResponse } from "next/server"
import { verifyAdminToken } from "@/lib/auth"
import { query, queryOne } from "@/lib/db"

function getBearerToken(req: NextRequest) {
  const raw = req.headers.get("authorization") || ""
  if (!raw.startsWith("Bearer ")) return null
  const token = raw.slice("Bearer ".length).trim()
  return token.length ? token : null
}

export async function GET(request: NextRequest) {
  try {
    const token = getBearerToken(request)
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const payload = verifyAdminToken(token)
    if (!payload) return NextResponse.json({ error: "Admin access required" }, { status: 403 })

    const users = await query(
      `
      SELECT
        u.id,
        u.email,
        u.is_admin,
        u.email_verified,
        u.created_at,
        b.id AS banned_id,
        b.reason AS ban_reason,
        b.banned_at
      FROM users u
      LEFT JOIN banned_users b ON b.user_id = u.id
      ORDER BY u.created_at DESC
      `,
    )

    return NextResponse.json({ users })
  } catch (error: any) {
    console.error("Error fetching users:", error)
    return NextResponse.json({ error: error?.message || "Server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = getBearerToken(request)
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const payload = verifyAdminToken(token)
    if (!payload) return NextResponse.json({ error: "Admin access required" }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const userIdRaw = searchParams.get("id")
    if (!userIdRaw) return NextResponse.json({ error: "User ID is required" }, { status: 400 })

    const userId = Number(userIdRaw)
    if (!Number.isFinite(userId)) return NextResponse.json({ error: "Invalid user ID" }, { status: 400 })

    if (userId === payload.userId) {
      return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 })
    }

    const target = await queryOne<{ is_admin: number | boolean }>("SELECT is_admin FROM users WHERE id = ?", [userId])
    if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 })

    const isAdmin =
      typeof target.is_admin === "boolean" ? target.is_admin : Number(target.is_admin) === 1
    if (isAdmin) return NextResponse.json({ error: "Cannot delete an admin user" }, { status: 400 })

    await query("DELETE FROM banned_users WHERE user_id = ?", [userId])

    await query("DELETE FROM users WHERE id = ?", [userId])

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error deleting user:", error)
    return NextResponse.json({ error: error?.message || "Server error" }, { status: 500 })
  }
}
