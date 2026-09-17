import { spawnSync } from "node:child_process";




// ЗНАНИЕ О CLI `claude` В ОДНОМ МЕСТЕ (шаг 115).
//
// 🔒 `.mjs`, А НЕ `.ts`, ПО ТОЙ ЖЕ ПРИЧИНЕ, ЧТО У `pty-ticket.mjs`: файл читают
// ДВЕ половины — двери внутри сборки Next и `server.mjs` рядом с ней, а он
// TypeScript не исполняет. Две реализации одного знания разошлись бы на первой
// же правке; здесь их одна.
//
// 🔒 ЧТО ИМЕННО СЮДА ПЕРЕЕХАЛО: где лежит бинарь, вошли ли по подписке и где
// плагин канала ищет токен. Всё это — свойства ЧУЖОГО инструмента, а знание о
// чужом инструменте живёт в одном месте (закон шага 109).

/** Путь к CLI. `which` — потому что установка глобальная и путь машинный. */
export function claudeBin() {
  if (process.env.CLAUDE_BIN) {
    return process.env.CLAUDE_BIN;
  }
  const which = spawnSync("which", ["claude"], { encoding: "utf8" });
  const found = which.status === 0 ? which.stdout.trim() : "";
  return found || "claude";
}

/**
 * Вошли ли уже по подписке.
 *
 * 🔒 СПРАШИВАЕМ ПОЛЕ, А НЕ КОД ВОЗВРАТА: у `claude auth status` он нулевой и у
 * вошедшего, и у невошедшего — она печатает JSON в обоих случаях.
 *
 * `null` — спросить не удалось. Это НЕ «не вошёл»: разница решает, покажем мы
 * человеку вход или ложное «подключено».
 *
 * @returns {{ loggedIn: boolean | null, method: string | null }}
 */
export function claudeAuthState() {
  try {
    const out = spawnSync(claudeBin(), ["auth", "status"], {
      encoding: "utf8",
      timeout: 15_000,
    });
    if (out.status !== 0 || !out.stdout) {
      return { loggedIn: null, method: null };
    }
    const parsed = JSON.parse(out.stdout);
    return {
      loggedIn: typeof parsed.loggedIn === "boolean" ? parsed.loggedIn : null,
      method: typeof parsed.authMethod === "string" ? parsed.authMethod : null,
    };
  } catch {
    return { loggedIn: null, method: null };
  }
}

// 🪦 ФУНКЦИИ TELEGRAM ЧАТА СЮДА НЕ ПОЕХАЛИ (180-3): токен BotFather, маска,
// запись `.env` плагина и чтение привязки собеседника обслуживали окно
// настройки агента — а у памяти бота нет. Копия остановлена на `claudeAuthState()`:
// ровно столько нужно мосту терминала, чтобы решить, просить ли вход.
