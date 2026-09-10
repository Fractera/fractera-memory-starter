// Прибор 177-1: журнал пишет, обрезает и очищает по своей метке.
// 🛑 Пишет во ВРЕМЕННЫЙ файл, а не в журнал службы: прибор, трогающий живое,
// однажды сотрёт его (оплачено шагом 160).
import { tmpdir } from "node:os"
import { join } from "node:path"
import { readFile, rm, stat } from "node:fs/promises"

const TMP = join(tmpdir(), `journal-probe-${Date.now()}.md`)
process.env.MEMORY_JOURNAL = TMP
process.env.MEMORY_JOURNAL_LIMIT = "4000"

// 🔒 ИМПОРТ ОТ СВОЕГО ФАЙЛА, А НЕ ОТ ТЕКУЩЕЙ ПАПКИ: прибор обязан работать и с
// сервера, и с машины разработчика, откуда бы его ни запустили.
const { clear, note, readAll } = await import(
  new URL("../../lib/journal.mjs", import.meta.url).href
)

let pass = 0
let fail = 0
const check = (name, ok, got) => {
  if (ok) { pass++; console.log(`  ✓ ${name}`) }
  else { fail++; console.log(`  ✗ ${name} — получено: ${String(got).slice(0, 200)}`) }
}

console.log("== 1. до первой записи файла нет ==")
let sizeBefore = 0
try { sizeBefore = (await stat(TMP)).size } catch { sizeBefore = -1 }
check("файла ещё нет", sizeBefore === -1, sizeBefore)
check("чтение отсутствующего даёт пустую строку, а не отказ", (await readAll()) === "", "не пусто")

console.log("== 2. запись появляется и содержит всё названное ==")
await note({
  asked: "меня зовут Роман и мой друг Барсик",
  decisions: ["name_he_is_called: записала «Роман»"],
  dropped: ["догадка без основания: Барсик"],
  method: "remember",
  model: "2 факт(ов)",
  ms: 6560,
  returned: "запомнил: name he is called — Роман",
  skipped: [],
})
const one = await readAll()
check("заголовок с методом", one.includes("· remember ·"), one.slice(0, 80))
check("время работы", one.includes("6560 мс"), "нет")
check("вход человека", one.includes("меня зовут Роман"), "нет")
check("решение памяти", one.includes("записала «Роман»"), "нет")
check("ОТБРОШЕННОЕ ВИДНО", one.includes("догадка без основания"), "нет")
check("пустой список говорит словами", one.includes("— нет"), "нет")

console.log("== 3. НЕГАТИВНЫЙ КОНТРОЛЬ: отвергнутый на входе вызов даёт ДРУГУЮ запись ==")
await note({ method: "remember", ms: 0, trouble: "вызов отвергнут на входе" })
const two = await readAll()
check("вторая запись отличается от первой", two.includes("**Отказ:**"), "нет отказа")
check("записей стало две", (two.match(/^## /gm) ?? []).length === 2, (two.match(/^## /gm) ?? []).length)
check("заведомо ложной строки нет", !two.includes("ЭТОГО ТУТ БЫТЬ НЕ ДОЛЖНО"), "есть")

console.log("== 4. размер растёт — число, а не впечатление ==")
const sizeAfter = (await stat(TMP)).size
check(`размер вырос: ${sizeAfter} байт`, sizeAfter > 0, sizeAfter)

console.log("== 5. предел размера: обрезка НЕ молчит ==")
for (let i = 0; i < 60; i++) {
  await note({ asked: `набивка номер ${i} `.repeat(8), method: "recall", ms: i })
}
const big = await readAll()
const bigSize = (await stat(TMP)).size
check(`после обрезки файл в пределах: ${bigSize} <= 4000*1.1`, bigSize <= 4400, bigSize)
check("обрезка НАЗВАНА в самом документе", big.includes("Начало журнала обрезано"), "молча обрезал")
check("первая запись действительно ушла", !big.includes("меня зовут Роман"), "старое осталось")
check("последняя запись на месте", big.includes("набивка номер 59"), "новое потерялось")

console.log("== 6. очистка отвечает числом и вправду чистит ==")
const cleared = await clear()
check(`очистка вернула число: ${cleared.cleared}`, cleared.ok && cleared.cleared > 0, JSON.stringify(cleared))
check("после очистки документ пуст", (await readAll()) === "", "не пуст")
check("и на диске ноль байт", (await stat(TMP)).size === 0, (await stat(TMP)).size)

await rm(TMP, { force: true })
console.log(`\n== ИТОГ: ${pass} прошло, ${fail} провалено ==`)
process.exit(fail === 0 ? 0 : 1)
