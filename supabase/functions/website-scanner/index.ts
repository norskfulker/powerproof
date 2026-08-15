// Supabase Edge Function: website-scanner
//
// Accepts { url: string, forceFresh?: boolean } from an authenticated user.
// After crawl + SEO, inserts a history stub and returns immediately. Gemini
// audits continue via EdgeRuntime.waitUntil so refresh/navigation does not
// cancel the job. The detail page polls website_scan_history for progress.
//
// Deploy with the Supabase CLI:
//   supabase functions deploy website-scanner --no-verify-jwt
//
// Environment:
//   - SUPABASE_URL, SUPABASE_ANON_KEY (auto-provided)
//   - SUPABASE_SERVICE_ROLE_KEY (server-side history upsert to bypass RLS)
//   - GEMINI_API_KEY (server-side Gemini key). When the user has BYOK
//     configured the client forwards `x-gemini-key` and we prefer it.
//   - FIRECRAWL_API_KEY (paid crawl provider; cached payloads skip re-crawl)
//
// To bump the model, change MODEL_NAME below. The project canonical set is
// "gemini-2.5-flash-lite" | "gemini-2.5-flash" | "gemini-2.5-pro"; any
// current Gemini text model name works.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY") ?? "";

/** Change this when a new Gemini text model is released. */
const MODEL_NAME = "gemini-2.5-flash";
/** Used for the deeper insights pass — slower and pricier, higher quality. */
const MODEL_PRO = "gemini-2.5-pro";

const MAX_PAGES = 15;
/** Wall-clock budget for a fresh Firecrawl crawl (call + poll). */
const FIRECRAWL_TIMEOUT_MS = 90_000;
const PER_PAGE_CHAR_CAP = 8_000;
const CORPUS_CHAR_CAP = 80_000;
const SNIPPET_CHAR_CAP = 240;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const FIRECRAWL_BASE = "https://api.firecrawl.dev/v2";
const USER_AGENT =
  "Mozilla/5.0 (compatible; PowerProofScanner/1.0; +https://powerproof.app)";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-gemini-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(
  status: number,
  code: string,
  message: string,
  extra: Record<string, unknown> = {},
): Response {
  return jsonResponse({ code, error: message, ...extra }, status);
}

type ScanSectionId = "seo" | "business" | "competitor" | "roadmap" | "insights";
type ScanProgressStatus = "running" | "complete" | "error";

type PendingSections = ScanSectionId[];

type ReportShell = {
  id: string;
  url: string;
  normalizedUrl: string;
  finalUrl: string | null;
  status: number;
  scanStatus: ScanProgressStatus;
  pendingSections: PendingSections;
  fetchedAt: string;
  durationMs: number;
  crawl: {
    totalPages: number;
    pages: {
      url: string;
      title: string | null;
      status: number;
      charCount: number;
      snippet: string;
    }[];
  };
  seo: SeoAudit;
  business: Record<string, unknown>;
  competitor: Record<string, unknown>;
  roadmap: Record<string, unknown>;
  insights: Record<string, unknown>;
  meta: {
    title: string | null;
    description: string | null;
    language: string | null;
  };
};

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeUrl(raw: string): string | null {
  try {
    const candidate = raw.trim();
    if (!/^https?:\/\//i.test(candidate)) return null;
    if (candidate.includes("@")) return null;
    if (!/^[a-zA-Z0-9:/.\-_~?&=%#+]+$/.test(candidate)) return null;
    const parsed = new URL(candidate);
    if (!/^https?:$/.test(parsed.protocol)) return null;
    if (parsed.username || parsed.password) return null;
    if (isBlockedScannerHostname(parsed.hostname)) return null;
    if (containsFoulTermInScannerUrl(parsed)) return null;
    if (isBlockedNsfwScannerUrl(parsed)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function isPrivateOrReservedIpv4(host: string): boolean {
  const parts = host.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false;
  }
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  return false;
}

function isBlockedScannerHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "").replace(/^\[/, "").replace(/\]$/, "");
  if (!host) return true;

  const blocked = new Set([
    "localhost",
    "host.docker.internal",
    "metadata.google.internal",
  ]);
  if (blocked.has(host)) return true;
  if (host.endsWith(".localhost")) return true;
  if (host.endsWith(".local")) return true;
  if (host.endsWith(".internal")) return true;
  if (host.endsWith(".localdomain")) return true;

  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(host)) return true;
  if (host.includes(":")) return true;

  return isPrivateOrReservedIpv4(host);
}

const BLOCKED_NSFW_TLDS = new Set(["xxx", "adult", "porn", "sex"]);

const NSFW_HOST_TOKENS = [
  "porn",
  "porno",
  "pornhub",
  "xvideos",
  "xhamster",
  "xnxx",
  "redtube",
  "youporn",
  "spankbang",
  "chaturbate",
  "stripchat",
  "onlyfans",
  "fansly",
  "brazzers",
  "realitykings",
  "bangbros",
  "adultfriendfinder",
  "camgirl",
  "camsoda",
  "livejasmin",
  "myfreecams",
  "hentai",
  "rule34",
  "nhentai",
  "javhd",
  "javlibrary",
  "erome",
  "motherless",
  "imagefap",
  "nudevista",
  "sexvid",
  "tubegalore",
  "beeg",
  "tnaflix",
  "drtuber",
  "hqporner",
  "eporner",
  "xxx",
  "nsfw",
  "gore",
  "bestgore",
  "theync",
  "kaotic",
  "goregrish",
  "documentingreality",
  "liveleak",
  "ogrish",
  "rotten",
  "deathaddict",
  "septicisle",
];

const NSFW_PATH_TOKENS = [
  "bestgore",
  "snuff",
  "guro",
];

/** Foul / adult / gore tokens — substring match inside URL host & path segments. */
const FOUL_URL_SUBSTRINGS = [
  "fuck", "fucker", "fucking", "shit", "bitch", "slut", "whore", "cunt", "dick", "cock", "pussy",
  "asshole", "bastard", "sex", "sexy", "porn", "porno", "xxx", "nude", "nudes", "naked", "rape",
  "pedo", "pedophile", "nazi", "terrorist", "isis", "scam", "phishing", "ponzi", "hitman", "meth",
  "cocaine", "heroin", "ransomware", "malware", "gore", "adult", "snuff", "guro", "hentai", "nsfw",
  "bestgore", "goregrish", "camgirl", "onlyfans", "fansly", "pornhub", "xhamster", "xvideos",
  "redtube", "youporn", "chaturbate", "stripchat", "motherless", "liveleak", "ogrish", "childporn",
  "sextape", "blowjob", "handjob", "orgy", "fetish", "bdsm", "milf", "escort",
];

function urlSegmentsForModeration(url: URL): string[] {
  return [
    ...url.hostname.toLowerCase().split("."),
    ...url.pathname.toLowerCase().split(/[/_.-]+/),
    ...url.search.toLowerCase().split(/[/_.=&?-]+/),
  ].filter(Boolean);
}

function segmentContainsFoulUrlTerm(segment: string): boolean {
  const seg = segment.toLowerCase();
  if (!seg) return false;
  for (const term of FOUL_URL_SUBSTRINGS) {
    if (term.length >= 3 && seg.includes(term)) return true;
  }
  return false;
}

function containsFoulTermInScannerUrl(url: URL): boolean {
  const segments = urlSegmentsForModeration(url);
  if (segments.some(segmentContainsFoulUrlTerm)) return true;
  const compact = segments.join("");
  return compact.length > 0 && segmentContainsFoulUrlTerm(compact);
}

function isBlockedNsfwScannerUrl(url: URL): boolean {
  const labels = url.hostname.toLowerCase().replace(/\.$/, "").split(".").filter(Boolean);
  const tld = labels[labels.length - 1];
  if (tld && BLOCKED_NSFW_TLDS.has(tld)) return true;
  if (
    NSFW_HOST_TOKENS.some((token) =>
      labels.some((label) =>
        label === token || label.startsWith(`${token}-`) || label.endsWith(`-${token}`)
      )
    )
  ) {
    return true;
  }
  const segments = url.pathname.toLowerCase().split(/[/_.-]+/).filter(Boolean);
  return NSFW_PATH_TOKENS.some((token) => segments.includes(token));
}

function decodeEntities(input: string): string {
  return input
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");
}

function stripTags(html: string): string {
  return decodeEntities(html.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}

function matchTags(html: string, tag: string): string[] {
  const pattern = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi");
  const out: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html)) !== null) {
    out.push(match[0]);
  }
  return out;
}

function matchSelfClosing(html: string, tag: string): string[] {
  const pattern = new RegExp(`<${tag}\\b[^>]*\\/?>`, "gi");
  const out: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html)) !== null) {
    out.push(match[0]);
  }
  return out;
}

function attrOf(tag: string, name: string): string | null {
  const re = new RegExp(`${name}\\s*=\\s*"([^"]*)"`, "i");
  const re2 = new RegExp(`${name}\\s*=\\s*'([^']*)'`, "i");
  const m = tag.match(re) ?? tag.match(re2);
  return m ? decodeEntities(m[1]) : null;
}

function firstMetaContent(html: string, attr: string, value: string): string | null {
  const re = new RegExp(
    `<meta\\b[^>]*${attr}\\s*=\\s*"${value}"[^>]*content\\s*=\\s*"([^"]*)"`,
    "i",
  );
  const re2 = new RegExp(
    `<meta\\b[^>]*${attr}\\s*=\\s*'${value}'[^>]*content\\s*=\\s*'([^']*)'`,
    "i",
  );
  const re3 = new RegExp(
    `<meta\\b[^>]*content\\s*=\\s*"([^"]*)"[^>]*${attr}\\s*=\\s*"${value}"`,
    "i",
  );
  const m = html.match(re) ?? html.match(re2) ?? html.match(re3);
  return m ? decodeEntities(m[1]) : null;
}

type ParsedPage = {
  status: number;
  finalUrl: string;
  html: string;
  title: string | null;
  description: string | null;
  language: string | null;
};

/** Strip a chosen subtree from raw HTML before extracting text. */
function stripBlocks(html: string, tags: string[]): string {
  let out = html;
  for (const tag of tags) {
    const re = new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}>`, "gi");
    out = out.replace(re, " ");
  }
  return out;
}

type ExtractedContent = {
  title: string | null;
  description: string | null;
  h1: string[];
  headings: string;
  bodyText: string;
  /** Title + description + headings + bodyText, capped at perPageCharCap. */
  text: string;
};

function extractPageContent(html: string): ExtractedContent {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? decodeEntities(titleMatch[1].trim()) : null;
  const description = firstMetaContent(html, "name", "description");

  const headings: string[] = [];
  for (const tag of ["h1", "h2", "h3"]) {
    for (const block of matchTags(html, tag)) {
      const text = stripTags(block);
      if (text) headings.push(`${tag.toUpperCase()}: ${text}`);
    }
  }

  // Pick <main> or <article> if present, else fall back to <body>.
  const mainMatch =
    html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i) ??
    html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i);
  const bodyMatch = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
  const region = mainMatch?.[1] ?? bodyMatch?.[1] ?? html;
  const cleaned = stripBlocks(region, [
    "script",
    "style",
    "noscript",
    "svg",
    "footer",
    "nav",
    "header",
    "aside",
    "form",
  ]);
  const bodyText = stripTags(cleaned);

  const composed = [
    title ?? "",
    description ?? "",
    headings.join("\n"),
    bodyText,
  ]
    .filter(Boolean)
    .join("\n\n")
    .replace(/\s+/g, " ")
    .trim();

  const text = composed.length > PER_PAGE_CHAR_CAP
    ? composed.slice(0, PER_PAGE_CHAR_CAP)
    : composed;

  return {
    title,
    description,
    h1: headings
      .filter((h) => h.startsWith("H1:"))
      .map((h) => h.slice(3).trim()),
    headings: headings.join("\n"),
    bodyText,
    text,
  };
}

type CrawledPage = {
  url: string;
  status: number;
  title: string | null;
  description: string | null;
  text: string;
  bodyText: string;
  snippet: string;
  charCount: number;
  error?: string;
};

type CrawlResult = {
  pages: CrawledPage[];
  finalSeedUrl: string;
  seedStatus: number;
};

type CrawlSource = "fresh" | "cache";

type FetchPagesResult = CrawlResult & {
  source: CrawlSource;
  payload: unknown;
  firecrawlJobId: string | null;
};

type FirecrawlMetadata = {
  title?: string | string[] | null;
  description?: string | string[] | null;
  sourceURL?: string;
  url?: string;
  statusCode?: number;
  language?: string | string[] | null;
};

type FirecrawlPage = {
  markdown?: string | null;
  html?: string | null;
  rawHtml?: string | null;
  metadata?: FirecrawlMetadata | null;
  links?: string[];
};

type FirecrawlCrawlResponse = {
  success?: boolean;
  id?: string;
  status?: "scraping" | "completed" | "failed";
  total?: number;
  completed?: number;
  data?: FirecrawlPage[];
};

function firstString(v: unknown): string | undefined {
  return typeof v === "string"
    ? v
    : Array.isArray(v) && typeof v[0] === "string"
      ? v[0]
      : undefined;
}

async function firecrawlStartCrawl(seedUrl: string): Promise<string> {
  if (!FIRECRAWL_API_KEY) {
    throw new Error("FIRECRAWL_API_KEY not set");
  }
  const res = await fetch(`${FIRECRAWL_BASE}/crawl`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url: seedUrl,
      limit: MAX_PAGES,
      ignoreQueryParameters: true,
      allowExternalLinks: false,
      crawlEntireDomain: false,
      // Per-page scrape options live under `scrapeOptions` on /v2/crawl —
      // top-level `formats` / `onlyMainContent` / `maxAge` are rejected.
      scrapeOptions: {
        // rawHtml keeps the full document (including <head> SEO tags).
        // onlyMainContent:false so Firecrawl does not strip head/meta for SEO.
        formats: ["markdown", "html", "rawHtml"],
        onlyMainContent: false,
        maxAge: 0,
      },
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`firecrawl start failed: ${res.status} ${detail.slice(0, 300)}`);
  }
  const data = (await res.json()) as FirecrawlCrawlResponse;
  if (!data.id) throw new Error("firecrawl start: missing job id");
  return data.id;
}

async function firecrawlPollCrawl(
  jobId: string,
  deadlineMs: number,
): Promise<FirecrawlCrawlResponse> {
  const startedAt = Date.now();
  let last: FirecrawlCrawlResponse | null = null;
  while (Date.now() - startedAt < deadlineMs) {
    const res = await fetch(`${FIRECRAWL_BASE}/crawl/${jobId}`, {
      headers: { Authorization: `Bearer ${FIRECRAWL_API_KEY}` },
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`firecrawl poll failed: ${res.status} ${detail.slice(0, 300)}`);
    }
    last = (await res.json()) as FirecrawlCrawlResponse;
    if (last.status === "completed" || last.status === "failed") return last;
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error("firecrawl poll: deadline exceeded");
}

function firecrawlToCrawledPages(payload: FirecrawlCrawlResponse): CrawledPage[] {
  const data = payload.data ?? [];
  return data
    .map((page): CrawledPage | null => {
      const meta = page.metadata ?? {};
      const url = meta.sourceURL ?? meta.url ?? "";
      if (!url) return null;
      const title = firstString(meta.title) ?? "";
      const description = firstString(meta.description) ?? "";
      // Prefer rawHtml so <head> meta / JSON-LD / icons survive for SEO parsing.
      const html = page.rawHtml || page.html || "";
      const markdown = page.markdown ?? "";
      const extracted = html ? extractPageContent(html) : null;
      const text = extracted?.text || markdown.slice(0, PER_PAGE_CHAR_CAP);
      const bodyText = extracted?.bodyText ?? markdown;
      return {
        url,
        status: meta.statusCode ?? 200,
        title: extracted?.title || title || null,
        description: extracted?.description || description || null,
        text,
        bodyText,
        snippet: (markdown || bodyText).slice(0, SNIPPET_CHAR_CAP),
        charCount: text.length,
      };
    })
    .filter((p): p is CrawledPage => p !== null);
}

async function loadRecentCachedCrawl(
  adminClient: ReturnType<typeof createClient>,
  userId: string,
  normalizedUrl: string,
): Promise<{ payload: unknown } | null> {
  const { data } = await adminClient
    .from("website_scan_history")
    .select("crawl_payload, created_at")
    .eq("user_id", userId)
    .eq("normalized_url", normalizedUrl)
    .not("crawl_payload", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data?.crawl_payload) return null;
  const ageMs = Date.now() - new Date(data.created_at).getTime();
  if (ageMs > CACHE_TTL_MS) return null;
  return { payload: data.crawl_payload };
}

async function fetchPages(
  adminClient: ReturnType<typeof createClient>,
  userId: string,
  seedUrl: string,
  normalizedUrl: string,
  forceFresh: boolean,
): Promise<FetchPagesResult> {
  if (!forceFresh) {
    try {
      const cached = await loadRecentCachedCrawl(adminClient, userId, normalizedUrl);
      if (cached) {
        const pages = firecrawlToCrawledPages(cached.payload as FirecrawlCrawlResponse);
        if (pages.length > 0) {
          return {
            pages,
            finalSeedUrl: pages[0].url,
            seedStatus: pages[0].status,
            source: "cache",
            payload: cached.payload,
            firecrawlJobId: null,
          };
        }
      }
    } catch (err) {
      console.error(`[fetchPages] cache lookup failed: ${(err as Error).message}`);
    }
  }
  const jobId = await firecrawlStartCrawl(seedUrl);
  const result = await firecrawlPollCrawl(jobId, FIRECRAWL_TIMEOUT_MS);
  if (result.status === "failed") {
    throw new Error("firecrawl crawl reported failed status");
  }
  const pages = firecrawlToCrawledPages(result);
  return {
    pages,
    finalSeedUrl: pages[0]?.url ?? seedUrl,
    seedStatus: pages[0]?.status ?? 200,
    source: "fresh",
    payload: result,
    firecrawlJobId: jobId,
  };
}

type SeoAudit = {
  score: number;
  title: string | null;
  description: string | null;
  keywords: string | null;
  author: string | null;
  canonical: string | null;
  language: string | null;
  robots: string | null;
  googlebot: string | null;
  geoRegion: string | null;
  geoCountry: string | null;
  ogType: string | null;
  ogSiteName: string | null;
  ogLocale: string | null;
  ogUrl: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  ogImageAlt: string | null;
  twitterCard: string | null;
  twitterSite: string | null;
  twitterCreator: string | null;
  twitterTitle: string | null;
  twitterDescription: string | null;
  twitterImage: string | null;
  h1: string[];
  headingsCount: { h1: number; h2: number; h3: number };
  imagesMissingAlt: number;
  imagesTotal: number;
  hasViewport: boolean;
  hasFavicon: boolean;
  hasAppleTouchIcon: boolean;
  hasManifest: boolean;
  hasJsonLd: boolean;
  jsonLdTypes: string[];
  siteVerification: string[];
  analytics: string[];
  preloadImages: string[];
  wordCount: number;
  internalLinks: number;
  externalLinks: number;
  findings: { title: string; severity: "good" | "warn" | "bad"; detail: string }[];
};

function linkRelHref(html: string, relPattern: string): string | null {
  const re = new RegExp(
    `<link\\b[^>]*rel\\s*=\\s*["'][^"']*${relPattern}[^"']*["'][^>]*href\\s*=\\s*["']([^"']+)["']`,
    "i",
  );
  const re2 = new RegExp(
    `<link\\b[^>]*href\\s*=\\s*["']([^"']+)["'][^>]*rel\\s*=\\s*["'][^"']*${relPattern}[^"']*["']`,
    "i",
  );
  const m = html.match(re) ?? html.match(re2);
  return m ? decodeEntities(m[1]) : null;
}

function extractJsonLdTypes(html: string): string[] {
  const types = new Set<string>();
  const re = /<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    const raw = match[1]?.trim();
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw) as unknown;
      const visit = (node: unknown) => {
        if (!node) return;
        if (Array.isArray(node)) {
          for (const item of node) visit(item);
          return;
        }
        if (typeof node !== "object") return;
        const obj = node as Record<string, unknown>;
        const t = obj["@type"];
        if (typeof t === "string") types.add(t);
        else if (Array.isArray(t)) {
          for (const item of t) if (typeof item === "string") types.add(item);
        }
        if (obj["@graph"]) visit(obj["@graph"]);
      };
      visit(parsed);
    } catch {
      /* ignore invalid JSON-LD */
    }
  }
  return [...types];
}

function detectAnalytics(html: string): string[] {
  const found: string[] = [];
  if (/googletagmanager\.com\/gtag\/js|gtag\s*\(\s*['"]config['"]/i.test(html)) {
    found.push("Google Analytics / gtag");
  }
  if (/AW-\d+/i.test(html) || /googleadservices|google.?ads/i.test(html)) {
    found.push("Google Ads");
  }
  if (/clarity\.ms\/tag/i.test(html) || /\bclarity\s*\(/i.test(html)) {
    found.push("Microsoft Clarity");
  }
  if (/www\.google-analytics\.com|UA-\d+-\d+/i.test(html)) {
    found.push("Universal Analytics");
  }
  return found;
}

function extractPreloadImages(html: string): string[] {
  const out: string[] = [];
  const re =
    /<link\b[^>]*rel\s*=\s*["']preload["'][^>]*as\s*=\s*["']image["'][^>]*href\s*=\s*["']([^"']+)["']/gi;
  const re2 =
    /<link\b[^>]*as\s*=\s*["']image["'][^>]*rel\s*=\s*["']preload["'][^>]*href\s*=\s*["']([^"']+)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) out.push(decodeEntities(match[1]));
  while ((match = re2.exec(html)) !== null) {
    const href = decodeEntities(match[1]);
    if (!out.includes(href)) out.push(href);
  }
  return out;
}

function extractSiteVerification(html: string): string[] {
  const out: string[] = [];
  const names = [
    "google-site-verification",
    "msvalidate.01",
    "yandex-verification",
    "facebook-domain-verification",
  ];
  for (const name of names) {
    const value = firstMetaContent(html, "name", name);
    if (value) out.push(`${name}=${value}`);
  }
  return out;
}

function emptySeoFields(): Omit<SeoAudit, "score" | "title" | "description" | "wordCount" | "findings"> {
  return {
    keywords: null,
    author: null,
    canonical: null,
    language: null,
    robots: null,
    googlebot: null,
    geoRegion: null,
    geoCountry: null,
    ogType: null,
    ogSiteName: null,
    ogLocale: null,
    ogUrl: null,
    ogTitle: null,
    ogDescription: null,
    ogImage: null,
    ogImageAlt: null,
    twitterCard: null,
    twitterSite: null,
    twitterCreator: null,
    twitterTitle: null,
    twitterDescription: null,
    twitterImage: null,
    h1: [],
    headingsCount: { h1: 0, h2: 0, h3: 0 },
    imagesMissingAlt: 0,
    imagesTotal: 0,
    hasViewport: false,
    hasFavicon: false,
    hasAppleTouchIcon: false,
    hasManifest: false,
    hasJsonLd: false,
    jsonLdTypes: [],
    siteVerification: [],
    analytics: [],
    preloadImages: [],
    internalLinks: 0,
    externalLinks: 0,
  };
}

function buildSeoAudit(page: ParsedPage, baseUrl: string): SeoAudit {
  const html = page.html;
  const baseHost = (() => {
    try {
      return new URL(baseUrl).host;
    } catch {
      return "";
    }
  })();

  const title = page.title;
  const description = page.description ?? firstMetaContent(html, "name", "description");
  const keywords = firstMetaContent(html, "name", "keywords");
  const author = firstMetaContent(html, "name", "author");
  const canonical = linkRelHref(html, "canonical");
  const htmlLangMatch = html.match(/<html\b[^>]*\blang\s*=\s*["']([^"']+)["']/i);
  const language =
    htmlLangMatch?.[1] ??
    firstMetaContent(html, "name", "language") ??
    page.language;

  const robots = firstMetaContent(html, "name", "robots");
  const googlebot = firstMetaContent(html, "name", "googlebot");
  const geoRegion = firstMetaContent(html, "name", "geo.region");
  const geoCountry = firstMetaContent(html, "name", "geo.country");

  const ogType = firstMetaContent(html, "property", "og:type");
  const ogSiteName = firstMetaContent(html, "property", "og:site_name");
  const ogLocale = firstMetaContent(html, "property", "og:locale");
  const ogUrl = firstMetaContent(html, "property", "og:url");
  const ogTitle = firstMetaContent(html, "property", "og:title");
  const ogDescription = firstMetaContent(html, "property", "og:description");
  const ogImage = firstMetaContent(html, "property", "og:image");
  const ogImageAlt = firstMetaContent(html, "property", "og:image:alt");

  const twitterCard = firstMetaContent(html, "name", "twitter:card");
  const twitterSite = firstMetaContent(html, "name", "twitter:site");
  const twitterCreator = firstMetaContent(html, "name", "twitter:creator");
  const twitterTitle = firstMetaContent(html, "name", "twitter:title");
  const twitterDescription = firstMetaContent(html, "name", "twitter:description");
  const twitterImage = firstMetaContent(html, "name", "twitter:image");

  const h1 = matchTags(html, "h1").map((t) => stripTags(t)).filter(Boolean);
  const headingsCount = {
    h1: matchTags(html, "h1").length,
    h2: matchTags(html, "h2").length,
    h3: matchTags(html, "h3").length,
  };

  const imgTags = matchSelfClosing(html, "img");
  const imagesTotal = imgTags.length;
  const imagesMissingAlt = imgTags.filter((t) => {
    const alt = attrOf(t, "alt");
    return alt == null;
  }).length;

  const hasViewport = /<meta\b[^>]*name\s*=\s*["']viewport["']/i.test(html);
  const hasFavicon = Boolean(
    linkRelHref(html, "icon") || linkRelHref(html, "shortcut\\s+icon"),
  );
  const hasAppleTouchIcon = Boolean(linkRelHref(html, "apple-touch-icon"));
  const hasManifest = Boolean(linkRelHref(html, "manifest"));
  const jsonLdTypes = extractJsonLdTypes(html);
  const hasJsonLd = jsonLdTypes.length > 0 ||
    /<script\b[^>]*type\s*=\s*["']application\/ld\+json["']/i.test(html);
  const siteVerification = extractSiteVerification(html);
  const analytics = detectAnalytics(html);
  const preloadImages = extractPreloadImages(html);

  const bodyMatch = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
  const bodyText = bodyMatch ? stripTags(bodyMatch[1]) : stripTags(html);
  const wordCount = bodyText ? bodyText.split(/\s+/).filter(Boolean).length : 0;

  let internalLinks = 0;
  let externalLinks = 0;
  const linkTags = [...matchTags(html, "a"), ...matchSelfClosing(html, "a")];
  for (const tag of linkTags) {
    const href = attrOf(tag, "href");
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) continue;
    try {
      const url = new URL(href, baseUrl);
      if (url.host === baseHost) internalLinks += 1;
      else externalLinks += 1;
    } catch {
      // ignore bad hrefs
    }
  }

  const findings: SeoAudit["findings"] = [];
  const push = (
    severity: SeoAudit["findings"][number]["severity"],
    t: string,
    detail: string,
  ) => findings.push({ severity, title: t, detail });

  if (title) {
    const len = title.length;
    if (len < 30) push("warn", "Title is short", `Title is ${len} chars. Aim for 50–60.`);
    else if (len > 65) push("warn", "Title is long", `Title is ${len} chars. Search engines truncate past ~60.`);
    else push("good", "Title length looks good", `${len} characters.`);
  } else {
    push("bad", "Missing <title>", "Add a unique, descriptive <title> tag.");
  }

  if (description) {
    const len = description.length;
    if (len < 70) push("warn", "Meta description is short", `${len} chars. Aim for 140–160.`);
    else if (len > 170) push("warn", "Meta description is long", `${len} chars. Aim for 140–160.`);
    else push("good", "Meta description looks good", `${len} characters.`);
  } else {
    push("bad", "Missing meta description", "Add a name=\"description\" meta tag.");
  }

  canonical
    ? push("good", "Canonical link present", canonical)
    : push("warn", "Missing canonical link", "Add <link rel=\"canonical\" href=\"…\"> to avoid duplicate-content ambiguity.");

  hasViewport
    ? push("good", "Viewport meta present", "Mobile rendering will be set explicitly.")
    : push("bad", "Missing viewport meta", "Add <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">.");

  hasFavicon
    ? push("good", "Favicon linked", "Favicon is referenced.")
    : push("warn", "No favicon found", "Add a favicon link in <head>.");

  hasAppleTouchIcon
    ? push("good", "Apple touch icon present", "iOS home-screen icon is linked.")
    : push("warn", "No apple-touch-icon", "Add <link rel=\"apple-touch-icon\"> for iOS.");

  hasManifest
    ? push("good", "Web app manifest linked", "PWA manifest is referenced.")
    : push("warn", "No web app manifest", "Add <link rel=\"manifest\"> if you want installability.");

  if (h1.length === 0) push("bad", "No <h1> found", "Add a single, descriptive <h1> per page.");
  else if (h1.length > 1) push("warn", "Multiple <h1> tags", `Found ${h1.length}. Prefer one canonical <h1>.`);
  else push("good", "Single <h1>", h1[0] ?? "");

  if (imagesTotal === 0) push("warn", "No images detected", "Consider adding hero or product imagery.");
  else if (imagesMissingAlt > 0)
    push(
      imagesMissingAlt === imagesTotal ? "bad" : "warn",
      `${imagesMissingAlt} image(s) missing alt`,
      `${imagesMissingAlt} of ${imagesTotal} <img> tags have no alt attribute.`,
    );
  else push("good", "All images have alt text", `${imagesTotal} images, all with alt.`);

  ogTitle && ogDescription && ogImage
    ? push("good", "Open Graph tags complete", "og:title, og:description, og:image present.")
    : push("warn", "Open Graph tags incomplete", "Provide og:title, og:description, og:image for richer social previews.");

  twitterCard && (twitterTitle || ogTitle) && (twitterImage || ogImage)
    ? push("good", "Twitter Card tags present", `twitter:card=${twitterCard}`)
    : push("warn", "Twitter Card tags incomplete", "Add twitter:card, title, and image for X/Twitter previews.");

  hasJsonLd
    ? push(
      "good",
      "JSON-LD structured data found",
      jsonLdTypes.length ? `Types: ${jsonLdTypes.join(", ")}` : "application/ld+json script present.",
    )
    : push("warn", "No JSON-LD structured data", "Add schema.org JSON-LD for rich results.");

  if (siteVerification.length)
    push("good", "Site verification meta present", siteVerification.map((s) => s.split("=")[0]).join(", "));

  if (analytics.length)
    push("good", "Analytics tags detected", analytics.join(", "));
  else push("warn", "No analytics tags detected", "GA4 / Ads / Clarity not found in HTML source.");

  if (preloadImages.length)
    push("good", "LCP image preload", preloadImages.join(", "));

  if (wordCount < 200) push("warn", "Thin on-page copy", `~${wordCount} words on the page.`);
  else push("good", "Healthy word count", `~${wordCount} words.`);

  let score = 100;
  if (!title) score -= 12;
  else if ((title.length < 30) || (title.length > 65)) score -= 4;
  if (!description) score -= 10;
  else if ((description.length < 70) || (description.length > 170)) score -= 3;
  if (!canonical) score -= 6;
  if (!hasViewport) score -= 8;
  if (!hasFavicon) score -= 3;
  if (!hasAppleTouchIcon) score -= 1;
  if (!hasManifest) score -= 1;
  if (h1.length !== 1) score -= 6;
  if (imagesMissingAlt > 0) score -= Math.min(8, imagesMissingAlt);
  if (!(ogTitle && ogDescription && ogImage)) score -= 5;
  if (!(twitterCard && (twitterTitle || ogTitle))) score -= 3;
  if (!hasJsonLd) score -= 5;
  if (wordCount < 200) score -= 5;
  score = Math.max(0, Math.min(100, score));

  return {
    score,
    title,
    description,
    keywords,
    author,
    canonical,
    language,
    robots,
    googlebot,
    geoRegion,
    geoCountry,
    ogType,
    ogSiteName,
    ogLocale,
    ogUrl,
    ogTitle,
    ogDescription,
    ogImage,
    ogImageAlt,
    twitterCard,
    twitterSite,
    twitterCreator,
    twitterTitle,
    twitterDescription,
    twitterImage,
    h1,
    headingsCount,
    imagesMissingAlt,
    imagesTotal,
    hasViewport,
    hasFavicon,
    hasAppleTouchIcon,
    hasManifest,
    hasJsonLd,
    jsonLdTypes,
    siteVerification,
    analytics,
    preloadImages,
    wordCount,
    internalLinks,
    externalLinks,
    findings,
  };
}

function buildFallbackSeo(seedPage: CrawledPage): SeoAudit {
  return {
    score: 50,
    title: seedPage.title,
    description: seedPage.description,
    ...emptySeoFields(),
    wordCount: seedPage.charCount,
    findings: [
      {
        title: "SEO signals unavailable from crawl payload",
        severity: "warn",
        detail:
          "The crawl returned markdown without HTML, so meta tags and headings couldn't be parsed. Falling back to neutral scores.",
      },
    ],
  };
}

type AiAudit = {
  score?: number;
  summary?: string;
  [k: string]: unknown;
};

function buildCorpus(pages: CrawledPage[]): string {
  const chunks: string[] = [];
  let total = 0;
  for (let i = 0; i < pages.length; i += 1) {
    const page = pages[i];
    if (!page.text) continue;
    const header = `--- PAGE ${i + 1} of ${pages.length}: ${page.url} ---`;
    const chunk = `${header}\n${page.text}`;
    if (total + chunk.length > CORPUS_CHAR_CAP) {
      const remaining = Math.max(0, CORPUS_CHAR_CAP - total);
      if (remaining > header.length + 80) {
        chunks.push(`${header}\n${page.text.slice(0, remaining - header.length)}`);
      }
      break;
    }
    chunks.push(chunk);
    total += chunk.length;
  }
  return chunks.join("\n\n");
}

async function callGemini<T extends AiAudit>(
  prompt: string,
  fallback: T,
  apiKey: string,
  modelName: string = MODEL_NAME,
): Promise<T> {
  if (!apiKey) {
    console.error(`[callGemini] no api key for ${modelName}; returning fallback`);
    return fallback;
  }
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.4,
            responseMimeType: "application/json",
          },
        }),
      },
    );
    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      console.error(
        `[callGemini] ${modelName} returned ${res.status} ${res.statusText}: ${errBody.slice(0, 500)}`,
      );
      return fallback;
    }
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof text !== "string") {
      console.error(
        `[callGemini] ${modelName} response missing text. finishReason=${
          data?.candidates?.[0]?.finishReason
        } blockReason=${data?.promptFeedback?.blockReason}`,
      );
      return fallback;
    }
    let parsed: T;
    try {
      parsed = JSON.parse(text) as T;
    } catch (parseErr) {
      console.error(
        `[callGemini] ${modelName} JSON.parse failed: ${(parseErr as Error).message}; first 200 chars: ${text.slice(0, 200)}`,
      );
      return fallback;
    }
    return sanitizeGeminiAudit(deepMerge(fallback, parsed) as T);
  } catch (err) {
    console.error(`[callGemini] ${modelName} threw: ${(err as Error).message}`);
    return fallback;
  }
}

/** Coerce Gemini quirks before they land in history JSONB:
 * - findings.severity: high|medium|low / Title Case → good|warn|bad
 * - roadmap.horizonDays: [30,60,90] → 90
 * - strip exact "Not enough signal" list filler where possible is left to the client;
 *   here we only fix shapes that would crash or mis-badge the UI. */
function sanitizeGeminiAudit<T>(value: T): T {
  if (!isPlainObject(value)) return value;
  const out: Record<string, unknown> = { ...value };

  if (Array.isArray(out.findings)) {
    out.findings = out.findings.map((item) => {
      if (!isPlainObject(item)) return item;
      return { ...item, severity: coerceFindingSeverity(item.severity) };
    });
  }

  if ("horizonDays" in out || "horizon" in out) {
    out.horizonDays = coerceHorizonDays(out.horizonDays ?? out.horizon);
    delete out.horizon;
  }

  if (isPlainObject(out.business) && Array.isArray((out.business as Record<string, unknown>).findings)) {
    const biz = { ...(out.business as Record<string, unknown>) };
    biz.findings = (biz.findings as unknown[]).map((item) => {
      if (!isPlainObject(item)) return item;
      return { ...item, severity: coerceFindingSeverity(item.severity) };
    });
    out.business = biz;
  }

  if (
    isPlainObject(out.competitor) &&
    Array.isArray((out.competitor as Record<string, unknown>).findings)
  ) {
    const comp = { ...(out.competitor as Record<string, unknown>) };
    comp.findings = (comp.findings as unknown[]).map((item) => {
      if (!isPlainObject(item)) return item;
      return { ...item, severity: coerceFindingSeverity(item.severity) };
    });
    out.competitor = comp;
  }

  return out as T;
}

function coerceFindingSeverity(raw: unknown): "good" | "warn" | "bad" {
  const s = String(raw ?? "").trim().toLowerCase();
  if (["good", "ok", "positive", "success"].includes(s)) return "good";
  if (["warn", "warning", "medium", "low", "info", "minor"].includes(s)) return "warn";
  if (["bad", "high", "critical", "error", "severe"].includes(s)) return "bad";
  return "warn";
}

function coerceHorizonDays(raw: unknown): 30 | 60 | 90 {
  if (raw === 30 || raw === 60 || raw === 90) return raw;
  if (Array.isArray(raw)) {
    const nums = raw
      .map((item) => (typeof item === "number" ? item : Number(item)))
      .filter((n): n is 30 | 60 | 90 => n === 30 || n === 60 || n === 90);
    if (nums.length) return Math.max(...nums) as 30 | 60 | 90;
  }
  const n = typeof raw === "number" ? raw : Number(raw);
  if (n === 30 || n === 60 || n === 90) return n;
  return 90;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function deepMerge<T>(fallback: T, override: unknown): T {
  if (!isPlainObject(fallback) || !isPlainObject(override)) {
    return (override === undefined ? fallback : (override as T));
  }
  const out: Record<string, unknown> = { ...fallback };
  for (const key of Object.keys(override)) {
    const a = (fallback as Record<string, unknown>)[key];
    const b = override[key];
    out[key] = isPlainObject(a) && isPlainObject(b) ? deepMerge(a, b) : b;
  }
  return out as T;
}

function buildBusinessPrompt(pages: CrawledPage[], seedUrl: string): string {
  const corpus = buildCorpus(pages);
  return [
    "You are an experienced product marketer auditing a public website.",
    `Site root: ${seedUrl}`,
    `Crawled ${pages.length} pages; use ALL of them — synthesize across the site, not just the homepage.`,
    "If a claim only appears on one page, say which one. If the site is too thin to support a claim, write 'Not enough signal' and lower the score.",
    "",
    "Return JSON with keys:",
    "score (0-100), summary (<=280 chars), valueProposition (string), audience (string),",
    "differentiators (string[]), weaknesses (string[]), callToActions (string[]),",
    "monetizationSignals (string[]), socialProof (string[]), trustSignals (string[]),",
    "findings ([{title, severity MUST be exactly 'good'|'warn'|'bad' — never high/medium/low, detail}]).",
    "",
    "Site corpus:",
    corpus,
  ].join("\n");
}

function buildCompetitorPrompt(pages: CrawledPage[], seedUrl: string): string {
  const corpus = buildCorpus(pages);
  return [
    "You are a competitive analyst. Identify the competitive landscape implied by this website.",
    `Site root: ${seedUrl}`,
    `Crawled ${pages.length} pages. Synthesize across the site.`,
    "Only mention competitors that are strongly implied by copy on the site (e.g. comparison pages, 'alternatives to', 'vs' pages, named case studies).",
    "",
    "Return JSON with keys:",
    "score (0-100), summary (<=280 chars), positioning (string), likelyCompetitors (string[]),",
    "gaps (string[]), mentions ([{name, context}]), findings ([{title, severity MUST be exactly 'good'|'warn'|'bad', detail}]).",
    "",
    "Site corpus:",
    corpus,
  ].join("\n");
}

function buildRoadmapPrompt(
  pages: CrawledPage[],
  seedUrl: string,
  seo: SeoAudit,
): string {
  const corpus = buildCorpus(pages);
  const seoGaps = seo.findings
    .filter((f) => f.severity !== "good")
    .map((f) => `- ${f.title}: ${f.detail}`)
    .join("\n");
  return [
    "You are a growth strategist. Build a 30/60/90-day roadmap to improve this website.",
    `Site root: ${seedUrl}`,
    `Crawled ${pages.length} pages. Ground every recommendation in what the site actually says.`,
    "",
    "Known SEO gaps from the homepage audit:",
    seoGaps || "(none flagged)",
    "",
    "Return JSON with keys:",
    "score (0-100), summary (<=280 chars), horizonDays (a SINGLE number: 30 OR 60 OR 90 — never an array),",
    "quickWins (string[]), bigBets (string[]),",
    "steps ([{title, detail, effort in 'low'|'medium'|'high'}] — put phase labels like 'Day 0-30: …' as their own steps before the tasks in that phase),",
    "findings ([{title, severity MUST be exactly 'good'|'warn'|'bad' — never high/medium/low, detail}]).",
    "Prioritise fixes that move acquisition and conversion first.",
    "",
    "Site corpus:",
    corpus,
  ].join("\n");
}

const AUDIT_INPUT_CHAR_CAP = 4_000;

function trimForPrompt<T>(value: T): string {
  try {
    const str = JSON.stringify(value);
    if (str.length <= AUDIT_INPUT_CHAR_CAP) return str;
    return str.slice(0, AUDIT_INPUT_CHAR_CAP) + "…(truncated)";
  } catch {
    return "(unserializable)";
  }
}

function buildInsightsPrompt(
  pages: CrawledPage[],
  seedUrl: string,
  business: unknown,
  competitor: unknown,
  roadmap: unknown,
): string {
  const corpus = buildCorpus(pages);
  return [
    "You are a senior strategy consultant writing the 'insights' section of a website audit.",
    `Site root: ${seedUrl}`,
    `Crawled ${pages.length} pages. You have the raw site copy AND the structured audits the previous pass already produced. Use BOTH. The structured audits are your primary source — they were generated from the same site and already encode the patterns. Use the corpus to back up any specific claim.`,
    "",
    "Inference bias: STRONG. Make your best inference from every signal you have — the URL slug, the audience, the value proposition, the differentiators, the gaps, the named competitors. If the corpus is thin, infer from the URL and audit inputs rather than refusing to answer. The reader wants your best take, not a non-answer.",
    "",
    "Only write 'Not enough signal' for a field if ALL of the audit inputs are empty AND the URL gives no information. In every other case, make a confident best-guess and state it as your read, not as a fact.",
    "",
    "Goal: surface insights a busy reader would NOT think to ask for. Be specific, opinionated, and concrete. Prefer named tools, segments, or claims over generic phrasing. Skip platitudes.",
    "",
    "Return JSON with these keys (and ONLY these keys):",
    "industry (string — the market category + lifecycle read in one sentence, e.g. 'B2B SaaS, mid-stage in workflow automation for marketing teams')",
    "standoutInsights (string[] — 3 to 5 non-obvious findings; each one a single tight sentence)",
    "business: object with keys:",
    "  businessModel (string — what they sell, how they charge, e.g. 'PLG SaaS with freemium + 3 paid tiers')",
    "  stage ({label: 'pre-seed'|'seed'|'growth'|'mature', evidence: string} | null — best inference with one-line evidence)",
    "  geography (string — explicit + implicit markets; infer from language, currency, signals in the corpus)",
    "  jobToBeDone (string — frame as 'When [situation], I want [motivation], so I can [outcome]')",
    "  pricingStrategy (string — pricing posture in one sentence; if unknown, infer from category)",
    "  funnelPath (string — primary conversion path: which page leads to which CTA; if no CTA, say 'organic discovery only')",
    "  objectionsUnhandled (string[] — 3 to 5 buyer questions the site conspicuously does NOT address; if site is thin, list the universal objections for this category, e.g. security, compliance, integrations, migration, ROI, support SLAs)",
    "  copyPatterns (string[] — 2 to 4 reads on the copywriting; if corpus is thin, infer from headlines you do have)",
    "  brandSignals (string[] — 2 to 4 voice/tone reads; if corpus is thin, infer from the URL and one or two headings)",
    "competitor: object with keys:",
    "  category (string — category this site competes in, plus a crowdedness read)",
    "  directCompetitors ([{name, whyThreat}] — name up to 5 plausible direct competitors in this category; use your world knowledge of the category as inferred from the URL and audits, not just the corpus)",
    "  indirectCompetitors ([{name, whyThreat}] — alternatives a buyer might choose instead; use category knowledge)",
    "  competitorAngles ([{name, whatSiteSays}] — for each named competitor, what does THIS site say about them, if anything; if the site says nothing, use 'No mention on site' as the context but still name the competitor)",
    "  unspokenGaps (string[] — topics competitors usually address but THIS site avoids; one per gap; if site is thin, list category-standard gaps)",
    "  switchingCosts ({level: 'low'|'medium'|'high', evidence: string} | null — how painful it is to switch away; infer from whether the product is a workflow, data store, or point solution)",
    "  buyerAlternatives (string[] — 3 to 5 realistic alternatives a buyer would shortlist, including 'build in-house', 'spreadsheet', 'do nothing' if relevant)",
    "  wedge (string — what's defensible about this site: network effect, data moat, vertical focus, brand; if none is evident, name the most plausible hypothesis)",
    "",
    "Existing audits (truncated):",
    `BUSINESS: ${trimForPrompt(business)}`,
    `COMPETITOR: ${trimForPrompt(competitor)}`,
    `ROADMAP: ${trimForPrompt(roadmap)}`,
    "",
    "Site corpus:",
    corpus,
  ].join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return errorResponse(405, "method_not_allowed", "Use POST.");

  const authHeader = req.headers.get("authorization") ?? "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  const accessToken = match?.[1];
  if (!accessToken) return errorResponse(401, "unauthenticated", "Missing bearer token.");

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return errorResponse(500, "misconfigured", "Supabase credentials missing.");
  }

  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) {
    return errorResponse(401, "unauthenticated", "Invalid session.");
  }

  let body: { url?: unknown; forceFresh?: unknown; stream?: unknown };
  try {
    body = await req.json();
  } catch {
    return errorResponse(400, "invalid_json", "Body must be JSON.");
  }
  const rawUrl = asString(body.url);
  if (!rawUrl) return errorResponse(400, "missing_url", "Field 'url' is required.");
  const forceFresh = body.forceFresh === true;
  const normalized = normalizeUrl(rawUrl);
  if (!normalized) {
    return errorResponse(
      400,
      "invalid_url",
      "Provide a plain public http(s) URL (https://example.com). Emails (@), special characters, localhost, IPs, internal hosts, and adult/gore sites are not allowed.",
    );
  }

  const started = Date.now();
  let crawl: FetchPagesResult;
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    return errorResponse(
      500,
      "misconfigured",
      "SUPABASE_SERVICE_ROLE_KEY not set on the function.",
    );
  }
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  try {
    crawl = await fetchPages(
      adminClient,
      userData.user.id,
      normalized,
      normalized,
      forceFresh,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Fetch Failed, Site not supported";
    return errorResponse(502, "Fetch Failed", `Could not fetch the URL (${msg}).`);
  }
  if (crawl.seedStatus >= 400) {
    return errorResponse(502, "Upstream Error", `Site returned HTTP ${crawl.seedStatus}, Site not supported.`);
  }
  if (crawl.pages.length === 0) {
    return errorResponse(502, "No Content", "No pages were crawled, Site not supported.");
  }

  const seedPage = crawl.pages[0];
  // Pull the seed page's raw HTML from the Firecrawl payload so the SEO audit
  // can parse meta tags, headings, and links without a second fetch.
  const firecrawlData = (crawl.payload as FirecrawlCrawlResponse | null)?.data ?? [];
  const seedFirecrawl =
    firecrawlData.find(
      (p) => (p.metadata?.sourceURL ?? p.metadata?.url) === seedPage.url,
    ) ?? firecrawlData[0];
  const seedHtml = seedFirecrawl?.rawHtml || seedFirecrawl?.html || "";
  const seedForSeo: ParsedPage = {
    status: seedPage.status,
    finalUrl: seedPage.url,
    html: seedHtml,
    title: seedPage.title,
    description: seedPage.description,
    language: firstString(seedFirecrawl?.metadata?.language) ?? null,
  };
  let seo: SeoAudit;
  try {
    if (seedHtml) {
      seo = buildSeoAudit(seedForSeo, seedPage.url);
    } else {
      seo = buildFallbackSeo(seedPage);
    }
  } catch {
    seo = buildFallbackSeo(seedPage);
  }
  void seedForSeo;

  const userKey = (req.headers.get("x-gemini-key") ?? "").trim();
  const apiKey = userKey || GEMINI_API_KEY;

  const businessFallback = {
    score: 0,
    summary: "",
    valueProposition: "",
    audience: "",
    differentiators: [] as string[],
    weaknesses: [] as string[],
    callToActions: [] as string[],
    monetizationSignals: [] as string[],
    socialProof: [] as string[],
    trustSignals: [] as string[],
    findings: [] as { title: string; severity: "good" | "warn" | "bad"; detail: string }[],
  };

  const competitorFallback = {
    score: 0,
    summary: "",
    positioning: "",
    likelyCompetitors: [] as string[],
    gaps: [] as string[],
    mentions: [] as { name: string; context: string }[],
    findings: [] as { title: string; severity: "good" | "warn" | "bad"; detail: string }[],
  };

  const roadmapFallback = {
    score: 0,
    summary: "",
    horizonDays: 90 as const,
    quickWins: [] as string[],
    bigBets: [] as string[],
    steps: [] as { title: string; detail: string; effort: "low" | "medium" | "high" }[],
    findings: [] as { title: string; severity: "good" | "warn" | "bad"; detail: string }[],
  };

  const insightsFallback = {
    industry: "",
    standoutInsights: [] as string[],
    business: {
      businessModel: "",
      stage: null as null,
      geography: "",
      jobToBeDone: "",
      pricingStrategy: "",
      funnelPath: "",
      objectionsUnhandled: [] as string[],
      copyPatterns: [] as string[],
      brandSignals: [] as string[],
    },
    competitor: {
      category: "",
      directCompetitors: [] as { name: string; whyThreat: string }[],
      indirectCompetitors: [] as { name: string; whyThreat: string }[],
      competitorAngles: [] as { name: string; whatSiteSays: string }[],
      unspokenGaps: [] as string[],
      switchingCosts: null as null,
      buyerAlternatives: [] as string[],
      wedge: "",
    },
  };

  const businessUnavailable = {
    ...businessFallback,
    score: 40,
    summary: "AI analysis unavailable for the business audit.",
    valueProposition: "Not enough signal",
    audience: "Not enough signal",
  };

  const competitorUnavailable = {
    ...competitorFallback,
    score: 40,
    summary: "AI analysis unavailable for the competitor audit.",
    positioning: "Not enough signal",
  };

  const roadmapUnavailable = {
    ...roadmapFallback,
    score: 40,
    summary: "AI analysis unavailable for the roadmap.",
    horizonDays: 60 as const,
  };

  const insightsUnavailable = {
    industry: "Not enough signal",
    standoutInsights: [] as string[],
    business: {
      businessModel: "Not enough signal",
      stage: null as null,
      geography: "Not enough signal",
      jobToBeDone: "Not enough signal",
      pricingStrategy: "Not enough signal",
      funnelPath: "Not enough signal",
      objectionsUnhandled: [] as string[],
      copyPatterns: [] as string[],
      brandSignals: [] as string[],
    },
    competitor: {
      category: "Not enough signal",
      directCompetitors: [] as { name: string; whyThreat: string }[],
      indirectCompetitors: [] as { name: string; whyThreat: string }[],
      competitorAngles: [] as { name: string; whatSiteSays: string }[],
      unspokenGaps: [] as string[],
      switchingCosts: null as null,
      buyerAlternatives: [] as string[],
      wedge: "Not enough signal",
    },
  };

  const historyId = crypto.randomUUID();
  let pendingSections: PendingSections = ["business", "competitor", "roadmap", "insights"];

  let report: ReportShell = {
    id: historyId,
    url: rawUrl,
    normalizedUrl: normalized,
    finalUrl: crawl.finalSeedUrl,
    status: crawl.seedStatus,
    scanStatus: "running",
    pendingSections: [...pendingSections],
    fetchedAt: new Date().toISOString(),
    durationMs: Date.now() - started,
    crawl: {
      totalPages: crawl.pages.length,
      pages: crawl.pages.map((page) => ({
        url: page.url,
        title: page.title,
        status: page.status,
        charCount: page.charCount,
        snippet: page.snippet,
      })),
    },
    seo,
    business: { ...businessFallback },
    competitor: { ...competitorFallback },
    roadmap: { ...roadmapFallback },
    insights: { ...insightsFallback },
    meta: {
      title: seedPage.title,
      description: seedPage.description,
      language: null,
    },
  };

  let persistAborted = false;
  let rowInserted = false;

  async function persistReport(partial: {
    scanStatus?: ScanProgressStatus;
    businessScore?: number;
    competitorScore?: number;
    roadmapScore?: number;
  } = {}): Promise<boolean> {
    if (persistAborted) return false;
    report = {
      ...report,
      durationMs: Date.now() - started,
      pendingSections: [...pendingSections],
      scanStatus: partial.scanStatus ?? report.scanStatus,
    };
    const row = {
      id: historyId,
      user_id: userData.user.id,
      url: rawUrl,
      normalized_url: normalized,
      final_url: crawl.finalSeedUrl,
      status: crawl.seedStatus,
      scan_status: report.scanStatus,
      duration_ms: report.durationMs,
      page_count: crawl.pages.length,
      site_title: seedPage.title,
      seo_score: seo.score,
      business_score:
        partial.businessScore ??
        (typeof report.business.score === "number" ? report.business.score : 0),
      competitor_score:
        partial.competitorScore ??
        (typeof report.competitor.score === "number" ? report.competitor.score : 0),
      roadmap_score:
        partial.roadmapScore ??
        (typeof report.roadmap.score === "number" ? report.roadmap.score : 0),
      report,
      crawl_payload: crawl.payload ?? null,
      crawl_source: crawl.source,
      crawl_at: new Date().toISOString(),
      firecrawl_job_id: crawl.firecrawlJobId,
    };

    if (!rowInserted) {
      const { error: persistErr } = await adminClient
        .from("website_scan_history")
        .insert(row);
      if (persistErr) {
        console.error(`[persist] history insert failed: ${persistErr.message}`);
        return false;
      }
      rowInserted = true;
      return true;
    }

    // UPDATE (not upsert) so a user delete mid-scan is not resurrected.
    const { data: updated, error: updateErr } = await adminClient
      .from("website_scan_history")
      .update({
        scan_status: row.scan_status,
        duration_ms: row.duration_ms,
        business_score: row.business_score,
        competitor_score: row.competitor_score,
        roadmap_score: row.roadmap_score,
        report: row.report,
      })
      .eq("id", historyId)
      .eq("user_id", userData.user.id)
      .select("id")
      .maybeSingle();

    if (updateErr) {
      console.error(`[persist] history update failed: ${updateErr.message}`);
      return false;
    }
    if (!updated) {
      persistAborted = true;
      console.warn(
        `[persist] scan ${historyId} missing (deleted?) — stopping further writes`,
      );
      return false;
    }
    return true;
  }

  // Insert stub as soon as SEO is ready so the client can open the detail page.
  try {
    const ok = await persistReport({ scanStatus: "running" });
    if (!ok) {
      return errorResponse(500, "persist_failed", "Could not save the scan stub.");
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "persist_failed";
    console.error(`[persist] stub insert threw: ${msg}`);
    return errorResponse(500, "persist_failed", `Could not save the scan stub (${msg}).`);
  }

  const runAudits = async (): Promise<void> => {
    if (persistAborted) return;

    const markSectionDone = (section: ScanSectionId) => {
      pendingSections = pendingSections.filter((s) => s !== section);
      report = { ...report, pendingSections: [...pendingSections] };
    };

    const businessP = callGemini(
      buildBusinessPrompt(crawl.pages, crawl.finalSeedUrl),
      businessUnavailable,
      apiKey,
    ).then(async (business) => {
      if (persistAborted) return business;
      report = { ...report, business: sanitizeGeminiAudit(business) as Record<string, unknown> };
      markSectionDone("business");
      await persistReport({
        businessScore: typeof business.score === "number" ? business.score : 0,
      });
      return business;
    });

    const competitorP = callGemini(
      buildCompetitorPrompt(crawl.pages, crawl.finalSeedUrl),
      competitorUnavailable,
      apiKey,
    ).then(async (competitor) => {
      if (persistAborted) return competitor;
      report = {
        ...report,
        competitor: sanitizeGeminiAudit(competitor) as Record<string, unknown>,
      };
      markSectionDone("competitor");
      await persistReport({
        competitorScore: typeof competitor.score === "number" ? competitor.score : 0,
      });
      return competitor;
    });

    const roadmapP = callGemini(
      buildRoadmapPrompt(crawl.pages, crawl.finalSeedUrl, seo),
      roadmapUnavailable,
      apiKey,
    ).then(async (roadmap) => {
      if (persistAborted) return roadmap;
      report = { ...report, roadmap: sanitizeGeminiAudit(roadmap) as Record<string, unknown> };
      markSectionDone("roadmap");
      await persistReport({
        roadmapScore: typeof roadmap.score === "number" ? roadmap.score : 0,
      });
      return roadmap;
    });

    const [business, competitor, roadmap] = await Promise.all([
      businessP,
      competitorP,
      roadmapP,
    ]);

    if (persistAborted) return;

    const insights = await callGemini(
      buildInsightsPrompt(crawl.pages, crawl.finalSeedUrl, business, competitor, roadmap),
      insightsUnavailable,
      apiKey,
      MODEL_PRO,
    );
    if (persistAborted) return;

    report = {
      ...report,
      insights: sanitizeGeminiAudit(insights) as Record<string, unknown>,
    };
    markSectionDone("insights");
    report = {
      ...report,
      scanStatus: "complete",
      pendingSections: [],
      durationMs: Date.now() - started,
    };
    pendingSections = [];
    await persistReport({ scanStatus: "complete" });
  };

  // Run Gemini in the background so refresh / navigation / closing the tab
  // does not cancel the scan. Detail page polls DB for section updates.
  const background = runAudits().catch(async (err) => {
    const message = err instanceof Error ? err.message : "scan_failed";
    console.error(`[scan] background run failed: ${message}`);
    if (persistAborted) return;
    report = { ...report, scanStatus: "error", pendingSections: [] };
    pendingSections = [];
    try {
      await persistReport({ scanStatus: "error" });
    } catch {
      /* ignore */
    }
  });

  const edgeRuntime = (globalThis as { EdgeRuntime?: { waitUntil?: (p: Promise<unknown>) => void } })
    .EdgeRuntime;
  if (typeof edgeRuntime?.waitUntil === "function") {
    edgeRuntime.waitUntil(background);
  } else {
    // Local / older runtimes: still kick off without blocking the response.
    void background;
  }

  // Respond as soon as the stub exists. AI sections keep writing in background.
  return jsonResponse({
    type: "started",
    scanId: historyId,
    report,
  });
});
