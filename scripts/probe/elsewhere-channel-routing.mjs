#!/usr/bin/env node
//
// ПРИБОР 226-1 / 227-6: ОТВЕТ УХОДИТ В ТОМ КАНАЛЕ, КОТОРЫМ ПРИШЛА ПРОСЬБА.
//
// 🎯 СЛУЧАЙ ВЛАДЕЛЬЦА 2026-09-18: «если существует Telegram чат, то ссылку надо будет кидать не на
// сайт, а на Telegram чат, чтобы внутри телеграмма перейти с одного чата на другой».
//
// 🔒 ЭТОТ ПРИБОР — ГЛАВНОЕ ДОКАЗАТЕЛЬСТВО ШАГА 227, А НЕ ПРОСТО ПРОВЕРКА КАНАЛОВ. Способность
// построена 226-м шагом, когда реестр всех служб лежал внутри памяти; 227-й вынес его оттуда целиком
// (типы в ядро, описание себя к службе, карту к панели). Те же случаи, сошедшиеся на НОВОМ источнике
// данных, и означают, что вчерашняя работа пережила переезд.
//
// 🛑 ПОДАТЬ СОСЕДЕЙ ПАРАМЕТРОМ В `elsewhere()` БЫЛО БЫ ПОЧИНКОЙ ПРИБОРА ЦЕНОЙ ПРОТЕЧКИ ШВА: тогда
// проверялся бы прибор, а не код. `lib/elsewhere.mjs` за весь шаг 227 не тронут ни строкой, и это
// проверяется снаружи — пустым `git diff`.
//
// 🔒 ПАНЕЛЬ ЗДЕСЬ ПОДСТАВНАЯ, чтобы прибор не был красным по причине выключенной машины.

import { createServer } from "node:http"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..")

let failed = 0
const check = (ok, what, got = "") => {
  if (!ok) failed++
  console.log(`${ok ? "✓" : "🛑"} ${what}${got ? ` → ${got}` : ""}`)
}

const props = (over = {}) => ({
  about: "A service of this probe, long enough to pass the core type check.",
  api: "https://x.<domain>",
  auth: "own",
  author: "fractera",
  channels: {},
  for_sale: false,
  id: "svc",
  manage: null,
  port: 3001,
  price: null,
  subdomain: "svc",
  topics: [],
  ...over,
})

// Описание СЕБЯ: у службы-источника один канал.
const own = props({
  channels: { telegram: { bot: "@probe_memory_bot", url: "https://t.me/probe_memory_bot" } },
  id: "memory",
  manage: "https://memory.<domain>/ru/build",
  port: 3700,
  subdomain: "memory",
  topics: ["память", "запомни"],
})

// Карта от панели: сосед с каналом, сосед без канала, молчащая служба.
const MAP = {
  built_at: new Date().toISOString(),
  looked_at: 5,
  root: "/opt/fractera",
  services: [
    {
      dir: "services/auth",
      props: props({
        auth: "provider",
        channels: { telegram: { bot: "@probe_auth_bot", url: "https://t.me/probe_auth_bot" } },
        id: "auth",
        manage: "https://auth.<domain>/ru/build",
        port: 3001,
        subdomain: "auth",
        topics: ["авторизац", "войти"],
      }),
      trouble: null,
    },
    {
      dir: "bridges/app",
      props: props({
        auth: "global",
        id: "panel",
        manage: "https://admin.<domain>/ru/deploy",
        port: 3002,
        subdomain: "admin",
        topics: ["домен", "развернуть"],
      }),
      trouble: null,
    },
    { dir: "telegrambot", props: null, trouble: "нет OWN-SERVICE-PROPS.json — служба себя не описала" },
  ],
}

const srv = createServer((req, res) => {
  if (!req.url.startsWith("/service/panel/api/service-map")) {
    res.writeHead(404).end(JSON.stringify({ ok: false, error: "not-found" }))
    return
  }
  res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(MAP))
})
await new Promise((r) => srv.listen(0, "127.0.0.1", r))

const dir = mkdtempSync(join(tmpdir(), "probe-227-6-"))
writeFileSync(join(dir, "OWN-SERVICE-PROPS.json"), JSON.stringify(own))
process.env.OWN_SERVICE_PROPS_FILE = join(dir, "OWN-SERVICE-PROPS.json")
process.env.SERVICE_MAP_CACHE_FILE = join(dir, "service-map.cache.json")
process.env.REMOTE_DATA_URL = `http://127.0.0.1:${srv.address().port}`
process.env.DATA_SECRET = "probe-secret"

const services = await import("../../lib/services.mjs")
const { elsewhere, elsewhereWords } = await import("../../lib/elsewhere.mjs")
await services.refreshNeighbours()

const CASE = "запомни что Петя заказал чехлы на 100 $ и кстати сделай уже нам авторизацию через Google"

console.log("— чужая просьба узнана по карте от панели —")
const found = elsewhere(CASE).filter((x) => x.service === "auth")
check(found.length === 1, "просьба отнесена к службе входа", JSON.stringify(found.map((x) => x.service)))
// 🔒 О СЕБЕ ПАМЯТЬ НЕ ПЕРЕАДРЕСОВЫВАЕТ: на вопрос о себе она отвечает сама.
check(!elsewhere("запомни это").some((x) => x.service === "memory"), "себя в чужие не записывает")

console.log("— одна и та же просьба, два разных источника —")
const fromTelegram = elsewhereWords(found, "ru", "aifa.dev", services.channelOfService("memory"))
check(/https:\/\/t\.me\/probe_auth_bot/.test(fromTelegram), "пришло из Telegram → ссылка ведёт в бота", fromTelegram.slice(-40))
check(!/aifa\.dev/.test(fromTelegram), "и веб-адрес при этом НЕ подставлен")

const fromWeb = elsewhereWords(found, "ru", "aifa.dev", null)
check(/auth\.aifa\.dev\/ru\/build/.test(fromWeb), "канал не назван → прежний веб-адрес", fromWeb.slice(-40))
check(/«авторизацию»/.test(fromWeb), "показано слово человека целиком, а не наш корень")

console.log("— негативный контроль: у службы канала нет —")
const panel = elsewhere("проверь домен").filter((x) => x.service === "panel")
const panelWords = elsewhereWords(panel, "ru", "aifa.dev", "telegram")
check(panel.length === 1, "просьба про домен отнесена к панели")
// 🔒 ГЛАВНЫЙ ОТРИЦАТЕЛЬНЫЙ СЛУЧАЙ: правило не имеет права ломать прежнее поведение там, где канала
// нет. Пустая ссылка была бы хуже веб-адреса — отказ без адреса есть тупик.
check(/admin\.aifa\.dev/.test(panelWords), "канала нет → уходит веб-адрес, а не пустота", panelWords.slice(-40))

console.log("— домена не знаем — уезжает честный образец —")
const noDomain = elsewhereWords(found, "ru", null, null)
check(/<domain>/.test(noDomain), "выдуманный адрес не подставляется", noDomain.slice(-30))

console.log("— вывод канала из службы-источника —")
check(services.channelOfService("memory") === "telegram", "у службы с одним каналом канал назван")
check(services.channelOfService("panel") === null, "у службы без каналов — null, а не выдуманный канал")

console.log("— молчащая служба переадресации не мешает —")
check(!services.serviceIds().includes("telegrambot"), "служба без описания в соседи не идёт")
check(services.NEIGHBOURS_STATE.silent === 1, "но сосчитана отдельно и не потеряна", String(services.NEIGHBOURS_STATE.silent))

console.log("— правила каналов пришли из ЯДРА и отвергают половинчатую запись —")
const { problemsOfProps } = await import("../../core-vendor/service-props/service-props.decl.mjs")
const authProps = MAP.services[0].props
const spoil = (channels) => problemsOfProps({ ...authProps, channels })
check(spoil({ telegram: { bot: "@x" } }).some((p) => /без прямой ссылки/.test(p)), "канал без ссылки отвергнут")
check(spoil({ telegramm: { bot: "@x", url: "https://t.me/x" } }).some((p) => /не из списка/.test(p)), "неизвестный род канала отвергнут")
check(spoil({ telegram: { bot: "@x", url: "https://example.com/x" } }).some((p) => /t\.me/.test(p)), "ссылка не в Telegram отвергнута")
// 🔒 СТОРОЖ ОБЯЗАН МОЛЧАТЬ НА ПРАВДЕ, ИНАЧЕ ЕГО ОТКАЗЫ НИЧЕГО НЕ ЗНАЧАТ.
check(!problemsOfProps(authProps).some((p) => /канал/.test(p)), "правильная запись сторожа не будит")

console.log("— способность ПОДКЛЮЧЕНА, а не просто написана —")
const verbs = readFileSync(join(ROOT, "lib", "verbs.mjs"), "utf8")
check(verbs.includes("channelOfService(parsed.path[0])"), "глагол выводит канал из службы-источника")
check(verbs.includes("elsewhereWords(notMine, lang, state(input.seen ?? {}).seen.domain, viaChannel)"), "и передаёт его в ответ")

srv.close()
rmSync(dir, { recursive: true, force: true })
console.log(failed === 0 ? "\n✓ все случаи сошлись на карте от панели" : `\n🛑 не сошлось: ${failed}`)
process.exit(failed === 0 ? 0 : 1)
