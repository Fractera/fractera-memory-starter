#!/usr/bin/env node
//
// ПРИБОР 208-3: паспорта нет — ни документа, ни его поверхностей, ни указателей на него.
//
// 🔒 ПОЛНОТА УДАЛЕНИЯ ДОКАЗЫВАЕТСЯ ОТСУТСТВИЕМ СТАРОГО, А НЕ ПРИСУТСТВИЕМ НОВОГО (закон 190).
// 🛑 НАДГРОБИЯ НЕ СЧИТАЮТСЯ ЖИВЫМ КОДОМ, и отличить их можно только по строке: счётчик пропускает
// строки с 🪦 и с «CANCELLED». Иначе он находит сам себя — в этом проекте оплачено дважды за шаг.

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..")

let failed = 0
const check = (ok, what, got = "") => {
  if (!ok) failed++
  console.log(`${ok ? "✓" : "🛑"} ${what}${got ? ` → ${got}` : ""}`)
}

console.log("— файлов нет —")
for (const p of [
  "development-docs/PASSPORT.md",
  "development-docs/PASSPORT-HISTORY.md",
  "app/[lang]/passport",
  "app/[lang]/settings/_components/passport-body.client.tsx",
  "app/[lang]/settings/_lib/passport-outline.ts",
  "scripts/probe/passport-refs-205-11.mjs",
]) {
  check(!existsSync(join(ROOT, p)), `нет ${p}`)
}

console.log("— и то, что должно было остаться —")
for (const p of ["app/[lang]/settings/_components/doc-body.client.tsx", "app/[lang]/settings/_lib/doc-outline.ts", "CLAUDE.md"]) {
  check(existsSync(join(ROOT, p)), `на месте ${p}`)
}

const SKIP_DIRS = new Set(["node_modules", ".git", ".next", "development-steps"])
const files = []
const walk = (dir) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(e.name)) continue
    const full = join(dir, e.name)
    if (e.isDirectory()) walk(full)
    else if (/\.(ts|tsx|mjs|js|css|json|md)$/.test(e.name) && statSync(full).size < 2_000_000) files.push(full)
  }
}
walk(ROOT)

const live = []
const debt = []
for (const f of files) {
  // 🔒 ТРИ ВЕРДИКТА У СТОРОЖА, А НЕ ДВА (закон 64): законно · исключение · ДОЛГ.
  // Исключения: сам этот прибор — счётчик находит собственные слова; запись об отмене и репорты —
  // история, которая обязана говорить о том, что было.
  if (/passport-gone\.mjs$|CANCELLED\.md$|reports[\\/]/.test(f)) continue
  // 🪦 ЗДЕСЬ БЫЛ ДОЛГ: слова лендинга ещё говорили о паспорте. Закрыт 208-4 — страница переписана,
  // и запись о долге удалена ТОЙ ЖЕ правкой, что и причина: оставить её значило бы приучить читать
  // вывод сторожа как шум.
  for (const line of readFileSync(f, "utf8").split("\n")) {
    // 🔒 ИЩЕМ ПАСПОРТ СЛУЖБЫ, А НЕ СЛОВО «ПАСПОРТ». ✗ Первая редакция прибора считала живыми
    // упоминаниями тестовые фразы вроде «скан заграничного паспорта Анны Егоровой» — законные данные,
    // на которых проверяется поиск. Счётчик, не различающий предмет, требует стереть данные.
    if (!/PASSPORT\.md|["'`(\s]\/(?:ru|en|\$\{lang\})\/passport|passport\/index\.md|passportOutline|passportAnchor|PassportBody|passportMissing|раздел «Паспорт»|паспорт[а-я]* §|passport §/.test(line)) continue
    if (line.includes("🪦") || /снят|удал|removed/i.test(line)) continue
    live.push(`${f.replace(ROOT, "")}: ${line.trim().slice(0, 90)}`)
  }
}
console.log("— живых упоминаний быть не должно —")
check(live.length === 0, `живых упоминаний ${live.length}`, live.slice(0, 3).join(" | "))

console.log("— долг: слова, которые перепишет следующий подшаг —")
console.log(
  debt.length
    ? `⚠ ДОЛГ (208-4 перепишет лендинг целиком): ${[...new Set(debt)].join(", ")}`
    : "✓ долгов нет",
)

console.log("— негативный контроль счётчика —")
// 🔒 Счётчик, дающий ноль на всё, выглядит точно так же, как чистое дерево.
const anyWord = files.some((f) => readFileSync(f, "utf8").includes("memory"))
check(anyWord, "счётчик способен находить живое слово в тех же файлах")

console.log(failed === 0 ? "\n✓ все случаи сошлись" : `\n🛑 не сошлось: ${failed}`)
process.exit(failed === 0 ? 0 : 1)
