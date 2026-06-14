/**
 * Drill-down helpers: node → incidents, edge → co-occurring incidents.
 */

export interface TicketMeta {
  ticket_id: string;
  short_description: string;
  opened_at?: string;
  category?: string;
  subcategory?: string;
  priority?: string;
  status?: string;
  business_unit?: string;
  location?: string;
  country?: string;
  state?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function extractMeta(row: Record<string, any>): TicketMeta {
  return {
    ticket_id: String(row.ticket_id ?? row.id ?? ""),
    short_description: String(row.short_description ?? ""),
    opened_at: row.opened_at,
    category: row.category,
    subcategory: row.subcategory,
    priority: row.priority,
    status: row.status,
    business_unit: row.business_unit,
    location: row.location,
    country: row.country,
    state: row.state,
  };
}

export function nodeIncidents(
  term: string,
  ticketIds: Set<string>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  allRows: Record<string, any>[]
): TicketMeta[] {
  return allRows
    .filter((r) => ticketIds.has(String(r.ticket_id ?? r.id ?? "")))
    .map(extractMeta);
}

export function edgeIncidents(
  ticketIds: Set<string>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  allRows: Record<string, any>[]
): TicketMeta[] {
  return allRows
    .filter((r) => ticketIds.has(String(r.ticket_id ?? r.id ?? "")))
    .map(extractMeta);
}

// Highlight term occurrences in description text (returns HTML-safe string)
export function highlightTerms(text: string, terms: string[]): string {
  if (!text || !terms.length) return escapeHtml(text);
  let result = escapeHtml(text);
  for (const term of terms) {
    const plain = term.replace(/_/g, " ");
    const regex = new RegExp(`\\b(${escapeRegex(plain)})\\b`, "gi");
    result = result.replace(
      regex,
      '<mark class="bg-yellow-200 dark:bg-yellow-700 rounded px-0.5">$1</mark>'
    );
  }
  return result;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
