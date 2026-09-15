"use client";

// ОРГАНЫ УПРАВЛЕНИЯ СТЕНДА ПАМЯТИ — ДЕВЯТЬ ШТУК (183-1; мёртвая «Загрузка» снята 200-4, девятый — «Вложения», 200-5).
//
// 🔒 ЗАЧЕМ ОНИ ЗДЕСЬ ВООБЩЕ. Стенд — прибор, а не витрина: человек говорит со
// службой напрямую и видит сырой ответ. Значит стенд обязан уметь всё, что
// умеет зовущая модель, — иначе он проверяет НЕ ТОТ путь, и разница всплывает
// у бота, а не здесь.
//
// 🔒 НАРУЖУ ИДУТ СЛОВА, НОМЕРА УРОВНЕЙ ОСТАЮТСЯ ВНУТРИ (паспорт §12). Человеку
// «уровень 4» не говорит ничего, а «дольше и дороже» говорит всё.
//
// 🔒 ГЛАВНОЕ СВОЙСТВО ЭТОГО ФАЙЛА: ОН НЕ ЗНАЕТ, ЧТО ПАМЯТЬ УМЕЕТ СЕГОДНЯ.
// Метка «доезжает» / «пока не доезжает» у каждого органа берётся из ДОГОВОРА
// (`contract.mjs`), приезжающего пропсом со страницы. Рукописный список
// поддержанного разошёлся бы с договором молча — в этом проекте такое
// оплачено пять раз за две недели.

import { useState } from "react";
import type { BenchParams } from "@/lib/bench-call.mjs";
import { acceptOf, UPLOAD_KINDS } from "@/lib/kinds.mjs";
import { youtubeId } from "@/lib/youtube-chapters.mjs";

export type BenchControlWords = {
  title: string;
  /** Заголовок свёрнутой карточки и её счётчик выставленного (183-7). */
  advanced: string;
  setNow: string;
  nothingSet: string;
  /** Что метки значат — одной строкой над органами. */
  legend: string;
  supported: string;
  unsupported: string;
  depth: {
    label: string;
    standard: string;
    deep: string;
    extreme: string;
    standardHint: string;
    deepHint: string;
    extremeHint: string;
  };
  who: { label: string; hint: string; bench: string; loading: string };
  history: { label: string; hint: string; placeholder: string };
  prior: { label: string; hint: string; placeholder: string };
  /** Нить разбора: идентификатор прежнего размышления (184-4). */
  thread: { label: string; hint: string; placeholder: string; take: string };
  chain: { label: string; hint: string; on: string; off: string };
  scope: {
    label: string;
    hint: string;
    date: string;
    place: string;
    placePlaceholder: string;
    /** Слова списка записей охвата (183-7). */
    entry: string;
    add: string;
    remove: string;
  };
  deny: { label: string; hint: string; placeholder: string };
  needTable: { label: string; hint: string };
  /** Вложения «Сказать» (200-5): кнопки родов, две ссылки, слова проверки рода. */
  attach: {
    label: string;
    hint: string;
    kinds: Record<string, string>;
    remove: string;
    add: string;
    links: string;
    linksPlaceholder: string;
    youtube: string;
    youtubePlaceholder: string;
    linkIsYoutube: string;
    notYoutube: string;
    blocked: string;
  };
};

/** Метка у органа: доезжает ли параметр до договора сегодня. */
function Mark({ ok, words }: { ok: boolean; words: BenchControlWords }) {
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-[length:var(--fs-small)] ${
        ok
          ? "bg-muted text-muted-foreground"
          : "border border-dashed border-muted-foreground/40 text-muted-foreground"
      }`}
    >
      {ok ? words.supported : words.unsupported}
    </span>
  );
}

function Row({
  children,
  label,
  hint,
  ok,
  words,
}: {
  children: React.ReactNode;
  label: string;
  hint: string;
  ok: boolean;
  words: BenchControlWords;
}) {
  return (
    <div className="space-y-1 border-t border-muted-foreground/15 pt-3 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[length:var(--fs-small)] font-medium">{label}</span>
        <Mark ok={ok} words={words} />
      </div>
      <p className="text-[length:var(--fs-small)] text-muted-foreground">{hint}</p>
      {children}
    </div>
  );
}

const boxClass =
  "w-full rounded-md border border-muted-foreground/30 bg-transparent px-2 py-1 text-[length:var(--fs-small)]";

// ✗ ВЫПАДАЮЩИЙ СПИСОК НЕ ПРОЗРАЧНЫЙ, И ПРИЧИНА — ЧУЖОЕ ОКНО (находка владельца 2026-09-14: «i can not see light
// green text on white bg»). Раскрытый список рисует браузер сам, отдельным окном: при `bg-transparent` оно
// белое, а пункты наследуют светлый цвет текста тёмной страницы — и не читаются. Лечение токенами: фон и
// текст списка И ЕГО ПУНКТОВ названы явно, в тёмной теме `color-scheme: dark` делает тёмным само окно.
const selectClass =
  "w-full rounded-md border border-muted-foreground/30 bg-background px-2 py-1 text-foreground text-[length:var(--fs-small)] dark:[color-scheme:dark] [&_option]:bg-background [&_option]:text-foreground";

export function BenchControls({
  lastThread,
  onChange,
  params,
  people,
  peopleLoading,
  supported,
  words,
}: {
  /** Нить из последнего ответа памяти — чтобы её не набирали руками (184-4). */
  lastThread: string | null;
  onChange: (patch: Partial<BenchParams>) => void;
  params: BenchParams;
  /** Кого память знает — спрошено у неё же методом `people`. */
  people: string[];
  peopleLoading: boolean;
  /** Имена параметров, объявленных договором: `recall` и `remember` вместе. */
  supported: readonly string[];
  words: BenchControlWords;
}) {
  const [open, setOpen] = useState(false);

  const has = (name: string) => supported.includes(name);

  /** Правка одной карточки охвата: соседние не трогаем. */
  const patchScope = (i: number, patch: { at?: string; place?: string }) => {
    onChange({
      scope: params.scope.map((e, k) => (k === i ? { ...e, ...patch } : e)),
    });
  };

  /**
   * Убрать карточку охвата.
   *
   * 🔒 ПОСЛЕДНЯЯ НЕ УДАЛЯЕТСЯ, А ОЧИЩАЕТСЯ. Список, из которого исчезла
   * последняя карточка, оставляет человека перед пустым местом без единой
   * подсказки, что здесь вообще можно что-то завести.
   */
  const dropScope = (i: number) => {
    onChange({
      scope:
        params.scope.length > 1
          ? params.scope.filter((_, k) => k !== i)
          : [{ at: "", place: "" }],
    });
  };

  /**
   * Список ссылок одного рода (200-5).
   * 🔒 РОД ПРОВЕРЯЕТСЯ НА ЭКРАНЕ ТЕМ ЖЕ `youtubeId()`, ЧТО В ПАМЯТИ: ролик в обычной ссылке и страница в поле YouTube
   * подсвечиваются сразу, а отправка запирается стендом до исправления (слово владельца: «чтобы ты не проходила»).
   */
  const linkList = (field: "links" | "youtube") => {
    const rows = params[field].length ? params[field] : [""];
    const title = field === "links" ? words.attach.links : words.attach.youtube;
    const wrong = (u: string) => u.trim() !== "" && (field === "links" ? youtubeId(u) !== null : youtubeId(u) === null);
    const put = (next: string[]) => onChange({ [field]: next } as Partial<BenchParams>);
    return (
      <div className="space-y-1" data-links={field}>
        <div className="text-[length:var(--fs-small)] font-medium">{title}</div>
        {rows.map((u, i) => (
          <div className="space-y-0.5" key={i}>
            <div className="flex flex-wrap items-center gap-2">
              <input
                aria-label={`${title} ${i + 1}`}
                className={`${boxClass} max-w-[32rem] font-mono ${wrong(u) ? "border-destructive" : ""}`}
                onChange={(e) => put(rows.map((x, k) => (k === i ? e.target.value : x)))}
                placeholder={field === "links" ? words.attach.linksPlaceholder : words.attach.youtubePlaceholder}
                type="url"
                value={u}
              />
              <button
                className="rounded-md border border-muted-foreground/30 px-2 py-1 text-[length:var(--fs-small)] hover:bg-muted"
                onClick={() => put(rows.length > 1 ? rows.filter((_, k) => k !== i) : [""])}
                type="button"
              >
                {words.attach.remove}
              </button>
            </div>
            {wrong(u) ? (
              <p className="text-[length:var(--fs-small)] text-destructive">
                {field === "links" ? words.attach.linkIsYoutube : words.attach.notYoutube}
              </p>
            ) : null}
          </div>
        ))}
        <button
          className="rounded-md border border-muted-foreground/30 px-3 py-1 text-[length:var(--fs-small)] hover:bg-muted"
          onClick={() => put([...rows, ""])}
          type="button"
        >
          {words.attach.add}
        </button>
      </div>
    );
  };

  const depthHint =
    params.depth === "standard"
      ? words.depth.standardHint
      : params.depth === "deep"
        ? words.depth.deepHint
        : words.depth.extremeHint;

  const depthButton = (id: BenchParams["depth"], label: string) => (
    <button
      className={`rounded-md border px-3 py-1 text-[length:var(--fs-small)] transition-colors ${
        params.depth === id
          ? "border-primary bg-primary text-primary-foreground"
          : "border-muted-foreground/30 hover:bg-muted"
      }`}
      onClick={() => onChange({ depth: id })}
      type="button"
    >
      {label}
    </button>
  );

  // 🔒 СВЁРНУТО ПО УМОЛЧАНИЮ — ЭТО ПРО ЧАСТОТУ, А НЕ ПРО ВАЖНОСТЬ (183-7,
  // решение владельца: «всю новую большую таблицу по умолчанию скрывать в
  // карточке аккордеон как расширенные параметры»). Обычный прогон стенда — это
  // фраза и кнопка; девять органов перед глазами каждый раз делают редкое таким
  // же заметным, как частое.
  // 🛑 НО СВЁРНУТОЕ ОБЯЗАНО СКАЗАТЬ, ЧТО ВНУТРИ ЧТО-ТО ВЫСТАВЛЕНО. Свёрнутый
  // блок с молча действующими параметрами — ловушка: человек отправляет фразу и
  // не знает, что к ней уехала вчерашняя геометка. Поэтому на закрытой карточке
  // стоит счётчик, и считает он ровно то, что уедет.
  const set = [
    params.depth !== "standard" && words.depth.label,
    params.who !== "bench-1" && words.who.label,
    params.wantChain && words.chain.label,
    params.scope.some((e) => e.at || e.place) && words.scope.label,
    (params.files.length > 0 || params.links.some((u) => u.trim()) || params.youtube.some((u) => u.trim())) &&
      words.attach.label,
  ].filter(Boolean) as string[];

  return (
    <div className="rounded-md border border-muted-foreground/30">
      <button
        aria-expanded={open}
        className="flex w-full flex-wrap items-center justify-between gap-2 px-3 py-2 text-left hover:bg-muted"
        onClick={() => setOpen((v) => !v)}
        type="button"
      >
        <span className="text-[length:var(--fs-small)] font-medium">
          {open ? "▾" : "▸"} {words.advanced}
        </span>
        <span className="text-[length:var(--fs-small)] text-muted-foreground">
          {set.length ? `${words.setNow}: ${set.join(", ")}` : words.nothingSet}
        </span>
      </button>

      <div className="space-y-3 border-t border-muted-foreground/20 p-3" hidden={!open}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-[length:var(--fs-small)] font-medium">{words.title}</span>
        <span className="text-[length:var(--fs-small)] text-muted-foreground">{words.legend}</span>
      </div>

      {/* ① ГЛУБИНА — ТРЕМЯ СЛОВАМИ, С ПОДСКАЗКОЙ ВЫБРАННОГО.
          🔒 Подсказка меняется вместе с выбором: цена уровня обязана быть видна
          ДО отправки, а не выясняться по секундомеру после. */}
      <Row hint={depthHint} label={words.depth.label} ok={has("depth")} words={words}>
        <div className="flex flex-wrap gap-2">
          {depthButton("standard", words.depth.standard)}
          {depthButton("deep", words.depth.deep)}
          {depthButton("extreme", words.depth.extreme)}
        </div>
      </Row>

      {/* ② ОТ ЧЬЕГО ИМЕНИ — СПИСКОМ, А НЕ СВОБОДНЫМ ПОЛЕМ.
          🔒 Набранное руками имя рождает человека, которого память не знает, и
          его пустой ответ читается как отказ памяти. */}
      <Row hint={words.who.hint} label={words.who.label} ok={has("who")} words={words}>
        <select
          className={selectClass}
          onChange={(e) => onChange({ who: e.target.value })}
          value={params.who}
        >
          <option value="bench-1">{words.who.bench}</option>
          {people
            .filter((p) => p !== "bench-1")
            .map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
        </select>
        {peopleLoading ? (
          <p className="text-[length:var(--fs-small)] text-muted-foreground">{words.who.loading}</p>
        ) : null}
      </Row>

      {/* ③ ИСТОРИЯ РАЗГОВОРА — ПЕРЕКЛЮЧАТЕЛЬ И ПОЛЕ.
          🔒 Стоит ВЫШЕ основного поля в раскладке стенда — так в паспорте §12:
          это контекст вопроса, а не сам вопрос. */}

      {/* ④ ПРЕЖНИЙ ПОИСК — ДВЕ РАЗНЫЕ ВЕЩИ В ОДНОМ ОРГАНЕ, И РАЗНИЦА НАЗВАНА.
          🔒 НИТЬ — НАША СОБСТВЕННАЯ ЦЕПОЧКА РАЗМЫШЛЕНИЯ (184-4). У `claude -p`
          есть свой разговор со своим именем: память возвращает его в ответе,
          и присланный обратно он продолжает ту же цепочку — с её кэшем и с её
          прежним выводом. Измерено: продолжение ДЕШЕВЛЕ нового вызова
          (0.0289 → 0.0065 → 0.0036), паспорт §10.
          🔒 СВОБОДНЫЙ ТЕКСТ НАХОДОК ОСТАЁТСЯ РЯДОМ И НЕ ЗАМЕНЯЕТСЯ НИТЬЮ: он для
          зовущего, у которого нашей нити нет вовсе — чужой модели или службы.
          Слить их в одно поле значило бы потребовать идентификатор там, где его
          неоткуда взять. */}

      {/* ⑤ РЕЗУЛЬТАТЫ ПРЕДЫДУЩИХ ПОИСКОВ — СВОБОДНЫМ ТЕКСТОМ */}

      {/* ⑤ ЦЕПОЧКА РАЗМЫШЛЕНИЙ — ДА ИЛИ НЕТ.
          🔒 Умолчание «нет» (паспорт §4): переполнять свой контекст или нет
          решает тот, кто спросил. */}
      <Row hint={words.chain.hint} label={words.chain.label} ok={has("want_chain")} words={words}>
        <div className="flex flex-wrap gap-2">
          <button
            className={`rounded-md border px-3 py-1 text-[length:var(--fs-small)] ${
              params.wantChain
                ? "border-primary bg-primary text-primary-foreground"
                : "border-muted-foreground/30 hover:bg-muted"
            }`}
            onClick={() => onChange({ wantChain: true })}
            type="button"
          >
            {words.chain.on}
          </button>
          <button
            className={`rounded-md border px-3 py-1 text-[length:var(--fs-small)] ${
              params.wantChain
                ? "border-muted-foreground/30 hover:bg-muted"
                : "border-primary bg-primary text-primary-foreground"
            }`}
            onClick={() => onChange({ wantChain: false })}
            type="button"
          >
            {words.chain.off}
          </button>
        </div>
      </Row>

      {/* ⑥ КАЛЕНДАРЬ И ГЕОМЕТКА — ЭТО ОХВАТ, А НЕ УКРАШЕНИЕ.
          🔒 Пустой охват значит «не знаю где и когда», а не «везде и всегда».
          🔒 ЗАПИСЕЙ БЫВАЕТ МНОГО, И КАЖДАЯ — СВОЯ КАРТОЧКА (183-7, решение
          владельца 2026-09-11: «событий календаря и геометок может быть
          множество… кнопка плюс добавить еще запись»). Одна пара полей молча
          утверждала бы, что у фразы один охват, — а «вчера в Мадриде, сегодня в
          Лондоне» в неё не помещается вовсе. */}
      <Row hint={words.scope.hint} label={words.scope.label} ok={has("scope")} words={words}>
        <div className="space-y-2">
          {params.scope.map((entry, i) => (
            <div
              className="flex flex-wrap items-center gap-2 rounded-md border border-muted-foreground/20 p-2"
              key={i}
            >
              <span className="text-[length:var(--fs-small)] text-muted-foreground">
                {words.scope.entry} {i + 1}
              </span>
              <input
                aria-label={`${words.scope.date} ${i + 1}`}
                className={`${boxClass} max-w-[12rem]`}
                onChange={(e) => patchScope(i, { at: e.target.value })}
                type="date"
                value={entry.at}
              />
              <input
                aria-label={`${words.scope.place} ${i + 1}`}
                className={`${boxClass} max-w-[16rem]`}
                onChange={(e) => patchScope(i, { place: e.target.value })}
                placeholder={words.scope.placePlaceholder}
                value={entry.place}
              />
              {/* 🔒 ПОСЛЕДНЮЮ КАРТОЧКУ УДАЛИТЬ НЕЛЬЗЯ — ОНА ОЧИЩАЕТСЯ. Пустой
                  список на экране есть место, где не видно, что делать. */}
              <button
                className="rounded-md border border-muted-foreground/30 px-2 py-1 text-[length:var(--fs-small)] hover:bg-muted"
                onClick={() => dropScope(i)}
                title={words.scope.remove}
                type="button"
              >
                {words.scope.remove}
              </button>
            </div>
          ))}
          <button
            className="rounded-md border border-muted-foreground/30 px-3 py-1 text-[length:var(--fs-small)] hover:bg-muted"
            onClick={() => onChange({ scope: [...params.scope, { at: "", place: "" }] })}
            type="button"
          >
            {words.scope.add}
          </button>
        </div>
      </Row>

      {/* ⑦ ОТРИЦАНИЕ ОТВЕТА */}

      {/* ⑧ ТРЕБУЕТСЯ СОЗДАТЬ ТАБЛИЦУ */}

      {/* ⑨ ВЛОЖЕНИЯ — ВКЛЮЧЕНИЕ В «СКАЗАТЬ», А НЕ ОТДЕЛЬНАЯ ДВЕРЬ (200-5).
          🔒 Слово владельца 2026-09-14: «кнопку загрузить аудио кнопку загрузить видео кнопка загрузить и так далее и
          отдельно … обычная ссылка YouTube ссылка». Кнопки порождены из родов, которые память описывает (`kinds.mjs`),
          а не перечислены здесь: род, добавленный в память, получает кнопку без правки экрана.
          🪦 До 200-4 здесь стояли пять выключенных кнопок «Загрузка» с неправдой «память понимает только текст». */}
      <Row
        hint={words.attach.hint}
        label={words.attach.label}
        ok={has("files") || has("links") || has("youtube")}
        words={words}
      >
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {UPLOAD_KINDS.map((kind) => (
              <label
                className="cursor-pointer rounded-md border border-muted-foreground/30 px-3 py-1 text-[length:var(--fs-small)] hover:bg-muted"
                key={kind}
              >
                {words.attach.kinds[kind] ?? kind}
                <input
                  accept={acceptOf(kind)}
                  className="hidden"
                  data-kind={kind}
                  multiple
                  onChange={(e) => {
                    const picked = Array.from(e.target.files ?? []);
                    e.target.value = "";
                    if (picked.length) onChange({ files: [...params.files, ...picked] });
                  }}
                  type="file"
                />
              </label>
            ))}
          </div>
          {params.files.length ? (
            <ul className="space-y-1" data-testid="chosen-files">
              {params.files.map((f, i) => (
                <li className="flex flex-wrap items-center gap-2 text-[length:var(--fs-small)]" key={`${f.name}-${i}`}>
                  <span className="font-mono">
                    {f.name} · {f.size} B
                  </span>
                  <button
                    className="rounded-md border border-muted-foreground/30 px-2 py-0.5 hover:bg-muted"
                    onClick={() => onChange({ files: params.files.filter((_, k) => k !== i) })}
                    type="button"
                  >
                    {words.attach.remove}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {linkList("links")}
          {linkList("youtube")}
        </div>
      </Row>

      </div>
    </div>
  );
}
