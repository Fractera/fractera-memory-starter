"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

// ЖУРНАЛ ПАМЯТИ КАК РАЗДЕЛ СТРАНИЦЫ (178-3).
//
// 🔒 ТОТ ЖЕ ДОКУМЕНТ, ЧТО ЧИТАЕТ АГЕНТ, И ЭТО НЕ ПЕРЕСКАЗ ЕГО, А ОН САМ.
// Решение владельца: «ты читаешь Markdown документ, я читаю страницу из этого
// [же] документа». Второго источника не существует — ни базы «для экрана», ни
// кэша: две копии разошлись бы, и человек с агентом обсуждали бы разные события.
//
// 🪦 ПРЕЖДЕ ЖУРНАЛ ЖИЛ ОТДЕЛЬНОЙ СТРАНИЦЕЙ НА ГОЛОМ NODE (`lib/page.mjs`,
// маршрут `/`). Она осталась работать и никуда не делась: этот раздел — второй
// вход к тому же файлу, а не его замена. Убрать старую страницу можно только
// вместе с проверкой, что новая её действительно заменила.
//
// 🔒 НОВЫЕ ЗАПИСИ ПОКАЗЫВАЮТСЯ СВЕРХУ. В файле они снизу, потому что
// дописываются в конец — единственная операция, не теряющая файл при обрыве;
// человеку же важно последнее.

type Words = {
  entries: string;
  bytes: string;
  clear: string;
  clearing: string;
  cleared: string;
  empty: string;
  down: string;
  shared: string;
  refresh: string;
};

type Got = { bytes: number; entries: number; text: string };

export function JournalView({ words }: { words: Words }) {
  const [got, setGot] = useState<Got | null>(null);
  const [busy, setBusy] = useState(false);
  const [trouble, setTrouble] = useState<string | null>(null);
  const [cleared, setCleared] = useState<number | null>(null);

  const load = useCallback(async () => {
    setBusy(true);
    setTrouble(null);
    try {
      const r = await fetch("/api/fractera/memory-test", {
        body: JSON.stringify({ body: {}, method: "journal" }),
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      // 🛑 ЧИТАЕМ ТЕЛО, А НЕ КОД: и дверь, и память отвечают `200` с `ok:false`.
      const answer = (await r.json()) as {
        body?: { bytes?: number; entries?: number; text?: string };
        trouble?: string | null;
      };
      if (answer?.trouble) {
        setTrouble(answer.trouble);
        setGot(null);
        return;
      }
      setGot({
        bytes: answer?.body?.bytes ?? 0,
        entries: answer?.body?.entries ?? 0,
        text: answer?.body?.text ?? "",
      });
    } catch (e) {
      setTrouble(`${words.down}: ${String((e as Error).message)}`);
      setGot(null);
    } finally {
      setBusy(false);
    }
  }, [words.down]);

  useEffect(() => {
    void load();
  }, [load]);

  const clear = useCallback(async () => {
    setBusy(true);
    try {
      const r = await fetch("/api/fractera/memory-test", {
        body: JSON.stringify({ body: {}, method: "forget_journal" }),
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const answer = (await r.json()) as { body?: { cleared?: number } };
      setCleared(answer?.body?.cleared ?? 0);
      await load();
    } catch (e) {
      setTrouble(`${words.down}: ${String((e as Error).message)}`);
    } finally {
      setBusy(false);
    }
  }, [load, words.down]);

  // 🔒 ДОКУМЕНТ РЕЖЕТСЯ НА ЗАПИСИ ПО ЗАГОЛОВКУ, И ЭТО ЕДИНСТВЕННОЕ, ЧТО МЫ С НИМ
  // ДЕЛАЕМ. Показываем как есть, моноширинным: разбирать разметку значило бы
  // завести правила показа, а они сами становятся вторым источником правды.
  const blocks = (got?.text ?? "")
    .split(/\n(?=## )/)
    .map((b) => b.trim())
    .filter(Boolean)
    .reverse();

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-[length:var(--fs-small)] text-muted-foreground">
          {got ? `${got.entries} ${words.entries} · ${got.bytes} ${words.bytes}` : ""}
        </span>
        <div className="flex gap-2">
          <Button disabled={busy} onClick={() => void load()} size="sm" type="button" variant="outline">
            {words.refresh}
          </Button>
          <Button disabled={busy} onClick={() => void clear()} size="sm" type="button" variant="outline">
            {busy ? words.clearing : words.clear}
          </Button>
        </div>
      </div>

      {cleared !== null && (
        <p className="text-[length:var(--fs-small)] text-muted-foreground">
          {words.cleared.replace("{n}", String(cleared))}
        </p>
      )}

      {trouble ? (
        <p className="rounded-md border border-destructive/40 px-3 py-2 text-[length:var(--fs-small)] text-destructive">
          {trouble}
        </p>
      ) : blocks.length === 0 ? (
        <p className="rounded-md border border-dashed border-muted-foreground/30 px-3 py-4 text-[length:var(--fs-small)] text-muted-foreground">
          {words.empty}
        </p>
      ) : (
        <ol className="space-y-3">
          {blocks.map((b, i) => (
            <li
              className="overflow-x-auto whitespace-pre-wrap break-words rounded-md border border-muted-foreground/30 bg-muted px-3 py-2 font-mono text-[length:var(--fs-small)]"
              key={i}
            >
              {b}
            </li>
          ))}
        </ol>
      )}

      <p className="text-[length:var(--fs-small)] text-muted-foreground">{words.shared}</p>
    </section>
  );
}
