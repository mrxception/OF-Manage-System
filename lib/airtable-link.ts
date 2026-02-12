// lib/airtable-link.ts
export function parseAirtableLink(link: string): {
  baseId: string
  tableId: string
  viewId: string | null
} | null {
  const s = (link || "").trim()
  if (!s) return null

  let url: URL
  try {
    url = new URL(s)
  } catch {
    return null
  }

  const host = url.hostname.toLowerCase()
  if (!host.endsWith("airtable.com")) return null

  // Expected patterns:
  // https://airtable.com/appXXXX/tblYYYY/viwZZZ
  // https://airtable.com/appXXXX/tblYYYY
  const parts = url.pathname.split("/").filter(Boolean)

  const baseId = parts.find((p) => /^app[a-zA-Z0-9]+$/.test(p)) || ""
  const tableId = parts.find((p) => /^tbl[a-zA-Z0-9]+$/.test(p)) || ""
  const viewId = parts.find((p) => /^viw[a-zA-Z0-9]+$/.test(p)) || null

  if (!baseId || !tableId) return null
  return { baseId, tableId, viewId }
}
