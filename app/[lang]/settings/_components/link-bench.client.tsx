"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { SavedView, type Saved, type SavedViewWords } from "./object-bench.client";

// СТЕНД ССЫЛОК ПАМЯТИ — ВКЛАДКА «ЗАГРУЗКА» (195-1, сохранение — 195-2).
//
// 🪦 ПЕРЕНЕСЁН С `read-test.client.tsx` СЛУЖБЫ ИИ-БРАУЗЕРА (196-3) — закон владельца «скопировать, перенести и адаптировать».
// Адаптаций три: дверь `/api/fractera/link-test` памяти · слова из словаря памяти · строка «страница дождалась load».
// 🔒 ЧЕЛОВЕК ВИДИТ ТО ЖЕ, ЧТО ПОЛУЧАЕТ ПАМЯТЬ: ответ договора `/v1/read`, а не пересказ.
// 🔒 ОТКАЗ НАЗЫВАЕТСЯ ПОИМЁННО И С ПРИЧИНОЙ: `url-forbidden` рядом с «127.0.0.1:3300» — это работа защиты, а не поломка;
// `browser-unreachable` — не ответил сам браузер, а не страница.
// 🔒 «ОТВЕРГНУТО» ПОКАЗЫВАЕТСЯ ВСЕГДА, ДАЖЕ НУЛЁМ.
// 🔒 СОХРАНЕНИЕ — ТОТ ЖЕ ПУТЬ, ЧТО У ОБЪЕКТА (195-2). Слово владельца: «абсолютно одинаковое решение что для объекта что для
// ссылки». «Получить описание» → поля «Полное описание» и «Саммари» правит человек → «Сохранить в память» → общий блок «что
// легло в память» стенда объектов, а не своя вёрстка.
// 🔒 ОКНА СОДЕРЖИМОГО — ДО 1000 PX С ВЕРТИКАЛЬНОЙ ПРОКРУТКОЙ (слово владельца 2026-09-14: «так как контента много показывай
// максимум 1000 пикселей высоту окно с вертикальной прокруткой»).

export type LinkBenchWords = {
  lead: string;
  placeholder: string;
  run: string;
  running: string;
  limitNote: string;
  failed: string;
  error: string;
  status: string;
  finalUrl: string;
  ms: string;
  loadReached: { yes: string; no: string };
  counts: Record<
    "headings" | "links" | "buttons" | "forms" | "fields" | "images" | "videos" | "audios" | "iframes" | "blocked",
    string
  >;
  text: string;
  html: string;
  meta: string;
  truncatedNote: string;
  total: string;
  /** 195-2: описание и сохранение ссылки. */
  save: {
    aboutHint: string;
    aboutLabel: string;
    busy: string;
    button: string;
    describe: string;
    describedBy: string;
    describing: string;
    existing: string;
    fullHint: string;
    fullLabel: string;
    htmlWhole: string;
    stored: string;
    viewFailed: string;
    /** 195-9: сайт не отдал страницу — код 400 и выше. */
    pageRefused: string;
  };
  /** 195-8: подписи вкладки «Поиск» — поверх слов поиска объектов, вёрстка у них одна (`ObjectSearch`). */
  search: {
    askLabel: string;
    askPlaceholder: string;
    hits: string;
    nearestWas: string;
    nothing: string;
  };
};

type Listed = { items: unknown[]; total: number };
type Result = {
  url: string;
  error?: string;
  why?: string;
  status?: number | null;
  final_url?: string;
  title?: string;
  ms?: number;
  load_reached?: boolean;
  html?: string;
  html_length?: number;
  text?: string;
  text_length?: number;
  meta?: Record<string, string | null>;
  blocked?: Listed;
} & Partial<Record<"headings" | "links" | "buttons" | "forms" | "fields" | "images" | "videos" | "audios" | "iframes", Listed>>;
type Answer = { ok?: boolean; error?: string; why?: string; limit?: number; failed?: number; results?: Result[] };

/** Что модель сказала о снимке, кроме двух полей, которые правит человек. */
type Draft = {
  anchors: string[];
  chars: number;
  described_by: string;
  language: string;
  ms: number;
  name: string;
  snapshot: string;
  tags: string[];
  title: string;
};

const LISTS = ["headings", "links", "buttons", "forms", "fields", "images", "videos", "audios", "iframes", "blocked"] as const;

/** Окно содержимого: до 1000 px, дальше вертикальная прокрутка. */
const WINDOW = "max-h-[1000px] overflow-y-auto";

const fill = (s: string, v: Record<string, string | number>) =>
  Object.entries(v).reduce((acc, [k, val]) => acc.replaceAll(`{${k}}`, String(val)), s);

function Fold({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="rounded-md border border-border">
      <summary className="cursor-pointer px-3 py-2 text-[length:var(--fs-small)] font-medium">{title}</summary>
      <div className="border-border border-t p-3">{children}</div>
    </details>
  );
}

function Pre({ value }: { value: string }) {
  return (
    <pre
      className={`${WINDOW} whitespace-pre-wrap break-words rounded-md bg-muted/40 p-3 font-mono text-[length:var(--fs-small)]`}
    >
      {value}
    </pre>
  );
}

/**
 * Описать и сохранить одну ссылку (195-2).
 *
 * 🔒 ПОКАЗЫВАЕТСЯ ПРОЧИТАННОЕ ИЗ ХРАНИЛИЩ, А НЕ ТО, ЧТО БЫЛО В ФОРМЕ: после сохранения экран читает строку дверью стенда
 * объектов `object-test?message=` — тот же приём, что у объекта.
 * 🔒 УЖЕ СОХРАНЁННАЯ ССЫЛКА — ТОТ ЖЕ БЛОК И СТРОКА СЛОВАМИ, А НЕ ТИХИЙ УСПЕХ: «ничего не сделано» должно быть видно.
 */
function LinkSave({ savedWords, url, words }: { savedWords: SavedViewWords; url: string; words: LinkBenchWords }) {
  const [html, setHtml] = useState(false);
  const [describing, setDescribing] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [full, setFull] = useState("");
  const [about, setAbout] = useState("");
  const [saved, setSaved] = useState<Saved | null>(null);
  const [existing, setExisting] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    if (!describing) return;
    setSeconds(0);
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [describing]);

  const refusal = (j: { error?: string; why?: string }) =>
    `${words.error}: ${j.error ?? "request-failed"}${j.why ? ` — ${j.why}` : ""}`;

  async function show(messageId: number) {
    try {
      const v = await fetch(`/api/fractera/object-test?message=${messageId}`, { cache: "no-store" });
      const s = (await v.json()) as Saved & { ok?: boolean };
      if (v.ok && s.ok && s.row) setSaved({ media: s.media ?? null, object: s.object ?? null, row: s.row });
      else setError(words.save.viewFailed);
    } catch {
      setError(words.save.viewFailed);
    }
  }

  async function describeLink() {
    setDescribing(true);
    setError(null);
    setDone(null);
    setSaved(null);
    setExisting(false);
    try {
      const r = await fetch("/api/fractera/link-test/describe", {
        body: JSON.stringify({ html, url }),
        cache: "no-store",
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const j = (await r.json()) as Partial<Draft> & {
        error?: string;
        existing?: number;
        full?: string;
        ok?: boolean;
        snapshotChars?: number;
        summary?: string;
        why?: string;
      };
      if (j.ok && j.existing) {
        setExisting(true);
        await show(j.existing);
        return;
      }
      if (!r.ok || !j.ok || typeof j.full !== "string" || typeof j.summary !== "string" || typeof j.snapshot !== "string") {
        setError(refusal(j));
        return;
      }
      setDraft({
        anchors: j.anchors ?? [],
        chars: j.snapshotChars ?? j.snapshot.length,
        described_by: j.described_by ?? "",
        language: j.language ?? "und",
        ms: j.ms ?? 0,
        name: j.name ?? "web-page.md",
        snapshot: j.snapshot,
        tags: j.tags ?? [],
        title: j.title ?? "",
      });
      setFull(j.full);
      setAbout(j.summary);
    } catch (e) {
      setError(refusal({ error: "request-failed", why: String((e as Error).message) }));
    } finally {
      setDescribing(false);
    }
  }

  async function save() {
    if (!draft) return;
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", new Blob([draft.snapshot], { type: "text/markdown" }), draft.name);
      form.append("url", url);
      form.append("about", about);
      form.append("full", full);
      form.append("title", draft.title);
      form.append("tags", JSON.stringify(draft.tags));
      form.append("anchors", JSON.stringify(draft.anchors));
      form.append("described_by", draft.described_by);
      form.append("describe_ms", String(draft.ms));
      form.append("language", draft.language);
      const r = await fetch("/api/fractera/link-ingest", { body: form, method: "POST" });
      const j = (await r.json()) as { error?: string; existing?: number; messageId?: number; ms?: number; ok?: boolean; why?: string };
      if (j.ok && j.existing) {
        setExisting(true);
        setDraft(null);
        await show(j.existing);
        return;
      }
      if (!r.ok || !j.ok || !j.messageId) {
        setError(refusal(j));
        return;
      }
      setDone(fill(words.save.stored, { ms: j.ms ?? 0 }));
      setDraft(null);
      setFull("");
      setAbout("");
      await show(j.messageId);
    } catch (e) {
      setError(refusal({ error: "request-failed", why: String((e as Error).message) }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 border-border border-t pt-4" data-link-save="">
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-[length:var(--fs-small)]">
          <input checked={html} disabled={describing || busy} onChange={(e) => setHtml(e.target.checked)} type="checkbox" />
          {words.save.htmlWhole}
        </label>
        <Button disabled={describing || busy} onClick={() => void describeLink()} size="sm" type="button" variant="outline">
          {describing ? fill(words.save.describing, { s: seconds }) : words.save.describe}
        </Button>
      </div>

      {draft && (
        <>
          <p className="text-[length:var(--fs-small)] text-muted-foreground">
            {fill(words.save.describedBy, {
              by: draft.described_by,
              chars: draft.chars,
              lang: draft.language,
              s: Math.round(draft.ms / 1000),
            })}
          </p>
          <div className="space-y-2">
            <p className="font-medium text-[length:var(--fs-small)]">{words.save.fullLabel}</p>
            <textarea
              className={`${WINDOW} h-96 w-full rounded-md border border-border bg-background px-3 py-2 text-[length:var(--fs-body)]`}
              onChange={(e) => setFull(e.target.value)}
              value={full}
            />
            <p className="text-[length:var(--fs-small)] text-muted-foreground">{words.save.fullHint}</p>
          </div>
          <div className="space-y-2">
            <p className="font-medium text-[length:var(--fs-small)]">{words.save.aboutLabel}</p>
            <textarea
              className="h-28 w-full rounded-md border border-border bg-background px-3 py-2 text-[length:var(--fs-body)]"
              onChange={(e) => setAbout(e.target.value)}
              value={about}
            />
            <p className="text-[length:var(--fs-small)] text-muted-foreground">{words.save.aboutHint}</p>
          </div>
          <Button disabled={busy || !full.trim() || !about.trim()} onClick={() => void save()} size="sm" type="button">
            {busy ? words.save.busy : words.save.button}
          </Button>
        </>
      )}

      {error && (
        <p className="rounded-md border border-destructive/40 px-2 py-1 text-[length:var(--fs-small)] text-destructive">{error}</p>
      )}
      {done && <p className="rounded-md border border-border bg-muted/40 p-3 text-[length:var(--fs-small)]">{done}</p>}
      {existing && (
        <p className="rounded-md border border-border border-dashed p-3 text-[length:var(--fs-small)]">{words.save.existing}</p>
      )}
      {saved?.row && <SavedView fullClassName={WINDOW} saved={saved} words={savedWords} />}
    </div>
  );
}

function ResultCard({ r, savedWords, words }: { r: Result; savedWords: SavedViewWords; words: LinkBenchWords }) {
  return (
    <section className="space-y-3 rounded-md border border-border p-4" data-link-result={r.error ? "error" : "ok"}>
      <p className="break-all font-mono text-[length:var(--fs-small)] text-muted-foreground">{r.url}</p>
      {r.error ? (
        <p className="rounded-md border border-destructive/40 px-2 py-1 text-[length:var(--fs-small)] text-destructive">
          {words.error}: {r.error}
          {r.why ? ` — ${r.why}` : ""}
        </p>
      ) : (
        <>
          <h3 className="font-medium text-[length:var(--fs-body)]">{r.title || "—"}</h3>
          <p className="text-[length:var(--fs-small)] text-muted-foreground">
            {words.status} {r.status ?? "—"} · {words.ms} {r.ms} ·{" "}
            {r.load_reached === false ? words.loadReached.no : words.loadReached.yes} · {words.finalUrl}{" "}
            <span className="break-all font-mono">{r.final_url}</span>
          </p>
        </>
      )}

      <div className="flex flex-wrap gap-2">
        {LISTS.map((k) =>
          r[k] ? (
            <span className="rounded-md bg-muted/40 px-2 py-1 text-[length:var(--fs-small)]" key={k}>
              {words.counts[k]}: <b>{r[k]?.total ?? 0}</b>
            </span>
          ) : null,
        )}
      </div>

      {typeof r.text === "string" && (
        <Fold title={`${words.text} · ${r.text_length ?? r.text.length}`}>
          <Pre value={r.text} />
          {(r.text_length ?? 0) > r.text.length && (
            <p className="mt-2 text-[length:var(--fs-small)] text-muted-foreground">{words.truncatedNote}</p>
          )}
        </Fold>
      )}
      {typeof r.html === "string" && (
        <Fold title={`${words.html} · ${r.html_length ?? r.html.length}`}>
          <Pre value={r.html} />
          {(r.html_length ?? 0) > r.html.length && (
            <p className="mt-2 text-[length:var(--fs-small)] text-muted-foreground">{words.truncatedNote}</p>
          )}
        </Fold>
      )}
      {r.meta && Object.keys(r.meta).length > 0 && (
        <Fold title={`${words.meta} · ${Object.keys(r.meta).length}`}>
          <Pre value={JSON.stringify(r.meta, null, 2)} />
        </Fold>
      )}
      {LISTS.map((k) =>
        r[k] && (r[k]?.total ?? 0) > 0 ? (
          <Fold key={k} title={`${words.counts[k]} · ${r[k]?.total}`}>
            <Pre value={JSON.stringify(r[k]?.items, null, 2)} />
            {(r[k]?.total ?? 0) > (r[k]?.items.length ?? 0) && (
              <p className="mt-2 text-[length:var(--fs-small)] text-muted-foreground">
                {words.total}: {r[k]?.total}
              </p>
            )}
          </Fold>
        ) : null,
      )}

      {/* 🔒 СТРАНИЦА, КОТОРУЮ САЙТ НЕ ОТДАЛ (код ≥ 400), НЕ ПРЕДЛАГАЕТСЯ К ОПИСАНИЮ (195-9): вместо кнопок — причина словами. Двери
          отказывают и сами; здесь — чтобы человек не тратил ход модели на заглушку и видел, почему сохранить нечего. */}
      {!r.error && (r.status ?? 0) >= 400 ? (
        <p
          className="rounded-md border border-border border-dashed p-3 text-[length:var(--fs-small)]"
          data-link-refused={r.status ?? ""}
        >
          {fill(words.save.pageRefused, { status: r.status ?? "—" })}
        </p>
      ) : !r.error ? (
        <LinkSave savedWords={savedWords} url={r.url} words={words} />
      ) : null}
    </section>
  );
}

export function LinkBench({ savedWords, words }: { savedWords: SavedViewWords; words: LinkBenchWords }) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState<Answer | null>(null);

  const run = useCallback(async () => {
    const urls = value
      .split(/\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!urls.length || busy) return;
    setBusy(true);
    setAnswer(null);
    try {
      const r = await fetch("/api/fractera/link-test", {
        body: JSON.stringify({ urls }),
        cache: "no-store",
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      setAnswer((await r.json()) as Answer);
    } catch (e) {
      setAnswer({ error: "request-failed", ok: false, why: String((e as Error).message) });
    } finally {
      setBusy(false);
    }
  }, [busy, value]);

  return (
    <div className="space-y-4" data-link-bench="">
      <p className="max-w-3xl text-[length:var(--fs-small)] leading-relaxed">{words.lead}</p>
      <textarea
        className="min-h-32 w-full rounded-md border border-border bg-background p-3 font-mono text-[length:var(--fs-small)]"
        onChange={(e) => setValue(e.target.value)}
        placeholder={words.placeholder}
        value={value}
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={busy || !value.trim()} onClick={() => void run()} size="sm" type="button">
          {busy ? words.running : words.run}
        </Button>
        <span className="text-[length:var(--fs-small)] text-muted-foreground">{words.limitNote}</span>
      </div>

      {answer?.error && (
        <p className="rounded-md border border-destructive/40 px-2 py-1 text-[length:var(--fs-small)] text-destructive">
          {words.error}: {answer.error}
          {answer.limit ? ` (${answer.limit})` : ""}
          {answer.why ? ` — ${answer.why}` : ""}
        </p>
      )}
      {answer?.results && (
        <>
          <p className="text-[length:var(--fs-small)] text-muted-foreground">
            {words.failed}: {answer.failed ?? 0} / {answer.results.length}
          </p>
          {answer.results.map((r, i) => (
            <ResultCard key={`${i}-${r.url}`} r={r} savedWords={savedWords} words={words} />
          ))}
        </>
      )}
    </div>
  );
}
