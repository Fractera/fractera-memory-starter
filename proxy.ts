import { type NextRequest, NextResponse } from "next/server";

// ПРИВРАТНИК СЛУЖБЫ ПАМЯТИ (178-2).
//
// 🪦 СКОПИРОВАН С 382-СТРОЧНОГО ПРИВРАТНИКА СЛУЖБЫ ЧАТА И УРЕЗАН ДО СУТИ.
// Оттуда убраны правила чужих способностей: формы входа шаблона, `/api/auth/*`,
// заглушка `/welcome`, терминал, дверь каналов `:3500`, шесть дверей агента
// (`separate`, `close`, `registry`, `feedback`, `knowledge`, `memory`), `/ping`
// и переадресация корня в терминал. Ни одной из этих поверхностей у памяти нет.
//
// 🔒 ЧТО ОСТАЛОСЬ И ПОЧЕМУ ИМЕННО ЭТО:
//   ① дверь стенда отвечает САМА — её имя названо поимённо;
//   ② всё прочее требует человека, узнанного единственной службой входа.
//
// 🛑 `proxy.ts`, А НЕ `middleware.ts` — намеренное соглашение проекта для
// Next 16/Turbopack. Пустой `middleware-manifest.json` не признак поломки.

/**
 * 🔒 ДВЕРИ, КОТОРЫЕ ОТВЕЧАЮТ САМИ, НАЗЫВАЮТСЯ ПОИМЁННО — И ЭТО ПЯТЫЙ СЛУЧАЙ
 * ОДНОГО КЛАССА В ПРОЕКТЕ ЗА ТРИ ДНЯ.
 *
 * Признак, по которому такую дверь узнают: она сама зовёт проверку сессии.
 * Перехваченная привратником, она отдаёт переадресацию — и островок читает HTML
 * вместо JSON, то есть человек с истёкшей сессией видит «память не отвечает»
 * вместо «войдите заново». Обвинён был бы ровно тот, кого стенд испытывает.
 *
 * 🛑 ИМЕНЕМ, А НЕ ПРЕФИКСОМ `/api/fractera/*`: префикс открыл бы заодно всё,
 * что появится рядом завтра.
 */
const SELF_GUARDED = new Set(["/api/fractera/memory-test"]);

export async function proxy(request: NextRequest) {
  const { pathname } = new URL(request.url);

  if (SELF_GUARDED.has(pathname)) {
    return NextResponse.next();
  }

  // 🛑 ПУСТАЯ КОРЗИНА КУК — НЕ ПОВОД НЕ СПРАШИВАТЬ, И ЭТО ПРО РЕЖИМ БЕЗ ДОМЕНА.
  // Пока сервер живёт на голом IP, служба входа отдаёт архитектора ВСЕМ: панель
  // и сайт в онбординге работают, и память не имеет права быть единственной, кто
  // отвечает «войдите» там, где входить ещё некуда. Цена — один запрос по петле.
  const cookie = request.headers.get("cookie") ?? "";
  let signedIn = false;
  try {
    const authService =
      process.env.AUTH_SERVICE_URL ||
      process.env.NEXT_PUBLIC_AUTH_URL ||
      "http://127.0.0.1:3001";
    const res = await fetch(`${authService}/api/session`, {
      cache: "no-store",
      headers: cookie ? { cookie } : undefined,
    });
    // 🔒 ОТВЕТ ЧИТАЕТСЯ ЦЕЛИКОМ, А НЕ ПО КОДУ: `200` с телом без `email` значит
    // «никто не вошёл», а не «вошёл безымянный».
    signedIn = res.ok && Boolean(((await res.json()) as { email?: string })?.email);
  } catch {
    // 🛑 СЛУЖБА ВХОДА МОЛЧИТ — ЧЕЛОВЕК НЕ УЗНАН, И ЭТО ЧЕСТНЫЙ ИСХОД. Пускать
    // «на всякий случай» значило бы открыть страницу целиком в тот момент, когда
    // одна служба не отвечает.
    signedIn = false;
  }

  if (!signedIn) {
    // 🔒 УВОДИМ К ЕДИНСТВЕННОЙ ТОЧКЕ ВХОДА, А НЕ К СВОЕЙ ЗАГЛУШКЕ. У чата
    // заглушка `/welcome` есть и объясняет, где человек оказался; у памяти её
    // нет, и заводить её ради одного случая значило бы завести вторую страницу
    // о входе — при том что вход в проекте один.
    const auth =
      process.env.NEXT_PUBLIC_AUTH_URL ||
      process.env.AUTH_SERVICE_URL ||
      "http://127.0.0.1:3001";
    const back = `${new URL(request.url).origin}${pathname}`;
    return NextResponse.redirect(
      `${auth}/login?callbackUrl=${encodeURIComponent(back)}&requireRole=architect`,
    );
  }

  return NextResponse.next();
}

export const config = {
  // 🔒 `/v1/*` В СПИСКЕ НЕТ, И ЭТО НЕ ЗАБЫВЧИВОСТЬ: договор обслуживается НАШИМ
  // обработчиком в `server.mjs` и до Next не доходит вовсе. Внеси мы его сюда —
  // ничего бы не изменилось, но следующий читатель решил бы, что привратник его
  // стережёт, и однажды понадеялся бы на это.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)"],
};
