#!/usr/bin/env node
//
// ОБНОВИТЬ КОПИЮ ОБЪЯВЛЕНИЯ ИЗ ЯДРА (227-2).
//
// 🔒 ОДНА НАЗВАННАЯ КОМАНДА ВМЕСТО «СКОПИРУЙТЕ ФАЙЛ». Инструкция «возьмите файл оттуда и положите
// сюда» исполняется по-разному у разных людей: кто-то забудет переписать sha256, кто-то возьмёт не
// ту ветку. Здесь оба действия — копия и запись её отпечатка — происходят вместе или не происходят
// вовсе.
//
// Запуск: node scripts/sync-core-props.mjs

import { createHash } from "node:crypto"
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const COPY = join(ROOT, "core-vendor", "service-props", "service-props.decl.mjs")
const SOURCE_MD = join(ROOT, "core-vendor", "service-props", "SOURCE.md")

const candidates = [
  process.env.FRACTERA_CORE && join(process.env.FRACTERA_CORE, "service-props", "service-props.decl.mjs"),
  resolve(ROOT, "..", "core", "service-props", "service-props.decl.mjs"),
  resolve(ROOT, "..", "ai-workspace", "core", "service-props", "service-props.decl.mjs"),
].filter(Boolean)

const core = candidates.find((p) => existsSync(p))
if (!core) {
  console.log("🛑 ядро рядом не найдено — обновлять нечем. Искал:\n  " + candidates.join("\n  "))
  process.exit(1)
}

const bytes = readFileSync(core)
writeFileSync(COPY, bytes)
const sha = createHash("sha256").update(bytes).digest("hex")
const version = /PROPS_VERSION = "([^"]+)"/.exec(bytes.toString("utf8"))?.[1] ?? "(не назван)"

const md = readFileSync(SOURCE_MD, "utf8")
  .replace(/(\*\*sha256 копии\*\* \| `)[0-9a-f]{64}(`)/, `$1${sha}$2`)
  .replace(/(\*\*версия объявления\*\* \| `)[^`]+(`)/, `$1${version}$2`)
writeFileSync(SOURCE_MD, md)

console.log(`копия обновлена из ${core}`)
console.log(`версия ${version} · sha256 ${sha}`)
