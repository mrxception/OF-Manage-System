"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import Scraper from "@/components/scraper/scraper"

export default function ScraperPage() {
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      router.push("/login")
    }
  }, [router])

  return <Scraper />
}
