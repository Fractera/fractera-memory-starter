// ОБЯЗАТЕЛЬНЫЕ ИНСТРУМЕНТЫ ПАМЯТИ И ФОРМА ИХ ОТКАЗА (207-7).
//
// 🎯 ЗАМЫСЕЛ ВЛАДЕЛЬЦА 2026-09-16: «Память зависит от работы следующих внешних
// инструментов которые в случае отказа приведут к передаче ошибки». Значит
// отказ обязан ДОЕХАТЬ наружу и быть узнаваемым, а не схлопнуться в «что-то
// внутри памяти сломалось».
//
// 🔒 РЕШЕНИЕ ВЛАДЕЛЬЦА ТОГО ЖЕ ДНЯ — НАЗЫВАТЬ РОД ЗАВИСИМОСТИ, НО НЕ ПОРТ И НЕ
// СХЕМУ. Это граница между отладкой и концом чёрного ящика: безымянный отказ
// починить нельзя (зовущий не знает, ждать ему или звать человека), а род
// ничего не выдаёт о внутреннем устройстве — он говорит лишь, какого рода
// способность сейчас недоступна.
//
// 🔒 АДРЕСА ЗДЕСЬ НЕ ХРАНЯТСЯ, И ЭТО ТОЖЕ РЕШЕНИЕ ВЛАДЕЛЬЦА: свои службы память
// зовёт через «одну дверь» слоя данных, а не портами. Порт в коде памяти был бы
// вторым адресом того же соседа.
//
// 🛑 ОТВЕТ СОСЕДА ЧИТАЕТСЯ ЦЕЛИКОМ, А НЕ ПО КОДУ HTTP: слой данных отвечает
// `200` с `{ok:false}` на отвергнутый SQL. Именно поэтому здесь сопоставляются
// КОДЫ ОТКАЗОВ наших модулей, а не статусы ответов.

/**
 * Роды обязательных инструментов. Отказ любого — отказ памяти, и он называется.
 * 🔒 Список правится ВМЕСТЕ с сопоставлением ниже: род без сопоставления никогда
 * не появится в ответе, а сопоставление без рода соврёт именем, которого нет.
 */
export const TOOLS = {
  /** Реляционная база: единственная таблица входящих сообщений и указатели. */
  RELATIONAL: "relational",
  /** Объектное хранилище: вещи целиком — файлы, длинные тексты, страницы. */
  OBJECTS: "objects",
  /** Векторное хранилище: поиск по смыслу, когда слова вопроса и записи разные. */
  VECTOR: "vector",
  /** Граф связей: кто с чем связан и что из чего следует. */
  GRAPH: "graph",
}

const WORDS = {
  en: {
    graph: "the knowledge graph",
    objects: "the object store",
    relational: "the relational database",
    vector: "the vector store",
  },
  ru: {
    graph: "граф связей",
    objects: "объектное хранилище",
    relational: "реляционная база",
    vector: "векторное хранилище",
  },
}

/**
 * Какому инструменту принадлежит код отказа.
 *
 * 🔒 СОПОСТАВЛЕНИЕ ПО КОДУ, А НЕ ПО ТЕКСТУ ПРИЧИНЫ. Текст пишут люди и чужие
 * службы, он меняется молча; код отказа — наш и стабилен.
 * Неизвестный код возвращает `null`: выдуманный род хуже отсутствующего — он
 * пошлёт чинить не то.
 */
export function toolOfError(error) {
  const code = String(error ?? "")
  if (!code) return null
  if (/^(no-data-secret|data-unreachable|data-http-\d+|sql-rejected|read-failed|alter-refused|backfill-refused|ensure:)/.test(code)) {
    return TOOLS.RELATIONAL
  }
  if (/^(store-unreachable|object-|describe-kind-unsupported|row-failed|no-name|empty-file)/.test(code)) return TOOLS.OBJECTS
  if (/^(vector-|embed-|store-refused)/.test(code)) return TOOLS.VECTOR
  if (/^(rag-|graph-|no-anchor)/.test(code)) return TOOLS.GRAPH
  return null
}

/**
 * Отказ инструмента в той форме, в какой он уходит зовущему.
 *
 * @param {{tool?: string, error?: string, stage?: string, why?: string, lang?: string}} input
 */
export function toolFailure({ error, lang, stage, tool, why } = {}) {
  const kind = tool ?? toolOfError(error)
  const ru = lang !== "en"
  const named = kind ? WORDS[ru ? "ru" : "en"][kind] : null
  const what = named
    ? ru
      ? `не отвечает ${named}${stage ? ` на ступени «${stage}»` : ""}. Память не может выполнить запрос, пока это не починят`
      : `${named} is not responding${stage ? ` at stage «${stage}»` : ""}. Memory cannot serve the request until it is fixed`
    : ru
      ? "что-то внутри памяти не сработало, и род зависимости назвать не удалось"
      : "something inside memory failed, and the kind of dependency could not be named"

  return {
    error: "tool-unavailable",
    objects: [],
    ok: false,
    ...(stage ? { stage } : {}),
    text: what,
    ...(kind ? { tool: kind } : {}),
    what_happened: what,
    ...(why || error ? { why: String(why ?? error).slice(0, 200) } : {}),
  }
}
