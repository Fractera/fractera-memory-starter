// ПРИБОР 202-1, 202-4, 202-5, 202-6 — СТРАНИЦА МАСТЕРСКОЙ: РАСКЛАДКА, ОКНА ДОКУМЕНТОВ, ШАГИ, НАВЫКИ, ИНСТРУКЦИЯ.
//
// 🔒 ЧИТАЕТ ОТДАННУЮ СЕРВЕРОМ СТРАНИЦУ, КАК ЕЁ ПОЛУЧАЕТ БРАУЗЕР. Секрет машины — тот же пропуск, что у дверей стенда;
// без него — негатив.
// 🔒 ЧИСЛА СВЕРЯЮТСЯ С ДИСКОМ ТОЙ ЖЕ МАШИНЫ: сколько шагов и навыков на странице — столько же, сколько в папках.
// ✗ ПЕРВЫЙ ПРОГОН СЧИТАЛ ОТМЕТКИ ДВАЖДЫ: Next кладёт те же свойства ещё и в данные гидратации (`"data-build-quote":true`).
//   Атрибут HTML считается только в форме ` имя="`.
// ✗ ОН ЖЕ РЕЗАЛ «ЗОНУ МЕНЮ» ДО ПЕРВОГО `</nav>` И НАХОДИЛ 4 ПУНКТА ИЗ 6: часть пунктов Next дописывает в поток отдельным
//   куском (`<template id="P:9">` → `<div hidden id="S:9">` ниже). Пункты ищутся по всему документу, а ПОРЯДОК шагов
//   проверяется списком правой колонки — по потоку он не доказывается.
// 🛑 ПРИБОР НИЧЕГО НЕ ПИШЕТ.
//
// Запуск на сервере из корня службы:  node scripts/probe/build-page-202.mjs

import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { listSkills, listSteps } from "../../lib/build-docs.mjs"

const BASE = process.env.MEMORY_URL ?? "http://127.0.0.1:3700"
function machineEnv(name) {
  try {
    for (const line of readFileSync("/etc/fractera/secrets.env", "utf8").split("\n")) {
      const i = line.indexOf("=")
      if (i > 0 && line.slice(0, i).trim() === name) return line.slice(i + 1).trim().replace(/^["']|["']$/g, "")
    }
  } catch { /* вне сервера */ }
  return process.env[name] ?? ""
}
const SECRET = machineEnv("DATA_SECRET")

let bad = 0
const say = (ok, what) => {
  if (!ok) bad += 1
  console.log(`${ok ? "✓" : "✗"} ${what}`)
}
const count = (html, needle) => html.split(needle).length - 1
const attr = (html, name) => count(html, ` ${name}="`)

async function page(q, { secret = SECRET, lang = "ru" } = {}) {
  const res = await fetch(`${BASE}/${lang}/build${q}`, {
    headers: secret ? { "x-data-secret": secret } : {},
    redirect: "manual",
  })
  return { html: await res.text(), location: res.headers.get("location") ?? "", status: res.status }
}

function menuItems(html) {
  return [...html.matchAll(/ data-menu-depth="(\d)" style="[^"]*">([^<]*)</g)].map((m) => ({ depth: Number(m[1]), label: m[2] }))
}

/** Кусок документа после открывающего окна — чтобы искать внутри окна, а не на странице. */
const inModal = (html) => {
  const i = html.indexOf(' data-doc-modal="')
  return i < 0 ? "" : html.slice(i)
}

console.log(`===PROBE_202_PAGE=== start ${new Date().toISOString()}`)

// ── 202-1: раскладка ─────────────────────────────────────────────────────────
for (const lang of ["ru", "en"]) {
  const p = await page("", { lang })
  const top = menuItems(p.html).filter((i) => i.depth === 0)
  say(p.status === 200 && attr(p.html, "data-workspace-menu") === 1, `/${lang}/build → ${p.status}, раскладка с левым меню: ${attr(p.html, "data-workspace-menu")}`)
  say(top.length === 6, `   пунктов верхнего уровня: ${top.length} — ${top.map((i) => i.label).join(" · ")}`)
  say(attr(p.html, "data-build-quote") === 1 && /<blockquote/.test(p.html), `   цитата в главном описании: ${attr(p.html, "data-build-quote")}`)
  say(attr(p.html, "data-build-join") === 1 && count(p.html, "CONTRIBUTING.md") >= 1, `   карточка «как поделиться» со ссылкой на CONTRIBUTING: ${attr(p.html, "data-build-join")}`)
  say(attr(p.html, "data-build-section") === 1 && count(p.html, ' data-build-section="terminal"') === 1, "   раздел по умолчанию — терминал")
}
const unknown = await page("?section=nope")
say(count(unknown.html, ' data-build-section="terminal"') === 1, "НЕГАТИВ: неизвестный раздел падает на терминал, а не на пустую колонку")
const noSecret = await page("", { secret: "" })
say(noSecret.status >= 300 && noSecret.status < 400 && attr(noSecret.html, "data-workspace-menu") === 0, `НЕГАТИВ: без входа — ${noSecret.status} на ${noSecret.location.split("?")[0]}, мастерская не отдана`)
const wrong = await page("", { secret: "wrong-secret-202" })
say(wrong.status >= 300 && wrong.status < 400 && attr(wrong.html, "data-workspace-menu") === 0, `НЕГАТИВ: неверный секрет — ${wrong.status}, тоже вход`)

// ── 202-3: раздел заданий рендерится ─────────────────────────────────────────
const task = await page("?section=task")
say(attr(task.html, "data-build-tasks") === 1 && /pre-steps/.test(task.html), `раздел «Добавить задание»: список-туду ${attr(task.html, "data-build-tasks")}, роль приёмной названа`)
say(menuItems(task.html).filter((i) => i.depth > 0).length === 0, "НЕГАТИВ: пока раздел шагов и навыков не выбран, вложенные списки закрыты")

// ── 202-2: раздел терминала отдаёт спящий островок, а не сокет ───────────────
const term = await page("")
say(attr(term.html, "data-build-terminal") === 1 && count(term.html, ' data-state="checking"') === 1, "терминал на странице начинает с проверки статуса (сокет до ответа двери не открывается)")

// ── 202-4: текущие шаги и окно ───────────────────────────────────────────────
const cur = await page("?section=current")
say(attr(cur.html, "data-doc-modal") === 0 && /doc=current/.test(cur.html), "«Текущие шаги»: кнопка открытия есть, окно закрыто")
const curOpen = await page("?section=current&doc=current")
const modal = inModal(curOpen.html)
say(attr(curOpen.html, "data-doc-modal-body") === 1 && /1000px/.test(modal.slice(0, 800)), `окно открыто, предел высоты 1000px в классе окна: ${/1000px/.test(modal.slice(0, 800))}`)
say(/Состояние работы/.test(modal), "   в окне текст current-steps.md («Состояние работы»)")
const evil = await page("?section=current&doc=../../../etc/passwd")
say(attr(evil.html, "data-doc-modal") === 0 && !/root:x:0:0/.test(evil.html), "НЕГАТИВ: `?doc=../../../etc/passwd` окна не открывает и файла не отдаёт")

// ── 202-5: шаги ───────────────────────────────────────────────────────────────
for (const [sub, kind] of [["steps-new", "new"], ["steps-done", "done"]]) {
  const p = await page(`?section=${sub}`)
  const disk = listSteps(kind).map((s) => s.n)
  const inMenu = menuItems(p.html).filter((i) => i.depth === 2).length
  const listed = [...p.html.matchAll(/ data-step="(\d+)"/g)].map((m) => Number(m[1]))
  const sorted = [...listed].sort((a, b) => b - a)
  say(inMenu === disk.length && listed.length === disk.length, `${sub}: шагов в меню ${inMenu}, в списке ${listed.length}, на диске ${disk.length}`)
  say(listed.join() === sorted.join() && listed[0] === Math.max(...disk), `   новые сверху, старые снизу: ${listed.join(", ")}`)
  const sampleN = disk[0]
  const open = await page(`?section=${sub}&doc=step-${kind}:${sampleN}`)
  say(attr(open.html, "data-doc-modal-body") === 1 && new RegExp(`Шаг ${sampleN}`).test(inModal(open.html)), `   шаг ${sampleN} открывается в окне целиком`)
}
const noStep = await page("?section=steps-done&doc=step-done:999999")
say(attr(noStep.html, "data-doc-modal") === 0, "НЕГАТИВ: несуществующий шаг окна не открывает")

// ── 202-6: навыки и инструкция ───────────────────────────────────────────────
const sk = await page("?section=skills")
const skillItems = menuItems(sk.html).filter((i) => i.depth === 1)
say(skillItems.length === listSkills().length && skillItems.length > 0, `навыков в меню ${skillItems.length}, в папке .claude/skills ${listSkills().length}`)
const skOpen = await page("?section=skills&doc=skill:use-tables")
say(attr(skOpen.html, "data-doc-modal-body") === 1 && /name: use-tables/.test(inModal(skOpen.html)), "   навык use-tables открывается в окне (в окне его `name:`)")
const skEvil = await page("?section=skills&doc=skill:../../CLAUDE")
say(attr(skEvil.html, "data-doc-modal") === 0, "НЕГАТИВ: `skill:../../CLAUDE` окна не открывает")
const ins = await page("?section=instruction")
say(attr(ins.html, "data-build-instruction") === 1 && /Кто ты и где ты/.test(ins.html), "главная инструкция: текст CLAUDE.md на странице")
const insZone = ins.html.slice(ins.html.indexOf(' data-build-section="instruction"'))
say(!/<textarea|<form/.test(insZone), "НЕГАТИВ: в разделе инструкции нет формы правки")

// ── 202-8: путь в проекте под заголовком каждого раздела, кроме терминала ────
//
// 🔒 ОЖИДАНИЕ ЗАПИСАНО ЗДЕСЬ, А НЕ ВЗЯТО ИЗ `BUILD_PATHS`: прибор, читающий ответ из того же места, что и страница, проверял бы код самим
// собой. Это ТЗ 202-8, переписанное в числа.
const EXPECT = {
  current: ["development-docs/development-steps/current-steps.md"],
  instruction: ["CLAUDE.md"],
  skills: [".claude/skills/"],
  steps: ["development-docs/development-steps/"],
  "steps-done": ["development-docs/development-steps/completed-steps/"],
  "steps-new": ["development-docs/development-steps/new-steps/"],
  task: ["development-docs/development-steps/pre-steps/", "development-docs/development-steps/pre-steps/README.md"],
}
// 🔒 АДРЕС ПОЛНЫЙ (слово владельца: «Это же не полный адрес он же начинается с opt/fractera…?»). Корень ожидания вписан ЗДЕСЬ, в приборе
// сервера, а не взят у процесса: страница берёт корень у процесса, и сравнение с тем же источником доказало бы только само себя.
const ROOT = process.env.EXPECT_ROOT ?? "/opt/fractera/memory"
for (const [section, paths] of Object.entries(EXPECT)) {
  const p = await page(`?section=${section}`)
  const shown = [...p.html.matchAll(/ data-build-path="([^"]+)"/g)].map((m) => m[1])
  const want = paths.map((x) => `${ROOT}/${x}`)
  const onDisk = shown.length > 0 && shown.every((x) => existsSync(x))
  say(shown.join("|") === want.join("|") && onDisk, `путь раздела «${section}»: ${shown.join(" · ") || "НЕТ"} · на диске: ${onDisk}`)
}
const termPath = await page("?section=terminal")
say(attr(termPath.html, "data-build-path") === 0, "НЕГАТИВ: у терминала пути нет (слово владельца «кроме терминал»)")
const relative = await page("?section=task")
say(!/ data-build-path="development-docs\//.test(relative.html), "НЕГАТИВ: ни одного пути от корня проекта без адреса машины")
const stepPath = await page(`?section=steps-done&doc=step-done:${listSteps("done")[0].n}`)
const shownStep = stepPath.html.match(/ data-doc-path="true"[^>]*>([^<]+)</)?.[1] ?? ""
say(shownStep === `${ROOT}/development-docs/development-steps/completed-steps/${listSteps("done")[0].n}-*.md`, `окно шага показывает полный путь открытого шага: ${shownStep}`)
const skillPath = await page("?section=skills&doc=skill:use-tables")
const shownSkill = skillPath.html.match(/ data-doc-path="true"[^>]*>([^<]+)</)?.[1] ?? ""
say(shownSkill === `${ROOT}/.claude/skills/use-tables/SKILL.md` && existsSync(shownSkill), `окно навыка показывает полный путь навыка: ${shownSkill}`)
const newPath = await page(`?section=steps-new&doc=step-new:${listSteps("new")[0].n}`)
const shownNew = newPath.html.match(/ data-doc-path="true"[^>]*>([^<]+)</)?.[1] ?? ""
say(shownNew.startsWith(`${ROOT}/`) && (existsSync(shownNew.replace("-*.md", "-main.md")) || existsSync(shownNew)), `окно нового шага показывает существующий полный путь: ${shownNew}`)

// ── 202-9: рабочее пространство названо, предупреждение свёрнуто ─────────────
const t9 = await page("?section=terminal")
const ws = t9.html.match(/ data-build-workspace="([^"]+)"/)?.[1] ?? ""
say(ws === ROOT && existsSync(ws), `терминал называет рабочее пространство: «${ws}» (ждали ${ROOT}), на диске: ${existsSync(ws)}`)
say(/Агент будет запущен в рабочем пространстве:/.test(t9.html), "   фраза «Агент будет запущен в рабочем пространстве:» на странице")
const warn = t9.html.match(/<details[^>]* data-build-warning="true"[^>]*>/)?.[0] ?? ""
say(warn !== "" && !/\sopen(=|\s|>)/.test(warn), `красная карточка — <details> без open, то есть свёрнута: ${warn ? "да" : "НЕТ"}`)
const summary = t9.html.slice(t9.html.indexOf(warn)).match(/<summary[\s\S]*?<\/summary>/)?.[0] ?? ""
say(/Что именно вы запускаете/.test(summary) && /lucide-chevron-down/.test(summary), "   в заголовке «Что именно вы запускаете» и иконка-стрелка")
say(/способен изменить этот продукт/.test(t9.html.slice(t9.html.indexOf(warn))), "   текст предупреждения в разметке есть — раскрытие его не теряет")

console.log(`===PROBE_202_PAGE=== ${bad ? `ПРОВАЛОВ: ${bad}` : "всё сошлось"} ${new Date().toISOString()}`)
process.exit(bad ? 1 : 0)
