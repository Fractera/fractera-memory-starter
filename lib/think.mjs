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
import { accessSync, constants, mkdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { say } from "./words.mjs"
import { tmpdir } from "node:os"
import { note } from "./journal.mjs"
import { parseModelJson } from "./write-gate.mjs"

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
  return "opus"
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

/**
 * Где лежит объявление инструментов памяти.
 *
 * 🔒 ОТ КОРНЯ СЛУЖБЫ, А НЕ ОТ ПАПКИ РАЗБОРА: думает агент в пустой папке, а
 * инструменты живут там, где написан их сервер. Путь относительный сломался бы
 * ровно в тот день, когда службу запустят из другого места.
 */
const MCP_CONFIG = process.env.MEMORY_MCP_CONFIG ?? join(process.cwd(), ".mcp.json")

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
   * дешевле присланного заново (паспорт §10). Значит вернуться к цепочке —
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

  try {
    mkdirSync(WORKDIR, { recursive: true })
  } catch { /* папка есть или её не создать — второе всплывёт запуском */ }

  const args = [
    // 🔒 `--resume` СТОИТ ПЕРЕД ВСЕМ ОСТАЛЬНЫМ И ТОЛЬКО КОГДА НИТЬ НАЗВАНА.
    // Пустое значение здесь означало бы «продолжи неизвестно что», и CLI
    // ответил бы отказом там, где человек ничего не просил.
    ...(thread ? ["--resume", thread] : []),
    "-p", user,
    "--system-prompt", system,
    "--model", model(),
    "--output-format", "json",
    // 🛑 ОБЪЯВЛЕНИЕ ИНСТРУМЕНТОВ ПЕРЕДАЁТСЯ, НО СЕРВЕР НЕ СТАРТУЕТ, И ЭТО ИЗМЕРЕНО 2026-09-14 (201-2).
    //
    // Путь к КОНФИГУ здесь абсолютный — а путь ВНУТРИ конфига («scripts/agent/memory-tools.mjs»)
    // разрешается от рабочей папки процесса, то есть от пустой папки разбора. Файла там нет:
    // строка инициализации CLI печатает `memory:failed`, тем же конфигом с абсолютным путём —
    // `memory:connected`. Ни ошибки, ни предупреждения в конверте при этом нет.
    //
    // 🔒 ПОЧЕМУ ЭТО НИЧЕГО НЕ СЛОМАЛО И ПОЧЕМУ СТРОКА ВСЁ РАВНО ПРАВИТСЯ: ни один вызов `think()`
    // инструментов MCP не разрешает (`--allowedTools` получает только `Read` в `describe.mjs`),
    // значит работающее не пострадало. Но прежний комментарий здесь утверждал обратное —
    // «инструменты приходят из папки службы», — и ЛОЖНЫЙ КОММЕНТАРИЙ ОПАСНЕЕ ОТСУТСТВУЮЩЕГО:
    // следующий читатель строит на нём. Починка пути — отдельная работа с ведома владельца.
    //
    // 🔒 У ОДИНОЧНОГО ВЫЗОВА КОНФИГА НЕТ ВОВСЕ: `--strict-mcp-config` без `--mcp-config` означает
    // ноль серверов — ровно то, что нужно разбору фразы, и без попытки поднять падающий сервер.
    ...(single ? [] : ["--mcp-config", MCP_CONFIG]),
    "--strict-mcp-config",
    ...(single ? ["--no-session-persistence"] : []),
    // 🛑 РАЗБОРУ ФРАЗЫ ИНСТРУМЕНТЫ НЕ НУЖНЫ, И ОН ИХ НЕ ПОЛУЧАЕТ. Он обязан
    // вернуть ЧИСТЫЙ JSON; модель, у которой под рукой инструменты, потратит на
    // них ход и ответит не по форме. Кому инструменты нужны — говорит вызывающий
    // списком имён, и тогда они называются поимённо, а не «все, какие есть».
    ...(tools.length ? ["--allowedTools", tools.join(",")] : []),
    ...dirs.flatMap((d) => ["--add-dir", d]),
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
