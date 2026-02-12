"use client"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Users } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { UsersTab } from "@/components/admin/users-tab"
import { AirtableBaseTab } from "@/components/admin/airtable-base-tab"
import s from "@/styles/scraper.module.css"

type User = {
  id: number
  email: string
  username?: string | null
  is_admin: boolean
  email_verified: boolean
  created_at: string
  post_count: number
  copied_count: number
  banned_id: number | null
  ban_reason: string | null
  banned_at: string | null
}

export default function AdminPage() {
  const router = useRouter()
  const { toast } = useToast()

  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [uploadingFile, setUploadingFile] = useState(false)

  const [banner, setBanner] = useState<{ text: string; kind: "ok" | "err" } | null>(null)
  const bannerTimerRef = useRef<number | null>(null)

  const showBanner = (text: string, kind: "ok" | "err" = "ok") => {
    setBanner({ text, kind })
    if (bannerTimerRef.current) window.clearTimeout(bannerTimerRef.current)
    bannerTimerRef.current = window.setTimeout(() => setBanner(null), 2000)
  }

  useEffect(() => {
    return () => {
      if (bannerTimerRef.current) window.clearTimeout(bannerTimerRef.current)
    }
  }, [])

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) {
      router.push("/login")
      return
    }
    fetchUsers()
  }, [router])

  const fetchUsers = async () => {
    const token = localStorage.getItem("token")
    if (!token) return

    try {
      setIsLoading(true)
      const usersRes = await fetch("/api/admin/users", {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!usersRes.ok) {
        if (usersRes.status === 403) {
          toast({
            title: "Access Denied",
            description: "You don't have admin privileges",
            variant: "destructive",
          })
          router.push("/")
          return
        }
        throw new Error("Failed to fetch users")
      }

      const usersData = await usersRes.json()
      setUsers(usersData.users)
    } catch (error: any) {
      console.error("Error fetching users:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to load users",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleBanUser = async (userId: number, currentlyBanned: boolean) => {
    const token = localStorage.getItem("token")
    if (!token) {
      toast({
        title: "Error",
        description: "Authentication token missing",
        variant: "destructive",
      })
      return
    }

    try {
      if (currentlyBanned) {
        const response = await fetch(`/api/admin/users/ban?id=${userId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || "Failed to unban user")
        }

        toast({ title: "Success", description: "User unbanned successfully", duration: 5000 })
      } else {
        const reason = prompt("Enter ban reason (optional):")

        const response = await fetch("/api/admin/users/ban", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ userId, reason }),
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || "Failed to ban user")
        }

        toast({ title: "Success", description: "User banned successfully", duration: 5000 })
      }

      await fetchUsers()
    } catch (error: any) {
      console.error("Error managing user ban:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to update user ban status",
        variant: "destructive",
      })
    }
  }

  const handleDeleteUser = async (userId: number) => {
    const token = localStorage.getItem("token")
    if (!token) {
      toast({
        title: "Error",
        description: "Authentication token missing",
        variant: "destructive",
      })
      return
    }

    if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) return

    try {
      const response = await fetch(`/api/admin/users?id=${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to delete user")
      }

      toast({ title: "Success", description: "User deleted successfully", duration: 5000 })
      await fetchUsers()
    } catch (error: any) {
      console.error("Error deleting user:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      })
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="flex items-center justify-center gap-3 flex-col text-center">
          <div className="relative">
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-primary-foreground bg-primary animate-bounce">
              <Users className="w-6 h-6" />
            </div>
            <div className="absolute inset-0 rounded-full bg-primary/30 animate-ping" />
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-pulse" />
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:0ms]" />
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:150ms]" />
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-background ${s.bgPattern}`}>
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Admin Panel</h1>
          <p className="text-muted-foreground">Manage users and Airtable bases</p>
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="flex w-full items-center justify-start gap-2 overflow-x-auto whitespace-nowrap px-1 lg:justify-between lg:overflow-visible lg:px-1">
            <TabsTrigger className="flex-none px-4 lg:flex-1 lg:justify-center" value="users">
              Users
            </TabsTrigger>
            <TabsTrigger className="flex-none px-4 lg:flex-1 lg:justify-center" value="airtable_base">
              Airtable Base
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            <UsersTab
              users={users}
              onBanUser={handleBanUser}
              onDeleteUser={handleDeleteUser}
              disabled={uploadingFile}
              savingMap={{}}
              onUpdateUsername={async () => {}}
            />
          </TabsContent>

          <TabsContent value="airtable_base" className="space-y-4">
            <AirtableBaseTab />
          </TabsContent>
        </Tabs>

        {banner && (
          <div
            className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] px-3 py-2 text-sm rounded-md shadow-lg ${
              banner.kind === "ok" ? "bg-foreground text-background" : "bg-rose-600 text-white"
            }`}
            role="status"
            aria-live="polite"
          >
            {banner.text}
          </div>
        )}
      </div>
    </div>
  )
}
