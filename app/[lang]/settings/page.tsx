import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Suspense } from "react";
import { METHODS } from "@/contract.mjs";
import { Breadcrumbs } from "@/components/nav/breadcrumbs.server";
import { Eyebrow, H1, Lead } from "@/components/ui/typography";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { MemoryBench } from "./_components/memory-bench.client";
import { JournalView } from "./_components/journal-view.client";
import { OpenAiTab } from "./_components/openai-tab";
import { AnthropicKeySection } from "./_components/anthropic-key";
import { PassportBody } from "./_components/passport-body.client";
import { ApiDoc } from "./_components/api-doc";
import { memoryUi } from "./_i18n/memory.i18n";
import {
  hrefOfMemorySection,
  MEMORY_SECTIONS,
  resolveMemorySection,
} from "./_lib/memory-sections";
import { passportOutline } from "./_lib/passport-outline";

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

/**
 * Что договор принимает у двух глаголов — ПОРОЖДЕНО, А НЕ ПЕРЕЧИСЛЕНО (183-1).
 *
 * 🔒 ОТСЮДА МЕТКИ «ДОЕЗЖАЕТ» / «ПОКА НЕ ДОЕЗЖАЕТ» У КАЖДОГО ОРГАНА СТЕНДА.
 * Рукописный список поддержанного разошёлся бы с `contract.mjs` молча — в этом
 * проекте такое оплачено пять раз за две недели, и дважды автором закона об
 * этом. Растёт договор — метки на экране меняются сами, без правки страницы.
 */
/**
 * Внешний адрес службы для примеров вкладки API (185).
 *
 * 🔒 БЕРЁТСЯ ИЗ ОКРУЖЕНИЯ МАШИНЫ, А НЕ ПИШЕТСЯ КОНСТАНТОЙ. Домен у каждого
 * сервера свой; зашитый адрес отправил бы чужого человека на нашу машину —
 * и он бы не понял, почему ключ не подходит.
 * 🛑 УМОЛЧАНИЕ — ПЕТЛЯ, И ЭТО ЧЕСТНО: пока домен не назван, снаружи службы
 * и правда нет. Обещать адрес, которого нет, хуже, чем показать локальный.
 */
function memoryBase(): string {
  const named = process.env.MEMORY_PUBLIC_URL ?? process.env.NEXT_PUBLIC_MEMORY_URL ?? "";
  return named.replace(/\/+$/, "") || "http://127.0.0.1:3700";
}

function supportedParams(): { recall: string[]; remember: string[] } {
  const of = (name: string) =>
    (METHODS.find((m) => m.name === name)?.params ?? []).map((p) => p.name);
  return { recall: of("recall"), remember: of("remember") };
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

  // 🔒 ДОКУМЕНТ ЧИТАЕТСЯ С ДИСКА НА КАЖДЫЙ ЗАПРОС, И ЭТО ГЛАВНОЕ ЕГО СВОЙСТВО:
  // владелец правит `development-docs/PASSPORT.md` — и видит правку на следующей
  // загрузке, без сборки и без перезапуска. Тот же приём, что у паспорта чата.
  // 🛑 ЧИТАЕМ ТОЛЬКО КОГДА РАЗДЕЛ ОТКРЫТ: страница со стендом не должна платить
  // чтением файла, который на ней не показывают.
  let passport = "";
  if (active === "passport") {
    try {
      passport = await readFile(join(process.cwd(), "development-docs", "PASSPORT.md"), "utf8");
    } catch {
      // Файла нет — раздел скажет это словами ниже, а не покажет пустоту.
      passport = "";
    }
  }
  // 🔒 ЗАГОЛОВКИ ПЕРВОГО УРОВНЯ СТАНОВЯТСЯ ЛИПКИМ МЕНЮ — той же полосой раздела,
  // что у соседей. Второе меню своей конструкции рядом с ней разошлось бы с ним.
  const passportTabs = passportOutline(passport).map((i) => ({
    active: false,
    href: `#${i.id}`,
    label: i.title,
  }));

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
          tabs={active === "passport" ? passportTabs : undefined}
          title={ui.pages[active].title}
        >
          <div className="space-y-6">
            {/* 🔒 СЛОВА УЕЗЖАЮТ ОСТРОВКАМ ПЕРЕЧИСЛЕННЫМИ ПОИМЁННО, а не словарём
                целиком: тип не сужает рантайм — по проводу уедет всё переданное,
                даже неотрисованное. Закон оплачен в панели дважды за один шаг. */}
            {active === "passport" &&
              (passport ? (
                <PassportBody text={passport} />
              ) : (
                <p className="text-[length:var(--fs-small)] text-muted-foreground">
                  {ui.passportMissing}
                </p>
              ))}

            {active === "memory-test" && (
              <MemoryBench
                lang={lang}
                supported={supportedParams()}
                tablesWords={ui.memoryTables}
                testWords={ui.memoryTest}
              />
            )}

            {/* 🔒 ВКЛАДКА API — ДОКУМЕНТАЦИЯ ДЛЯ ВНЕШНИХ ИНСТРУМЕНТОВ (185).
                Адрес службы считается ОДИН раз здесь и уезжает пропсом: в
                примерах и в инструкции Postman должен стоять тот адрес, по
                которому человек реально придёт, а не выдуманный образец. */}
            {active === "api" && <ApiDoc base={memoryBase()} keyWords={ui.apiKey} lang={lang} />}

            {active === "journal" && <JournalView words={ui.journal} />}

            {active === "openai" && <OpenAiTab ui={ui} />}

            {/* 🔒 «НАСТРОЙКИ» ПАМЯТИ — ПОКА ОДНА КАРТОЧКА, И ЭТО ЧЕСТНО (181-9).
                Слово владельца: «в кнопку настройки скопируй то же самое решение
                которое у нас существует для подключения Anthropic ключа».
                Карточка, форма и дверь — те же файлы, что у чата, байт в байт. */}
            {active === "settings" && <AnthropicKeySection />}
          </div>
        </WorkspaceShell>
      </div>
    </main>
  );
}
