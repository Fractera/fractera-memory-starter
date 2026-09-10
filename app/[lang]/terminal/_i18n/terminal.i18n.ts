// СЛОВА СТРАНИЦЫ ТЕРМИНАЛА — В СВОЁМ `_i18n`, КАК У `settings`.
//
// 🎯 СЛОВО ВЛАДЕЛЬЦА 2026-09-06: маршрут держит своё внутри себя, а не тянет из
// общих папок.

export type TerminalUi = {
  /** Надзаголовок — тот же слой, что у настроек: человек не переходит в другой продукт. */
  layer: string
  title: string
  lead: string
}

const DICT: Record<string, TerminalUi> = {
  en: {
    layer: "Memory service",
    title: "Claude subscription",
    lead: "Sign in to your Claude subscription for this whole server — the chat and the memory both think with it. One sign-in is enough for both.",
  },
  ru: {
    layer: "Служба памяти",
    title: "Подписка Claude",
    lead: "Вход в подписку Claude для всего сервера — ей думают и чат, и память. Одного входа достаточно для обоих.",
  },
}

/** Слова страницы. Незнакомый язык деградирует до английского, а не до пустоты. */
export function terminalUi(lang: string): TerminalUi {
  return DICT[lang] ?? DICT.en
}
