"use client";
import { communityColor } from "@/lib/clustering";
import { useAppStore } from "@/lib/store";

interface Props {
  communities: Map<number, string[]>;
}

export default function ClusterLegend({ communities }: Props) {
  const { darkMode } = useAppStore();
  if (communities.size === 0) return null;

  const sorted = [...communities.entries()].sort((a, b) => b[1].length - a[1].length);

  return (
    <div
      className={`absolute bottom-4 left-4 rounded-lg shadow-lg p-3 max-w-xs z-10 ${
        darkMode ? "bg-gray-800/90 text-gray-100" : "bg-white/90 text-gray-800"
      }`}
      style={{ backdropFilter: "blur(6px)" }}
    >
      <div className="text-xs font-bold uppercase tracking-wider mb-2 text-gray-500">
        Clusters
      </div>
      <div className="space-y-1 max-h-48 overflow-y-auto">
        {sorted.map(([id, members]) => {
          const color = communityColor(id);
          const topTerms = members
            .slice(0, 4)
            .map((t) => t.replace(/_/g, " "))
            .join(", ");
          return (
            <div key={id} className="flex items-start gap-2 text-xs">
              <span
                className="mt-0.5 w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: color }}
              />
              <span className={darkMode ? "text-gray-300" : "text-gray-600"}>
                {topTerms}
                {members.length > 4 && (
                  <span className="text-gray-400"> +{members.length - 4}</span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
