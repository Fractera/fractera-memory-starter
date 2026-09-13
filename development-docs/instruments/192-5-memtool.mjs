#!/usr/bin/env node
// РУКИ АГЕНТА ПАМЯТИ С ЭТОЙ МАШИНЫ — ДЛЯ ПРОГОНА НАВЫКА (192-5).
//
// 🔒 ПРОГОН НАСТОЯЩИЙ, А НЕ ПЕРЕСКАЗ: вызов уезжает на сервер и исполняется тем
// же MCP-сервером `scripts/agent/memory-tools.mjs`, которым работает агент
// памяти, по живому складу. Подагент видит ровно тот текст, что увидел бы агент.
//
// 🔒 КАЖДЫЙ ВЫЗОВ ПИШЕТСЯ В ЖУРНАЛ — оценка идёт по тому, что агент ДЕЛАЛ, а не
// по тому, что он о себе рассказал (закон 143: модель ошибается в свою пользу).
//
// Запуск (git-bash):
//   node development-docs/instruments/192-5-memtool.mjs --log <файл> <инструмент> '<json аргументов>'

import { appendFileSync, mkdirSync, writeFileSync } from "node:fs"
import { spawnSync } from "node:child_process"
import { dirname, join } from "node:path"
import { tmpdir } from "node:os"

const args = process.argv.slice(2)
let log = ""
if (args[0] === "--log") {
  log = args[1]
  args.splice(0, 2)
}
const [name, raw = "{}"] = args
const ALLOWED = new Set(["find_objects", "open_object", "keep_object", "ask_graph", "search_vectors"])
if (!ALLOWED.has(name)) {
  console.log(`Неизвестный инструмент: ${name}. Есть: ${[...ALLOWED].join(", ")}`)
  process.exit(2)
}
let parsed
try {
  parsed = JSON.parse(raw)
} catch {
  console.log("Аргументы не JSON.")
  process.exit(2)
}

// JSON едет base64 — никаких кавычек через три оболочки (закон SSH через stdin-файл).
const msg = JSON.stringify({ id: 1, jsonrpc: "2.0", method: "tools/call", params: { arguments: parsed, name } })
const b64 = Buffer.from(msg, "utf8").toString("base64")
const remote = [
  "cd /opt/fractera/memory",
  `{ echo ${b64} | base64 -d; echo; } | timeout 90 node scripts/agent/memory-tools.mjs > /tmp/memtool-$$.out 2>&1`,
  "echo ===MEMTOOL_BEGIN===",
  `base64 -w0 /tmp/memtool-$$.out; rm -f /tmp/memtool-$$.out`,
  "echo",
  "echo ===MEMTOOL_END===",
].join("\n")

const file = join(tmpdir(), `memtool-${process.pid}-${Date.now()}.sh`)
writeFileSync(file, `${remote}\n`)
const wslPath = file.replace(/^([A-Za-z]):\\/, (_, d) => `/mnt/${d.toLowerCase()}/`).replace(/\\/g, "/")
const r = spawnSync(
  "wsl",
  ["--", "bash", "-c", `bash /mnt/c/Users/Usuario/Documents/code/scripts/ssh-fractera.sh < '${wslPath}'`],
  { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 },
)
const out = String(r.stdout ?? "")
const m = out.match(/===MEMTOOL_BEGIN===\s*([A-Za-z0-9+/=]*)\s*===MEMTOOL_END===/)
let text
if (!m) text = `Вызов не дошёл до сервера (нет маркера). ${String(r.stderr ?? "").slice(0, 200)}`
else {
  const body = Buffer.from(m[1], "base64").toString("utf8").trim()
  try {
    const j = JSON.parse(body.split("\n").pop())
    text = j.result?.content?.[0]?.text ?? `Ошибка: ${JSON.stringify(j.error)}`
  } catch {
    text = `Ответ не разобран: ${body.slice(0, 300)}`
  }
}
console.log(text)
if (log) {
  mkdirSync(dirname(log), { recursive: true })
  appendFileSync(log, `### ${new Date().toISOString()} ${name} ${JSON.stringify(parsed)}\n${text}\n\n`)
}
