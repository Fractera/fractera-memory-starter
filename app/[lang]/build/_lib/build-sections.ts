// РАЗДЕЛЫ МАСТЕРСКОЙ РАЗРАБОТКИ — ЕДИНСТВЕННЫЙ ИСТОЧНИК ИХ ПОРЯДКА (шаг 202-1).
//
// 🎯 ПОРЯДОК НАЗВАН ВЛАДЕЛЬЦЕМ 2026-09-15: «первую верхнюю у нас терминал, вторая кнопка … добавить задание»,
// затем текущие шаги, шаги разработки, «пред Последняя вкладка снизу это навыки разработки», «последнее …
// это главная инструкция».
//
// 🔒 ПОДРАЗДЕЛЫ ШАГОВ — ОТДЕЛЬНЫЕ ЗНАЧЕНИЯ, А НЕ ПАРАМЕТР: так адрес `?section=steps-done` сам говорит, какой
// список раскрыт в меню, и второй правды о раскрытии не появляется.

export const BUILD_SECTIONS = [
  // 🎯 220: ПЕРВОЙ КНОПКОЙ — ВХОД В ПОДПИСКУ (решение владельца 2026-09-17): «первая кнопка — вход в
  // подписку… чтобы пользователь мог в любом решении запустить свой Claude Code; это дублирующие шаги».
  // 🔒 СПОСОБНОСТЬ ПЕРЕНОСИТСЯ, А НЕ КОПИРУЕТСЯ: раздел рисует тот же `TerminalPanel`, что и страница
  // «Подписка Claude». Копия файла разошлась бы с оригиналом на первой правке, и чинить пришлось бы
  // дважды — а тот, кем пользуются реже, отстал бы молча.
  "subscription",
  "terminal",
  // 🎯 221: КАНАЛ УПРАВЛЕНИЯ — ПОД ТЕРМИНАЛОМ (слово владельца 2026-09-17: «в левом меню под кнопкой
  // терминал добавить кнопку канала управления»). Прецедент: у каждого микросервиса свой строитель и
  // свой чат по умолчанию — поэтому раздел зовётся по РОЛИ, а не по имени службы.
  "channel",
  "task",
  // 218-20: сигналы от людей — звено 4 цепочки эволюции. Стоит сразу за заданиями, потому что это
  // ТОТ ЖЕ вопрос «что просят сделать», только пришедший не от владельца, а от тех, кто пользуется.
  "signals",
  "current",
  "steps",
  "steps-new",
  "steps-done",
  "skills",
  "instruction",
] as const

export type BuildSection = (typeof BUILD_SECTIONS)[number]

/** Разделы верхнего уровня меню — в порядке владельца. Подразделы шагов раскрываются под «Шагами разработки». */
export const BUILD_TOP: BuildSection[] = ["subscription", "terminal", "channel", "task", "signals", "current", "steps", "skills", "instruction"]

export function isBuildSection(v: unknown): v is BuildSection {
  return typeof v === "string" && (BUILD_SECTIONS as readonly string[]).includes(v)
}

/**
 * Открытый раздел.
 * 🔒 НЕИЗВЕСТНОЕ ЗНАЧЕНИЕ ПАДАЕТ НА ТЕРМИНАЛ, А НЕ НА ПУСТУЮ КОЛОНКУ: адрес пишет кто угодно, и «нет такого
 * раздела» человек прочтёт как поломку.
 */
export function resolveBuildSection(raw: string | undefined): BuildSection {
  return isBuildSection(raw) ? raw : "terminal"
}

/** Раскрыт ли список шагов под «Шагами разработки». */
export const inSteps = (s: BuildSection) => s === "steps" || s === "steps-new" || s === "steps-done"

/**
 * Где в проекте лежит то, что показывает раздел (202-8).
 *
 * 🎯 СЛОВО ВЛАДЕЛЬЦА 2026-09-15: «каждому элемента кроме терминал на вкладке показать расположение в проекте этого файла … Задача показать
 * как в проекте устроен архитектуру и расположение файлов».
 * 🔒 ТЕРМИНАЛА ЗДЕСЬ НЕТ ПО ЭТОМУ ЖЕ СЛОВУ: он не читает файл, он работает в папке целиком.
 * 🔒 ПУТИ ОТ КОРНЯ СЛУЖБЫ И ТЕ ЖЕ, ЧТО ЧИТАЕТ `lib/build-docs.mjs` / `lib/build-tasks.mjs`: разойдись они — страница показала бы один адрес,
 * а читала другой. Прибор сверяет, что каждый путь существует на диске.
 */
export const BUILD_PATHS: Partial<Record<BuildSection, string[]>> = {
  task: ["development-docs/development-steps/pre-steps/", "development-docs/development-steps/pre-steps/README.md"],
  // 🔒 У СИГНАЛОВ АДРЕС НЕ ФАЙЛ, А МЕХАНИЗМ: они живут строками в единственной таблице памяти и
  // считаются кодом. Показать здесь путь к файлу значило бы соврать о том, где их искать.
  // Вход в подписку живёт в общей странице «Подписка Claude» — здесь та же способность, тот же код.
  subscription: ["app/[lang]/terminal/_components/terminal-panel.client.tsx"],
  // У канала адрес не документ, а его собственный код: имя службы туда не попадает намеренно.
  channel: ["lib/channel/telegram.mjs", "scripts/agent/channel.sh"],
  signals: ["lib/signals.mjs", "lib/feedback-vector.mjs"],
  current: ["development-docs/development-steps/current-steps.md"],
  steps: ["development-docs/development-steps/"],
  "steps-new": ["development-docs/development-steps/new-steps/"],
  "steps-done": ["development-docs/development-steps/completed-steps/"],
  skills: [".claude/skills/"],
  instruction: ["CLAUDE.md"],
}

export function hrefOfBuild(lang: string, section: BuildSection, doc?: string): string {
  const base = `/${lang}/build?section=${section}`
  return doc ? `${base}&doc=${encodeURIComponent(doc)}` : base
}
