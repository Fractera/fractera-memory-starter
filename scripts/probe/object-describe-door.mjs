#!/usr/bin/env node
// ПРИБОР 194-2: ДВЕРЬ «ПОЛУЧИТЬ ОПИСАНИЕ» НА НАСТОЯЩИХ ФАЙЛАХ.
//
// 🔒 ИДЁТ В НАСТОЯЩУЮ ДВЕРЬ, А НЕ В ФУНКЦИЮ: так проверяются сразу маршрут, привратник (`SELF_GUARDED`)
// и замок `benchGuard` — тем же путём, каким пойдёт экран. Ключ — секрет машины.
// 🔒 НЕГАТИВНЫЙ КОНТРОЛЬ: файл неописываемого рода обязан получить отказ быстрее секунды — значит
// модель не звалась и ход подписки не потрачен.
// 🛑 ЦЕНА ПРОГОНА: 3 хода Claude по подписке + 1 расшифровка OpenAI. Подагентов нет.
// 🛑 ПОЛНОЕ ОПИСАНИЕ НЕ ПЕЧАТАЕТСЯ — только название, саммари и длина: голосовое владельца —
// его личная запись, и её содержимое целиком в отчёт не уходит.
//
// Запуск на сервере: node scripts/probe/object-describe-door.mjs

import { readdirSync, readFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { basename, join } from "node:path"

const BASE = process.env.MEMORY_URL ?? "http://127.0.0.1:3700"
const CORPUS = process.env.CORPUS_DIR ?? "/tmp/obj-corpus"

function machineEnv(name) {
  try {
    for (const line of readFileSync("/etc/fractera/secrets.env", "utf8").split("\n")) {
      const i = line.indexOf("=")
      if (i > 0 && line.slice(0, i).trim() === name) return line.slice(i + 1).trim().replace(/^["']|["']$/g, "")
    }
  } catch { /* вне сервера — пусто */ }
  return ""
}
const KEY = process.env.DATA_SECRET || machineEnv("DATA_SECRET")

let failed = 0
const say = (ok, text) => {
  if (!ok) failed++
  console.log(`${ok ? "✓" : "✗"} ${text}`)
}

const pdf = readdirSync(join(CORPUS, "docs")).find((n) => n.toLowerCase().endsWith(".pdf"))
const CASES = [
  { kind: "image", mime: "image/png", path: join(CORPUS, "mac_mini.png") },
  { kind: "pdf", mime: "application/pdf", path: pdf ? join(CORPUS, "docs", pdf) : "" },
  { kind: "audio", mime: "audio/ogg", path: "/opt/fractera/services/data/storage/dedb80be-4867-4c9a-9fe1-5bb965b41335.oga" },
]

async function door(bytes, name, mime) {
  const form = new FormData()
  form.append("file", new Blob([bytes], { type: mime }), name)
  const started = Date.now()
  const res = await fetch(`${BASE}/api/fractera/object-test/describe`, {
    body: form,
    headers: { "x-data-secret": KEY },
    method: "POST",
  })
  const type = res.headers.get("content-type") ?? ""
  const body = type.includes("json") ? await res.json() : { html: (await res.text()).slice(0, 80) }
  return { body, ms: Date.now() - started, status: res.status }
}

const wordsOf = (s) => String(s ?? "").trim().split(/\s+/).filter(Boolean).length
const describeDirs = () => readdirSync(tmpdir()).filter((n) => n.startsWith("memory-describe-"))

console.log("===PROBE_DESCRIBE===")
say(Boolean(KEY), "секрет машины найден")
const dirsBefore = describeDirs().length

// Негатив первым: он дешёвый и доказывает, что дверь отвечает JSON, а не страницей входа.
const neg = await door(new Uint8Array([77, 90, 144, 0, 3, 0]), "setup.exe", "application/x-msdownload")
say(
  neg.status === 400 && neg.body.error === "describe-kind-unsupported" && neg.ms < 1000,
  `негатив .exe: ${neg.status} ${JSON.stringify(neg.body)} за ${neg.ms} мс`,
)

for (const c of CASES) {
  if (!c.path) {
    say(false, `${c.kind}: нет файла в корпусе`)
    continue
  }
  const bytes = readFileSync(c.path)
  const r = await door(bytes, basename(c.path), c.mime)
  const b = r.body
  console.log(`\n--- ${c.kind}: ${basename(c.path)} (${bytes.length} байт) → ${r.status} за ${r.ms} мс`)
  if (!b.ok) {
    say(false, `${c.kind}: отказ ${JSON.stringify(b).slice(0, 200)}`)
    continue
  }
  const n = wordsOf(b.summary)
  console.log(`  род: ${b.kind} · кем: ${b.described_by} · язык: ${b.language}`)
  console.log(`  название: ${b.title}`)
  console.log(`  саммари (${n} слов): ${b.summary}`)
  console.log(`  полное описание: ${b.full.length} знаков · теги: ${b.tags.join(", ")} · якоря: ${b.anchors.join(", ")}`)
  say(b.kind === c.kind, `${c.kind}: род распознан как ${b.kind}`)
  say(n >= 35 && n <= 70, `${c.kind}: саммари ${n} слов (ждём 35–70)`)
  say(b.full.length > b.summary.length * 3, `${c.kind}: полное описание подробнее саммари (${b.full.length} против ${b.summary.length} знаков)`)
  if (c.kind === "audio") {
    say(/whisper/.test(b.described_by), `audio: речь расшифровал OpenAI (${b.described_by})`)
    const stamps = b.full.match(/\[\d{1,2}:\d{2}(:\d{2})?–\d{1,2}:\d{2}(:\d{2})?\]/g) ?? []
    say(stamps.length > 0, `audio: метки времени дошли до полного описания (${stamps.length}, первая ${stamps[0] ?? "—"})`)
  }
}

say(describeDirs().length === dirsBefore, `временные папки описания стёрты (было ${dirsBefore}, стало ${describeDirs().length})`)
console.log(failed ? `\n✗ ПРОВАЛ: ${failed}` : "\n✓ OK")
console.log("===PROBE_DESCRIBE_END===")
