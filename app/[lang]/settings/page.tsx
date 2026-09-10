import { Suspense } from "react";
import { Breadcrumbs } from "@/components/nav/breadcrumbs.server";
import { Eyebrow, H1, Lead } from "@/components/ui/typography";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { MemoryBench } from "./_components/memory-bench.client";
import { JournalView } from "./_components/journal-view.client";
import { OpenAiTab } from "./_components/openai-tab";
import { memoryUi } from "./_i18n/memory.i18n";
import {
  hrefOfMemorySection,
  MEMORY_SECTIONS,
  resolveMemorySection,
} from "./_lib/memory-sections";

// СТРАНИЦА ПАМЯТИ — СКОПИРОВАНА СО СЛУЖБЫ ЧАТА И УРЕЗАНА (178-2).
//
// 🎯 ЦЕЛЬ ВЛАДЕЛЬЦА, ДОСЛОВНО (2026-09-10): «чтобы мы прям память тестировали из
// памяти, а не из чата». Стенд стоит на самой службе, которую испытывает: между
// человеком и памятью не осталось ни одной чужой службы.
//
// 🔒 СПОСОБ ТОЖЕ НАЗВАН ИМ, И ПОВТОРЁН ДВАЖДЫ: «буквально скопируем всё, что
// есть, а потом уберём лишнее», «мы не программируем всё заново». Поэтому шапка,
// подвал, раскладка и элементы приехали ФАЙЛАМИ из `fractera-telegrambot-starter`,
// а не написаны здесь. Убрано шесть разделов из семи — они про бота, а не про
// память.
//
// 🛑 ЦЕНА НАЗВАНА ОТДЕЛЬНО: закон службы «ноль зависимостей» этим отменён,
// надгробие с датой стоит в `development-docs/LAWS.md`.
//
// 🔒 ШАПКА СОБРАНА `H1`/`Lead`/`Eyebrow` ИЗ ТОГО ЖЕ `typography.tsx`, А КРОШКИ —
// СВОИ, ХАРДКОДОМ. В источнике этот же приём и по той же причине: тамошние
// крошки тянут имя сайта из `APP-CONFIG` и разметку для поисковика, а служба
// обязана жить, когда приложения на 3000 нет вовсе.
//
// 🛑 `runtime` И `dynamic` НЕ ОБЪЯВЛЯЮТСЯ: `cacheComponents` их отвергает.

// 🔒 ЯЗЫКИ ПЕРЕЧИСЛЕНЫ ЗДЕСЬ ЖЕ, КАК В ИСТОЧНИКЕ. Без `generateStaticParams`
// сборка не знает, какие сегменты пререндерить, и падает на первом же — это и
// был отказ, который я сперва принял за проблему раскладки.
const LANGS = ["en", "ru"] as const;

export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }));
}

// ✗ СТРАНИЦА ЖИВЁТ ПОД `<Suspense>`, И ЭТО ОПЛАЧЕНО СБОРКОЙ, А НЕ ВЫВЕДЕНО.
// Первая сборка здесь упала: «Uncached data was accessed outside of <Suspense>»
// — под `cacheComponents` этого требует уже сама раскладка (подвал печатает год
// копирайта, то есть зависит от запроса).
// 🔒 ПРИЁМ ПОВТОРЁН ЗА ИСТОЧНИКОМ, А НЕ ИЗОБРЕТЁН: ровно так же обёрнута
// страница `settings` службы чата и страница терминала. Копируя экран, копируй
// и то, чем он держится.
export default function MemoryPage(props: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <MemoryPageBody {...props} />
    </Suspense>
  );
}

async function MemoryPageBody({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { lang } = await params;
  const sp = await searchParams;
  const raw = typeof sp.section === "string" ? sp.section : undefined;
  const active = resolveMemorySection(raw);
  const ui = memoryUi(lang);

  return (
    <main className="min-h-screen bg-background">
      <div className="px-6 py-[var(--page-py-work)]" data-app-column>
        <div className="flex flex-col gap-4">
          <Breadcrumbs
            trail={[
              { label: ui.layer },
              { href: hrefOfMemorySection(lang, "memory-test"), label: ui.title },
              { label: ui.pages[active].title },
            ]}
          />

          <header className="flex flex-col gap-4 border-border border-b pb-8">
            <Eyebrow>{ui.layer}</Eyebrow>
            <H1>{ui.title}</H1>
            <Lead className="max-w-3xl">{ui.subtitle}</Lead>
          </header>
        </div>

        <WorkspaceShell
          id="memory"
          lead={ui.pages[active].hint}
          // 🔒 МЕНЮ ПОРОЖДАЕТСЯ ИЗ `MEMORY_SECTIONS`, А НЕ ПЕРЕЧИСЛЯЕТСЯ ЗДЕСЬ.
          // Тот массив — единственный источник И меню, И маршрутизации; второй
          // список разошёлся бы с ним молча, как это уже случалось у соседа.
          // 🔒 «ПОДПИСКА» СТОИТ В МЕНЮ, НО РАЗДЕЛОМ НЕ ЯВЛЯЕТСЯ (180-2) — тот же
          // приём, что «Терминал» у чата. Пункт уводит на отдельную страницу
          // `/terminal` в соседней вкладке, поэтому его нет в `MEMORY_SECTIONS`:
          // тот массив — единственный источник разделов, и запись в нём означала
          // бы раздел, которого нет.
          // 🔒 «ПОДПИСКА CLAUDE» СТОИТ ПРЯМО НАД «ПОДПИСКОЙ OpenAI» (181-1, слово
          // владельца: «под кнопкой подписка Claude должна быть кнопка подписка
          // OpenAI»). Claude — отдельная страница входа в соседней вкладке, OpenAI —
          // раздел этой страницы; поэтому первое вставляется ссылкой перед вторым, а в
          // `MEMORY_SECTIONS` живёт только второе.
          menu={MEMORY_SECTIONS.flatMap((id) => {
            const item = {
              active: id === active,
              href: hrefOfMemorySection(lang, id),
              label: ui.pages[id].title,
            };
            return id === "openai"
              ? [{ href: `/${lang}/terminal`, label: ui.terminalLabel, newTab: true }, item]
              : [item];
          })}
          menuTitle={ui.menuTitle}
          menuWord={ui.menuWord}
          title={ui.pages[active].title}
        >
          <div className="space-y-6">
            {/* 🔒 СЛОВА УЕЗЖАЮТ ОСТРОВКАМ ПЕРЕЧИСЛЕННЫМИ ПОИМЁННО, а не словарём
                целиком: тип не сужает рантайм — по проводу уедет всё переданное,
                даже неотрисованное. Закон оплачен в панели дважды за один шаг. */}
            {active === "memory-test" && (
              <MemoryBench tablesWords={ui.memoryTables} testWords={ui.memoryTest} />
            )}

            {active === "journal" && <JournalView words={ui.journal} />}

            {active === "openai" && <OpenAiTab ui={ui} />}
          </div>
        </WorkspaceShell>
      </div>
    </main>
  );
}
