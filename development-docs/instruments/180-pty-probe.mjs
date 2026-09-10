// Прибор шага 180: сокет терминала памяти достижим, замок держит, ловушки Next нет.
//
// Запуск на сервере из /opt/fractera/memory:
//   node development-docs/instruments/180-pty-probe.mjs [wss://<публичный адрес>/pty]
//
// 🔒 ЧТО ПРОВЕРЯЕТСЯ И ПОЧЕМУ ИМЕННО ТАК.
// ① Сокет достижим — соединение ОТКРЫВАЕТСЯ, а не отказывает на рукопожатии.
// ② Замок держит — чужой билет закрывает сокет кодом 1008 «bad-ticket».
// ③ Ловушки Next нет — у чата она выглядела так: первое соединение после
//    перезапуска живёт, все следующие рвутся через 3 мс кодом 1006. Поэтому
//    соединений ТРИ ПОДРЯД, и каждое обязано закрыться нашим 1008, а не 1006.
// ④ Молчание не держит сокет вечно — без `init` закрытие «no-init» через 10 с.
//
// 🛑 ЖИВОЙ БИЛЕТ ПРИБОР НЕ ПОЛУЧАЕТ И НЕ ОБЯЗАН: его выдаёт дверь только роли
// `architect` по куке человека. Выпустить себе сессию агенту запрещено
// («выдача себе доступа»). Положительный случай — вход владельца через страницу.
//
// 🛑 ПУБЛИЧНЫЙ АДРЕС — АРГУМЕНТОМ, А НЕ СТРОКОЙ В КОДЕ: домен владельца в файле
// репозитория уехал бы каждому новому серверу.
import { WebSocket } from "ws";

const LOOPBACK = "ws://127.0.0.1:3700/pty";
const PUBLIC = process.argv[2] || "";

function attempt(url, payload, waitMs = 15000) {
  return new Promise((resolve) => {
    const started = Date.now();
    let opened = false;
    let done = false;
    const finish = (r) => {
      if (done) return;
      done = true;
      resolve({ ...r, ms: Date.now() - started, opened });
    };
    const ws = new WebSocket(url);
    ws.on("open", () => {
      opened = true;
      if (payload) ws.send(JSON.stringify(payload));
    });
    ws.on("close", (code, reason) => finish({ code, reason: String(reason) }));
    ws.on("error", (e) => finish({ code: "error", reason: e.message }));
    setTimeout(() => {
      try {
        ws.terminate();
      } catch {
        /* уже закрыт */
      }
      finish({ code: "timeout", reason: "" });
    }, waitMs);
  });
}

let pass = 0;
let fail = 0;
function check(name, ok, got) {
  if (ok) {
    pass++;
    console.log(`  ✓ ${name}`);
  } else {
    fail++;
    console.log(`  ✗ ${name} — получено: ${JSON.stringify(got)}`);
  }
}

const bogus = { mode: "claude-check", ticket: "not-a-real-ticket", type: "init" };

for (const [label, url] of [["петля", LOOPBACK], ...(PUBLIC ? [["домен", PUBLIC]] : [])]) {
  console.log(`== ${label}: ${url} ==`);
  for (let i = 1; i <= 3; i++) {
    const r = await attempt(url, bogus);
    check(
      `соединение ${i}: открылось и закрыто нашим замком 1008 «bad-ticket» (не 1006)`,
      r.opened && r.code === 1008 && r.reason === "bad-ticket",
      r
    );
  }
}

console.log("== молчание: без init сокет закрывается сам ==");
const quiet = await attempt(LOOPBACK, null, 14000);
check("закрыт кодом 1008 «no-init» примерно через 10 с", quiet.code === 1008 && quiet.reason === "no-init" && quiet.ms >= 9000, quiet);

console.log(`\n== ИТОГ: ${pass} прошло, ${fail} провалено ==`);
process.exit(fail === 0 ? 0 : 1);
