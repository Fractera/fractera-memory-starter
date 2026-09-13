// Оценка прогонов 193-3 по признакам, названным ДО прогона (eval_metadata.json).
//
// 🔒 СУДЯТ ПО ЖУРНАЛУ ВЫЗОВОВ, А НЕ ПО РАССКАЗУ АГЕНТА О СЕБЕ (закон 143): модель,
// пересказывающая свою работу, ошибается в свою пользу. Что она сделала с базой,
// видно только в вызовах.
//
// Запуск: node grade.mjs <iteration-dir>
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const IT = process.argv[2] ?? "iteration-1"
const read = (p) => (existsSync(p) ? readFileSync(p, "utf8") : "")

/** Заголовок вызова узнаётся по метке времени: в журнал попадает и текст ответов. */
const callsOf = (log) =>
  [...log.matchAll(/^### \d{4}-\d\d-\d\dT\S+ (\w+) (\{.*\})$/gm)].map((m) => {
    let args = {}
    try { args = JSON.parse(m[2]) } catch { /* оставим пустым */ }
    return { args, tool: m[1] }
  })

/** Ответы рук — всё, что не заголовок; по ним видно отказы хранилища. */
const answersOf = (log) => log.replace(/^### .*$/gm, "")

const LABELS = /^(team|team_members|teammates|colleagues|staff|employees|people)$/
const words = (k) => String(k ?? "").split("_").filter(Boolean).length

const CHECKS = {
  "eval-1-name-is-a-phrase": (a, log) => {
    const c = callsOf(log)
    const writes = c.filter((x) => x.tool !== "what_i_already_know")
    const kinds = writes.map((x) => String(x.args.kind ?? "")).filter(Boolean)
    const first = c.findIndex((x) => x.tool !== "what_i_already_know")
    return [
      [kinds.length > 0 && kinds.every((k) => words(k) >= 4), `рода: ${kinds.join(", ") || "ни одного"}`],
      [kinds.every((k) => !LABELS.test(k)), `ярлыков среди имён: ${kinds.filter((k) => LABELS.test(k)).join(", ") || "нет"}`],
      [!/не годится|— ярлык/i.test(answersOf(log)), `отказы хранилища: ${(answersOf(log).match(/не годится|— ярлык/gi) ?? []).join(", ") || "нет"}`],
      [c[0]?.tool === "what_i_already_know" && (first === -1 || first > 0), `первый вызов: ${c[0]?.tool ?? "нет вызовов"}`],
    ]
  },
  "eval-2-second-value-becomes-list": (a, log) => {
    const c = callsOf(log)
    const prom = c.filter((x) => x.tool === "promote_to_list")
    return [
      [prom.length > 0, `promote_to_list вызван: ${prom.length} раз · все вызовы: ${c.map((x) => x.tool).join(", ")}`],
      [prom.some((x) => x.args.kind === "pets_that_live_with_him"), `род: ${prom.map((x) => x.args.kind).join(", ") || "—"}`],
      [/список/i.test(a) && /(Барсик|прежн|перееха|перенес)/i.test(a), `в ответе есть «список» и след прежнего значения: ${/список/i.test(a)} / ${/(Барсик|прежн|перееха|перенес)/i.test(a)}`],
    ]
  },
  "eval-3-correction-not-addition": (a, log) => {
    const c = callsOf(log)
    const w = c.filter((x) => x.tool === "write_value")
    return [
      [w.some((x) => x.args.kind === "city_where_he_lives_now"), `write_value по родам: ${w.map((x) => x.args.kind).join(", ") || "—"}`],
      [!c.some((x) => x.tool === "promote_to_list"), `promote_to_list вызван: ${c.filter((x) => x.tool === "promote_to_list").length} раз`],
      [/истори/i.test(a), `в ответе сказано про историю: ${/истори/i.test(a)}`],
    ]
  },
  "eval-4-existing-kind-letter-for-letter": (a, log) => {
    const c = callsOf(log)
    const w = c.filter((x) => x.tool === "write_value")
    const made = c.filter((x) => x.tool === "make_new_kind")
    const tzMade = made.filter((x) => /time|zone|tz/i.test(String(x.args.kind ?? "")))
    return [
      [w.some((x) => x.args.kind === "time_zone_he_lives_in"), `write_value по родам: ${w.map((x) => x.args.kind).join(", ") || "—"}`],
      [tzMade.length === 0, `make_new_kind под пояс: ${tzMade.map((x) => x.args.kind).join(", ") || "нет"} · всего заведено: ${made.map((x) => x.args.kind).join(", ") || "нет"}`],
      [
        c.some((x) => x.args.kind === "city_where_he_lives_now") || /Лиссабон|Lisboa|Lisbon/i.test(a),
        `Лиссабон записан или назван: вызовы по городу ${c.filter((x) => x.args.kind === "city_where_he_lives_now").length}, упомянут в ответе ${/Лиссабон/i.test(a)}`,
      ],
    ]
  },
}

const dirs = readdirSync(IT).filter((d) => /^eval-\d+-/.test(d))
const out = []
for (const [name, check] of Object.entries(CHECKS)) {
  if (!dirs.includes(name)) continue
  const meta = JSON.parse(read(join(IT, name, "eval_metadata.json")))
  for (const cfg of ["with_skill", "without_skill"]) {
    const dir = join(IT, name, cfg, "run-1")
    const answer = read(join(dir, "outputs", "answer.md"))
    if (!answer) continue
    const log = read(join(dir, "outputs", "calls.log"))
    const res = check(answer, log)
    const expectations = meta.assertions.map((text, i) => ({ evidence: res[i]?.[1] ?? "нет проверки", passed: Boolean(res[i]?.[0]), text }))
    const passed = expectations.filter((e) => e.passed).length
    writeFileSync(join(dir, "grading.json"), JSON.stringify({
      expectations,
      summary: { failed: expectations.length - passed, pass_rate: passed / expectations.length, passed, total: expectations.length },
    }, null, 2))
    out.push(`${name.padEnd(42)} ${cfg.padEnd(14)} ${passed}/${expectations.length} · вызовов ${callsOf(log).length}`)
    for (const e of expectations) if (!e.passed) out.push(`    ✗ ${e.text.slice(0, 62)} — ${e.evidence}`)
  }
}
console.log(out.join("\n"))
