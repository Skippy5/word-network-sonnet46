"use client";
import { useAppStore } from "@/lib/store";

export default function InfoModal() {
  const { infoOpen, setInfoOpen, darkMode } = useAppStore();

  if (!infoOpen) return null;

  const overlay = "fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4";
  const dialog = `w-full max-w-md rounded-xl shadow-2xl p-6 ${
    darkMode ? "bg-gray-800 text-gray-100" : "bg-white text-gray-900"
  }`;

  return (
    <div className={overlay} onClick={() => setInfoOpen(false)}>
      <div className={dialog} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-xl">About</h2>
          <button onClick={() => setInfoOpen(false)} className="text-gray-400 hover:text-red-500 text-xl">✕</button>
        </div>

        <div className="space-y-3 text-sm">
          <p className="font-semibold text-lg">IT Ticket Word Network</p>

          <p className={darkMode ? "text-gray-300" : "text-gray-600"}>
            An interactive word co-occurrence network for IT service desk tickets.
            Upload a CSV export from ServiceNow (or compatible system) to visualise
            problem clusters, discover connections between issues, and drill into
            the exact incidents behind every node and edge.
          </p>

          <div className={`rounded-lg p-3 ${darkMode ? "bg-gray-700" : "bg-blue-50"}`}>
            <p className="text-xs font-semibold text-blue-500 uppercase tracking-wide mb-1">
              Built with
            </p>
            <p className={`font-semibold ${darkMode ? "text-gray-200" : "text-gray-800"}`}>
              Claude Sonnet 4.6
            </p>
            <p className={`text-xs mt-0.5 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
              Developed using Anthropic&apos;s Claude Sonnet 4.6 model via Claude Code.
            </p>
          </div>

          <div className={`text-xs space-y-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
            <p><strong>Stack:</strong> Next.js · TypeScript · Tailwind CSS · react-force-graph-2d · Graphology · Louvain · Zustand · PapaParse</p>
            <p><strong>Deployment:</strong> Vercel · Docker (AWS) · Static export (S3/nginx)</p>
            <p><strong>Data:</strong> All processing runs locally in your browser. No data is ever sent to any server.</p>
          </div>
        </div>

        <button
          onClick={() => setInfoOpen(false)}
          className="mt-5 w-full py-2 rounded bg-blue-600 text-white text-sm hover:bg-blue-700"
        >
          Close
        </button>
      </div>
    </div>
  );
}
