// ПРИБОР 202-2 — ТЕРМИНАЛ МАСТЕРСКОЙ: СПИТ, ПЕРЕЖИВАЕТ УХОД, ОСТАНАВЛИВАЕТСЯ.
//
// 🔒 ДВЕ ПЛОСКОСТИ, НАЗВАННЫЕ ЗАРАНЕЕ (ТЗ 202-2):
//   A — живой путь на сервере через те же двери, что у страницы: статус → билет → сокет `/pty` с `start` →
//       процесс жив → сокет закрыт → через 5 с процесс жив → повторное подключение без `start` получает накопленный
//       экран → остановка → процесс мёртв;
//   B — негатив: подключение без `start` к спящей службе процесс НЕ рождает.
//
// 🛑 ЧТО ПРИБОР ДЕЛАЕТ С МАШИНОЙ: запускает оболочку строителя и сам её останавливает. Модели вопросов не задаёт —
// квота подписки общая с ботом. В конце печатает, что процессов строителя не осталось.
//
// Запуск на сервере из корня службы:  node scripts/probe/build-session-202-2.mjs

import { execSync } from "node:child_process"
import { readFileSync } from "node:fs"
import WebSocket from "ws"

const BASE = process.env.MEMORY_URL ?? "http://127.0.0.1:3700"
const WS = BASE.replace(/^http/, "ws") + "/pty"

function machineEnv(name) {
  try {
    for (const line of readFileSync("/etc/fractera/secrets.env", "utf8").split("\n")) {
      const i = line.indexOf("=")
      if (i > 0 && line.slice(0, i).trim() === name) return line.slice(i + 1).trim().replace(/^["']|["']$/g, "")
    }
  } catch { /* вне сервера */ }
  return process.env[name] ?? ""
}
const SECRET = machineEnv("DATA_SECRET")

let bad = 0
const say = (ok, what) => {
  if (!ok) bad += 1
  console.log(`${ok ? "✓" : "✗"} ${what}`)
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const alive = (pid) => {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}
const builders = () => {
  try {
    // ✗ ПЕРВЫЙ ПРОГОН: `pgrep -f 'settings.build.json'` находил СЕБЯ — строка оболочки, запустившей его, содержит тот
    // же образец, — и прибор печатал «1 строитель» при нуле. Скобка в образце не совпадает с собственной строкой.
    return execSync("pgrep -f '[s]ettings.build.json' | wc -l", { encoding: "utf8" }).trim()
  } catch {
    return "0"
  }
}

async function door(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    body: body ? JSON.stringify(body) : undefined,
    headers: { "Content-Type": "application/json", "x-data-secret": SECRET },
    method,
  })
  return { json: await res.json().catch(() => null), status: res.status }
}

async function ticket() {
  const r = await door("POST", "/api/fractera/pty-ticket")
  return r.json?.ticket ?? ""
}

/** Открыть сокет мастерской; вернуть принятое и причину закрытия. */
function open({ start, holdMs }) {
  return new Promise(async (resolve) => {
    const t = await ticket()
    const ws = new WebSocket(WS)
    // ✗ ПЕРВЫЙ ПРОГОН ЧИТАЛ ПРИЧИНУ ЗАКРЫТИЯ ИЗ СНИМКА, СДЕЛАННОГО ДО ЗАКРЫТИЯ, и печатал «undefined». Состояние
    // сокета теперь живёт в объекте, который обновляется, а не копируется в момент возврата.
    const seen = { closed: null, received: "", ws }
    ws.on("open", () => {
      ws.send(JSON.stringify({ mode: "build", start, ticket: t, type: "init" }))
      ws.send(JSON.stringify({ cols: 120, rows: 32, type: "resize" }))
    })
    ws.on("message", (d) => {
      seen.received += d.toString()
    })
    ws.on("close", (code, reason) => {
      seen.closed = { code, reason: reason.toString() }
    })
    await sleep(holdMs)
    resolve(seen)
  })
}

console.log(`===PROBE_202_2=== start ${new Date().toISOString()}`)

// ── исходное состояние ───────────────────────────────────────────────────────
let st = await door("GET", "/api/fractera/build-session")
if (st.json?.running) {
  console.log("   до прибора сессия уже шла — останавливаю, чтобы мерить с нуля")
  await door("POST", "/api/fractera/build-session", { action: "stop" })
  await sleep(1500)
  st = await door("GET", "/api/fractera/build-session")
}
say(st.status === 200 && st.json?.running === false, `статус до запуска: ${st.status} ${JSON.stringify(st.json)}`)
say(builders() === "0", `процессов строителя до запуска: ${builders()}`)

// ── B: подключение без start к спящей службе ─────────────────────────────────
const peek = await open({ holdMs: 2500, start: false })
st = await door("GET", "/api/fractera/build-session")
say(peek.closed?.reason === "not-running", `НЕГАТИВ: подключение без запуска закрыто с причиной «${peek.closed?.reason}»`)
say(st.json?.running === false && builders() === "0", `   и процесса не родило: running=${st.json?.running}, строителей ${builders()}`)

// ── A: запуск ─────────────────────────────────────────────────────────────────
const first = await open({ holdMs: 6000, start: true })
st = await door("GET", "/api/fractera/build-session")
const pid = st.json?.pid
say(st.json?.running === true && alive(pid), `запуск: running=${st.json?.running}, pid ${pid} жив=${alive(pid)}, вывода ${st.json?.bytes} байт`)
say(first.received.length > 0, `   экран пришёл по сокету: ${first.received.length} байт`)
// 🔒 КОНТРОЛЬ САМОГО СЧЁТЧИКА: исправленный образец обязан ВИДЕТЬ живого строителя, иначе «0» выше доказывает слепоту.
say(Number(builders()) >= 1, `   счётчик видит живого строителя: ${builders()}`)
// 🔒 202-9: папка, которую называет страница, — это папка, в которой процесс ДЕЙСТВИТЕЛЬНО работает (а не то, что написано в коде).
let cwd = ""
try {
  cwd = execSync(`readlink /proc/${pid}/cwd`, { encoding: "utf8" }).trim()
} catch { /* нет процесса — проверка ниже провалится */ }
const pageRes = await fetch(`${BASE}/ru/build?section=terminal`, { headers: { "x-data-secret": SECRET } })
const named = (await pageRes.text()).match(/ data-build-workspace="([^"]+)"/)?.[1] ?? ""
say(cwd !== "" && cwd === named, `   процесс работает в папке «${cwd}», страница называет «${named}»`)

// ── A: уход со вкладки ────────────────────────────────────────────────────────
first.ws.close()
await sleep(5000)
st = await door("GET", "/api/fractera/build-session")
say(st.json?.running === true && alive(pid) && st.json?.clients === 0, `сокет закрыт 5 с назад: running=${st.json?.running}, pid жив=${alive(pid)}, подключённых ${st.json?.clients}`)

// ── A: возврат на вкладку ─────────────────────────────────────────────────────
const back = await open({ holdMs: 2500, start: false })
st = await door("GET", "/api/fractera/build-session")
say(back.closed === null && back.received.length > 0, `возврат без запуска подключился и получил прежний экран: ${back.received.length} байт`)
say(st.json?.pid === pid, `   это тот же процесс: pid ${st.json?.pid} = ${pid}`)

// ── A: остановка ─────────────────────────────────────────────────────────────
const stopped = await door("POST", "/api/fractera/build-session", { action: "stop" })
await sleep(2500)
st = await door("GET", "/api/fractera/build-session")
say(stopped.json?.was === true && st.json?.running === false, `остановка: was=${stopped.json?.was}, статус running=${st.json?.running}`)
say(!alive(pid), `   процесс ${pid} мёртв: ${!alive(pid)}`)
say(back.closed?.reason === "stopped", `   подключённый сокет узнал причину: «${back.closed?.reason}»`)
// ✗ ПРОГОН 2026-09-15 09:51 ДАЛ «1» ЧЕРЕЗ 2,5 С, А МИНУТУ СПУСТЯ — «0»: Claude Code выходит по обрыву терминала не мгновенно. Фиксированная
// пауза меряла скорость выхода, а не факт. Ждём по факту до 20 с и печатаем, сколько ушло.
const stopAt = Date.now()
while (builders() !== "0" && Date.now() - stopAt < 20000) await sleep(500)
say(builders() === "0", `процессов строителя после остановки: ${builders()} (вышел за ${((Date.now() - stopAt) / 1000 + 2.5).toFixed(1)} с после «Остановить»)`)

console.log(`===PROBE_202_2=== ${bad ? `ПРОВАЛОВ: ${bad}` : "всё сошлось"} ${new Date().toISOString()}`)
process.exit(bad ? 1 : 0)
