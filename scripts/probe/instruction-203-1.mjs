// Прибор 203-1: главная инструкция и навык разработки сверяются с кодом — без модели.
//
// Что проверяет:
//   1. каждое имя инструмента в CLAUDE.md существует в scripts/agent/memory-tools.mjs, и наоборот;
//   2. каждый навык, названный в CLAUDE.md, лежит в .claude/skills/<имя>/SKILL.md;
//   3. каждый инструмент разрешён в .claude/settings.json (иначе `claude -p` его молча не зовёт);
//   4. в CLAUDE.md нет слов строителя (учёт шагов), в навыке нет сайтовых терминов порта 3000;
//   5. каждый адрес учёта, названный в навыке, существует на диске;
//   6. размеры: CLAUDE.md ≤ 6 КБ, навык ≤ 12 КБ.
//
// 🔒 НЕГАТИВНЫЙ КОНТРОЛЬ ВСТРОЕН: тот же разбор прогоняется по тексту с выдуманным инструментом и по
// CLAUDE.md стартера сайта — прибор обязан покраснеть на обоих, иначе его зелёный ничего не значит.
//
// Запуск: node scripts/probe/instruction-203-1.mjs [--fns <путь к CLAUDE.md стартера>]

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..")
const read = (p) => readFileSync(join(ROOT, p), "utf8")

const toolsSrc = read("scripts/agent/memory-tools.mjs")
const codeTools = new Set([...toolsSrc.matchAll(/^\s+name: "([a-z_]+)",/gm)].map((m) => m[1]))
const skillsOnDisk = new Set(
  readdirSync(join(ROOT, ".claude", "skills")).filter((d) => existsSync(join(ROOT, ".claude", "skills", d, "SKILL.md"))),
)
const allowed = new Set(JSON.parse(read(".claude/settings.json")).permissions.allow)

const BUILDER_WORDS = ["current-steps", "completed-steps", "new-step", "new-steps", "pre-steps"]
const SITE_TERMS = ["APP-CONFIG", "DESIGN-CONFIG", "PLATFORM-CONFIG", "PRODUCTS-CONFIG", "widget", "generateStaticParams", "SEO", "motion"]

/** Разбор главной инструкции: имена в обратных кавычках, похожие на инструмент или навык. */
function checkInstruction(text) {
  const problems = []
  const ticked = new Set([...text.matchAll(/`([a-z][a-z_-]+)`/g)].map((m) => m[1]))
  // ✗ Первая редакция брала только имена с подчёркиванием — и не видела инструмент `answer`: прибор краснел
  // на верной инструкции и пропустил бы удалённый инструмент без подчёркивания. Имя из кода — всегда инструмент.
  const namedTools = [...ticked].filter((n) => (n.includes("_") && !n.includes("-")) || codeTools.has(n))
  const namedSkills = [...ticked].filter((n) => /^(use|describe|memory)-/.test(n))
  for (const t of namedTools) if (!codeTools.has(t)) problems.push(`инструмент «${t}» назван, но в коде его нет`)
  for (const t of codeTools) if (!namedTools.includes(t)) problems.push(`инструмент «${t}» есть в коде, но не назван`)
  for (const s of namedSkills) if (!skillsOnDisk.has(s)) problems.push(`навык «${s}» назван, но папки нет`)
  for (const w of BUILDER_WORDS) if (text.includes(w)) problems.push(`слово строителя «${w}»`)
  return { namedSkills, namedTools, problems }
}

function countTerms(text) {
  return SITE_TERMS.map((t) => [t, text.split(t).length - 1]).filter(([, n]) => n > 0)
}

const out = []
let fail = 0
const line = (ok, s) => {
  if (!ok) fail++
  out.push(`${ok ? "OK  " : "FAIL"} ${s}`)
}

// 1–4. главная инструкция
const claude = read("CLAUDE.md")
const main = checkInstruction(claude)
line(main.problems.length === 0, `CLAUDE.md против кода: ${main.namedTools.length} инструментов, ${main.namedSkills.length} навыков; расхождений ${main.problems.length}${main.problems.length ? " — " + main.problems.join("; ") : ""}`)
const notAllowed = [...codeTools].filter((t) => !allowed.has(`mcp__memory__${t}`))
line(notAllowed.length === 0, `settings.json разрешает все инструменты: не разрешены ${notAllowed.length}${notAllowed.length ? " — " + notAllowed.join(", ") : ""}`)

// 4. навык разработки
const skill = read(".claude/skills/memory-development/SKILL.md")
const siteInSkill = countTerms(skill)
line(siteInSkill.length === 0, `memory-development: сайтовых терминов ${siteInSkill.length}${siteInSkill.length ? " — " + JSON.stringify(siteInSkill) : ""}`)

// 5. адреса учёта из навыка существуют
const addresses = [...new Set([...skill.matchAll(/`(development-docs\/[A-Za-z0-9_./-]+?)`/g)].map((m) => m[1].replace(/<[^>]+>.*$/, "")))]
const missing = addresses.filter((a) => !existsSync(join(ROOT, a.replace(/\/$/, ""))))
line(missing.length === 0, `адреса учёта в навыке: ${addresses.length}, отсутствуют ${missing.length}${missing.length ? " — " + missing.join(", ") : ""}`)

// 6. размеры
const kb = (p) => statSync(join(ROOT, p)).size
line(kb("CLAUDE.md") <= 6144, `CLAUDE.md ${kb("CLAUDE.md")} байт (предел 6144)`)
line(kb(".claude/skills/memory-development/SKILL.md") <= 12288, `memory-development ${kb(".claude/skills/memory-development/SKILL.md")} байт (предел 12288)`)

// Негативный контроль A: выдуманный инструмент и строительное слово обязаны дать расхождения
const fake = checkInstruction(claude + "\n| `teleport_memory` | never |\nread `current-steps` first\n")
line(fake.problems.length >= 2, `НЕГАТИВ A (выдуманный инструмент + слово строителя): прибор нашёл ${fake.problems.length} расхождения`)

// Негативный контроль C: инструмент, пропавший из инструкции, обязан быть замечен — в том числе имя без подчёркивания
const withoutAnswer = checkInstruction(claude.split("\n").filter((l) => !l.includes("`answer`")).join("\n"))
line(withoutAnswer.problems.some((p) => p.includes("«answer»")), `НЕГАТИВ C (из инструкции убрана строка answer): прибор назвал ${withoutAnswer.problems.length} расхождение`)

// Негативный контроль B: сайтовые термины обязаны найтись в инструкции стартера сайта
const fnsArg = process.argv.indexOf("--fns")
const fnsPath = fnsArg > 0 ? process.argv[fnsArg + 1] : join(ROOT, "..", "fractera-next-starter", "CLAUDE.md")
if (existsSync(fnsPath)) {
  const siteInFns = countTerms(readFileSync(fnsPath, "utf8"))
  line(siteInFns.length > 0, `НЕГАТИВ B (CLAUDE.md стартера сайта): сайтовых терминов найдено ${siteInFns.length} — ${JSON.stringify(siteInFns)}`)
} else {
  out.push(`SKIP НЕГАТИВ B: нет ${fnsPath} (на сервере стартера сайта нет — назвать вслух)`)
}

console.log(out.join("\n"))
console.log(fail === 0 ? "===INSTRUCTION_203_1_OK===" : `===INSTRUCTION_203_1_FAIL ${fail}===`)
process.exit(fail === 0 ? 0 : 1)
