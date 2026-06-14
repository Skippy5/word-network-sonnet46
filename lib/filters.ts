/**
 * Filter helpers: extract unique values and apply multi-select filters.
 */

export interface FilterState {
  business_unit: string[];
  location: string[];
  country: string[];
  state: string[];
  category: string[];
  priority: string[];
  status: string[];
}

export const EMPTY_FILTERS: FilterState = {
  business_unit: [],
  location: [],
  country: [],
  state: [],
  category: [],
  priority: [],
  status: [],
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getUniqueValues(rows: Record<string, any>[], col: string): string[] {
  const set = new Set<string>();
  for (const row of rows) {
    const val = row[col];
    if (val && String(val).trim()) set.add(String(val).trim());
  }
  return [...set].sort();
}

export function applyFilters(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rows: Record<string, any>[],
  filters: FilterState
): typeof rows {
  return rows.filter((row) => {
    for (const [col, selected] of Object.entries(filters)) {
      if (selected.length === 0) continue;
      const val = String(row[col] ?? "").trim();
      if (!selected.includes(val)) return false;
    }
    return true;
  });
}
