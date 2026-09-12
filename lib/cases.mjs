import { sql } from "./store.mjs"

// КОРПУС СЛУЧАЕВ СТЕНДА — ПРОГОНЫ, ИХ ЦЕНА И ВЕРДИКТ ЧЕЛОВЕКА (189-5).
//
// 🎯 ТРЕТЬЯ ТРЕТЬ ЗАКАЗА ВЛАДЕЛЬЦА: «затем получить оценку того что найдено».
//
// 🔒 САМООЦЕНКА МОДЕЛИ ЗАПРЕЩЕНА КАК ИСТОЧНИК ВЕРДИКТА (паспорт §11), И ЭТО НЕ
// ПРЕДОСТОРОЖНОСТЬ, А ОПЛАЧЕННЫЙ ЗАКОН. Модель, пересказывающая собственную
// работу, ошибается В СВОЮ ПОЛЬЗУ: «нашла» звучит лучше, чем «не нашла».
// Поэтому вердикт приходит СНАРУЖИ — от человека, кнопкой.
// 🛑 ПОКА ВЕРДИКТА НЕТ, ПРОГОН СЧИТАЕТСЯ НЕЗАВЕРШЁННЫМ, А НЕ УДАЧНЫМ. Молчание
// как согласие сделало бы долю удачных прогонов бессмысленной: она росла бы от
// того, что человек ушёл пить чай.
//
// 🔒 ЭТО ДАННЫЕ, И ОНИ В ХРАНИЛИЩЕ — ЗАКОН 0 ПРОЕКТА: определения живут в папке
// и откатываются коммитом, данные растут и сравниваются запросом. Корпус
// случаев растёт с каждым прогоном и сравнивается запросом — значит его место
// здесь, а не в файле.
//
// 🔒 ЦЕНА ЛОЖИТСЯ ВМЕСТЕ С ВЕРДИКТОМ, А НЕ ОТДЕЛЬНО. «Нашло то» без цены не
// отвечает на вопрос «а сколько это стоило»; две таблицы вместо одной
// разошлись бы на первой правке.

/** Имя таблицы. Своё, и по нему же прибор убирает за собой. */
export const CASES = "memory_bench_cases"

/**
 * Завести таблицу, если её ещё нет.
 *
 * 🛑 КОЛОНКА — НЕ ТАБЛИЦА: `CREATE TABLE IF NOT EXISTS` там, где таблица уже
 * есть, не делает НИЧЕГО. Колонка, добавленная позже, пойдёт лестницей `ALTER`
 * рядом с этим образцом — тот же закон, что в `lib/store.mjs` и в службе
 * Telegram, где он оплачен трижды.
 * 🛑 SQL ЗДЕСЬ НЕ СОДЕРЖИТ `strftime` И ПРОЧИХ ФУНКЦИЙ БЕЗ КАВЫЧЕК: в соседней
 * службе три формы таблиц оказались невалидными, `CREATE TABLE` отвергался
 * целиком, а снаружи всё выглядело зелёным, потому что таблицы создали приборы.
 */
export async function ensureCases() {
  return sql(
    `CREATE TABLE IF NOT EXISTS ${CASES} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      store TEXT NOT NULL,
      question TEXT NOT NULL,
      legacy INTEGER NOT NULL DEFAULT 0,
      found INTEGER NOT NULL DEFAULT 0,
      entities INTEGER NOT NULL DEFAULT 0,
      words_ms INTEGER NOT NULL DEFAULT 0,
      ask_ms INTEGER NOT NULL DEFAULT 0,
      model_turn TEXT,
      keywords TEXT,
      verdict TEXT,
      why TEXT,
      created_at TEXT NOT NULL,
      judged_at TEXT
    )`,
  )
}

/**
 * Записать прогон. Вердикта у него ещё нет — и это его законное состояние.
 *
 * 🔒 ВРЕМЯ ПИШЕМ МЫ, А НЕ УМОЛЧАНИЕ БАЗЫ. Умолчание печатает секунды, и два
 * прогона внутри одной секунды получили бы одинаковую метку; сортировка идёт
 * по `id`, а метка нужна человеку глазами.
 */
export async function noteRun(run) {
  await ensureCases()
  const r = await sql(
    `INSERT INTO ${CASES}
      (store, question, legacy, found, entities, words_ms, ask_ms, model_turn, keywords, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      String(run.store ?? "graph"),
      String(run.question ?? ""),
      run.legacy ? 1 : 0,
      run.found ? 1 : 0,
      Number(run.entities ?? 0),
      Number(run.wordsMs ?? 0),
      Number(run.askMs ?? 0),
      String(run.modelTurn ?? "unknown"),
      run.keywords ? JSON.stringify(run.keywords).slice(0, 2000) : null,
      new Date().toISOString(),
    ],
  )
  if (!r.ok) return { ok: false, ...r }

  // 🔒 НОМЕР ПРОГОНА НУЖЕН СРАЗУ: без него экран не сможет прикрепить вердикт к
  // тому, что человек только что видел. Читаем последний СВОЙ по вопросу и
  // времени, а не `last_insert_rowid()` — слой данных держит соединение сам, и
  // «последняя вставка» могла бы оказаться чужой.
  const back = await sql(
    `SELECT id FROM ${CASES} WHERE question = ? ORDER BY id DESC LIMIT 1`,
    [String(run.question ?? "")],
  )
  return { id: Number(back.rows?.[0]?.id ?? 0), ok: true }
}

/**
 * Поставить вердикт человека.
 *
 * 🔒 ДВА ЗНАЧЕНИЯ И НИЧЕГО ПРОМЕЖУТОЧНОГО: `good` или `bad`. «Скорее да» и
 * «не уверен» превратили бы долю удачных в вопрос вкуса — а она нужна затем,
 * чтобы сравнивать версии навыков числом.
 */
export async function judge({ id, verdict, why }) {
  if (verdict !== "good" && verdict !== "bad") return { error: "bad-verdict", ok: false }
  await ensureCases()
  return sql(
    `UPDATE ${CASES} SET verdict = ?, why = ?, judged_at = ? WHERE id = ?`,
    [verdict, String(why ?? "").slice(0, 1000) || null, new Date().toISOString(), Number(id)],
  )
}

/** Последние случаи и сводка по ним. */
export async function caseBook(limit = 25) {
  await ensureCases()
  const rows = await sql(
    `SELECT id, store, question, legacy, found, entities, words_ms, ask_ms, model_turn,
            verdict, why, created_at
       FROM ${CASES} ORDER BY id DESC LIMIT ?`,
    [Number(limit)],
  )
  if (!rows.ok) return { cases: [], ok: false, summary: null, ...rows }

  // 🔒 СВОДКА СЧИТАЕТСЯ ПО ВСЕМ СЛУЧАЯМ, А НЕ ПО ПОКАЗАННОЙ СТРАНИЦЕ: иначе
  // доля удачных менялась бы от того, сколько строк влезло на экран.
  const agg = await sql(
    `SELECT COUNT(*) AS total,
            SUM(CASE WHEN verdict = 'good' THEN 1 ELSE 0 END) AS good,
            SUM(CASE WHEN verdict = 'bad' THEN 1 ELSE 0 END) AS bad,
            SUM(CASE WHEN verdict IS NULL THEN 1 ELSE 0 END) AS pending,
            AVG(ask_ms) AS avg_ask
       FROM ${CASES}`,
  )
  const a = agg.rows?.[0] ?? {}
  return {
    cases: rows.rows ?? [],
    ok: true,
    summary: {
      avgAsk: Math.round(Number(a.avg_ask ?? 0)),
      bad: Number(a.bad ?? 0),
      good: Number(a.good ?? 0),
      // 🛑 НЕЗАВЕРШЁННЫЕ НАЗЫВАЮТСЯ ОТДЕЛЬНО И В ДОЛЮ УДАЧНЫХ НЕ ВХОДЯТ.
      pending: Number(a.pending ?? 0),
      total: Number(a.total ?? 0),
    },
  }
}

/**
 * Убрать случаи прибора — по его метке в тексте вопроса.
 *
 * 🛑 ПРИБОР УБИРАЕТ ЗА СОБОЙ ПО СВОЕЙ МЕТКЕ, А НЕ `DELETE FROM <таблица>`.
 * ✗ В соседней службе прибор стирал таблицы личной памяти целиком — то есть
 * живую память владельца, — и снаружи это было неотличимо от «памяти никогда
 * не было».
 */
export async function forgetProbeCases(mark) {
  const m = String(mark ?? "").trim()
  if (!m) return { error: "empty-mark", ok: false }
  await ensureCases()
  return sql(`DELETE FROM ${CASES} WHERE question LIKE ?`, [`%${m}%`])
}
