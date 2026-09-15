// РАЗДЕЛЫ МАСТЕРСКОЙ РАЗРАБОТКИ — ЕДИНСТВЕННЫЙ ИСТОЧНИК ИХ ПОРЯДКА (шаг 202-1).
//
// 🎯 ПОРЯДОК НАЗВАН ВЛАДЕЛЬЦЕМ 2026-09-15: «первую верхнюю у нас терминал, вторая кнопка … добавить задание»,
// затем текущие шаги, шаги разработки, «пред Последняя вкладка снизу это навыки разработки», «последнее …
// это главная инструкция».
//
// 🔒 ПОДРАЗДЕЛЫ ШАГОВ — ОТДЕЛЬНЫЕ ЗНАЧЕНИЯ, А НЕ ПАРАМЕТР: так адрес `?section=steps-done` сам говорит, какой
// список раскрыт в меню, и второй правды о раскрытии не появляется.

export const BUILD_SECTIONS = [
  "terminal",
  "task",
  "current",
  "steps",
  "steps-new",
  "steps-done",
  "skills",
  "instruction",
] as const

export type BuildSection = (typeof BUILD_SECTIONS)[number]

/** Разделы верхнего уровня меню — в порядке владельца. Подразделы шагов раскрываются под «Шагами разработки». */
export const BUILD_TOP: BuildSection[] = ["terminal", "task", "current", "steps", "skills", "instruction"]

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

export function hrefOfBuild(lang: string, section: BuildSection, doc?: string): string {
  const base = `/${lang}/build?section=${section}`
  return doc ? `${base}&doc=${encodeURIComponent(doc)}` : base
}
