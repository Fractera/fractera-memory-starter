// ПРИБОР 205-11 — ССЫЛКИ «§N» УКАЗЫВАЮТ НА СУЩЕСТВУЮЩИЙ РАЗДЕЛ ПАСПОРТА.
//
// 🔒 ЗАЧЕМ ОН ЕСТЬ. Паспорт переписан шагом 205-11: было 23 раздела, стало 15 (0–14).
// Ссылка «§21.1» из кода после перенумерации указывает не туда, и молча: файл читается
// человеком, а не парсером, и висящая ссылка выглядит как обычный текст.
//
// 🔒 ТРИ ВЕРДИКТА, А НЕ ДВА (закон шага 64 федерального слоя): законно · ИСКЛЮЧЕНИЕ
// (ссылка на ЧУЖОЙ документ — паспорт чата, `BLACKBOX-API`, файл шага) · НАРУШЕНИЕ.
// Двузначный сторож в доме, где живут ссылки на четыре разных документа, либо врёт
// зелёным, либо не включается вовсе.
//
// 🔒 НЕГАТИВНЫЙ КОНТРОЛЬ ВНУТРИ ПРИБОРА: выдуманная ссылка «§99» обязана быть найдена.
// Прибор, не доказавший, что отвергает заведомо неверное, зелен по причине собственной слепоты.
//
// Запуск: node scripts/probe/passport-refs-205-11.mjs

import { readdirSync, readFileSync, statSync } from "node:fs"
import { dirname, join, relative } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..")
const PASSPORT = join(ROOT, "development-docs", "PASSPORT.md")

/** Разделы действующего паспорта — порождаются из него, а не перечисляются здесь. */
function sectionsOfPassport() {
  const out = new Set()
  for (const line of readFileSync(PASSPORT, "utf8").split("\n")) {
    const m = /^##\s+(\d+)\./.exec(line)
    if (m) out.add(m[1])
  }
  return out
}

/**
 * Ссылки на ЧУЖИЕ документы. Каждая — с причиной: без причины исключение
 * неотличимо от недосмотра.
 */
const FOREIGN = [
  { why: "собственные разделы README, а не паспорта", test: (f) => f === "README.md" },
  { why: "собственные разделы BLACKBOX-API", test: (f, t) => f.endsWith("BLACKBOX-API.md") && t === "2" },
  { why: "закон BLACKBOX-API §2, назван в тексте", test: (f, t, line) => t === "2" && /BLACKBOX-API/.test(line) },
  { why: "паспорт чата, §3п", test: (f, t, line) => /паспорта чата|паспорт чата|§3п/.test(line) },
  { why: "файл шага 203-main, не паспорт", test: (f, t, line) => /203-main/.test(line) },
  { why: "разделы переписи 205", test: (f, t, line) => /перепис/i.test(line) },
  { why: "федеральный ARCHITECTURE", test: (f, t, line) => /ARCHITECTURE/.test(line) },
  // 🔒 Надгробие ГОВОРИТ о прежней нумерации, а не ссылается на раздел. Отличается словом
  // «нумерация» в самой строке: пересказ, а не цитата-ссылка.
  { why: "надгробие о прежней нумерации, не ссылка", test: (f, t, line) => /нумераци/i.test(line) },
]

const SKIP_DIRS = new Set([".git", "node_modules", ".next", "logs"])
const SKIP_PATH = [
  "development-docs/PASSPORT-HISTORY.md", // архив: у него СВОЯ нумерация, это сказано в его шапке
  "development-docs/development-steps/", // учёт шагов: пишется на момент шага
  "development-docs/reports/", // итоги: тоже на момент
  "development-docs/instruments/", // приборы прошлых шагов
  // 🛑 ПРИБОР НЕ СЧИТАЕТ САМОГО СЕБЯ. В его тексте стоят и прежний номер «§21.1» как пример
  // висящей ссылки, и «§99» негативного контроля: считая себя, он всегда красный — и это не
  // находка, а слепота. Тот же класс, что «`pgrep -f` находит себя», оплаченный в этом проекте.
  "scripts/probe/passport-refs-205-11.mjs",
]
const EXT = [".mjs", ".js", ".ts", ".tsx", ".md", ".json"]

function* files(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue
    const full = join(dir, name)
    if (statSync(full).isDirectory()) {
      yield* files(full)
      continue
    }
    if (!EXT.some((e) => name.endsWith(e))) continue
    const rel = relative(ROOT, full).split("\\").join("/")
    if (SKIP_PATH.some((p) => rel.startsWith(p))) continue
    yield { full, rel }
  }
}

/** Все ссылки «§N» файла: номер раздела верхнего уровня и строка целиком. */
function refsOf(text) {
  const out = []
  const lines = text.split("\n")
  for (let i = 0; i < lines.length; i += 1) {
    for (const m of lines[i].matchAll(/§(\d+)(?:\.(\d+))?/g)) {
      out.push({ line: lines[i], no: i + 1, top: m[1], whole: m[0] })
    }
  }
  return out
}

function check() {
  const sections = sectionsOfPassport()
  const legal = []
  const excepted = []
  const broken = []

  for (const f of files(ROOT)) {
    if (f.rel === "development-docs/PASSPORT.md") {
      // 🔒 Паспорт проверяется тоже: он ссылается сам на себя.
    }
    for (const r of refsOf(readFileSync(f.full, "utf8"))) {
      const foreign = FOREIGN.find((x) => x.test(f.rel, r.top, r.line))
      if (foreign) {
        excepted.push({ ...r, rel: f.rel, why: foreign.why })
        continue
      }
      if (sections.has(r.top)) legal.push({ ...r, rel: f.rel })
      else broken.push({ ...r, rel: f.rel })
    }
  }
  return { broken, excepted, legal, sections }
}

const { broken, excepted, legal, sections } = check()

console.log(`разделов в паспорте: ${[...sections].join(" · ")}`)
console.log(`ссылок законных: ${legal.length}`)
console.log(`исключений (чужой документ): ${excepted.length}`)
for (const e of excepted) console.log(`  · ${e.rel}:${e.no} ${e.whole} — ${e.why}`)
console.log(`висящих ссылок: ${broken.length}`)
for (const b of broken) console.log(`  ✗ ${b.rel}:${b.no} ${b.whole} — такого раздела в паспорте нет`)

// ── НЕГАТИВНЫЙ КОНТРОЛЬ ──────────────────────────────────────────────────────
// Выдуманная ссылка обязана быть найдена, иначе зелёный цвет ничего не значит.
const fake = refsOf("паспорт §99 — раздела с таким номером не существует")
const caught = fake.length === 1 && !sections.has(fake[0].top)
console.log(`негатив «§99» найден: ${caught ? "да" : "НЕТ"}`)

const ok = broken.length === 0 && caught
console.log(ok ? "=== ВСЁ СОШЛОСЬ ===" : "=== ЕСТЬ РАСХОЖДЕНИЯ ===")
process.exit(ok ? 0 : 1)
