// ДВА ГЛАГОЛА ЭТОГО ФАЙЛА: СКАЗАТЬ И СПРОСИТЬ. Третий — комментарий — живёт в `feedback.mjs`.
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
import { ingestMedia, keepLongText } from "./media-ingest.mjs"
import { ingestLinks } from "./link-ingest.mjs"
// 🔒 ОТВЕТ ДВУХ ГЛАГОЛОВ — ТЕКСТ ФАКТОВ И ИДЕНТИФИКАТОРЫ ОБЪЕКТОВ (200-6): текст собирается одним помощником, объекты «Спросить» ищет
// тем же путём, что метод `find_objects`, — второго поиска нет.
import { recallText, rememberText } from "./answer-text.mjs"
import { find_objects } from "./object-verbs.mjs"
import { channelOfService } from "./services.mjs"
import { AUTH, parseSource } from "./source.mjs"
import { certaintyOf } from "./certainty.mjs"
// 🔒 ВОПРОС О САМОЙ ПАМЯТИ ОТВЕЧАЕТСЯ ИЗ ИЗМЕРЕНИЯ, А НЕ ИЩЕТСЯ В ЧУЖИХ СЛОВАХ (211-2).
import { aboutSelf, asksAboutSelf } from "./about-self.mjs"
// 🔒 ПРОСЬБА НЕ ПО АДРЕСУ НАЗЫВАЕТСЯ И ПЕРЕАДРЕСУЕТСЯ, А НЕ ПРОГЛАТЫВАЕТСЯ (211-7).
import { elsewhere, elsewhereWords } from "./elsewhere.mjs"
import { state } from "./state.mjs"
// 🔒 ОТКАЗ ОБЯЗАТЕЛЬНОГО ИНСТРУМЕНТА НАЗЫВАЕТ СВОЙ РОД (207-7): безымянный отказ починить нельзя.
import { toolFailure } from "./tools.mjs"
// 🔒 НЕОБЯЗАТЕЛЬНЫЕ ПАРАМЕТРЫ — ОДНО МЕСТО НА ОБА ГЛАГОЛА (183-2…183-6).
// Проверка, написанная дважды, расходится молча: у одного глагола дата стала бы
// строгой, у другого какой угодно, и никто бы этого не заметил.
import { BUILT_LEVELS, readParams, searchWords } from "./params.mjs"
// 🔒 ЖУРНАЛ — ВЫХОД ПАМЯТИ ДЛЯ ГЛАЗ (177-1). Агенту закрыт вход в слои, значит
// слой рассказывает о себе сам. Пишем ПОПУТНО, рядом с ответом, а не отдельным
// заходом: один вызов дешевле, чем «сначала запишу, потом отвечу».
import { note } from "./journal.mjs"
import { DIRECTION, insertMessage, MESSAGES, STATUS, previousAt } from "./messages.mjs"
import { shouldInvite } from "./invite.mjs"
import { writeAnswer } from "./answer-row.mjs"
import { makeTrace } from "./trace.mjs"
import { linkedRows, linkToEarlier } from "./chain-links.mjs"
import { mentionsAny, secondCycle } from "./cycle.mjs"
import { goDeeper, noCloseLinks, offerDeeper } from "./deeper.mjs"
import { findSolution, solutionWords } from "./solution-search.mjs"
import { resolvePlaceRef } from "./place-history.mjs"
import { placeInQuestion, scopeFit, timeInQuestion } from "./question-scope.mjs"
import { normalizeName } from "./naming.mjs"
// 🔒 ЧТЕНИЕ ЖИВЁТ ОТДЕЛЬНЫМ ФАЙЛОМ (201-6): решение «таблица или граф», честное «не знаю» и фильтр
// объектов — это своя работа, и держать её внутри глагола значило бы прятать её от прибора.
import { askGraph, filterObjects, knownLabels, namesIn } from "./read.mjs"
import { foundFromRow, linksOf, rowsBySources, rowsByVectorIds, sourcesOf } from "./bridge.mjs"

import { putSaid } from "./graph.mjs"
import { meaningVerdict, NEAR_SAID, putSaidVector, searchSaid } from "./said-vector.mjs"
import { CLAIM, sql } from "./store.mjs"

// 🪦 ЗДЕСЬ ЖИЛА РАЗМЕТКА КОРНЕВОЙ ТАБЛИЦЫ: её имя, имя её истории, набор служебных
// колонок и признак парной колонки рода. Всё это перестало звать кто-либо ещё в
// 206-1 и 206-3, а сами таблицы сняты в 206-4; объявления пережили свой предмет и
// читались как след живого механизма. Род значения (`CLAIM`) остался — он про
// знание, а не про хранение.

// 🔒 НАРУЖУ ЕДУТ ОБА: КОД И СЛОВА (181-10). Код вечен и читается машиной,
// слова переводимы и читаются человеком; язык называет тот, кто зовёт.
const refusal = (r, lang) => ({ ok: false, refusal: r, what_happened: refusalWords(r, lang) })

/**
 * Куда легла фраза — словами человека.
 *
 * 🔒 ИМЕНА ХРАНИЛИЩ НАРУЖУ НЕ ЕДУТ. Человеку важно, что сказанное не потеряно и что его можно
 * найти; `graph+vector` — это устройство, а устройство память о себе не рассказывает.
 */
const keptWords = (kept, lang) => {
  if (!kept?.ok) return ""
  const ru = lang !== "en"
  if (kept.where === "objects") return ru ? "текст длинный — сохранён целиком отдельной вещью." : "the text was long — kept whole as one thing."
  if (kept.where === "graph+vector") return ru ? "сказанное целиком — в связях и в поиске по смыслу." : "everything said — in the graph and in semantic search."
  return ru ? "сказанное целиком — в связях." : "everything said — in the knowledge graph."
}

// ── СКАЗАТЬ ──────────────────────────────────────────────────────────────────

const EXTRACT = `Ты разбираешь фразу и достаёшь из неё ВСЕ факты — о ком бы они ни были.

Верни JSON: {"scope":{"at":"...","at_words":"...","place":"..."},"facts":[{"kind":"...","label":"...","subject":"...","value":"...","shape":"value|story","claim":"said|guess","basis":"...","intent":"add|correct"}]}

Правила для "clear" — ПОНЯТНО ЛИ, ЧТО ЭТО ЗА ФРАЗА:
- true — фраза ясно сообщает факт или событие, или ясно просит что-то сделать;
- false — не хватает контекста, чтобы отнести её хоть к чему-то: непонятно, чей это факт, о чём
  речь, просьба ли это и к кому. Пример: «Петя запросил оплату карты на 40 $» без всего остального —
  то ли платёж, то ли счёт, то ли задача, то ли жалоба.
- при false верни "unclear_why": коротко, чего не хватает; "requests" оставь пустым и НЕ выдумывай
  факты-догадки, чтобы заполнить пустоту.
Верни полем верхнего уровня: "clear": true|false, "unclear_why": "...".

Правила для "requests" — ЧТО ЧЕЛОВЕК ПРОСИТ СДЕЛАТЬ, а не сообщает:
- просьбы о действии или возможности: «добавь регистрацию через Google», «хочу видеть аналитику по
  конкурентам», «настрой рассылку». Каждая — строкой словами человека, коротко, без «кстати» и «уже».
- «запомни», «запиши» — НЕ просьба: это сама запись. Факты и события — НЕ просьбы.
- Просьбу НЕ дублируй фактом в "facts": «хочу видеть аналитику» — это просьба, а не факт «аналитика».
- Просьб нет — верни "requests": [].
Верни их полем верхнего уровня: "requests": ["...", "..."].

Правила для "scope" — О КАКОМ ВРЕМЕНИ И МЕСТЕ ЭТА ФРАЗА (не когда её сказали):
- "at": дата в виде ГГГГ-ММ-ДД, если её можно вычислить. Первая строка сообщения называет сегодняшнюю
  дату и день недели — от неё считай «вчера», «в пятницу», «на следующей неделе». Нельзя вычислить — null.
- "at_words": как время сказано словами человека: «в пятницу», «вчера вечером», «в августе». Нет — null.
- "place": город или место так, как его назвали: «Мадрид», «офис на Гран-Виа». Нет — null.
- "place_ref": если место названо ЛИШЬ УКАЗАНИЕМ, без названия и города, — само указание: «то кафе»,
  «наш офис», «тот ресторан». Тогда "place" = null: какое это кафе, память найдёт по истории сама.
  Нет указания — null.
- Ни времени, ни места во фразе нет — верни "scope": null. НЕ подставляй сегодняшнюю дату и не
  выдумывай место: пустое значит «не знаю когда и где», а не «сейчас и здесь».

Правила для "subject" — О КОМ ИЛИ О ЧЁМ ЭТОТ ФАКТ:
- имя или обозначение того, к кому факт относится: "Петя", "заказ чехлов", "встреча по поставке";
- "сам говорящий" — если факт о том, кто прислал фразу.
🔒 СУБЪЕКТ НАЗЫВАЕТСЯ ВСЕГДА, И ФАКТ НЕ ВЫБРАСЫВАЕТСЯ НИКОГДА. Твоё дело — разобрать сказанное,
а не решать, стоит ли это хранить. Что хранить, решает архитектура, и она хранит всё.

Правила для "label": то же самое, что "kind", но НА ЯЗЫКЕ ФРАЗЫ и человеческими словами, 2–4 слова,
строчными, без подчёркиваний. Русской фразе — русский label. Это единственное, что человек прочитает
глазами; "kind" остаётся машинным именем для поиска. Пример: kind "city_where_he_lives_now" →
label "город, где он живёт".

Правила для "kind":
- Имя рода — это то, как факт назовут потом, когда будут искать. Требования жёсткие:
  · ТОЛЬКО английские слова в нижнем регистре через подчёркивание;
  · НЕ МЕНЬШЕ ЧЕТЫРЁХ СЛОВ — это ФРАЗА, объясняющая себя, а не ярлык;
  · в имени сказано, ЧЬЁ это и ЧТО это.
  Плохо: "language", "friend_name", "city", "car" — по ним придётся переспрашивать.
  Хорошо: "language_he_speaks_with_us", "people_he_calls_his_friends",
          "city_where_he_lives_now", "cars_that_belong_to_him",
          "amount_paid_for_the_order", "city_where_the_person_works".
  🔒 Имя рода описывает САМ ФАКТ, а не то, чей он: чей — сказано в "subject". Факт о третьем лице
  называется так же, как назывался бы о говорящем.
  🔒 Имя вечное: по нему потом ищут, и переименовать его нельзя. Ярлык из двух слов заставит
  каждого следующего лезть за описанием — а хорошее имя отвечает само.

Правила для "value": словами человека, КОРОТКО — само значение, без пояснений и обстоятельств.
  Плохо: "Севилья (юг Испании), последние несколько месяцев". Хорошо: "Севилья".
  Пояснения и обстоятельства — отдельный факт с "shape":"story".

🛑 ОБЯЗАТЕЛЬНОЕ ПОЛЕ "shape" — ЧТО ЭТО ЗА ФАКТ ПО ФОРМЕ:
- "value" — точное, счётное или текущее значение: имя, город, сумма, дата, порода, модель машины.
  Короткое. По нему потом находят сказанное, поэтому оно должно читаться само.
- "story" — рассказ, история, обстоятельство, объяснение, план, содержимое присланного файла:
  «служил в полку с 1994 по 1996», «знакомы со школы», «снимает квартиру в тихом районе».
- Сомневаешься — ставь "story".
- У текущего признака (город, язык, пояс, имя) одна фраза даёт ОДНО значение "value"; всё прочее о нём — "story".
🪦 Поле "about_himself" снято 2026-09-16 решением владельца: «если архитектор тебе сказал сделать
запись, то ты не должен думать, к чему она относится — ты просто делаешь запись в соответствии с
нашей архитектурой». Вместо него — "subject": факт не отбрасывается, а получает хозяина.

Правила для "claim" — это ГЛАВНОЕ, не угадывай:
- "said" — человек сказал это ПРЯМО, своими словами;
- "guess" — ты вывел это сам из того, КАК он написал, а не из того, ЧТО он написал.
- У "guess" поле "basis" ОБЯЗАТЕЛЬНО: из чего вывел. Без основания догадка через неделю
  неотличима от свидетельства человека, поэтому такой факт будет отброшен.
- Сомневаешься — ставь "guess". Ложное "said" превращает твою догадку в его слова.
Фактов нет — верни {"facts":[]}. Не выдумывай ничего, чего человек не сказал.

🔒 ФРАЗА МОЖЕТ ИСПРАВЛЯТЬ РАНЕЕ СКАЗАННОЕ. «Нет, всё-таки на украинском» — это факт о языке,
а не пустая реплика: назови род так же, как назвал бы его в первый раз, и поставь "intent":"correct".

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
/**
 * Значение в строку для таблицы.
 *
 * 🔒 ХРАНИЛИЩЕ РОДОВ ТЕКСТОВОЕ, И ПРЕВРАЩЕНИЕ ДЕЛАЕТСЯ ЗДЕСЬ, А НЕ У ЗОВУЩЕГО: иначе бот и внешний
 * сайт запишут одну и ту же трату по-разному, и «200 RUB» разойдётся с «{amount:200}».
 */
export function valueAsText(v) {
  if (v === null || v === undefined) return ""
  if (typeof v === "string") return v.trim()
  if (typeof v === "number" || typeof v === "boolean") return String(v)
  if (Array.isArray(v)) return v.map(valueAsText).filter(Boolean).join("; ")
  if (typeof v === "object") {
    if (Number.isFinite(Number(v.amount))) return `${v.amount}${v.currency ? ` ${v.currency}` : ""}${v.what ? ` — ${v.what}` : ""}`
    if (Number.isFinite(Number(v.lat)) && Number.isFinite(Number(v.lon))) return `${v.lat},${v.lon}`
    return JSON.stringify(v)
  }
  return String(v)
}

// 🪦 ЗДЕСЬ БЫЛ `featuresByKind()` — реестр признаков по имени рода. Реестр отменён целиком решением
// владельца 2026-09-15. Сопоставлять фразу больше не с чем и не
// нужно: с 206-1 у памяти нет ни своего словаря родов, ни своих таблиц под них.

/**
 * Положить сказанное в граф — ВСЕГДА (§8, решение владельца «сразу писать в граф знаний»).
 *
 * 🔒 ЯКОРЬ БЕРЁТСЯ ИЗ ПРИЗНАКОВ ГЛУБИНЫ 1: имя друга, кличка животного, имя встреченного. Именно
 * через них вопрос от человека доходит до записи; без якоря она существует и недостижима.
 * 🛑 ОТКАЗ ГРАФА НЕ РОНЯЕТ ЗАПИСЬ В ТАБЛИЦУ: хранилища независимы, и потеря одного не должна
 * отменять другое. Но и молчать о нём нельзя — он уходит в журнал строкой.
 */
async function toGraph({ anchors = [], featureKeys = [], history = [], person = null, pointers = [], said, via = null, who }) {
  // ── ПОРОГ СМЫСЛОВЫХ ХРАНИЛИЩ (206-2) ────────────────────────────────────────────────────────
  //
  // 🔒 РЕШЕНИЕ ВЛАДЕЛЬЦА 2026-09-15, ДОСЛОВНО: «but we have max 2000 words for vector and for
  // lightRAG , if more only for object store». Длинное не режется и не размазывается: оно остаётся
  // ЦЕЛОЙ вещью в объектном хранилище, у которой есть описание и карточка поиска.
  // 🔒 РЕШЕНИЕ ЖИВЁТ ЗДЕСЬ, В ОДНОМ МЕСТЕ, потому что сказанное сохраняется из ТРЁХ точек глагола:
  // разбор не удался · фактов не нашлось · факты есть. Порог, написанный в одной из них, молча не
  // сработал бы в двух других.
  const meaning = meaningVerdict(said)
  if (meaning.long) {
    const kept = await keepLongText({ text: said, via, who })
    return kept.ok
      ? { id: kept.id, long: true, ok: true, where: "objects", why: meaning.why, words: meaning.words }
      : { long: true, ok: false, refused: kept.refused, where: "objects", why: kept.why ?? meaning.why }
  }

  // 🔒 ЯКОРЕМ ЧЕЛОВЕКА СЛУЖИТ ЕГО ИМЯ, А НЕ КЛЮЧ, КОГДА ИМЯ ИЗВЕСТНО (требование владельца
  // 2026-09-14). Ключ остаётся рядом — он связывает документ с записями памяти, — но сущностью
  // графа обязан стать человек, а не строка `roma@telegram`.
  const names = [...anchors, person?.name ?? "", String(who ?? "")].map((a) => String(a ?? "").trim()).filter(Boolean)
  const graph = await putSaid({
    anchors: names,
    feature_keys: featureKeys,
    kept_as_history: history,
    person: person ?? { key: who },
    pointers,
    said,
    via,
    who,
  })
  if (!graph.ok) return { ...graph, where: "graph", words: meaning.words }

  // 🔒 ВЕКТОР ПОЛУЧАЕТ ТУ ЖЕ ФРАЗУ, ЧТО И СВЯЗИ, И ПОД ТЕМ ЖЕ ИМЕНЕМ. ✗ Оплачено разведкой 206-2:
  // векторное хранилище звали только стенды, и ни одна фраза человека в него не попадала — «память
  // ищет по смыслу» было правдой про объекты и неправдой про слова.
  // 🛑 ОТКАЗ ВЕКТОРА НЕ ОТМЕНЯЕТ ЗАПИСИ В СВЯЗИ: хранилища независимы, но молчать о нём нельзя.
  const vector = await putSaidVector({ id: graph.source, text: said, who })
  return {
    ...graph,
    vector: vector.ok ? { id: vector.id, ok: true } : { ok: false, why: vector.refused },
    where: vector.ok ? "graph+vector" : "graph",
    words: meaning.words,
  }
}

/**
 * Чей это разговор, когда никто не назван (207-3).
 *
 * 🔒 ЧЕЛОВЕК ЗДЕСЬ ОДИН, И ЭТО СЛОВО ВЛАДЕЛЬЦА 2026-09-16: «У меня нету понятия какой человек
 * сказал… у меня будет всегда отец на записи архитектор. Зачем будем создавать колонку в которой
 * нет никакой разницы». Значит `who` перестал быть вопросом к зовущему: он необязателен, а вместо
 * него у строки есть ПУТЬ ИСТОЧНИКА — откуда сообщение пришло.
 * 🛑 ЭТО НЕ ВЫДУМАННЫЙ ЧЕЛОВЕК: имя `architect` говорит ровно то, что есть, — память одного
 * архитектора. Подставлять сюда чьё-то настоящее имя было бы ложью о том, кто говорил.
 */
export const ARCHITECT = "architect"

/** Имя ответа, по которому его потом комментируют (207-3). Строка таблицы у ответа уже есть — на неё и ссылаемся. */
/**
 * Охват фразы из ответа модели (218-7): о каком времени и месте она.
 *
 * 🔒 ДАТА ПРОВЕРЯЕТСЯ ФОРМОЙ, А НЕ ДОВЕРИЕМ: модель вернёт «в пятницу» в поле даты, и выглядеть это
 * будет правдоподобно. Не ГГГГ-ММ-ДД — значит даты нет, слова остаются в `at_words`.
 * 🔒 ПУСТОЕ ВОЗВРАЩАЕТСЯ КАК null: «не знаю когда и где», а не «сейчас и здесь».
 */
function scopeFromModel(raw) {
  if (!raw || typeof raw !== "object") return null
  const clean = (v) => (typeof v === "string" && v.trim() && v.trim().toLowerCase() !== "null" ? v.trim().slice(0, 120) : null)
  const atRaw = clean(raw.at)
  const at = atRaw && /^\d{4}-\d{2}-\d{2}$/.test(atRaw) ? atRaw : null
  const at_words = clean(raw.at_words) ?? (atRaw && !at ? atRaw : null)
  const place = clean(raw.place)
  const place_ref = clean(raw.place_ref)
  if (!at && !at_words && !place && !place_ref) return null
  // в строку таблицы уходит `at` как дата, а если её не вычислить — словами: пустое хуже слов
  return { at: at ?? at_words, at_words, place, place_ref }
}

export const answerId = (messageId) => (messageId ? `ans_${messageId}` : null)

/**
 * Строка в единственной таблице для ПУТИ ОТКАЗА (216-1).
 *
 * 🔒 ЗАКОН ВЛАДЕЛЬЦА 2026-09-15 — «одна-единственная таблица, которая фиксирует ВСЕ входящие
 * сообщения» — не знает исключения «кроме тех, где модель не смогла». Измерено 2026-09-16 на живой
 * службе: при исчерпанном окне подписки фраза уходила в граф и НЕ получала строки, а значит и имени;
 * приглашение «прокомментируйте ответ» при этом печаталось, а комментировать было нечего —
 * `POST /v1/feedback` отвечал `missing-params: about`.
 *
 * 🛑 ПУТЬ ОТКАЗА БЫЛ ПОСТРОЕН БЕДНЕЕ ПУТИ УСПЕХА, И ЭТО ОБЩИЙ КЛАСС: строка, имя и объяснение есть
 * там, где всё хорошо, и пропадают там, где плохо — то есть ровно тогда, когда человеку они нужнее.
 */
async function rowForKeptOnly({ extra, input, kept, scopeOne, sourcePath, text, who }) {
  return insertMessage({
    direction: DIRECTION.REMEMBER,
    kind: "text",
    object_id: kept?.where === "objects" ? kept?.id ?? null : null,
    rag_source: kept?.source ?? null,
    scope_at: scopeOne?.at ?? null,
    scope_lat: scopeOne?.lat ?? null,
    scope_lon: scopeOne?.lon ?? null,
    scope_place: scopeOne?.place ?? null,
    scope_radius_m: scopeOne?.radius_m ?? null,
    // 218-15: источник пишется только при значении — пустое место с источником «said» было бы ложью
    scope_source: scopeOne && (scopeOne.at || scopeOne.place || scopeOne.lat) ? scopeOne.source ?? "said" : null,
    source: extra.via ?? "api",
    source_auth: input.auth === AUTH.MACHINE ? AUTH.MACHINE : input.auth === AUTH.KEY ? AUTH.KEY : null,
    source_path: sourcePath,
    // 🔒 СТАТУС ГОВОРИТ О СУДЬБЕ СООБЩЕНИЯ, А НЕ О НАСТРОЕНИИ МОДЕЛИ: слова уцелели в связях —
    // значит `saved`; граф не принял — `failed`. Тот же критерий, что на пути успеха.
    status: kept?.ok ? STATUS.SAVED : STATUS.FAILED,
    summary: String(text ?? "").slice(0, 500),
    tags: [],
    vector_id: kept?.vector?.id ?? null,
    who,
  })
}

export async function remember(input = {}) {
  const { lang, text } = input
  const who = input.who || ARCHITECT
  const startedAt = Date.now()
  // 217-1: приглашение прокомментировать — периодическое, и «в начале сессии» считается по этой паузе.
  const prevAt = await previousAt(who)
  // 218-3: ход мыслей со временем — у записи он такой же, как у вопроса.
  const rTrace = makeTrace(startedAt)
  const rStep = rTrace.step
  // 🔒 219-1: ПУТЬ ИСТОЧНИКА ДЛЯ ЗАПИСИ ОТВЕТА ЖИВЁТ ЗДЕСЬ, А НЕ БЕРЁТСЯ У `sourcePath` НИЖЕ.
  // `withParams` объявлен раньше разбора источника и зовётся в том числе из РАННИХ выходов («нет
  // текста», «плохой источник») — обращение к переменной, объявленной ниже, упало бы на инициализации.
  let answerSource = null
  rStep(`принял фразу: ${String(text ?? "").length} знаков`)

  // 🔒 НЕОБЯЗАТЕЛЬНЫЕ ПАРАМЕТРЫ ЗАПИСИ (183-6): охват, отрицание, требование
  // таблицы. Каждый получает названную судьбу — принят · способности нет · не
  // той формы, — и `params` едет наружу вместе с ответом.
  // 🔒 С 200-5 — И ССЫЛКИ ДВУХ РОДОВ: `links` (страницы) и `youtube` (ролики). Вложения — включения в «Сказать»,
  // а не отдельные двери (слово владельца 2026-09-14).
  const { report: paramReport, values: extra } = readParams(input, [
    "scope", "media", "links", "youtube", "via", "from",
  ])
  // 🪦 НИТЬ РАЗБОРА СНЯТА 206-9 (решение владельца 2026-09-15): вход памяти — просто текст и
  // объекты, и продолжение прежнего разговора она снаружи не ждёт.
  // 194-16: судьба каждого вложения `media` — в любом ответе, где вложения принимались.
  let objectsOut = null
  // 🔒 С 200-6 `objects` И `text` ЕСТЬ В КАЖДОМ ОТВЕТЕ, И В ОТКАЗЕ ТОЖЕ: схема ответа (`output` договора) требует их всегда.
  // 🔒 211-7: ЧЕЛОВЕК ГОВОРИТ ОДНОЙ ФРАЗОЙ, А ПОЛНОМОЧИЯ У СЛУЖБ РАЗНЫЕ. «Запомни заказ Пети и
  // кстати сделай авторизацию через Google» — это две просьбы, и вторая не наша. Промолчать о ней
  // значит сделать вид, что её не было; назвать без адреса — оставить человека в тупике.
  // 🔒 218-13: ПРОСЬБЫ ВЫДЕЛЯЕТ РАЗБОР ФРАЗЫ, А НЕ ПОИСК СЛОВА ПО ВСЕЙ ФРАЗЕ. ✗ Поиск подстроки
  // отправлял «оплатил картой» в службу карт, а «Петя работает» — в Telegram («работает» содержит
  // «бот»). Ниже этот поиск по всей фразе остаётся ТОЛЬКО на случай, когда модель не ответила.
  let notMine = elsewhere(text)
  // 🔒 226-1: КАНАЛ, КОТОРЫМ ПРИШЛА ПРОСЬБА, ОБЪЯВЛЯЕТСЯ ЗДЕСЬ, А НЕ ТАМ, ГДЕ ВЫЧИСЛЯЕТСЯ.
  // `withParams` — замыкание, и оно зовётся в том числе из ранних отказов, ДО разбора источника.
  // Объяви я его рядом с `sourcePath`, ранний отказ падал бы на необъявленной переменной — то есть
  // починка ссылки ломала бы отказ, к ссылке отношения не имеющий.
  let viaChannel = null
  let solutions = []
  // 🔒 218-14: ФРАЗА, КОТОРУЮ НЕ ОТНЕСТИ НИ К ЧЕМУ. Слово владельца 2026-09-16: «не пытайся ответить
  // на такие вопросы, как "Петя запросил оплату карты на 40 $": если тебе не хватает контекста и это не
  // сходится ни с одним из сценариев — ты просто делаешь запись на сохранение и отвечаешь простыми
  // словами». Решает модель тем же разбором: только она видит, хватает ли контекста.
  let unclear = null
  // 218-15: как разрешилось место, названное указанием («то кафе»)
  let placeResolved = null
  const withParams = async (body) => {
    const objects = objectsOut ?? []
    // 🔒 217-1: ЗВАТЬ ЛИ ПРОКОММЕНТИРОВАТЬ — РЕШЕНИЕ ПО ИЗМЕРЕННЫМ ПОРОГАМ, БЕЗ ХОДА МОДЕЛИ.
    // Причина решения едет наружу: молчаливое правило нечем проверить, а проверять придётся.
    const inviteNow = shouldInvite({ ms: Date.now() - startedAt, prevAt })
    // 🔒 НАСТОЯЩИЙ ДОМЕН БЕРЁТСЯ ИЗ ЗАПРОСА (211-7): реестр хранит образец, одинаковый на всех
    // серверах, а домен у каждого свой. Не знаем — уедет образец, и это честнее выдуманного адреса.
    const aside = elsewhereWords(notMine, lang, state(input.seen ?? {}).seen.domain, viaChannel)
    const out = {
      ...body,
      objects,
      invited_because: inviteNow.why,
      // 218-3: ход мыслей отдаётся и у записи — человек обязан видеть, что произошло с его фразой.
      chain: rTrace.items,
      ...(notMine.length ? { elsewhere: notMine } : {}),
      // 218-13: просьбы, которые не решает ни одна служба сервера, — с поиском решения и предложением
      ...(solutions.length ? { requests: solutions } : {}),
      ...(unclear ? { unclassified: unclear } : {}),
      ...(placeResolved ? { place_resolved: placeResolved } : {}),
      ...(paramReport.length ? { params: paramReport } : {}),
      // 🔒 СЛОВА О МЕСТЕ — ЧЕЛОВЕЧЕСКИЕ, А НЕ ИМЕНА ХРАНИЛИЩ: «в связях и по смыслу» человек
      // понимает, `graph+vector` — нет. Устройство наружу не уезжает (закон чёрного ящика).
      // 🔒 ПРИПИСКА ИДЁТ В ТОТ ЖЕ `text`, А НЕ ОТДЕЛЬНЫМ ПОЛЕМ ДЛЯ ЗНАЮЩИХ: человек читает текст, и
      // отказ, спрятанный в поле, для него не существует.
      // 🔒 218-14: У НЕПОНЯТНОЙ ФРАЗЫ ОТВЕТ — СЛОВА ВЛАДЕЛЬЦА, «не больше, не меньше»: сохранено, не
      // отнесено ни к чему, можно уточнить. Перечень догадок-фактов здесь только запутал бы человека.
      text: unclear ? [say("answer-unclassified", lang), inviteNow.invite ? say("answer-feedback", lang) : null].filter(Boolean).join("\n") : [
        rememberText({
          invite: inviteNow.invite,
          kept: keptWords(body.kept_whole, lang),
          lang,
          // 216-2: отказ разбора едет в текст отдельно — иначе его вытесняет «сохранено».
          trouble: body.refusal ? body.what_happened : null,
          noted: body.noted,
          objects,
          what_happened: body.what_happened,
        }),
        aside,
        solutionWords(solutions, lang),
      ]
        .filter(Boolean)
        .join("\n"),
    }

    // ── 219-1/219-4: ЗАПИСЬ СКАЗАННОГО ОБРАТНО, ТАКАЯ ЖЕ, КАК У ЧТЕНИЯ ──────────────────────────
    // 🔒 `withParams` — ЕДИНСТВЕННАЯ ТОЧКА ВЫХОДА «СКАЗАТЬ»: через неё идут и отказ, и успех, и вещь
    // без слов. Поэтому ответ записывается здесь; расставить запись по шести местам возврата значило
    // бы завести шесть писателей, которые разойдутся на первой же правке.
    // 🛑 ИМЯ ОТВЕТА ПОСЛЕ ЭТОГО УКАЗЫВАЕТ НА ОТВЕТ, А НЕ НА ВОПРОС (решение владельца в плане 219):
    // комментарий человека относится к тому, что он ПРОЧИТАЛ. Старые имена продолжают приниматься —
    // дверь отзыва их узнаёт, и в досье видно, что это запись прежнего образца.
    const saidBack = await writeAnswer({
      chain: rTrace.items,
      ms: Date.now() - startedAt,
      sourcePath: answerSource,
      text: out.text,
      toMessageId: out.message_id ?? null,
      usedModel: null,
      who,
    })
    return saidBack.ok ? { ...out, answer_id: answerId(saidBack.id) } : out
  }
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
  // 🔒 ТЕПЕРЬ ОБЯЗАТЕЛЕН ТОЛЬКО ТЕКСТ (207-3): «кто говорит» перестало быть вопросом к зовущему.
  // 🔒 И ДАЖЕ ОН НЕ ОБЯЗАТЕЛЕН, КОГДА ЕСТЬ ВЛОЖЕНИЕ (207-5): положить вещь, о которой нечего
  // сказать словами, — это «Сказать» с пустым текстом, а не отдельный глагол `keep_object`.
  // Слово владельца 2026-09-14: «всё остальное это включение в эти два типа».
  const hasAttachments = Boolean(input.media || input.links || input.youtube || input.files)
  if (!text && !hasAttachments) {
    await note({
      asked: `text=${text ?? "—"}`,
      method: "remember",
      ms: Date.now() - startedAt,
      trouble: say("need-text", "ru"),
    })
    return withParams({ error: "need-text", ok: false, what_happened: say("need-text", lang) })
  }
  // ── ОТКУДА ПРИШЛО (207-2) ───────────────────────────────────────────────────────────────────
  //
  // 🔒 НЕЗНАКОМАЯ СЛУЖБА ОТВЕРГАЕТ ВЕСЬ ВЫЗОВ, А НЕ ОДИН ПАРАМЕТР. Запись, о происхождении которой
  // соврали опечаткой, хуже отсутствующей: она уедет к двойнику службы, и заметить это будет нечем.
  // 🔒 ИСТОЧНИК ПОКА НЕОБЯЗАТЕЛЕН: зовущие переезжают на него в 207-8, и обязательность до переезда
  // сломала бы стенд и инструменты агента молча. Не назвали — в строке будет пусто, а пустое значит
  // «не знаю откуда», а не «ниоткуда».
  let sourcePath = null
  if (extra.from) {
    const parsed = parseSource(extra.from)
    if (!parsed.ok) {
      await note({
        asked: `from=${JSON.stringify(extra.from)}`,
        method: "remember",
        ms: Date.now() - startedAt,
        trouble: parsed.why,
      })
      return withParams({ error: parsed.error, ok: false, what_happened: parsed.why })
    }
    sourcePath = parsed.text
    answerSource = parsed.text
    // 🔒 КАНАЛ ВЫВОДИТСЯ ИЗ СЛУЖБЫ-ИСТОЧНИКА, А НЕ ИЗ СЕРЕДИНЫ ПУТИ. Разбирать путь значило бы
    // угадывать: у одного зовущего он `telegram/bot/…`, у другого `chat/telegram-bot/…`.
    viaChannel = channelOfService(parsed.path[0])
  }
  // 🔒 ВЛОЖЕНИЯ ПРИНИМАЮТСЯ ДО РАЗБОРА ФРАЗЫ И НЕ ЗАВИСЯТ ОТ НЕГО (194-16, «Через ingest»): файл, присланный вместе с
  // фразой, ложится и тогда, когда во фразе нет фактов или модель фразы недоступна.
  if (extra.media) objectsOut = await ingestMedia(extra.media, { who })
  // 🔒 ССЫЛКИ — ТЕМ ЖЕ ПРАВИЛОМ (200-5): до разбора фразы и независимо от него; судьба каждой — в том же `objects`.
  if (extra.links) objectsOut = [...(objectsOut ?? []), ...(await ingestLinks(extra.links, { who, want: "web" }))]
  if (extra.youtube) objectsOut = [...(objectsOut ?? []), ...(await ingestLinks(extra.youtube, { who, want: "youtube" }))]

  // ── ВЕЩЬ БЕЗ СЛОВ (207-5) ───────────────────────────────────────────────────────────────────
  //
  // 🔒 ТЕКСТА НЕТ, ВЛОЖЕНИЯ ЛЕГЛИ — РАБОТА ЗАКОНЧЕНА. Разбирать нечего: модель звать не на что, в
  // связи класть нечего. Имя ответа берётся у первой легшей вещи — у неё есть своя строка, а
  // выдумывать имя, за которым ничего не стоит, нельзя.
  if (!text) {
    const first = (objectsOut ?? []).find((o) => o.ok && o.messageId)
    const what = lang === "en"
      ? "kept as things: there were no words to parse"
      : "принято вещами: слов для разбора не было"
    await note({
      asked: `без текста, вложений: ${(objectsOut ?? []).length}`,
      method: "remember (вещь без слов)",
      ms: Date.now() - startedAt,
      returned: what,
    })
    return withParams({
      ...(first ? { answer_id: answerId(first.messageId) } : {}),
      noted: [],
      ok: true,
      what_happened: what,
    })
  }

  // ── ДЛИННОЕ НЕ РАЗБИРАЕТСЯ МОДЕЛЬЮ ВОВСЕ (206-2) ────────────────────────────────────────────
  //
  // 🔒 РЕШЕНИЕ ВЛАДЕЛЬЦА: длиннее 2000 слов — только объектное хранилище. Значит и разбор такой
  // фразы не нужен: он стоил бы хода модели, а результату всё равно некуда лечь.
  // 🔒 ПРОВЕРКА СТОИТ ДО ВЫЗОВА МОДЕЛИ, А НЕ ПОСЛЕ, И ЭТО И ЕСТЬ «проще, понятнее, быстрее»:
  // порог после разбора экономил бы хранилище и не экономил бы подписку.
  const longSaid = meaningVerdict(text)
  if (longSaid.long) {
    const kept = await keepLongText({ text, via: extra.via ?? null, who })
    await note({
      asked: `${text.slice(0, 200)}… (${longSaid.words} слов)`,
      method: "remember (длинное — объектом, без разбора)",
      ms: Date.now() - startedAt,
      returned: kept.ok ? `объект ${kept.id}` : `объект не принят: ${kept.refused}`,
    })
    return withParams({
      kept_whole: kept.ok
        ? { id: kept.id, ok: true, where: "objects", why: longSaid.why }
        : { ok: false, where: "objects", why: kept.why ?? kept.refused },
      noted: [],
      ok: kept.ok,
      used_model: false,
      what_happened: kept.ok
        ? `это длинный текст (${longSaid.words} слов) — сохранил его целиком отдельной вещью, её можно найти и открыть`
        : `длинный текст сохранить не удалось: ${kept.refused}`,
    })
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

  // 🪦 ЗДЕСЬ СТОЯЛО СОЗДАНИЕ КОРНЕВОЙ ТАБЛИЦЫ И ЧТЕНИЕ СТРОКИ ЧЕЛОВЕКА — надгробие пересказом, без имён
  // вызовов: процитированное имя счётчик по коду не отличает от живого вызова (закон 78-5).
  // Своих таблиц память не заводит (решение владельца 2026-09-15), а чтение строки при этом ещё и
  // ПИСАЛО: вставка «если нет» рождала пустую строку на каждого, кто хоть раз что-то сказал.
  //
  // 🔒 СПИСОК «ЧТО УЖЕ ЗАВЕДЕНО» УБРАН ПО ТОЙ ЖЕ ПРИЧИНЕ, ПО КОТОРОЙ ОН СУЩЕСТВОВАЛ. Он защищал от
  // взрыва СХЕМЫ: разные слова об одном понятии рождали второе место (`timezone_where_he_lives`
  // рядом с `time_zone_he_lives_in` — измерено 175-2). Мест больше нет: род стал именем события в
  // графе, и два имени одного понятия ничего не ломают.
  // 🛑 ДОЛГ НАЗВАН, А НЕ ЗАМАЗАН: имя человека жило колонкой `name_he_is_called` и уходило в шапку
  // документа графа (требование владельца 2026-09-14). Пока брать его негде — шапка называет ключ;
  // откуда имя берётся теперь, решает 206-3.
  const knownNow = null
  // 🪦 ЗДЕСЬ СТРОИЛСЯ СПИСОК КОЛОНОК И ТАБЛИЦ ЧЕЛОВЕКА ДЛЯ МОДЕЛИ (слово владельца 2026-09-15 про
  // сопоставление с имеющимися таблицами) и, ещё раньше, список родов реестра. Ни того, ни другого
  // больше нет: память не держит своих таблиц, и сопоставлять фразу не с чем.

  // 🪦 ЗДЕСЬ ОПРОВЕРЖЕНИЕ ПРЕЖНЕГО ВЫВОДА УЕЗЖАЛО В МОДЕЛЬ ВМЕСТЕ С ФРАЗОЙ (184-3) — снято 206-9
  // вместе с нитью: без возврата к прежней цепочке опровергать нечего.
  // 🔒 СЕГОДНЯ НАЗЫВАЕТСЯ МОДЕЛИ ПЕРВОЙ СТРОКОЙ (218-7): без этого «вчера» и «в пятницу» не
  // превращаются в дату — модель не знает, какой сегодня день, и либо выдумает, либо промолчит.
  const todayIso = new Date().toISOString().slice(0, 10)
  const todayWeekday = new Date().toLocaleDateString("ru-RU", { timeZone: "UTC", weekday: "long" })
  const toModel = `Сегодня: ${todayIso} (${todayWeekday}).

${text}`

  // 🪦 ЗДЕСЬ ПРИНИМАЛИСЬ ПРИЗНАКИ ОТ ЗОВУЩЕГО (`features`, 201-5 … 205-3) — параметр удалён вместе
  // с реестром решением владельца 2026-09-15.
  const givenRefused = []

  let facts = null
  let parsedScope = null
  const fromGiven = false

  if (facts === null) {
    rStep("зову модель на разбор фразы на факты")
    const answer = await think(EXTRACT, toModel)
    if (!answer.ok) {
      // 🔒 ОТКАЗ РАЗБОРА НЕ ОТМЕНЯЕТ СОХРАНЕНИЯ СКАЗАННОГО (§8). Модель не поняла фразу — это
      // наша беда, а не человека: его слова обязаны уцелеть, и уцелеть они могут только в графе.
      // ✗ Оплачено прогоном 201-5: на «потратил много» модель ответила не по форме, и ответ терял
      // и фразу, и причину отказа присланного признака — снаружи это выглядело как «ничего не было».
      const kept = await toGraph({ history: givenRefused, person: { key: who, name: knownNow?.name_he_is_called ?? null }, pointers: [], said: text, via: extra.via ?? null, who })
    rStep(`модель не разобрала: ${answer?.refusal ?? "фактов не нашлось"} — кладу фразу целиком`)
      const keptRow = await rowForKeptOnly({ extra, input, kept, scopeOne: (extra.scope ?? [])[0] ?? null, sourcePath, text, who })
      if (keptRow.ok) await linkToEarlier({ messageId: keptRow.id, ownVectorId: kept?.vector?.id ?? null, text })
      await note({
        asked: text,
        dropped: givenRefused,
        method: "remember",
        ms: Date.now() - startedAt,
        trouble: `${refusalWords(answer.refusal, "ru")}${answer.why ? ` — ${answer.why}` : ""}`,
      })
      return withParams({
        ...(keptRow.ok ? { answer_id: answerId(keptRow.id), message_id: keptRow.id } : {}),
        ...refusal(answer.refusal, lang),
        dropped: givenRefused,
        kept_whole: kept.ok
          ? { anchors: [who], id: kept.id ?? null, ok: true, where: kept.where ?? "graph", why: kept.why || undefined }
          : { ok: false, where: kept.where ?? "graph", why: kept.refused ?? kept.why },
      })
    }
    facts = Array.isArray(answer.data?.facts) ? answer.data.facts : []
    // 🔒 218-7: О КАКОМ ВРЕМЕНИ И МЕСТЕ ФРАЗА — ИЗ ТОГО ЖЕ ВЫЗОВА, БЕЗ ЛИШНЕГО ХОДА МОДЕЛИ.
    parsedScope = scopeFromModel(answer.data?.scope)
    // ── 218-15: «ТО КАФЕ» — ПО ИСТОРИИ, ХОДОВ МОДЕЛИ НОЛЬ ────────────────────────────────────────
    if (parsedScope?.place_ref && !parsedScope.place) {
      const found = await resolvePlaceRef(parsedScope.place_ref)
      if (found?.place) {
        parsedScope = { ...parsedScope, place: found.place, source: "guess" }
        placeResolved = { from_record: found.fromId, place: found.place, ref: parsedScope.place_ref }
        rStep(`«${parsedScope.place_ref}» — по истории это «${found.place}» (запись №${found.fromId}); место помечено как вывод`)
      } else if (found?.ambiguous) {
        placeResolved = { candidates: found.ambiguous, place: null, ref: parsedScope.place_ref }
        rStep(`«${parsedScope.place_ref}» — в истории несколько мест (${found.ambiguous.join(" · ")}); не угадываю, место пустое`)
      } else {
        placeResolved = { place: null, ref: parsedScope.place_ref }
        rStep(`«${parsedScope.place_ref}» — в истории такого места нет; место пустое`)
      }
    }
    // ── 218-13: ПРОСЬБЫ → СЛУЖБА РЕЕСТРА ИЛИ ПОИСК РЕШЕНИЯ ──────────────────────────────────────
    const asks = (Array.isArray(answer.data?.requests) ? answer.data.requests : [])
      .map((r) => (typeof r === "string" ? r : r?.text))
      .filter((r) => typeof r === "string" && r.trim())
      .map((r) => r.trim().slice(0, 200))
    // 218-14: непонятная фраза не маршрутизируется и не ищет решений — ни одна догадка не выдаётся за ответ.
    unclear = answer.data?.clear === false
      ? { why: typeof answer.data?.unclear_why === "string" ? answer.data.unclear_why.trim().slice(0, 300) : null }
      : null
    if (unclear) rStep(`фразу не отнести ни к одному сценарию: ${unclear.why ?? "контекста не хватает"} — только сохраняю`)
    notMine = []
    solutions = []
    for (const ask of asks) {
      const hit = elsewhere(ask)
      if (hit.length) {
        for (const h of hit) if (!notMine.some((n) => n.service === h.service)) notMine.push({ ...h, request: ask })
      } else {
        solutions.push(await findSolution(ask))
      }
    }
    rStep(asks.length
      ? `просьб во фразе: ${asks.length} · к службам реестра: ${notMine.length} · без службы, искал решение: ${solutions.length}${solutions.length ? " (маркетплейс и реестр навыков — заглушки: ничего не найдено)" : ""}`
      : "просьб во фразе нет")
    rStep(parsedScope && (parsedScope.at || parsedScope.place) ? `время и место из фразы: ${[parsedScope.at_words ?? parsedScope.at, parsedScope.place].filter(Boolean).join(" · ")}` : "времени и места во фразе нет")
  }

  if (facts.length === 0) {
    // 🔒 ГРАФ ПОЛУЧАЕТ ФРАЗУ, ДАЖЕ КОГДА ФАКТОВ О ЧЕЛОВЕКЕ В НЕЙ НЕТ (§8): «ничего не легло в
    // таблицу» и «сказанное потеряно» — разные вещи, и вторую мы обещали не допускать.
    const kept = await toGraph({ history: givenRefused, person: { key: who, name: knownNow?.name_he_is_called ?? null }, pointers: [], said: text, via: extra.via ?? null, who })
    rStep(`модель не разобрала: ${answer?.refusal ?? "фактов не нашлось"} — кладу фразу целиком`)
    const keptRow = await rowForKeptOnly({ extra, input, kept, scopeOne: (extra.scope ?? [])[0] ?? null, sourcePath, text, who })
    if (keptRow.ok) await linkToEarlier({ messageId: keptRow.id, ownVectorId: kept?.vector?.id ?? null, text })
    await note({
      asked: text,
      decisions: [],
      dropped: givenRefused,
      method: "remember",
      model: "фактов о человеке не нашла",
      ms: Date.now() - startedAt,
      returned: `${say("no-facts-in-phrase", "ru")}${kept.ok ? ` · в граф: ${kept.source}` : ` · граф не принял: ${kept.refused}`}`,
    })
    // 🛑 ОТВЕРГНУТОЕ ПРИСЛАННОЕ ЕДЕТ НАРУЖУ И ЗДЕСЬ. ✗ Оплачено прогоном 201-5: признак «много» как
    // деньги был отвергнут верно, но ответ этого пути молчал о нём — и снаружи отказ был неотличим
    // от «во фразе ничего не было». Пустой ответ — самое подходящее место соврать молчанием.
    return withParams({
      ...(keptRow.ok ? { answer_id: answerId(keptRow.id), message_id: keptRow.id } : {}),
      dropped: givenRefused,
      kept_whole: kept.ok
          ? { anchors: [who], id: kept.id ?? null, ok: true, where: kept.where ?? "graph", why: kept.why || undefined }
          : { ok: false, where: kept.where ?? "graph", why: kept.refused ?? kept.why },
      noted: [],
      ok: true,
      used_model: !fromGiven,
      what_happened: say("no-facts-in-phrase", lang),
    })
  }

  // ── ОДНА ТАБЛИЦА (206-1): СВОИХ ТАБЛИЦ И КОЛОНОК ПАМЯТЬ БОЛЬШЕ НЕ ЗАВОДИТ ────────────────
  //
  // 🔒 РЕШЕНИЕ ВЛАДЕЛЬЦА 2026-09-15, ДОСЛОВНО: «я хочу чтобы наша память вообще прекратила работать
  // с какими-либо специализированными таблицами кроме одной-единственной который фиксирует все
  // входящие сообщения… память это события вокруг базе… для граф для вектора и для въездного
  // хранилища то есть всё делаем проще понятнее быстрее».
  // Отсюда: единственная таблица — `messages_that_came_into_memory` (её пишет `lib/messages.mjs`),
  // а разобранный факт становится СОБЫТИЕМ: он уезжает в граф вместе с фразой и служит якорем, по
  // которому фраза потом находится.
  // 🪦 Здесь стояли ворота записи (201-9), решавшие «колонка или таблица», и проверка
  // колонок корневой таблицы. Выбора больше нет — снято вместе с `lib/write-gate.mjs`.
  const storyOnly = []
  const noted = []
  const skipped = []
  // 🛑 ОТВЕРГНУТОЕ ИЗ ПРИСЛАННОГО ПОПАДАЕТ В ТОТ ЖЕ СПИСОК, ЧТО И ПРОЧЕЕ НЕЗАПИСАННОЕ: зовущий
  // обязан узнать об отказе из ответа, а не по отсутствию значения через неделю.
  const givenDropped = givenRefused
  // 🛑 НИ ОДИН ФАКТ НЕ ОТБРАСЫВАЕТСЯ МОЛЧА. ✗ Оплачено первым живым прогоном
  // 175-2: модель вернула факты, все были отброшены, и наружу ушло бодрое
  // «записывать было нечего» — отладка заняла три захода. Молчаливый пропуск
  // неотличим от «во фразе ничего не было».
  const dropped = [...givenDropped]

  for (const f of facts) {
    // 🪦 ЗДЕСЬ ФАКТ О ТРЕТЬЕМ ЛИЦЕ ВЫБРАСЫВАЛСЯ — СНЯТО 2026-09-16 РЕШЕНИЕМ ВЛАДЕЛЬЦА (218-5).
    //
    // 🎯 Его слова: «Я не понимаю, каким образом вообще мог появиться закон?… Если архитектор тебе
    // сказал сделать запись, то ты не должен думать, к чему она относится — ты просто делаешь
    // запись в соответствии с нашей архитектурой».
    //
    // ✗ КАК ЗАКОН ПОЯВИЛСЯ И ПОЧЕМУ ПЕРЕЖИЛ СВОЁ ОСНОВАНИЕ. Введён 2026-09-09 (175-2), когда память
    // строилась как ЛИЧНАЯ память об архитекторе: тогда «факты о самом человеке» и были предметом.
    // Записка владельца 2026-09-16 сменила основание — память есть микросервис, принимающий
    // неструктурированное от поставщиков, — но договор 5.0.0 переписывался снаружи: двери, глаголы,
    // форма ответа. Промпт разбора, то есть ЧТО ИМЕННО извлекается, не тронули, и правило осталось.
    // 🔒 УРОК ШИРЕ СЛУЧАЯ: сменив основание, проверяют не только двери, но и то, что через них едет.
    // Снаружи система выглядела правильной, а внутри выбрасывала «Петя», «340 долларов», «Мадрид».
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

    // 🔒 ФАКТ СТАНОВИТСЯ СОБЫТИЕМ, А НЕ МЕСТОМ ХРАНЕНИЯ. Ни колонки, ни таблицы под него больше не
    // заводится: он едет в граф вместе с фразой и служит якорем, по которому фраза находится.
    // 🔒 «ИСПРАВЛЯЕТ» ОСТАЁТСЯ ЗНАЧИМЫМ И ЗДЕСЬ: прежнее значение ничем не затирается, но слово
    // человека «на самом деле…» доезжает до графа и до ответа — иначе поправка выглядит как
    // ещё одно равноправное утверждение.
    noted.push({
      basis: basis || null,
      became: value,
      claim: claim || null,
      corrects,
      // 🔒 ДВА ИМЕНИ У ОДНОГО РОДА (218-4): `what` — машинное, по нему ищут; `label` — человеческое,
      // на языке фразы, и его читают глазами. ✗ Оплачено: в русском ответе стояло
      // «city where he lives now: Мадрид» — владелец читал английское имя колонки как часть ответа.
      label: typeof f?.label === "string" && f.label.trim() ? f.label.trim().slice(0, 60) : null,
      // 218-5: о ком или о чём этот факт. Пусто — модель не назвала, и это «не знаю чей», а не «мой».
      subject: typeof f?.subject === "string" && f.subject.trim() ? f.subject.trim().slice(0, 80) : null,
      what: kind,
      where: "graph",
    })
  }

  // 🔒 ОТВЕЧАЕМ СЛОВАМИ, КОТОРЫЕ АГЕНТ МОЖЕТ ПРОИЗНЕСТИ ЧЕЛОВЕКУ. Ни имён
  // таблиц, ни слова «колонка»: наружу уходит знание, а не устройство.
  const said = noted
    .map((n) =>
      n.corrects
        ? `поправка принята: ${n.what.replace(/_/g, " ")} — ${n.became}`
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

  // 🪦 ЗДЕСЬ ЖИЛО ТРЕБОВАНИЕ СОЗДАТЬ ТАБЛИЦУ (`need_table`, 183-6). Своих таблиц память больше не
  // заводит (решение владельца 2026-09-15), поэтому требование исполнять нечем: параметр получает
  // названную судьбу «способности больше нет» в `params` ответа — молчаливый пропуск читался бы как
  // «сделано». Сам параметр уходит из договора подшагом 206-6.

  // ── ГРАФ ПОЛУЧАЕТ СКАЗАННОЕ ЦЕЛИКОМ (201-5, §8) ─────────────────────────
  //
  // 🔒 ВСЁ СКАЗАННОЕ — В ГРАФ; ТАБЛИЦА — ТОЛЬКО ДЛЯ ТОЧНОГО, СЧЁТНОГО И ТЕКУЩЕГО. Поэтому документ
  // пишется всегда, а указатели говорят, что из этой же фразы легло строкой и куда именно.
  // 🔒 ЧТО НЕ ЛЕГЛО В ТАБЛИЦУ, НАЗЫВАЕТСЯ ОТДЕЛЬНО: история второго порядка («Денис служил…»),
  // факты о третьих лицах и отброшенное. В графе это единственное место, где они вообще есть.
  const anchors = []
  const pointers = []
  // 🪦 ЗДЕСЬ ВО ВВОДНУЮ ЧАСТЬ ДОКУМЕНТА ЕХАЛИ КЛЮЧИ РЕЕСТРА (требование владельца 2026-09-14) —
  // реестр отменён целиком 2026-09-15. Вводная часть осталась: имя человека, канал и якоря; по чему
  // документ находится, теперь решают имена сущностей и сам текст.
  const featureKeys = []
  for (const n of noted) {
    const value = n.became
    // 🔒 ЯКОРЬ — ИМЯ СУЩНОСТИ, О КОТОРОЙ ИДЁТ РЕЧЬ: друг, животное, встреченный человек. Прежде
    // глубину брали у признака; теперь якорем становится любое короткое записанное значение — его
    // и ищут по имени.
    if (value && String(value).trim().split(/\s+/).length <= 3) {
      anchors.push(String(value).split(/[,—-]/)[0].trim())
    }
    // 🔒 СУБЪЕКТ ФАКТА — ТОЖЕ ЯКОРЬ (218-5). «Петя» становится сущностью графа, к которой
    // приклеены «340 долларов» и «Мадрид»: иначе вопрос «кто у нас в Мадриде» снова не нашёл бы
    // того, о ком это сказано. «Сам говорящий» якорем не ставится — он уже есть как `who`.
    if (n.subject && n.subject !== "сам говорящий") anchors.push(n.subject)
    if (!value) continue
    // 🔒 УКАЗАТЕЛЬ НАЗЫВАЕТ РОД, ХОЗЯИНА И ЗНАЧЕНИЕ, А НЕ МЕСТО: мест у памяти больше не два, и имени
    // таблицы наружу не существует.
    const owner = n.subject && n.subject !== "сам говорящий" ? `${n.subject}: ` : ""
    pointers.push(`${owner}${n.what.replace(/_/g, " ")} → «${value}»${n.corrects ? " (поправка)" : ""}`)
  }
  // 218-7: место фразы — сущность графа, иначе «кто у нас в Мадриде» не найдёт сказанного там.
  if (parsedScope?.place) anchors.push(parsedScope.place)
  const graph = await toGraph({
    anchors,
    featureKeys,
    history: [...storyOnly, ...skipped, ...dropped],
    person: { key: who, name: knownNow?.name_he_is_called ?? null },
    pointers,
    said: text,
    via: extra.via ?? null,
    who,
  })

  // ── СТРОКА В ЕДИНСТВЕННОЙ ТАБЛИЦЕ (206-3) ───────────────────────────────────────────────────
  //
  // 🔒 «ОДНА-ЕДИНСТВЕННАЯ ТАБЛИЦА, КОТОРАЯ ФИКСИРУЕТ ВСЕ ВХОДЯЩИЕ СООБЩЕНИЯ» — слова владельца
  // 2026-09-15. До этого подшага строку получал только присланный ФАЙЛ, а фраза человека не
  // получала ничего: таблица называлась единственной и при этом не знала о большей части входящего.
  // 🔒 СТРОКА СВЯЗЫВАЕТ ТРИ ХРАНИЛИЩА: `rag_source` — документ связей, `vector_id` — кусок смысла,
  // `object_id` — вещь, если текст был длинным. По ней потом и отвечают.
  // 🔒 218-7: ПРИСЛАННОЕ ЗОВУЩИМ ТОЧНЕЕ РАЗОБРАННОГО — телефон знает координаты, фраза знает слово.
  const scopeOne = (extra.scope ?? [])[0] ?? parsedScope
    rStep(`в связи и вектор: ${graph.ok ? graph.where ?? "graph" : "отказ " + (graph.refused ?? "")}`)
  const row = await insertMessage({
    direction: DIRECTION.REMEMBER,
    kind: "text",
    object_id: graph.where === "objects" ? graph.id ?? null : null,
    rag_source: graph.source ?? null,
    scope_at: scopeOne?.at ?? null,
    scope_lat: scopeOne?.lat ?? null,
    scope_lon: scopeOne?.lon ?? null,
    scope_place: scopeOne?.place ?? null,
    scope_radius_m: scopeOne?.radius_m ?? null,
    // 218-15: источник пишется только при значении — пустое место с источником «said» было бы ложью
    scope_source: scopeOne && (scopeOne.at || scopeOne.place || scopeOne.lat) ? scopeOne.source ?? "said" : null,
    source: extra.via ?? "api",
    // 207-2: откуда пришло и чем предъявился зовущий. Путь называет себя сам, род ключа — измеренный факт.
    source_auth: input.auth === AUTH.MACHINE ? AUTH.MACHINE : input.auth === AUTH.KEY ? AUTH.KEY : null,
    source_path: sourcePath,
    status: graph.ok ? STATUS.SAVED : STATUS.FAILED,
    summary: text.slice(0, 500),
    tags: noted.map((n) => n.what),
    vector_id: graph.vector?.id ?? null,
    who,
  })
  // 🔒 218-10: СТУПЕНЬ 2 ЦЕПОЧКИ — СВЯЗАТЬ С ТЕМИ САМЫМИ ПРЕЖНИМИ, ПО СМЫСЛУ И ПО ВРЕМЕНИ.
  const chained = row.ok ? await linkToEarlier({ messageId: row.id, ownVectorId: graph.vector?.id ?? null, text }) : null
  if (chained) rStep(`связал с прежними: по смыслу ${chained.meaning.length}${chained.time ? " · по времени 1" : ""}${chained.errors.length ? " · отказы: " + chained.errors.join(", ") : ""}`)

  // 🔒 ЗАПИСЬ ИДЁТ ПЕРЕД ОТВЕТОМ, ПОТОМУ ЧТО ПОСЛЕ `return` ЕЁ НЕ БУДЕТ.
  // Отброшенное и пропущенное уходят в журнал НАРАВНЕ с записанным: именно они
  // объясняют, почему память «не запомнила».
  // 🔒 ОХВАТ ПИШЕТСЯ В ЖУРНАЛ РЯДОМ С ФРАЗОЙ (183-6). В само знание он пока не
  // ложится, и об этом сказано строкой `params`; но исчезать он не имеет права —
  // «прислал и ничего не произошло» есть отдельный класс дефекта.
  await note({
    asked: scope ? `${text}  ⟨охват: ${scope}⟩` : text,
    decisions: noted.map(
      (n) =>
        `${n.what}: ${n.corrects ? "поправка" : "событие"} «${n.became}»${n.claim === CLAIM.GUESS ? " (догадка)" : ""} → граф`,
    ),
    // 🔒 218-24: ЯКОРЬ ОТВЕТА В ЖУРНАЛЕ. По нему досье собирается через три дня точно, а не
    // угадывается по времени: вопрос владельца был именно о том, что через три дня агент ничего
    // не восстановит.
    answer: row.ok ? answerId(row.id) : null,
    dropped,
    method: fromGiven ? "remember (признаки от зовущего, модель не звалась)" : "remember",
    model: `${facts.length} факт(ов)`,
    ms: Date.now() - startedAt,
    returned: `${said || nothing}${graph.ok ? ` · в граф: ${graph.source}` : ` · граф не принял: ${graph.refused}`}`,
    skipped,
  })

  return withParams({
    // 🔒 У ОТВЕТА ЕСТЬ ИМЯ (207-3) — им его потом комментируют. Имя не выдумано: это номер строки,
    // которую только что записали. Не записалась строка — имени нет, и обещать его нельзя.
    ...(row.ok ? { answer_id: answerId(row.id) } : {}),
    dropped,
    // 🔒 СУДЬБА ГРАФА НАЗЫВАЕТСЯ В ОТВЕТЕ, А НЕ ПОДРАЗУМЕВАЕТСЯ. «Всё сказанное ложится в граф» —
    // обещание; непроверяемое обещание через неделю неотличимо от невыполненного.
    kept_whole: graph.ok
      ? {
          anchors: [...new Set([...anchors, who])],
          id: graph.id ?? null,
          ok: true,
          where: graph.where ?? "graph",
          ...(graph.why ? { why: graph.why } : {}),
          ...(graph.vector ? { vector: graph.vector } : {}),
        }
      : { ok: false, where: graph.where ?? "graph", why: graph.refused ?? graph.why },
    // 🔒 НОМЕР СТРОКИ В ЕДИНСТВЕННОЙ ТАБЛИЦЕ ЕДЕТ НАРУЖУ: по нему зовущий найдёт это сообщение потом.
    ...(row.ok ? { message_id: row.id } : { message_row_error: row.error }),
    // 218-10: с какими прежними сообщениями связано это — номера строк и причина.
    ...(chained ? { linked_to: { meaning: chained.meaning, time: chained.time } } : {}),
    noted,
    ok: true,
    used_model: !fromGiven,
    skipped_not_about_him: skipped,
    // 🔒 ЧТО ЛЕГЛО ТОЛЬКО В СВЯЗИ И ПОЧЕМУ: факты о третьих лицах и отброшенное. Поле осталось от
    // ворот записи (201-9) и по-прежнему отвечает на вопрос «записано ли всё, что сказано».
    ...(storyOnly.length ? { kept_in_graph_only: storyOnly } : {}),
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
  const { lang, text } = input
  const who = input.who || ARCHITECT
  const startedAt = Date.now()
  // 217-1: приглашение прокомментировать — периодическое, и «в начале сессии» считается по этой паузе.
  const prevAt = await previousAt(who)

  // 🔒 НЕОБЯЗАТЕЛЬНЫЕ ПАРАМЕТРЫ ЧИТАЮТСЯ ОДНИМ МЕСТОМ НА ОБА ГЛАГОЛА (183-2…6),
  // и каждый получает названную судьбу: принят · способности нет · не той формы.
  const { report: paramReport, values: p } = readParams(input, [
    "depth", "want_chain", "scope", "from",
  ])
  const depthAsked = p.depth ?? "standard"
  // 🔒 ХОД МЫСЛЕЙ СО ВРЕМЕНЕМ У КАЖДОГО ШАГА (218-3, слово владельца: «у неё должно быть время
  // у всех элементов»). Копить дёшево, и собрать задним числом было бы уже нечем.
  const trace = makeTrace(startedAt)
  const chain = trace.items
  const step = trace.step

  // ── СТУПЕНЬ 3 ЦЕПОЧКИ: ВРЕМЯ И МЕСТО В ВОПРОСЕ (218-8) ─────────────────────────────────────────
  //
  // 🔒 БЕЗ ХОДА МОДЕЛИ: чтение модель не зовёт (206-3). Место сверяется с местами, которые памяти уже
  // известны, время — со словами «вчера», «в пятницу» и датами. Пустое значит «в вопросе не сказано».
  const knownPlacesRow = await sql(
    `SELECT scope_place, MAX(id) AS last FROM ${MESSAGES} WHERE scope_place IS NOT NULL AND scope_place <> '' GROUP BY scope_place ORDER BY last DESC`,
  )
  const knownPlaces = knownPlacesRow.ok ? (knownPlacesRow.rows ?? []).map((r) => r.scope_place) : []
  const qTime = timeInQuestion(text)
  const qPlace = placeInQuestion(text, knownPlaces)
  const qScope = qTime || qPlace ? { at: qTime?.at ?? null, at_words: qTime?.words ?? null, place: qPlace } : null
  step(qScope
    ? `в вопросе: ${[qScope.at_words ? `${qScope.at_words} (${qScope.at})` : null, qScope.place].filter(Boolean).join(" · ")}`
    : `в вопросе нет ни времени, ни места (известных мест в памяти: ${knownPlaces.length})`)
  /**
   * Ответ собирается одним местом — чтобы `depth_used` не разошёлся с тем, что
   * произошло на самом деле, а `chain` не появился там, где его не просили.
   *
   * 🔒 `depth_used` СЧИТАЕТСЯ ПО ФАКТУ, А НЕ ПО ПРОСЬБЕ: уровень 1 — ответ без
   * модели, уровень 2 — с моделью. Просили `extreme`, дошли до первого — так и
   * будет сказано. Уверенное умолчание дороже отсутствующего значения (144).
   */
  // 🔒 С 200-6 ОТВЕТ НЕСЁТ `text` И `objects` ВСЕГДА. Есть вопрос — «Спросить» ищет и объекты по смыслу (одно встраивание, без хода модели):
  // иначе документ или ролик, положенные «Сказать», не нашлись бы никогда — поиск по таблицам их не видит.
  // 🛑 СБОЙ ПОИСКА ОБЪЕКТОВ НЕ ОТМЕНЯЕТ ОТВЕТ И НЕ МОЛЧИТ: факты отдаются, а причина — полем `objects_error` и строкой цепочки.
  // 🔒 205-3: ОТКАЗЫ ПРИСЛАННЫХ ПРИЗНАКОВ ЕДУТ В ОТВЕТ. Объявлено ДО `answer`: ранние выходы зовут его раньше подбора, и
  // объявление ниже по коду упало бы на обращении до инициализации. ✗ До 205-3 подсказка ближайшего ключа рождалась в
  // подборе и терялась — зовущий с ключом чата слышал «не знаю», а не «ключ называется иначе».
  let refused = []
  // 🔒 ИМЯ ОТВЕТА ОБЪЯВЛЕНО ДО СБОРЩИКА, А ЗАПОЛНЯЕТСЯ ПОСЛЕ ЗАПИСИ ВОПРОСА (207-3): ранние выходы
  // зовут сборщик раньше записи, и объявление ниже по коду упало бы на обращении до инициализации.
  // Пусто значит «строки у вопроса нет» — тогда и комментировать нечего, и это сказано честно.
  let answer_id = null
  // 🔒 219-1: НОМЕР ВОПРОСА ДЕРЖИМ ОТДЕЛЬНО. Сборщик ответа объявлен ДО записи вопроса и зовётся из
  // ранних выходов тоже — обращение к переменной записи изнутри него упало бы на инициализации.
  let askedId = null
  const answer = async (body) => {
    let objects = []
    let objectsError = null
    // 🔒 218-8: НАХОДКИ, СОВПАВШИЕ С ВРЕМЕНЕМ И МЕСТОМ ВОПРОСА, ИДУТ ПЕРВЫМИ; ПРО ДРУГОЕ — ПОСЛЕДНИМИ.
    // Про другое не выбрасывается: «в Мадриде» при записи о Лондоне — тоже ответ, только не тот.
    // Запись без места не наказывается: она может быть о Мадриде, и спрятать её — соврать.
    // 🔒 218-10: К НАЙДЕННОМУ ПОДТЯГИВАЕТСЯ СВЯЗАННОЕ С НИМ — ОДИН ШАГ. Ответ собирается цепочкой, а не
    // островами: «Петя заказал чехлы» приводит за собой «Петя забрал заказ во вторник».
    // 🔒 218-11: ВТОРОЙ КРУГ — ОТ НОВЫХ ИМЁН НАЙДЕННОГО, СО СВЕРКОЙ ПО ТАБЛИЦЕ, НЕ ГЛУБЖЕ ДВУХ.
    // Ответ о самой памяти второго круга не требует: там нечего раскрывать связями.
    let cyclesUsed = Array.isArray(body.known) && body.known.length ? 1 : 0
    if (cyclesUsed && !body.known.some((k) => k.found_by === "self")) {
      const c2 = await secondCycle({ known: body.known, question: text })
      step(`второй круг: ${c2.reason}${c2.names.length ? ` · новые имена: ${c2.names.join(", ")}` : ""} · подтверждено таблицей: ${c2.found.length} · ${c2.ms} мс`)
      if (c2.found.length) {
        body.known = [...body.known, ...c2.found]
        cyclesUsed = 2
      }
    }
    if (Array.isArray(body.known) && body.known.length) {
      const ids = body.known.map((k) => k.message_id).filter(Boolean)
      const extra = await linkedRows(ids)
      if (extra.length) {
        body.known = [
          ...body.known,
          ...extra.map((r) => ({
            at: r.scope_at ?? null,
            claim: null,
            found_by: "link",
            link_reason: r.reason ?? null,
            message_id: r.id,
            object_id: r.object_id ?? null,
            place: r.scope_place ?? null,
            place_source: r.scope_source ?? null,
            said_at: r.created_at ?? null,
            value: String(r.summary ?? "").slice(0, 1000),
            what: "связано с найденным",
          })),
        ]
      }
      step(`связанного с найденным: ${extra.length}`)
    }
    if (qScope && Array.isArray(body.known) && body.known.length) {
      const rank = { match: 0, unknown: 1, other: 2 }
      body.known = body.known
        .map((k) => ({ ...k, scope_fit: scopeFit(k, qScope) }))
        .sort((a, b) => rank[a.scope_fit] - rank[b.scope_fit])
      const n = (f) => body.known.filter((k) => k.scope_fit === f).length
      step(`по времени и месту вопроса: совпало ${n("match")} · без метки ${n("unknown")} · про другое ${n("other")}`)
    }
    // 🔒 217-1: ЗВАТЬ ЛИ ПРОКОММЕНТИРОВАТЬ — РЕШЕНИЕ ПО ИЗМЕРЕННЫМ ПОРОГАМ, БЕЗ ХОДА МОДЕЛИ.
    // Причина решения едет наружу: молчаливое правило нечем проверить, а проверять придётся.
    // ── 5.3 + 5.4: ГЛУБЖЕ — ПРЕДЛОЖИТЬ С ЦЕНОЙ ИЛИ ВЫПОЛНИТЬ С СОГЛАСИЯ (218-12) ─────────────────────
    // 🔒 УСЛОВИЕ — «БЛИЗКИХ СВЯЗЕЙ НЕ НАШЛОСЬ», А НЕ «ПРОСИЛИ DEEP». Нашлось по связям — размышлять не
    // над чем тратить квоту: ответ уже есть. Не нашлось и не просили — предложить, а не тратить молча.
    let deeper = null
    let deepAnswer = ""
    const hasQuestion = typeof text === "string" && text.trim() !== ""
    // 🔒 218-12: близость находок к вопросу — одна свёртка вопроса, ходов модели ноль.
    let scoreOf = new Map()
    if (hasQuestion && (body.known ?? []).some((k) => k.vector_id)) {
      const probe = await searchSaid({ k: 40, question: text })
      if (probe.ok) scoreOf = new Map(probe.pieces.map((x) => [String(x.id), x.score]))
    }
    const closeNone = hasQuestion && noCloseLinks(body.known, scoreOf, NEAR_SAID)
    if (hasQuestion && (body.known ?? []).length) {
      const shown = (body.known ?? []).map((k) => {
        const v = k.found_by === "vector" ? k.score : scoreOf.get(String(k.vector_id ?? ""))
        return typeof v === "number" ? v.toFixed(2) : "—"
      })
      step(`близость найденного к вопросу: ${shown.join(" · ")} (порог ${NEAR_SAID})`)
    }
    if (closeNone && (depthAsked === "deep" || depthAsked === "extreme")) {
      step(`близких связей нет · согласие получено (depth ${depthAsked}${depthAsked === "extreme" ? ", отдельного extreme нет — идёт deep" : ""}) · зову модель`)
      const d = await goDeeper({ known: body.known, lang, question: text })
      if (d.ok) {
        body.known = [...(body.known ?? []), ...d.found]
        deepAnswer = d.answer
        body.depth_used = 4
        body.used_model = true
        const nm = d.found.filter((f) => f.found_by === "deep-memory").length
        step(`размышление: из памяти ${nm} · из знаний о мире ${d.found.length - nm} · выброшено без опоры на записи ${d.dropped.length} · ${d.ms} мс`)
      } else {
        step(`размышление отказало: ${d.refusal}${d.why ? " — " + d.why : ""}`)
        deeper = { ...offerDeeper(lang), refused: d.refusal }
      }
    } else if (closeNone) {
      deeper = offerDeeper(lang)
      step("близких связей нет · предлагаю глубже с ценой, квоту не трачу")
    } else if (depthAsked !== "standard" && hasQuestion) {
      step(`просили «${depthAsked}», но близкие связи нашлись — размышлять не над чем, квота не тратится`)
    }

    const inviteNow = shouldInvite({ depthUsed: body.depth_used ?? 0, ms: Date.now() - startedAt, prevAt })
    if (body.ok && typeof text === "string" && text.trim()) {
      const found = await find_objects({ question: text })
      if (found.ok) {
        // 🔒 ФИЛЬТР ДВУХ РОДОВ (201-6, ТЗ 200-9): чужой объект — дефект точности (закон четвёртый),
        // а объект не того рода — ответ не на тот вопрос: спросили про ссылку, паспорт не идёт.
        const sifted = filterObjects({ objects: found.results, question: text, who })
        objects = sifted.objects.map((r) => ({ found_by: "object", id: r.id, kind: r.kind, messageId: r.messageId, ok: true, score: r.score, title: r.title , mime: r.mime, name: r.name, summary: r.summary ?? null}))
        step(
          `объекты по смыслу: ${objects.length}` +
            (sifted.dropped_alien ? ` · отсеяно чужих: ${sifted.dropped_alien}` : "") +
            (sifted.dropped_kind ? ` · не того рода: ${sifted.dropped_kind}` : ""),
        )
      } else {
        objectsError = String(found.error ?? "object-search-failed")
        step(`поиск объектов не ответил: ${objectsError}`)
      }
    }
    // 🔒 218-16: НАШЛАСЬ ВЕЩЬ — ВОПРОС ОТВЕЧЕН, ПРЕДЛОЖЕНИЕ ГЛУБЖЕ СНИМАЕТСЯ. ✗ Живой замер: под найденным
    // снимком стояло «Близких связей не нашлось, могу поискать глубже» — предлагать платить за уже данный ответ.
    if (objects.length && deeper && !deeper.refused) {
      deeper = null
      step("нашлись вещи по смыслу — предложение глубже снято")
    }

    // ── 219-1: ОТВЕТ СТАНОВИТСЯ СТРОКОЙ ПАМЯТИ ──────────────────────────────────────────────────
    // 🔒 ЗДЕСЬ ЕДИНСТВЕННАЯ ТОЧКА ВЫХОДА ЧТЕНИЯ: что бы ни случилось выше, наружу человек получает
    // ответ отсюда. Значит и записывается он отсюда — второй писатель разошёлся бы с первым.
    // 🛑 ОТКАЗ ЗАПИСИ НЕ ОТМЕНЯЕТ ОТВЕТ: человек получает то же самое, а беда называется в цепочке.
    const outgoing = recallText({
      certainty: certaintyOf(body, qScope).certainty,
      deepAnswer,
      deeper,
      invite: inviteNow.invite,
      known: body.known,
      lang,
      objects,
      qScope,
      what_happened: body.what_happened,
    })
    const saidBack = await writeAnswer({
      // 🔒 219-3: РАЗМЫШЛЕНИЯ СОХРАНЯЮТСЯ НЕЗАВИСИМО ОТ ТОГО, ПРОСИЛ ЛИ ИХ ЗОВУЩИЙ. `want_chain:false`
      // выключает их в ОТВЕТЕ наружу — это забота о чужом контексте, а не разрешение забыть, что
      // память делала. Разбирать жалобу через три дня будем мы, а не тот, кто выключил поле.
      chain,
      depth: body.depth_used ?? (body.used_model ? 2 : 1),
      ms: Date.now() - startedAt,
      sourcePath,
      text: outgoing,
      toMessageId: askedId,
      usedModel: Boolean(body.used_model),
      who,
    })
    step(saidBack.ok ? `ответ записан строкой №${saidBack.id}${saidBack.linked ? " и связан с вопросом" : ""}` : `ответ НЕ записан: ${saidBack.error}`)
    // 🔒 219-4: ИМЯ ОТВЕТА УКАЗЫВАЕТ НА ОТВЕТ, А НЕ НА ВОПРОС. ✗ Найдено живым прогоном 219-5: в
    // «Сказать» имя уже указывало на ответ, а в «Спросить» осталось от вопроса — и досье честно
    // печатало «запись прежнего образца» о только что созданной записи. Не записался ответ — имя
    // остаётся прежним: обещать имя строки, которой нет, нельзя.
    if (saidBack.ok) answer_id = answerId(saidBack.id)

    return {
      ...body,
      ...(answer_id ? { answer_id } : {}),
      ...certaintyOf(body, qScope),
      depth_asked: depthAsked,
      // 🔒 УРОВЕНЬ СЧИТАЕТСЯ ПО ФАКТУ: 1 — ответ без модели, 2 — модель назвала признак и ответила
      // таблица, 3 — понадобились связи. Просили `extreme`, дошли до первого — так и будет сказано.
      depth_used: body.depth_used ?? (body.used_model ? 2 : 1),
      // 218-11: сколько кругов чтения понадобилось — 1 или 2. Глубину это не меняет: цикл входит в основу.
      cycles_used: cyclesUsed,
      // 218-12: предложение глубже — ПОЛЕ, на которое зовущий отвечает `depth: "deep"`; и ответ размышления.
      ...(deeper ? { deeper } : {}),
      ...(deepAnswer ? { deep_answer: deepAnswer } : {}),
            // 🔒 ХОД МЫСЛЕЙ ОТДАЁТСЯ ВСЕГДА (218-3, решение владельца 2026-09-16). 🪦 Прежнее умолчание
      // «только по просьбе» снято: оно берегло чужой контекст и оставляло человека без ответа на
      // вопрос «что вообще произошло». Выключатель `want_chain` остался — теперь он выключает.
      ...(p.want_chain === false ? {} : { chain }),
      objects,
      invited_because: inviteNow.why,
      ...(objectsError ? { objects_error: objectsError } : {}),
      ...(paramReport.length ? { params: paramReport } : {}),
      ...(refused.length ? { rejected: refused } : {}),
      // 218-4: твёрдость едет и в текст — человек читает её словами, а не ищет кодом в машинной части.
      // 218-8: охват вопроса называется и полем, и словами — человек видит, как его поняли.
      ...(qScope ? { question_scope: qScope } : {}),
      text: outgoing,
    }
  }

  // 🪦 ЗДЕСЬ ОТВЕРГАЛСЯ ВОПРОС БЕЗ ИМЕНИ ЧЕЛОВЕКА. Снято 207-3: человек один, спрашивать «о ком»
  // было требованием к зовущему без единого различимого ответа. Знание памяти общее.
  // 🪦 И ещё раньше здесь создавалась корневая таблица человека — её нет с 206-1.

  // ── ВОПРОС — ТОЖЕ ВХОДЯЩЕЕ СООБЩЕНИЕ (207-3) ────────────────────────────────────────────────
  //
  // 🔒 «ОДНА-ЕДИНСТВЕННАЯ ТАБЛИЦА, КОТОРАЯ ФИКСИРУЕТ ВСЕ ВХОДЯЩИЕ СООБЩЕНИЯ» — слова владельца.
  // До этого подшага вопрос не получал строки вовсе: таблица звалась единственной и не знала о
  // половине того, что в память приходило. Строка нужна и по второй причине — у ответа появляется
  // имя, а комментировать безымянный ответ нечем (207-4).
  let sourcePath = null
  if (p.from) {
    const parsed = parseSource(p.from)
    if (!parsed.ok) {
      await note({ asked: `from=${JSON.stringify(p.from)}`, method: "recall", ms: Date.now() - startedAt, trouble: parsed.why })
      return answer({ error: parsed.error, ok: false, what_happened: parsed.why })
    }
    sourcePath = parsed.text
  }
  const asked = await insertMessage({
    direction: DIRECTION.RECALL,
    kind: "text",
    source: "api",
    source_auth: input.auth === AUTH.MACHINE ? AUTH.MACHINE : input.auth === AUTH.KEY ? AUTH.KEY : null,
    source_path: sourcePath,
    status: STATUS.SAVED,
    summary: (text ?? "").slice(0, 500) || "без вопроса — всё, что известно",
    who,
  })
  answer_id = answerId(asked.ok ? asked.id : null)
  askedId = asked.ok ? asked.id : null
  askedId = asked.ok ? asked.id : null
  // 🔒 218-10: ВОПРОС СВЯЗЫВАЕТСЯ ТОЛЬКО ПО ВРЕМЕНИ. «а когда он их заберёт?» — продолжение сказанного
  // перед ним; связь по смыслу у вопроса не нужна: вопрос не знание, и искать им похожее — работа чтения.
  if (asked.ok) {
    const qc = await linkToEarlier({ messageId: asked.id, text: "" })
    step(qc.time ? `вопрос продолжает сообщение №${qc.time}` : "вопрос начинает новый разговор")
  }
  step(answer_id ? `вопрос записан, имя ответа ${answer_id}` : `вопрос не записан: ${asked.error}`)

  // ── ВОПРОС О САМОЙ ПАМЯТИ — ПЕРВОЙ СТУПЕНЬЮ И БЕЗ ХОДА МОДЕЛИ (211-2) ───────────────────────
  //
  // ✗ НАЙДЕНО ЖИВЫМ ПРОГОНОМ ВЛАДЕЛЬЦА: «Где ты сейчас» ушло искать ответ в том, что рассказывали
  // люди, не нашло ничего и вернуло «не знаю» за 9,6 секунды. Способность отвечать на этот вопрос
  // была построена часом раньше АДРЕСОМ `/v1/state`, а человек спрашивает ГЛАГОЛОМ.
  // 🔒 АДРЕС — НЕ ПУТЬ ЧЕЛОВЕКА. Способность, не подключённая к тому пути, которым ходят, снаружи
  // неотличима от отсутствующей.
  if (text && asksAboutSelf(text)) {
    const self = aboutSelf({ lang, seen: input.seen })
    step(`вопрос о самой памяти — отвечаю из состояния, ходов модели ноль`)
    await note({
      asked: text,
      method: "recall (о самой памяти)",
      model: "состояние службы, ходов модели ноль",
      ms: Date.now() - startedAt,
      returned: self.what_happened,
    })
    return answer(self)
  }
  if ((p.scope ?? []).length) {
    // 🔒 ОХВАТ НАЗЫВАЕТСЯ В ЦЕПОЧКЕ И В ЖУРНАЛЕ, А НЕ ИСЧЕЗАЕТ. В само знание он
    // пока не ложится — и об этом сказано строкой `params`, а не молчанием.
    step(
      `охват вопроса (${p.scope.length}): ` +
        p.scope.map((e) => [e.at, e.place].filter(Boolean).join(" ")).join(" · "),
    )
  }

  // ── ЧТО ИЗВЕСТНО О ЧЕЛОВЕКЕ — ИЗ ЕДИНСТВЕННОЙ ТАБЛИЦЫ (206-3) ────────────────────────────────
  //
  // 🔒 ЗНАНИЕ БОЛЬШЕ НЕ ЛЕЖИТ КОЛОНКАМИ. Его несут сообщения: что человек сказал и что прислал.
  // Поэтому «что ты обо мне знаешь» — это последние его сообщения, а не обход колонок корневой
  // таблицы, которой нет.
  // 🛑 ПРЕДЕЛ НАЗВАН ЧИСЛОМ, А НЕ СПРЯТАН: отдаются последние 50 записей. Отдать всё — значит
  // однажды молча отдать мегабайт; отдать меньше и не сказать — соврать о полноте.
  const RECENT = 50
  // 🔒 БЕЗ ФИЛЬТРА ПО ЧЕЛОВЕКУ И БЕЗ ФИЛЬТРА ПО ИСТОЧНИКУ (207-3). Знание памяти общее: сказанное
  // боту обязано находиться из чата, иначе память раздваивается по каналам — молча и необратимо.
  // 🛑 ВОПРОСЫ ИСКЛЮЧЕНЫ ИЗ ЗНАНИЯ. С 207-3 у вопроса тоже есть строка; не исключи мы её, память
  // начала бы отвечать собственными вопросами и считать их тем, что ей рассказали.
  // 🛑 ЗНАНИЕ — ЭТО ТОЛЬКО ТО, ЧТО ЧЕЛОВЕК РАССКАЗАЛ. Всё остальное, что лежит в той же таблице, —
  // разговор О памяти, а не знание О МИРЕ:
  //   · `recall` — вопросы человека (исключены с 207-3);
  //   · `answer` — ОТВЕТЫ САМОЙ ПАМЯТИ (219-1). ✗ Измерено 219-6: в «что известно» попадало 18 её
  //     собственных ответов — память отвечала бы человеку его же пересказанными ответами, и с каждым
  //     кругом пересказ уходил бы дальше от сказанного;
  //   · `feedback` — комментарии о качестве ответов. ✗ Тем же замером: 18 штук. Это дефект СТАРШЕ
  //     219-го шага: «ответ слишком длинный» лежало в знании о человеке с самого 207-4.
  const mine = await sql(
    `SELECT id, created_at, kind, summary, title, source, source_path, object_id, rag_source, scope_place, scope_at
       FROM ${MESSAGES}
      WHERE direction IS NULL OR direction NOT IN ('${DIRECTION.RECALL}', '${DIRECTION.ANSWER}', '${DIRECTION.FEEDBACK}')
      ORDER BY id DESC LIMIT ${RECENT}`,
  )
  if (!mine.ok) {
    step(`таблица сообщений не ответила: ${mine.error}`)
    // 🔒 207-7: НАРУЖУ УХОДИТ РОД ЗАВИСИМОСТИ И СТУПЕНЬ, а не общее «внутри памяти». Зовущий должен
    // отличать «склад временно лёг» от «память сломана»: в первом случае он повторит, во втором —
    // позовёт человека. Порт и схема при этом наружу не едут — чёрный ящик цел.
    return answer(toolFailure({ error: mine.error, lang, stage: "чтение сообщений" }))
  }
  const known = mine.rows.map((r) => ({
    at: r.created_at,
    // 207-3: КОГДА ПРОИЗОШЛО сказанное, а не когда оно пришло. По расхождению этих значений между
    // записями и считается «ответ зависит от параметра»: две даты — два разных ответа.
    at_scope: r.scope_at || null,
    claim: null,
    found_by: "messages",
    from: r.source_path || null,
    id: r.id,
    kind: r.kind,
    value: r.summary || r.title || "",
    what: r.kind === "text" ? "сказанное" : `присланное: ${r.kind}`,
    where: r.scope_place || null,
  }))
  const missing = []


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

  // ── ЛЕСТНИЦА ЧТЕНИЯ ПОСЛЕ 206-3: СНАЧАЛА ТО, ЧТО НЕ СТОИТ ХОДА МОДЕЛИ ────────────────────────
  //
  // 🪦 ЗДЕСЬ СТОЯЛ ВЫЗОВ МОДЕЛИ, СОПОСТАВЛЯВШИЙ ВОПРОС С КОЛОНКАМИ И ТАБЛИЦАМИ ЧЕЛОВЕКА (201-6).
  // Ни колонок, ни таблиц больше нет — сопоставлять не с чем, и вызов снят целиком.
  // 🔒 ЧТЕНИЕ СТАЛО ДЕШЕВЛЕ, А НЕ БЕДНЕЕ: связи ищут по имени из вопроса (ходов модели ноль),
  // вектор — по смыслу (одно встраивание, тоже без хода модели). Порядок — по цене, как и был.
  const usedInput = []

  // ── СВЯЗИ И ИСТОРИЯ — ИЗ ГРАФА, И ТОЛЬКО ПО ИЗВЕСТНОМУ ИМЕНИ ────────────────
  //
  // 🛑 ГРАФ НЕ УМЕЕТ СКАЗАТЬ «НЕ ЗНАЮ» — ИЗМЕРЕНО 201-2: на имя, которого нет, он возвращает пять
  // ближайших сущностей и десятки тысяч знаков. Поэтому существование имени проверяется ДО вопроса,
  // поиском по меткам: он не зовёт модель вовсе (41–280 мс) и промахом даёт честное «не знаю».
  const names = namesIn(text)
  const labels = names.length ? await knownLabels(names) : []
  step(names.length ? `имена в вопросе: ${names.join(", ")} · графу известны: ${labels.map((l) => l.labels[0]).join(", ") || "ни одно"}` : "имён в вопросе нет")
  if (labels.length) {
    const flat = labels.flatMap((l) => l.labels)
    const got = await askGraph({ labels: flat, question: text })
    if (got.ok && got.context) {
      step(`связи: контекст ${got.size} знаков по именам ${flat.join(", ")}`)
      // ── МОСТ: ГРАФ НАЗВАЛ ДОКУМЕНТЫ — ТАБЛИЦА ГОВОРИТ ПРАВДУ (218-2) ──────────────────────
      //
      // 🎯 СЛОВО ВЛАДЕЛЬЦА 2026-09-16: «сначала мы ищем запись в агентном RAG, потом сопоставляем
      // эту запись с таблицами базы данных, извлекаем из них идентификаторы объектного хранилища и
      // векторного хранилища». Раньше здесь наружу уезжал СЫРОЙ контекст движка — 4000 знаков
      // служебного JSON с `<SEP>`, — и человек читал внутренности хранилища вместо ответа.
      // 🔒 ВРЕМЯ И МЕСТО ЕСТЬ У СТРОКИ, А НЕ У ПЕРЕСКАЗА: без них ответ и есть «набор огрызков слов,
      // не связанных по датам», как это назвал владелец.
      const sources = sourcesOf(got.context)
      // 🔒 218-11: СВЕРКА ПЕРВОГО КРУГА — В СТРОКЕ ОБЯЗАНО БЫТЬ СПРОШЕННОЕ ИМЯ. Граф отдаёт окрестность.
      const askedNames = [...names, ...flat]
      const allRows = await rowsBySources(sources)
      const rows = allRows.filter((r) => mentionsAny(r.summary, askedNames))
      step(`граф назвал документов: ${sources.length} · строк в таблице: ${allRows.length} · со спрошенным именем: ${rows.length}`)
      // 🛑 ГРАФ СТАРШЕ ТАБЛИЦЫ: записи до 206-3 строки не имеют вовсе. Выбросив их, память забыла бы
      // то, что помнит, — поэтому у них остаётся человеческое описание связи, но без времени и места.
      const fromRows = rows.map(foundFromRow)
      const known = fromRows.length
        ? fromRows
        : linksOf(got.context).filter((d) => mentionsAny(d, askedNames)).slice(0, 5).map((s) => ({
            at: null,
            claim: null,
            found_by: "graph",
            place: null,
            said_at: null,
            value: s,
            what: "связь",
          }))
      if (known.length) {
        await note({
          asked: `${who}: ${text}`,
          method: "recall",
          model: "связи графа, ходов модели ноль",
          ms: Date.now() - startedAt,
          returned: `${known.length} из связей${rows.length ? ` · по строкам таблицы` : " · описаниями связей"}`,
        })
        return answer({
          depth_used: 3,
          known,
          ok: true,
          used_input: usedInput,
          used_model: false,
          what_happened: `нашёл по связям: ${known.length}`,
        })
      }
      step("связи ответили, но ни строки, ни описания не нашлось")
    }
    step(`связи не ответили: ${got.error ?? "пусто"}`)
  }

  // ── ВТОРАЯ СТУПЕНЬ: БЛИЗКОЕ ПО СМЫСЛУ (206-3) ───────────────────────────────────────────────
  //
  // 🔒 СЮДА ПОПАДАЮТ ВОПРОСЫ, В КОТОРЫХ НЕТ ИМЕНИ: «где я держу деньги», «на чём я езжу». Связи
  // ищут по имени и на такой вопрос молчат законно; вектор сравнивает смысл и находит фразу,
  // сказанную ДРУГИМИ словами.
  // 🛑 ДАЛЬНЕЕ НЕ ВЫДАЁТСЯ ЗА ОТВЕТ: у склада нет пустого ответа, есть «самое близкое из того, что
  // лежит». Ниже порога — это «ничего подходящего», и так и говорится.
  // 🔒 БЕЗ ФИЛЬТРА ПО АВТОРУ (218-5), ТЕМ ЖЕ ЗАКОНОМ, ЧТО У ТАБЛИЦЫ (207-3): «знание памяти общее».
  // ✗ Здесь стоял `who` — вектор отбрасывал фразы, записанные не тем, кто спрашивает, а таблица
  // читалась без этого фильтра. Две правды об одном: сказанное ботом находилось по записям и не
  // находилось по смыслу. Тот же корень, что правило «факт не о говорящем — не хранить».
  const near = await searchSaid({ question: text })
  if (near.ok && near.near.length) {
    step(`по смыслу: ${near.near.length} из ${near.pieces.length} ближе порога ${NEAR_SAID}${near.alien ? ` · отсеяно чужих: ${near.alien}` : ""}`)
    await note({
      asked: `${who}: ${text}`,
      method: "recall",
      model: "вектор, ходов модели ноль",
      ms: Date.now() - startedAt,
      returned: `по смыслу: ${near.near.length}`,
    })
    // ── МОСТ И У ЗАПАСНОГО ВХОДА (218-2) ──────────────────────────────────────────────────────
    //
    // 🔒 КЛЮЧ КУСКА ВЕКТОРА — ТОТ ЖЕ `memory/<кто>/<время>`, что и у документа связей, и он лежит в
    // колонке `vector_id`. Значит вектор приводит к той же строке, а строка отдаёт время, место и
    // источник. ✗ Прежде вектор отдавал кусок текста как ответ: «набор огрызков слов, не связанных
    // между собой по датам» — слова владельца 2026-09-16.
    const vecRows = await rowsByVectorIds(near.near.map((x) => x.id))
    const byId = new Map(vecRows.map((r) => [String(r.vector_id), r]))
    step(`по смыслу строк в таблице нашлось: ${vecRows.length} из ${near.near.length}`)
    return answer({
      // 🔒 211-1: ВЕКТОР — ТРЕТЬЯ СТУПЕНЬ СЕГОДНЯШНЕЙ ЦЕПОЧКИ, А НЕ ЧЕТВЁРТАЯ.
      depth_used: 3,
      known: near.near.map((x) => {
        const row = byId.get(String(x.id))
        return {
          at: row?.scope_at ?? null,
          claim: null,
          found_by: "vector",
          object_id: row?.object_id ?? null,
          place: row?.scope_place ?? null,
          place_source: row?.scope_source ?? null,
          said_at: row?.created_at ?? null,
          score: Number(x.score.toFixed(3)),
          message_id: row?.id ?? null,
          value: String(row?.summary ?? x.text).slice(0, 1000),
          what: "сказанное близко по смыслу",
        }
      }),
      ok: true,
      used_model: false,
      what_happened: `нашёл по смыслу: ${near.near.length}`,
    })
  }
  step(near.ok ? `по смыслу ничего ближе порога ${NEAR_SAID}` : `вектор не ответил: ${near.refused}`)


  // ── ЧЕСТНОЕ «НЕ ЗНАЮ» ──────────────────────────────────────────────────────
  //
  // 🔒 РЕШЕНИЕ §7: «ВОТ ВСЁ, ЧТО ИЗВЕСТНО» НА КОНКРЕТНЫЙ ВОПРОС — НЕ ОТВЕТ. Это перекладывание
  // работы на того, кто спросил, и повод принять чужой факт за свой. Всё известное отдаётся только
  // без вопроса (выше) — там это и есть просьба.
  // 🔒 ЧЕГО НЕ ХВАТАЕТ, НАЗЫВАЕТСЯ: `not_yet_known` и слова подбора о том, что признака нет.
  await note({
    asked: `${who}: ${text}`,
    method: "recall",
    model: "связи и вектор не нашли ничего",
    ms: Date.now() - startedAt,
    returned: say("dont-know", "ru"),
    trouble: `нечего ответить на «${text}»`,
  })
  if (depthAsked !== "standard") {
    step(`просили «${depthAsked}»; пройдено ступеней: ${BUILT_LEVELS} построено`)
  }
  return answer({
    // 🔒 ДОШЛИ ДО КОНЦА ПОСТРОЕННОГО — ЭТО ТРИ, И НИКОГДА НЕ БОЛЬШЕ (211-1).
    // ✗ НАЙДЕНО ЖИВЫМ ПРОГОНОМ ВЛАДЕЛЬЦА: на вопрос «Где ты сейчас» ответ назвал ЧЕТВЁРТУЮ ступень
    // при пределе `standard` = 3 и трёх построенных ступенях. Закон «говори глубину, до которой
    // дошёл, а не ту, которую просили» нарушал сам код — и никакой прибор этого не ловил.
    depth_used: BUILT_LEVELS,
    known: [],
    not_yet_known: [
      ...missing,
    ],
    ok: true,
    used_input: usedInput,
    used_model: false,
    what_happened: say("dont-know", lang),
  })
}


// 🪦 «КОГО ПАМЯТЬ ЗНАЕТ» СНЯТА ЦЕЛИКОМ (209-2). Метод убран из договора 207-6, а функция осталась
// жить, и единственным её зовущим был прибор — то есть способность держалась сама за себя.
// Взамен каталог источников: какая служба и какая её сущность памяти писала (`lib/sources.mjs`).
// 🔒 Приём, которым это найдено, стоит одной команды: спрашивать не «есть ли способность», а
// «КТО ЕЁ ЗОВЁТ». Тот же приём нашёл в этой службе вектор, которому не слал фраз никто.

