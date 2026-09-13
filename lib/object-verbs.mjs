// ЧТЕНИЕ ОБЪЕКТОВ СНАРУЖИ: `find_objects` И `open_object` (194-17).
//
// 🎯 СЛОВО ВЛАДЕЛЬЦА 2026-09-13: «Делай полный вариант: методы объектов в API». Положить без возможности найти —
// половина способности.
//
// 🔒 ИМЕНА ТЕ ЖЕ, ЧТО У РУК АГЕНТА: одно имя на одно дело. И путь тот же — двери стенда `object-search` и
// `object-open` по петле (`loopback.mjs`): у человека на стенде, у агента и у чужого инструмента один путь чтения.
// 🔒 НАЙДЕННОЕ НЕСЁТ СВОЮ СТРОКУ ТАБЛИЦЫ: номер, род, название и саммари из `messages_that_came_into_memory`.
// Без них зовущий открывал бы каждую находку, чтобы понять, что это, — ход за ходом, а ходы дороже запросов (закон 158-4).
// 🔒 ПОИСК ЧЕРЕЗ ДОГОВОР НЕ ПИШЕТ СЛУЧАИ СТЕНДА: признак `probe` двери исключает запись в корпус оценок. Корпус —
// вопросы человека на стенде; вопросы чужих программ исказили бы измеряемое.

import { doorJson } from "./loopback.mjs"
import { getMessageByObject } from "./messages.mjs"

/** Найти объекты по смыслу. */
export async function find_objects({ question } = {}) {
  const q = String(question ?? "").trim()
  if (!q) return { error: "empty-question", ok: false }
  const { json, status } = await doorJson("/api/fractera/object-search", { probe: true, question: q })
  if (!json.ok) return { error: json.error ?? `door-${status}`, ok: false }
  const results = []
  for (const h of json.near ?? []) {
    const row = await getMessageByObject(h.id)
    results.push({
      id: h.id,
      kind: row?.kind ?? null,
      messageId: row?.id ?? null,
      mime: h.mime,
      name: h.name,
      preview: h.preview ?? null,
      score: h.score,
      size: h.size,
      summary: row?.summary ?? h.about ?? null,
      title: row?.title ?? h.name,
    })
  }
  return {
    found: results.length > 0,
    lost: json.lost ?? 0,
    ok: true,
    results,
    threshold: json.threshold,
  }
}

/** Открыть объект: карточка, текст частями, адрес файла. */
export async function open_object({ id, from } = {}) {
  const key = String(id ?? "").trim()
  if (!key) return { error: "no-id", ok: false }
  const { json, status } = await doorJson("/api/fractera/object-open", { from: Number(from ?? 0) || 0, id: key })
  if (!json.ok) return { error: json.error ?? `door-${status}`, ok: false }
  return { ...json, file: `/v1/objects/${encodeURIComponent(key)}/file` }
}
