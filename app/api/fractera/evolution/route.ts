import { NextResponse } from "next/server";
import { benchGuard } from "@/lib/bench-guard";
import { addTask } from "@/lib/build-tasks.mjs";
import { MESSAGES } from "@/lib/messages.mjs";
import { caseFilesForSignal, originOfSignal, taskTextFromSignal, whereOfSignals } from "@/lib/signal-task.mjs";
import { signals } from "@/lib/signals.mjs";
import { sql } from "@/lib/store.mjs";

// РЕШЕНИЕ ЧЕЛОВЕКА ПО СИГНАЛУ: УТВЕРДИТЬ ИЛИ ОТКЛОНИТЬ (218-21).
//
// 🎯 СЛОВО ВЛАДЕЛЬЦА 2026-09-17: «здесь вы можете ознакомиться с этим пожеланием либо утвердить его
// либо отклонить. Утверждённые пожелания будут поставлены в очередь разработки»; и о прежнем экране:
// «если я перегружаю, то всё возвращается в исходное состояние. А это значит ничего не работает».
//
// 🔒 ТЕКСТ ЗАЯВКИ СОБИРАЕТ СЕРВЕР, А НЕ ОСТРОВОК. Экран присылает только НОМЕРА строк; всё остальное
// служба берёт у себя. Иначе кто угодно, дотянувшись до двери, положил бы в приёмную строителя любой
// текст под видом слов людей — а приёмная читается агентом.
// 🔒 ОТМЕЧАЕТСЯ ВСЯ ГРУППА, ВКЛЮЧАЯ ДОСЛОВНЫЕ ПОВТОРЫ: иначе повтор останется на экране один и будет
// выглядеть новым сигналом, которого никто не решал.
// 🛑 СЛОВА ЧЕЛОВЕКА НЕ УДАЛЯЮТСЯ И НЕ ПРАВЯТСЯ — меняется только отметка решения.

const noStore = { "Cache-Control": "no-store" };

// 🔒 РЕШЕНИЕ ПРИНИМАЕТСЯ НА ДВУХ УРОВНЯХ, И ЭТО ТРЕБОВАНИЕ ВЛАДЕЛЬЦА 2026-09-17: «каждый отдельный
// таск нужно также удалять по отдельности… оставляем то что сделано, добавляем удаление по одному».
//   · `approve` / `decline` — по ВСЕМУ сигналу: он и есть единица работы для строителя;
//   · `drop` — одно пожелание внутри него, не трогая остальные.
// ✗ Прежде существовал только групповой уровень: человеку, которому мешало одно из двух оснований,
// приходилось отклонять оба — то есть терять наблюдение, которое он терять не хотел.
type Body = { action?: "approve" | "decline" | "drop"; ids?: number[]; lang?: string };

const ACTIONS = ["approve", "decline", "drop"] as const;

export async function POST(request: Request) {
  const gate = await benchGuard(request);
  if (gate.denied) return gate.denied;

  const body = (await request.json().catch(() => null)) as Body | null;
  const action = ACTIONS.find((a) => a === body?.action) ?? null;
  const asked = Array.isArray(body?.ids) ? body.ids.map(Number).filter(Number.isInteger) : [];
  const lang = body?.lang === "en" ? "en" : "ru";
  if (!action || asked.length === 0) {
    return NextResponse.json({ error: "need-action-and-ids", ok: false }, { headers: noStore, status: 400 });
  }

  // ── ОДНО ПОЖЕЛАНИЕ, А НЕ ГРУППА ───────────────────────────────────────────────────────────────
  // 🔒 ЗДЕСЬ НЕ НУЖЕН ПОИСК ГРУППЫ: человек указал конкретную строку, и трогается ровно она.
  // 🛑 ПРОВЕРЯЕМ, ЧТО ЭТО ДЕЙСТВИТЕЛЬНО НЕРЕШЁННЫЙ КОММЕНТАРИЙ: иначе дверью можно было бы пометить
  // любую строку памяти — например чужой факт о человеке — и он исчез бы из ответов молча.
  if (action === "drop") {
    const one = asked[0];
    const found = await sql(
      `SELECT id FROM ${MESSAGES} WHERE id = ? AND direction = 'feedback' AND (feedback_done IS NULL OR feedback_done = '')`,
      [one],
    );
    if (!found.ok) return NextResponse.json({ error: found.error ?? "read-failed", ok: false }, { headers: noStore, status: 502 });
    if ((found.rows ?? []).length === 0) {
      return NextResponse.json({ error: "no-such-comment", ok: false }, { headers: noStore, status: 404 });
    }
    const dropped = await sql(`UPDATE ${MESSAGES} SET feedback_done = 'declined' WHERE id = ?`, [one]);
    if (!dropped.ok) return NextResponse.json({ error: dropped.error ?? "mark-failed", ok: false }, { headers: noStore, status: 502 });
    const rest = await signals({ lang });
    return NextResponse.json({ action, after: rest, marked: 1, ok: true }, { headers: noStore });
  }

  // 🔒 ГРУППА БЕРЁТСЯ ИЗ ЖИВОГО СЧЁТА, А НЕ ИЗ ПРИСЛАННОГО: между показом экрана и нажатием могли
  // прийти новые комментарии, и группа могла стать больше. Решение человека относится к ней целиком.
  const out = await signals({ lang });
  if (!out.ok) return NextResponse.json(out, { headers: noStore, status: 502 });
  const all = [...((out as { signals?: unknown[] }).signals ?? []), ...((out as { single?: unknown[] }).single ?? [])] as Array<{
    grounds: Array<{ about: string; id: number; text: string }>;
    repeats: Array<{ id: number }>;
    themes: string[];
    times: number;
  }>;
  const group = all.find((g) => g.grounds.some((x) => asked.includes(x.id)));
  if (!group) return NextResponse.json({ error: "no-such-signal", ok: false }, { headers: noStore, status: 404 });

  const ids = [...group.grounds.map((g) => g.id), ...group.repeats.map((r) => r.id)];

  let mark = "declined";
  let task: { id?: string } = {};
  if (action === "approve") {
    const made = addTask({
      // 🔒 219-5: РАЗГОВОРЫ ЕДУТ ПРИЛОЖЕНИЕМ, А НЕ ВНУТРЬ ПОЛЯ «ЧТО ПРОСЯТ». Поле сворачивается в одну
      // строку — так защищена форма заявки; досье из восьми ходов в одной строке нечитаемо.
      appendix: await caseFilesForSignal(group, lang),
      by: gate.who.by === "session" ? gate.who.email : "секрет машины",
      origin: originOfSignal(group, lang),
      text: taskTextFromSignal(group, lang),
      where: whereOfSignals(lang),
    }) as { error?: string; id?: string; ok: boolean };
    if (!made.ok) return NextResponse.json({ error: made.error ?? "task-failed", ok: false }, { headers: noStore, status: 400 });
    task = { id: made.id };
    mark = `task:${made.id}`;
  }

  const wrote = await sql(`UPDATE ${MESSAGES} SET feedback_done = ? WHERE id IN (${ids.join(", ")})`, [mark]);
  if (!wrote.ok) return NextResponse.json({ error: wrote.error ?? "mark-failed", ok: false }, { headers: noStore, status: 502 });

  // Экран не угадывает, что стало: он получает пересчитанные списки той же дверью.
  const after = await signals({ lang });
  return NextResponse.json({ action, after, marked: ids.length, ok: true, task }, { headers: noStore });
}
