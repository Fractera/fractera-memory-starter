#!/usr/bin/env node
//
// СТОРОЖ РЕЕСТРА ПРИЗНАКОВ. Стоит в `npm run build` ПЕРЕД `next build`.
//
// 🔒 ИМЕННО В СКРИПТЕ СБОРКИ, А НЕ В `prebuild`: прямой `next build` обошёл бы `prebuild` молча, а
// строку в `build` обойти нельзя, не переписав её.
//
// Что он стережёт:
//   ① каждая запись валидна по закрытым словарям (`lib/features.mjs`, `problemsOf`);
//   ② указатель `AGI-CONFIG/index.json` СВЕЖ — порождён из того же файла, что лежит рядом;
//   ③ ни одна запись не несёт `storedIn` — наружу едет смысл, а не место хранения.
//
// Починить указатель: `node scripts/build-features-index.mjs`.

import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { INDEX_FILE, indexOf, problemsOf, readFeatures, skillProblemsOf } from "../lib/features.mjs"

const MARK = "===CHECK_FEATURES==="
const fix = process.argv[2] === "--fix"

let features
try {
  features = readFeatures()
} catch (e) {
  console.error(`${MARK} реестр не прочитан: ${e.message}`)
  process.exit(1)
}

const problems = problemsOf(features)

// ④ (205-1) навык, названный в записи, существует: иначе метка «навык есть» зелёная на пустоте.
const skillsDir = join(process.cwd(), ".claude", "skills")
const skillNames = existsSync(skillsDir)
  ? readdirSync(skillsDir).filter((d) => existsSync(join(skillsDir, d, "SKILL.md")))
  : []
problems.push(...skillProblemsOf(features, skillNames))

const want = JSON.stringify(indexOf(features), null, 2) + "\n"
let have = null
try {
  have = readFileSync(INDEX_FILE, "utf8")
} catch {
  have = null
}
if (have !== want) {
  if (fix) {
    writeFileSync(INDEX_FILE, want)
    console.log(`${MARK} указатель порождён заново: AGI-CONFIG/index.json`)
  } else {
    problems.push(
      have === null
        ? "указателя AGI-CONFIG/index.json нет — порождается `node scripts/check-features.mjs --fix`"
        : "указатель AGI-CONFIG/index.json отстал от реестра — `node scripts/check-features.mjs --fix`",
    )
  }
}

if (problems.length) {
  console.error(`${MARK} НАРУШЕНИЙ: ${problems.length}`)
  for (const p of problems) console.error(`  ✗ ${p}`)
  process.exit(1)
}

console.log(`${MARK} записей ${features.length} · словари закрыты · указатель свеж`)
