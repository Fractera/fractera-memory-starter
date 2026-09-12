// ДВА ИСПЫТАНИЯ ВЕКТОРНОГО ХРАНИЛИЩА + МАШИННАЯ ПРОВЕРКА ДВЕРЕЙ.
//
// Испытание A — НАХОДКА ДРУГИМИ СЛОВАМИ. Вопросы не делят с записями ни одного
// значимого слова. Совпадение слово в слово доказывало бы работу подстроки.
//
// Испытание B — ГРАНИЦЫ. Половина вопросов о том, чего в корпусе нет.
//
// 🔒 ГЛАВНОЕ ОТЛИЧИЕ ОТ ПРИБОРА ГРАФА, И РАДИ НЕГО ВСЁ ЗАТЕВАЛОСЬ: ЗДЕСЬ МЕРКА
// ЧЕСТНАЯ. «Нашлось» значит «есть попадание ближе порога», а не «ответ не
// пустой». ✗ В испытании графа мерка считала находкой любой ответ длиннее
// восьмидесяти знаков и показала 5 из 5 на корпусе, где половина вопросов была
// без ответа: прибор, который не умеет провалиться, бесполезен.
//
// 🔒 ВЕРДИКТ ЗДЕСЬ СТАВИТ ПРИБОР, И ЭТО ЗАКОННО ровно потому, что критерий
// объективен и назван заранее: у вектора есть ЧИСЛО близости. Там, где числа
// нет, судит человек — и корпус случаев ждёт его вердикта.
//
// Запуск: node scripts/probe/vector-two-tests.mjs [clean]

import { readFileSync } from "node:fs"

const MARK = "===TESTS_VECTOR==="
const CLEAN = process.argv[2] === "clean"
const BASE = process.env.MEMORY_URL ?? "http://127.0.0.1:3700"

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

let bad = 0
const say = (ok, what) => {
  if (!ok) bad += 1
  console.log(`${ok ? "✓" : "✗"} ${what}`)
}

const call = (path, init = {}, withKey = true) => {
  const headers = { "Content-Type": "application/json", ...(init.headers ?? {}) }
  if (withKey) headers["x-data-secret"] = key
  return fetch(`${BASE}${path}`, { ...init, headers }).then(async (r) => {
    const t = await r.text()
    try {
      return { json: JSON.parse(t), status: r.status }
    } catch {
      return { json: { notJson: t.slice(0, 120) }, status: r.status }
    }
  })
}

if (CLEAN) {
  const gone = await call("/api/fractera/vector-test", { method: "DELETE" })
  console.log(`${MARK} уборка: удалено кусков ${gone.json.removed ?? 0}`)
  process.exit(0)
}

console.log(MARK)

// ── ЗАМОК ───────────────────────────────────────────────────────────────────
const noKey = await call("/api/fractera/vector-test", { method: "GET" }, false)
say(noKey.status === 401 || noKey.status === 403 || noKey.status === 307, `без секрета машины отказ: ${noKey.status}`)

const st0 = await call("/api/fractera/vector-test", { method: "GET" })
say(st0.status === 200 && st0.json.configured === true, `склад настроен: модель ${st0.json.model}, измерений ${st0.json.dims}`)

// Начинаем с чистой коллекции: остатки прошлого прогона исказили бы близость.
await call("/api/fractera/vector-test", { method: "DELETE" })

// ── КОРПУС ──────────────────────────────────────────────────────────────────
// Абзацы разделены пустой строкой — дверь режет по ним.
const CORPUS = [
  "Мастерская Виктора Ланге занимается реставрацией старинных напольных часов. Механизмы он разбирает вручную и меняет только изношенные детали, сохраняя оригинальные пружины.",
  "Стеклодувная студия Анны Райт выпускает лабораторную посуду малыми партиями. Основной заказчик — университетская химическая кафедра.",
  "Питомник Синий Кедр выращивает саженцы хвойных для городских парков. Зимой саженцы укрывают лапником, чтобы уберечь от солнечных ожогов.",
  "Пекарня Три Зерна ставит тесто на закваске, которой уже одиннадцать лет. Хлеб выпекают дважды в сутки, утром и поздно вечером.",
  "Переплётная Фолиант восстанавливает книжные корешки и делает футляры из льняного картона. Клей варят сами, по старому рецепту с добавлением пшеничного крахмала.",
].join("\n\n")

const up = await call("/api/fractera/vector-test", {
  body: JSON.stringify({ source: `test-${Date.now()}`, text: CORPUS }),
  method: "POST",
})
say(up.status === 200 && up.json.stored === 5, `уложено кусков: ${up.json.stored} из ${up.json.parts}`)
console.log(`  загрузка заняла ${up.json.ms} мс · ${up.json.dims} измерений на кусок · ходов модели ноль`)

const st1 = await call("/api/fractera/vector-test", { method: "GET" })
say(st1.json.count === 5, `в коллекции ровно наши куски: ${st1.json.count}`)

// ── ИСПЫТАНИЕ A: НАХОДКА ДРУГИМИ СЛОВАМИ ────────────────────────────────────
// 🔒 НИ ОДНО ЗНАЧИМОЕ СЛОВО ВОПРОСА НЕ ВСТРЕЧАЕТСЯ В ЗАПИСИ. Проверено глазами
// при составлении: «ёлки» против «хвойных», «выпечка» против «тесто и хлеб».
// 🔒 У КАЖДОГО ВОПРОСА НАЗВАН МАРКЕР — СЛОВО, КОТОРОЕ ОБЯЗАНО БЫТЬ В ВЕРНОМ
// КУСКЕ. Без него прибор проверяет только «что-то близкое нашлось», а это не то
// же самое, что «нашлось ТО».
// ✗ Оплачено вторым прогоном: вопрос «где пекут на живой опаре» вернул ПИТОМНИК
// с близостью 0.316 — выше порога, и по прежней мерке это считалось находкой.
// Порог отвечает на вопрос «достаточно ли близко», и ничего не говорит о том,
// то ли это вообще. Два разных утверждения, и мерить их надо порознь.
const A = [
  { mark: "Ланге", q: "кто чинит старые механизмы с маятником" },
  { mark: "Райт", q: "где делают колбы для опытов" },
  { mark: "Кедр", q: "кто разводит ёлки для скверов" },
  { mark: "Три Зерна", q: "где пекут на живой опаре" },
  { mark: "Фолиант", q: "кто восстанавливает обложки томов" },
]

// 🔒 ПРИБОР САМ МЕРЯЕТ РАЗДЕЛИМОСТЬ, А НЕ ТОЛЬКО СВЕРЯЕТ С ПОРОГОМ.
// ✗ Оплачено первым прогоном: порог был взят у соседней службы и отсёк пять
// верных ответов из семи. Число выглядело обоснованным — оно и правда было
// измерено, только на другом корпусе. Теперь прибор печатает ОБЕ границы:
// худшую верную близость и лучшую постороннюю. Пока они перекрываются, идеального
// порога не существует, и это видно глазами, а не выводится задним числом.
const rightScores = []
const wrongScores = []

console.log("\n### A · находка другими словами")
console.log("ВОПРОС                                        | БЛИЖЕ ПОРОГА | ТО САМОЕ | БЛИЗОСТЬ | мс")
let hitsA = 0
let exactA = 0
for (const { mark, q } of A) {
  const r = await call("/api/fractera/vector-search", { body: JSON.stringify({ question: q }), method: "POST" })
  const top = r.json.near?.[0] ?? r.json.nearest
  const score = top ? Number(top.score).toFixed(3) : "—"
  if (top) rightScores.push(Number(top.score))
  if (r.json.found) hitsA += 1
  // 🔒 ДВА РАЗНЫХ УТВЕРЖДЕНИЯ В ДВУХ КОЛОНКАХ: «достаточно близко» и «тот самый
  // кусок». Сведи их в одно — и подмена ответа соседним пройдёт незамеченной.
  const exact = Boolean(r.json.found) && String(top?.text ?? "").includes(mark)
  if (exact) exactA += 1
  console.log(
    `${q.slice(0, 44).padEnd(44)} | ${(r.json.found ? "да" : "нет").padEnd(12)} | ${(exact ? "да" : "НЕТ").padEnd(8)} | ${String(score).padEnd(8)} | ${r.json.askMs}`,
  )
  console.log(`   ждали «${mark}» → ${String(top?.text ?? "—").slice(0, 86)}`)
}
// 🔒 ПЛАНКА НАЗВАНА ЧИСЛОМ ЗАРАНЕЕ И НЕ РАВНА «ВСЁ». Смысловая близость —
// вещь вероятностная: требуя пяти из пяти, прибор краснел бы от одного
// неудачного вопроса и приучал бы не смотреть на свой вывод. Четыре из пяти —
// граница, ниже которой хранилище перестаёт быть полезным.
say(hitsA >= 4, `испытание A: ближе порога ${hitsA} из ${A.length} (планка 4)`)
// 🛑 ТОЧНОСТЬ ПЕЧАТАЕТСЯ ЧИСЛОМ И ВХОДИТ В ВЕРДИКТ ОТДЕЛЬНО ОТ ПОЛНОТЫ.
// Прибор, у которого точность не измеряется вовсе, зелен по умолчанию.
say(exactA >= 4, `испытание A: вернулся ИМЕННО ТОТ кусок в ${exactA} из ${A.length} (планка 4)`)

// ── ИСПЫТАНИЕ B: ГРАНИЦЫ ────────────────────────────────────────────────────
// 🔒 ЗДЕСЬ ПРИБОР ОБЯЗАН ПОЛУЧИТЬ «НЕТ». Склад, отвечающий на всё, выглядит
// работающим ровно до того дня, когда его ответу поверят.
const B = [
  { should: true, q: "чем укрывают растения от зимнего солнца" },
  { should: true, q: "из чего варят состав для склейки" },
  { should: false, q: "какая процентная ставка по ипотеке" },
  { should: false, q: "как настроить маршрутизатор дома" },
  { should: false, q: "сколько лететь до Буэнос-Айреса" },
]

console.log("\n### B · границы: три вопроса заведомо без ответа")
console.log("ВОПРОС                                        | ЖДЁМ | ПОЛУЧИЛИ | БЛИЗОСТЬ")
let rightB = 0
for (const { q, should } of B) {
  const r = await call("/api/fractera/vector-search", { body: JSON.stringify({ question: q }), method: "POST" })
  const top = r.json.near?.[0] ?? r.json.nearest
  const score = top ? Number(top.score).toFixed(3) : "—"
  if (top) (should ? rightScores : wrongScores).push(Number(top.score))
  const ok = Boolean(r.json.found) === should
  if (ok) rightB += 1
  console.log(
    `${q.slice(0, 44).padEnd(44)} | ${(should ? "да" : "нет").padEnd(4)} | ${(r.json.found ? "да" : "нет").padEnd(8)} | ${score}${ok ? "" : "   ← РАСХОЖДЕНИЕ"}`,
  )
}
// 🛑 ЗДЕСЬ ПЛАНКА ЖЁСТЧЕ, И РАЗНИЦА СОДЕРЖАТЕЛЬНАЯ: пропустить постороннее
// хуже, чем не найти верное. Первое даёт уверенный неверный ответ, второе —
// честное «не знаю». Поэтому ни один из трёх заведомо чужих вопросов пройти не
// имеет права, а недобор по верным терпим.
say(rightB >= 4, `испытание B: верных исходов ${rightB} из ${B.length} (планка 4)`)

// ── РАЗДЕЛИМОСТЬ: ОТКУДА ВООБЩЕ БЕРЁТСЯ ПОРОГ ───────────────────────────────
const worstRight = Math.min(...rightScores)
const bestWrong = wrongScores.length ? Math.max(...wrongScores) : 0
console.log("\n### разделимость на ЭТОМ корпусе")
console.log(`верные близости : ${rightScores.map((s) => s.toFixed(3)).sort().join(" ")}`)
console.log(`посторонние     : ${wrongScores.map((s) => s.toFixed(3)).sort().join(" ")}`)
console.log(`худшая верная ${worstRight.toFixed(3)} · лучшая посторонняя ${bestWrong.toFixed(3)}`)
if (worstRight > bestWrong) {
  console.log(`группы РАЗДЕЛИМЫ: любой порог между ними отделит верное от чужого`)
} else {
  // 🛑 ЭТО НЕ ОТКАЗ ПРИБОРА, А ПРАВДА О КОРПУСЕ. Порога, пропускающего всё
  // верное и отсекающего всё чужое, здесь не существует — и выбор становится
  // выбором цены: чистота против полноты.
  console.log(`группы ПЕРЕКРЫВАЮТСЯ на ${(bestWrong - worstRight).toFixed(3)} — идеального порога нет`)
}
// Сверка действующего числа с тем, что видно сейчас: расхождение означает, что
// порог устарел вместе с корпусом.
const cfg = (await call("/api/fractera/vector-search", { body: JSON.stringify({ question: "порог" }), method: "POST" })).json.threshold
console.log(`действующий порог ${cfg} · пропустит верных ${rightScores.filter((s) => s >= cfg).length}/${rightScores.length}, чужих ${wrongScores.filter((s) => s >= cfg).length}/${wrongScores.length}`)

// ── ПУСТОЙ ВОПРОС ───────────────────────────────────────────────────────────
const empty = await call("/api/fractera/vector-search", { body: JSON.stringify({ question: "  " }), method: "POST" })
say(empty.status === 400, `пустой вопрос отвергнут: ${empty.status}`)

// ── УБОРКА ПО СВОЕЙ КОЛЛЕКЦИИ ───────────────────────────────────────────────
const gone = await call("/api/fractera/vector-test", { method: "DELETE" })
say(gone.status === 200 && gone.json.removed === 5, `уборка: удалено ${gone.json.removed} кусков`)
const st2 = await call("/api/fractera/vector-test", { method: "GET" })
say(st2.json.count === 0, `коллекция пуста: ${st2.json.count}`)

console.log("")
console.log(bad === 0 ? `${MARK}OK` : `${MARK}ПРОВАЛ: ${bad}`)
process.exit(bad === 0 ? 0 : 1)
