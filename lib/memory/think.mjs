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
//
// NODE STEP 596-3 — THE SAME CALL ON A HOME COMPUTER (Windows, macOS, Linux):
// - the binary is `claude.exe` on Windows (`~/.local/bin`, the node's own install, `scripts/ensure-claude.mjs` of the core) — found by
//   the PATH delimiter of this system, never by «:» alone;
// - the model is chosen by the kind of work (owner 2026-10-22): parsing a phrase and describing a file are text work — Sonnet by
//   default; `MEMORY_THINK_MODEL` still overrides;
// - the child gets `windowsHide` (a background service must never open a console window over the person's screen), an environment
//   without the labels of a Next server, of the core and of a Claude Code session (`__NEXT*`, `NEXT_*`, `AGI_*`, `CLAUDE_CODE*`,
//   `CLAUDECODE`) and without this element's secrets;
// - the Telegram channel plugin is switched off for the call (`--settings`): one failure of that plugin anywhere on the machine
//   silences the channel of every session for 15 minutes (anti-pattern 548-20);
// - no tools unless the caller names them (`--tools ""`), no MCP servers, no session file (`--no-session-persistence`): nothing reads
//   the thread of a call, and each kept file is noise in ~/.claude/projects;
// - the system prompt goes in a file and the phrase on stdin: a Windows command line ends at 32 767 characters, a phrase of 2 000
//   words with the parsing rules does not fit there.

import { spawn } from "node:child_process"
import { accessSync, constants, mkdirSync, readFileSync, writeFileSync, unlinkSync } from "node:fs"
import { delimiter, join } from "node:path"
import { randomUUID } from "node:crypto"
import { say } from "./words.mjs"
import { homedir, tmpdir } from "node:os"
import { note } from "./journal.mjs"
import { parseModelJson } from "./model-json.mjs"

const BIN = process.env.MEMORY_CLAUDE_BIN ?? "claude"
/**
 * Какой моделью думать — читается В МОМЕНТ ВЫЗОВА, а не при загрузке файла.
 *
 * 🔒 ИНАЧЕ «СОХРАНЕНО» НЕ РАВНО «ПРИМЕНЕНО» (189-7). Настройка живёт на экране
 * «Настройки»; прочитай мы её один раз при старте — человек выбрал бы модель,
 * увидел зелёную отметку и продолжал бы работать прежней до перезапуска службы.
 * Молчаливое расхождение между тем, что написано на экране, и тем, что делает
 * код, дороже одного чтения файла на вызов.
 *
 * 🔒 ПОРЯДОК ИСТОЧНИКОВ: окружение процесса сильнее склада секретов. Так
 * прибор или разработчик может задать модель на один запуск, не трогая общую
 * настройку машины.
 */
function model() {
  if (process.env.MEMORY_THINK_MODEL) return process.env.MEMORY_THINK_MODEL
  try {
    const file = process.env.FRACTERA_MACHINE_ENV || "/etc/fractera/secrets.env"
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      const i = line.indexOf("=")
      if (i > 0 && line.slice(0, i).trim() === "MEMORY_THINK_MODEL") {
        const v = line.slice(i + 1).trim().replace(/^["']|["']$/g, "")
        if (v) return v
      }
    }
  } catch { /* нет файла — законное состояние, берём умолчание */ }
  // 596-3: text work — Sonnet (owner 2026-10-22, «написание текста это всегда модель Sonnet»).
  return "sonnet"
}
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

// 🪦 Здесь стоял путь к объявлению инструментов памяти (`.mcp.json` прежнего сервера): на узле у разбора нет сервера инструментов
// вовсе — у вызова всегда `--strict-mcp-config` без конфига (596-3).
const WIN = process.platform === "win32"
// The labels of a Next server, of the core, of a Claude Code session, and this element's own secrets never reach the child.
const CHILD_ENV_DROP = /^(__NEXT|NEXT_|AGI_|CLAUDE_CODE|CLAUDECODE)/
const CHILD_ENV_SECRETS = new Set(["DATA_SECRET", "SETTINGS_SECRET", "OPENAI_API_KEY", "REVALIDATE_SECRET", "AUTH_SECRET", "NEXTAUTH_SECRET", "PORT", "HOSTNAME", "NODE_ENV"])
const NO_CHANNEL = JSON.stringify({ enabledPlugins: { "telegram@claude-plugins-official": false } })

function childEnv() {
  const env = {}
  for (const [k, v] of Object.entries(process.env)) {
    if (v === undefined || CHILD_ENV_DROP.test(k) || CHILD_ENV_SECRETS.has(k)) continue
    env[k] = v
  }
  if (!WIN && !env.HOME) env.HOME = homedir()
  return env
}

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
  // 🔒 СЕДЬМОЙ РОД (184-2): НИТЬ НЕ НАЙДЕНА. Заведён по измерению, а не впрок.
  // ✗ чужой идентификатор даёт код выхода 1, ПУСТОЙ stdout и весь смысл в
  // stderr: `No conversation found with session ID: …`. Разбор, ждущий JSON,
  // назвал бы это «ответ не по форме» — и владелец пошёл бы чинить модель
  // вместо того, чтобы дать верный идентификатор.
  THREAD_UNKNOWN: "think-thread-unknown",
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

/** Где искать бинарь, если в `PATH` его не оказалось: `~/.local/bin` — куда ставит узел (Windows — `claude.exe`). */
const FALLBACK_PATHS = WIN
  ? [join(homedir(), ".local", "bin", "claude.exe")]
  : [join(homedir(), ".local", "bin", "claude"), "/usr/bin/claude", "/usr/local/bin/claude", "/root/.local/bin/claude"]

let resolvedBin = null

/** Найти исполняемый файл один раз и запомнить. */
function findBin() {
  if (resolvedBin !== null) return resolvedBin
  // 596-3: on Windows only an .exe — node does not start a .cmd without a shell (EINVAL, silent).
  const name = WIN && !BIN.toLowerCase().endsWith(".exe") ? `${BIN}.exe` : BIN
  const candidates = /[\\/]/.test(name) ? [name] : []
  for (const dir of (process.env.PATH ?? "").split(delimiter)) {
    if (dir) candidates.push(join(dir, name))
  }
  candidates.push(...FALLBACK_PATHS)
  for (const p of candidates) {
    try {
      accessSync(p, WIN ? constants.F_OK : constants.X_OK)
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
  // 🔒 НИТЬ ИЩЕТСЯ ПЕРВОЙ: её сообщение приходит БЕЗ конверта, и все прочие
  // проверки для него слепы. Измерено 2026-09-11 на чужом идентификаторе.
  if (t.includes("no conversation found with session id")) return REFUSAL.THREAD_UNKNOWN
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
export async function think(system, user, options = {}) {
  const bin = findBin()
  if (!bin) return { ok: false, refusal: REFUSAL.NO_CLI }

  /**
   * Нить разбора: продолжить прежнюю вместо того, чтобы начинать заново (184-2).
   *
   * 🔒 ПРОДОЛЖЕНИЕ ДЕШЕВЛЕ НАЧАЛА, И ЭТО ИЗМЕРЕНО, А НЕ ПРЕДПОЛОЖЕНО: три хода
   * одной нити стоили 0.0289 → 0.0065 → 0.0036, потому что прочитанное из кэша
   * дешевле присланного заново (замысел службы). Значит вернуться к цепочке —
   * самый дешёвый путь, а не роскошь.
   */
  const thread = typeof options.thread === "string" && options.thread.trim() ? options.thread.trim() : null

  /**
   * Какие инструменты дать этому вызову — СПИСКОМ ИМЁН, а не «все, какие есть».
   *
   * 🔒 ПУСТО ПО УМОЛЧАНИЮ, И ЭТО НЕ ОСТОРОЖНОСТЬ, А РАЗНИЦА ЗАДАЧ. Разбор фразы
   * обязан вернуть чистый JSON — инструменты ему только помешают. Вопросу о
   * связях они, наоборот, нужны. Один вызов не знает о другом, и список решает
   * тот, кто зовёт.
   */
  const tools = Array.isArray(options.tools) ? options.tools.filter(Boolean).map(String) : []

  /**
   * Какие папки открыть этому вызову для чтения, и сколько ждать (194-2).
   *
   * 🔒 ПАПКА ОТКРЫВАЕТСЯ ПОИМЁННО (`--add-dir`), А НЕ СНЯТИЕМ ПРОВЕРКИ ПУТЕЙ. У процесса без терминала
   * модальный вопрос «читать вне рабочей папки?» равен зависанию — оплачено каналом Telegram (115).
   * 🔒 ПО УМОЛЧАНИЮ ПАПОК НЕТ И ТАЙМАУТ ПРЕЖНИЙ: разбор фразы не меняется ни на байт.
   */
  const dirs = Array.isArray(options.dirs) ? options.dirs.filter(Boolean).map(String) : []
  const timeoutMs = Number(options.timeoutMs) > 0 ? Number(options.timeoutMs) : TIMEOUT_MS

  /**
   * ОДИНОЧНЫЙ ВЫЗОВ: спросить и забыть (201-4).
   *
   * 🔒 ТРЕБОВАНИЕ ВЛАДЕЛЬЦА 2026-09-14, ДОСЛОВНО: «вопрос для обнаружения подходящей базы данных это
   * вопрос в котором мы передаем один одиночный запрос выполняем получаем ответ и больше не
   * хранилось в истории». Исполняется флагом `--no-session-persistence`, а не нашим намерением.
   * 🔒 ИЗМЕРЕНО 201-2: разговор не ложится на диск, и `--resume` на его идентификатор отвечает
   * «No conversation found». Без флага каждый вызов оставляет файл — их накопилось 185.
   * 🛑 ЗДЕСЬ ЖЕ СНИМАЕТСЯ MCP: у одиночного вызова инструментов быть не должно, а с ними он ещё и
   * платит попыткой поднять сервер, которая падает (см. ниже).
   */
  const single = options.single === true
  if (single && thread) {
    // Два требования, отменяющие друг друга: продолжить нить, которой не позволено существовать.
    return { ok: false, refusal: REFUSAL.BAD_ANSWER, why: "одиночный вызов и продолжение нити несовместимы" }
  }
  // 596-3: every call is single now unless a thread is named — `single` stays an accepted option, nothing more.
  void single

  try {
    mkdirSync(WORKDIR, { recursive: true })
  } catch { /* папка есть или её не создать — второе всплывёт запуском */ }

  // 596-3: the rules of the call go in a file (a Windows command line ends at 32 767 characters); the phrase goes on stdin.
  const systemFile = join(WORKDIR, `system-${randomUUID()}.txt`)
  try {
    writeFileSync(systemFile, String(system ?? ""), "utf8")
  } catch (e) {
    return { ok: false, refusal: REFUSAL.UNREACHABLE, why: `the rules of the call were not written: ${String(e?.message ?? e).slice(0, 160)}` }
  }

  const args = [
    // 🔒 `--add-dir` FIRST and always followed by another flag: it takes a LIST and swallows what follows (anti-pattern 548-13).
    ...dirs.flatMap((d) => ["--add-dir", d]),
    // 🔒 `--resume` ТОЛЬКО КОГДА НИТЬ НАЗВАНА. Пустое значение означало бы «продолжи неизвестно что».
    ...(thread ? ["--resume", thread] : []),
    "-p",
    "--system-prompt-file", systemFile,
    "--model", model(),
    "--output-format", "json",
    // 🔒 Ноль серверов MCP: `--strict-mcp-config` без `--mcp-config`. The channel plugin is off for this call (548-20).
    "--strict-mcp-config",
    "--settings", NO_CHANNEL,
    // 🔒 Session file only for a named thread — nobody reads the thread of a call (596-3).
    ...(thread ? [] : ["--no-session-persistence"]),
    // 🛑 РАЗБОРУ ФРАЗЫ ИНСТРУМЕНТЫ НЕ НУЖНЫ, И ОН ИХ НЕ ПОЛУЧАЕТ: модель с инструментами под рукой потратит на них ход и ответит не по
    // форме. Кому они нужны — называет вызывающий поимённо. `--tools` takes a list too, so it stays last.
    ...(tools.length ? ["--allowedTools", tools.join(","), "--tools", tools.join(",")] : ["--tools", ""]),
  ]

  const raw = await new Promise((resolve) => {
    let out = ""
    let err = ""
    let done = false

    const child = spawn(bin, args, {
      cwd: WORKDIR,
      env: childEnv(),
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    })
    // 🛑 STDIN ЗАКРЫВАЕТСЯ СРАЗУ ПОСЛЕ ФРАЗЫ: `claude -p` читает его до конца потока, открытый — молча ждёт.
    child.stdin.on("error", () => { /* the child ended before it read the phrase — its answer says why */ })
    child.stdin.end(String(user ?? ""), "utf8")

    const timer = setTimeout(() => {
      if (done) return
      done = true
      child.kill("SIGKILL")
      resolve({ code: null, err, out, timedOut: true })
    }, timeoutMs)

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

  try { unlinkSync(systemFile) } catch { /* already gone */ }
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

  // 🔒 СЛОВА ОТКАЗА ИЩУТСЯ В ОТВЕТЕ МОДЕЛИ ТОЛЬКО КОГДА КОНВЕРТА НЕТ (195-2). ✗ Оплачено глазами владельца 2026-09-14: описание
  // страницы fractera.ai упомянуло ссылку `/login`, разобранный конверт без ошибки прошёл сюда, и слово из ОТВЕТА объявило
  // успешный ход «не авторизован» (`502`, 43 байта, без `why` — stderr пуст). Разобранный конверт без `is_error` — это ответ, а
  // не отказ: его отказы разобраны выше. Без конверта (нить, вход) — прежняя проверка обоих потоков.
  const named = refusalFromText(envelope ? raw.err : `${raw.err} ${raw.out}`)
  // 🛑 ОТКАЗ, ПРИШЕДШИЙ БЕЗ КОНВЕРТА, НАЗЫВАЕТСЯ ТОЧНО, А НЕ «НЕ ПО ФОРМЕ»
  // (184-2). У неизвестной нити единственный след — строка в stderr, и её слова
  // едут наружу дословно: наш код говорит, ЧТО делать, её текст — что случилось.
  if (named) return { ok: false, refusal: named, why: raw.err.trim().slice(0, 200) || undefined }
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
    method: `модель ${model()}`,
    model: text,
    ms: envelope?.duration_ms ?? null,
    returned: "ответ ушёл на разбор",
  })

  try {
    return {
      // 🔒 РАЗБОР — ОБЩИЙ С ВОРОТАМИ ЗАПИСИ (201-9): ограда с хвостом больше не теряет верный JSON.
      // Не разобрали и так — бросаем, и нижний `catch` назовёт отказ, как прежде.
      data: parseModelJson(text) ?? JSON.parse(stripFence(text)),
      ms: envelope?.duration_ms ?? null,
      ok: true,
      // 🔒 ИМЯ НИТИ ЕДЕТ НАРУЖУ ВСЕГДА, А НЕ ТОЛЬКО КОГДА ЕЁ ПРОСИЛИ ПРОДОЛЖИТЬ.
      // Идентификатор, о котором зовущий узнаёт только задним числом, вернуть
      // уже нельзя: нить существует, а имени её никто не видел.
      thread: envelope?.session_id ?? null,
    }
  } catch {
    return { ok: false, refusal: REFUSAL.BAD_ANSWER, why: text.slice(0, 200) }
  }
}
