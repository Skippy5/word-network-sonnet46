"use client";
import { useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { getUniqueValues, applyFilters } from "@/lib/filters";
import type { FilterState } from "@/lib/filters";

function MultiSelect({
  label,
  options,
  selected,
  onChange,
  darkMode,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
  darkMode: boolean;
}) {
  const toggle = (val: string) => {
    if (selected.includes(val)) {
      onChange(selected.filter((s) => s !== val));
    } else {
      onChange([...selected, val]);
    }
  };

  if (options.length === 0) return null;

  return (
    <div className="mb-4">
      <div className={`text-xs font-semibold uppercase tracking-wider mb-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
        {label}
      </div>
      <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
        {options.map((opt) => (
          <label
            key={opt}
            className={`flex items-center gap-2 text-sm cursor-pointer rounded px-1 py-0.5 ${
              selected.includes(opt)
                ? darkMode
                  ? "bg-blue-900 text-blue-200"
                  : "bg-blue-100 text-blue-800"
                : darkMode
                ? "hover:bg-gray-700 text-gray-300"
                : "hover:bg-gray-100 text-gray-700"
            }`}
          >
            <input
              type="checkbox"
              className="rounded"
              checked={selected.includes(opt)}
              onChange={() => toggle(opt)}
            />
            <span className="truncate">{opt}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

export default function FilterRail() {
  const {
    rawRows,
    filters,
    setFilters,
    resetFilters,
    filteredRows,
    pruning,
    setPruning,
    louvainResolution,
    setLouvainResolution,
    physicsEnabled,
    setPhysicsEnabled,
    weightMode,
    setWeightMode,
    settings,
    setSettings,
    setSettingsOpen,
    darkMode,
  } = useAppStore();

  // Available options, cascading for geography
  const countries = useMemo(() => getUniqueValues(rawRows, "country"), [rawRows]);
  const states = useMemo(() => {
    const base = filters.country.length > 0
      ? rawRows.filter((r) => filters.country.includes(r.country))
      : rawRows;
    return getUniqueValues(base, "state");
  }, [rawRows, filters.country]);
  const locations = useMemo(() => {
    let base = rawRows;
    if (filters.country.length > 0) base = base.filter((r) => filters.country.includes(r.country));
    if (filters.state.length > 0) base = base.filter((r) => filters.state.includes(r.state));
    return getUniqueValues(base, "location");
  }, [rawRows, filters.country, filters.state]);
  const businessUnits = useMemo(() => getUniqueValues(rawRows, "business_unit"), [rawRows]);
  const categories = useMemo(() => getUniqueValues(rawRows, "category"), [rawRows]);
  const priorities = useMemo(() => getUniqueValues(rawRows, "priority"), [rawRows]);
  const statuses = useMemo(() => getUniqueValues(rawRows, "status"), [rawRows]);

  const totalCount = rawRows.length;
  const filteredCount = filteredRows.length;

  const panel = darkMode
    ? "bg-gray-800 border-gray-700 text-gray-100"
    : "bg-white border-gray-200 text-gray-900";
  const sectionHead = darkMode ? "text-gray-300" : "text-gray-700";
  const divider = darkMode ? "border-gray-700" : "border-gray-200";

  if (rawRows.length === 0) return null;

  return (
    <div className={`w-72 flex-shrink-0 border-r overflow-y-auto h-full ${panel}`}>
      <div className="p-4">
        {/* Scope count */}
        <div className={`text-sm font-medium mb-3 ${sectionHead}`}>
          Showing <span className="font-bold text-blue-500">{filteredCount}</span>{" "}
          of {totalCount} incidents
        </div>

        {/* Reset */}
        <button
          onClick={resetFilters}
          className="mb-4 text-xs text-blue-500 hover:text-blue-700 underline"
        >
          Reset all filters
        </button>

        {/* Geography filters */}
        <div className={`border-t pt-3 ${divider}`}>
          <div className={`text-xs font-bold uppercase tracking-widest mb-2 ${sectionHead}`}>
            Geography
          </div>
          <MultiSelect
            label="Country"
            options={countries}
            selected={filters.country}
            onChange={(v) => {
              // Cascade: reset state and location when country changes
              setFilters({ country: v, state: [], location: [] });
            }}
            darkMode={darkMode}
          />
          <MultiSelect
            label="State / Region"
            options={states}
            selected={filters.state}
            onChange={(v) => setFilters({ state: v, location: [] })}
            darkMode={darkMode}
          />
          <MultiSelect
            label="Location"
            options={locations}
            selected={filters.location}
            onChange={(v) => setFilters({ location: v })}
            darkMode={darkMode}
          />
        </div>

        {/* Business */}
        <div className={`border-t pt-3 mt-1 ${divider}`}>
          <div className={`text-xs font-bold uppercase tracking-widest mb-2 ${sectionHead}`}>
            Organisation
          </div>
          <MultiSelect
            label="Business Unit"
            options={businessUnits}
            selected={filters.business_unit}
            onChange={(v) => setFilters({ business_unit: v })}
            darkMode={darkMode}
          />
          <MultiSelect
            label="Category"
            options={categories}
            selected={filters.category}
            onChange={(v) => setFilters({ category: v })}
            darkMode={darkMode}
          />
          <MultiSelect
            label="Priority"
            options={priorities}
            selected={filters.priority}
            onChange={(v) => setFilters({ priority: v })}
            darkMode={darkMode}
          />
          <MultiSelect
            label="Status"
            options={statuses}
            selected={filters.status}
            onChange={(v) => setFilters({ status: v as FilterState["status"] })}
            darkMode={darkMode}
          />
        </div>

        {/* Graph tuning */}
        <div className={`border-t pt-3 mt-1 ${divider}`}>
          <div className={`text-xs font-bold uppercase tracking-widest mb-3 ${sectionHead}`}>
            Graph Tuning
          </div>

          <SliderField
            label="Min term freq"
            value={pruning.minTermFreq}
            min={1} max={30} step={1}
            onChange={(v) => setPruning({ minTermFreq: v })}
            darkMode={darkMode}
          />
          <SliderField
            label="Min edge count"
            value={pruning.minEdgeCount}
            min={1} max={20} step={1}
            onChange={(v) => setPruning({ minEdgeCount: v })}
            darkMode={darkMode}
          />
          <SliderField
            label="Max terms"
            value={pruning.maxTerms}
            min={10} max={150} step={5}
            onChange={(v) => setPruning({ maxTerms: v })}
            darkMode={darkMode}
          />
          <SliderField
            label="Louvain resolution"
            value={louvainResolution}
            min={0.1} max={3} step={0.1}
            onChange={setLouvainResolution}
            darkMode={darkMode}
          />

          {/* Weight mode */}
          <div className="mb-3">
            <div className={`text-xs font-semibold mb-1 ${sectionHead}`}>Edge weight</div>
            <div className="flex gap-2">
              {(["count", "pmi"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setWeightMode(m)}
                  className={`flex-1 text-xs py-1 rounded border ${
                    weightMode === m
                      ? "bg-blue-500 text-white border-blue-500"
                      : darkMode
                      ? "border-gray-600 text-gray-300 hover:bg-gray-700"
                      : "border-gray-300 text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {m.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Text columns */}
          <div className="mb-3">
            <div className={`text-xs font-semibold mb-1 ${sectionHead}`}>Text sources</div>
            {(["short_description", "work_notes", "close_notes"] as const).map((col) => (
              <label key={col} className="flex items-center gap-2 text-xs mb-1">
                <input
                  type="checkbox"
                  checked={settings.textColumns.includes(col)}
                  onChange={(e) => {
                    const cols = e.target.checked
                      ? [...settings.textColumns, col]
                      : settings.textColumns.filter((c) => c !== col);
                    if (cols.length > 0) setSettings({ textColumns: cols });
                  }}
                />
                <span className={darkMode ? "text-gray-300" : "text-gray-600"}>
                  {col.replace(/_/g, " ")}
                </span>
              </label>
            ))}
          </div>

          {/* Phrase detection toggle */}
          <label className="flex items-center gap-2 text-xs mb-3">
            <input
              type="checkbox"
              checked={settings.usePhrases}
              onChange={(e) => setSettings({ usePhrases: e.target.checked })}
            />
            <span className={darkMode ? "text-gray-300" : "text-gray-600"}>
              Phrase detection
            </span>
          </label>

          {/* Physics toggle */}
          <label className="flex items-center gap-2 text-xs mb-3">
            <input
              type="checkbox"
              checked={physicsEnabled}
              onChange={(e) => setPhysicsEnabled(e.target.checked)}
            />
            <span className={darkMode ? "text-gray-300" : "text-gray-600"}>
              Physics enabled
            </span>
          </label>
        </div>

        {/* Settings */}
        <div className={`border-t pt-3 mt-1 ${divider}`}>
          <button
            onClick={() => setSettingsOpen(true)}
            className="text-xs text-blue-500 hover:text-blue-700 underline"
          >
            Edit stop words &amp; synonyms →
          </button>
        </div>
      </div>
    </div>
  );
}

function SliderField({
  label,
  value,
  min,
  max,
  step,
  onChange,
  darkMode,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  darkMode: boolean;
}) {
  return (
    <div className="mb-3">
      <div className={`text-xs flex justify-between mb-0.5 ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
        <span>{label}</span>
        <span className="font-mono font-bold">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-blue-500"
      />
    </div>
  );
}
