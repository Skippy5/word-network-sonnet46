"use client";
import { useAppStore } from "@/lib/store";
import type { ClusteredGraph } from "@/lib/clustering";

interface Props {
  graph: ClusteredGraph | null;
}

function toCSV(rows: object[]): string {
  if (!rows.length) return "";
  const keys = Object.keys(rows[0]);
  const header = keys.join(",");
  const body = rows.map((r) =>
    keys
      .map((k) => {
        const v = (r as Record<string, unknown>)[k];
        const s = String(v ?? "");
        return s.includes(",") || s.includes('"') || s.includes("\n")
          ? `"${s.replace(/"/g, '""')}"`
          : s;
      })
      .join(",")
  );
  return [header, ...body].join("\n");
}

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ExportMenu({ graph }: Props) {
  const { filteredRows, darkMode } = useAppStore();

  const exportIncidents = () => {
    const csv = toCSV(
      filteredRows.map((r) => ({
        ticket_id: r.ticket_id,
        opened_at: r.opened_at,
        category: r.category,
        subcategory: r.subcategory,
        priority: r.priority,
        status: r.status,
        business_unit: r.business_unit,
        location: r.location,
        short_description: r.short_description,
      }))
    );
    download("incidents.csv", csv, "text/csv");
  };

  const exportNodes = () => {
    if (!graph) return;
    const csv = toCSV(
      graph.nodes.map((n) => ({
        term: n.id.replace(/_/g, " "),
        frequency: n.frequency,
        community: n.community,
        ticket_ids: [...n.ticketIds].join("|"),
      }))
    );
    download("nodes.csv", csv, "text/csv");
  };

  const exportEdges = () => {
    if (!graph) return;
    const csv = toCSV(
      graph.edges.map((e) => ({
        source: e.source.replace(/_/g, " "),
        target: e.target.replace(/_/g, " "),
        weight: e.weight.toFixed(3),
        ticket_ids: [...e.ticketIds].join("|"),
      }))
    );
    download("edges.csv", csv, "text/csv");
  };

  const btn = `w-full text-left px-3 py-2 text-sm rounded hover:bg-blue-500 hover:text-white ${
    darkMode ? "text-gray-200" : "text-gray-700"
  }`;

  return (
    <div className={`absolute right-0 mt-1 w-48 rounded-lg shadow-xl border z-20 py-1 ${
      darkMode ? "bg-gray-800 border-gray-600" : "bg-white border-gray-200"
    }`}>
      <button className={btn} onClick={exportIncidents}>
        Filtered incidents (CSV)
      </button>
      <button className={btn} onClick={exportNodes} disabled={!graph}>
        Node list (CSV)
      </button>
      <button className={btn} onClick={exportEdges} disabled={!graph}>
        Edge list with tickets (CSV)
      </button>
    </div>
  );
}
