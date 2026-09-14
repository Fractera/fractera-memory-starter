// ФОРМА ОТВЕТА ДВУХ ГЛАГОЛОВ — ОДНО ОБЪЯВЛЕНИЕ НА СХЕМУ И НА ПРОВЕРКУ (200-6).
//
// 🎯 Слово владельца 2026-09-14: «Только объект который включает в себя текст и и идентификаторы объектов которые любой другой инструмент
// сможет сам достать… в тексте просто делаешь перечисления всех фактов с которыми ты столкнулся, а вот схема предстоит тебе разработать
// потому что все что мы засунули внутрь должно быть так же типизированы в этом объекте».
//
// 🔒 ОДНО ОБЪЯВЛЕНИЕ, ДВА ПОТРЕБИТЕЛЯ: `contract.mjs` отдаёт наружу JSON Schema, порождённую отсюда (`z.toJSONSchema`), а прибор и
// сторож проверяют живые ответы этими же схемами. Рукописная JSON Schema рядом с кодом ответа разошлась бы с ним молча.
// 🔒 ОБЯЗАТЕЛЬНОЕ У ЛЮБОГО ОТВЕТА — И УСПЕХА, И ОТКАЗА: `ok`, `what_happened`, `text`, `objects`. Остальные поля описаны типами и
// необязательны: у каждого ответа свой набор, и лишнего поля схема не запрещает — прежние потребители не ломаются.

import { z } from "zod"

/** Объект, который ответ задел: записал, нашёл или отверг. По `id` любой инструмент достаёт объект сам. */
const ObjectRef = z
  .object({
    ok: z.boolean().describe("лёг или найден — true; отвергнут — false"),
    id: z.string().nullable().optional().describe("id объекта в хранилище объектов"),
    messageId: z.number().nullable().optional().describe("номер строки messages_that_came_into_memory"),
    kind: z.string().nullable().optional().describe("род: image · audio · video · pdf · markdown · html · code · text · web · youtube"),
    title: z.string().nullable().optional(),
    name: z.string().nullable().optional().describe("имя файла вложения"),
    url: z.string().nullable().optional().describe("адрес ссылки или файла вложения"),
    score: z.number().nullable().optional().describe("близость к вопросу — у найденных"),
    existing: z.boolean().optional().describe("ссылка уже была в памяти — новая запись не создана"),
    error: z.string().optional(),
    why: z.string().optional(),
  })
  .loose()

const ParamFate = z
  .object({
    name: z.string(),
    state: z.enum(["accepted", "not_supported", "bad_form"]),
    note: z.string(),
  })
  .loose()

const common = {
  ok: z.boolean(),
  what_happened: z.string().describe("словами, которые можно произнести человеку"),
  text: z.string().describe("перечисление всех фактов и объектов ответа — строка на каждый"),
  objects: z.array(ObjectRef).describe("объекты, которые ответ задел; пустой список — объектов нет"),
  error: z.string().optional().describe("код отказа"),
  refusal: z.string().optional().describe("код отказа модели"),
  missing: z.array(z.string()).optional().describe("каких обязательных полей не хватило"),
  params: z.array(ParamFate).optional().describe("судьба каждого присланного необязательного параметра"),
}

export const RememberOutput = z
  .object({
    ...common,
    noted: z.array(z.object({ what: z.string() }).loose()).optional().describe("что записано: род и значение у каждой записи"),
    thread: z.string().optional().describe("имя нити разбора — пришлите обратно, чтобы продолжить"),
  })
  .loose()

export const RecallOutput = z
  .object({
    ...common,
    known: z
      .array(z.object({ what: z.string(), value: z.unknown() }).loose())
      .optional()
      .describe("что известно: род, значение, from_table, claim, basis"),
    not_yet_known: z.array(z.unknown()).optional(),
    used_model: z.boolean().optional(),
    depth_asked: z.string().optional(),
    depth_used: z.number().optional(),
    used_input: z.unknown().optional(),
    chain: z.array(z.string()).optional(),
    objects_error: z.string().optional().describe("поиск объектов не ответил — причина; objects тогда пуст"),
  })
  .loose()

/** Схемы по имени глагола — для договора, прибора и сторожа. */
export const OUTPUTS = { recall: RecallOutput, remember: RememberOutput }

/** JSON Schema ответа глагола — ровно то, что уходит в `GET /v1/contract`. */
export function outputSchemaOf(verb) {
  const schema = OUTPUTS[verb]
  return schema ? z.toJSONSchema(schema) : null
}
