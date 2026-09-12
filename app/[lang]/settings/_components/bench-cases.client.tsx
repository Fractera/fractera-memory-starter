"use client";

import { useCallback, useEffect, useState } from "react";
import type { MemoryUi } from "../_i18n/memory.i18n";

// ЭКРАН ОЦЕНКИ — ВЕРДИКТ ЧЕЛОВЕКА И КОРПУС СЛУЧАЕВ (189-5).
//
// 🔒 ЗДЕСЬ ЕДИНСТВЕННОЕ МЕСТО, ГДЕ РОЖДАЕТСЯ ВЕРДИКТ, И ОН ПРИХОДИТ ОТ ЧЕЛОВЕКА.
// Паспорт §11 запрещает памяти оценивать собственную работу — не из
// недоверия, а потому что модель, пересказывающая свой прогон, ошибается в свою
// пользу. Кнопки две, промежуточного значения нет: «скорее да» превратило бы
// долю удачных в вопрос вкуса, а она нужна затем, чтобы сравнивать версии
// навыков числом.
//
// 🛑 ПРОГОН БЕЗ ВЕРДИКТА ЧИСЛИТСЯ НЕЗАВЕРШЁННЫМ, А НЕ УДАЧНЫМ, и на экране у
// него своя подпись. Молчание как согласие раздувало бы долю удачных от того,
// что человек отошёл от экрана.

type Case = {
  ask_ms: number;
  created_at: string;
  entities: number;
  found: number;
  id: number;
  legacy: number;
  model_turn: string | null;
  question: string;
  store: string;
  verdict: string | null;
  why: string | null;
  words_ms: number;
};

type Book = {
  cases: Case[];
  summary: { avgAsk: number; bad: number; good: number; pending: number; total: number } | null;
};

const fill = (s: string, v: Record<string, string | number>) =>
  Object.entries(v).reduce((acc, [k, val]) => acc.replaceAll(`{${k}}`, String(val)), s);

export function BenchCases({ words }: { words: MemoryUi["benchCases"] }) {
  const [book, setBook] = useState<Book | null>(null);
  const [why, setWhy] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/fractera/bench-cases", { cache: "no-store" });
      if (!r.ok) return;
      setBook((await r.json()) as Book);
    } catch {
      // Служба недостижима — список останется прежним, а не опустеет молча.
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function vote(id: number, verdict: "good" | "bad") {
    setBusy(true);
    try {
      await fetch("/api/fractera/bench-cases", {
        body: JSON.stringify({ id, verdict, why: why[id] ?? "" }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      await load();
    } finally {
      setBusy(false);
    }
  }

  const s = book?.summary;

  return (
    <div className="space-y-6">
      <p className="max-w-3xl text-[length:var(--fs-body)] text-muted-foreground">{words.lead}</p>

      {s && s.total > 0 && (
        <p className="rounded-md border border-border bg-muted/40 p-4 text-[length:var(--fs-body)]">
          {fill(words.summary, {
            avg: s.avgAsk,
            bad: s.bad,
            good: s.good,
            pending: s.pending,
            total: s.total,
          })}
        </p>
      )}

      <section className="space-y-3">
        <h3 className="font-medium text-[length:var(--fs-body)]">{words.title}</h3>

        {!book || book.cases.length === 0 ? (
          <p className="text-[length:var(--fs-small)] text-muted-foreground">{words.empty}</p>
        ) : (
          <ul className="space-y-3">
            {book.cases.map((c) => (
              <li className="space-y-2 rounded-md border border-border p-4" key={c.id}>
                <p className="text-[length:var(--fs-body)]">{c.question}</p>
                <p className="text-[length:var(--fs-small)] text-muted-foreground">
                  {c.ask_ms} мс · {c.entities} · {fill(words.modelMark, { turn: c.model_turn ?? "—" })}
                  {c.legacy ? ` · ${words.legacyMark}` : ""}
                </p>

                {c.verdict ? (
                  <p className="text-[length:var(--fs-small)]">
                    {c.verdict === "good" ? `✓ ${words.good}` : `✗ ${words.bad}`}
                    {c.why ? ` — ${c.why}` : ""}
                  </p>
                ) : (
                  <>
                    <p className="text-[length:var(--fs-small)] text-muted-foreground">
                      {words.pending}
                    </p>
                    <input
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-[length:var(--fs-small)]"
                      onChange={(e) => setWhy((w) => ({ ...w, [c.id]: e.target.value }))}
                      placeholder={words.why}
                      value={why[c.id] ?? ""}
                    />
                    <div className="flex gap-2">
                      <button
                        className="rounded-md bg-primary px-3 py-1.5 text-[length:var(--fs-small)] text-primary-foreground disabled:opacity-50"
                        disabled={busy}
                        onClick={() => void vote(c.id, "good")}
                        type="button"
                      >
                        {words.good}
                      </button>
                      <button
                        className="rounded-md border border-border px-3 py-1.5 text-[length:var(--fs-small)] disabled:opacity-50"
                        disabled={busy}
                        onClick={() => void vote(c.id, "bad")}
                        type="button"
                      >
                        {words.bad}
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
