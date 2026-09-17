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
    /**
     * Чем кончается путь запроса (214-3).
     *
     * 🎯 Слово владельца: «диаграмма неполная… ответ у нас заканчивается, а возможно обратной связью
     * с эволюционным циклом».
     * 🔒 Схема, обрывающаяся на ответе, учит, что на ответе всё и кончается, — а с 213 это неправда:
     * отзыв становится сигналом, сигнал — веткой, ветку сливает человек.
     */
    answerBox: string;
    loopBox: string;
    loopCost: string;
    /** Подпись под кругом: схема не прямая. */
    loopBack: string;
  };
  schema: { title: string; body: string };
  /**
   * Как память обрабатывает запрос (204): четыре фазы, пункты до трёх уровней вложенности, сноски «в разработке».
   * 🔒 Описано целиком, как работающее; недостроенное — звёздочкой в тексте и сноской (закон замысла: описываем целиком, недостроенное — звёздочкой).
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
    "text": "Office lease note",
    "from": ["telegram", "bot", "roma-armstrong"],
    "media": [{ "url": "https://.../note.oga" }],
    "scope": [{ "at": "2026-09-11", "lat": 40.4168, "lon": -3.7038, "radius_m": 500 }]
  }'`;

const CURL_FEEDBACK_EN = `curl -X POST https://memory.your-domain.com/v1/feedback \\
  -H "Content-Type: application/json" -H "x-memory-key: YOUR_MEMORY_KEY" \\
  -d '{ "about": "ans_512", "text": "right facts, but I asked for one line" }'`;

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
    "text": "Заметка про аренду офиса",
    "from": ["telegram", "bot", "roma-armstrong"],
    "media": [{ "url": "https://.../note.oga" }],
    "scope": [{ "at": "2026-09-11", "lat": 40.4168, "lon": -3.7038, "radius_m": 500 }]
  }'`;

const CURL_FEEDBACK_RU = `curl -X POST https://memory.your-domain.com/v1/feedback \\
  -H "Content-Type: application/json" -H "x-memory-key: YOUR_MEMORY_KEY" \\
  -d '{ "about": "ans_512", "text": "факты верные, но я просил одной строкой" }'`;

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
      "One call below reaches further than the engine goes today: the time and place of a question are used, but search by coordinate radius is not built yet. Depth «deep» works — with your consent it reasons over the records and brings in the model's knowledge of the world — and the answer always reports depth_used, the depth actually reached.",
    lead: "One REST API, one key. Every example below runs against a live instance as it stands.",
    samples: [
      { code: CURL_REMEMBER_EN, title: "Store a voice note with spatial coordinates" },
      { code: CURL_RADIUS_EN, title: "Ask with the place of the question (radius search in development)" },
      { code: CURL_DEEP_EN, title: "Ask for depth and the chain of the search" },
      { code: CURL_FEEDBACK_EN, title: "Comment on the answer you were given — the third verb" },
    ],
    title: "API quickstart",
  },
  artifacts: {
    building:
      "Today: an agent composes the document and hands it to memory with keep_object — it comes back by id, with its file, description and summary. In development: reading that assembles the document over the tables by itself and returns the summary next to the artifact.",
    lead:
      "Asked to summarise complex data — last month's spending, a project's state — memory does not hand back a wall of text. It builds the thing you asked for:",
    steps: [
      "Keeps the whole thing in the object store: it has an id, a description and a search card.",
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
      "Open the service console: the API reference with key generation, the memory bench, the journal of its work and the workshop where it is built.",
    primary: "Open the console",
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
            ours: "Every ordinary read — graph, table, vector, objects — costs no model turn; reasoning deeper costs one, and only with your consent",
            rivals: ["No", "No", "Partial"],
          },
          {
            feature: "Native multimodality",
            ours: "Built in: audio, video, images, PDF, Markdown, HTML, source code, links and YouTube",
            rivals: ["Requires external parsers", "Requires external parsers", "Text focused"],
          },
          {
            feature: "Spatial proximity indexing",
            ours: "Time and place are parsed from the phrase and the question, «that café» is resolved from history; lat/lon stored and validated, radius search in development",
            rivals: ["Text matching only", "Function calling only", "Basic metadata"],
          },
          {
            feature: "Skill evolution",
            ours: "From people's comments: repeated wishes become signals, a person edits the skill in a branch with rollback; split-testing is an optional add-on",
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
            ours: "One short model call per phrase; the graph, the vector store and the message table then answer without further model turns",
            rivals: ["Every operation leans on model passes, BM25 and vector lookups"],
          },
          {
            feature: "Data processing",
            ours: "One message table with events around it: a knowledge graph, a vector store, objects with ids",
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
          "The answer invites a comment when it is worth one: at the start of a session for anything important, later only after a long chain of reasoning. An invitation on every reply stops meaning anything by the third time.",
        title: "The invitation is deliberate, not polite",
      },
      {
        body:
          "A comment is the third verb — POST /v1/feedback, naming the answer it is about. It lands in the same single table, linked to that answer. Before this verb existed, the invitation was there and the door was not.",
        title: "The comment has a door",
      },
      {
        body:
          "Most wishes are a difficulty of phrasing rather than a defect of memory, and they are read that way — sceptically. A change is made when the person is likely right, not whenever they are unhappy.",
        title: "Scepticism by design",
      },
      {
        body:
          "A comment that is acted on opens a branch of the skill and the instruction; the change is confirmed before it lands. Every skill change is a commit, so every change is reversible with no data loss.",
        title: "A branch, then a confirmation, then git",
      },
      {
        body:
          "Split-testing skill versions is an OPTIONAL element of a custom build: a skill from an external library, or one you write yourself. The core does not need it, and it is not switched on here.",
        title: "Split-testing is optional",
      },
      {
        body:
          "The model never scores its own work. The verdict comes from whoever asked — that is what the comment is for.",
        title: "No self-evaluation",
      },
    ],
    building:
      "Built and measured: the invitation is periodic by measured thresholds; a comment is stored and linked to its answer by name; a wish repeated in different words becomes a signal — closeness by meaning, threshold measured, a verbatim repeat kept apart and not counted. A comment saying memory cannot do this at all is a request for a different product, not a defect: it is searched for on the marketplace, then in the skills registry, and ends either with an offer to build a microservice or with an honest refusal — the reason, what could be done instead, and the choice to continue or go back to work*⁹. Not built: the screen of signals and handing a signal to the builder. The skill for editing in a branch is written and has not been used yet.",
    lead:
      "Memory improves from what people tell it about its answers. The loop is short and every step of it is reversible.",
    title: "Evolution: memory changes from your comments",
  },
  faq: {
    items: [
      {
        a: "Writing a phrase costs one short model call: it parses what was said, whether it was stated or inferred, its time and place, and any requests. Reading costs no model turn at all — the graph, the table, the vector store and the objects answer by themselves. Reasoning deeper with the model's knowledge costs one call and happens only with your consent. A file costs one call to describe it; text over 2000 words is kept whole, unparsed.",
        q: "Does every request cost tokens?",
      },
      {
        a: "By a word — yes: the place and time are parsed from the phrase and from the question («in Madrid», «on Friday»), records about the asked place come first, and «that café» is resolved from the person's own history when history has exactly one such place. By coordinates — not yet: lat, lon and radius_m are validated and stored, but search by radius («what do I know within 500 metres») is in development. An empty scope always means «I do not know where and when», never «everywhere, always».",
        q: "Can it answer questions about a place by coordinates, not by a word?",
      },
      {
        a: "Voice notes, images, video, PDF, Markdown, HTML, source code (TypeScript, Python, SQL and more), links to web pages and YouTube videos. Every file gets a full description detailed enough for another AI to reconstruct it, and a summary of about 50 words: speech is transcribed by OpenAI whisper-1 with timestamps, a video is split into its sound track and frames on one timeline, and pictures, documents, pages and code are read by Claude — code is never executed. The original stays in the built-in object store next to its full description and is referenced from answers by id.",
        q: "What can I send besides text?",
      },
      {
        a: "None. You send a sentence. Memory creates no tables and no columns of its own: it has one table — the one every incoming message lands in — and knowledge lives as events around it, in the graph, the vector store and the object store. There are no migrations to write.",
        q: "What schema do I have to design first?",
      },
      {
        a: "By design, the result is folded back: the artifact to the object store, its summary into the vector store and the knowledge graph, the relation tables updated — so the same question is later answered from the cheap levels. Today that loop is driven from outside: an agent keeps the answer as an object with keep_object, and what is kept is found by meaning. Reading does not yet fold its own result back. The deep level itself works — with consent — and the answer always reports depth_used, the depth actually reached.",
        q: "What happens after an expensive research run?",
      },
      {
        a: "From what people say about its answers, and never by grading itself. A comment names the answer it is about; a wish repeated in different words is meant to become a signal; a person edits the skill in a git branch, and every edit can be reverted. Comments are collected, linked and grouped by meaning: the same wish said differently becomes one signal, a verbatim repeat does not. Split-testing versions of a skill is an optional add-on, not part of the core.",
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
      "Self-hosted memory engine for AI agents: a knowledge graph, vector and object stores, one table of incoming messages, spatial-temporal scope with lat/lon on every record, native voice, image, video, PDF, Markdown, HTML, source-code and link input, and one short model call per phrase. One REST API, open source.",
    title: "Fractera Memory — autonomous multimodal evolving memory for AGI architectures",
  },
  toc: { heading: "On this page", label: "Contents" },
  hero: {
    badges: ["Three verbs: say · ask · comment", "No fee from us per request", "Open code, your machine", "Your data stays on your server"],
    body:
      "The engine ingests raw, unstructured real-world input — text, images, voice notes, video, whole PDF documents, Markdown and HTML pages, source code, links, and spatial-temporal coordinates and dates — and turns it into events around a single message table: an indexed knowledge graph, a vector store and objects. One short model call per phrase understands what is meant; after it the graph and the vector store answer without further model turns, and a request with no question costs no model call at all. Said plainly, because a promise nobody checked is the one people check on their worst day: the models are NOT ours. A phrase is parsed through your Claude subscription, voice and embeddings through your OpenAI key, and a link is opened by the AI browser out on the open internet. What stays on your server is the data, the stores and the code.",
    eyebrow: "Fractera Memory Starter",
    lead:
      "Memory exists so that any product living on your server can remember what was said to it and answer better for it. A chat, a Telegram bot, a shop, a CRM — each of them sends what a person actually said: a phrase as it was spoken, a file, a link. Sorting that out is memory's work, not theirs; back comes an answer they can keep working with.",
    primary: "Read the API",
    secondary: "Open the console",
    title: "Autonomous multimodal evolving memory for AGI architectures",
  },
  install: {
    body:
      "One run of the Fractera installer robot on your own server brings up every microservice of the platform, memory included — nginx, certificates and the access key are arranged for you. There is nothing to assemble by hand.",
    lead: "There is exactly one thing to know about installing this.",
    title: "Installation",
  },
  ladder: {
    "title": "How memory handles a request",
    "lead": "The frame the agent always keeps, in the order it happens. Everything not built yet is marked with an asterisk and named at the end — a description that hides its own gaps is the one you check on your worst day.",
    "phases": [
      {
        "title": "1. Which of the three is this?",
        "items": [
          { "text": "Adding something — POST /v1/remember. Text, objects, or both; the text may be empty when a thing arrives without words." },
          { "text": "Asking something — POST /v1/recall. With a question, or with nothing at all: then everything known comes back, and it costs no model turn." },
          { "text": "Commenting on a previous answer — POST /v1/feedback, naming that answer by its id. This is a request of its own kind, not politeness." },
          { "text": "Sent without a verb — plain words — memory decides which of the three it is and says in the first line of the answer how it read you.", "skills": ["use-tables"] },
          { "text": "A request inside the phrase is routed: a service of this server owns it — its address is named; no service does — memory looks for a ready solution on the marketplace, then a skill to build one, and offers a new microservice (both catalogues are empty today)." },
          { "text": "A phrase that fits nothing — not enough context to tell a fact from a request — is saved and answered plainly: it could not be classified, it is kept, and you can clarify." }
        ]
      },
      {
        "title": "2. What this message is connected to",
        "items": [
          { "text": "Memory does not ask the caller whether this continues an earlier conversation: the input is a phrase and objects, nothing else." },
          { "text": "The last things said and sent are read first, on every phrase — that is what makes the dialogue stay in one area.", "skills": ["use-tables"] },
          { "text": "Linking a message to the exact earlier ones — by meaning (a shared actor) and by time (the conversation going on).", "skills": ["use-depth-ladder"] }
        ]
      },
      {
        "title": "3. What the answer depends on: time and place",
        "items": [
          { "text": "Dates, weekdays and parts of the day travel with the record and with the question — the same phrase asked on another day is another question." },
          { "text": "Coordinates as they are, or a city by name: the phone sends a point, not the word «Madrid»." },
          { "text": "A place named by an object in a city — «that café» — resolved through this person's own history: one place in history is filled in and marked as inferred, several are not guessed.", "skills": ["use-depth-ladder"] },
          { "text": "An empty place or time means «I do not know where or when», never «everywhere, always»." }
        ]
      },
      {
        "title": "4. An object arrives — and each kind has its own skill",
        "items": [
          { "text": "Voice — transcribed, then handled as text.", "skills": ["describe-incoming-object"] },
          { "text": "Picture, short video, PDF, document, source code — described by a model, kept whole, and made findable by its card.", "skills": ["describe-incoming-object", "use-object-store"] },
          { "text": "A link — the page is opened by the AI browser; a YouTube link goes to the official API instead.", "skills": ["use-links"] },
          { "text": "Every object leaves two traces: the thing itself and what is inside it." }
        ]
      },
      {
        "title": "5. Depth — and the deeper step is never taken without your consent",
        "items": [
          { "text": "The graph is tried first: who is connected to what, and what follows from what.", "skills": ["use-knowledge-graph"] },
          { "text": "Cycles no deeper than two levels: the second round starts from new names in what was found, and every find is checked against the table — is the record there, and does it name that name.", "skills": ["use-depth-ladder", "use-vector-store"] },
          { "text": "Nothing close found — memory offers the deeper search as a field the caller can accept, and names its cost: one model turn, 11–32 s, on the shared subscription window.", "skills": ["use-depth-ladder"] },
          { "text": "The deepest step — reasoning plus the model's own knowledge of the world — is the one place memory can be confidently wrong, so it is taken only when you agree, and the answer keeps «from your memory» and «from the model's knowledge» apart.", "skills": ["use-depth-ladder"] }
        ]
      },
      {
        "title": "6. The answer says how firm it is",
        "items": [
          { "text": "Affirmative — what was said is lying there directly." },
          { "text": "Presumed — the answer was assembled by meaning or by a model, not by an exact match." },
          { "text": "Depends on a parameter — and the parameter is named: two different places or dates among the records mean the answer really does depend on which one you mean." },
          { "text": "Empty means «there is nothing to say», never a confident «no»." }
        ]
      },
      {
        "title": "7. The answer arrives with a name, and your comment starts the loop",
        "items": [
          { "text": "Every answer has a name — the number of the very row just written. No row, no name, and a name must not be promised." },
          { "text": "A comment names it — POST /v1/feedback. That is how memory knows which answer you mean, even a week later." },
          { "text": "One comment is the opinion of one conversation. A wish repeated in DIFFERENT words becomes a signal; a verbatim repeat is not a second observation*⁸.", "skills": ["memory-evolution"] },
          { "text": "A human acts on a signal in the workshop: a branch in git, revertible, merged by the owner*⁶. The loop ends with a person, not with a model." }
        ]
      }
    ],
    "notesTitle": "What is not built yet",
    "notes": [
      { "mark": "*⁶", "text": "Signals are collected and shown (GET /v1/signals), but they start nothing by themselves: a person opens the workshop. There is no automatic activation of the evolution skill today." },
      { "mark": "*⁹", "text": "Built and proven live on 2026-09-17: five cases, five right — two wishes never call the chain, two requests end with an offer to build a microservice, one («predict next quarter's demand») ends with an honest refusal carrying all three parts. The first run found a branch nobody could reach: every request ended in refusal, because the question «can this be promised» was asked about MEMORY rather than about the future solution. Fixed, and the probe now checks the branch, not only the kind. When the model does not answer at all, the kind stays unnamed and nothing is invented." },
      { "mark": "*⁸", "text": "Fixed and measured on 2026-09-17. Before: grouping compared words, and two comments with the same wish in different words gave an overlap of 0.00 — even «Пети» and «Петя» missed each other. Now closeness is measured by the same meaning machine as search, on its own collection of comments, with its own measured threshold 0.50 (same wish: 0.530–0.646; different wishes: 0.437 and below). Live check: four comments → one signal with two grounds, the verbatim repeat shown apart and not counted." }
    ],
    "skillLabels": { "have": "skill", "plan": "skill to be created" }
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
      "The conclusion is indexed into the vector store and the knowledge graph, and the message row ties them to the object",
      "The repeat question is then answered from the cheap levels",
    ],
    building:
      "Today: an agent can keep an answer as an object itself (keep_object), and everything kept is searchable by meaning. In development: reading that folds its own expensive result back — the artifact, its summary, the vector card and the graph document. A repeat question reads again at no model cost; only a repeated deep reasoning is paid for twice.",
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
    "loopBack": "↑ and the circle starts again",
    "answerBox": "3.0 The answer · what was found, how firm it is, and — when a request was not ours — who owns it and where it is configured",
    "loopBox": "4.0 Your comment closes the loop · POST /v1/feedback names the answer it is about",
    "loopCost": "A wish repeated in DIFFERENT words becomes a signal; the builder acts on a signal in a branch, revertibly, and the architect merges it. The loop ends with a person, not with the model.",
    "cheapBranch": "1.0 Adding a record · graph and vector for what was said, the object store for the long",
    "cheapCost": "No further model turns: code checks values and writes rows; the graph builds its links in the background",
    "deepBranch": "2.0 Retrieving · graph in two rounds, checked against the table → vector → objects → deeper reasoning with the model's knowledge, only with consent",
    "deepCost": "Everything up to the objects answers with no model turn; deeper reasoning costs one turn, 11–32 s, and is offered, not spent",
    "inbox": "Incoming stream — text, geolocation, voice, images, video, PDF, Markdown, HTML, code, links, dates",
    "lead": "One entry point, four phases: what the caller sent, what memory works out itself, one of two scenarios, the answer.",
    "routerBox": "0. What this is · the verb is decided WITHOUT a model turn, from the person's own words, and the answer says in its first line how it was read; a model turn is needed only to parse what was said into facts",
    "title": "How a request travels"
  },
  schema: {
    body:
      "No migrations and no schema design — because there is no schema to design. Memory has one table, the one every incoming message lands in; everything a person says lives as events around it, in the knowledge graph, the vector store and the object store.",
    title: "One table, everything else is events",
  },
  scope: {
    items: [
      {
        body: "An empty spatial-temporal scope means «location and time unknown» — never «everywhere and always».",
        title: "The strict boundary rule",
      },
      {
        body:
          "«Which taxi service do I usually use here?» asked about Madrid puts what was said about Madrid first and London last — nothing is overwritten, nothing is hidden, and a named place is never asked for again.",
        title: "Context ordering",
      },
      {
        body:
          "Coordinates are validated as a pair and against the bounds of the planet: a lone latitude is half a point, and 200 degrees of longitude is a typo that would otherwise become knowledge.",
        title: "Coordinates checked, not trusted",
      },
    ],
    building:
      "Today: time and place are parsed from the phrase and the question and stored with the record; «that café» is resolved from history; a scope entry with lat, lon and radius_m is validated and stored. In development: recall by radius («what do I know within 500 m of this point») and totals grouped by scope.",
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
      "Один пример ниже заглядывает дальше, чем память доходит сегодня: время и место вопроса используются, а поиск по радиусу координат ещё не построен. Глубина «deep» работает — с вашего согласия память размышляет над записями и привлекает знания модели о мире, — и ответ всегда называет depth_used, глубину, достигнутую на деле.",
    lead: "Один REST API, один ключ. Каждый пример ниже работает на живой службе как есть.",
    samples: [
      { code: CURL_REMEMBER_RU, title: "Сохранение голосовой заметки с координатами" },
      { code: CURL_RADIUS_RU, title: "Вопрос с местом, откуда он задан (поиск по радиусу в разработке)" },
      { code: CURL_DEEP_RU, title: "Просьба о глубине и цепочке поиска" },
      { code: CURL_FEEDBACK_RU, title: "Прокомментировать полученный ответ — третий глагол" },
    ],
    title: "Быстрый старт и примеры API",
  },
  artifacts: {
    building:
      "Сегодня: документ собирает агент и отдаёт памяти рукой keep_object — он возвращается по идентификатору, с файлом, описанием и саммари. В разработке: чтение, которое само собирает документ по таблицам и отдаёт саммари рядом с артефактом.",
    lead:
      "Память не просто пишет текстом цифры или факты. При запросах на сведение данных — отчёт по финансам, состояние проекта — система:",
    steps: [
      "Кладёт вещь целиком в объектное хранилище: у неё есть идентификатор, описание и карточка поиска.",
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
      "Откройте консоль службы: описание API с генерацией ключа, стенд памяти, журнал её работы и мастерскую, в которой она строится.",
    primary: "Открыть консоль",
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
            ours: "Любое обычное чтение — граф, таблица, вектор, вещи — без хода модели; размышление глубже стоит один ход и только с вашего согласия",
            rivals: ["Нет", "Нет", "Частично"],
          },
          {
            feature: "Родная мультимодальность",
            ours: "Встроена: звук, видео, изображения, PDF, Markdown, HTML, исходный код, ссылки и YouTube",
            rivals: ["Нужны внешние парсеры", "Нужны внешние парсеры", "Ориентирован на текст"],
          },
          {
            feature: "Пространственный индекс",
            ours: "Время и место разбираются из фразы и вопроса, «то кафе» — по истории; lat/lon хранятся и проверяются, поиск по радиусу в разработке",
            rivals: ["Только совпадение по тексту", "Только через вызов функций", "Простые метаданные"],
          },
          {
            feature: "Эволюция навыков",
            ours: "От комментариев людей: повторённое пожелание становится сигналом, навык правит человек веткой с откатом; сплит-тест — опция",
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
            ours: "Один короткий вызов модели на фразу; дальше связи, вектор и таблица сообщений отвечают без новых ходов модели",
            rivals: ["Каждая операция опирается на вызовы модели, BM25 и векторы"],
          },
          {
            feature: "Работа с данными",
            ours: "Одна таблица сообщений, события вокруг неё: граф связей, вектор, объекты с идентификаторами",
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
          "Ответ зовёт прокомментировать себя тогда, когда это того стоит: в начале сессии — к любому важному запросу, дальше — только после длинной цепочки рассуждений. Приглашение в каждом ответе к третьему разу не значит ничего.",
        title: "Приглашение — расчёт, а не вежливость",
      },
      {
        body:
          "Комментарий — третий глагол: POST /v1/feedback с именем ответа, о котором речь. Он ложится строкой в ту же единственную таблицу и связывается с этим ответом. До него приглашение было, а двери не было.",
        title: "У комментария есть дверь",
      },
      {
        body:
          "Чаще пожелание — это трудность формулировки, а не дефект памяти, и читается оно именно так: критично. Правка вносится, когда человек, скорее всего, прав, а не всякий раз, когда он недоволен.",
        title: "Критичность по устройству",
      },
      {
        body:
          "Комментарий, принятый в работу, открывает ветку навыка и инструкции; изменение подтверждается до того, как встанет. Каждая правка навыка — коммит, значит откат возможен всегда и без потери данных.",
        title: "Ветка, подтверждение, git",
      },
      {
        body:
          "Сплит-тестирование версий навыков — ОПЦИОНАЛЬНЫЙ элемент кастомной сборки: навык из внешней библиотеки или написанный вами. Ядру он не нужен и здесь не включён.",
        title: "Сплит-тестирование — опция",
      },
      {
        body:
          "Модель не оценивает свою работу сама. Вердикт даёт тот, кто спрашивал, — ради этого комментарий и существует.",
        title: "Без самооценки",
      },
    ],
    building:
      "Построено и измерено: приглашение периодическое по измеренным порогам; комментарий сохраняется и связывается со своим ответом по имени; пожелание, повторённое разными словами, становится сигналом — близость по смыслу, порог измерен, дословный повтор показан отдельно и в счёт не идёт. Комментарий «памятью этого не сделать» — не дефект, а заявка на другой продукт: она ищется на маркетплейсе, затем в реестре навыков и кончается либо предложением создать микросервис, либо честным отказом — причина, что можно было бы сделать вместо, и выбор: продолжить разговор или вернуться к работе*⁹. Не построено: экран сигналов и передача сигнала строителю. Навык правки веткой написан и ещё ни разу не применялся.",
    lead:
      "Память улучшается от того, что люди говорят о её ответах. Цикл короткий, и каждый его шаг обратим.",
    title: "Эволюция: память меняется от ваших комментариев",
  },
  faq: {
    items: [
      {
        a: "Запись фразы стоит один короткий вызов модели: он разбирает, что сказано, прямо или выведено, о каком времени и месте, и есть ли в ней просьбы. Чтение модель не зовёт вовсе — отвечают граф, таблица, вектор и вещи. Размышление глубже со знаниями модели стоит один вызов и делается только с вашего согласия. Файл стоит один вызов на описание; текст длиннее 2000 слов сохраняется целиком, не разбираясь.",
        q: "Каждый запрос стоит токенов?",
      },
      {
        a: "По слову — да: место и время разбираются из фразы и из вопроса («в Мадриде», «в пятницу»), записи о спрошенном месте идут первыми, а «то кафе» находится по истории самого человека, если такое место в ней одно. По координатам — пока нет: lat, lon и radius_m проверяются и хранятся, а поиск по радиусу («что я знаю в 500 метрах отсюда») в разработке. Пустой охват всегда значит «не знаю где и когда», а не «везде и всегда».",
        q: "Умеет ли она отвечать про место по координатам, а не по слову?",
      },
      {
        a: "Голосовые заметки, изображения, видео, PDF, Markdown, HTML, исходный код (TypeScript, Python, SQL и другие), ссылки на веб-страницы и ролики YouTube. Каждый файл получает полное описание — настолько подробное, что другой ИИ восстановит по нему сам объект, — и саммари примерно в 50 слов: речь расшифровывает OpenAI whisper-1 с метками времени, видео разбирается на звуковую дорожку и кадры на одной шкале, а картинки, документы, страницы и код читает Claude — код при этом никогда не запускается. Оригинал остаётся во встроенном объектном хранилище рядом со своим полным описанием и адресуется из ответа по id.",
        q: "Что можно присылать, кроме текста?",
      },
      {
        a: "Никакую. Вы присылаете фразу. Своих таблиц и колонок память не заводит вовсе: у неё одна таблица — та, куда попадают все входящие сообщения, а знание живёт событиями вокруг неё, в связях, векторе и объектном хранилище. Миграции писать не нужно.",
        q: "Какую схему нужно спроектировать заранее?",
      },
      {
        a: "По замыслу результат замыкается обратно: артефакт — в объектное хранилище, саммари — в векторную базу и граф знаний, таблицы связей обновляются, и тот же вопрос потом отвечается с дешёвых ступеней. Сегодня этот цикл ведётся снаружи: агент сохраняет ответ объектом рукой keep_object, и сохранённое находится по смыслу. Само чтение свой результат ещё не возвращает в оборот. Глубокая ступень работает — с согласия, — и ответ всегда называет depth_used, глубину, достигнутую на деле.",
        q: "Что происходит после дорогого исследования?",
      },
      {
        a: "От того, что люди говорят о её ответах, и никогда — самооценкой. Комментарий называет ответ, о котором он; пожелание, повторённое разными словами, должно становиться сигналом; навык правит человек веткой в git, и каждая правка откатывается. Комментарии собираются, связываются и группируются по смыслу: одно пожелание, сказанное по-разному, становится одним сигналом, а дословный повтор — нет. Сплит-тестирование версий навыка — опция, а не часть ядра.",
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
      "Автономная память для ИИ-агентов на вашем сервере: граф знаний, векторное и объектное хранилища, одна таблица входящих сообщений, охват записи с координатами и датой, приём голоса, изображений, видео, PDF, Markdown, HTML, исходного кода и ссылок, один короткий вызов модели на фразу. Один REST API, открытый код.",
    title: "Fractera Memory — автономная мультимодальная эволюционирующая память для AGI-архитектур",
  },
  toc: { heading: "На этой странице", label: "Оглавление" },
  hero: {
    badges: ["Три глагола: сказать · спросить · прокомментировать", "Мы не берём плату за запрос", "Открытый код, ваша машина", "Данные остаются на вашем сервере"],
    body:
      "Память превращает необработанные мультимодальные данные — текст, изображения, голосовые заметки, видео, PDF-документы, страницы Markdown и HTML, исходный код, ссылки, геолокацию и временные метки — в события вокруг одной таблицы сообщений: индексированный граф знаний, вектор и объекты. Один короткий вызов модели на фразу понимает, о чём речь; дальше отвечают связи и вектор без новых ходов модели, а запрос без вопроса не стоит вызова вовсе. Сказано прямо, потому что непроверенное обещание человек проверяет в свой худший день: модели — НЕ наши. Фраза разбирается вашей подпиской Claude, голос и векторы — вашим ключом OpenAI, а ссылку ИИ-браузер открывает в открытом интернете. На вашем сервере остаются данные, хранилища и код.",
    eyebrow: "Fractera Memory Starter",
    lead:
      "Память создана для того, чтобы любые продукты, живущие на вашем сервере, помнили сказанное им и отвечали человеку точнее. Чат, Telegram-бот, магазин, CRM — каждый присылает то, что человек сказал на самом деле: фразу как она произнесена, файл, ссылку. Разобрать это — работа памяти, а не их; обратно приходит ответ, с которым они работают дальше.",
    primary: "Читать API",
    secondary: "Открыть консоль",
    title: "Автономная мультимодальная эволюционирующая память для AGI-архитектур",
  },
  install: {
    body:
      "Один запуск робота-установщика Fractera на вашем сервере поднимает все микросервисы платформы, включая память: nginx, сертификаты и ключ доступа настраиваются за вас. Собирать руками нечего.",
    lead: "Про установку нужно знать ровно одно.",
    title: "Установка",
  },
  ladder: {
    "title": "Как память обрабатывает запрос",
    "lead": "Основа, которой агент придерживается всегда, в том порядке, в каком всё и происходит. Всё, что ещё не построено, помечено звёздочкой и названо в конце — описание, скрывающее собственные дыры, человек проверяет в свой худший день.",
    "phases": [
      {
        "title": "1. Что это из трёх?",
        "items": [
          { "text": "Добавить — POST /v1/remember. Текст, объекты или и то и другое; текста может не быть вовсе, когда пришла вещь без слов." },
          { "text": "Извлечь — POST /v1/recall. С вопросом или вовсе без него: тогда придёт всё известное, и это не стоит хода модели." },
          { "text": "Прокомментировать предыдущий ответ — POST /v1/feedback с именем этого ответа. Это запрос своего рода, а не вежливость." },
          { "text": "Прислали без глагола, обычными словами, — память сама решает, что это из трёх, и первой строкой ответа говорит, как вас поняла.", "skills": ["use-tables"] },
          { "text": "Просьба внутри фразы маршрутизируется: её решает служба этого сервера — назван адрес; не решает ни одна — память ищет готовое решение на маркетплейсе, затем навык для его создания и предлагает новый микросервис (оба каталога сегодня пусты)." },
          { "text": "Фраза, которую не отнести ни к чему — контекста не хватает, чтобы отличить факт от просьбы, — сохраняется, и ответ говорит прямо: не классифицирована, сохранена, можно уточнить." }
        ]
      },
      {
        "title": "2. С чем это сообщение связано",
        "items": [
          { "text": "Память не спрашивает зовущего, продолжение ли это прежнего разговора: на входе фраза и объекты, больше ничего." },
          { "text": "Последнее сказанное и присланное читается первым, на каждую фразу — именно это держит диалог в одной области.", "skills": ["use-tables"] },
          { "text": "Связать сообщение с ТЕМИ САМЫМИ прежними — по смыслу (общее действующее лицо) и по времени (продолжение разговора).", "skills": ["use-depth-ladder"] }
        ]
      },
      {
        "title": "3. От чего ответ зависит: время и место",
        "items": [
          { "text": "Даты, дни недели и время суток едут и с записью, и с вопросом — та же фраза в другой день это другой вопрос." },
          { "text": "Координаты как есть или город словом: телефон присылает точку, а не слово «Мадрид»." },
          { "text": "Место, названное объектом в городе — «то кафе», — разрешённое по истории самого человека: одно место в истории подставляется с пометкой «по истории», несколько — не угадываются.", "skills": ["use-depth-ladder"] },
          { "text": "Пустое место или время значит «не знаю где и когда», а не «везде и всегда»." }
        ]
      },
      {
        "title": "4. Пришёл объект — у каждого рода свой навык",
        "items": [
          { "text": "Голос — расшифровывается и дальше живёт как текст.", "skills": ["describe-incoming-object"] },
          { "text": "Снимок, короткое видео, PDF, документ, исходный код — описываются моделью, хранятся целиком, находятся по своей карточке.", "skills": ["describe-incoming-object", "use-object-store"] },
          { "text": "Ссылка — страницу открывает ИИ-браузер, ролик YouTube читает официальный API.", "skills": ["use-links"] },
          { "text": "Любой объект оставляет два следа: сама вещь и то, что внутри неё." }
        ]
      },
      {
        "title": "5. Глубина — и дальний шаг не делается без вашего согласия",
        "items": [
          { "text": "Сначала граф: кто с чем связан и что из чего следует.", "skills": ["use-knowledge-graph"] },
          { "text": "Циклы не глубже двух уровней: второй круг идёт от новых имён найденного, и каждая находка сверяется с таблицей — есть ли там запись и названо ли в ней то имя.", "skills": ["use-depth-ladder", "use-vector-store"] },
          { "text": "Близких связей не нашлось — память ПРЕДЛАГАЕТ более глубокий поиск полем, на которое можно ответить, и называет цену: один ход модели, 11–32 секунды, из общей квоты подписки.", "skills": ["use-depth-ladder"] },
          { "text": "Самый дальний шаг — размышление и собственные знания модели о мире — это единственное место, где память может уверенно ошибиться, поэтому он делается только с вашего согласия, а ответ разделяет «из вашей памяти» и «из знаний модели».", "skills": ["use-depth-ladder"] }
        ]
      },
      {
        "title": "6. Ответ говорит, насколько он твёрдый",
        "items": [
          { "text": "Утвердительный — сказанное лежит прямо." },
          { "text": "Предположительный — ответ собран по смыслу или моделью, а не точным совпадением." },
          { "text": "Зависящий от параметра — и параметр назван: два разных места или срока среди записей значат, что ответ и правда зависит от того, о каком вы спрашиваете." },
          { "text": "Пусто значит «сказать нечего», а не уверенное «нет»." }
        ]
      },
      {
        "title": "7. Ответ приходит с именем, и ваш комментарий запускает круг",
        "items": [
          { "text": "У каждого ответа есть имя — номер той самой строки, которую только что записали. Не записалась строка — имени нет, и обещать его нельзя." },
          { "text": "Комментарий называет это имя — POST /v1/feedback. Поэтому память знает, о каком именно ответе речь, хоть через неделю." },
          { "text": "Один комментарий — мнение одного разговора. Пожелание, повторённое РАЗНЫМИ словами, становится сигналом; дословный повтор вторым наблюдением не считается*⁸.", "skills": ["memory-evolution"] },
          { "text": "По сигналу правит человек в мастерской: веткой в git, с откатом, и сливает её владелец*⁶. Цикл заканчивается человеком, а не моделью." }
        ]
      }
    ],
    "notesTitle": "Чего пока нет",
    "notes": [
      { "mark": "*⁶", "text": "Сигналы собираются и показываются (GET /v1/signals), но сами ничего не запускают: мастерскую открывает человек. Автоматической активации навыка эволюции сегодня нет." },
      { "mark": "*⁹", "text": "Построено и доказано живьём 2026-09-17: пять случаев, пять верных — два пожелания цепочку не зовут, две заявки кончаются предложением создать микросервис, одна («предскажи спрос на квартал») — честным отказом со всеми тремя частями. Первый прогон нашёл ветвь, до которой никто не доходил: все заявки уходили в отказ, потому что вопрос «можно ли это пообещать» задавался о ПАМЯТИ, а не о будущем решении. Исправлено, и прибор теперь сверяет ветвь, а не только род. Когда модель не отвечает вовсе, род остаётся неназванным и ничего не выдумывается." },
      { "mark": "*⁸", "text": "Починено и измерено 2026-09-17. Было: группировка сравнивала слова, и два комментария с одним пожеланием разными словами дали совпадение 0.00 — даже «Пети» и «Петя» не совпали. Стало: близость считает та же машина смысла, что и поиск, — своей коллекцией комментариев и своим измеренным порогом 0.50 (об одном: 0.530–0.646; о разном: 0.437 и ниже). Живая проверка: четыре комментария → один сигнал с двумя основаниями, дословный повтор показан отдельно и в счёт не идёт." }
    ],
    "skillLabels": { "have": "навык", "plan": "навык будет создан" }
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
      "Саммари записывается в векторную базу и граф связей, а строка сообщения связывает их с объектом",
      "Повторный вопрос отвечается с дешёвых ступеней",
    ],
    building:
      "Сегодня: агент может сам сохранить ответ объектом (keep_object), и сохранённое находится по смыслу. В разработке: чтение, которое само возвращает свой дорогой результат в оборот — артефакт, саммари, карточка вектора, документ графа. Повторный вопрос читается снова без хода модели; дважды оплачивается только повторное глубокое размышление.",
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
    "loopBack": "↑ и круг начинается снова",
    "answerBox": "3.0 Ответ · что нашлось, насколько он твёрдый и — если просьба была не наша — чья она и где этим управляют",
    "loopBox": "4.0 Ваш комментарий замыкает круг · POST /v1/feedback называет ответ, о котором он",
    "loopCost": "Пожелание, повторённое РАЗНЫМИ словами, становится сигналом; по сигналу строитель правит веткой, с откатом, а сливает её владелец. Цикл заканчивается человеком, а не моделью.",
    "cheapBranch": "1.0 Добавление записи · связи и вектор для сказанного, объект для длинного",
    "cheapCost": "Без дальнейших ходов модели: код проверяет значения и пишет строки, граф строит связи в фоне",
    "deepBranch": "2.0 Извлечение · граф в два круга со сверкой по таблице → вектор → вещи → размышление со знаниями модели, только с согласия",
    "deepCost": "Всё до вещей отвечает без хода модели; размышление стоит один ход, 11–32 с, и его предлагают, а не тратят",
    "inbox": "Входящий поток — текст, геолокация, голос, фото, видео, PDF, Markdown, HTML, код, ссылки, даты",
    "lead": "Один вход и круг, а не прямая: что прислали · что память определяет сама · один из двух сценариев · ответ · ваш комментарий, который возвращает всё к началу.",
    "routerBox": "0. Что это такое · глагол определяется БЕЗ хода модели, по словам человека, и ответ первой строкой говорит, как он понят; модель нужна только чтобы разобрать сказанное на факты",
    "title": "Как проходит запрос"
  },
  schema: {
    body:
      "Ни миграций, ни проектирования схемы — потому что проектировать нечего. У памяти одна таблица, та, куда попадают все входящие сообщения; всё сказанное живёт событиями вокруг неё — в графе связей, в векторе и в объектном хранилище.",
    title: "Одна таблица, всё остальное — события",
  },
  scope: {
    items: [
      {
        body: "Пустой охват контекста означает «не знаю где и когда», но никогда — «везде и всегда».",
        title: "Строгое правило охвата",
      },
      {
        body:
          "Вопрос «каким такси я обычно здесь пользуюсь?» о Мадриде ставит сказанное о Мадриде первым, а о Лондоне — последним: ничего не перезаписывается и не прячется, а уже названное место память не переспрашивает.",
        title: "Порядок по контексту",
      },
      {
        body:
          "Координаты проверяются парой и по границам планеты: одинокая широта — половина точки, а 200 градусов долготы — опечатка, которая иначе стала бы знанием.",
        title: "Координаты проверены, а не приняты на веру",
      },
    ],
    building:
      "Сегодня: время и место разбираются из фразы и вопроса и хранятся с записью; «то кафе» разрешается по истории; охват с lat, lon и radius_m проверяется и хранится. В разработке: поиск по радиусу («что я знаю в 500 метрах отсюда») и суммы, сгруппированные по охвату.",
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
