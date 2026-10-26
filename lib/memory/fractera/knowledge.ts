import { graphCall } from "../node.mjs";
import { readyGraph } from "../graph.mjs";
import { addLabels } from "../labels.mjs";

// THE KNOWLEDGE GRAPH OF A STORED THING (node step 596-5).
//
// On the former server this file talked to a LightRAG server through the data layer (`/service/rag/*`): the engine read every
// document with its own language model and built the entities itself; this file also asked written answers, listed labels and
// documents, and deleted them. On a Fractera node none of that exists: the graph element calls no language model, takes a READY
// graph and keeps the memory's facts in the memory's own space (596-1). Two jobs are left, the two the object pipeline calls:
// `learn` — the thing's document as a ready graph (the document is the fragment, its anchors are entities), and `forgetDocuments` —
// an honest «the graph cannot forget yet» (the node's graph element deletes nothing, its README «What it cannot do»).
// The rest (written answers, label lists, document lists, health) was read only by the former stands, which did not move.

/**
 * `source` is the name the document is remembered by (`object/<id>`) — it comes back as `file_path` with «:» for «/».
 */
export type LearnInput = {
  /** Что запоминаем — полное описание вещи с шапкой происхождения. */
  text: string
  /**
   * Якоря: имена сущностей ПЕРВОГО уровня, через которые запись связана с человеком.
   *
   * 🔒 БЕЗ ЯКОРЯ ЗАПИСЬ НЕ НАЙДЁТСЯ НИКОГДА: вопрос приходит от корня («кто из моих друзей…»), а связи с корнем у такой записи нет.
   */
  anchors: string[]
  /** Имя, под которым документ помнится. */
  source: string
  /** Откуда это знание: разговор, автоматизация, документ. Едет в шапку. */
  origin?: string
}

/**
 * Положить документ в граф знаний — обязательно с якорем.
 *
 * 🔒 ЗАПИСЬ БЕЗ ЯКОРЯ ОТВЕРГАЕТСЯ, А НЕ ПРИНИМАЕТСЯ МОЛЧА. Тихо принятый документ выглядит успехом ровно до того дня, когда его
 * понадобится найти.
 */
export async function learn(input: LearnInput): Promise<{ accepted: boolean; refused?: string }> {
  const text = (input.text ?? "").trim()
  const anchors = (input.anchors ?? []).map((a) => String(a ?? "").trim()).filter(Boolean)

  if (!text) return { accepted: false, refused: "empty-text" }
  if (anchors.length === 0) return { accepted: false, refused: "no-anchor" }

  // Шапка: имена сущностей и происхождение — первыми строками документа (они же — текст фрагмента графа).
  const head = [`Относится к: ${anchors.join(", ")}.`, input.origin ? `Откуда это известно: ${input.origin}.` : ""]
    .filter(Boolean)
    .join(" ")

  const source = input.source || "object/unknown"
  const graph = readyGraph({
    anchors,
    at: new Date().toISOString().slice(0, 10),
    body: `${head}\n\n${text}`,
    facts: [],
    source,
    speaker: anchors[0],
  }) as { entities: { entity_name: string }[] }
  const r = (await graphCall("graph-insert", graph)) as { ok: boolean; error?: string; why?: string }
  if (!r.ok) return { accepted: false, refused: r.error ?? "unreachable" }
  addLabels(graph.entities.map((e) => e.entity_name), source)
  return { accepted: true }
}

/**
 * Забыть документы по префиксу имени — на узле граф удалять не умеет, и это говорится, а не изображается.
 *
 * 🛑 Вызывают его при откате вещи, у которой не легла строка таблицы: файл и карточка снимаются, а документ графа остаётся — граф
 * найдёт по нему лишь то, что строкой таблицы не подтверждено, и ответ это скажет.
 */
export async function forgetDocuments(prefix: string): Promise<{ deleted: string[]; looked: number; error?: string; background?: boolean }> {
  const head = String(prefix ?? "").trim()
  if (!head) return { deleted: [], looked: 0, error: "empty-prefix" }
  return { deleted: [], looked: 0, error: "graph-cannot-forget" }
}
