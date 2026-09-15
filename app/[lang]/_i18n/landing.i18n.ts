// СЛОВА ПУБЛИЧНОГО ЛЕНДИНГА ПАМЯТИ (186).
//
// 🎯 ИСТОЧНИК — ДВА ТЕКСТА ВЛАДЕЛЬЦА 2026-09-11: английский и его же русская
// редакция. Английская ветка собрана из первого, русская — из второго дословно
// по смыслу; это один текст на двух языках, а не две редакции обещания.
//
// 🔒 СТРАНИЦА ГОВОРИТ НА ОДНОМ ЯЗЫКЕ — том, который выбрал человек (требование
// того же дня). До 82 языков это дорастает добавлением веток с теми же ключами;
// ни один компонент при этом не правится.
//
// 🔒 КОНКУРЕНТЫ И СТРОКИ СРАВНЕНИЯ — ДАННЫЕ, А НЕ РАЗМЕТКА. Владелец прислал
// вторую таблицу через минуту после первой; третья придёт так же. Прибавление
// соперника обязано быть правкой словаря, иначе каждая новая таблица требует
// программиста.

export type ComparisonTable = {
  title: string;
  rivals: string[];
  rows: Array<{ feature: string; ours: string; rivals: string[] }>;
};

/** Навык у пункта схемы: `skills` — существующие навыки памяти, `plan` — навык, который предстоит создать. */
export type FlowMark = { skills?: string[]; plan?: string };
export type FlowText = FlowMark & { text: string; items?: FlowText[] };

/**
 * Схема «как память обрабатывает запрос» простым текстом: нумерация 1. / 1.2. / 1.2.1., навык у пункта и сноски.
 * 🔒 ОДНА РЕАЛИЗАЦИЯ НА ДВУХ ЧИТАТЕЛЕЙ — `llms.txt` и зеркало страницы в Markdown; нумерация выводится из места, как на странице.
 */
export function flowLines(ladder: {
  phases: Array<FlowMark & { title: string; items: FlowText[] }>;
  notesTitle: string;
  notes: Array<{ mark: string; text: string }>;
  skillLabels: { have: string; plan: string };
}): string[] {
  const out: string[] = [];
  const skill = (m: FlowMark) =>
    m.skills?.length
      ? ` _(${ladder.skillLabels.have} ${m.skills.join(", ")})_`
      : m.plan
        ? ` _(${ladder.skillLabels.plan} ${m.plan})_`
        : "";
  const walk = (items: FlowText[], prefix: string, depth: number) =>
    items.forEach((item, i) => {
      const no = `${prefix}${i + 1}.`;
      out.push(`${"   ".repeat(depth)}${no} ${item.text}${skill(item)}`);
      if (item.items?.length) walk(item.items, no, depth + 1);
    });
  ladder.phases.forEach((phase, i) => {
    out.push(`${i + 1}. **${phase.title}**${skill(phase)}`);
    walk(phase.items, `${i + 1}.`, 1);
  });
  out.push("", `**${ladder.notesTitle}**`, "");
  for (const n of ladder.notes) out.push(`- ${n.mark} ${n.text}`);
  return out;
}

export type LandingWords = {
  hero: {
    eyebrow: string;
    title: string;
    lead: string;
    body: string;
    badges: string[];
    primary: string;
    secondary: string;
  };
  /** Оглавление страницы (194-12): надпись над списком и подпись навигации для экранного диктора. */
  toc: { heading: string; label: string };
  problem: { title: string; lead: string; body: string };
  router: {
    title: string;
    lead: string;
    inbox: string;
    routerBox: string;
    cheapBranch: string;
    cheapCost: string;
    deepBranch: string;
    deepCost: string;
  };
  schema: { title: string; body: string };
  /**
   * Как память обрабатывает запрос (204): четыре фазы, пункты до трёх уровней вложенности, сноски «в разработке».
   * 🔒 Описано целиком, как работающее; недостроенное — звёздочкой в тексте и сноской (паспорт §0 п. 5, §4).
   */
  ladder: {
    title: string;
    lead: string;
    phases: Array<
      { title: string } & FlowMark & {
        items: Array<
          FlowText & { items?: Array<FlowText & { items?: Array<FlowText & { items?: FlowText[] }> }> }
        >;
      }
    >;
    notesTitle: string;
    notes: Array<{ mark: string; text: string }>;
    /** Подписи метки навыка у пункта: зелёная — навык есть, красная — будет создан (слово владельца 2026-09-15). */
    skillLabels: { have: string; plan: string };
  };
  /**
   * 🔒 `building` — ЧТО ИЗ ЭТОГО РАЗДЕЛА ЕЩЁ НЕ ПОСТРОЕНО, СЛОВАМИ И НА МЕСТЕ (205-12).
   *
   * Правило владельца 2026-09-15 (паспорт §0 п. 5): описываем целиком, как работающее, а
   * недостроенное помечаем — «если ты напишешь просто "мы не построили", то как же ты будешь это
   * строить?». В паспорте это звёздочка со сноской внизу; на странице сноски внизу никто не
   * доскроллит, поэтому пометка стоит В САМОМ РАЗДЕЛЕ, под лидом.
   * ✗ Оплачено сверкой 205-11: страница обещала поиск по радиусу, мгновенный повтор вопроса и эволюцию
   * навыков как работающее, а кода нет ни строки. Обещание, которого продукт не держит, человек
   * проверяет в свой худший день.
   * 🛑 Текст пометки говорит ДВЕ вещи: что есть сегодня и что предстоит. Одно «в разработке» без
   * «что есть» читается как «не работает ничего».
   */
  /**
   * Реестр признаков простыми словами (шаг памяти 205, вопрос владельца 2026-09-15: «я всё равно не
   * могу понять, для чего мы их создали»).
   *
   * 🔒 РАЗДЕЛ ОБЪЯСНЯЕТ ПОЛЬЗУ, А НЕ УСТРОЙСТВО. Признак — не место хранения и не разрешение на
   * запись; он нужен ради счёта, дешевизны, разговора с человеком и видимости связей. Всё, что не
   * попадает в эти четыре пользы, здесь не пишется вовсе.
   */
  features: {
    title: string;
    lead: string;
    whyTitle: string;
    why: Array<{ title: string; body: string }>;
    caseTitle: string;
    cases: Array<{ q: string; a: string }>;
    useTitle: string;
    use: string[];
    addTitle: string;
    add: string[];
    building?: string;
  };
  scope: { title: string; lead: string; items: Array<{ title: string; body: string }>; building?: string };
  artifacts: { title: string; lead: string; steps: string[]; building?: string };
  memoization: { title: string; lead: string; chain: string[]; building?: string };
  evolution: { title: string; lead: string; items: Array<{ title: string; body: string }>; building?: string };
  stores: { title: string; lead: string; items: Array<{ title: string; body: string }> };
  media: { title: string; lead: string; items: Array<{ title: string; body: string }> };
  bench: { title: string; lead: string; items: string[]; where: string };
  api: { title: string; lead: string; samples: Array<{ title: string; code: string }>; building?: string };
  comparison: { title: string; lead: string; feature: string; ours: string; tables: ComparisonTable[] };
  /**
   * Установка — одна мысль, без команд.
   *
   * 🎯 ТРЕБОВАНИЕ ВЛАДЕЛЬЦА 2026-09-11: «убери информацию о том, как выполнять
   * установку. Единственное, что нужно знать, — достаточно роботом-установщиком
   * Fractera запустить установку на собственном сервере, и автоматически встанут
   * все микросервисы, включая память».
   * 🔒 ПОЧЕМУ ЭТО ВЕРНЕЕ, А НЕ ПРОСТО КОРОЧЕ: команда установки на лендинге живёт
   * своей жизнью и устаревает молча — человек скопирует её через полгода и
   * получит отказ. Установку делает робот, и знать про неё нужно ровно это.
   */
  install: { title: string; lead: string; body: string };
  principles: { title: string; items: Array<{ title: string; body: string }> };
  /**
   * Вопросы и ответы — блок стартера, перенесённый сюда целиком по замыслу.
   *
   * 🔒 ОДИН ИСТОЧНИК НА ГЛАЗА И НА РАЗМЕТКУ: `FAQPage` строится из этих же
   * строк. Вторая копия «для поисковика» разошлась бы с видимой на первой
   * правке, а расхождение разметки с текстом страницы — это ровно то, за что
   * поисковик наказывает.
   */
  faq: { title: string; lead: string; items: Array<{ q: string; a: string }> };
  /** Слова для мета-тегов: то, что человек увидит в выдаче. */
  seo: { title: string; description: string };
  /** Единственная внешняя ссылка страницы — на проект Fractera. */
  project: { label: string; body: string };
  cta: { title: string; body: string; primary: string; secondary: string };
};

const CURL_REMEMBER_EN = `curl -X POST https://memory.your-domain.com/v1/remember \\
  -H "Content-Type: application/json" -H "x-memory-key: YOUR_MEMORY_KEY" \\
  -d '{
    "who": "roman",
    "text": "Office lease note",
    "media": [{ "url": "https://.../note.oga" }],
    "scope": [{ "at": "2026-09-11", "lat": 40.4168, "lon": -3.7038, "radius_m": 500 }]
  }'`;

const CURL_RADIUS_EN = `curl -X POST https://memory.your-domain.com/v1/recall \\
  -H "Content-Type: application/json" -H "x-memory-key: YOUR_MEMORY_KEY" \\
  -d '{
    "who": "roman",
    "text": "What notes or files did I save within 500 meters of here?",
    "scope": [{ "lat": 40.4168, "lon": -3.7038, "radius_m": 500 }]
  }'`;

const CURL_DEEP_EN = `curl -X POST https://memory.your-domain.com/v1/recall \\
  -H "Content-Type: application/json" -H "x-memory-key: YOUR_MEMORY_KEY" \\
  -d '{
    "who": "roman",
    "text": "Summarize all my taxi expenses from last month into a table",
    "depth": "deep",
    "want_chain": true
  }'`;

const CURL_REMEMBER_RU = `curl -X POST https://memory.your-domain.com/v1/remember \\
  -H "Content-Type: application/json" -H "x-memory-key: YOUR_MEMORY_KEY" \\
  -d '{
    "who": "roman",
    "text": "Заметка по аренде офиса",
    "media": [{ "url": "https://.../note.oga" }],
    "scope": [{ "at": "2026-09-11", "lat": 40.4168, "lon": -3.7038, "radius_m": 500 }]
  }'`;

const CURL_RADIUS_RU = `curl -X POST https://memory.your-domain.com/v1/recall \\
  -H "Content-Type: application/json" -H "x-memory-key: YOUR_MEMORY_KEY" \\
  -d '{
    "who": "roman",
    "text": "Что я сохранял в радиусе полукилометра отсюда?",
    "scope": [{ "lat": 40.4168, "lon": -3.7038, "radius_m": 500 }]
  }'`;

const CURL_DEEP_RU = `curl -X POST https://memory.your-domain.com/v1/recall \\
  -H "Content-Type: application/json" -H "x-memory-key: YOUR_MEMORY_KEY" \\
  -d '{
    "who": "roman",
    "text": "Сведи все расходы на такси за прошлый месяц в таблицу",
    "depth": "deep",
    "want_chain": true
  }'`;

const EN: LandingWords = {
  api: {
    building:
      "Two calls below reach further than the engine goes today: the scope of a question is accepted but the search does not yet use the coordinates, and depth «deep» stops at the knowledge graph — the answer always reports depth_used, the depth actually reached.",
    lead: "One REST API, one key. Every example below runs against a live instance as it stands.",
    samples: [
      { code: CURL_REMEMBER_EN, title: "Store a voice note with spatial coordinates" },
      { code: CURL_RADIUS_EN, title: "Ask with the place of the question (radius search in development)" },
      { code: CURL_DEEP_EN, title: "Ask for depth and the chain of the search" },
    ],
    title: "API quickstart",
  },
  features: {
    title: "Named things memory understands",
    lead:
      "Memory writes down anything you tell it, whether or not it has a name for it. A named thing — we call it a feature — is what lets memory do more than store the sentence: count it, be asked about it in one word, know what to ask you back, and show who depends on it.",
    whyTitle: "What a name buys you, and nothing else",
    why: [
      {
        title: "Counting and keeping up to date",
        body: "A name says how values pile up: the newest one wins, or they make a list, or they add up. Without it, «how much did I spend this month» has nothing to add — the amounts are just sentences.",
      },
      {
        title: "One word instead of a model call",
        body: "A caller that already knows what it is talking about sends the name, and memory skips working the sentence out. Same answer, one model turn cheaper.",
      },
      {
        title: "Knowing what to ask you",
        body: "A name carries what to do when the value is missing: ask, ask later, or stay quiet — and an example of a good answer. Without it memory can only be silent about what it lacks.",
      },
      {
        title: "Seeing who depends on it",
        body: "Parts of your project subscribe to the names they use. Change or retire one, and you see in advance whose work it breaks instead of finding out afterwards.",
      },
    ],
    caseTitle: "What happens in practice",
    cases: [
      {
        q: "«My name is Roman» — nobody sent a name for it",
        a: "Memory works the sentence out itself with one short model call, records it, and answers about it. A name is not needed to remember.",
      },
      {
        q: "A bot sends the value together with the name it means",
        a: "No model call at all: memory checks the name exists and the value fits its type, and writes it. This is the cheapest path there is.",
      },
      {
        q: "«How much did I spend on taxis this month?»",
        a: "Adding up is only possible for a named thing that is declared to add up. This is the clearest case where a name is the difference between an answer and a shrug.",
      },
      {
        q: "«What do I feed the dog?» — written down, never named",
        a: "Today memory stores it and cannot find it when asked, because retrieval goes through names only. That is the one thing being fixed — see the note below.",
      },
    ],
    useTitle: "How names are used",
    use: [
      "Sending a name is always optional. Without it memory does the same work itself — longer, and one model turn dearer, but to the same quality.",
      "A name means the meaning, never a place: where the value is kept is memory's business, and it changes as the thing grows.",
      "A name you send is checked, not trusted: an unknown one comes back with the closest names memory does have, a retired one with its replacement, and a value of the wrong type is refused.",
      "Not having a name never hides your data: memory writes freely, so it must be able to read back everything it wrote.",
    ],
    addTitle: "How a new name appears",
    add: [
      "You say something new — memory makes room for it by itself, with no name yet. This is normal, not an error.",
      "When the thing stops being accidental — it repeats, piles up, or you ask about it — memory proposes a name with a draft of everything it needs: type, how it accumulates, the words people use for it, an example.",
      "A person approves it, and from then on it can be counted, asked for in one word, and subscribed to. Names live as files in the repository, so any change is visible and revertible.",
    ],
    building:
      "In development: retrieval over everything written, named or not (today a question is answered only through names, and things stored without one are not found), and memory proposing new names by itself. Until both land, a name also decides what can be retrieved — which is exactly why the list of unnamed things is kept in plain sight.",
  },
  artifacts: {
    building:
      "Today: an agent composes the document and hands it to memory with keep_object — it comes back by id, with its file, description and summary. In development: reading that assembles the document over the tables by itself and returns the summary next to the artifact.",
    lead:
      "Asked to summarise complex data — last month's spending, a project's state — memory does not hand back a wall of text. It builds the thing you asked for:",
    steps: [
      "Instantiates a structured entity: a typed table with the columns the answer needs.",
      "Compiles, sorts and formats a clean Markdown artifact with its own Object ID.",
      "Returns a short executive summary next to the artifact, so the answer reads well and the detail stays referenceable.",
    ],
    title: "Knowledge becomes an object, not a paragraph",
  },
  bench: {
    items: [
      "Execute direct API requests against the memory core with no front-end abstraction in the way.",
      "Inspect raw JSON payloads, execution timings and exact model token usage.",
      "Verify the request body before committing a line of client code.",
    ],
    lead:
      "The engine ships with an interactive bench. It is not a demo page: it is where an integration is proven before it is written.",
    title: "Testing and verification in the built-in playground",
    where: "/{lang}/settings?section=memory-test",
  },
  cta: {
    body:
      "Read the full design in the passport — the document written before the code and kept in step with it ever since.",
    primary: "Open the passport",
    secondary: "Open the bench",
    title: "See how it is built",
  },
  comparison: {
    feature: "Capability",
    lead:
      "Two comparisons: one against the categories of memory tooling, one against a ready-made assistant of a different philosophy.",
    ours: "Fractera Memory",
    tables: [
      {
        rivals: ["Standard RAG frameworks", "MemGPT / Letta", "Mem0 / Zep"],
        rows: [
          {
            feature: "Storage architecture",
            ours: "Hybrid: graph + vector + relational + object store",
            rivals: ["Vector DB only", "Relational / text files", "Vector plus a basic graph"],
          },
          {
            feature: "Zero-token reads",
            ours: "Only a request with no question; every other read costs one short model call",
            rivals: ["No", "No", "Partial"],
          },
          {
            feature: "Native multimodality",
            ours: "Built in: audio, video, images, PDF, Markdown, HTML, source code, links and YouTube",
            rivals: ["Requires external parsers", "Requires external parsers", "Text focused"],
          },
          {
            feature: "Spatial proximity indexing",
            ours: "lat/lon and radius_m stored and validated on every record; radius search in development",
            rivals: ["Text matching only", "Function calling only", "Basic metadata"],
          },
          {
            feature: "Skill evolution",
            ours: "Champion / challenger A/B testing — designed and published, in development",
            rivals: ["None", "Manual prompt edits", "None"],
          },
          {
            feature: "Self-hosted / open source",
            ours: "100% on-premise, single node",
            rivals: ["Varies", "Yes", "Freemium / cloud"],
          },
        ],
        title: "Against the categories",
      },
      {
        rivals: ["IVA Agent (smixs/iva-agent)"],
        rows: [
          {
            feature: "System classification",
            ours: "An autonomous memory engine behind an API, for any front-end",
            rivals: ["An end-to-end Telegram assistant tied to an Obsidian vault"],
          },
          {
            feature: "Architecture",
            ours: "A decoupled microservice; the Telegram bot is an optional client",
            rivals: ["A monolith: Telegram, userbot and vault manager in one codebase"],
          },
          {
            feature: "Cost optimisation",
            ours: "One short model call over 8 registry candidates, never the whole schema; the table and the graph answer without further model turns",
            rivals: ["Every operation leans on model passes, BM25 and vector lookups"],
          },
          {
            feature: "Data processing",
            ours: "Dynamic SQL tables grown from phrases, a knowledge graph, objects with ids",
            rivals: ["Markdown cards written to a folder for Obsidian to sync"],
          },
          {
            feature: "Integrations",
            ours: "Many front-ends at once over one REST API",
            rivals: ["Bound to one Telegram account and an Obsidian setup"],
          },
        ],
        title: "Against a ready-made assistant",
      },
    ],
    title: "How it compares",
  },
  evolution: {
    items: [
      {
        body:
          "The model is forbidden from scoring its own work. Verdicts come from outside — explicit architect feedback and strict compute-cost ratios.",
        title: "No self-evaluation",
      },
      {
        body:
          "A challenger is promoted to champion only when it wins on external quality metrics with no regression in speed or cost.",
        title: "Deterministic promotion",
      },
      {
        body:
          "Every modification is a commit. One click reverts the instructions to the baseline version through Git, with no data loss.",
        title: "Versioning and safe rollback",
      },
    ],
    building:
      "Not built yet — this is the design, published so it can be checked before it is written. Today: skills are files in the repository, every edit is a commit, and verdicts are collected from people on the built-in bench. In development: the run facts written as data, the candidate skill, the shadow run and the promotion rule.",
    lead:
      "When the engine detects repeated misses or a sub-optimal path, it writes a candidate skill and runs it as a challenger in the shadow — on real production traffic, while people keep being answered by the verified champion.",
    title: "A self-evolving skill core with shadow A/B testing",
  },
  faq: {
    items: [
      {
        a: "Almost every one — and exactly one short call. To understand what a person means, memory makes one model call over 8 candidate features from its registry, with no conversation kept. After that the table and the graph answer without further model turns, and sums are computed by code. Only a request with no question is answered with no model at all. The answer reports depth_used, the depth actually reached.",
        q: "Does every request cost tokens?",
      },
      {
        a: "It accepts them, and it does not yet search by them. A scope entry carries lat, lon and an optional radius_m; the pair is validated against the bounds of the planet and stored with the record, and an index over the coordinates exists. Search by radius — «what do I know within 500 metres of this point» — is in development, and until it lands the coordinates of a question are not used for retrieval. An empty scope always means «I do not know where and when», never «everywhere, always».",
        q: "Can it answer questions about a place by coordinates, not by a word?",
      },
      {
        a: "Voice notes, images, video, PDF, Markdown, HTML, source code (TypeScript, Python, SQL and more), links to web pages and YouTube videos. Every file gets a full description detailed enough for another AI to reconstruct it, and a summary of about 50 words: speech is transcribed by OpenAI whisper-1 with timestamps, a video is split into its sound track and frames on one timeline, and pictures, documents, pages and code are read by Claude — code is never executed. The original stays in the built-in object store next to its full description and is referenced from answers by id.",
        q: "What can I send besides text?",
      },
      {
        a: "None. You send a sentence. The engine adds columns as new kinds of fact appear and generates typed relational tables when a kind grows into an entity. There are no migrations to write.",
        q: "What schema do I have to design first?",
      },
      {
        a: "By design, the result is folded back: the artifact to the object store, its summary into the vector store and the knowledge graph, the relation tables updated — so the same question is later answered from the cheap levels. Today that loop is driven from outside: an agent keeps the answer as an object with keep_object, and what is kept is found by meaning. Reading does not yet fold its own result back, and the deep levels themselves are in development — the answer always reports depth_used, the depth actually reached.",
        q: "What happens after an expensive research run?",
      },
      {
        a: "The design is champion and challenger: a second version of the skill runs in the shadow on real traffic while people keep being answered by the working one, and promotion needs an external verdict with no regression in cost — the engine is never allowed to grade its own work. This part is not built yet. Today skills are files in the repository, every edit is a commit that can be reverted, and verdicts on answers are collected from people on the built-in bench.",
        q: "How does it improve itself without breaking what works?",
      },
      {
        a: "Any HTTP client: a Telegram bot, a web chat, a mobile app, a scheduled job. The engine also ships with its own console, already connected, and that console is optional: nothing in the API path depends on it.",
        q: "What can I connect to it?",
      },
      {
        a: "On your server, in your database, in your object store, behind a key you can revoke in one click. There is no metered API in the middle and no telemetry leaving the machine.",
        q: "Where does my data live?",
      },
    ],
    lead: "Short answers to what people ask before they integrate.",
    title: "Questions and answers",
  },
  project: {
    body:
      "Fractera Memory is one microservice of the Fractera platform, the engineering infrastructure for autonomous agents. The whole project, this engine included, is open source.",
    label: "The Fractera project on GitHub",
  },
  seo: {
    description:
      "Self-hosted memory engine for AI agents: knowledge graph, vector and relational stores, built-in object storage, spatial-temporal scope with lat/lon on every record, native voice, image, video, PDF, Markdown, HTML, source-code and link input, and one short model call per request over a feature registry. One REST API, open source.",
    title: "Fractera Memory — self-hosted memory engine for AI agents",
  },
  toc: { heading: "On this page", label: "Contents" },
  hero: {
    badges: ["No metered per-request fees", "Zero vendor lock-in", "Full privacy on your server"],
    body:
      "The engine ingests raw, unstructured real-world input — text, images, voice notes, video, whole PDF documents, Markdown and HTML pages, source code, links, and spatial-temporal coordinates and dates — and turns it into an indexed knowledge graph and structured relational stores. One short model call per request understands what is meant; after it the tables and the graph answer without further model turns, and a request with no question costs no model call at all.",
    eyebrow: "Fractera Memory Starter",
    lead:
      "An autonomous, self-hosted long-term memory engine and the cognitive core for AI agents. Built to work as the architect's personal command centre through Telegram and a unified REST API, it closes the gap between a volatile context window and real cognitive continuity.",
    primary: "Read the API",
    secondary: "Open the passport",
    title: "The deterministic, multimodal memory engine for autonomous AI agents",
  },
  install: {
    body:
      "One run of the Fractera installer robot on your own server brings up every microservice of the platform, memory included — nginx, certificates and the access key are arranged for you. There is nothing to assemble by hand.",
    lead: "There is exactly one thing to know about installing this.",
    title: "Installation",
  },
  ladder: {
    "title": "How memory handles a request",
    "lead": "Everything below is described as finished, so it is clear what memory does and how to build it. What is still in development is marked with an asterisk and explained in the notes.",
    "phases": [
      {
        "title": "Input: what the caller sent",
        "items": [
          {
            "text": "Required: who is speaking (who) and the person's phrase (text).",
            "plan": "understand-incoming-request"
          },
          {
            "text": "The verb — optional.",
            "items": [
              {
                "text": "With a verb, the request comes to /v1/remember (add) or /v1/recall (retrieve).",
                "plan": "understand-incoming-request"
              },
              {
                "text": "Without one, it comes to a single address and memory decides itself*¹.",
                "plan": "understand-incoming-request"
              }
            ],
            "plan": "understand-incoming-request"
          },
          {
            "text": "Features from the registry — optional, for both verbs.",
            "items": [
              {
                "text": "A list of key and value; keys come from GET /v1/features.",
                "plan": "use-feature-registry"
              },
              {
                "text": "Retrieval accepts them as well as writing*².",
                "plan": "use-feature-registry"
              }
            ],
            "plan": "use-feature-registry"
          },
          {
            "text": "Links to earlier messages — optional.",
            "items": [
              {
                "text": "The caller names earlier messages by their numbers in memory's journal*³.",
                "plan": "link-related-messages"
              },
              {
                "text": "Or sends a reasoning thread (thread), earlier turns (history) and what was already found (prior).",
                "plan": "link-related-messages"
              }
            ],
            "plan": "link-related-messages"
          },
          {
            "text": "Calendar and geotag — optional: when it happened and where (at, lat, lon, radius_m, place)*⁹.",
            "plan": "use-scope-calendar-and-place"
          }
        ],
        "plan": "understand-incoming-request"
      },
      {
        "title": "Preliminary phase: memory works out what was not sent",
        "items": [
          {
            "text": "The verb, the features and the links were all sent — no model is called at all.",
            "plan": "understand-incoming-request"
          },
          {
            "text": "Something is missing — one model call covers everything missing at once, with no conversation kept*⁴.",
            "items": [
              {
                "text": "The model receives the phrase and candidates: the 8 registry features closest in meaning, and this person's latest messages closest in meaning and time*³.",
                "plan": "understand-incoming-request"
              },
              {
                "text": "It returns the verb, the features with values, the numbers of related messages, and what the registry lacks.",
                "plan": "understand-incoming-request"
              },
              {
                "text": "Code checks all of it: the verb is one of two; every key is among the candidates and every value has the right type; the message numbers exist and belong to this person.",
                "plan": "understand-incoming-request"
              }
            ],
            "plan": "understand-incoming-request"
          },
          {
            "text": "A meaning the registry does not have yet.",
            "items": [
              {
                "text": "An existing kind that fits the meaning is reused — records stay different from each other*⁴.",
                "skills": [
                  "use-knowledge-graph"
                ]
              },
              {
                "text": "Nothing fits — memory creates a new kind by the column-or-table rules: a column for a single value, a table when a second value is added or the thing will grow.",
                "plan": "use-feature-registry"
              },
              {
                "text": "The registry catches up: a kind without a feature is work for the development agent, who adds the feature in a step*⁵.",
                "plan": "use-feature-registry"
              }
            ],
            "plan": "use-feature-registry"
          }
        ],
        "plan": "understand-incoming-request"
      },
      {
        "title": "Main phase: two scenarios and the learning loop",
        "items": [
          {
            "text": "Adding a record — in order",
            "items": [
              {
                "text": "Receiving the message",
                "items": [
                  {
                    "text": "The message gets a number in the journal of incoming messages — a phrase, a file, a link or a video — with who sent it, from where (API, Telegram, the stand) and when*⁸.",
                    "plan": "keep-incoming-journal"
                  },
                  {
                    "text": "Its scope is recorded alongside: the calendar — when the thing it is about happened, not when it arrived; the geotag — latitude, longitude, radius and place; every mark names its source — said by the person, taken from the file, sent by the device, or inferred. An empty scope means «I don't know where or when», never «everywhere, always»*⁹.",
                    "plan": "use-scope-calendar-and-place"
                  },
                  {
                    "text": "A link to earlier messages is recorded as «this message → that message»*³.",
                    "plan": "link-related-messages"
                  }
                ],
                "plan": "keep-incoming-journal"
              },
              {
                "text": "Attachments become objects — every file, link and video: all four records, or none",
                "items": [
                  {
                    "text": "Reading goes by kind: audio — whisper-1 transcription, then a description; video — the sound track and six frames; image, PDF, Markdown, HTML, text — the model reads the whole file; source code — analysed, never run; a web page — the AI browser; a YouTube video — the official YouTube API.",
                    "skills": [
                      "describe-incoming-object",
                      "use-links"
                    ]
                  },
                  {
                    "text": "A full description is born — enough to rebuild the object from text — and a summary of about 50 words, with a title, tags and anchors; a model answer of the wrong shape is refused whole.",
                    "skills": [
                      "describe-incoming-object"
                    ]
                  },
                  {
                    "text": "Record 1 — the object with its full description goes to the object store; an id comes back.",
                    "skills": [
                      "describe-incoming-object",
                      "use-object-store"
                    ]
                  },
                  {
                    "text": "Record 2 — a search card (title and summary) goes to the vector store, collection memory-objects.",
                    "skills": [
                      "describe-incoming-object"
                    ]
                  },
                  {
                    "text": "Record 3 — a graph document: description, tags, id, summary and an origin line «where this is known from».",
                    "skills": [
                      "describe-incoming-object"
                    ]
                  },
                  {
                    "text": "Record 4 — the journal row links the three. If any step fails, what was written is rolled back; the row stays with status failed and the reason.",
                    "skills": [
                      "describe-incoming-object"
                    ]
                  }
                ],
                "skills": [
                  "describe-incoming-object",
                  "use-links"
                ]
              },
              {
                "text": "Values about the person — tables",
                "items": [
                  {
                    "text": "First, what is already known: which kinds exist and which of them are already tables.",
                    "skills": [
                      "use-tables"
                    ]
                  },
                  {
                    "text": "The kind and its form are chosen from the feature registry and its 8 candidates, not from the whole schema*⁴; when a fitting kind exists, its name is taken letter for letter*⁵.",
                    "plan": "use-feature-registry"
                  },
                  {
                    "text": "Every value carries its origin: said by the person, or inferred with its grounds; an inference without grounds is refused.",
                    "skills": [
                      "use-tables"
                    ]
                  },
                  {
                    "text": "The depth rule: a table may hold attributes of the person himself (depth 0) and of entities with a direct edge to him — a daughter, a friend, my car (depth 1); attributes of someone else's entity — Misha's car, Denis's service — go only to the graph, with an anchor. Age is never stored, the year of birth is.",
                    "plan": "use-tables — add the depth rule"
                  },
                  {
                    "text": "When a column is added: the kind exists and has no value — the value goes into its column; the kind does not exist — the root table gains three columns: the value, «said or inferred», and the grounds. A kind's name is a phrase of at least four English words saying whose it is and what it is.",
                    "skills": [
                      "use-tables"
                    ]
                  },
                  {
                    "text": "A second value of the same kind: a correction («not Madrid, Barcelona») replaces the value, the old one goes to history; an addition («and Anya too») gives birth to a table for the kind — the first value moves into it as the first row with its own original time, and the column is left empty on purpose; unclear — both are kept as an addition, and the answer says so.",
                    "skills": [
                      "use-tables"
                    ]
                  },
                  {
                    "text": "When a table is born at once: when what arrived will keep growing — a friend is a name, a teammate has a role and tomorrow a schedule; or when the caller demands it (need_table). Raising the form loses nothing, lowering it always loses — so when in doubt, the form grows.",
                    "skills": [
                      "use-tables"
                    ]
                  },
                  {
                    "text": "Exact and countable values accumulate within their scope: taxi rides in Madrid never add up with those in London*¹⁰.",
                    "plan": "use-scope-calendar-and-place"
                  }
                ],
                "skills": [
                  "use-tables"
                ]
              },
              {
                "text": "The knowledge graph — everything said",
                "items": [
                  {
                    "text": "The document of the phrase opens with its introduction: the person's name rather than a technical key, the channel, first-level anchors, feature keys; no service words — the graph turns everything written there into entities.",
                    "skills": [
                      "use-knowledge-graph"
                    ]
                  },
                  {
                    "text": "The document carries pointers to the table rows where the values landed.",
                    "skills": [
                      "use-knowledge-graph"
                    ]
                  },
                  {
                    "text": "What stayed only in the graph is listed, each with its reason.",
                    "skills": [
                      "use-knowledge-graph"
                    ]
                  },
                  {
                    "text": "A record without an anchor is refused: it would exist and be unreachable.",
                    "skills": [
                      "use-knowledge-graph"
                    ]
                  }
                ],
                "skills": [
                  "use-knowledge-graph"
                ]
              },
              {
                "text": "The result of the write goes into the answer and into memory's work journal: what landed where, what was refused and why, whether a model was called.",
                "plan": "compose-memory-answer"
              }
            ],
            "skills": [
              "use-tables",
              "use-knowledge-graph",
              "describe-incoming-object"
            ]
          },
          {
            "text": "Retrieving from memory",
            "items": [
              {
                "text": "Related messages narrow the search: their anchors and features join the question*³.",
                "plan": "link-related-messages"
              },
              {
                "text": "A named feature is answered from the table; sums are computed by code.",
                "skills": [
                  "use-tables",
                  "use-depth-ladder"
                ]
              },
              {
                "text": "Nothing in the table — names from the question are looked up in the graph, which answers about the links with no model call.",
                "skills": [
                  "use-knowledge-graph"
                ]
              },
              {
                "text": "depth: deep — semantic search in the vector store, when the words of the question and of the record differ*⁶.",
                "skills": [
                  "use-vector-store"
                ]
              },
              {
                "text": "depth: extreme — bounded research of up to 10 minutes: hypotheses from the graph, the vectors and the model's knowledge of the world*⁶.",
                "plan": "run-bounded-research"
              },
              {
                "text": "Nothing found — «I don't know», with what is missing.",
                "skills": [
                  "use-depth-ladder"
                ]
              },
              {
                "text": "A request with no question returns everything known about the person, with no model.",
                "skills": [
                  "use-tables"
                ]
              }
            ],
            "skills": [
              "use-depth-ladder"
            ]
          },
          {
            "text": "The learning loop — an expensive result becomes cheap knowledge",
            "items": [
              {
                "text": "When it runs: after deep research (deep, extreme)*⁶, and after a computation over tables whose answer is a document — «how much did we earn in May–August, in detail»*¹¹.",
                "plan": "fold-back-learning-loop"
              },
              {
                "text": "One order for both cases",
                "items": [
                  {
                    "text": "The result is obtained — by research or by computation.",
                    "plan": "fold-back-learning-loop"
                  },
                  {
                    "text": "An artefact — a document, a table, an image — goes to the object store; an id comes back.",
                    "skills": [
                      "use-object-store"
                    ]
                  },
                  {
                    "text": "A text summary is born: what came out and where the detail lies.",
                    "plan": "fold-back-learning-loop"
                  },
                  {
                    "text": "The summary goes to the vector store; an id comes back.",
                    "plan": "fold-back-learning-loop"
                  },
                  {
                    "text": "The summary goes to the knowledge graph; an id comes back.",
                    "plan": "fold-back-learning-loop"
                  },
                  {
                    "text": "The link table of the entity the question was about is updated, if such a table exists; this step is the last and may be skipped.",
                    "plan": "fold-back-learning-loop"
                  },
                  {
                    "text": "The summary and the id go out, and a repeated question is answered from the cheap steps*⁷.",
                    "plan": "fold-back-learning-loop"
                  }
                ],
                "plan": "fold-back-learning-loop"
              },
              {
                "text": "Denial of a conclusion — a separate input (deny)",
                "items": [
                  {
                    "text": "It runs an extra loop: the earlier summary is extended with «the architect rejected this hypothesis»*¹².",
                    "plan": "fold-back-learning-loop"
                  },
                  {
                    "text": "The conclusion is cancelled, not the fact: «Denis served in the regiment» stays, «so he knew the president» is refuted.",
                    "plan": "fold-back-learning-loop"
                  },
                  {
                    "text": "The refuted hypothesis is kept, not deleted — otherwise the same chain leads to the same conclusion again.",
                    "plan": "fold-back-learning-loop"
                  }
                ],
                "plan": "fold-back-learning-loop"
              },
              {
                "text": "Patterns the model works out in the loop become skill candidates and are tested in the shadow against the current skill: an untested pattern is a habit, not knowledge.",
                "plan": "evolve-skill-in-shadow"
              }
            ],
            "plan": "fold-back-learning-loop"
          }
        ],
        "skills": [
          "use-tables",
          "use-knowledge-graph",
          "describe-incoming-object",
          "use-depth-ladder"
        ]
      },
      {
        "title": "Final phase: the answer",
        "items": [
          {
            "text": "For both scenarios: ok, what_happened, text, objects; which verb was executed and who decided it — the caller or memory*¹; the fate of every feature — taken from the caller, found by memory, or rejected with a reason; which messages the request is linked to*³.",
            "plan": "compose-memory-answer"
          },
          {
            "text": "For a write: where things landed (kept_whole), whether a model was called (used_model), the reasoning thread (thread).",
            "plan": "compose-memory-answer"
          },
          {
            "text": "For a read: how it was found (found_by), the depth reached (depth_used), what is missing (not_yet_known), the reasoning chain on want_chain.",
            "plan": "compose-memory-answer"
          }
        ],
        "plan": "compose-memory-answer"
      }
    ],
    "notesTitle": "* In development — what exists today and what remains to build",
    "notes": [
      {
        "mark": "*¹",
        "text": "A request without a verb. Today the verb is set only by the address. The parse already returns an action field, but nothing is routed by it. To build: a single address in the contract, routing by action, and an answer field saying which verb and who decided."
      },
      {
        "mark": "*²",
        "text": "Features on retrieval. Today only writing accepts features. To build: the parameter on recall, and skipping the model call when features are sent."
      },
      {
        "mark": "*³",
        "text": "Links to messages. Today the journal can link one message to another, but only saving a link uses it (a snippet is linked to its page); thread, history and prior do not point at specific stored messages. To build: message numbers in the contract, candidates from the journal by meaning and time, links for every phrase, and their use when reading."
      },
      {
        "mark": "*⁴",
        "text": "One call for all three determinations. Today the call determines only features, and in two ways: writing shows the model every kind in the registry, reading shows 8 candidates. To build: one shared parse for both verbs, with candidate features and messages."
      },
      {
        "mark": "*⁵",
        "text": "The registry catches up. Today kinds without a feature are visible only to a probe; 27 kinds created by the model wait for their features. To build: the list on the panel page and features added by development steps."
      },
      {
        "mark": "*⁶",
        "text": "Depth deep and extreme. Today both are declared in the contract, and reading stops at the graph. To build: the vector store inside reading, and bounded research with its reasoning chain."
      },
      {
        "mark": "*⁷",
        "text": "Keeping an expensive answer. Today the agent can keep an answer object (keep_object), but reading does not keep its own result. To build: the result of extreme research kept as an object, a vector card and a graph document."
      },
      {
        "mark": "*⁸",
        "text": "A journal row for every message. Today only files and links get a row in the journal of incoming messages; a plain phrase is written only to memory's work journal. To build: a journal row for every phrase, as the first record."
      },
      {
        "mark": "*⁹",
        "text": "The scope of a phrase and search by place. Today the scope columns and the coordinate index exist on an object's row; a phrase's scope goes only into the model prompt, and reading uses coordinates nowhere. To build: scope in the journal row of every phrase, and radius search when reading."
      },
      {
        "mark": "*¹⁰",
        "text": "Accumulation within scope. Today a sum is computed over all rows of a feature, with no scope. To build: sums and histories grouped by scope."
      },
      {
        "mark": "*¹¹",
        "text": "The learning loop after a computation. Today only the agent can keep an answer object (keep_object); reading does not assemble a document over tables and does not run the loop. To build: assembling the document and running the loop after it."
      },
      {
        "mark": "*¹²",
        "text": "Denial of a conclusion. Today deny works only inside the same reasoning thread: the person's words go into the model prompt; the earlier summary is not extended and the refuted hypothesis is not kept separately. To build: recording the refutation next to the hypothesis, and extending the summary."
      }
    ],
    "skillLabels": {
      "have": "Skill:",
      "plan": "Skill to be created:"
    }
  },
  media: {
    items: [
      { body: "Speech-to-text by OpenAI whisper-1, with a timestamp on every segment.", title: "Audio" },
      { body: "Read by a vision model: every element, its position, colours and all visible text.", title: "Images" },
      { body: "The sound track is transcribed and six frames are read — one timeline, frames between the lines.", title: "Video" },
      { body: "The document is read whole: its structure and its content, tables row by row.", title: "PDF" },
      { body: "Markdown is kept as the document it renders into; HTML as a page and as its source.", title: "Markdown and HTML" },
      { body: "Source code is described — purpose, structure, exports — with the source verbatim, and never run.", title: "Source code" },
      { body: "A link is opened by a real browser; a YouTube video is read by the official API — description, structure, chapters and the page snippet. The whole text and the final HTML are not stored.", title: "Links and YouTube" },
    ],
    lead: "Not a preprocessor bolted on the side. The pipeline lives inside the engine.",
    title: "Native multimodality",
  },
  memoization: {
    chain: [
      "An expensive computation or research loop runs at the deep levels",
      "An artifact is created with its ID, alongside a concise conclusion",
      "The conclusion is indexed into the vector store, the knowledge graph and the tables",
      "The repeat question is then answered from the cheap levels",
    ],
    building:
      "Today: an agent can keep an answer as an object itself (keep_object), and everything kept is searchable by meaning. In development: reading that folds its own expensive result back — the artifact, its summary, the vector card and the graph document. Until then a repeat question costs the same one short model call as the first.",
    lead: "The design rule: nothing expensive is paid for twice. Every high-cost chain is folded back down into the cheaper tiers.",
    title: "The memoization loop",
  },
  principles: {
    items: [
      {
        body: "All data, graphs and media stay strictly on your machine. No telemetry, no hidden cloud dependency.",
        title: "Complete data ownership",
      },
      {
        body:
          "What a person stated is logged as fact (said); what the engine inferred is flagged as hypothesis (guess) and stored only with its evidence (basis).",
        title: "Fact attribution",
      },
      {
        body:
          "Connect the official Telegram starter, or attach your own web chat, mobile app and automation pipelines over HTTP. The bundled console is a microservice of its own, and it is optional.",
        title: "Headless engine architecture",
      },
    ],
    title: "Design principles",
  },
  problem: {
    body:
      "Fractera Memory works as a black box engine: in go multimodal input and runtime context parameters, out come structured objects, synthesised data, verified conclusions or actionable reports. One architecture unifies four storage layers behind one entry point that first names what a request means, then lets code decide where to write and where to read.",
    lead:
      "Standard RAG pipelines and vector stores make agents lose critical context at every session reset, burn compute re-reading long logs, and never synthesise personal experience over time.",
    title: "The architect's operating system",
  },
  router: {
    "cheapBranch": "1.0 Adding a record · the table for the exact, the graph for everything said",
    "cheapCost": "No further model turns: code checks values and writes rows; the graph builds its links in the background",
    "deepBranch": "2.0 Retrieving · table → graph → vectors (deep) → research (extreme)*⁶",
    "deepCost": "The table and the graph answer with no model turn; deep and extreme spend more time and model turns",
    "inbox": "Incoming stream — text, geolocation, voice, images, video, PDF, Markdown, HTML, code, links, dates",
    "lead": "One entry point, four phases: what the caller sent, what memory works out itself, one of two scenarios, the answer.",
    "routerBox": "Preliminary phase: one model call works out the verb, the features and related messages — only what the caller did not send*⁴",
    "title": "How a request travels"
  },
  schema: {
    body:
      "No manual migrations, no static schema design. The engine adapts its schema on the fly — adding columns, and generating fully typed relational SQL tables whenever new structured entities and relationships appear.",
    title: "End-to-end schema adaptability",
  },
  scope: {
    items: [
      {
        body: "An empty spatial-temporal scope means «location and time unknown» — never «everywhere and always».",
        title: "The strict boundary rule",
      },
      {
        body:
          "«Which taxi service do I usually use here?» asked in Madrid returns Madrid knowledge, and never collides with or overwrites the same question answered in London.",
        title: "Context isolation",
      },
      {
        body:
          "Coordinates are validated as a pair and against the bounds of the planet: a lone latitude is half a point, and 200 degrees of longitude is a typo that would otherwise become knowledge.",
        title: "Coordinates checked, not trusted",
      },
    ],
    building:
      "Today: a scope entry — date, place, lat, lon, radius_m — is accepted, validated and stored with a record, and an index over the coordinates exists. In development: recall by radius («what do I know within 500 m of this point») and totals and life cycles grouped by scope. Until then, reading does not use the coordinates.",
    lead: "Time and coordinates are first-class fields here, not flat text tags.",
    title: "Spatial-temporal context",
  },
  stores: {
    items: [
      { body: "Tabular structures, typed facts, exact entity properties.", title: "Relational store" },
      { body: "High-dimensional semantic embeddings for fuzzy similarity search.", title: "Vector store" },
      { body: "Directional links between entities, people and events.", title: "Knowledge graph" },
      { body: "Whole files on your server — images, audio, video, PDF, Markdown, HTML, code — each next to its full description.", title: "Object store" },
    ],
    lead: "Four layers, one contract. The caller never learns which of them answered.",
    title: "Four unified storage tiers",
  },
};

const RU: LandingWords = {
  api: {
    building:
      "Два примера ниже заглядывают дальше, чем память доходит сегодня: охват вопроса принимается, но поиск ещё не использует координаты, а глубина «deep» останавливается на графе знаний — ответ всегда называет depth_used, глубину, достигнутую на деле.",
    lead: "Один REST API, один ключ. Каждый пример ниже работает на живой службе как есть.",
    samples: [
      { code: CURL_REMEMBER_RU, title: "Сохранение голосовой заметки с координатами" },
      { code: CURL_RADIUS_RU, title: "Вопрос с местом, откуда он задан (поиск по радиусу в разработке)" },
      { code: CURL_DEEP_RU, title: "Просьба о глубине и цепочке поиска" },
    ],
    title: "Быстрый старт и примеры API",
  },
  features: {
    title: "Названные вещи, которые память понимает",
    lead:
      "Память записывает всё, что ей говорят, — есть у этого название или нет. Название (мы зовём его признаком) нужно не для записи, а для того, чтобы память умела с этим работать: считать, отвечать на вопрос в одно слово, знать, о чём переспросить человека, и показывать, кто на это опирается.",
    whyTitle: "Что даёт название — и больше ничего",
    why: [
      {
        title: "Считать и держать актуальным",
        body: "У названия сказано, как копятся значения: побеждает последнее, копится списком или складывается. Без него «сколько я потратил за месяц» нечего складывать — суммы лежат просто фразами.",
      },
      {
        title: "Одно слово вместо вызова модели",
        body: "Тот, кто и так знает, о чём речь, присылает название — и память не разбирает фразу заново. Ответ тот же, а ход модели сэкономлен.",
      },
      {
        title: "Знать, о чём вас переспросить",
        body: "В названии записано, что делать, когда значения нет: спросить, спросить позже или промолчать, — и пример хорошего ответа. Без этого память может только молчать о том, чего ей не хватает.",
      },
      {
        title: "Видеть, кто на это опирается",
        body: "Части проекта подписываются на названия, которыми пользуются. Меняете или снимаете — заранее видно, чью работу это сломает, а не после того, как сломалось.",
      },
    ],
    caseTitle: "Как это выглядит на деле",
    cases: [
      {
        q: "«Меня зовут Рома» — названия никто не присылал",
        a: "Память разбирает фразу сама одним коротким вызовом модели, записывает и потом об этом отвечает. Чтобы запомнить, название не нужно.",
      },
      {
        q: "Бот прислал значение вместе с названием",
        a: "Вызова модели нет вовсе: память проверяет, что такое название есть и значение ему по типу, и записывает. Это самый дешёвый путь из возможных.",
      },
      {
        q: "«Сколько я потратил на такси за месяц?»",
        a: "Сложить можно только то, у чего есть название и сказано, что оно складывается. Это самый наглядный случай, где название — разница между ответом и разведёнными руками.",
      },
      {
        q: "«Чем я кормлю собаку?» — записано, но не названо",
        a: "Сегодня память это хранит и по вопросу не находит: поиск идёт только по названиям. Ровно это и исправляется — см. пометку ниже.",
      },
    ],
    useTitle: "Как названиями пользуются",
    use: [
      "Присылать название всегда необязательно. Без него память делает ту же работу сама — дольше и на один ход модели дороже, но тем же качеством.",
      "Название означает смысл, а не место: где лежит значение — дело памяти, и форма меняется по мере того, как вещь растёт.",
      "Присланное название проверяют, а не принимают на веру: неизвестное вернётся вместе с ближайшими, которые у памяти есть, снятое — с заменой, а значение не того типа не примут.",
      "Отсутствие названия никогда не прячет ваши данные: память пишет свободно — значит и прочитать обязана всё, что записала.",
    ],
    addTitle: "Как появляется новое название",
    add: [
      "Вы сказали новое — память сама завела под это место, ещё без названия. Это нормальное состояние, а не ошибка.",
      "Когда вещь перестала быть случайной — повторяется, копится или о ней уже спрашивали, — память предлагает название и черновик всего, что к нему нужно: тип, как копится, какими словами об этом говорят, пример.",
      "Человек его утверждает, и с этого момента вещь можно считать, спрашивать одним словом и подписываться на неё. Названия живут файлами в репозитории: любая правка видна и откатывается.",
    ],
    building:
      "В разработке: чтение всего записанного, а не только названного (сегодня вопрос отвечается только через названия, и записанное без названия по нему не находится), и предложение новых названий самой памятью. Пока и то и другое не построено, название решает ещё и что вообще можно достать, — поэтому список безымянного держится на виду.",
  },
  artifacts: {
    building:
      "Сегодня: документ собирает агент и отдаёт памяти рукой keep_object — он возвращается по идентификатору, с файлом, описанием и саммари. В разработке: чтение, которое само собирает документ по таблицам и отдаёт саммари рядом с артефактом.",
    lead:
      "Память не просто пишет текстом цифры или факты. При запросах на сведение данных — отчёт по финансам, состояние проекта — система:",
    steps: [
      "Автоматически создаёт сущность или таблицу с теми колонками, которые нужны ответу.",
      "Собирает, сортирует и сводит Markdown-структуру, присваивая уникальный ID артефакта.",
      "Отдаёт короткое резюме вместе с готовым объектом: ответ читается, подробность остаётся адресуемой.",
    ],
    title: "Материализация знаний и генерация отчётов",
  },
  bench: {
    items: [
      "Выполнять прямые запросы к ядру памяти без единой прослойки интерфейса.",
      "Видеть сырой JSON ответа, время исполнения и точный расход токенов модели.",
      "Проверять форму тела запроса раньше, чем написана первая строка клиента.",
    ],
    lead:
      "Память поставляется с интерактивным стендом. Это не демонстрационная страница: здесь интеграция доказывается до того, как её пишут.",
    title: "Проверка на встроенном стенде",
    where: "/{язык}/settings?section=memory-test",
  },
  cta: {
    body:
      "Полный замысел — в паспорте: документе, написанном раньше кода и с тех пор идущем с ним в ногу.",
    primary: "Открыть паспорт",
    secondary: "Открыть стенд",
    title: "Посмотреть, как это устроено",
  },
  comparison: {
    feature: "Возможность",
    lead:
      "Два сравнения: с категориями инструментов памяти и с готовым ассистентом другой философии.",
    ours: "Fractera Memory",
    tables: [
      {
        rivals: ["Обычные RAG-фреймворки", "MemGPT / Letta", "Mem0 / Zep"],
        rows: [
          {
            feature: "Архитектура хранения",
            ours: "Гибрид: граф + вектор + реляционное + объектное",
            rivals: ["Только векторная база", "Реляционное / текстовые файлы", "Вектор плюс простой граф"],
          },
          {
            feature: "Чтение за ноль токенов",
            ours: "Только запрос без вопроса; любое другое чтение стоит одного короткого вызова модели",
            rivals: ["Нет", "Нет", "Частично"],
          },
          {
            feature: "Родная мультимодальность",
            ours: "Встроена: звук, видео, изображения, PDF, Markdown, HTML, исходный код, ссылки и YouTube",
            rivals: ["Нужны внешние парсеры", "Нужны внешние парсеры", "Ориентирован на текст"],
          },
          {
            feature: "Пространственный индекс",
            ours: "lat/lon и radius_m хранятся и проверяются у каждой записи; поиск по радиусу в разработке",
            rivals: ["Только совпадение по тексту", "Только через вызов функций", "Простые метаданные"],
          },
          {
            feature: "Эволюция навыков",
            ours: "A/B-тестирование «чемпион против претендента» — замысел опубликован, в разработке",
            rivals: ["Нет", "Ручная правка промптов", "Нет"],
          },
          {
            feature: "Свой сервер и открытый код",
            ours: "100% на вашем железе, один узел",
            rivals: ["По-разному", "Да", "Freemium / облако"],
          },
        ],
        title: "Против категорий",
      },
      {
        rivals: ["IVA Agent (smixs/iva-agent)"],
        rows: [
          {
            feature: "Назначение",
            ours: "Автономное ядро памяти за API — для любых интерфейсов",
            rivals: ["Готовый Telegram-ассистент с заметочником в Obsidian"],
          },
          {
            feature: "Модульность",
            ours: "Изолированный микросервис; Telegram-бот — опциональный клиент",
            rivals: ["Монолит: Telegram, юзербот и управление хранилищем в одном коде"],
          },
          {
            feature: "Управление расходами",
            ours: "Один короткий вызов модели по 8 кандидатам реестра, а не по всей схеме; таблица и граф отвечают без дальнейших ходов модели",
            rivals: ["Каждая операция опирается на вызовы модели, BM25 и векторы"],
          },
          {
            feature: "Работа с данными",
            ours: "Авто-создание SQL-таблиц, артефакты-отчёты с ID, граф связей",
            rivals: ["Markdown-карточки в папку для синхронизации Obsidian"],
          },
          {
            feature: "Гибкость подключения",
            ours: "Десятки интерфейсов одновременно через один REST API",
            rivals: ["Привязан к одному аккаунту Telegram и настройке Obsidian"],
          },
        ],
        title: "Против готового ассистента",
      },
    ],
    title: "Сравнительный анализ",
  },
  evolution: {
    items: [
      {
        body:
          "Модель не оценивает свою работу сама. Вердикт выносится снаружи — на основе оценок архитектора и анализа затрат.",
        title: "Запрет на самооценку",
      },
      {
        body:
          "Претендент заменяет чемпиона только тогда, когда выигрывает по качеству и не уступает по стоимости и скорости.",
        title: "Продвижение по правилам",
      },
      {
        body:
          "Каждая правка фиксируется коммитом. В любой момент доступен сброс до эталонной первой версии через git, без потери накопленных данных.",
        title: "Страховка и версионность",
      },
    ],
    building:
      "Ещё не построено — это замысел, опубликованный, чтобы его можно было проверить до того, как он написан. Сегодня: навыки — файлы репозитория, каждая правка ложится коммитом, вердикты о ответах собираются от людей на встроенном стенде. В разработке: факты прогона как данные, навык-претендент, теневой прогон и правило продвижения.",
    lead:
      "Если память фиксирует повторяющиеся промахи, она создаёт альтернативную версию навыка и запускает её претендентом в тени — на реальном трафике, пока человек получает ответы от проверенного чемпиона.",
    title: "Эволюция навыков с A/B сплит-тестированием",
  },
  faq: {
    items: [
      {
        a: "Почти каждый — и ровно одного короткого вызова. Чтобы понять, что имеет в виду человек, память делает один вызов модели по 8 признакам-кандидатам из реестра, без сохранения разговора. Дальше таблица и граф отвечают без новых ходов модели, а суммы считает код. Вовсе без модели отвечается только запрос без вопроса. Ответ называет depth_used — глубину, достигнутую на деле.",
        q: "Каждый запрос стоит токенов?",
      },
      {
        a: "Принимает — и пока не ищет по ним. В записи охвата есть lat, lon и необязательный radius_m; пара проверяется по границам планеты и хранится вместе с записью, указатель по координатам построен. Поиск по радиусу — «что я знаю в 500 метрах отсюда» — в разработке, и до него координаты вопроса при поиске не используются. Пустой охват всегда значит «не знаю где и когда», а не «везде и всегда».",
        q: "Умеет ли она отвечать про место по координатам, а не по слову?",
      },
      {
        a: "Голосовые заметки, изображения, видео, PDF, Markdown, HTML, исходный код (TypeScript, Python, SQL и другие), ссылки на веб-страницы и ролики YouTube. Каждый файл получает полное описание — настолько подробное, что другой ИИ восстановит по нему сам объект, — и саммари примерно в 50 слов: речь расшифровывает OpenAI whisper-1 с метками времени, видео разбирается на звуковую дорожку и кадры на одной шкале, а картинки, документы, страницы и код читает Claude — код при этом никогда не запускается. Оригинал остаётся во встроенном объектном хранилище рядом со своим полным описанием и адресуется из ответа по id.",
        q: "Что можно присылать, кроме текста?",
      },
      {
        a: "Никакую. Вы присылаете фразу. Память добавляет колонки, когда появляются новые роды фактов, и порождает типизированные таблицы, когда род вырастает в сущность. Миграции писать не нужно.",
        q: "Какую схему нужно спроектировать заранее?",
      },
      {
        a: "По замыслу результат замыкается обратно: артефакт — в объектное хранилище, саммари — в векторную базу и граф знаний, таблицы связей обновляются, и тот же вопрос потом отвечается с дешёвых ступеней. Сегодня этот цикл ведётся снаружи: агент сохраняет ответ объектом рукой keep_object, и сохранённое находится по смыслу. Само чтение свой результат ещё не возвращает в оборот, и глубокие ступени тоже в разработке — ответ всегда называет depth_used, глубину, достигнутую на деле.",
        q: "Что происходит после дорогого исследования?",
      },
      {
        a: "Замысел — чемпион и претендент: вторая версия навыка идёт в тени на реальном трафике, пока человеку отвечает работающая, а для продвижения нужен внешний вердикт без проседания по цене — оценивать свою работу самой памяти запрещено. Эта часть ещё не построена. Сегодня навыки — файлы репозитория, каждая правка ложится коммитом и откатывается им же, а вердикты об ответах собираются от людей на встроенном стенде.",
        q: "Как она улучшает себя, не ломая работающее?",
      },
      {
        a: "Любой HTTP-клиент: Telegram-бот, веб-чат, мобильное приложение, фоновая задача. Вместе с памятью идёт и её собственная консоль, уже подключённая, и она при этом опциональна: путь API от неё не зависит.",
        q: "Что к ней можно подключить?",
      },
      {
        a: "На вашем сервере, в вашей базе, в вашем объектном хранилище, за ключом, который отзывается одним нажатием. Ни платного посредника, ни телеметрии наружу.",
        q: "Где живут мои данные?",
      },
    ],
    lead: "Короткие ответы на то, о чём спрашивают до интеграции.",
    title: "Вопросы и ответы",
  },
  project: {
    body:
      "Fractera Memory — один из микросервисов платформы Fractera, инженерной инфраструктуры для автономных агентов. Весь проект, включая эту память, с открытым исходным кодом.",
    label: "Проект Fractera на GitHub",
  },
  seo: {
    description:
      "Автономная память для ИИ-агентов на вашем сервере: граф знаний, векторное и реляционное хранилища, встроенное объектное хранилище, охват записи с координатами и датой, приём голоса, изображений, видео, PDF, Markdown, HTML, исходного кода и ссылок, один короткий вызов модели на запрос по реестру признаков. Один REST API, открытый код.",
    title: "Fractera Memory — автономная память для ИИ-агентов на вашем сервере",
  },
  toc: { heading: "На этой странице", label: "Оглавление" },
  hero: {
    badges: ["Ноль комиссий за запрос", "Ноль зависимости от поставщика", "Полная приватность на вашем сервере"],
    body:
      "Память превращает необработанные мультимодальные данные — текст, изображения, голосовые заметки, видео, PDF-документы, страницы Markdown и HTML, исходный код, ссылки, геолокацию и временные метки — в индексированный граф знаний и реляционные структуры. Один короткий вызов модели на запрос понимает, о чём речь; дальше отвечают таблицы и граф без новых ходов модели, а запрос без вопроса не стоит вызова вовсе.",
    eyebrow: "Fractera Memory Starter",
    lead:
      "Автономная система долгосрочной памяти и когнитивный мозг для ИИ-агентов, служащая персональным пультом управления архитектора через Telegram и REST API. Она ликвидирует разрыв между ограниченным контекстным окном модели и полноценной когнитивной непрерывностью.",
    primary: "Читать API",
    secondary: "Открыть паспорт",
    title: "Детерминированное мультимодальное ядро памяти для автономных ИИ-агентов",
  },
  install: {
    body:
      "Один запуск робота-установщика Fractera на вашем сервере поднимает все микросервисы платформы, включая память: nginx, сертификаты и ключ доступа настраиваются за вас. Собирать руками нечего.",
    lead: "Про установку нужно знать ровно одно.",
    title: "Установка",
  },
  ladder: {
    "title": "Как память обрабатывает запрос",
    "lead": "Всё ниже описано так, как будто уже построено, — чтобы было понятно, что память делает и как это строить. То, что ещё в разработке, отмечено звёздочкой и объяснено в сносках.",
    "phases": [
      {
        "title": "Вход: что прислал зовущий",
        "items": [
          {
            "text": "Обязательное: кто говорит (who) и фраза человека (text).",
            "plan": "understand-incoming-request"
          },
          {
            "text": "Глагол — необязательно.",
            "items": [
              {
                "text": "С глаголом запрос приходит на /v1/remember (добавить) или /v1/recall (извлечь).",
                "plan": "understand-incoming-request"
              },
              {
                "text": "Без глагола — на один общий адрес, и память решает сама*¹.",
                "plan": "understand-incoming-request"
              }
            ],
            "plan": "understand-incoming-request"
          },
          {
            "text": "Признаки из реестра — необязательно, у обоих глаголов.",
            "items": [
              {
                "text": "Список «ключ — значение», ключи из GET /v1/features.",
                "plan": "use-feature-registry"
              },
              {
                "text": "Их принимает не только запись, но и чтение*².",
                "plan": "use-feature-registry"
              }
            ],
            "plan": "use-feature-registry"
          },
          {
            "text": "Связь с предыдущими сообщениями — необязательно.",
            "items": [
              {
                "text": "Зовущий называет прежние сообщения их номерами в журнале памяти*³.",
                "plan": "link-related-messages"
              },
              {
                "text": "Или присылает нить разбора (thread), прежние реплики (history) и уже найденное (prior).",
                "plan": "link-related-messages"
              }
            ],
            "plan": "link-related-messages"
          },
          {
            "text": "Календарь и геометка — необязательно: когда это произошло и где (at, lat, lon, radius_m, place)*⁹.",
            "plan": "use-scope-calendar-and-place"
          }
        ],
        "plan": "understand-incoming-request"
      },
      {
        "title": "Предварительная фаза: чего не прислали, память определяет сама",
        "items": [
          {
            "text": "Прислано всё — глагол, признаки и связи: модель не зовётся вовсе.",
            "plan": "understand-incoming-request"
          },
          {
            "text": "Чего-то не хватает — один вызов модели на всё недостающее сразу, без сохранения разговора*⁴.",
            "items": [
              {
                "text": "Модель получает фразу и кандидатов: 8 ближайших по смыслу признаков реестра и последние сообщения этого человека, ближайшие по смыслу и времени*³.",
                "plan": "understand-incoming-request"
              },
              {
                "text": "Возвращает глагол, признаки со значениями, номера связанных сообщений и то, чего в реестре нет.",
                "plan": "understand-incoming-request"
              },
              {
                "text": "Код проверяет всё: глагол — один из двух; ключ — из кандидатов, значение — нужного типа; номера сообщений существуют и принадлежат этому человеку.",
                "plan": "understand-incoming-request"
              }
            ],
            "plan": "understand-incoming-request"
          },
          {
            "text": "Смысл, которого в реестре ещё нет.",
            "items": [
              {
                "text": "Подходящий уже заведённый род берётся он — записи остаются разнородными*⁴.",
                "skills": [
                  "use-knowledge-graph"
                ]
              },
              {
                "text": "Не подходит ни один — память заводит новый род по правилам колонки и таблицы: колонка под одно значение, таблица, когда пришло второе значение-добавление или пришедшее будет расти.",
                "plan": "use-feature-registry"
              },
              {
                "text": "Реестр догоняет хранилище: род без признака — работа для агента разработки, который заводит признак шагом*⁵.",
                "plan": "use-feature-registry"
              }
            ],
            "plan": "use-feature-registry"
          }
        ],
        "plan": "understand-incoming-request"
      },
      {
        "title": "Основная фаза: два сценария и цикл дообучения",
        "items": [
          {
            "text": "Добавление записи — по порядку",
            "items": [
              {
                "text": "Приём сообщения",
                "items": [
                  {
                    "text": "Сообщение получает номер в журнале входящих — фраза, файл, ссылка или ролик — с тем, кто прислал, откуда (API, Telegram, стенд) и когда*⁸.",
                    "plan": "keep-incoming-journal"
                  },
                  {
                    "text": "Рядом записывается охват: календарь — когда произошло то, о чём сообщение, а не когда оно пришло; геометка — широта, долгота, радиус и место; у каждой метки назван источник — сказано человеком, взято из файла, пришло с устройства или выведено. Пустой охват значит «не знаю где и когда», а не «везде и всегда»*⁹.",
                    "plan": "use-scope-calendar-and-place"
                  },
                  {
                    "text": "Связь с прежними сообщениями записывается ссылкой «это сообщение → то сообщение»*³.",
                    "plan": "link-related-messages"
                  }
                ],
                "plan": "keep-incoming-journal"
              },
              {
                "text": "Вложения становятся объектами — каждый файл, ссылка и ролик: все четыре записи или ни одной",
                "items": [
                  {
                    "text": "Прочтение по роду: звук — расшифровка whisper-1 и описание; видео — звуковая дорожка и шесть кадров; изображение, PDF, Markdown, HTML, текст — модель читает файл целиком; исходный код — анализ без запуска; страница — ИИ-браузер; ролик — официальный API YouTube.",
                    "skills": [
                      "describe-incoming-object",
                      "use-links"
                    ]
                  },
                  {
                    "text": "Рождаются полное описание, по которому объект можно восстановить из текста, и саммари около 50 слов, а также название, теги и якоря; ответ модели неправильной формы отвергается целиком.",
                    "skills": [
                      "describe-incoming-object"
                    ]
                  },
                  {
                    "text": "Запись 1 — объект с полным описанием в объектное хранилище, получен идентификатор.",
                    "skills": [
                      "describe-incoming-object",
                      "use-object-store"
                    ]
                  },
                  {
                    "text": "Запись 2 — карточка поиска (название и саммари) в векторное хранилище, коллекция memory-objects.",
                    "skills": [
                      "describe-incoming-object"
                    ]
                  },
                  {
                    "text": "Запись 3 — документ графа: описание, теги, идентификатор, саммари и строка происхождения «откуда это известно».",
                    "skills": [
                      "describe-incoming-object"
                    ]
                  },
                  {
                    "text": "Запись 4 — строка журнала входящих связывает три предыдущие. Отказ любого шага откатывает записанное; строка остаётся со статусом failed и причиной.",
                    "skills": [
                      "describe-incoming-object"
                    ]
                  }
                ],
                "skills": [
                  "describe-incoming-object",
                  "use-links"
                ]
              },
              {
                "text": "Значения о человеке — таблицы",
                "items": [
                  {
                    "text": "Сначала — что о человеке уже известно: какие роды заведены и какие из них уже таблицы.",
                    "skills": [
                      "use-tables"
                    ]
                  },
                  {
                    "text": "Род и форма выбираются по реестру признаков и 8 кандидатам, а не по всей схеме*⁴; подходящий род уже есть — берётся его имя буква в букву*⁵.",
                    "plan": "use-feature-registry"
                  },
                  {
                    "text": "У каждого значения записано происхождение: сказал человек или выведено с основанием; вывод без основания отвергается.",
                    "skills": [
                      "use-tables"
                    ]
                  },
                  {
                    "text": "Правило глубины: в таблицу ложатся атрибуты самого человека (глубина 0) и сущностей с прямым ребром к нему — дочь, друг, моя машина (глубина 1); атрибуты чужой сущности — машина Миши, служба Дениса — только в граф, с якорем. Возраст не хранится, хранится год рождения.",
                    "plan": "use-tables — add the depth rule"
                  },
                  {
                    "text": "Когда добавляется колонка: род есть, а значения нет — значение ложится в его колонку; рода нет — у корневой таблицы появляются три колонки: значение, «сказал или вывел» и основание. Имя рода — фраза не короче четырёх английских слов о том, чьё это и что это.",
                    "skills": [
                      "use-tables"
                    ]
                  },
                  {
                    "text": "Второе значение того же рода: исправление («не Мадрид, а Барселона») заменяет значение, прежнее уходит в историю; добавление («и Аня тоже») рождает таблицу рода — прежнее значение переезжает в неё первой строкой со своим исходным временем, а колонка пустеет намеренно; если неясно — оба сохраняются как добавление, и ответ говорит это вслух.",
                    "skills": [
                      "use-tables"
                    ]
                  },
                  {
                    "text": "Когда таблица рождается сразу: если пришедшее будет расти — друг это имя, а у члена команды есть роль и завтра появится график; или по требованию зовущего (need_table). Повысить форму можно без потерь, понизить — всегда потеря, поэтому при сомнении форма растёт.",
                    "skills": [
                      "use-tables"
                    ]
                  },
                  {
                    "text": "Точное и счётное накапливается с учётом охвата: траты в Мадриде не складываются с лондонскими*¹⁰.",
                    "plan": "use-scope-calendar-and-place"
                  }
                ],
                "skills": [
                  "use-tables"
                ]
              },
              {
                "text": "Граф знаний — всё сказанное",
                "items": [
                  {
                    "text": "Документ фразы начинается вводной частью: имя человека, а не технический ключ, канал, якоря первого уровня, ключи признаков; служебных слов в ней нет — всё написанное там граф превращает в сущности.",
                    "skills": [
                      "use-knowledge-graph"
                    ]
                  },
                  {
                    "text": "В документе стоят указатели на строки таблиц, куда легли значения.",
                    "skills": [
                      "use-knowledge-graph"
                    ]
                  },
                  {
                    "text": "То, что осталось только в графе, перечислено с причиной у каждого пункта.",
                    "skills": [
                      "use-knowledge-graph"
                    ]
                  },
                  {
                    "text": "Запись без якоря отвергается: она существовала бы, но найти её было бы нельзя.",
                    "skills": [
                      "use-knowledge-graph"
                    ]
                  }
                ],
                "skills": [
                  "use-knowledge-graph"
                ]
              },
              {
                "text": "Итог записи — в ответ и в рабочий журнал памяти: что куда легло, что отвергнуто и почему, звалась ли модель.",
                "plan": "compose-memory-answer"
              }
            ],
            "skills": [
              "use-tables",
              "use-knowledge-graph",
              "describe-incoming-object"
            ]
          },
          {
            "text": "Извлечение из памяти",
            "items": [
              {
                "text": "Связанные сообщения сужают поиск: их якоря и признаки добавляются к вопросу*³.",
                "plan": "link-related-messages"
              },
              {
                "text": "Признак назван — ответ из таблицы, сумму считает код.",
                "skills": [
                  "use-tables",
                  "use-depth-ladder"
                ]
              },
              {
                "text": "В таблице нет — имена из вопроса ищутся в графе, и граф отвечает о связях без вызова модели.",
                "skills": [
                  "use-knowledge-graph"
                ]
              },
              {
                "text": "Глубина deep — поиск по смыслу в векторном хранилище, когда слова вопроса и записи разные*⁶.",
                "skills": [
                  "use-vector-store"
                ]
              },
              {
                "text": "Глубина extreme — ограниченное исследование до 10 минут: гипотезы из графа, векторов и знания модели о мире*⁶.",
                "plan": "run-bounded-research"
              },
              {
                "text": "Не нашлось ничего — «не знаю» с перечнем того, чего не хватает.",
                "skills": [
                  "use-depth-ladder"
                ]
              },
              {
                "text": "Запрос без вопроса возвращает всё известное о человеке, без модели.",
                "skills": [
                  "use-tables"
                ]
              }
            ],
            "skills": [
              "use-depth-ladder"
            ]
          },
          {
            "text": "Цикл дообучения — дорогой результат становится дешёвым знанием",
            "items": [
              {
                "text": "Когда запускается: после глубокого исследования (deep, extreme)*⁶ и после вычисления по таблицам, если ответом стал документ — «сколько заработали в мае–августе, с детализацией»*¹¹.",
                "plan": "fold-back-learning-loop"
              },
              {
                "text": "Порядок один на оба случая",
                "items": [
                  {
                    "text": "Результат добыт — исследованием или вычислением.",
                    "plan": "fold-back-learning-loop"
                  },
                  {
                    "text": "Артефакт — документ, таблица, изображение — в объектное хранилище, получен идентификатор.",
                    "skills": [
                      "use-object-store"
                    ]
                  },
                  {
                    "text": "Рождается текстовое саммари: что получилось и где лежит подробное.",
                    "plan": "fold-back-learning-loop"
                  },
                  {
                    "text": "Саммари — в векторное хранилище, получен идентификатор.",
                    "plan": "fold-back-learning-loop"
                  },
                  {
                    "text": "Саммари — в граф знаний, получен идентификатор.",
                    "plan": "fold-back-learning-loop"
                  },
                  {
                    "text": "Обновляется таблица связи с сущностью, о которой шла речь, если такая таблица есть; этот шаг последний и может быть пропущен.",
                    "plan": "fold-back-learning-loop"
                  },
                  {
                    "text": "Наружу уходит саммари с идентификатором, а повторный вопрос отвечается из дешёвых ступеней*⁷.",
                    "plan": "fold-back-learning-loop"
                  }
                ],
                "plan": "fold-back-learning-loop"
              },
              {
                "text": "Отрицание вывода — отдельный вход (deny)",
                "items": [
                  {
                    "text": "Запускает дополнительный цикл: прежнее саммари расширяется словами «архитектор отверг эту гипотезу»*¹².",
                    "plan": "fold-back-learning-loop"
                  },
                  {
                    "text": "Отменяется вывод, а не факт: «Денис служил в полку» остаётся, «значит, знал президента» опровергнуто.",
                    "plan": "fold-back-learning-loop"
                  },
                  {
                    "text": "Опровергнутая гипотеза хранится, а не удаляется — иначе та же цепочка снова приведёт к тому же выводу.",
                    "plan": "fold-back-learning-loop"
                  }
                ],
                "plan": "fold-back-learning-loop"
              },
              {
                "text": "Паттерны, выработанные моделью в цикле, становятся кандидатами навыка и проверяются в тени против действующего: непроверенный паттерн — привычка, а не знание.",
                "plan": "evolve-skill-in-shadow"
              }
            ],
            "plan": "fold-back-learning-loop"
          }
        ],
        "skills": [
          "use-tables",
          "use-knowledge-graph",
          "describe-incoming-object",
          "use-depth-ladder"
        ]
      },
      {
        "title": "Завершающая фаза: ответ",
        "items": [
          {
            "text": "У обоих сценариев: ok, what_happened, text, objects; какой глагол выполнен и кто его определил — зовущий или память*¹; судьба каждого признака — взят от зовущего, определён памятью, отвергнут с причиной; с какими сообщениями связан запрос*³.",
            "plan": "compose-memory-answer"
          },
          {
            "text": "У записи: где что легло (kept_whole), звалась ли модель (used_model), нить разбора (thread).",
            "plan": "compose-memory-answer"
          },
          {
            "text": "У чтения: чем достали (found_by), какой глубины достигли (depth_used), чего не хватает (not_yet_known), цепочка рассуждения по want_chain.",
            "plan": "compose-memory-answer"
          }
        ],
        "plan": "compose-memory-answer"
      }
    ],
    "notesTitle": "* В разработке — что есть сегодня и что осталось построить",
    "notes": [
      {
        "mark": "*¹",
        "text": "Запрос без глагола. Сегодня глагол задаёт только адрес. Разбор уже возвращает поле action, но по нему ничего не направляется. Строить: общий адрес договора, направление по action и поле ответа «какой глагол и кто решил»."
      },
      {
        "mark": "*²",
        "text": "Признаки у чтения. Сегодня features принимает только запись. Строить: параметр у recall и пропуск вызова модели, когда признаки присланы."
      },
      {
        "mark": "*³",
        "text": "Связь с сообщениями. Сегодня журнал умеет связать одно сообщение с другим, но пользуется этим только сохранение ссылки (сниппет связывается со страницей); thread, history и prior не указывают на конкретные сохранённые сообщения. Строить: номера сообщений в договоре, кандидатов из журнала по смыслу и времени, связи для каждой фразы и их учёт при чтении."
      },
      {
        "mark": "*⁴",
        "text": "Один вызов на все три определения. Сегодня вызов определяет только признаки, и двумя путями: запись показывает модели все роды реестра, чтение — 8 кандидатов. Строить: один общий разбор для обоих глаголов с кандидатами признаков и сообщений."
      },
      {
        "mark": "*⁵",
        "text": "Реестр догоняет хранилище. Сегодня роды без признака видит только прибор; 27 родов, заведённых моделью, ждут признаков. Строить: список на странице панели и признаки шагами агента разработки."
      },
      {
        "mark": "*⁶",
        "text": "Глубина deep и extreme. Сегодня обе объявлены в договоре, а чтение останавливается на графе. Строить: векторное хранилище внутри чтения и ограниченное исследование с цепочкой рассуждения."
      },
      {
        "mark": "*⁷",
        "text": "Сохранение дорогого ответа. Сегодня объект-ответ умеет сохранять агент (keep_object), но чтение само свой итог не сохраняет. Строить: итог глубокого исследования — объектом, векторной карточкой и документом графа."
      },
      {
        "mark": "*⁸",
        "text": "Строка журнала для каждого сообщения. Сегодня строку в журнале входящих получают только файлы и ссылки; обычная фраза пишется лишь в рабочий журнал памяти. Строить: строку журнала для каждой фразы первой записью."
      },
      {
        "mark": "*⁹",
        "text": "Охват фразы и поиск по месту. Сегодня колонки охвата и индекс по координатам есть у строки объекта; охват фразы уходит только в подсказку модели, а при чтении координаты не используются нигде. Строить: охват в строке журнала каждой фразы и поиск по радиусу при чтении."
      },
      {
        "mark": "*¹⁰",
        "text": "Накопление с учётом охвата. Сегодня сумма считается по всем строкам признака без учёта охвата. Строить: группировку сумм и историй по охвату."
      },
      {
        "mark": "*¹¹",
        "text": "Цикл дообучения после вычисления. Сегодня объект-ответ может сохранить только агент (keep_object); чтение само не собирает документ по таблицам и цикл не запускает. Строить: сборку документа и цикл дообучения после неё."
      },
      {
        "mark": "*¹²",
        "text": "Отрицание вывода. Сегодня deny действует только внутри той же нити разбора: слова человека уходят модели в подсказку; прежнее саммари не расширяется, опровергнутая гипотеза отдельно не хранится. Строить: запись опровержения рядом с гипотезой и расширение саммари."
      }
    ],
    "skillLabels": {
      "have": "Навык:",
      "plan": "Навык будет создан:"
    }
  },
  media: {
    items: [
      { body: "Речь в текст — OpenAI whisper-1, с меткой времени у каждого фрагмента.", title: "Звук" },
      { body: "Читает модель со зрением: каждый элемент, его место, цвета и весь видимый текст.", title: "Изображения" },
      { body: "Звуковая дорожка расшифровывается, шесть кадров прочитываются — одна шкала, кадры между репликами.", title: "Видео" },
      { body: "Документ читается целиком: структура и содержание, таблицы построчно.", title: "PDF" },
      { body: "Markdown хранится тем документом, которым становится; HTML — страницей и её исходником.", title: "Markdown и HTML" },
      { body: "Исходный код описывается — назначение, устройство, экспорт — и хранится дословно, но никогда не запускается.", title: "Исходный код" },
      { body: "Ссылку открывает настоящий браузер, ролик YouTube читает официальный API — описание, структура, главы и сниппет страницы. Весь текст и итоговый HTML не сохраняются.", title: "Ссылки и YouTube" },
    ],
    lead: "Не препроцессор, который приделывают сбоку. Конвейер живёт внутри памяти.",
    title: "Нативная мультимодальность",
  },
  memoization: {
    chain: [
      "Дорогой расчёт или исследование проходит на глубоких ступенях",
      "Создаётся артефакт с ID и саммари вывода рядом с ним",
      "Саммари записывается в векторную базу, граф связей и таблицы",
      "Повторный вопрос отвечается с дешёвых ступеней",
    ],
    building:
      "Сегодня: агент может сам сохранить ответ объектом (keep_object), и сохранённое находится по смыслу. В разработке: чтение, которое само возвращает свой дорогой результат в оборот — артефакт, саммари, карточка вектора, документ графа. До этого повторный вопрос стоит тот же один короткий вызов модели, что и первый.",
    lead: "Правило замысла: за дорогое не платят дважды. Любая дорогая цепочка замыкается обратно, на дешёвые уровни.",
    title: "Замыкание дорогого расчёта",
  },
  principles: {
    items: [
      {
        body: "Все базы данных и файлы находятся на вашем сервере. Никакой телеметрии и скрытых облачных зависимостей.",
        title: "Ваши данные принадлежат вам",
      },
      {
        body:
          "Факты фиксируются со статусом said — сказано человеком; догадки со статусом guess и обязательным указанием оснований basis.",
        title: "Точность фактов",
      },
      {
        body:
          "Используйте готовый fractera-telegrambot-starter или подключайте собственные веб-чаты, мобильные приложения и скрипты по HTTP. Встроенная консоль — отдельный микросервис, и она опциональна.",
        title: "Безинтерфейсное ядро",
      },
    ],
    title: "Философия разработки",
  },
  problem: {
    body:
      "Fractera Memory работает по принципу чёрного ящика: на входе мультимодальный текст и параметры, на выходе — готовый объект, сведение данных, проверенный вывод или отчёт. Единая система объединяет четыре типа хранилищ за одним входом, который сначала называет смысл запроса, а потом код решает, куда писать и откуда читать.",
    lead:
      "Традиционные подходы — RAG и векторные базы — заставляют ИИ забывать контекст при сбросе сессии, расходуют огромные бюджеты на вычитку длинных логов и не способны накапливать личный опыт.",
    title: "Операционная система архитектора",
  },
  router: {
    "cheapBranch": "1.0 Добавление записи · таблица для точного, граф для всего сказанного",
    "cheapCost": "Без дальнейших ходов модели: код проверяет значения и пишет строки, граф строит связи в фоне",
    "deepBranch": "2.0 Извлечение · таблица → граф → векторы (deep) → исследование (extreme)*⁶",
    "deepCost": "Таблица и граф отвечают без хода модели; deep и extreme тратят больше времени и ходов модели",
    "inbox": "Входящий поток — текст, геолокация, голос, фото, видео, PDF, Markdown, HTML, код, ссылки, даты",
    "lead": "Один вход, четыре фазы: что прислал зовущий, что память определяет сама, один из двух сценариев, ответ.",
    "routerBox": "Предварительная фаза: один вызов модели определяет глагол, признаки и связанные сообщения — только то, чего зовущий не прислал*⁴",
    "title": "Как проходит запрос"
  },
  schema: {
    body:
      "Вам не нужно вручную создавать SQL-миграции или закладывать фиксированную структуру данных. Память трансформирует структуру хранилища на лету: от добавления новых колонок до автоматического создания реляционных таблиц при появлении новых типов сущностей.",
    title: "Сквозная адаптивность схемы",
  },
  scope: {
    items: [
      {
        body: "Пустой охват контекста означает «не знаю где и когда», но никогда — «везде и всегда».",
        title: "Строгое правило охвата",
      },
      {
        body:
          "Вопрос «каким такси я обычно здесь пользуюсь?», заданный в Мадриде, вернёт локальный ответ для Мадрида и никогда не смешается с тем же вопросом в Лондоне.",
        title: "Контекстная изоляция",
      },
      {
        body:
          "Координаты проверяются парой и по границам планеты: одинокая широта — половина точки, а 200 градусов долготы — опечатка, которая иначе стала бы знанием.",
        title: "Координаты проверены, а не приняты на веру",
      },
    ],
    building:
      "Сегодня: охват — дата, место, lat, lon, radius_m — принимается, проверяется и хранится вместе с записью, указатель по координатам построен. В разработке: поиск по радиусу («что я знаю в 500 метрах отсюда») и суммы с историями, сгруппированные по охвату. До этого чтение координаты не использует.",
    lead: "Время и пространственные координаты — полноправные поля записи, а не произвольные текстовые теги.",
    title: "Физический контекст",
  },
  stores: {
    items: [
      { body: "Табличные структуры, типизированные факты, явные свойства объектов.", title: "Реляционное хранилище" },
      { body: "Семантический поиск и работа с нечётким текстом.", title: "Векторное хранилище" },
      { body: "Направленные связи между сущностями, людьми и событиями.", title: "Граф знаний" },
      { body: "Файлы целиком на вашем сервере — фото, аудио, видео, PDF, Markdown, HTML, код — каждый рядом со своим полным описанием.", title: "Объектное хранилище" },
    ],
    lead: "Четыре хранилища под одной обёрткой. Зовущий никогда не узнаёт, которое из них ответило.",
    title: "Четыре хранилища под одним договором",
  },
};

const DICT: Record<string, LandingWords> = { en: EN, ru: RU };

/** Слова языка. Неизвестный язык падает на английский — тот же закон, что у соседей. */
export function landingWords(lang: string): LandingWords {
  return DICT[lang] ?? EN;
}

/** Какие языки лендинг умеет говорить сейчас. Прибор спрашивает это, а не список в тексте. */
export const LANDING_LANGS = Object.keys(DICT);
