// ЧТЕНИЕ ОБЪЕКТОВ СНАРУЖИ: `find_objects` И `open_object` (194-17).
//
// 🎯 СЛОВО ВЛАДЕЛЬЦА 2026-09-13: «Делай полный вариант: методы объектов в API». Положить без возможности найти —
// половина способности.
//
// 🔒 НАЙДЕННОЕ НЕСЁТ СВОЮ СТРОКУ ТАБЛИЦЫ: номер, род, название и саммари из `messages_that_came_into_memory`.
// Без них зовущий открывал бы каждую находку, чтобы понять, что это, — ход за ходом, а ходы дороже запросов (закон 158-4).
//
// NODE STEP 596-5: on the former server these two went over the loopback to the stand's doors `object-search` and `object-open`,
// because the plain node server could not import the TypeScript of the object pipeline. On the node everything runs inside one Next
// server, so they call the same functions (`fractera/objects.ts` find/open) directly — the same answers, no door to the outside.
import { find, OBJECT_NEAR, open } from "./fractera/objects"
import { getMessageByObject } from "./messages.mjs"

/** Найти объекты по смыслу. */
export async function find_objects({ question } = {}) {
  const q = String(question ?? "").trim()
  if (!q) return { error: "empty-question", ok: false }
  const r = await find({ k: 5, question: q })
  if (!r.ok) return { error: r.error === "no-vector" ? "no-vector" : "store-unreachable", ok: false }
  const results = []
  for (const h of r.near ?? []) {
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
      who: row?.who ?? null,
    })
  }
  return {
    found: results.length > 0,
    lost: r.lost ?? 0,
    ok: true,
    results,
    threshold: OBJECT_NEAR,
  }
}

/** Открыть объект: карточка, текст частями, адрес файла. */
export async function open_object({ id, from } = {}) {
  const key = String(id ?? "").trim()
  if (!key) return { error: "no-id", ok: false }
  const r = await open({ from: Number(from ?? 0) || 0, id: key })
  if (!r.ok) return { error: r.error, ok: false }
  return { ...r, file: `/v1/objects/${encodeURIComponent(key)}/file` }
}
