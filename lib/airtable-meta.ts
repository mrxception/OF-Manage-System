// lib/airtable-meta.ts
export async function fetchTableNameFromAirtable(baseId: string, tableId: string) {
  const key = process.env.AIRTABLE_API_KEY
  if (!key) return null

  const res = await fetch(`https://api.airtable.com/v0/meta/bases/${baseId}/tables`, {
    headers: { Authorization: `Bearer ${key}` },
    cache: "no-store",
  })

  if (!res.ok) return null

  const data = (await res.json()) as { tables?: Array<{ id: string; name: string }> }
  const found = data?.tables?.find((t) => t.id === tableId)
  return found?.name ?? null
}
