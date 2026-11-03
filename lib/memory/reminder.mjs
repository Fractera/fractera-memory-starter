// НАПОМИНАНИЕ ПО ВРЕМЕНИ — СУТЬ ПАМЯТИ (шаг узла 636).
//
// 🎯 Владелец узла 2026-11-03: «сейчас мы говорим о памяти у которой напоминания являются её собственной сутью проблема в том что
// видимо ты не понимаешь о том что напоминание которое всплывает должно создавать техническое решение при котором элемент вызывает
// тебя главного агента и передает тебе сообщение которые ты транслируешь».
// Фраза ложится в память как всегда (`remember`), а срок — записью календаря самой памяти: `data/cron.json` элемента, событие
// `agent-task`. В свою минуту часы памяти (`lib/cron/`) будят агента памяти, он передаёт слова главному агенту
// (`npm run tell-core -- --alarm`), и тот пишет человеку. Календарь виден в ядре: «Память → Крон события».
// 🔒 Часы говорят только со своим агентом (закон узла «Only agents talk to agents»): ни бота главного агента, ни его двери здесь нет.
// 🔒 Дату из «через неделю» код не считает (без хода модели): её считает агент, который это услышал, — сюда приходит готовое
// «YYYY-MM-DD HH:MM» по местным часам компьютера. Запись — целиком во временный файл и переименованием: часы читают файл раз в минуту.
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"

export const REPEATS = ["once", "daily", "weekdays", "weekly", "monthly", "yearly"]
const file = () => join(process.env.ELEMENT_DIR?.trim() || process.cwd(), "data", "cron.json")

/** Проверка срока до записи фразы: неверный срок — отказ, и фраза не ложится без своего напоминания. */
export function checkReminder(remind) {
  if (!remind || typeof remind !== "object" || Array.isArray(remind)) return { ok: false, error: "bad-remind", why: "remind is { at: \"YYYY-MM-DD HH:MM\", repeat?, text? }" }
  const m = String(remind.at ?? "").match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})$/)
  if (!m) return { ok: false, error: "bad-remind-at", why: "remind.at is «YYYY-MM-DD HH:MM» in this computer's local time" }
  const repeat = remind.repeat ?? "once"
  if (!REPEATS.includes(repeat)) return { ok: false, error: "bad-repeat", why: `remind.repeat is one of: ${REPEATS.join(", ")}` }
  const [y, mo, d] = m[1].split("-").map(Number)
  const [h, mi] = m[2].split(":").map(Number)
  const when = new Date(y, mo - 1, d, h, mi)
  if (when.getMonth() !== mo - 1 || when.getDate() !== d) return { ok: false, error: "bad-remind-at", why: `${m[1]} is not a date` }
  if (repeat === "once" && when.getTime() <= Date.now()) return { ok: false, error: "remind-at-passed", why: `${m[1]} ${m[2]} has already passed on this computer` }
  return { ok: true, start: m[1], time: m[2], repeat, when }
}

/** Запись в календарь памяти; `words` — что напомнить (по умолчанию фраза человека). */
export function setReminder(remind, phrase, lang) {
  const c = checkReminder(remind)
  if (!c.ok) return c
  const words = String(remind.text ?? phrase ?? "").trim()
  if (!words) return { ok: false, error: "need-text", why: "a reminder needs its words" }
  let plan
  try { plan = JSON.parse(readFileSync(file(), "utf8")) } catch { plan = { repeatsPaused: false, schedules: [] } }
  const id = `reminder-${Date.now().toString(36)}`
  const entry = { id, event: "agent-task", name: words.slice(0, 60), message: words, saidAt: new Date().toISOString(), time: c.time, repeat: c.repeat, start: c.start, enabled: true }
  plan.schedules = [...(Array.isArray(plan.schedules) ? plan.schedules : []), entry]
  mkdirSync(dirname(file()), { recursive: true })
  const tmp = `${file()}.${process.pid}.tmp`
  writeFileSync(tmp, JSON.stringify(plan, null, 2) + "\n")
  renameSync(tmp, file())
  const ru = lang !== "en"
  const day = c.when.toLocaleString(ru ? "ru-RU" : "en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })
  const every = { once: "", daily: ru ? ", каждый день" : ", every day", weekdays: ru ? ", по будням" : ", on weekdays", weekly: ru ? ", каждую неделю" : ", every week", monthly: ru ? ", каждый месяц" : ", every month", yearly: ru ? ", каждый год" : ", every year" }[c.repeat]
  const line = ru ? `Напомню: ${day}${every} — «${words}». Запись — в календаре памяти.` : `I will remind you: ${day}${every} — «${words}». The entry is in the memory's calendar.`
  return { ok: true, id, start: c.start, time: c.time, repeat: c.repeat, words: day, text: words, line }
}
