// Guard of the PRODUCT QUIZ (node step 536-4). Run: npm run check:product  (or: node scripts/check-product.mjs --root <element dir>).
//
// The quiz (`development-docs/product/`) is written by the agent with the person (skill `product-quiz`) and drawn by the core's page
// «Building → Product design → Product quiz». This guard checks what the page and the agent rely on:
// 1. the files: `quiz.json` is JSON, every module named in `modules` has its `modules/<slug>.json`;
// 2. numbers: every item has a number of its kind (`S-NN` scenario · `R-NN` rule · `E-NN` entity), no number is used twice;
// 3. links: `dependsOn` and the `about` of open questions and the `items` of slices point at existing items, and dependencies do
//    not run in a circle;
// 4. confirmation: a `confirmed` item carries `confirmed.date` and `confirmed.said` — the person's words, never the agent's;
// 5. steps: every `Serves:` line in `steps-new/`, `steps-done/` and `current-step.md` names existing items (or `none`);
// 6. stages (node step 563-4, owner 2026-10-22: «этапы от 0 до N», each working on its own): numbered 0, 1, 2… in order, each with a
//    name, what works after it (`works`) and an observable sign that it is done (`ready`), its items existing; a confirmed stage carries
//    the person's words. Older quizzes keep `slices` — checked as before.
// 7. references (node step 556-2, owner 2026-10-22: a product like X is built from the functions of several similar products — skill
//    `product-clone`): every reference has a number `REF-N`, its rules (`allowed` · `forbidden` · `unknown`) and where the knowledge
//    came from (`analysis` · `screenshots` · `knowledge` · `owner`); a site whose rules forbid it, or are unread, is never `analysis`.
//    Every scenario of the references (`O-NN`) names its area and where it was seen; once the quiz has stages, each one goes to a stage
//    or to «not now». What cannot be seen from outside (`U-NN`) becomes an open question or a decision. The OK line prints the coverage
//    of the areas and the parity by stage.
// 8. copies of studied products (node step 590-2, owner 2026-10-23: «агент программиста залезет в Риверс инжиниринг Report и будет его
//    использовать как реальные существующие элементы проекта»): every `product/reverse/<task>/report.json` opens with
//    `origin.kind = "external-study"` (written by `npm run reverse -- get <task>`), so whoever opens it sees another product, never this
//    element's code. Checked even before the quiz has its first file: a study often comes first.
// 9. the stage of a step (node step 590-4, owner 2026-10-23: «детальное проектирование каждого этапа запускается только после завершения
//    предыдущего этапа»): a stage called done carries the person's words (`done.date`, `done.said`); a `Stage: N` line of a step names
//    an existing stage; a plan in `steps-new/` (or the active small step) for a stage after the current one — the first without `done` —
//    is refused. A reopened step of an earlier stage is legal.
// No quiz yet → only the copies of studied products are checked. Not in `prebuild`: a broken quiz must not stop the site from being deployed.
//
// What it does not see: whether the words are product words, whether an item is true, whether the person really said «yes».

import fs from "node:fs"
import path from "node:path"

const argRoot = process.argv.indexOf("--root")
const ROOT = argRoot > 0 ? path.resolve(process.argv[argRoot + 1]) : path.resolve(import.meta.dirname, "..")
const DOCS = path.join(ROOT, "development-docs")
const DIR = path.join(DOCS, "product")
const problems = []
const ID = { scenario: /^S-\d{2,}$/, rule: /^R-\d{2,}$/, entity: /^E-\d{2,}$/ }
const ANY_ITEM = /^[SRE]-\d{2,}$/
const SLUG = /^[a-z0-9][a-z0-9-]{0,63}$/

const read = (p) => {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"))
  } catch (e) {
    problems.push(`${path.relative(ROOT, p).replaceAll("\\", "/")}: ${e instanceof Error ? e.message : e}`)
    return null
  }
}

// 8. Copies of studied products carry their origin mark (node step 590-2).
const REVERSE = path.join(DIR, "reverse")
let copies = 0
for (const task of fs.existsSync(REVERSE) ? fs.readdirSync(REVERSE, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name) : []) {
  const file = path.join(REVERSE, task, "report.json")
  if (!fs.existsSync(file)) continue
  copies++
  const copy = read(file)
  if (copy && copy.origin?.kind !== "external-study")
    problems.push(`product/reverse/${task}/report.json — no origin mark «external-study»: copy it again with npm run reverse -- get ${task}`)
}

if (!fs.existsSync(path.join(DIR, "quiz.json"))) {
  if (problems.length) {
    console.error(`===PRODUCT_QUIZ_FAIL=== ${problems.length} problem(s):`)
    for (const p of problems) console.error("  " + p)
    process.exit(1)
  }
  console.log(`check:product — no product quiz yet (development-docs/product/quiz.json); copies of studied products: ${copies}, marked`)
  process.exit(0)
}

const quiz = read(path.join(DIR, "quiz.json"))
const items = []
if (quiz) {
  for (const slug of Array.isArray(quiz.modules) ? quiz.modules : []) {
    if (!SLUG.test(slug)) { problems.push(`modules: «${slug}» is not a valid file name`); continue }
    const file = path.join(DIR, "modules", `${slug}.json`)
    if (!fs.existsSync(file)) { problems.push(`modules: «${slug}» is listed, but modules/${slug}.json is missing`); continue }
    const m = read(file)
    for (const it of Array.isArray(m?.items) ? m.items : []) items.push({ ...it, module: slug })
  }
  for (const f of fs.existsSync(path.join(DIR, "modules")) ? fs.readdirSync(path.join(DIR, "modules")) : []) {
    if (f.endsWith(".json") && !(quiz.modules ?? []).includes(f.slice(0, -5))) problems.push(`modules/${f} exists but is not listed in quiz.json «modules»`)
  }
}

const ids = new Set()
for (const it of items) {
  const where = `${it.module}: ${it.id ?? "(no number)"}`
  const kind = it.kind ?? "scenario"
  if (!ID[kind]) problems.push(`${where} — unknown kind «${kind}»`)
  else if (!ID[kind].test(it.id ?? "")) problems.push(`${where} — a ${kind} is numbered ${kind[0].toUpperCase()}-NN`)
  if (ids.has(it.id)) problems.push(`${where} — the number is used twice`)
  ids.add(it.id)
  if (it.status !== "draft" && it.status !== "confirmed") problems.push(`${where} — status is «draft» or «confirmed», not «${it.status}»`)
  if (it.status === "confirmed" && !(it.confirmed?.date && it.confirmed?.said)) problems.push(`${where} — confirmed without the date and the person's words`)
  for (const d of Array.isArray(it.dependsOn) ? it.dependsOn : []) if (!items.some((x) => x.id === d)) problems.push(`${where} — depends on ${d}, which is not in the quiz`)
}

// Dependencies must not run in a circle: a circle has no item to build first.
const deps = new Map(items.map((it) => [it.id, Array.isArray(it.dependsOn) ? it.dependsOn : []]))
const state = new Map()
const visit = (id, trail) => {
  if (state.get(id) === "done") return
  if (state.get(id) === "open") { problems.push(`dependencies run in a circle: ${[...trail.slice(trail.indexOf(id)), id].join(" → ")}`); return }
  state.set(id, "open")
  for (const d of deps.get(id) ?? []) if (deps.has(d)) visit(d, [...trail, id])
  state.set(id, "done")
}
for (const id of deps.keys()) visit(id, [])

for (const q of Array.isArray(quiz?.openQuestions) ? quiz.openQuestions : [])
  for (const a of Array.isArray(q.about) ? q.about : []) if (ANY_ITEM.test(a) && !ids.has(a)) problems.push(`open question ${q.id}: about ${a}, which is not in the quiz`)
for (const s of Array.isArray(quiz?.slices) ? quiz.slices : [])
  for (const a of Array.isArray(s.items) ? s.items : []) if (!ids.has(a)) problems.push(`slice ${s.id}: ${a} is not in the quiz`)

const filled = (v) => typeof v === "string" && v.trim() !== ""
const stages = Array.isArray(quiz?.stages) ? quiz.stages : []
stages.forEach((s, i) => {
  const where = `stage ${s?.n ?? `#${i}`}`
  if (s?.n !== i) problems.push(`${where} — stages are numbered 0, 1, 2… in order: here ${i} is expected`)
  if (!filled(s?.name)) problems.push(`${where} — no name`)
  if (!filled(s?.works)) problems.push(`${where} — no «works»: what works on its own after this stage`)
  if (!filled(s?.ready)) problems.push(`${where} — no «ready»: an observable sign that the stage is done`)
  for (const a of Array.isArray(s?.items) ? s.items : []) if (!ids.has(a)) problems.push(`${where}: ${a} is not in the quiz`)
  if (s?.status !== undefined && s.status !== "draft" && s.status !== "confirmed") problems.push(`${where} — status is «draft» or «confirmed», not «${s.status}»`)
  if (s?.status === "confirmed" && !(s.confirmed?.date && s.confirmed?.said)) problems.push(`${where} — confirmed without the date and the person's words`)
  if (s?.done !== undefined && !(s.done?.date && s.done?.said)) problems.push(`${where} — done without the date and the person's words that it works`)
  if (s?.done && s.status !== "confirmed") problems.push(`${where} — done, but the stage itself was never confirmed`)
})
// The current stage: the first one the person has not called done (node step 590-4). Only it gets steps.
const current = stages.find((s) => !s?.done)?.n ?? null

// References: several similar products, what each shows, which stage brings it into ours (node step 556-2).
let referenceLine = ""
const refs = quiz?.references && typeof quiz.references === "object" ? quiz.references : null
if (refs) {
  const RULES = ["allowed", "forbidden", "unknown"]
  const SOURCES = ["analysis", "screenshots", "knowledge", "owner"]
  const products = Array.isArray(refs.products) ? refs.products : []
  const areas = Array.isArray(refs.areas) ? refs.areas : []
  const scenarios = Array.isArray(refs.scenarios) ? refs.scenarios : []
  const unknowns = Array.isArray(refs.unknowns) ? refs.unknowns : []
  const unique = (list, re, label, form) => {
    const seen = new Set()
    for (const x of list) {
      if (!re.test(x?.id ?? "")) problems.push(`${label} ${x?.id ?? "(no number)"} — numbered ${form}`)
      else if (seen.has(x.id)) problems.push(`${label} ${x.id} — the number is used twice`)
      seen.add(x?.id)
    }
    return seen
  }
  const productIds = unique(products, /^REF-\d+$/, "reference", "REF-N")
  const areaIds = unique(areas, /^AR-\d{2,}$/, "area", "AR-NN")
  unique(scenarios, /^O-\d{2,}$/, "scenario of the references", "O-NN")
  unique(unknowns, /^U-\d{2,}$/, "unknown", "U-NN")
  for (const p of products) {
    const where = `reference ${p?.id}`
    if (!filled(p?.name)) problems.push(`${where} — no name`)
    if (!RULES.includes(p?.rules)) problems.push(`${where} — rules are ${RULES.join(" · ")}, not «${p?.rules}»`)
    if (!SOURCES.includes(p?.source)) problems.push(`${where} — source is ${SOURCES.join(" · ")}, not «${p?.source}»`)
    if (p?.source === "analysis" && p?.rules !== "allowed") problems.push(`${where} — its rules are «${p?.rules}»: a site that forbids it, or whose rules are unread, is never analysed (screenshots instead)`)
    if (p?.source === "analysis" && !filled(p?.report)) problems.push(`${where} — an analysis without its report id`)
    // 556-8: internal pages were studied in a test account — only one the person confirmed (owner 2026-10-22: «пользователь должен
    // подтвердить лично»), only on a site whose rules allow it, only by the node's analysis.
    if (p?.account !== undefined) {
      if (p.account?.kind !== "test") problems.push(`${where} — an account is only ever a test account (kind «test»)`)
      if (!filled(p.account?.consentAt)) problems.push(`${where} — a test account without the date of the person's consent`)
      if (p.rules !== "allowed" || p.source !== "analysis") problems.push(`${where} — internal pages are studied only by the node's analysis of a site whose rules allow it`)
    }
  }
  for (const a of areas) if (!filled(a?.name)) problems.push(`area ${a?.id} — no name`)
  const stageNs = new Set(stages.map((s) => s?.n))
  const notNowIds = new Set((Array.isArray(quiz?.notNow) ? quiz.notNow : []).map((n) => n?.id))
  const perStage = new Map()
  let assigned = 0
  let later = 0
  for (const o of scenarios) {
    const where = `scenario of the references ${o?.id}`
    if (!filled(o?.name)) problems.push(`${where} — no name`)
    if (!areaIds.has(o?.area)) problems.push(`${where} — area ${o?.area} is not in the references`)
    const seen = Array.isArray(o?.seenIn) ? o.seenIn : []
    if (!seen.length) problems.push(`${where} — «seenIn» names no reference`)
    for (const r of seen) if (!productIds.has(r)) problems.push(`${where} — seen in ${r}, which is not a reference`)
    const hasStage = o?.stage !== undefined && o?.stage !== null
    const hasLater = filled(o?.notNow)
    if (hasStage && hasLater) problems.push(`${where} — a stage and «not now» at once`)
    if (hasStage && !stageNs.has(o.stage)) problems.push(`${where} — stage ${o.stage} is not in the quiz`)
    if (hasLater && !notNowIds.has(o.notNow)) problems.push(`${where} — «not now» ${o.notNow} is not in the quiz`)
    if (!hasStage && !hasLater && stages.length) problems.push(`${where} — goes to no stage and not to «not now»`)
    if (hasStage) { assigned++; perStage.set(o.stage, (perStage.get(o.stage) ?? 0) + 1) }
    if (hasLater) later++
  }
  const questionIds = new Set((Array.isArray(quiz?.openQuestions) ? quiz.openQuestions : []).map((q) => q?.id))
  for (const u of unknowns) {
    const where = `unknown ${u?.id}`
    if (!filled(u?.text)) problems.push(`${where} — no text`)
    if (filled(u?.question) ? !questionIds.has(u.question) : !filled(u?.decision)) problems.push(`${where} — becomes an open question that exists, or a decision`)
  }
  const bySource = SOURCES.map((s) => `${s} ${products.filter((p) => p?.source === s).length}`).join(", ")
  const covered = areas.filter((a) => scenarios.some((o) => o?.area === a?.id)).length
  const byStage = [...perStage.keys()].sort((a, b) => a - b).map((n) => `stage ${n}: ${perStage.get(n)}`).join(", ")
  referenceLine = `references: ${products.length} (${bySource}) · areas covered ${covered}/${areas.length} · parity ${assigned}/${scenarios.length}` +
    (later ? ` (not now ${later})` : "") + (stages.length ? (byStage ? ` · ${byStage}` : "") : " · stages not planned yet")
}

// Steps name the items they serve in one line `Serves: …` (skill use-development-docs); the core draws the dots from it.
const SERVES = /^[\s>*_-]*serves[*_]*\s*:[*_]*\s*(.+)$/im
const stepFiles = [
  ...["steps-new", "steps-done"].flatMap((d) => (fs.existsSync(path.join(DOCS, d)) ? fs.readdirSync(path.join(DOCS, d)).filter((f) => f.endsWith(".md") && f !== "README.md").map((f) => path.join(DOCS, d, f)) : [])),
  path.join(DOCS, "current-step.md"),
]
for (const f of stepFiles) {
  if (!fs.existsSync(f)) continue
  const m = SERVES.exec(fs.readFileSync(f, "utf8"))
  if (!m) continue
  for (const ref of m[1].split(/[\s,;]+/).map((s) => s.replace(/[`*]/g, "")).filter(Boolean)) {
    if (ref.toLowerCase() === "none") continue
    if (!ANY_ITEM.test(ref) || !ids.has(ref)) problems.push(`${path.relative(ROOT, f).replaceAll("\\", "/")}: Serves ${ref}, which is not in the quiz`)
  }
}

// 9. The stage of a step (node step 590-4): `Stage: N` names an existing stage; a plan for a stage after the current one is refused.
const STAGE = /^[\s>*_-]*stage[*_]*\s*:[*_]*\s*(\d+)\b/im
for (const f of stepFiles) {
  if (!fs.existsSync(f)) continue
  const m = STAGE.exec(fs.readFileSync(f, "utf8"))
  if (!m) continue
  const n = Number(m[1])
  const rel = path.relative(ROOT, f).replaceAll("\\", "/")
  if (!stages.some((s) => s?.n === n)) { problems.push(`${rel}: Stage ${n}, which is not in the quiz`); continue }
  if (!rel.includes("/steps-done/") && current !== null && n > current)
    problems.push(`${rel}: stage ${n} is planned in detail before stage ${current} is done — the current stage is built first`)
}

if (problems.length) {
  console.error(`===PRODUCT_QUIZ_FAIL=== ${problems.length} problem(s):`)
  for (const p of problems) console.error("  " + p)
  process.exit(1)
}
console.log(`===PRODUCT_QUIZ_OK=== ${items.length} items in ${(quiz?.modules ?? []).length} modules, ${(quiz?.openQuestions ?? []).length} open questions, ${stages.length} stages${stages.length ? ` (current: ${current ?? "all done"})` : ""}, ${copies} copies of studied products (marked)`)
if (referenceLine) console.log(referenceLine)
