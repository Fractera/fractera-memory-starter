// ИСПЫТАНИЕ ВЕКТОРНОГО ХРАНИЛИЩА НА МНОГОЯЗЫЧНОМ КОРПУСЕ.
//
// ✗ ЗАЧЕМ ОНО ЗАВЕДЕНО, И ЭТО ПОПРАВКА ВЛАДЕЛЬЦА 2026-09-13: «слово „измеряет
// на русском корпусе“ — у нас 82 языка, русский корпус это зло». Он прав по
// существу: порог 0.28 был выведен из ОДНОГО языка и записан как свойство
// хранилища. Для продукта, живущего в 82 языках, это основание слишком узкое.
//
// 🔒 ЗДЕСЬ ПРОВЕРЯЕТСЯ ТО, ЧЕГО ПРЕЖНЕЕ ИСПЫТАНИЕ НЕ КАСАЛОСЬ ВОВСЕ:
//   A — СВОЙ ЯЗЫК: вопрос и запись на одном языке, но разными словами.
//   B — ПЕРЕКРЁСТНЫЙ ЯЗЫК: вопрос на одном языке, ответ лежит на другом. Для
//       памяти, обслуживающей 82 языка, это главный случай, а не экзотика:
//       человек спрашивает на своём, а записано было на чужом.
//   C — ГРАНИЦЫ: посторонние вопросы на разных языках.
//
// 🔒 И ГЛАВНОЕ, ЧТО ИЗ ЭТОГО СЛЕДУЕТ ДЛЯ ПОРОГА: он обязан разделять группы НА
// ВСЕХ языках сразу. Порог, верный для одного языка и ложный для другого, хуже
// отсутствующего — он работает ровно до того дня, когда придёт человек с другим
// языком.
//
// Запуск: node scripts/probe/vector-multilingual.mjs [clean]

import { readFileSync } from "node:fs"

const MARK = "===TESTS_MULTILINGUAL==="
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
  const gone = await call("/api/fractera/vector-test", { method: "DELETE" })
  console.log(`${MARK} уборка: удалено кусков ${gone.json.removed ?? 0}`)
  process.exit(0)
}

console.log(MARK)
await call("/api/fractera/vector-test", { method: "DELETE" })

// ── КОРПУС: ШЕСТЬ ЯЗЫКОВ, ШЕСТЬ РАЗНЫХ ПРЕДМЕТОВ ────────────────────────────
//
// 🔒 ПРЕДМЕТЫ НАМЕРЕННО НЕ ПЕРЕСЕКАЮТСЯ: иначе непонятно, нашло ли хранилище
// нужную запись или просто соседнюю по теме. Каждая запись — своя область, свой
// язык, своё узнаваемое имя.
// 🛑 ИМЯ-МАРКЕР ПИШЕТСЯ ЛАТИНИЦЕЙ ВЕЗДЕ, ГДЕ ПОЗВОЛЯЕТ ПИСЬМЕННОСТЬ: маркер
// нужен прибору, чтобы узнать кусок, и он не должен зависеть от того, как
// система сравнивает буквы разных алфавитов.
const CORPUS = [
  { lang: "en", mark: "Halvard", text: "Halvard Sten repairs wooden fishing boats on the northern coast. He replaces planks by hand and refuses to use power tools on hulls older than fifty years." },
  { lang: "ru", mark: "Ковалёв", text: "Мастерская Ковалёва занимается настройкой концертных роялей. Мастер выезжает в залы за сутки до выступления, чтобы инструмент успел привыкнуть к воздуху." },
  { lang: "es", mark: "Oliveira", text: "La herrería de Oliveira forja rejas y barandillas para casas antiguas. Trabajan el hierro en caliente y evitan por completo la soldadura moderna." },
  { lang: "fr", mark: "Berthelot", text: "L'atelier Berthelot restaure des vitraux d'églises. Les verres colorés sont recuits au four puis remontés au plomb, exactement comme au siècle dernier." },
  { lang: "de", mark: "Hufnagel", text: "Die Werkstatt Hufnagel baut Fässer für Weingüter. Das Eichenholz lagert drei Jahre im Freien, bevor daraus ein einziges Fass entsteht." },
  { lang: "tr", mark: "Yıldırım", text: "Yıldırım atölyesi eski halıları onarıyor. Yıpranmış ipler elde eğiriliyor ve dokuma aslına uygun biçimde tamamlanıyor." },
]

const up = await call("/api/fractera/vector-test", {
  body: JSON.stringify({ source: `ml-${Date.now()}`, text: CORPUS.map((d) => d.text).join("\n\n") }),
  method: "POST",
})
say(up.status === 200 && up.json.stored === CORPUS.length, `уложено кусков: ${up.json.stored} из ${CORPUS.length}`)
console.log(`  загрузка ${up.json.ms} мс · ${up.json.dims} измерений`)

// ── ВОПРОСЫ ─────────────────────────────────────────────────────────────────
//
// `asked` — язык вопроса, `holds` — язык записи, в которой лежит ответ.
// Совпали — свой язык; разошлись — перекрёстный случай.
const QUESTIONS = [
  // A · свой язык, другими словами
  { asked: "en", holds: "en", mark: "Halvard", q: "who restores old wooden vessels by hand" },
  { asked: "ru", holds: "ru", mark: "Ковалёв", q: "кто настраивает инструменты перед концертом" },
  { asked: "es", holds: "es", mark: "Oliveira", q: "quién trabaja el metal para edificios históricos" },
  { asked: "fr", holds: "fr", mark: "Berthelot", q: "qui remet en état les fenêtres colorées des lieux de culte" },
  { asked: "de", holds: "de", mark: "Hufnagel", q: "wer stellt Holzbehälter für Winzer her" },
  { asked: "tr", holds: "tr", mark: "Yıldırım", q: "eski dokumaları kim tamir ediyor" },

  // B · ПЕРЕКРЁСТНЫЙ ЯЗЫК — спрашиваем на одном, ответ лежит на другом
  { asked: "ru", holds: "en", mark: "Halvard", q: "кто чинит деревянные рыбацкие лодки" },
  { asked: "en", holds: "ru", mark: "Ковалёв", q: "who tunes grand pianos before a concert" },
  { asked: "en", holds: "de", mark: "Hufnagel", q: "who makes oak barrels for winemakers" },
  { asked: "ru", holds: "fr", mark: "Berthelot", q: "кто реставрирует церковные витражи" },
  { asked: "de", holds: "es", mark: "Oliveira", q: "wer schmiedet Gitter für alte Häuser" },
  { asked: "fr", holds: "tr", mark: "Yıldırım", q: "qui répare les vieux tapis tissés" },
]

// C · посторонние вопросы на разных языках — ответа в корпусе нет ни у одного
const OUTSIDE = [
  { asked: "en", q: "what is the current mortgage interest rate" },
  { asked: "ru", q: "как настроить домашний маршрутизатор" },
  { asked: "es", q: "cuánto dura el vuelo a Buenos Aires" },
  { asked: "de", q: "wie hoch ist die Körpertemperatur eines Pinguins" },
]

const near = []
const far = []

console.log("\n### A и B · находка на своём и на чужом языке")
console.log("ВОПРОС                                        | ЯЗЫКИ | НАШЛОСЬ | ТОТ КУСОК | БЛИЗОСТЬ")
let okSame = 0
let okCross = 0
let nSame = 0
let nCross = 0
for (const { asked, holds, mark, q } of QUESTIONS) {
  const cross = asked !== holds
  if (cross) nCross += 1
  else nSame += 1
  const r = await call("/api/fractera/vector-search", { body: JSON.stringify({ probe: true, question: q }), method: "POST" })
  const top = r.json.near?.[0] ?? r.json.nearest
  const hit = (r.json.near ?? []).some((p) => String(p.text ?? "").includes(mark))
  if (hit) (cross ? (okCross += 1) : (okSame += 1))
  if (top) near.push(Number(top.score))
  console.log(
    `${q.slice(0, 44).padEnd(44)} | ${asked}→${holds} | ${(r.json.found ? "да" : "нет").padEnd(7)} | ${(hit ? "да" : "НЕТ").padEnd(9)} | ${top ? Number(top.score).toFixed(3) : "—"}`,
  )
}
say(okSame === nSame, `свой язык: нужный кусок найден в ${okSame} из ${nSame}`)
// 🔒 ПЕРЕКРЁСТНЫЙ СЛУЧАЙ — ГЛАВНЫЙ ДЛЯ ПРОДУКТА НА 82 ЯЗЫКАХ, И ПЛАНКА У НЕГО
// ТАКАЯ ЖЕ. Смягчить её значило бы сказать: «на чужом языке работает хуже, и
// это нормально» — а именно за этим хранилище и заводили.
say(okCross === nCross, `ПЕРЕКРЁСТНЫЙ язык: нужный кусок найден в ${okCross} из ${nCross}`)

console.log("\n### C · посторонние вопросы на разных языках")
let okOut = 0
for (const { asked, q } of OUTSIDE) {
  const r = await call("/api/fractera/vector-search", { body: JSON.stringify({ probe: true, question: q }), method: "POST" })
  const top = r.json.near?.[0] ?? r.json.nearest
  if (top) far.push(Number(top.score))
  const ok = r.json.found === false
  if (ok) okOut += 1
  console.log(
    `${q.slice(0, 44).padEnd(44)} | ${asked}    | ${(r.json.found ? "ДА ← лишнее" : "нет").padEnd(11)} | ${top ? Number(top.score).toFixed(3) : "—"}`,
  )
}
say(okOut === OUTSIDE.length, `границы: отсечено ${okOut} из ${OUTSIDE.length} посторонних`)

// ── РАЗДЕЛИМОСТЬ НА ВСЕХ ЯЗЫКАХ СРАЗУ ───────────────────────────────────────
const worstNear = Math.min(...near)
const bestFar = Math.max(...far)
const threshold = (await call("/api/fractera/vector-search", { body: JSON.stringify({ probe: true, question: "x" }), method: "POST" })).json.threshold
console.log("\n### разделимость на МНОГОЯЗЫЧНОМ корпусе")
console.log(`верные близости : ${near.map((s) => s.toFixed(3)).sort().join(" ")}`)
console.log(`посторонние     : ${far.map((s) => s.toFixed(3)).sort().join(" ")}`)
console.log(`худшая верная ${worstNear.toFixed(3)} · лучшая посторонняя ${bestFar.toFixed(3)}`)
say(
  worstNear > bestFar,
  worstNear > bestFar
    ? `группы РАЗДЕЛИМЫ на всех языках: зазор ${(worstNear - bestFar).toFixed(3)}`
    : `группы ПЕРЕКРЫВАЮТСЯ на ${(bestFar - worstNear).toFixed(3)} — единого порога для этих языков НЕТ`,
)
say(
  threshold > bestFar && threshold < worstNear,
  `действующий порог ${threshold} лежит в зазоре: ${bestFar.toFixed(3)} < ${threshold} < ${worstNear.toFixed(3)}`,
)

await call("/api/fractera/vector-test", { method: "DELETE" })
console.log("")
console.log(bad === 0 ? `${MARK}OK` : `${MARK}ПРОВАЛ: ${bad}`)
process.exit(bad === 0 ? 0 : 1)
