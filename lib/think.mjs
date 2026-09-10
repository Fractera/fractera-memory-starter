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
import { say } from "./words.mjs"
import { tmpdir } from "node:os"
import { note } from "./journal.mjs"

const BIN = process.env.MEMORY_CLAUDE_BIN ?? "claude"
const MODEL = process.env.MEMORY_THINK_MODEL ?? "opus"
const TIMEOUT_MS = Number(process.env.MEMORY_THINK_TIMEOUT_MS ?? 120000)

// 🔒 ДУМАЕМ В ПУСТОЙ ПАПКЕ ВНЕ ДЕРЕВА СЛУЖБЫ, И ПРИЧИН ДВЕ, ОБЕ МЕХАНИЧЕСКИЕ.
// Первая: Claude Code ищет `CLAUDE.md` вверх по дереву, а в корне службы лежит
// инструкция АГЕНТА памяти — она говорит «ничего не делай», и разбор фразы
// читал бы её как задание. Вторая: рядом лежит `.mcp.json`, объявляющий сервер
// памяти, — думающий о фразе получил бы инструменты памяти и мог бы пойти
// звать самого себя.
//
// ✗ ЭТО НЕ ПРЕДПОЛОЖЕНИЕ, А ИЗМЕРЕНИЕ 2026-09-10. Один и тот же вызов с одним и
// тем же системным промптом на фразе «меня зовут Роман, я живу в Мадриде»:
//   из /opt/fractera/memory      → «Рома, я Anthropic Opus, скоро буду готов…»
//   из /tmp/fractera-memory-think → {"facts":[{"kind":"person_first_name",…
// ИНСТРУКЦИЯ ПАПКИ ПЕРЕБИВАЕТ СИСТЕМНЫЙ ПРОМПТ. Перенеси разбор в папку службы
// сегодня — и он начнёт отвечать заглушкой вместо фактов, молча.
//
// 🔒 ЗАМЫСЕЛ ВЛАДЕЛЬЦА ДРУГОЙ, И ОН НАЗВАН ЗДЕСЬ, ЧТОБЫ НЕ ПОТЕРЯТЬСЯ: «служба
// запускает агента Claude Code В СВОЕЙ ПАПКЕ». Переезд сюда законен ровно в тот
// день, когда инструкция агента памяти будет наполнена, — и это его решение,
// а не догадка следующей сессии.
const WORKDIR = process.env.MEMORY_THINK_DIR ?? join(tmpdir(), "fractera-memory-think")

/** Роды отказа размышления. Каждый чинится по-своему, и потому назван отдельно. */
export const REFUSAL = {
  BAD_ANSWER: "think-answer-unusable",
  NO_CLI: "think-cli-missing",
  NOT_AUTHED: "think-not-authorized",
  QUOTA: "think-quota-exhausted",
  // 🔒 ШЕСТОЙ РОД ЗАВЕДЁН 2026-09-10 ПО ЖИВОМУ ОТКАЗУ, А НЕ ВПРОК. Организация
  // может выключить доступ Claude Code по подписке — и это НЕ квота: квота
  // проходит сама, а этот чинится действием администратора или ключом API.
  // ✗ до этой правки он приезжал как `think-unreachable`, «модель недоступна»,
  // и владелец пошёл бы чинить сеть там, где надо открыть доступ.
  SUBSCRIPTION_OFF: "think-subscription-disabled",
  TIMEOUT: "think-timed-out",
  UNREACHABLE: "think-unreachable",
}

/**
 * Что сказать человеку при каждом отказе — словами, а не кодом.
 *
 * 🪦 ЗДЕСЬ ЛЕЖАЛА РУССКАЯ КАРТА `REFUSAL_WORDS` — ОТМЕНЕНО 181-10 словом
 * владельца: «наши приложения мультиязычные… информация об ошибках должна
 * поддерживать два языка и в будущем должна быть масштабированных до 82».
 * Слова уехали в `lib/words.mjs`, коды остались здесь: код читает машина,
 * слова читает человек, и переводится только второе.
 */
export function refusalWords(code, lang) {
  return say(code, lang)
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
  // 🔒 ПОРЯДОК ПРОВЕРОК ЗНАЧИМ: «отключён доступ» ищется ПЕРВЫМ. Его сообщение
  // содержит слово «subscription», и общая проверка на подписку перехватила бы
  // его, назвав квотой — то есть отправила бы владельца ждать вместо действия.
  if (t.includes("disabled claude subscription access") || t.includes("ask your admin to enable")) {
    return REFUSAL.SUBSCRIPTION_OFF
  }
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

  // 🛑 КОНВЕРТ ЧИТАЕТСЯ ПЕРВЫМ, И ДАЖЕ ПРИ НЕНУЛЕВОМ КОДЕ ВЫХОДА.
  // ✗ ОПЛАЧЕНО ЖИВЬЁМ 2026-09-10: организация отключила доступ Claude Code по
  // подписке. CLI вернул `exit 1`, **пустой stderr** — и весь смысл лежал в
  // конверте на stdout: `api_error_status: 403`, `result: "Your organization has
  // disabled Claude subscription access…"`. Прежний код выходил по `code !== 0`
  // ДО чтения конверта и отвечал «модель недоступна» — то есть отправлял бы
  // владельца чинить сеть вместо того, чтобы открыть доступ.
  // 🔒 ЭТО ТОТ ЖЕ ЗАКОН, ЧТО «ОТВЕТ ЧУЖОЙ СЛУЖБЫ ЧИТАЕТСЯ ЦЕЛИКОМ, А НЕ ПО КОДУ
  // HTTP» — только здесь вместо кода HTTP код выхода процесса.
  let envelope = null
  try {
    envelope = JSON.parse(raw.out)
  } catch {
    envelope = null
  }

  if (envelope?.is_error === true || (envelope && raw.code !== 0)) {
    const said = String(envelope?.result ?? "")
    const byText = refusalFromText(`${said} ${raw.err}`)
    return {
      ok: false,
      refusal: byText ?? REFUSAL.UNREACHABLE,
      // 🔒 СЛОВА СЛУЖБЫ ЕДУТ НАРУЖУ ДОСЛОВНО. Наш род отказа говорит, ЧТО делать;
      // её текст говорит, что случилось, и второе не пересказывается своими
      // словами — пересказ через неделю значит другое.
      why: said || `api ${envelope?.api_error_status ?? "?"}`,
    }
  }

  const named = refusalFromText(`${raw.err} ${raw.out}`)
  if (named) return { ok: false, refusal: named }
  if (raw.code !== 0) {
    return { ok: false, refusal: REFUSAL.UNREACHABLE, why: `exit-${raw.code}: ${raw.err.slice(0, 200)}` }
  }
  if (!envelope) {
    return { ok: false, refusal: REFUSAL.BAD_ANSWER, why: "конверт ответа не разобран" }
  }

  const text = typeof envelope?.result === "string" ? envelope.result : ""
  if (!text) return { ok: false, refusal: REFUSAL.BAD_ANSWER, why: "пустой ответ модели" }

  // 🔒 ЧТО ОТВЕТИЛА МОДЕЛЬ — В ЖУРНАЛ ДОСЛОВНО, ДО РАЗБОРА (177-1). Разбор может
  // не удаться, и тогда единственный след того, ЧТО именно она сказала, — эта
  // запись. ✗ без неё отказ «модель ответила не по форме» не проверить ничем:
  // формы не видел никто.
  await note({
    asked: user,
    method: `модель ${MODEL}`,
    model: text,
    ms: envelope?.duration_ms ?? null,
    returned: "ответ ушёл на разбор",
  })

  try {
    return { data: JSON.parse(stripFence(text)), ms: envelope?.duration_ms ?? null, ok: true }
  } catch {
    return { ok: false, refusal: REFUSAL.BAD_ANSWER, why: text.slice(0, 200) }
  }
}
