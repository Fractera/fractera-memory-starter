"use client";

import { useState } from "react";
import type { MemoryUi } from "../_i18n/memory.i18n";

// ЭКРАН ПОИСКА ПО ГРАФУ ЗНАНИЙ (189-4).
//
// 🎯 ЗДЕСЬ ПРОВЕРЯЕТСЯ ВТОРАЯ ПОЛОВИНА УТВЕРЖДЕНИЯ ВЛАДЕЛЬЦА О ЦЕНЕ: «после
// этого модель отвечает мгновенно». Первая половина — дорогая загрузка — живёт
// на соседней странице; здесь человек видит, во что обошёлся ответ.
//
// 🔒 ДВЕ КНОПКИ, И ВТОРАЯ — НЕ УДОБСТВО, А НЕГАТИВНЫЙ КОНТРОЛЬ НА ЭКРАНЕ. Один
// и тот же вопрос: со словами от памяти и по-старому, без слов. Экран, у
// которого оба пути выглядят одинаково, ничего не доказывает; здесь разница
// видна числами и подписью.
//
// 🛑 УТВЕРЖДЕНИЕ О ХОДЕ МОДЕЛИ ПЕЧАТАЕТСЯ ТОЛЬКО ТАМ, ГДЕ ОНО ОБОСНОВАНО.
// Прислали слова — ходов не было, и это следует из устройства движка. Не
// прислали — мы НЕ ЗНАЕМ, звал он модель или ответил из кэша, и так и написано.
// Уверенное умолчание дороже отсутствующего значения.

type Answer = {
  askMs: number;
  context: string;
  entities: number;
  found: boolean;
  keywords: { high: string[]; low: string[]; matched: string[] } | null;
  legacy: boolean;
  modelTurn: "none" | "unknown";
  wordsMs: number;
};

const fill = (s: string, v: Record<string, string | number>) =>
  Object.entries(v).reduce((acc, [k, val]) => acc.replaceAll(`{${k}}`, String(val)), s);

export function GraphSearch({ words }: { words: MemoryUi["graphSearch"] }) {
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [forgotten, setForgotten] = useState<number | null>(null);

  async function run(legacy: boolean) {
    setBusy(true);
    setError(null);
    setAnswer(null);
    setForgotten(null);
    try {
      const r = await fetch("/api/fractera/graph-search", {
        body: JSON.stringify({ legacy, question }),
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
      setError(words.errors["graph-unreachable"]);
    } finally {
      setBusy(false);
    }
  }

  async function forget() {
    setBusy(true);
    try {
      const r = await fetch("/api/fractera/graph-search", { method: "DELETE" });
      const j = (await r.json()) as { deleted?: string[] };
      setForgotten(j.deleted?.length ?? 0);
    } catch {
      setError(words.errors["graph-unreachable"]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label className="block font-medium text-[length:var(--fs-small)]" htmlFor="graph-question">
          {words.label}
        </label>
        <textarea
          className="h-24 w-full rounded-md border border-border bg-background px-3 py-2 text-[length:var(--fs-body)]"
          id="graph-question"
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={words.placeholder}
          value={question}
        />
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          className="rounded-md bg-primary px-4 py-2 font-medium text-[length:var(--fs-body)] text-primary-foreground disabled:opacity-50"
          disabled={busy || !question.trim()}
          onClick={() => void run(false)}
          type="button"
        >
          {busy ? words.busy : words.ask}
        </button>
        {/* 🪦 КНОПКА «СПРОСИТЬ ПО-СТАРОМУ» УБРАНА С ЭКРАНА 2026-09-12 СЛОВОМ
            ВЛАДЕЛЬЦА: «button Спросить по-старому, без слов to remove».
            🔒 САМ РЕЖИМ В ДВЕРИ ОСТАЁТСЯ, И ЭТО НЕ ЗАБЫТЫЙ ХВОСТ: им прибор
            189-4 доказывает главное утверждение шага — со словами ход модели не
            нужен, без них она звалась. Доказательство переехало из глаз в
            машину, а не исчезло. Удали мы режим целиком — негативный контроль
            стало бы нечем снять, и утверждение о цене повисло бы на слове. */}
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

      {forgotten !== null && (
        <p className="rounded-md border border-border bg-muted/40 p-4 text-[length:var(--fs-small)]">
          {fill(words.forgetDone, { n: forgotten })}
        </p>
      )}

      {answer && (
        <div className="space-y-3">
          {/* Цена ответа — первым, потому что ради неё этот экран и построен. */}
          <p className="font-medium text-[length:var(--fs-body)]">
            {fill(words.timing, { ask: answer.askMs, words: answer.wordsMs })}
          </p>
          <p className="text-[length:var(--fs-small)]">
            {answer.modelTurn === "none" ? words.modelNone : words.modelUnknown}
          </p>

          {answer.legacy && (
            <p className="rounded-md border border-border bg-muted/40 p-3 text-[length:var(--fs-small)] text-muted-foreground">
              {words.legacyNote}
            </p>
          )}

          {answer.keywords && (
            <>
              <p className="text-[length:var(--fs-small)] text-muted-foreground">
                {fill(words.keywordsLine, {
                  high: answer.keywords.high.join(", ") || "—",
                  low: answer.keywords.low.join(", ") || "—",
                })}
              </p>
              {answer.keywords.matched.length > 0 && (
                <p className="text-[length:var(--fs-small)] text-muted-foreground">
                  {fill(words.matchedLine, { names: answer.keywords.matched.join(", ") })}
                </p>
              )}
            </>
          )}

          <p className="text-[length:var(--fs-small)]">
            {answer.found ? fill(words.found, { n: answer.entities }) : words.empty}
          </p>

          {/* 🔒 КОНТЕКСТ ПОКАЗЫВАЕТСЯ КАК ЕСТЬ, БЕЗ ПЕРЕСКАЗА. Это стенд: человек
              обязан видеть то, что получит зовущая модель, а не нашу выжимку. */}
          {answer.found && (
            <pre className="max-h-96 overflow-auto rounded-md border border-border bg-muted/40 p-3 text-[length:var(--fs-small)] whitespace-pre-wrap">
              {answer.context}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
