/**
 * Text processing pipeline — pure functions, no React, fully testable.
 * Cleans → tokenizes → removes stop words → lemmatizes → applies synonyms → detects phrases.
 */

export const DEFAULT_STOP_WORDS = new Set([
  // English
  "a","an","the","and","or","but","in","on","at","to","for","of","with","by",
  "from","as","is","was","are","were","be","been","being","have","has","had",
  "do","does","did","will","would","could","should","may","might","shall","can",
  "not","no","nor","so","yet","both","either","neither","each","few","more",
  "most","other","some","such","into","through","during","before","after",
  "above","below","between","out","off","over","under","then","once","here",
  "there","when","where","why","how","all","any","both","each","every","much",
  "other","that","these","they","this","those","what","which","who","whom",
  "i","you","he","she","it","we","they","me","him","her","us","them",
  "my","your","his","its","our","their","mine","yours","hers","ours","theirs",
  "if","then","else","than","too","very","just","about","up","also","into",
  "because","while","although","though","until","unless","since","whether",
  // IT ticketing noise
  "user","please","thanks","ticket","incident","issue","resolved","closed",
  "called","advised","regards","hi","hello","team","am","pm","eod","fyi",
  "confirmed","verified","checked","per","re","via","etc","note","noted",
  "update","updated","updating","working","worked","works","fix","fixed",
  "fixing","done","completed","completing","follow","followed","request",
  "requested","requesting","contact","contacted","contacting","see","seen",
  "found","find","finding","make","made","making","take","took","taking",
  "get","got","getting","give","gave","giving","go","went","going","come",
  "came","coming","know","knew","knowing","think","thought","thinking",
  "need","needed","needing","use","used","using","try","tried","trying",
  "able","unable","able","like","liked","liking","want","wanted","wanting",
  "back","new","old","now","today","yesterday","tomorrow","time","day",
  "week","month","year","morning","afternoon","evening","evening",
  "number","id","ref","case","open","opened","close","closing","status",
  "high","low","medium","moderate","critical","normal","standard","default",
  "currently","currently","please","already","further","following","attached",
  "first","second","third","last","next","previous","initial","further",
  "however","therefore","furthermore","additionally","finally","also","again",
  "same","different","similar","right","left","full","empty","set","let",
  "put","run","ran","running","start","started","starting","stop","stopped",
  "show","showed","showing","look","looked","looking","wait","waiting",
  "ok","okay","yes","no","not","thank","thanks","regard","regards","best",
  "sincerely","asap","urgent","important","kindly","kindly","assist",
  "assist","support","helped","help","helping","will","can","may","should",
  "could","would","shall","need","must","done","complete",
]);

export const DEFAULT_SYNONYMS: Record<string, string> = {
  pwd: "password",
  dl: "distribution list",
  "m365": "microsoft 365",
  "o365": "microsoft 365",
  "ms365": "microsoft 365",
  ad: "active directory",
  config: "configuration",
  "re-installed": "reinstall",
  reinstalled: "reinstall",
  "re-install": "reinstall",
  restarted: "restart",
  reimaged: "reimage",
  "re-imaged": "reimage",
  reseated: "reseat",
  "re-enrolled": "enroll",
  reenrolled: "enroll",
  "re-enroll": "enroll",
  rebooted: "reboot",
  "docking station": "dock",
  dock: "dock",
  "follow-me printing": "follow-me print",
  "follow-me": "follow-me print",
  mfa: "mfa",
  "multi-factor": "mfa",
  sso: "sso",
  vpn: "vpn",
  okta: "okta",
  sccm: "sccm",
  ost: "ost",
  dhcp: "dhcp",
  vlan: "vlan",
  dns: "dns",
  wifi: "wi-fi",
  "wi-fi": "wi-fi",
  wireless: "wireless",
  sap: "sap",
  chrome: "chrome",
  excel: "excel",
  zoom: "zoom",
  adobe: "adobe",
  acrobat: "adobe acrobat",
  lob: "line-of-business app",
};

export const DEFAULT_PHRASES = [
  "distribution list",
  "blue screen",
  "active directory",
  "network drive",
  "docking station",
  "print driver",
  "print server",
  "print queue",
  "print spooler",
  "toner cartridge",
  "paper tray",
  "paper jam",
  "follow-me print",
  "follow-me printing",
  "microsoft 365",
  "exchange admin",
  "outlook web app",
  "ost file",
  "autocomplete cache",
  "application cache",
  "license key",
  "access denied",
  "account locked",
  "password expired",
  "mfa token",
  "security group",
  "vpn client",
  "vpn portal",
  "network adapter",
  "display driver",
  "wireless driver",
  "hard drive",
  "power adapter",
  "usb port",
  "fan vent",
  "fan noise",
  "battery charge",
  "dhcp lease",
  "switch port",
  "access point",
  "line-of-business app",
  "line of business",
  "service desk",
  "desktop support",
  "network operations",
  "application support",
  "messaging support",
];

// ---- Lemmatizer (simple suffix rules for common IT/English patterns) ----
const LEMMA_RULES: [RegExp, string][] = [
  [/(\w{4,})ings?\b/gi, "$1"],
  [/(\w{4,})ations?\b/gi, "$1ate"],
  [/(\w{4,})ers?\b/gi, "$1"],
  [/(\w{4,})ies\b/gi, "$1y"],
  [/(\w{4,})ying\b/gi, "$1y"],
  [/(\w{4,})ied\b/gi, "$1y"],
  [/(\w{4,})ed\b/gi, "$1"],
  [/(\w{4,})s\b/gi, "$1"],
];

export function lemmatize(word: string): string {
  const lower = word.toLowerCase();
  // Don't lemmatize known acronyms/short terms
  if (lower.length <= 3) return lower;
  for (const [pattern, replacement] of LEMMA_RULES) {
    const result = lower.replace(pattern, replacement);
    if (result !== lower && result.length > 2) return result;
  }
  return lower;
}

// ---- HTML stripping ----
export function stripHtml(text: string): string {
  return text
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#?\w+;/g, " ");
}

// ---- Clean a single document ----
export function cleanText(raw: string): string {
  if (!raw) return "";
  let text = stripHtml(raw);
  text = text.toLowerCase();
  // Remove INC/ticket numbers
  text = text.replace(/\binc\d+\b/gi, " ");
  // Remove URLs
  text = text.replace(/https?:\/\/\S+/g, " ");
  // Remove email addresses
  text = text.replace(/\S+@\S+\.\S+/g, " ");
  // Remove timestamps like 2025-01-01 or 10:30:00
  text = text.replace(/\b\d{4}-\d{2}-\d{2}\b/g, " ");
  text = text.replace(/\b\d{1,2}:\d{2}(:\d{2})?\b/g, " ");
  // Remove artifact noise
  text = text.replace(/::/g, " ");
  text = text.replace(/<br\s*\/?>/gi, " ");
  // Keep intra-word hyphens, collapse other punctuation
  text = text.replace(/[^a-z0-9\s\-]/g, " ");
  // Remove standalone numbers
  text = text.replace(/\b\d+\b/g, " ");
  // Collapse whitespace
  text = text.replace(/\s+/g, " ").trim();
  return text;
}

// ---- Tokenize ----
export function tokenize(text: string): string[] {
  if (!text) return [];
  // Split on whitespace, filter empties
  return text.split(/\s+/).filter((t) => t.length > 1);
}

// ---- Apply synonyms ----
export function applySynonyms(
  token: string,
  synonymMap: Record<string, string>
): string {
  const lower = token.toLowerCase();
  return synonymMap[lower] ?? token;
}

// ---- Phrase detection: replace consecutive tokens that form a known phrase ----
export function detectPhrases(tokens: string[], phrases: string[]): string[] {
  if (!phrases.length) return tokens;
  const sorted = [...phrases].sort((a, b) => b.split(" ").length - a.split(" ").length);
  const result: string[] = [];
  let i = 0;
  while (i < tokens.length) {
    let matched = false;
    for (const phrase of sorted) {
      const words = phrase.split(" ");
      if (words.length < 2) continue;
      if (i + words.length > tokens.length) continue;
      const slice = tokens.slice(i, i + words.length).join(" ");
      if (slice === phrase) {
        result.push(phrase.replace(/ /g, "_"));
        i += words.length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      result.push(tokens[i]);
      i++;
    }
  }
  return result;
}

export interface ProcessedTicket {
  ticketId: string;
  terms: string[];
}

export interface PipelineConfig {
  textColumns: string[];
  stopWords: Set<string>;
  synonymMap: Record<string, string>;
  phrases: string[];
  usePhrases: boolean;
  minTokenLength: number;
}

export const DEFAULT_PIPELINE_CONFIG: PipelineConfig = {
  textColumns: ["short_description", "work_notes", "close_notes"],
  stopWords: DEFAULT_STOP_WORDS,
  synonymMap: DEFAULT_SYNONYMS,
  phrases: DEFAULT_PHRASES,
  usePhrases: true,
  minTokenLength: 3,
};

// ---- Main pipeline function ----
export function processTicket(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  row: Record<string, any>,
  config: PipelineConfig
): ProcessedTicket {
  const ticketId = String(row["ticket_id"] ?? row["id"] ?? "unknown");

  // Assemble document
  const rawText = config.textColumns
    .map((col) => row[col] ?? "")
    .join(" ");

  // Clean
  const cleaned = cleanText(rawText);

  // Tokenize
  let tokens = tokenize(cleaned);

  // Apply synonyms (multi-word first)
  // Resolve multi-word synonyms by scanning for them in the cleaned text
  let processedText = cleaned;
  const multiWordSynonyms = Object.entries(config.synonymMap)
    .filter(([k]) => k.includes(" "))
    .sort(([a], [b]) => b.length - a.length);
  for (const [from, to] of multiWordSynonyms) {
    processedText = processedText.replace(
      new RegExp(`\\b${from.replace(/[-/]/g, "\\$&")}\\b`, "gi"),
      to.replace(/ /g, "_")
    );
  }
  tokens = tokenize(processedText);

  // Apply single-word synonyms
  tokens = tokens.map((t) => {
    const resolved = applySynonyms(t, config.synonymMap);
    // If synonym produces a multi-word result, join with underscore
    return resolved.replace(/ /g, "_");
  });

  // Phrase detection on raw tokens
  if (config.usePhrases) {
    // Normalize phrases to use underscores as well
    const normalizedPhrases = config.phrases.map((p) => p.toLowerCase());
    tokens = detectPhrases(tokens, normalizedPhrases);
  }

  // Lemmatize single-word tokens (not phrases — they contain underscores)
  tokens = tokens.map((t) => {
    if (t.includes("_")) return t; // phrase — keep as-is
    return lemmatize(t);
  });

  // Remove stop words and short tokens
  const stopWords = config.stopWords;
  tokens = tokens.filter((t) => {
    const plain = t.replace(/_/g, " ");
    if (stopWords.has(plain)) return false;
    if (t.length < config.minTokenLength) return false;
    return true;
  });

  // Deduplicate within a single ticket for co-occurrence purposes
  const unique = [...new Set(tokens)];

  return { ticketId, terms: unique };
}

export function processTickets(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rows: Record<string, any>[],
  config: PipelineConfig
): ProcessedTicket[] {
  return rows.map((row) => processTicket(row, config));
}
