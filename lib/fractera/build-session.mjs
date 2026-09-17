// ПОСТОЯННАЯ СЕССИЯ СТРОИТЕЛЯ — ТЕРМИНАЛ, КОТОРЫЙ ПЕРЕЖИВАЕТ УХОД СО СТРАНИЦЫ (шаг 202-2).
//
// 🎯 ТРЕБОВАНИЯ ВЛАДЕЛЬЦА 2026-09-15, ДОСЛОВНО: «до того как она будет запущена она не должна расходовать
// ресурсы компьютера … все они должны спать, пока с ними мы не начнём работать» · «Когда я перехожу в другие
// вкладки терминал должен продолжать работать» · «Несмотря на то что терминал работают нужно быть кнопка
// остановить».
//
// 🔒 ОТСЮДА ТРИ СВОЙСТВА, И КАЖДОЕ — В КОНСТРУКЦИИ, А НЕ В ОБЕЩАНИИ:
//  ① процесс рождается ТОЛЬКО по явному запуску; подключение к спящей службе ничего не рождает;
//  ② закрытие сокета ОТКЛЮЧАЕТ, но не убивает; вывод копится в кольцевом буфере и отдаётся при возврате;
//  ③ остановка — отдельное действие, и оно одно на всех: сокет, дверь статуса и выход самого процесса.
//
// 🔒 ХРАНИЛИЩЕ В `globalThis`, КАК У БИЛЕТОВ ТЕРМИНАЛА: мост `server.mjs` и дверь Next живут в ОДНОМ процессе,
// но в разных графах модулей — модульная переменная у каждого была бы своя, и дверь статуса не видела бы
// сессию, рождённую мостом.
//
// 🛑 СЕССИЯ ОДНА НА СЛУЖБУ: мастерская принадлежит одному архитектору (закон четвёртый памяти), и второй
// строитель в той же папке правил бы те же файлы одновременно с первым.

const STORE_KEY = "__fracteraBuildSession"

/** Сколько вывода помним для возврата на вкладку. Экран Claude Code перерисовывается целиком — хватает с запасом. */
export const BUFFER_BYTES = 256 * 1024

function box() {
  const g = /** @type {Record<string, any>} */ (globalThis)
  if (!g[STORE_KEY]) g[STORE_KEY] = { session: null }
  return g[STORE_KEY]
}

/** Живая сессия или `null`. */
export function current() {
  return box().session
}

/**
 * Зарегистрировать только что рождённый процесс.
 * @param {{ proc: any, pid: number }} input
 */
export function register({ pid, proc }) {
  const session = { buffer: "", clients: new Set(), pid, proc, startedAt: new Date().toISOString() }
  box().session = session
  return session
}

/** Дописать вывод в кольцевой буфер. */
export function remember(session, chunk) {
  session.buffer = (session.buffer + chunk).slice(-BUFFER_BYTES)
}

/** Что видно снаружи: без процесса и сокетов, только факты. */
export function status() {
  const s = box().session
  if (!s) return { running: false }
  return { bytes: s.buffer.length, clients: s.clients.size, pid: s.pid, running: true, startedAt: s.startedAt }
}

/**
 * Остановить: убить процесс, закрыть всех подключённых, забыть сессию.
 * @param {string} reason причина, которую увидят подключённые
 */
export function stop(reason = "stopped") {
  const s = box().session
  if (!s) return { ok: true, was: false }
  box().session = null
  for (const ws of s.clients) {
    try {
      ws.close(1000, reason)
    } catch { /* уже закрыт */ }
  }
  s.clients.clear()
  try {
    s.proc.kill()
  } catch { /* уже мёртв */ }
  return { ok: true, pid: s.pid, was: true }
}

/** Процесс завершился сам (человек набрал `exit`, Claude Code закрыт): сессия исчезает, подключённые узнают причину. */
export function exited(session) {
  if (box().session !== session) return
  box().session = null
  for (const ws of session.clients) {
    try {
      ws.close(1000, "exited")
    } catch { /* уже закрыт */ }
  }
  session.clients.clear()
}
