"use client";

// ФОРМА ВЫЗОВА, ПОРОЖДЁННАЯ ИЗ ДОГОВОРА (200-2).
//
// 🔒 ФАЙЛ НЕ ЗНАЕТ, КАКИЕ МЕТОДЫ У ПАМЯТИ ЕСТЬ. Цели и их параметры приходят со
// страницы из `contract.mjs`; поле рисуется по ТИПУ параметра. Метод, добавленный
// в договор завтра, получает форму без правки этого файла.
// 🔒 ИМЕНА ПАРАМЕТРОВ ЗДЕСЬ ЗНАЮТ ТОЛЬКО ЖИВЫЕ РЕДАКТОРЫ: `who` — список людей
// памяти, `depth` — три слова, `thread` — кнопка «взять из ответа», `scope` —
// карточки охвата. Незнакомое имя получает общий редактор по типу, и это не
// дефект, а правило: редактор удобнее, но не обязателен.
// 🛑 ПОДСКАЗКА — ОПИСАНИЕ ИЗ ДОГОВОРА (или его перевод со страницы API), а не
// своя проза: вторая прозаическая копия разошлась бы с договором молча.

import type { CallTarget } from "@/lib/contract-call.mjs";
import type { BenchControlWords } from "./memory-test-controls.client";

export type CallFormWords = {
  target: string;
  methodsGroup: string;
  catalogueGroup: string;
  required: string;
  optional: string;
  noParams: string;
  badForm: string;
  fileNext: string;
  arrayHint: string;
  notSet: string;
};

type ScopeCard = { at: string; place: string };

const boxClass =
  "w-full rounded-md border border-muted-foreground/30 bg-transparent px-2 py-1 text-[length:var(--fs-small)]";

/** Параметры, которые человек пишет фразой: им нужно поле в несколько строк. */
const LONG_TEXT = new Set(["text", "history", "prior", "deny", "summary", "full", "question"]);

export function CallForm({
  bad,
  controls,
  lastThread,
  onTarget,
  onValue,
  people,
  targetId,
  targets,
  values,
  words,
}: {
  /** Заполнено не той формы — подсвечивается у своего поля. */
  bad: readonly string[];
  /** Слова живых редакторов — те же, что у быстрых входов (183-1). */
  controls: BenchControlWords;
  lastThread: string | null;
  onTarget: (id: string) => void;
  onValue: (name: string, value: unknown) => void;
  people: string[];
  targetId: string;
  targets: CallTarget[];
  values: Record<string, unknown>;
  words: CallFormWords;
}) {
  const target = targets.find((t) => t.id === targetId) ?? targets[0];
  const methods = targets.filter((t) => t.kind === "method");
  const reads = targets.filter((t) => t.kind === "get");
  const str = (name: string) => (typeof values[name] === "string" ? (values[name] as string) : "");

  const scopeCards = (): ScopeCard[] => {
    const v = values.scope;
    return Array.isArray(v) && v.length ? (v as ScopeCard[]) : [{ at: "", place: "" }];
  };

  const editor = (p: CallTarget["params"][number]) => {
    const label = `${target.id}.${p.name}`;
    if (p.format === "binary") {
      return (
        <div className="space-y-1">
          <input aria-label={label} className={boxClass} disabled type="file" />
          <p className="text-[length:var(--fs-small)] text-muted-foreground">{words.fileNext}</p>
        </div>
      );
    }
    if (p.name === "who") {
      return (
        <>
          <input
            aria-label={label}
            className={`${boxClass} max-w-[26rem] font-mono`}
            list="memory-call-people"
            onChange={(e) => onValue("who", e.target.value)}
            value={str("who")}
          />
          <datalist id="memory-call-people">
            {people.map((who) => (
              <option key={who} value={who} />
            ))}
          </datalist>
        </>
      );
    }
    if (p.name === "lang") {
      return (
        <select aria-label={label} className={`${boxClass} max-w-[10rem]`} onChange={(e) => onValue("lang", e.target.value)} value={str("lang")}>
          <option value="">{words.notSet}</option>
          <option value="ru">ru</option>
          <option value="en">en</option>
        </select>
      );
    }
    if (p.name === "depth") {
      return (
        <select aria-label={label} className={`${boxClass} max-w-[16rem]`} onChange={(e) => onValue("depth", e.target.value)} value={str("depth")}>
          <option value="">{words.notSet}</option>
          <option value="standard">standard — {controls.depth.standard}</option>
          <option value="deep">deep — {controls.depth.deep}</option>
          <option value="extreme">extreme — {controls.depth.extreme}</option>
        </select>
      );
    }
    if (p.name === "thread") {
      return (
        <div className="flex flex-wrap items-center gap-2">
          <input
            aria-label={label}
            className={`${boxClass} max-w-[26rem] font-mono`}
            onChange={(e) => onValue("thread", e.target.value)}
            placeholder={controls.thread.placeholder}
            value={str("thread")}
          />
          {lastThread ? (
            <button
              className="rounded-md border border-muted-foreground/30 px-2 py-1 text-[length:var(--fs-small)] hover:bg-muted"
              onClick={() => onValue("thread", lastThread)}
              type="button"
            >
              {controls.thread.take}
            </button>
          ) : null}
        </div>
      );
    }
    if (p.name === "scope" && p.type === "array") {
      const cards = scopeCards();
      const put = (next: ScopeCard[]) => onValue("scope", next);
      return (
        <div className="space-y-2">
          {cards.map((card, i) => (
            <div className="flex flex-wrap items-center gap-2 rounded-md border border-muted-foreground/20 p-2" key={i}>
              <span className="text-[length:var(--fs-small)] text-muted-foreground">
                {controls.scope.entry} {i + 1}
              </span>
              <input
                aria-label={`${label} ${controls.scope.date} ${i + 1}`}
                className={`${boxClass} max-w-[12rem]`}
                onChange={(e) => put(cards.map((c, k) => (k === i ? { ...c, at: e.target.value } : c)))}
                type="date"
                value={card.at}
              />
              <input
                aria-label={`${label} ${controls.scope.place} ${i + 1}`}
                className={`${boxClass} max-w-[16rem]`}
                onChange={(e) => put(cards.map((c, k) => (k === i ? { ...c, place: e.target.value } : c)))}
                placeholder={controls.scope.placePlaceholder}
                value={card.place}
              />
              <button
                className="rounded-md border border-muted-foreground/30 px-2 py-1 text-[length:var(--fs-small)] hover:bg-muted"
                onClick={() => put(cards.length > 1 ? cards.filter((_, k) => k !== i) : [{ at: "", place: "" }])}
                type="button"
              >
                {controls.scope.remove}
              </button>
            </div>
          ))}
          <button
            className="rounded-md border border-muted-foreground/30 px-3 py-1 text-[length:var(--fs-small)] hover:bg-muted"
            onClick={() => put([...cards, { at: "", place: "" }])}
            type="button"
          >
            {controls.scope.add}
          </button>
        </div>
      );
    }
    if (p.type === "boolean") {
      return (
        <label className="flex items-center gap-2 font-mono text-[length:var(--fs-small)]">
          <input aria-label={label} checked={values[p.name] === true} onChange={(e) => onValue(p.name, e.target.checked)} type="checkbox" />
          {p.name}
        </label>
      );
    }
    if (p.type === "integer") {
      return (
        <input
          aria-label={label}
          className={`${boxClass} max-w-[10rem] font-mono`}
          onChange={(e) => onValue(p.name, e.target.value)}
          step={1}
          type="number"
          value={str(p.name)}
        />
      );
    }
    if (p.type === "array") {
      return (
        <textarea
          aria-label={label}
          className={`${boxClass} h-20 resize-y font-mono`}
          onChange={(e) => onValue(p.name, e.target.value)}
          placeholder={words.arrayHint}
          spellCheck={false}
          value={str(p.name)}
        />
      );
    }
    if (LONG_TEXT.has(p.name)) {
      return (
        <textarea aria-label={label} className={`${boxClass} h-20 resize-y`} onChange={(e) => onValue(p.name, e.target.value)} value={str(p.name)} />
      );
    }
    return <input aria-label={label} className={boxClass} onChange={(e) => onValue(p.name, e.target.value)} value={str(p.name)} />;
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <label className="text-[length:var(--fs-small)] font-medium" htmlFor="memory-call-target">
          {words.target}
        </label>
        <select className={`${boxClass} font-mono`} id="memory-call-target" onChange={(e) => onTarget(e.target.value)} value={target.id}>
          <optgroup label={words.methodsGroup}>
            {methods.map((t) => (
              <option key={t.id} value={t.id}>
                POST {t.path}
              </option>
            ))}
          </optgroup>
          <optgroup label={words.catalogueGroup}>
            {reads.map((t) => (
              <option key={t.id} value={t.id}>
                GET {t.path}
              </option>
            ))}
          </optgroup>
        </select>
        <p className="text-[length:var(--fs-small)] text-muted-foreground">{target.hint}</p>
      </div>

      {target.params.length === 0 ? (
        <p className="text-[length:var(--fs-small)] text-muted-foreground">{words.noParams}</p>
      ) : (
        <div className="space-y-3">
          {target.params.map((p) => (
            <div className="space-y-1 border-t border-muted-foreground/15 pt-3 first:border-t-0 first:pt-0" data-param={p.name} key={p.name}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[length:var(--fs-small)] font-medium">{p.name}</span>
                <span className="font-mono text-[length:var(--fs-small)] text-muted-foreground">
                  {p.format ? `${p.type}/${p.format}` : p.type}
                </span>
                <span
                  className={`rounded px-1.5 py-0.5 text-[length:var(--fs-small)] ${
                    p.required ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {p.required ? words.required : words.optional}
                </span>
              </div>
              <p className="text-[length:var(--fs-small)] text-muted-foreground">{p.hint}</p>
              {editor(p)}
              {bad.includes(p.name) ? (
                <p className="text-[length:var(--fs-small)] text-destructive">{words.badForm}</p>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
