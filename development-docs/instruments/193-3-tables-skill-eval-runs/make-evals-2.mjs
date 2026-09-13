// Вторая итерация 193-3: случаи, о которых описания рук молчат, а навык говорит.
// Первая итерация дала 100% в обеих конфигурациях по признакам, и причина была в
// случаях: описания рук уже называют проверяемое. Признаки названы ДО прогона.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
const W = "development-docs/instruments/193-3-tables-skill-eval-runs"
export const COMMON = "Каждая запись несёт род утверждения said или guess — иначе хранилище кладёт «не названо»"
const evals = [
  { id: 5, name: "eval-5-added-to-existing-list-says-added",
    prompt: "У человека уже есть список языков, на которых он с нами говорит: в нём «русский». Пришла фраза: «я ещё свободно говорю по-португальски».",
    expected: "promote_to_list в существующий список; в ответе «добавлено», а не «создан список»",
    assertions: [
      "Вызван promote_to_list по роду language_he_speaks_with_us, и make_new_kind не вызван",
      "Рука ответила «Добавлено в список» — сработала ветка существующего списка",
      "В ответе агента нет ложного утверждения, что список или таблица созданы",
      COMMON,
    ] },
  { id: 6, name: "eval-6-ambiguous-second-value-keeps-both",
    prompt: "У человека записано, что с ним живёт кот Барсик. Пришла фраза: «у нас живёт собака Рекс».",
    expected: "неоднозначно: сохранить оба (promote_to_list) и сказать, что понято как добавление",
    assertions: [
      "write_value по роду pets_that_live_with_him НЕ вызван — кот не спрятан в историю",
      "Вызван promote_to_list по роду pets_that_live_with_him",
      "В ответе названо прочтение: понято как добавление, и сказано, что это можно поправить",
      COMMON,
    ] },
  { id: 7, name: "eval-7-guess-carries-basis",
    prompt: "Фраза человека: «прости, что опять пишу в четыре утра — днём никак, на смене до восьми».",
    expected: "сказанное — said; выведенное (ночной режим, сменная работа) — guess с основанием или не записано с объяснением",
    assertions: [
      "Записано хотя бы одно значение",
      "У каждой догадки есть основание, и хранилище ни разу не отказало за догадку без основания",
      "Ни один вызов не отвергнут хранилищем",
      COMMON,
    ] },
  { id: 8, name: "eval-8-name-in-another-alphabet",
    prompt: "Фраза человека: «запомни, какие книги я сейчас читаю — „Мастер и Маргарита“». Род назови по-русски, как это говорит человек.",
    expected: "имя рода — английская фраза вопреки просьбе, в ответе объяснено почему; без отказа хранилища",
    assertions: [
      "Ни один вызов записи не несёт имя рода не латиницей",
      "Ни один вызов не отвергнут хранилищем",
      "Значение записано под именем-фразой из четырёх английских слов и больше",
      COMMON,
    ] },
]
const all = JSON.parse(readFileSync(`${W}/evals.json`, "utf8"))
all.evals = all.evals.filter((e) => e.id < 5).concat(evals.map((e) => ({ id: e.id, prompt: e.prompt, expected_output: e.expected, files: [], expectations: e.assertions })))
writeFileSync(`${W}/evals.json`, JSON.stringify(all, null, 2))
for (const e of evals) {
  for (const c of ["with_skill", "without_skill"]) mkdirSync(`${W}/iteration-2/${e.name}/${c}/run-1/outputs`, { recursive: true })
  writeFileSync(`${W}/iteration-2/${e.name}/eval_metadata.json`, JSON.stringify({ eval_id: e.id, eval_name: e.name, prompt: e.prompt, assertions: e.assertions }, null, 2))
}
console.log("готово")
