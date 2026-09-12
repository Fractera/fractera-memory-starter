"use client";

import { useCallback, useEffect, useState } from "react";
import type { MemoryUi } from "../_i18n/memory.i18n";

// ЭКРАН ЗАГРУЗКИ В ГРАФ ЗНАНИЙ (189-2).
//
// 🎯 ЗДЕСЬ ЖИВЁТ ГЛАВНОЕ УТВЕРЖДЕНИЕ ВЛАДЕЛЬЦА О ЦЕНЕ: «во время загрузки
// происходит вызов модели и создание графа знаний, после этого модель отвечает
// мгновенно». Значит именно этот экран обязан показывать, что работа идёт и чем
// она кончилась, — иначе дорогая половина остаётся невидимой.
//
// 🔒 «ПРИНЯТО» И «ПОСТРОЕНО» — РАЗНЫЕ УТВЕРЖДЕНИЯ, И ЭКРАН ИХ РАЗЛИЧАЕТ. Граф
// строит связи в фоне: ответ двери говорит «принято», а рост числа сущностей
// экран досматривает сам, опрашивая состояние. Объявить успех сразу значило бы
// показать человеку зелёное там, где ещё ничего не найдётся.
//
// 🔒 СЛОВА ПРИХОДЯТ ПРОПСОМ, ПЕРЕЧИСЛЕННЫМ ПОИМЁННО. Словарь службы серверный, и
// уезжать в браузер целиком он не имеет права — по проводу уходит только то, что
// названо. Тот же закон, которым здесь уже оплачены две ошибки в панели.

type Doc = { id: string; status: string; source: string | null; chunks: number };

type State = {
  documents: Doc[];
  labels: number;
  labelSample?: string[];
  ready: boolean;
};

/** Подставить числа в строку словаря: словарь остаётся словами, а не разметкой. */
const fill = (s: string, v: Record<string, string | number>) =>
  Object.entries(v).reduce((acc, [k, val]) => acc.replaceAll(`{${k}}`, String(val)), s);

export function GraphUpload({ words }: { words: MemoryUi["graphUpload"] }) {
  const [text, setText] = useState("");
  const [anchors, setAnchors] = useState("");
  const [source, setSource] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [taken, setTaken] = useState<number | null>(null);
  const [grew, setGrew] = useState<{ from: number; to: number } | null>(null);
  const [state, setState] = useState<State | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/fractera/graph-test", { cache: "no-store" });
      if (!r.ok) return null;
      const j = (await r.json()) as State;
      setState(j);
      return j;
    } catch {
      // Служба недостижима — экран скажет это строкой, а не пустотой.
      return null;
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // 🔒 ДОСМАТРИВАЕМ РОСТ, А НЕ ЖДЁМ ФИКСИРОВАННУЮ ПАУЗУ. Сколько граф строит
  // связи, зависит от длины текста и от модели; пауза «на глаз» либо врёт
  // раньше времени, либо заставляет человека ждать зря.
  // 🛑 И У ОЖИДАНИЯ ЕСТЬ ПРЕДЕЛ: двадцать проходов по три секунды. Бесконечный
  // опрос выглядит как работа и ею не является.
  useEffect(() => {
    if (!grew || grew.to > grew.from) return;
    let left = 20;
    const timer = setInterval(async () => {
      left -= 1;
      const j = await load();
      if (j && j.labels > grew.from) {
        setGrew({ from: grew.from, to: j.labels });
        clearInterval(timer);
        return;
      }
      if (left <= 0) clearInterval(timer);
    }, 3000);
    return () => clearInterval(timer);
  }, [grew, load]);

  async function send() {
    setBusy(true);
    setError(null);
    setTaken(null);
    setGrew(null);
    try {
      const r = await fetch("/api/fractera/graph-test", {
        body: JSON.stringify({
          anchors: anchors.split(",").map((a) => a.trim()).filter(Boolean),
          source,
          text,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const j = (await r.json()) as {
        error?: string;
        labelsBefore?: number;
        ms?: number;
        ok?: boolean;
      };
      if (!r.ok || !j.ok) {
        // 🔒 ОТКАЗ ДВЕРИ ПОКАЗЫВАЕТСЯ СВОИМ ИМЕНЕМ. Незнакомый код — тоже имя, и
        // прятать его за общей фразой значит отнимать у человека единственную
        // зацепку.
        const known = words.errors as Record<string, string>;
        setError(known[String(j.error)] ?? known.refused);
        return;
      }
      setTaken(j.ms ?? 0);
      setGrew({ from: j.labelsBefore ?? 0, to: j.labelsBefore ?? 0 });
      void load();
    } catch {
      setError(words.errors.offline);
    } finally {
      setBusy(false);
    }
  }

  const notReady = state !== null && !state.ready;

  return (
    <div className="space-y-6">
      {notReady && (
        <p className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-[length:var(--fs-small)]">
          {words.notReady}
        </p>
      )}

      <div className="space-y-2">
        <label className="block font-medium text-[length:var(--fs-small)]" htmlFor="graph-anchors">
          {words.anchorsLabel}
        </label>
        <input
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-[length:var(--fs-body)]"
          id="graph-anchors"
          onChange={(e) => setAnchors(e.target.value)}
          placeholder={words.anchorsPlaceholder}
          value={anchors}
        />
        <p className="text-[length:var(--fs-small)] text-muted-foreground">{words.anchorsHint}</p>
      </div>

      <div className="space-y-2">
        <label className="block font-medium text-[length:var(--fs-small)]" htmlFor="graph-source">
          {words.sourceLabel}
        </label>
        <input
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-[length:var(--fs-body)]"
          id="graph-source"
          onChange={(e) => setSource(e.target.value)}
          placeholder={words.sourcePlaceholder}
          value={source}
        />
      </div>

      <div className="space-y-2">
        <label className="block font-medium text-[length:var(--fs-small)]" htmlFor="graph-text">
          {words.textLabel}
        </label>
        <textarea
          className="h-56 w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-[length:var(--fs-small)]"
          id="graph-text"
          onChange={(e) => setText(e.target.value)}
          placeholder={words.textPlaceholder}
          value={text}
        />
      </div>

      <button
        className="rounded-md bg-primary px-4 py-2 font-medium text-[length:var(--fs-body)] text-primary-foreground disabled:opacity-50"
        disabled={busy || notReady}
        onClick={() => void send()}
        type="button"
      >
        {busy ? words.busy : words.button}
      </button>

      {error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-[length:var(--fs-small)]">
          {error}
        </p>
      )}

      {taken !== null && (
        <p className="rounded-md border border-border bg-muted/40 p-4 text-[length:var(--fs-small)]">
          {fill(words.taken, { ms: taken })}
        </p>
      )}

      {grew && (
        <p className="text-[length:var(--fs-small)]">
          {grew.to > grew.from
            ? fill(words.grew, { from: grew.from, to: grew.to })
            : words.waiting}
        </p>
      )}

      <section className="space-y-2">
        <h3 className="font-medium text-[length:var(--fs-body)]">{words.docsTitle}</h3>
        {state && state.documents.length > 0 ? (
          <>
            <p className="text-[length:var(--fs-small)] text-muted-foreground">
              {fill(words.labelsNow, { n: state.labels })}
              {state.labelSample?.length ? ` — ${state.labelSample.join(", ")}` : ""}
            </p>
            <ul className="divide-y divide-border rounded-md border border-border">
              {state.documents.map((d) => (
                <li className="flex items-center justify-between gap-4 px-3 py-2" key={d.id}>
                  <span className="truncate text-[length:var(--fs-small)]">
                    {d.source ?? d.id}
                  </span>
                  <span className="shrink-0 text-[length:var(--fs-small)] text-muted-foreground">
                    {d.status} · {d.chunks}
                  </span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-[length:var(--fs-small)] text-muted-foreground">{words.docsEmpty}</p>
        )}
      </section>
    </div>
  );
}
