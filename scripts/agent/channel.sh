#!/bin/bash
# КАНАЛ УПРАВЛЕНИЯ: TELEGRAM → CLAUDE CODE В ПАПКЕ ЭТОЙ СЛУЖБЫ (221-3).
#
# 🎯 ЗАДАЧА ВЛАДЕЛЬЦА 2026-09-17: «каждый микросервис получает по умолчанию собственные инструменты
# разработки и плюс чат для удобства управления… я смогу продолжить всю разработку через Telegram».
#
# 🔒 ИМЕНИ СЛУЖБЫ В ЭТОМ ФАЙЛЕ НЕТ. Имя сессии и папка состояния приходят из реестра через
# `lib/channel/identity.mjs`. Скопируйте файл в другую службу — он заработает там без правок; это и
# есть проверка прототипа, о которой просил владелец.
#
# 🔒 ЗАПУСКАЕТСЯ ИМЕННО СТРОИТЕЛЬ, А НЕ АГЕНТ ПАМЯТИ: те же `--settings` и та же первая команда, что у
# кнопки мастерской (`server.mjs` → `MODES.build`). Иначе в Telegram отвечал бы агент с ДРУГОЙ
# личностью и другими правами — и человек не понял бы, почему он ведёт себя иначе, чем в терминале.
#
# 🔒 СВОЯ ПАПКА СОСТОЯНИЯ ЧЕРЕЗ `TELEGRAM_STATE_DIR` — условие сосуществования двух ботов на машине.
# Первоисточник плагина: «To run multiple bots on one machine (different tokens, separate allowlists),
# point TELEGRAM_STATE_DIR at a different directory per instance».
#
# 🛑 `--permission-mode auto` ОБЯЗАТЕЛЕН, И ЦЕНА НАЗВАНА. Запрос разрешения уходит тем же каналом,
# который в этот момент заблокирован ожиданием, — сессия встаёт намертво. ✗ Оплачено двумя часами
# молчания живого бота 2026-09-05. Режим убирает вопросы, а не запреты: границы держат
# `.claude/settings.build.json` и инструкция строителя.
#
# 🛑 ОДИН ОПРАШИВАТЕЛЬ НА БОТА: прежняя сессия снимается перед стартом. Telegram отдаёт каждое
# обновление ровно одному читателю; второй поделит переписку пополам и не скажет об этом.
#
# 🔒 ПРОЧИТАТЬ ЭКРАН ПРИБОРОМ:
#      screen -S "<сессия>" -X hardcopy /tmp/scr.txt && tr -d '\0' < /tmp/scr.txt
set -u
export PATH=/usr/local/bin:/usr/bin:/bin
export HOME=/root

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

# Имя сессии и папка состояния — из реестра службы, не из этой строки.
SESSION="$(node -e 'import("./lib/channel/identity.mjs").then(m=>console.log(m.channelSessionName()))')"
STATE="$(node -e 'import("./lib/channel/identity.mjs").then(m=>console.log(m.channelStateDir()))')"

if [ -z "${SESSION:-}" ] || [ -z "${STATE:-}" ]; then
  echo "канал: служба не смогла назвать себя — реестр SERVICES.json не прочитан" >&2
  exit 1
fi
if [ ! -f "$STATE/.env" ]; then
  echo "канал: токена нет ($STATE/.env) — сначала сохраните токен бота на странице мастерской" >&2
  exit 1
fi

export TELEGRAM_STATE_DIR="$STATE"

# 🛑 Снимаем прежнюю сессию ДО старта, а не после: иначе на мгновение живут два опрашивателя.
screen -S "$SESSION" -X quit >/dev/null 2>&1 || true

# 🔒 ИМЯ НАВЫКА РАЗРАБОТКИ ТОЖЕ НАХОДИТСЯ, А НЕ ПИШЕТСЯ. ✗ Оплачено прибором переносимости: здесь
# стояло `memory-development` — единственное место, где имя службы просочилось в код канала.
SKILL="$(node -e 'import("./lib/channel/identity.mjs").then(m=>console.log(m.developmentSkill()))')"
SKILL_LINE=""
[ -n "${SKILL:-}" ] && SKILL_LINE="Your development skill is $SKILL. "

BUILDER_START="This is a development session of this service, reached from Telegram. ${SKILL_LINE}Answer the person in their language, briefly."

# 🔒 ЧТЕНИЕ ИНСТРУКЦИИ ПРОИСХОДИТ ПРИ ЗАПУСКЕ КАНАЛА, А НЕ НА ПЕРВОМ ВОПРОСЕ ЧЕЛОВЕКА (221-9).
# ✗ Оплачено замером 2026-09-17: вопрос владельца пришёл в 20:07:08, ответ ушёл в 20:08:14 — 66 секунд,
# и почти всё это время сессия ПЕРВЫЙ РАЗ открывала навык, `current-steps.md` и приёмную заявок. Приказ
# «сначала открой навык» срабатывал на первом обращении — то есть его цену платил человек, ждавший ответа.
# 🛑 ПАУЗА ПЕРЕД НАБОРОМ ОБЯЗАТЕЛЬНА: полноэкранный интерфейс не принимает ввод, пока не отрисовался, и
# строка ушла бы в никуда. Проверяется не временем, а фактом — ждём появления сессии, потом ещё 5 с.
WARMUP="Разогрев перед работой: открой навык ${SKILL:-разработки}, прочитай development-docs/development-steps/current-steps.md и заявки в development-docs/development-steps/pre-steps. Ответь ровно одним словом: готов."
(
  for _ in $(seq 1 30); do
    screen -ls | grep -q "\.$SESSION[[:space:]]" && break
    sleep 1
  done
  sleep 5
  screen -S "$SESSION" -p 0 -X stuff "$WARMUP
"
) >/dev/null 2>&1 &

exec screen -DmS "$SESSION" claude \
  --channels plugin:telegram@claude-plugins-official \
  --add-dir "$STATE" \
  --permission-mode auto \
  --settings .claude/settings.build.json \
  --append-system-prompt "$BUILDER_START"
