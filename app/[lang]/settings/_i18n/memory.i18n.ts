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
import type { TestTab } from "../_lib/test-tabs";
import type { OpenAiKeyWords } from "../_components/openai-key";
import type { OpenAiTabWords } from "../_components/openai-tab";
import type { BenchControlWords } from "../_components/memory-test-controls.client";
import type { ApiKeyWords } from "../_components/api-key.client";

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
  /**
   * Слова двух стендов хранилищ — графа знаний и вектора (189-1).
   *
   * 🔒 ОДИН НАБОР НА ОБА, А НЕ ДВА ПОХОЖИХ: имена вкладок и порядок работы у них
   * общие, различается только то, о каком хранилище идёт речь. Две копии слов
   * разошлись бы на первой правке — в этом проекте оплачено.
   */
  testBench: {
    /** Названия трёх страниц: загрузка · поиск · оценка. */
    tabs: Record<TestTab, string>;
    /** Лид каждой страницы у графа и у вектора — что человек здесь делает. */
    graph: Record<TestTab, string>;
    vector: Record<TestTab, string>;
    /** Честная строка о том, что органа ещё нет: молчащий экран читается как поломка. */
    soon: string;
  };
  /**
   * Слова загрузки в граф знаний (189-2).
   *
   * 🔒 ОТКАЗЫ ПЕРЕЧИСЛЕНЫ ПОИМЁННО, А НЕ СВЕДЕНЫ В «ЧТО-ТО ПОШЛО НЕ ТАК». Пустой
   * якорь, пустой текст и недоступная служба чинятся по-разному, и человек
   * обязан видеть, чем именно.
   */
  graphUpload: {
    anchorsHint: string;
    anchorsLabel: string;
    anchorsPlaceholder: string;
    button: string;
    busy: string;
    docsEmpty: string;
    docsTitle: string;
    errors: { "empty-text": string; "no-anchor": string; offline: string; refused: string };
    grew: string;
    labelsNow: string;
    notReady: string;
    sourceLabel: string;
    sourcePlaceholder: string;
    taken: string;
    textLabel: string;
    textPlaceholder: string;
    waiting: string;
    /**
     * Цена загрузки словами и числами (189-3).
     *
     * 🔒 «КУСКОВ ПРОЧИТАНО» — ЭТО НИЖНЯЯ ГРАНИЦА ХОДОВ МОДЕЛИ, И ТАК И СКАЗАНО.
     * Счётчика вызовов служба графа наружу не отдаёт; придуманная точность была
     * бы ложью о цене, а умолчание — уверенным умолчанием.
     */
    workTitle: string;
    workLine: string;
    workNote: string;
    workNone: string;
  };
  /**
   * Слова поиска по графу (189-4).
   *
   * 🔒 ДВА ПУТИ НАЗВАНЫ СЛОВАМИ ЧЕЛОВЕКА, А НЕ КОДОМ: «со словами от памяти» и
   * «по-старому, без слов». Кнопка `legacy` существует ради доказательства, и
   * человек обязан понимать, что именно он сравнивает.
   */
  /**
   * Слова вкладки «Оценка» — вердикт человека и корпус случаев (189-5).
   *
   * 🔒 «НЕЗАВЕРШЁННЫЕ» НАЗЫВАЮТСЯ ОТДЕЛЬНЫМ СЛОВОМ, А НЕ ПРЯЧУТСЯ В «ПЛОХИЕ».
   * Прогон без вердикта — не провал, а несудимый случай; смешав их, мы получили
   * бы долю удачных, которая падает от того, что человек ушёл от экрана.
   */
  benchCases: {
    bad: string;
    empty: string;
    good: string;
    judged: string;
    lead: string;
    legacyMark: string;
    modelMark: string;
    pending: string;
    summary: string;
    title: string;
    why: string;
  };
  graphSearch: {
    ask: string;
    askLegacy: string;
    busy: string;
    empty: string;
    errors: { "empty-question": string; "graph-unreachable": string; refused: string };
    forget: string;
    forgetDone: string;
    found: string;
    keywordsLine: string;
    label: string;
    legacyNote: string;
    matchedLine: string;
    modelNone: string;
    modelUnknown: string;
    placeholder: string;
    timing: string;
  };
  /** Слова карточки ключа доступа — форму задаёт сама карточка (185). */
  apiKey: ApiKeyWords;
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
  // 🔒 СЛОВА КАРТОЧКИ КЛЮЧА — ЕДИНСТВЕННОЕ РУССКОЕ МЕСТО ВКЛАДКИ API, И ТОЛЬКО
  // ПОТОМУ, ЧТО ЭТО ОРГАН УПРАВЛЕНИЯ, А НЕ ДОКУМЕНТАЦИЯ: на кнопку нажимает
  // человек, документацию читает машина.
  apiKey: {
    copied: "Copied",
    copy: "Copy",
    exists: "current key",
    failed: "The key was not created",
    generate: "Generate access key",
    lead:
      "One key for reading and writing. It is stored on this machine only, checked on every call, and never leaves the server except here, once, at the moment you create it.",
    missing: "no key yet",
    regenerate: "Generate a new key",
    shownOnce: "Copy it now — this is the only time the full key is shown.",
    title: "Access key",
    warning:
      "Generating a new key revokes the current one immediately. Anything already using it stops working at that moment — there is no separate revoke button, because this is the same action.",
    working: "Working…",
  },
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
      advanced: "Advanced parameters",
      legend: "the mark says whether the parameter reaches the contract today",
      nothingSet: "nothing set — the phrase goes as it is",
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
        add: "Add an entry",
        date: "Date",
        entry: "Entry",
        remove: "Remove",
        hint: "Date and place are the scope of a fact. There can be many of them — one phrase may carry several dates and places, so each one gets its own card. An empty scope means «I do not know where and when», not «everywhere and always».",
        label: "Calendar and geotag",
        place: "Place",
        placePlaceholder: "city or place",
      },
      setNow: "set",
      supported: "reaches memory",
      thread: {
        hint: "Claude keeps its own thread of reasoning, with its own name and its own cache. Memory returns that name in every answer where it thought; send it back and the same thread continues — the model sees its own earlier conclusion, and it costs LESS than a fresh call. Denying a conclusion only makes sense with a thread.",
        label: "Thread of the earlier reasoning",
        placeholder: "identifier from a previous answer",
        take: "take from the last answer",
      },
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
    api: {
      hint: "How external tools talk to this memory: the key, the methods, the limits — and how to test it in Postman.",
      title: "API",
    },
    "memory-test": {
      hint: "Send a phrase straight to memory and see its answer — no agent in the chain.",
      title: "Memory test",
    },
    "graph-test": {
      hint: "Load your own text, watch the graph being built from it, then ask in other words and see how fast the answer comes back.",
      title: "Knowledge graph test",
    },
    "vector-test": {
      hint: "The same three steps against the vector store: load, search by meaning, judge what came back.",
      title: "Vector store test",
    },
    passport: {
      hint: "What memory is and how it works — written before it is built. Read it, approve it or change it; the code comes after.",
      title: "Passport",
    },
  },
  graphUpload: {
    anchorsHint:
      "Without an anchor the record is accepted and then found by nobody: a question comes from a name, and a record with no link to a name has nothing to be reached by.",
    anchorsLabel: "Anchors — who or what this is about",
    anchorsPlaceholder: "Denis, Kremlin",
    button: "Transform and save",
    busy: "The model is reading your text…",
    docsEmpty: "The graph holds nothing yet.",
    docsTitle: "What the graph holds",
    errors: {
      "empty-text": "There is no text to load.",
      "no-anchor": "Name at least one anchor — otherwise the record cannot be found later.",
      offline: "The graph engine is not answering. Nothing was loaded.",
      refused: "The graph refused the document.",
    },
    grew: "Entities grew: {from} → {to}.",
    labelsNow: "Entities in the graph: {n}.",
    notReady: "The graph engine is not reachable from here — loading is unavailable.",
    sourceLabel: "Name it (optional)",
    sourcePlaceholder: "my-notes",
    taken: "Accepted in {ms} ms. Relations are built in the background — the list below refreshes itself.",
    textLabel: "Your text",
    textPlaceholder: "Paste what memory should learn…",
    waiting: "Building…",
    workLine:
      "Chunks read by the model: {chunks} · entities extracted: {entities} · relations: {relations}.",
    workNone: "The graph has not reported any work yet.",
    workNote:
      "Chunks read is the lower bound on model turns: the engine exposes no call counter, and an invented number would be a lie about the cost. This is where the expensive half of the work happens — reading afterwards is nearly free.",
    workTitle: "What the load cost",
  },
  benchCases: {
    bad: "Found the wrong thing",
    empty: "No runs yet. Ask something on the Search tab and come back.",
    good: "Found the right thing",
    judged: "Judged.",
    lead:
      "Only you can say whether the right thing was found. The engine is never allowed to grade its own work — a model retelling its own run errs in its own favour.",
    legacyMark: "asked the old way",
    modelMark: "model turn: {turn}",
    pending: "awaiting your verdict",
    summary:
      "Runs: {total} · right: {good} · wrong: {bad} · awaiting verdict: {pending} · average answer: {avg} ms.",
    title: "Case book",
    why: "Why (optional)",
  },
  graphSearch: {
    ask: "Ask — memory supplies the keywords",
    askLegacy: "Ask the old way, without keywords",
    busy: "Asking…",
    empty: "Nothing was found for this question.",
    errors: {
      "empty-question": "There is no question to ask.",
      "graph-unreachable": "The graph engine is not answering.",
      refused: "The graph refused the question.",
    },
    forget: "Forget everything the bench loaded",
    forgetDone: "Forgotten: {n}. Deletion runs in the background — the list empties within seconds.",
    found: "Found: {n} entity blocks.",
    keywordsLine: "Keywords we sent — topics: {high} · things: {low}.",
    label: "Your question",
    legacyNote:
      "Asked the old way: we sent no keywords, so the engine extracted them itself — with a model call. Whether it actually called one or answered from its cache we do not know, and we do not claim to.",
    matchedLine: "Recognised as entities the graph already knows: {names}.",
    modelNone:
      "No model turn: we named the keywords ourselves, so the engine had nothing left to extract.",
    modelUnknown: "Model turn: unknown — see the note below.",
    placeholder: "Ask in words that are not in the text…",
    timing: "Keywords prepared in {words} ms · the graph answered in {ask} ms.",
  },
  testBench: {
    graph: {
      search:
        "Ask in words that are not in the text. The graph answers from entities and relations it extracted at load time — this is where the answer must be instant.",
      upload:
        "Paste your text and press the button. A model reads it once and pulls out entities and relations: the cost sits here, at load time, on purpose.",
      verdict:
        "Only you can say whether the right thing was found. The numbers next to your verdict — seconds and model turns — are measured, not guessed.",
    },
    soon: "This control is built in the next sub-step. Nothing is hidden here: today the page only shows what it will hold.",
    tabs: {
      search: "Search",
      upload: "Load",
      verdict: "Verdict",
    },
    vector: {
      search:
        "Ask by meaning, not by matching words. The store returns the closest passages with their distance — and an unrelated question must return nothing.",
      upload:
        "The same text becomes a fingerprint of its meaning. No model reads it; only the embeddings are computed, and that is much cheaper.",
      verdict:
        "The same verdict, the same case book. Two stores judged by one form, so their numbers can be compared at all.",
    },
  },
  subtitle:
    "The memory service speaking for itself: send it a phrase, see the answer, see what it built out of it.",
  title: "Memory",
};

const RU: MemoryUi = {
  apiKey: {
    copied: "Скопировано",
    copy: "Копировать",
    exists: "текущий ключ",
    failed: "Ключ не создан",
    generate: "Сгенерировать ключ доступа",
    lead:
      "Один ключ на чтение и запись. Он хранится только на этой машине, проверяется при каждом вызове и покидает сервер ровно один раз — здесь, в момент создания.",
    missing: "ключа ещё нет",
    regenerate: "Сгенерировать новый ключ",
    shownOnce: "Скопируйте сейчас — полностью ключ показывается только этот раз.",
    title: "Ключ доступа",
    warning:
      "Новый ключ отменяет прежний немедленно. Всё, что уже им пользуется, перестанет работать в тот же миг — отдельной кнопки «отозвать» нет, потому что это одно и то же действие.",
    working: "Создаю…",
  },
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
      advanced: "Расширенные параметры",
      legend: "метка говорит, доезжает ли параметр до договора сегодня",
      nothingSet: "ничего не выставлено — фраза уедет как есть",
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
        add: "Добавить запись",
        date: "Дата",
        entry: "Запись",
        remove: "Убрать",
        hint: "Дата и место — это охват факта. Их бывает много: у одной фразы может быть несколько дат и мест, поэтому каждая запись — своя карточка. Пустой охват значит «не знаю где и когда», а не «везде и всегда».",
        label: "Календарь и геометка",
        place: "Место",
        placePlaceholder: "город или место",
      },
      setNow: "выставлено",
      supported: "доезжает",
      thread: {
        hint: "У Claude есть собственная нить размышления — со своим именем и своим кэшем. Память возвращает это имя в каждом ответе, где думала; пришлите его обратно — и продолжится та же цепочка: модель увидит свой прежний вывод, а стоит это ДЕШЕВЛЕ нового вызова. Опровергать вывод имеет смысл только с нитью.",
        label: "Нить прежнего разбора",
        placeholder: "идентификатор из прошлого ответа",
        take: "взять из последнего ответа",
      },
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
    api: {
      hint: "Как внешние инструменты работают с этой памятью: ключ, методы, пределы — и как проверить это в Postman.",
      title: "API",
    },
    "memory-test": {
      hint: "Отправьте фразу прямо в память и посмотрите её ответ — агента в цепочке нет.",
      title: "Тест памяти",
    },
    "graph-test": {
      hint: "Загрузите свой текст, посмотрите, как из него строится граф, а потом спросите другими словами — и увидьте, за сколько приходит ответ.",
      title: "Тест графа знаний",
    },
    "vector-test": {
      hint: "Те же три шага для векторного хранилища: загрузить, найти по смыслу, оценить найденное.",
      title: "Тест векторного хранилища",
    },
    passport: {
      hint: "Что такое память и как она работает — написанное раньше, чем построено. Читаете, утверждаете или меняете; код идёт после.",
      title: "Паспорт",
    },
  },
  subtitle:
    "Служба памяти говорит сама за себя: отправьте ей фразу, посмотрите ответ и то, что она из него построила.",
  graphUpload: {
    anchorsHint:
      "Без якоря запись примут, а найти её не сможет никто: вопрос приходит от имени, и у записи без связи с именем нет ничего, чем её достать.",
    anchorsLabel: "Якоря — к кому или к чему это относится",
    anchorsPlaceholder: "Денис, Кремль",
    button: "Преобразовать и сохранить",
    busy: "Модель читает ваш текст…",
    docsEmpty: "В графе пока ничего нет.",
    docsTitle: "Что лежит в графе",
    errors: {
      "empty-text": "Нечего загружать: текста нет.",
      "no-anchor": "Назовите хотя бы один якорь — иначе запись потом не найти.",
      offline: "Движок графа не отвечает. Ничего не загружено.",
      refused: "Граф отказался принять документ.",
    },
    grew: "Сущностей стало больше: {from} → {to}.",
    labelsNow: "Сущностей в графе: {n}.",
    notReady: "Движок графа отсюда недостижим — загрузка недоступна.",
    sourceLabel: "Как назвать (необязательно)",
    sourcePlaceholder: "мои-заметки",
    taken: "Принято за {ms} мс. Связи строятся в фоне — список ниже обновляется сам.",
    textLabel: "Ваш текст",
    textPlaceholder: "Вставьте то, что память должна выучить…",
    waiting: "Строится…",
    workLine:
      "Кусков прочитано моделью: {chunks} · сущностей извлечено: {entities} · связей: {relations}.",
    workNone: "Граф пока не отчитывался о работе.",
    workNote:
      "Кусков прочитано — это нижняя граница числа ходов модели: счётчика вызовов служба наружу не отдаёт, а придуманная точность была бы ложью о цене. Здесь и происходит дорогая половина работы — чтение после неё почти бесплатно.",
    workTitle: "Чем обошлась загрузка",
  },
  benchCases: {
    bad: "Нашло не то",
    empty: "Прогонов пока нет. Спросите что-нибудь на вкладке «Поиск» и вернитесь.",
    good: "Нашло то",
    judged: "Вердикт записан.",
    lead:
      "Нашлось нужное или нет — можете сказать только вы. Оценивать собственную работу памяти запрещено: модель, пересказывающая свой прогон, ошибается в свою пользу.",
    legacyMark: "спрошено по-старому",
    modelMark: "ход модели: {turn}",
    pending: "ждёт вашего вердикта",
    summary:
      "Прогонов: {total} · нашло то: {good} · не то: {bad} · без вердикта: {pending} · ответ в среднем: {avg} мс.",
    title: "Корпус случаев",
    why: "Почему (необязательно)",
  },
  graphSearch: {
    ask: "Спросить — слова даёт память",
    askLegacy: "Спросить по-старому, без слов",
    busy: "Спрашиваем…",
    empty: "По этому вопросу ничего не нашлось.",
    errors: {
      "empty-question": "Нечего спрашивать: вопроса нет.",
      "graph-unreachable": "Движок графа не отвечает.",
      refused: "Граф отказался отвечать на вопрос.",
    },
    forget: "Забыть всё, что загрузил стенд",
    forgetDone: "Забыто: {n}. Удаление идёт в фоне — список опустеет за считаные секунды.",
    found: "Нашлось: блоков сущностей — {n}.",
    keywordsLine: "Ключевые слова, которые мы послали — темы: {high} · вещи: {low}.",
    label: "Ваш вопрос",
    legacyNote:
      "Спрошено по-старому: слов мы не дали, и движок извлекал их сам — вызовом модели. Позвал он её на самом деле или ответил из своего кэша, мы не знаем и не утверждаем.",
    matchedLine: "Узнано как сущности, которые граф уже знает: {names}.",
    modelNone:
      "Ходов модели не было: ключевые слова мы назвали сами, и движку нечего было извлекать.",
    modelUnknown: "Ход модели: неизвестно — смотрите примечание ниже.",
    placeholder: "Спросите словами, которых в тексте нет…",
    timing: "Слова собраны за {words} мс · граф ответил за {ask} мс.",
  },
  testBench: {
    graph: {
      search:
        "Спросите словами, которых в тексте нет. Граф отвечает из сущностей и связей, добытых при загрузке, — здесь ответ обязан приходить мгновенно.",
      upload:
        "Вставьте свой текст и нажмите кнопку. Модель прочитает его один раз и вытащит сущности и связи: цена стоит здесь, на загрузке, и это сделано намеренно.",
      verdict:
        "Нашлось нужное или нет — можете сказать только вы. Числа рядом с вашим вердиктом — секунды и ходы модели — измерены, а не прикинуты.",
    },
    soon: "Этот орган строится следующим подшагом. Здесь ничего не спрятано: сегодня страница показывает только то, что будет на ней стоять.",
    tabs: {
      search: "Поиск",
      upload: "Загрузка",
      verdict: "Оценка",
    },
    vector: {
      search:
        "Спрашивайте по смыслу, а не по совпадению слов. Хранилище вернёт ближайшие куски и их близость — а посторонний вопрос обязан не найти ничего.",
      upload:
        "Тот же текст превращается в отпечаток смысла. Модель его не читает — считаются только встраивания, и это заметно дешевле.",
      verdict:
        "Тот же вердикт и тот же корпус случаев. Два хранилища судятся одной формой — иначе их числа не с чем сравнивать.",
    },
  },
  title: "Память",
};

const DICT: Record<string, MemoryUi> = { en: EN, ru: RU };

/** Слова языка. Неизвестный язык падает на английский — тот же закон, что у соседей. */
export function memoryUi(lang: string): MemoryUi {
  return DICT[lang] ?? EN;
}
