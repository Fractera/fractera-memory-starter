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
        a: "Almost every one — and exactly one short call. It parses the phrase: what was said, and whether it was stated or inferred. After that the graph, the vector store and the message table answer without further model turns. No model at all is used for a request with no question, and for any text over 2000 words — it is kept whole, unparsed. The answer reports depth_used, the depth actually reached.",
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
        a: "None. You send a sentence. Memory creates no tables and no columns of its own: it has one table — the one every incoming message lands in — and knowledge lives as events around it, in the graph, the vector store and the object store. There are no migrations to write.",
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
      "Self-hosted memory engine for AI agents: a knowledge graph, vector and object stores, one table of incoming messages, spatial-temporal scope with lat/lon on every record, native voice, image, video, PDF, Markdown, HTML, source-code and link input, and one short model call per phrase. One REST API, open source.",
    title: "Fractera Memory — self-hosted memory engine for AI agents",
  },
  toc: { heading: "On this page", label: "Contents" },
  hero: {
    badges: ["No metered per-request fees", "Zero vendor lock-in", "Full privacy on your server"],
    body:
      "The engine ingests raw, unstructured real-world input — text, images, voice notes, video, whole PDF documents, Markdown and HTML pages, source code, links, and spatial-temporal coordinates and dates — and turns it into events around a single message table: an indexed knowledge graph, a vector store and objects. One short model call per phrase understands what is meant; after it the graph and the vector store answer without further model turns, and a request with no question costs no model call at all.",
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
    "lead": "The chain from the request to the answer, in the order it actually happens. Anything not built yet is marked with an asterisk and explained in the notes.",
    "phases": [
      {
        "title": "Is this adding something, or asking something?",
        "items": [
          { "text": "Sent with a verb, the request goes to /v1/remember (add) or /v1/recall (ask)." },
          { "text": "Sent without one, memory decides for itself which it is*¹.", "plan": "understand-incoming-request" }
        ]
      },
      {
        "title": "Earlier related messages are pulled into the context",
        "items": [
          { "text": "The caller can hand over the earlier conversation, what it has already found, and the thread of an earlier reasoning." },
          { "text": "Memory finds the related earlier messages by itself, by meaning and by time*².", "plan": "link-messages" }
        ]
      },
      {
        "title": "Memory turns what was said into events around one table",
        "items": [
          { "text": "Under 2000 words, the phrase is parsed by one short model call: what was said, and whether it was stated or inferred." },
          { "text": "Every parsed fact becomes an event and an anchor — the name the phrase is later found by." },
          { "text": "Memory creates no tables and no columns of its own: its single table is the one every incoming message lands in." },
          { "text": "Over 2000 words, the text goes to the object store whole and is not parsed at all: what has nowhere to land is not worth a model call." },
          { "text": "Either way everything said goes into the knowledge graph and the vector store, with the person's name and the channel it arrived through." }
        ]
      },
      {
        "title": "A file or a link goes to the object store",
        "items": [
          { "text": "A picture, voice note, video, PDF, document, source code, a web page or a YouTube video: memory reads it by its kind and writes a full description and a short summary.", "skills": ["describe-incoming-object", "use-links"] },
          { "text": "It lands in four places at once or in none: the file itself in the object store, a search card in the vector store, the description with its origin in the graph, and a journal row tying the three together.", "skills": ["use-object-store"] },
          { "text": "If any of the four fails, what was written is rolled back and the row keeps the reason." }
        ]
      },
      {
        "title": "The answer",
        "items": [
          { "text": "What happened, in words a person can be told, plus the object ids." },
          { "text": "For adding: what was recorded and what was refused, with the reason." },
          { "text": "For asking: what was found, how it was found, and what is missing — «I don't know» is an answer." },
          { "text": "Asking by radius and the deep levels are not there yet*³, and memory cannot add values up*⁴." }
        ]
      }
    ],
    "notesTitle": "In development",
    "notes": [
      { "mark": "*¹", "text": "A request without a verb. Today the verb is set by the address only." },
      { "mark": "*²", "text": "Earlier related messages. Today only what the caller hands over is used; memory does not find them by itself yet." },
      { "mark": "*³", "text": "Depth. Reading stops at the knowledge graph; the vector store and bounded research are still to come. The answer always reports the depth actually reached." },
      { "mark": "*⁴", "text": "Adding up. To add values, memory has to know that they are money and that money adds up — and it does not know that yet, so values come back one by one." }
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
      "The conclusion is indexed into the vector store and the knowledge graph, and the message row ties them to the object",
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
    "cheapBranch": "1.0 Adding a record · graph and vector for what was said, the object store for the long",
    "cheapCost": "No further model turns: code checks values and writes rows; the graph builds its links in the background",
    "deepBranch": "2.0 Retrieving · table → graph → vectors (deep) → research (extreme)*⁶",
    "deepCost": "The table and the graph answer with no model turn; deep and extreme spend more time and model turns",
    "inbox": "Incoming stream — text, geolocation, voice, images, video, PDF, Markdown, HTML, code, links, dates",
    "lead": "One entry point, four phases: what the caller sent, what memory works out itself, one of two scenarios, the answer.",
    "routerBox": "Preliminary phase: one model call works out the verb and what the phrase is about — only what the caller did not send",
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
        a: "Почти каждый — и ровно одного короткого вызова. Один вызов разбирает фразу: что сказано, сказано это прямо или выведено. Дальше отвечают связи, вектор и таблица сообщений без новых ходов модели. Вовсе без модели отвечается запрос без вопроса и любой текст длиннее 2000 слов — он сохраняется целиком, не разбираясь. Ответ называет depth_used — глубину, достигнутую на деле.",
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
        a: "Никакую. Вы присылаете фразу. Своих таблиц и колонок память не заводит вовсе: у неё одна таблица — та, куда попадают все входящие сообщения, а знание живёт событиями вокруг неё, в связях, векторе и объектном хранилище. Миграции писать не нужно.",
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
      "Автономная память для ИИ-агентов на вашем сервере: граф знаний, векторное и объектное хранилища, одна таблица входящих сообщений, охват записи с координатами и датой, приём голоса, изображений, видео, PDF, Markdown, HTML, исходного кода и ссылок, один короткий вызов модели на фразу. Один REST API, открытый код.",
    title: "Fractera Memory — автономная память для ИИ-агентов на вашем сервере",
  },
  toc: { heading: "На этой странице", label: "Оглавление" },
  hero: {
    badges: ["Ноль комиссий за запрос", "Ноль зависимости от поставщика", "Полная приватность на вашем сервере"],
    body:
      "Память превращает необработанные мультимодальные данные — текст, изображения, голосовые заметки, видео, PDF-документы, страницы Markdown и HTML, исходный код, ссылки, геолокацию и временные метки — в события вокруг одной таблицы сообщений: индексированный граф знаний, вектор и объекты. Один короткий вызов модели на фразу понимает, о чём речь; дальше отвечают связи и вектор без новых ходов модели, а запрос без вопроса не стоит вызова вовсе.",
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
    "lead": "Цепочка от запроса до ответа, в том порядке, в каком всё и происходит. Что ещё не построено — помечено звёздочкой и объяснено в конце.",
    "phases": [
      {
        "title": "Это добавить или это спросить?",
        "items": [
          { "text": "Прислали с глаголом — запрос идёт на /v1/remember (добавить) или /v1/recall (спросить)." },
          { "text": "Прислали без глагола — память сама определяет, что это*¹.", "plan": "understand-incoming-request" }
        ]
      },
      {
        "title": "Связанные прежние сообщения подтягиваются в контекст",
        "items": [
          { "text": "Присланного признака «это продолжение разговора» память больше не ждёт: вход — текст и объекты." },
          { "text": "Память сама находит связанные прежние сообщения — по смыслу и по времени*².", "plan": "link-messages" }
        ]
      },
      {
        "title": "Память превращает сказанное в события вокруг одной таблицы",
        "items": [
          { "text": "Короче 2000 слов — фраза разбирается одним коротким вызовом модели: что именно сказано, сказано это прямо или выведено." },
          { "text": "Каждый разобранный факт становится событием и якорем — именем, по которому фраза потом находится." },
          { "text": "Своих таблиц и колонок под факты память не заводит: единственная её таблица — та, куда попадают все входящие сообщения." },
          { "text": "Длиннее 2000 слов — текст уходит целиком в объектное хранилище и не разбирается вовсе: то, чему некуда лечь, не стоит вызова модели." },
          { "text": "Всё сказанное в любом случае попадает в связи и в вектор — вместе с именем человека и каналом, которым пришло сообщение." }
        ]
      },
      {
        "title": "Файл или ссылка идут в объектное хранилище",
        "items": [
          { "text": "Снимок, голосовое, видео, PDF, документ, исходный код, страница или ролик YouTube: память читает присланное по его роду и пишет полное описание и короткое саммари.", "skills": ["describe-incoming-object", "use-links"] },
          { "text": "Ложится в четыре места сразу или ни в одно: сам файл — в объектное хранилище, карточка поиска — в вектор, описание с происхождением — в связи, строка журнала связывает три.", "skills": ["use-object-store"] },
          { "text": "Если хоть одно из четырёх не удалось, записанное откатывается, а в строке остаётся причина." }
        ]
      },
      {
        "title": "Ответ",
        "items": [
          { "text": "Что произошло — словами, которые можно сказать человеку, и идентификаторы объектов." },
          { "text": "У добавления: что записано и что отвергнуто, с причиной." },
          { "text": "У вопроса: что нашлось, чем достали и чего не хватает — «не знаю» тоже ответ." },
          { "text": "Поиска по радиусу и глубоких ступеней пока нет*³, а складывать значения память пока не умеет*⁴." }
        ]
      }
    ],
    "notesTitle": "В разработке",
    "notes": [
      { "mark": "*¹", "text": "Запрос без глагола. Сегодня глагол задаёт только адрес." },
      { "mark": "*²", "text": "Связанные прежние сообщения. Сегодня используется только то, что передал зовущий; сама память их пока не находит." },
      { "mark": "*³", "text": "Глубина. Чтение останавливается на связях; векторное хранилище и ограниченное исследование впереди. Ответ всегда называет глубину, достигнутую на деле." },
      { "mark": "*⁴", "text": "Сложение. Чтобы сложить, памяти надо знать, что это деньги и что деньги складывают, — пока она этого не знает, и значения возвращаются по одному." }
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
      "Саммари записывается в векторную базу и граф связей, а строка сообщения связывает их с объектом",
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
    "cheapBranch": "1.0 Добавление записи · связи и вектор для сказанного, объект для длинного",
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
