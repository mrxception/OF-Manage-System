"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (token) {
      router.push("/scraper")
    } else {
      router.push("/login")
    }
  }, [router])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-foreground mb-4">OFMReddit</h1>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  )
}
