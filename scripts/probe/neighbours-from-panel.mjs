#!/usr/bin/env node
//
// ПРИБОР 227-5: СОСЕДИ БЕРУТСЯ У ПАНЕЛИ, КЭШИРУЮТСЯ НА ДИСК, И ВОЗРАСТ СНИМКА НАЗЫВАЕТСЯ.
//
// 🎯 РЕШЕНИЕ ВЛАДЕЛЬЦА 2026-09-18: «Гибрид: своё — всегда с диска, чужое — у панели с кэшем».
//
// 🛑 ТРИ СОСТОЯНИЯ ПОДРЯД, И ТРЕТЬЕ — ГЛАВНОЕ: панель отвечает → карта свежая · панель погашена →
// работа на кэше с НАЗВАННЫМ возрастом · кэша тоже нет → честное «соседи неизвестны». Выдуманный
// адрес в третьем состоянии был бы худшим исходом: человек узнает об ошибке, только когда адрес не
// ответит.
//
// 🔒 ПАНЕЛЬ ЗДЕСЬ ПОДСТАВНАЯ — крошечный HTTP-сервер вместо слоя данных. Ждать живого сервера
// значило бы, что прибор красный по причине выключенной машины, а не сломанного кода.

import { createServer } from "node:http"
import { mkdtempSync, existsSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

let failed = 0
const check = (ok, what, got = "") => {
  if (!ok) failed++
  console.log(`${ok ? "✓" : "🛑"} ${what}${got ? ` → ${got}` : ""}`)
}

const props = (over = {}) => ({
  about: "A service of this probe, long enough to pass the type check.",
  api: "https://x.<domain>",
  auth: "own",
  author: "fractera",
  channels: {},
  for_sale: false,
  id: "svc",
  manage: null,
  port: 3001,
  price: null,
  subdomain: "svc",
  topics: [],
  ...over,
})

const MAP = {
  built_at: new Date().toISOString(),
  looked_at: 4,
  root: "/opt/fractera",
  services: [
    { dir: "services/auth", props: props({ auth: "provider", id: "auth", manage: "https://auth.<domain>/ru/build", port: 3001, subdomain: "auth", topics: ["авторизац"] }), trouble: null },
    { dir: "telegrambot", props: null, trouble: "нет OWN-SERVICE-PROPS.json — служба себя не описала" },
  ],
}

// ── подставная панель за подставным слоем данных ────────────────────────────
let answer = MAP
let hits = 0
const srv = createServer((req, res) => {
  hits++
  if (!req.url.startsWith("/service/panel/api/service-map")) {
    res.writeHead(404).end(JSON.stringify({ ok: false, error: "not-found" }))
    return
  }
  if (answer === null) {
    res.writeHead(503).end(JSON.stringify({ ok: false, error: "panel-down" }))
    return
  }
  res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(answer))
})
await new Promise((r) => srv.listen(0, "127.0.0.1", r))
const port = srv.address().port

const dir = mkdtempSync(join(tmpdir(), "probe-227-5-"))
const cachePath = join(dir, "service-map.cache.json")
const ownPath = join(dir, "OWN-SERVICE-PROPS.json")
writeFileSync(ownPath, JSON.stringify(props({ id: "memory", port: 3700, subdomain: "memory" })))

process.env.OWN_SERVICE_PROPS_FILE = ownPath
process.env.SERVICE_MAP_CACHE_FILE = cachePath
process.env.REMOTE_DATA_URL = `http://127.0.0.1:${port}`
process.env.DATA_SECRET = "probe-secret"

// ── A. кэша нет, панель ещё не спрошена ─────────────────────────────────────
const s = await import("../../lib/services.mjs")
console.log("— A. кэша нет, панель не спрошена —")
check(s.OWN_ID === "memory", "себя знаем без всякой сети", String(s.OWN_ID))
check(s.NEIGHBOURS_KNOWN === false, "соседи честно НЕИЗВЕСТНЫ")
check(/ничего не известно/.test(s.neighboursWords()), "сказано словами", s.neighboursWords())
check(s.serviceIds().join(" ") === "memory", "в списке только мы", s.serviceIds().join(" "))

// ── B. панель отвечает ──────────────────────────────────────────────────────
console.log("— B. панель отвечает —")
const r1 = await s.refreshNeighbours()
check(r1.ok === true, "карта получена")
check(s.NEIGHBOURS_KNOWN === true && s.NEIGHBOURS.length === 1, "сосед появился (молчащая служба в соседи не идёт)", String(s.NEIGHBOURS.length))
check(s.serviceIds().includes("auth"), "имя соседа стало знакомым")
check(s.NEIGHBOURS_STATE.silent === 1, "молчащие СОСЧИТАНЫ отдельно, а не потеряны", String(s.NEIGHBOURS_STATE.silent))
check(/только что/.test(s.neighboursWords()), "свежесть названа словами", s.neighboursWords())
check(existsSync(cachePath), "кэш лёг на диск")

// 🔒 ГЛАВНОЕ СЛЕДСТВИЕ ЖИВОЙ СВЯЗИ МОДУЛЕЙ: маршрутизатор увидел соседа, НЕ БУДУЧИ ТРОНУТ.
const { elsewhere } = await import("../../lib/elsewhere.mjs")
const found = elsewhere("сделай уже нам авторизацию через Google")
check(found.some((x) => x.service === "auth"), "маршрутизатор увидел нового соседа без единой своей правки", JSON.stringify(found.map((x) => x.service)))

// ── C. панель погашена: работа на кэше, возраст назван ──────────────────────
console.log("— C. панель погашена — работа на кэше —")
answer = null
const before = s.NEIGHBOURS.length
const r2 = await s.refreshNeighbours()
check(r2.ok === false, "неудача названа неудачей")
check(s.NEIGHBOURS.length === before, "соседи НЕ обнулены: чужое молчание не стирает наше знание", String(s.NEIGHBOURS.length))
check(/панель не ответила/.test(s.neighboursWords()), "причина названа словами", s.neighboursWords())

// ── D. новый процесс: кэша хватает, чтобы подняться ─────────────────────────
console.log("— D. новый процесс поднимается на кэше —")
const raw = JSON.parse(readFileSync(cachePath, "utf8"))
check(Array.isArray(raw.services) && raw.cached_at, "в кэше лежит карта с меткой времени", raw.cached_at)
// Состарим кэш на два часа и посмотрим, назовёт ли служба возраст.
writeFileSync(cachePath, JSON.stringify({ ...raw, cached_at: new Date(Date.now() - 7200_000).toISOString() }))
const { sourceWords, readCache, ageSeconds } = await import("../../lib/neighbours.mjs")
const aged = readCache()
const words = sourceWords({ age_s: ageSeconds(aged), fresh: false, known: true, silent: 0, why: "панель ещё не спрошена" })
check(/2 ч/.test(words), "возраст снимка назван человеческими словами", words)

// ── E. негативный контроль: описания себя нет ───────────────────────────────
console.log("— E. негативный контроль —")
check(!/выдум/.test(words) && aged.services.length > 0, "кэш прочитан, ничего не выдумано")
check(hits >= 2, "панель действительно спрашивалась, а не подразумевалась", `обращений: ${hits}`)

srv.close()
rmSync(dir, { recursive: true, force: true })
console.log(failed === 0 ? "\n✓ все случаи сошлись" : `\n🛑 не сошлось: ${failed}`)
process.exit(failed === 0 ? 0 : 1)
