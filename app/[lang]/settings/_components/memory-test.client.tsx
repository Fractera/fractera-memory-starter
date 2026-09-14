"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { BenchControls, type BenchControlWords } from "./memory-test-controls.client";
import { buildCall, EMPTY_PARAMS } from "@/lib/bench-call.mjs";
import type { BenchMode, BenchParams } from "@/lib/bench-call.mjs";

// СТЕНД ПАМЯТИ — ВЕРХНЯЯ ПОЛОВИНА РАЗДЕЛА (176-2, перестроен 183-1, 200-3).
//
// 🔒 ЗАЧЕМ ОН ЕСТЬ: ЧТОБЫ ИЗМЕРЯТЬ ПАМЯТЬ, А НЕ СУММУ «ПАМЯТЬ ПЛЮС АГЕНТ».
// ✗ оплачено разбором 2026-09-10: на вопрос «что ты знаешь обо мне» от нажатия
// «отправить» до ответа прошло 2 мин 13 с, и к самой памяти относились СЕКУНДЫ.
//
// 🔒 У ЧЁРНОГО ЯЩИКА ДВА ГЛАГОЛА — «СКАЗАТЬ» И «СПРОСИТЬ», И СТЕНД ПРОВЕРЯЕТ ИМЕННО ИХ.
// Слово владельца 2026-09-14: «На вкладке тест памяти мы же не тестируем какие-либо
// другие методы кроме двух: сказать и спросить?… каждый запрос может иметь или не
// иметь эти дополнительные расширенные параметры». Всё остальное — включения в эти
// два запроса, а не отдельные входы.
// 🪦 200-2 добавил вход «Метод договора» (форма по всем методам договора) и оставлял
// «Сырой вызов» — оба убраны 200-3 словом владельца («Сырой вызов» — «Убрать»).
// Восстанавливаются из git.
//
// 🔒 С 200-1 КАЖДЫЙ ВЫЗОВ ИДЁТ В ПУБЛИЧНЫЙ API `/v1/*` — тем же путём, что у любой
// программы. Панель «что уедет» показывает адрес, заголовки (ключ маской) и тело
// ровно так, как их отправит дверь стенда.
//
// 🔒 ОТВЕТ ПОКАЗЫВАЕТСЯ ДОСЛОВНО, И ВРЕМЯ СТОИТ РЯДОМ С НИМ: разбор фразы идёт
// секунды, потому что думает модель; без числа это неотличимо от зависшей страницы.

type Words = {
  lead: string;
  say: string;
  ask: string;
  sayHint: string;
  askHint: string;
  send: string;
  sending: string;
  inputTitle: string;
  answerTitle: string;
  nothingYet: string;
  nothingSent: string;
  volatile: string;
  failed: string;
  took: string;
  status: string;
  /** Панель «что уедет»: заголовок и строка о непринятых параметрах (183-1). */
  whatGoes: string;
  droppedTitle: string;
  /** Нет файла ключа памяти — вызов уйдёт без ключа и получит отказ договора (200-1). */
  keyMissing: string;
  controls: BenchControlWords;
};

type Shot = {
  /** Что ушло — то, что человек набрал, а не то, что мы из этого собрали. */
  asked: string;
  at: string;
  /** Ответ службы как есть; `null`, когда до неё не дошли. */
  body: unknown;
  id: number;
  method: string;
  ms: number;
  status: number;
  trouble: string | null;
  /** Адрес, на который дверь стенда действительно ушла — из её ответа (200-1). */
  url: string | null;
};

/** Показать тело ответа так, как оно пришло. Строку не трогаем вовсе. */
function show(body: unknown): string {
  if (typeof body === "string") return body;
  try {
    return JSON.stringify(body, null, 2);
  } catch {
    return String(body);
  }
}

export function MemoryTest({
  base,
  keyMask,
  lang,
  onSent,
  supported,
  words,
}: {
  /** Публичный адрес памяти — из запроса страницы, как у вкладки API (185-2). */
  base: string;
  /** Маска ключа памяти; сам ключ в браузер не уезжает никогда (закон 185). */
  keyMask: string | null;
  /**
   * Язык, на котором память скажет слова человеку (181-10). Называет его
   * зовущий: память не знает, кто её позвал.
   */
  lang: string;
  /** Стенд сообщает соседу внизу, что состав таблиц мог измениться (176-3). */
  onSent?: () => void;
  /**
   * Что договор принимает у `recall` и `remember` — порождено на сервере из
   * `contract.mjs` (183-1). Отсюда метки «доезжает / не доезжает» у органов:
   * рукописный список поддержанного разошёлся бы с договором молча.
   */
  supported: { recall: readonly string[]; remember: readonly string[] };
  words: Words;
}) {
  const [mode, setMode] = useState<Exclude<BenchMode, "raw">>("say");
  const [text, setText] = useState("");
  const [params, setParams] = useState<BenchParams>(EMPTY_PARAMS);
  const [people, setPeople] = useState<string[]>([]);
  const [peopleLoading, setPeopleLoading] = useState(true);
  const [shots, setShots] = useState<Shot[]>([]);
  const [busy, setBusy] = useState(false);
  // 🔒 НИТЬ ИЗ ПОСЛЕДНЕГО ОТВЕТА ПАМЯТИ ЖИВЁТ ЗДЕСЬ (184-4): 36 знаков руками не набирают.
  const [lastThread, setLastThread] = useState<string | null>(null);
  const nextId = useRef(1);

  // 🔒 КОГО ПАМЯТЬ ЗНАЕТ — СПРАШИВАЕМ У НЕЁ ЖЕ. Список людей — данные для органа
  // «от чьего имени», а не вход стенда: человек его не вызывает.
  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const r = await fetch("/api/fractera/memory-test", {
          body: JSON.stringify({ body: { lang }, method: "people" }),
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          method: "POST",
        });
        const data = (await r.json()) as { body?: { people?: Array<{ who?: string } | string> } };
        const list = (data?.body?.people ?? [])
          .map((p) => (typeof p === "string" ? p : p?.who))
          .filter((p): p is string => typeof p === "string" && p.length > 0);
        if (alive) setPeople(list);
      } catch {
        // 🛑 НЕ ОТВЕТИЛА — СПИСОК ПУСТ, А СЛУЖЕБНОЕ ИМЯ СТЕНДА НА МЕСТЕ: стенд чаще
        // всего открывают именно тогда, когда память молчит.
      } finally {
        if (alive) setPeopleLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [lang]);

  const patch = useCallback((p: Partial<BenchParams>) => {
    setParams((old: BenchParams) => ({ ...old, ...p }));
  }, []);

  // 🔒 ТО, ЧТО ПОКАЗАНО, И ТО, ЧТО ОТПРАВЛЕНО, — ОДНА И ТА ЖЕ СБОРКА. Второй путь
  // сборки тела разошёлся бы с первым, и панель начала бы врать первой.
  const preview = buildCall({
    lang,
    mode,
    params,
    supported: mode === "say" ? supported.remember : supported.recall,
    text,
  });

  const send = useCallback(async () => {
    if (busy) return;
    if (mode === "say" && !text.trim()) return;
    // 🔒 ССЫЛКА НЕ СВОЕГО РОДА НЕ УХОДИТ (200-5): кнопка заперта, причина названа под панелью.
    if (preview.invalid.length) return;
    const asked = mode === "say" ? text.trim() : text.trim() || "(без вопроса — всё, что известно)";

    setBusy(true);
    const started = Date.now();
    try {
      // 🔒 ФАЙЛЫ — ФОРМОЙ (200-5): часть `payload` — то же JSON-тело, части `files` — файлы. Заголовок `Content-Type`
      // руками не ставится: границу частей ставит браузер, без неё дверь тела не разберёт.
      let init: RequestInit;
      if (preview.files.length) {
        const form = new FormData();
        form.append("payload", JSON.stringify(preview.body));
        for (const f of preview.files) form.append("files", f);
        init = { body: form, cache: "no-store", method: "POST" };
      } else {
        init = {
          body: JSON.stringify({ body: preview.body, method: preview.method }),
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          method: "POST",
        };
      }
      const r = await fetch(
        preview.files.length ? "/api/fractera/memory-test?method=remember" : "/api/fractera/memory-test",
        init
      );
      // 🛑 ЧИТАЕМ ТЕЛО, А НЕ КОД: дверь отвечает `200`, а код `/v1` лежит внутри.
      const text_ = await r.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(text_);
      } catch {
        parsed = { raw: text_.slice(0, 2000) };
      }
      const answer = parsed as {
        body?: unknown;
        ms?: number;
        request?: { url?: string };
        status?: number;
        trouble?: string | null;
      };
      // 🔒 ИМЯ НИТИ ВЫНИМАЕТСЯ ИЗ ОТВЕТА СРАЗУ: оно приходит только там.
      const gotThread = (answer?.body as { thread?: unknown } | undefined)?.thread;
      if (typeof gotThread === "string" && gotThread) setLastThread(gotThread);
      setShots((s) => [
        {
          asked,
          at: new Date().toLocaleTimeString(),
          body: answer?.body ?? parsed,
          id: nextId.current++,
          method: preview.method,
          ms: typeof answer?.ms === "number" ? answer.ms : Date.now() - started,
          status: typeof answer?.status === "number" ? answer.status : r.status,
          trouble: answer?.trouble ?? null,
          url: answer?.request?.url ?? null,
        },
        ...s,
      ]);
      // 🔒 ЧТЕНИЕ ТАБЛИЦ НЕ МЕНЯЕТ, И ПОСЛЕ «СПРОСИТЬ» ОНИ НЕ ПЕРЕЧИТЫВАЮТСЯ (176-3).
      if (preview.method !== "recall") onSent?.();
    } catch (e) {
      setShots((s) => [
        {
          asked,
          at: new Date().toLocaleTimeString(),
          body: null,
          id: nextId.current++,
          method: preview.method,
          ms: Date.now() - started,
          status: 0,
          trouble: `${words.failed}: ${String((e as Error).message)}`,
          url: null,
        },
        ...s,
      ]);
    } finally {
      setBusy(false);
    }
  }, [busy, mode, onSent, preview, text, words.failed]);

  const modeButton = (id: Exclude<BenchMode, "raw">, label: string) => (
    <button
      className={`rounded-md border px-3 py-1 text-[length:var(--fs-small)] transition-colors ${
        mode === id
          ? "border-primary bg-primary text-primary-foreground"
          : "border-muted-foreground/30 hover:bg-muted"
      }`}
      data-mode={id}
      onClick={() => setMode(id)}
      type="button"
    >
      {label}
    </button>
  );

  return (
    <section className="space-y-3">
      <p className="text-[length:var(--fs-small)] text-muted-foreground">{words.lead}</p>

      {/* 🔒 РАСШИРЕННЫЕ ПАРАМЕТРЫ — У КАЖДОГО ИЗ ДВУХ ГЛАГОЛОВ СВОИ: метка «доезжает»
          берётся из договора для выбранного глагола (183-1). */}
      <BenchControls
        lastThread={lastThread}
        onChange={patch}
        params={params}
        people={people}
        peopleLoading={peopleLoading}
        supported={mode === "say" ? supported.remember : supported.recall}
        words={words.controls}
      />

      {/* 🔒 ВЫСОТА — ОПРЕДЕЛЁННАЯ У СЕТКИ И ПРЕДЕЛЬНАЯ У КОЛОНОК (181-11): `max-height`
          на сетке строку `auto` не сжимает, и колонка вырастает наружу. */}
      <div className="grid gap-3 md:h-[600px] md:grid-cols-2">
        {/* ЛЕВАЯ КОЛОНКА — ВВОД И ЛЕНТА ОТПРАВЛЕННОГО */}
        <div className="flex max-h-[70vh] min-h-0 flex-col overflow-hidden rounded-md border border-muted-foreground/30 md:max-h-none">
          <div className="border-b border-muted-foreground/20 px-3 py-2 text-[length:var(--fs-small)] font-medium">
            {words.inputTitle}
          </div>

          <div className="max-h-[70%] shrink-0 space-y-2 overflow-y-auto border-b border-muted-foreground/20 p-3">
            <div className="flex flex-wrap gap-2">
              {modeButton("say", words.say)}
              {modeButton("ask", words.ask)}
            </div>
            <p className="text-[length:var(--fs-small)] text-muted-foreground">
              {mode === "say" ? words.sayHint : words.askHint}
            </p>

            <textarea
              aria-label={words.inputTitle}
              className="h-24 w-full resize-y rounded-md border border-muted-foreground/30 bg-transparent px-2 py-1 text-[length:var(--fs-small)]"
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") void send();
              }}
              value={text}
            />

            {/* 🔒 ПАНЕЛЬ «ЧТО УЕДЕТ» — ПРИБОР ЧЕСТНОСТИ (183-1): адрес, заголовки и
                тело публичного API, как их отправит дверь стенда (200-1). */}
            <div className="space-y-1" data-testid="what-goes">
              <div className="text-[length:var(--fs-small)] font-medium">{words.whatGoes}</div>
              <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-md bg-muted px-2 py-1 font-mono text-[length:var(--fs-small)]">
                {[
                  `POST ${base}/v1/${preview.method}`,
                  `content-type: ${preview.files.length ? "multipart/form-data" : "application/json"}`,
                  `x-memory-key: ${keyMask ?? words.keyMissing}`,
                  "",
                  JSON.stringify(preview.body, null, 2),
                  ...preview.files.map((f) => `files: ${f.name} · ${f.size} B`),
                ].join("\n")}
              </pre>
              {preview.dropped.length ? (
                <p className="text-[length:var(--fs-small)] text-muted-foreground">
                  {words.droppedTitle}: {preview.dropped.join(", ")}
                </p>
              ) : null}
              {preview.invalid.length ? (
                <p className="text-[length:var(--fs-small)] text-destructive" data-testid="invalid-links">
                  {words.controls.attach.blocked}: {preview.invalid.join(", ")}
                </p>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              <Button disabled={busy || preview.invalid.length > 0} onClick={() => void send()} size="sm" type="button">
                {busy ? words.sending : words.send}
              </Button>
              <span className="text-[length:var(--fs-small)] text-muted-foreground">⌘/Ctrl + Enter</span>
            </div>
          </div>

          {/* 🔒 ЛЕНТА ЖИВЁТ В БРАУЗЕРЕ, И ЭТО СКАЗАНО СЛОВАМИ. */}
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {shots.length === 0 ? (
              <p className="text-[length:var(--fs-small)] text-muted-foreground">{words.nothingSent}</p>
            ) : (
              <ol className="space-y-2">
                {shots.map((s) => (
                  <li className="rounded-md border border-muted-foreground/20 px-2 py-1" key={s.id}>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-mono text-[length:var(--fs-small)] text-muted-foreground">{s.method}</span>
                      <span className="text-[length:var(--fs-small)] text-muted-foreground">{s.at}</span>
                    </div>
                    <div className="whitespace-pre-wrap break-words text-[length:var(--fs-small)]">{s.asked}</div>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <div className="border-t border-muted-foreground/20 px-3 py-1 text-[length:var(--fs-small)] text-muted-foreground">
            {words.volatile}
          </div>
        </div>

        {/* ПРАВАЯ КОЛОНКА — ОТВЕТ ПАМЯТИ ДОСЛОВНО */}
        <div className="flex max-h-[70vh] min-h-0 flex-col overflow-hidden rounded-md border border-muted-foreground/30 md:max-h-none">
          <div className="border-b border-muted-foreground/20 px-3 py-2 text-[length:var(--fs-small)] font-medium">
            {words.answerTitle}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {shots.length === 0 ? (
              <p className="text-[length:var(--fs-small)] text-muted-foreground">{words.nothingYet}</p>
            ) : (
              <ol className="space-y-3">
                {shots.map((s) => (
                  <li key={s.id}>
                    <div className="mb-1 flex flex-wrap items-baseline gap-x-3 text-[length:var(--fs-small)] text-muted-foreground">
                      <span>
                        {words.status}: {s.status || "—"}
                      </span>
                      <span>
                        {words.took}: {s.ms} мс
                      </span>
                      <span>{s.at}</span>
                    </div>
                    {s.url ? (
                      <div className="mb-1 break-all font-mono text-[length:var(--fs-small)] text-muted-foreground">
                        POST {s.url}
                      </div>
                    ) : null}
                    {/* 🔒 ТЕКСТ ОТВЕТА — ПЕРЕЧИСЛЕНИЕ ФАКТОВ И ОБЪЕКТОВ (200-6) — СТОИТ НАД СЫРЫМ JSON: его и читает зовущая модель. */}
                    {typeof (s.body as { text?: unknown } | null)?.text === "string" ? (
                      <p
                        className="mb-1 whitespace-pre-wrap break-words rounded-md border border-muted-foreground/20 px-2 py-1 text-[length:var(--fs-small)]"
                        data-testid="answer-text"
                      >
                        {(s.body as { text: string }).text}
                      </p>
                    ) : null}
                    {((s.body as { objects?: unknown[] } | null)?.objects ?? []).length > 0 ? (
                      <ul className="mb-1 space-y-0.5" data-testid="attachment-fates">
                        {(s.body as { objects: Array<Record<string, unknown>> }).objects.map((o, k) => (
                          <li
                            className={`font-mono text-[length:var(--fs-small)] ${o.ok ? "" : "text-destructive"}`}
                            key={k}
                          >
                            {o.ok ? "✓" : "✗"} {String(o.title ?? o.name ?? o.url ?? "")} —{" "}
                            {o.ok
                              ? `${String(o.kind ?? "")} · messageId ${String(o.messageId ?? "—")}${o.id ? ` · id ${String(o.id)}` : ""}${o.existing ? " · existing" : ""}`
                              : String(o.error ?? "")}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {s.trouble ? (
                      <p className="rounded-md border border-destructive/40 px-2 py-1 text-[length:var(--fs-small)] text-destructive">
                        {s.trouble}
                      </p>
                    ) : (
                      <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-md bg-muted px-2 py-1 font-mono text-[length:var(--fs-small)]">
                        {show(s.body)}
                      </pre>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
