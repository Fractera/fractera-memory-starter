"use client";

// ОРГАНЫ УПРАВЛЕНИЯ СТЕНДА ПАМЯТИ — ДЕВЯТЬ ШТУК, ПО РАЗДЕЛУ 13 ПАСПОРТА (183-1).
//
// 🔒 ЗАЧЕМ ОНИ ЗДЕСЬ ВООБЩЕ. Стенд — прибор, а не витрина: человек говорит со
// службой напрямую и видит сырой ответ. Значит стенд обязан уметь всё, что
// умеет зовущая модель, — иначе он проверяет НЕ ТОТ путь, и разница всплывает
// у бота, а не здесь.
//
// 🔒 НАРУЖУ ИДУТ СЛОВА, НОМЕРА УРОВНЕЙ ОСТАЮТСЯ ВНУТРИ (паспорт §13). Человеку
// «уровень 4» не говорит ничего, а «дольше и дороже» говорит всё.
//
// 🔒 ГЛАВНОЕ СВОЙСТВО ЭТОГО ФАЙЛА: ОН НЕ ЗНАЕТ, ЧТО ПАМЯТЬ УМЕЕТ СЕГОДНЯ.
// Метка «доезжает» / «пока не доезжает» у каждого органа берётся из ДОГОВОРА
// (`contract.mjs`), приезжающего пропсом со страницы. Рукописный список
// поддержанного разошёлся бы с договором молча — в этом проекте такое
// оплачено пять раз за две недели.

import type { BenchParams } from "@/lib/bench-call.mjs";

export type BenchControlWords = {
  title: string;
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
  chain: { label: string; hint: string; on: string; off: string };
  scope: { label: string; hint: string; date: string; place: string; placePlaceholder: string };
  deny: { label: string; hint: string; placeholder: string };
  needTable: { label: string; hint: string };
  upload: { label: string; hint: string; image: string; video: string; sound: string; html: string; pdf: string };
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

export function BenchControls({
  onChange,
  params,
  people,
  peopleLoading,
  supported,
  words,
}: {
  onChange: (patch: Partial<BenchParams>) => void;
  params: BenchParams;
  /** Кого память знает — спрошено у неё же методом `people`. */
  people: string[];
  peopleLoading: boolean;
  /** Имена параметров, объявленных договором: `recall` и `remember` вместе. */
  supported: readonly string[];
  words: BenchControlWords;
}) {
  const has = (name: string) => supported.includes(name);

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

  return (
    <div className="space-y-3 rounded-md border border-muted-foreground/30 p-3">
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
          className={boxClass}
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
          🔒 Стоит ВЫШЕ основного поля в раскладке стенда — так в паспорте §13:
          это контекст вопроса, а не сам вопрос. */}
      <Row hint={words.history.hint} label={words.history.label} ok={has("history")} words={words}>
        <label className="flex items-center gap-2 text-[length:var(--fs-small)]">
          <input
            checked={params.historyOn}
            onChange={(e) => onChange({ historyOn: e.target.checked })}
            type="checkbox"
          />
          {words.history.label}
        </label>
        {params.historyOn ? (
          <textarea
            className={`${boxClass} h-20 resize-y`}
            onChange={(e) => onChange({ history: e.target.value })}
            placeholder={words.history.placeholder}
            value={params.history}
          />
        ) : null}
      </Row>

      {/* ④ РЕЗУЛЬТАТЫ ПРЕДЫДУЩИХ ПОИСКОВ */}
      <Row hint={words.prior.hint} label={words.prior.label} ok={has("prior")} words={words}>
        <label className="flex items-center gap-2 text-[length:var(--fs-small)]">
          <input
            checked={params.priorOn}
            onChange={(e) => onChange({ priorOn: e.target.checked })}
            type="checkbox"
          />
          {words.prior.label}
        </label>
        {params.priorOn ? (
          <textarea
            className={`${boxClass} h-20 resize-y`}
            onChange={(e) => onChange({ prior: e.target.value })}
            placeholder={words.prior.placeholder}
            value={params.prior}
          />
        ) : null}
      </Row>

      {/* ⑤ ЦЕПОЧКА РАЗМЫШЛЕНИЙ — ДА ИЛИ НЕТ.
          🔒 Умолчание «нет» (паспорт §6): переполнять свой контекст или нет
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
          🔒 Пустой охват значит «не знаю где и когда», а не «везде и всегда». */}
      <Row hint={words.scope.hint} label={words.scope.label} ok={has("at")} words={words}>
        <div className="flex flex-wrap gap-2">
          <input
            aria-label={words.scope.date}
            className={`${boxClass} max-w-[12rem]`}
            onChange={(e) => onChange({ at: e.target.value })}
            type="date"
            value={params.at}
          />
          <input
            aria-label={words.scope.place}
            className={`${boxClass} max-w-[16rem]`}
            onChange={(e) => onChange({ place: e.target.value })}
            placeholder={words.scope.placePlaceholder}
            value={params.place}
          />
        </div>
      </Row>

      {/* ⑦ ОТРИЦАНИЕ ОТВЕТА */}
      <Row hint={words.deny.hint} label={words.deny.label} ok={has("deny")} words={words}>
        <textarea
          className={`${boxClass} h-16 resize-y`}
          onChange={(e) => onChange({ deny: e.target.value })}
          placeholder={words.deny.placeholder}
          value={params.deny}
        />
      </Row>

      {/* ⑧ ТРЕБУЕТСЯ СОЗДАТЬ ТАБЛИЦУ */}
      <Row hint={words.needTable.hint} label={words.needTable.label} ok={has("need_table")} words={words}>
        <label className="flex items-center gap-2 text-[length:var(--fs-small)]">
          <input
            checked={params.needTable}
            onChange={(e) => onChange({ needTable: e.target.checked })}
            type="checkbox"
          />
          {words.needTable.label}
        </label>
      </Row>

      {/* ⑨ ЗАГРУЗКА ФАЙЛОВ — КНОПКИ ЕСТЬ, СПОСОБНОСТИ НЕТ, И ЭТО СКАЗАНО СЛОВАМИ.
          🔒 Так требует паспорт §13: роды данных объявлены (текст · изображение ·
          видео · звук · HTML · PDF), а память умеет только текст. Молчаливое
          отсутствие кнопок читалось бы как «род не предусмотрен вовсе». */}
      <Row hint={words.upload.hint} label={words.upload.label} ok={false} words={words}>
        <div className="flex flex-wrap gap-2">
          {[
            words.upload.image,
            words.upload.video,
            words.upload.sound,
            words.upload.html,
            words.upload.pdf,
          ].map((label) => (
            <button
              className="cursor-not-allowed rounded-md border border-muted-foreground/30 px-3 py-1 text-[length:var(--fs-small)] text-muted-foreground opacity-60"
              disabled
              key={label}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
      </Row>
    </div>
  );
}
