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
//
// 🔒 195-11, СЛОВО ВЛАДЕЛЬЦА: «сделай сортировку по дате опционально и сделай во всех кнопку удалить. Также напиши в заголовке этой
// вкладки зачем она нужна как она работает». Порядок считает сервер; удаление — один случай по номеру, с подтверждением вторым нажатием
// на экране (без всплывающего окна); текст «зачем и как» стоит под заголовком вкладки (`page.tsx`), здесь его больше нет — двух не будет.

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

type Order = "desc" | "asc";

const fill = (s: string, v: Record<string, string | number>) =>
  Object.entries(v).reduce((acc, [k, val]) => acc.replaceAll(`{${k}}`, String(val)), s);

export function BenchCases({ words }: { words: MemoryUi["benchCases"] }) {
  const [book, setBook] = useState<Book | null>(null);
  const [why, setWhy] = useState<Record<number, string>>({});
  const [busy, setBusy] = useState(false);
  const [order, setOrder] = useState<Order>("desc");
  const [confirm, setConfirm] = useState<number | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/fractera/bench-cases?order=${order}`, { cache: "no-store" });
      if (!r.ok) return;
      setBook((await r.json()) as Book);
    } catch {
      // Служба недостижима — список останется прежним, а не опустеет молча.
    }
  }, [order]);

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

  async function remove(id: number) {
    setBusy(true);
    setRemoveError(null);
    try {
      const r = await fetch(`/api/fractera/bench-cases?id=${id}`, { method: "DELETE" });
      const j = (await r.json().catch(() => ({}))) as { error?: string; ok?: boolean };
      if (!r.ok || !j.ok) setRemoveError(fill(words.removeFailed, { error: j.error ?? String(r.status) }));
      setConfirm(null);
      await load();
    } catch (e) {
      setRemoveError(fill(words.removeFailed, { error: String((e as Error).message) }));
    } finally {
      setBusy(false);
    }
  }

  const s = book?.summary;

  return (
    <div className="space-y-6">
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
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="font-medium text-[length:var(--fs-body)]">{words.title}</h3>
          <div className="ml-auto flex items-center gap-2 text-[length:var(--fs-small)]" data-cases-order={order}>
            <span className="text-muted-foreground">{words.sortLabel}</span>
            {(["desc", "asc"] as const).map((o) => (
              <button
                aria-pressed={order === o}
                className={`rounded-md border px-3 py-1 ${order === o ? "border-primary bg-primary/10 text-primary" : "border-border"}`}
                disabled={busy}
                key={o}
                onClick={() => setOrder(o)}
                type="button"
              >
                {o === "desc" ? words.sortNewest : words.sortOldest}
              </button>
            ))}
          </div>
        </div>

        {removeError && (
          <p className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-[length:var(--fs-small)]">{removeError}</p>
        )}

        {!book || book.cases.length === 0 ? (
          <p className="text-[length:var(--fs-small)] text-muted-foreground">{words.empty}</p>
        ) : (
          <ul className="space-y-3">
            {book.cases.map((c) => (
              <li className="space-y-2 rounded-md border border-border p-4" data-case-id={c.id} key={c.id}>
                <div className="flex flex-wrap items-start gap-3">
                  <p className="flex-1 text-[length:var(--fs-body)]">{c.question}</p>
                  {/* 🔒 УДАЛЕНИЕ — ВТОРЫМ НАЖАТИЕМ, НА ЭКРАНЕ (195-11): случай с вердиктом — работа человека, и одно случайное нажатие не
                      должно её стирать. Всплывающее окно браузера не используется. */}
                  {confirm === c.id ? (
                    <div className="flex gap-2">
                      <button
                        className="rounded-md border border-destructive/60 px-3 py-1 text-[length:var(--fs-small)] text-destructive disabled:opacity-50"
                        disabled={busy}
                        onClick={() => void remove(c.id)}
                        type="button"
                      >
                        {busy ? words.removing : words.removeConfirm}
                      </button>
                      <button
                        className="rounded-md border border-border px-3 py-1 text-[length:var(--fs-small)] disabled:opacity-50"
                        disabled={busy}
                        onClick={() => setConfirm(null)}
                        type="button"
                      >
                        {words.removeCancel}
                      </button>
                    </div>
                  ) : (
                    <button
                      className="rounded-md border border-border px-3 py-1 text-[length:var(--fs-small)] text-muted-foreground disabled:opacity-50"
                      disabled={busy}
                      onClick={() => setConfirm(c.id)}
                      type="button"
                    >
                      {words.remove}
                    </button>
                  )}
                </div>
                <p className="text-[length:var(--fs-small)] text-muted-foreground">
                  {/* 🔒 ПОДПИСЬ ХРАНИЛИЩА — ПЕРВОЙ (195-10, решение владельца «Общий + подпись»): корпус один на все стенды, и без
                      подписи поиск ссылки неотличим от поиска графа. Незнакомый ключ показывается как есть, а не пустотой. */}
                  <span className="font-medium text-foreground" data-case-store={c.store}>
                    {words.stores[c.store] ?? c.store}
                  </span>
                  {" · "}
                  {new Date(c.created_at).toLocaleString()} · {c.ask_ms} мс · {c.entities} ·{" "}
                  {fill(words.modelMark, { turn: c.model_turn ?? "—" })}
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
