import Link from "next/link";
import { Eyebrow, H1, Lead } from "@/components/ui/typography";
import { landingWords } from "../_i18n/landing.i18n";
import { LandingToc } from "./landing-toc";
import { breadcrumbSchema, faqSchema, FRACTERA_PROJECT_URL, softwareSchema, urlFor, webSiteSchema } from "@/lib/seo";

/** Пункт схемы обработки запроса: номер выводится из места, а не пишется в словаре — иначе он разошёлся бы при вставке пункта. */
type FlowItem = { text: string; items?: FlowItem[]; skills?: string[]; plan?: string };
type SkillLabels = { have: string; plan: string };

/**
 * Метка навыка у пункта (слово владельца 2026-09-15): зелёная — навык есть, при наведении его имя; красная — навыка нет,
 * при наведении имя навыка, который предстоит создать. Подсказка — `title`, без скриптов; `aria-label` для экранного диктора.
 */
function SkillMark({ item, labels }: { item: { skills?: string[]; plan?: string }; labels: SkillLabels }) {
  const have = item.skills?.length ? item.skills : null;
  if (!have && !item.plan) return null;
  const tip = have ? `${labels.have} ${have.join(", ")}` : `${labels.plan} ${item.plan}`;
  return (
    <span
      aria-label={tip}
      className={`mt-[0.5em] inline-block size-2.5 shrink-0 cursor-help rounded-full outline-offset-2 focus-visible:outline-2 ${
        have ? "bg-green-600 dark:bg-green-400" : "bg-red-600 dark:bg-red-400"
      }`}
      role="img"
      tabIndex={0}
      title={tip}
    />
  );
}

function FlowList({ items, prefix, labels }: { items: FlowItem[]; prefix: string; labels: SkillLabels }) {
  return (
    <ol className="mt-2 space-y-1.5">
      {items.map((item, i) => (
        <li className="flex gap-2 leading-relaxed" key={`${prefix}${i}`}>
          <SkillMark item={item} labels={labels} />
          <span className="shrink-0 font-mono text-muted-foreground tabular-nums">{`${prefix}${i + 1}.`}</span>
          <div className="min-w-0">
            {item.text}
            {item.items?.length ? <FlowList items={item.items} labels={labels} prefix={`${prefix}${i + 1}.`} /> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}

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
  building,
  children,
  id,
  lead,
  title,
}: {
  /**
   * Что из этого раздела ещё строится — словами, ПОД ЛИДОМ, а не сноской внизу страницы (205-12).
   *
   * 🔒 ПОМЕТКА СТОИТ ТАМ, ГДЕ ЧИТАЮТ ОБЕЩАНИЕ. Сноска внизу длинной страницы честна формально:
   * до неё не доходит тот, кто уже поверил заголовку. ✗ Оплачено сверкой 205-11 — страница
   * обещала поиск по радиусу, мемоизацию и эволюцию навыков как построенное.
   */
  building?: string;
  children?: React.ReactNode;
  id: string;
  lead?: string;
  title: string;
}) {
  return (
    // `scroll-mt-16` (194-12): шапка липкая и высотой `h-14` — без отступа заголовок раздела, к которому ведёт
    // оглавление, останавливался бы под ней.
    <section className="scroll-mt-16 border-border border-t py-12 first:border-t-0" id={id}>
      <div className="mx-auto w-full max-w-5xl px-6">
        <h2 className="text-[length:var(--fs-h2)] font-semibold tracking-tight">{title}</h2>
        {lead ? <p className="mt-3 max-w-3xl text-[length:var(--fs-body)] text-muted-foreground">{lead}</p> : null}
        {building ? (
          <p className="mt-4 max-w-3xl rounded-md border border-border border-l-4 bg-muted px-4 py-3 text-[length:var(--fs-small)]">
            {building}
          </p>
        ) : null}
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

export function Landing({ base, lang }: { base: string; lang: string }) {
  const w = landingWords(lang);

  // 🔒 РАЗМЕТКА СТРОИТСЯ ИЗ ТЕХ ЖЕ СТРОК, ЧТО ВИДИТ ЧЕЛОВЕК (186-2). Вторая
  // копия вопросов «для поисковика» разошлась бы с видимой на первой правке, а
  // разметка, не совпадающая с текстом страницы, — это ровно то, за что
  // поисковик наказывает.
  const schemas = [
    softwareSchema({ base, description: w.seo.description, lang, name: "Fractera Memory" }),
    webSiteSchema({ base, description: w.seo.description, lang, name: "Fractera Memory" }),
    faqSchema(w.faq.items),
    breadcrumbSchema([
      { name: "Fractera Memory", url: urlFor(base, lang) },
      { name: w.cta.primary, url: urlFor(base, lang, "/settings") },
    ]),
  ];

  return (
    <main className="min-h-screen bg-background">
      {/* 🔒 РАЗМЕТКА ОДНИМ БЛОКОМ, ПЕРВЫМ В ДЕРЕВЕ: машина читает её до текста,
          и её отсутствие в первом килобайте — частая причина, по которой богатый
          сниппет не собирается вовсе. */}
      <script
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas) }}
        type="application/ld+json"
      />
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
              href={`/${lang}/settings`}
            >
              {w.hero.secondary}
            </Link>
          </div>
        </div>
      </section>

      {/* ── ОГЛАВЛЕНИЕ (194-12) ──────────────────────────────────────────────
          🔒 Порядок и id — ровно те, что у разделов ниже, заголовки — те же ключи словаря. Каждое
          `#id` сверяется с `id=` отданной страницы прибором; новый раздел добавляется сюда той же правкой. */}
      <LandingToc
        heading={w.toc.heading}
        items={[
          { id: "concept", text: w.problem.title },
          { id: "router", text: w.router.title },
          { id: "schema", text: w.schema.title },
          { id: "ladder", text: w.ladder.title },
          { id: "scope", text: w.scope.title },
          { id: "artifacts", text: w.artifacts.title },
          { id: "memoization", text: w.memoization.title },
          { id: "evolution", text: w.evolution.title },
          { id: "stores", text: w.stores.title },
          { id: "media", text: w.media.title },
          { id: "bench", text: w.bench.title },
          { id: "comparison", text: w.comparison.title },
          { id: "api", text: w.api.title },
          { id: "install", text: w.install.title },
          { id: "principles", text: w.principles.title },
          { id: "faq", text: w.faq.title },
          { id: "project", text: w.project.label },
          { id: "cta", text: w.cta.title },
        ]}
        label={w.toc.label}
      />

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
          {/* 🔒 214-3: СХЕМА ЗАМЫКАЕТСЯ. Слово владельца: «диаграмма неполная, так как ответ у нас
              заканчивается, а возможно обратной связью с эволюционным циклом». Обрываясь на ответе,
              она учила бы, что на нём всё и кончается, — а отзыв человека возвращает цикл к началу. */}
          <div className="text-center text-muted-foreground">↓</div>
          <div className="rounded-lg border border-muted-foreground/25 px-4 py-3 text-center text-[length:var(--fs-small)]">
            {w.router.answerBox}
          </div>
          <div className="text-center text-muted-foreground">↓</div>
          <div className="rounded-lg border border-primary/40 bg-primary/5 p-4">
            <div className="text-[length:var(--fs-small)] font-medium">{w.router.loopBox}</div>
            <p className="mt-2 text-[length:var(--fs-small)] text-muted-foreground">{w.router.loopCost}</p>
          </div>
          <div className="text-center text-[length:var(--fs-small)] text-muted-foreground">{w.router.loopBack}</div>
        </div>
      </Section>

      <Section id="schema" title={w.schema.title}>
        <p className="max-w-3xl text-[length:var(--fs-small)] leading-relaxed">{w.schema.body}</p>
      </Section>

      {/* ── КАК ПАМЯТЬ ОБРАБАТЫВАЕТ ЗАПРОС: фазы нумерованным списком, сноски «в разработке» (204) ──
          🔒 Таблица «лестницы цены» снята: она сливала оба глагола в одну цепочку. Якорь `#ladder` сохранён — на него ведёт оглавление. */}
      <Section id="ladder" lead={w.ladder.lead} title={w.ladder.title}>
        <ol className="max-w-3xl space-y-5 text-[length:var(--fs-small)]">
          {w.ladder.phases.map((phase, i) => (
            <li key={phase.title}>
              <div className="flex gap-2 font-medium">
                <SkillMark item={phase} labels={w.ladder.skillLabels} />
                <span className="font-mono text-primary tabular-nums">{`${i + 1}.`}</span>
                <span>{phase.title}</span>
              </div>
              <div className="pl-5">
                <FlowList items={phase.items} labels={w.ladder.skillLabels} prefix={`${i + 1}.`} />
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-6 max-w-3xl border-t border-muted-foreground/15 pt-4 text-[length:var(--fs-small)]">
          <div className="font-medium">{w.ladder.notesTitle}</div>
          <ul className="mt-2 space-y-2 text-muted-foreground">
            {w.ladder.notes.map((n) => (
              <li className="flex gap-2 leading-relaxed" key={n.mark}>
                <span className="shrink-0 font-mono text-primary">{n.mark}</span>
                <span>{n.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </Section>


      <Section building={w.scope.building} id="scope" lead={w.scope.lead} title={w.scope.title}>
        <div className="grid gap-3 md:grid-cols-3">
          {w.scope.items.map((i) => (
            <Card body={i.body} key={i.title} title={i.title} />
          ))}
        </div>
      </Section>

      {/* ── АРТЕФАКТЫ: вид `olist` каталога ────────────────────────────────── */}
      <Section building={w.artifacts.building} id="artifacts" lead={w.artifacts.lead} title={w.artifacts.title}>
        <ol className="ml-5 list-decimal space-y-2 text-[length:var(--fs-small)] leading-relaxed">
          {w.artifacts.steps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      </Section>

      {/* ── ПЕТЛЯ ЗАПОМИНАНИЯ: `flow` в одну колонку ──────────────────────── */}
      <Section building={w.memoization.building} id="memoization" lead={w.memoization.lead} title={w.memoization.title}>
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

      <Section building={w.evolution.building} id="evolution" lead={w.evolution.lead} title={w.evolution.title}>
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
      <Section building={w.api.building} id="api" lead={w.api.lead} title={w.api.title}>
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

      {/* ── ВОПРОСЫ И ОТВЕТЫ: тот самый блок стартера (186-2) ───────────────
          🔒 Раскрывающиеся элементы — `<details>`, а не своя реализация на
          состоянии: содержимое ответа лежит в разметке ВСЕГДА и читается
          машиной даже закрытым. Аккордеон на JavaScript прячет текст и от
          поисковика тоже. */}
      <Section id="faq" lead={w.faq.lead} title={w.faq.title}>
        <div className="divide-y divide-muted-foreground/15 border-y border-muted-foreground/15">
          {w.faq.items.map((i) => (
            <details className="group py-3" key={i.q}>
              <summary className="cursor-pointer list-none text-[length:var(--fs-body)] font-medium marker:content-none">
                <span className="mr-2 inline-block text-muted-foreground transition-transform group-open:rotate-90">
                  ›
                </span>
                {i.q}
              </summary>
              <p className="mt-2 max-w-3xl pl-5 text-[length:var(--fs-small)] leading-relaxed text-muted-foreground">
                {i.a}
              </p>
            </details>
          ))}
        </div>
      </Section>

      {/* ── ПРОЕКТ: ЕДИНСТВЕННАЯ ВНЕШНЯЯ ССЫЛКА СТРАНИЦЫ ───────────────────
          🎯 Слово владельца: «эти страницы будут попадать каждому пользователю,
          нужно поставить одну внешнюю ссылку на проект Fractera».
          🔒 ОДНА, И ЭТО ЧИСЛО. Повторённая в каждом разделе, она читается
          машиной как навязчивая перелинковка, а человеком — как реклама. Её же
          машинное упоминание живёт в схеме полем `isPartOf`, и это не вторая
          ссылка, а тот же факт для другого читателя. */}
      <Section id="project" title={w.project.label}>
        <p className="max-w-3xl text-[length:var(--fs-small)] leading-relaxed">{w.project.body}</p>
        <a
          className="mt-4 inline-block rounded-md border border-muted-foreground/30 px-4 py-2 text-[length:var(--fs-small)] font-medium hover:bg-muted"
          href={FRACTERA_PROJECT_URL}
          rel="noopener"
          target="_blank"
        >
          {w.project.label}
        </a>
      </Section>

      {/* ── ЗАВЕРШАЮЩИЙ ПРИЗЫВ: вид `cta` каталога ────────────────────────── */}
      <Section id="cta" title={w.cta.title}>
        <p className="max-w-3xl text-[length:var(--fs-small)] leading-relaxed">{w.cta.body}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            className="rounded-md bg-primary px-4 py-2 text-[length:var(--fs-small)] font-medium text-primary-foreground hover:opacity-90"
            href={`/${lang}/settings`}
          >
            {w.cta.primary}
          </Link>
          {/* 🛑 ВТОРОЙ ВНЕШНЕЙ ССЫЛКИ ЗДЕСЬ НЕТ НАМЕРЕННО: владелец просил ОДНУ
              на страницу, и она стоит разделом выше. 🪦 Кнопка вела к паспорту до 208-3 —
              внутрь службы. */}
          <Link
            className="rounded-md border border-muted-foreground/30 px-4 py-2 text-[length:var(--fs-small)] font-medium hover:bg-muted"
            href={`/${lang}/settings?section=api`}
          >
            {w.cta.secondary}
          </Link>
        </div>
      </Section>
    </main>
  );
}
