import { spawnSync } from "node:child_process"
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { extname, join } from "node:path"
import { transcribe } from "./model.mjs"
import { think } from "./think.mjs"

// ОПИСАТЬ ОБЪЕКТ МОДЕЛЬЮ: ПОЛНОЕ ОПИСАНИЕ И САММАРИ (194-2).
//
// 🎯 СЛОВО ВЛАДЕЛЬЦА 2026-09-13: «в случае если это аудиофайл то OpenAI … любой другой файл может описать
// модель, которая на текущий момент подключена через подписку … Полное описание должно быть настолько
// детально, чтобы из этого объекта можно было получить полную реконструкцию … А описание — примерно в
// 50 слов». Видео — «дорожка + кадры сейчас».
//
// 🔒 ОДИН ВЫХОД НА ВСЕ РОДЫ: `{ title, full, summary, tags, anchors, language }`. Разные входы
// (речь, кадры, страницы) сходятся в одну форму ДО того, как её увидит экран, таблица и граф: иначе
// каждый потребитель начал бы различать роды сам.
//
// 🔒 ОТВЕТ ПРОВЕРЯЕМ МЫ, А НЕ ОБЕЩАЕТ МОДЕЛЬ (закон `socials-ai`): не прошедшее проверку
// отбрасывается целиком — наполовину разобранное описание сохранили бы.
//
// 🛑 ВРЕМЕННАЯ ПАПКА СТИРАЕТСЯ В ЛЮБОМ ИСХОДЕ. В ней лежит чужой файл целиком; оставленная после
// отказа, она копилась бы на диске боевой машины молча.
//
// 🛑 ЦЕНА НАЗВАНА: одно описание = один ход Claude по подписке владельца (общая квота с ботом),
// у аудио и видео — ещё одна расшифровка OpenAI.

/** Отказы, которые рождаются здесь. Отказы модели и расшифровки приходят своими кодами. */
export const REFUSAL = {
  BAD_ANSWER: "describe-answer-unusable",
  EMPTY: "describe-empty-file",
  FFMPEG: "describe-ffmpeg-failed",
  TOO_LARGE: "describe-too-large",
  UNSUPPORTED: "describe-kind-unsupported",
}

/** Предел файла описания. Расшифровка OpenAI принимает 25 МБ; стенду больше не нужно. */
export const MAX_BYTES = 20 * 1024 * 1024

const EXT = {
  audio: [".mp3", ".m4a", ".wav", ".ogg", ".oga", ".opus", ".flac", ".webm", ".aac"],
  image: [".png", ".jpg", ".jpeg", ".gif", ".webp"],
  pdf: [".pdf"],
  text: [".txt", ".md", ".markdown", ".csv", ".tsv", ".json", ".html", ".htm", ".xml", ".yml", ".yaml"],
  video: [".mp4", ".mov", ".mkv", ".avi", ".m4v"],
}

/**
 * Род файла — по расширению, затем по mime.
 * 🔒 `.webm` СЧИТАЕТСЯ ЗВУКОМ, если mime не говорит `video/`: так его шлёт запись голоса в браузере.
 */
export function kindOf(name, mime = "") {
  const ext = extname(String(name ?? "")).toLowerCase()
  const m = String(mime ?? "").toLowerCase()
  if (ext === ".webm" && m.startsWith("video/")) return "video"
  for (const [kind, list] of Object.entries(EXT)) if (list.includes(ext)) return kind
  if (m.startsWith("audio/")) return "audio"
  if (m.startsWith("video/")) return "video"
  if (m.startsWith("image/")) return "image"
  if (m === "application/pdf") return "pdf"
  if (m.startsWith("text/")) return "text"
  return null
}

/** Род строки таблицы сообщений из рода описания: там `text` и `document` различаются. */
export const messageKindOf = (kind) => (kind === "text" ? "document" : kind)

const SYSTEM = `You describe one object for a memory system. Return ONLY a JSON object, no prose, no code fence:
{"title": "...", "full": "...", "summary": "...", "tags": ["..."], "anchors": ["..."], "language": "..."}

- "title": 4-8 words naming the object.
- "full": a description detailed enough that another AI could RECONSTRUCT the object from it alone.
  For an image: composition and layout, every visible element with its position, sizes relative to the
  frame, colours (approximate hex), lighting, style, and ALL visible text verbatim.
  For a document or PDF: its structure (sections, headings, tables, lists) and its full content — text
  verbatim where possible, tables row by row.
  For speech: who speaks, tone, and the complete content in order.
  For video: the sequence of scenes from the frames in time order, plus the spoken content.
- "summary": about 50 words (35-70) saying what the object is and what it is about.
- "tags": 3-7 lowercase keywords a person would grep for.
- "anchors": 1-10 named entities (people, places, organisations, products) that occur in the object; if
  none, use the title's main noun phrase.
- "language": ISO 639-1 code of the object's own content ("und" if it has no language).
Write "title", "full" and "summary" in Russian, but keep verbatim quotations in their original language.
Never invent content you cannot see or hear; say plainly what is unreadable.`

const words = (s) => String(s ?? "").trim().split(/\s+/).filter(Boolean).length

/** Проверка формы ответа. Возвращает причину отказа или null. */
export function checkShape(d) {
  if (!d || typeof d !== "object") return "not-an-object"
  if (typeof d.title !== "string" || !d.title.trim()) return "no-title"
  if (typeof d.full !== "string" || d.full.trim().length < 80) return "full-too-short"
  const n = words(d.summary)
  if (typeof d.summary !== "string" || n < 15 || n > 120) return `summary-${n}-words`
  if (!Array.isArray(d.tags) || !d.tags.every((t) => typeof t === "string")) return "bad-tags"
  if (!Array.isArray(d.anchors) || !d.anchors.length || !d.anchors.every((a) => typeof a === "string")) return "bad-anchors"
  return null
}

const run = (bin, args) => spawnSync(bin, args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 120000 })

/** Длительность в секундах или 0. */
function durationOf(file) {
  const r = run("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", file])
  const s = Number(String(r.stdout ?? "").trim())
  return Number.isFinite(s) && s > 0 ? s : 0
}

/**
 * Разобрать видео: дорожка → mp3, шесть кадров равномерно → jpg.
 * 🔒 ВИДЕО БЕЗ ЗВУКА — ЗАКОННО: дорожки нет, и описание идёт по одним кадрам, а не отказывает.
 */
function splitVideo(dir, file) {
  const audio = join(dir, "track.mp3")
  const a = run("ffmpeg", ["-y", "-v", "error", "-i", file, "-vn", "-ac", "1", "-ar", "16000", "-b:a", "64k", audio])
  const hasAudio = a.status === 0
  const seconds = durationOf(file)
  const frames = []
  const count = 6
  for (let i = 0; i < count; i++) {
    const at = seconds > 0 ? (seconds * (i + 0.5)) / count : i
    const out = join(dir, `frame-${i + 1}.jpg`)
    const f = run("ffmpeg", ["-y", "-v", "error", "-ss", at.toFixed(2), "-i", file, "-frames:v", "1", "-vf", "scale=768:-2", out])
    if (f.status === 0) frames.push({ at: Math.round(at), path: out })
  }
  return { audio: hasAudio ? audio : null, frames, seconds: Math.round(seconds) }
}

/**
 * Описать объект.
 * @returns {Promise<{ok:true, kind:string, title:string, full:string, summary:string, tags:string[],
 *   anchors:string[], language:string, described_by:string, ms:number} | {ok:false, refusal:string, why?:string}>}
 */
export async function describe({ bytes, mime = "", name }) {
  const started = Date.now()
  if (!bytes?.length) return { ok: false, refusal: REFUSAL.EMPTY }
  if (bytes.length > MAX_BYTES) return { ok: false, refusal: REFUSAL.TOO_LARGE }
  const kind = kindOf(name, mime)
  // 🔒 НЕПОДДЕРЖАННЫЙ РОД ОТКАЗЫВАЕТ ДО МОДЕЛИ: ход подписки не тратится на то, что нельзя описать.
  if (!kind) return { ok: false, refusal: REFUSAL.UNSUPPORTED, why: extname(String(name ?? "")) || mime }

  const dir = mkdtempSync(join(tmpdir(), "memory-describe-"))
  try {
    const safe = `object${extname(String(name)).toLowerCase() || ".bin"}`
    const file = join(dir, safe)
    writeFileSync(file, bytes)

    let user
    let tools = []
    let by = "claude"

    if (kind === "audio") {
      const heard = await transcribe({ bytes, mime, name: safe })
      if (!heard.ok) return heard
      by = "openai whisper-1 + claude"
      user = `Object kind: audio recording, file name "${name}".\nTranscript (whisper-1):\n\n${heard.text || "(no speech recognised)"}`
    } else if (kind === "video") {
      const parts = splitVideo(dir, file)
      if (!parts.frames.length) return { ok: false, refusal: REFUSAL.FFMPEG, why: "no-frames" }
      let transcript = "(the video has no audio track)"
      if (parts.audio) {
        const heard = await transcribe({ bytes: null, mime: "audio/mpeg", name: "track.mp3", path: parts.audio })
        if (!heard.ok) return heard
        transcript = heard.text || "(no speech recognised)"
        by = "openai whisper-1 + claude"
      }
      tools = ["Read"]
      user = [
        `Object kind: video, file name "${name}", about ${parts.seconds} s long.`,
        `Read these ${parts.frames.length} frames in time order:`,
        ...parts.frames.map((f) => `- ${f.path} (at ${f.at} s)`),
        "",
        "Transcript of the audio track (whisper-1):",
        transcript,
      ].join("\n")
    } else {
      tools = ["Read"]
      user = `Object kind: ${kind}, file name "${name}". Read the file ${file} and describe it.`
    }

    // 🔒 ПАПКА ОБЪЕКТА ОТКРЫВАЕТСЯ ПОИМЁННО, А НЕ СНЯТИЕМ ПРОВЕРКИ ПУТЕЙ (урок 115: модальный
    // вопрос у процесса без терминала равен зависанию).
    const r = await think(SYSTEM, user, { dirs: [dir], timeoutMs: 300000, tools })
    if (!r.ok) return r
    const bad = checkShape(r.data)
    if (bad) return { ok: false, refusal: REFUSAL.BAD_ANSWER, why: bad }

    const d = r.data
    return {
      anchors: d.anchors.map((a) => a.trim()).filter(Boolean).slice(0, 10),
      described_by: by,
      full: d.full.trim(),
      kind,
      language: typeof d.language === "string" ? d.language.trim().slice(0, 8) : "und",
      ms: Date.now() - started,
      ok: true,
      summary: d.summary.trim(),
      tags: d.tags.map((t) => t.trim().toLowerCase()).filter(Boolean).slice(0, 7),
      title: d.title.trim(),
    }
  } finally {
    rmSync(dir, { force: true, recursive: true })
  }
}

/** Для прибора: что осталось во временных папках описания (обязано быть пусто). */
export function leftovers() {
  return readdirSync(tmpdir()).filter((n) => n.startsWith("memory-describe-"))
}
