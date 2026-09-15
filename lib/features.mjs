// РЕЕСТР ПРИЗНАКОВ ПАМЯТИ — СЛОВАРЬ ТОГО, ЧТО ИМЕЕТ В ВИДУ ЗОВУЩИЙ.
//
// 🔒 ОПРЕДЕЛЕНИЕ ВЛАДЕЛЬЦА, ДОСЛОВНО (2026-09-14): признак — «то что подозревает или о чем думает
// собеседник во время того когда он задаёт обращение к памяти или чат боту или любой другой службе»
// в формате добавления или извлечения информации. То есть признак — это СМЫСЛ обращения, а не место
// хранения и не ярлык таблицы.
//
// 🔒 БЕЗ `storedIn` — И ЭТО ГРАНИЦА ЧЁРНОГО ЯЩИКА, А НЕ ЭКОНОМИЯ ПОЛЯ. Наружу едет смысл: ключ, тип,
// накопление, о ком. Где это лежит, решает память (закон первый). Имя рода выводится ИЗ КЛЮЧА —
// значит второй правды о месте не существует в принципе, её негде разойтись.
// 🛑 Сторож `scripts/check-features.mjs` роняет сборку на записи с `storedIn`.
//
// 🔒 ЗАПИСЬ ЛЕЖИТ В `AGI-CONFIG/agi-config.json` — ИМЯ КОНФИГА НАЗВАЛ ВЛАДЕЛЕЦ (2026-09-14) И ОНО
// ВЕЧНОЕ: на нём повиснут пути. Файл один, индекс порождается — так решено измерением соседней
// службы (157-5): выигрыш даёт индекс, а дробление на файл-на-запись дороже монолита на вопросе
// «что вообще есть».

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { isSafeName, ROOT } from "./naming.mjs"

export const CONFIG_DIR = process.env.MEMORY_AGI_CONFIG_DIR ?? join(process.cwd(), "AGI-CONFIG")
export const CONFIG_FILE = join(CONFIG_DIR, "agi-config.json")
export const INDEX_FILE = join(CONFIG_DIR, "index.json")

/**
 * 🔒 СЛОВАРИ ЗАКРЫТЫЕ, И ЭТО ТА ЖЕ ПРИЧИНА, ПО КОТОРОЙ ЗАКРЫТ СПИСОК РОДОВ ФУНКЦИЙ У СОСЕДА:
 * закрытый список и есть граница. Открытый словарь через месяц содержит `string`, `str` и `текст`,
 * и ни одна проверка значения больше ничего не значит.
 */
export const VALUE_TYPES = ["text", "number", "money", "date", "geo", "flag", "list", "object"]

/**
 * Как признак накапливается.
 *
 * 🔒 `sum-able` — ЭТО `list`, КОТОРЫЙ ЕЩЁ И СКЛАДЫВАЕТСЯ, а не третий способ хранить. Плоский `list`
 * отвечает на вопрос «что было», `sum-able` — ещё и на «сколько всего», и складывает КОД, а не
 * пересказ модели. Без него кейс владельца («сколько я потратил сегодня» → 900) не выражается вовсе.
 */
export const AGGREGATES = ["last", "list", "sum-able"]

/**
 * О ком признак.
 *
 * 🔒 СЕГОДНЯ ЗНАЧЕНИЕ ОДНО, И ЭТО НЕ НЕДОДЕЛКА. Корень у памяти один — человек, которому она
 * принадлежит; второй корень заводится РЕШЕНИЕМ владельца (§3п паспорта чата), и тогда сюда
 * добавится его значение. Поле есть с первого дня, потому что оно едет наружу и в ключ строки.
 */
export const SUBJECTS = ["self"]

/**
 * Глубина от человека (§21.2 паспорта, решение владельца 2026-09-08).
 *
 * 🔒 В ТАБЛИЦУ МОГУТ ЛЕЧЬ ТОЛЬКО 0 И 1. Второй порядок — атрибуты чужой сущности — в таблицу не
 * идёт никогда; ему место в графе с якорем. Поэтому третьего значения у признака нет: признака
 * глубины 2 не бывает, бывает документ графа.
 */
export const DEPTHS = [0, 1]

/** Закрытый словарь меток. Метка не из списка — не «новая тема», а опечатка или синоним. */
export const TAGS = ["person", "relation", "place", "time", "money", "health", "work", "preference", "media", "system"]

/**
 * Что делать, когда признак во фразе подразумевается, а значения нет (205-1, перенято у реестра чата).
 *
 * 🔒 ЭТО ЧАСТЬ ЗАПИСИ, А НЕ ОШИБКА РАЗБОРА. Вопрос владельца, ради которого поле заведено: «пришло тебе какой-то
 * определённое название что ты будешь делать? Разве это не дыра?» Не объявив поведение заранее, память молча
 * теряет половину случаев.
 *   silent — промолчать: признак необязателен.
 *   ask    — сказать зовущему, что не хватает и почему (спрашивает человека зовущий, не память — паспорт §15.3).
 *   join   — поискать в связанных сообщениях.
 */
export const ON_MISSING = ["silent", "ask", "join"]

/**
 * От чего зависит истинность значения — охват (паспорт §15.3): календарь и место. Пустой охват значит «не
 * зависит», а не «везде»: признак без охвата — факт о человеке, а не о дне и месте.
 */
export const SCOPES = ["time", "place"]

/**
 * Имя рода — ИЗ КЛЮЧА, а не из поля записи.
 *
 * Ключ: `<область>.<фраза-через-дефис>`; род: та же фраза через подчёркивания. Тогда живой род
 * `city_where_he_lives_now` и ключ `person.city-where-he-lives-now` — одно и то же, и сопоставление
 * не требует ни таблицы соответствий, ни памяти автора.
 * 🔒 Возвращает пустую строку, если род не годится в SQL, — и это законный исход (`lib/naming.mjs`).
 */
export function kindOf(key) {
  const raw = String(key ?? "")
  const i = raw.indexOf(".")
  if (i <= 0) return ""
  const kind = raw.slice(i + 1).replace(/-/g, "_")
  return isSafeName(kind) ? kind : ""
}

/** Область ключа — для человека и для меток, к хранению отношения не имеет. */
export function areaOf(key) {
  const raw = String(key ?? "")
  const i = raw.indexOf(".")
  return i > 0 ? raw.slice(0, i) : ""
}

/** Имя таблицы, если род однажды вырастет в свою. Наружу не отдаётся никогда. */
export function tableOf(key) {
  const kind = kindOf(key)
  return kind ? `${ROOT}__${kind}` : ""
}

const KEY = /^[a-z][a-z0-9]*\.[a-z][a-z0-9-]*[a-z0-9]$/

/**
 * Что не так с реестром. Отдельной функцией, а не внутри скрипта: прибор зовёт её на заведомо
 * испорченных записях и доказывает, что сторож это ловит. Сторож, чей отказ никто не видел, зелен
 * по причине собственной слепоты.
 * @param {Array<Record<string, any>>} features
 * @returns {string[]}
 */
export function problemsOf(features) {
  const out = []
  const fail = (why) => out.push(why)
  if (!Array.isArray(features)) return ["реестр не список записей"]

  const keys = new Set()
  const kinds = new Set()
  for (const f of features) {
    const key = f?.key
    if (typeof key !== "string" || !KEY.test(key)) {
      fail(`ключ «${key}» не по форме <область>.<фраза-через-дефис>: из него не вывести имя рода`)
      continue
    }
    if (keys.has(key)) fail(`ключ «${key}» объявлен дважды: вторая запись молча скрывает первую`)
    keys.add(key)

    const kind = kindOf(key)
    if (!kind) fail(`ключ «${key}» даёт имя рода, негодное для SQL`)
    else if (kinds.has(kind)) fail(`род «${kind}» выводится из двух разных ключей — это одно место хранения на два смысла`)
    else kinds.add(kind)

    if ("storedIn" in (f ?? {})) {
      fail(`«${key}»: поле storedIn запрещено — наружу едет смысл признака, а не место хранения (закон первый)`)
    }
    if (typeof f.title !== "string" || f.title.trim().length < 4) fail(`«${key}»: нет названия для человека`)
    if (!VALUE_TYPES.includes(f.valueType)) fail(`«${key}»: тип значения «${f.valueType}» вне закрытого списка ${VALUE_TYPES.join(" · ")}`)
    if (!AGGREGATES.includes(f.aggregate)) fail(`«${key}»: накопление «${f.aggregate}» вне закрытого списка ${AGGREGATES.join(" · ")}`)
    if (!SUBJECTS.includes(f.subject)) fail(`«${key}»: субъект «${f.subject}» вне закрытого списка ${SUBJECTS.join(" · ")}`)
    if (!DEPTHS.includes(f.depth)) fail(`«${key}»: глубина «${f.depth}» не 0 и не 1 — второй порядок в таблицу не кладут (§21.2)`)

    // 🔒 ТРОЙКА `tags` · `triggers` · `answers` ОБЯЗАТЕЛЬНА У КАЖДОЙ ЗАПИСИ (закон 157-4 соседа).
    // По ней ищет машина; запись без них находит только тот, кто помнит ключ наизусть.
    for (const field of ["tags", "triggers", "answers"]) {
      const v = f[field]
      if (!Array.isArray(v) || v.length === 0 || v.some((x) => typeof x !== "string" || !x.trim())) {
        fail(`«${key}»: ${field} — непустой список строк, иначе признак не находится словами человека`)
      }
    }
    for (const t of Array.isArray(f.tags) ? f.tags : []) {
      if (!TAGS.includes(t)) fail(`«${key}»: метка «${t}» вне закрытого словаря ${TAGS.join(" · ")}`)
    }
    if (typeof f.howToFind !== "string" || f.howToFind.trim().length < 10) {
      fail(`«${key}»: howToFind — как это распознать во фразе; без него признак толкуют по названию`)
    }

    // ── 205-1: поля, отвечающие на «пришло название — что делаю». Необязательны: запись без них законна, но
    // если поле названо — оно обязано значить что-то из закрытого словаря.
    if ("onMissing" in f && !ON_MISSING.includes(f.onMissing)) {
      fail(`«${key}»: при отсутствии значения «${f.onMissing}» вне закрытого списка ${ON_MISSING.join(" · ")}`)
    }
    if ("askOrder" in f) {
      if (!Number.isInteger(f.askOrder) || f.askOrder < 1) fail(`«${key}»: порядок вопроса — целое число от 1`)
      if (f.onMissing !== "ask") fail(`«${key}»: порядок вопроса без «ask» ничего не значит — спрашивать не о чем`)
    }
    for (const field of ["example", "lost"]) {
      if (field in f && (typeof f[field] !== "string" || !f[field].trim())) fail(`«${key}»: ${field} — непустая строка`)
    }
    if ("scope" in f && (!Array.isArray(f.scope) || f.scope.length === 0 || f.scope.some((s) => !SCOPES.includes(s)))) {
      fail(`«${key}»: охват — непустой список из ${SCOPES.join(" · ")}`)
    }
    if ("requires" in f && (!Array.isArray(f.requires) || f.requires.some((k) => typeof k !== "string" || !KEY.test(k)))) {
      fail(`«${key}»: requires — список ключей признаков памяти`)
    }
    if ("retired" in f && (typeof f.retired !== "string" || f.retired.trim().length < 10)) {
      fail(`«${key}»: retired — причина снятия словами (что использовать вместо), а не отметка`)
    }
    if ("skills" in f) {
      const s = f.skills
      const have = s?.have
      const okHave = have === undefined || (Array.isArray(have) && have.length > 0 && have.every((x) => typeof x === "string" && x.trim()))
      const okPlan = s?.plan === undefined || (typeof s.plan === "string" && s.plan.trim())
      if (!s || typeof s !== "object" || !okHave || !okPlan || (have === undefined && s.plan === undefined)) {
        fail(`«${key}»: skills — { have: [имена навыков] } и/или { plan: "навык, который будет создан" }`)
      }
    }
  }

  // 🔒 ЗАВИСИМОСТЬ ПРОВЕРЯЕТСЯ ПОСЛЕ ПРОХОДА: признак вправе ссылаться на тот, что объявлен ниже.
  for (const f of features) {
    for (const k of Array.isArray(f?.requires) ? f.requires : []) {
      if (typeof k === "string" && !keys.has(k)) fail(`«${f.key}»: требует признак «${k}», которого в реестре нет`)
    }
  }
  return out
}

/**
 * Названные в записи навыки существуют (205-1). Отдельно от `problemsOf`: той функции нужен только реестр, а
 * этой — список папок навыков, который знает сторож на диске.
 * 🔒 Навык, названный и отсутствующий, — обещание без исполнителя: метка на главной была бы зелёной на пустоте.
 * @param {Array<Record<string, any>>} features
 * @param {string[]} skillNames
 */
export function skillProblemsOf(features, skillNames) {
  const known = new Set(skillNames)
  const out = []
  for (const f of Array.isArray(features) ? features : []) {
    for (const name of Array.isArray(f?.skills?.have) ? f.skills.have : []) {
      if (!known.has(name)) out.push(`«${f.key}»: навык «${name}» назван, но папки .claude/skills/${name} нет`)
    }
  }
  return out
}

/** Прочитать реестр с диска. Разбор отдельно от проверки: испорченный JSON — тоже отказ, но свой. */
export function readFeatures() {
  const raw = readFileSync(CONFIG_FILE, "utf8")
  const parsed = JSON.parse(raw)
  const features = parsed?.features
  if (!Array.isArray(features)) throw new Error("в agi-config.json нет списка features")
  return features
}

/**
 * Действующие признаки — без снятых (205-2).
 *
 * 🔒 СНЯТЫЙ ПРИЗНАК ОСТАЁТСЯ В РЕЕСТРЕ, А НЕ УДАЛЯЕТСЯ: под ним лежат живые значения, и зовущий, пришедший с его
 * ключом, должен услышать причину и замену, а не «такого нет». Но кандидатом разбора и родом подсказки записи он
 * не бывает — иначе модель продолжит класть в него новые значения.
 */
export function activeFeatures() {
  return readFeatures().filter((f) => !f.retired)
}

/**
 * Указатель: ключ · название · одна фраза «что это».
 *
 * 🔒 ПОРОЖДАЕТСЯ, А НЕ ПИШЕТСЯ РУКАМИ. Рукописный список расходится с кодом молча — в этом проекте
 * оплачено четырежды за три дня. Свежесть стережёт `check-features.mjs` в сборке.
 */
export function indexOf(features) {
  return {
    generated_from: "AGI-CONFIG/agi-config.json",
    count: features.length,
    features: features.map((f) => ({
      key: f.key,
      title: f.title,
      valueType: f.valueType,
      aggregate: f.aggregate,
    })),
  }
}

/**
 * Что уезжает наружу по одной записи.
 *
 * 🛑 ИМЕНИ РОДА И ТАБЛИЦЫ ЗДЕСЬ НЕТ И НЕ БУДЕТ. Оно выводится из ключа внутри памяти; отданное
 * наружу, оно превратило бы каталог смыслов в карту хранилища — и зовущий начал бы решать за
 * память, где искать (закон `BLACKBOX-API` §2).
 */
export function publicFeature(f) {
  return {
    key: f.key,
    title: f.title,
    valueType: f.valueType,
    aggregate: f.aggregate,
    subject: f.subject,
    depth: f.depth,
    tags: f.tags,
    triggers: f.triggers,
    answers: f.answers,
    howToFind: f.howToFind,
    // 205-1: что память делает с этим названием. Отсутствующее поле не отдаётся — пустое значение читалось бы как «проверено, нет».
    ...Object.fromEntries(
      ["onMissing", "askOrder", "example", "lost", "scope", "requires", "skills", "retired"]
        .filter((k) => f[k] !== undefined)
        .map((k) => [k, f[k]]),
    ),
  }
}

/** Каталог целиком — для `GET /v1/features`. */
export function listFeatures() {
  const features = readFeatures()
  return {
    ok: true,
    count: features.length,
    active: features.filter((f) => !f.retired).length,
    retired: features.filter((f) => f.retired).length,
    value_types: VALUE_TYPES,
    aggregates: AGGREGATES,
    features: features.map(publicFeature),
    what_this_is:
      "Признак — то, что имеет в виду зовущий, когда добавляет или извлекает сведения. " +
      "Присылать признаки необязательно: без них память делает ту же работу сама, дольше. " +
      "Где признак хранится, память не рассказывает и в вопросе имя хранилища не принимает.",
  }
}

/** Одна запись по ключу — для `GET /v1/features/{key}`. */
export function featureByKey(key) {
  const f = readFeatures().find((x) => x.key === key)
  if (!f) return { ok: false, error: "unknown-feature", hint: "такого признака в реестре нет: список — GET /v1/features" }
  return { ok: true, feature: publicFeature(f) }
}
