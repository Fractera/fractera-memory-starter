#!/usr/bin/env node
//
// СТОРОЖ РЕЕСТРА СЛУЖБ (207-1).
//
// 🔒 ЗАЧЕМ ОН НУЖЕН УЖЕ СЕЙЧАС, ПРИ ДЕСЯТИ РУКОПИСНЫХ ЗАПИСЯХ. Из `id` этого
// файла собирается закрытый список первых сегментов пути источника: опечатка в
// нём разводит одну службу на две — и обнаружится это не отказом, а тем, что
// половина записей уедет к двойнику. Тот же класс, что «Миша и Мишка».
//
// 🔒 ПРОВЕРКИ ВЫНЕСЕНЫ В `problemsOf`, А СКРИПТ ЛИШЬ ПЕЧАТАЕТ — как у сторожа
// договора: прибор зовёт функцию на заведомо испорченном реестре и доказывает,
// что сторож это ловит. Сторож, чьего отказа никто не видел, зелен по причине
// собственной слепоты.

import { pathToFileURL } from "node:url"
import { ROOT_SERVICE as ROOT, SERVICES, SERVICES_ERROR, SERVICES_PATH } from "../lib/services.mjs"

// 🔒 ИМЯ СЛУЖБЫ — СТРОГОЕ: строчные латинские, цифры и дефис. Оно едет в значение
// колонки и в условие запроса; пробел, кириллица и заглавная буква в нём означают
// два имени одной службы в разных местах.
// 🔒 РОД АВТОРИЗАЦИИ — ЗАКРЫТЫЙ СПИСОК ИЗ ТРЁХ СЛОВ (решение владельца 2026-09-16), И ИМЕНА ВЕЧНЫЕ:
// на них повиснет проверка во всех службах.
const AUTH = ["global", "own", "provider"]

const ID = /^[a-z][a-z0-9-]*$/

const REQUIRED = ["id", "api", "about", "author", "price", "for_sale", "subdomain", "port", "auth"]

export function problemsOf(services, error, root) {
  const problems = []
  if (error) problems.push(`реестр не читается: ${error}`)
  if (!Array.isArray(services) || services.length === 0) {
    problems.push("в реестре нет ни одной службы — любое имя источника станет незнакомым")
    return problems
  }

  const seen = new Set()
  for (const s of services) {
    const name = typeof s?.id === "string" ? s.id : "(без имени)"
    for (const field of REQUIRED) {
      if (!(field in (s ?? {}))) problems.push(`${name}: нет поля ${field}`)
    }
    if (typeof s?.id !== "string" || !ID.test(s.id)) {
      problems.push(`${name}: имя не годится — ожидается строчная латиница, цифры и дефис`)
    } else if (seen.has(s.id)) {
      problems.push(`${s.id}: имя встречается дважды`)
    } else {
      seen.add(s.id)
    }
    if (typeof s?.about !== "string" || s.about.length < 10) {
      problems.push(`${name}: описание пустое или слишком короткое`)
    }
    // 🔒 ВЕСЬ ФАЙЛ ПО-АНГЛИЙСКИ — ТРЕБОВАНИЕ ВЛАДЕЛЬЦА, И ОНО ПРОВЕРЯЕМО:
    // кириллица в описании означает, что файл перестал быть общим для всех служб.
    if (/[А-Яа-яЁё]/.test(`${s?.about ?? ""}${s?.api ?? ""}`)) {
      problems.push(`${name}: кириллица в общем файле — он обязан быть английским целиком`)
    }
    if (typeof s?.for_sale !== "boolean") problems.push(`${name}: for_sale должно быть да или нет`)
    // 🔒 210-1: ПОРТ, СУБДОМЕН И РОД АВТОРИЗАЦИИ. Служба, не знающая своего порта и рода входа, не
    // может ответить человеку на вопрос «где ты и как к тебе войти» — а этот вопрос задают первым.
    if (!Number.isInteger(s?.port) || s.port < 1 || s.port > 65535) {
      problems.push(`${name}: порт не назван числом`)
    }
    // 🛑 СУБДОМЕНА МОЖЕТ НЕ БЫТЬ, И ЭТО ЗАКОННО: службы по петле наружу не смотрят. Но `null` —
    // это СКАЗАННОЕ «его нет», а отсутствие поля — «забыли». Разница ровно та же, что у пустого
    // охвата: «не знаю где» против «везде».
    if (!(s?.subdomain === null || (typeof s?.subdomain === "string" && /^[a-z0-9-]*$/.test(s.subdomain)))) {
      problems.push(`${name}: субдомен — строчное имя или null, если его нет`)
    }
    if (!AUTH.includes(s?.auth)) {
      problems.push(`${name}: род авторизации — одно из ${AUTH.join(" · ")}, а не «${s?.auth}»`)
    }
  }

  // 🛑 РАЗДАЮЩАЯ АВТОРИЗАЦИЮ СЛУЖБА РОВНО ОДНА — слово владельца: «последнее приемлемо только для
  // микросервиса, который распространяет авторизацию на дочерние». Две авторизации на одном сервере
  // есть отсутствие авторизации: каждая считает своей правдой себя, и человек входит дважды.
  // 🔒 211-5: КОРНЕВАЯ СЛУЖБА ОДНА, И ОНА ОБЯЗАНА БЫТЬ В СПИСКЕ. Корень — это право отвечать по
  // голому домену; две службы с этим правом означают, что по <домену> отвечает та, чей блок nginx
  // прочитали последним, — и узнать об этом можно только глазами.
  // 🛑 УКАЗАТЕЛЬ В НИКУДА ХУЖЕ ОТСУТСТВУЮЩЕГО: `root` на службу, которой нет в реестре, обещает
  // корень тому, кого не существует.
  if (root !== undefined) {
    if (typeof root !== "string" || !root) problems.push("корневая служба не названа: поле root пусто")
    else if (!services.some((s) => s?.id === root)) problems.push(`корневая служба «${root}» не найдена в списке`)
  }

  const providers = services.filter((s) => s?.auth === "provider").map((s) => s.id)
  if (providers.length !== 1) {
    problems.push(`раздающих авторизацию служб должно быть ровно одна, а их ${providers.length}: ${providers.join(", ") || "ни одной"}`)
  }
  return problems
}

function main() {
  const problems = problemsOf(SERVICES, SERVICES_ERROR, ROOT)
  for (const why of problems) console.log("🛑 " + why)
  if (problems.length === 0) {
    console.log(`✓ реестр годен: служб ${SERVICES.length}, корень «${ROOT}» (${SERVICES_PATH})`)
    process.exit(0)
  }
  process.exit(1)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main()
