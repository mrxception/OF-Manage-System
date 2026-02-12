// users-tab.tsx
"use client"

import { useMemo, useState } from "react"
import { Card } from "@/components/ui/card"
import { Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { UserRow } from "./user-row"

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

type UsersTabProps = {
  users: User[]
  onBanUser: (userId: number, currentlyBanned: boolean) => Promise<void>
  onDeleteUser: (userId: number) => Promise<void>
  onUpdateUsername: (userId: number, username: string | null) => Promise<void>
  disabled: boolean
  savingMap: Record<number, boolean>
}

type StatusFilter = "all" | "active" | "banned"

export function UsersTab({ users, onBanUser, onDeleteUser, onUpdateUsername, disabled, savingMap }: UsersTabProps) {
  const [status, setStatus] = useState<StatusFilter>("all")

  const filteredUsers = useMemo(() => {
    if (status === "all") return users
    if (status === "active") return users.filter((u) => !u.banned_id)
    return users.filter((u) => !!u.banned_id)
  }, [users, status])

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          <h2 className="text-xl font-semibold">User Management</h2>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant={status === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatus("all")}
          >
            All
          </Button>
          <Button
            type="button"
            variant={status === "active" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatus("active")}
          >
            Active
          </Button>
          <Button
            type="button"
            variant={status === "banned" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatus("banned")}
          >
            Banned
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left p-3 text-sm font-medium">Email</th>
              <th className="text-left p-3 text-sm font-medium">Status</th>
              <th className="text-left p-3 text-sm font-medium">Joined</th>
              <th className="text-right p-3 text-sm font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <UserRow
                key={user.id}
                user={user}
                onBan={onBanUser}
                onDelete={onDeleteUser}
                onUpdateUsername={onUpdateUsername}
                disabled={disabled}
                saving={!!savingMap[user.id]}
              />
            ))}
          </tbody>
        </table>

        {filteredUsers.length === 0 && (
          <div className="py-10 text-center text-sm text-muted-foreground">No users match this filter.</div>
        )}
      </div>
    </Card>
  )
}
