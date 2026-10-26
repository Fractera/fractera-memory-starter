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
// 🔒 ОБА ИСТОЧНИКА СЕГОДНЯ — ЗАГЛУШКИ, И ЭТО СКАЗАНО В МАШИННОЙ ЧАСТИ (`stub: true`) И В ХОДЕ МЫСЛЕЙ.
// Их место в цепочке настоящее: когда появится маркетплейс или реестр навыков, меняется тело одной
// функции, а не порядок и не ответ человеку.
// 🔒 ПАМЯТЬ ПРЕДЛАГАЕТ, А НЕ СОЗДАЁТ. Новый микросервис — решение человека (закон «блок не растёт
// вбок»: чужую работу память не впитывает, она называет, кому её отдать).

/**
 * Глобальный LightRAG маркетплейса Fractera — заглушка.
 * @returns {Promise<{where: string, found: object[], stub: boolean}>}
 */
export async function searchMarketplace(request) {
  void request
  return { found: [], stub: true, where: "marketplace" }
}

/**
 * Глобальный реестр навыков — заглушка.
 * @returns {Promise<{where: string, found: object[], stub: boolean}>}
 */
export async function searchSkillsRegistry(request) {
  void request
  return { found: [], stub: true, where: "skills-registry" }
}

/**
 * Цепочка поиска решения для одной просьбы.
 *
 * @param {string} request — просьба словами человека
 * @returns {Promise<{request: string, searched: object[], solution: object|null, skill: object|null, proposal: string|null}>}
 */
export async function findSolution(request) {
  const searched = []
  const market = await searchMarketplace(request)
  searched.push({ found: market.found.length, stub: market.stub, where: market.where })
  if (market.found.length) return { proposal: "install-solution", request, searched, skill: null, solution: market.found[0] }

  const skills = await searchSkillsRegistry(request)
  searched.push({ found: skills.found.length, stub: skills.stub, where: skills.where })
  if (skills.found.length) return { proposal: "build-with-skill", request, searched, skill: skills.found[0], solution: null }

  return { proposal: "create-microservice", request, searched, skill: null, solution: null }
}

/** Словами человека — ровно то, что сказал владелец, «не больше, не меньше». */
export function solutionWords(results, lang) {
  const ru = lang !== "en"
  return (results ?? [])
    .map((r) => {
      if (r.proposal !== "create-microservice") return ""
      return ru
        ? `Просьба «${r.request}» — не мои полномочия, и среди служб этого сервера её не решает ни одна. ` +
            `Я поискал готовое решение на маркетплейсе Fractera — не нашлось. Поискал навык, которым такое решение можно создать, ` +
            `в глобальном реестре навыков — не нашлось. Если хотите, приступим к созданию нового микросервиса, который будет решать эту задачу.`
        : `The request «${r.request}» is not mine to do, and no service of this server handles it. ` +
            `I looked for a ready solution on the Fractera marketplace — none found. I looked for a skill to build one in the global ` +
            `skills registry — none found. If you want, we can start building a new microservice that solves this.`
    })
    .filter(Boolean)
    .join("\n")
}
