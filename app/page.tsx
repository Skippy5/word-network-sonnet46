"use client";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import Papa from "papaparse";
import { useAppStore } from "@/lib/store";
import { applyFilters } from "@/lib/filters";
import { processTickets, DEFAULT_PIPELINE_CONFIG } from "@/lib/pipeline";
import { buildCooccurrence, pruneGraph } from "@/lib/cooccurrence";
import { clusterGraph, type ClusteredGraph } from "@/lib/clustering";
import FilterRail from "@/components/FilterRail";
import EvidencePanel from "@/components/EvidencePanel";
import SettingsDialog from "@/components/SettingsDialog";
import InfoModal from "@/components/InfoModal";
import ExportMenu from "@/components/ExportMenu";
import ClusterLegend from "@/components/ClusterLegend";

// SSR: false — react-force-graph-2d is browser-only canvas
const GraphCanvas = dynamic(() => import("@/components/GraphCanvas"), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center text-gray-400">
      Loading graph renderer…
    </div>
  ),
});

const DEMO_FILES = [
  { name: "Small (~90 tickets)", file: "it_tickets_small.csv" },
  { name: "Large (~320 tickets)", file: "it_tickets_large.csv" },
  { name: "Multi-dept (~220)", file: "it_tickets_multidept.csv" },
  { name: "Messy data (~150)", file: "it_tickets_messy.csv" },
];

export default function Home() {
  const {
    rawRows,
    filteredRows,
    filters,
    setRawRows,
    setFilteredRows,
    settings,
    pruning,
    louvainResolution,
    weightMode,
    darkMode,
    toggleDarkMode,
    setInfoOpen,
    setSettingsOpen,
    drillTarget,
  } = useAppStore();

  const [graph, setGraph] = useState<ClusteredGraph | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [missingCols, setMissingCols] = useState<string[]>([]);
  const exportRef = useRef<HTMLDivElement>(null);

  // Re-filter whenever rawRows or filters change
  useEffect(() => {
    if (rawRows.length === 0) return;
    const filtered = applyFilters(rawRows, filters);
    setFilteredRows(filtered);
  }, [rawRows, filters, setFilteredRows]);

  // Re-compute graph whenever filtered rows or settings change
  useEffect(() => {
    if (filteredRows.length === 0) {
      setGraph(null);
      return;
    }

    const stopSet = new Set(settings.stopWords);
    const config = {
      ...DEFAULT_PIPELINE_CONFIG,
      stopWords: stopSet,
      synonymMap: settings.synonymMap,
      phrases: settings.phrases,
      usePhrases: settings.usePhrases,
      textColumns: settings.textColumns,
    };

    const processed = processTickets(filteredRows, config);
    const cooc = buildCooccurrence(processed);
    const pruned = pruneGraph(cooc, { ...pruning, weightMode });
    const clustered = clusterGraph(pruned, louvainResolution);
    setGraph(clustered);
  }, [filteredRows, settings, pruning, louvainResolution, weightMode]);

  // Parse a CSV file (or fetch from URL)
  const parseCSV = useCallback(
    (content: string | File) => {
      setLoading(true);
      setError(null);
      setMissingCols([]);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const onComplete = (result: Papa.ParseResult<Record<string, any>>) => {
        const required = ["ticket_id", "short_description"];
        const cols = Object.keys(result.data[0] ?? {});
        const missing = required.filter((c) => !cols.includes(c));
        if (missing.length) setMissingCols(missing);
        setRawRows(result.data);
        setLoading(false);
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const baseOpts: Omit<Papa.ParseConfig<Record<string, any>>, "complete"> = {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h: string) => h.trim().toLowerCase(),
      };

      if (typeof content === "string") {
        Papa.parse(content, { ...baseOpts, complete: onComplete });
      } else {
        Papa.parse(content, { ...baseOpts, worker: false, complete: onComplete });
      }
    },
    [setRawRows]
  );

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    const allFiles = Array.from(files);
    if (allFiles.length === 1) {
      parseCSV(allFiles[0]);
    } else {
      const allRows: Record<string, unknown>[] = [];
      let pending = allFiles.length;
      allFiles.forEach((f) => {
        Papa.parse(f, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (h: string) => h.trim().toLowerCase(),
          complete: (res: Papa.ParseResult<Record<string, unknown>>) => {
            allRows.push(...res.data);
            pending--;
            if (pending === 0) {
              setRawRows(allRows as Record<string, string>[]);
              setLoading(false);
            }
          },
        });
      });
    }
    e.target.value = "";
  };

  const loadDemo = async (file: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/samples/${file}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      parseCSV(text);
    } catch (err) {
      setError(`Failed to load demo: ${err}`);
      setLoading(false);
    }
  };

  // Click outside export menu to close
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setShowExport(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const bg = darkMode ? "bg-gray-900" : "bg-gray-50";
  const headerCls = darkMode
    ? "bg-gray-800 border-gray-700 text-gray-100"
    : "bg-white border-gray-200 text-gray-900";
  const subText = darkMode ? "text-gray-400" : "text-gray-500";

  const graphData = useMemo(() => {
    if (!graph) return { nodes: [], links: [] };
    return {
      nodes: graph.nodes,
      links: graph.edges.map((e) => ({
        source: e.source,
        target: e.target,
        weight: e.weight,
        ticketIds: e.ticketIds,
      })),
    };
  }, [graph]);

  return (
    <div className={`h-screen flex flex-col ${bg}`}>
      {/* Header */}
      <header
        className={`flex items-center gap-3 px-4 py-2.5 border-b shrink-0 ${headerCls}`}
      >
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-base truncate">
            IT Ticket Word Network
          </h1>
          {rawRows.length > 0 && (
            <p className={`text-xs ${subText}`}>
              Showing{" "}
              <span className="font-semibold text-blue-500">
                {filteredRows.length}
              </span>{" "}
              of {rawRows.length} incidents
              {graph && (
                <>
                  {" · "}
                  <span className="font-semibold">{graph.nodes.length}</span>{" "}
                  terms,{" "}
                  <span className="font-semibold">{graph.edges.length}</span>{" "}
                  edges,{" "}
                  <span className="font-semibold">
                    {graph.communities.size}
                  </span>{" "}
                  clusters
                </>
              )}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Upload */}
          <label className="cursor-pointer text-sm px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700 font-medium">
            Upload CSV
            <input
              type="file"
              accept=".csv"
              multiple
              className="hidden"
              onChange={onFileChange}
            />
          </label>

          {/* Demo data */}
          <select
            className={`text-sm px-2 py-1.5 rounded border cursor-pointer ${
              darkMode
                ? "bg-gray-700 border-gray-600 text-gray-200"
                : "bg-white border-gray-300 text-gray-700"
            }`}
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) loadDemo(e.target.value);
              e.target.value = "";
            }}
          >
            <option value="" disabled>
              Demo data…
            </option>
            {DEMO_FILES.map((d) => (
              <option key={d.file} value={d.file}>
                {d.name}
              </option>
            ))}
          </select>

          {/* Export */}
          {rawRows.length > 0 && (
            <div className="relative" ref={exportRef}>
              <button
                onClick={() => setShowExport((p) => !p)}
                className={`text-sm px-3 py-1.5 rounded border font-medium ${
                  darkMode
                    ? "border-gray-600 text-gray-200 hover:bg-gray-700"
                    : "border-gray-300 text-gray-700 hover:bg-gray-100"
                }`}
              >
                Export ▾
              </button>
              {showExport && <ExportMenu graph={graph} />}
            </div>
          )}

          {/* Settings */}
          <button
            onClick={() => setSettingsOpen(true)}
            title="Settings"
            className={`text-sm px-2.5 py-1.5 rounded border ${
              darkMode
                ? "border-gray-600 text-gray-300 hover:bg-gray-700"
                : "border-gray-300 text-gray-600 hover:bg-gray-100"
            }`}
          >
            ⚙
          </button>

          {/* Dark / light mode */}
          <button
            onClick={toggleDarkMode}
            title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            className={`text-sm px-2.5 py-1.5 rounded border ${
              darkMode
                ? "border-gray-600 text-yellow-400 hover:bg-gray-700"
                : "border-gray-300 text-gray-600 hover:bg-gray-100"
            }`}
          >
            {darkMode ? "☀" : "🌙"}
          </button>

          {/* Info */}
          <button
            onClick={() => setInfoOpen(true)}
            title="About this app — developed with Claude Sonnet 4.6"
            className={`text-sm px-2.5 py-1.5 rounded border font-bold ${
              darkMode
                ? "border-gray-600 text-gray-300 hover:bg-gray-700"
                : "border-gray-300 text-gray-600 hover:bg-gray-100"
            }`}
          >
            ℹ
          </button>
        </div>
      </header>

      {/* Missing columns warning */}
      {missingCols.length > 0 && (
        <div className="bg-amber-100 border-b border-amber-300 text-amber-800 text-sm px-4 py-2">
          ⚠ Missing required columns:{" "}
          <strong>{missingCols.join(", ")}</strong>. Some features may not work.
        </div>
      )}

      {/* Main layout */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left rail */}
        <FilterRail />

        {/* Center canvas */}
        <div className="flex-1 relative min-w-0">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/30">
              <div
                className={`rounded-lg px-6 py-4 shadow-xl text-center ${
                  darkMode ? "bg-gray-800" : "bg-white"
                }`}
              >
                <div className="animate-spin text-3xl mb-2">⚙</div>
                <div
                  className={`text-sm ${
                    darkMode ? "text-gray-200" : "text-gray-700"
                  }`}
                >
                  Processing…
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-red-100 border border-red-300 text-red-700 px-4 py-3 rounded-lg shadow-lg text-sm max-w-md">
              {error}
            </div>
          )}

          {rawRows.length === 0 && !loading && (
            <EmptyState darkMode={darkMode} loadDemo={loadDemo} />
          )}

          {filteredRows.length === 0 && rawRows.length > 0 && !loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className={`text-center ${subText}`}>
                <div className="text-4xl mb-3">🔍</div>
                <p className="text-lg font-medium">
                  No incidents match the current filters.
                </p>
                <p className="text-sm">Try removing some filters.</p>
              </div>
            </div>
          )}

          {graph && graph.nodes.length === 0 && filteredRows.length > 0 && !loading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className={`text-center ${subText}`}>
                <div className="text-4xl mb-3">📊</div>
                <p className="text-lg font-medium">
                  Graph is empty with current settings.
                </p>
                <p className="text-sm">
                  Try lowering Min term freq or Min edge count.
                </p>
              </div>
            </div>
          )}

          {graph && graph.nodes.length > 0 && (
            <>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <GraphCanvas
                nodes={graphData.nodes as any}
                links={graphData.links as any}
                darkMode={darkMode}
              />
              <ClusterLegend communities={graph.communities} />
            </>
          )}
        </div>

        {/* Right evidence panel */}
        {(rawRows.length > 0 || drillTarget) && <EvidencePanel />}
      </div>

      {/* Modals */}
      <SettingsDialog />
      <InfoModal />
    </div>
  );
}

function EmptyState({
  darkMode,
  loadDemo,
}: {
  darkMode: boolean;
  loadDemo: (f: string) => void;
}) {
  const subText = darkMode ? "text-gray-400" : "text-gray-500";
  const cardBg = darkMode
    ? "bg-gray-800 border-gray-700"
    : "bg-white border-gray-200";

  return (
    <div className="absolute inset-0 flex items-center justify-center p-8">
      <div
        className={`max-w-lg w-full rounded-2xl border shadow-xl p-8 text-center ${cardBg}`}
      >
        <div className="text-5xl mb-4">🕸️</div>
        <h2
          className={`text-xl font-bold mb-2 ${
            darkMode ? "text-gray-100" : "text-gray-900"
          }`}
        >
          IT Ticket Word Network
        </h2>
        <p className={`text-sm mb-6 ${subText}`}>
          Upload a CSV from ServiceNow (or any ITSM tool) to visualise word
          co-occurrence clusters across your tickets. Or try a demo dataset:
        </p>
        <div className="grid grid-cols-2 gap-2 mb-6">
          {DEMO_FILES.map((d) => (
            <button
              key={d.file}
              onClick={() => loadDemo(d.file)}
              className={`text-sm py-2 px-3 rounded-lg border ${
                darkMode
                  ? "border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
                  : "border-gray-200 text-gray-600 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-700"
              }`}
            >
              {d.name}
            </button>
          ))}
        </div>
        <label className="cursor-pointer inline-block text-sm px-5 py-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium">
          Upload your own CSV
          <input type="file" accept=".csv" multiple className="hidden" />
        </label>
        <p className={`mt-4 text-xs ${subText}`}>
          All processing happens in your browser. No data is sent anywhere.
        </p>
      </div>
    </div>
  );
}
