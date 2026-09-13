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

/** Что модель сказала о файле, кроме двух полей, которые правит человек (194-3). */
type Described = {
  anchors: string[];
  described_by: string;
  kind: string;
  language: string;
  ms: number;
  tags: string[];
  title: string;
};

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

  // 194-3: ОПИСАНИЕ МОДЕЛЬЮ ДО СОХРАНЕНИЯ. Саммари живёт в прежнем `about` — оно и есть карточка
  // поиска; полное описание — отдельное поле. Оба правятся человеком до «Сохранить объект».
  const [full, setFull] = useState("");
  const [described, setDescribed] = useState<Described | null>(null);
  const [describing, setDescribing] = useState(false);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!describing) return;
    setSeconds(0);
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [describing]);

  const needsAbout = file !== null && !TEXT_EXT.test(file.name);

  /** Выбран новый файл — прежнее описание к нему не относится. */
  function choose(next: File | null) {
    setFile(next);
    setDescribed(null);
    setFull("");
    setAbout("");
    setError(null);
    setDone(null);
  }

  async function describeFile() {
    if (!file) return;
    setDescribing(true);
    setError(null);
    setDone(null);
    try {
      const form = new FormData();
      form.append("file", file, file.name);
      const r = await fetch("/api/fractera/object-test/describe", { body: form, method: "POST" });
      const j = (await r.json()) as Partial<Described> & { error?: string; full?: string; ok?: boolean; summary?: string };
      if (!r.ok || !j.ok || typeof j.full !== "string" || typeof j.summary !== "string") {
        setError(words.describeErrors[String(j.error)] ?? words.describeErrors.failed);
        return;
      }
      setFull(j.full);
      setAbout(j.summary);
      setDescribed({
        anchors: j.anchors ?? [],
        described_by: j.described_by ?? "",
        kind: j.kind ?? "",
        language: j.language ?? "und",
        ms: j.ms ?? 0,
        tags: j.tags ?? [],
        title: j.title ?? "",
      });
    } catch {
      setError(words.describeErrors.failed);
    } finally {
      setDescribing(false);
    }
  }

  async function send() {
    if (!file) return;
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const form = new FormData();
      form.append("file", file, file.name);
      form.append("about", about);
      // 🔒 ВСЁ, ЧТО СКАЗАЛА МОДЕЛЬ, ЕДЕТ ВМЕСТЕ С ФАЙЛОМ — дверь сохранения принимает это в 194-4.
      form.append("full", full);
      if (described) {
        form.append("title", described.title);
        form.append("tags", JSON.stringify(described.tags));
        form.append("anchors", JSON.stringify(described.anchors));
        form.append("described_by", described.described_by);
        form.append("describe_ms", String(described.ms));
        form.append("language", described.language);
      }
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
      setFull("");
      setDescribed(null);
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
        <p className="block font-medium text-[length:var(--fs-small)]">{words.fileLabel}</p>
        {/* 🔒 СИСТЕМНОЕ ПОЛЕ ФАЙЛА СКРЫТО, НО ЖИВО: владелец полчаса не видел в нём кнопки.
            Кнопкой служит подпись с тем же размером шрифта, что у «Сохранить объект»;
            фокус с клавиатуры остаётся на поле и подсвечивает подпись через peer. */}
        <input
          className="peer sr-only"
          id="obj-file"
          onChange={(e) => choose(e.target.files?.[0] ?? null)}
          onClick={(e) => {
            e.currentTarget.value = "";
          }}
          type="file"
        />
        {/* 🔒 «ПОЛУЧИТЬ ОПИСАНИЕ» СТОИТ СПРАВА ОТ «ВЫБРАТЬ ФАЙЛ» И ПОЯВЛЯЕТСЯ ТОЛЬКО С ФАЙЛОМ (слово
            владельца 2026-09-13). Без файла описывать нечего, и кнопка, которая ничего не делает, врёт. */}
        <div className="flex flex-wrap items-center gap-3">
          <label
            className="inline-flex cursor-pointer items-center rounded-md border border-primary px-4 py-2 font-medium text-[length:var(--fs-body)] text-primary hover:bg-primary/10 peer-focus-visible:ring-2 peer-focus-visible:ring-primary"
            htmlFor="obj-file"
          >
            {words.chooseFile}
          </label>
          {file && (
            <button
              className="inline-flex items-center rounded-md border border-primary bg-primary/10 px-4 py-2 font-medium text-[length:var(--fs-body)] text-primary hover:bg-primary/20 disabled:opacity-50"
              disabled={describing || busy}
              onClick={() => void describeFile()}
              type="button"
            >
              {describing ? fill(words.describing, { s: seconds }) : words.describe}
            </button>
          )}
        </div>
        <p className="text-[length:var(--fs-small)] text-muted-foreground">
          {file ? file.name : words.noFile}
        </p>
        {described && (
          <p className="text-[length:var(--fs-small)] text-muted-foreground">
            {fill(words.describedBy, {
              by: described.described_by,
              lang: described.language,
              s: Math.round(described.ms / 1000),
            })}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label className="block font-medium text-[length:var(--fs-small)]" htmlFor="obj-full">
          {words.fullLabel}
        </label>
        <textarea
          className="h-64 w-full rounded-md border border-border bg-background px-3 py-2 text-[length:var(--fs-body)]"
          id="obj-full"
          onChange={(e) => setFull(e.target.value)}
          placeholder={words.fullPlaceholder}
          value={full}
        />
        <p className="text-[length:var(--fs-small)] text-muted-foreground">{words.fullHint}</p>
      </div>

      <div className="space-y-2">
        <label className="block font-medium text-[length:var(--fs-small)]" htmlFor="obj-about">
          {words.aboutLabel}
        </label>
        <textarea
          className="h-28 w-full rounded-md border border-border bg-background px-3 py-2 text-[length:var(--fs-body)]"
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
          disabled={busy || describing || !file || (needsAbout && !about.trim())}
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
