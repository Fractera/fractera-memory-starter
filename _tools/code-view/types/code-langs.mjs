// ЯЗЫКИ КОДА ПО ИМЕНИ ФАЙЛА — ЕДИНСТВЕННЫЙ СПИСОК В СЛУЖБЕ ПАМЯТИ (194-10).
//
// Соответствие перенесено ДОСЛОВНО из `fractera-next-starter/_tools/code-view/types/code-view.ts`.
// 🔒 АДАПТАЦИЯ: список живёт в `.mjs`, а `code-view.ts` его переэкспортирует. Его читают дверь описания
// (`lib/describe.mjs`), склад объектов (`lib/fractera/objects.ts`), экран и приборы — последние без
// сборки. Второй список «для удобства» разошёлся бы с этим молча.
//
// Из источника: соответствие явное, а не «взять расширение как есть»: `.mjs` это javascript, `.yml`
// это yaml, а неизвестное расширение обязано стать `text`, иначе подсветчик бросит исключение на
// попытке загрузить несуществующую грамматику.

export const BY_EXT = {
  html: "html", htm: "html",
  css: "css", scss: "scss", sass: "sass", less: "less",
  js: "javascript", mjs: "javascript", cjs: "javascript", jsx: "jsx",
  ts: "typescript", mts: "typescript", cts: "typescript", tsx: "tsx",
  json: "json", jsonc: "jsonc",
  md: "markdown", mdx: "mdx",
  yml: "yaml", yaml: "yaml",
  sh: "bash", bash: "bash", zsh: "bash",
  sql: "sql", py: "python", rb: "ruby", go: "go", rs: "rust",
  php: "php", java: "java", kt: "kotlin", swift: "swift",
  toml: "toml", ini: "ini", xml: "xml", svg: "xml",
  env: "dotenv", dockerfile: "docker",
  txt: "text",
};

export function langOf(filename) {
  const name = String(filename ?? "");
  const dot = name.lastIndexOf(".");
  if (dot < 0) {
    // Файлы без расширения, у которых язык определяет имя.
    return name.toLowerCase() === "dockerfile" ? "docker" : "text";
  }
  return BY_EXT[name.slice(dot + 1).toLowerCase()] ?? "text";
}

/**
 * Это исходный код, а не документ (194-10).
 * 🔒 Markdown, HTML и простой текст — НЕ код в смысле памяти: у них свои роды и свой просмотр
 * (страница, отрисованный документ). В список языков они входят только ради подсветки.
 */
const NOT_CODE = new Set(["md", "mdx", "html", "htm", "txt"]);

/** Расширения исходного кода без точки — для кнопки «Код» стенда памяти (200-5), из того же списка, что `isCodeName`. */
export function codeExtensions() {
  return Object.keys(BY_EXT).filter((ext) => !NOT_CODE.has(ext));
}

export function isCodeName(filename) {
  const name = String(filename ?? "");
  const dot = name.lastIndexOf(".");
  if (dot < 0) return name.toLowerCase() === "dockerfile";
  const ext = name.slice(dot + 1).toLowerCase();
  return Object.prototype.hasOwnProperty.call(BY_EXT, ext) && !NOT_CODE.has(ext);
}
