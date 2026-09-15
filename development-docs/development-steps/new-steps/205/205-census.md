# 205 — перепись элементов реестра признаков: 49 чата + 21 памяти

**Источник:** `fractera-telegrambot-starter/REGISTRY-CONFIG/registry-config.json` (49, все `enabled: off`) и
`fractera-memory-starter/AGI-CONFIG/agi-config.json` (21), прочитаны целиком 2026-09-15. **Статус:** предложение агента на утверждение
владельцу; ни одна запись ещё не менялась.

**Решения:**
- **A — признак реестра памяти.** Смысл, который зовущий может иметь в виду; живёт в `AGI-CONFIG` под ключом памяти.
- **B — механизм памяти вне реестра.** Это не «что человек имеет в виду», а то, как сообщение пришло, куда легло или к чему привязано. У
  памяти для этого есть свой механизм (род входящего, глагол, охват, журнал, хранилища, связь сообщений) — отдельная запись реестра была бы
  вторым местом одного понятия.
- **C — не память.** Остаётся в службе чата (диалог, команды, расписание) или снимается как дубль.
- `*` — механизм или признак ещё не построен; сноска главной названа в скобках.

## 1. Инициатор — кто начал разговор (3)

| Ключ чата | Что это | Решение | Где в памяти |
|---|---|---|---|
| `initiator.telegram-user` | написал человек в Telegram | **B** | происхождение записи: `source = telegram`, автор — в строке журнала входящих и в строке происхождения графа*⁸ |
| `initiator.chat-user` | написал в чат проекта | **B** | `source` = чат*⁸ (такого значения нет — добавить) |
| `initiator.schedule` | разговор начал срок, а не человек | **C** | расписание — служба чата; в память приходит уже результат |

## 2. Род входящего — чем сообщение пришло (9)

| Ключ чата | Решение | Где в памяти |
|---|---|---|
| `material.text` | **B** | фраза `text` у `remember` |
| `material.voice` | **B** | род входящего `audio` (whisper-1 + описание) |
| `material.photo` | **B** | род `image` |
| `material.video` | **B** | род `video` (звук + 6 кадров) |
| `material.document` | **B** | роды `pdf`, `text`, `code` |
| `material.location` | **B** | охват: геометка `lat/lon`, источник «с устройства»*⁹ |
| `material.contact` | **B*** | род входящего «контакт» не принимается — предложение: карточка → человек первого круга (`person.people-he-calls-his-friends`) по подтверждению |
| `material.link` | **B** | `links` / `youtube` у `remember` (шаг 195) |
| `material.calendar-date` | **B** | охват: календарь `at`*⁹ |

## 3. Намерение — зачем пришло (8)

| Ключ чата | Решение | Где в памяти |
|---|---|---|
| `intent.capture` | **B** | глагол «добавить» — определение по смыслу*¹ |
| `intent.question` | **B** | глагол «извлечь»*¹ |
| `intent.schedule` | **C** | напоминания и календарь — служба чата (§3р их не передавал) |
| `intent.confirm` | **C** | согласие в диалоге — служба чата |
| `intent.correct` | **B** | исправление значения: прежнее уходит в историю, ответ говорит «было X, стало Y» |
| `intent.where` | **A** | признаки `person.city-where-he-lives-now` и `person.time-zone-he-lives-in` |
| `intent.meta` | **C** | вопрос о возможностях — служба чата |
| `intent.command` | **C** | команды меню — служба чата |

## 4. Сущность — чем оказалось (6)

| Ключ чата | Решение | Где в памяти |
|---|---|---|
| `entity.memo` | **B** | «запомни дословно» — граф получает фразу целиком с вводной частью |
| `entity.note` | **B** | граф знаний со всем сказанным |
| `entity.task` | **A*** — новый признак на решение | `person.tasks-he-plans-to-do`: список с состоянием (запланирована · сделана) — в памяти нет жизненного цикла |
| `entity.receipt` | **A** | `money.spent-on-a-purchase` (на что, сколько, валюта, когда) |
| `entity.place` | **A*** — новый признак на решение | `person.places-he-marked`: название, место, координаты — объект первого круга |
| `entity.idea` | **A*** — новый признак на решение | `person.ideas-he-had`: список; без решения — граф, как заметка |

## 5. Куда уехало (3)

| Ключ чата | Решение | Где в памяти |
|---|---|---|
| `destination.media` | **B** | объектное хранилище — в ответе `kept_whole` и `objects` |
| `destination.vector` | **B** | векторная карточка объекта |
| `destination.rag` | **B** | документ графа |

## 6. Поля — что извлекли из содержимого (6)

| Ключ чата | Решение | Где в памяти |
|---|---|---|
| `field.relation` | **B*** | связь «сообщение → сообщение» в журнале*³ |
| `field.happened` | **B*** | охват: календарь `at` — когда произошло*⁹ |
| `field.money` | **C** — дубль | флаг «про деньги» не нужен: трата — признак `money.spent-on-a-purchase` со значением |
| `field.geo` | **B*** | охват: геометка*⁹ |
| `field.forwarded` | **B** | автор в строке журнала и в строке происхождения графа (`author`) |
| `field.facets` | **B** | теги объекта и документа графа |

## 7. Факты о человеке — у обоих реестров (14 чата ↔ 14 памяти)

Это и есть измеренная дыра: **смысл один, ключи разные**, и память отвергает ключ чата как `unknown-feature`.

| Ключ чата | Решение | Ключ памяти | Чего нет у записи памяти, но есть у чата |
|---|---|---|---|
| `person.timezone` | **A** | `person.time-zone-he-lives-in` | спросить при отсутствии, порядок вопроса 3, пример `Europe/Prague`, «что теряется» |
| `person.name` | **A** | `person.name-he-is-called` | спросить, порядок 2, пример, что теряется |
| `person.address-form` | **A** | `person.how-he-wants-to-be-addressed` | спросить, порядок 4, пример |
| `person.tone` | **A** | `person.tone-he-asks-us-to-use` | спросить, пример |
| `person.reply-length` | **A** | `person.reply-length-he-prefers` | спросить, пример |
| `person.language` | **A** | `person.language-he-speaks-with-us` | спросить, порядок 1, пример |
| `person.city` | **A** | `person.city-where-he-lives-now` | спросить, порядок 5, пример |
| `person.occupation` | **A** | `person.job-title-he-has` | спросить, пример |
| `person.active-hours` | **A** | `person.work-hours-he-keeps-each-day` | спросить, пример |
| `person.currency` | **A** | `person.currency-he-counts-money-in` | спросить, пример |
| `person.avoid` | **A** | `person.things-he-asked-us-never-to-do` | спросить, пример |
| `person.projects` | **A** | `person.projects-he-is-working-on` | спросить, пример |
| `person.important-people` | **A** | `person.people-he-calls-his-friends` | спросить, пример; тип у чата `text`, у памяти `object` |
| `person.nationality` | **A** | `person.nationality-he-names-for-himself` | спросить, пример |

## 8. Только у памяти (7)

| Ключ памяти | Решение | Заметка |
|---|---|---|
| `person.date-of-his-birthday` | **A** | — |
| `person.age-he-is-now` | **C** — долг | закон §21.2: хранится год рождения; снять после переноса значений в дату |
| `person.drinks-he-says-he-likes` | **A** | — |
| `person.color-he-calls-his-favorite` | **A** | — |
| `person.pets-that-live-with-him` | **A** | объект первого круга |
| `person.meetings-he-had-with-people` | **A** | объект первого круга |
| `money.spent-on-a-purchase` | **A** | накопление с охватом*¹⁰ |

## Итог счёта

| Решение | Элементов чата (49) | Только у памяти (7) | Из них |
|---|---:|---:|---|
| **A** признак реестра памяти | 19 | 6 | 14 фактов о человеке ключ в ключ · `intent.where` → город и пояс · `entity.receipt` → траты · 3 новых на решение (задачи, места, идеи) · у памяти: день рождения, напитки, цвет, животные, встречи, траты |
| **B** механизм памяти вне реестра | 24 | — | инициатор 2 · род входящего 9 · намерение 3 · сущность 2 · куда уехало 3 · поля 5 |
| **C** не память / дубль / долг | 6 | 1 | расписание · 4 намерения диалога · `field.money` · у памяти `person.age-he-is-now` |

**Реестр памяти после решений: 23 признака** — 20 существующих (21 без возраста) и 3 новых на решение.

## Что перепись показала сверх ключей

1. **Запись реестра памяти не отвечает на «пришло название — что делаю».** Нет полей: что делать при отсутствии значения (промолчать ·
   спросить · склеить), порядок вопроса, пример, «что теряется», зависимость от охвата, навык-обработчик, **потребители** (предложение
   владельца об административной панели).
2. **Реестр чата описывает ещё и механизмы** (род входа, намерение, куда уехало) — у памяти они не признаки, и перенос их в `AGI-CONFIG`
   завёл бы вторые места одних понятий.
3. **Ключей памяти чат не знает** — §3р требует брать их из `GET /v1/features`, код чата не переключён.

## 9. Дополнение после 205-1: 27 родов живой памяти вне реестра (найдено прибором 2026-09-15)

Корневая таблица памяти на сервере несёт **46 родов**, реестр покрывает **19**; 27 заведены моделью при записи. **Сколько в них значений,
не измерено:** дверь `/v1/tables/{имя}` отдаёт описание родов, а не счёт значений — счёт делает 205-10.

**Решения — по правилам владельца 205-4 (паспорт §23):** хранилище растёт само, и так должно быть; **реестр догоняет хранилище** —
признак заводит агент разработки шагом; дубль **помечается снятым с заменой**; значения не переносятся и не удаляются.
🪦 Первая редакция этого раздела предлагала сливать роды и переносить 12 в граф — отменена ответом владельца на правило 1.

### 9.1 Действующий признак — 21 род

Ключ выводится из рода, чтобы признак и живой род совпали без переноса значений.

| Род в памяти | Ключ признака |
|---|---|
| `reason_he_gives_for_his_language_choice` | `person.reason-he-gives-for-his-language-choice` |
| `reason_he_gives_for_telling_us_about_his_dog` | `person.reason-he-gives-for-telling-us-about-his-dog` |
| `food_allergies_he_says_he_has` | `person.food-allergies-he-says-he-has` |
| `foods_that_are_safe_for_him` | `person.foods-that-are-safe-for-him` |
| `precautions_he_takes_with_his_food` | `person.precautions-he-takes-with-his-food` |
| `rules_he_asks_us_to_follow_in_food_advice` | `person.rules-he-asks-us-to-follow-in-food-advice` |
| `rules_he_keeps_about_working_on_weekends` | `person.rules-he-keeps-about-working-on-weekends` |
| `rules_he_asks_us_to_follow_when_writing_him` | `person.rules-he-asks-us-to-follow-when-writing-him` |
| `what_the_product_he_builds_does` | `person.what-the-product-he-builds-does` |
| `side_work_he_does_besides_the_platform` | `person.side-work-he-does-besides-the-platform` |
| `how_he_divides_his_time_between_his_projects` | `person.how-he-divides-his-time-between-his-projects` |
| `topics_he_says_will_come_up_with_us_often` | `person.topics-he-says-will-come-up-with-us-often` |
| `file_formats_he_asks_us_to_use` | `person.file-formats-he-asks-us-to-use` |
| `reason_he_gives_for_keeping_this_plan` | `person.reason-he-gives-for-keeping-this-plan` |
| `trips_he_is_planning_to_take` | `person.trips-he-is-planning-to-take` |
| `cars_that_belong_to_him` | `person.cars-that-belong-to-him` |
| `packing_list_items_he_takes_on_a_trip` | `person.packing-list-items-he-takes-on-a-trip` |
| `format_he_keeps_his_packing_list_in` | `person.format-he-keeps-his-packing-list-in` |
| `reason_he_gives_for_keeping_his_packing_list_in_markdown` | `person.reason-he-gives-for-keeping-his-packing-list-in-markdown` |
| `rules_he_keeps_about_what_he_packs_for_trips` | `person.rules-he-keeps-about-what-he-packs-for-trips` |
| `when_he_reviews_his_packing_list_before_departure` | `person.when-he-reviews-his-packing-list-before-departure` |

### 9.2 Признак, снятый с заменой — 6 родов

| Род в памяти | Ключ снятого признака | Замена | Почему |
|---|---|---|---|
| `money_he_spent_on_purchases_by_item` | `person.money-he-spent-on-purchases-by-item` | `money.spent-on-a-purchase` | дубль смысла |
| `currency_he_counts_his_money_in` | `person.currency-he-counts-his-money-in` | `person.currency-he-counts-money-in` | дубль смысла (одно слово разницы) |
| `time_after_which_he_stops_answering_work_messages` | `person.time-after-which-he-stops-answering-work-messages` | `person.work-hours-he-keeps-each-day` | тот же смысл «когда можно писать» |
| `plans_he_wrote_down_for_the_month` | `person.plans-he-wrote-down-for-the-month` | `person.tasks-he-plans-to-do` | задачи с горизонтом — признак 205-2 |
| `how_long_he_has_known_his_friend_denis` | `person.how-long-he-has-known-his-friend-denis` | граф с якорем «Денис» | глубина 2: атрибут друга (§21.2) |
| `rules_he_keeps_about_feeding_his_dog` | `person.rules-he-keeps-about-feeding-his-dog` | граф с якорем на животное | глубина 2: атрибут собаки (§21.2) |

**Итог:** реестр — **51 запись: 44 действующих, 7 снятых** (было 24: 23 и 1). Разнородность новых записей — сверка нового рода с кандидатами
(паспорт §23.2, сноска *⁴) — в этот шаг не входит.
