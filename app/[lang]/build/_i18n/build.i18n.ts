// СЛОВА СТРАНИЦЫ «ПОСТРОЙТЕ ЭТОТ ПРОДУКТ» (189-8).
//
// 🔒 ТЕКСТ ПРЕДУПРЕЖДЕНИЯ ИДЁТ ОТ СЛОВ ВЛАДЕЛЬЦА И НЕ СМЯГЧАЕТСЯ. Он написал:
// «вы впускаете процесс, который на фундаментальном уровне способен
// модифицировать и даже иногда истощить текущую версию. Но вы можете сделать
// откат к предыдущей версии. Используйте это только если вы знаете, о чём речь!»
// Смягчив это до «будьте внимательны», мы получили бы вежливость вместо
// предупреждения — и человек узнал бы цену после, а не до.
//
// 🔒 ДВА ЯЗЫКА, КАК ВЕЗДЕ НА СЛУЖЕБНЫХ ЭКРАНАХ; остальные приезжают файлом.

export type BuildUi = {
  bounds: string[]
  boundsTitle: string
  layer: string
  lead: string
  title: string
  warnBody: string
  warnOnly: string
  warnRollback: string
  warnTitle: string
}

const EN: BuildUi = {
  bounds: [
    "It works inside this product's folder only. Neighbouring services, the machine's secret store and the guest slot are outside its reach.",
    "It can read, write and edit files here; shell commands are asked about before they run.",
    "Its identity is the builder of this product — not the memory agent that lives inside it.",
    "Every finished change should be committed: a rollback is possible only while there is something to roll back to.",
  ],
  boundsTitle: "Where it can and cannot go",
  layer: "Memory service",
  lead:
    "A terminal with Claude Code opened in this product's own folder. Ask it for a change, and it will make it here — in the code, the documents and the settings of this service.",
  title: "Build this product",
  warnBody:
    "You are letting in a process that is fundamentally able to modify this product — and sometimes to exhaust or break the version that works right now.",
  warnOnly: "Use this only if you know what this is about.",
  warnRollback:
    "You can roll back to the previous version: every change lands as a commit, and the history of this folder keeps them.",
  warnTitle: "What you are letting in",
}

const RU: BuildUi = {
  bounds: [
    "Работает только внутри папки этого продукта. Соседние службы, склад секретов машины и гостевой слот ему недоступны.",
    "Здесь он может читать, писать и править файлы; команды оболочки спрашивает перед запуском.",
    "Его личность — строитель этого продукта, а не агент памяти, который внутри него живёт.",
    "Каждую законченную правку он кладёт коммитом: откат возможен ровно до тех пор, пока есть к чему откатываться.",
  ],
  boundsTitle: "Куда он может зайти, а куда нет",
  layer: "Служба памяти",
  lead:
    "Терминал с Claude Code, открытым в папке самого продукта. Попросите изменение — и он сделает его здесь: в коде, документах и настройках этой службы.",
  title: "Постройте этот продукт",
  warnBody:
    "Вы впускаете процесс, который на фундаментальном уровне способен изменить этот продукт — и иногда истощить или сломать ту версию, которая работает сейчас.",
  warnOnly: "Используйте это только если вы знаете, о чём речь.",
  warnRollback:
    "Откат к предыдущей версии возможен: каждая правка ложится коммитом, и история этой папки их хранит.",
  warnTitle: "Что именно вы впускаете",
}

const DICT: Record<string, BuildUi> = { en: EN, ru: RU }

/** Слова языка. Неизвестный язык падает на английский — как у соседей. */
export function buildUi(lang: string): BuildUi {
  return DICT[lang] ?? EN
}
