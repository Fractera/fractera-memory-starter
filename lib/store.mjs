// ХРАНИЛИЩЕ: единственное место, которое знает про SQL.
//
// 🔒 ЗА ДАННЫМИ ХОДИМ В СЛОЙ ДАННЫХ `:3300`, А НЕ ЗАВОДИМ СВОЮ БАЗУ.
// Федеральный закон: `:3300` — единственная дверь к данным. Отдельность памяти
// нужна **от агента и от приложения бота**, а не от слоя данных; своя база
// завела бы вторую правду о данных владельца.
//
// 🔒 ОТВЕТ ЧУЖОЙ СЛУЖБЫ ЧИТАЕТСЯ ЦЕЛИКОМ, А НЕ ПО КОДУ HTTP. Слой данных
// отвечает `200` с `{ok:false}` на отвергнутый SQL — правка «прошла бы» молча.
// Оплачено в проекте дважды.

import { readFileSync } from "node:fs"
import { isSafeName, ROOT } from "./naming.mjs"

const MACHINE_ENV = process.env.FRACTERA_MACHINE_ENV ?? "/etc/fractera/secrets.env"

/** Значение из склада секретов машины (с 194-16 — общее: им пользуется и `media-ingest.mjs`). */
export function machineEnv(name) {
  try {
    for (const line of readFileSync(MACHINE_ENV, "utf8").split("\n")) {
      const i = line.indexOf("=")
      if (i > 0 && line.slice(0, i).trim() === name) {
        return line.slice(i + 1).trim().replace(/^["']|["']$/g, "")
      }
    }
  } catch { /* вне сервера файла нет — законно */ }
  return ""
}

const DATA_URL = process.env.REMOTE_DATA_URL || machineEnv("REMOTE_DATA_URL") || "http://localhost:3300"
const DATA_SECRET = process.env.DATA_SECRET || machineEnv("DATA_SECRET") || ""

/** Один запрос к слою данных. Возвращает `{ok, rows}` либо `{ok:false, error}`. */
export async function sql(text, params = []) {
  if (!DATA_SECRET) return { error: "no-data-secret", ok: false }
  let res
  try {
    res = await fetch(`${DATA_URL}/db/migrate`, {
      body: JSON.stringify({ params, sql: text }),
      headers: { "Content-Type": "application/json", "X-Data-Secret": DATA_SECRET },
      method: "POST",
    })
  } catch (e) {
    return { error: "data-unreachable", ok: false, why: String(e.message) }
  }
  if (!res.ok) return { error: `data-http-${res.status}`, ok: false }
  const body = await res.json().catch(() => null)
  if (!body || body.ok === false) {
    return { error: "sql-rejected", ok: false, why: String(body?.error ?? "").slice(0, 200) }
  }
  // 🔒 НОМЕР ВСТАВЛЕННОЙ СТРОКИ ЕДЕТ НАРУЖУ (194-4): слой данных отдаёт его в ответе той же вставки,
  // а второй запрос `last_insert_rowid()` мог бы вернуть номер чужой. Прежние поля ответа не менялись.
  return { changes: body.changes, lastInsertRowid: body.lastInsertRowid, ok: true, rows: body.rows ?? [] }
}

// 🪦 ФОРМЫ КОРНЕВОЙ ТАБЛИЦЫ ЗДЕСЬ БОЛЬШЕ НЕТ (206-6), И ЭТО КОНЕЦ ДОЛГОЙ ЛИНИИ.
// Тут жили: два обязательных поля архитектора, парные суффиксы колонок рода и
// основания, создание корня с лестницей ALTER, заведение новой колонки, чтение
// строки человека и сторож нечитаемых колонок. Записывать в корень перестали в
// 206-1, читать — в 206-3, сами таблицы сняты в 206-4; объявления пережили свой
// предмет на три подшага и читались как след живого механизма.
// 🛑 ОПАСНЕЕ ПРОСТО МЁРТВОГО КОДА. Создатель формы корня СОЗДАВАЛ бы снятые таблицы
// заново, а чтение строки человека шло звёздочкой по всем колонкам — запрещённой
// федеральным законом. Позови их кто — удалённое вернулось бы молча.
// 🔒 ИМЁН ЗДЕСЬ НЕТ НАРОЧНО: цитата снятого кода неотличима от живого кода для любого
// счётчика, не разбирающего синтаксис. Надгробие пишется пересказом.
// 🔒 Род значения (`CLAIM`) остался: он про знание, а не про хранение.

/** Роды, которые память различает. Третьего у ЗНАЧЕНИЯ нет. */
export const CLAIM = { GUESS: "guess", SAID: "said" }

/**
 * Какие колонки есть у таблицы сейчас. Пустой список — таблицы нет.
 *
 * 🛑 `PRAGMA table_info(...)` ЧЕРЕЗ ДВЕРЬ СЛОЯ ДАННЫХ ВОЗВРАЩАЕТ `{"ok":true}`
 * БЕЗ СТРОК — ПРИТВОРЯЕТСЯ УСПЕХОМ. Работает табличная функция
 * `SELECT name FROM pragma_table_info('…')`, и разница измерена, а не угадана.
 *
 * ✗ ЧЕМ ОПЛАЧЕНО, ЖИВЫМ ПРОГОНОМ 175-2: список колонок приходил ПУСТЫМ, поэтому
 * каждый род значения выглядел новым, `ALTER` бился о существующую колонку и
 * падал — а наружу уходило бодрое «записывать было нечего». Три захода отладки.
 * 🔒 И ЗАКОН «ОТВЕТ ЧУЖОЙ СЛУЖБЫ ЧИТАЕТСЯ ЦЕЛИКОМ, А НЕ ПО КОДУ HTTP» ЗДЕСЬ
 * НЕДОСТАТОЧЕН: тело тоже говорило `ok:true`. **Проверять надо, что строки
 * ПРИШЛИ** — «успех» и «результат» разные утверждения.
 */
export async function columnsOf(table) {
  if (!isSafeName(table)) return []
  const r = await sql("SELECT name FROM pragma_table_info(?)", [table])
  return r.ok ? r.rows.map((x) => x.name).filter(Boolean) : []
}

/** Список наших таблиц — тех, что начинаются с корня. */
export async function ourTables() {
  const r = await sql(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE ? ORDER BY name",
    [`${ROOT}%`],
  )
  return r.ok ? r.rows.map((x) => x.name).filter(Boolean) : []
}

