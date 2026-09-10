// СЛОВА СТРАНИЦЫ ПАМЯТИ (178-2).
//
// 🪦 СКОПИРОВАН СО СЛУЖБЫ ЧАТА (`telegram.i18n.ts`) И УРЕЗАН. Тексты стенда
// перенесены ДОСЛОВНО — они уже проверены на живом экране; убрано всё, что
// принадлежит боту, а не памяти.
//
// 🔒 СЛОВАРЬ СВОЙ, А НЕ ОБЩИЙ С ЧАТОМ, И ЭТО ЗАКОН 137: у службы свои файлы в
// своём дереве. Общий словарь сделал бы память зависимой от дерева чужой
// службы — сотри владелец чат, и у памяти пропали бы подписи.
//
// 🔒 ДВА ЯЗЫКА, `en` И `ru`. Остальные приезжают файлом от внешней модели, как
// везде в проекте; это служебный экран архитектора, а не витрина.

import type { MemorySection } from "../_lib/memory-sections";

export type MemoryUi = {
  title: string;
  subtitle: string;
  layer: string;
  menuTitle: string;
  menuWord: string;
  pages: Record<MemorySection, { title: string; hint: string }>;
  memoryTest: {
    lead: string;
    say: string;
    ask: string;
    raw: string;
    sayHint: string;
    askHint: string;
    rawHint: string;
    rawMethod: string;
    rawBody: string;
    send: string;
    sending: string;
    inputTitle: string;
    answerTitle: string;
    nothingYet: string;
    nothingSent: string;
    /** Что лента живёт только в браузере — сказано, а не умолчано. */
    volatile: string;
    failed: string;
    took: string;
    status: string;
  };
  memoryTables: {
    title: string;
    lead: string;
    refresh: string;
    loading: string;
    empty: string;
    down: string;
    rows: string;
    columns: string;
    noRows: string;
    shown: string;
  };
  journal: {
    entries: string;
    bytes: string;
    clear: string;
    clearing: string;
    cleared: string;
    empty: string;
    down: string;
    shared: string;
    refresh: string;
  };
};

const EN: MemoryUi = {
  journal: {
    bytes: "bytes",
    clear: "Clear history — erases for good",
    cleared: "Entries erased: {n}. Knowledge about people is untouched.",
    clearing: "erasing…",
    down: "The memory service did not answer",
    empty:
      "The journal is empty: memory has done nothing since the last clearing. This is not a failure — entries appear as soon as memory is asked for something.",
    entries: "entries",
    refresh: "Refresh",
    shared:
      "The development agent reads this very document — as a file on disk. Clearing erases it for both at once: there is no second source.",
  },
  layer: "Memory service",
  memoryTables: {
    columns: "columns",
    down: "The memory service did not answer",
    empty:
      "Memory has not built a single table yet. Say something to it above — the tables appear on their own, and nobody declares them in advance.",
    lead: "Everything memory built out of what it was told. Tables and columns are created by memory itself, at the moment it needs them.",
    loading: "reading…",
    noRows: "the table exists, no rows in it yet",
    refresh: "Refresh",
    rows: "rows",
    shown: "shown",
    title: "What memory built",
  },
  memoryTest: {
    answerTitle: "Memory's answer",
    ask: "Ask",
    askHint: "The phrase goes to recall. Empty field means everything memory knows.",
    failed: "The bench could not reach the door",
    inputTitle: "What we send",
    lead: "Phrases go straight to the memory service — this page runs on the service itself, so there is nothing in between at all.",
    nothingSent: "Nothing sent yet.",
    nothingYet: "Memory has not answered yet — send a phrase on the left.",
    raw: "Raw call",
    rawBody: "Request body, JSON",
    rawHint:
      "Any method of the contract, body as JSON. A method that is not built answers 501 — and the bench shows that too.",
    rawMethod: "Method name",
    say: "Say",
    sayHint: "The phrase goes to remember — the same way a person tells the bot something.",
    send: "Send",
    sending: "sending…",
    status: "status",
    took: "took",
    volatile: "The list lives in this browser tab and disappears on reload.",
  },
  menuTitle: "Memory",
  menuWord: "Menu",
  pages: {
    journal: {
      hint: "What memory did: its own account of its work. The same document is read by the development agent, as a file.",
      title: "Journal",
    },
    "memory-test": {
      hint: "Send a phrase straight to memory and see its answer — no agent in the chain.",
      title: "Memory test",
    },
  },
  subtitle:
    "The memory service speaking for itself: send it a phrase, see the answer, see what it built out of it.",
  title: "Memory",
};

const RU: MemoryUi = {
  journal: {
    bytes: "байт",
    clear: "Очистить историю — стирает насовсем",
    cleared: "Стёрто записей: {n}. Знание о людях не затронуто.",
    clearing: "стираем…",
    down: "Служба памяти не ответила",
    empty:
      "Журнал пуст: с последней очистки память ничего не делала. Это не отказ — записи появятся, как только к памяти обратятся.",
    entries: "записей",
    refresh: "Обновить",
    shared:
      "Этот же документ читает агент разработки — файлом на диске. Очистка стирает его для обоих сразу: второго источника нет.",
  },
  layer: "Служба памяти",
  memoryTables: {
    columns: "колонок",
    down: "Служба памяти не ответила",
    empty:
      "Память пока не построила ни одной таблицы. Скажите ей что-нибудь выше — таблицы появляются сами, заранее их никто не объявляет.",
    lead: "Всё, что память построила из сказанного. Таблицы и колонки она заводит сама, в тот момент, когда они ей нужны.",
    loading: "читаем…",
    noRows: "таблица есть, строк в ней пока нет",
    refresh: "Обновить",
    rows: "строк",
    shown: "показано",
    title: "Что память построила",
  },
  memoryTest: {
    answerTitle: "Ответ памяти",
    ask: "Спросить",
    askHint: "Фраза уходит в recall. Пустое поле — всё, что памяти известно.",
    failed: "Стенд не достучался до двери",
    inputTitle: "Что отправляем",
    lead: "Фразы уходят прямо в службу памяти — эта страница работает на самой службе, значит между вами и памятью нет вообще ничего.",
    nothingSent: "Пока ничего не отправляли.",
    nothingYet: "Память ещё не отвечала — отправьте фразу слева.",
    raw: "Сырой вызов",
    rawBody: "Тело запроса, JSON",
    rawHint: "Любой метод договора, тело — JSON. Непостроенный метод отвечает 501, и стенд это тоже покажет.",
    rawMethod: "Имя метода",
    say: "Сказать",
    sayHint: "Фраза уходит в remember — так же, как человек рассказывает что-то боту.",
    send: "Отправить",
    sending: "отправляем…",
    status: "код",
    took: "заняло",
    volatile: "Список живёт в этой вкладке браузера и исчезает при перезагрузке.",
  },
  menuTitle: "Память",
  menuWord: "Меню",
  pages: {
    journal: {
      hint: "Что память делала: её собственный рассказ о своей работе. Этот же документ читает агент разработки — файлом.",
      title: "Журнал",
    },
    "memory-test": {
      hint: "Отправьте фразу прямо в память и посмотрите её ответ — агента в цепочке нет.",
      title: "Тест памяти",
    },
  },
  subtitle:
    "Служба памяти говорит сама за себя: отправьте ей фразу, посмотрите ответ и то, что она из него построила.",
  title: "Память",
};

const DICT: Record<string, MemoryUi> = { en: EN, ru: RU };

/** Слова языка. Неизвестный язык падает на английский — тот же закон, что у соседей. */
export function memoryUi(lang: string): MemoryUi {
  return DICT[lang] ?? EN;
}
