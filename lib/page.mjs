// СТРАНИЦА ЖУРНАЛА — ТОТ ЖЕ ДОКУМЕНТ, ТОЛЬКО ГЛАЗАМИ ЧЕЛОВЕКА (177-3).
//
// 🔒 ВТОРОГО ИСТОЧНИКА НЕ СУЩЕСТВУЕТ. Решение владельца: «ты читаешь Markdown
// документ, я читаю страницу из этого [же] документа». Здесь нет ни своей базы,
// ни кэша: страница — это функция от файла, и ничего больше.
//
// 🔒 РАЗБОР MARKDOWN СВОЙ И НАМЕРЕННО МАЛЕНЬКИЙ. У службы ноль зависимостей;
// пакет ради заголовков и абзацев — ещё один способ не запуститься на чистой
// машине. Поддерживается ровно то, что журнал сам и пишет: `##`, `**жирный**`,
// `` `код` ``, списки, цитаты.

/**
 * 🛑 ЭКРАНИРОВАНИЕ ИДЁТ ПЕРВЫМ, ДО ЛЮБОГО РАЗБОРА, И ЭТО НЕ ФОРМАЛЬНОСТЬ.
 * В журнал попадают ФРАЗЫ ЧЕЛОВЕКА — то есть текст, пришедший снаружи. Разбери
 * мы разметку раньше, чем обезвредили текст, — и фраза перестала бы быть
 * текстом. Тот же закон, что у заявок гостевой приёмной: опасны не символы,
 * опасна структура.
 */
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

/** Внутристрочное: жирный и код. Применяется к УЖЕ экранированному тексту. */
function inline(s) {
  return s
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
}

/**
 * Markdown → HTML.
 *
 * 🔒 ДОКУМЕНТ РЕЖЕТСЯ НА ЗАПИСИ ПО `## `, И НОВЫЕ ПОКАЗЫВАЮТСЯ СВЕРХУ. В файле
 * они снизу, потому что дописываются в конец; человеку важно последнее. Это
 * единственное расхождение между файлом и страницей, и оно про порядок, а не
 * про содержание.
 */
export function renderJournal(md) {
  const nl = String.fromCharCode(10)
  const text = String(md ?? "")
  if (!text.trim()) return ""

  // Всё, что стоит до первой записи (например, пометка об обрезке), — вступление.
  const parts = text.split(new RegExp(`${nl}(?=## )`))
  const blocks = []
  for (const raw of parts) {
    const piece = raw.trim()
    if (piece) blocks.push(piece)
  }

  const head = blocks.length && !blocks[0].startsWith("## ") ? blocks.shift() : null
  blocks.reverse()
  if (head) blocks.push(head)

  return blocks.map(renderBlock).join(nl)
}

function renderBlock(block) {
  const nl = String.fromCharCode(10)
  const out = []
  let list = null

  const flush = () => {
    if (list) {
      out.push(`<ul>${list.join("")}</ul>`)
      list = null
    }
  }

  for (const rawLine of block.split(nl)) {
    const line = escapeHtml(rawLine.trimEnd())
    if (!line.trim()) {
      flush()
      continue
    }
    if (line.startsWith("## ")) {
      flush()
      out.push(`<h2>${inline(line.slice(3))}</h2>`)
      continue
    }
    if (line.startsWith("&gt; ")) {
      flush()
      out.push(`<blockquote>${inline(line.slice(5))}</blockquote>`)
      continue
    }
    const bullet = line.match(/^\s*[-*]\s+(.*)$/)
    if (bullet) {
      if (!list) list = []
      list.push(`<li>${inline(bullet[1])}</li>`)
      continue
    }
    flush()
    out.push(`<p>${inline(line)}</p>`)
  }
  flush()
  return `<article class="entry">${out.join("")}</article>`
}

/**
 * Отказ, объясняющий себя.
 *
 * 🛑 ГОЛЫЙ КОД НА СЛУЖЕБНОЙ СТРАНИЦЕ ЧИТАЕТСЯ КАК ПОЛОМКА СЛУЖБЫ — то есть ровно
 * как то, что человек и пришёл сюда проверять. Поэтому отказ говорит, чего не
 * хватило и что с этим делать.
 */
export function deniedPage(why) {
  const nl = String.fromCharCode(10)
  return [
    "<!doctype html>",
    '<html lang="ru"><head><meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    "<title>Журнал памяти — нет доступа</title>",
    "<style>body{margin:0;font:14px/1.6 ui-sans-serif,system-ui,sans-serif;color-scheme:light dark}",
    ".b{max-width:520px;margin:14vh auto;padding:0 20px}h1{font-size:18px}p{opacity:.75}</style>",
    "</head><body><div class=b>",
    "<h1>Журнал памяти закрыт</h1>",
    `<p>Причина: ${escapeHtml(why)}.</p>`,
    "<p>Журнал показывает внутреннюю работу службы и открыт только роли архитектора. ",
    "Войдите в проект — вход единый для всех служб, и после него эта страница откроется сама.</p>",
    "</div></body></html>",
  ].join(nl)
}

/**
 * Целая страница.
 *
 * 🔒 СТИЛИ ВНУТРИ, БЕЗ ВНЕШНИХ ФАЙЛОВ. Служебный экран не имеет права зависеть
 * от второго запроса: он нужен ровно тогда, когда что-то уже сломалось.
 * 🛑 И ОН НЕ ВИТРИНА: читаемость, а не дизайн.
 */
export function journalPage({ bytes, cleared, entries, html, who }) {
  const nl = String.fromCharCode(10)
  const note = cleared === undefined
    ? ""
    : `<p class="ok">Стёрто записей: ${escapeHtml(String(cleared))}. Знание о людях не затронуто.</p>`

  const empty = `<p class="empty">Журнал пуст: с последней очистки память ничего не делала.
    Это не отказ — записи появятся, как только к памяти обратятся.</p>`

  return [
    "<!doctype html>",
    '<html lang="ru"><head><meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    "<title>Журнал памяти</title>",
    "<style>",
    ":root{color-scheme:light dark;--bg:#fff;--fg:#1a1a1a;--muted:#6b6b6b;--line:#e3e3e3;--card:#fafafa;--warn:#b45309;--ok:#166534}",
    "@media(prefers-color-scheme:dark){:root{--bg:#161616;--fg:#ededed;--muted:#9a9a9a;--line:#2e2e2e;--card:#1e1e1e;--warn:#fbbf24;--ok:#4ade80}}",
    "*{box-sizing:border-box}",
    "body{margin:0;background:var(--bg);color:var(--fg);font:14px/1.55 ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif}",
    ".wrap{max-width:900px;margin:0 auto;padding:24px 16px 64px}",
    "header{display:flex;flex-wrap:wrap;gap:12px;align-items:baseline;justify-content:space-between;border-bottom:1px solid var(--line);padding-bottom:12px}",
    "h1{font-size:20px;margin:0}",
    ".meta{color:var(--muted);font-size:13px}",
    ".entry{border:1px solid var(--line);background:var(--card);border-radius:8px;padding:12px 14px;margin:14px 0}",
    ".entry h2{font-size:13px;margin:0 0 8px;color:var(--muted);font-weight:600;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}",
    ".entry p{margin:6px 0}",
    ".entry ul{margin:6px 0;padding-left:20px}",
    ".entry code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;background:rgba(127,127,127,.14);padding:1px 4px;border-radius:4px}",
    "blockquote{margin:8px 0;padding:8px 12px;border-left:3px solid var(--warn);color:var(--warn);background:rgba(180,83,9,.07)}",
    "button{font:inherit;padding:6px 12px;border:1px solid var(--line);background:transparent;color:inherit;border-radius:6px;cursor:pointer}",
    "button:hover{background:rgba(127,127,127,.12)}",
    ".empty{color:var(--muted);border:1px dashed var(--line);border-radius:8px;padding:18px;text-align:center}",
    ".ok{color:var(--ok)}",
    ".foot{margin-top:28px;color:var(--muted);font-size:12px;border-top:1px solid var(--line);padding-top:12px}",
    "</style></head><body><div class=wrap>",
    "<header><h1>Журнал памяти</h1>",
    `<span class="meta">${escapeHtml(String(entries))} записей · ${escapeHtml(String(bytes))} байт${who ? ` · ${escapeHtml(who)}` : ""}</span>`,
    "</header>",
    note,
    // 🔒 КНОПКА ГОВОРИТ, ЧТО СТИРАЕТ НАСОВСЕМ. Необратимое действие, названное
    // мягко, однажды нажимают «посмотреть, что будет».
    '<form method="post" action="/clear" style="margin:14px 0">',
    '<button type="submit">Очистить историю — стирает насовсем</button>',
    "</form>",
    html || empty,
    '<p class="foot">Этот же документ читает агент разработки — файлом на диске. ',
    "Очистка стирает его для обоих сразу: второго источника нет.</p>",
    "</div></body></html>",
  ].join(nl)
}
