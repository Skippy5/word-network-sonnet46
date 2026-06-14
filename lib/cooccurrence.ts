/**
 * Co-occurrence computation and pruning.
 */
import type { ProcessedTicket } from "./pipeline";

export interface TermStats {
  term: string;
  frequency: number;        // number of tickets it appears in
  ticketIds: Set<string>;
}

export interface EdgeStats {
  termA: string;
  termB: string;
  count: number;            // co-occurrence count (tickets)
  pmi: number;              // positive PMI
  ticketIds: Set<string>;
}

export interface CooccurrenceResult {
  termMap: Map<string, TermStats>;
  edgeMap: Map<string, EdgeStats>;
  totalTickets: number;
}

function edgeKey(a: string, b: string): string {
  return a < b ? `${a}|||${b}` : `${b}|||${a}`;
}

export function buildCooccurrence(
  tickets: ProcessedTicket[]
): CooccurrenceResult {
  const termMap = new Map<string, TermStats>();
  const edgeMap = new Map<string, EdgeStats>();
  const N = tickets.length;

  for (const { ticketId, terms } of tickets) {
    // Update term frequencies
    for (const term of terms) {
      if (!termMap.has(term)) {
        termMap.set(term, { term, frequency: 0, ticketIds: new Set() });
      }
      const ts = termMap.get(term)!;
      ts.frequency++;
      ts.ticketIds.add(ticketId);
    }

    // Update co-occurrence for all unique pairs in this ticket
    for (let i = 0; i < terms.length; i++) {
      for (let j = i + 1; j < terms.length; j++) {
        const a = terms[i];
        const b = terms[j];
        const key = edgeKey(a, b);
        if (!edgeMap.has(key)) {
          edgeMap.set(key, { termA: a, termB: b, count: 0, pmi: 0, ticketIds: new Set() });
        }
        const es = edgeMap.get(key)!;
        es.count++;
        es.ticketIds.add(ticketId);
      }
    }
  }

  // Compute PMI for each edge: PMI = log2(c_ab * N / (c_a * c_b)), clamped to 0
  for (const es of edgeMap.values()) {
    const ca = termMap.get(es.termA)?.frequency ?? 1;
    const cb = termMap.get(es.termB)?.frequency ?? 1;
    const pmi = Math.log2((es.count * N) / (ca * cb));
    es.pmi = Math.max(0, pmi);
  }

  return { termMap, edgeMap, totalTickets: N };
}

export interface PruningConfig {
  minTermFreq: number;
  minEdgeCount: number;
  maxTerms: number;
  weightMode: "count" | "pmi";
}

export const DEFAULT_PRUNING: PruningConfig = {
  minTermFreq: 5,
  minEdgeCount: 3,
  maxTerms: 80,
  weightMode: "count",
};

export interface PrunedGraph {
  nodes: Array<{ id: string; frequency: number; ticketIds: Set<string> }>;
  edges: Array<{
    source: string;
    target: string;
    weight: number;
    ticketIds: Set<string>;
  }>;
}

export function pruneGraph(
  result: CooccurrenceResult,
  config: PruningConfig
): PrunedGraph {
  const { termMap, edgeMap } = result;

  // Filter terms by frequency, take top N by frequency
  let terms = [...termMap.values()]
    .filter((ts) => ts.frequency >= config.minTermFreq)
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, config.maxTerms);

  const termSet = new Set(terms.map((t) => t.term));

  // Filter edges: both nodes must be in term set, edge count meets threshold
  const edges = [...edgeMap.values()]
    .filter(
      (es) =>
        termSet.has(es.termA) &&
        termSet.has(es.termB) &&
        es.count >= config.minEdgeCount
    )
    .map((es) => ({
      source: es.termA,
      target: es.termB,
      weight: config.weightMode === "pmi" ? es.pmi : es.count,
      ticketIds: es.ticketIds,
    }));

  // Remove isolated nodes (nodes with no edges after pruning)
  const connectedTerms = new Set<string>();
  for (const e of edges) {
    connectedTerms.add(e.source);
    connectedTerms.add(e.target);
  }
  terms = terms.filter((t) => connectedTerms.has(t.term));

  const nodes = terms.map((t) => ({
    id: t.term,
    frequency: t.frequency,
    ticketIds: t.ticketIds,
  }));

  return { nodes, edges };
}
