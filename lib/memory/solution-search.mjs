// НАЙТИ РЕШЕНИЕ ДЛЯ ПРОСЬБЫ, КОТОРУЮ НЕ РЕШАЕТ НИ ОДНА СЛУЖБА СЕРВЕРА (218-13).
//
// 🎯 СЛОВО ВЛАДЕЛЬЦА 2026-09-16: «что если вопрос выходит за границы того, что можно найти по нашему
// реестру сервисов? Например: я хочу видеть аналитику по своим конкурентам. В реестре сервисов такого
// продукта нет, память это не обрабатывает — мы должны вызвать навык (его сейчас нет, но пусть по
// дефолту возвращает ответ): посмотреть, что есть на маркетплейсе Fractera — запрос к глобальному
// LightRAG (заглушка: ничего не найдено); затем, если ничего не найдено, запрос к глобальному реестру
// навыков (заглушка: нет ничего, что поможет решить задачу); и в итоге ответ: не получилось обнаружить
// готовое решение и не получилось обнаружить навык для создания этого решения; если хочешь — мы
// приступим к созданию нового микросервиса, который будет решать твою задачу. Не больше не меньше, но
// это должно работать уже сейчас».
//
// 🔒 ПОРЯДОК ДВУХ ПОИСКОВ — ЗАКОН, А НЕ ВКУС: сначала ГОТОВОЕ решение (дешевле поставить, чем создать),
// потом НАВЫК, которым решение создаётся. Второй поиск идёт только если первый ничего не нашёл.
// 🔒 МАРКЕТПЛЕЙС СЕГОДНЯ — ЗАГЛУШКА, И ЭТО СКАЗАНО В МАШИННОЙ ЧАСТИ (`stub: true`) И В ХОДЕ МЫСЛЕЙ.
// Его место в цепочке настоящее: когда он появится, меняется тело одной функции, а не порядок и не ответ человеку.
// 🔒 РЕЕСТР НАВЫКОВ — НАСТОЯЩИЙ С ШАГА УЗЛА 598-3: база навыков других проектов, которая приходит с каждым клоном узла и лежит в
// ОБЩЕМ графе узла (метки `skill:<источник>:<навык>`). Память его только читает — факты человека живут в своём пространстве `memory`.
// Порог близости — родной порог LightRAG, тот же, что у `skills_find` ядра (0,5, замерено на 21 вопросе, шаг 598-2): без него граф
// всегда отдаёт ближайшее, и «не нашлось» не наступает никогда. Ищет по английским словам просьбы (`terms`, `themes` — их даёт тот же
// разбор фразы, без отдельного вызова модели); их нет — по смыслу самой просьбы (`naive`), и тогда русская просьба находит меньше.
// 🔒 ПАМЯТЬ ПРЕДЛАГАЕТ, А НЕ СОЗДАЁТ. Новый микросервис — решение человека (закон «блок не растёт
// вбок»: чужую работу память не впитывает, она называет, кому её отдать).
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { graphCall, NODE_DIR } from "./node.mjs"

const THRESHOLD = 0.5
const MAX_SKILLS = 3

/**
 * Глобальный LightRAG маркетплейса Fractera — заглушка.
 * @returns {Promise<{where: string, found: object[], stub: boolean}>}
 */
export async function searchMarketplace(request) {
  void request
  return { found: [], stub: true, where: "marketplace" }
}

// Лицензия навыка: манифест базы ядра (тот LICENSE, который узел раздаёт), затем сущность навыка в графе («Licence: MIT.»).
function baseLicences() {
  if (!NODE_DIR) return new Map()
  try {
    const m = JSON.parse(readFileSync(join(NODE_DIR, "lib", "agent-kit", "skills", "base", "manifest.json"), "utf8"))
    return new Map((m.skills ?? []).map((s) => [`skill:${s.source}:${s.skill}`, s.license]))
  } catch {
    return new Map()
  }
}

const englishWords = (v) => (Array.isArray(v) ? v : []).map((w) => String(w ?? "").trim()).filter(Boolean).slice(0, 8)

/**
 * Реестр навыков — база навыков узла в общем графе (598-3).
 *
 * @param {string} request — просьба словами человека
 * @param {{terms?: string[], themes?: string[]}} hints — английские слова просьбы из разбора фразы
 * @returns {Promise<{where: string, found: {skill: string, source: string, licence: string|null, sections: string[]}[], stub: boolean, error?: string}>}
 */
export async function searchSkillsRegistry(request, hints = {}) {
  const terms = englishWords(hints.terms)
  const themes = englishWords(hints.themes)
  const keyed = terms.length > 0 || themes.length > 0
  const r = await graphCall("graph-query", {
    query: String(request ?? "").slice(0, 500),
    mode: keyed ? "mix" : "naive",
    ...(keyed ? { hl_keywords: themes, ll_keywords: terms } : {}),
    top_k: 20,
    chunk_top_k: 8,
    threshold: THRESHOLD,
  }, 60000, { space: null })
  if (!r.ok) return { found: [], stub: false, where: "skills-registry", error: r.error }
  const licences = baseLicences()
  for (const e of r.body.entities ?? []) {
    const mark = String(e?.file_path ?? "")
    if (!mark.startsWith("skill:") || e.entity_type !== "skill" || licences.has(mark)) continue
    const licence = String(e.description ?? "").match(/Licence: (\S+?)\.?(?:\s|$)/)?.[1]
    if (licence) licences.set(mark, licence)
  }
  const bySkill = new Map()
  for (const c of r.body.chunks ?? []) {
    const mark = String(c?.file_path ?? "")
    if (!mark.startsWith("skill:")) continue
    if (!bySkill.has(mark) && bySkill.size >= MAX_SKILLS) continue
    const [, source, skill] = mark.split(":")
    if (!bySkill.has(mark)) bySkill.set(mark, { skill, source, licence: licences.get(mark) ?? null, sections: [] })
    const head = String(c.content ?? "").split("\n")[0].replace(`${skill} — `, "").trim().slice(0, 80)
    const s = bySkill.get(mark)
    if (head && s.sections.length < 3 && !s.sections.includes(head)) s.sections.push(head)
  }
  return { found: [...bySkill.values()], stub: false, where: "skills-registry" }
}

/**
 * Цепочка поиска решения для одной просьбы.
 *
 * @param {string} request — просьба словами человека
 * @param {{terms?: string[], themes?: string[]}} [hints] — её английские слова для поиска навыка
 * @returns {Promise<{request: string, searched: object[], solution: object|null, skill: object|null, skills?: object[], proposal: string|null}>}
 */
export async function findSolution(request, hints = {}) {
  const searched = []
  const market = await searchMarketplace(request)
  searched.push({ found: market.found.length, stub: market.stub, where: market.where })
  if (market.found.length) return { proposal: "install-solution", request, searched, skill: null, solution: market.found[0] }

  const skills = await searchSkillsRegistry(request, hints)
  searched.push({ found: skills.found.length, stub: skills.stub, where: skills.where, ...(skills.error ? { error: skills.error } : {}) })
  if (skills.found.length) return { proposal: "build-with-skill", request, searched, skill: skills.found[0], skills: skills.found, solution: null }

  return { proposal: "create-microservice", request, searched, skill: null, solution: null }
}

const skillLine = (s, ru) =>
  `${ru ? "навык" : "the skill"} ${s.skill} ${ru ? "проекта" : "of"} ${s.source}${s.licence ? ` (${ru ? "лицензия" : "licence"} ${s.licence})` : ""}` +
  `${s.sections?.length ? ` — ${s.sections.join(", ")}` : ""}`

/** Словами человека — ровно то, что сказал владелец, «не больше, не меньше». */
export function solutionWords(results, lang) {
  const ru = lang !== "en"
  return (results ?? [])
    .map((r) => {
      if (r.proposal === "build-with-skill") {
        const list = (r.skills ?? [r.skill]).filter(Boolean).map((s) => skillLine(s, ru)).join("; ")
        return ru
          ? `Просьба «${r.request}» — не мои полномочия, и среди служб этого сервера её не решает ни одна. ` +
              `Готового решения на маркетплейсе Fractera не нашлось, но в базе навыков узла есть опыт других проектов: ${list}. ` +
              `Если хотите, приступим к созданию нового микросервиса на этом опыте.`
          : `The request «${r.request}» is not mine to do, and no service of this server handles it. ` +
              `No ready solution on the Fractera marketplace, but the node's skills base holds the experience of other projects: ${list}. ` +
              `If you want, we can start building a new microservice on that experience.`
      }
      if (r.proposal !== "create-microservice") return ""
      // A graph that did not answer is not «nothing found»: the words say that the base could not be asked.
      const failed = (r.searched ?? []).some((s) => s.where === "skills-registry" && s.error)
      const skillRu = failed
        ? "Навык, которым такое решение можно создать, поискать не удалось: граф узла не ответил."
        : "Поискал навык, которым такое решение можно создать, в базе навыков узла — не нашлось."
      const skillEn = failed
        ? "I could not look for a skill to build one: the node's graph did not answer."
        : "I looked for a skill to build one in the node's skills base — none found."
      return ru
        ? `Просьба «${r.request}» — не мои полномочия, и среди служб этого сервера её не решает ни одна. ` +
            `Я поискал готовое решение на маркетплейсе Fractera — не нашлось. ${skillRu} ` +
            `Если хотите, приступим к созданию нового микросервиса, который будет решать эту задачу.`
        : `The request «${r.request}» is not mine to do, and no service of this server handles it. ` +
            `I looked for a ready solution on the Fractera marketplace — none found. ${skillEn} ` +
            `If you want, we can start building a new microservice that solves this.`
    })
    .filter(Boolean)
    .join("\n")
}
