// ПОИСК ПО СМЫСЛУ В ПРОСТРАНСТВАХ (узел, шаг 650-1): элемент ищет в своей коллекции, главный агент — в каждой коллекции памяти,
// и находки сливаются по близости.
//
// 🔒 КОЛЛЕКЦИЯ НА ПРОСТРАНСТВО, А НЕ МЕТКА В ОДНОЙ: у векторного элемента нет фильтра по метке, зато коллекции разделены — поиск
// трогает только свою (vectors v1.2.5, «partitioned»). Отдельная коллекция — граница, которую поиск не может перешагнуть по ошибке.
// 🔒 ГЛАВНОМУ АГЕНТУ ОТКАЗ ОДНОЙ КОЛЛЕКЦИИ НЕ ГАСИТ ОСТАЛЬНЫЕ: находки других пространств приходят, а отказ назван, если не ответила
// ни одна.
import { dataCall } from "./data-call.mjs"
import { spacesKnown } from "./messages.mjs"
import { collectionOf, seesAll } from "./space.mjs"

/** Коллекции, в которых ищет вызов: своя — или каждая, если вызов видит все пространства. */
export async function collectionsToSearch(base) {
  if (!seesAll()) return [collectionOf(base)]
  return (await spacesKnown()).map((space) => collectionOf(base, space))
}

/**
 * `POST /vectors/search` в каждой коллекции вызова; находки — одним списком, ближние первыми.
 * @returns {Promise<{ok:true, results:object[]} | {ok:false, error:string, why?:string}>}
 */
export async function searchInSpaces(base, body) {
  const collections = await collectionsToSearch(base)
  const answers = await Promise.all(collections.map((collection) => dataCall("/vectors/search", { ...body, collection })))
  const good = answers.filter((r) => r.ok !== false)
  if (!good.length) return { error: answers[0]?.error ?? "store-refused", ok: false, why: answers[0]?.why }
  const results = good.flatMap((r) => r.body?.results ?? []).sort((a, b) => Number(b.score) - Number(a.score))
  return { ok: true, results }
}
