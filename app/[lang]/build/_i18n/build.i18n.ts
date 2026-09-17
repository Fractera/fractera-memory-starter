// СЛОВА МАСТЕРСКОЙ «ПОСТРОЙТЕ ЭТОТ ПРОДУКТ» (189-8 → 202).
//
// 🔒 ТЕКСТ ПРЕДУПРЕЖДЕНИЯ ИДЁТ ОТ СЛОВ ВЛАДЕЛЬЦА 2026-09-13 И НЕ СМЯГЧАЕТСЯ: «вы впускаете процесс, который на
// фундаментальном уровне способен модифицировать и даже иногда истощить текущую версию. Но вы можете сделать
// откат к предыдущей версии. Используйте это только если вы знаете, о чём речь!» С шага 202 он стоит в разделе
// терминала, прямо над ним — предупреждение до запуска, а не объяснение после.
//
// 🔒 ЦИТАТА ГЛАВНОГО ОПИСАНИЯ — МЫСЛЬ ВЛАДЕЛЬЦА 2026-09-15: «все что здесь выполнено это стартовый шаблон, который
// вы можете достроить под свои нужды при помощи продакшен кодинга прямо в браузере. Поделитесь с сообщество
// готовым решением при помощи. GitHub . Давайте строить agi вместе». Как принято приглашать участников, он
// поручил описать самому; описан обычный путь открытого проекта — форк, ветка, pull request, обсуждение в issues.
//
// 🔒 ДВА ЯЗЫКА, КАК ВЕЗДЕ НА СЛУЖЕБНЫХ ЭКРАНАХ; остальные приезжают файлом.

export type BuildUi = {
  layer: string
  title: string
  lead: string
  quote: string
  quoteAuthor: string
  join: { title: string; steps: string[]; repoLabel: string; guideLabel: string }
  menuTitle: string
  menuWord: string
  sections: Record<
    "subscription" | "terminal" | "channel" | "task" | "signals" | "current" | "steps" | "steps-new" | "steps-done" | "skills" | "instruction",
    { label: string; lead: string }
  >
  terminal: {
    warnTitle: string
    workspaceLabel: string
    warnBody: string
    warnRollback: string
    warnOnly: string
    boundsTitle: string
    bounds: string[]
    sleepingTitle: string
    sleepingBody: string
    start: string
    starting: string
    stop: string
    clear: string
    running: string
    stopped: string
    exited: string
    offline: string
    forbidden: string
    keepsRunning: string
  }
  task: {
    role: string[]
    visible: string
    howToPlan: string
    placeholder: string
    add: string
    adding: string
    empty: string
    withdraw: string
    listTitle: string
    tooLong: string
    failed: string
  }
  channel: {
    lead: string
    howTo: string
    botFatherStep: string
    newBotStep: string
    botNameHint: string
    botNameStep: string
    botUserStep: string
    botUserHint: string
    copy: string
    copied: string
    tokenLabel: string
    tokenPlaceholder: string
    save: string
    saving: string
    configured: string
    notConfigured: string
    runningLabel: string
    sleeping: string
    startBtn: string
    stopBtn: string
    working: string
    allowBtn: string
    failed: string
    badFormat: string
    noToken: string
    noSuchCode: string
    tokenRejected: string
    telegramUnreachable: string
    startTimeout: string
    noBotUsername: string
    stepActivateTitle: string
    stepActivateLead: string
    activateBtn: string
    activateHint: string
    activateWaiting: string
    activatedToast: string
    greeting: string
    botDescription: string
    stepWorkTitle: string
    stepWorkLead: string
    openChatBtn: string
    othersTitle: string
    lockedActivate: string
    lockedWork: string
    stateDirLabel: string
    stepBotTitle: string
    stepTokenTitle: string
    tokenSavedToast: string
    startedToast: string
    stoppedToast: string
    allowedToast: string
    allowedCount: string
  }
  signals: {
    dropOne: string
    toastDropped: string
    lead: string
    whatHappens: string
    approve: string
    decline: string
    working: string
    toastApproved: string
    toastDeclined: string
    beyondMark: string
    empty: string
    observations: string
    repeats: string
    failed: string
    degraded: string
    beyondNote: string
  }
  current: { role: string[]; open: string; missing: string }
  steps: { role: string[]; newRole: string[]; doneRole: string[]; count: string; open: string; empty: string }
  skills: { role: string[]; open: string; empty: string }
  instruction: { role: string[]; howToChange: string; agentNote: string; missing: string }
  modal: { close: string; missing: string }
}

const EN: BuildUi = {
  layer: "Memory service",
  title: "Build this product",
  lead:
    "A workshop for developing this service: a Claude Code terminal opened in its own folder, the list of your tasks, the working state, development steps, skills and the main instruction — all in one place.",
  quote:
    "Everything here is a starter template. You can build it out for your own needs with production coding right in the browser. When you have a working solution, share it with the community on GitHub — let's build AGI together.",
  quoteAuthor: "Fractera",
  join: {
    title: "How to share your solution",
    steps: [
      "Open the repository on GitHub and press Fork — you get your own copy under your account.",
      "Create a branch named after the change, for example feature/voice-notes, and do the work there — here in the terminal or on your machine.",
      "Keep changes small and commit each finished piece with a clear message: what changed and why.",
      "Open a pull request to the original repository and describe what it solves and how you checked it.",
      "Not sure where to start or want to discuss an idea first? Open an issue — questions and proposals are welcome there.",
      "The starter is published under the MIT license: your contribution is accepted under the same terms.",
    ],
    repoLabel: "Repository on GitHub",
    guideLabel: "Contribution guide",
  },
  menuTitle: "Workshop",
  menuWord: "Menu",
  sections: {
    subscription: { label: "Sign in to your subscription", lead: "Your Claude subscription on this server. Sign in here if the builder's terminal asks for it — the same panel as on the «Claude subscription» page." },
    terminal: { label: "Claude Code terminal", lead: "Claude Code opened in the folder of this service. It sleeps until you start it." },
    channel: { label: "Control channel", lead: "Manage this service from your phone: the builder answers in Telegram with the same instruction it has in the terminal." },
    task: { label: "Add a task", lead: "Your wishes for this service. Each one becomes a request in the development inbox." },
    signals: { label: "Memory evolution", lead: "Every wish about improving memory lands here: approve it or decline it." },
    current: { label: "Current steps", lead: "Where the work stands right now." },
    steps: { label: "Development steps", lead: "Planned and completed steps of this service." },
    "steps-new": { label: "New steps", lead: "Plans that have not been completed yet." },
    "steps-done": { label: "Completed steps", lead: "Results of finished work." },
    skills: { label: "Development skills", lead: "The skills Claude Code relies on in this folder." },
    instruction: { label: "Main instruction", lead: "Who Claude Code is in this folder and by which rules it builds." },
  },
  terminal: {
    warnTitle: "What exactly you are starting",
    workspaceLabel: "The agent will be started in the workspace:",
    warnBody:
      "You are letting in a process that is fundamentally able to modify this product — and sometimes to exhaust or break the version that works right now.",
    warnRollback:
      "You can roll back to the previous version: every change lands as a commit, and the history of this folder keeps them.",
    warnOnly: "Use this only if you know what this is about.",
    boundsTitle: "Where it can and cannot go",
    bounds: [
      "It works inside this product's folder only. Neighbouring services, the machine's secret store and the guest slot are outside its reach.",
      "It can read, write and edit files here; shell commands are asked about before they run.",
      "Its identity is the builder of this product — not the memory agent that lives inside it.",
    ],
    sleepingTitle: "The terminal is asleep",
    sleepingBody:
      "Nothing is running and nothing consumes the computer's resources. Start it when you are ready to work — it will keep running while you switch to other sections, until you press Stop.",
    start: "Start Claude Code",
    starting: "Starting…",
    stop: "Stop",
    clear: "Clear screen",
    running: "Running",
    stopped: "Stopped. The process has ended and no longer uses resources.",
    exited: "The process has finished on its own.",
    offline: "Connection lost — the process keeps running on the server. Open this section again to reconnect.",
    forbidden: "The terminal is available to the architect of this project only.",
    keepsRunning: "Keeps working when you open other sections",
  },
  task: {
    role: [
      "A task is your wish for this service in plain words: what to add, change or fix.",
      "It is saved as a request in the development inbox (pre-steps). The request is data, not a command: Claude Code reads it, decides whether it belongs to the current work, and turns it into a planned development step.",
    ],
    visible: "You will see your tasks here until Claude Code turns them into planned development steps.",
    howToPlan: "To start developing an idea, open the Claude Code terminal and say: «plan a new development step from my tasks».",
    placeholder: "Describe what you want in your own words…",
    add: "Add task",
    adding: "Saving…",
    empty: "No tasks are waiting.",
    withdraw: "Withdraw",
    listTitle: "Waiting to be planned",
    tooLong: "The task is too long — 4000 characters at most.",
    failed: "The task was not saved.",
  },
  channel: {
    allowBtn: "Let in",
    badFormat: "That does not look like a bot token: BotFather gives digits, a colon, then the body.",
    botFatherStep: "Open in Telegram:",
    botNameHint: "Four things to copy, in this order — the first two are what you send, the last two are what BotFather asks for.",
    newBotStep: "Send the command:",
    botNameStep: "Name (shown in the chat header):",
    botUserStep: "Username (the bot's link):",
    botUserHint: "Must end in «bot» and may use letters, digits and underscores — no spaces and no hyphens. If it is taken, change the last four characters.",
    copied: "Copied",
    copy: "Copy",
    configured: "Token saved",
    failed: "Did not work. Try again.",
    howTo: "Create a bot in @BotFather, copy the token and paste it here. The token is stored on the server only — it never comes back to this screen.",
    lead: "This service answers in Telegram with the same builder you get in the terminal — same instruction, same rights. Each service has its own bot and its own token.",
    noToken: "No token yet — save one before starting the channel.",
    noSuchCode: "The bot no longer knows this code. Write to the bot again to get a new one.",
    tokenRejected: "Telegram did not accept this token. Copy it from BotFather again — the whole line, digits, colon and the rest.",
    telegramUnreachable: "Could not reach Telegram to check the token. Try again in a minute.",
    startTimeout: "The channel did not come up within 20 seconds. Press «Start the channel» once more; if it repeats, the Claude subscription on this server may need signing in (first section of the workshop).",
    stepActivateTitle: "Activate the connection",
    stepActivateLead: "One press. The button opens your bot in Telegram; press START (or «Send») there — and the connection is active. You do not need to type anything or copy any codes.",
    activateBtn: "Activate the connection in Telegram",
    activateHint: "Telegram will open the chat with your bot. Press the big button at the bottom of that chat.",
    activateWaiting: "Waiting for the press… as soon as it happens, the bot greets you here and the channel starts by itself.",
    activatedToast: "Connection activated, the channel is running. Write to the bot — it answers.",
    greeting: "Connection activated. I am the builder of this service: write what needs to be done, and I will do it right here.",
    botDescription: "The builder of the Fractera memory service. Press START to activate the connection — after that you can work with the service straight from Telegram.",
    stepWorkTitle: "Write to the bot",
    stepWorkLead: "Everything is ready. The bot answers with the same builder you get in the terminal — same instruction, same rights. It keeps working when you close this page.",
    openChatBtn: "Open the chat",
    othersTitle: "Someone else wrote to the bot",
    lockedActivate: "Step 3 — activating the connection — appears once the token is accepted.",
    lockedWork: "Step 4 — writing to the bot — appears once the connection is activated.",
    noBotUsername: "The bot's address is unknown: save the token again in step 2.",
    notConfigured: "Token not set",
    runningLabel: "channel is running",
    save: "Save token",
    saving: "Saving…",
    sleeping: "channel is asleep",
    startBtn: "Start the channel",
    stateDirLabel: "State folder:",
    stopBtn: "Stop",
    tokenLabel: "Bot token",
    tokenPlaceholder: "123456789:AAH…",
    working: "Starting…",
    stepBotTitle: "Create the bot in BotFather",
    stepTokenTitle: "Paste the token",
    tokenSavedToast: "Token accepted — Telegram confirmed the bot. Step 3 has appeared below: one press activates the connection.",
    startedToast: "The channel is running again. Write to the bot.",
    stoppedToast: "The channel is stopped. Nothing is running and nothing answers in Telegram.",
    allowedToast: "You are in. The bot will confirm it in Telegram — now write it what you need.",
    allowedCount: "Let in:",
  },
  signals: {
    approve: "Approve",
    dropOne: "Remove this wish",
    beyondMark: "Not a memory task",
    beyondNote:
      "A request for a different product rather than a defect: it was searched for on the marketplace and in the skills registry, and the decision is yours.",
    degraded: "The meaning store refused, so nothing was grouped. This is «not counted right now», not «no signals».",
    empty: "No tasks",
    failed: "Could not put it into work. Try again.",
    observations: "observations",
    repeats: "verbatim repeats",
    decline: "Decline",
    lead: "Every time you leave a wish about improving memory, it lands on this page. Here you can read it and either approve it or decline it. Approved wishes go into the development queue and are taken into work by your programmer agent.",
    toastApproved: "Approved: the wish left for the development inbox and will be taken into work in the queue order",
    toastDeclined: "Declined: the wish stays in memory's history and will not come back to this screen",
    toastDropped: "The wish is removed from this screen — it stays in memory's history and will not come back",
    whatHappens:
      "After you press Approve, the card disappears from this screen and becomes a request in the development inbox (pre-steps) — your programmer agent takes it in the order of the current queue. Decline removes it from here without a request.",
    working: "Working…",
  },
  current: {
    role: [
      "current-steps.md is the working memory of development. It is the very memory that survives a sudden loss of the session — a crash, a closed laptop, a lost connection — so the next session continues from the same place.",
      "Claude Code reads it first in every session, before the plan and before the code, and updates it after every event: a decision, a commit, a found defect.",
    ],
    open: "Open the current state",
    missing: "Work has not started yet: this file appears when the builder writes down the first state.",
  },
  steps: {
    role: [
      "A development step is a unit of work with a plan, substeps, proofs and a result. The numbering is continuous.",
      "Open «New steps» or «Completed steps» in the menu on the left: the newest step is on top, the first one at the bottom.",
    ],
    newRole: [
      "A new step is a plan: what is being built, what counts as done and how it will be proven — agreed before the first line of code.",
      "When the step is finished, its plan is removed from here and a result appears among the completed steps.",
    ],
    doneRole: [
      "A completed step is a result: what was done, the commit hash, two proofs from different planes, the mistakes made and how the skills evolved.",
    ],
    count: "Steps",
    open: "Open",
    empty: "No steps here yet.",
  },
  skills: {
    role: [
      "A skill is a packaged hint Claude Code loads when a task needs it: how steps are planned, how work is proven, how the memory stores are used.",
      "A skill is a hint, not a law: if Claude Code knows a better way for the case in front of it, it says so.",
    ],
    open: "Open",
    empty: "No skills were found in this folder.",
  },
  instruction: {
    role: [
      "CLAUDE.md is the main instruction: Claude Code opened in this folder reads it at the start of every session and works as the manager of memory — recording, retrieving, answering.",
      "Development is the rare case and happens in this terminal: it follows the skill memory-development — how work is planned in steps, proven and delivered.",
    ],
    howToChange:
      "These texts are not edited here. To change them, add a task describing what to optimise, then open the Claude Code terminal and ask it to plan your task.",
    agentNote: "Read-only view of CLAUDE.md",
    missing: "CLAUDE.md was not found in this folder.",
  },
  modal: { close: "Close", missing: "This document was not found." },
}

const RU: BuildUi = {
  layer: "Служба памяти",
  title: "Постройте этот продукт",
  lead:
    "Мастерская разработки этой службы: терминал Claude Code, открытый в её папке, список ваших заданий, текущее состояние работы, шаги разработки, навыки и главная инструкция — в одном месте.",
  quote:
    "Всё, что здесь сделано, — стартовый шаблон. Вы можете достроить его под свои нужды продакшен-кодингом прямо в браузере. Когда решение готово, поделитесь им с сообществом на GitHub — давайте строить AGI вместе.",
  quoteAuthor: "Fractera",
  join: {
    title: "Как поделиться своим решением",
    steps: [
      "Откройте репозиторий на GitHub и нажмите Fork — у вас появится своя копия под вашей учётной записью.",
      "Создайте ветку с именем изменения, например feature/voice-notes, и работайте в ней — здесь, в терминале, или на своём компьютере.",
      "Делайте изменения небольшими и кладите каждую законченную часть коммитом с понятным сообщением: что изменилось и зачем.",
      "Откройте pull request в исходный репозиторий и опишите, какую задачу он решает и как вы это проверили.",
      "Не знаете, с чего начать, или хотите сначала обсудить идею? Откройте issue — вопросы и предложения там приветствуются.",
      "Стартер опубликован под лицензией MIT: ваш вклад принимается на тех же условиях.",
    ],
    repoLabel: "Репозиторий на GitHub",
    guideLabel: "Как участвовать",
  },
  menuTitle: "Мастерская",
  menuWord: "Меню",
  sections: {
    subscription: { label: "Вход в подписку", lead: "Ваша подписка Claude на этом сервере. Войдите здесь, если терминал строителя просит вход, — это та же панель, что на странице «Подписка Claude»." },
    terminal: { label: "Терминал Claude Code", lead: "Claude Code, открытый в папке этой службы. Спит, пока вы его не запустите." },
    channel: { label: "Канал управления", lead: "Управляйте службой с телефона: в Telegram отвечает тот же строитель, что и в терминале, с той же инструкцией." },
    task: { label: "Добавить задание", lead: "Ваши пожелания к этой службе. Каждое становится заявкой в приёмной разработки." },
    signals: { label: "Эволюция памяти", lead: "Каждое пожелание об улучшении памяти попадает сюда: его можно утвердить или отклонить." },
    current: { label: "Текущие шаги", lead: "Где работа находится прямо сейчас." },
    steps: { label: "Шаги разработки", lead: "Запланированные и завершённые шаги этой службы." },
    "steps-new": { label: "Новые шаги", lead: "Планы, которые ещё не завершены." },
    "steps-done": { label: "Завершённые шаги", lead: "Итоги законченной работы." },
    skills: { label: "Навыки разработки", lead: "Навыки, на которые опирается Claude Code в этой папке." },
    instruction: { label: "Главная инструкция", lead: "Кто такой Claude Code в этой папке и по каким правилам он строит." },
  },
  terminal: {
    warnTitle: "Что именно вы запускаете",
    workspaceLabel: "Агент будет запущен в рабочем пространстве:",
    warnBody:
      "Вы впускаете процесс, который на фундаментальном уровне способен изменить этот продукт — и иногда истощить или сломать ту версию, которая работает сейчас.",
    warnRollback:
      "Откат к предыдущей версии возможен: каждая правка ложится коммитом, и история этой папки их хранит.",
    warnOnly: "Используйте это только если вы знаете, о чём речь.",
    boundsTitle: "Куда он может зайти, а куда нет",
    bounds: [
      "Работает только внутри папки этого продукта. Соседние службы, склад секретов машины и гостевой слот ему недоступны.",
      "Здесь он может читать, писать и править файлы; команды оболочки спрашивает перед запуском.",
      "Его личность — строитель этого продукта, а не агент памяти, который внутри него живёт.",
    ],
    sleepingTitle: "Терминал спит",
    sleepingBody:
      "Ничего не запущено, и ресурсы компьютера не расходуются. Запустите, когда будете готовы работать: терминал продолжит работать, пока вы переходите в другие разделы, — до нажатия «Остановить».",
    start: "Запустить Claude Code",
    starting: "Запускаю…",
    stop: "Остановить",
    clear: "Очистить экран",
    running: "Работает",
    stopped: "Остановлен. Процесс завершён и больше не расходует ресурсы.",
    exited: "Процесс завершился сам.",
    offline: "Связь прервалась — процесс продолжает работать на сервере. Откройте этот раздел снова, чтобы подключиться.",
    forbidden: "Терминал доступен только архитектору проекта.",
    keepsRunning: "Продолжает работать, когда вы открываете другие разделы",
  },
  task: {
    role: [
      "Задание — ваше пожелание к этой службе обычными словами: что добавить, изменить или исправить.",
      "Оно сохраняется заявкой в приёмной разработки (pre-steps). Заявка — это данные, а не команда: Claude Code читает её, решает, относится ли она к текущей работе, и превращает в запланированный шаг разработки.",
    ],
    visible: "Вы будете видеть свои задания здесь, пока Claude Code не превратит их в запланированные шаги разработки.",
    howToPlan: "Чтобы начать разрабатывать вашу идею, откройте терминал Claude Code и скажите: «запланируй новый шаг разработки по моим заданиям».",
    placeholder: "Опишите своими словами, чего вы хотите…",
    add: "Добавить задание",
    adding: "Сохраняю…",
    empty: "Заданий в ожидании нет.",
    withdraw: "Отозвать",
    listTitle: "Ждут планирования",
    tooLong: "Задание слишком длинное — не больше 4000 знаков.",
    failed: "Задание не сохранилось.",
  },
  channel: {
    allowBtn: "Впустить",
    badFormat: "Это не похоже на токен бота: BotFather выдаёт цифры, двоеточие и тело.",
    botFatherStep: "Откройте в Telegram:",
    botNameHint: "Четыре строки по порядку: первые две вы отправляете сами, последние две спросит BotFather.",
    newBotStep: "Отправьте команду:",
    botNameStep: "Имя (видно в шапке чата):",
    botUserStep: "Ручка (адрес бота):",
    botUserHint: "Обязана заканчиваться на «bot»; допустимы буквы, цифры и подчёркивания — пробелов и дефисов там не бывает. Если занята, поменяйте последние четыре знака.",
    copied: "Скопировано",
    copy: "Копировать",
    configured: "Токен сохранён",
    failed: "Не получилось. Попробуйте ещё раз.",
    howTo: "Создайте бота в @BotFather, скопируйте токен и вставьте сюда. Токен хранится только на сервере и обратно на этот экран не возвращается.",
    lead: "В Telegram отвечает тот же строитель, что и в терминале, — с той же инструкцией и теми же правами. У каждой службы свой бот и свой токен.",
    noToken: "Токена пока нет — сохраните его, прежде чем запускать канал.",
    noSuchCode: "Бот больше не знает этот код. Напишите боту ещё раз, чтобы получить новый.",
    tokenRejected: "Telegram не принял этот токен. Скопируйте его из BotFather ещё раз — всю строку: цифры, двоеточие и остальное.",
    telegramUnreachable: "Не удалось связаться с Telegram, чтобы проверить токен. Попробуйте через минуту.",
    startTimeout: "Канал не поднялся за 20 секунд. Нажмите «Запустить канал» ещё раз; если повторится — возможно, на этом сервере нужно войти в подписку Claude (первый раздел мастерской).",
    stepActivateTitle: "Активируйте соединение",
    stepActivateLead: "Одно нажатие. Кнопка откроет вашего бота в Telegram — нажмите там START (или «Отправить»), и соединение активно. Ничего печатать и никакие коды копировать не нужно.",
    activateBtn: "Активировать соединение в Telegram",
    activateHint: "Telegram откроет чат с вашим ботом. Нажмите большую кнопку внизу этого чата.",
    activateWaiting: "Жду нажатия… как только оно случится, бот поздоровается с вами, а канал запустится сам.",
    activatedToast: "Соединение активировано, канал запущен. Пишите боту — он отвечает.",
    greeting: "Соединение активировано. Я строитель этой службы: напишите, что нужно сделать, и я сделаю это прямо здесь.",
    botDescription: "Строитель службы памяти Fractera. Нажмите START, чтобы активировать соединение, — после этого можно работать со службой прямо из Telegram.",
    stepWorkTitle: "Пишите боту",
    stepWorkLead: "Всё готово. В Telegram отвечает тот же строитель, что и в терминале, — с той же инструкцией и теми же правами. Он продолжает работать, когда вы закрываете эту страницу.",
    openChatBtn: "Открыть чат",
    othersTitle: "Боту написал кто-то ещё",
    lockedActivate: "Шаг 3 — активировать соединение — появится, когда токен будет принят.",
    lockedWork: "Шаг 4 — писать боту — появится, когда соединение будет активировано.",
    noBotUsername: "Адрес бота неизвестен: сохраните токен ещё раз в шаге 2.",
    notConfigured: "Токен не задан",
    runningLabel: "канал работает",
    save: "Сохранить токен",
    saving: "Сохраняю…",
    sleeping: "канал спит",
    startBtn: "Запустить канал",
    stateDirLabel: "Папка состояния:",
    stopBtn: "Остановить",
    tokenLabel: "Токен бота",
    tokenPlaceholder: "123456789:AAH…",
    working: "Запускаю…",
    stepBotTitle: "Заведите бота в BotFather",
    stepTokenTitle: "Вставьте токен",
    tokenSavedToast: "Токен принят — Telegram подтвердил бота. Ниже появился шаг 3: одно нажатие активирует соединение.",
    startedToast: "Канал снова запущен. Пишите боту.",
    stoppedToast: "Канал остановлен. Ничего не работает и в Telegram никто не отвечает.",
    allowedToast: "Вы впущены. Бот подтвердит это в Telegram — теперь пишите ему, что нужно.",
    allowedCount: "Впущено:",
  },
  signals: {
    approve: "Утвердить",
    dropOne: "Убрать это пожелание",
    beyondMark: "Не задача памяти",
    beyondNote:
      "Это заявка на другой продукт, а не дефект: готовое решение искалось на маркетплейсе и в реестре навыков, решение за вами.",
    degraded: "Склад смысла отказал, и группировки не было. Это «сейчас не считаю», а не «сигналов нет».",
    empty: "Задания отсутствуют",
    failed: "Не удалось взять в работу. Попробуйте ещё раз.",
    observations: "наблюдений",
    repeats: "дословных повторов",
    decline: "Отклонить",
    lead: "Каждый раз, когда вы оставляете пожелание об улучшении памяти, оно попадает на эту страницу. Здесь вы можете с ним ознакомиться и либо утвердить его, либо отклонить. Утверждённые пожелания будут поставлены в очередь разработки и приняты в работу вашим агентом-программистом.",
    toastApproved: "Утверждено: пожелание уехало в приёмную разработки и будет принято в работу в порядке очереди",
    toastDeclined: "Отклонено: пожелание остаётся в истории памяти и на этот экран больше не вернётся",
    toastDropped: "Пожелание убрано с этого экрана — оно остаётся в истории памяти и сюда больше не вернётся",
    whatHappens:
      "После нажатия «Утвердить» карточка исчезнет с этого экрана и станет заявкой в приёмной разработки (pre-steps) — ваш агент-программист примет её в работу в порядке текущей очереди. «Отклонить» убирает пожелание отсюда без заявки.",
    working: "Минуту…",
  },
  current: {
    role: [
      "current-steps.md — рабочая память разработки. Это та самая память, которая переживает неожиданную потерю сессии — сбой, закрытую крышку ноутбука, оборванную связь, — чтобы следующая сессия продолжила с того же места.",
      "Claude Code читает её первой в каждой сессии, раньше плана и раньше кода, и дописывает после каждого события: решения, коммита, найденного дефекта.",
    ],
    open: "Открыть текущее состояние",
    missing: "Работа ещё не начиналась: файл появится, когда строитель запишет первое состояние.",
  },
  steps: {
    role: [
      "Шаг разработки — единица работы с планом, подшагами, доказательствами и итогом. Нумерация сквозная.",
      "Откройте в меню слева «Новые шаги» или «Завершённые шаги»: последний шаг вверху, первый — внизу.",
    ],
    newRole: [
      "Новый шаг — это план: что строится, что считается готовым и чем это будет доказано; он согласуется до первой строки кода.",
      "Когда шаг закончен, его план убирается отсюда, а итог появляется среди завершённых шагов.",
    ],
    doneRole: [
      "Завершённый шаг — это итог: что сделано, хэш коммита, два доказательства из разных плоскостей, допущенные ошибки и эволюция навыков.",
    ],
    count: "Шагов",
    open: "Открыть",
    empty: "Шагов здесь пока нет.",
  },
  skills: {
    role: [
      "Навык — упакованная подсказка, которую Claude Code загружает, когда задача её требует: как планируются шаги, как доказывается работа, как устроены хранилища памяти.",
      "Навык — подсказка, а не закон: если Claude Code знает способ лучше для случая перед ним, он так и скажет.",
    ],
    open: "Открыть",
    empty: "Навыков в этой папке не найдено.",
  },
  instruction: {
    role: [
      "CLAUDE.md — главная инструкция: Claude Code, открытый в этой папке, читает её в начале каждой сессии и работает управляющим памятью — записывает, находит, отвечает.",
      "Разработка — редкий случай, и она идёт в этом терминале по навыку memory-development: как работа планируется шагами, доказывается и доставляется.",
    ],
    howToChange:
      "Эти тексты здесь не редактируются. Чтобы их изменить, добавьте задание с описанием того, что оптимизировать, затем откройте терминал Claude Code и попросите запланировать ваше задание.",
    agentNote: "Просмотр CLAUDE.md только для чтения",
    missing: "CLAUDE.md в этой папке не найден.",
  },
  modal: { close: "Закрыть", missing: "Такой документ не найден." },
}

const DICT: Record<string, BuildUi> = { en: EN, ru: RU }

/** Слова языка. Неизвестный язык падает на английский — как у соседей. */
export function buildUi(lang: string): BuildUi {
  return DICT[lang] ?? EN
}
