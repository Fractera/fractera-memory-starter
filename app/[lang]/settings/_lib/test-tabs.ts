// ТРИ СТРАНИЦЫ ВНУТРИ КАЖДОГО СТЕНДА — ЧИСТЫЕ ДАННЫЕ, БЕЗ ЗАВИСИМОСТЕЙ (189-1).
//
// 🎯 ПОРЯДОК НАЗВАН ВЛАДЕЛЬЦЕМ ДОСЛОВНО 2026-09-12: «пользователь мог загрузить
// свои данные нажать преобразовать и сохранить хранилище затем найти и заранее
// сохранённого затем получить оценку того что найдено». Загрузка → поиск →
// оценка: это последовательность работы человека, а не рубрикатор.
//
// 🔒 ФАЙЛ БЕЗ ИМПОРТОВ ПО ТОЙ ЖЕ ПРИЧИНЕ, ЧТО И `memory-sections.ts`: список
// нужен серверной странице и полосе вкладок сразу. Живи он внутри клиентского
// островка, Next заменил бы экспорт клиентской ссылкой, и на сервере он перестал
// бы быть массивом — страница отдала бы белый экран, видимый только в логе.
//
// 🔒 ОДИН СПИСОК НА ОБА СТЕНДА, А НЕ ДВА ОДИНАКОВЫХ. Требование владельца о
// вектором стенде — «одной формой, а не второй конструкцией»: две копии
// разошлись бы, и отстала бы та, которой пользуются реже.

// 🪦 ВКЛАДКИ «ОЦЕНКА» БОЛЬШЕ НЕТ (206-5, слово владельца 2026-09-16 «remove old tests»). Она
// показывала корпус прежних прогонов с вердиктами человека; корпус и его таблица сняты целиком.
// Прежний порядок владельца — загрузка → поиск → оценка (2026-09-12) — сохранён в замысле службы.
export const TEST_TABS = ["upload", "search"] as const;

export type TestTab = (typeof TEST_TABS)[number];

/**
 * Четвёртая страница — только у стенда объектов (194-6).
 *
 * 🎯 СЛОВО ВЛАДЕЛЬЦА 2026-09-13: «текст навыка на английском языке положи в эту же вкладку: есть кнопка
 * загрузка, есть кнопка поиск, есть кнопка оценка, а дальше сделать кнопка навык».
 * 🪦 «ОБЩИЕ ТРИ НЕ ТРОНУТЫ: у графа и вектора навыка этой вкладки нет» — СНЯТО 2026-09-13 (194-19) словом
 * владельца «Да, делай вкладки навыков»: у графа и вектора навыки есть (`use-knowledge-graph`, `use-vector-store`),
 * и вкладка теперь у каждого стенда. Какие именно — `stand-skills.ts`.
 */
export type StandTab = TestTab | "skill" | "bench";

/** Разделы, у которых есть эти три страницы. */
// 🔒 ТРИ СТЕНДА С 192-3: объектное хранилище встало той же формой, а не своей.
// 🔒 ЧЕТЫРЕ С 195-1: стенд ссылок той же формой — слово владельца «такая же стандартная вкладка как и для агент раг».
export const TEST_SECTIONS = ["graph-test", "vector-test", "object-test", "link-test"] as const;

export type TestSection = (typeof TEST_SECTIONS)[number];

export function isTestSection(v: unknown): v is TestSection {
  return typeof v === "string" && (TEST_SECTIONS as readonly string[]).includes(v);
}

/** Страницы стенда по порядку. */
/**
 * Разделы со строкой вкладок (194-19): три стенда хранилищ и тест памяти.
 *
 * 🔒 ТЕСТ ПАМЯТИ — НЕ `TestSection`, И ЭТО НАМЕРЕННО: у него нет страниц «загрузка · поиск · оценка», его стенд —
 * один экран. Поэтому он получает свои две вкладки — «Тест» и «Навык», — а блок трёх страниц его не касается.
 */
export const STAND_SECTIONS = [...TEST_SECTIONS, "memory-test"] as const;
export type StandSection = (typeof STAND_SECTIONS)[number];

export function isStandSection(v: unknown): v is StandSection {
  return typeof v === "string" && (STAND_SECTIONS as readonly string[]).includes(v);
}

export function tabsOf(section: StandSection): readonly StandTab[] {
  return section === "memory-test" ? ["bench", "skill"] : [...TEST_TABS, "skill"];
}

/**
 * Какая страница стенда открыта.
 *
 * 🔒 НЕИЗВЕСТНОЕ ЗНАЧЕНИЕ ПАДАЕТ НА ПЕРВУЮ СТРАНИЦУ, А НЕ НА ПУСТОЙ ЭКРАН — тот
 * же закон, что у разделов: адрес приходит из строки браузера, то есть от кого
 * угодно, и «нет такой вкладки» человек читает как поломку проекта.
 * 🔒 `?tab=skill` У СТЕНДА БЕЗ ЭТОЙ СТРАНИЦЫ — ТОЖЕ НЕИЗВЕСТНОЕ ЗНАЧЕНИЕ.
 */
export function resolveTestTab(raw: string | undefined, section?: StandSection): StandTab {
  const allowed: readonly string[] = section ? tabsOf(section) : TEST_TABS;
  if (typeof raw === "string" && allowed.includes(raw)) return raw as StandTab;
  return section === "memory-test" ? "bench" : "upload";
}

/** Адрес страницы стенда. */
export function hrefOfTestTab(lang: string, section: StandSection, tab: StandTab): string {
  return `/${lang}/settings?section=${section}&tab=${tab}`;
}
