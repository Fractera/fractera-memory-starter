// ДВА ГЛАГОЛА: СКАЗАТЬ И СПРОСИТЬ. Всё, что мир умеет делать с памятью.
//
// 🔒 СНАРУЖИ ПРИХОДИТ ЧЕЛОВЕЧЕСКАЯ ФРАЗА, А НЕ СХЕМА. Решение владельца: «агент
// снаружи говорит: на тебе это и сделай то, что надо». Куда лечь, заводить ли
// колонку, рождать ли сущность — решает память, и наружу об этом не рассказывает.

import { ask, haveKey, REFUSAL, REFUSAL_WORDS } from "./model.mjs"
import { appendToTable, promote, tableExists, tableForKind, valuesFromTable } from "./promote.mjs"
import { normalizeName } from "./naming.mjs"
import { ROOT, ROOT_HISTORY } from "./naming.mjs"
import {
  addColumn, BASIS_SUFFIX, CLAIM, CLAIM_SUFFIX, columnsOfChecked,
  ensureRoot, ourTables, REQUIRED_COLUMNS, rowOf, sql,
} from "./store.mjs"

/** Колонки, которые не являются знанием о человеке. */
const BOOKKEEPING = new Set(["id", "who", "created_at"])

/** Парная колонка рода или основания — не знание, а разметка знания. */
const isPair = (c) => c.endsWith(CLAIM_SUFFIX) || c.endsWith(BASIS_SUFFIX)

const refusal = (r) => ({ ok: false, refusal: r, what_happened: REFUSAL_WORDS[r] ?? r })

// ── СКАЗАТЬ ──────────────────────────────────────────────────────────────────

const EXTRACT = `Ты разбираешь фразу человека и достаёшь из неё факты О САМОМ ЧЕЛОВЕКЕ.

Верни JSON: {"facts":[{"kind":"...","value":"...","about_himself":true,"claim":"said|guess","basis":"...","intent":"add|correct"}]}

Правила для "kind":
- 🛑 ГЛАВНОЕ: если понятие уже есть в списке «ЧТО УЖЕ ЗАВЕДЕНО» ниже — БЕРИ ОТТУДА ИМЯ БУКВА В БУКВУ.
  Новое имя для того же понятия заводит второе место под одно и то же, и они разойдутся навсегда.
- Только если ничего не подходит — придумай новое имя. Требования жёсткие:
  · ТОЛЬКО английские слова в нижнем регистре через подчёркивание;
  · НЕ МЕНЬШЕ ЧЕТЫРЁХ СЛОВ — это ФРАЗА, объясняющая себя, а не ярлык;
  · в имени сказано, ЧЬЁ это и ЧТО это.
  Плохо: "language", "friend_name", "city", "car" — по ним придётся переспрашивать.
  Хорошо: "language_he_speaks_with_us", "people_he_calls_his_friends",
          "city_where_he_lives_now", "cars_that_belong_to_him".
  🔒 Имя вечное: по нему потом ищут, и переименовать его нельзя. Ярлык из двух слов заставит
  каждого следующего лезть за описанием — а хорошее имя отвечает само.

Правила для "value": словами человека, кратко, без пересказа.
"about_himself": false, если факт о ком-то другом, а не о самом говорящем.

Правила для "claim" — это ГЛАВНОЕ, не угадывай:
- "said" — человек сказал это ПРЯМО, своими словами;
- "guess" — ты вывел это сам из того, КАК он написал, а не из того, ЧТО он написал.
- У "guess" поле "basis" ОБЯЗАТЕЛЬНО: из чего вывел. Без основания догадка через неделю
  неотличима от свидетельства человека, поэтому такой факт будет отброшен.
- Сомневаешься — ставь "guess". Ложное "said" превращает твою догадку в его слова.
Фактов нет — верни {"facts":[]}. Не выдумывай ничего, чего человек не сказал.

🔒 ФРАЗА МОЖЕТ ИСПРАВЛЯТЬ РАНЕЕ СКАЗАННОЕ. «Нет, всё-таки на украинском» — это факт о языке,
а не пустая реплика: смотри в «ЧТО УЖЕ ЗАВЕДЕНО», найди, что человек поправляет, и верни тот же
"kind" с новым значением.

🛑 САМОЕ ВАЖНОЕ ПОЛЕ — "intent". У этого рода уже есть значение, и надо решить, что делает человек:
- "correct" — ИСПРАВЛЯЕТ прежнее: «нет», «всё-таки», «я ошибся», «не 50, а 49». Прежнее перестаёт
  быть верным.
- "add" — ДОБАВЛЯЕТ ещё одно: «ещё», «также», «а также», «и», простое перечисление. Прежнее
  остаётся верным.
🔒 СОМНЕВАЕШЬСЯ — СТАВЬ "add". Ошибочное "correct" СТИРАЕТ то, что человек говорил, и вернуть это
нельзя. Ошибочное "add" всего лишь оставляет лишнее, и человек поправит одной фразой.`

/**
 * Принять сказанное человеком.
 *
 * 🔒 ПРОТИВОРЕЧИЕ: ПОСЛЕДНЕЕ ПОБЕЖДАЕТ, НО ВСЛУХ (решение владельца 2026-09-09).
 * Прежнее уходит в историю, а в ответе прямо сказано «было X, стало Y» — чтобы
 * случайная оговорка не стёрла верное значение молча.
 */
export async function remember({ text, who }) {
  if (!who || !text) return { error: "need-who-and-text", ok: false }
  if (!haveKey()) return refusal(REFUSAL.NO_KEY)

  const ready = await ensureRoot()
  if (!ready.ok) return { error: ready.error, ok: false, what_happened: "хранилище недоступно" }

  // 🔒 МОДЕЛЬ ВИДИТ ТО, ЧТО УЖЕ ЗАВЕДЕНО, И ЭТО НЕ УДОБСТВО, А ЗАЩИТА ОТ ВЗРЫВА
  // СХЕМЫ. ✗ Измерено на первом же живом прогоне 175-2: без списка модель на
  // «живу в поясе Мадрида» выдала `timezone_where_he_lives`, хотя обязательное
  // поле зовётся `time_zone_he_lives_in` — то есть завела ВТОРОЕ место под одно
  // понятие. Каждая новая формулировка человека рождала бы новую колонку.
  // 🔒 И ВТОРОЕ, ЧТО ЭТО ЧИНИТ: фраза-исправление («нет, всё-таки на украинском»)
  // без контекста не факт вовсе — модель просто не знала, что именно правят.
  const knownNow = await rowOf(who)
  const catalogue = Object.entries(knownNow ?? {})
    .filter(([c]) => !BOOKKEEPING.has(c) && !isPair(c))
    .map(([c, val]) => `- ${c}${val ? ` (сейчас: ${val})` : " (пока пусто)"}`)
    .join(String.fromCharCode(10))

  const answer = await ask(
    `${EXTRACT}

ЧТО УЖЕ ЗАВЕДЕНО у этого человека:
${catalogue || "(пока ничего)"}`,
    text,
  )
  if (!answer.ok) return refusal(answer.refusal)

  const facts = Array.isArray(answer.data?.facts) ? answer.data.facts : []
  if (facts.length === 0) {
    return { noted: [], ok: true, what_happened: "в этой фразе фактов о человеке нет" }
  }

  // 🛑 НЕЧИТАЕМЫЕ КОЛОНКИ — ОТКАЗ, А НЕ «ИХ НЕТ». Пустой список выглядел бы как
  // «все роды новые», и мы завели бы вторые места под существующие понятия.
  const columns = await columnsOfChecked(ROOT)
  if (!columns.ok) {
    return { error: columns.error, ok: false, what_happened: "не удалось прочитать, что уже заведено" }
  }
  const have = columns.columns
  const noted = []
  const skipped = []
  // 🛑 НИ ОДИН ФАКТ НЕ ОТБРАСЫВАЕТСЯ МОЛЧА. ✗ Оплачено первым живым прогоном
  // 175-2: модель вернула факты, все были отброшены, и наружу ушло бодрое
  // «записывать было нечего» — отладка заняла три захода. Молчаливый пропуск
  // неотличим от «во фразе ничего не было».
  const dropped = []

  for (const f of facts) {
    // 🛑 ФАКТ О ТРЕТЬЕМ ЛИЦЕ ПОКА НЕ ХРАНИМ, И ЭТО СКАЗАНО, А НЕ ПРОГЛОЧЕНО.
    // Молчаливый пропуск читается как «записано».
    if (f?.about_himself === false) {
      skipped.push(String(f.value ?? "").slice(0, 80))
      continue
    }
    const kind = normalizeName(f?.kind)
    const value = typeof f?.value === "string" ? f.value.trim() : ""
    if (!kind) {
      dropped.push(`имя рода не годится: «${String(f?.kind ?? "")}»`)
      continue
    }
    if (!value) {
      dropped.push(`пустое значение у «${kind}»`)
      continue
    }

    // 🔒 РОД ПРОВЕРЯЕМ МЫ, А НЕ ОБЕЩАЕТ МОДЕЛЬ. Она вернёт правдоподобное
    // значение вне договора, и выглядеть оно будет убедительно.
    const claim = f?.claim === CLAIM.SAID || f?.claim === CLAIM.GUESS ? f.claim : ""
    // 🔒 УМОЛЧАНИЕ БЕЗОПАСНОЕ, И АСИММЕТРИЯ ЗДЕСЬ НЕ ВКУСОВАЯ: ошибочное
    // «исправляет» СТИРАЕТ сказанное человеком и вернуть его нельзя; ошибочное
    // «добавляет» оставляет лишнее, и он поправит одной фразой. Поэтому всё,
    // что не названо явно исправлением, считается добавлением.
    const corrects = f?.intent === "correct"
    const basis = typeof f?.basis === "string" ? f.basis.trim() : ""
    // 🛑 ДОГАДКА БЕЗ ОСНОВАНИЯ ОТБРАСЫВАЕТСЯ ЦЕЛИКОМ. Через неделю она
    // неотличима от свидетельства человека — а тогда её уже не отличить никогда.
    if (claim === CLAIM.GUESS && !basis) {
      skipped.push(`догадка без основания: ${value.slice(0, 60)}`)
      continue
    }

    // 🔒 РОД, УЖЕ СТАВШИЙ ТАБЛИЦЕЙ, ОБРАТНО В ПОЛЕ НЕ ВОЗВРАЩАЕТСЯ. Третий друг —
    // просто ещё одна строка; повышать нечего, оно уже повышено.
    const kindTable = tableForKind(kind)
    if (await tableExists(kindTable)) {
      const put = await appendToTable({ basis, claim, kind, value, who })
      if (!put.ok) {
        dropped.push(`не удалось дописать «${value}» к «${kind}»: ${put.error ?? "?"}`)
        continue
      }
      noted.push({
        added: value,
        already: put.already === true,
        claim: claim || null,
        from_table: kindTable,
        what: kind,
      })
      continue
    }

    if (!have.includes(kind)) {
      const made = await addColumn(ROOT, kind)
      if (!made.ok) {
        dropped.push(`не удалось завести место под «${kind}»: ${made.error ?? "?"}`)
        continue
      }
      have.push(kind)
    }

    const cur = await sql(`SELECT ${kind} AS v FROM ${ROOT} WHERE who = ?`, [who])
    const was = cur.ok && cur.rows.length ? cur.rows[0].v : null

    if (was === value) {
      noted.push({ already: true, value, what: kind })
      continue
    }

    // 🔒 ВОТ ТОЧКА ПЕРЕЛОМА, РАДИ КОТОРОЙ ЗАВЕДЁН ПОДШАГ 175-5. У рода уже есть
    // значение, и пришло второе. Если человек ДОБАВЛЯЕТ — поле перестало быть
    // подходящей формой: одно место не держит двух значений, и «Дима → Денис»
    // в поле стало бы неразличимо с «Миша → Дима».
    if (was !== null && was !== undefined && was !== "" && !corrects) {
      const up = await promote({ basis, claim, kind, newValue: value, who, words: text })
      if (!up.ok) {
        dropped.push(`не удалось повысить «${kind}» в таблицу: ${up.error ?? "?"}`)
        continue
      }
      noted.push({
        added: up.added,
        became_table: up.table,
        claim: claim || null,
        from_table: up.table,
        moved: up.moved,
        what: kind,
      })
      continue
    }

    await sql(
      `UPDATE ${ROOT} SET ${kind} = ?, ${kind}${CLAIM_SUFFIX} = ?, ${kind}${BASIS_SUFFIX} = ? WHERE who = ?`,
      [value, claim || null, basis || null, who],
    )
    if (was !== null && was !== undefined && was !== "") {
      await sql(
        `INSERT INTO ${ROOT_HISTORY} (who, what_changed, was, became, his_words) VALUES (?, ?, ?, ?, ?)`,
        [who, kind, was, value, text.slice(0, 500)],
      )
    }
    noted.push({ became: value, claim: claim || null, from_table: ROOT, was: was ?? null, what: kind })
  }

  // 🔒 ОТВЕЧАЕМ СЛОВАМИ, КОТОРЫЕ АГЕНТ МОЖЕТ ПРОИЗНЕСТИ ЧЕЛОВЕКУ. Ни имён
  // таблиц, ни слова «колонка»: наружу уходит знание, а не устройство.
  const said = noted
    .map((n) =>
      n.became_table
        ? `теперь ${n.what.replace(/_/g, " ")} веду списком: там уже «${n.moved}» и «${n.added}»`
        : n.added
          ? n.already
            ? `это уже есть в списке «${n.what.replace(/_/g, " ")}»: ${n.added}`
            : `добавил в «${n.what.replace(/_/g, " ")}»: ${n.added}`
        : n.already
        ? `это уже было записано: ${n.what.replace(/_/g, " ")} — ${n.value}`
        : n.was
          ? `было «${n.was}», стало «${n.became}»`
          : n.claim === CLAIM.GUESS
            ? `похоже, что ${n.what.replace(/_/g, " ")} — ${n.became} (это моя догадка, поправьте)`
            : `запомнил: ${n.what.replace(/_/g, " ")} — ${n.became}`,
    )
    .join("; ")

  // 🔒 ЕСЛИ ФАКТЫ БЫЛИ, А ЗАПИСАНО НИЧЕГО — ЭТО СКАЗАНО ПРЯМО, А НЕ БОДРЫМ
  // «нечего»: разница между «во фразе не было фактов» и «факты были, но не
  // легли» — это разница между нормой и дефектом.
  const nothing = dropped.length
    ? `факты нашлись, но ни один не записан: ${dropped.join("; ")}`
    : "записывать было нечего"

  return {
    dropped,
    noted,
    ok: true,
    skipped_not_about_him: skipped,
    what_happened: said || nothing,
  }
}

// ── СПРОСИТЬ ─────────────────────────────────────────────────────────────────

/**
 * Что память знает о человеке.
 *
 * 🔒 БЕЗ ВОПРОСА — ОТДАЁМ ВСЁ, И ЭТО НЕ СТОИТ НИ ОДНОГО ВЫЗОВА МОДЕЛИ.
 * Именно этот путь обязан быть мгновенным: «что ты знаешь обо мне» — один
 * вопрос, и он не требует размышления.
 *
 * 🔒 С ВОПРОСОМ — СНАЧАЛА МЕХАНИЧЕСКИ, МОДЕЛЬ ТОЛЬКО ПРИ ПРОМАХЕ. Порядок, а не
 * запрет: без него «без модели» через месяц становится «модель зовётся всегда,
 * просто позже».
 */
export async function recall({ text, who }) {
  if (!who) return { error: "need-who", ok: false }

  const ready = await ensureRoot()
  if (!ready.ok) return { error: ready.error, ok: false, what_happened: "хранилище недоступно" }

  const row = await rowOf(who)
  if (!row) return { known: [], ok: true, what_happened: "о человеке не записано ничего" }

  const known = []
  const missing = []
  for (const [col, v] of Object.entries(row)) {
    if (BOOKKEEPING.has(col) || isPair(col)) continue
    if (v === null || v === undefined || v === "") {
      if (col in REQUIRED_COLUMNS) missing.push({ what: col, why: REQUIRED_COLUMNS[col] })
      continue
    }
    // 🔒 РОД ЕДЕТ ВМЕСТЕ СО ЗНАЧЕНИЕМ. Прочитать догадку без её рода — значит
    // отмыть её в факт: снаружи она станет неотличима от слов человека.
    // 🔒 ОТВЕТ НАЗЫВАЕТ СВОЙ ИСТОЧНИК (замысел владельца 2026-09-09): «когда мы
    // возвращаем ответ, мы упоминаем, какая именно таблица дала этот ответ».
    // Два довода, и оба самостоятельные:
    // ① ответ, не называющий источник, невозможно проверить — мы уже возим
    //   происхождение РОДА значения (claim/basis), источник есть происхождение
    //   МЕСТА, и половина без второй половины неполна;
    // ② сессия внешнего агента длинная, и он выучит имена — станет спрашивать
    //   метче. 🛑 Точнее, а не быстрее: цена ответа — ходы модели, а recall как
    //   был одним вызовом, так и остаётся.
    //
    // 🛑 ИМЯ ИСТОЧНИКА НАЗЫВАЕТСЯ В ОТВЕТЕ И НИКОГДА НЕ ПРИНИМАЕТСЯ В ВОПРОСЕ.
    // Пока recall берёт только человеческую фразу, знание имён у агента
    // ИНЕРТНО — применить его некуда, кроме как спросить точнее. Появись
    // параметр «спроси вот из этой таблицы» — агент начнёт решать за память,
    // где искать, и мы вернёмся туда, откуда ушли.
    known.push({
      basis: row[col + BASIS_SUFFIX] ?? null,
      claim: row[col + CLAIM_SUFFIX] ?? null,
      from_table: ROOT,
      value: v,
      what: col,
    })
  }

  // 🔒 РОД, СТАВШИЙ ТАБЛИЦЕЙ, ЧИТАЕТСЯ ОТТУДА — ИНАЧЕ ПОВЫШЕНИЕ ВЫГЛЯДЕЛО БЫ
  // КАК ПОТЕРЯ. Поле после переезда пусто намеренно; не заглянув в таблицу,
  // память ответила бы «не знаю» о том, что сама же и переложила.
  const grown = await ourTables()
  for (const table of grown) {
    if (table === ROOT || table === ROOT_HISTORY) continue
    const kind = table.slice(ROOT.length + 2)
    const rows = await valuesFromTable({ table, who })
    for (const r of rows) {
      known.push({
        basis: r.basis ?? null,
        claim: r.claim ?? null,
        from_table: table,
        moved_here: Boolean(r.came_from_column),
        value: r.value,
        what: kind,
      })
    }
  }

  if (!text) {
    return {
      known,
      not_yet_known: missing,
      ok: true,
      used_model: false,
      what_happened: known.length ? `известно ${known.length}` : "о человеке не записано ничего",
    }
  }

  // Механический поиск: слова вопроса против слов в имени рода.
  const words = text.toLowerCase().split(/[^a-zа-яё0-9]+/).filter((w) => w.length > 2)
  const hit = known.find((k) => {
    const parts = k.what.split("_")
    return parts.some((p) => words.includes(p))
  })
  if (hit) {
    return {
      known: [hit],
      ok: true,
      used_model: false,
      what_happened: `${hit.what.replace(/_/g, " ")}: ${hit.value}`,
    }
  }

  // 🛑 ПРОМАХ НАЗЫВАЕТСЯ ПРОМАХОМ. В первой итерации память НЕ зовёт модель на
  // чтение: она отдаёт всё, что знает, и говорит, что точного совпадения не
  // нашла. Позвать модель здесь — отдельное решение, а не мелочь: оно превратит
  // мгновенное чтение в чтение ценой вызова.
  return {
    known,
    not_yet_known: missing,
    ok: true,
    used_model: false,
    what_happened: "точного совпадения с вопросом нет — вот всё, что известно",
  }
}
