import { NextResponse } from "next/server";
import { benchGuard } from "@/lib/bench-guard";
import { suggestedBotName, suggestedBotUsername, suggestedCcid } from "@/lib/channel/identity.mjs";
import { activationLink, checkActivation, clearActivation, setDescription } from "@/lib/channel/activation.mjs";
import { allow, channelState, saveToken, start, stop } from "@/lib/channel/telegram.mjs";

// ДВЕРЬ КАНАЛА УПРАВЛЕНИЯ (221-2, 221-3).
//
// 🔒 ЗАМОК ТОТ ЖЕ, ЧТО У ОСТАЛЬНОЙ МАСТЕРСКОЙ (`benchGuard`): человек с сессией архитектора или
// секрет машины для прибора. Имя двери стоит в `proxy.ts` — не названная привратнику дверь отвечает
// ПЕРЕАДРЕСАЦИЕЙ на страницу входа, и снаружи это неотличимо от её ответа (закон 161, оплачен трижды).
//
// 🛑 ТОКЕН ХОДИТ ТОЛЬКО В ОДНУ СТОРОНУ. Сюда — да; обратно наружу не уходит ни в одном ответе, даже
// сокращённым: наружу едет «настроен или нет» и хвост из четырёх знаков для узнавания.
//
// 🔒 ИМЕНИ СЛУЖБЫ ЗДЕСЬ НЕТ: рекомендация имени бота порождается из реестра (`suggestedBotName`).

const noStore = { "Cache-Control": "no-store" };

type Body = {
  action?: "token" | "start" | "stop" | "allow" | "link" | "activate";
  description?: string;
  greeting?: string;
  lang?: string;
  token?: string;
  who?: string;
};

/**
 * Запустить сессию и ответить, когда она ПОДНЯЛАСЬ (221-7), а не когда отдана команда.
 * ✗ Оплачено 2026-09-17: ответ до подъёма `screen` дал экрану «канал спит» при живом канале.
 */
async function startAndWait() {
  const up = start() as { error?: string; ok: boolean };
  if (!up.ok) return NextResponse.json({ error: up.error, ok: false }, { headers: noStore, status: 400 });
  for (let i = 0; i < 40; i++) {
    if (channelState().running) return NextResponse.json({ ok: true, ...channelState() }, { headers: noStore });
    await new Promise((r) => setTimeout(r, 500));
  }
  return NextResponse.json({ error: "start-timeout", ok: false, ...channelState() }, { headers: noStore, status: 504 });
}

export async function GET(request: Request) {
  const gate = await benchGuard(request);
  if (gate.denied) return gate.denied;
  // Рекомендация имени бота считается на каждый показ: код в ней случайный и ни на что не влияет.
  // 🔒 ОБА ИМЕНИ ОТ ОДНОГО КОДА: иначе человек скопировал бы имя с одним хвостом, а ручку с другим —
  // и связь между ними, ради которой хвост и нужен, потерялась бы.
  const ccid = suggestedCcid();
  return NextResponse.json(
    { ok: true, suggestedBotName: suggestedBotName(ccid), suggestedBotUsername: suggestedBotUsername(ccid), ...channelState() },
    { headers: noStore },
  );
}

export async function POST(request: Request) {
  const gate = await benchGuard(request);
  if (gate.denied) return gate.denied;

  const body = (await request.json().catch(() => null)) as Body | null;
  const action = body?.action;

  if (action === "token") {
    const saved = (await saveToken(body?.token ?? "")) as { error?: string; ok: boolean; tail?: string };
    // 🛑 Отказ называет ПРИЧИНУ: «не тот формат» и «пусто» чинятся по-разному, а «не сохранилось»
    // не чинится никак.
    if (!saved.ok) return NextResponse.json({ error: saved.error, ok: false }, { headers: noStore, status: 400 });
    // Описание пустого чата — на языке страницы; отказ Telegram здесь не мешает сохранению токена.
    await setDescription(body?.description ?? "", body?.lang ?? "");
    return NextResponse.json({ ok: true, ...channelState() }, { headers: noStore });
  }

  if (action === "link") {
    // Ручки бота может не быть вовсе: токен ещё не сохранён. Тогда `activationLink` откажет по имени.
    const link = activationLink((channelState() as { botUsername?: string }).botUsername ?? "") as {
      error?: string;
      ok: boolean;
      url?: string;
    };
    if (!link.ok) return NextResponse.json({ error: link.error, ok: false }, { headers: noStore, status: 400 });
    return NextResponse.json({ ok: true, activationUrl: link.url, ...channelState() }, { headers: noStore });
  }

  // 🔒 АКТИВАЦИЯ ЗОВЁТСЯ ЭКРАНОМ ПОВТОРНО, ПОКА ЧЕЛОВЕК НЕ НАЖАЛ START. Нажал — впущен, поприветствован на
  // своём языке, и канал запускается ТОЙ ЖЕ дверью: между «впущен» и «слушает» нет шага, который можно забыть.
  if (action === "activate") {
    const got = (await checkActivation(body?.greeting ?? "")) as { activated?: boolean; error?: string; ok: boolean };
    if (!got.ok) return NextResponse.json({ error: got.error, ok: false, ...channelState() }, { headers: noStore, status: 400 });
    if (!got.activated) return NextResponse.json({ activated: false, ok: true, ...channelState() }, { headers: noStore });
    clearActivation();
    return startAndWait();
  }

  if (action === "start") return startAndWait();

  if (action === "stop") {
    stop();
    return NextResponse.json({ ok: true, ...channelState() }, { headers: noStore });
  }

  if (action === "allow") {
    const done = allow(body?.who ?? "") as { error?: string; ok: boolean };
    if (!done.ok) return NextResponse.json({ error: done.error, ok: false }, { headers: noStore, status: 400 });
    return NextResponse.json({ ok: true, ...channelState() }, { headers: noStore });
  }

  return NextResponse.json({ error: "unknown-action", ok: false }, { headers: noStore, status: 400 });
}
