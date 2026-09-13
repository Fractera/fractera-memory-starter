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

export const TEST_TABS = ["upload", "search", "verdict"] as const;

export type TestTab = (typeof TEST_TABS)[number];

/** Разделы, у которых есть эти три страницы. */
// 🔒 ТРИ СТЕНДА С 192-3: объектное хранилище встало той же формой, а не своей.
export const TEST_SECTIONS = ["graph-test", "vector-test", "object-test"] as const;

export type TestSection = (typeof TEST_SECTIONS)[number];

export function isTestSection(v: unknown): v is TestSection {
  return typeof v === "string" && (TEST_SECTIONS as readonly string[]).includes(v);
}

/**
 * Какая страница стенда открыта.
 *
 * 🔒 НЕИЗВЕСТНОЕ ЗНАЧЕНИЕ ПАДАЕТ НА ПЕРВУЮ СТРАНИЦУ, А НЕ НА ПУСТОЙ ЭКРАН — тот
 * же закон, что у разделов: адрес приходит из строки браузера, то есть от кого
 * угодно, и «нет такой вкладки» человек читает как поломку проекта.
 */
export function resolveTestTab(raw: string | undefined): TestTab {
  return typeof raw === "string" && (TEST_TABS as readonly string[]).includes(raw)
    ? (raw as TestTab)
    : "upload";
}

/** Адрес страницы стенда. */
export function hrefOfTestTab(lang: string, section: TestSection, tab: TestTab): string {
  return `/${lang}/settings?section=${section}&tab=${tab}`;
}
