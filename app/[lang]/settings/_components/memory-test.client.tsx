"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { BenchControls, type BenchControlWords } from "./memory-test-controls.client";
import { buildCall, EMPTY_PARAMS } from "@/lib/bench-call.mjs";
import type { BenchMode, BenchParams } from "@/lib/bench-call.mjs";

// СТЕНД ПАМЯТИ — ВЕРХНЯЯ ПОЛОВИНА РАЗДЕЛА (176-2, перестроен 183-1).
//
// 🔒 ЗАЧЕМ ОН ЕСТЬ: ЧТОБЫ ИЗМЕРЯТЬ ПАМЯТЬ, А НЕ СУММУ «ПАМЯТЬ ПЛЮС АГЕНТ».
// ✗ оплачено разбором 2026-09-10: на вопрос «что ты знаешь обо мне» от нажатия
// «отправить» до ответа прошло 2 мин 13 с, и к самой памяти относились СЕКУНДЫ.
// Остальное съели перезапуск агента и два его промаха с именами инструментов.
// Пока в цепочке стоит агент, измеряется не память.
//
// 🔒 ОТВЕТ ПОКАЗЫВАЕТСЯ ДОСЛОВНО, А НЕ ПЕРЕСКАЗОМ. Сводка вместо тела ответа —
// ровно та потеря, из-за которой цепочку пришлось восстанавливать по журналу
// сессии: видимого следа не осталось нигде.
//
// 🔒 ВРЕМЯ СТОИТ РЯДОМ С ОТВЕТОМ. Разбор фразы идёт 6–10 секунд, потому что
// думает Opus; без числа это неотличимо от зависшей страницы.
//
// 🔒 ЧТО ДОБАВИЛ 183-1 И ПОЧЕМУ ЭТО НЕ УКРАШЕНИЕ: девять органов управления
// раздела 13 паспорта плюс панель «что уедет». Стенд обязан уметь всё, что
// умеет зовущая модель, — иначе он проверяет не тот путь. А панель отвечает на
// вопрос, который до неё был неразрешим: память проигнорировала параметр или
// стенд его не послал?

type Words = {
  lead: string;
  say: string;
  ask: string;
  raw: string;
  sayHint: string;
  askHint: string;
  rawHint: string;
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
  lang,
  onSent,
  supported,
  words,
}: {
  /**
   * Язык, на котором память скажет слова человеку (181-10).
   *
   * 🔒 ЯЗЫК НАЗЫВАЕТ ЗОВУЩИЙ, А НЕ УГАДЫВАЕТ СЛУЖБА: память не знает, кто её
   * позвал. Здесь это язык страницы — тот же, на котором человек читает всё
   * остальное вокруг стенда.
   */
  lang: string;
  /** Стенд сообщает соседу внизу, что состав таблиц мог измениться (176-3). */
  onSent?: () => void;
  /**
   * Что договор принимает у каждого глагола — порождено из `contract.mjs`
   * на сервере (183-1).
   *
   * 🔒 ОТСЮДА МЕТКИ У ОРГАНОВ И ОТСЮДА ЖЕ СПИСОК «НЕ ДОЕЗЖАЕТ». Рукописный
   * список поддержанного разошёлся бы с договором молча.
   */
  supported: { recall: readonly string[]; remember: readonly string[] };
  words: Words;
}) {
  const [mode, setMode] = useState<BenchMode>("say");
  const [text, setText] = useState("");
  const [method, setMethod] = useState("recall");
  const [rawBody, setRawBody] = useState('{\n  "who": "bench-1"\n}');
  const [params, setParams] = useState<BenchParams>(EMPTY_PARAMS);
  const [people, setPeople] = useState<string[]>([]);
  const [peopleLoading, setPeopleLoading] = useState(true);
  const [shots, setShots] = useState<Shot[]>([]);
  const [busy, setBusy] = useState(false);
  const nextId = useRef(1);

  // 🔒 КОГО ПАМЯТЬ ЗНАЕТ — СПРАШИВАЕМ У НЕЁ ЖЕ, А НЕ ДЕРЖИМ СПИСОК НА ЭКРАНЕ.
  // Метод `people` для того и заведён: наружу уходят ЛЮДИ, а не таблицы.
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
        // 🛑 НЕ ОТВЕТИЛА — СПИСОК ОСТАЁТСЯ ПУСТЫМ, А СЛУЖЕБНОЕ ИМЯ СТЕНДА НА
        // МЕСТЕ. Стенд обязан работать и тогда, когда память молчит: именно в
        // этом состоянии его чаще всего и открывают.
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

  // 🔒 ТО, ЧТО ПОКАЗАНО, И ТО, ЧТО ОТПРАВЛЕНО, — ОДНА И ТА ЖЕ СБОРКА. Второй
  // путь сборки тела разошёлся бы с первым, и панель начала бы врать первой.
  const preview = buildCall({
    lang,
    mode,
    params,
    supported: mode === "say" ? supported.remember : supported.recall,
    text,
  });

  const send = useCallback(async () => {
    if (busy) return;

    let sendMethod = preview.method;
    let sendBody: unknown = preview.body;
    let asked = "";

    if (mode === "say") {
      if (!text.trim()) return;
      asked = text.trim();
    } else if (mode === "ask") {
      asked = text.trim() || "(без вопроса — всё, что известно)";
    } else {
      sendMethod = method;
      try {
        // 🔒 СЫРОЙ ВЫЗОВ УЕЗЖАЕТ РОВНО ТАКИМ, КАКИМ ЕГО НАБРАЛИ, — ни язык, ни
        // органы управления сюда не дописываются. Это единственное место стенда,
        // где человек говорит с договором напрямую; подставив своё, стенд
        // перестал бы показывать то, что он отправляет.
        sendBody = rawBody.trim() ? JSON.parse(rawBody) : {};
      } catch {
        // 🛑 КРИВОЙ JSON — ОТВЕТ СТЕНДА, А НЕ МОЛЧАНИЕ. Пропущенная отправка без
        // следа читается как «служба не ответила», и виноватой выглядит память.
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
          },
          ...s,
        ]);
        return;
      }
      asked = `${sendMethod} ← ${rawBody.trim().replace(/\s+/g, " ").slice(0, 120)}`;
    }

    setBusy(true);
    const started = Date.now();
    try {
      const r = await fetch("/api/fractera/memory-test", {
        body: JSON.stringify({ body: sendBody, method: sendMethod }),
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      // 🛑 ЧИТАЕМ ТЕЛО, А НЕ КОД: и наша дверь, и память отвечают `200` с
      // `ok:false`. Довериться коду значило бы объявить успехом отказ.
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
        status?: number;
        trouble?: string | null;
      };
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
        },
        ...s,
      ]);
      if (sendMethod !== "recall") onSent?.();
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
        },
        ...s,
      ]);
    } finally {
      setBusy(false);
    }
  }, [busy, method, mode, onSent, preview, rawBody, text, words.failed]);

  const modeButton = (id: BenchMode, label: string) => (
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
    mode === "say" ? words.sayHint : mode === "ask" ? words.askHint : words.rawHint;

  return (
    <section className="space-y-3">
      <p className="text-[length:var(--fs-small)] text-muted-foreground">{words.lead}</p>

      {/* 🔒 ВЫСОТА ОГРАНИЧЕНА У СТЕНДА, А ПРОКРУТКА ЖИВЁТ ВНУТРИ КОЛОНОК.
          Заказ владельца дословно: «максимальной высотой 600 пикселей и
          внутренней прокруткой». Прокрути мы страницу целиком — ввод уезжал бы
          за край ровно тогда, когда нужен: при чтении длинного ответа.

          🛑 БЫЛО `style={{ maxHeight: 600 }}` — И ЭТО НЕ РАБОТАЛО (181-11, находка
          владельца: «когда ответ в правой карточке достаточно большой она выходит
          за габариты своего контейнера»). Механизм: у сетки строка высотой `auto`,
          то есть ПО СОДЕРЖИМОМУ; `max-height` на самой сетке такую строку не
          сжимает, и колонка вырастает наружу, а внутренняя прокрутка не
          включается — ей нечего ограничивать.
          🔒 ЛЕЧЕНИЕ — ОПРЕДЕЛЁННАЯ ВЫСОТА, А НЕ ПРЕДЕЛЬНАЯ: `md:h-[600px]` даёт
          строке точный размер, колонки растягиваются на неё, и `min-h-0 flex-1
          overflow-y-auto` внутри каждой начинает прокручивать. На узком экране
          колонки идут одна под другой, и общая высота там была бы вредна —
          поэтому предел ставится каждой колонке отдельно, `max-h-[70vh]`.
          🔒 ОБЕ КОЛОНКИ ЛЕЧАТСЯ ОДИНАКОВО, хотя переполнение заметили в правой:
          лента отправленного растёт так же, просто медленнее.
          🔒 С 183-1 ВЫСОТА ОТДАНА ТОЛЬКО ДВУМ КОЛОНКАМ, а органы управления и
          панель «что уедет» стоят НАД ними: втиснутые внутрь, они съели бы то
          самое место, ради которого предел и ставился. */}

      {mode === "raw" ? null : (
        <BenchControls
          onChange={patch}
          params={params}
          people={people}
          peopleLoading={peopleLoading}
          supported={mode === "say" ? supported.remember : supported.recall}
          words={words.controls}
        />
      )}

      <div className="grid gap-3 md:h-[600px] md:grid-cols-2">
        {/* ЛЕВАЯ КОЛОНКА — ВВОД И ЛЕНТА ОТПРАВЛЕННОГО */}
        <div className="flex max-h-[70vh] min-h-0 flex-col overflow-hidden rounded-md border border-muted-foreground/30 md:max-h-none">
          <div className="border-b border-muted-foreground/20 px-3 py-2 text-[length:var(--fs-small)] font-medium">
            {words.inputTitle}
          </div>

          <div className="space-y-2 border-b border-muted-foreground/20 p-3">
            <div className="flex flex-wrap gap-2">
              {modeButton("say", words.say)}
              {modeButton("ask", words.ask)}
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

            {/* 🔒 ПАНЕЛЬ «ЧТО УЕДЕТ» — НЕ ОРГАН, А ПРИБОР ЧЕСТНОСТИ (183-1).
                Без неё «память проигнорировала параметр» неотличимо от «стенд
                его не послал», и виноватой всегда выглядит память. */}
            {mode === "raw" ? null : (
              <div className="space-y-1">
                <div className="text-[length:var(--fs-small)] font-medium">{words.whatGoes}</div>
                <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-md bg-muted px-2 py-1 font-mono text-[length:var(--fs-small)]">
                  {JSON.stringify({ body: preview.body, method: preview.method }, null, 2)}
                </pre>
                {preview.dropped.length ? (
                  <p className="text-[length:var(--fs-small)] text-muted-foreground">
                    {words.droppedTitle}: {preview.dropped.join(", ")}
                  </p>
                ) : null}
              </div>
            )}

            <div className="flex items-center gap-2">
              <Button disabled={busy} onClick={() => void send()} size="sm" type="button">
                {busy ? words.sending : words.send}
              </Button>
              <span className="text-[length:var(--fs-small)] text-muted-foreground">
                ⌘/Ctrl + Enter
              </span>
            </div>
          </div>

          {/* 🔒 ЛЕНТА ЖИВЁТ В БРАУЗЕРЕ, И ЭТО СКАЗАНО СЛОВАМИ. Молчаливая
              пропажа проб после перезагрузки читается как дефект. */}
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
