import "server-only";

import { machineEnv, writeMachineEnv } from "@/lib/fractera/machine-env";

// КЛЮЧ YOUTUBE DATA API — ОДИН ПОТРЕБИТЕЛЬ, ПАМЯТЬ (195-4).
//
// 🎯 РЕШЕНИЕ ВЛАДЕЛЬЦА 2026-09-14: «Ключ API (AIza…)». Ключ нужен, чтобы память читала данные ролика и его ГЛАВЫ — то есть отвечала на вопрос
// «на какой минуте про это говорили» без расшифровки и без браузера.
//
// 🔒 ПОТРЕБИТЕЛЬ ОДИН, И ПОТОМУ ДВЕРИ СЛОЯ ДАННЫХ ЗДЕСЬ НЕТ. У ключа OpenAI их четыре (проект, слой данных, граф, склад машины), и ради этого
// заведена дверь платформы. Ключ YouTube читает только память: лишний путь доставки добавил бы вторую правду о том, задан ли он.
// 🔒 МЕСТО — СКЛАД СЕКРЕТОВ МАШИНЫ `/etc/fractera/secrets.env`, ПОСТРОЧНО. Тот же закон, что у остальных секретов: снимок целиком затёр бы
// соседние значения, потеря которых означает мёртвый сервер.
// 🛑 НАРУЖУ КЛЮЧ НЕ ВЫХОДИТ НИКОГДА: отдаётся только признак «задан» и последние четыре знака — ответ на вопрос «тот ли ключ», а не сам ключ.

/** Ссылочный ролик проверки: короткий, открытый, живёт годами. */
const CHECK_VIDEO = "jNQXAC9IVRw";

export type YoutubeKeyState = { configured: boolean; tail: string };

/**
 * Ключ для чтения. Порядок источников тот же, что у всех потребителей: своё окружение процесса сильнее склада машины —
 * на машине разработчика склада нет вовсе.
 */
export function youtubeApiKey(): string {
  return process.env.YOUTUBE_API_KEY || machineEnv("YOUTUBE_API_KEY") || "";
}

export function readYoutubeKeyState(): YoutubeKeyState {
  const key = youtubeApiKey();
  return { configured: Boolean(key), tail: key ? key.slice(-4) : "" };
}

/**
 * Форма ключа проверяется ДО записи, и это не придирка к виду.
 * ✗ Ключ, записанный с пробелом или кавычками, даёт `400` от Google — и выглядит это как «Google не отвечает», а не как опечатка человека.
 */
export function looksLikeApiKey(key: string): boolean {
  return /^AIza[0-9A-Za-z_-]{30,50}$/.test(key.trim());
}

export function saveYoutubeKey(raw: string): { ok: boolean; error?: string } {
  const key = String(raw ?? "").trim();
  if (!key) return { error: "empty", ok: false };
  if (!looksLikeApiKey(key)) return { error: "bad-format", ok: false };
  return writeMachineEnv("YOUTUBE_API_KEY", key) ? { ok: true } : { error: "store-refused", ok: false };
}

/**
 * Живая проверка ключа: не «похож ли он», а принимает ли его Google.
 * 🔒 ОТКАЗЫ РАЗЛИЧАЮТСЯ ПОИМЁННО: отвергнутый ключ, исчерпанная квота и недоступная сеть чинятся по-разному.
 */
export async function checkYoutubeKey(): Promise<{ ok: boolean; error?: string; why?: string; title?: string }> {
  const key = youtubeApiKey();
  if (!key) return { error: "key-missing", ok: false };
  try {
    const r = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${CHECK_VIDEO}&key=${encodeURIComponent(key)}`,
      { cache: "no-store" },
    );
    const j = (await r.json().catch(() => ({}))) as {
      error?: { errors?: { reason?: string }[]; message?: string };
      items?: { snippet?: { title?: string } }[];
    };
    if (j.error) {
      const reason = j.error.errors?.[0]?.reason ?? "";
      const code = /quota/i.test(reason) ? "quota" : /denied|invalid|forbidden|required/i.test(reason) ? "key-rejected" : "refused";
      return { error: code, ok: false, why: String(j.error.message ?? reason).slice(0, 200) };
    }
    const title = j.items?.[0]?.snippet?.title;
    if (!title) return { error: "refused", ok: false, why: `http ${r.status}` };
    return { ok: true, title };
  } catch (e) {
    return { error: "unreachable", ok: false, why: String((e as Error).message).slice(0, 200) };
  }
}
