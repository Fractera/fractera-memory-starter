// ДВА РАЗНЫХ ВОПРОСА: «КТО Я» И «КТО МОИ СОСЕДИ» (227-3).
//
// 🎯 РЕШЕНИЕ ВЛАДЕЛЬЦА 2026-09-18, ДОСЛОВНО: «Гибрид: своё — всегда с диска, чужое — у панели с
// кэшем». И раньше, об устройстве целиком: «в корне есть типы, которые каждый микросервис обязан
// импортировать; согласно этим типам он обязан создать своё собственное описание, и наша новая
// функция должна будет забрать это описание в себя».
//
// 🔒 СЛУЖБА ЗНАЕТ СЕБЯ БЕЗ СЕТИ, ВСЕГДА. `OWN-SERVICE-PROPS.json` лежит в корне её дерева и читается
// с диска; никакая недоступность соседа не имеет права лишить службу собственного имени, порта и
// рода входа. Это неотменяемо: на нём висит ответ `GET /v1/state` — первый вызов любой сессии.
//
// 🔒 СОСЕДЕЙ ЗНАЕТ ПАНЕЛЬ, А НЕ МЫ. Карта установленных служб собирается ею (227-4) и приходит сюда
// (227-5). До того соседи НЕИЗВЕСТНЫ — и это честное «не знаю», а не пустой список, выданный за
// «никого нет».
//
// 🪦 ДО 227-3 ЗДЕСЬ ЛЕЖАЛ `SERVICES.json` СО ВСЕМИ ДЕСЯТЬЮ СЛУЖБАМИ — рукописная копия общего
// реестра внутри одной службы. Владелец назвал это временным решением, принятым, чтобы закрыть
// задачу памяти, и потребовал единый реестр в административном слое. Файл удалён шагом 227-3.
//
// 🛑 ФАЙЛ ЧИТАЕТСЯ ОДИН РАЗ ЗА ЖИЗНЬ ПРОЦЕССА. Он меняется руками и редко; правка требует
// перезапуска — сказано здесь, чтобы следующий не искал, почему новое значение «не видно».

import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { problemsOfProps } from "../core-vendor/service-props/service-props.decl.mjs"
import { ageSeconds, askPanel, describedOf, readCache, silentCount, sourceWords, writeCache } from "./neighbours.mjs"

/** Где лежит описание себя: КОРЕНЬ дерева службы, рядом с `package.json`. */
export const OWN_PROPS_PATH =
  process.env.OWN_SERVICE_PROPS_FILE ??
  join(dirname(fileURLToPath(import.meta.url)), "..", "OWN-SERVICE-PROPS.json")

/**
 * Описание себя с диска. Файла нет или он не проходит тип из ядра — `null` и причина.
 *
 * 🔒 НЕГОДНОЕ ОПИСАНИЕ РАВНО ОТСУТСТВУЮЩЕМУ, А НЕ «ПОЧТИ ГОДНОМУ». Половина полей, принятая за
 * правду, даёт уверенный неверный ответ на вопрос «кто я» — дороже пустого.
 */
function loadOwn() {
  try {
    const props = JSON.parse(readFileSync(OWN_PROPS_PATH, "utf8"))
    const problems = problemsOfProps(props)
    if (problems.length) return { error: problems.join(" · "), props: null }
    return { error: null, props }
  } catch (e) {
    return { error: String(e.message).slice(0, 200), props: null }
  }
}

const OWN = loadOwn()

/** Описание себя целиком — или `null`, если его нет. */
export const OWN_PROPS = OWN.props

/** Почему описания себя нет, если его нет. Пустая причина значит «всё в порядке». */
export const OWN_PROPS_ERROR = OWN.error

/** Типизированное имя этой службы — из описания себя, а не из константы в коде. */
export const OWN_ID = OWN.props?.id ?? null

/**
 * Соседи: карта установленных служб, собранная панелью (227-4) и полученная нами (227-5).
 *
 * 🔒 ПРИ СТАРТЕ БЕРЁТСЯ КЭШ С ДИСКА — СИНХРОННО И БЕЗ СЕТИ. Служба обязана подняться и работать,
 * даже когда панель молчит: спрашивать её при импорте модуля значило бы поставить старт памяти в
 * зависимость от чужого процесса.
 * 🛑 ТРИ СОСТОЯНИЯ, А НЕ ДВА: свежая карта · карта из кэша с названным возрастом · соседи неизвестны.
 * Пустой список без `NEIGHBOURS_KNOWN` читался бы как «на сервере больше никого нет» — уверенный
 * неверный ответ, который дороже пустого.
 */
const cached = readCache()

export let NEIGHBOURS = cached ? describedOf(cached) : []

/** Знаем ли мы вообще что-нибудь о соседях. `false` — молчать о них, а не утверждать, что их нет. */
export let NEIGHBOURS_KNOWN = Boolean(cached)

/** Откуда взялись соседи и насколько свежи — чтобы ответ мог сказать это словами. */
export let NEIGHBOURS_STATE = cached
  ? { age_s: ageSeconds(cached), fresh: false, known: true, silent: silentCount(cached), why: "панель ещё не спрошена в этой жизни процесса" }
  : { age_s: null, fresh: false, known: false, silent: 0, why: "кэша карты нет, панель ещё не спрошена" }

/**
 * Все службы, о которых мы знаем: мы сами плюс известные соседи.
 *
 * 🔒 СЕБЯ МЫ ЗНАЕМ ВСЕГДА, И ПОЭТОМУ СПИСОК НИКОГДА НЕ ПУСТ. Это важно для проверки пути источника:
 * сообщение от самой службы обязано приниматься и в тот день, когда панель недоступна.
 * 🔒 ПЕРЕПРИСВАИВАЕТСЯ, А НЕ ПЕРЕСОБИРАЕТСЯ У КАЖДОГО ЧИТАТЕЛЯ: в ES-модулях `let` связывается живо,
 * и потребители (`elsewhere.mjs`, `source.mjs`) видят обновлённый список, не меняя ни строки. Ради
 * этого свойства они и не трогаются весь шаг 227.
 */
export let SERVICES = OWN.props ? [OWN.props, ...NEIGHBOURS] : [...NEIGHBOURS]

/**
 * Спросить панель и обновить соседей. Зовётся службой при старте — в фоне, не блокируя подъём.
 *
 * 🛑 НЕУДАЧА НЕ СТИРАЕТ ТО, ЧТО УЖЕ ЕСТЬ: карта из кэша остаётся в силе, меняется только причина в
 * `NEIGHBOURS_STATE`. Обнулить соседей при недоступной панели значило бы наказать работу за чужое
 * молчание.
 */
export async function refreshNeighbours() {
  const { error, map, why } = await askPanel()
  if (!map) {
    NEIGHBOURS_STATE = { ...NEIGHBOURS_STATE, fresh: false, why: `панель не ответила (${error}${why ? ": " + why : ""})` }
    return { ok: false, state: NEIGHBOURS_STATE }
  }
  writeCache(map)
  NEIGHBOURS = describedOf(map)
  NEIGHBOURS_KNOWN = true
  NEIGHBOURS_STATE = { age_s: 0, fresh: true, known: true, silent: silentCount(map), why: "получено от панели" }
  SERVICES = OWN.props ? [OWN.props, ...NEIGHBOURS] : [...NEIGHBOURS]
  return { ok: true, state: NEIGHBOURS_STATE }
}

/** Словами: откуда соседи и насколько свежи. */
export const neighboursWords = () => sourceWords(NEIGHBOURS_STATE)

/** Типизированные имена известных служб — закрытый список первых сегментов пути источника. */
export function serviceIds() {
  return SERVICES.map((s) => s.id).filter((id) => typeof id === "string" && id.length > 0)
}

/**
 * Знает ли сервер такую службу.
 *
 * 🔒 СРАВНЕНИЕ ТОЧНОЕ, БЕЗ ПРИВЕДЕНИЯ РЕГИСТРА И БЕЗ ПОХОЖЕСТИ. Имя службы едет в значение колонки и
 * в условие запроса; «почти совпало» означало бы, что `Data` и `data` — две разные службы в отчётах
 * и одна в проверке.
 * 🛑 Пока соседи неизвестны, знакомой оказывается только эта служба. Отсюда правило вызывающего: имя
 * незнакомо — сказать «не знаю такой службы», а не «такой службы нет».
 */
export function isKnownService(id) {
  return typeof id === "string" && serviceIds().includes(id)
}

/** Запись службы целиком — когда нужен её адрес или описание, а не факт знакомства. */
export function serviceById(id) {
  return SERVICES.find((s) => s.id === id) ?? null
}

// ── КАНАЛЫ СЛУЖБЫ ───────────────────────────────────────────────────────────
//
// 🎯 СЛОВО ВЛАДЕЛЬЦА 2026-09-18: «у каждого микросервиса внутри должен быть объект каналы… чтобы один
// микросервис мог показать прямую ссылку и позволить пользователю перейти из одного бота в другой».
// Роды каналов — закрытый список, и он живёт в объявлении ядра, а не здесь.

export { CHANNEL_KINDS } from "../core-vendor/service-props/service-props.decl.mjs"

/** Каналы службы: `{ telegram: { bot, url } }`. Нет каналов — пустой объект, а не null. */
export function channelsOf(id) {
  const c = serviceById(id)?.channels
  return c && typeof c === "object" ? c : {}
}

/**
 * Прямая ссылка службы в названном канале — или `null`.
 *
 * 🔒 ССЫЛКА ХРАНИТСЯ ЦЕЛИКОМ И НЕ СОБИРАЕТСЯ ИЗ ИМЕНИ БОТА — тот же закон, что «адрес ресурса берётся
 * из страницы, а не собирается по шаблону»: `t.me/<имя>` верно ровно до первого бота с другим
 * адресом, и ошибка эта молчит.
 */
export function channelLink(id, kind) {
  const url = channelsOf(id)?.[kind]?.url
  return typeof url === "string" && url ? url : null
}

/**
 * Каким каналом, судя по всему, пришла просьба от службы-источника.
 *
 * 🛑 ЭТО ВЫВОД, А НЕ ФАКТ. Канала во входящем вызове нет: путь источника устроен как
 * `<служба>/<что угодно>`, и слово «telegram» стоит в нём то вторым сегментом, то не стоит вовсе.
 * Разбирать середину пути значило бы угадывать, а цена промаха — ссылка не туда.
 */
export function channelOfService(id) {
  const kinds = Object.keys(channelsOf(id)).filter((k) => k in CHANNEL_KINDS_LOCAL)
  return kinds.length === 1 ? kinds[0] : null
}

// Локальная ссылка на закрытый список — чтобы `channelOfService` не зависела от порядка ре-экспорта.
import { CHANNEL_KINDS as CHANNEL_KINDS_LOCAL } from "../core-vendor/service-props/service-props.decl.mjs"
