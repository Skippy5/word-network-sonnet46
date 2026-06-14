import { describe, it, expect } from "vitest";
import { buildCooccurrence, pruneGraph, DEFAULT_PRUNING } from "../lib/cooccurrence";
import type { ProcessedTicket } from "../lib/pipeline";

const tickets: ProcessedTicket[] = [
  { ticketId: "INC001", terms: ["print", "jam", "paper", "queue"] },
  { ticketId: "INC002", terms: ["print", "jam", "toner", "queue"] },
  { ticketId: "INC003", terms: ["print", "driver", "error", "queue"] },
  { ticketId: "INC004", terms: ["outlook", "email", "sync", "error"] },
  { ticketId: "INC005", terms: ["outlook", "email", "quota", "sync"] },
];

describe("buildCooccurrence", () => {
  const result = buildCooccurrence(tickets);

  it("counts term frequencies correctly", () => {
    expect(result.termMap.get("print")?.frequency).toBe(3);
    expect(result.termMap.get("jam")?.frequency).toBe(2);
    expect(result.termMap.get("outlook")?.frequency).toBe(2);
  });

  it("counts co-occurrences", () => {
    const printJam = result.edgeMap.get("jam|||print") ?? result.edgeMap.get("print|||jam");
    expect(printJam?.count).toBe(2);
  });

  it("stores ticket IDs per term", () => {
    const printStat = result.termMap.get("print");
    expect(printStat?.ticketIds.has("INC001")).toBe(true);
    expect(printStat?.ticketIds.has("INC002")).toBe(true);
    expect(printStat?.ticketIds.has("INC003")).toBe(true);
    expect(printStat?.ticketIds.has("INC004")).toBe(false);
  });

  it("computes positive PMI >= 0", () => {
    for (const edge of result.edgeMap.values()) {
      expect(edge.pmi).toBeGreaterThanOrEqual(0);
    }
  });

  it("records co-occurring ticket IDs on edges", () => {
    const key = result.edgeMap.has("jam|||print") ? "jam|||print" : "print|||jam";
    const edge = result.edgeMap.get(key);
    expect(edge?.ticketIds.has("INC001")).toBe(true);
    expect(edge?.ticketIds.has("INC002")).toBe(true);
    expect(edge?.ticketIds.has("INC004")).toBe(false);
  });
});

describe("pruneGraph", () => {
  const result = buildCooccurrence(tickets);

  it("respects minTermFreq", () => {
    const pruned = pruneGraph(result, { ...DEFAULT_PRUNING, minTermFreq: 3, minEdgeCount: 1, maxTerms: 100 });
    const ids = pruned.nodes.map((n) => n.id);
    expect(ids).toContain("print");
    // jam appears 2 times, should be excluded at minFreq 3
    expect(ids).not.toContain("jam");
  });

  it("respects minEdgeCount", () => {
    const pruned = pruneGraph(result, { ...DEFAULT_PRUNING, minTermFreq: 1, minEdgeCount: 2, maxTerms: 100 });
    for (const edge of pruned.edges) {
      expect(edge.ticketIds.size).toBeGreaterThanOrEqual(2);
    }
  });

  it("removes isolated nodes", () => {
    const pruned = pruneGraph(result, { ...DEFAULT_PRUNING, minTermFreq: 1, minEdgeCount: 2, maxTerms: 100 });
    const nodeIds = new Set(pruned.nodes.map((n) => n.id));
    for (const edge of pruned.edges) {
      expect(nodeIds.has(edge.source)).toBe(true);
      expect(nodeIds.has(edge.target)).toBe(true);
    }
  });
});
