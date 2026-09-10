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
import type { OpenAiKeyWords } from "../_components/openai-key";
import type { OpenAiTabWords } from "../_components/openai-tab";
import type { BenchControlWords } from "../_components/memory-test-controls.client";

export type MemoryUi = {
  title: string;
  subtitle: string;
  layer: string;
  menuTitle: string;
  menuWord: string;
  /** Пункт меню, уводящий на страницу входа в подписку Claude (180-2). */
  terminalLabel: string;
  /** Что сказать, когда документа паспорта нет на диске (182-1). */
  passportMissing: string;
  /** Слова карточки ключа OpenAI — форму задаёт сама карточка (181-1). */
  openai: OpenAiKeyWords;
  /** Объяснение вкладки «Подписка OpenAI» простыми словами (181-1). */
  openaiTab: OpenAiTabWords;
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
    /** Панель «что уедет» и строка о непринятых параметрах (183-1). */
    whatGoes: string;
    droppedTitle: string;
    /** Слова девяти органов управления — форму задаёт сам компонент (183-1). */
    controls: BenchControlWords;
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
  /** Слова публичной главной страницы (178-5). */
  home: {
    whatIsBehind: string;
    whereToEnter: string;
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
  home: {
    whatIsBehind:
      "A public page of the service. What is behind it — the memory bench and the journal of its work — opens after signing in with the architect role.",
    whereToEnter:
      "The sign-in button is at the top right. After signing in, «Account» with your email and roles appears there, and the sections appear on the left.",
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
    controls: {
      chain: {
        hint: "Recursive thinking produces a lot of text. Whether to fill your own context with it is decided by whoever asked — not by memory.",
        label: "Return the chain of reasoning",
        off: "No",
        on: "Yes",
      },
      deny: {
        hint: "Overturn a conclusion memory made. The conclusion is cancelled, the grounds are kept: a refuted guess that is deleted gets reborn by the same search.",
        label: "This is wrong, because…",
        placeholder: "why the previous answer is wrong",
      },
      depth: {
        deep: "Deep",
        deepHint:
          "Search by meaning in the vector store is added. Slower and more expensive — turn it on when the standard depth found nothing.",
        extreme: "Extreme",
        extremeHint:
          "Memory goes into recursive research, up to ten minutes. It spends the same subscription quota the bot lives on. Only when deep did not answer either.",
        label: "Search depth",
        standard: "Standard",
        standardHint:
          "Memory goes on its own: the database first, then the model, then the knowledge graph. Seconds. Enough almost always.",
      },
      history: {
        hint: "A calling model may pass memory the previous conversation. A bench that cannot do the same tests the wrong path.",
        label: "Conversation history",
        placeholder: "what was said before this question",
      },
      legend: "the mark says whether the parameter reaches the contract today",
      needTable: {
        hint: "An input parameter: the caller may state that the answer has to become a table. Whether it does is still memory's decision.",
        label: "A table is required",
      },
      prior: {
        hint: "What has already been found before this question — the caller may send it along with the question.",
        label: "Results of previous searches",
        placeholder: "what was already found",
      },
      scope: {
        date: "Date",
        hint: "Date and place are the scope of a fact. An empty scope means «I do not know where and when», not «everywhere and always».",
        label: "Calendar and geotag",
        place: "Place",
        placePlaceholder: "city or place",
      },
      supported: "reaches memory",
      title: "Controls",
      unsupported: "does not reach yet",
      upload: {
        hint: "Memory only understands text today. The buttons stand here because the kinds of data are declared — and they are switched off because the ability is not built.",
        html: "HTML",
        image: "Image",
        label: "Send data that is not text",
        pdf: "PDF",
        sound: "Sound",
        video: "Video",
      },
      who: {
        bench: "bench-1 — the bench's own name",
        hint: "Memory answers about a particular person. The list is what memory itself knows — the bench does not invent people.",
        label: "On whose behalf",
        loading: "asking memory who it knows…",
      },
    },
    droppedTitle: "Set here, but this method does not accept it yet",
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
    whatGoes: "What goes to memory",
  },
  menuTitle: "Memory",
  menuWord: "Menu",
  passportMissing:
    "The passport document is not on disk yet: development-docs/PASSPORT.md. It is written first — before any code.",
  terminalLabel: "Claude subscription",
  openai: {
    badFormat: "That does not look like an OpenAI key — they start with sk-",
    balanceNote:
      "The remaining balance cannot be shown: OpenAI returns it only to a browser session of your account or to an admin key with the api.usage.read scope. An ordinary project key never sees it.",
    check: "Check",
    checking: "Checking…",
    consumerApp: "the site project",
    consumerData: "data layer",
    consumerGraph: "knowledge graph",
    consumerMachine: "memory and the bot",
    exists: "An OpenAI key is set",
    failed: "Action failed",
    funded: "The balance is positive",
    fundsUnknown: "Could not tell whether there is credit — try again later",
    invalid: "OpenAI did not accept this key",
    keyLabel: "Key from platform.openai.com",
    keyPlaceholder: "sk-…",
    keyReplace: "Paste a new key to replace the saved one",
    lead:
      "One key for the whole server: entered here, it reaches every service that needs it. If you have already entered it somewhere else, there is no need to enter it again.",
    missing: "No OpenAI key yet",
    noFunds: "The key works, but the account is out of credit",
    partial: "The key has not reached every service",
    restartNote:
      "Most services pick up a new key at once. The site project and the knowledge graph read it when they start, so they get it after their next restart.",
    save: "Save",
    saved: "OpenAI key saved",
    saving: "Saving…",
    title: "OpenAI key",
    valid: "The key is valid",
  },
  openaiTab: {
    heading: "Why the project needs an OpenAI key",
    intro:
      "Claude does the thinking in this project — on your subscription. The OpenAI key is needed for two helper jobs, and neither gets done without it:",
    voiceTitle: "Voice becomes text",
    voice:
      "When you dictate a message instead of typing it, the recording has to become text. OpenAI does that. Without the key a voice message stays a sound that nobody has read.",
    vectorsTitle: "Search by meaning",
    vectors:
      "To find the right piece in your documents and past conversations, every text is turned into a fingerprint of its meaning — a vector. The agentic RAG and the vector store compare these fingerprints and find what is close in meaning, even when the words differ. OpenAI makes the fingerprints.",
    without:
      "Without the key the main things keep working: Claude answers, memory remembers what was said. What you lose is voice-to-text and search by meaning.",
  },
  pages: {
    journal: {
      hint: "What memory did: its own account of its work. The same document is read by the development agent, as a file.",
      title: "Journal",
    },
    openai: {
      hint: "What the OpenAI key is for — and the key itself, one for the whole server.",
      title: "OpenAI subscription",
    },
    settings: {
      hint: "Keys and switches of this service. The Anthropic key here is the same one the chat uses: it lives in the machine secret store.",
      title: "Settings",
    },
    "memory-test": {
      hint: "Send a phrase straight to memory and see its answer — no agent in the chain.",
      title: "Memory test",
    },
    passport: {
      hint: "What memory is and how it works — written before it is built. Read it, approve it or change it; the code comes after.",
      title: "Passport",
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
  home: {
    whatIsBehind:
      "Публичная страница службы. То, что за ней — стенд памяти и журнал её работы, — открывается после входа с ролью архитектора.",
    whereToEnter:
      "Кнопка входа — справа вверху. После входа там же появится «Аккаунт» с почтой и ролями, а слева — разделы.",
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
    controls: {
      chain: {
        hint: "Рекурсивное размышление порождает много текста. Переполнять свой контекст или нет решает тот, кто спросил, — а не память за него.",
        label: "Возвращать цепочку размышлений",
        off: "Нет",
        on: "Да",
      },
      deny: {
        hint: "Опровергнуть прежний вывод памяти. Отменяется вывод, а не факт: основание остаётся — стёртая догадка рождается заново тем же поиском.",
        label: "Это неверно, потому что…",
        placeholder: "чем прежний ответ неверен",
      },
      depth: {
        deep: "Глубокий",
        deepHint:
          "Добавляется поиск по смыслу в векторной базе. Дольше и дороже — включайте, когда стандарт ничего не нашёл.",
        extreme: "Экстремальный",
        extremeHint:
          "Память уходит в рекурсивное исследование, до десяти минут. Тратит ту же квоту подписки, которой живёт бот. Только когда и глубокий не дал ответа.",
        label: "Глубина поиска",
        standard: "Стандарт",
        standardHint:
          "Память идёт сама: сначала база, потом модель, потом граф знаний. Секунды. Хватает почти всегда.",
      },
      history: {
        hint: "Зовущая модель по своему усмотрению передаёт памяти предыдущий разговор. Стенд, который так не умеет, проверяет не тот путь.",
        label: "История разговора",
        placeholder: "что говорили до этого вопроса",
      },
      legend: "метка говорит, доезжает ли параметр до договора сегодня",
      needTable: {
        hint: "Входной параметр: зовущий вправе сказать, что ответ должен стать таблицей. Заводить ли её — по-прежнему решение памяти.",
        label: "Требуется создать таблицу",
      },
      prior: {
        hint: "Что уже нашли до этого вопроса — зовущий вправе прислать это вместе с вопросом.",
        label: "Результаты предыдущих поисков",
        placeholder: "что уже было найдено",
      },
      scope: {
        date: "Дата",
        hint: "Дата и место — это охват факта. Пустой охват значит «не знаю где и когда», а не «везде и всегда».",
        label: "Календарь и геометка",
        place: "Место",
        placePlaceholder: "город или место",
      },
      supported: "доезжает",
      title: "Органы управления",
      unsupported: "пока не доезжает",
      upload: {
        hint: "Память сегодня понимает только текст. Кнопки стоят здесь потому, что роды данных объявлены, — и выключены потому, что способности нет.",
        html: "HTML",
        image: "Изображение",
        label: "Отправить не текст",
        pdf: "PDF",
        sound: "Звук",
        video: "Видео",
      },
      who: {
        bench: "bench-1 — служебное имя стенда",
        hint: "Память отвечает про конкретного человека. Список — тот, что память знает сама; людей стенд не выдумывает.",
        label: "От чьего имени",
        loading: "спрашиваем память, кого она знает…",
      },
    },
    droppedTitle: "Выставлено здесь, но этот метод пока такого не принимает",
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
    whatGoes: "Что уедет в память",
  },
  menuTitle: "Память",
  menuWord: "Меню",
  passportMissing:
    "Документа паспорта пока нет на диске: development-docs/PASSPORT.md. Он пишется первым — раньше кода.",
  terminalLabel: "Подписка Claude",
  openai: {
    badFormat: "Это не похоже на ключ OpenAI — они начинаются с sk-",
    balanceNote:
      "Остаток показать нельзя: OpenAI отдаёт его только браузерной сессии вашего кабинета или админскому ключу с правом api.usage.read. Обычный проектный ключ его не видит.",
    check: "Проверить",
    checking: "Проверяю…",
    consumerApp: "проект сайта",
    consumerData: "слой данных",
    consumerGraph: "граф знаний",
    consumerMachine: "память и бот",
    exists: "Ключ OpenAI существует",
    failed: "Действие не выполнено",
    funded: "Баланс положительный",
    fundsUnknown: "Про средства ответить не удалось — попробуйте позже",
    invalid: "OpenAI этот ключ не принял",
    keyLabel: "Ключ с platform.openai.com",
    keyPlaceholder: "sk-…",
    keyReplace: "Вставьте новый ключ, чтобы заменить сохранённый",
    lead:
      "Ключ один на весь сервер: введённый здесь, он доезжает до всех служб, которым нужен. Если вы уже вводили его в другом месте — второй раз вводить не нужно.",
    missing: "Ключ OpenAI не задан",
    noFunds: "Ключ рабочий, но на счёте кончились средства",
    partial: "Ключ доехал не до всех служб",
    restartNote:
      "Большинство служб подхватывают новый ключ сразу. Проект сайта и граф знаний читают его при запуске — им он достанется после ближайшего перезапуска.",
    save: "Сохранить",
    saved: "Ключ OpenAI сохранён",
    saving: "Сохраняю…",
    title: "Ключ OpenAI",
    valid: "Ключ верный",
  },
  openaiTab: {
    heading: "Зачем проекту ключ OpenAI",
    intro:
      "Думает в проекте Claude — по вашей подписке. Ключ OpenAI нужен для двух вспомогательных дел, и без него они не делаются:",
    voiceTitle: "Голос превращается в текст",
    voice:
      "Когда вы не печатаете сообщение, а надиктовываете его, запись нужно превратить в текст. Это делает OpenAI. Без ключа голосовое сообщение так и останется звуком, который никто не прочитал.",
    vectorsTitle: "Поиск по смыслу",
    vectors:
      "Чтобы находить нужное в ваших документах и прошлых разговорах, каждый текст превращается в «отпечаток смысла» — вектор. Агентный RAG и векторная база сравнивают такие отпечатки и находят близкое по смыслу, даже когда слова другие. Отпечатки делает OpenAI.",
    without:
      "Без ключа главное продолжает работать: Claude отвечает, память запоминает сказанное. Пропадут расшифровка голоса и поиск по смыслу.",
  },
  pages: {
    journal: {
      hint: "Что память делала: её собственный рассказ о своей работе. Этот же документ читает агент разработки — файлом.",
      title: "Журнал",
    },
    openai: {
      hint: "Зачем нужен ключ OpenAI — и сам ключ, один на весь сервер.",
      title: "Подписка OpenAI",
    },
    settings: {
      hint: "Ключи и выключатели самой службы. Ключ Anthropic здесь тот же, что у чата: он лежит в складе секретов машины.",
      title: "Настройки",
    },
    "memory-test": {
      hint: "Отправьте фразу прямо в память и посмотрите её ответ — агента в цепочке нет.",
      title: "Тест памяти",
    },
    passport: {
      hint: "Что такое память и как она работает — написанное раньше, чем построено. Читаете, утверждаете или меняете; код идёт после.",
      title: "Паспорт",
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
