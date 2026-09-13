import { readFileSync, writeFileSync } from "node:fs"
import { machineEnv, writeMachineEnv } from "@/lib/fractera/machine-env"
import { readAnthropicKeyState } from "@/lib/architect/anthropic-key"
import { dataJson } from "@/lib/fractera/data-service"

// МОДЕЛИ, КОТОРЫМИ РАБОТАЕТ ПАМЯТЬ, — ОДНО МЕСТО ЧТЕНИЯ И ЗАПИСИ (189-7).
//
// 🎯 ЗАКАЗ ВЛАДЕЛЬЦА 2026-09-13: «в настройки пробрасывай настройки модели.
// Сейчас в настройках только есть выбор Anthropic API key».
//
// 🔒 МОДЕЛЕЙ ДВЕ, И ОНИ РАЗНОЙ ПРИРОДЫ — ОТСЮДА ВСЁ ОСТАЛЬНОЕ В ЭТОМ ФАЙЛЕ.
//   • модель РАЗМЫШЛЕНИЯ — ею память думает: разбирает фразу, собирает ответ.
//     Живёт в складе секретов машины, меняется свободно, применяется сразу.
//   • модель ВСТРАИВАНИЙ — ею она считает смысл текста. Живёт в окружении СЛОЯ
//     ДАННЫХ, потому что склад векторов принадлежит ему, а не нам.
//
// 🛑 И ГЛАВНОЕ РАЗЛИЧИЕ, РАДИ КОТОРОГО ЗДЕСЬ СТОЛЬКО ЗАЩИТЫ: СМЕНА МОДЕЛИ
// ВСТРАИВАНИЙ НА НЕПУСТОМ СКЛАДЕ РАВНА ПОТЕРЕ ДАННЫХ. Размерность входит в
// индекс (1536 против 3072), и прежние векторы становятся нечитаемы — не
// «хуже находятся», а не читаются вовсе. Поэтому смена разрешена только на
// пустом складе, и проверку делает код, а не предупреждение в тексте.

/** Модель размышления: чем память думает. */
export const THINK_KEY = "MEMORY_THINK_MODEL"

/**
 * Чем можно думать.
 *
 * 🔒 СПИСОК ЗАКРЫТЫЙ, И ЭТО ГРАНИЦА, А НЕ УДОБСТВО: значение приходит с экрана и
 * уезжает в аргумент запускаемой программы. Открытый список означал бы, что
 * командную строку составляет тот, кто открыл страницу.
 */
export const THINK_MODELS = [
  {
    id: "fable",
    // 🔒 ДОСТУП ЧЕРЕЗ КЛЮЧ API, А НЕ ЧЕРЕЗ ПОДПИСКУ — слово владельца 2026-09-13.
    // Это не примечание, а условие выбора: без ключа разбор начнёт отказывать, и
    // человек пойдёт чинить память вместо того, чтобы вставить ключ этажом выше.
    needsKey: true,
    why: "новейшая; доступна только по ключу Anthropic, подписка её не открывает",
  },
  { id: "opus", needsKey: false, why: "самая сильная из доступных по подписке; точнее прочих на сложной фразе" },
  { id: "sonnet", needsKey: false, why: "быстрее и дешевле; хватает на простой разбор" },
  { id: "haiku", needsKey: false, why: "самая быстрая; для коротких однозначных фраз" },
] as const

/**
 * Чем можно считать смысл.
 *
 * 🔒 РАЗМЕРНОСТЬ ЕДЕТ ВМЕСТЕ С ИМЕНЕМ, А НЕ ВВОДИТСЯ ОТДЕЛЬНО. Несовпадение
 * ломает индекс, и человек, выбравший модель, не обязан помнить её число.
 */
export const EMBED_MODELS = [
  {
    dims: 3072,
    id: "text-embedding-3-large",
    why: "находит нужное надёжнее и отделяет находку от постороннего; работает через языковую границу — вопрос на одном языке, запись на другом",
  },
  {
    dims: 1536,
    id: "text-embedding-3-small",
    why: "вшестеро дешевле и втрое быстрее на загрузке, но на неанглийском тексте путает близкое с подходящим",
  },
] as const

/** Где живёт окружение слоя данных. Его склад — его настройка. */
const DATA_ENV = process.env.DATA_ENV_FILE ?? "/opt/fractera/services/data/.env"

export type ModelsState = {
  /** Чем память думает сейчас. */
  think: string
  /**
   * Задан ли ключ Anthropic — от него зависит, какие модели вообще доступны.
   *
   * 🔒 КАРТОЧКА МОДЕЛИ ЗНАЕТ ПРО КАРТОЧКУ КЛЮЧА, И ЭТО НЕ ЛИШНЯЯ СВЯЗЬ. Выбор
   * модели, требующей ключа, при отсутствующем ключе — это отказ, который
   * всплывёт не здесь, а в первом же разборе фразы, и выглядеть будет как
   * поломка памяти.
   */
  hasKey: boolean
  /** Чем считает смысл — по словам самого слоя данных, а не по нашему файлу. */
  embed: { configured: boolean; count: number; dims: number; model: string; reachable: boolean }
}

/**
 * Что стоит сейчас.
 *
 * 🔒 МОДЕЛЬ ВСТРАИВАНИЙ СПРАШИВАЕТСЯ У СЛУЖБЫ, А НЕ ЧИТАЕТСЯ ИЗ ФАЙЛА. Файл
 * говорит, что мы записали; служба — с чем она работает на самом деле. Между
 * ними перезапуск, и после правки без него они расходятся. Показав файл, экран
 * соврал бы ровно в тот момент, когда человек проверяет, подействовало ли.
 */
export async function readModels(): Promise<ModelsState> {
  const think = machineEnv(THINK_KEY) || "opus"
  const hasKey = readAnthropicKeyState().configured

  try {
    const s = await dataJson<{ configured?: boolean; dims?: number; model?: string }>(
      "/vectors/status",
    )
    const c = await dataJson<{ rows?: { n?: number }[] }>("/db/migrate", {
      body: JSON.stringify({ sql: "SELECT COUNT(*) AS n FROM vectors" }),
      method: "POST",
    })
    return {
      embed: {
        configured: Boolean(s.configured),
        count: Number(c.rows?.[0]?.n ?? 0),
        dims: Number(s.dims ?? 0),
        model: String(s.model ?? ""),
        reachable: true,
      },
      hasKey,
      think,
    }
  } catch {
    // Слой данных недостижим — это состояние, а не ошибка экрана: память умеет
    // жить без него, и карточка обязана сказать это словами.
    return {
      embed: { configured: false, count: 0, dims: 0, model: "", reachable: false },
      hasKey,
      think,
    }
  }
}

/**
 * Сменить модель размышления. Применяется сразу: её читают в момент вызова.
 *
 * 🔒 ЗАПРЕТ НА МОДЕЛЬ БЕЗ КЛЮЧА СТОИТ ЗДЕСЬ, А НЕ ТОЛЬКО НА КНОПКЕ. Кнопка —
 * удобство, дверь — граница: защита, живущая на экране, снимается любым прямым
 * вызовом, и тогда память молча начнёт отказывать на каждом разборе.
 */
export function setThinkModel(id: string): { ok: boolean; error?: string } {
  const chosen = THINK_MODELS.find((m) => m.id === id)
  if (!chosen) return { error: "unknown-model", ok: false }
  if (chosen.needsKey && !readAnthropicKeyState().configured) {
    return { error: "needs-anthropic-key", ok: false }
  }
  return writeMachineEnv(THINK_KEY, id) ? { ok: true } : { error: "write-failed", ok: false }
}

/**
 * Сменить модель встраиваний.
 *
 * 🛑 ТРИ ПРОВЕРКИ ДО ПЕРВОЙ ЗАПИСИ, И НИ ОДНА НЕ ЛИШНЯЯ:
 *   ① модель из закрытого списка — значение едет в чужое окружение;
 *   ② склад ПУСТ — иначе смена размерности делает прежние векторы нечитаемыми;
 *   ③ файл окружения слоя данных на месте — иначе мы создадим его наполовину.
 *
 * 🔒 СТРОКИ ПРАВЯТСЯ ПОИМЁННО, ФАЙЛ НЕ ПЕРЕЗАПИСЫВАЕТСЯ ЦЕЛИКОМ. Рядом живут
 * ключ доступа к слою данных, путь к базе и секрет — «записать файл целиком» в
 * этом слое не появится никогда.
 */
export async function setEmbedModel(id: string): Promise<{ ok: boolean; error?: string }> {
  const chosen = EMBED_MODELS.find((m) => m.id === id)
  if (!chosen) return { error: "unknown-model", ok: false }

  const state = await readModels()
  if (!state.embed.reachable) return { error: "data-unreachable", ok: false }
  if (state.embed.model === chosen.id) return { error: "already-set", ok: false }
  if (state.embed.count > 0) return { error: "store-not-empty", ok: false }

  let text: string
  try {
    text = readFileSync(DATA_ENV, "utf8")
  } catch {
    return { error: "env-missing", ok: false }
  }

  const put = (src: string, key: string, value: string) =>
    new RegExp(`^${key}=.*$`, "m").test(src)
      ? src.replace(new RegExp(`^${key}=.*$`, "m"), `${key}=${value}`)
      : `${src.replace(/\n*$/, "\n")}${key}=${value}\n`

  let next = put(text, "EMBED_MODEL", chosen.id)
  next = put(next, "EMBED_DIMS", String(chosen.dims))

  try {
    writeFileSync(DATA_ENV, next, { mode: 0o600 })
  } catch {
    return { error: "write-failed", ok: false }
  }

  // 🔒 ИНДЕКС СНОСИТСЯ ЗДЕСЬ ЖЕ, А НЕ ОСТАВЛЯЕТСЯ СЛУЖБЕ. Он создан под прежнюю
  // размерность и сам себя не пересоберёт: имена колонок у него те же, меняется
  // только длина вектора внутри. Оставленный, он принимал бы записи и отвечал
  // отказом на каждую — то есть выглядел бы живым.
  try {
    await dataJson("/db/migrate", {
      body: JSON.stringify({ sql: "DROP TABLE IF EXISTS vectors_ann" }),
      method: "POST",
    })
  } catch {
    return { error: "index-drop-failed", ok: false }
  }

  return { ok: true }
}
