// ПРИБОР 189-5 — КОРПУС СЛУЧАЕВ И ВЕРДИКТ ЧЕЛОВЕКА.
//
// 🎯 ЧТО ДОКАЗЫВАЕТСЯ: прогон ложится в корпус вместе со своей ценой, вердикт
// прикрепляется к нему кнопкой человека, а прогон без вердикта числится
// НЕЗАВЕРШЁННЫМ и в долю удачных не входит.
//
// 🔒 ПОСЛЕДНЕЕ — ГЛАВНОЕ, И ОНО ЖЕ САМОЕ ЛЁГКОЕ ДЛЯ МОЛЧАЛИВОЙ ОШИБКИ. Посчитай
// мы несудимые прогоны удачными, доля удачных росла бы от того, что человек
// отошёл от экрана, — и сравнивать по ней версии навыков было бы нельзя.
//
// 🛑 ПРИБОР УБИРАЕТ ЗА СОБОЙ ПО СВОЕЙ МЕТКЕ В ТЕКСТЕ ВОПРОСА, А НЕ ЧИСТИТ
// ТАБЛИЦУ. В соседней службе прибор, стиравший таблицы целиком, снёс живую
// память владельца, и снаружи это было неотличимо от «памяти никогда не было».
//
// Запуск на сервере: node scripts/probe/bench-cases.mjs

import { readFileSync } from "node:fs"

const MARK = "===PROBE_189_5==="
const BASE = process.env.MEMORY_URL ?? "http://127.0.0.1:3700"
const stamp = Date.now()
const TAG = `probe-189-5-${stamp}`

// 🔒 ПРИБОР — СВОЙ ПРОЦЕСС НА ЭТОЙ МАШИНЕ, И ХОДИТ ОН СЕКРЕТОМ МАШИНЫ (исправлено
// 2026-09-12 по слову владельца о едином стандарте). ✗ Прежде он ходил ключом
// памяти — тем, что выдают ЧУЖИМ инструментам, — и этим двери стенда
// превращались во вторую публичную дверь мимо договора.
const key = (() => {
  try {
    const file = process.env.FRACTERA_MACHINE_ENV || "/etc/fractera/secrets.env"
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      const i = line.indexOf("=")
      if (i > 0 && line.slice(0, i).trim() === "DATA_SECRET") {
        return line.slice(i + 1).trim().replace(/^["']|["']$/g, "")
      }
    }
  } catch { /* нет файла — скажем об этом ниже */ }
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

const call = (path, init = {}, withKey = true) => {
  const headers = { "Content-Type": "application/json", ...(init.headers ?? {}) }
  if (withKey) headers["x-data-secret"] = key
  return fetch(`${BASE}${path}`, { ...init, headers }).then(async (r) => {
    const text = await r.text()
    try {
      return { json: JSON.parse(text), status: r.status }
    } catch {
      return { json: { notJson: text.slice(0, 120) }, status: r.status }
    }
  })
}

console.log(MARK)

// ── СНИМОК «ДО» ─────────────────────────────────────────────────────────────
// 🔒 Разница — вот что доказывает рост; вторую её половину задним числом уже не
// взять. Снимается ДО работы, а не вспоминается в конце.
const before = await call("/api/fractera/bench-cases", { method: "GET" })
say(before.status === 200 && before.json.ok === true, `корпус читается: ${before.status}`)
const totalBefore = Number(before.json.summary?.total ?? 0)
const goodBefore = Number(before.json.summary?.good ?? 0)
const pendingBefore = Number(before.json.summary?.pending ?? 0)
console.log(`  до: всего ${totalBefore}, удачных ${goodBefore}, без вердикта ${pendingBefore}`)

// ── ПРОГОН ЛОЖИТСЯ В КОРПУС САМ ─────────────────────────────────────────────
const asked = await call("/api/fractera/graph-search", {
  body: JSON.stringify({ question: `кто держит мастерскую ${TAG}` }),
  method: "POST",
})
say(asked.status === 200, `вопрос задан: ${asked.status}`)
const caseId = Number(asked.json.caseId ?? 0)
say(caseId > 0, `прогон записан в корпус под номером ${caseId || "—"}`)

const mid = await call("/api/fractera/bench-cases", { method: "GET" })
const midSum = mid.json.summary ?? {}
say(Number(midSum.total) === totalBefore + 1, `прогонов стало на один больше: ${midSum.total}`)

// 🔒 ГЛАВНАЯ ПРОВЕРКА: НЕСУДИМЫЙ ПРОГОН — НЕ УДАЧНЫЙ.
say(
  Number(midSum.good) === goodBefore && Number(midSum.pending) === pendingBefore + 1,
  `без вердикта прогон НЕ считается удачным: удачных ${midSum.good} (было ${goodBefore}), ждут вердикта ${midSum.pending}`,
)

// ── ВЕРДИКТ ЧЕЛОВЕКА ────────────────────────────────────────────────────────
const voted = await call("/api/fractera/bench-cases", {
  body: JSON.stringify({ id: caseId, verdict: "good", why: "прибор 189-5" }),
  method: "POST",
})
say(voted.status === 200, `вердикт принят: ${voted.status}`)

const after = await call("/api/fractera/bench-cases", { method: "GET" })
const sum = after.json.summary ?? {}
say(
  Number(sum.good) === goodBefore + 1 && Number(sum.pending) === pendingBefore,
  `вердикт изменил сводку: удачных ${sum.good}, ждут вердикта ${sum.pending}`,
)

const mine = (after.json.cases ?? []).find((c) => Number(c.id) === caseId)
say(
  mine && mine.verdict === "good" && Number(mine.ask_ms) > 0,
  `у случая есть И вердикт, И цена: ${mine?.verdict}, ${mine?.ask_ms} мс`,
)

// ── НЕГАТИВНЫЕ КОНТРОЛИ ─────────────────────────────────────────────────────
const nonsense = await call("/api/fractera/bench-cases", {
  body: JSON.stringify({ id: caseId, verdict: "может быть" }),
  method: "POST",
})
say(nonsense.status === 400, `промежуточный вердикт отвергнут: ${nonsense.status}`)

const noCase = await call("/api/fractera/bench-cases", {
  body: JSON.stringify({ verdict: "good" }),
  method: "POST",
})
say(noCase.status === 400 && noCase.json.error === "no-case", `вердикт без прогона отвергнут: ${noCase.status}`)

const wipe = await call("/api/fractera/bench-cases?mark=", { method: "DELETE" })
say(
  wipe.status === 400 && wipe.json.error === "empty-mark",
  `уборка без метки ЗАПРЕЩЕНА (иначе стёрся бы весь корпус): ${wipe.status}`,
)

const noKey = await call("/api/fractera/bench-cases", { method: "GET" }, false)
say(noKey.status === 401 || noKey.status === 403 || noKey.status === 307, `без секрета машины отказ: ${noKey.status}`)

// ── УБОРКА ПО СВОЕЙ МЕТКЕ ───────────────────────────────────────────────────
const gone = await call(`/api/fractera/bench-cases?mark=${encodeURIComponent(TAG)}`, { method: "DELETE" })
say(gone.status === 200, `уборка по метке ${TAG}: ${gone.status}`)

const end = await call("/api/fractera/bench-cases", { method: "GET" })
say(
  Number(end.json.summary?.total) === totalBefore,
  `корпус вернулся к прежнему размеру: ${end.json.summary?.total} = ${totalBefore}`,
)

// Заодно убираем документ, посеянный вопросом (метка bench/ жёстко наша).
await call("/api/fractera/graph-search", { method: "DELETE" })

console.log("")
console.log(bad === 0 ? `${MARK}OK` : `${MARK}ПРОВАЛ: ${bad}`)
process.exit(bad === 0 ? 0 : 1)
