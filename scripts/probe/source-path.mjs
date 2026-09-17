#!/usr/bin/env node
//
// ПРИБОР 207-2: путь источника — разбор, запреты и место в форме таблицы.
//
// 🔒 ПРИБОР НЕ СОЗДАЁТ СВОЕЙ СРЕДЫ (закон 144): он не трогает базу и ничего не
// удаляет. Всё, что он проверяет, — код, который базу обязан менять: лестница
// поздних колонок, список писываемых колонок, индекс, заполнение старых строк.
// Живая запись доказывается на сервере, в 207-9, — здесь это невозможно: слоя
// данных на машине разработчика нет, и делать вид, что есть, запрещено.

import { LATE_COLUMNS } from "../../lib/messages.mjs"
import { parseSource, printSource, serviceOf } from "../../lib/source.mjs"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..")
const messagesSrc = readFileSync(join(ROOT, "lib", "messages.mjs"), "utf8")

let failed = 0
const check = (ok, what, got = "") => {
  if (!ok) failed++
  console.log(`${ok ? "✓" : "🛑"} ${what}${got ? ` → ${got}` : ""}`)
}

console.log("— разбор пути —")
const good = parseSource(["chat", "telegram-bot", "roma-armstrong"])
check(!good.ok && good.error === "unknown-service", "службы chat в реестре НЕТ — вызов отвергнут", good.error ?? good.text)

const live = parseSource(["telegram", "bot", "Roma Armstrong"])
check(live.ok && live.text === "telegram/bot/roma-armstrong", "живая служба и свободный хвост", live.text ?? live.error)
check(printSource(live.text) === "telegram › bot › roma-armstrong", "печать для человека", printSource(live.text))
check(serviceOf(live.text) === "telegram", "служба — первый сегмент", serviceOf(live.text))

const asString = parseSource("data/object-store")
check(asString.ok && asString.text === "data/object-store", "строка через косую черту принимается", asString.text ?? asString.error)

// 🔒 РЕГИСТР И ПРОБЕЛЫ ПРИВОДЯТСЯ К НОРМЕ ДО СВЕРКИ С РЕЕСТРОМ, И ЭТО НЕ ПОБЛАЖКА.
// Именно приведение НЕ ДАЁТ родиться двойнику: `Data`, `data ` и `DATA` становятся одной службой
// ещё до сравнения. Отвергать их значило бы ронять вызов на опечатке регистра и при этом всё равно
// не иметь защиты от двойника — защита здесь в нормализации, а не в строгости.
const loud = parseSource(["Data "])
check(loud.ok && loud.text === "data", "чужой регистр и пробел приводятся к норме, а не отвергаются", loud.text ?? loud.error)

console.log("— запреты (половина случаев обязана отвергнуть) —")
for (const [from, error] of [
  [[], "source-required"],
  ["", "source-required"],
  [["dataa"], "unknown-service"],
  [["дата"], "source-required"],
  [["memory", "a", "b", "c", "d", "e", "f"], "source-too-deep"],
]) {
  const r = parseSource(from)
  check(!r.ok && r.error === error, `${JSON.stringify(from)} отвергнут как ${error}`, r.ok ? `ПРИНЯТ ${r.text}` : r.error)
}

console.log("— колонка — не таблица: правок должно быть четыре —")
check(LATE_COLUMNS.some((c) => c.startsWith("source_path")), "поздняя колонка source_path в лестнице")
check(LATE_COLUMNS.some((c) => c.startsWith("source_auth")), "поздняя колонка source_auth в лестнице")
check(/WRITABLE[\s\S]{0,900}"source_path"/.test(messagesSrc), "source_path в списке писываемых колонок")
check(/CREATE INDEX IF NOT EXISTS \$\{MESSAGES\}_source_path/.test(messagesSrc), "индекс по источнику")
check(/UPDATE \$\{MESSAGES\}[\s\S]{0,400}source_path IS NULL/.test(messagesSrc), "старые строки помечаются legacy")

console.log("— негативный контроль самого счётчика —")
check(!/source_path_that_never_existed/.test(messagesSrc), "заведомо ложное имя в форме не находится")

console.log(failed === 0 ? "\n✓ все случаи сошлись" : `\n🛑 не сошлось: ${failed}`)
process.exit(failed === 0 ? 0 : 1)
