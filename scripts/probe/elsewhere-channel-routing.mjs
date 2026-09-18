#!/usr/bin/env node
//
// ПРИБОР 226-1: ОТВЕТ УХОДИТ В ТОМ КАНАЛЕ, КОТОРЫМ ПРИШЛА ПРОСЬБА.
//
// 🎯 СЛУЧАЙ ВЛАДЕЛЬЦА 2026-09-18: «если существует Telegram чат то ссылку надо будет кидать не на
// сайт а на Telegram чат чтобы внутри телеграмма перейти с одного чата на другой».
//
// 🔒 ПРОВЕРЯЕТСЯ НА СВОЁМ РЕЕСТРЕ-ОБРАЗЦЕ (`SERVICES_FILE`), А НЕ НА БОЕВОМ. Боевой заполняется
// руками и имён ботов в нём пока нет: прибор, который ждёт там живых данных, будет красным по
// причине незаполненного файла, а не сломанного кода. Тот же приём, что у сторожа реестра, —
// заведомо подготовленный вход.

import { mkdtempSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..")

let failed = 0
const check = (ok, what, got = "") => {
  if (!ok) failed++
  console.log(`${ok ? "✓" : "🛑"} ${what}${got ? ` → ${got}` : ""}`)
}

// ── реестр-образец: у службы входа есть Telegram, у панели его нет ──────────
const fixture = {
  about: "Fixture registry for probe 226-1. Not a real server.",
  root: "app",
  services: [
    {
      about: "Memory service of this probe.",
      api: "https://memory.<domain>",
      auth: "own",
      author: "fractera",
      channels: { telegram: { bot: "@probe_memory_bot", url: "https://t.me/probe_memory_bot" } },
      for_sale: false,
      id: "memory",
      manage: "https://memory.<domain>/ru/build",
      port: 3700,
      price: null,
      subdomain: "memory",
      topics: ["память", "запомни"],
    },
    {
      about: "Sign-in service of this probe.",
      api: "https://auth.<domain>",
      auth: "provider",
      author: "fractera",
      channels: { telegram: { bot: "@probe_auth_bot", url: "https://t.me/probe_auth_bot" } },
      for_sale: false,
      id: "auth",
      manage: "https://auth.<domain>/ru/build",
      port: 3001,
      price: null,
      subdomain: "auth",
      topics: ["авторизац", "войти"],
    },
    {
      about: "Control panel of this probe. No channel of its own.",
      api: "https://admin.<domain>/api",
      auth: "global",
      author: "fractera",
      for_sale: false,
      id: "panel",
      manage: "https://admin.<domain>/ru/deploy",
      port: 3002,
      price: null,
      subdomain: "admin",
      topics: ["домен", "развернуть"],
    },
  ],
  updated: "2026-09-18",
}

const dir = mkdtempSync(join(tmpdir(), "probe-226-1-"))
const file = join(dir, "SERVICES.json")
writeFileSync(file, JSON.stringify(fixture, null, 2))
process.env.SERVICES_FILE = file
process.env.MEMORY_SERVICE_ID = "memory"

const { elsewhere, elsewhereWords } = await import("../../lib/elsewhere.mjs")
const { channelOfService } = await import("../../lib/services.mjs")

const CASE = "запомни что Петя заказал чехлы на 100 $ и кстати сделай уже нам авторизацию через Google"
const found = elsewhere(CASE).filter((x) => x.service === "auth")

console.log("— одна и та же просьба, два разных источника —")
check(found.length === 1, "чужая просьба узнана и отнесена к службе входа", JSON.stringify(found.map((x) => x.service)))

const fromTelegram = elsewhereWords(found, "ru", "aifa.dev", channelOfService("memory"))
check(/https:\/\/t\.me\/probe_auth_bot/.test(fromTelegram), "пришло из Telegram → ссылка ведёт в бота", fromTelegram.slice(-40))
check(!/aifa\.dev/.test(fromTelegram), "и веб-адрес при этом НЕ подставлен")

const fromWeb = elsewhereWords(found, "ru", "aifa.dev", null)
check(/auth\.aifa\.dev\/ru\/build/.test(fromWeb), "канал не назван → прежний веб-адрес", fromWeb.slice(-40))

console.log("— негативный контроль: у службы канала нет —")
const panel = elsewhere("проверь домен").filter((x) => x.service === "panel")
const panelWords = elsewhereWords(panel, "ru", "aifa.dev", "telegram")
check(panel.length === 1, "просьба про домен отнесена к панели")
// 🔒 ГЛАВНЫЙ ОТРИЦАТЕЛЬНЫЙ СЛУЧАЙ: правило не имеет права ломать прежнее поведение там, где канала
// нет. Пустая ссылка была бы хуже веб-адреса — отказ без адреса есть тупик.
check(/admin\.aifa\.dev/.test(panelWords), "канала нет → уходит веб-адрес, а не пустота", panelWords.slice(-40))

console.log("— вывод канала из службы-источника —")
check(channelOfService("memory") === "telegram", "у службы с одним каналом канал назван")
check(channelOfService("panel") === null, "у службы без каналов — null, а не выдуманный канал")

console.log("— сторож отвергает половинчатую запись —")
const { problemsOf } = await import("../check-services.mjs")
const broken = [{ ...fixture.services[1], channels: { telegram: { bot: "@x" } } }]
const wrongKind = [{ ...fixture.services[1], channels: { telegramm: { bot: "@x", url: "https://t.me/x" } } }]
const notTme = [{ ...fixture.services[1], channels: { telegram: { bot: "@x", url: "https://example.com/x" } } }]
check(problemsOf(broken, null, "auth").some((p) => /без прямой ссылки/.test(p)), "канал без ссылки отвергнут")
check(problemsOf(wrongKind, null, "auth").some((p) => /не из списка/.test(p)), "неизвестный род канала отвергнут")
check(problemsOf(notTme, null, "auth").some((p) => /t\.me/.test(p)), "ссылка не в Telegram отвергнута")
// 🔒 СТОРОЖ ОБЯЗАН МОЛЧАТЬ НА ПРАВДЕ, ИНАЧЕ ЕГО ОТКАЗЫ НИЧЕГО НЕ ЗНАЧАТ.
const good = [fixture.services[1]]
check(!problemsOf(good, null, "auth").some((p) => /канал/.test(p)), "правильная запись сторожа не будит")

console.log("— способность ПОДКЛЮЧЕНА, а не просто написана —")
const verbs = readFileSync(join(ROOT, "lib", "verbs.mjs"), "utf8")
check(verbs.includes("channelOfService(parsed.path[0])"), "глагол выводит канал из службы-источника")
check(verbs.includes("elsewhereWords(notMine, lang, state(input.seen ?? {}).seen.domain, viaChannel)"), "и передаёт его в ответ")

console.log(failed === 0 ? "\n✓ все случаи сошлись" : `\n🛑 не сошлось: ${failed}`)
process.exit(failed === 0 ? 0 : 1)
