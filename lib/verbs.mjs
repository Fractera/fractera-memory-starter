// ДВА ГЛАГОЛА: СКАЗАТЬ И СПРОСИТЬ. Всё, что мир умеет делать с памятью.
//
// 🔒 СНАРУЖИ ПРИХОДИТ ЧЕЛОВЕЧЕСКАЯ ФРАЗА, А НЕ СХЕМА. Решение владельца: «агент
// снаружи говорит: на тебе это и сделай то, что надо». Куда лечь, заводить ли
// колонку, рождать ли сущность — решает память, и наружу об этом не рассказывает.

// 🔒 ПАМЯТЬ ДУМАЕТ ЧЕРЕЗ `think.mjs`, А НЕ ЧЕРЕЗ `model.mjs`. Закон владельца
// 2026-09-09: «допуск к размышлениям для OpenAI запрещён». `model.mjs` жив и
// законен — он ждёт векторов и транскрипции, — но разбор фразы сюда больше не
// приходит. 🪦 Здесь стоял импорт разговора с OpenAI — его снял этот шаг.
// 🛑 НАДГРОБИЕ ПИШЕТСЯ ПЕРЕСКАЗОМ, А НЕ ЦИТАТОЙ КОДА, и цена измерена в тот же
// час: дословная цитата импорта заставила счётчик «кто зовёт OpenAI» показать
// единицу при нуле настоящих импортов. Греп не отличает комментарий от строки.
import { canThink, REFUSAL, refusalWords, think } from "./think.mjs"
import { say } from "./words.mjs"
// 🔒 НЕОБЯЗАТЕЛЬНЫЕ ПАРАМЕТРЫ — ОДНО МЕСТО НА ОБА ГЛАГОЛА (183-2…183-6).
// Проверка, написанная дважды, расходится молча: у одного глагола дата стала бы
// строгой, у другого какой угодно, и никто бы этого не заметил.
import { BUILT_LEVELS, readParams, searchWords } from "./params.mjs"
// 🔒 ЖУРНАЛ — ВЫХОД ПАМЯТИ ДЛЯ ГЛАЗ (177-1). Агенту закрыт вход в слои, значит
// слой рассказывает о себе сам. Пишем ПОПУТНО, рядом с ответом, а не отдельным
// заходом: один вызов дешевле, чем «сначала запишу, потом отвечу».
import { note } from "./journal.mjs"
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

// 🔒 НАРУЖУ ЕДУТ ОБА: КОД И СЛОВА (181-10). Код вечен и читается машиной,
// слова переводимы и читаются человеком; язык называет тот, кто зовёт.
const refusal = (r, lang) => ({ ok: false, refusal: r, what_happened: refusalWords(r, lang) })

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
export async function remember(input = {}) {
  const { lang, text, who } = input
  const startedAt = Date.now()

  // 🔒 НЕОБЯЗАТЕЛЬНЫЕ ПАРАМЕТРЫ ЗАПИСИ (183-6): охват, отрицание, требование
  // таблицы. Каждый получает названную судьбу — принят · способности нет · не
  // той формы, — и `params` едет наружу вместе с ответом.
  const { report: paramReport, values: extra } = readParams(input, [
    "scope", "deny", "need_table",
  ])
  const withParams = (body) => ({
    ...body,
    ...(paramReport.length ? { params: paramReport } : {}),
  })
  // Охват едет СПИСКОМ записей: у одной фразы бывает несколько дат и мест
  // (решение владельца 2026-09-11). В журнал уходят ВСЕ — потерянная запись
  // ничем не отличается от неприсланной.
  const scope = (extra.scope ?? [])
    .map((e) => [e.at, e.place].filter(Boolean).join(" "))
    .filter(Boolean)
    .join(" · ")
  // 🛑 ОТКАЗ НА ВХОДЕ ТОЖЕ ПОПАДАЕТ В ЖУРНАЛ, И ЭТО НЕ ПЕДАНТИЗМ. Снаружи
  // «памяти не сказали, кто говорит» и «память промолчала» выглядят одинаково;
  // различает их только запись о том, что вызов вообще был.
  if (!who || !text) {
    await note({
      asked: `who=${who ?? "—"} text=${text ?? "—"}`,
      method: "remember",
      ms: Date.now() - startedAt,
      trouble: say("need-who-and-text", "ru"),
    })
    return withParams({ error: "need-who-and-text", ok: false, what_happened: say("need-who-and-text", lang) })
  }
  if (!canThink()) {
    await note({
      asked: text,
      method: "remember",
      ms: Date.now() - startedAt,
      trouble: refusalWords(REFUSAL.NO_CLI, "ru"),
    })
    return withParams(refusal(REFUSAL.NO_CLI, lang))
  }

  const ready = await ensureRoot()
  if (!ready.ok) {
    return withParams({ error: ready.error, ok: false, what_happened: say("store-unreachable", lang) })
  }

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

  const answer = await think(
    `${EXTRACT}

ЧТО УЖЕ ЗАВЕДЕНО у этого человека:
${catalogue || "(пока ничего)"}`,
    text,
  )
  if (!answer.ok) {
    await note({
      asked: text,
      method: "remember",
      ms: Date.now() - startedAt,
      trouble: `${refusalWords(answer.refusal, "ru")}${answer.why ? ` — ${answer.why}` : ""}`,
    })
    return withParams(refusal(answer.refusal, lang))
  }

  const facts = Array.isArray(answer.data?.facts) ? answer.data.facts : []
  if (facts.length === 0) {
    await note({
      asked: text,
      decisions: [],
      method: "remember",
      model: "фактов о человеке не нашла",
      ms: Date.now() - startedAt,
      returned: say("no-facts-in-phrase", "ru"),
    })
    return withParams({ noted: [], ok: true, what_happened: say("no-facts-in-phrase", lang) })
  }

  // 🛑 НЕЧИТАЕМЫЕ КОЛОНКИ — ОТКАЗ, А НЕ «ИХ НЕТ». Пустой список выглядел бы как
  // «все роды новые», и мы завели бы вторые места под существующие понятия.
  const columns = await columnsOfChecked(ROOT)
  if (!columns.ok) {
    return withParams({ error: columns.error, ok: false, what_happened: say("columns-unreadable", lang) })
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

  // ── ТРЕБОВАНИЕ СОЗДАТЬ ТАБЛИЦУ (183-6) ─────────────────────────────────────
  //
  // 🔒 ПАРАМЕТР НЕ СТРОИТ ВТОРОГО МЕХАНИЗМА, А ЗОВЁТ СУЩЕСТВУЮЩИЙ. Обычно род
  // поднимается в свою таблицу на ВТОРОМ значении; требование зовущего лишь
  // отменяет ожидание второго. Напиши мы здесь своё создание таблицы — у одной
  // способности стало бы два пути, и они разошлись бы на первой правке.
  // 🛑 ПОДНИМАЕМ ТОЛЬКО ТО, ЧТО ЛЕГЛО КОЛОНКОЙ ПРЯМО СЕЙЧАС: поднять чужое,
  // записанное вчера, значило бы менять форму знания, о котором не просили.
  // 🛑 «УЖЕ ТАБЛИЦА» — ЭТО ИСПОЛНЕННОЕ ТРЕБОВАНИЕ, А НЕ ПУСТОЙ ОТВЕТ (183-7).
  // ✗ оплачено живым прогоном: род поднялся в таблицу в прошлый раз, второй
  // вызов с тем же требованием вернул пустой `promoted`, и снаружи это было
  // неотличимо от «требование не сработало». Зовущий просил СОСТОЯНИЕ («пусть
  // это будет таблицей»), а не действие, — значит отвечать надо о состоянии.
  const promoted = []
  if (extra.need_table) {
    for (const n of noted) {
      if (n.became_table || n.added) {
        promoted.push({ already: true, table: tableForKind(n.what), what: n.what })
        continue
      }
      const value = n.became ?? n.value
      if (!value) continue
      const moved = await promote({
        basis: n.basis ?? null,
        claim: n.claim ?? CLAIM.SAID,
        kind: n.what,
        newValue: null,
        who,
        words: lang,
      })
      if (moved?.ok) promoted.push({ table: moved.table ?? tableForKind(n.what), what: n.what })
    }
  }

  // 🔒 ЗАПИСЬ ИДЁТ ПЕРЕД ОТВЕТОМ, ПОТОМУ ЧТО ПОСЛЕ `return` ЕЁ НЕ БУДЕТ.
  // Отброшенное и пропущенное уходят в журнал НАРАВНЕ с записанным: именно они
  // объясняют, почему память «не запомнила».
  // 🔒 ОХВАТ ПИШЕТСЯ В ЖУРНАЛ РЯДОМ С ФРАЗОЙ (183-6). В само знание он пока не
  // ложится, и об этом сказано строкой `params`; но исчезать он не имеет права —
  // «прислал и ничего не произошло» есть отдельный класс дефекта.
  await note({
    asked: scope ? `${text}  ⟨охват: ${scope}⟩` : text,
    decisions: noted.map((n) =>
      n.became_table
        ? `${n.what}: завела список, там «${n.moved}» и «${n.added}»`
        : n.added
          ? `${n.what}: дописала в список «${n.added}»${n.already ? " (уже было)" : ""}`
          : n.already
            ? `${n.what}: уже было записано «${n.value}»`
            : n.was
              ? `${n.what}: было «${n.was}», стало «${n.became}»`
              : `${n.what}: записала «${n.became}»${n.claim === CLAIM.GUESS ? " (догадка)" : ""}`,
    ),
    dropped,
    method: "remember",
    model: `${facts.length} факт(ов)`,
    ms: Date.now() - startedAt,
    returned: said || nothing,
    skipped,
  })

  return withParams({
    dropped,
    noted,
    ok: true,
    ...(promoted.length ? { promoted } : {}),
    skipped_not_about_him: skipped,
    what_happened: said || nothing,
  })
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
export async function recall(input = {}) {
  const { lang, text, who } = input
  const startedAt = Date.now()

  // 🔒 НЕОБЯЗАТЕЛЬНЫЕ ПАРАМЕТРЫ ЧИТАЮТСЯ ОДНИМ МЕСТОМ НА ОБА ГЛАГОЛА (183-2…6),
  // и каждый получает названную судьбу: принят · способности нет · не той формы.
  const { report: paramReport, values: p } = readParams(input, [
    "depth", "history", "prior", "want_chain", "scope",
  ])
  const depthAsked = p.depth ?? "standard"
  // 🔒 ЦЕПОЧКА КОПИТСЯ ВСЕГДА, А ОТДАЁТСЯ ТОЛЬКО ПО ПРОСЬБЕ. Копить дёшево —
  // это массив строк; собрать её задним числом было бы уже нечем.
  const chain = []
  const step = (s) => chain.push(s)
  /**
   * Ответ собирается одним местом — чтобы `depth_used` не разошёлся с тем, что
   * произошло на самом деле, а `chain` не появился там, где его не просили.
   *
   * 🔒 `depth_used` СЧИТАЕТСЯ ПО ФАКТУ, А НЕ ПО ПРОСЬБЕ: уровень 1 — ответ без
   * модели, уровень 2 — с моделью. Просили `extreme`, дошли до первого — так и
   * будет сказано. Уверенное умолчание дороже отсутствующего значения (144).
   */
  const answer = (body) => ({
    ...body,
    depth_asked: depthAsked,
    depth_used: body.used_model ? 2 : 1,
    ...(p.want_chain ? { chain } : {}),
    ...(paramReport.length ? { params: paramReport } : {}),
  })

  if (!who) {
    await note({ method: "recall", ms: 0, trouble: say("need-who", "ru") })
    return answer({ error: "need-who", ok: false, what_happened: say("need-who", lang) })
  }

  const ready = await ensureRoot()
  if (!ready.ok) {
    return answer({ error: ready.error, ok: false, what_happened: say("store-unreachable", lang) })
  }

  step(`о ком спрашиваем: ${who}`)
  if ((p.scope ?? []).length) {
    // 🔒 ОХВАТ НАЗЫВАЕТСЯ В ЦЕПОЧКЕ И В ЖУРНАЛЕ, А НЕ ИСЧЕЗАЕТ. В само знание он
    // пока не ложится — и об этом сказано строкой `params`, а не молчанием.
    step(
      `охват вопроса (${p.scope.length}): ` +
        p.scope.map((e) => [e.at, e.place].filter(Boolean).join(" ")).join(" · "),
    )
  }

  const row = await rowOf(who)
  if (!row) {
    step("о человеке не заведено ни строки")
    return answer({ known: [], ok: true, used_model: false, what_happened: say("nothing-known", lang) })
  }

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
    // 🔒 ЧТЕНИЕ ТОЖЕ ПОПАДАЕТ В ЖУРНАЛ, И БЕЗ МОДЕЛИ — ЭТО ВАЖНАЯ СТРОКА.
    // Она доказывает закон «чтение известного не стоит вызова модели» каждым
    // своим появлением; исчезни он однажды — журнал покажет это первым.
    await note({
      asked: `${who}: без вопроса — всё, что известно`,
      method: "recall",
      model: "не звалась",
      ms: Date.now() - startedAt,
      returned: known.length ? `известно ${known.length}` : "о человеке не записано ничего",
    })
    step(`вопроса нет — отдано всё известное: ${known.length}`)
    return answer({
      known,
      not_yet_known: missing,
      ok: true,
      used_model: false,
      what_happened: known.length
        ? say("known-count", lang, { n: known.length })
        : say("nothing-known", lang),
    })
  }

  // Механический поиск: слова вопроса — и слова присланного контекста — против
  // слов в имени рода.
  //
  // 🔒 ИСТОРИЯ И ПРЕЖНИЕ НАХОДКИ УЧАСТВУЮТ В ПОИСКЕ НАРАВНЕ С ВОПРОСОМ (183-4).
  // Иначе вопрос «а он?» не разрешается ни во что, хотя зовущий прислал ровно
  // то, чем он разрешается. 🛑 Но участие НАЗЫВАЕТСЯ полем `used_input`:
  // ответ, найденный по слову из истории, иначе выглядит как найденный по
  // вопросу — и зовущий решит, что память знает больше, чем знает.
  const { used: usedInput, words } = searchWords({
    history: p.history,
    prior: p.prior,
    text,
  })
  step(
    usedInput.length
      ? `механический поиск: слова вопроса и контекста (${usedInput.join(", ")})`
      : "механический поиск: только слова вопроса",
  )
  const hit = known.find((k) => {
    const parts = k.what.split("_")
    return parts.some((part) => words.includes(part))
  })
  if (hit) {
    step(`совпало: ${hit.what} из ${hit.from_table}`)
    await note({
      asked: `${who}: ${text}`,
      method: "recall",
      model: "не звалась — хватило механического поиска",
      ms: Date.now() - startedAt,
      returned: `${hit.what.replace(/_/g, " ")}: ${hit.value}`,
    })
    return answer({
      known: [hit],
      ok: true,
      used_input: usedInput,
      used_model: false,
      what_happened: `${hit.what.replace(/_/g, " ")}: ${hit.value}`,
    })
  }

  // 🛑 ПРОМАХ НАЗЫВАЕТСЯ ПРОМАХОМ. В первой итерации память НЕ зовёт модель на
  // чтение: она отдаёт всё, что знает, и говорит, что точного совпадения не
  // нашла. Позвать модель здесь — отдельное решение, а не мелочь: оно превратит
  // мгновенное чтение в чтение ценой вызова.
  // 🔒 ПРОМАХ МЕХАНИЧЕСКОГО ПОИСКА — ЭТО ТО, РАДИ ЧЕГО ЖУРНАЛ И ЗАВЕДЁН.
  // По закону «порядок, а не запрет» промахнувшаяся фраза должна дописываться в
  // слова-подсказки рода. Здесь она хотя бы перестаёт исчезать бесследно.
  await note({
    asked: `${who}: ${text}`,
    method: "recall",
    model: "не звалась",
    ms: Date.now() - startedAt,
    returned: "точного совпадения с вопросом нет — отдано всё, что известно",
    trouble: `механический поиск промахнулся на фразе «${text}»`,
  })
  step("совпадения нет — отдано всё известное")
  // 🛑 ГЛУБЖЕ ПАМЯТЬ СЕГОДНЯ НЕ ИДЁТ, И ЭТО СКАЗАНО ЧИСЛОМ, А НЕ УМОЛЧАНИЕМ.
  // Просили `deep` или `extreme` — `depth_used` покажет 1, и разница между
  // «искали дорого» и «искали дёшево» останется видимой.
  if (depthAsked !== "standard") {
    step(`просили «${depthAsked}», но выше уровня ${BUILT_LEVELS} память пока не поднимается`)
  }
  return answer({
    known,
    not_yet_known: missing,
    ok: true,
    used_input: usedInput,
    used_model: false,
    what_happened: say("no-exact-match", lang),
  })
}

// ── КОГО ПАМЯТЬ ЗНАЕТ ────────────────────────────────────────────────────────
//
// 🔒 ТРЕТИЙ МЕТОД ЗАВЕДЁН ПО НУЖДЕ, А НЕ ВПРОК (2026-09-09). Экран «Что я знаю о
// вас» обязан кого-то спросить, а ключ человека живёт только в теге сообщения
// Telegram — его видит агент и не видит никто больше. Служба каналов :3500
// отдаёт `chatId: null`: путь к агенту идёт через плагин, мимо неё.
//
// 🛑 ЭТО НЕ ПРОТЕЧКА УСТРОЙСТВА. Наружу уходят ЛЮДИ, а не таблицы: «кого ты
// знаешь» — вопрос о знании, а не о хранении. Слов «таблица» и «колонка» здесь
// нет и не будет.
export async function people({ lang } = {}) {
  const ready = await ensureRoot()
  if (!ready.ok) return { error: ready.error, ok: false, what_happened: say("store-unreachable", lang) }

  const r = await sql(`SELECT who, created_at FROM ${ROOT} ORDER BY id`)
  if (!r.ok) return { error: r.error, ok: false, what_happened: say("read-failed", lang) }

  return {
    ok: true,
    people: r.rows.map((x) => ({ since: x.created_at, who: x.who })),
    what_happened: r.rows.length
      ? `знаю ${r.rows.length}`
      : "пока никого: никто ещё ничего о себе не рассказывал",
  }
}
