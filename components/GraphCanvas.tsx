"use client";
/**
 * Force-directed graph using react-force-graph-2d.
 * Dynamically imported (SSR: false) so static export works.
 */
import { useEffect, useRef, useCallback } from "react";
import ForceGraph2D from "react-force-graph-2d";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ForceGraphMethods<N = any, L = any> = any; // react-force-graph types vary by version
import { communityColor } from "@/lib/clustering";
import { useAppStore } from "@/lib/store";

interface GraphNode {
  id: string;
  frequency: number;
  community: number;
  ticketIds: Set<string>;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  weight: number;
  ticketIds: Set<string>;
}

interface Props {
  nodes: GraphNode[];
  links: GraphLink[];
  darkMode: boolean;
}

function nodeId(n: string | GraphNode): string {
  return typeof n === "string" ? n : n.id;
}

export default function GraphCanvas({ nodes, links, darkMode }: Props) {
  const fgRef = useRef<ForceGraphMethods<GraphNode, GraphLink>>(null);
  const { physicsEnabled, setDrillTarget, drillTarget } = useAppStore();

  // Scale node size by frequency (log scale so high-freq nodes don't dominate)
  const nodeRadius = useCallback((node: GraphNode) => {
    return Math.max(6, Math.min(24, 5 + Math.log2(node.frequency + 1) * 3));
  }, []);

  // Edge width scaled by weight
  const linkWidth = useCallback((link: GraphLink) => {
    return Math.max(1, Math.min(8, Math.sqrt(link.weight) * 0.8));
  }, []);

  // Physics tuning — calm but responsive
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;
    // Gentle charge, medium link distance
    fg.d3Force("charge")?.strength(-120);
    fg.d3Force("link")?.distance(80).strength(0.4);
    fg.d3Force("center")?.strength(0.05);
  }, [nodes, links]);

  // Toggle physics
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;
    if (physicsEnabled) {
      fg.resumeAnimation();
    } else {
      fg.pauseAnimation();
    }
  }, [physicsEnabled]);

  const highlightedIds = drillTarget ? drillTarget.ticketIds : null;

  const onNodeClick = useCallback(
    (node: GraphNode) => {
      if (drillTarget?.type === "node" && drillTarget.label === node.id) {
        setDrillTarget(null);
        return;
      }
      setDrillTarget({
        type: "node",
        label: node.id,
        ticketIds: node.ticketIds,
        terms: [node.id],
      });
    },
    [drillTarget, setDrillTarget]
  );

  const onLinkClick = useCallback(
    (link: GraphLink) => {
      const a = nodeId(link.source);
      const b = nodeId(link.target);
      const label = `${a} ↔ ${b}`;
      if (drillTarget?.type === "edge" && drillTarget.label === label) {
        setDrillTarget(null);
        return;
      }
      setDrillTarget({
        type: "edge",
        label,
        ticketIds: link.ticketIds,
        terms: [a, b],
      });
    },
    [drillTarget, setDrillTarget]
  );

  const bg = darkMode ? "#111827" : "#f9fafb";
  const textColor = darkMode ? "#f9fafb" : "#111827";

  // Paint nodes
  const nodeCanvasObject = useCallback(
    (node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const r = nodeRadius(node);
      const x = node.x ?? 0;
      const y = node.y ?? 0;
      const color = communityColor(node.community);

      // Dimming for non-highlighted when drill-in active
      const isDimmed =
        highlightedIds !== null && !highlightedIds.has(node.id as string);

      ctx.globalAlpha = isDimmed ? 0.2 : 1;

      // Shadow / glow
      ctx.shadowColor = color;
      ctx.shadowBlur = 8;

      // Node circle
      ctx.beginPath();
      ctx.arc(x, y, r, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = darkMode ? "#1f2937" : "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.shadowBlur = 0;

      // Label — only show if large enough on screen
      const fontSize = Math.max(8, Math.min(14, r * 0.85)) / globalScale;
      if (fontSize * globalScale > 5) {
        const label = node.id.replace(/_/g, " ");
        ctx.font = `${fontSize}px Inter,sans-serif`;
        ctx.fillStyle = textColor;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(label, x, y + r + fontSize * 0.9);
      }

      ctx.globalAlpha = 1;
    },
    [nodeRadius, highlightedIds, darkMode, textColor]
  );

  const linkColor = useCallback(
    (link: GraphLink) => {
      const isHighlighted =
        highlightedIds !== null &&
        highlightedIds.has(nodeId(link.source)) &&
        highlightedIds.has(nodeId(link.target));
      if (highlightedIds !== null && !isHighlighted) {
        return darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)";
      }
      return darkMode ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.2)";
    },
    [highlightedIds, darkMode]
  );

  return (
    <ForceGraph2D
      ref={fgRef}
      graphData={{ nodes, links }}
      backgroundColor={bg}
      nodeCanvasObject={nodeCanvasObject}
      nodePointerAreaPaint={(node, color, ctx) => {
        const r = nodeRadius(node as GraphNode) + 4;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(node.x ?? 0, node.y ?? 0, r, 0, 2 * Math.PI);
        ctx.fill();
      }}
      linkWidth={linkWidth as (link: object) => number}
      linkColor={linkColor as (link: object) => string}
      onNodeClick={onNodeClick as (node: object) => void}
      onLinkClick={onLinkClick as (link: object) => void}
      nodeLabel={(node) => {
        const n = node as GraphNode;
        return `${n.id.replace(/_/g, " ")} — ${n.frequency} tickets`;
      }}
      linkLabel={(link) => {
        const l = link as GraphLink;
        const a = nodeId(l.source).replace(/_/g, " ");
        const b = nodeId(l.target).replace(/_/g, " ");
        return `${a} ↔ ${b} (${l.ticketIds.size} tickets)`;
      }}
      cooldownTicks={physicsEnabled ? Infinity : 0}
      d3AlphaDecay={0.02}
      d3VelocityDecay={0.4}
      enableNodeDrag
      enableZoomInteraction
      enablePanInteraction
    />
  );
}
