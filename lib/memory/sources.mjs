// КТО МНЕ ПИСАЛ — КАТАЛОГ ИСТОЧНИКОВ (207-6).
//
// 🪦 ЭТО ЗАМЕНА «КОГО ТЫ ЗНАЕШЬ». Прежний вопрос считал ЛЮДЕЙ — группировкой по
// колонке `who`, — и с 207-3 отвечал бы всегда одно и то же: архитектор. Слово
// владельца 2026-09-16: «зачем будем создавать колонку в которой нет никакой
// разницы». Разница есть у другого вопроса: какая служба и какая её сущность
// присылала сообщения.
//
// 🔒 ОТВЕТ СЧИТАЕТСЯ ГРУППИРОВКОЙ ПО ЕДИНСТВЕННОЙ ТАБЛИЦЕ, А НЕ ХРАНИТСЯ.
// Отдельная таблица источников была бы второй правдой: она разошлась бы с
// сообщениями на первой же записи мимо неё.
//
// 🔒 ЭТО КАТАЛОГ, А НЕ ГЛАГОЛ. Глаголов у памяти три — сказать, спросить,
// прокомментировать; всё, что отвечает на вопрос «что у тебя есть», живёт
// адресом. Смешав одно с другим, мы предложили бы агенту думать о хранении
// наравне с делом.

import { MESSAGES } from "./messages.mjs"
import { printSource, serviceOf } from "./source.mjs"
import { sql } from "./store.mjs"
import { toolFailure } from "./tools.mjs"

/**
 * Какие источники писали в память, сверху — те, кто начал раньше.
 *
 * 🛑 `legacy` ЗДЕСЬ ТОЖЕ ВИДЕН, И ЭТО ЧЕСТНО: строки, пришедшие до 207-2, своего
 * происхождения не знают, и прятать их значило бы утверждать, что вся память
 * пришла из названных служб.
 */
export async function sources({ lang } = {}) {
  const r = await sql(
    `SELECT source_path AS path, COUNT(*) AS n, MIN(created_at) AS since, MAX(created_at) AS last
       FROM ${MESSAGES}
      -- 🛑 219-6: СЧИТАЕТСЯ ВХОДЯЩЕЕ, А НЕ ОТВЕТЫ ПАМЯТИ. Каталог отвечает на вопрос «кто мне писал»;
      -- с появлением строк ответа (219-1) он начал бы считать и СВОИ реплики, и число сообщений каждой
      -- службы удвоилось бы молча — та же цифра, означающая другое.
      WHERE source_path IS NOT NULL AND source_path <> '' AND (direction IS NULL OR direction <> 'answer')
      GROUP BY source_path ORDER BY MIN(id)`,
  )
  // 🔒 207-7: род зависимости называется и здесь — каталог источников читает ту же базу.
  if (!r.ok) return toolFailure({ error: r.error, lang, stage: "каталог источников" })

  const rows = (r.rows ?? []).map((x) => ({
    last: x.last,
    messages: Number(x.n),
    path: x.path,
    printed: printSource(x.path),
    service: serviceOf(x.path),
    since: x.since,
  }))
  // Служб меньше, чем путей: у одной службы бывает много сущностей. Оба числа полезны, и оба названы.
  const services = [...new Set(rows.map((x) => x.service))]

  return {
    ok: true,
    services,
    sources: rows,
    what_happened:
      lang === "en"
        ? `sources: ${rows.length} from ${services.length} services`
        : `источников: ${rows.length} из ${services.length} служб`,
  }
}
