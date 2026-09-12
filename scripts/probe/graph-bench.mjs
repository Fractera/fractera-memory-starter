// ПРИБОР 189-3 — СТЕНД ГРАФА ЗНАНИЙ, ПРОГНАННЫЙ КЛЮЧОМ, БЕЗ БРАУЗЕРА.
//
// 🎯 ЗАЧЕМ ОН ЕСТЬ. Страница стенда закрыта ролью `architect`, и два подшага
// подряд закрывались косвенной плоскостью — «в собранном дереве есть наши
// слова» вместо настоящего вызова. Решение владельца 2026-09-12: не снимать
// защиту, а научить двери стенда принимать ключ памяти. Этот прибор — первый,
// кто этим правом пользуется.
//
// 🔒 ЧТО ИМЕННО ДОКАЗЫВАЕТСЯ, И ЭТО НЕ «ДВЕРЬ ОТВЕЧАЕТ 200». Доказывается
// цепочка: текст доехал → граф ИЗВЛЁК из него сущности → их стало больше, чем
// было → документ виден по нашему имени. Без предпоследнего звена «загрузилось»
// выглядит успехом, а искать потом нечего.
//
// 🔒 ТРИ НЕГАТИВНЫХ КОНТРОЛЯ, И ОНИ РАЗНЫЕ ПО ПРИРОДЕ:
//   ① без ключа дверь обязана отказать — иначе ключ ничего не охраняет;
//   ② без якоря дверь обязана отказать — запись без якоря не найдётся никогда;
//   ③ рост сущностей обязан быть НУЛЕВЫМ там, где мы ничего не клали (проверка
//      того, что прибор меряет именно наш посев, а не чужую активность).
//
// 🛑 ПРИБОР УБИРАЕТ ЗА СОБОЙ ПО СВОЕЙ МЕТКЕ, А НЕ ПО ХРАНИЛИЩУ. Всё, что он
// кладёт, названо `bench/probe-189-*`; чужого он не касается. ✗ В соседней
// службе прибор, стиравший таблицы целиком, однажды снёс живую память владельца.
//
// Запуск на сервере:
//   node scripts/probe/graph-bench.mjs [keep]
// Ключ берётся из /etc/fractera/memory-api-key, адрес — петля 3700.

import { readFileSync } from "node:fs"

const MARK = "===PROBE_189_3==="
const KEEP = process.argv[2] === "keep"
const BASE = process.env.MEMORY_URL ?? "http://127.0.0.1:3700"
const DOOR = `${BASE}/api/fractera/graph-test`

const key = (() => {
  try {
    return readFileSync(process.env.MEMORY_API_KEY_FILE ?? "/etc/fractera/memory-api-key", "utf8").trim()
  } catch {
    return ""
  }
})()

if (!key) {
  console.log(`${MARK} КЛЮЧА ПАМЯТИ НЕТ НА ДИСКЕ — прогон невозможен`)
  process.exit(2)
}

let bad = 0
const say = (ok, what) => {
  if (!ok) bad += 1
  console.log(`${ok ? "✓" : "✗"} ${what}`)
}

const call = async (init = {}, withKey = true) => {
  const headers = { "Content-Type": "application/json", ...(init.headers ?? {}) }
  if (withKey) headers["x-memory-key"] = key
  const r = await fetch(DOOR, { ...init, headers })
  const text = await r.text()
  let json = {}
  try {
    json = JSON.parse(text)
  } catch {
    // 🔒 НЕ JSON — ЭТО САМО ПО СЕБЕ НАХОДКА: так выглядит перехват привратником,
    // когда имя двери забыли внести в `SELF_GUARDED`. Печатаем начало ответа.
    json = { notJson: text.slice(0, 120) }
  }
  return { json, status: r.status }
}

console.log(MARK)

// ── ① БЕЗ КЛЮЧА ДВЕРЬ НЕ ПУСКАЕТ ────────────────────────────────────────────
const noKey = await call({ method: "GET" }, false)
say(
  noKey.status === 401 || noKey.status === 403 || noKey.status === 307,
  `без ключа дверь отказывает: ${noKey.status}`,
)

// ── СОСТОЯНИЕ ДО ────────────────────────────────────────────────────────────
const before = await call({ method: "GET" })
say(before.status === 200 && before.json.ok === true, `ключом дверь отвечает: ${before.status}`)
say(before.json.ready === true, `движок графа достижим: ready=${before.json.ready}`)
const labelsBefore = Number(before.json.labels ?? -1)
console.log(`  сущностей до посева: ${labelsBefore}`)

// ── ② БЕЗ ЯКОРЯ ДВЕРЬ НЕ ПРИНИМАЕТ ──────────────────────────────────────────
const noAnchor = await call({
  body: JSON.stringify({ anchors: [], text: "Текст без якоря, который не должен доехать." }),
  method: "POST",
})
say(
  noAnchor.status === 400 && noAnchor.json.error === "no-anchor",
  `без якоря дверь отказывает по имени: ${noAnchor.status} ${noAnchor.json.error}`,
)

// ── ПОСЕВ ───────────────────────────────────────────────────────────────────
const stamp = Date.now()
const anchor = `Прибор189 ${stamp}`
const sent = await call({
  body: JSON.stringify({
    anchors: [anchor, "Зеленодольск"],
    source: `probe-189-${stamp}`,
    text:
      `Инженер ${anchor} живёт в городе Зеленодольск и чинит там речные катера. ` +
      `В 2019 году он собрал катер с именем Волна и передал его местному яхт-клубу.`,
  }),
  method: "POST",
})
say(sent.status === 200 && sent.json.ok === true, `посев принят: ${sent.status}, за ${sent.json.ms} мс`)

// ── ЖДЁМ ПО ФАКТУ, А НЕ ПАУЗОЙ ──────────────────────────────────────────────
// 🔒 Граф строит связи в фоне: фиксированная пауза либо врёт раньше времени,
// либо заставляет ждать зря. Предел назван числом — тридцать проходов по 2 с.
let labelsAfter = labelsBefore
let waited = 0
for (let i = 0; i < 30; i += 1) {
  await new Promise((r) => setTimeout(r, 2000))
  waited += 2
  const now = await call({ method: "GET" })
  labelsAfter = Number(now.json.labels ?? -1)
  if (labelsAfter > labelsBefore) break
}
say(
  labelsAfter > labelsBefore,
  `граф ИЗВЛЁК сущности: ${labelsBefore} → ${labelsAfter} за ${waited} с`,
)

const state = await call({ method: "GET" })
const mine = (state.json.documents ?? []).filter((d) => String(d.source ?? "").includes(`probe-189-${stamp}`))
say(mine.length === 1, `документ виден по нашему имени: ${mine.map((d) => `${d.source} · ${d.status}`).join(", ") || "не найден"}`)

// ── ③ ЧУЖОГО НЕ ПРИБАВИЛОСЬ ─────────────────────────────────────────────────
// Второй замер подряд без посева: числа обязаны совпасть. Расхождение означало
// бы, что прибор меряет не свой посев, а чужую активность на машине.
const again = await call({ method: "GET" })
say(
  Number(again.json.labels) === labelsAfter,
  `без посева граф не растёт: ${labelsAfter} = ${again.json.labels}`,
)

// ── ЦЕНА ЗАГРУЗКИ НАЗВАНА ЧИСЛАМИ СЛУЖБЫ (189-3) ────────────────────────────
// 🔒 ИСТОЧНИК — ОТЧЁТ ДВИЖКА, А НЕ НАША ОЦЕНКА: строку «Chunk N of M extracted
// X Ent + Y Rel» печатает он сам. Своё число рядом с чужим измерением стало бы
// вторым числом, которое разойдётся молча.
const work = state.json.work
say(Boolean(work), `служба графа отчиталась о работе: ${work ? "да" : "нет"}`)
if (work) {
  say(
    work.chunks > 0 && work.entities > 0,
    `цена загрузки числами: кусков ${work.chunks}, сущностей ${work.entities}, связей ${work.relations}`,
  )
  // 🔒 ЧЕТВЁРТЫЙ НЕГАТИВНЫЙ КОНТРОЛЬ: отчёт обязан быть О НАШЕМ документе.
  // Отчёт о чужом посеве выглядит точно так же — и мы приписали бы себе чужую
  // работу, не заметив этого.
  say(
    String(work.job ?? "").includes(`probe-189-${stamp}`),
    `отчёт о НАШЕМ документе: ${work.job}`,
  )
}

if (!KEEP) {
  console.log("")
  console.log(`убрать за собой: forgetDocuments("bench/probe-189-${stamp}") — двери забывания ещё нет (189-4)`)
}

console.log("")
console.log(bad === 0 ? `${MARK}OK` : `${MARK}ПРОВАЛ: ${bad}`)
process.exit(bad === 0 ? 0 : 1)
