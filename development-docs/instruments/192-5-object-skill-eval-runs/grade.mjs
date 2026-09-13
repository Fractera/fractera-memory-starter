// Оценка прогонов 192-5 по признакам, названным ДО прогона (eval_metadata.json).
// Механические признаки проверяются кодом; признаки на суждение — чтением, с цитатой
// в MANUAL. Пишет grading.json в формате просмотрщика skill-creator: text · passed · evidence.
//
// Запуск: node grade.mjs <iteration-dir>
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const IT = process.argv[2] ?? "iteration-1"
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g
const read = (p) => (existsSync(p) ? readFileSync(p, "utf8") : "")
// 🛑 ЗАГОЛОВОК ВЫЗОВА УЗНАЁТСЯ ПО МЕТКЕ ВРЕМЕНИ: в журнал попадает и текст открытых документов, а
// в Markdown свои строки «### …» — без метки они считались бы вызовами.
const calls = (log) => [...log.matchAll(/^### \d{4}-\d\d-\d\dT\S+ (\w+) (.*)$/gm)].map((m) => ({ args: m[2], tool: m[1] }))

const EN = "5e7b92c5-97c5-4583-adee-6adb51c866b7"
const RU = "f426b478-46b3-45f7-b0f7-bcb5fc597f3b"
const LOOP = "b2c3ac37-dcb4-4b14-9304-bd89af3974a6"
const SKILLEVO = "f8056618-4b70-4ced-96d0-a1cf720a4d9c"
const MULTI = ["6210b9b9", "771c252a", "b81b27c0", "70dc58ec"]

// Признаки на суждение: вердикт и цитата ставятся чтением ответа (заполняется оценщиком).
const MANUAL = JSON.parse(read(join(IT, "manual-grades.json")) || "{}")

const CHECKS = {
  "english-pdf-among-twins": (a, log) => {
    const ids = a.match(UUID) ?? []
    return [
      [ids[0] === EN, `первый id в ответе: ${ids[0] ?? "нет"}`],
      [ids[0] !== RU, `первый id не русский PDF (${ids[0] ?? "нет"})`],
      [calls(log).some((c) => c.tool === "find_objects"), `вызовы: ${calls(log).map((c) => c.tool).join(", ")}`],
    ]
  },
  "binary-diagram-content-not-invented": (a) => {
    const said = a.match(/не (читает|прочит|разбира|заглядыва)[^\n.]*/i)
    const invented = a.match(/\bERROR\b|Completed Project Steps|Generate New Task|Codex/)
    return [
      [a.includes(LOOP), `id схемы ${a.includes(LOOP) ? "есть" : "нет"} в ответе`],
      [Boolean(said), said ? `«${said[0].slice(0, 90)}»` : "фразы о непрочитанном содержимом нет"],
      [!invented, invented ? `выдуманная деталь: «${invented[0]}»` : "деталей схемы вне описания нет"],
    ]
  },
  "deep-passage-miss-is-not-absence": (a, log, key) => [
    MANUAL[`${key}#1`] ?? [false, "НЕ ОЦЕНЕНО ЧТЕНИЕМ"],
    MANUAL[`${key}#2`] ?? [false, "НЕ ОЦЕНЕНО ЧТЕНИЕМ"],
    [!calls(log).some((c) => c.tool === "search_vectors"), `вызовы: ${calls(log).map((c) => c.tool).join(", ")}`],
    // Признак добавлен в итерации 2 ДО её прогона — под правило о слабых попаданиях.
    (() => {
      const wasted = new Set(calls(log).filter((c) => c.tool === "open_object").map((c) => JSON.parse(c.args).id).filter((id) => id !== SKILLEVO))
      return [wasted.size <= 1, `открыто документов, не оказавшихся ответом: ${wasted.size}`]
    })(),
  ],
  "overview-returned-as-object-with-id": (a, log) => {
    const kept = [...log.matchAll(/Сохранено: id=([0-9a-f-]{36})/g)].map((m) => m[1])
    const keepArgs = calls(log).filter((c) => c.tool === "keep_object").map((c) => c.args).join("\n")
    const cited = MULTI.filter((p) => keepArgs.includes(p))
    return [
      [kept.length > 0, `keep_object вернул id: ${kept.join(", ") || "нет"}`],
      [kept.some((id) => a.includes(id)), `id сохранённого в ответе: ${kept.some((id) => a.includes(id)) ? "да" : "нет"}`],
      [cited.length >= 3, `в сохранённом документе ссылок на id: ${cited.join(", ") || "нет"} (${cited.length})`],
      [a.length < 1500, `длина ответа ${a.length} знаков`],
    ]
  },
}

// Раскладка, которую читают агрегатор и просмотрщик skill-creator: eval-N-<имя>/<конфигурация>/run-1/.
const evalDirs = readdirSync(IT).filter((d) => /^eval-\d+-/.test(d))
const summary = []
for (const [evalName, check] of Object.entries(CHECKS)) {
  const evalDir = evalDirs.find((d) => d.replace(/^eval-\d+-/, "") === evalName)
  if (!evalDir) continue
  const meta = JSON.parse(read(join(IT, evalDir, "eval_metadata.json")))
  for (const cfg of ["with_skill", "without_skill"]) {
    const dir = join(IT, evalDir, cfg, "run-1")
    const answer = read(join(dir, "outputs", "answer.md"))
    if (!answer) continue
    const log = read(join(dir, "outputs", "calls.log"))
    const res = check(answer, log, `${evalName}/${cfg}`)
    const expectations = meta.assertions.map((text, i) => ({ evidence: res[i][1], passed: Boolean(res[i][0]), text }))
    const passed = expectations.filter((e) => e.passed).length
    writeFileSync(
      join(dir, "grading.json"),
      JSON.stringify({ expectations, summary: { failed: expectations.length - passed, pass_rate: passed / expectations.length, passed, total: expectations.length } }, null, 2),
    )
    summary.push(`${evalName.padEnd(38)} ${cfg.padEnd(14)} ${passed}/${expectations.length} · вызовов рук ${calls(log).length}`)
    for (const e of expectations) summary.push(`    ${e.passed ? "✓" : "✗"} ${e.text.slice(0, 70)} — ${e.evidence}`)
  }
}
console.log(summary.join("\n"))
