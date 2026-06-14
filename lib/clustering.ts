/**
 * Graphology + Louvain clustering.
 */
import Graph from "graphology";
import louvain from "graphology-communities-louvain";
import type { PrunedGraph } from "./cooccurrence";

export interface ClusteredNode {
  id: string;
  frequency: number;
  community: number;
  ticketIds: Set<string>;
}

export interface ClusteredEdge {
  source: string;
  target: string;
  weight: number;
  ticketIds: Set<string>;
}

export interface ClusteredGraph {
  nodes: ClusteredNode[];
  edges: ClusteredEdge[];
  communities: Map<number, string[]>;  // community id → node ids
}

// Deterministic seeded random (mulberry32)
function makeRng(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function clusterGraph(
  pruned: PrunedGraph,
  resolution = 1.0
): ClusteredGraph {
  if (pruned.nodes.length === 0) {
    return { nodes: [], edges: [], communities: new Map() };
  }

  const graph = new Graph({ type: "undirected" });

  for (const node of pruned.nodes) {
    graph.addNode(node.id, { frequency: node.frequency });
  }

  for (const edge of pruned.edges) {
    if (!graph.hasEdge(edge.source, edge.target)) {
      graph.addEdge(edge.source, edge.target, { weight: edge.weight });
    }
  }

  // Run Louvain with deterministic RNG
  const communities = louvain(graph, {
    resolution,
    rng: makeRng(42),
  });

  // Build community map
  const communityMap = new Map<number, string[]>();
  for (const [nodeId, communityId] of Object.entries(communities)) {
    if (!communityMap.has(communityId)) communityMap.set(communityId, []);
    communityMap.get(communityId)!.push(nodeId);
  }

  const nodeMap = new Map(pruned.nodes.map((n) => [n.id, n]));

  const clusteredNodes: ClusteredNode[] = pruned.nodes.map((n) => ({
    id: n.id,
    frequency: n.frequency,
    community: communities[n.id] ?? 0,
    ticketIds: n.ticketIds,
  }));

  const clusteredEdges: ClusteredEdge[] = pruned.edges.map((e) => ({
    source: e.source,
    target: e.target,
    weight: e.weight,
    ticketIds: e.ticketIds,
  }));

  void nodeMap; // suppress unused warning

  return { nodes: clusteredNodes, edges: clusteredEdges, communities: communityMap };
}

// Palette for communities — readable in both light and dark modes
export const COMMUNITY_COLORS = [
  "#3b82f6", // blue
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#06b6d4", // cyan
  "#f97316", // orange
  "#84cc16", // lime
  "#ec4899", // pink
  "#14b8a6", // teal
  "#a855f7", // purple
  "#fb923c", // orange-400
];

export function communityColor(communityId: number): string {
  return COMMUNITY_COLORS[communityId % COMMUNITY_COLORS.length];
}
