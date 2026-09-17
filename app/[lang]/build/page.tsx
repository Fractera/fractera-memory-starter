import Link from "next/link"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { sameSecret } from "@/lib/bench-guard"
import { Suspense } from "react"
import { AlertTriangle, BookOpen, ChevronDown, FileText, GitFork } from "lucide-react"
import { workspaceDir } from "@/lib/fractera/workspace-dir.mjs"
import { PageCrumbs } from "@/components/nav/page-crumbs.server"
import { Eyebrow, H1, Lead } from "@/components/ui/typography"
import { WorkspaceShell, type WorkspaceShellItem } from "@/components/workspace/workspace-shell"
import { fracteraSession } from "@/lib/fractera/session"
import { docFor, fullPath, listSkills, listSteps, readCurrent, readInstruction } from "@/lib/build-docs.mjs"
import { listTasks } from "@/lib/build-tasks.mjs"
import { signals } from "@/lib/signals.mjs"
import { DocBody } from "../settings/_components/doc-body.client"
import { SettingsCard } from "../settings/_components/settings-card"
import { suggestedBotName, suggestedBotUsername, suggestedCcid } from "@/lib/channel/identity.mjs"
import { channelState } from "@/lib/channel/telegram.mjs"
import { TerminalPanel } from "../terminal/_components/terminal-panel.client"
import { BuildChannel } from "./_components/build-channel.client"
import { BuildSignals } from "./_components/build-signals.client"
import { BuildTasks } from "./_components/build-tasks.client"
import { BuildTerminal } from "./_components/build-terminal.client"
import { DocModal } from "./_components/doc-modal"
import { buildUi, type BuildUi } from "./_i18n/build.i18n"
import { BUILD_PATHS, BUILD_TOP, type BuildSection, hrefOfBuild, inSteps, resolveBuildSection } from "./_lib/build-sections"

// МАСТЕРСКАЯ РАЗРАБОТКИ «ПОСТРОЙТЕ ЭТОТ ПРОДУКТ» (189-8 → шаг 202).
//
// 🎯 ЗАКАЗ ВЛАДЕЛЬЦА 2026-09-13 — терминал Claude Code в папке продукта с предупреждением о риске; 2026-09-15 —
// «здесь нет , стандартного для остальных вкладок , дизайна - я говорю про двухколоночный кейс с левым меню и
// правой колонкой . Надо именно так», и шесть пунктов меню сверху вниз.
//
// 🪦 ЗДЕСЬ СТОЯЛА СТРАНИЦА-ТЕРМИНАЛ НА ВСЮ ШИРИНУ С ДОВОДОМ «терминалу нужна ширина, а левая колонка ему пустая».
// Довод снят словом владельца: колонка больше не пустая — в ней вся мастерская, а терминал — первый её раздел.
//
// 🔒 РАСКЛАДКА — ТА ЖЕ `WorkspaceShell`, ЧТО У ОСТАЛЬНЫХ ВКЛАДОК. Своя пара «меню плюс колонка» разошлась бы с ней
// на первой правке — это оплачено в проекте не раз.
// 🔒 ВЛОЖЕННОСТЬ МЕНЮ — ДВА УРОВНЯ И ТОЛЬКО У ОТКРЫТОГО РАЗДЕЛА (слово владельца: «по умолчанию все закрыты»):
// «Шаги разработки» раскрывают «Новые» и «Завершённые», а открытый подраздел — список шагов, новые сверху.
// 🔒 ДОКУМЕНТЫ ЧИТАЮТСЯ С ДИСКА НА КАЖДЫЙ ЗАПРОС И ТОЛЬКО ОТКРЫТОГО РАЗДЕЛА: Claude Code в терминале правит эти
// файлы, и человек видит правку на следующей загрузке без сборки.
// 🛑 СТРАНИЦА ЖИВЁТ ПОД `<Suspense>`: под `cacheComponents` чтение адреса вне него роняет сборку (оплачено в `settings`).

const LANGS = ["en", "ru"] as const
const REPO = "https://github.com/Fractera/fractera-memory-starter"

export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }))
}

export default function BuildPage(props: {
  params: Promise<{ lang: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <BuildBody {...props} />
    </Suspense>
  )
}

/** Пара имён для BotFather от ОДНОГО случайного кода: имя и ручка должны совпадать хвостом. */
function botSuggestion() {
  const ccid = suggestedCcid()
  return { suggestedBotName: suggestedBotName(ccid), suggestedBotUsername: suggestedBotUsername(ccid) }
}

async function BuildBody({
  params,
  searchParams,
}: {
  params: Promise<{ lang: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { lang } = await params
  const sp = await searchParams
  const ui = buildUi(lang)

  // 🔒 ЗАМОК ДО ПЕРВОГО ЧТЕНИЯ ДИСКА: заявки, шаги и инструкции — рабочие документы архитектора, как и терминал.
  // Секрет машины пропускается тем же правилом, что у дверей стенда (`benchGuard`): так мастерскую проверяет прибор.
  const machine = sameSecret((await headers()).get("x-data-secret") ?? "")
  if (!machine) {
    const session = await fracteraSession()
    if (!session) redirect(`/${lang}/welcome`)
    if (!session.roles.includes("architect")) redirect("/")
  }

  const active = resolveBuildSection(typeof sp.section === "string" ? sp.section : undefined)
  const docParam = typeof sp.doc === "string" ? sp.doc : ""
  const doc = docParam ? docFor(docParam) : null

  const newSteps = inSteps(active) ? listSteps("new") : []
  const doneSteps = inSteps(active) ? listSteps("done") : []
  const skills = active === "skills" ? listSkills() : []

  // ── МЕНЮ ──────────────────────────────────────────────────────────────────
  const items: WorkspaceShellItem[] = []
  const depth: number[] = []
  const push = (item: WorkspaceShellItem, d: number) => {
    items.push(item)
    depth.push(d)
  }
  for (const id of BUILD_TOP) {
    push({ active: id === active || (id === "steps" && active === "steps"), href: hrefOfBuild(lang, id), label: ui.sections[id].label }, 0)
    if (id === "steps" && inSteps(active)) {
      for (const sub of ["steps-new", "steps-done"] as const) {
        push({ active: active === sub && !docParam, href: hrefOfBuild(lang, sub), label: ui.sections[sub].label }, 1)
        if (active === sub) {
          const list = sub === "steps-new" ? newSteps : doneSteps
          const kind = sub === "steps-new" ? "step-new" : "step-done"
          for (const s of list) {
            const key = `${kind}:${s.n}`
            push({ active: docParam === key, href: hrefOfBuild(lang, sub, key), label: `${s.n} · ${shortTitle(s.title, s.n)}` }, 2)
          }
        }
      }
    }
    if (id === "skills" && active === "skills") {
      for (const s of skills) {
        const key = `skill:${s.name}`
        push({ active: docParam === key, href: hrefOfBuild(lang, "skills", key), label: s.name }, 1)
      }
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="px-6 py-[var(--page-py-work)]" data-app-column>
        <div className="flex flex-col gap-4">
          <PageCrumbs
            trail={[
              { href: `/${lang}`, label: ui.layer },
              { href: hrefOfBuild(lang, "terminal"), label: ui.title },
              { label: ui.sections[active].label },
            ]}
          />
          <header className="flex flex-col gap-4 border-border border-b pb-8">
            <Eyebrow>{ui.layer}</Eyebrow>
            <H1>{ui.title}</H1>
            <Lead className="max-w-3xl">{ui.lead}</Lead>

            {/* 🔒 ЦИТАТА — МЫСЛЬ ВЛАДЕЛЬЦА О ТОМ, ЧТО ЭТО ШАБЛОН ДЛЯ ДОСТРОЙКИ И ПРИГЛАШЕНИЕ СТРОИТЬ ВМЕСТЕ.
                Она стоит в главном описании, а не в разделе: её должен увидеть каждый, кто открыл мастерскую. */}
            <blockquote className="max-w-3xl border-primary border-l-4 bg-muted/40 py-3 pr-4 pl-5" data-build-quote>
              <p className="text-[length:var(--fs-body)] italic">{ui.quote}</p>
              <footer className="mt-2 text-[length:var(--fs-small)] text-muted-foreground">— {ui.quoteAuthor}</footer>
            </blockquote>

            {/* 🔒 КАК ПРИСОЕДИНИТЬСЯ — СВЁРНУТОЙ КАРТОЧКОЙ: путь участника нужен тому, кто решил поделиться, и не должен
                отодвигать мастерскую вниз у того, кто пришёл работать. */}
            <div className="max-w-3xl">
              <SettingsCard
                bodyClassName="space-y-3 p-4"
                icon={<GitFork className="size-4 text-muted-foreground" />}
                mark={{ "data-build-join": "" }}
                title={ui.join.title}
              >
                <ol className="list-decimal space-y-1 pl-5 text-[length:var(--fs-body)]">
                  {ui.join.steps.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ol>
                <div className="flex flex-wrap gap-4 text-[length:var(--fs-small)]">
                  <a className="underline underline-offset-4" href={REPO} rel="noopener noreferrer" target="_blank">
                    {ui.join.repoLabel}
                  </a>
                  <a className="underline underline-offset-4" href={`${REPO}/blob/main/CONTRIBUTING.md`} rel="noopener noreferrer" target="_blank">
                    {ui.join.guideLabel}
                  </a>
                </div>
              </SettingsCard>
            </div>
          </header>
        </div>

        <WorkspaceShell
          id="build"
          lead={
            <>
              {ui.sections[active].lead}
              {/* 🔒 ПУТЬ В ПРОЕКТЕ ПОД ЗАГОЛОВКОМ (202-8, слово владельца: «под заголовком рисуешь путь к файлу»). Лид рисуется внутри
                  абзаца — поэтому только строчные элементы: блок внутри <p> браузер разорвал бы молча. */}
              {BUILD_PATHS[active] && (
                <span className="mt-2 flex flex-wrap gap-2" data-build-path-row>
                  {/* 🔒 ПОЛНЫЙ АДРЕС ОТ КОРНЯ, ИЗ КОТОРОГО РАБОТАЕТ СЛУЖБА (слово владельца: «Это же не полный адрес он же начинается с
                      opt/fractera…?»). Корень берётся у процесса — на сервере `/opt/fractera/memory`, — а не вписывается руками. */}
                  {BUILD_PATHS[active]!.map((p) => (
                    <code
                      className="break-all rounded bg-muted px-2 py-0.5 font-mono text-[length:var(--fs-small)] text-foreground"
                      data-build-path={fullPath(p)}
                      key={p}
                    >
                      {fullPath(p)}
                    </code>
                  ))}
                </span>
              )}
            </>
          }
          menu={items}
          menuTitle={ui.menuTitle}
          menuWord={ui.menuWord}
          renderItem={(item, i) => (
            <span className="block truncate" data-menu-depth={depth[i]} style={{ paddingLeft: `${depth[i] * 0.85}rem` }}>
              {item.label}
            </span>
          )}
          title={ui.sections[active].label}
        >
          <div className="space-y-6" data-build-section={active}>
            <SectionBody
              active={active}
              doneSteps={doneSteps}
              heard={active === "signals" ? await signals({ lang }) : null}
              lang={lang}
              newSteps={newSteps}
              skills={skills}
              ui={ui}
            />
          </div>
        </WorkspaceShell>
      </div>

      {docParam &&
        (doc ? (
          <DocModal closeHref={hrefOfBuild(lang, active)} closeWord={ui.modal.close} path={doc.path} text={doc.text} title={doc.title} />
        ) : null)}
    </main>
  )
}

/** Название шага без повторения номера и слова «Шаг»: номер и так стоит перед ним. */
function shortTitle(title: string, n: number) {
  return title.replace(new RegExp(`^(Шаг|Step)\\s+${n}\\s*[—–-]\\s*`, "i"), "").trim() || String(n)
}

const Paragraphs = ({ lines }: { lines: string[] }) => (
  <div className="max-w-3xl space-y-2 text-[length:var(--fs-body)]">
    {lines.map((l) => (
      <p key={l}>{l}</p>
    ))}
  </div>
)

function SectionBody({
  active,
  doneSteps,
  heard,
  lang,
  newSteps,
  skills,
  ui,
}: {
  active: BuildSection
  // 🔒 СИГНАЛЫ ПРИХОДЯТ ГОТОВЫМИ ИЗ СТРАНИЦЫ: `SectionBody` — обычный компонент, и `await` внутри него
  // невозможен. Читает их сервер, а островок получает ТОЛЬКО свои данные (закон о пропсах островка).
  heard: Awaited<ReturnType<typeof signals>> | null
  doneSteps: Array<{ n: number; title: string }>
  lang: string
  newSteps: Array<{ n: number; title: string }>
  skills: Array<{ name: string; description: string }>
  ui: BuildUi
}) {
  // ── 220: ВХОД В ПОДПИСКУ — ПЕРВЫЙ РАЗДЕЛ МАСТЕРСКОЙ ─────────────────────────────────────────
  // 🎯 Решение владельца 2026-09-17: «первая кнопка — вход в подписку… пользователь может в любом
  // решении запустить свой Claude Code; это дублирующие шаги».
  // 🔒 ЭТО ТОТ ЖЕ КОМПОНЕНТ, ЧТО НА СТРАНИЦЕ «ПОДПИСКА CLAUDE», А НЕ ЕГО КОПИЯ. Скопируй мы файл —
  // две панели входа разошлись бы на первой правке, и отстала бы та, которой пользуются реже.
  // 🛑 Правило службы «маршрут держит свои `_components`» здесь отступает сознательно: дублирование
  // ЖИВОГО кода дороже, чем импорт соседа, и цена названа вслух, а не спрятана.
  // ── 221: КАНАЛ УПРАВЛЕНИЯ ───────────────────────────────────────────────────────────────────
  // 🔒 СОСТОЯНИЕ ЧИТАЕТСЯ НА СЕРВЕРЕ И ЕДЕТ ПРОПСОМ: страница и служба — один процесс, лишний ход по
  // сети был бы платой за ничто. Островку уезжают только его данные и его слова.
  if (active === "channel") {
    return (
      <BuildChannel
        initial={{ ...botSuggestion(), ...channelState() }}
        lang={lang}
        words={{
          allowBtn: ui.channel.allowBtn,
          badFormat: ui.channel.badFormat,
          botFatherStep: ui.channel.botFatherStep,
          botNameHint: ui.channel.botNameHint,
          newBotStep: ui.channel.newBotStep,
          botNameStep: ui.channel.botNameStep,
          botUserHint: ui.channel.botUserHint,
          botUserStep: ui.channel.botUserStep,
          copied: ui.channel.copied,
          copy: ui.channel.copy,
          configured: ui.channel.configured,
          failed: ui.channel.failed,
          howTo: ui.channel.howTo,
          lead: ui.channel.lead,
          noToken: ui.channel.noToken,
          notConfigured: ui.channel.notConfigured,
          runningLabel: ui.channel.runningLabel,
          save: ui.channel.save,
          saving: ui.channel.saving,
          sleeping: ui.channel.sleeping,
          startBtn: ui.channel.startBtn,
          stepActivateTitle: ui.channel.stepActivateTitle,
          stepActivateLead: ui.channel.stepActivateLead,
          activateBtn: ui.channel.activateBtn,
          activateHint: ui.channel.activateHint,
          activateWaiting: ui.channel.activateWaiting,
          activatedToast: ui.channel.activatedToast,
          greeting: ui.channel.greeting,
          botDescription: ui.channel.botDescription,
          stepWorkTitle: ui.channel.stepWorkTitle,
          stepWorkLead: ui.channel.stepWorkLead,
          openChatBtn: ui.channel.openChatBtn,
          othersTitle: ui.channel.othersTitle,
          lockedActivate: ui.channel.lockedActivate,
          lockedWork: ui.channel.lockedWork,
          stateDirLabel: ui.channel.stateDirLabel,
          stopBtn: ui.channel.stopBtn,
          tokenLabel: ui.channel.tokenLabel,
          tokenPlaceholder: ui.channel.tokenPlaceholder,
          working: ui.channel.working,
          allowedCount: ui.channel.allowedCount,
          noSuchCode: ui.channel.noSuchCode,
          noBotUsername: ui.channel.noBotUsername,
          telegramUnreachable: ui.channel.telegramUnreachable,
          startTimeout: ui.channel.startTimeout,
          tokenRejected: ui.channel.tokenRejected,
          allowedToast: ui.channel.allowedToast,
          startedToast: ui.channel.startedToast,
          stepBotTitle: ui.channel.stepBotTitle,
          stepTokenTitle: ui.channel.stepTokenTitle,
          stoppedToast: ui.channel.stoppedToast,
          tokenSavedToast: ui.channel.tokenSavedToast,
        }}
      />
    )
  }

  if (active === "subscription") {
    return <TerminalPanel lang={lang} />
  }

  if (active === "terminal") {
    return (
      <>
        {/* 🔒 РАБОЧЕЕ ПРОСТРАНСТВО НАЗВАНО ДО ЗАПУСКА (202-9, слово владельца: «Агент будет запущен в рабочем пространстве :…»).
            Папка — из той же функции, что у моста терминала: рабочая папка есть личность агента, и страница не имеет права назвать
            одну, пока агент запускается в другой. */}
        <p className="text-[length:var(--fs-body)]">
          {ui.terminal.workspaceLabel}{" "}
          <code className="break-all rounded bg-muted px-2 py-0.5 font-mono text-[length:var(--fs-small)]" data-build-workspace={workspaceDir()}>
            {workspaceDir()}
          </code>
        </p>

        {/* 🛑 ОДИН ЦВЕТ ТРЕВОГИ И ОДНА ВРЕЗКА — ДО ТЕРМИНАЛА, А НЕ ПОД НИМ.
            🔒 С 202-9 ОНА СВЁРНУТА ДО ЗАГОЛОВКА (слово владельца: «по умолчанию показать схлопнутый и показывает только заголовок … при
            нажатии v иконку показывает текущий текст»). `<details>` браузера — без островка: текст в разметке остаётся, скрыто только
            его показ. */}
        <details className="group rounded-lg border border-destructive/50 bg-destructive/5" data-build-warning>
          <summary className="flex cursor-pointer list-none items-center gap-2 p-4 font-medium text-[length:var(--fs-h4)] [&::-webkit-details-marker]:hidden">
            <AlertTriangle className="size-5 shrink-0" aria-hidden />
            <span className="flex-1">{ui.terminal.warnTitle}</span>
            <ChevronDown className="size-5 shrink-0 transition-transform group-open:rotate-180" aria-hidden />
          </summary>
          <div className="px-5 pb-5">
            <p className="max-w-3xl text-[length:var(--fs-body)]">{ui.terminal.warnBody}</p>
            <p className="mt-2 max-w-3xl text-[length:var(--fs-body)]">{ui.terminal.warnRollback}</p>
            <p className="mt-2 max-w-3xl font-medium text-[length:var(--fs-body)]">{ui.terminal.warnOnly}</p>
            <ul className="mt-3 max-w-3xl list-disc space-y-1 pl-5 text-[length:var(--fs-small)] text-muted-foreground">
              {ui.terminal.bounds.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </div>
        </details>
        <BuildTerminal
          words={{
            clear: ui.terminal.clear,
            exited: ui.terminal.exited,
            forbidden: ui.terminal.forbidden,
            keepsRunning: ui.terminal.keepsRunning,
            offline: ui.terminal.offline,
            running: ui.terminal.running,
            sleepingBody: ui.terminal.sleepingBody,
            sleepingTitle: ui.terminal.sleepingTitle,
            start: ui.terminal.start,
            starting: ui.terminal.starting,
            stop: ui.terminal.stop,
            stopped: ui.terminal.stopped,
          }}
        />
      </>
    )
  }

  if (active === "task") {
    return (
      <>
        <Paragraphs lines={ui.task.role} />
        <div className="max-w-3xl rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-[length:var(--fs-small)] text-emerald-900 dark:text-emerald-100">
          <p>{ui.task.visible}</p>
          <p className="mt-1 font-medium">{ui.task.howToPlan}</p>
        </div>
        <BuildTasks
          initial={listTasks().map((t) => ({ id: t.id, text: t.text, when: t.when }))}
          where={`/${lang}/build?section=task`}
          words={{
            add: ui.task.add,
            adding: ui.task.adding,
            empty: ui.task.empty,
            failed: ui.task.failed,
            listTitle: ui.task.listTitle,
            placeholder: ui.task.placeholder,
            tooLong: ui.task.tooLong,
            withdraw: ui.task.withdraw,
          }}
        />
      </>
    )
  }

  // 🔒 СИГНАЛЫ ЧИТАЮТСЯ НА СЕРВЕРЕ, А НЕ ЗАПРОСОМ ИЗ ОСТРОВКА: страница и служба — один процесс, и
  // лишний ход по сети был бы платой за ничто. Островку уезжают ТОЛЬКО его данные и его слова —
  // федеральный закон о пропсах островка.
  if (active === "signals") {
    const out = heard ?? { beyond: [], degraded: null, ok: false, signals: [], single: [] }
    return (
      <>
        <BuildSignals
          beyond={("beyond" in out ? out.beyond : []) as never}
          degraded={("degraded" in out ? (out.degraded as string) : null) ?? null}
          lang={lang}
          signals={("signals" in out ? out.signals : []) as never}
          single={("single" in out ? out.single : []) as never}
          words={{
            approve: ui.signals.approve,
            beyondMark: ui.signals.beyondMark,
            beyondNote: ui.signals.beyondNote,
            decline: ui.signals.decline,
            dropOne: ui.signals.dropOne,
            degraded: ui.signals.degraded,
            empty: ui.signals.empty,
            failed: ui.signals.failed,
            lead: ui.signals.lead,
            observations: ui.signals.observations,
            repeats: ui.signals.repeats,
            toastApproved: ui.signals.toastApproved,
            toastDeclined: ui.signals.toastDeclined,
            toastDropped: ui.signals.toastDropped,
            whatHappens: ui.signals.whatHappens,
            working: ui.signals.working,
          }}
        />
      </>
    )
  }

  if (active === "current") {
    const exists = readCurrent() !== null
    return (
      <>
        <Paragraphs lines={ui.current.role} />
        {exists ? (
          <Link
            className="inline-flex w-fit items-center gap-2 rounded-md bg-primary px-4 py-2 text-[length:var(--fs-body)] text-primary-foreground"
            href={hrefOfBuild(lang, "current", "current")}
            scroll={false}
          >
            <FileText className="size-4" aria-hidden />
            {ui.current.open}
          </Link>
        ) : (
          <p className="text-muted-foreground">{ui.current.missing}</p>
        )}
      </>
    )
  }

  if (active === "steps") {
    return (
      <>
        <Paragraphs lines={ui.steps.role} />
        <div className="flex flex-wrap gap-3">
          <Link className="rounded-md border border-border px-4 py-2" href={hrefOfBuild(lang, "steps-new")} scroll={false}>
            {ui.sections["steps-new"].label}
          </Link>
          <Link className="rounded-md border border-border px-4 py-2" href={hrefOfBuild(lang, "steps-done")} scroll={false}>
            {ui.sections["steps-done"].label}
          </Link>
        </div>
      </>
    )
  }

  if (active === "steps-new" || active === "steps-done") {
    const list = active === "steps-new" ? newSteps : doneSteps
    const kind = active === "steps-new" ? "step-new" : "step-done"
    return (
      <>
        <Paragraphs lines={active === "steps-new" ? ui.steps.newRole : ui.steps.doneRole} />
        <p className="text-[length:var(--fs-small)] text-muted-foreground">
          {ui.steps.count}: {list.length}
        </p>
        {list.length === 0 ? (
          <p className="text-muted-foreground">{ui.steps.empty}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-lg border border-border" data-step-list={kind}>
            {list.map((s) => (
              <li className="flex items-center gap-3 px-4 py-2" data-step={s.n} key={s.n}>
                <span className="w-12 shrink-0 font-mono text-[length:var(--fs-small)] text-muted-foreground">{s.n}</span>
                <span className="min-w-0 flex-1 truncate">{shortTitle(s.title, s.n)}</span>
                <Link className="shrink-0 text-[length:var(--fs-small)] underline underline-offset-4" href={hrefOfBuild(lang, active, `${kind}:${s.n}`)} scroll={false}>
                  {ui.steps.open}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </>
    )
  }

  if (active === "skills") {
    return (
      <>
        <Paragraphs lines={ui.skills.role} />
        {skills.length === 0 ? (
          <p className="text-muted-foreground">{ui.skills.empty}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-lg border border-border" data-skill-list>
            {skills.map((s) => (
              <li className="flex items-start gap-3 px-4 py-3" data-skill={s.name} key={s.name}>
                <BookOpen className="mt-1 size-4 shrink-0 text-muted-foreground" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[length:var(--fs-small)]">{s.name}</p>
                  {s.description && <p className="mt-1 line-clamp-2 text-[length:var(--fs-small)] text-muted-foreground">{s.description}</p>}
                </div>
                <Link className="shrink-0 text-[length:var(--fs-small)] underline underline-offset-4" href={hrefOfBuild(lang, "skills", `skill:${s.name}`)} scroll={false}>
                  {ui.skills.open}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </>
    )
  }

  // active === "instruction"
  const instruction = readInstruction()
  return (
    <>
      <Paragraphs lines={ui.instruction.role} />
      <div className="max-w-3xl rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-[length:var(--fs-small)] text-amber-900 dark:text-amber-100">
        {ui.instruction.howToChange}{" "}
        <Link className="underline underline-offset-4" href={hrefOfBuild(lang, "task")} scroll={false}>
          {ui.sections.task.label}
        </Link>
      </div>
      <p className="text-[length:var(--fs-small)] text-muted-foreground">{ui.instruction.agentNote}</p>
      {instruction === null ? (
        <p className="text-muted-foreground">{ui.instruction.missing}</p>
      ) : (
        // 🔒 ТОЛЬКО ЧТЕНИЕ, И ЭТО РЕШЕНИЕ ВЛАДЕЛЬЦА, А НЕ НЕДОДЕЛКА: правка идёт заданием и планированием в терминале.
        <div className="rounded-lg border border-border p-4" data-build-instruction>
          <DocBody text={instruction} />
        </div>
      )}
    </>
  )
}
