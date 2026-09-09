// РАЗМЫШЛЕНИЕ — ЕДИНСТВЕННОЕ МЕСТО, ГДЕ ПАМЯТЬ ДУМАЕТ.
//
// 🔒 ЗАКОН ВЛАДЕЛЬЦА 2026-09-09, ДОСЛОВНО: «OpenAI нужен для оцифровки голоса,
// то есть транскрипции, и для работы с векторами. ДОПУСК К РАЗМЫШЛЕНИЯМ ДЛЯ
// OpenAI ЗАПРЕЩЁН.» Поэтому разбор фразы уехал сюда, а `model.mjs` остался
// ждать своих законных потребителей — векторов и транскрипции.
//
// ✗ ЧЕМ ЗАКОН ОПЛАЧЕН, ИЗМЕРЕНО ЖИВЬЁМ НА `gpt-4o-mini`: «мы разрабатываем
// проект Fractera» — проект не записан и не назван пропущенным · «меня зовут
// Роман, обращайся на ты» — форма обращения слиплась с именем · «у меня живёт
// кот Барсик» — кот лёг в список друзей · первое имя рода вышло `friend_name`,
// ярлык вместо фразы. Те же три фразы на Opus 2026-09-10 разобраны верно, и
// «Роман, обращайся на ты» дало ДВА раздельных факта.
//
// 🔒 ДЕНЕГ ЭТО НЕ СТОИТ, А КВОТУ СТОИТ. Ключа Anthropic на машине нет —
// Claude Code авторизован ПОДПИСКОЙ владельца (`~/.claude/.credentials.json`).
// Значит разбор фразы вычитается из того же пятичасового окна, что и ответы
// бота с телефона: закон о квоте, общей на двоих, действует и здесь.
//
// 🔒 ЗОВЁМ CLI, А НЕ HTTP, И ЭТО НЕ ОБХОДНОЙ ПУТЬ, А ЕДИНСТВЕННЫЙ. Подписка
// живёт в учётных данных Claude Code; никакого ключа, который можно было бы
// послать в `api.anthropic.com`, на этой машине не существует.

import { spawn } from "node:child_process"
import { accessSync, constants, mkdirSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"

const BIN = process.env.MEMORY_CLAUDE_BIN ?? "claude"
const MODEL = process.env.MEMORY_THINK_MODEL ?? "opus"
const TIMEOUT_MS = Number(process.env.MEMORY_THINK_TIMEOUT_MS ?? 120000)

// 🔒 ДУМАЕМ В ПУСТОЙ ПАПКЕ ВНЕ ДЕРЕВА СЛУЖБЫ, И ПРИЧИН ДВЕ, ОБЕ МЕХАНИЧЕСКИЕ.
// Первая: Claude Code ищет `CLAUDE.md` вверх по дереву, а в корне службы лежит
// инструкция АГЕНТА памяти — она говорит «ничего не делай», и разбор фразы
// читал бы её как задание. Вторая: рядом лежит `.mcp.json`, объявляющий сервер
// памяти, — думающий о фразе получил бы инструменты памяти и мог бы пойти
// звать самого себя.
const WORKDIR = process.env.MEMORY_THINK_DIR ?? join(tmpdir(), "fractera-memory-think")

/** Роды отказа размышления. Каждый чинится по-своему, и потому назван отдельно. */
export const REFUSAL = {
  BAD_ANSWER: "think-answer-unusable",
  NO_CLI: "think-cli-missing",
  NOT_AUTHED: "think-not-authorized",
  QUOTA: "think-quota-exhausted",
  TIMEOUT: "think-timed-out",
  UNREACHABLE: "think-unreachable",
}

/** Что сказать владельцу при каждом отказе — словами, а не кодом. */
export const REFUSAL_WORDS = {
  [REFUSAL.BAD_ANSWER]: "модель ответила не по форме — разобрать фразу не удалось",
  [REFUSAL.NO_CLI]: "на этой машине нет Claude Code: без него память не думает",
  [REFUSAL.NOT_AUTHED]: "Claude Code не авторизован — нужно войти подпиской на сервере",
  [REFUSAL.QUOTA]: "окно подписки исчерпано — память сможет думать после его обновления",
  [REFUSAL.TIMEOUT]: "модель не ответила за отведённое время",
  [REFUSAL.UNREACHABLE]: "модель недоступна",
}

/** Где искать бинарь, если в `PATH` его не оказалось. Измерено: `/usr/bin/claude`. */
const FALLBACK_PATHS = ["/usr/bin/claude", "/usr/local/bin/claude", "/root/.local/bin/claude"]

let resolvedBin = null

/** Найти исполняемый файл один раз и запомнить. */
function findBin() {
  if (resolvedBin !== null) return resolvedBin
  const candidates = BIN.includes("/") ? [BIN] : []
  for (const dir of (process.env.PATH ?? "").split(":")) {
    if (dir) candidates.push(join(dir, BIN))
  }
  candidates.push(...FALLBACK_PATHS)
  for (const p of candidates) {
    try {
      accessSync(p, constants.X_OK)
      resolvedBin = p
      return p
    } catch { /* следующий кандидат */ }
  }
  resolvedBin = ""
  return ""
}

/** Умеет ли эта машина думать вообще — без обращения к модели. */
export function canThink() {
  return Boolean(findBin())
}

/**
 * Снять markdown-ограду, если модель всё-таки её поставила.
 *
 * 🔒 ФОРМУ ОТВЕТА ПРОВЕРЯЕМ МЫ, А НЕ ОБЕЩАЕТ МОДЕЛЬ (закон `socials-ai`). В
 * замерах 2026-09-10 ограды не было ни разу — и именно поэтому она однажды
 * появится: непроверенное умолчание держится ровно до первого исключения.
 */
function stripFence(text) {
  const t = text.trim()
  if (!t.startsWith("```")) return t
  return t.replace(/^```[a-zA-Z]*\s*/, "").replace(/```\s*$/, "").trim()
}

/** По чему узнаётся отказ подписки, а не поломка. */
function refusalFromText(text) {
  const t = text.toLowerCase()
  if (t.includes("rate_limit") || t.includes("session limit") || t.includes("usage limit")) {
    return REFUSAL.QUOTA
  }
  if (t.includes("not authenticated") || t.includes("please run") || t.includes("/login")) {
    return REFUSAL.NOT_AUTHED
  }
  return null
}

/**
 * Подумать и получить РАЗОБРАННЫЙ JSON.
 *
 * 🛑 STDIN ДОЧЕРНЕГО ПРОЦЕССА ОБЯЗАН БЫТЬ ЗАКРЫТ, И ЭТО ОПЛАЧЕНО ЦЕЛЫМ
 * ПРОБНИКОМ. `claude -p` при СВОБОДНОМ stdin читает оттуда и молча ждёт конца
 * потока: первый замер 2026-09-09 «ничего не вернул за 60 секунд» был именно
 * этим, а не отсутствием способности. Снаружи зависание неотличимо от отказа.
 */
export async function think(system, user) {
  const bin = findBin()
  if (!bin) return { ok: false, refusal: REFUSAL.NO_CLI }

  try {
    mkdirSync(WORKDIR, { recursive: true })
  } catch { /* папка есть или её не создать — второе всплывёт запуском */ }

  const args = [
    "-p", user,
    "--system-prompt", system,
    "--model", MODEL,
    "--output-format", "json",
    // 🔒 НОЛЬ MCP-СЕРВЕРОВ. Без этого флага подхватится объявление из папки
    // запуска, и думающий о фразе получит инструменты, которых ему не давали.
    "--strict-mcp-config",
  ]

  const raw = await new Promise((resolve) => {
    let out = ""
    let err = ""
    let done = false

    const child = spawn(bin, args, {
      cwd: WORKDIR,
      // 🔒 `HOME` НАЗЫВАЕТСЯ ЯВНО: учётные данные подписки лежат в `~/.claude`,
      // а процесс под pm2 наследует окружение запуска — пустой `HOME` увёл бы
      // Claude Code искать вход не там, и отказ выглядел бы как «не авторизован».
      env: { ...process.env, HOME: process.env.HOME || "/root" },
      stdio: ["ignore", "pipe", "pipe"],
    })

    const timer = setTimeout(() => {
      if (done) return
      done = true
      child.kill("SIGKILL")
      resolve({ code: null, err, out, timedOut: true })
    }, TIMEOUT_MS)

    child.stdout.on("data", (d) => { out += d })
    child.stderr.on("data", (d) => { err += d })
    child.on("error", (e) => {
      if (done) return
      done = true
      clearTimeout(timer)
      resolve({ code: null, err: String(e.message), out, spawnFailed: true })
    })
    child.on("close", (code) => {
      if (done) return
      done = true
      clearTimeout(timer)
      resolve({ code, err, out })
    })
  })

  if (raw.spawnFailed) return { ok: false, refusal: REFUSAL.NO_CLI, why: raw.err }
  if (raw.timedOut) return { ok: false, refusal: REFUSAL.TIMEOUT }

  const named = refusalFromText(`${raw.err} ${raw.out}`)
  if (named) return { ok: false, refusal: named }
  if (raw.code !== 0) {
    return { ok: false, refusal: REFUSAL.UNREACHABLE, why: `exit-${raw.code}: ${raw.err.slice(0, 200)}` }
  }

  // 🛑 ОБОЛОЧКА ОТВЕТА И САМ ОТВЕТ — РАЗНЫЕ СЛОИ, И ОШИБКА ЖИВЁТ В ОБОИХ.
  // `--output-format json` печатает конверт с полем `result`; внутри `result`
  // лежит то, что сказала модель. Читать код выхода и не читать `is_error`
  // значит принять сообщение об отказе за успешный разбор.
  let envelope
  try {
    envelope = JSON.parse(raw.out)
  } catch {
    return { ok: false, refusal: REFUSAL.BAD_ANSWER, why: "конверт ответа не разобран" }
  }
  if (envelope?.is_error === true) {
    const byText = refusalFromText(String(envelope?.result ?? ""))
    return { ok: false, refusal: byText ?? REFUSAL.UNREACHABLE, why: String(envelope?.subtype ?? "") }
  }

  const text = typeof envelope?.result === "string" ? envelope.result : ""
  if (!text) return { ok: false, refusal: REFUSAL.BAD_ANSWER, why: "пустой ответ модели" }

  try {
    return { data: JSON.parse(stripFence(text)), ms: envelope?.duration_ms ?? null, ok: true }
  } catch {
    return { ok: false, refusal: REFUSAL.BAD_ANSWER, why: text.slice(0, 200) }
  }
}
