import { NextResponse } from "next/server"
import { query } from "@/lib/db"

export async function POST(request: Request) {
  try {
    const { email, code } = await request.json()

    if (!email || !code) {
      return NextResponse.json(
        { error: "Email and code are required" },
        { status: 400 }
      )
    }

    const [user]: any = await query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    )

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    if (user.email_verified) {
      return NextResponse.json(
        { message: "Email already verified" },
        { status: 200 }
      )
    }

    const now = new Date()
    const expiresAt = user.verification_expires_at
      ? new Date(user.verification_expires_at)
      : null

    if (expiresAt && now > expiresAt) {
      return NextResponse.json(
        { error: "Verification code has expired" },
        { status: 400 }
      )
    }

    if (user.verification_code !== code) {
      return NextResponse.json(
        { error: "Incorrect verification code" }, 
        { status: 400 }
      )
    }

    await query(
      `UPDATE users
         SET email_verified = 1,
             verification_code = NULL,
             verification_expires_at = NULL
       WHERE email = ?`,
      [email]
    )

    return NextResponse.json(
      { message: "Email verified successfully!" },
      { status: 200 }
    )
  } catch (error) {
    console.error("Verification error:", error)
    return NextResponse.json({ error: "Verification failed" }, { status: 500 })
  }
}