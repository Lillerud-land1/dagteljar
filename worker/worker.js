// Dagteljar-synk: kontoar med namn og passord, nedteljingar og bilete, lagra i Cloudflare D1.
// Appen på GitHub Pages snakkar med denne workeren når brukaren er innlogga.

const OPPHAV = ['https://lillerud-land1.github.io', 'http://localhost:8766'];
const ITER = 100000;
const MAKS_HENDINGAR = 300;
const MAKS_BILETE = 200;
const MAKS_BILETE_BYTES = 1500000;
const MAKS_DOK = 20000;
const OKT_LEVETID = 400 * 864e5;
const MAKS_FEIL = 8;
const FEIL_VINDAUGE = 15 * 60e3;

class Feil extends Error {
  constructor(status, melding) { super(melding); this.status = status; }
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const origin = req.headers.get('Origin') || '';
    const cors = OPPHAV.includes(origin) ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {};
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          ...cors,
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
          'Access-Control-Allow-Headers': 'Authorization, Content-Type',
          'Access-Control-Max-Age': '86400',
        },
      });
    }
    let res;
    try {
      res = await rute(req, env, url);
    } catch (e) {
      res = svar({ feil: e instanceof Feil ? e.message : 'Noko gjekk gale på serveren. Prøv igjen om litt.' }, e instanceof Feil ? e.status : 500);
    }
    for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
    return res;
  },
};

async function rute(req, env, url) {
  const p = url.pathname.replace(/\/+$/, '');
  const m = req.method;

  if (m === 'GET' && p === '') return svar({ ok: true, app: 'dagteljar' });

  const bilete = /^\/bilete\/([0-9a-f]{32})$/.exec(p);
  if (bilete && m === 'GET') return hentBilete(env, bilete[1]);

  if (m === 'POST' && p === '/konto') return lagKonto(req, env);
  if (m === 'POST' && p === '/logg-inn') return loggInn(req, env);

  const namn = await krevInnlogging(req, env);
  if (m === 'POST' && p === '/logg-ut') {
    await env.DB.prepare('DELETE FROM okter WHERE tokenhash = ?').bind(await sha256(token(req))).run();
    return svar({ ok: true });
  }
  if (m === 'GET' && p === '/hendingar') {
    const { results } = await env.DB.prepare('SELECT id, data, endra FROM hendingar WHERE namn = ?').bind(namn).all();
    const hendingar = results.map(r => ({ ...JSON.parse(r.data), id: r.id, endra: r.endra }));
    return svar({ namn, hendingar });
  }
  const hending = /^\/hendingar\/([A-Za-z0-9_-]{1,64})$/.exec(p);
  if (hending && m === 'PUT') return lagreHending(req, env, namn, hending[1]);
  if (hending && m === 'DELETE') {
    await env.DB.prepare('DELETE FROM hendingar WHERE namn = ? AND id = ?').bind(namn, hending[1]).run();
    return svar({ ok: true });
  }
  if (m === 'POST' && p === '/bilete') return lastOppBilete(req, env, namn);
  if (bilete && m === 'DELETE') {
    await env.DB.prepare('DELETE FROM bilete WHERE id = ? AND namn = ?').bind(bilete[1], namn).run();
    return svar({ ok: true });
  }
  throw new Feil(404, 'Fann ikkje denne adressa.');
}

// ---------- Kontoar ----------
function rensNamn(s) {
  const namn = String(s || '').trim().toLowerCase();
  if (!/^[a-z0-9æøå._-]{3,30}$/.test(namn)) throw new Feil(400, 'Namnet må vere 3–30 teikn: bokstavar, tal, punktum, bindestrek eller understrek.');
  return namn;
}
function rensPassord(s) {
  const passord = String(s || '');
  if (passord.length < 6) throw new Feil(400, 'Passordet må ha minst 6 teikn.');
  if (passord.length > 200) throw new Feil(400, 'Passordet er for langt.');
  return passord;
}
async function grense(env, nokkel) {
  if (!env.GRENSE) return;
  const { success } = await env.GRENSE.limit({ key: nokkel });
  if (!success) throw new Feil(429, 'For mange forsøk på kort tid. Vent eitt minutt og prøv igjen.');
}
const ip = req => req.headers.get('CF-Connecting-IP') || 'ukjend';

async function lagKonto(req, env) {
  await grense(env, 'konto:' + ip(req));
  const body = await lesJson(req);
  const namn = rensNamn(body.namn);
  const passord = rensPassord(body.passord);
  const finst = await env.DB.prepare('SELECT 1 FROM brukarar WHERE namn = ?').bind(namn).first();
  if (finst) throw new Feil(409, 'Namnet er teke. Vel eit anna namn, eller logg inn om kontoen er din.');
  const salt = tilfeldig(16);
  const hash = await hashPassord(passord, salt, ITER);
  await env.DB.prepare('INSERT INTO brukarar (namn, salt, hash, iter, laga) VALUES (?, ?, ?, ?, ?)').bind(namn, hex(salt), hash, ITER, Date.now()).run();
  return svar({ namn, token: await lagOkt(env, namn) }, 201);
}

async function loggInn(req, env) {
  await grense(env, 'inn:' + ip(req));
  const body = await lesJson(req);
  const namn = rensNamn(body.namn);
  const passord = String(body.passord || '');
  const no = Date.now();
  await env.DB.prepare('DELETE FROM forsok WHERE ts < ?').bind(no - FEIL_VINDAUGE).run();
  const feil = await env.DB.prepare('SELECT COUNT(*) AS n FROM forsok WHERE namn = ?').bind(namn).first();
  if (feil && feil.n >= MAKS_FEIL) throw new Feil(429, 'For mange feil passord. Vent eit kvarter og prøv igjen.');
  const brukar = await env.DB.prepare('SELECT salt, hash, iter FROM brukarar WHERE namn = ?').bind(namn).first();
  const rett = brukar && likt(await hashPassord(passord, fraHex(brukar.salt), brukar.iter), brukar.hash);
  if (!rett) {
    await env.DB.prepare('INSERT INTO forsok (namn, ts) VALUES (?, ?)').bind(namn, no).run();
    throw new Feil(401, 'Feil namn eller passord.');
  }
  await env.DB.prepare('DELETE FROM forsok WHERE namn = ?').bind(namn).run();
  return svar({ namn, token: await lagOkt(env, namn) });
}

async function lagOkt(env, namn) {
  const t = b64url(tilfeldig(32));
  const no = Date.now();
  await env.DB.prepare('INSERT INTO okter (tokenhash, namn, laga, sist) VALUES (?, ?, ?, ?)').bind(await sha256(t), namn, no, no).run();
  return t;
}

const token = req => (/^Bearer ([A-Za-z0-9_-]{20,100})$/.exec(req.headers.get('Authorization') || '') || [])[1] || '';

async function krevInnlogging(req, env) {
  const t = token(req);
  if (!t) throw new Feil(401, 'Du må logge inn.');
  const h = await sha256(t);
  const okt = await env.DB.prepare('SELECT namn, sist FROM okter WHERE tokenhash = ?').bind(h).first();
  const no = Date.now();
  if (!okt || no - okt.sist > OKT_LEVETID) throw new Feil(401, 'Du er logga ut. Logg inn igjen.');
  if (no - okt.sist > 864e5) await env.DB.prepare('UPDATE okter SET sist = ? WHERE tokenhash = ?').bind(no, h).run();
  return okt.namn;
}

// ---------- Nedteljingar ----------
async function lagreHending(req, env, namn, id) {
  const tekst = await req.text();
  if (tekst.length > MAKS_DOK) throw new Feil(413, 'Nedteljinga er for stor.');
  let data;
  try { data = JSON.parse(tekst); } catch { throw new Feil(400, 'Ugyldige data.'); }
  if (!data || typeof data !== 'object' || Array.isArray(data) || typeof data.title !== 'string') throw new Feil(400, 'Ugyldige data.');
  delete data.id;
  delete data.endra;
  const finst = await env.DB.prepare('SELECT 1 FROM hendingar WHERE namn = ? AND id = ?').bind(namn, id).first();
  if (!finst) {
    const { n } = await env.DB.prepare('SELECT COUNT(*) AS n FROM hendingar WHERE namn = ?').bind(namn).first();
    if (n >= MAKS_HENDINGAR) throw new Feil(409, `Du kan ha opptil ${MAKS_HENDINGAR} nedteljingar. Slett nokre gamle først.`);
  }
  const endra = Date.now();
  await env.DB.prepare('INSERT INTO hendingar (namn, id, data, endra) VALUES (?, ?, ?, ?) ON CONFLICT (namn, id) DO UPDATE SET data = excluded.data, endra = excluded.endra')
    .bind(namn, id, JSON.stringify(data), endra).run();
  return svar({ ok: true, id, endra });
}

// ---------- Bilete ----------
async function lastOppBilete(req, env, namn) {
  const buf = new Uint8Array(await req.arrayBuffer());
  if (!buf.length) throw new Feil(400, 'Biletet er tomt.');
  if (buf.length > MAKS_BILETE_BYTES) throw new Feil(413, 'Biletet er for stort.');
  if (!(buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff)) throw new Feil(415, 'Berre JPEG-bilete er lov.');
  const { n } = await env.DB.prepare('SELECT COUNT(*) AS n FROM bilete WHERE namn = ?').bind(namn).first();
  if (n >= MAKS_BILETE) throw new Feil(409, `Du kan ha opptil ${MAKS_BILETE} bilete. Fjern bilete frå nokre nedteljingar først.`);
  const id = hex(tilfeldig(16));
  await env.DB.prepare('INSERT INTO bilete (id, namn, type, data, laga) VALUES (?, ?, ?, ?, ?)').bind(id, namn, 'image/jpeg', buf, Date.now()).run();
  return svar({ id }, 201);
}

async function hentBilete(env, id) {
  const rad = await env.DB.prepare('SELECT type, data FROM bilete WHERE id = ?').bind(id).first();
  if (!rad) return new Response('Fann ikkje biletet.', { status: 404 });
  const data = rad.data instanceof ArrayBuffer ? rad.data : new Uint8Array(rad.data);
  return new Response(data, {
    headers: {
      'Content-Type': rad.type,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'",
    },
  });
}

// ---------- Hjelparar ----------
function svar(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
async function lesJson(req) {
  try {
    const t = await req.text();
    if (t.length > 2000) throw new Error();
    return JSON.parse(t) || {};
  } catch { throw new Feil(400, 'Ugyldige data.'); }
}
const tilfeldig = n => crypto.getRandomValues(new Uint8Array(n));
const hex = buf => Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2, '0')).join('');
const fraHex = s => new Uint8Array(s.match(/../g).map(h => parseInt(h, 16)));
const b64url = buf => btoa(String.fromCharCode(...buf)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
async function sha256(s) {
  return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
}
async function hashPassord(passord, salt, iter) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(passord), 'PBKDF2', false, ['deriveBits']);
  return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iter }, key, 256));
}
function likt(a, b) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
