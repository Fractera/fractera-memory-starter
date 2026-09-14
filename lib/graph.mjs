// ГРАФ ЗНАНИЙ СО СТОРОНЫ СЛУЖБЫ: СЮДА ЛОЖИТСЯ ВСЁ СКАЗАННОЕ (201-5).
//
// 🔒 РЕШЕНИЕ ВЛАДЕЛЬЦА 2026-09-14, ДОСЛОВНО: «Сразу писать в граф знаний а таблице использовать на
// втором уровне для жёсткого перебора и накопления фильтрации». Отсюда: документ графа пишется на
// КАЖДУЮ фразу, а таблица получает только точное, счётное и текущее (§21.1 паспорта).
//
// 🔒 ЯКОРЬ ОБЯЗАТЕЛЕН, И ЗАПИСЬ БЕЗ НЕГО ОТВЕРГАЕТСЯ, А НЕ ПРИНИМАЕТСЯ МОЛЧА. Вопрос к памяти
// приходит от человека («кто из моих друзей…»), и запись, не связанная с ним именем, существует и
// недостижима: граф превращается в свалку текста, где ответ есть и не добывается.
//
// 🔒 ЯКОРЯ ПИШУТСЯ В САМ ТЕКСТ, А НЕ РЯДОМ С НИМ: граф извлекает сущности ИЗ ТЕКСТА, и имя,
// положенное в поле, для него не существует. Поэтому шапка — часть документа, а не оформление.
//
// 🛑 В ШАПКЕ НЕТ СЛУЖЕБНЫХ СЛОВ, И ЭТО ОПЛАЧЕНО ИЗМЕРЕНИЕМ 201-2. Строка «Откуда это известно:
// прибор 201-2» превратилась в сущность «Прибор 201-2», и она вышла ПЕРВОЙ на посторонний вопрос.
// Происхождение живёт в ИМЕНИ документа (`file_source`), которого граф в текст не берёт.
//
// 🔒 ЗАПИСЬ ПРИНИМАЕТСЯ ЗА МИЛЛИСЕКУНДЫ, А СТРОИТСЯ В ФОНЕ (измерено 201-2: «принято» 21 мс,
// «готово» 2,3–6,2 с). Значит вопрос, заданный сразу после записи, может её ещё не увидеть —
// и это свойство графа, а не наш дефект.

import { dataCall } from "./data-call.mjs"

/** Имя документа: по нему мы свои записи находим и забываем. Наружу не отдаётся. */
export function docName({ who, at = new Date() }) {
  const stamp = at.toISOString().replace(/[:.]/g, "-")
  return `memory/${String(who ?? "unknown").replace(/[^\w.@-]/g, "_")}/${stamp}`
}

/**
 * Положить сказанное в граф.
 *
 * @param {{who: string, said: string, anchors: string[], pointers?: string[], kept_as_history?: string[], source?: string}} input
 */
export async function putSaid(input) {
  const said = String(input?.said ?? "").trim()
  const anchors = (input?.anchors ?? []).map((a) => String(a ?? "").trim()).filter(Boolean)
  if (!said) return { ok: false, refused: "empty-text" }
  if (anchors.length === 0) return { ok: false, refused: "no-anchor" }

  // 🔒 ВВОДНАЯ ЧАСТЬ — ТРЕБОВАНИЕ ВЛАДЕЛЬЦА 2026-09-14, ДОСЛОВНО: «нельзя писать в граф знаний без
  // модификации… чтобы его вводная часть содержала признаки: кто отправил входящее сообщение
  // (например телеграм от Рома Армстронг), элементы реестра признаков и прочее».
  // 🔒 ПОЧЕМУ ЭТО НЕ УКРАШЕНИЕ: граф извлекает сущности ИЗ ТЕКСТА. Без этой строки сущностью
  // становится ТЕХНИЧЕСКИЙ КЛЮЧ человека (`roma@telegram`), а не он сам, и вопрос «что говорил
  // Рома» не находит ничего. Имя, канал и дата — это и есть то, чем документ потом достают.
  // 🛑 И ОБРАТНОЕ ОГРАНИЧЕНИЕ ОСТАЁТСЯ В СИЛЕ (201-2): всё, что здесь написано, станет сущностью,
  // поэтому служебных слов вроде «прибор 201-2» тут нет — происхождение живёт в имени документа.
  const person = input.person ?? {}
  const name = String(person.name ?? "").trim()
  const key = String(person.key ?? input.who ?? "").trim()
  const via = String(input.via ?? "").trim()
  const at = (input.at instanceof Date ? input.at : new Date()).toISOString().slice(0, 10)
  const who_said = name ? `${name}${key && key !== name ? ` (${key})` : ""}` : key
  const featureKeys = [...new Set((input.feature_keys ?? []).filter(Boolean))]

  const head = [
    `Входящее сообщение${via ? ` из ${via}` : ""} от ${who_said}, ${at}.`,
    `Относится к: ${[...new Set(anchors)].join(", ")}.`,
    featureKeys.length ? `Признаки реестра: ${featureKeys.join(", ")}.` : "",
  ]
    .filter(Boolean)
    .join(" ")
  const pointers = (input.pointers ?? []).filter(Boolean)
  const history = (input.kept_as_history ?? []).filter(Boolean)
  const body = [
    head,
    "",
    said,
    pointers.length ? `\nЧто из сказанного записано точно: ${pointers.join("; ")}.` : "",
    history.length ? `\nЧто осталось только здесь: ${history.join("; ")}.` : "",
  ]
    .filter((s) => s !== "")
    .join("\n")

  const source = input.source || docName({ who: input.who })
  const r = await dataCall("/service/rag/documents/text", { file_source: source, text: body })
  return r.ok ? { ok: true, source } : { ok: false, refused: r.error, why: r.why }
}

/**
 * Забыть свои документы по имени — для приборов.
 *
 * 🛑 ПРЕФИКС ОБЯЗАТЕЛЕН И ПУСТЫМ НЕ БЫВАЕТ: пустой совпал бы со ВСЕМИ документами, включая чужие.
 * Прибор убирает за собой по СВОЕЙ метке, а не по хранилищу (закон 160).
 */
export async function forgetBySource(prefix) {
  const head = String(prefix ?? "").trim()
  if (!head) return { ok: false, error: "empty-prefix", deleted: 0 }
  const list = await dataCall("/service/rag/documents", undefined, "GET")
  if (!list.ok) return { ok: false, error: list.error, deleted: 0 }
  const ids = []
  for (const group of Object.values(list.body?.statuses ?? {})) {
    for (const d of group ?? []) {
      if (String(d.file_path ?? "").startsWith(head)) ids.push(String(d.id))
    }
  }
  if (ids.length === 0) return { ok: true, deleted: 0 }
  const del = await dataCall("/service/rag/documents/delete_document", { doc_ids: ids, delete_file: false }, "DELETE")
  // Удаление фоновое: документ исчезает из списка за секунды, а не в тот же миг.
  return del.ok ? { ok: true, deleted: ids.length, background: true } : { ok: false, error: del.error, deleted: 0 }
}
