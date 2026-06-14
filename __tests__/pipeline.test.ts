import { describe, it, expect } from "vitest";
import {
  stripHtml,
  cleanText,
  tokenize,
  applySynonyms,
  detectPhrases,
  lemmatize,
  processTicket,
  DEFAULT_PIPELINE_CONFIG,
} from "../lib/pipeline";

describe("stripHtml", () => {
  it("removes HTML tags", () => {
    expect(stripHtml("<div>Hello</div>")).toBe(" Hello ");
  });
  it("decodes &nbsp;", () => {
    expect(stripHtml("Hello&nbsp;World")).toBe("Hello World");
  });
  it("handles nested tags", () => {
    expect(stripHtml("<p><strong>Bold</strong> text</p>")).toBe("  Bold  text ");
  });
});

describe("cleanText", () => {
  it("strips incident IDs", () => {
    const result = cleanText("INC0001234 password reset");
    expect(result).not.toContain("INC0001234");
    expect(result).toContain("password");
  });
  it("lowercases text", () => {
    expect(cleanText("UPPERCASE TEXT")).toBe("uppercase text");
  });
  it("removes standalone numbers", () => {
    expect(cleanText("error code 49 in queue")).not.toMatch(/\b49\b/);
  });
  it("keeps intra-word hyphens", () => {
    expect(cleanText("re-image the laptop")).toContain("re-image");
  });
  it("strips HTML in cleaning", () => {
    expect(cleanText("<div>user reports issue</div>")).toContain("user reports issue");
  });
  it("strips :: artifacts", () => {
    expect(cleanText("offline status :: check logs")).not.toContain("::");
  });
});

describe("tokenize", () => {
  it("splits on whitespace", () => {
    expect(tokenize("print queue jammed")).toEqual(["print", "queue", "jammed"]);
  });
  it("filters single chars", () => {
    expect(tokenize("a b hello")).toEqual(["hello"]);
  });
  it("returns empty for empty string", () => {
    expect(tokenize("")).toEqual([]);
  });
});

describe("applySynonyms", () => {
  const synonymMap = { pwd: "password", dl: "distribution list" };
  it("collapses pwd to password", () => {
    expect(applySynonyms("pwd", synonymMap)).toBe("password");
  });
  it("collapses dl to distribution list", () => {
    expect(applySynonyms("dl", synonymMap)).toBe("distribution list");
  });
  it("leaves unknown tokens unchanged", () => {
    expect(applySynonyms("printer", synonymMap)).toBe("printer");
  });
});

describe("detectPhrases", () => {
  it("detects 'distribution list' as a single token", () => {
    const tokens = ["add", "user", "to", "distribution", "list"];
    const result = detectPhrases(tokens, ["distribution list"]);
    expect(result).toContain("distribution_list");
    expect(result).not.toContain("distribution");
  });
  it("prefers longer phrases", () => {
    const tokens = ["active", "directory", "sync", "failed"];
    const result = detectPhrases(tokens, ["active directory", "directory sync"]);
    expect(result).toContain("active_directory");
  });
});

describe("lemmatize", () => {
  it("strips -ing suffix", () => {
    expect(lemmatize("printing")).not.toContain("ing");
  });
  it("strips -ed suffix", () => {
    expect(lemmatize("restarted")).not.toContain("ed");
  });
  it("does not over-lemmatize short words", () => {
    expect(lemmatize("is")).toBe("is");
    expect(lemmatize("be")).toBe("be");
  });
});

describe("processTicket", () => {
  const row = {
    ticket_id: "INC0009999",
    short_description: "Outlook add-in missing for the line-of-business app",
    work_notes: "The add-in disappeared. reinstalled the application.",
    close_notes: "reinstalled; Outlook add-in loads. Resolved.",
    business_unit: "Manufacturing",
    location: "London HQ",
  };

  it("returns a ticketId", () => {
    const result = processTicket(row, DEFAULT_PIPELINE_CONFIG);
    expect(result.ticketId).toBe("INC0009999");
  });

  it("produces terms array without stop words", () => {
    const result = processTicket(row, DEFAULT_PIPELINE_CONFIG);
    // 'user', 'please', 'the' should be filtered
    expect(result.terms).not.toContain("the");
    expect(result.terms).not.toContain("user");
  });

  it("terms are unique per ticket", () => {
    const result = processTicket(row, DEFAULT_PIPELINE_CONFIG);
    const unique = new Set(result.terms);
    expect(result.terms.length).toBe(unique.size);
  });

  it("includes meaningful IT terms", () => {
    const result = processTicket(row, DEFAULT_PIPELINE_CONFIG);
    const joined = result.terms.join(" ");
    expect(joined).toMatch(/outlook|add.in|install|application/i);
  });
});
