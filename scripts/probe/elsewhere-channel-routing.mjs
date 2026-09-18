#!/usr/bin/env node
//
// ПРИБОР 226-1: ОТВЕТ УХОДИТ В ТОМ КАНАЛЕ, КОТОРЫМ ПРИШЛА ПРОСЬБА.
//
// 🎯 СЛУЧАЙ ВЛАДЕЛЬЦА 2026-09-18: «если существует Telegram чат то ссылку надо будет кидать не на
// сайт а на Telegram чат чтобы внутри телеграмма перейти с одного чата на другой».
//
// 🛑 СОСТОЯНИЕ 227-3: СОСЕДЕЙ НЕТ, И ПРИБОР ПРОВЕРЯЕТ ТО, ЧТО ЕСТЬ. Общий реестр из дерева памяти
// удалён (служба описывает только себя), а карту от панели ещё не построили — значит переадресовать
// чужую просьбу сегодня НЕКУДА. Это названо в плане 227-3 заранее, а не обнаружено прибором.
//
// 🔒 ЗДЕСЬ ПРОВЕРЯЕТСЯ РОВНО ТО, ЧТО ПРОВЕРЯЕМО СЕЙЧАС: правила каналов пришли из ядра и отвергают
// половинчатую запись · выбор адреса по каналу работает на поданных данных · маршрутизатор МОЛЧИТ о
// соседях вместо того, чтобы выдумать адрес. Полный набор случаев возвращается в 227-6, когда карта
// начнёт приходить от панели.
//
// 🔒 МАРШРУТИЗАТОР (`lib/elsewhere.mjs`) ПРИ ЭТОМ НЕ ТРОНУТ НИ СТРОКОЙ, И ЭТО ГЛАВНОЕ УТВЕРЖДЕНИЕ
// ШАГА: способность, построенная 226-м в неправильном месте, переживает переезд источника данных.
// Подать соседей «в обход» параметром значило бы починить прибор ценой протечки шва.

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
      about: "Memory service of this probe, long enough for the core type.",
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

const dir = mkdtempSync(join(tmpdir(), "probe-227-3-"))
const file = join(dir, "OWN-SERVICE-PROPS.json")
writeFileSync(file, JSON.stringify(fixture.services[0], null, 2))
process.env.OWN_SERVICE_PROPS_FILE = file

const { elsewhere, elsewhereWords } = await import("../../lib/elsewhere.mjs")
const { channelOfService, NEIGHBOURS_KNOWN } = await import("../../lib/services.mjs")

// Соседи, какими они придут из карты панели (227-5). Сегодня подаются прямо в `elsewhereWords` —
// той же формы записи, что вернёт карта.
const authNeighbour = fixture.services[1]
const panelNeighbour = { ...fixture.services[2], channels: {} }

const CASE = "запомни что Петя заказал чехлы на 100 $ и кстати сделай уже нам авторизацию через Google"

console.log("— соседей ещё нет: маршрутизатор МОЛЧИТ, а не выдумывает —")
check(NEIGHBOURS_KNOWN === false, "карта от панели ещё не приходит", String(NEIGHBOURS_KNOWN))
check(elsewhere(CASE).length === 0, "чужая просьба не отнесена никуда — переадресовать некуда")
check(elsewhereWords([], "ru", "aifa.dev", "telegram") === "", "пустому списку соответствует пустая приписка")

// Дальше — выбор адреса по каналу на записях соседей, какими их вернёт карта.
const found = [{ channels: authNeighbour.channels, manage: authNeighbour.manage, matched: "авторизацию", service: "auth" }]

console.log("— одна и та же просьба, два разных источника —")
check(found.length === 1, "запись соседа готова к переадресации", JSON.stringify(found.map((x) => x.service)))

const fromTelegram = elsewhereWords(found, "ru", "aifa.dev", channelOfService("memory"))
check(/https:\/\/t\.me\/probe_auth_bot/.test(fromTelegram), "пришло из Telegram → ссылка ведёт в бота", fromTelegram.slice(-40))
check(!/aifa\.dev/.test(fromTelegram), "и веб-адрес при этом НЕ подставлен")

const fromWeb = elsewhereWords(found, "ru", "aifa.dev", null)
check(/auth\.aifa\.dev\/ru\/build/.test(fromWeb), "канал не назван → прежний веб-адрес", fromWeb.slice(-40))

console.log("— негативный контроль: у службы канала нет —")
const panel = [{ channels: panelNeighbour.channels, manage: panelNeighbour.manage, matched: "домен", service: "panel" }]
const panelWords = elsewhereWords(panel, "ru", "aifa.dev", "telegram")
check(panel.length === 1, "запись соседа без канала готова")
// 🔒 ГЛАВНЫЙ ОТРИЦАТЕЛЬНЫЙ СЛУЧАЙ: правило не имеет права ломать прежнее поведение там, где канала
// нет. Пустая ссылка была бы хуже веб-адреса — отказ без адреса есть тупик.
check(/admin\.aifa\.dev/.test(panelWords), "канала нет → уходит веб-адрес, а не пустота", panelWords.slice(-40))

console.log("— вывод канала из службы-источника —")
check(channelOfService("memory") === "telegram", "у службы с одним каналом канал назван")
check(channelOfService("panel") === null, "незнакомая служба — null, а не выдуманный канал")

console.log("— правила каналов пришли из ЯДРА и отвергают половинчатую запись —")
const { problemsOfProps } = await import("../../core-vendor/service-props/service-props.decl.mjs")
const spoil = (channels) => problemsOfProps({ ...authNeighbour, channels })
check(spoil({ telegram: { bot: "@x" } }).some((p) => /без прямой ссылки/.test(p)), "канал без ссылки отвергнут")
check(spoil({ telegramm: { bot: "@x", url: "https://t.me/x" } }).some((p) => /не из списка/.test(p)), "неизвестный род канала отвергнут")
check(spoil({ telegram: { bot: "@x", url: "https://example.com/x" } }).some((p) => /t\.me/.test(p)), "ссылка не в Telegram отвергнута")
// 🔒 СТОРОЖ ОБЯЗАН МОЛЧАТЬ НА ПРАВДЕ, ИНАЧЕ ЕГО ОТКАЗЫ НИЧЕГО НЕ ЗНАЧАТ.
check(!problemsOfProps(authNeighbour).some((p) => /канал/.test(p)), "правильная запись сторожа не будит")

console.log("— способность ПОДКЛЮЧЕНА, а не просто написана —")
const verbs = readFileSync(join(ROOT, "lib", "verbs.mjs"), "utf8")
check(verbs.includes("channelOfService(parsed.path[0])"), "глагол выводит канал из службы-источника")
check(verbs.includes("elsewhereWords(notMine, lang, state(input.seen ?? {}).seen.domain, viaChannel)"), "и передаёт его в ответ")

console.log(failed === 0 ? "\n✓ все случаи сошлись" : `\n🛑 не сошлось: ${failed}`)
process.exit(failed === 0 ? 0 : 1)
