import { ingest } from "./objects";
import { fetchUrl } from "./fetch-url";

// LAYING A THING INTO MEMORY — BY ITS BYTES OR BY ITS ADDRESS (node step 596-5).
//
// On the former server this was the stand's internal door `POST /api/fractera/object-ingest`: the plain node server could not import
// the TypeScript of the object pipeline, so phrases with attachments went to it over the loopback. On a node everything runs inside
// one Next server, so `media-ingest.mjs` and the contract's door call these two functions directly — the same checks, the same
// answers, and no inner door left open to anyone.
// 🔒 A refusal names whose fault it is, exactly as the door did: what the caller sent (400) or the state of a store, the model or a
// foreign server (502).

/** Refusals caused by what was sent (400); the rest — the state of stores, the model or a foreign server (502). */
export const SENDERS_FAULT = new Set([
  "bad-form",
  "bad-json",
  "bad-url",
  "describe-empty-file",
  "describe-kind-unsupported",
  "empty-file",
  "is-a-page",
  "no-about",
  "no-name",
  "no-url",
  "url-forbidden",
  "url-too-large",
]);

export type Fields = {
  anchors?: string[];
  author?: string;
  full?: string;
  name?: string;
  source?: string;
  summary?: string;
  tags?: string[];
  title?: string;
  who?: string;
};

export type IngestAnswer = { status: number; json: Record<string, unknown> };

const deny = (error: string, why?: string): IngestAnswer => ({
  json: { error, ok: false, ...(why ? { why } : {}) },
  status: SENDERS_FAULT.has(error) ? 400 : 502,
});

/** A thing by its bytes. */
export async function ingestBytes(bytes: Uint8Array, mime: string, fallbackName: string, f: Fields, url?: string): Promise<IngestAnswer> {
  if (!bytes || bytes.length === 0) return deny("empty-file");
  const r = await ingest({
    anchors: f.anchors,
    author: f.author ?? f.who,
    bytes,
    full: f.full,
    mime,
    name: f.name ?? fallbackName,
    source: f.source ?? "api",
    summary: f.summary,
    tags: f.tags,
    title: f.title,
    who: f.who,
  });
  if (!r.ok) {
    const ours = SENDERS_FAULT.has(r.error) || r.error.includes("no-anchor");
    return {
      json: { error: r.error, messageId: r.messageId ?? null, ok: false, ...(r.why ? { why: r.why } : {}) },
      status: ours ? 400 : 502,
    };
  }
  return {
    json: {
      described: r.described,
      kind: r.kind,
      messageId: r.messageId,
      ms: r.ms,
      object: r.card,
      ok: true,
      summary: r.summary,
      title: r.title,
      ...(url ? { url } : {}),
    },
    status: 200,
  };
}

/** A thing by its address: memory downloads it itself; a loopback or private address and a web page are refused. */
export async function ingestUrl(url: string, f: Fields): Promise<IngestAnswer> {
  const u = String(url ?? "").trim();
  if (!u) return deny("no-url");
  const got = await fetchUrl(u);
  if (!got.ok) return deny(got.error, got.why);
  return ingestBytes(got.bytes, got.mime, got.name, f, got.finalUrl);
}
