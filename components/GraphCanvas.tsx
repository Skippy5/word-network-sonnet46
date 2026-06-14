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

  // Scale node radius — keep circles small so labels have room to breathe
  const nodeRadius = useCallback((node: GraphNode) => {
    return Math.max(4, Math.min(12, 3 + Math.log2(node.frequency + 1) * 1.8));
  }, []);

  // Edge width scaled by weight — thin lines keep the graph clean
  const linkWidth = useCallback((link: GraphLink) => {
    return Math.max(0.5, Math.min(3, Math.sqrt(link.weight) * 0.4));
  }, []);

  // Physics tuning — spread nodes out so labels don't collide
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg) return;
    fg.d3Force("charge")?.strength(-220);      // stronger repulsion = more spread
    fg.d3Force("link")?.distance(55).strength(0.35);
    fg.d3Force("center")?.strength(0.04);
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

  // Paint nodes + labels
  const nodeCanvasObject = useCallback(
    (node: GraphNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const r = nodeRadius(node);
      const x = node.x ?? 0;
      const y = node.y ?? 0;
      const color = communityColor(node.community);

      const isDimmed =
        highlightedIds !== null && !highlightedIds.has(node.id as string);

      ctx.globalAlpha = isDimmed ? 0.15 : 1;

      // Subtle glow only when not dimmed
      if (!isDimmed) {
        ctx.shadowColor = color;
        ctx.shadowBlur = 4;
      }

      // Node circle
      ctx.beginPath();
      ctx.arc(x, y, r, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = darkMode ? "#111827" : "#ffffff";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Label — fixed 11px in graph-space, scaled so it stays ~11px on screen
      // Only render when zoomed in enough that text is readable
      const LABEL_PX = 11;           // target screen pixels
      const fontSz = LABEL_PX / globalScale;

      if (globalScale >= 0.35) {     // hide labels when zoomed way out
        const label = node.id.replace(/_/g, " ");
        ctx.font = `500 ${fontSz}px Inter,system-ui,sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";

        const labelY = y + r + 2 / globalScale;

        // Pill background so text reads over any node colour
        const tw = ctx.measureText(label).width;
        const pad = 2 / globalScale;
        const bgH = fontSz + pad * 2;
        const bgW = tw + pad * 4;
        ctx.fillStyle = darkMode ? "rgba(17,24,39,0.75)" : "rgba(249,250,251,0.8)";
        ctx.beginPath();
        ctx.roundRect(x - bgW / 2, labelY - pad, bgW, bgH, 3 / globalScale);
        ctx.fill();

        ctx.fillStyle = darkMode ? "#f3f4f6" : "#111827";
        ctx.fillText(label, x, labelY);
      }

      ctx.globalAlpha = 1;
    },
    [nodeRadius, highlightedIds, darkMode]
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
