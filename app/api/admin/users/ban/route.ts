import { type NextRequest, NextResponse } from "next/server"
import { verifyAdminToken } from "@/lib/auth"
import { query } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "")
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = verifyAdminToken(token)
    if (!payload) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const body = await request.json()
    const { userId, reason } = body

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    
    if (Number.parseInt(userId) === payload.userId) {
      return NextResponse.json({ error: "Cannot ban your own account" }, { status: 400 })
    }

    await query(
      "INSERT INTO banned_users (user_id, banned_by, reason) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE reason = ?, banned_at = NOW()",
      [userId, payload.userId, reason || null, reason || null],
    )

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error banning user:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "")
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = verifyAdminToken(token)
    if (!payload) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("id")

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    await query("DELETE FROM banned_users WHERE user_id = ?", [userId])

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error unbanning user:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
