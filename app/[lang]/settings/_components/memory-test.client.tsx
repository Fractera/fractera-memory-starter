"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { BenchControls, type BenchControlWords } from "./memory-test-controls.client";
import { CallForm, type CallFormWords } from "./memory-call-form.client";
import { buildCall, EMPTY_PARAMS } from "@/lib/bench-call.mjs";
import type { BenchMode, BenchParams } from "@/lib/bench-call.mjs";
import { buildContractCall, type CallTarget } from "@/lib/contract-call.mjs";

// СТЕНД ПАМЯТИ — ВЕРХНЯЯ ПОЛОВИНА РАЗДЕЛА (176-2, перестроен 183-1, 200-2).
//
// 🔒 ЗАЧЕМ ОН ЕСТЬ: ЧТОБЫ ИЗМЕРЯТЬ ПАМЯТЬ, А НЕ СУММУ «ПАМЯТЬ ПЛЮС АГЕНТ».
// ✗ оплачено разбором 2026-09-10: на вопрос «что ты знаешь обо мне» от нажатия
// «отправить» до ответа прошло 2 мин 13 с, и к самой памяти относились СЕКУНДЫ.
//
// 🔒 С 200-1 КАЖДЫЙ ВЫЗОВ ИДЁТ В ПУБЛИЧНЫЙ API `/v1/*` — тем же путём, что у любой
// программы. Панель «что уедет» показывает адрес, заголовки (ключ маской) и тело
// ровно так, как их отправит дверь стенда.
//
// 🔒 С 200-2 У СТЕНДА ЧЕТЫРЕ ВХОДА: «Сказать» и «Спросить» — быстрые входы в
// `remember` и `recall`; «Метод договора» — любой метод и адрес каталога с формой,
// порождённой из договора; «Сырой вызов» — любое имя и тело JSON как набрано.
//
// 🔒 ОТВЕТ ПОКАЗЫВАЕТСЯ ДОСЛОВНО, И ВРЕМЯ СТОИТ РЯДОМ С НИМ: разбор фразы идёт
// секунды, потому что думает модель; без числа это неотличимо от зависшей страницы.

type Mode = BenchMode | "method";

type Words = {
  lead: string;
  say: string;
  ask: string;
  raw: string;
  method: string;
  sayHint: string;
  askHint: string;
  rawHint: string;
  methodHint: string;
  rawMethod: string;
  rawBody: string;
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
  /** Нет файла ключа — вызов уйдёт без ключа и получит отказ договора (200-2). */
  keyMissing: string;
  missingTitle: string;
  badTitle: string;
  controls: BenchControlWords;
  call: CallFormWords;
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
  verb: string;
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
  targets,
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
  /** Что договор принимает у `recall` и `remember` — для быстрых входов (183-1). */
  supported: { recall: readonly string[]; remember: readonly string[] };
  /** Все методы и адреса каталога — порождены на сервере из `contract.mjs` (200-2). */
  targets: CallTarget[];
  words: Words;
}) {
  const [mode, setMode] = useState<Mode>("say");
  const [text, setText] = useState("");
  const [method, setMethod] = useState("recall");
  const [rawBody, setRawBody] = useState('{\n  "who": "bench-1"\n}');
  const [params, setParams] = useState<BenchParams>(EMPTY_PARAMS);
  const [targetId, setTargetId] = useState(targets[0]?.id ?? "");
  // 🔒 ЗНАЧЕНИЯ ФОРМЫ ЖИВУТ ПО ИМЕНИ ПАРАМЕТРА, А НЕ ПО МЕТОДУ: `who` и `lang`,
  // выбранные у одного метода, остаются у соседнего — человек не набирает их заново.
  const [callValues, setCallValues] = useState<Record<string, unknown>>({ lang, who: "bench-1" });
  const [people, setPeople] = useState<string[]>([]);
  const [peopleLoading, setPeopleLoading] = useState(true);
  const [shots, setShots] = useState<Shot[]>([]);
  const [busy, setBusy] = useState(false);
  // 🔒 НИТЬ ИЗ ПОСЛЕДНЕГО ОТВЕТА ПАМЯТИ ЖИВЁТ ЗДЕСЬ (184-4): 36 знаков руками не набирают.
  const [lastThread, setLastThread] = useState<string | null>(null);
  const nextId = useRef(1);

  // 🔒 КОГО ПАМЯТЬ ЗНАЕТ — СПРАШИВАЕМ У НЕЁ ЖЕ, методом `people` через публичный API.
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

  const setCallValue = useCallback((name: string, value: unknown) => {
    setCallValues((old) => ({ ...old, [name]: value }));
  }, []);

  // 🔒 ТО, ЧТО ПОКАЗАНО, И ТО, ЧТО ОТПРАВЛЕНО, — ОДНА И ТА ЖЕ СБОРКА. Второй путь
  // сборки тела разошёлся бы с первым, и панель начала бы врать первой.
  const preview = buildCall({
    lang,
    mode: mode === "method" ? "ask" : mode,
    params,
    supported: mode === "say" ? supported.remember : supported.recall,
    text,
  });
  const target = targets.find((t) => t.id === targetId) ?? targets[0];
  const contractCall = mode === "method" && target ? buildContractCall(target, callValues) : null;

  // Что покажет панель «что уедет» — адрес и тело так, как их отправит дверь.
  const shownVerb = contractCall ? contractCall.verb : "POST";
  const shownPath = contractCall
    ? contractCall.path
    : `/v1/${mode === "raw" ? method.trim() || "…" : preview.method}`;
  const shownBody = contractCall ? contractCall.body : mode === "raw" ? null : preview.body;

  const send = useCallback(async () => {
    if (busy) return;

    let sendMethod = preview.method;
    let doorPayload: unknown = { body: preview.body, method: preview.method };
    let verb = "POST";
    let asked = "";

    if (mode === "say") {
      if (!text.trim()) return;
      asked = text.trim();
    } else if (mode === "ask") {
      asked = text.trim() || "(без вопроса — всё, что известно)";
    } else if (mode === "method") {
      if (!contractCall || !target) return;
      verb = contractCall.verb;
      sendMethod = target.id;
      doorPayload = contractCall.door;
      const bodyLine = contractCall.body ? ` ← ${JSON.stringify(contractCall.body).slice(0, 160)}` : "";
      asked = `${contractCall.verb} ${contractCall.path}${bodyLine}`;
    } else {
      sendMethod = method;
      let parsed: unknown;
      try {
        // 🔒 СЫРОЙ ВЫЗОВ УЕЗЖАЕТ РОВНО ТАКИМ, КАКИМ ЕГО НАБРАЛИ, — ни язык, ни
        // органы управления сюда не дописываются.
        parsed = rawBody.trim() ? JSON.parse(rawBody) : {};
      } catch {
        // 🛑 КРИВОЙ JSON — ОТВЕТ СТЕНДА, А НЕ МОЛЧАНИЕ.
        setShots((s) => [
          {
            asked: rawBody.slice(0, 200),
            at: new Date().toLocaleTimeString(),
            body: null,
            id: nextId.current++,
            method: sendMethod,
            ms: 0,
            status: 0,
            trouble: "тело запроса — не JSON, до памяти не отправляли",
            url: null,
            verb,
          },
          ...s,
        ]);
        return;
      }
      doorPayload = { body: parsed, method: sendMethod };
      asked = `${sendMethod} ← ${rawBody.trim().replace(/\s+/g, " ").slice(0, 120)}`;
    }

    setBusy(true);
    const started = Date.now();
    try {
      const r = await fetch("/api/fractera/memory-test", {
        body: JSON.stringify(doorPayload),
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
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
        request?: { method?: string; url?: string };
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
          method: sendMethod,
          ms: typeof answer?.ms === "number" ? answer.ms : Date.now() - started,
          status: typeof answer?.status === "number" ? answer.status : r.status,
          trouble: answer?.trouble ?? null,
          url: answer?.request?.url ?? null,
          verb: answer?.request?.method ?? verb,
        },
        ...s,
      ]);
      // 🔒 ЧТЕНИЕ ТАБЛИЦ НЕ МЕНЯЕТ, И ПОСЛЕ НЕГО ОНИ НЕ ПЕРЕЧИТЫВАЮТСЯ (176-3).
      if (verb !== "GET" && sendMethod !== "recall") onSent?.();
    } catch (e) {
      setShots((s) => [
        {
          asked,
          at: new Date().toLocaleTimeString(),
          body: null,
          id: nextId.current++,
          method: sendMethod,
          ms: Date.now() - started,
          status: 0,
          trouble: `${words.failed}: ${String((e as Error).message)}`,
          url: null,
          verb,
        },
        ...s,
      ]);
    } finally {
      setBusy(false);
    }
  }, [busy, contractCall, method, mode, onSent, preview, rawBody, target, text, words.failed]);

  const modeButton = (id: Mode, label: string) => (
    <button
      className={`rounded-md border px-3 py-1 text-[length:var(--fs-small)] transition-colors ${
        mode === id
          ? "border-primary bg-primary text-primary-foreground"
          : "border-muted-foreground/30 hover:bg-muted"
      }`}
      onClick={() => setMode(id)}
      type="button"
    >
      {label}
    </button>
  );

  const hint =
    mode === "say"
      ? words.sayHint
      : mode === "ask"
        ? words.askHint
        : mode === "method"
          ? words.methodHint
          : words.rawHint;

  return (
    <section className="space-y-3">
      <p className="text-[length:var(--fs-small)] text-muted-foreground">{words.lead}</p>

      {/* 🔒 ОРГАНЫ УПРАВЛЕНИЯ — У БЫСТРЫХ ВХОДОВ. У «Метода договора» свои поля в
          самой форме, у «Сырого вызова» — тело как набрано. */}
      {mode === "say" || mode === "ask" ? (
        <BenchControls
          lastThread={lastThread}
          onChange={patch}
          params={params}
          people={people}
          peopleLoading={peopleLoading}
          supported={mode === "say" ? supported.remember : supported.recall}
          words={words.controls}
        />
      ) : null}

      {/* 🔒 ВЫСОТА — ОПРЕДЕЛЁННАЯ У СЕТКИ И ПРЕДЕЛЬНАЯ У КОЛОНОК (181-11): `max-height`
          на сетке строку `auto` не сжимает, и колонка вырастает наружу. */}
      <div className="grid gap-3 md:h-[600px] md:grid-cols-2">
        {/* ЛЕВАЯ КОЛОНКА — ВВОД И ЛЕНТА ОТПРАВЛЕННОГО */}
        <div className="flex max-h-[70vh] min-h-0 flex-col overflow-hidden rounded-md border border-muted-foreground/30 md:max-h-none">
          <div className="border-b border-muted-foreground/20 px-3 py-2 text-[length:var(--fs-small)] font-medium">
            {words.inputTitle}
          </div>

          {/* 🔒 ВВОД ПРОКРУЧИВАЕТСЯ ВНУТРИ СЕБЯ: у `keep_object` одиннадцать полей, и
              без предела форма вытолкнула бы ленту отправленного за край колонки. */}
          <div className="max-h-[70%] shrink-0 space-y-2 overflow-y-auto border-b border-muted-foreground/20 p-3">
            <div className="flex flex-wrap gap-2">
              {modeButton("say", words.say)}
              {modeButton("ask", words.ask)}
              {modeButton("method", words.method)}
              {modeButton("raw", words.raw)}
            </div>
            <p className="text-[length:var(--fs-small)] text-muted-foreground">{hint}</p>

            {mode === "raw" ? (
              <div className="space-y-2">
                <input
                  aria-label={words.rawMethod}
                  className="w-full rounded-md border border-muted-foreground/30 bg-transparent px-2 py-1 font-mono text-[length:var(--fs-small)]"
                  onChange={(e) => setMethod(e.target.value)}
                  placeholder={words.rawMethod}
                  value={method}
                />
                <textarea
                  aria-label={words.rawBody}
                  className="h-28 w-full resize-y rounded-md border border-muted-foreground/30 bg-transparent px-2 py-1 font-mono text-[length:var(--fs-small)]"
                  onChange={(e) => setRawBody(e.target.value)}
                  spellCheck={false}
                  value={rawBody}
                />
              </div>
            ) : mode === "method" ? (
              <CallForm
                bad={contractCall?.bad ?? []}
                controls={words.controls}
                lastThread={lastThread}
                onTarget={setTargetId}
                onValue={setCallValue}
                people={people}
                targetId={targetId}
                targets={targets}
                values={callValues}
                words={words.call}
              />
            ) : (
              <textarea
                aria-label={words.inputTitle}
                className="h-24 w-full resize-y rounded-md border border-muted-foreground/30 bg-transparent px-2 py-1 text-[length:var(--fs-small)]"
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") void send();
                }}
                value={text}
              />
            )}

            {/* 🔒 ПАНЕЛЬ «ЧТО УЕДЕТ» — ПРИБОР ЧЕСТНОСТИ (183-1): адрес, заголовки и
                тело публичного API, как их отправит дверь стенда (200-1). */}
            <div className="space-y-1" data-testid="what-goes">
              <div className="text-[length:var(--fs-small)] font-medium">{words.whatGoes}</div>
              <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-md bg-muted px-2 py-1 font-mono text-[length:var(--fs-small)]">
                {[
                  `${shownVerb} ${base}${shownPath}`,
                  ...(shownVerb === "POST" ? ["content-type: application/json"] : []),
                  `x-memory-key: ${keyMask ?? words.keyMissing}`,
                  ...(shownBody ? ["", JSON.stringify(shownBody, null, 2)] : []),
                ].join("\n")}
              </pre>
              {(mode === "say" || mode === "ask") && preview.dropped.length ? (
                <p className="text-[length:var(--fs-small)] text-muted-foreground">
                  {words.droppedTitle}: {preview.dropped.join(", ")}
                </p>
              ) : null}
              {contractCall?.missing.length ? (
                <p className="text-[length:var(--fs-small)] text-muted-foreground">
                  {words.missingTitle}: {contractCall.missing.join(", ")}
                </p>
              ) : null}
              {contractCall?.bad.length ? (
                <p className="text-[length:var(--fs-small)] text-destructive">
                  {words.badTitle}: {contractCall.bad.join(", ")}
                </p>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
              <Button disabled={busy} onClick={() => void send()} size="sm" type="button">
                {busy ? words.sending : words.send}
              </Button>
              <span className="text-[length:var(--fs-small)] text-muted-foreground">
                ⌘/Ctrl + Enter
              </span>
            </div>
          </div>

          {/* 🔒 ЛЕНТА ЖИВЁТ В БРАУЗЕРЕ, И ЭТО СКАЗАНО СЛОВАМИ. */}
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {shots.length === 0 ? (
              <p className="text-[length:var(--fs-small)] text-muted-foreground">
                {words.nothingSent}
              </p>
            ) : (
              <ol className="space-y-2">
                {shots.map((s) => (
                  <li
                    className="rounded-md border border-muted-foreground/20 px-2 py-1"
                    key={s.id}
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-mono text-[length:var(--fs-small)] text-muted-foreground">
                        {s.method}
                      </span>
                      <span className="text-[length:var(--fs-small)] text-muted-foreground">
                        {s.at}
                      </span>
                    </div>
                    <div className="whitespace-pre-wrap break-words text-[length:var(--fs-small)]">
                      {s.asked}
                    </div>
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
              <p className="text-[length:var(--fs-small)] text-muted-foreground">
                {words.nothingYet}
              </p>
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
                        {s.verb} {s.url}
                      </div>
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
