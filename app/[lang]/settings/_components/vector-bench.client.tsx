"use client";

import { useCallback, useEffect, useState } from "react";
import type { MemoryUi } from "../_i18n/memory.i18n";

// ЭКРАНЫ ВЕКТОРНОГО ХРАНИЛИЩА: ЗАГРУЗКА И ПОИСК (189-6).
//
// 🔒 ДВА ЭКРАНА В ОДНОМ ФАЙЛЕ, И ЭТО НЕ ЭКОНОМИЯ ФАЙЛОВ. Они делят одно
// состояние склада — сколько кусков лежит — и один смысл: «положил» и «нашёл»
// здесь две половины одного действия. У графа они разведены потому, что там
// между ними стоит фоновое построение связей; здесь его нет.
//
// 🔒 ГЛАВНОЕ, ЧТО ПОКАЗЫВАЕТ ЭТОТ СТЕНД И НЕ ПОКАЗЫВАЕТ СОСЕДНИЙ: ЧИСЛО
// БЛИЗОСТИ. У графа ответ либо есть, либо «нет связей»; здесь у каждой находки
// своя цифра, и по ней видно, нашлось нужное или вернулось ближайшее.

type Piece = { far: boolean; id: string; score: number; text: string };

type Answer = {
  askMs: number;
  found: boolean;
  near: Piece[];
  nearest: { score: number; text: string } | null;
  threshold: number;
  total: number;
};

type State = { configured: boolean; count: number; dims: number; model: string };

const fill = (s: string, v: Record<string, string | number>) =>
  Object.entries(v).reduce((acc, [k, val]) => acc.replaceAll(`{${k}}`, String(val)), s);

export function VectorUpload({ words }: { words: MemoryUi["vectorBench"] }) {
  const [text, setText] = useState("");
  const [source, setSource] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ dims: number; ms: number; stored: number } | null>(null);
  const [state, setState] = useState<State | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/fractera/vector-test", { cache: "no-store" });
      if (r.ok) setState((await r.json()) as State);
    } catch {
      // Склад недостижим — строка ниже скажет это словами.
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function send() {
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const r = await fetch("/api/fractera/vector-test", {
        body: JSON.stringify({ source, text }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const j = (await r.json()) as { dims?: number; error?: string; ms?: number; ok?: boolean; stored?: number };
      if (!r.ok || !j.ok) {
        const known = words.errors as Record<string, string>;
        setError(known[String(j.error)] ?? known.refused);
        return;
      }
      setDone({ dims: j.dims ?? 0, ms: j.ms ?? 0, stored: j.stored ?? 0 });
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
      await fetch("/api/fractera/vector-test", { method: "DELETE" });
      setDone(null);
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
        <label className="block font-medium text-[length:var(--fs-small)]" htmlFor="vec-source">
          {words.sourceLabel}
        </label>
        <input
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-[length:var(--fs-body)]"
          id="vec-source"
          onChange={(e) => setSource(e.target.value)}
          placeholder={words.sourcePlaceholder}
          value={source}
        />
      </div>

      <div className="space-y-2">
        <label className="block font-medium text-[length:var(--fs-small)]" htmlFor="vec-text">
          {words.textLabel}
        </label>
        <textarea
          className="h-56 w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-[length:var(--fs-small)]"
          id="vec-text"
          onChange={(e) => setText(e.target.value)}
          placeholder={words.textPlaceholder}
          value={text}
        />
        <p className="text-[length:var(--fs-small)] text-muted-foreground">{words.cutHint}</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          className="rounded-md bg-primary px-4 py-2 font-medium text-[length:var(--fs-body)] text-primary-foreground disabled:opacity-50"
          disabled={busy || !text.trim()}
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
        <p className="rounded-md border border-border bg-muted/40 p-4 text-[length:var(--fs-body)]">
          {fill(words.stored, { dims: done.dims, ms: done.ms, n: done.stored })}
        </p>
      )}

      {/* 🔒 ЦЕНА НАЗЫВАЕТСЯ РЯДОМ С РЕЗУЛЬТАТОМ, КАК И У ГРАФА — иначе «дешевле»
          остаётся словом. Здесь она другой природы: модель текст не читает, и
          это сказано прямо. */}
      <p className="text-[length:var(--fs-small)] text-muted-foreground">{words.costNote}</p>

      {state && (
        <p className="text-[length:var(--fs-small)] text-muted-foreground">
          {fill(words.inStore, { model: state.model || "—", n: state.count })}
        </p>
      )}
    </div>
  );
}

export function VectorSearch({ words }: { words: MemoryUi["vectorBench"] }) {
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answer, setAnswer] = useState<Answer | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    setAnswer(null);
    try {
      const r = await fetch("/api/fractera/vector-search", {
        body: JSON.stringify({ question }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const j = (await r.json()) as Answer & { error?: string; ok?: boolean };
      if (!r.ok || !j.ok) {
        const known = words.errors as Record<string, string>;
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

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label className="block font-medium text-[length:var(--fs-small)]" htmlFor="vec-question">
          {words.askLabel}
        </label>
        <textarea
          className="h-24 w-full rounded-md border border-border bg-background px-3 py-2 text-[length:var(--fs-body)]"
          id="vec-question"
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
          <p className="font-medium text-[length:var(--fs-body)]">
            {fill(words.timing, { ms: answer.askMs })}
          </p>

          {answer.found ? (
            <>
              <p className="text-[length:var(--fs-small)]">
                {fill(words.hits, { n: answer.near.length, threshold: answer.threshold })}
              </p>
              <ul className="space-y-2">
                {answer.near.map((p) => (
                  <li className="rounded-md border border-border p-3" key={p.id}>
                    <p className="mb-1 font-mono text-[length:var(--fs-small)] text-muted-foreground">
                      {p.score.toFixed(3)}
                    </p>
                    <p className="text-[length:var(--fs-small)]">{p.text}</p>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            // 🔒 «НИЧЕГО ПОДХОДЯЩЕГО» — ЭТО ОТВЕТ, И ОН НАЗЫВАЕТ, НАСКОЛЬКО ДАЛЕКО
            // БЫЛО БЛИЖАЙШЕЕ. Молчание здесь читалось бы как «склад пуст», а это
            // другое состояние и чинится оно иначе.
            <div className="space-y-2">
              <p className="text-[length:var(--fs-body)]">
                {fill(words.nothing, { threshold: answer.threshold })}
              </p>
              {answer.nearest && (
                <p className="rounded-md border border-border border-dashed p-3 text-[length:var(--fs-small)] text-muted-foreground">
                  {fill(words.nearestWas, { score: answer.nearest.score.toFixed(3) })}
                  {" "}
                  {answer.nearest.text}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
