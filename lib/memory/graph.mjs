// ГРАФ ЗНАНИЙ СО СТОРОНЫ СЛУЖБЫ: СЮДА ЛОЖИТСЯ ВСЁ СКАЗАННОЕ (201-5).
//
// 🔒 РЕШЕНИЕ ВЛАДЕЛЬЦА 2026-09-14, ДОСЛОВНО: «Сразу писать в граф знаний а таблице использовать на
// втором уровне для жёсткого перебора и накопления фильтрации». Отсюда: документ графа пишется на
// КАЖДУЮ фразу, а таблица получает только точное, счётное и текущее (§8 прежнего замысла).
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

// NODE STEP 596-3 — THE GRAPH OF THE NODE BUILDS NOTHING ITSELF. The graph element of a Fractera node calls no language model: it
// takes a READY graph (entities, relationships, the fragment they come from) and keeps it in the memory's own space (596-1). So the
// document below is no longer handed to LightRAG to extract entities from: the memory sends the document as the fragment and the
// entities and links it already knows — the anchors of the phrase (subjects, short values, the place, the speaker) and the facts its
// one parsing call found (subject — kind — value). No second model call. The document name travels as `file_path` with «:» instead
// of «/» (LightRAG keeps only the last segment of a path, anti-pattern 595-1) and comes back to the same table row.
// The names of the entities go to a label index next to the memory's data (`labels.mjs`): «does the graph know this name» stays a
// lookup with no model and no graph run, as the former label search was.
import { docNameOf, graphCall, graphPathOf } from "./node.mjs"
import { addLabels } from "./labels.mjs"

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
  const graph = readyGraph({ anchors, at, body, facts: input.facts ?? [], source, speaker: who_said })
  const r = await graphCall("graph-insert", graph)
  if (!r.ok) return { ok: false, refused: r.error, why: r.why }
  addLabels(graph.entities.map((e) => e.entity_name), source)
  return { ok: true, source }
}

/**
 * The ready graph of one phrase (596-3): the document is the fragment; the anchors are entities; the facts and «who said it about
 * whom» are relationships. Everything names the fragment by `source_id` and the memory document by `file_path`.
 */
export function readyGraph({ anchors, at, body, facts, source, speaker }) {
  const file_path = graphPathOf(source)
  const said = body.length > 600 ? `${body.slice(0, 600)}…` : body
  const seen = new Map()
  const entity = (name, type, description) => {
    const n = String(name ?? "").trim().slice(0, 200)
    if (!n) return null
    const key = n.toLowerCase()
    if (!seen.has(key)) seen.set(key, { description, entity_name: n, entity_type: type, file_path, source_id: source })
    return seen.get(key).entity_name
  }
  const me = entity(speaker || "architect", "person", `${speaker || "architect"} — the one who said this to the memory on ${at}.`)
  for (const a of anchors) entity(a, "anchor", `Named in what ${speaker || "architect"} said on ${at}: ${said}`)
  const relationships = []
  const link = (src, tgt, description, keywords) => {
    if (!src || !tgt || src.toLowerCase() === tgt.toLowerCase()) return
    relationships.push({ description, file_path, keywords: keywords || "said", source_id: source, src_id: src, tgt_id: tgt })
  }
  for (const f of facts ?? []) {
    const value = String(f?.value ?? "").trim()
    const what = String(f?.what ?? "").replace(/_/g, " ").trim()
    if (!value || !what) continue
    const subject = f.subject && f.subject !== "сам говорящий" ? entity(f.subject, "subject", `Named in what ${speaker} said on ${at}: ${said}`) : me
    // a short value is an entity of its own (Madrid, Barsik, 40 euro); a long one stays the link's description only
    const short = value.split(/\s+/).length <= 3 ? entity(value.split(/[,—-]/)[0].trim(), "value", `${what}: ${value} (said on ${at})`) : null
    if (short) link(subject, short, `${subject} — ${what} — ${value} (said by ${speaker} on ${at}${f.corrects ? ", a correction" : ""})`, what)
    else link(me, subject, `${speaker} said on ${at} about ${subject}: ${what} — ${value}`, what)
  }
  // who said it about whom: every other anchor is linked to the speaker by this phrase
  for (const e of seen.values()) if (e.entity_name !== me && !relationships.some((r) => r.src_id === e.entity_name || r.tgt_id === e.entity_name)) {
    link(me, e.entity_name, `${speaker} spoke of ${e.entity_name} on ${at}: ${said}`, "mentioned")
  }
  return {
    chunks: [{ content: body, file_path, source_id: source }],
    entities: [...seen.values()],
    relationships,
  }
}

/**
 * Забыть свои документы по имени — для приборов.
 *
 * 🛑 ПРЕФИКС ОБЯЗАТЕЛЕН И ПУСТЫМ НЕ БЫВАЕТ: пустой совпал бы со ВСЕМИ документами, включая чужие.
 * Прибор убирает за собой по СВОЕЙ метке, а не по хранилищу (закон 160).
 */
export async function forgetBySource(prefix) {
  // 596-3: the graph element of the node cannot delete an entity or a document yet (its README, «What it cannot do») — said, not faked.
  void prefix
  void docNameOf
  return { ok: false, error: "graph-cannot-forget", deleted: 0, why: "the node's graph element does not delete documents yet" }
}
