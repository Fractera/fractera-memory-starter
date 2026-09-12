// ПРИБОР 189-4 — ПОИСК ПО ГРАФУ: МГНОВЕННО И БЕЗ ХОДА МОДЕЛИ.
//
// 🎯 ЧТО ДОКАЗЫВАЕТСЯ, И ЭТО НЕ «ПОИСК РАБОТАЕТ». Доказывается утверждение
// владельца о цене целиком: загрузка дорогая, а чтение после неё — мгновенное и
// без вызова модели. Второе проверяется НЕ НАШИМ СЛОВОМ, а журналом чужой
// службы: если бы движок звал модель, он сам бы об этом записал.
//
// 🔒 ГЛАВНЫЙ ЗАМЕР — СРАВНЕНИЕ ДВУХ ПУТЕЙ НА ОДНОМ ВОПРОСЕ. Со словами от памяти
// и без них. Прибор, у которого оба исхода дают одно число, измеряет не то, что
// утверждает (закон, оплаченный в 183-4).
//
// 🛑 ВОПРОС КАЖДЫЙ РАЗ НОВЫЙ, И ЭТО ОБЯЗАТЕЛЬНО. Движок кэширует извлечённые
// ключевые слова: повторный вопрос без слов отвечает за 372 мс и выглядит
// бесплатным, хотя модель звалась в первый раз. Кэш превращает честный замер в
// ложный — метка времени в вопросе его обходит.
//
// Запуск на сервере: node scripts/probe/graph-search.mjs [keep]

import { readFileSync } from "node:fs"

const MARK = "===PROBE_189_4==="
const KEEP = process.argv[2] === "keep"
const BASE = process.env.MEMORY_URL ?? "http://127.0.0.1:3700"
const LOG = process.env.RAG_LOG ?? "/opt/fractera/services/rag/lightrag.log"

// 🔒 ПРИБОР — СВОЙ ПРОЦЕСС НА ЭТОЙ МАШИНЕ, И ХОДИТ ОН СЕКРЕТОМ МАШИНЫ (исправлено
// 2026-09-12 по слову владельца о едином стандарте). ✗ Прежде он ходил ключом
// памяти — тем, что выдают ЧУЖИМ инструментам, — и этим двери стенда
// превращались во вторую публичную дверь мимо договора.
const key = (() => {
  try {
    const file = process.env.FRACTERA_MACHINE_ENV || "/etc/fractera/secrets.env"
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      const i = line.indexOf("=")
      if (i > 0 && line.slice(0, i).trim() === "DATA_SECRET") {
        return line.slice(i + 1).trim().replace(/^["']|["']$/g, "")
      }
    }
  } catch { /* нет файла — скажем об этом ниже */ }
  return process.env.DATA_SECRET || ""
})()

if (!key) {
  console.log(`${MARK} СЕКРЕТА МАШИНЫ НЕТ НА ДИСКЕ — прогон невозможен`)
  process.exit(2)
}

let bad = 0
const say = (ok, what) => {
  if (!ok) bad += 1
  console.log(`${ok ? "✓" : "✗"} ${what}`)
}

const call = (path, init = {}, withKey = true) => {
  const headers = { "Content-Type": "application/json", ...(init.headers ?? {}) }
  if (withKey) headers["x-data-secret"] = key
  return fetch(`${BASE}${path}`, { ...init, headers }).then(async (r) => {
    const text = await r.text()
    try {
      return { json: JSON.parse(text), status: r.status }
    } catch {
      return { json: { notJson: text.slice(0, 120) }, status: r.status }
    }
  })
}

/** Сколько строк в журнале чужой службы сейчас. */
const logLines = () => {
  try {
    return readFileSync(LOG, "utf8").split("\n").length
  } catch {
    return -1
  }
}

/**
 * ЧЬИМИ СЛОВАМИ СЛУЖБА ИСКАЛА — самый прямой признак того, звала ли она модель.
 *
 * 🔒 ОНА ПЕЧАТАЕТ ИХ САМА: `Query nodes: Пражская Консерватория, чинит, ...`.
 * Совпали с нашими — извлекать ей было нечего, ход модели не нужен. Пришли
 * ЧУЖИЕ (склонённые, с заглавной, «Чинить» вместо «чинит») — их сделала модель.
 *
 * ✗ ПЕРВАЯ РЕДАКЦИЯ ПРИБОРА СЧИТАЛА СТРОКИ `== LLM cache == saving: …keywords`
 * И ДАЛА НОЛЬ НА ОБОИХ ПУТЯХ — то есть негативный контроль молчал там, где
 * обязан был сработать. Измерено в тот же час: строки сохранения кэша пишутся
 * ПОЗЖЕ ответа, и чтение сразу после вызова их не видит. Признак был верным по
 * смыслу и негодным по времени.
 * 🔒 УРОК ШИРЕ СЛУЧАЯ: у признака есть не только смысл, но и МОМЕНТ появления.
 * «Строки нет» и «строки ещё нет» — разные утверждения, и различает их только
 * второй замер.
 */
const queryNodesSince = (from) => {
  try {
    const all = readFileSync(LOG, "utf8").split("\n").slice(from)
    const line = all.filter((l) => l.includes("Query nodes:")).pop() ?? ""
    const m = line.match(/Query nodes: (.+?)(?: \(top_k|$)/)
    return m ? m[1].split(",").map((s) => s.trim()).filter(Boolean) : []
  } catch {
    return null
  }
}

/** Сколько раз служба сохраняла в кэш извлечённые МОДЕЛЬЮ слова. */
const keywordCallsSince = (from) => {
  try {
    const all = readFileSync(LOG, "utf8").split("\n").slice(from)
    return all.filter((l) => l.includes("== LLM cache == saving") && l.includes("keywords")).length
  } catch {
    return -1
  }
}

/** Дать службе дописать журнал: он пишется после ответа, а не вместе с ним. */
const letLogSettle = () => new Promise((r) => setTimeout(r, 3000))

console.log(MARK)

if (logLines() < 0) {
  console.log("  🛑 журнал службы графа не читается — вторая плоскость недостижима, замер неполон")
}

// ── ПОСЕВ, КОТОРЫЙ ПОТОМ ИЩЕМ ───────────────────────────────────────────────
const stamp = Date.now()
const hero = `Мирослав Ковач ${stamp}`
const seeded = await call("/api/fractera/graph-test", {
  body: JSON.stringify({
    anchors: [hero, "Пражская консерватория"],
    source: `probe-189-4-${stamp}`,
    text:
      `${hero} — реставратор старинных клавесинов. С 2011 года он восстанавливает инструменты ` +
      `для Пражской консерватории, а свою мастерскую держит в квартале Винограды.`,
  }),
  method: "POST",
})
say(seeded.status === 200, `посев принят: ${seeded.status}`)

let ready = false
for (let i = 0; i < 30; i += 1) {
  await new Promise((r) => setTimeout(r, 2000))
  const st = await call("/api/fractera/graph-test", { method: "GET" })
  const names = st.json.labelSample ?? []
  if (names.some((n) => String(n).includes(String(stamp)) || String(n).includes("Ковач"))) {
    ready = true
    break
  }
}
say(ready, `граф извлёк нашего героя и готов отвечать`)

// ── ОСНОВНОЙ ПУТЬ: СЛОВА ДАЁМ МЫ ────────────────────────────────────────────
// 🔒 СПРАШИВАЕМ ДРУГИМИ СЛОВАМИ, А НЕ ТЕМИ, ЧТО ПОЛОЖИЛИ: «кто чинит клавесины»
// — в тексте нет слова «чинит», там «восстанавливает». Совпадение слово в слово
// доказывало бы работу подстроки, а не графа.
const before1 = logLines()
const ours = await call("/api/fractera/graph-search", {
  body: JSON.stringify({ question: `кто чинит клавесины для консерватории ${stamp}` }),
  method: "POST",
})
await letLogSettle()
const nodes1 = queryNodesSince(before1) ?? []
const calls1 = keywordCallsSince(before1)

say(ours.status === 200 && ours.json.ok === true, `дверь поиска отвечает: ${ours.status}`)
say(ours.json.found === true, `нашлось: блоков сущностей ${ours.json.entities}`)
say(
  (ours.json.keywords?.matched ?? []).length > 0,
  `узнаны настоящие метки графа: ${(ours.json.keywords?.matched ?? []).join(", ") || "ни одной"}`,
)
// 🔒 ГЛАВНАЯ ПРОВЕРКА НАШЕГО ПУТИ: служба искала ИМЕННО НАШИМИ словами. Значит
// извлекать ей было нечего — ход модели не понадобился.
const sent = (ours.json.keywords?.low ?? []).map((s) => String(s).toLowerCase())
say(
  nodes1.length > 0 && nodes1.every((n) => sent.includes(n.toLowerCase())),
  `НАШ путь: служба искала нашими словами — ${nodes1.join(", ") || "строки нет"}`,
)
say(
  calls1 === 0,
  `НАШ путь: сохранений извлечённых моделью слов: ${calls1}`,
)
console.log(`  цена: слова ${ours.json.wordsMs} мс, ответ графа ${ours.json.askMs} мс`)

// ── СТАРЫЙ ПУТЬ: СЛОВ НЕ ДАЁМ ───────────────────────────────────────────────
// 🔒 ЭТО И ЕСТЬ НЕГАТИВНЫЙ КОНТРОЛЬ ГЛАВНОГО УТВЕРЖДЕНИЯ. Тот же вопрос, тот же
// граф, разница одна — кто назвал ключевые слова. Разойдутся числа — утверждение
// доказано; совпадут — доказывать нечего, и прибор обязан покраснеть.
const before2 = logLines()
const legacy = await call("/api/fractera/graph-search", {
  body: JSON.stringify({ legacy: true, question: `кто чинит клавесины для консерватории ${stamp} по-старому` }),
  method: "POST",
})
await letLogSettle()
const nodes2 = queryNodesSince(before2) ?? []
const calls2 = keywordCallsSince(before2)

say(legacy.status === 200, `старый путь отвечает: ${legacy.status}`)
// 🔒 НЕГАТИВНЫЙ КОНТРОЛЬ ГЛАВНОГО УТВЕРЖДЕНИЯ: слов мы не давали — значит слова
// в журнале ЧУЖИЕ, сделанные моделью. Совпади они с нашими, доказывать было бы
// нечего, и прибор обязан покраснеть.
say(
  nodes2.length > 0 && nodes2.some((n) => !sent.includes(n.toLowerCase())),
  `СТАРЫЙ путь: служба искала СВОИМИ словами (их сделала модель) — ${nodes2.join(", ") || "строки нет"}`,
)
console.log(`  сохранений кэша слов на старом пути: ${calls2}`)
say(
  legacy.json.modelTurn === "unknown",
  `старый путь честно говорит «не знаю» о ходе модели: ${legacy.json.modelTurn}`,
)
console.log(`  цена старого пути: ответ графа ${legacy.json.askMs} мс против наших ${ours.json.askMs} мс`)

// ── ПУСТОЙ ВОПРОС ОТВЕРГАЕТСЯ ───────────────────────────────────────────────
const empty = await call("/api/fractera/graph-search", {
  body: JSON.stringify({ question: "   " }),
  method: "POST",
})
say(empty.status === 400 && empty.json.error === "empty-question", `пустой вопрос отвергнут: ${empty.status}`)

// ── БЕЗ КЛЮЧА ДВЕРЬ НЕ ПУСКАЕТ ──────────────────────────────────────────────
const noKey = await call("/api/fractera/graph-search", {
  body: JSON.stringify({ question: "что угодно" }),
  method: "POST",
}, false)
say(noKey.status === 401 || noKey.status === 403 || noKey.status === 307, `без секрета машины отказ: ${noKey.status}`)

// ── УБОРКА ПО СВОЕЙ МЕТКЕ ───────────────────────────────────────────────────
// 🛑 ПРИБОР УБИРАЕТ СВОЁ, А НЕ ХРАНИЛИЩЕ. Дверь забывания знает только префикс
// `bench/` и наружу его не принимает — стереть весь граф ею нельзя в принципе.
if (!KEEP) {
  const gone = await call("/api/fractera/graph-search", { method: "DELETE" })
  say(gone.status === 200, `уборка по метке bench/: забыто ${gone.json.deleted?.length ?? 0}`)
}

console.log("")
console.log(bad === 0 ? `${MARK}OK` : `${MARK}ПРОВАЛ: ${bad}`)
process.exit(bad === 0 ? 0 : 1)
