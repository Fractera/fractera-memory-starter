"use client";

import { useCallback, useEffect, useImperativeHandle, useState } from "react";
import { Button } from "@/components/ui/button";

// НИЖНЯЯ ПОЛОВИНА РАЗДЕЛА — ЧТО ПАМЯТЬ ПОСТРОИЛА (176-3, переписана 200-2).
//
// 🔒 ТАБЛИЦЫ БЕРУТСЯ У САМОЙ ПАМЯТИ ЧЕРЕЗ ПУБЛИЧНЫЙ API: `GET /v1/tables` — имена,
// `GET /v1/tables/{имя}` — описание. Свой обход базы завёл бы второго читателя её
// внутренностей — ровно то, от чего защищает закон о чёрном ящике.
//
// ✗ ДО 200-2 ЭКРАН ЖДАЛ ОТ ОПИСАНИЯ `columns` И `rows` — А ДОГОВОР ИХ НЕ ОТДАЁТ.
// Описание таблицы есть `reads_as`, `parent`, `records` и `kinds` (роды значений);
// строк чёрный ящик наружу не выдаёт по замыслу. Вдобавок дверь стенда не держала
// `GET` вовсе: журнал nginx — 14 × `405`. Раздел был пуст с 178-1 по двум причинам.
//
// 🔒 «ТАБЛИЦ НЕТ» И «СЛУЖБА НЕ ОТВЕТИЛА» — РАЗНЫЕ СОСТОЯНИЯ, И ОБА НАЗЫВАЮТСЯ.

type Words = {
  title: string;
  lead: string;
  refresh: string;
  loading: string;
  empty: string;
  down: string;
  records: string;
  kinds: string;
  noKinds: string;
  parent: string;
};

type Kind = { explained: string | null; name: string; reads_as: string };

type Described = {
  kinds: Kind[];
  name: string;
  parent: string | null;
  readsAs: string;
  records: number | null;
  trouble: string | null;
};

export type MemoryTablesHandle = { reload: () => void };

export function MemoryTables({
  ref,
  words,
}: {
  ref?: React.Ref<MemoryTablesHandle>;
  words: Words;
}) {
  const [names, setNames] = useState<string[] | null>(null);
  const [tables, setTables] = useState<Described[]>([]);
  const [busy, setBusy] = useState(false);
  const [trouble, setTrouble] = useState<string | null>(null);

  const load = useCallback(async () => {
    setBusy(true);
    setTrouble(null);
    try {
      const r = await fetch("/api/fractera/memory-test?what=tables", { cache: "no-store" });
      const answer = (await r.json()) as {
        body?: { ok?: boolean; tables?: unknown; what_happened?: string };
        status?: number;
        trouble?: string | null;
      };
      if (answer?.trouble || answer?.body?.ok === false) {
        setTrouble(answer?.trouble ?? answer?.body?.what_happened ?? `${words.down} (${answer?.status ?? r.status})`);
        setNames(null);
        setTables([]);
        return;
      }
      const raw = answer?.body?.tables;
      const list = Array.isArray(raw)
        ? raw
            .map((t) => (typeof t === "string" ? t : String((t as { name?: unknown })?.name ?? "")))
            .filter(Boolean)
        : [];
      setNames(list);

      // 🔒 ОПИСАНИЕ КАЖДОЙ ТАБЛИЦЫ ТЯНЕМ ОТДЕЛЬНО, ПОТОМУ ЧТО ТАК УСТРОЕН ДОГОВОР:
      // имена — одним запросом, описание — по имени.
      const described: Described[] = [];
      for (const name of list) {
        try {
          const one = await fetch(`/api/fractera/memory-test?what=table&name=${encodeURIComponent(name)}`, {
            cache: "no-store",
          });
          const got = (await one.json()) as {
            body?: {
              hint?: string;
              kinds?: unknown;
              ok?: boolean;
              parent?: string | null;
              reads_as?: string;
              records?: number | null;
            };
            trouble?: string | null;
          };
          if (got?.trouble || got?.body?.ok === false) {
            described.push({
              kinds: [],
              name,
              parent: null,
              readsAs: "",
              records: null,
              trouble: got?.trouble ?? got?.body?.hint ?? words.down,
            });
            continue;
          }
          const b = got.body ?? {};
          described.push({
            kinds: Array.isArray(b.kinds) ? (b.kinds as Kind[]) : [],
            name,
            parent: b.parent ?? null,
            readsAs: b.reads_as ?? "",
            records: typeof b.records === "number" ? b.records : null,
            trouble: null,
          });
        } catch (e) {
          described.push({ kinds: [], name, parent: null, readsAs: "", records: null, trouble: String((e as Error).message) });
        }
      }
      setTables(described);
    } catch (e) {
      setTrouble(`${words.down}: ${String((e as Error).message)}`);
      setNames(null);
      setTables([]);
    } finally {
      setBusy(false);
    }
  }, [words.down]);

  useEffect(() => {
    void load();
  }, [load]);

  useImperativeHandle(ref, () => ({ reload: () => void load() }), [load]);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[length:var(--fs-h3)] font-medium">{words.title}</h2>
        <Button disabled={busy} onClick={() => void load()} size="sm" type="button" variant="outline">
          {busy ? words.loading : words.refresh}
        </Button>
      </div>
      <p className="text-[length:var(--fs-small)] text-muted-foreground">{words.lead}</p>

      {trouble ? (
        <p className="rounded-md border border-destructive/40 px-3 py-2 text-[length:var(--fs-small)] text-destructive">
          {trouble}
        </p>
      ) : names === null ? (
        <p className="text-[length:var(--fs-small)] text-muted-foreground">{words.loading}</p>
      ) : names.length === 0 ? (
        <p className="rounded-md border border-dashed border-muted-foreground/30 px-3 py-4 text-[length:var(--fs-small)] text-muted-foreground">
          {words.empty}
        </p>
      ) : (
        <div className="space-y-3">
          {tables.map((t) => (
            <div className="rounded-md border border-muted-foreground/30" data-table={t.name} key={t.name}>
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-muted-foreground/20 px-3 py-2">
                <span className="break-all font-mono text-[length:var(--fs-small)]">{t.name}</span>
                <span className="text-[length:var(--fs-small)] text-muted-foreground">
                  {words.records}: {t.records ?? "—"}
                </span>
              </div>
              {t.trouble ? (
                <p className="px-3 py-2 text-[length:var(--fs-small)] text-destructive">{t.trouble}</p>
              ) : (
                <div className="space-y-2 px-3 py-2">
                  {t.readsAs ? <p className="text-[length:var(--fs-small)]">{t.readsAs}</p> : null}
                  {t.parent ? (
                    <p className="text-[length:var(--fs-small)] text-muted-foreground">
                      {words.parent}: <span className="font-mono">{t.parent}</span>
                    </p>
                  ) : null}
                  {t.kinds.length === 0 ? (
                    <p className="text-[length:var(--fs-small)] text-muted-foreground">{words.noKinds}</p>
                  ) : (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[length:var(--fs-small)] text-muted-foreground">{words.kinds}:</span>
                      {t.kinds.map((k) => (
                        <span
                          className="rounded bg-muted px-1.5 py-0.5 font-mono text-[length:var(--fs-small)]"
                          key={k.name}
                          title={k.explained ?? k.reads_as}
                        >
                          {k.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
