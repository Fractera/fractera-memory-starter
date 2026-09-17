// ДОКУМЕНТЫ МАСТЕРСКОЙ РАЗРАБОТКИ: ТЕКУЩИЕ ШАГИ, ШАГИ, НАВЫКИ, ГЛАВНАЯ ИНСТРУКЦИЯ (шаг 202).
//
// 🎯 ЗАКАЗ ВЛАДЕЛЬЦА 2026-09-15: страница «Постройте этот продукт» показывает человеку то же, чем
// работает Claude Code, открытый в её терминале, — текущее состояние работы, план и итоги шагов,
// навыки и главную инструкцию. Всё — только на чтение: правка идёт через задание (см. `build-tasks.mjs`).
//
// 🔒 ЧИТАЕТСЯ С ДИСКА НА КАЖДЫЙ ЗАПРОС, КАК ПАСПОРТ: Claude Code правит эти файлы — человек видит правку
// на следующей загрузке, без сборки.
//
// 🛑 КАЖДЫЙ ПУТЬ, ПРИШЕДШИЙ ИЗ АДРЕСА, ПРОВЕРЯЕТСЯ ДО ДИСКА: номер шага — цифрами и из списка, имя навыка —
// белым списком и из списка. `?doc=../../etc/passwd` не открывает ничего — и это доказывается прибором.

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

const ROOT = process.env.MEMORY_BUILD_ROOT ?? process.cwd()
const STEPS = join(ROOT, "development-docs", "development-steps")

/**
 * Полный адрес внутри службы — от корня, из которого она реально работает (202-8).
 *
 * 🎯 СЛОВО ВЛАДЕЛЬЦА 2026-09-15: «Это же не полный адрес он же начинается с opt/fractera…?» — путь от корня проекта не говорит, где файл
 * лежит на машине.
 * 🔒 КОРЕНЬ БЕРЁТСЯ У ПРОЦЕССА, А НЕ ВПИСЫВАЕТСЯ: на сервере это `/opt/fractera/memory`, у разработчика — его папка. Вписанный руками
 * `/opt/fractera/…` солгал бы на любой другой машине молча — тот же класс, что адрес домена, вписанный в код (185-2).
 * 🔒 Разделитель — прямая косая черта всегда: адрес читает человек, а не файловая система.
 */
export function fullPath(relative) {
  const root = String(ROOT).replace(/\\/g, "/").replace(/\/+$/, "")
  return `${root}/${String(relative).replace(/^\/+/, "")}`
}

const read = (p) => {
  try {
    return readFileSync(p, "utf8")
  } catch {
    return null
  }
}

const isDir = (p) => {
  try {
    return statSync(p).isDirectory()
  } catch {
    return false
  }
}

/** Первый заголовок первого уровня — название документа. Нет заголовка — имя файла. */
function titleOf(text, fallback) {
  const line = String(text ?? "").split(/\r?\n/).find((l) => /^#\s+/.test(l))
  return line ? line.replace(/^#\s+/, "").trim() : fallback
}

/**
 * Порядок файлов внутри шага: главный первым, подшаги по номеру, остальное по имени.
 * 🔒 ПО НОМЕРУ, А НЕ ПО СТРОКЕ: `194-10` строкой встаёт между `194-1` и `194-2`.
 */
function fileOrder(a, b) {
  const rank = (name) => {
    if (/-main\.md$/.test(name)) return [0, 0, name]
    const m = name.match(/^\d+-(\d+)\.md$/)
    return m ? [1, Number(m[1]), name] : [2, 0, name]
  }
  const [ra, na, sa] = rank(a)
  const [rb, nb, sb] = rank(b)
  return ra - rb || na - nb || sa.localeCompare(sb)
}

/** Текущее состояние работы — `current-steps.md`. */
export function readCurrent() {
  return read(join(STEPS, "current-steps.md"))
}

/**
 * Все шаги одного рода — новые сверху, старые снизу (слово владельца: «начиная вверху последней внизу первой»).
 * @param {"new" | "done"} kind
 * @returns {Array<{ n: number, title: string, files: string[] }>}
 */
export function listSteps(kind) {
  const base = join(STEPS, kind === "new" ? "new-steps" : "completed-steps")
  if (!existsSync(base)) return []
  const byNumber = new Map()
  const add = (n, file, path) => {
    const entry = byNumber.get(n) ?? { files: [], n, paths: [] }
    entry.files.push(file)
    entry.paths.push(path)
    byNumber.set(n, entry)
  }
  for (const name of readdirSync(base)) {
    const path = join(base, name)
    if (isDir(path) && /^\d+$/.test(name)) {
      // Шаг-папка: `new-steps/202/202-main.md`, `202-1.md` …
      for (const inner of readdirSync(path)) {
        if (inner.endsWith(".md")) add(Number(name), inner, join(path, inner))
      }
      continue
    }
    const m = name.match(/^(\d+)-.+\.md$/)
    if (m) add(Number(m[1]), name, path)
  }
  const steps = []
  for (const entry of byNumber.values()) {
    const order = entry.files.map((f, i) => [f, entry.paths[i]]).sort((x, y) => fileOrder(x[0], y[0]))
    const first = order[0]
    steps.push({ files: order.map((o) => o[0]), n: entry.n, paths: order.map((o) => o[1]), title: titleOf(read(first[1]), first[0]) })
  }
  return steps.sort((a, b) => b.n - a.n)
}

/**
 * Шаг целиком — все его файлы подряд, для модального окна.
 * 🛑 Номер берётся только из списка: чего нет в списке, того не читают.
 */
export function readStep(kind, raw) {
  if (!/^\d{1,7}$/.test(String(raw ?? ""))) return null
  const step = listSteps(kind).find((s) => s.n === Number(raw))
  if (!step) return null
  const parts = step.paths.map((p, i) => `<!-- ${step.files[i]} -->\n\n${read(p) ?? ""}`)
  // 🔒 ПУТЬ ОТКРЫТОГО ДОКУМЕНТА ЕДЕТ ВМЕСТЕ С НИМ (202-8): шаг-папка показывается папкой, шаг-файлы — образцом имени.
  const base = kind === "new" ? "new-steps" : "completed-steps"
  const inFolder = step.paths.some((p) => /[\\/]new-steps[\\/]\d+[\\/]/.test(p))
  const path = fullPath(
    inFolder ? `development-docs/development-steps/${base}/${step.n}/` : `development-docs/development-steps/${base}/${step.n}-*.md`,
  )
  return { path, text: parts.join("\n\n---\n\n"), title: step.title }
}

/**
 * Навыки, которые видит Claude Code, открытый в папке службы.
 * @returns {Array<{ name: string, description: string }>}
 */
export function listSkills() {
  const base = join(ROOT, ".claude", "skills")
  if (!existsSync(base)) return []
  const out = []
  for (const name of readdirSync(base).sort()) {
    if (!/^[a-z0-9-]+$/.test(name)) continue
    const text = read(join(base, name, "SKILL.md"))
    if (text === null) continue
    const desc = (text.match(/^description:\s*(.+)$/m)?.[1] ?? "").replace(/^>\s*/, "").trim()
    out.push({ description: desc.slice(0, 300), name })
  }
  return out
}

/** Один навык — только из списка и только по белому имени. */
export function readSkill(raw) {
  const name = String(raw ?? "")
  if (!/^[a-z0-9-]{1,80}$/.test(name)) return null
  if (!listSkills().some((s) => s.name === name)) return null
  const text = read(join(ROOT, ".claude", "skills", name, "SKILL.md"))
  return text === null ? null : { path: fullPath(`.claude/skills/${name}/SKILL.md`), text, title: name }
}

/** Главная инструкция строителя — `CLAUDE.md` в корне службы. */
export function readInstruction() {
  return read(join(ROOT, "CLAUDE.md"))
}

/**
 * Документ для модального окна по значению `?doc=`.
 *
 * Формы: `current` · `step-new:<N>` · `step-done:<N>` · `skill:<имя>`. Любая другая форма — `null`, окно не
 * открывается. Это единственная точка, где адрес превращается в чтение файла.
 */
export function docFor(raw) {
  const value = String(raw ?? "")
  if (value === "current") {
    const text = readCurrent()
    return text === null ? null : { path: fullPath("development-docs/development-steps/current-steps.md"), text, title: "current-steps.md" }
  }
  const m = value.match(/^(step-new|step-done|skill):(.+)$/)
  if (!m) return null
  if (m[1] === "skill") return readSkill(m[2])
  return readStep(m[1] === "step-new" ? "new" : "done", m[2])
}
