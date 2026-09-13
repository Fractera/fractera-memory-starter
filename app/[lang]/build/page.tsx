import { redirect } from "next/navigation"
import { Suspense } from "react"
import { AlertTriangle } from "lucide-react"
import { PageCrumbs } from "@/components/nav/page-crumbs.server"
import { Eyebrow, H1, Lead } from "@/components/ui/typography"
import { fracteraSession } from "@/lib/fractera/session"
import { TerminalPanel } from "../terminal/_components/terminal-panel.client"
import { buildUi } from "./_i18n/build.i18n"

// СТРАНИЦА «ПОСТРОЙТЕ ЭТОТ ПРОДУКТ» (189-8).
//
// 🎯 ЗАКАЗ ВЛАДЕЛЬЦА 2026-09-13: «нужна вкладка с терминалом, которая будет
// называться „постройте этот продукт“. Идея в том, чтобы Claude Code в этой
// папке с запретом посещать другие и предложить в этот проект добавить
// обновления. С предупреждением: что вы впускаете процесс, который на
// фундаментальном уровне способен модифицировать и даже иногда истощить текущую
// версию. Но вы можете сделать откат к предыдущей версии. Используйте это
// только если вы знаете, о чём речь!»
//
// 🔒 ПРЕДУПРЕЖДЕНИЕ СТОИТ ДО ТЕРМИНАЛА, А НЕ ПОД НИМ. Человек, прочитавший о
// риске после того, как начал работу, читает не предупреждение, а объяснение
// случившегося.
//
// 🔒 ТЕРМИНАЛ ЗДЕСЬ ТОТ ЖЕ, ЧТО НА СТРАНИЦЕ ПОДПИСКИ, И ЭТО НЕ ЭКОНОМИЯ. У него
// внутри фильтр мыши, восстановление экрана и разбор ссылки входа; вторая копия
// разошлась бы с первой на первой правке. Различие приходит начальным режимом.
//
// 🛑 СТРАНИЦА СВОЯ, А НЕ РАЗДЕЛ `settings`, ПО ТОЙ ЖЕ ПРИЧИНЕ, ЧТО И ТЕРМИНАЛ
// ПОДПИСКИ: терминалу нужна ширина, а левая колонка разделов ему пустая.
//
// 🛑 НАСТРОЕК СЕГМЕНТА НЕТ: у шаблона включён `cacheComponents`.

const LANGS = ["en", "ru"] as const

export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }))
}

export default async function BuildPage({
  params,
}: {
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params
  const ui = buildUi(lang)

  return (
    <main className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col gap-8 px-6 py-10 md:px-8">
      <div className="flex flex-col gap-4">
        <PageCrumbs trail={[{ href: `/${lang}`, label: ui.layer }, { label: ui.title }]} />

        <header className="flex flex-col gap-4 border-border border-b pb-8">
          <Eyebrow>{ui.layer}</Eyebrow>
          <H1>{ui.title}</H1>
          <Lead className="max-w-3xl">{ui.lead}</Lead>
        </header>
      </div>

      {/* 🛑 ОДИН ЦВЕТ ТРЕВОГИ И ОДНА ВРЕЗКА. Красная говорит, ЧТО БУДЕТ, если
          сделать иначе; вторая такая же рядом обесценила бы первую. */}
      <section className="rounded-lg border border-destructive/50 bg-destructive/5 p-5">
        <h2 className="flex items-center gap-2 font-medium text-[length:var(--fs-h3)]">
          <AlertTriangle className="size-5" />
          {ui.warnTitle}
        </h2>
        <p className="mt-3 max-w-3xl text-[length:var(--fs-body)]">{ui.warnBody}</p>
        <p className="mt-3 max-w-3xl text-[length:var(--fs-body)]">{ui.warnRollback}</p>
        <p className="mt-3 max-w-3xl font-medium text-[length:var(--fs-body)]">{ui.warnOnly}</p>
      </section>

      <section className="space-y-2">
        <h2 className="font-medium text-[length:var(--fs-h3)]">{ui.boundsTitle}</h2>
        <ul className="max-w-3xl list-disc space-y-1 pl-5 text-[length:var(--fs-body)] text-muted-foreground">
          {ui.bounds.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      </section>

      <Suspense fallback={<div className="min-h-[480px] w-full rounded-lg bg-muted/40" />}>
        <BuildGate lang={lang} />
      </Suspense>
    </main>
  )
}

/**
 * 🔒 ЗАМОК СТОИТ ЗДЕСЬ И В ДВЕРИ БИЛЕТА, И ЭТО НЕ ИЗБЫТОЧНОСТЬ: страница прав не
 * выдаёт — их выдаёт билет; а без проверки здесь человек без прав увидел бы
 * пустой экран терминала и решил, что тот сломан.
 */
async function BuildGate({ lang }: { lang: string }) {
  const session = await fracteraSession()
  if (!session) {
    redirect(`/${lang}/welcome`)
  }
  if (!session.roles.includes("architect")) {
    redirect("/")
  }
  return <TerminalPanel lang={lang} start="build" />
}
