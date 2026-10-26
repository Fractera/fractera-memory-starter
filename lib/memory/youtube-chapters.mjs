// ГЛАВЫ РОЛИКА ИЗ ЕГО ОПИСАНИЯ (195-4).
//
// 🎯 НАЙДЕНО 2026-09-14 ПО СЛОВУ ВЛАДЕЛЬЦА о прошлом случае: он просил найти в многочасовом интервью фрагмент длиной в секунды, и способ
// оказался не в субтитрах. Главы с метками времени авторы пишут В ОПИСАНИИ, а описание официальный API отдаёт по ключу за одну единицу квоты.
// Измерено на `BYXbuik3dgA`: 8 глав, и 4119 с (1:08:39) попадает в «xAI’s business plan» (0:59:56 → 1:17:21) — там и есть цитата про триллион.
//
// 🔒 ЭТО ФАЙЛ НА JS, А НЕ НА TS, И ЭТО РЕШЕНИЕ: разбор глав — единственное место, которое обязан проверять прибор, а прибор на `node` не
// импортирует `.ts`. Вторая копия разбора в приборе доказывала бы саму себя (закон «прибор, создающий свою среду, скрывает дефекты кода»).
//
// 🔒 ТЕКСТ СУБТИТРОВ ОФИЦИАЛЬНЫЙ API НЕ ОТДАЁТ НИКОГДА — измерено: `captions.download` по ключу отвечает `401` «API keys are not supported by
// this API». Поэтому главы — не «пока вместо расшифровки», а самостоятельный и гарантированный ответ на вопрос «на какой минуте».

/** `чч:мм:сс` или `мм:сс` → секунды. Не метка — `null`. */
export function secondsOfStamp(stamp) {
  const s = String(stamp ?? "").trim()
  if (!/^\d{1,3}:\d{2}(:\d{2})?$/.test(s)) return null
  return s.split(":").reverse().reduce((sum, part, i) => sum + Number(part) * 60 ** i, 0)
}

/** Секунды → `ч:мм:сс` (или `мм:сс` у короткого). */
export function stampOfSeconds(seconds) {
  const t = Math.max(0, Math.floor(Number(seconds) || 0))
  const h = Math.floor(t / 3600)
  const m = Math.floor((t % 3600) / 60)
  const s = String(t % 60).padStart(2, "0")
  return h ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`
}

/**
 * Главы из описания: строки вида `0:59:56 xAI’s business plan`, `(12:30) — тема`, `12:30 – тема`.
 *
 * 🔒 МЕТКА ОБЯЗАНА СТОЯТЬ В НАЧАЛЕ СТРОКИ. Метка посреди фразы — это ссылка на момент, а не глава; беря её за главу, мы печатали бы
 * оглавление, которого автор не писал.
 * 🔒 ПОРЯДОК — ПО СЕКУНДАМ, А НЕ ПО ПОРЯДКУ СТРОК, и повторы одной секунды отбрасываются: у авторов бывают и списки ссылок, и опечатки.
 * 🛑 ОДНА ГЛАВА — НЕ ОГЛАВЛЕНИЕ: если найдена ровно одна метка, список пуст. Так по правилам самого YouTube (главы начинаются с `0:00` и их
 * не меньше трёх), и так честнее: одинокая метка в описании обычно значит «смотрите с этого места», а не «вот структура ролика».
 */
export function parseChapters(description) {
  const found = []
  for (const raw of String(description ?? "").split("\n")) {
    const m = raw.match(/^\s*[([]?\s*(\d{1,3}:\d{2}(?::\d{2})?)\s*[)\]]?\s*[-–—:|)]?\s*(.+?)\s*$/)
    if (!m) continue
    const seconds = secondsOfStamp(m[1])
    const title = m[2].replace(/^[-–—:|)\s]+/, "").trim()
    if (seconds === null || !title) continue
    found.push({ seconds, stamp: m[1], title })
  }
  const unique = []
  for (const c of found.sort((a, b) => a.seconds - b.seconds)) {
    if (!unique.some((x) => x.seconds === c.seconds)) unique.push(c)
  }
  return unique.length >= 2 ? unique : []
}

/** В какой главе лежит секунда: последняя глава, начавшаяся не позже её. Нет глав — `null`. */
export function chapterAt(seconds, chapters) {
  const t = Number(seconds)
  if (!Number.isFinite(t) || !Array.isArray(chapters) || !chapters.length) return null
  let hit = null
  for (const c of chapters) {
    if (c.seconds <= t) hit = c
    else break
  }
  return hit
}

/** Идентификатор ролика из адреса или `null`: `watch?v=`, `youtu.be/`, `/shorts/`, `/embed/`, `/live/`. */
export function youtubeId(raw) {
  let u
  try {
    u = new URL(String(raw ?? "").trim())
  } catch {
    return null
  }
  const host = u.hostname.toLowerCase().replace(/^(www|m|music)\./, "")
  const ID = /^[A-Za-z0-9_-]{11}$/
  if (host === "youtu.be") {
    const id = u.pathname.slice(1).split("/")[0]
    return ID.test(id) ? id : null
  }
  if (host !== "youtube.com" && host !== "youtube-nocookie.com") return null
  const v = u.searchParams.get("v")
  if (v && ID.test(v)) return v
  const m = u.pathname.match(/^\/(?:shorts|embed|live|v)\/([A-Za-z0-9_-]{11})/)
  return m ? m[1] : null
}

/** Секунда из адреса (`?t=4119s`, `&start=4119`, `t=1h8m39s`) или `null` — человек прислал ссылку на момент. */
export function secondsOfUrl(raw) {
  let u
  try {
    u = new URL(String(raw ?? "").trim())
  } catch {
    return null
  }
  const v = u.searchParams.get("t") ?? u.searchParams.get("start")
  if (!v) return null
  if (/^\d+s?$/.test(v)) return Number(v.replace("s", ""))
  const m = v.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/)
  if (!m || !m.slice(1).some(Boolean)) return null
  return Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0)
}
