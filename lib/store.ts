/**
 * Global app state via Zustand.
 */
import { create } from "zustand";
import {
  DEFAULT_STOP_WORDS,
  DEFAULT_SYNONYMS,
  DEFAULT_PHRASES,
} from "./pipeline";
import { DEFAULT_PRUNING, type PruningConfig } from "./cooccurrence";
import type { FilterState } from "./filters";
import { EMPTY_FILTERS } from "./filters";

export interface AppSettings {
  stopWords: string[];          // editable list (serialized as array)
  synonymMap: Record<string, string>;
  phrases: string[];
  usePhrases: boolean;
  textColumns: string[];
  urlTemplate: string;          // e.g. https://servicenow.co/incident?id={ticket_id}
}

export const DEFAULT_SETTINGS: AppSettings = {
  stopWords: [...DEFAULT_STOP_WORDS],
  synonymMap: DEFAULT_SYNONYMS,
  phrases: DEFAULT_PHRASES,
  usePhrases: true,
  textColumns: ["short_description", "work_notes", "close_notes"],
  urlTemplate: "",
};

export interface DrillTarget {
  type: "node" | "edge";
  label: string;          // human-readable term or "termA ↔ termB"
  ticketIds: Set<string>;
  terms: string[];        // for highlighting
}

export interface AppState {
  // Data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rawRows: Record<string, any>[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  filteredRows: Record<string, any>[];

  // Filters
  filters: FilterState;

  // Settings
  settings: AppSettings;

  // Graph tuning
  pruning: PruningConfig;
  louvainResolution: number;
  physicsEnabled: boolean;
  weightMode: "count" | "pmi";

  // UI state
  drillTarget: DrillTarget | null;
  settingsOpen: boolean;
  infoOpen: boolean;
  darkMode: boolean;

  // Actions
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setRawRows: (rows: Record<string, any>[]) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setFilteredRows: (rows: Record<string, any>[]) => void;
  setFilters: (f: Partial<FilterState>) => void;
  resetFilters: () => void;
  setSettings: (s: Partial<AppSettings>) => void;
  setPruning: (p: Partial<PruningConfig>) => void;
  setLouvainResolution: (r: number) => void;
  setPhysicsEnabled: (v: boolean) => void;
  setWeightMode: (m: "count" | "pmi") => void;
  setDrillTarget: (t: DrillTarget | null) => void;
  setSettingsOpen: (v: boolean) => void;
  setInfoOpen: (v: boolean) => void;
  toggleDarkMode: () => void;
}

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveToStorage(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage errors
  }
}

export const useAppStore = create<AppState>((set, get) => ({
  rawRows: [],
  filteredRows: [],
  filters: EMPTY_FILTERS,
  settings: loadFromStorage("wn_settings", DEFAULT_SETTINGS),
  pruning: loadFromStorage("wn_pruning", DEFAULT_PRUNING),
  louvainResolution: loadFromStorage("wn_resolution", 1.0),
  physicsEnabled: true,
  weightMode: "count",
  drillTarget: null,
  settingsOpen: false,
  infoOpen: false,
  darkMode: loadFromStorage("wn_darkmode", false),

  setRawRows: (rows) => set({ rawRows: rows }),
  setFilteredRows: (rows) => set({ filteredRows: rows }),

  setFilters: (f) => {
    const next = { ...get().filters, ...f };
    set({ filters: next });
  },
  resetFilters: () => set({ filters: EMPTY_FILTERS }),

  setSettings: (s) => {
    const next = { ...get().settings, ...s };
    saveToStorage("wn_settings", next);
    set({ settings: next });
  },

  setPruning: (p) => {
    const next = { ...get().pruning, ...p };
    saveToStorage("wn_pruning", next);
    set({ pruning: next });
  },

  setLouvainResolution: (r) => {
    saveToStorage("wn_resolution", r);
    set({ louvainResolution: r });
  },

  setPhysicsEnabled: (v) => set({ physicsEnabled: v }),
  setWeightMode: (m) => set({ weightMode: m }),
  setDrillTarget: (t) => set({ drillTarget: t }),
  setSettingsOpen: (v) => set({ settingsOpen: v }),
  setInfoOpen: (v) => set({ infoOpen: v }),

  toggleDarkMode: () => {
    const next = !get().darkMode;
    saveToStorage("wn_darkmode", next);
    set({ darkMode: next });
  },
}));
