import { mkdirSync, writeFileSync } from "node:fs"
const W = "development-docs/instruments/193-3-tables-skill-eval-runs"
const evals = [
  { id: 1, name: "eval-1-name-is-a-phrase",
    prompt: "Фраза человека: «в мою команду вышли трое — Юля продакт-менеджер, Дима менеджер, Аня дизайнер».",
    expected: "заводит место под сущности со свойствами, имя — фраза, а не ярлык вроде team_members",
    assertions: [
      "Имя заведённого рода — фраза не меньше чем из четырёх слов (в журнале вызовов аргумент kind)",
      "Имя не является ярлыком: не team, не team_members, не teammates, не colleagues",
      "Ни один вызов не отвергнут хранилищем (в ответе руки нет слова «не годится» или «ярлык»)",
      "Перед записью агент звал what_i_already_know",
    ] },
  { id: 2, name: "eval-2-second-value-becomes-list",
    prompt: "У человека уже записано, что с ним живёт кот Барсик. Пришла фраза: «а ещё у нас теперь собака Рекс».",
    expected: "promote_to_list по роду pets_that_live_with_him: рождается список, прежнее значение переезжает",
    assertions: [
      "Вызван promote_to_list (а не write_value, который затёр бы кота)",
      "Род назван буква в букву существующим: pets_that_live_with_him",
      "В ответе агента сказано, что теперь это список и прежнее значение сохранено",
    ] },
  { id: 3, name: "eval-3-correction-not-addition",
    prompt: "У человека записан город, где он сейчас живёт: Мадрид. Пришла фраза: «я не в Мадриде живу, я в Барселоне».",
    expected: "write_value — исправление; prompt_to_list оставил бы два города как две правды",
    assertions: [
      "Вызван write_value по роду city_where_he_lives_now",
      "promote_to_list НЕ вызван — иначе два города встали бы рядом как две правды",
      "В ответе сказано, что прежнее значение ушло в историю (а не потеряно)",
    ] },
  { id: 4, name: "eval-4-existing-kind-letter-for-letter",
    prompt: "У человека записан часовой пояс Europe/Madrid. Пришла фраза: «я переехал, теперь у меня Лиссабон, часовой пояс Europe/Lisbon».",
    expected: "берёт существующий род time_zone_he_lives_in буква в букву, не заводит второе место под то же понятие",
    assertions: [
      "Вызван write_value по роду time_zone_he_lives_in — существующее имя взято буква в букву",
      "make_new_kind под часовой пояс НЕ вызван (второго места под одно понятие не заведено)",
      "Город Лиссабон тоже не потерян: он либо записан в city_where_he_lives_now, либо назван в ответе как не записанный и почему",
    ] },
]
writeFileSync(`${W}/evals.json`, JSON.stringify({ skill_name: "use-tables", evals: evals.map(e => ({ id: e.id, prompt: e.prompt, expected_output: e.expected, files: [], expectations: e.assertions })) }, null, 2))
for (const e of evals) for (const c of ["with_skill", "without_skill"]) {
  mkdirSync(`${W}/iteration-1/${e.name}/${c}/run-1/outputs`, { recursive: true })
  writeFileSync(`${W}/iteration-1/${e.name}/eval_metadata.json`, JSON.stringify({ eval_id: e.id, eval_name: e.name, prompt: e.prompt, assertions: e.assertions }, null, 2))
}
console.log("готово")
