// РОДЫ ФАЙЛОВ ПАМЯТИ — ЕДИНСТВЕННЫЙ СПИСОК РАСШИРЕНИЙ (194-2, вынесен в свой модуль 200-5).
//
// 🔒 ПОЧЕМУ ОТДЕЛЬНЫЙ МОДУЛЬ: список родов жил внутри `lib/describe.mjs`, а тот тянет `child_process` и `fs` — экран
// стенда его импортировать не может. Кнопки загрузки обязаны знать ровно те роды, которые память описывает, поэтому
// список вынесен сюда, и `describe.mjs` берёт его отсюда же. Второй список «для кнопок» разошёлся бы с памятью молча.
// 🔒 МОДУЛЬ ЧИСТЫЙ: ни одного серверного импорта, его зовут и сервер, и браузер.
// 🔒 JSON, XML и YAML с 194-10 — КОД: их род решает единый список `code-langs.mjs`, а не этот.

import { codeExtensions } from "../_tools/code-view/types/code-langs.mjs"

export const EXT = {
  audio: [".mp3", ".m4a", ".wav", ".ogg", ".oga", ".opus", ".flac", ".webm", ".aac"],
  image: [".png", ".jpg", ".jpeg", ".gif", ".webp"],
  pdf: [".pdf"],
  text: [".txt", ".md", ".markdown", ".mdx", ".csv", ".tsv", ".html", ".htm"],
  video: [".mp4", ".mov", ".mkv", ".avi", ".m4v"],
}

/** Роды кнопок загрузки стенда — порождены из `EXT` и списка языков кода (200-5). */
export const UPLOAD_KINDS = [...Object.keys(EXT), "code"]

/** Значение `accept` поля выбора файла для рода: расширения через запятую. */
export function acceptOf(kind) {
  if (kind === "code") return codeExtensions().map((e) => `.${e}`).join(",")
  return (EXT[kind] ?? []).join(",")
}
