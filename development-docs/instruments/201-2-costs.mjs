// ПРИБОР 201-2 — ЗАМЕРЫ ДО ПОСТРОЙКИ «СХЕМЫ В ЦЕНТРЕ» (паспорт §21).
//
// 🎯 ЗАЧЕМ. Подшаги 201-4…201-6 опираются на четыре числа, которых у нас нет:
//   G — сколько стоит запись документа в граф и чтение из него с нашими словами;
//   M — сколько стоит ОДИН вызов `claude -p` без нити на подбор признаков, Sonnet и Opus,
//       и остаётся ли после него разговор на диске;
//   V — сколько стоит индекс 1000 записей реестра по смыслу и находит ли он нужного кандидата;
//   порог отбора кандидатов — из распределения близостей V, а не из головы.
//
// 🔒 ПРИБОР НЕ ЗОВЁТ `think()` ПАМЯТИ НАМЕРЕННО: тот пишет каждый вызов в живой журнал памяти, и
// замер оставил бы там чужие строки. Аргументы CLI повторены здесь поимённо — те же, что в
// `lib/think.mjs`, плюс исследуемые флаги.
//
// 🛑 ЧТО ПРИБОР УДАЛЯЕТ И ЧЬЁ ЭТО: только своё. Граф — документы с источником `probe-201-2/`;
// вектор — коллекция `probe-201-2`. Живых данных владельца он не касается.
//
// 💰 ЦЕНА, НАЗВАННАЯ ДО ПРОГОНА: ~7 вызовов `claude -p` из подписки сервера (короткие подсказки),
// одно извлечение графа (`gpt-4o-mini`, один кусок), ~40 тыс. токенов встраивания
// `text-embedding-3-large` (≈ $0.005). Время — 5–10 минут.
//
// Запуск на сервере из корня службы:  node development-docs/instruments/201-2-costs.mjs

import { spawn, execSync } from "node:child_process"
import { existsSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

const MARK = "===PROBE_201_2==="
const DATA = process.env.DATA_URL ?? "http://127.0.0.1:3300"
const ROOT = process.cwd()
const WORKDIR = "/tmp/fractera-memory-think"
const PROJECTS = "/root/.claude/projects/-tmp-fractera-memory-think"
const TAG = `probe-201-2`
const STAMP = Date.now()

function secret(name) {
  try {
    for (const line of readFileSync("/etc/fractera/secrets.env", "utf8").split(/\r?\n/)) {
      const i = line.indexOf("=")
      if (i > 0 && line.slice(0, i).trim() === name) return line.slice(i + 1).trim().replace(/^["']|["']$/g, "")
    }
  } catch { /* вне сервера */ }
  return process.env[name] ?? ""
}
const DATA_SECRET = secret("DATA_SECRET")
const OPENAI = secret("OPENAI_API_KEY")
if (!DATA_SECRET || !OPENAI) {
  console.log(`${MARK} нет DATA_SECRET или OPENAI_API_KEY — прогон невозможен`)
  process.exit(2)
}

const out = (...a) => console.log(...a)
const ms = (t) => Date.now() - t
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : null }
const sleep = (n) => new Promise((r) => setTimeout(r, n))

async function data(path, init = {}) {
  const res = await fetch(`${DATA}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", "x-data-secret": DATA_SECRET, ...(init.headers ?? {}) },
  })
  const text = await res.text()
  let body = null
  try { body = JSON.parse(text) } catch { body = text }
  return { status: res.status, body }
}

// ─────────────────────────────────────────────────────────────────────────────
// V — индекс реестра по смыслу
// ─────────────────────────────────────────────────────────────────────────────

// Двенадцать «настоящих» признаков — те, о которых спросят вопросы ниже.
const REAL = [
  { key: "money.spent-on-purchase", title: "расходы на покупку", triggers: ["потратил", "купил за", "расходы на", "spent on", "cost me"] },
  { key: "person.city-lives-in", title: "город, где живёт человек", triggers: ["я живу в", "переехал в", "мой город", "I live in"] },
  { key: "pet.dog-breed", title: "порода собаки человека", triggers: ["моя собака", "порода", "мой пёс", "my dog is a"] },
  { key: "person.birth-year", title: "год рождения человека", triggers: ["я родился", "мне лет", "born in"] },
  { key: "person.important-people", title: "важные люди: друзья, родственники", triggers: ["мой друг", "моя дочь", "мой брат", "my friend"] },
  { key: "person.vehicle", title: "автомобиль человека", triggers: ["моя машина", "я езжу на", "my car"] },
  { key: "health.food-allergy", title: "пищевая аллергия", triggers: ["аллергия на", "мне нельзя есть", "allergic to"] },
  { key: "work.employer", title: "где человек работает", triggers: ["я работаю в", "мой работодатель", "I work at"] },
  { key: "sport.running-distance", title: "пробежка: дистанция", triggers: ["пробежал", "километров бегом", "ran km"] },
  { key: "health.medicine-dose", title: "лекарство и доза", triggers: ["принимаю таблетки", "доза", "мг в день"] },
  { key: "travel.flight", title: "перелёт: откуда, куда, когда", triggers: ["лечу в", "рейс", "билет на самолёт", "flight to"] },
  { key: "money.lent-to-someone", title: "кому одолжил деньги", triggers: ["одолжил", "дал в долг", "должен мне", "lent"] },
]

// 988 правдоподобных соседей: предметы × стороны. Соседи нарочно близкие по словам к настоящим
// (деньги, здоровье, люди), иначе замер отбора был бы слишком лёгким.
const SUBJECTS = ["квартира", "дача", "кот", "собака", "ребёнок", "школа", "университет", "работа", "проект", "клиент",
  "поставщик", "банк", "кредит", "вклад", "налоги", "страховка", "врач", "стоматолог", "спортзал", "бассейн",
  "велосипед", "мотоцикл", "лодка", "самолёт", "поезд", "отель", "ресторан", "кафе", "магазин", "рынок",
  "сад", "огород", "ремонт", "мебель", "техника", "телефон", "ноутбук", "подписка", "игра", "книга"]
const SIDES = ["расходы", "доходы", "адрес", "дата покупки", "срок годности", "контакт", "расписание", "цена", "оценка", "история",
  "проблема", "гарантия", "размер", "цвет", "марка", "состояние", "план", "долг", "скидка", "отзыв",
  "фото", "документы", "пароль от", "напоминание", "вес"]
function registry() {
  const rows = REAL.map((r) => ({ ...r, real: true }))
  let n = 0
  outer: for (const s of SUBJECTS) {
    for (const side of SIDES) {
      if (rows.length >= 1000) break outer
      n += 1
      rows.push({
        key: `synthetic.${n}`,
        title: `${side}: ${s}`,
        triggers: [`${side} ${s}`, `мой ${s}`, `про ${s}`],
      })
    }
  }
  return rows
}
const indexText = (r) => `${r.key} — ${r.title}. Как говорят: ${r.triggers.join("; ")}`

async function embedBatch(texts) {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI}` },
    body: JSON.stringify({ model: "text-embedding-3-large", input: texts }),
  })
  if (!res.ok) throw new Error(`embeddings ${res.status}: ${(await res.text()).slice(0, 200)}`)
  const body = await res.json()
  return { vectors: body.data.map((d) => d.embedding), tokens: body.usage?.total_tokens ?? null }
}

const QUESTIONS = [
  { q: "мои расходы на молоко колбасу и воду сегодня были 200 300 и 400 руб", want: "money.spent-on-purchase" },
  { q: "сколько я потратил сегодня?", want: "money.spent-on-purchase" },
  { q: "где я живу?", want: "person.city-lives-in" },
  { q: "where do I live?", want: "person.city-lives-in" },
  { q: "какая порода у моей собаки?", want: "pet.dog-breed" },
  { q: "Мой друг Денис служил в президентском полку с 1994 по 1996", want: "person.important-people" },
  { q: "у меня аллергия на арахис", want: "health.food-allergy" },
  { q: "Миша так и не вернул мне пять тысяч", want: "money.lent-to-someone" },
  { q: "какая погода сейчас на Марсе", want: null },
]

async function measureVectors() {
  out("\n── V: индекс реестра по смыслу ──")
  const rows = registry()
  out(`записей: ${rows.length}, настоящих: ${REAL.length}`)

  let t = Date.now()
  const vectors = []
  let tokens = 0
  for (let i = 0; i < rows.length; i += 100) {
    const b = await embedBatch(rows.slice(i, i + 100).map(indexText))
    vectors.push(...b.vectors)
    tokens += b.tokens ?? 0
  }
  out(`встраивание 1000 записей пачками по 100: ${ms(t)} мс, токенов ${tokens}`)

  t = Date.now()
  let failed = 0
  const queue = rows.map((r, i) => ({ r, v: vectors[i] }))
  await Promise.all(Array.from({ length: 8 }, async () => {
    while (queue.length) {
      const { r, v } = queue.shift()
      const res = await data("/vectors", {
        method: "POST",
        body: JSON.stringify({ id: `${TAG}-${r.key}`, collection: TAG, text: indexText(r), embedding: v, refTable: TAG, refId: r.key }),
      })
      if (res.status !== 200) failed += 1
    }
  }))
  out(`запись 1000 готовых векторов в склад (8 потоков): ${ms(t)} мс, отказов ${failed}`)

  const found = []
  for (const { q, want } of QUESTIONS) {
    const te = Date.now()
    const { vectors: [probe] } = await embedBatch([q])
    const embedMs = ms(te)
    const dbTimes = []
    let res = null
    for (let i = 0; i < 3; i++) {
      const td = Date.now()
      res = await data("/vectors/search", { method: "POST", body: JSON.stringify({ collection: TAG, embedding: probe, k: 10 }) })
      dbTimes.push(ms(td))
    }
    const results = res.body?.results ?? []
    const keys = results.map((x) => x.refId)
    const rank = want ? keys.indexOf(want) + 1 : null
    const wantScore = want ? results.find((x) => x.refId === want)?.score ?? null : null
    found.push({ q, want, rank, top: results[0]?.score ?? null, wantScore, keys })
    out(`«${q}» → встраивание вопроса ${embedMs} мс · поиск в складе медиана ${median(dbTimes)} мс (${dbTimes.join("/")}) · index=${res.body?.index} scanned=${res.body?.scanned}`)
    out(`   ожидался ${want ?? "(ничего)"} → место ${rank || "нет в 10"} · близость нужного ${wantScore?.toFixed(3) ?? "—"} · лучшая ${results[0]?.score?.toFixed(3)} (${keys[0]})`)
    out(`   первые 5: ${keys.slice(0, 5).join(", ")}`)
  }
  return { rows, found }
}

async function cleanupVectors() {
  const del = await data("/db/migrate", { method: "POST", body: JSON.stringify({ sql: "DELETE FROM vectors WHERE collection = ?", params: [TAG] }) })
  const { vectors: [probe] } = await embedBatch(["расходы на молоко"])
  const after = await data("/vectors/search", { method: "POST", body: JSON.stringify({ collection: TAG, embedding: probe, k: 5 }) })
  out(`уборка вектора: удалено ${del.body?.changes ?? JSON.stringify(del.body).slice(0, 80)} · поиск по коллекции после уборки: ${(after.body?.results ?? []).length} находок`)
}

// ─────────────────────────────────────────────────────────────────────────────
// M — одиночный вызов модели на подбор признаков
// ─────────────────────────────────────────────────────────────────────────────

const SYSTEM = [
  "Ты разбираешь фразу человека для памяти. Тебе дан ЗАКРЫТЫЙ список признаков-кандидатов.",
  "Верни ТОЛЬКО JSON без ограды: {\"action\":\"write\"|\"read\",\"features\":[{\"key\":<ключ из списка>,\"value\":<значение или null>}],\"not_in_list\":<что сказано, но в списке нет, или null>}.",
  "Ключи — только из списка. Значения — как сказаны, числа числами. Несколько значений одного признака — несколько элементов.",
].join("\n")

function runClaude(args, { stream = false } = {}) {
  return new Promise((resolve) => {
    const t = Date.now()
    let so = "", se = ""
    const child = spawn("claude", args, { cwd: WORKDIR, env: { ...process.env, HOME: "/root" }, stdio: ["ignore", "pipe", "pipe"] })
    const timer = setTimeout(() => child.kill("SIGKILL"), 180000)
    child.stdout.on("data", (d) => { so += d })
    child.stderr.on("data", (d) => { se += d })
    child.on("close", (code) => {
      clearTimeout(timer)
      let envelope = null, init = null
      if (stream) {
        for (const line of so.split("\n")) {
          try {
            const j = JSON.parse(line)
            if (j.type === "system" && j.subtype === "init") init = j
            if (j.type === "result") envelope = j
          } catch { /* не строка JSON */ }
        }
      } else {
        try { envelope = JSON.parse(so) } catch { envelope = null }
      }
      resolve({ code, wall: ms(t), envelope, init, stderr: se.trim().slice(0, 200), stdout: so.slice(0, 200) })
    })
  })
}

function baseArgs(user, model, { mcp = true, persist = true } = {}) {
  return [
    "-p", user,
    "--system-prompt", SYSTEM,
    "--model", model,
    ...(mcp ? ["--mcp-config", join(ROOT, ".mcp.json"), "--strict-mcp-config"] : ["--strict-mcp-config"]),
    ...(persist ? [] : ["--no-session-persistence"]),
  ]
}

function judge(envelope) {
  const text = String(envelope?.result ?? "").trim().replace(/^```[a-z]*\s*/, "").replace(/```\s*$/, "")
  try {
    const j = JSON.parse(text)
    const spent = (j.features ?? []).filter((f) => f.key === "money.spent-on-purchase")
    const values = spent.map((f) => Number(f.value)).filter((n) => Number.isFinite(n)).sort((a, b) => a - b)
    const right = spent.length === 3 && values.join(",") === "200,300,400"
    return { json: true, right, features: (j.features ?? []).length, summary: JSON.stringify(j).slice(0, 220) }
  } catch {
    return { json: false, right: false, summary: text.slice(0, 160) }
  }
}

const sessionFile = (id) => (id ? existsSync(join(PROJECTS, `${id}.jsonl`)) : false)

async function measureModel(candidates) {
  out("\n── M: одиночный вызов claude -p на подбор признаков ──")
  const phrase = "мои расходы на молоко колбасу и воду сегодня были 200 300 и 400 руб"
  const list = candidates.map((r) => `- ${r.key}: ${r.title}`).join("\n")
  const user = `Кандидаты:\n${list}\n\nФраза: «${phrase}»`
  out(`кандидатов в подсказке: ${candidates.length}, длина подсказки ${user.length} знаков`)

  // 1. Как зовёт память сегодня (с MCP, разговор сохраняется) — и с ним же проверка нити.
  const r1 = await runClaude([...baseArgs(user, "opus"), "--output-format", "stream-json", "--verbose"], { stream: true })
  const id1 = r1.envelope?.session_id ?? null
  const mcpStatus = (r1.init?.mcp_servers ?? []).map((s) => `${s.name}:${s.status}`).join(", ") || "(нет серверов)"
  out(`opus · как сегодня (MCP, разговор сохраняется): стена ${r1.wall} мс · duration_ms ${r1.envelope?.duration_ms} · $${r1.envelope?.total_cost_usd} · session_id ${id1 ? "есть" : "НЕТ"} · файл разговора на диске: ${sessionFile(id1)} · MCP: ${mcpStatus}`)
  out(`   ответ: ${JSON.stringify(judge(r1.envelope))}`)

  const r1b = await runClaude(["--resume", id1 ?? "none", "-p", "Какой ключ ты назвал первым? Ответь только ключом.", "--model", "opus", "--output-format", "json", "--strict-mcp-config"])
  out(`   КОНТРОЛЬ НИТИ: --resume того же разговора → код ${r1b.code} · ответ «${String(r1b.envelope?.result ?? r1b.stderr).slice(0, 80)}» · тот же session_id: ${r1b.envelope?.session_id === id1}`)

  // 2. Без сохранения разговора: Opus и Sonnet по два раза, с MCP как в памяти.
  const rows = []
  for (const model of ["opus", "sonnet"]) {
    for (let i = 0; i < 2; i++) {
      const r = await runClaude([...baseArgs(user, model, { persist: false }), "--output-format", "json"])
      const id = r.envelope?.session_id ?? null
      const j = judge(r.envelope)
      rows.push({ model, wall: r.wall, dur: r.envelope?.duration_ms, cost: r.envelope?.total_cost_usd, right: j.right })
      out(`${model} · без сохранения #${i + 1}: стена ${r.wall} мс · duration_ms ${r.envelope?.duration_ms} · $${r.envelope?.total_cost_usd} · верно ${j.right} · session_id в конверте ${id ? "есть" : "нет"} · файл на диске ${sessionFile(id)}`)
      if (model === "opus" && i === 0) {
        const again = await runClaude(["--resume", id ?? "none", "-p", "Какой ключ ты назвал первым?", "--model", "opus", "--output-format", "json", "--strict-mcp-config"])
        out(`   НЕГАТИВ: --resume разговора без сохранения → код ${again.code} · «${String(again.envelope?.result ?? again.stderr).slice(0, 90)}»`)
      }
    }
  }

  // 3. Цена MCP при старте: тот же вызов без MCP-сервера памяти.
  const r3 = await runClaude([...baseArgs(user, "opus", { mcp: false, persist: false }), "--output-format", "json"])
  out(`opus · без сохранения и без MCP: стена ${r3.wall} мс · duration_ms ${r3.envelope?.duration_ms} · $${r3.envelope?.total_cost_usd} · верно ${judge(r3.envelope).right}`)
  return rows
}

// ─────────────────────────────────────────────────────────────────────────────
// G — граф знаний: запись и чтение с нашими словами
// ─────────────────────────────────────────────────────────────────────────────

const ANCHOR = "Зефирин Кракотов"
const FACT = "Зефирин Кракотов служил смотрителем маяка на острове Тарбат с 2003 по 2005 год."
const ABSENT = "Ферапонт Гиацинтов"

function logLines() {
  const files = ["/root/.pm2/logs/fractera-rag-out.log", "/root/.pm2/logs/fractera-rag-error.log"]
  return files.map((f) => { try { return { f, size: statSync(f).size } } catch { return { f, size: 0 } } })
}
function newLogText(before) {
  return before.map(({ f, size }) => {
    try { return execSync(`tail -c +${size + 1} ${f}`, { encoding: "utf8", maxBuffer: 8 << 20 }) } catch { return "" }
  }).join("\n")
}

async function docsOf(prefix) {
  const r = await data("/service/rag/documents", { method: "GET" })
  const all = []
  for (const [status, list] of Object.entries(r.body?.statuses ?? {})) {
    for (const d of list ?? []) all.push({ id: d.id, status, path: String(d.file_path ?? "") })
  }
  return all.filter((d) => d.path.startsWith(prefix))
}

async function measureGraph() {
  out("\n── G: граф знаний ──")
  const source = `${TAG}/graph-${STAMP}`
  const pre = await data(`/service/rag/graph/label/search?q=${encodeURIComponent("Кракотов")}&limit=5`, { method: "GET" })
  out(`до записи метка «Кракотов»: ${JSON.stringify(pre.body)}`)

  const logs = logLines()
  let t = Date.now()
  const w = await data("/service/rag/documents/text", {
    method: "POST",
    body: JSON.stringify({ text: `Относится к: ${ANCHOR}. Откуда это известно: прибор 201-2.\n\n${FACT}`, file_source: source }),
  })
  const acceptedMs = ms(t)
  out(`запись: код ${w.status} · принято за ${acceptedMs} мс · ${JSON.stringify(w.body).slice(0, 120)}`)

  let processedMs = null, lastStatus = null
  for (let i = 0; i < 150; i++) {
    const mine = await docsOf(source)
    lastStatus = mine.map((d) => d.status).join(",") || "(не виден)"
    if (mine.some((d) => d.status === "processed")) { processedMs = ms(t); break }
    if (mine.some((d) => d.status === "failed")) break
    await sleep(2000)
  }
  const logText = newLogText(logs)
  const llmLines = logText.split("\n").filter((l) => /llm|openai|gpt-|extract/i.test(l))
  out(`проиндексировано за ${processedMs ?? "НЕ ДОЖДАЛИСЬ"} мс (статус ${lastStatus}) · строк журнала графа о модели за окно записи: ${llmLines.length}`)
  for (const l of llmLines.slice(0, 4)) out(`   журнал: ${l.slice(0, 160)}`)

  const post = await data(`/service/rag/graph/label/search?q=${encodeURIComponent("Кракотов")}&limit=5`, { method: "GET" })
  out(`после записи метка «Кракотов»: ${JSON.stringify(post.body)}`)

  for (const mode of ["local", "hybrid"]) {
    for (const [who, words] of [[ANCHOR, [ANCHOR]], [ABSENT, [ABSENT]]]) {
      const times = []
      let hit = null, size = null
      for (let i = 0; i < 3; i++) {
        const tq = Date.now()
        const logsQ = logLines()
        const r = await data("/service/rag/query", {
          method: "POST",
          body: JSON.stringify({ query: `что известно про ${who}`, mode, only_need_context: true, enable_rerank: false, hl_keywords: [], ll_keywords: words }),
        })
        times.push(ms(tq))
        const text = String(r.body?.response ?? r.body?.result ?? "")
        hit = text.includes("Тарбат")
        size = text.length
        if (i === 0) {
          const llm = newLogText(logsQ).split("\n").filter((l) => /llm|openai|gpt-/i.test(l)).length
          out(`чтение ${mode} · слова [${who}]: строк журнала о модели ${llm}`)
        }
      }
      out(`чтение ${mode} · слова [${who}]: медиана ${median(times)} мс (${times.join("/")}) · контекст ${size} знаков · «Тарбат» в контексте: ${hit}`)
    }
  }
  return source
}

async function cleanupGraph(source) {
  const mine = await docsOf(source)
  const del = await data("/service/rag/documents/delete_document", { method: "DELETE", body: JSON.stringify({ doc_ids: mine.map((d) => d.id), delete_file: false }) })
  out(`уборка графа: документов ${mine.length} · ответ ${JSON.stringify(del.body).slice(0, 100)}`)
  let left = null
  for (let i = 0; i < 30; i++) {
    left = (await docsOf(source)).length
    if (left === 0) break
    await sleep(2000)
  }
  const label = await data(`/service/rag/graph/label/search?q=${encodeURIComponent("Кракотов")}&limit=5`, { method: "GET" })
  const q = await data("/service/rag/query", {
    method: "POST",
    body: JSON.stringify({ query: `что известно про ${ANCHOR}`, mode: "local", only_need_context: true, enable_rerank: false, hl_keywords: [], ll_keywords: [ANCHOR] }),
  })
  out(`после уборки: документов метки ${left} · метка «Кракотов» ${JSON.stringify(label.body)} · «Тарбат» в контексте: ${String(q.body?.response ?? "").includes("Тарбат")}`)
}

// ─────────────────────────────────────────────────────────────────────────────
// Режим `graph2` — второй проход графа, после того как негатив первого поймал слепоту замера.
//
// ✗ ПЕРВЫЙ ПРОГОН (2026-09-14 22:43 UTC): «Тарбат в контексте» был true и для ОТСУТСТВУЮЩЕЙ сущности —
// граф отдаёт ~60 тыс. знаков ближайшего при любых словах. Значит присутствие слова ничего не доказывает;
// здесь меряется МЕСТО нашей сущности и нашего куска и то, что меняет `top_k` / `chunk_top_k`.
// ─────────────────────────────────────────────────────────────────────────────

function parseContext(text) {
  const entities = []
  for (const m of text.matchAll(/\{"entity": "([^"]+)"/g)) entities.push(m[1])
  const chunkAt = text.indexOf("Тарбат")
  const chunksStart = text.search(/Document Chunks|Chunks/)
  return { entities, chunkAt, chunksStart, size: text.length }
}

async function measureGraph2() {
  out("\n── G2: место нашей сущности в контексте графа ──")
  const source = `${TAG}/graph2-${STAMP}`
  let t = Date.now()
  await data("/service/rag/documents/text", {
    method: "POST",
    body: JSON.stringify({ text: `Относится к: ${ANCHOR}. Откуда это известно: прибор 201-2.\n\n${FACT}`, file_source: source }),
  })
  for (let i = 0; i < 150; i++) {
    if ((await docsOf(source)).some((d) => d.status === "processed")) break
    await sleep(2000)
  }
  out(`проиндексировано за ${ms(t)} мс`)
  for (const cfg of [{}, { top_k: 5, chunk_top_k: 3 }]) {
    for (const mode of ["local", "hybrid"]) {
      for (const who of [ANCHOR, ABSENT, "кто служил смотрителем маяка"]) {
        const tq = Date.now()
        const r = await data("/service/rag/query", {
          method: "POST",
          body: JSON.stringify({ query: `что известно про ${who}`, mode, only_need_context: true, enable_rerank: false, hl_keywords: [], ll_keywords: [who], ...cfg }),
        })
        const c = parseContext(String(r.body?.response ?? ""))
        const place = c.entities.indexOf(ANCHOR)
        out(`${JSON.stringify(cfg)} ${mode} · слова [${who}] · ${ms(tq)} мс · сущностей ${c.entities.length} · «${ANCHOR}» на месте ${place < 0 ? "НЕТ" : place + 1} · первые 3: ${c.entities.slice(0, 3).join(" | ")} · «Тарбат» ${c.chunkAt < 0 ? "нет" : `на знаке ${c.chunkAt} из ${c.size}`}`)
      }
    }
  }
  return source
}

// Режим `mcp` — почему MCP-сервер памяти не стартует в вызове модели. Процесс снимается на строке
// инициализации: ответ модели здесь не нужен, нужен статус серверов.
async function mcpStatus(configPath) {
  return new Promise((resolve) => {
    let buf = ""
    const child = spawn("claude", ["-p", "ok", "--model", "sonnet", "--mcp-config", configPath, "--strict-mcp-config", "--no-session-persistence", "--output-format", "stream-json", "--verbose"],
      { cwd: WORKDIR, env: { ...process.env, HOME: "/root" }, stdio: ["ignore", "pipe", "pipe"] })
    const done = (v) => { try { child.kill("SIGKILL") } catch { /* уже нет */ } resolve(v) }
    const timer = setTimeout(() => done("(инициализации не дождались)"), 60000)
    child.stdout.on("data", (d) => {
      buf += d
      for (const line of buf.split("\n")) {
        try {
          const j = JSON.parse(line)
          if (j.type === "system" && j.subtype === "init") {
            clearTimeout(timer)
            return done((j.mcp_servers ?? []).map((s) => `${s.name}:${s.status}`).join(", ") || "(нет серверов)")
          }
        } catch { /* неполная строка */ }
      }
    })
  })
}

if (process.argv[2] === "mcp") {
  const { writeFileSync } = await import("node:fs")
  const abs = "/tmp/probe-201-2-mcp.json"
  writeFileSync(abs, JSON.stringify({ mcpServers: { memory: { command: "node", args: [join(ROOT, "scripts/agent/memory-tools.mjs")] } } }))
  out(`${MARK} mcp ${new Date().toISOString()}`)
  out(`как сегодня (${join(ROOT, ".mcp.json")}, путь сервера относительный, cwd ${WORKDIR}): ${await mcpStatus(join(ROOT, ".mcp.json"))}`)
  out(`тот же сервер абсолютным путём (${abs}): ${await mcpStatus(abs)}`)
  execSync(`rm -f ${abs}`)
  out(`${MARK} end`)
  process.exit(0)
}

if (process.argv[2] === "graph2") {
  out(`${MARK} graph2 start ${new Date().toISOString()}`)
  let s2 = null
  try { s2 = await measureGraph2() } catch (e) { out(`ОТКАЗ: ${e?.stack ?? e}`) }
  if (s2) await cleanupGraph(s2)
  out(`${MARK} end ${new Date().toISOString()}`)
  process.exit(0)
}

out(`${MARK} start ${new Date().toISOString()} tag=${TAG}`)
let source = null
try {
  const v = await measureVectors()
  const q0 = v.found[0]
  const candidates = q0.keys.slice(0, 8).map((k) => v.rows.find((r) => r.key === k)).filter(Boolean)
  // Замер M меряет цену и форму подбора, а не промах индекса: нужный признак обязан быть в списке.
  if (!candidates.some((r) => r.key === q0.want)) {
    out(`(нужного признака нет в первых 8 — добавлен девятым, чтобы M мерил подбор, а не промах V)`)
    candidates.push(v.rows.find((r) => r.key === q0.want))
  }
  await measureModel(candidates)
  source = await measureGraph()
} catch (e) {
  out(`ОТКАЗ ПРИБОРА: ${e?.stack ?? e}`)
} finally {
  out("\n── уборка ──")
  try { await cleanupVectors() } catch (e) { out(`уборка вектора: ${e}`) }
  if (source) { try { await cleanupGraph(source) } catch (e) { out(`уборка графа: ${e}`) } }
  out(`${MARK} end ${new Date().toISOString()}`)
}
