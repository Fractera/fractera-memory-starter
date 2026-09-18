#!/usr/bin/env node
//
// СТОРОЖ КОПИИ ОБЪЯВЛЕНИЯ ИЗ ЯДРА (227-2).
//
// 🔒 ДВА РАЗНЫХ ВОПРОСА, И ОНИ НЕ ЗАМЕНЯЮТ ДРУГ ДРУГА:
//   1) цела ли копия — сверка с sha256 из `SOURCE.md`; работает ВСЕГДА, ловит правку руками;
//   2) не отстала ли она от ядра — сверка с файлом ядра; работает, когда ядро достижимо.
//
// 🛑 НЕДОСТИЖИМОЕ ЯДРО — НЕ ОТКАЗ, А НЕИЗВЕСТНОСТЬ. У службы, уехавшей к клиенту, ядра рядом нет по
// устройству; ронять ей сборку значило бы наказывать за нормальное состояние. Но и молчать нельзя:
// молчание неотличимо от «проверено, сходится». Поэтому — громкая строка и нулевой код возврата.

import { createHash } from "node:crypto"
import { existsSync, readFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const COPY = join(ROOT, "core-vendor", "service-props", "service-props.decl.mjs")
const SOURCE_MD = join(ROOT, "core-vendor", "service-props", "SOURCE.md")

let failed = 0
const say = (ok, what, got = "") => {
  if (!ok) failed++
  console.log(`${ok ? "✓" : "🛑"} ${what}${got ? ` → ${got}` : ""}`)
}

if (!existsSync(COPY)) {
  console.log("🛑 копии объявления нет: core-vendor/service-props/service-props.decl.mjs")
  process.exit(1)
}

const bytes = readFileSync(COPY)
const sha = createHash("sha256").update(bytes).digest("hex")

// ── 1. Цела ли копия ────────────────────────────────────────────────────────
const recorded = /sha256 копии\*\* \| `([0-9a-f]{64})`/.exec(readFileSync(SOURCE_MD, "utf8"))?.[1]
say(Boolean(recorded), "в SOURCE.md записан sha256 копии")
if (recorded) {
  say(
    recorded === sha,
    "копия цела — совпадает с записанным sha256",
    recorded === sha ? "" : `правлена руками; вернуть: node scripts/sync-core-props.mjs`,
  )
}

// ── 2. Не отстала ли она от ядра ────────────────────────────────────────────
// Порядок поиска назван явно: переменная окружения · сервер (/opt/fractera/core) · дерево платформы.
const candidates = [
  process.env.FRACTERA_CORE && join(process.env.FRACTERA_CORE, "service-props", "service-props.decl.mjs"),
  resolve(ROOT, "..", "core", "service-props", "service-props.decl.mjs"),
  resolve(ROOT, "..", "ai-workspace", "core", "service-props", "service-props.decl.mjs"),
].filter(Boolean)

const core = candidates.find((p) => existsSync(p))
if (!core) {
  console.log("· ядро рядом не найдено — ОТСТАВАНИЕ НЕ ПРОВЕРЕНО (это не отказ: у службы вне")
  console.log("  платформы ядра нет по устройству). Искал: " + candidates.join(" · "))
} else {
  const same = readFileSync(core).equals(bytes)
  say(same, `копия не отстала от ядра (${core})`, same ? "" : "ядро ушло вперёд: node scripts/sync-core-props.mjs")
}

console.log(failed === 0 ? "✓ объявление из ядра на месте" : `🛑 не сошлось: ${failed}`)
process.exit(failed === 0 ? 0 : 1)
