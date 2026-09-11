import Link from "next/link";
import { Eyebrow, H1, Lead } from "@/components/ui/typography";
import { landingWords } from "../_i18n/landing.i18n";

// ПУБЛИЧНЫЙ ЛЕНДИНГ ПАМЯТИ (186).
//
// 🎯 ЗАКАЗ ВЛАДЕЛЬЦА 2026-09-11: «нужно сгенерировать корневую страницу памяти,
// для дизайна можно использовать блоки» — каталог видов гостевого стартера.
//
// 🔒 ВИД ПЕРЕНЕСЁН, ИСТОЧНИК — НЕТ, И ЭТО ГЛАВНОЕ РЕШЕНИЕ ФАЙЛА. Блоки живут в
// `fractera-next-starter` — гостевом приложении порта 3000, со своими
// `APP-CONFIG`, `DESIGN-CONFIG` и своим слоем разметки для поисковика. Память
// обязана работать, когда проекта на 3000 нет вовсе (закон 137), поэтому здесь
// повторена АНАТОМИЯ блоков — надзаголовок, заголовок, лид, карточки, таблица,
// код, — собранная на собственных примитивах службы.
// ✗ Дословный импорт притащил бы чужие конфиги: сотри владелец 3000 — и
// лендинг памяти остался бы без шрифтов, палитры и половины компонентов.
//
// 🔒 ВСЕ СЛОВА ПРИХОДЯТ ИЗ СЛОВАРЯ, В ЭТОМ ФАЙЛЕ НЕТ НИ ОДНОЙ ФРАЗЫ. Страница
// говорит на одном языке — том, который выбрал человек; до 82 языков это растёт
// добавлением ветки словаря, без единой правки здесь.
//
// 🛑 ЗДЕСЬ НЕТ КОМАНД УСТАНОВКИ, И ЭТО ТРЕБОВАНИЕ ВЛАДЕЛЬЦА ТОГО ЖЕ ДНЯ.
// Команда на лендинге устаревает молча: человек скопирует её через полгода и
// получит отказ. Установку делает робот — об этом одна карточка словами.

function Section({
  children,
  id,
  lead,
  title,
}: {
  children?: React.ReactNode;
  id: string;
  lead?: string;
  title: string;
}) {
  return (
    <section className="border-border border-t py-12 first:border-t-0" id={id}>
      <div className="mx-auto w-full max-w-5xl px-6">
        <h2 className="text-[length:var(--fs-h2)] font-semibold tracking-tight">{title}</h2>
        {lead ? <p className="mt-3 max-w-3xl text-[length:var(--fs-body)] text-muted-foreground">{lead}</p> : null}
        {children ? <div className="mt-6">{children}</div> : null}
      </div>
    </section>
  );
}

/** Карточка ряда — тот же вид, что у `benefitCards` каталога. */
function Card({ body, title }: { body: string; title: string }) {
  return (
    <div className="rounded-lg border border-muted-foreground/25 p-4">
      <div className="text-[length:var(--fs-body)] font-medium">{title}</div>
      <p className="mt-2 text-[length:var(--fs-small)] leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}

function Code({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto whitespace-pre rounded-md bg-muted px-3 py-3 font-mono text-[length:var(--fs-small)] leading-relaxed">
      {children}
    </pre>
  );
}

export function Landing({ lang }: { lang: string }) {
  const w = landingWords(lang);

  return (
    <main className="min-h-screen bg-background">
      {/* ── ПЕРВЫЙ ЭКРАН ─────────────────────────────────────────────────────
          🔒 Анатомия `heroSplit`: надзаголовок → H1 → лид → тело → метки →
          действия. H1 на странице ровно один, и он здесь. */}
      <section className="px-6 pt-12 pb-10">
        <div className="mx-auto w-full max-w-5xl">
          <Eyebrow>{w.hero.eyebrow}</Eyebrow>
          <H1 className="mt-4 max-w-4xl">{w.hero.title}</H1>
          <Lead className="mt-5 max-w-3xl">{w.hero.lead}</Lead>
          <p className="mt-4 max-w-3xl text-[length:var(--fs-small)] leading-relaxed text-muted-foreground">
            {w.hero.body}
          </p>

          <ul className="mt-6 flex flex-wrap gap-2">
            {w.hero.badges.map((b) => (
              <li
                className="rounded-full border border-muted-foreground/30 px-3 py-1 text-[length:var(--fs-small)]"
                key={b}
              >
                {b}
              </li>
            ))}
          </ul>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              className="rounded-md bg-primary px-4 py-2 text-[length:var(--fs-small)] font-medium text-primary-foreground hover:opacity-90"
              href={`/${lang}/settings?section=api`}
            >
              {w.hero.primary}
            </Link>
            <Link
              className="rounded-md border border-muted-foreground/30 px-4 py-2 text-[length:var(--fs-small)] font-medium hover:bg-muted"
              href={`/${lang}/passport`}
            >
              {w.hero.secondary}
            </Link>
          </div>
        </div>
      </section>

      {/* ── ЗАДАЧА И ЧЁРНЫЙ ЯЩИК ─────────────────────────────────────────── */}
      <Section id="concept" lead={w.problem.lead} title={w.problem.title}>
        <p className="max-w-3xl text-[length:var(--fs-small)] leading-relaxed">{w.problem.body}</p>
      </Section>

      {/* ── СХЕМА РОУТЕРА: вид `flow` каталога, но без ASCII ────────────────
          🔒 Рисунок из текста владельца перенесён СМЫСЛОМ, а не символами:
          псевдографика ломается на телефоне и не читается экранным диктором. */}
      <Section id="router" lead={w.router.lead} title={w.router.title}>
        <div className="space-y-3">
          <div className="rounded-lg border border-muted-foreground/25 px-4 py-3 text-center text-[length:var(--fs-small)]">
            {w.router.inbox}
          </div>
          <div className="text-center text-muted-foreground">↓</div>
          <div className="rounded-lg border border-primary/40 bg-primary/5 px-4 py-3 text-center text-[length:var(--fs-small)] font-medium">
            {w.router.routerBox}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-muted-foreground/25 p-4">
              <div className="text-[length:var(--fs-small)] font-medium">{w.router.cheapBranch}</div>
              <p className="mt-2 text-[length:var(--fs-small)] text-muted-foreground">{w.router.cheapCost}</p>
            </div>
            <div className="rounded-lg border border-muted-foreground/25 p-4">
              <div className="text-[length:var(--fs-small)] font-medium">{w.router.deepBranch}</div>
              <p className="mt-2 text-[length:var(--fs-small)] text-muted-foreground">{w.router.deepCost}</p>
            </div>
          </div>
        </div>
      </Section>

      <Section id="schema" title={w.schema.title}>
        <p className="max-w-3xl text-[length:var(--fs-small)] leading-relaxed">{w.schema.body}</p>
      </Section>

      {/* ── ЛЕСТНИЦА ЦЕНЫ: вид `table` каталога ───────────────────────────── */}
      <Section id="ladder" lead={w.ladder.lead} title={w.ladder.title}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[length:var(--fs-small)]">
            <thead className="text-muted-foreground">
              <tr>
                <th className="py-2 pr-4 font-medium">{w.ladder.head.level}</th>
                <th className="py-2 pr-4 font-medium">{w.ladder.head.how}</th>
                <th className="py-2 pr-4 font-medium">{w.ladder.head.cost}</th>
                <th className="py-2 font-medium">{w.ladder.head.by}</th>
              </tr>
            </thead>
            <tbody>
              {w.ladder.rows.map((r) => (
                <tr className="border-t border-muted-foreground/15 align-top" key={r.level}>
                  <td className="py-2 pr-4 font-medium whitespace-nowrap">{r.level}</td>
                  <td className="py-2 pr-4">{r.how}</td>
                  <td className="py-2 pr-4">{r.cost}</td>
                  <td className="py-2 text-muted-foreground">{r.by}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 max-w-3xl text-[length:var(--fs-small)] italic text-muted-foreground">
          {w.ladder.example}
        </p>
      </Section>

      <Section id="scope" lead={w.scope.lead} title={w.scope.title}>
        <div className="grid gap-3 md:grid-cols-3">
          {w.scope.items.map((i) => (
            <Card body={i.body} key={i.title} title={i.title} />
          ))}
        </div>
      </Section>

      {/* ── АРТЕФАКТЫ: вид `olist` каталога ────────────────────────────────── */}
      <Section id="artifacts" lead={w.artifacts.lead} title={w.artifacts.title}>
        <ol className="ml-5 list-decimal space-y-2 text-[length:var(--fs-small)] leading-relaxed">
          {w.artifacts.steps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      </Section>

      {/* ── ПЕТЛЯ ЗАПОМИНАНИЯ: `flow` в одну колонку ──────────────────────── */}
      <Section id="memoization" lead={w.memoization.lead} title={w.memoization.title}>
        <ol className="space-y-2">
          {w.memoization.chain.map((step, i) => (
            <li className="flex items-start gap-3" key={step}>
              <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border border-muted-foreground/30 text-[length:var(--fs-small)]">
                {i + 1}
              </span>
              <span className="text-[length:var(--fs-small)] leading-relaxed">{step}</span>
            </li>
          ))}
        </ol>
      </Section>

      <Section id="evolution" lead={w.evolution.lead} title={w.evolution.title}>
        <div className="grid gap-3 md:grid-cols-3">
          {w.evolution.items.map((i) => (
            <Card body={i.body} key={i.title} title={i.title} />
          ))}
        </div>
      </Section>

      <Section id="stores" lead={w.stores.lead} title={w.stores.title}>
        <div className="grid gap-3 md:grid-cols-2">
          {w.stores.items.map((i) => (
            <Card body={i.body} key={i.title} title={i.title} />
          ))}
        </div>
      </Section>

      <Section id="media" lead={w.media.lead} title={w.media.title}>
        <div className="grid gap-3 md:grid-cols-2">
          {w.media.items.map((i) => (
            <Card body={i.body} key={i.title} title={i.title} />
          ))}
        </div>
      </Section>

      {/* ── СТЕНД ─────────────────────────────────────────────────────────── */}
      <Section id="bench" lead={w.bench.lead} title={w.bench.title}>
        <ul className="ml-5 list-disc space-y-2 text-[length:var(--fs-small)] leading-relaxed">
          {w.bench.items.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
        <p className="mt-4 font-mono text-[length:var(--fs-small)] text-muted-foreground">{w.bench.where}</p>
      </Section>

      {/* ── СРАВНЕНИЕ: таблиц столько, сколько их в словаре ────────────────
          🔒 Конкуренты приходят данными: вторая таблица приехала через минуту
          после первой, третья приедет так же — и вёрстку это не тронет. */}
      <Section id="comparison" lead={w.comparison.lead} title={w.comparison.title}>
        <div className="space-y-8">
          {w.comparison.tables.map((t) => (
            <div key={t.title}>
              <div className="mb-3 text-[length:var(--fs-body)] font-medium">{t.title}</div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[length:var(--fs-small)]">
                  <thead className="text-muted-foreground">
                    <tr>
                      <th className="py-2 pr-4 font-medium">{w.comparison.feature}</th>
                      <th className="py-2 pr-4 font-medium text-foreground">{w.comparison.ours}</th>
                      {t.rivals.map((r) => (
                        <th className="py-2 pr-4 font-medium" key={r}>
                          {r}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {t.rows.map((row) => (
                      <tr className="border-t border-muted-foreground/15 align-top" key={row.feature}>
                        <td className="py-2 pr-4 font-medium">{row.feature}</td>
                        <td className="py-2 pr-4">{row.ours}</td>
                        {row.rivals.map((cell, i) => (
                          <td className="py-2 pr-4 text-muted-foreground" key={`${row.feature}-${t.rivals[i] ?? i}`}>
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ── ПРИМЕРЫ API: вид `code` каталога ───────────────────────────────── */}
      <Section id="api" lead={w.api.lead} title={w.api.title}>
        <div className="space-y-5">
          {w.api.samples.map((s) => (
            <div key={s.title}>
              <div className="mb-2 text-[length:var(--fs-small)] font-medium">{s.title}</div>
              <Code>{s.code}</Code>
            </div>
          ))}
        </div>
      </Section>

      {/* ── УСТАНОВКА: одна мысль, ни одной команды ────────────────────────── */}
      <Section id="install" lead={w.install.lead} title={w.install.title}>
        <div className="rounded-lg border border-primary/40 bg-primary/5 p-4">
          <p className="max-w-3xl text-[length:var(--fs-small)] leading-relaxed">{w.install.body}</p>
        </div>
      </Section>

      <Section id="principles" title={w.principles.title}>
        <div className="grid gap-3 md:grid-cols-3">
          {w.principles.items.map((i) => (
            <Card body={i.body} key={i.title} title={i.title} />
          ))}
        </div>
      </Section>

      {/* ── ЗАВЕРШАЮЩИЙ ПРИЗЫВ: вид `cta` каталога ────────────────────────── */}
      <Section id="cta" title={w.cta.title}>
        <p className="max-w-3xl text-[length:var(--fs-small)] leading-relaxed">{w.cta.body}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            className="rounded-md bg-primary px-4 py-2 text-[length:var(--fs-small)] font-medium text-primary-foreground hover:opacity-90"
            href={`/${lang}/passport`}
          >
            {w.cta.primary}
          </Link>
          <a
            className="rounded-md border border-muted-foreground/30 px-4 py-2 text-[length:var(--fs-small)] font-medium hover:bg-muted"
            href="https://github.com/Fractera/fractera-memory-starter"
            rel="noreferrer"
            target="_blank"
          >
            {w.cta.secondary}
          </a>
        </div>
      </Section>
    </main>
  );
}
