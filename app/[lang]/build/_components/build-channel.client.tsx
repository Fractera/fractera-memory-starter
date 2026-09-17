"use client"

import { Check, Copy, Play, Send, Square, TriangleAlert } from "lucide-react"
import { type ReactNode, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { BuildToast, useToast } from "./build-toast.client"

// КАНАЛ УПРАВЛЕНИЯ — ЭКРАН (221-1, 221-2, переделан 221-3).
//
// 🎯 СЛОВО ВЛАДЕЛЬЦА 2026-09-17, ДОСЛОВНО: «в том проекте, который построил ты, вообще непонятно что
// делать… я вставил токен, токен сохранился — никаких признаков того, что токен был успешно
// подключён, я не увидел, кроме того что где-то вверху мелким шрифтом появилась галочка. Но это не
// ответ… должен всплыть тост с информацией об успехе или об ошибке и о следующем шаге. А ещё лучше
// чтобы следующий шаг по умолчанию был скрыт, а после активации токена всплыл тост и появился этот
// самый следующий шаг».
//
// ✗ ЧЕМ ЭТО ОПЛАЧЕНО — МОЕЙ ОШИБКОЙ УРОВНЯ ЗРЕНИЯ, ТОЙ ЖЕ, ЧТО В «ЭВОЛЮЦИИ». Я показал ВСЁ УСТРОЙСТВО
// СРАЗУ: заведение бота, токен, запуск и допуск стояли на экране одновременно и одинаково важные, а
// ответ на сохранение — строкой в шапке карточки, выше того места, куда человек смотрел. Экран
// показывал своё содержимое вместо того, чтобы вести за руку.
//
// 🔒 ОТСЮДА УСТРОЙСТВО: ЛЕСТНИЦА, А НЕ ПОЛОТНО. Шаг открывается, когда предыдущий сделан; на месте
// закрытого стоит серая строка, называющая, что здесь появится. Скрытый БЕЗ такой строки — это тот же
// «непонятно что делать», только тише.
//
// 🔒 ОТВЕТ ДВЕРИ ВСЕГДА ВСПЛЫВАЕТ ТОСТОМ, И У УСПЕХА ОН НАЗЫВАЕТ СЛЕДУЮЩИЙ ШАГ. Молчаливый успех
// неотличим от молчаливого отказа: и там и там на экране не меняется ничего.
//
// 🔒 ВЕРХНЕЕ МЕНЮ ЕСТЬ СРАЗУ, ХОТЯ ЗАПИСЬ ОДНА (слово владельца: «создадим верхнее меню, где будет
// существовать только одна запись — Telegram»). Второй канал добавляется СТРОКОЙ в список, а не
// переделкой экрана.
//
// 🔒 ИМЕНИ СЛУЖБЫ ЗДЕСЬ НЕТ: и заголовок, и рекомендация имени бота приходят с сервера, а он берёт их
// из реестра. Скопированный в другую службу экран покажет ЕЁ имя, ничего не правя.
//
// 🛑 ТОКЕН УХОДИТ И НЕ ВОЗВРАЩАЕТСЯ. Поле очищается сразу после отправки; обратно приходит только
// «настроен» и хвост из четырёх знаков. Показанный секрет считается раскрытым.

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? ""

/** Каналы, которые служба умеет. Второй добавляется СТРОКОЙ сюда — и больше нигде. */
const CHANNELS = [{ id: "telegram", label: "Telegram" }] as const

export type ChannelWords = {
  lead: string
  howTo: string
  botFatherStep: string
  newBotStep: string
  botNameHint: string
  botNameStep: string
  botUserStep: string
  botUserHint: string
  copy: string
  copied: string
  tokenLabel: string
  tokenPlaceholder: string
  save: string
  saving: string
  configured: string
  notConfigured: string
  runningLabel: string
  sleeping: string
  startBtn: string
  stopBtn: string
  working: string
  allowBtn: string
  failed: string
  badFormat: string
  noToken: string
  noSuchCode: string
  tokenRejected: string
  telegramUnreachable: string
  startTimeout: string
  noBotUsername: string
  stepActivateTitle: string
  stepActivateLead: string
  activateBtn: string
  activateHint: string
  activateWaiting: string
  activatedToast: string
  greeting: string
  botDescription: string
  stepWorkTitle: string
  stepWorkLead: string
  openChatBtn: string
  othersTitle: string
  lockedActivate: string
  lockedWork: string
  stateDirLabel: string
  stepBotTitle: string
  stepTokenTitle: string
  tokenSavedToast: string
  startedToast: string
  stoppedToast: string
  allowedToast: string
  allowedCount: string
}

export type ChannelState = {
  allowed?: string[]
  configured?: boolean
  pending?: string[]
  running?: boolean
  session?: string
  stateDir?: string
  suggestedBotName?: string
  suggestedBotUsername?: string
  tail?: string
  /** Ручка настоящего бота — её назвал Telegram при проверке токена. Не путать с рекомендацией выше. */
  botUsername?: string
  botName?: string
}

/**
 * Строка «подпись — значение — копировать».
 *
 * 🎯 Просьба владельца 2026-09-17: «сделать кнопку скопировать».
 * 🛑 БУФЕР МОЖЕТ БЫТЬ НЕДОСТУПЕН (страница без защищённого соединения, отказ в правах) — тогда
 * значение остаётся видимым и выделяемым, а кнопка честно ничего не обещает. Молчаливый отказ
 * копирования человек читает как «кнопка не работает», и винит страницу.
 */
function CopyRow({ hint, label, value, words }: { hint?: string; label: string; value: string; words: ChannelWords }) {
  const [done, setDone] = useState(false)
  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[length:var(--fs-small)] text-muted-foreground">{label}</span>
        <code className="rounded bg-background px-2 py-1 text-sm">{value}</code>
        <Button
          onClick={() => {
            navigator.clipboard
              ?.writeText(value)
              .then(() => {
                setDone(true)
                setTimeout(() => setDone(false), 2000)
              })
              .catch(() => setDone(false))
          }}
          size="sm"
          type="button"
          variant="outline"
        >
          <Copy className="size-3.5" aria-hidden />
          {done ? words.copied : words.copy}
        </Button>
      </div>
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

/**
 * Ступень лестницы.
 *
 * 🔒 НОМЕР И ЗАГОЛОВОК ОБЯЗАТЕЛЬНЫ, ДАЖЕ У ЗАКРЫТОЙ СТУПЕНИ. Карточка без заголовка читается как
 * поломка, а не как «рано» — тот же закон, что у карты пути мастера запуска.
 */
function Step({
  children,
  done,
  n,
  title,
}: {
  children: ReactNode
  done?: boolean
  n: number
  title: string
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-4" data-step={n}>
      <h3 className="mb-3 flex items-center gap-2 font-semibold text-sm">
        <span
          className={`inline-flex size-6 items-center justify-center rounded-full text-xs ${
            done ? "bg-primary text-on-accent" : "bg-muted text-muted-foreground"
          }`}
        >
          {done ? <Check className="size-3.5" aria-hidden /> : n}
        </span>
        {title}
      </h3>
      {children}
    </section>
  )
}

/** Серая строка на месте закрытой ступени: что здесь появится и после чего. */
function Locked({ n, text }: { n: number; text: string }) {
  return (
    <p className="flex items-center gap-2 rounded-lg border border-border border-dashed px-4 py-3 text-muted-foreground text-sm" data-step-locked={n}>
      <TriangleAlert className="size-4 shrink-0" aria-hidden />
      {text}
    </p>
  )
}

export function BuildChannel({ initial, lang, words }: { initial: ChannelState; lang: string; words: ChannelWords }) {
  const [state, setState] = useState<ChannelState>(initial)
  const [channel, setChannel] = useState<(typeof CHANNELS)[number]["id"]>("telegram")
  const [token, setToken] = useState("")
  const [busy, setBusy] = useState("")
  const { say, toast } = useToast()

  async function call(action: string, said: string, extra: Record<string, string> = {}) {
    setBusy(action)
    try {
      const res = await fetch(`${BASE}/api/fractera/channel`, {
        body: JSON.stringify({ action, ...extra }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      })
      const json = (await res.json().catch(() => null)) as (ChannelState & { error?: string; ok?: boolean }) | null
      if (!json?.ok) {
        // 🔒 ОТКАЗ ЧИТАЕТСЯ ПО СОДЕРЖИМОМУ, А НЕ ПО КОДУ HTTP: привратник отказывает переадресацией,
        // и форма, верящая коду, объявила бы несохранённый токен сохранённым.
        const reason: Record<string, string> = {
          "bad-format": words.badFormat,
          "no-such-code": words.noSuchCode,
          "no-token": words.noToken,
          "start-timeout": words.startTimeout,
          "telegram-unreachable": words.telegramUnreachable,
          "token-rejected": words.tokenRejected,
        }
        say(reason[json?.error ?? ""] ?? words.failed, "bad")
        return
      }
      setState((s) => ({ ...s, ...json }))
      if (action === "token") setToken("")
      say(said)
    } catch {
      say(words.failed, "bad")
    } finally {
      setBusy("")
    }
  }

  const configured = Boolean(state.configured)
  const running = Boolean(state.running)
  const allowed = state.allowed ?? []
  const pending = state.pending ?? []
  /** Соединение активировано: хотя бы один человек впущен. До этого канал запускать незачем. */
  const activated = allowed.length > 0

  // 🔒 ЭКРАН САМ ДОГОНЯЕТ ПРАВДУ СЕРВЕРА, ПОКА ТОКЕН ЕСТЬ (221-5, 221-7): одному ответу двери не верим.
  useEffect(() => {
    if (!configured) return
    const t = setInterval(async () => {
      try {
        const res = await fetch(`${BASE}/api/fractera/channel`, { cache: "no-store" })
        const json = (await res.json().catch(() => null)) as (ChannelState & { ok?: boolean }) | null
        // Рекомендация имени бота не обновляется: она случайная, и прыгающий хвост сбил бы человека.
        if (json?.ok)
          setState((st) => ({ ...st, allowed: json.allowed, botUsername: json.botUsername, pending: json.pending, running: json.running }))
      } catch {
        /* сеть мигнула — следующий опрос через 4 с */
      }
    }, 4000)
    return () => clearInterval(t)
  }, [configured])

  // ── АКТИВАЦИЯ (221-8) ────────────────────────────────────────────────────────────────────────────
  // 🔒 ССЫЛКА С ОДНОРАЗОВОЙ МЕТКОЙ БЕРЁТСЯ У СЕРВЕРА, КАК ТОЛЬКО ОТКРЫЛСЯ ШАГ; ПОКА ЧЕЛОВЕК НЕ НАЖАЛ START,
  // ЭКРАН КАЖДЫЕ 3 С СПРАШИВАЕТ «НАЖАЛ ЛИ». Нажал — сервер сам впускает, приветствует и запускает канал.
  const [activationUrl, setActivationUrl] = useState("")
  const [clicked, setClicked] = useState(false)
  useEffect(() => {
    if (!configured || activated || activationUrl) return
    void (async () => {
      const res = await fetch(`${BASE}/api/fractera/channel`, {
        body: JSON.stringify({ action: "link" }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      }).catch(() => null)
      const json = (await res?.json().catch(() => null)) as { activationUrl?: string; ok?: boolean } | null
      if (json?.ok && json.activationUrl) setActivationUrl(json.activationUrl)
    })()
  }, [configured, activated, activationUrl])

  useEffect(() => {
    if (!activationUrl || activated) return
    let stop = false
    const t = setInterval(async () => {
      if (stop) return
      try {
        const res = await fetch(`${BASE}/api/fractera/channel`, {
          body: JSON.stringify({ action: "activate", greeting: words.greeting }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        })
        const json = (await res.json().catch(() => null)) as (ChannelState & { activated?: boolean; error?: string; ok?: boolean }) | null
        if (json?.ok && json.allowed && json.allowed.length > 0) {
          stop = true
          setState((s) => ({ ...s, ...json }))
          say(words.activatedToast)
        } else if (json && !json.ok && json.error === "start-timeout") {
          stop = true
          setState((s) => ({ ...s, ...json }))
          say(words.startTimeout, "bad")
        } else if (json && !json.ok && json.error === "token-rejected") {
          // 🛑 ТОКЕН ОТОЗВАН ПОСЛЕ СОХРАНЕНИЯ (измерено 2026-09-17): ждать нечего, и молчать нельзя —
          // человек будет жать START у бота, которого больше нет.
          stop = true
          say(words.tokenRejected, "bad")
        }
      } catch {
        /* следующая попытка через 3 с */
      }
    }, 3000)
    return () => {
      stop = true
      clearInterval(t)
    }
  }, [activationUrl, activated, words.greeting, words.activatedToast, words.startTimeout, words.tokenRejected, say])

  // 🔒 ОТКРЫВШИЙСЯ ШАГ ПРОКРУЧИВАЕТСЯ В ПОЛЕ ЗРЕНИЯ: иначе он появляется ниже края экрана, и человек
  // видит, что «ничего не происходит» (оплачено 2026-09-17).
  const stage = activated ? 4 : configured ? 3 : 0
  useEffect(() => {
    if (!stage) return
    document.querySelector(`[data-step="${stage}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" })
  }, [stage])

  return (
    <div className="flex flex-col gap-4" data-build-channel>
      <p className="max-w-3xl text-[length:var(--fs-body)]">{words.lead}</p>

      {/* Верхнее меню каналов: одна запись сегодня, строка на каждый следующий. */}
      <div className="flex flex-wrap gap-2 border-border border-b pb-3" data-channel-tabs>
        {CHANNELS.map((c) => (
          <button
            className={`rounded-lg px-3 py-1.5 text-sm transition ${channel === c.id ? "bg-primary text-on-accent" : "bg-muted text-muted-foreground hover:text-foreground"}`}
            key={c.id}
            onClick={() => setChannel(c.id)}
            type="button"
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* ── Ступень 1: бот у BotFather ──────────────────────────────────────── */}
      <Step done={configured} n={1} title={words.stepBotTitle}>
        <p className="mb-3 text-[length:var(--fs-small)] text-muted-foreground">{words.howTo}</p>
        {/* 🔒 ДВЕ ЗАПИСИ, А НЕ ОДНА: BotFather спрашивает ИМЯ и РУЧКУ, и это разные вещи с разными
            правилами (README плагина). 🔒 КОПИРУЕТСЯ ВСЁ, ЧТО ЧЕЛОВЕК ВВОДИТ РУКАМИ. */}
        {state.suggestedBotName ? (
          <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/40 p-3">
            <p className="text-[length:var(--fs-small)] text-muted-foreground">{words.botNameHint}</p>
            <CopyRow label={words.botFatherStep} value="@BotFather" words={words} />
            <CopyRow label={words.newBotStep} value="/newbot" words={words} />
            <CopyRow label={words.botNameStep} value={state.suggestedBotName} words={words} />
            <CopyRow hint={words.botUserHint} label={words.botUserStep} value={state.suggestedBotUsername ?? ""} words={words} />
          </div>
        ) : null}
      </Step>

      {/* ── Ступень 2: токен ────────────────────────────────────────────────── */}
      <Step done={configured} n={2} title={words.stepTokenTitle}>
        <p className="mb-3 flex items-center gap-2 text-sm" data-token-state>
          {configured ? <Check className="size-4 text-primary" aria-hidden /> : <TriangleAlert className="size-4 text-muted-foreground" aria-hidden />}
          <span>{configured ? `${words.configured} · …${state.tail}${state.botUsername ? ` · @${state.botUsername}` : ""}` : words.notConfigured}</span>
        </p>
        <form
          className="flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault()
            // Описание пустого чата уезжает вместе с токеном: сервер ставит его боту на языке страницы.
            void call("token", words.tokenSavedToast, { description: words.botDescription, lang, token })
          }}
        >
          <input
            aria-label={words.tokenLabel}
            autoComplete="off"
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
            onChange={(e) => setToken(e.target.value)}
            placeholder={words.tokenPlaceholder}
            type="password"
            value={token}
          />
          <Button disabled={!token || busy === "token"} size="sm" type="submit">
            {busy === "token" ? words.saving : words.save}
          </Button>
        </form>
      </Step>

      {/* ── Ступень 3: активировать соединение одним нажатием ─────────────────── */}
      {/* 🎯 СЛОВО ВЛАДЕЛЬЦА 2026-09-17: «лучше бы вместо этого текста прилетела кнопка с текстом активировать
          соединение». Кода и английского нет: START читает наш сервер (lib/channel/activation.mjs). */}
      {configured && !activated ? (
        <Step n={3} title={words.stepActivateTitle}>
          <p className="mb-4 text-[length:var(--fs-body)]">{words.stepActivateLead}</p>
          {activationUrl ? (
            <a
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-4 font-semibold text-base text-on-accent"
              data-activate
              href={activationUrl}
              onClick={() => setClicked(true)}
              rel="noreferrer"
              target="_blank"
            >
              <Send className="size-5" aria-hidden />
              {words.activateBtn}
            </a>
          ) : (
            <p className="text-muted-foreground text-sm">{state.botUsername ? words.working : words.noBotUsername}</p>
          )}
          <p className="mt-3 text-muted-foreground text-sm" data-activate-wait>
            {clicked ? words.activateWaiting : words.activateHint}
          </p>
        </Step>
      ) : configured ? null : (
        <Locked n={3} text={words.lockedActivate} />
      )}

      {/* ── Ступень 4: соединение работает — пишите боту ───────────────────────── */}
      {activated ? (
        <Step done={running} n={4} title={words.stepWorkTitle}>
          <p className="mb-3 text-[length:var(--fs-body)]">{words.stepWorkLead}</p>
          <p className="mb-3 flex items-center gap-2 text-sm" data-run-state>
            {running ? <Check className="size-4 text-primary" aria-hidden /> : <TriangleAlert className="size-4 text-muted-foreground" aria-hidden />}
            <span>{running ? words.runningLabel : words.sleeping}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {state.botUsername ? (
              <a
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-medium text-on-accent text-sm"
                data-open-bot
                href={`https://t.me/${state.botUsername}`}
                rel="noreferrer"
                target="_blank"
              >
                <Send className="size-4" aria-hidden />
                {words.openChatBtn} @{state.botUsername}
              </a>
            ) : null}
            {running ? (
              <Button disabled={busy === "stop"} onClick={() => call("stop", words.stoppedToast)} size="sm" type="button" variant="outline">
                <Square className="size-4" aria-hidden />
                {words.stopBtn}
              </Button>
            ) : (
              <Button disabled={busy === "start"} onClick={() => call("start", words.startedToast)} size="sm" type="button">
                <Play className="size-4" aria-hidden />
                {busy === "start" ? words.working : words.startBtn}
              </Button>
            )}
          </div>
          <p className="mt-3 text-muted-foreground text-xs" data-allowed>
            {words.allowedCount} {allowed.length}
          </p>

          {/* 🔒 ЧУЖИЕ ЗАПРОСЫ — ОТДЕЛЬНО И ТОЛЬКО КОГДА ОНИ ЕСТЬ. Кто-то другой написал боту — плагин выдал ему
              код; впустить его или нет решает архитектор, и по коду, как у плагина (221-5). */}
          {pending.length > 0 ? (
            <div className="mt-4 border-border border-t pt-3">
              <h4 className="mb-2 font-semibold text-sm">{words.othersTitle}</h4>
              <ul className="flex flex-col gap-2">
                {pending.map((who) => (
                  <li className="flex items-center gap-2 text-sm" key={who}>
                    <code className="rounded bg-muted px-2 py-1 font-mono text-base">{who}</code>
                    <Button className="ml-auto" disabled={busy === "allow"} onClick={() => call("allow", words.allowedToast, { who })} size="sm" type="button" variant="outline">
                      {words.allowBtn}
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {state.stateDir ? (
            <p className="mt-3 text-muted-foreground text-xs">
              {words.stateDirLabel} <code>{state.stateDir}</code>
            </p>
          ) : null}
        </Step>
      ) : (
        <Locked n={4} text={words.lockedWork} />
      )}

      <BuildToast toast={toast} />
    </div>
  )
}
