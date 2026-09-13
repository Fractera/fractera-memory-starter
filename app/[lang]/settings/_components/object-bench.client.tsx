"use client";

import { useCallback, useEffect, useState } from "react";
import type { MemoryUi } from "../_i18n/memory.i18n";

// ЭКРАНЫ ОБЪЕКТНОГО ХРАНИЛИЩА: ЗАГРУЗКА И ПОИСК (192-3).
//
// 🔒 ФОРМА СОСЕДА-ВЕКТОРА, А НЕ СВОЯ КОНСТРУКЦИЯ: два экрана в одном файле, те
// же отказы поимённо, та же строка «ничего ближе порога» с ближайшим числом.
// Отличие одно и содержательное: здесь кладут ФАЙЛ, а находят ПРЕДМЕТ целиком,
// и найденное можно открыть.
//
// 🛑 ОПИСАНИЕ ОБЯЗАТЕЛЬНО ДЛЯ ДВОИЧНОГО ФАЙЛА И ГОВОРИТ ПОЧЕМУ: внутрь картинки и
// PDF никто не смотрит, и слова загрузившего — единственное, по чему их найдут.

type Card = { about: string; id: string; mime: string; name: string; size: number; text: boolean };
type Hit = Card & { far: boolean; score: number };
type Answer = {
  askMs: number;
  found: boolean;
  lost: number;
  near: Hit[];
  nearest: { id: string; name: string; score: number } | null;
  threshold: number;
};
type Opened = { card: Card; shown: number; text: string | null; total: number };

const fill = (s: string, v: Record<string, string | number>) =>
  Object.entries(v).reduce((acc, [k, val]) => acc.replaceAll(`{${k}}`, String(val)), s);

const TEXT_EXT = /\.(csv|html?|json|markdown|md|tsv|txt|xml|ya?ml)$/i;

export function ObjectUpload({ words }: { words: MemoryUi["objectBench"] }) {
  const [file, setFile] = useState<File | null>(null);
  const [about, setAbout] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [state, setState] = useState<{ configured: boolean; objects: Card[] } | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/fractera/object-test", { cache: "no-store" });
      if (r.ok) setState((await r.json()) as { configured: boolean; objects: Card[] });
    } catch {
      // Склад недостижим — строка ниже скажет это словами.
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const needsAbout = file !== null && !TEXT_EXT.test(file.name);

  async function send() {
    if (!file) return;
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const form = new FormData();
      form.append("file", file, file.name);
      form.append("about", about);
      const r = await fetch("/api/fractera/object-test", { body: form, method: "POST" });
      const j = (await r.json()) as {
        cardChars?: number;
        error?: string;
        ms?: number;
        object?: Card;
        ok?: boolean;
      };
      if (!r.ok || !j.ok || !j.object) {
        const known = words.errors as Record<string, string>;
        setError(known[String(j.error)] ?? known.refused);
        return;
      }
      setDone(
        fill(words.stored, { card: j.cardChars ?? 0, ms: j.ms ?? 0, name: j.object.name, size: j.object.size }),
      );
      setFile(null);
      setAbout("");
      void load();
    } catch {
      setError(words.errors.offline);
    } finally {
      setBusy(false);
    }
  }

  async function forget() {
    setBusy(true);
    try {
      const r = await fetch("/api/fractera/object-test", { method: "DELETE" });
      const j = (await r.json()) as { removed?: number };
      setDone(fill(words.forgot, { n: j.removed ?? 0 }));
      void load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {state && !state.configured && (
        <p className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-[length:var(--fs-small)]">
          {words.notConfigured}
        </p>
      )}

      <div className="space-y-2">
        <label className="block font-medium text-[length:var(--fs-small)]" htmlFor="obj-file">
          {words.fileLabel}
        </label>
        <input
          className="block w-full text-[length:var(--fs-small)]"
          id="obj-file"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          type="file"
        />
      </div>

      <div className="space-y-2">
        <label className="block font-medium text-[length:var(--fs-small)]" htmlFor="obj-about">
          {words.aboutLabel}
        </label>
        <textarea
          className="h-24 w-full rounded-md border border-border bg-background px-3 py-2 text-[length:var(--fs-body)]"
          id="obj-about"
          onChange={(e) => setAbout(e.target.value)}
          placeholder={words.aboutPlaceholder}
          value={about}
        />
        <p className="text-[length:var(--fs-small)] text-muted-foreground">{words.aboutHint}</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          className="rounded-md bg-primary px-4 py-2 font-medium text-[length:var(--fs-body)] text-primary-foreground disabled:opacity-50"
          disabled={busy || !file || (needsAbout && !about.trim())}
          onClick={() => void send()}
          type="button"
        >
          {busy ? words.busy : words.button}
        </button>
        <button
          className="ml-auto rounded-md border border-border px-4 py-2 text-[length:var(--fs-small)] text-muted-foreground disabled:opacity-50"
          disabled={busy}
          onClick={() => void forget()}
          type="button"
        >
          {words.forget}
        </button>
      </div>

      {error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-[length:var(--fs-small)]">
          {error}
        </p>
      )}
      {done && (
        <p className="rounded-md border border-border bg-muted/40 p-4 text-[length:var(--fs-body)]">{done}</p>
      )}

      <p className="text-[length:var(--fs-small)] text-muted-foreground">{words.costNote}</p>

      {state && (
        <div className="space-y-2">
          <p className="text-[length:var(--fs-small)] text-muted-foreground">
            {state.objects.length ? fill(words.inStore, { n: state.objects.length }) : words.empty}
          </p>
          <ul className="space-y-1">
            {state.objects.map((o) => (
              <li className="font-mono text-[length:var(--fs-small)] text-muted-foreground" key={o.id}>
                {o.name} · {o.size} · {o.id}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function ObjectSearch({ words }: { words: MemoryUi["objectBench"] }) {
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [opened, setOpened] = useState<Opened | null>(null);

  const known = words.errors as Record<string, string>;

  async function run() {
    setBusy(true);
    setError(null);
    setAnswer(null);
    setOpened(null);
    try {
      const r = await fetch("/api/fractera/object-search", {
        body: JSON.stringify({ question }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const j = (await r.json()) as Answer & { error?: string; ok?: boolean };
      if (!r.ok || !j.ok) {
        setError(known[String(j.error)] ?? known.refused);
        return;
      }
      setAnswer(j);
    } catch {
      setError(words.errors.offline);
    } finally {
      setBusy(false);
    }
  }

  async function openObject(id: string) {
    setError(null);
    try {
      const r = await fetch("/api/fractera/object-open", {
        body: JSON.stringify({ id }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const j = (await r.json()) as Opened & { error?: string; ok?: boolean };
      if (!r.ok || !j.ok) {
        setError(known[String(j.error)] ?? known.refused);
        return;
      }
      setOpened(j);
    } catch {
      setError(words.errors.offline);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label className="block font-medium text-[length:var(--fs-small)]" htmlFor="obj-question">
          {words.askLabel}
        </label>
        <textarea
          className="h-24 w-full rounded-md border border-border bg-background px-3 py-2 text-[length:var(--fs-body)]"
          id="obj-question"
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={words.askPlaceholder}
          value={question}
        />
      </div>

      <button
        className="rounded-md bg-primary px-4 py-2 font-medium text-[length:var(--fs-body)] text-primary-foreground disabled:opacity-50"
        disabled={busy || !question.trim()}
        onClick={() => void run()}
        type="button"
      >
        {busy ? words.asking : words.ask}
      </button>

      {error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-[length:var(--fs-small)]">
          {error}
        </p>
      )}

      {answer && (
        <div className="space-y-3">
          <p className="font-medium text-[length:var(--fs-body)]">{fill(words.timing, { ms: answer.askMs })}</p>
          {answer.lost > 0 && (
            <p className="text-[length:var(--fs-small)] text-muted-foreground">{fill(words.lost, { n: answer.lost })}</p>
          )}
          {answer.found ? (
            <>
              <p className="text-[length:var(--fs-small)]">
                {fill(words.hits, { n: answer.near.length, threshold: answer.threshold })}
              </p>
              <ul className="space-y-2">
                {answer.near.map((h) => (
                  <li className="space-y-1 rounded-md border border-border p-3" key={h.id}>
                    <p className="font-mono text-[length:var(--fs-small)] text-muted-foreground">
                      {h.score.toFixed(3)} · {h.mime || "—"} · {h.size} · {h.id}
                    </p>
                    <p className="font-medium text-[length:var(--fs-body)]">{h.name}</p>
                    {h.about && <p className="text-[length:var(--fs-small)]">{h.about}</p>}
                    <button
                      className="rounded-md border border-border px-3 py-1 text-[length:var(--fs-small)]"
                      onClick={() => void openObject(h.id)}
                      type="button"
                    >
                      {words.open}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            // 🔒 «НИЧЕГО ПОДХОДЯЩЕГО» — ОТВЕТ, И ОН НАЗЫВАЕТ, НАСКОЛЬКО ДАЛЕКО БЫЛО
            // БЛИЖАЙШЕЕ: «склад пуст» и «есть, но не то» чинятся по-разному.
            <div className="space-y-2">
              <p className="text-[length:var(--fs-body)]">{fill(words.nothing, { threshold: answer.threshold })}</p>
              {answer.nearest && (
                <p className="rounded-md border border-border border-dashed p-3 text-[length:var(--fs-small)] text-muted-foreground">
                  {fill(words.nearestWas, { score: answer.nearest.score.toFixed(3) })} {answer.nearest.name}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {opened && (
        <div className="space-y-2 rounded-md border border-border p-4">
          <div className="flex items-center gap-3">
            <p className="font-medium text-[length:var(--fs-body)]">{opened.card.name}</p>
            <button
              className="ml-auto rounded-md border border-border px-3 py-1 text-[length:var(--fs-small)]"
              onClick={() => setOpened(null)}
              type="button"
            >
              {words.close}
            </button>
          </div>
          {opened.text === null ? (
            <p className="text-[length:var(--fs-small)] text-muted-foreground">{words.binary}</p>
          ) : (
            <>
              {/* 🔒 ПРЕДЕЛ НАЗЫВАЕТСЯ ЧИСЛОМ: молча обрезанный документ читается как целый. */}
              <p className="text-[length:var(--fs-small)] text-muted-foreground">
                {fill(words.shown, { shown: opened.shown, total: opened.total })}
              </p>
              <pre className="max-h-96 overflow-auto whitespace-pre-wrap font-mono text-[length:var(--fs-small)]">
                {opened.text}
              </pre>
            </>
          )}
        </div>
      )}
    </div>
  );
}
