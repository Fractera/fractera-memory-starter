#!/usr/bin/env node
//
// ПРИБОР 207-9: ПАМЯТЬ СНАРУЖИ, КАК ЧУЖАЯ ПРОГРАММА.
//
// 🔒 ПУТЬ ИМЕННО ЧУЖОЙ, А НЕ СВОЕГО ПРОЦЕССА: публичный домен и ключ памяти `fmk_…`, а не петля и
// не секрет машины. Свой процесс проходит мимо nginx и мимо замка ключа — и доказывает не то, чем
// пользуется человек.
//
// 🔒 ЗДЕСЬ ЖЕ ДОКАЗЫВАЕТСЯ ТО, ЧЕГО НЕЛЬЗЯ БЫЛО ДОКАЗАТЬ НА МАШИНЕ РАЗРАБОТЧИКА: живая строка
// вопроса, живое имя ответа и живой путь источника в базе. Приборы подшагов честно говорили, что
// слоя данных у них нет; долг закрывается тут.
//
// Запуск: MEMORY_KEY=fmk_… node scripts/probe/v1-live-three-verbs.mjs [https://memory.aifa.dev]

const BASE = (process.argv[2] ?? process.env.MEMORY_BASE ?? "https://memory.aifa.dev").replace(/\/$/, "")
const KEY = process.env.MEMORY_KEY ?? ""
const HEAD = { "Content-Type": "application/json", "x-memory-key": KEY }

let failed = 0
const say = (ok, what, got = "") => {
  if (!ok) failed++
  console.log(`${ok ? "✓" : "🛑"} ${what}${got ? ` → ${got}` : ""}`)
}

const post = async (path, body, headers = HEAD) => {
  const r = await fetch(`${BASE}${path}`, { body: JSON.stringify(body), headers, method: "POST" })
  const j = await r.json().catch(() => ({}))
  return { body: j, status: r.status }
}
const get = async (path) => {
  const r = await fetch(`${BASE}${path}`, { headers: { "x-memory-key": KEY } })
  const j = await r.json().catch(() => ({}))
  return { body: j, status: r.status }
}

console.log("===PROBE_207_9===")
console.log(`адрес ${BASE}, ключ ${KEY ? "есть" : "НЕТ"}`)
say(Boolean(KEY), "ключ памяти передан")

// ── 1. ДОГОВОР: ТРИ ГЛАГОЛА ──────────────────────────────────────────────────
const c = await get("/v1/contract")
const verbs = (c.body.methods ?? []).map((m) => m.name).sort()
say(c.body.version === "5.0.0", "версия договора", String(c.body.version))
say(verbs.join(",") === "feedback,recall,remember", "глаголов ровно три", verbs.join(", "))
const paths = (c.body.catalogue ?? []).map((x) => x.path)
say(paths.includes("GET /v1/sources"), "каталог источников объявлен", paths.join(" · "))

// ── 2. НЕГАТИВНЫЙ КОНТРОЛЬ ЗАМКА ─────────────────────────────────────────────
// 🔒 Без него «дверь ответила 200» не значит ничего: она ответила бы всем.
const noKey = await post("/v1/recall", { text: "кто угодно" }, { "Content-Type": "application/json" })
say(noKey.status === 401, "без ключа дверь отвечает 401", String(noKey.status))

// ── 3. НЕЗНАКОМАЯ СЛУЖБА ОТВЕРГАЕТСЯ ─────────────────────────────────────────
const stranger = await post("/v1/remember", { from: ["chatt"], text: "проверка источника" })
say(stranger.body.error === "unknown-service", "незнакомая служба отвергнута", String(stranger.body.error))

// ── 4. СКАЗАТЬ ───────────────────────────────────────────────────────────────
const stamp = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14)
const said = await post("/v1/remember", {
  from: ["memory", "probe", `run-${stamp}`],
  text: `Прибор 207-9 ${stamp}: такси от аэропорта стоило 40 евро.`,
})
say(said.status === 200 && said.body.ok === true, "«Сказать» принято", String(said.body.what_happened ?? said.body.error))
say(typeof said.body.answer_id === "string", "у ответа есть имя", String(said.body.answer_id))

// ── 5. СПРОСИТЬ ──────────────────────────────────────────────────────────────
const asked = await post("/v1/recall", { from: ["memory", "probe"], text: "сколько стоило такси" })
say(asked.status === 200 && asked.body.ok === true, "«Спросить» ответило", String(asked.body.what_happened ?? asked.body.error))
say(typeof asked.body.answer_id === "string", "у ответа на вопрос тоже есть имя", String(asked.body.answer_id))
say(
  ["affirmative", "presumed", "depends", undefined].includes(asked.body.certainty),
  "твёрдость ответа названа или честно отсутствует",
  String(asked.body.certainty),
)

// ── 6. ПРОКОММЕНТИРОВАТЬ ─────────────────────────────────────────────────────
const fb = await post("/v1/feedback", {
  about: asked.body.answer_id,
  from: ["memory", "probe"],
  text: "ответ по делу, но хотелось бы короче",
})
say(fb.status === 200 && fb.body.ok === true, "отзыв принят", String(fb.body.what_happened ?? fb.body.error))
// 🔒 СОСТОЯНИЕ ЭВОЛЮЦИИ ИЗМЕНИЛОСЬ ВМЕСТЕ С ПРАВДОЙ (213-1): было "not-built", пока с комментарием
// не происходило ничего; стало "collected" — он собирается в сигналы. Прибор, проверяющий прежнюю
// правду, объявил бы построенное поломкой.
say(fb.body.evolution === "collected", "состояние эволюции названо честно", String(fb.body.evolution))

const fbBad = await post("/v1/feedback", { about: "ans_999999999", text: "о несуществующем" })
say(fbBad.body.error === "unknown-answer", "отзыв о несуществующем ответе отвергнут", String(fbBad.body.error))

// ── 7. КАТАЛОГИ ──────────────────────────────────────────────────────────────
const src = await get("/v1/sources")
const mine = (src.body.sources ?? []).find((s) => String(s.path).startsWith("memory/probe"))
say(src.status === 200 && Boolean(mine), "путь источника прибора виден в каталоге", mine ? mine.path : "не найден")
say((src.body.services ?? []).includes("memory"), "служба выделена из пути", (src.body.services ?? []).join(", "))

const jr = await get("/v1/journal")
say(jr.status === 200 && typeof jr.body.text === "string", "журнал отдаётся адресом", String(jr.status))

// ── 8. СНЯТОЕ БОЛЬШЕ НЕ ОТВЕЧАЕТ ─────────────────────────────────────────────
// 🔒 Полнота снятия доказывается ОТСУТСТВИЕМ старого, а не присутствием нового.
for (const gone of ["keep_object", "find_objects", "open_object", "people", "journal", "forget_journal"]) {
  const r = await post(`/v1/${gone}`, {})
  say(r.status === 501, `${gone} отвечает «не построено»`, String(r.status))
}

console.log(failed === 0 ? "\n===PROBE_OK=== все случаи сошлись" : `\n===PROBE_FAIL=== не сошлось: ${failed}`)
process.exit(failed === 0 ? 0 : 1)
