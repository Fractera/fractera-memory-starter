// ДВА ИСПЫТАНИЯ ОБЪЕКТНОГО ХРАНИЛИЩА НА НАСТОЯЩЕМ КОРПУСЕ (192-2).
//
// Корпус — файлы витрины `fractera-easy-starter/public`: документы целиком,
// PDF и изображения с описаниями словами загрузившего (`object-corpus.json`).
//
// Испытание A — НАХОДКА ДРУГИМИ СЛОВАМИ. Вопрос называет вещь не её словами и
// часто на другом языке. Мерится ТРИ РАЗНЫХ утверждения, и сводить их нельзя
// (закон 189-6): близость нужного объекта выше порога · он первый · он среди
// пяти отданных.
// Испытание B — ГРАНИЦЫ. Вопросы о том, чего в корпусе нет: ближайшее обязано
// лечь ниже порога.
//
// 🔒 ПОРОГ ВЫВОДИТСЯ ИЗ ЗАЗОРА, А НЕ НАЗНАЧАЕТСЯ: прибор печатает худшую
// близость нужного объекта и лучшую постороннюю. Перекрываются — идеального
// порога нет, и это видно глазами.
// 🔒 ГЛУБОКИЙ ВОПРОС ПЕЧАТАЕТСЯ ОТДЕЛЬНО и в вердикт не входит: карточка несёт
// лишь начало документа, и найти абзац из середины — работа вектора по кускам.
//
// 🛑 ПРИБОР УНОСИТ ТОЛЬКО СВОИ ОБЪЕКТЫ, ПО ИХ ID. Медиатека общая с проектом и
// Telegram; счёт чужих объектов до и после — часть вердикта.
//
// Запуск на сервере: CORPUS_DIR=/tmp/obj-corpus node scripts/probe/object-two-tests.mjs [keep] [sabotage]
//   keep     — не уносить корпус (нужен прогону навыка);
//   sabotage — негативный контроль самого прибора: у первого вопроса подменён ожидаемый файл,
//              прибор ОБЯЗАН напечатать ✗.

import { readFileSync } from "node:fs"
import { basename, extname, join } from "node:path"

const MARK = "===TESTS_OBJECT==="
const KEEP = process.argv.includes("keep")
const SABOTAGE = process.argv.includes("sabotage")
const BASE = process.env.MEMORY_URL ?? "http://127.0.0.1:3700"
const DATA = process.env.DATA_URL ?? "http://127.0.0.1:3300"
const DIR = process.env.CORPUS_DIR ?? "/tmp/obj-corpus"

const key = (() => {
  try {
    for (const line of readFileSync(process.env.FRACTERA_MACHINE_ENV || "/etc/fractera/secrets.env", "utf8").split(/\r?\n/)) {
      const i = line.indexOf("=")
      if (i > 0 && line.slice(0, i).trim() === "DATA_SECRET") return line.slice(i + 1).trim().replace(/^["']|["']$/g, "")
    }
  } catch { /* скажем ниже */ }
  return process.env.DATA_SECRET || ""
})()
if (!key) {
  console.log(`${MARK} СЕКРЕТА МАШИНЫ НЕТ — прогон невозможен`)
  process.exit(2)
}

let bad = 0
const say = (ok, what) => {
  if (!ok) bad += 1
  console.log(`${ok ? "✓" : "✗"} ${what}`)
}
const json = async (r) => {
  const t = await r.text()
  try { return JSON.parse(t) } catch { return { notJson: t.slice(0, 120) } }
}
const door = (path, body, method = "POST", withKey = true) =>
  fetch(`${BASE}/api/fractera/${path}`, {
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: { "Content-Type": "application/json", ...(withKey ? { "x-data-secret": key } : {}) },
    method,
  }).then(async (r) => ({ json: await json(r), status: r.status }))

const MIME = { ".jpg": "image/jpeg", ".md": "text/markdown", ".pdf": "application/pdf", ".png": "image/png" }
const corpus = JSON.parse(readFileSync(new URL("./object-corpus.json", import.meta.url), "utf8"))
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : 0 }

console.log(MARK)

// ── ЗАМОК ───────────────────────────────────────────────────────────────────
const noKey = await door("object-test", undefined, "GET", false)
say([401, 403, 307].includes(noKey.status), `без секрета машины отказ: ${noKey.status}`)
const st0 = await door("object-test", undefined, "GET")
say(st0.status === 200 && st0.json.configured === true, `склад карточек настроен: ${st0.json.configured}; объектов памяти до прогона: ${st0.json.objects?.length}`)

const mediaIds = async () => new Set(((await json(await fetch(`${DATA}/media`, { headers: { "X-Data-Secret": key } }))).items ?? []).map((m) => m.id))
const foreignBefore = await mediaIds()
const ownBefore = new Set((st0.json.objects ?? []).map((o) => o.id))
for (const id of ownBefore) foreignBefore.delete(id)

// ── ЗАГРУЗКА ────────────────────────────────────────────────────────────────
const idOf = new Map()
const keepMs = []
for (const o of corpus.objects) {
  const bytes = readFileSync(join(DIR, o.path))
  const name = basename(o.path)
  const form = new FormData()
  form.append("file", new Blob([bytes], { type: MIME[extname(name).toLowerCase()] ?? "application/octet-stream" }), name)
  form.append("about", o.about ?? "")
  const r = await fetch(`${BASE}/api/fractera/object-test`, { body: form, headers: { "x-data-secret": key }, method: "POST" })
  const j = await json(r)
  if (j.ok) {
    idOf.set(name, j.object.id)
    keepMs.push(j.ms)
  } else console.log(`  ✗ не легло: ${name} → ${j.error}`)
}
say(idOf.size === corpus.objects.length, `уложено объектов: ${idOf.size} из ${corpus.objects.length} · загрузка медиана ${median(keepMs)} мс, всего ${keepMs.reduce((a, b) => a + b, 0)} мс`)
const nameOfId = new Map([...idOf].map(([n, id]) => [id, n]))

// ── ИСПЫТАНИЕ A ─────────────────────────────────────────────────────────────
const right = corpus.right.map((x, i) => (SABOTAGE && i === 0 ? { ...x, expect: "404.jpg" } : x))
if (SABOTAGE) console.log("\n!!! SABOTAGE: у первого вопроса ожидается заведомо неверный файл 404.jpg")

let threshold = 0
const rightScores = []
const askMs = []
let top1 = 0
let in5 = 0
let aboveAll = 0
console.log("\n### A · находка другими словами")
console.log("ОЖИДАЕТСЯ                          | НУЖНЫЙ | ПЕРВЫЙ | В ПЯТИ | ПЕРВЫМ ОКАЗАЛСЯ (близость)")
for (const { expect, q } of right) {
  const r = await door("object-search", { probe: true, question: q })
  threshold = r.json.threshold
  askMs.push(r.json.askMs)
  const hits = r.json.hits ?? []
  const mine = hits.find((h) => nameOfId.get(h.id) === expect)
  const s = mine ? mine.score : 0
  rightScores.push(s)
  const first = hits[0] && nameOfId.get(hits[0].id) === expect
  if (first) top1 += 1
  if (mine) in5 += 1
  if (mine && s >= threshold) aboveAll += 1
  console.log(
    `${expect.padEnd(34)} | ${mine ? s.toFixed(3) : " —   "}  | ${first ? "да " : "НЕТ"}    | ${mine ? "да " : "НЕТ"}    | ${hits[0] ? `${nameOfId.get(hits[0].id) ?? hits[0].name} (${hits[0].score.toFixed(3)})` : "—"}`,
  )
}

// ── ГЛУБОКИЙ ВОПРОС ─────────────────────────────────────────────────────────
console.log("\n### Глубокий вопрос (в вердикт не входит)")
for (const { expect, q, note } of corpus.deep) {
  const r = await door("object-search", { probe: true, question: q })
  const hits = r.json.hits ?? []
  const pos = hits.findIndex((h) => nameOfId.get(h.id) === expect)
  console.log(`  ${expect}: ${pos < 0 ? "НЕ среди пяти" : `место ${pos + 1}, близость ${hits[pos].score.toFixed(3)}`} · ${note}`)
}

// ── ИСПЫТАНИЕ B ─────────────────────────────────────────────────────────────
const wrongScores = []
let rejected = 0
console.log("\n### B · границы")
for (const { q } of corpus.foreign) {
  const r = await door("object-search", { probe: true, question: q })
  askMs.push(r.json.askMs)
  const top = r.json.hits?.[0]
  wrongScores.push(top ? top.score : 0)
  if (!r.json.found) rejected += 1
  console.log(`  ${r.json.found ? "✗ НАШЛОСЬ" : "✓ ничего  "} · ближайшее ${top ? `${nameOfId.get(top.id)} ${top.score.toFixed(3)}` : "—"} · «${q}»`)
}

// ── ОТКРЫТИЕ ────────────────────────────────────────────────────────────────
console.log("\n### Открытие")
const md = await door("object-open", { id: idOf.get("open-code-license.md") })
say(md.json.ok && typeof md.json.text === "string" && md.json.text.startsWith("# Open Code"), `текстовый открылся: показано ${md.json.shown} из ${md.json.total}`)
const pdf = await door("object-open", { id: idOf.get("ai-company-brain-en.pdf") })
say(pdf.json.ok && pdf.json.text === null, `двоичный не выдумывает текст: text=${JSON.stringify(pdf.json.text)}`)
const big = await door("object-open", { id: idOf.get("content-engine.md") })
const tail = await door("object-open", { from: big.json.shown, id: idOf.get("content-engine.md") })
say(big.json.shown < big.json.total && tail.json.from === big.json.shown, `длинный режется с названным пределом: ${big.json.shown} из ${big.json.total}, продолжение с ${tail.json.from}`)

// ── ВЕРДИКТ ─────────────────────────────────────────────────────────────────
const minRight = Math.min(...rightScores)
const maxWrong = Math.max(...wrongScores)
console.log("\n### Разделимость")
console.log(`  нужные  : ${rightScores.map((x) => x.toFixed(3)).sort().join(" ")}`)
console.log(`  чужие   : ${wrongScores.map((x) => x.toFixed(3)).sort().join(" ")}`)
console.log(`  худший нужный ${minRight.toFixed(3)} · лучший чужой ${maxWrong.toFixed(3)} · зазор ${(minRight - maxWrong).toFixed(3)}`)
if (minRight > maxWrong) console.log(`  середина зазора: ${((minRight + maxWrong) / 2).toFixed(3)} · действующий порог ${threshold}`)
console.log(`  поиск: медиана ${median(askMs)} мс, худший ${Math.max(...askMs)} мс`)

say(in5 === right.length, `нужный среди пяти: ${in5} из ${right.length}`)
say(aboveAll === right.length, `нужный ближе порога ${threshold}: ${aboveAll} из ${right.length}`)
say(rejected === corpus.foreign.length, `посторонние отсечены: ${rejected} из ${corpus.foreign.length}`)
console.log(`  (первым оказался нужный: ${top1} из ${right.length} — ранжирование, не вердикт)`)
say(minRight > maxWrong, `группы разделимы: ${minRight > maxWrong ? "ДА" : "НЕТ"}`)

// ── УБОРКА ──────────────────────────────────────────────────────────────────
if (!KEEP) {
  const gone = await door("object-test", { ids: [...idOf.values()] }, "DELETE")
  say(gone.json.removed === idOf.size && gone.json.refused.length === 0, `унесено своих: ${gone.json.removed}`)
} else console.log(`\n  keep: корпус оставлен в складе (${idOf.size} объектов)`)
const after = await mediaIds()
say([...foreignBefore].every((id) => after.has(id)), `чужие объекты медиатеки на месте: ${foreignBefore.size}`)

console.log(`\n${bad === 0 ? "✓ OK" : `✗ ПРОВАЛ: ${bad}`}`)
console.log(`${MARK}END`)
