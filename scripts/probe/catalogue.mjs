#!/usr/bin/env node
//
// ПРИБОР 175-3 — ИМЯ ОБЪЯСНЯЕТ СЕБЯ САМО, ОПИСАНИЕ — НА СЛУЧАЙ СОМНЕНИЯ.
//
// 🔒 ГЛАВНОЕ, ЧТО ЗДЕСЬ ПРОВЕРЯЕТСЯ, — НЕ «ОТВЕЧАЕТ ЛИ ДВЕРЬ», А ГОДЯТСЯ ЛИ
// ИМЕНА. Дверь, отдающая список, но с именами вроде `t1`, `t2`, формально
// исправна и бесполезна: модель пойдёт за описанием на каждый вопрос.

import { readFileSync } from "node:fs"

const BASE = process.env.MEMORY_URL ?? "http://127.0.0.1:3700"
const MACHINE_ENV = process.env.FRACTERA_MACHINE_ENV ?? "/etc/fractera/secrets.env"
const WHO = "probe-175-3"

function machineEnv(name) {
  try {
    for (const line of readFileSync(MACHINE_ENV, "utf8").split("\n")) {
      const i = line.indexOf("=")
      if (i > 0 && line.slice(0, i).trim() === name) {
        return line.slice(i + 1).trim().replace(/^["']|["']$/g, "")
      }
    }
  } catch { /* вне сервера файла нет — законно */ }
  return ""
}

const SECRET = process.env.DATA_SECRET || machineEnv("DATA_SECRET")
const H = { "Content-Type": "application/json", "x-data-secret": SECRET }

let bad = 0
const say = (ok, what, extra = "") => {
  if (!ok) bad += 1
  console.log(`${ok ? "✓" : "✗"} ${what}${extra ? "  — " + extra : ""}`)
}

const get = async (p) => {
  const started = Date.now()
  const r = await fetch(BASE + p, { headers: H })
  return { data: await r.json().catch(() => null), ms: Date.now() - started, status: r.status }
}

console.log("=".repeat(72))
console.log("ПРИБОР 175-3 — каталог: имена и описания")
console.log("=".repeat(72))
console.log("")

// Положим что-нибудь, чтобы в каталоге было не пусто.
await fetch(`${BASE}/v1/remember`, {
  body: JSON.stringify({ text: "я говорю по-русски", who: WHO }),
  headers: H,
  method: "POST",
})

const list = await get("/v1/tables")
say(list.status === 200 && Array.isArray(list.data?.tables), "список имён отдаётся", `${list.ms} мс`)

const root = (list.data?.tables ?? []).find((t) => t.name === "person_who_owns_this_project")
say(Boolean(root), "корень в списке есть", root?.name)

// 🔒 ГЛАВНАЯ ПРОВЕРКА: ИМЯ ЧИТАЕТСЯ КАК ФРАЗА, А НЕ КАК ЯРЛЫК. Меньше трёх слов
// — это ярлык, и модель за описанием пойдёт всегда.
const words = (root?.name ?? "").split(/__|_/).filter(Boolean).length
say(words >= 4, "имя корня — фраза, а не ярлык", `${words} слов: ${root?.reads_as}`)

say(typeof root?.records === "number", "имя идёт вместе с числом записей", `записей ${root?.records}`)

// 🔒 СВЯЗЬ С РОДИТЕЛЕМ ВИДНА ИЗ ИМЕНИ — ради этого стандарт и заведён.
const child = (list.data?.tables ?? []).find((t) => t.parent)
say(
  Boolean(child) && child.name.startsWith(child.parent + "__"),
  "у дочерней таблицы родитель виден ПРЯМО В ИМЕНИ",
  child ? `${child.name} ← ${child.parent}` : "дочерних пока нет",
)

const d = await get("/v1/tables/person_who_owns_this_project")
say(d.status === 200 && Array.isArray(d.data?.kinds), "описание отдаётся", `родов ${d.data?.kinds?.length}`)
say(
  (d.data?.kinds ?? []).every((k) => typeof k.reads_as === "string" && k.reads_as.includes(" ")),
  "каждый род читается фразой",
  (d.data?.kinds ?? [])[0]?.reads_as ?? "—",
)

// ── НЕГАТИВНЫЕ КОНТРОЛИ ──────────────────────────────────────────────────────
const nope = await get("/v1/tables/person_who_owns_this_project__nothing_like_this")
say(nope.status === 404 && nope.data?.error === "unknown-table", "НЕГАТИВНЫЙ: несуществующая таблица — 404 с причиной", `код ${nope.status}`)

const evil = await get("/v1/tables/" + encodeURIComponent("x; DROP TABLE person_who_owns_this_project"))
say(evil.status === 400 && evil.data?.error === "unsafe-name", "НЕГАТИВНЫЙ: имя-инъекция отвергнуто ДО базы", `код ${evil.status}`)

const noKey = await fetch(`${BASE}/v1/tables`)
say(noKey.status === 401, "НЕГАТИВНЫЙ: каталог закрыт без секрета", `код ${noKey.status}`)

// 🔒 МЕРА КАЧЕСТВА ИМЁН ВИДНА В ЖИВОСТИ — числом, а не мнением.
const health = await get("/v1/health")
const q = health.data?.name_quality
say(
  q && typeof q.description_per_list === "number",
  "мера качества имён считается: описаний на один список",
  q ? `${q.description_per_list} (описаний ${q.asked_for_description}, списков ${q.asked_for_list})` : "нет",
)

// ── УБОРКА ПО СВОЕЙ МЕТКЕ ────────────────────────────────────────────────────
const DATA_URL = process.env.REMOTE_DATA_URL || machineEnv("REMOTE_DATA_URL") || "http://localhost:3300"
await fetch(`${DATA_URL}/db/migrate`, {
  body: JSON.stringify({ params: [WHO], sql: "DELETE FROM person_who_owns_this_project WHERE who = ?" }),
  headers: { "Content-Type": "application/json", "X-Data-Secret": SECRET },
  method: "POST",
}).catch(() => {})

console.log("")
console.log("-".repeat(72))
if (bad === 0) {
  console.log("✓ ВСЁ ЗЕЛЁНОЕ: имена объясняют себя, описание есть на случай сомнения")
  process.exit(0)
}
console.log(`🛑 ПРОВАЛОВ: ${bad}`)
process.exit(1)
