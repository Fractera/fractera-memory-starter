// СКАЗАННОЕ УЕЗЖАЕТ НЕ ТОЛЬКО В СВЯЗИ, НО И В ВЕКТОР (206-2).
//
// 🔒 РЕШЕНИЕ ВЛАДЕЛЬЦА 2026-09-15, ДОСЛОВНО: «Граф + вектор, сообщение остаётся источником … but we
// have max 2000 words for vector and for lightRAG , if more only for object store».
//
// ✗ ЧЕМ ЭТО ОПЛАЧЕНО — РАЗВЕДКОЙ ТОГО ЖЕ ДНЯ: векторное хранилище звали ТОЛЬКО стенды
// (`app/api/fractera/vector-{search,test}`), путь записи не клал в него ни одной фразы. То есть
// «память ищет по смыслу» было верно про объекты и неверно про слова человека, и снаружи это
// неотличимо от плохого поиска.
//
// 🔒 ПОЧЕМУ ОТДЕЛЬНЫЙ ФАЙЛ, А НЕ ПЯТЬ СТРОК В ГЛАГОЛЕ: у порога один хозяин. Число, повторённое в
// двух местах, расходится молча — тот же закон, что у чисел в инструкциях.

import { dataCall } from "./data-call.mjs"

/** Коллекция слов человека. Объекты лежат отдельно (`memory-objects`) — у них своя карточка поиска. */
export const SAID_COLLECTION = "memory-said"

/**
 * Предел, после которого текст в вектор и в граф НЕ кладётся.
 *
 * 🔒 ЧИСЛО НАЗВАНО ВЛАДЕЛЬЦЕМ, А НЕ ИЗМЕРЕНО НАМИ, И ЭТО СКАЗАНО ЧЕСТНО: 2000 слов — его граница для
 * вектора и LightRAG. Перемеряется, когда появится корпус длинных текстов.
 * 🛑 СЧИТАЕМ СЛОВА, А НЕ ЗНАКИ: так его и назвали, и так его проверит человек.
 */
export const MAX_WORDS_FOR_MEANING = 2000

/** Сколько слов в тексте. Одна реализация на всю службу — иначе порог у каждого свой. */
export function wordsIn(text) {
  return String(text ?? "").trim().split(/\s+/).filter(Boolean).length
}

/**
 * Длинное ли это для смысловых хранилищ.
 *
 * Возвращает решение СЛОВАМИ, а не только `true`/`false`: причина едет в ответ и в журнал, иначе
 * «положили не всё» неотличимо от «положили всё».
 */
export function meaningVerdict(text) {
  const words = wordsIn(text)
  return words > MAX_WORDS_FOR_MEANING
    ? {
        long: true,
        why: `длиннее ${MAX_WORDS_FOR_MEANING} слов (${words}) — целиком уходит в объектное хранилище, а не в вектор и связи`,
        words,
      }
    : { long: false, why: "", words }
}

/**
 * Положить кусок смысла рядом со сказанным.
 *
 * 🔒 ИДЕНТИФИКАТОР СОБИРАЕТСЯ ИЗ ИМЕНИ ДОКУМЕНТА СВЯЗЕЙ: по нему кусок вектора и запись графа —
 * одно и то же сказанное, и убрать их можно вместе.
 */
export async function putSaidVector({ id, text, who }) {
  const body = String(text ?? "").trim()
  if (!body) return { ok: false, refused: "empty-text" }
  const r = await dataCall("/vectors", {
    collection: SAID_COLLECTION,
    id: String(id),
    refId: String(who ?? ""),
    refTable: "said",
    text: body,
  })
  return r.ok === false ? { ok: false, refused: r.error ?? "store-refused" } : { id: String(id), ok: true }
}

/**
 * Найти сказанное по смыслу.
 *
 * 🔒 ПОРОГ БЛИЗОСТИ ЖИВЁТ У ХРАНИЛИЩА, А НЕ У ЗОВУЩЕГО (`lib/fractera/vectors.ts`, `NEAR = 0.28`,
 * измерено на своём корпусе). Здесь он повторён числом намеренно: этот путь идёт из `.mjs`, куда
 * модуль на TypeScript не импортируется, и расхождение двух чисел было бы молчаливым.
 * 🛑 ДАЛЬНЕЕ НЕ ВЫБРАСЫВАЕТСЯ, А ПОМЕЧАЕТСЯ: у склада нет пустого ответа — есть «самое близкое из
 * того, что лежит». Не назвав дальнее дальним, мы выдали бы постороннее за ответ.
 */
export const NEAR_SAID = 0.28

export async function searchSaid({ question, k = 5, who }) {
  const q = String(question ?? "").trim()
  if (!q) return { alien: 0, near: [], ok: false, pieces: [], refused: "empty-question" }
  // 🔒 ЧУЖИЕ ФРАЗЫ ОТСЕИВАЮТСЯ ПО ИМЕНИ ЗАПИСИ, А НЕ НАДЕЖДОЙ НА БЛИЗОСТЬ. Идентификатор куска —
  // это имя документа связей (`memory/<кто>/<время>`), и человек в нём назван. Склад фильтра не
  // предлагает, поэтому фильтруем мы — и берём ЗАПАС, иначе чужие вытеснят своё из первых k.
  // ✗ ОПЛАЧЕНО ЖИВЫМ ПРОГОНОМ 206-3: у человека, о котором память не знала НИЧЕГО, вопрос «в какой
  // валюте я храню сбережения» нашёл ответ — фразу ДРУГОГО человека, сказанную получасом раньше.
  // Прибор при этом был зелёным: он спрашивал «нашлось ли», а не «чьё это».
  const mine = String(who ?? "").trim()
  const want = mine ? k * 4 : k
  const r = await dataCall("/vectors/search", { collection: SAID_COLLECTION, k: want, query: q })
  if (r.ok === false) return { alien: 0, near: [], ok: false, pieces: [], refused: r.error ?? "store-refused" }
  const all = (r.body?.results ?? []).map((p) => ({
    far: Number(p.score) < NEAR_SAID,
    id: String(p.id),
    score: Number(p.score),
    text: String(p.text ?? ""),
  }))
  const pieces = mine ? all.filter((p) => p.id.startsWith(`memory/${mine}/`)) : all
  return { alien: all.length - pieces.length, near: pieces.filter((p) => !p.far).slice(0, k), ok: true, pieces }
}
