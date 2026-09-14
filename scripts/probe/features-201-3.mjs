// ПРИБОР 201-3 — РЕЕСТР ПРИЗНАКОВ: СТОРОЖ ВИДИТ ПЛОХОЕ, ДВЕРЬ ОТДАЁТ СМЫСЛ БЕЗ МЕСТА.
//
// 🔒 ДВЕ ПЛОСКОСТИ, НАЗВАННЫЕ ЗАРАНЕЕ (ТЗ 201-3):
//   A — живая дверь `GET /v1/features` на сервере: все записи, и каждый живой род корневой таблицы
//       сопоставлен признаку (счёт 14 из 14);
//   B — негатив: испорченные записи роняют сторожа поимённо, `storedIn` роняет, а в ответе двери нет
//       ни одного имени хранилища.
//
// 🛑 ПРИБОР НИЧЕГО НЕ ПИШЕТ И НЕ УДАЛЯЕТ: реестр он читает, испорченные записи строит в памяти
// процесса. Спрашивать у прибора надо не «что он проверяет», а «что он удаляет и чьё это» — здесь
// ответ «ничего».
//
// Запуск на сервере из корня службы:  node scripts/probe/features-201-3.mjs

import { readFileSync } from "node:fs"
import { kindOf, problemsOf, readFeatures } from "../../lib/features.mjs"
import { ROOT } from "../../lib/naming.mjs"

const MARK = "===PROBE_201_3==="
const BASE = process.env.MEMORY_URL ?? "http://127.0.0.1:3700"

function machineEnv(name) {
  try {
    for (const line of readFileSync(process.env.FRACTERA_MACHINE_ENV ?? "/etc/fractera/secrets.env", "utf8").split("\n")) {
      const i = line.indexOf("=")
      if (i > 0 && line.slice(0, i).trim() === name) return line.slice(i + 1).trim().replace(/^["']|["']$/g, "")
    }
  } catch { /* вне сервера файла нет */ }
  return process.env[name] ?? ""
}
const SECRET = machineEnv("DATA_SECRET")

let bad = 0
const say = (ok, what) => {
  if (!ok) bad += 1
  console.log(`${ok ? "✓" : "✗"} ${what}`)
}

async function get(path) {
  const res = await fetch(`${BASE}${path}`, { headers: { "x-data-secret": SECRET } })
  const text = await res.text()
  let body = null
  try { body = JSON.parse(text) } catch { body = text }
  return { status: res.status, body, text }
}

console.log(`${MARK} start ${new Date().toISOString()}`)

// ── B: сторож видит плохое ───────────────────────────────────────────────────
const GOOD = {
  key: "person.color-he-calls-his-favorite",
  title: "Цвет, который человек называет любимым",
  valueType: "text",
  aggregate: "last",
  subject: "self",
  depth: 0,
  tags: ["preference"],
  triggers: ["мой любимый цвет"],
  answers: ["какой у человека любимый цвет"],
  howToFind: "Один любимый цвет, названный самим человеком.",
}
const broken = [
  ["без типа значения", (f) => { delete f.valueType }],
  ["тип вне словаря", (f) => { f.valueType = "строка" }],
  ["накопление вне словаря", (f) => { f.aggregate = "always" }],
  ["место хранения в записи", (f) => { f.storedIn = "person_who_owns_this_project.color" }],
  ["ключ не по форме", (f) => { f.key = "Цвет; DROP TABLE x" }],
  ["глубина второго порядка", (f) => { f.depth = 2 }],
  ["пустые триггеры", (f) => { f.triggers = [] }],
  ["метка вне словаря", (f) => { f.tags = ["цвета"] }],
  ["субъект вне словаря", (f) => { f.subject = "misha" }],
]
say(problemsOf([GOOD]).length === 0, `эталонная запись сторожем принята (нарушений ${problemsOf([GOOD]).length})`)
for (const [what, spoil] of broken) {
  const f = structuredClone(GOOD)
  spoil(f)
  const p = problemsOf([f])
  say(p.length > 0, `сторож видит «${what}»: ${p[0] ?? "НЕ УВИДЕЛ"}`)
}
const twin = problemsOf([GOOD, structuredClone(GOOD)])
say(twin.length > 0, `сторож видит повтор ключа: ${twin[0] ?? "НЕ УВИДЕЛ"}`)

// Два разных ключа, дающих один род, — одно место хранения на два смысла.
const collide = problemsOf([
  { ...GOOD, key: "person.color-he-calls-his-favorite" },
  { ...GOOD, key: "taste.color-he-calls-his-favorite" },
])
say(collide.length > 0, `сторож видит столкновение родов: ${collide[0] ?? "НЕ УВИДЕЛ"}`)

// ── A: живой реестр и живая дверь ────────────────────────────────────────────
const features = readFeatures()
say(problemsOf(features).length === 0, `живой реестр валиден: записей ${features.length}, нарушений ${problemsOf(features).length}`)

if (!SECRET) {
  console.log(`${MARK} секрета машины нет — живая дверь не проверялась (это не сервер)`)
  process.exit(bad ? 1 : 0)
}

const list = await get("/v1/features")
say(list.status === 200 && list.body?.count === features.length, `GET /v1/features → ${list.status}, записей ${list.body?.count} из ${features.length}`)
say(!list.text.includes(ROOT), `в ответе двери нет имени хранилища «${ROOT}» (счёт совпадений: ${(list.text.match(new RegExp(ROOT, "g")) ?? []).length})`)
say(!list.text.includes("storedIn"), "в ответе двери нет поля storedIn")

const one = await get(`/v1/features/${encodeURIComponent("money.spent-on-a-purchase")}`)
say(one.status === 200 && one.body?.feature?.aggregate === "sum-able", `GET /v1/features/money.spent-on-a-purchase → ${one.status}, накопление ${one.body?.feature?.aggregate}`)
const none = await get("/v1/features/nope.nope")
say(none.status === 404 && none.body?.error === "unknown-feature", `НЕГАТИВ: несуществующий ключ → ${none.status} ${none.body?.error}`)

// Живые роды корневой таблицы обязаны быть покрыты признаками: 14 из 14.
const root = await get(`/v1/tables/${ROOT}`)
const kinds = (root.body?.kinds ?? []).map((k) => k.name)
const covered = new Set(features.map((f) => kindOf(f.key)))
const missing = kinds.filter((k) => !covered.has(k))
say(kinds.length > 0 && missing.length === 0, `живых родов ${kinds.length}, покрыто признаками ${kinds.length - missing.length}${missing.length ? ` · НЕ ПОКРЫТО: ${missing.join(", ")}` : ""}`)
const invented = ["color_he_hates_most", "car_he_drives"].filter((k) => covered.has(k))
say(invented.length === 0, `НЕГАТИВ: выдуманные роды в покрытии не числятся (найдено ${invented.length})`)

console.log(`${MARK} ${bad ? `ПРОВАЛОВ: ${bad}` : "всё сошлось"} ${new Date().toISOString()}`)
process.exit(bad ? 1 : 0)
