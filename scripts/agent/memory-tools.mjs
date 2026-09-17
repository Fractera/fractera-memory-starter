#!/usr/bin/env node
//
// ИНСТРУМЕНТЫ АГЕНТА ПАМЯТИ — MCP-сервер по stdio.
//
// 🔒 ЭТО ВНУТРЕННОСТИ ЯЩИКА, А НЕ ЕГО ДОГОВОР. Наружу память показывает три
// глагола (`remember`, `recall`, `feedback`); здесь — то, чем работает её
// собственный агент. Смешать одно с другим значило бы вывести устройство наружу.
//
// 🔒 БЕЗ ЕДИНОЙ ЗАВИСИМОСТИ. MCP по stdio — построчный JSON-RPC; трёх методов
// (`initialize`, `tools/list`, `tools/call`) достаточно. Пакет ради пяти
// инструментов — ещё один способ не запуститься на чистой машине.
//
// 🛑 СЧЁТЧИК ЖИВЫХ ВЫЗОВОВ ОБЯЗАТЕЛЕН И ПОДНИМАЕТСЯ ДО ПЕРВОГО `await`.
// ✗ Оплачено дважды за один час 2026-09-09 в соседнем MCP-сервере: обработчик
// стал асинхронным, счётчик остался под другой веткой — и ответы терялись по
// закрытию stdin молча, без ошибки и без строки в журнале.

import { readFileSync } from "node:fs"
import { recall, remember } from "../../lib/verbs.mjs"

// 🪦 206-6: здесь лежали служебные колонки корня и признак парной колонки. Они ПЕРЕЖИЛИ
// свой предмет и были уже сломаны: `isPair` звала два имени, которых этот файл не импортирует.

let inFlight = 0
let stdinClosed = false
const maybeExit = () => { if (stdinClosed && inFlight === 0) process.exit(0) }

const send = (m) => process.stdout.write(`${JSON.stringify(m)}\n`)
const ok = (id, result) => send({ id, jsonrpc: "2.0", result })
const fail = (id, message) => send({ error: { code: -32000, message }, id, jsonrpc: "2.0" })
const text = (s) => ({ content: [{ text: String(s), type: "text" }] })

// ── ОБЪЯВЛЕНИЕ ИНСТРУМЕНТОВ ──────────────────────────────────────────────────
//
// 🔒 ОПИСАНИЕ ГОВОРИТ, КОГДА ЗВАТЬ, А НЕ ЧТО ЭТО ТАКОЕ. Описание читается
// агентом В МОМЕНТ РЕШЕНИЯ, инструкция — в начале сессии; первое сильнее.
const TOOLS = [
  {
    description:
      "Что памяти уже известно об этом человеке: последнее, что он говорил и присылал. " +
      "Зови первым, когда нужно понять, о чём вообще речь.",
    inputSchema: {
      // 🔒 207-3: ЧЕЛОВЕКА НАЗЫВАТЬ БОЛЬШЕ НЕ НАДО — он один. Осталось «откуда», и оно необязательно.
      properties: { from: { description: "Откуда пришло: путь источника, например telegram/bot", type: "string" } },
      required: [],
      type: "object",
    },
    name: "what_i_already_know",
  },
  {
    description:
      "Записать то, что сказал человек — его словами, как есть. Куда это ляжет, решает память: " +
      "короткое идёт в связи и в поиск по смыслу, длинное сохраняется целой вещью. " +
      "Своих таблиц и колонок у памяти нет, и заводить их нечем.",
    inputSchema: {
      properties: {
        text: { description: "Фраза человека как есть, без пересказа", type: "string" },
        via: { description: "Канал: Telegram, почта, стенд", type: "string" },
        from: { description: "Откуда пришло: путь источника, например telegram/bot", type: "string" },
      },
      required: ["text"],
      type: "object",
    },
    name: "remember_said",
  },
  {
    description:
      "ПОСЛЕДНИМ и ВСЕГДА, даже если не записал ничего. Скажи, что сделал и чего НЕ сделал. " +
      "Наружу уходит только это. Промолчав, ты оставишь впечатление, что записано всё.",
    inputSchema: {
      properties: {
        heard: {
          description: "ВСЁ, что ты услышал во фразе, по пунктам — с судьбой каждого: записал, не записал и почему, не понял",
          items: { type: "string" },
          type: "array",
        },
        said: { description: "Одной фразой для человека: что запомнено", type: "string" },
      },
      required: ["said", "heard"],
      type: "object",
    },
    name: "answer",
  },
  {
    // 🔒 НАЗНАЧЕНИЕ И ЦЕНА — И НИ ОДНОГО «КОГДА ЗВАТЬ» (поправка владельца
    // 2026-09-12). Перечень поводов не помогает, а мешает: модель начинает
    // гадать, попадает ли её случай в наш список, вместо того чтобы решить
    // самой. Она умнее списка — ей достаточно знать, что это такое и чем
    // платится.
    // 🛑 И НИ СЛОВА ПРО «ЧЕЛОВЕКА»: связь бывает между чем угодно — машиной,
    // деревом, едой. Сузив предмет примером, мы сузим и то, что агент решится
    // спросить.
    description:
      "Связи между сущностями. Ходов модели не стоит. Как пользоваться — навык use-knowledge-graph.",
    inputSchema: {
      properties: {
        question: { description: "Вопрос словами человека", type: "string" },
      },
      required: ["question"],
      type: "object",
    },
    name: "ask_graph",
  },
  {
    // 🔒 НАЗНАЧЕНИЕ И ЦЕНА, БЕЗ ПОВОДОВ — тот же закон, что у соседнего
    // инструмента. Отличие названо одним словом «по смыслу»: без него два
    // инструмента выглядят одинаково, и выбор между ними становится гаданием.
    // 🛑 ОГРАНИЧЕНИЕ СКАЗАНО ПРЯМО В ОПИСАНИИ, А НЕ ТОЛЬКО В НАВЫКЕ: этот
    // уровень включает зовущий, и инструмент, молчащий об этом, будет позван не
    // вовремя.
    description:
      "Поиск по смыслу, когда слова вопроса и слова записи разные. Возвращает куски текста с числом " +
      "близости. Включается требованием зовущего, а не твоим выбором. Как пользоваться — навык use-vector-store.",
    inputSchema: {
      properties: {
        question: { description: "Вопрос обычными словами", type: "string" },
      },
      required: ["question"],
      type: "object",
    },
    name: "search_vectors",
  },
  {
    // 🔒 ТРЕТЬЕ ХРАНИЛИЩЕ — ТОЙ ЖЕ ФОРМОЙ ОПИСАНИЯ: назначение и цена, без поводов
    // (192-4). Отличие от соседей названо одним словом «целиком»: граф отдаёт
    // связи, вектор — кусок, этот склад — саму вещь с идентификатором.
    description:
      "Найти объект целиком — документ, изображение, PDF — по смыслу вопроса. Возвращает id, имя, род и число " +
      "близости; ходов модели не стоит. Как пользоваться — навык use-object-store.",
    inputSchema: {
      properties: {
        question: { description: "Что ищется — обычными словами", type: "string" },
      },
      required: ["question"],
      type: "object",
    },
    name: "find_objects",
  },
  {
    description:
      "Открыть объект памяти по id: текстовый отдаёт содержимое кусками с названным пределом, двоичный — " +
      "только карточку. Как пользоваться — навык use-object-store.",
    inputSchema: {
      properties: {
        from: { description: "С какого знака продолжить, если прошлый ответ сказал «дальше с N»", type: "number" },
        id: { description: "Идентификатор из find_objects или из прежнего ответа", type: "string" },
      },
      required: ["id"],
      type: "object",
    },
    name: "open_object",
  },
  {
    // 🔒 РУКА ЗАПИСИ ЕСТЬ ТОЛЬКО У ЭТОГО ХРАНИЛИЩА, И ПРИЧИНА В ТОМ, КТО АВТОР.
    // Граф и вектор наполняет код памяти; объект-ответ (замысел службы) сочиняет
    // сам агент. Без этой руки обещание его инструкции «ответ бывает объектом,
    // наружу едет идентификатор» — способность, названная и отсутствующая.
    description:
      "Сохранить составленный тобой текстовый документ (Markdown) как объект и получить его id — когда ответом " +
      "является документ, а не фраза. Как пользоваться — навык use-object-store.",
    inputSchema: {
      properties: {
        about: { description: "Одна-две фразы: что это за документ и о чём — по ним его найдут потом", type: "string" },
        name: { description: "Имя файла словами через дефис, например may-august-income-detailed.md", type: "string" },
        text: { description: "Содержимое документа целиком, Markdown", type: "string" },
      },
      required: ["name", "text", "about"],
      type: "object",
    },
    name: "keep_object",
  },
]

// ── ИСПОЛНИТЕЛИ ──────────────────────────────────────────────────────────────

/**
 * Что памяти уже известно об этом человеке.
 *
 * 🔒 С 206-3 ЭТО ЧТЕНИЕ ЕДИНСТВЕННОЙ ТАБЛИЦЫ, А НЕ ОБХОД КОЛОНОК. Зовём тот же глагол, которым
 * пользуется весь мир: второй путь к одному делу — лишний ход и молчаливое расхождение.
 */
async function whatIKnow({ from }) {
  const r = await recall({ from, lang: "ru" })
  if (!r.ok) return `Не смог прочитать: ${r.error ?? "?"}`
  const rows = r.known ?? []
  if (!rows.length) return "О человеке ещё ничего не записано."
  return (
    "Последнее, что он говорил и присылал:\n" +
    rows.slice(0, 20).map((k) => `- ${k.at ?? ""} ${k.what}: ${String(k.value).slice(0, 200)}`).join("\n")
  )
}

/**
 * Записать сказанное человеком.
 *
 * 🔒 ОДНА РУКА ВМЕСТО ЧЕТЫРЁХ (206-3). Прежде их было четыре — «посмотри, что есть», «запиши
 * значение», «заведи новый род», «сделай список», — и все они правили колонки корневой таблицы.
 * Таблиц под роды больше нет: куда лечь сказанному, решает сама память, и решает она это в одном
 * месте — глаголе «Сказать». Рука, дублирующая его решение, разошлась бы с ним на первой правке.
 * 🛑 РУКА НЕ РЕШАЕТ, ЧТО ЗАПОМНИТЬ: она передаёт фразу как есть. Пересказ агента вместо слов
 * человека — это уже его вывод, и отличить его потом от свидетельства будет нечем.
 */
async function rememberSaid({ from, text, via }) {
  const r = await remember({ from, lang: "ru", text, via })
  if (!r.ok) return `Не записалось: ${r.error ?? r.what_happened ?? "?"}`
  const where =
    r.kept_whole?.where === "objects"
      ? "текст длинный — сохранён целиком отдельной вещью"
      : "сохранено в связях и по смыслу"
  const noted = (r.noted ?? []).map((n) => `${n.what}: ${n.became}`).join("; ")
  return [r.what_happened, where, noted ? `разобрано: ${noted}` : ""].filter(Boolean).join(String.fromCharCode(10))
}


function answer({ heard, said }) {
  const lines = Array.isArray(heard) ? heard : []
  return JSON.stringify({ heard: lines, said: String(said ?? "") })
}

/**
 * Спросить граф связей.
 *
 * 🔒 КЛЮЧЕВЫЕ СЛОВА СОБИРАЕМ МЫ, А НЕ АГЕНТ И НЕ ДВИЖОК (189-4). Агенту про них
 * знать нечего — он присылает вопрос человеческой фразой; движок, не получив
 * слов, вытащил бы их вызовом модели: измерено, 3538 мс против 666 мс.
 * 🛑 ЗНАЧИТ ЭТО ГАРАНТИРУЕТСЯ КОНСТРУКЦИЕЙ, А НЕ ПРОСЬБОЙ В ИНСТРУКЦИИ. Правило,
 * которое можно не дать нарушить, не пишут словами.
 */
/**
 * Секрет машины — им ходят СВОИ процессы этого сервера.
 *
 * 🔒 НЕ КЛЮЧ ПАМЯТИ, И ЭТО ИСПРАВЛЕНО 2026-09-12 ПО СЛОВУ ВЛАДЕЛЬЦА О ЕДИНОМ
 * СТАНДАРТЕ. Ключ памяти выдают ЧУЖИМ инструментам, и снаружи ему открыты ровно
 * глаголы договора. Агент памяти — не чужой инструмент: он внутри ящика,
 * живёт на этой машине и читает её секреты.
 */
function machineSecret() {
  try {
    const file = process.env.FRACTERA_MACHINE_ENV || "/etc/fractera/secrets.env"
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      const i = line.indexOf("=")
      if (i > 0 && line.slice(0, i).trim() === "DATA_SECRET") {
        return line.slice(i + 1).trim().replace(/^["']|["']$/g, "")
      }
    }
  } catch { /* нет файла — вызов честно упрётся в отказ двери */ }
  return process.env.DATA_SECRET || ""
}

async function askGraph({ question }) {
  const q = String(question ?? "").trim()
  if (!q) return "Пустой вопрос — графу нечего искать."

  // 🔒 ИДЁМ ЧЕРЕЗ СОБСТВЕННУЮ ДВЕРЬ СЛУЖБЫ, А НЕ МИМО НЕЁ, И ПРИЧИН ДВЕ.
  // Механическая: этот сервер — голый Node, а сбор слов и клиент графа написаны
  // на TypeScript, которого Node не исполняет. Содержательная и главная: у
  // агента и у стенда обязан быть ОДИН путь. Заведи мы второй — он разошёлся бы
  // с первым молча, и человек на стенде проверял бы не то, чем работает агент.
  let res
  try {
    res = await fetch("http://127.0.0.1:3700/api/fractera/graph-search", {
      body: JSON.stringify({ question: q }),
      headers: { "Content-Type": "application/json", "x-data-secret": machineSecret() },
      method: "POST",
    })
  } catch {
    return "Граф связей не отвечает. Отвечай тем, что знаешь без него."
  }
  if (!res.ok) return "Граф связей не отвечает. Отвечай тем, что знаешь без него."
  const answer = await res.json().catch(() => ({}))

  const body = String(answer.context ?? "").trim()
  if (!body || body.replace(/\s+/g, "").length < 80) {
    // 🔒 ПУСТО — ЭТО ОТВЕТ, А НЕ ОТКАЗ, И РАЗНИЦА ВАЖНА: первое значит «связей
    // нет», второе — «служба легла». Смешав их, агент решит, что знания нет,
    // когда на самом деле сломан путь.
    return "Связей по этому вопросу в графе нет."
  }
  return body
}

/**
 * Найти по смыслу.
 *
 * 🔒 ПОРОГ ПРИМЕНЯЕТ ДВЕРЬ, А НЕ АГЕНТ, И НАРУЖУ ЕДЕТ УЖЕ СУЖДЕНИЕ. Отдай мы
 * агенту сырые числа — он начал бы выбирать порог сам, и у одной способности
 * стало бы два правила: одно в коде, другое в его рассуждении.
 * 🛑 «НИЧЕГО ПОДХОДЯЩЕГО» НАЗЫВАЕТ БЛИЖАЙШЕЕ ЧИСЛОМ: промах на 0.31 и промах на
 * 0.08 ведут человека в разные стороны.
 */
async function searchVectors({ question }) {
  const q = String(question ?? "").trim()
  if (!q) return "Пустой вопрос — искать нечего."

  let res
  try {
    res = await fetch("http://127.0.0.1:3700/api/fractera/vector-search", {
      body: JSON.stringify({ question: q }),
      headers: { "Content-Type": "application/json", "x-data-secret": machineSecret() },
      method: "POST",
    })
  } catch {
    return "Векторное хранилище не отвечает. Отвечай тем, что знаешь без него."
  }
  if (!res.ok) return "Векторное хранилище не отвечает. Отвечай тем, что знаешь без него."
  const a = await res.json().catch(() => ({}))

  if (!a.found) {
    const near = a.nearest ? ` Ближайшее было ${a.nearest.score.toFixed(3)}.` : ""
    return `Ничего подходящего ближе порога ${a.threshold}.${near}`
  }
  return a.near
    .map((p) => `[${p.score.toFixed(3)}] ${p.text}`)
    .join("\n\n")
}

// ── ОБЪЕКТНОЕ ХРАНИЛИЩЕ (192-4) ─────────────────────────────────────────────
//
// 🔒 ТРИ РУКИ ИДУТ ЧЕРЕЗ ТЕ ЖЕ ДВЕРИ, ЧТО И СТЕНД (`object-*`): у агента и у
// человека на стенде один путь, иначе стенд проверяет не то, чем работает агент.
// 🔒 ОТКАЗЫ РАЗЛИЧАЮТСЯ СЛОВАМИ: «не отвечает» — путь сломан; «ничего ближе
// порога» — склад жив, вещи нет; «не памяти» — id чужой. Смешав первое со
// вторым, агент скажет «такого нет», когда оно есть и недоступно.

const OBJECTS_DOWN = "Объектное хранилище не отвечает. Отвечай тем, что знаешь без него, и скажи, что объекты недоступны."

async function objectDoor(path, body) {
  try {
    const res = await fetch(`http://127.0.0.1:3700/api/fractera/${path}`, {
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json", "x-data-secret": machineSecret() },
      method: "POST",
    })
    const j = await res.json().catch(() => ({}))
    return { j, status: res.status }
  } catch {
    return { j: {}, status: 0 }
  }
}

const kind = (h) => `${h.mime || "род не назван"} · ${h.size} байт · ${h.text ? "текст читается" : "содержимое не читается"}`

async function findObjects({ question }) {
  const q = String(question ?? "").trim()
  if (!q) return "Пустой вопрос — искать нечего."
  const { j, status } = await objectDoor("object-search", { question: q })
  if (status !== 200 || !j.ok) return OBJECTS_DOWN

  const lost = j.lost ? `\nКарточек без файла: ${j.lost} — файл удалили мимо памяти.` : ""
  if (!j.found) {
    const near = j.nearest ? ` Ближайшее было ${j.nearest.score.toFixed(3)} — ${j.nearest.name}.` : " Объектов в памяти нет."
    return `Ничего подходящего ближе порога ${j.threshold}.${near}${lost}`
  }
  const lines = j.near.map((h) => {
    const about = h.about ? `\n  описание: ${h.about}` : ""
    const preview = h.preview ? `\n  начало: ${h.preview}` : ""
    return `[${h.score.toFixed(3)}] id=${h.id} · ${h.name} · ${kind(h)}${about}${preview}`
  })
  return `Объектов ближе порога ${j.threshold}: ${j.near.length}.\n\n${lines.join("\n\n")}${lost}`
}

async function openObject({ from, id }) {
  const key = String(id ?? "").trim()
  if (!key) return "Не назван id объекта."
  const { j, status } = await objectDoor("object-open", { from: Number(from ?? 0) || 0, id: key })
  if (status === 0 || status === 502) return OBJECTS_DOWN
  if (!j.ok) {
    if (j.error === "not-found") return `Объекта с id ${key} нет.`
    if (j.error === "not-ours") return `id ${key} принадлежит медиатеке платформы, а не памяти — открыть его нельзя.`
    if (j.error === "file-missing") return `Карточка объекта ${key} есть, а файла на складе нет — его удалили мимо памяти.`
    return OBJECTS_DOWN
  }
  const c = j.card
  const head = `id=${c.id} · ${c.name} · ${kind(c)}${c.about ? `\nописание: ${c.about}` : ""}`
  // 🛑 ДВОИЧНЫЙ ОБЪЕКТ НЕ ПОЛУЧАЕТ СОДЕРЖИМОГО, И ЭТО СКАЗАНО ПРЯМО: иначе модель
  // перескажет описание как увиденное.
  if (j.text === null) {
    return `${head}\n\nСодержимое этого рода память не читает — есть только карточка выше. Ссылайся на объект по id.`
  }
  const end = j.from + j.shown
  const more = end < j.total ? `\nДальше: open_object({ id: "${c.id}", from: ${end} }).` : "\nЭто конец документа."
  return `${head}\nПоказаны знаки ${j.from}–${end} из ${j.total}.${more}\n\n${j.text}`
}

const TEXT_NAME = /\.(csv|html?|json|markdown|md|tsv|txt|xml|ya?ml)$/i

async function keepObject({ about, name, text }) {
  const body = String(text ?? "")
  const what = String(about ?? "").trim()
  let file = String(name ?? "").trim().replace(/[\\/]/g, "-")
  if (!body.trim()) return "Пустой документ — сохранять нечего."
  if (!what) return "Не сказано, что это за документ: без описания его не найдут потом."
  if (!file) return "Не названо имя файла."
  // 🔒 РУКА КЛАДЁТ ТОЛЬКО ТЕКСТ: двоичного артефакта агент не порождает.
  if (!TEXT_NAME.test(file)) file = `${file}.md`

  const form = new FormData()
  form.append("file", new Blob([body], { type: "text/markdown" }), file)
  form.append("about", what)
  let res
  try {
    res = await fetch("http://127.0.0.1:3700/api/fractera/object-test", {
      body: form,
      headers: { "x-data-secret": machineSecret() },
      method: "POST",
    })
  } catch {
    return OBJECTS_DOWN
  }
  const j = await res.json().catch(() => ({}))
  if (!res.ok || !j.ok) return `Документ не сохранён: ${j.error ?? `код ${res.status}`}.`
  return `Сохранено: id=${j.object.id} · ${j.object.name} · ${j.object.size} байт. Этот id и есть ссылка на документ в твоём ответе.`
}

const RUN = {
  answer,
  ask_graph: askGraph,
  find_objects: findObjects,
  keep_object: keepObject,
  open_object: openObject,
  search_vectors: searchVectors,
  remember_said: rememberSaid,
  what_i_already_know: whatIKnow,
}

// ── ПРОТОКОЛ ─────────────────────────────────────────────────────────────────

async function handle(m) {
  if (m.id === undefined || m.id === null) return
  if (m.method === "initialize") {
    return ok(m.id, {
      capabilities: { tools: {} },
      protocolVersion: m.params?.protocolVersion || "2024-11-05",
      serverInfo: { name: "memory-tools", version: "1.0.0" },
    })
  }
  if (m.method === "tools/list") return ok(m.id, { tools: TOOLS })
  if (m.method === "tools/call") {
    const p = m.params || {}
    const run = RUN[p.name]
    if (!run) return fail(m.id, `unknown tool: ${p.name}`)
    inFlight += 1
    try {
      return ok(m.id, text(await run(p.arguments || {})))
    } catch (e) {
      // 🛑 ОТКАЗ НАЗЫВАЕТСЯ ОТКАЗОМ, А НЕ ПАДАЕТ МОЛЧА.
      return ok(m.id, text("Внутри памяти сломалось: " + String(e.message).slice(0, 200)))
    } finally {
      inFlight -= 1
      maybeExit()
    }
  }
  return fail(m.id, `unknown method: ${m.method}`)
}

let buf = ""
process.stdin.setEncoding("utf8")
process.stdin.on("data", (chunk) => {
  buf += chunk
  let i
  while ((i = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, i).trim()
    buf = buf.slice(i + 1)
    if (!line) continue
    try {
      handle(JSON.parse(line))
    } catch {
      // Кривая строка — не повод падать: следующая может быть годной.
    }
  }
})
process.stdin.on("end", () => { stdinClosed = true; maybeExit() })
