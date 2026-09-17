import { NextResponse } from "next/server"
import { benchGuard } from "@/lib/bench-guard"
import { addTask, listTasks, withdrawTask } from "@/lib/build-tasks.mjs"

// ДВЕРЬ ЗАДАНИЙ МАСТЕРСКОЙ: СПИСОК, НОВОЕ, ОТОЗВАТЬ (шаг 202-3).
//
// 🔒 ПИСАТЕЛЬ ЗАЯВКИ — `lib/build-tasks.mjs`, И ТОЛЬКО ОН: формат приёмной и защита текста живут в одном
// месте. Дверь лишь пропускает, называет, кто пришёл, и возвращает список заново — экран не угадывает,
// что стало после правки.

const noStore = { "Cache-Control": "no-store" }

export async function GET(request: Request) {
  const gate = await benchGuard(request)
  if (gate.denied) return gate.denied
  return NextResponse.json({ ok: true, tasks: listTasks() }, { headers: noStore })
}

export async function POST(request: Request) {
  const gate = await benchGuard(request)
  if (gate.denied) return gate.denied
  const body = (await request.json().catch(() => null)) as { origin?: string; text?: string; where?: string } | null
  const made = addTask({
    by: gate.who.by === "session" ? gate.who.email : "секрет машины",
    // 🔒 218-20: ЧТО ПРИВЕЛО К ЗАЯВКЕ, НАЗЫВАЕТ ЗОВУЩИЙ. Форма заданий молчит и получает прежнее
    // умолчание; экран сигналов говорит «сигнал от людей взят в работу» — иначе строитель прочтёт
    // слова людей как пожелание владельца и не пойдёт читать основания.
    origin: body?.origin ? String(body.origin) : undefined,
    text: String(body?.text ?? ""),
    where: String(body?.where ?? ""),
  })
  return NextResponse.json({ ...made, tasks: listTasks() }, { headers: noStore, status: made.ok ? 200 : 400 })
}

export async function DELETE(request: Request) {
  const gate = await benchGuard(request)
  if (gate.denied) return gate.denied
  const body = (await request.json().catch(() => null)) as { id?: string } | null
  const done = withdrawTask(String(body?.id ?? ""))
  return NextResponse.json({ ...done, tasks: listTasks() }, { headers: noStore, status: done.ok ? 200 : 400 })
}
