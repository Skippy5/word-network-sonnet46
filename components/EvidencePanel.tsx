"use client";
import { useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { highlightTerms, type TicketMeta } from "@/lib/drilldown";

export default function EvidencePanel() {
  const { drillTarget, rawRows, filteredRows, settings, setDrillTarget, darkMode } =
    useAppStore();

  const tickets: TicketMeta[] = useMemo(() => {
    if (!drillTarget) return [];
    const ids = drillTarget.ticketIds;
    // Search within filtered rows only
    return filteredRows
      .filter((r) => ids.has(String(r.ticket_id ?? "")))
      .map((r) => ({
        ticket_id: String(r.ticket_id ?? ""),
        short_description: String(r.short_description ?? ""),
        opened_at: r.opened_at,
        category: r.category,
        subcategory: r.subcategory,
        priority: r.priority,
        status: r.status,
        business_unit: r.business_unit,
        location: r.location,
        country: r.country,
        state: r.state,
      }));
  }, [drillTarget, filteredRows]);

  void rawRows; // keep to avoid unused warning

  const panel = darkMode
    ? "bg-gray-800 border-gray-700 text-gray-100"
    : "bg-white border-gray-200 text-gray-900";
  const subText = darkMode ? "text-gray-400" : "text-gray-500";
  const cardBg = darkMode ? "bg-gray-700 border-gray-600" : "bg-gray-50 border-gray-200";

  if (!drillTarget) {
    return (
      <div
        className={`w-80 flex-shrink-0 border-l h-full flex items-center justify-center ${panel}`}
      >
        <div className={`text-sm text-center px-6 ${subText}`}>
          <div className="text-3xl mb-3">🔍</div>
          <div>Click a <strong>node</strong> or <strong>edge</strong> to see the incidents behind it.</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-80 flex-shrink-0 border-l h-full flex flex-col ${panel}`}>
      {/* Header */}
      <div className="p-4 border-b border-inherit flex items-start justify-between gap-2">
        <div>
          <div className="text-xs text-blue-500 font-semibold uppercase tracking-wide mb-0.5">
            {drillTarget.type === "node" ? "Node" : "Edge"}
          </div>
          <div className="font-semibold text-sm break-words">
            {drillTarget.label.replace(/_/g, " ")}
          </div>
          <div className={`text-xs mt-0.5 ${subText}`}>
            {tickets.length} incident{tickets.length !== 1 ? "s" : ""}
          </div>
        </div>
        <button
          onClick={() => setDrillTarget(null)}
          className={`text-lg leading-none shrink-0 ${subText} hover:text-red-500`}
        >
          ✕
        </button>
      </div>

      {/* Ticket list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {tickets.length === 0 && (
          <div className={`text-sm ${subText}`}>No incidents found in current filter.</div>
        )}
        {tickets.map((t) => (
          <TicketCard
            key={t.ticket_id}
            ticket={t}
            terms={drillTarget.terms}
            urlTemplate={settings.urlTemplate}
            darkMode={darkMode}
            cardBg={cardBg}
            subText={subText}
          />
        ))}
      </div>
    </div>
  );
}

function TicketCard({
  ticket,
  terms,
  urlTemplate,
  darkMode,
  cardBg,
  subText,
}: {
  ticket: TicketMeta;
  terms: string[];
  urlTemplate: string;
  darkMode: boolean;
  cardBg: string;
  subText: string;
}) {
  const idUrl =
    urlTemplate && ticket.ticket_id
      ? urlTemplate.replace("{ticket_id}", ticket.ticket_id)
      : null;

  const highlighted = highlightTerms(ticket.short_description, terms);

  const copyId = () => {
    navigator.clipboard.writeText(ticket.ticket_id).catch(() => {});
  };

  return (
    <div className={`rounded border p-2.5 text-sm ${cardBg}`}>
      {/* ID row */}
      <div className="flex items-center gap-2 mb-1">
        {idUrl ? (
          <a
            href={idUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-xs font-bold text-blue-500 hover:underline"
          >
            {ticket.ticket_id}
          </a>
        ) : (
          <span className="font-mono text-xs font-bold text-blue-500">
            {ticket.ticket_id}
          </span>
        )}
        <button
          onClick={copyId}
          title="Copy ID"
          className={`text-xs ${subText} hover:text-blue-500`}
        >
          ⧉
        </button>
        {ticket.priority && (
          <span className={`ml-auto text-xs ${subText}`}>{ticket.priority}</span>
        )}
      </div>

      {/* Description with highlights */}
      <div
        className={`text-xs leading-relaxed ${darkMode ? "text-gray-300" : "text-gray-700"}`}
        dangerouslySetInnerHTML={{ __html: highlighted }}
      />

      {/* Meta */}
      <div className={`mt-1.5 flex flex-wrap gap-x-2 gap-y-0.5 text-xs ${subText}`}>
        {ticket.business_unit && <span>{ticket.business_unit}</span>}
        {ticket.location && <span>· {ticket.location}</span>}
        {ticket.opened_at && (
          <span>· {String(ticket.opened_at).slice(0, 10)}</span>
        )}
      </div>
    </div>
  );
}
