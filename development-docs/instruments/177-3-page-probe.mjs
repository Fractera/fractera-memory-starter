// Прибор 177-3: страница — функция от документа, и чужой текст в ней безопасен.
//
// 🔒 ПРОВЕРЯЕТ РАЗБОР, А НЕ СЕТЬ. Замок и живой обмен доказываются на сервере;
// здесь — то, что дешевле и надёжнее проверить без него: экранирование чужого
// текста, порядок записей и честная пустота.

const { deniedPage, journalPage, renderJournal } = await import(
  new URL("../../lib/page.mjs", import.meta.url).href
)

let pass = 0
let fail = 0
const check = (name, ok, got) => {
  if (ok) { pass++; console.log(`  ✓ ${name}`) }
  else { fail++; console.log(`  ✗ ${name} — получено: ${String(got).slice(0, 240)}`) }
}

const NL = String.fromCharCode(10)

console.log("== 1. ПУСТОТА ЧЕСТНА, А НЕ МОЛЧАЛИВА ==")
check("пустой документ даёт пустую разметку", renderJournal("") === "", renderJournal(""))
const emptyPage = journalPage({ bytes: 0, entries: 0, html: "" })
check("страница объясняет пустоту словами", emptyPage.includes("Журнал пуст"), "нет объяснения")
check("и говорит, что это НЕ отказ", emptyPage.includes("Это не отказ"), "нет")

console.log("== 2. ЧУЖОЙ ТЕКСТ ЭКРАНИРУЕТСЯ — ГЛАВНОЕ В ЭТОМ ПРИБОРЕ ==")
// В журнал попадают фразы человека: он может написать что угодно, включая
// разметку. Она обязана остаться ТЕКСТОМ.
const nasty = `## 2026-09-10 10:00:00 · remember${NL}${NL}**Пришло:** <img src=x onerror=alert(1)> и <script>alert(2)</script>${NL}`
const rendered = renderJournal(nasty)
check("тега script в разметке нет", !rendered.includes("<script>"), rendered.slice(0, 160))
check("тега img в разметке нет", !rendered.includes("<img"), rendered.slice(0, 160))
check("но текст виден человеку", rendered.includes("&lt;script&gt;"), rendered.slice(0, 160))
check("обработчик остался текстом", rendered.includes("onerror=alert(1)"), "потерян")

console.log("== 3. НЕГАТИВНЫЙ КОНТРОЛЬ: своя разметка журнала РАБОТАЕТ ==")
// Если бы экранирование съедало всё подряд, предыдущая проверка прошла бы
// по причине собственной слепоты — жирный и заголовок обязаны остаться живыми.
const ours = `## 2026-09-10 10:00:00 · remember · 12 мс${NL}${NL}**Пришло:** привет${NL}${NL}**Отброшено:**${NL}  - догадка без основания${NL}`
const good = renderJournal(ours)
check("заголовок записи стал h2", good.includes("<h2>"), good.slice(0, 120))
check("жирный стал strong", good.includes("<strong>Пришло:</strong>"), good.slice(0, 200))
check("список стал ul/li", good.includes("<li>догадка без основания</li>"), good.slice(0, 300))

console.log("== 4. НОВЫЕ ЗАПИСИ СВЕРХУ, ХОТЯ В ФАЙЛЕ ОНИ СНИЗУ ==")
const two = `## 10:00:00 · remember${NL}${NL}**Пришло:** ПЕРВАЯ${NL}${NL}## 11:00:00 · recall${NL}${NL}**Пришло:** ВТОРАЯ${NL}`
const order = renderJournal(two)
check("вторая идёт раньше первой", order.indexOf("ВТОРАЯ") < order.indexOf("ПЕРВАЯ"), "порядок как в файле")
check("обе записи на месте", order.includes("ПЕРВАЯ") && order.includes("ВТОРАЯ"), "потеряна запись")

console.log("== 5. ПОМЕТКА ОБ ОБРЕЗКЕ НЕ ТЕРЯЕТСЯ, НО УХОДИТ ВНИЗ ==")
const trimmed = `> ⚠️ Начало журнала обрезано${NL}${NL}## 12:00:00 · recall${NL}${NL}**Пришло:** СВЕЖАЯ${NL}`
const t = renderJournal(trimmed)
check("пометка видна", t.includes("Начало журнала обрезано"), "пропала")
check("но свежая запись выше неё", t.indexOf("СВЕЖАЯ") < t.indexOf("обрезано"), "пометка выше свежего")

console.log("== 6. КНОПКА И ОТКАЗ ГОВОРЯТ ТО, ЧТО ОБЯЗАНЫ ==")
const page = journalPage({ bytes: 10, entries: 1, html: "<article>x</article>" })
check("кнопка называет необратимость", page.includes("стирает насовсем"), "молчит")
check("страница называет второго читателя", page.includes("агент разработки"), "молчит")
const denied = deniedPage("вы не вошли")
check("отказ называет причину", denied.includes("вы не вошли"), "не называет")
check("и говорит, что делать", denied.includes("Войдите в проект"), "не говорит")
check("НЕГАТИВНЫЙ КОНТРОЛЬ: ложной строки нет", !denied.includes("ЭТОГО ТУТ БЫТЬ НЕ ДОЛЖНО"), "есть")

console.log(`${NL}== ИТОГ: ${pass} прошло, ${fail} провалено ==`)
process.exit(fail === 0 ? 0 : 1)
