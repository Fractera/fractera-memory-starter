// ВКЛАДКА «API» — ДОКУМЕНТАЦИЯ ДЛЯ ВНЕШНИХ ИНСТРУМЕНТОВ (185).
//
// 🔒 ЯЗЫК ДОКУМЕНТАЦИИ — АНГЛИЙСКИЙ ПРИ ЛЮБОЙ ВЕРСИИ СТРАНИЦЫ. Решение владельца
// 2026-09-11, дословно: «так как информация идёт для профессионалов скорее всего
// просто для искусственного интеллекта формата описания используем английский
// язык для любой версии». Исключение ровно одно и тоже названо им: раздел про
// Postman — на обоих языках.
//
// 🔒 ГЛАВНОЕ УСТРОЙСТВО ФАЙЛА: СПИСОК МЕТОДОВ И ПАРАМЕТРОВ ПОРОЖДАЕТСЯ ИЗ
// `contract.mjs`, А НЕ ПЕРЕПИСАН СЮДА РУКАМИ. Документация, набранная руками,
// расходится с кодом молча — в этом проекте это оплачено пять раз за две
// недели. Здесь добавится параметр в договор — и он появится на странице сам,
// вместе со своим описанием.
//
// 🔒 ЧТО ЗДЕСЬ НЕ ПОРОЖДАЕТСЯ И ПОЧЕМУ: заголовки разделов, объяснение нити и
// кэша, пределы и Postman. Это знание О ТОМ, КАК ПОЛЬЗОВАТЬСЯ, его в договоре
// нет и быть не должно — договор говорит, ЧТО есть, а не что с этим делать.

import { CATALOGUE, CONTRACT_VERSION, METHODS, SERVICE } from "@/contract.mjs";
import { WORDS } from "@/lib/words.mjs";
import { ApiKeyCard, type ApiKeyWords } from "./api-key.client";

type Method = {
  about: string;
  name: string;
  onMiss: string;
  params: Array<{ about: string; name: string; required: boolean; type: string }>;
  returns: string;
};

function H({ children, id }: { children: React.ReactNode; id: string }) {
  return (
    <h2 className="scroll-mt-24 text-[length:var(--fs-h3)] font-semibold" id={id}>
      {children}
    </h2>
  );
}

function Code({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto whitespace-pre rounded-md bg-muted px-3 py-2 font-mono text-[length:var(--fs-small)]">
      {children}
    </pre>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="max-w-3xl text-[length:var(--fs-small)] leading-relaxed">{children}</p>;
}

/** Коды отказов — из словаря службы, а не из списка в тексте. */
function refusalRows(): Array<[string, string]> {
  const en = WORDS.en as Record<string, string>;
  return Object.keys(en)
    .filter((k) => k.startsWith("think-") || ["need-who", "need-who-and-text", "store-unreachable", "columns-unreadable", "bad-json", "missing-params", "no-access", "not-built", "unsafe-name", "inside-memory"].includes(k))
    .sort()
    .map((k) => [k, en[k]]);
}

export function ApiDoc({ base, keyWords, lang }: { base: string; keyWords: ApiKeyWords; lang: string }) {
  const methods = METHODS as Method[];

  return (
    <div className="space-y-8">
      {/* ── ЧТО ЭТО ТАКОЕ ─────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <H id="overview">Memory API — what this service is</H>
        <P>
          <strong>Fractera Memory is a black box.</strong> You speak to it in ordinary human
          sentences and you ask it questions in ordinary human sentences. Where a fact is stored,
          whether a new column or a new table is created, whether a language model is called at all —
          memory decides on its own and does not expose any of that. There is no schema to design and
          no table to declare before you start.
        </P>
        <P>
          This page is written for machines and for the people who wire them: an agent, a bot, a
          backend job, a spreadsheet script. Everything below is the complete public surface —
          service <code>{SERVICE}</code>, contract version <code>{CONTRACT_VERSION}</code>. The
          method list on this page is generated from that contract, so it cannot drift away from what
          the server actually accepts.
        </P>
        <div className="rounded-md border border-muted-foreground/30 p-3">
          <P>
            <strong>Two verbs, and that is the whole idea.</strong> <code>remember</code> changes
            what memory knows; <code>recall</code> never changes anything. Everything else —
            the catalogue, the journal — exists to explain what memory did, not to let you reach
            inside it.
          </P>
        </div>
      </section>

      {/* ── АДРЕС ─────────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <H id="base-url">Base URL</H>
        <Code>{`${base}/v1`}</Code>
        <P>
          All calls are <code>POST</code> with a JSON body, except the two read-only endpoints listed
          under <em>Catalogue</em> and the two service endpoints under <em>Health and contract</em>.
          Send <code>Content-Type: application/json</code>. Responses are always JSON, always
          <code> no-store</code>.
        </P>
        <P>
          <strong>Read the body, not the status code.</strong> Memory answers <code>200</code> with
          <code> ok:false</code> for refusals it understands — a missing thread, a malformed date, an
          exhausted subscription window. A non-200 status means the call never reached the verb at
          all. Clients that branch on the status code alone will report success for a refusal.
        </P>
      </section>

      {/* ── КЛЮЧ ──────────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <H id="auth">Authentication</H>
        <P>
          Every <code>/v1/*</code> call except <code>/v1/health</code> requires the memory access
          key. One key covers <strong>both reading and writing</strong> — there are no separate
          scopes, and pretending otherwise would be a lie about what the server checks.
        </P>
        <Code>{`x-memory-key: fmk_…

# or, if your client prefers the standard header:
Authorization: Bearer fmk_…`}</Code>
        <P>
          The key is compared in constant time, so a wrong key tells an attacker nothing about how
          wrong it was. Requests without a valid key get <code>401</code> with{" "}
          <code>error: &quot;no-access&quot;</code>.
        </P>
        <ApiKeyCard words={keyWords} />
      </section>

      {/* ── МЕТОДЫ, ПОРОЖДЁННЫЕ ИЗ ДОГОВОРА ───────────────────────────────── */}
      <section className="space-y-4">
        <H id="methods">Methods</H>
        <P>
          Generated from the live contract — the same object the service returns from{" "}
          <code>GET /v1/contract</code>. If a parameter appears here, the server accepts it today.
        </P>

        {methods.map((m) => (
          <div className="space-y-2 rounded-md border border-muted-foreground/30 p-3" key={m.name}>
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="font-mono text-[length:var(--fs-small)] font-semibold">
                POST /v1/{m.name}
              </span>
            </div>
            <P>{m.about}</P>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-[length:var(--fs-small)]">
                <thead className="text-muted-foreground">
                  <tr>
                    <th className="py-1 pr-3 font-medium">parameter</th>
                    <th className="py-1 pr-3 font-medium">type</th>
                    <th className="py-1 pr-3 font-medium">required</th>
                    <th className="py-1 font-medium">meaning</th>
                  </tr>
                </thead>
                <tbody>
                  {m.params.map((p) => (
                    <tr className="border-t border-muted-foreground/15 align-top" key={p.name}>
                      <td className="py-1 pr-3 font-mono">{p.name}</td>
                      <td className="py-1 pr-3 font-mono text-muted-foreground">{p.type}</td>
                      <td className="py-1 pr-3">{p.required ? "yes" : "no"}</td>
                      <td className="py-1">{p.about}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <P>
              <strong>Returns.</strong> {m.returns}
            </P>
            <P>
              <strong>When nothing is found.</strong> {m.onMiss}
            </P>
          </div>
        ))}
      </section>

      {/* ── КАТАЛОГ И СЛУЖЕБНОЕ ───────────────────────────────────────────── */}
      <section className="space-y-3">
        <H id="catalogue">Catalogue</H>
        <P>
          Two read-only endpoints answer the question <em>what does memory have</em> — in names, not
          in rows. They are generated from the contract as well.
        </P>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[length:var(--fs-small)]">
            <tbody>
              {(CATALOGUE as Array<{ about: string; path: string }>).map((c) => (
                <tr className="border-t border-muted-foreground/15 align-top" key={c.path}>
                  <td className="py-1 pr-3 font-mono">{c.path}</td>
                  <td className="py-1">{c.about}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <P>
          <strong>A source table is named in the answer and never accepted in the question.</strong>{" "}
          Knowing the names helps you ask a better question; it does not let you query a table
          directly. Deciding where to look is memory&apos;s job — that is what makes it a black box
          rather than a database with a thin cover.
        </P>

        <H id="service">Health and contract</H>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[length:var(--fs-small)]">
            <tbody>
              <tr className="border-t border-muted-foreground/15 align-top">
                <td className="py-1 pr-3 font-mono">GET /v1/health</td>
                <td className="py-1">
                  Open, no key required: liveness, contract version, and the name-quality figure.
                  Installers and watchdogs call it, and saying &laquo;I am alive&raquo; reveals
                  nothing about anyone.
                </td>
              </tr>
              <tr className="border-t border-muted-foreground/15 align-top">
                <td className="py-1 pr-3 font-mono">GET /v1/contract</td>
                <td className="py-1">
                  The machine-readable contract. Tool schemas for an agent should be generated from
                  this response over HTTP, not copied from source — a copy diverges silently.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* ── НИТЬ И КЭШ ────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <H id="threads">Threads of reasoning, and why continuing one is cheaper</H>
        <P>
          When memory thinks, it runs a real conversation with the model, and that conversation has a
          name. Every answer in which memory thought carries <code>thread</code>. Send it back with
          the next call and the same conversation continues: the model sees its own earlier
          conclusion.
        </P>
        <P>
          <strong>Measured on this machine, three turns of one thread:</strong> cost{" "}
          <code>0.0289</code> → <code>0.0065</code> → <code>0.0036</code>; cached input read{" "}
          <code>8204</code> → <code>15305</code> → <code>16148</code> tokens. Continuing a thread is
          <strong> cheaper</strong> than restating the context in a fresh call, not more expensive.
          The cache is hourly: a thread older than that still resumes, but the first turn after the
          pause pays for the cache again.
        </P>
        <P>
          <strong>This is why <code>deny</code> requires a thread.</strong> Overturning a conclusion
          without being able to return to the reasoning that produced it means nothing. Sent without
          <code> thread</code>, <code>deny</code> comes back as <code>not_supported</code> with a
          note saying exactly what is missing.
        </P>
        <P>
          A thread that no longer exists is its own named refusal —{" "}
          <code>think-thread-unknown</code> — not a generic parse failure. Drop the identifier and
          call again: memory will start a new thread.
        </P>
      </section>

      {/* ── СУДЬБА ПАРАМЕТРОВ ─────────────────────────────────────────────── */}
      <section className="space-y-3">
        <H id="params-report">Every optional parameter reports its own fate</H>
        <P>
          Any answer that received optional parameters carries <code>params</code> — one row per
          parameter you sent:
        </P>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[length:var(--fs-small)]">
            <tbody>
              <tr className="border-t border-muted-foreground/15 align-top">
                <td className="py-1 pr-3 font-mono">accepted</td>
                <td className="py-1">
                  taken and acted upon; <code>note</code> states what it did and where its limit is
                </td>
              </tr>
              <tr className="border-t border-muted-foreground/15 align-top">
                <td className="py-1 pr-3 font-mono">not_supported</td>
                <td className="py-1">
                  well-formed, but the ability behind it is not built yet — said in words, never by
                  silence
                </td>
              </tr>
              <tr className="border-t border-muted-foreground/15 align-top">
                <td className="py-1 pr-3 font-mono">bad_form</td>
                <td className="py-1">
                  wrong shape; the parameter is dropped, the reason is named, and the rest of the
                  call still runs
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <P>
          A parameter you sent will never simply vanish. If <code>params</code> says nothing about
          it, you did not send it.
        </P>
      </section>

      {/* ── ОТКАЗЫ ────────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <H id="refusals">Refusal codes</H>
        <P>
          Two fields always travel together: a permanent machine code (<code>refusal</code> or{" "}
          <code>error</code>) and human words (<code>what_happened</code>). Branch on the code;
          show the words. The words are translated, the codes never change.
        </P>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[length:var(--fs-small)]">
            <tbody>
              {refusalRows().map(([code, text]) => (
                <tr className="border-t border-muted-foreground/15 align-top" key={code}>
                  <td className="py-1 pr-3 font-mono">{code}</td>
                  <td className="py-1">{text}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <P>
          <strong>Money and keys are different refusals on purpose.</strong> An exhausted
          subscription window heals by itself; a rejected key does not. One code for both would leave
          you guessing whether to wait or to act.
        </P>
      </section>

      {/* ── ПРИМЕРЫ ───────────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <H id="examples">Worked examples</H>
        <P>Tell memory something a person said, in their own words:</P>
        <Code>{`curl -s ${base}/v1/remember \\
  -H "Content-Type: application/json" \\
  -H "x-memory-key: $MEMORY_KEY" \\
  -d '{
    "who": "roman",
    "text": "my name is Roman and I live in Madrid",
    "lang": "en"
  }'`}</Code>
        <P>Ask what it knows — no question means everything, and that path calls no model at all:</P>
        <Code>{`curl -s ${base}/v1/recall \\
  -H "Content-Type: application/json" \\
  -H "x-memory-key: $MEMORY_KEY" \\
  -d '{ "who": "roman", "lang": "en" }'`}</Code>
        <P>Continue the same reasoning and overturn what it concluded:</P>
        <Code>{`curl -s ${base}/v1/remember \\
  -H "Content-Type: application/json" \\
  -H "x-memory-key: $MEMORY_KEY" \\
  -d '{
    "who": "roman",
    "text": "about the city",
    "thread": "f0310016-29fd-4dc2-a97e-0c22292a4de2",
    "deny": "that is wrong — I moved to Lisbon last month"
  }'`}</Code>
        <P>Give the fact a scope — several dates and places are normal, so scope is a list:</P>
        <Code>{`curl -s ${base}/v1/remember \\
  -H "Content-Type: application/json" \\
  -H "x-memory-key: $MEMORY_KEY" \\
  -d '{
    "who": "roman",
    "text": "the taxi ride cost 40 euro",
    "scope": [
      { "at": "2026-09-11", "place": "Madrid" },
      { "place": "London" }
    ]
  }'`}</Code>
      </section>

      {/* ── ЧЕГО ПАМЯТЬ НЕ УМЕЕТ ──────────────────────────────────────────── */}
      <section className="space-y-3">
        <H id="limits">What memory does not do today</H>
        <P>
          Named plainly, because an ability nobody named is one every caller invents for themselves:
        </P>
        <ul className="ml-5 list-disc space-y-1 text-[length:var(--fs-small)]">
          <li>
            <strong>Only text is understood.</strong> Images, video, audio, HTML and PDF are declared
            kinds of input, and none of them is parsed yet.
          </li>
          <li>
            <strong>Search depth stops at level two.</strong> You may ask for <code>deep</code> or{" "}
            <code>extreme</code>; the answer reports <code>depth_used</code> honestly, and today that
            is 1 or 2.
          </li>
          <li>
            <strong>Scope is recorded in the call journal, not yet in the knowledge itself.</strong>{" "}
            An empty scope means &laquo;I do not know where or when&raquo; — never &laquo;everywhere,
            always&raquo;.
          </li>
          <li>
            <strong>Denial does not rewrite storage.</strong> Inside the thread the conclusion is
            reconsidered; the refutation is not yet written down as a fact.
          </li>
          <li>
            <strong>Facts about third parties are recognised and not stored</strong> — and the answer
            says so rather than staying silent.
          </li>
          <li>
            <strong>Relations between two people</strong> (&laquo;X is married to Y&raquo;) are not
            expressible as a field and are not stored as one.
          </li>
          <li>
            <strong>Memory keeps no history of your requests.</strong> Each call is a closed cycle;
            the only continuity offered is the reasoning thread described above.
          </li>
        </ul>
      </section>

      {/* ── POSTMAN: ДВА ЯЗЫКА, И ЭТО ТРЕБОВАНИЕ ВЛАДЕЛЬЦА ────────────────── */}
      <section className="space-y-4">
        <H id="postman">Testing with Postman</H>
        <P>
          This section is deliberately given in both English and Russian — it is the one part of this
          page a human follows step by step rather than a machine.
        </P>

        <div className="space-y-2 rounded-md border border-muted-foreground/30 p-3">
          <div className="text-[length:var(--fs-small)] font-semibold">English</div>
          <ol className="ml-5 list-decimal space-y-1 text-[length:var(--fs-small)]">
            <li>
              Generate the access key above and copy it. It is shown once; if you lose it, generate a
              new one — the old one stops working at that moment.
            </li>
            <li>
              In Postman create an environment, for example <code>Fractera Memory</code>, with two
              variables: <code>base</code> = <code>{base}</code> and <code>key</code> = the key you
              copied. Mark the key variable as <em>secret</em>.
            </li>
            <li>
              First request: <code>GET {`{{base}}`}/v1/health</code>. No headers needed. A{" "}
              <code>200</code> with a JSON body means the service is alive. If this fails, nothing
              below will work — fix reachability first.
            </li>
            <li>
              Second request: <code>GET {`{{base}}`}/v1/contract</code>. Headers tab:{" "}
              <code>x-memory-key</code> = <code>{`{{key}}`}</code>. This proves the key itself works.
              A <code>401</code> here means the key is wrong or was replaced by a newer one.
            </li>
            <li>
              Third request: <code>POST {`{{base}}`}/v1/remember</code>. Headers:{" "}
              <code>x-memory-key</code> = <code>{`{{key}}`}</code> and{" "}
              <code>Content-Type: application/json</code>. Body tab → <em>raw</em> → <em>JSON</em>:
              <br />
              <code>{`{ "who": "postman-test", "text": "my name is Roman", "lang": "en" }`}</code>
              <br />
              Expect <code>ok: true</code>, a <code>noted</code> array, and a <code>thread</code>{" "}
              identifier. This call spends a real model turn, so keep it short.
            </li>
            <li>
              Fourth request: <code>POST {`{{base}}`}/v1/recall</code> with body{" "}
              <code>{`{ "who": "postman-test", "lang": "en" }`}</code>. It returns everything known
              about that person and calls no model — it should come back in milliseconds.
            </li>
            <li>
              Negative check, and do not skip it: remove the <code>x-memory-key</code> header from
              the recall request and send it again. You must get <code>401</code> with{" "}
              <code>no-access</code>. If it still succeeds, you are talking to something that is not
              this service.
            </li>
          </ol>
        </div>

        <div className="space-y-2 rounded-md border border-muted-foreground/30 p-3">
          <div className="text-[length:var(--fs-small)] font-semibold">По-русски</div>
          <ol className="ml-5 list-decimal space-y-1 text-[length:var(--fs-small)]">
            <li>
              Сгенерируйте ключ доступа выше и скопируйте его. Он показывается один раз; потеряли —
              сгенерируйте новый, и в этот же миг старый перестанет работать.
            </li>
            <li>
              В Postman заведите окружение, например <code>Fractera Memory</code>, и в нём две
              переменные: <code>base</code> = <code>{base}</code> и <code>key</code> = скопированный
              ключ. Переменную с ключом пометьте как <em>secret</em>.
            </li>
            <li>
              Первый запрос: <code>GET {`{{base}}`}/v1/health</code>, без заголовков. Ответ{" "}
              <code>200</code> с телом JSON означает, что служба жива. Если не вышло — дальше ничего
              не заработает, сначала разберитесь с доступностью.
            </li>
            <li>
              Второй запрос: <code>GET {`{{base}}`}/v1/contract</code>. На вкладке Headers:{" "}
              <code>x-memory-key</code> = <code>{`{{key}}`}</code>. Это доказывает, что работает сам
              ключ. Ответ <code>401</code> здесь значит, что ключ неверен или заменён более новым.
            </li>
            <li>
              Третий запрос: <code>POST {`{{base}}`}/v1/remember</code>. Заголовки:{" "}
              <code>x-memory-key</code> = <code>{`{{key}}`}</code> и{" "}
              <code>Content-Type: application/json</code>. Вкладка Body → <em>raw</em> → <em>JSON</em>:
              <br />
              <code>{`{ "who": "postman-test", "text": "меня зовут Роман", "lang": "ru" }`}</code>
              <br />
              Ожидайте <code>ok: true</code>, массив <code>noted</code> и идентификатор{" "}
              <code>thread</code>. Этот вызов тратит настоящий ход модели — держите фразу короткой.
            </li>
            <li>
              Четвёртый запрос: <code>POST {`{{base}}`}/v1/recall</code> с телом{" "}
              <code>{`{ "who": "postman-test", "lang": "ru" }`}</code>. Он отдаёт всё, что известно о
              человеке, и не зовёт модель вовсе — ответ обязан прийти за миллисекунды.
            </li>
            <li>
              Негативная проверка, и её не пропускайте: уберите заголовок <code>x-memory-key</code>{" "}
              из запроса на чтение и отправьте снова. Обязан прийти <code>401</code> с{" "}
              <code>no-access</code>. Если запрос всё равно прошёл — вы разговариваете не с этой
              службой.
            </li>
          </ol>
        </div>

        <P>
          <strong>Note on quota.</strong> <code>remember</code> spends a turn of the owner&apos;s
          Claude subscription — the same window the Telegram bot and the architect&apos;s own work
          live on. <code>recall</code> without a question spends nothing. Load-test the reading path,
          not the writing one.
        </P>
      </section>

      {/* 🔒 ЯЗЫК СТРАНИЦЫ НЕ ВЛИЯЕТ НА ДОКУМЕНТАЦИЮ, И ЭТО СКАЗАНО ВСЛУХ —
          иначе следующий агент «починит» английский текст на русской странице. */}
      <p className="text-[length:var(--fs-small)] text-muted-foreground">
        {lang === "ru"
          ? "Документация намеренно на английском при любом языке страницы: её читают инструменты и модели. По-русски здесь только раздел про Postman — по решению владельца."
          : "This reference stays in English on every locale: it is read by tools and models. Only the Postman section is bilingual, by the owner's decision."}
      </p>
    </div>
  );
}
