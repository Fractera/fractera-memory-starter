// ДВА ИСПЫТАНИЯ ГРАФА ЗНАНИЙ НА НЕБОЛЬШИХ КОРПУСАХ.
//
// Испытание A — СВЯЗЬ ЧЕРЕЗ ТРЕТЬЮ СУЩНОСТЬ. Ответ не лежит ни в одном
// документе целиком: он собирается из двух связей. Это то, ради чего граф и
// заведён, и ровно то, чего не может ни поиск по строкам, ни поле в таблице.
//
// Испытание B — ГРАНИЦЫ. Половина вопросов здесь БЕЗ ответа в корпусе. Склад,
// который отвечает на всё, выглядит работающим ровно до того дня, когда его
// ответу поверят.
//
// 🔒 ВОПРОСЫ СПРАШИВАЮТ ДРУГИМИ СЛОВАМИ, ЧЕМ НАПИСАНО В ТЕКСТЕ. Совпадение
// слово в слово доказывало бы работу подстроки, а не связей.
//
// 🔒 КАЖДЫЙ ПРОГОН ЛОЖИТСЯ В КОРПУС СЛУЧАЕВ САМ — вердикт человек поставит на
// вкладке «Оценка». Прибор судить не имеет права: модель, оценивающая свою
// работу, ошибается в свою пользу.
//
// 🛑 ПРИБОР НЕ УБИРАЕТ ЗА СОБОЙ СРАЗУ: человеку надо увидеть результат глазами.
// Уборка — кнопкой «Забыть всё, что загрузил стенд» либо этим же прибором с
// аргументом `clean`.
//
// Запуск на сервере: node scripts/probe/graph-two-tests.mjs [clean]

import { readFileSync } from "node:fs"

const MARK = "===TESTS_GRAPH==="
const CLEAN = process.argv[2] === "clean"
const BASE = process.env.MEMORY_URL ?? "http://127.0.0.1:3700"
const LOG = process.env.RAG_LOG ?? "/opt/fractera/services/rag/lightrag.log"

const key = (() => {
  try {
    const file = process.env.FRACTERA_MACHINE_ENV || "/etc/fractera/secrets.env"
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      const i = line.indexOf("=")
      if (i > 0 && line.slice(0, i).trim() === "DATA_SECRET") {
        return line.slice(i + 1).trim().replace(/^["']|["']$/g, "")
      }
    }
  } catch { /* скажем ниже */ }
  return process.env.DATA_SECRET || ""
})()

if (!key) {
  console.log(`${MARK} СЕКРЕТА МАШИНЫ НЕТ НА ДИСКЕ — прогон невозможен`)
  process.exit(2)
}

const call = (path, init = {}) =>
  fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", "x-data-secret": key, ...(init.headers ?? {}) },
  }).then(async (r) => {
    const t = await r.text()
    try {
      return { json: JSON.parse(t), status: r.status }
    } catch {
      return { json: { notJson: t.slice(0, 120) }, status: r.status }
    }
  })

if (CLEAN) {
  const gone = await call("/api/fractera/graph-search", { method: "DELETE" })
  console.log(`${MARK} уборка: забыто ${gone.json.deleted?.length ?? 0}`)
  process.exit(0)
}

const logLines = () => {
  try {
    return readFileSync(LOG, "utf8").split(/\r?\n/).length
  } catch {
    return -1
  }
}
const nodesSince = (from) => {
  try {
    const line = readFileSync(LOG, "utf8").split(/\r?\n/).slice(from).filter((l) => l.includes("Query nodes:")).pop() ?? ""
    const m = line.match(/Query nodes: (.+?)(?: \(top_k|$)/)
    return m ? m[1].split(",").map((s) => s.trim()).filter(Boolean) : []
  } catch {
    return []
  }
}
const settle = () => new Promise((r) => setTimeout(r, 3000))

// ── КОРПУСА ─────────────────────────────────────────────────────────────────
// Небольшие намеренно: пять коротких записей на испытание. Дело не в объёме, а
// в том, лежит ли ответ в ОДНОЙ записи или собирается из нескольких.

const A = {
  docs: [
    { anchors: ["Ирина Соболь", "Верфь Онега"], text: "Ирина Соболь — инженер-акустик. С 2015 года работает на верфи Онега, настраивает шумоизоляцию корпусов." },
    { anchors: ["Верфь Онега", "Пётр Мазур"], text: "Верфью Онега руководит Пётр Мазур. Он сам когда-то учился на судостроителя в Николаеве." },
    { anchors: ["Пётр Мазур", "Фестиваль Парусов"], text: "Пётр Мазур каждый год судит регату на Фестивале Парусов и лично знаком с её основателем." },
    { anchors: ["Фестиваль Парусов", "Лидия Гронская"], text: "Фестиваль Парусов основала Лидия Гронская, бывшая олимпийская яхтсменка." },
    { anchors: ["Ирина Соболь", "Гидрофон"], text: "Ирина Соболь собрала свой первый гидрофон в школьном кружке и с тех пор их коллекционирует." },
  ],
  name: "A · связь через третью сущность",
  questions: [
    { expect: "через Петра Мазура и Фестиваль", q: "кто из работающих на верфи мог пересечься с олимпийской спортсменкой" },
    { expect: "Пётр Мазур", q: "кто на верфи разбирается в парусных соревнованиях" },
    { expect: "Лидия Гронская", q: "кто придумал праздник для яхтсменов" },
    { expect: "Ирина Соболь", q: "кто увлекается подводными микрофонами" },
    { expect: "Николаев", q: "где учился начальник верфи" },
  ],
}

const B = {
  docs: [
    { anchors: ["Кафе Ротонда", "Марсель"], text: "Кафе Ротонда в Марселе открывается в семь утра и славится миндальными круассанами." },
    { anchors: ["Марсель", "Паром Корсика"], text: "Из Марселя ходит ночной паром на Корсику, дорога занимает около одиннадцати часов." },
    { anchors: ["Кафе Ротонда", "Жан Бертье"], text: "Хозяина Кафе Ротонда зовут Жан Бертье, он держит заведение двадцать лет." },
    { anchors: ["Паром Корсика", "Бастия"], text: "Паром приходит в порт Бастия, оттуда до горных деревень идёт единственный автобус." },
    { anchors: ["Жан Бертье", "Пекарня Люмьер"], text: "Жан Бертье покупает выпечку в пекарне Люмьер на соседней улице." },
  ],
  name: "B · границы: половина вопросов без ответа",
  questions: [
    { expect: "Жан Бертье", q: "кто хозяин заведения с миндальной выпечкой" },
    { expect: "Бастия", q: "куда приплывает ночное судно" },
    { expect: "НЕТ ОТВЕТА — в корпусе нет ни слова о ценах", q: "сколько стоит билет на паром" },
    { expect: "НЕТ ОТВЕТА — врача в корпусе нет", q: "кто из них работает врачом" },
    { expect: "пекарня Люмьер", q: "откуда в кафе берётся хлеб" },
  ],
}

// ── ПОСЕВ ───────────────────────────────────────────────────────────────────

async function seed(test) {
  console.log(`\n### ${test.name}`)
  const stamp = Date.now()
  const before = (await call("/api/fractera/graph-test", { method: "GET" })).json.labels ?? 0
  let sent = 0
  const started = Date.now()
  for (const [i, d] of test.docs.entries()) {
    const r = await call("/api/fractera/graph-test", {
      body: JSON.stringify({ anchors: d.anchors, source: `test-${stamp}-${i}`, text: d.text }),
      method: "POST",
    })
    if (r.status === 200) sent += 1
  }
  console.log(`посеяно записей: ${sent} из ${test.docs.length}`)

  // Ждём по факту: связи строятся в фоне, и пауза «на глаз» либо врёт раньше
  // времени, либо заставляет ждать зря.
  let after = before
  for (let i = 0; i < 60; i += 1) {
    await new Promise((r) => setTimeout(r, 3000))
    after = (await call("/api/fractera/graph-test", { method: "GET" })).json.labels ?? 0
    const work = (await call("/api/fractera/graph-test", { method: "GET" })).json.work
    if (after >= before + test.docs.length && work && !work.busy) break
  }
  const work = (await call("/api/fractera/graph-test", { method: "GET" })).json.work
  console.log(
    `сущностей: ${before} → ${after} · загрузка заняла ${Math.round((Date.now() - started) / 1000)} с · ` +
      `кусков прочитано моделью: ${work?.chunks ?? "?"}, извлечено сущностей ${work?.entities ?? "?"}, связей ${work?.relations ?? "?"}`,
  )
}

// ── ВОПРОСЫ ─────────────────────────────────────────────────────────────────

async function askAll(test) {
  console.log("")
  console.log("ВОПРОС                                             | НАШЛОСЬ | мс   | ЧЬИМИ СЛОВАМИ ИСКАЛ")
  let found = 0
  for (const { expect, q } of test.questions) {
    const from = logLines()
    const r = await call("/api/fractera/graph-search", { body: JSON.stringify({ question: q }), method: "POST" })
    await settle()
    const nodes = nodesSince(from)
    const ok = r.json.found === true
    if (ok) found += 1
    console.log(
      `${q.slice(0, 48).padEnd(48)} | ${(ok ? "да" : "нет").padEnd(7)} | ${String(r.json.askMs ?? "?").padEnd(4)} | ${nodes.join(", ").slice(0, 60)}`,
    )
    console.log(`   ждём: ${expect}`)
    if (ok) console.log(`   вернулось: ${String(r.json.context ?? "").replace(/\s+/g, " ").slice(0, 200)}`)
  }
  console.log(`\nнашлось на ${found} из ${test.questions.length} вопросов`)
}

console.log(MARK)
for (const test of [A, B]) {
  await seed(test)
  await askAll(test)
}
console.log("")
console.log("Прогоны легли в корпус случаев — вердикты ставит человек на вкладке «Оценка».")
console.log("Уборка: node scripts/probe/graph-two-tests.mjs clean")
console.log(`${MARK}DONE`)
