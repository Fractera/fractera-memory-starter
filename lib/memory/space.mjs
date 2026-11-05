// ПРОСТРАНСТВА ПАМЯТИ — У КАЖДОГО ЭЛЕМЕНТА СВОЁ, У ГЛАВНОГО АГЕНТА ВСЕ (узел, шаг 650-1).
//
// 🎯 Слово владельца 2026-11-05: «нам нужно сделать разделение глубины памяти по элементам чтобы главное агент была доступна вся
// память, а каждому элементу только своему … чтобы записи матери не были доступны сыну например». Оно заменяет для элементов правило
// 2026-09-16 «источник не фильтрует поиск» (`source.mjs`): прежде память была одна на узел, и сказанное через один элемент находилось
// из любого другого.
//
// 🔒 ПРОСТРАНСТВО ВЫЗОВА — ПЕРВЫЙ СЕГМЕНТ `from`. `build` и `core` — главный агент: пишет в `node`, читает все пространства. Любой
// другой первый сегмент — id элемента из реестра (`isKnownService`): он пишет и читает только своё. Пространство ставит ДВЕРЬ
// (`door.mjs`) на весь запрос, а хранилища берут его отсюда сами — таблица (`rowsOf`), коллекции векторов (`collectionOf`),
// пространство графа (`graphSpaceOf`), индекс имён и журнал. Одна точка вместо параметра в сорока функциях: пропущенный параметр
// был бы утечкой, которую не видно.
// 🔒 БЕЗ ЗАПРОСА (свой код элемента памяти, его часы) — пространство `node` и все пространства на чтение: это сам элемент памяти, его
// видит только архитектор. Дверь каждому запросу ставит своё явно.
// 🛑 ЧТО ЭТО НЕ ЗАЩИЩАЕТ (650-main D4): хранилища за памятью открываются общими ключами узла; программа этой машины с этими ключами
// дойдёт до них мимо памяти. Граница между людьми держится тем, что человек интегратора не ведёт сессию с оболочкой (шаг 653).
import { AsyncLocalStorage } from "node:async_hooks"

/** Пространство главного агента и всего, что память хранила до 650. */
export const NODE_SPACE = "node"
const MAIN = new Set(["build", "core"])
// Имя пространства графа — `memory-<id>`, правило графа: латиница, цифры, дефисы, до 32 знаков (596-1) → id до 25 знаков.
const ID = /^[a-z0-9][a-z0-9-]{0,24}$/

const als = new AsyncLocalStorage()

/**
 * Пространство по разобранному пути источника (`parseSource(...).path`).
 * @returns {{ok:true, space:string, all:boolean} | {ok:false, error:string, why:string}}
 */
export function spaceOf(path) {
  const first = Array.isArray(path) ? path[0] : null
  if (!first) return { error: "source-required", ok: false, why: "источник не назван: первым сегментом from идёт id элемента или build" }
  if (MAIN.has(first)) return { all: true, ok: true, space: NODE_SPACE }
  if (first === NODE_SPACE || !ID.test(first)) {
    return { error: "bad-space", ok: false, why: `«${first}» не может быть пространством памяти: id элемента — до 25 знаков латиницы, цифр и дефисов` }
  }
  return { all: false, ok: true, space: first }
}

/** Выполнить работу в пространстве вызова: всё, что запущено внутри, видит его, включая отложенные продолжения. */
export function inSpace(ctx, fn) {
  return als.run({ all: ctx.all === true, space: ctx.space }, fn)
}

/** Пространство текущей работы. */
export function here() {
  return als.getStore() ?? { all: true, space: NODE_SPACE }
}

/** Куда пишется: пространство вызова. */
export const writeSpace = () => here().space

/** Видит ли вызов все пространства (главный агент и сам элемент памяти). */
export const seesAll = () => here().all === true

/**
 * Таблица, как её видит вызов: главному агенту — целиком, элементу — только его строки под тем же именем.
 * 🔒 Значение подставляется в текст запроса, поэтому проходит то же правило, что id: ни кавычки, ни пробела.
 */
export function rowsOf(table, alias = table) {
  if (seesAll()) return alias === table ? table : `${table} ${alias}`
  const space = writeSpace()
  if (!ID.test(space)) throw new Error(`bad space «${space}»`)
  return `(SELECT * FROM ${table} WHERE space = '${space}') AS ${alias}`
}

/** Коллекция векторов пространства: у `node` — прежнее имя, у элемента — `<имя>--<id>`. */
export function collectionOf(base, space = writeSpace()) {
  return space === NODE_SPACE ? base : `${base}--${space}`
}

/** Пространство графа: у `node` — прежнее (`memory`), у элемента — `memory-<id>`. */
export function graphSpaceOf(base, space = writeSpace()) {
  return space === NODE_SPACE ? base : `${base}-${space}`
}

/** Хвост имени файла пространства (индекс имён, журнал): у `node` — пусто, у элемента — `--<id>`. */
export function fileTail(space = writeSpace()) {
  return space === NODE_SPACE ? "" : `--${space}`
}
