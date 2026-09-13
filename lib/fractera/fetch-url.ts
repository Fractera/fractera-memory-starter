import { lookup, type LookupAddress } from "node:dns";
import { request as httpRequest, type IncomingMessage } from "node:http";
import { request as httpsRequest } from "node:https";
import { isIP } from "node:net";
import { networkInterfaces } from "node:os";
import { basename } from "node:path";

// ФАЙЛ ПО АДРЕСУ (194-16).
//
// 🎯 СЛОВО ВЛАДЕЛЬЦА 2026-09-13: «Делай полный вариант: методы объектов в API». Telegram отдаёт файл адресом, а не
// телом, — значит память обязана уметь скачать его сама.
//
// 🛑 ГЛАВНАЯ ОПАСНОСТЬ — НЕ ЧУЖОЙ ФАЙЛ, А НАШ ЖЕ СЕРВЕР. Адрес приходит от чужого зовущего, а скачивает память —
// процесс, стоящий рядом со слоем данных `127.0.0.1:3300`, графом и складом секретов. Без защиты адрес
// `http://127.0.0.1:3300/...` превратил бы договор памяти в чужие руки внутри машины.
// 🔒 ПРОВЕРЯЕТСЯ АДРЕС, В КОТОРЫЙ ИМЯ РАЗРЕШИЛОСЬ, А НЕ ИМЯ. `localhost`, `127.1`, имя, указывающее в частную сеть,
// и имя, которое между проверкой и соединением сменило адрес, ловятся одинаково: проверка стоит в `lookup` самого
// соединения, а не рядом с ним. Буквальный IP в адресе проверяется до соединения — для него `lookup` не зовётся.
// 🔒 КАЖДОЕ ПЕРЕНАПРАВЛЕНИЕ ПРОВЕРЯЕТСЯ ЗАНОВО: разрешённый адрес, отвечающий `302 → http://127.0.0.1`, иначе
// открыл бы ту же дверь в обход.
// 🔒 СТРАНИЦА — НЕ ФАЙЛ (граница с шагом 195): ответ `text/html` отвергается словами `is-a-page`. Страницы
// память будет открывать браузером и класть родом `web`; скачанный HTML был бы исходником без того, что рисуют
// скрипты, — то есть неполной правдой под видом объекта.

/** Предел файла — тот же, что у nginx и слоя данных: своего предела у памяти нет. */
export const URL_LIMIT_BYTES = 200 * 1024 * 1024;
const MAX_REDIRECTS = 5;
const TIMEOUT_MS = 60_000;

export type Fetched =
  | { ok: true; bytes: Uint8Array; finalUrl: string; mime: string; name: string }
  | {
      ok: false;
      error: "bad-url" | "is-a-page" | "url-forbidden" | "url-status" | "url-too-large" | "url-unreachable";
      why?: string;
    };

/** Адреса самой машины — их нельзя достать и снаружи-внутрь. */
function ownAddresses(): Set<string> {
  const out = new Set<string>();
  for (const list of Object.values(networkInterfaces())) {
    for (const i of list ?? []) out.add(i.address.toLowerCase());
  }
  return out;
}

/** Запрещён ли адрес: петля, частная сеть, link-local, служебные диапазоны, адреса самой машины. */
export function isForbiddenAddress(address: string): boolean {
  const ip = address.toLowerCase();
  const v = isIP(ip);
  if (v === 4) {
    const [a, b] = ip.split(".").map(Number);
    if (a === 0 || a === 10 || a === 127 || a >= 224) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    return ownAddresses().has(ip);
  }
  if (v === 6) {
    if (ip === "::" || ip === "::1") return true;
    if (ip.startsWith("::ffff:")) return isForbiddenAddress(ip.slice(7));
    if (/^f[cd]/.test(ip) || /^fe[89ab]/.test(ip)) return true;
    return ownAddresses().has(ip);
  }
  return true;
}

type LookupCallback = (err: NodeJS.ErrnoException | null, address: string | LookupAddress[], family?: number) => void;

/** `lookup` соединения: разрешает имя и отказывает, если хоть один адрес запрещён. */
function guardedLookup(hostname: string, options: { all?: boolean; family?: number }, callback: LookupCallback) {
  lookup(hostname, { all: true, family: options.family ?? 0 }, (err, addresses) => {
    if (err) return callback(err, "");
    const list = addresses as LookupAddress[];
    if (!list.length || list.some((a) => isForbiddenAddress(a.address))) {
      const e = Object.assign(new Error("url-forbidden"), { code: "URL_FORBIDDEN" }) as NodeJS.ErrnoException;
      return callback(e, "");
    }
    if (options.all) return callback(null, list);
    callback(null, list[0].address, list[0].family);
  });
}

function nameOf(res: IncomingMessage, url: URL): string {
  const cd = String(res.headers["content-disposition"] ?? "");
  const star = cd.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
  if (star) {
    try {
      return decodeURIComponent(star[1].trim().replace(/^"|"$/g, ""));
    } catch {
      /* кривое имя — берём из адреса */
    }
  }
  const plain = cd.match(/filename\s*=\s*"?([^";]+)"?/i);
  if (plain) return plain[1].trim();
  try {
    const last = basename(decodeURIComponent(url.pathname));
    if (last && last !== "/") return last;
  } catch {
    /* кривой путь — умолчание ниже */
  }
  return "download";
}

function once(url: URL): Promise<{ res: IncomingMessage } | { error: Extract<Fetched, { ok: false }> }> {
  return new Promise((resolve) => {
    const request = url.protocol === "https:" ? httpsRequest : httpRequest;
    const req = request(
      url,
      {
        headers: { "user-agent": "FracteraMemory/1.0 (+keep_object)" },
        lookup: guardedLookup as never,
        method: "GET",
      },
      (res) => resolve({ res }),
    );
    req.setTimeout(TIMEOUT_MS, () => req.destroy(new Error("timeout")));
    req.on("error", (e: NodeJS.ErrnoException) => {
      if (e.code === "URL_FORBIDDEN") return resolve({ error: { error: "url-forbidden", ok: false, why: url.hostname } });
      resolve({ error: { error: "url-unreachable", ok: false, why: String(e.message).slice(0, 200) } });
    });
    req.end();
  });
}

/** Скачать файл по адресу, не выпуская зовущего внутрь машины. */
export async function fetchUrl(raw: string): Promise<Fetched> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { error: "bad-url", ok: false, why: raw.slice(0, 200) };
  }

  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return { error: "bad-url", ok: false, why: `протокол ${url.protocol} — принимаются только http и https` };
    }
    if (url.username || url.password) return { error: "bad-url", ok: false, why: "адрес с учётными данными" };
    const host = url.hostname.replace(/^\[|\]$/g, "");
    if (isIP(host) && isForbiddenAddress(host)) return { error: "url-forbidden", ok: false, why: host };

    const got = await once(url);
    if ("error" in got) return got.error;
    const { res } = got;
    const status = res.statusCode ?? 0;

    if (status >= 300 && status < 400 && res.headers.location) {
      res.resume();
      url = new URL(res.headers.location, url);
      continue;
    }
    if (status < 200 || status >= 300) {
      res.resume();
      return { error: "url-status", ok: false, why: `код ${status}` };
    }

    const mime = String(res.headers["content-type"] ?? "").split(";")[0].trim().toLowerCase();
    if (mime === "text/html" || mime === "application/xhtml+xml") {
      res.resume();
      return { error: "is-a-page", ok: false, why: "это страница: страницы память кладёт методом ссылок, а не как файл" };
    }
    const declared = Number(res.headers["content-length"] ?? 0);
    if (declared > URL_LIMIT_BYTES) {
      res.resume();
      return { error: "url-too-large", ok: false, why: `${declared} байт` };
    }

    const chunks: Buffer[] = [];
    let size = 0;
    const done = await new Promise<Fetched | null>((resolve) => {
      res.on("data", (chunk: Buffer) => {
        size += chunk.length;
        if (size > URL_LIMIT_BYTES) {
          res.destroy();
          return resolve({ error: "url-too-large", ok: false, why: `больше ${URL_LIMIT_BYTES} байт` });
        }
        chunks.push(chunk);
      });
      res.on("end", () => resolve(null));
      res.on("error", (e) => resolve({ error: "url-unreachable", ok: false, why: String(e.message).slice(0, 200) }));
    });
    if (done) return done;
    if (!size) return { error: "url-status", ok: false, why: "пустой ответ" };
    return {
      bytes: new Uint8Array(Buffer.concat(chunks)),
      finalUrl: url.toString(),
      mime: mime || "application/octet-stream",
      name: nameOf(res, url),
      ok: true,
    };
  }
  return { error: "url-unreachable", ok: false, why: `больше ${MAX_REDIRECTS} перенаправлений` };
}
