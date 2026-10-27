// Dagteljar-widget for Scriptable (https://scriptable.app)
// Viser nedteljingane frå Dagteljar-kontoen din på startskjermen og låseskjermen.
//
// Éi bestemt nedteljing: hald fingeren på widgeten, vel «Rediger widget» og skriv namnet,
// til dømes Halloween, i feltet «Parameter». Fleire namn med komma imellom, til dømes
// «Halloween, Bursdag», viser fleire i ein mellomstor eller stor widget.
// Lenkja under kan berre lese nedteljingane. Ho kan slåast av i Dagteljar under Konto.

const NOKKEL = '__NOKKEL__';
const API = '__API__';
const APP = 'https://lillerud-land1.github.io/dagteljar/';

const FARGAR = { rogn: '#DE6816', raud: '#C8232B', gran: '#1D6A46', fjord: '#2450B5', lyng: '#7A3DA6', natt: '#262C3A' };
const EMOJI = { kake: '🎂', gave: '🎁', ballong: '🎈', jultre: '🎄', graskar: '🎃', fyrverkeri: '🎆', flagg: '🇳🇴', egg: '🐣', bal: '🔥', hjarte: '❤️', pote: '🐾', sol: '☀️' };
const DAGAR = ['sundag', 'måndag', 'tysdag', 'onsdag', 'torsdag', 'fredag', 'laurdag'];
const MND = ['jan.', 'feb.', 'mars', 'apr.', 'mai', 'juni', 'juli', 'aug.', 'sep.', 'okt.', 'nov.', 'des.'];
const UNITS = { day: 1, week: 1, month: 1, year: 1 };

const PAPIR = Color.dynamic(new Color('#FFFFFF'), new Color('#1A1F29'));
const GRUNN = Color.dynamic(new Color('#E5E8ED'), new Color('#0E1117'));
const BLEKK = Color.dynamic(new Color('#161B25'), new Color('#ECEEF2'));
const BLEKK2 = Color.dynamic(new Color('#586172'), new Color('#9AA3B3'));
const RAUD = Color.dynamic(new Color('#D21F28'), new Color('#FF5A60'));
const KVIT = new Color('#FFFFFF');
const talFont = size => new Font('AvenirNextCondensed-Heavy', size);

// ---------- Datoar (same reglar som i appen) ----------
function mkDate(y, m, d) { const x = new Date(2000, 0, 1); x.setFullYear(y, m, d); return x; }
function parseYmd(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
  return m && +m[1] > 0 ? mkDate(+m[1], +m[2] - 1, +m[3]) : null;
}
const dateOnly = d => mkDate(d.getFullYear(), d.getMonth(), d.getDate());
const dayNum = d => { const t = new Date(0); t.setUTCFullYear(d.getFullYear(), d.getMonth(), d.getDate()); return Math.round(t / 864e5); };
const addDays = (d, n) => mkDate(d.getFullYear(), d.getMonth(), d.getDate() + n);
const daysIn = (y, m) => mkDate(y, m + 1, 0).getDate();
function addMonths(d, n) {
  const t = d.getMonth() + n;
  const y = d.getFullYear() + Math.floor(t / 12);
  const m = ((t % 12) + 12) % 12;
  return mkDate(y, m, Math.min(d.getDate(), daysIn(y, m)));
}
function easter(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const n = h + l - 7 * m + 114;
  return mkDate(y, Math.floor(n / 31) - 1, (n % 31) + 1);
}
function ruleDate(r, y) {
  if (r.type === 'easter') return addDays(easter(y), r.offset || 0);
  if (r.type === 'nth') {
    const first = mkDate(y, r.month, 1);
    return mkDate(y, r.month, 1 + ((r.weekday - first.getDay() + 7) % 7) + (r.nth - 1) * 7);
  }
  return null;
}
function firstOcc(ev, ref) {
  if (ev.rule) {
    for (let y = ref.getFullYear(); y <= ref.getFullYear() + 2; y++) {
      const d = ruleDate(ev.rule, y);
      if (d && d >= ref) return d;
    }
    return null;
  }
  const base = parseYmd(ev.date);
  if (!base) return null;
  const r = ev.repeat || {};
  const n = Math.max(1, r.every | 0 || 1);
  if (!UNITS[r.unit] || base >= ref) return base;
  if (r.unit === 'day' || r.unit === 'week') {
    const step = n * (r.unit === 'week' ? 7 : 1);
    return addDays(base, Math.ceil((dayNum(ref) - dayNum(base)) / step) * step);
  }
  const stepM = n * (r.unit === 'year' ? 12 : 1);
  let k = Math.floor(((ref.getFullYear() - base.getFullYear()) * 12 + ref.getMonth() - base.getMonth()) / stepM);
  let d = addMonths(base, k * stepM);
  while (d < ref) { k++; d = addMonths(base, k * stepM); }
  return d;
}
function status(ev, today) {
  if (ev.kind === 'up') {
    const start = parseYmd(ev.date);
    if (!start) return null;
    const diff = dayNum(today) - dayNum(start);
    if (diff < 0) return { phase: 'down', occ: start, days: -diff };
    return { phase: 'since', start, days: diff };
  }
  const occ = firstOcc(ev, today) || today;
  const diff = dayNum(occ) - dayNum(today);
  if (diff < 0) return { phase: 'since', start: occ, days: -diff, ended: true };
  return { phase: diff === 0 ? 'today' : 'down', occ, days: diff };
}

// ---------- Tekst ----------
const fmt = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const pl = (n, one, many) => (n === 1 ? one : many);
function dateText(d, today) {
  const s = `${DAGAR[d.getDay()]} ${d.getDate()}. ${MND[d.getMonth()]}`;
  return d.getFullYear() === today.getFullYear() ? s : `${s} ${d.getFullYear()}`;
}
function card(ev, st, today) {
  if (st.phase === 'today') return { num: 'I dag', unit: 'er dagen', when: ev.time ? `kl. ${ev.time}` : '', extra: age(ev, st.occ) };
  if (st.phase === 'down') {
    return { num: fmt(st.days), unit: pl(st.days, 'dag til', 'dagar til'), when: st.days === 1 ? 'i morgon' : dateText(st.occ, today), extra: age(ev, st.occ) };
  }
  return { num: fmt(st.days), unit: pl(st.days, 'dag sidan', 'dagar sidan'), when: 'sidan ' + dateText(st.start, today), extra: '' };
}
function age(ev, occ) {
  const b = parseYmd(ev.date);
  return ev.showAge && b ? `Fyller ${occ.getFullYear() - b.getFullYear()} år` : '';
}
const shortText = (ev, st) => (st.phase === 'today' ? 'i dag' : st.phase === 'down' ? (st.days === 1 ? 'i morgon' : `om ${fmt(st.days)} dagar`) : `${fmt(st.days)} dagar sidan`);

// ---------- Kva som skal visast ----------
// Utan parameter: same rekkjefølgje som i appen (neste, festa, seinare, tel opp), utan det som ligg i mappa.
function pick(list, today, param) {
  const rows = list.map(ev => ({ ev, st: status(ev, today) })).filter(r => r.st && !r.st.ended);
  if (param) {
    const out = [];
    for (const want of param.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)) {
      const hit = rows.find(r => r.ev.title.toLowerCase() === want) || rows.find(r => r.ev.title.toLowerCase().includes(want));
      if (hit && !out.includes(hit)) out.push(hit);
    }
    if (out.length) return out;
  }
  const shown = rows.filter(r => r.ev.place !== 'mappe');
  const downs = shown.filter(r => r.st.phase !== 'since').sort((a, b) => a.st.days - b.st.days || a.ev.title.localeCompare(b.ev.title, 'nb'));
  const ups = shown.filter(r => r.st.phase === 'since').sort((a, b) => b.st.days - a.st.days);
  const hero = downs[0] || ups[0];
  if (!hero) return [];
  const rest = downs.concat(ups).filter(r => r !== hero);
  return [hero].concat(rest.filter(r => r.ev.place === 'pin'), rest.filter(r => r.ev.place !== 'pin'));
}

// ---------- Teikning ----------
function addText(stack, s, font, color, opts = {}) {
  const t = stack.addText(s);
  t.font = font;
  t.textColor = color;
  if (opts.lines) t.lineLimit = opts.lines;
  if (opts.scale) t.minimumScaleFactor = opts.scale;
  if (opts.center) t.centerAlignText();
  return t;
}
const colorOf = ev => new Color(FARGAR[ev.color] || FARGAR.rogn);
const numSize = (s, big) => (s.length <= 2 ? 52 : s.length <= 3 ? 46 : s.length <= 5 ? 38 : 30) * (big ? 1.15 : 1);

// Kalendersida: farga topp med namn og bilete, så det store talet.
function page(parent, r, today, big) {
  const c = card(r.ev, r.st, today);
  const p = parent.addStack();
  p.layoutVertically();
  p.backgroundColor = PAPIR;
  p.cornerRadius = 12;
  const band = p.addStack();
  band.layoutHorizontally();
  band.centerAlignContent();
  band.backgroundColor = colorOf(r.ev);
  band.setPadding(8, 10, 8, 10);
  addText(band, r.ev.title, Font.boldSystemFont(big ? 15 : 13), KVIT, { lines: big ? 1 : 2, scale: 0.8 });
  band.addSpacer();
  if (EMOJI[r.ev.art]) addText(band, EMOJI[r.ev.art], Font.systemFont(big ? 22 : 18), KVIT);
  const body = p.addStack();
  body.layoutHorizontally();
  body.setPadding(4, 6, 8, 6);
  body.addSpacer();
  const col = body.addStack();
  col.layoutVertically();
  col.centerAlignContent();
  const n = col.addStack(); n.addSpacer(); addText(n, c.num, talFont(numSize(c.num, big)), r.st.phase === 'today' || (r.st.phase === 'down' && r.st.days <= 7) ? RAUD : BLEKK, { lines: 1, scale: 0.5 }); n.addSpacer();
  const u = col.addStack(); u.addSpacer(); addText(u, c.unit, Font.semiboldSystemFont(12), BLEKK, { lines: 1 }); u.addSpacer();
  const w = col.addStack(); w.addSpacer(); addText(w, c.extra || c.when, c.extra ? Font.boldSystemFont(11) : Font.systemFont(11), c.extra ? RAUD : BLEKK2, { lines: 1, scale: 0.8 }); w.addSpacer();
  body.addSpacer();
  return p;
}

function row(parent, r) {
  const s = parent.addStack();
  s.layoutHorizontally();
  s.centerAlignContent();
  s.spacing = 8;
  const dot = s.addStack();
  dot.size = new Size(28, 28);
  dot.cornerRadius = 7;
  dot.backgroundColor = colorOf(r.ev);
  dot.centerAlignContent();
  addText(dot, EMOJI[r.ev.art] || '', Font.systemFont(15), KVIT);
  const txt = s.addStack();
  txt.layoutVertically();
  addText(txt, r.ev.title, Font.semiboldSystemFont(13), BLEKK, { lines: 1 });
  addText(txt, shortText(r.ev, r.st), Font.systemFont(11), BLEKK2, { lines: 1 });
  s.addSpacer();
  addText(s, r.st.phase === 'today' ? 'I dag' : fmt(r.st.days), talFont(22), r.st.phase === 'today' ? RAUD : BLEKK, { lines: 1 });
}

function message(w, title, text) {
  w.backgroundColor = PAPIR;
  w.setPadding(14, 14, 14, 14);
  addText(w, title, Font.boldSystemFont(14), BLEKK);
  w.addSpacer(4);
  addText(w, text, Font.systemFont(12), BLEKK2, { scale: 0.8 });
}

function build(rows, today, family) {
  const w = new ListWidget();
  w.url = APP;
  if (family === 'accessoryInline') {
    const r = rows[0];
    addText(w, r ? `${EMOJI[r.ev.art] || ''} ${r.ev.title} ${shortText(r.ev, r.st)}`.trim() : 'Ingen nedteljingar', Font.systemFont(12), KVIT);
    return w;
  }
  if (family === 'accessoryCircular') {
    const r = rows[0];
    w.addAccessoryWidgetBackground = true;
    const a = w.addStack(); a.addSpacer(); addText(a, r ? (r.st.phase === 'today' ? '🎉' : fmt(r.st.days)) : '–', talFont(22), KVIT, { lines: 1, scale: 0.5 }); a.addSpacer();
    const b = w.addStack(); b.addSpacer(); addText(b, r ? EMOJI[r.ev.art] || r.ev.title : '', Font.systemFont(11), KVIT, { lines: 1, scale: 0.7 }); b.addSpacer();
    return w;
  }
  if (family === 'accessoryRectangular') {
    const r = rows[0];
    if (!r) { addText(w, 'Ingen nedteljingar', Font.systemFont(13), KVIT); return w; }
    const c = card(r.ev, r.st, today);
    addText(w, `${EMOJI[r.ev.art] || ''} ${r.ev.title}`.trim(), Font.boldSystemFont(13), KVIT, { lines: 1 });
    addText(w, r.st.phase === 'today' ? 'I dag er dagen' : `${c.num} ${c.unit}`, talFont(20), KVIT, { lines: 1, scale: 0.7 });
    addText(w, c.extra || c.when, Font.systemFont(11), KVIT, { lines: 1, scale: 0.8 });
    return w;
  }
  if (!rows.length) {
    message(w, 'Ingen nedteljingar enno', 'Legg til ein bursdag eller jula i Dagteljar, så kjem ho her.');
    return w;
  }
  w.backgroundColor = GRUNN;
  if (family === 'small') {
    w.setPadding(0, 0, 0, 0);
    w.backgroundColor = PAPIR;
    const p = page(w, rows[0], today, false);
    p.cornerRadius = 0;
    w.addSpacer();
    return w;
  }
  w.setPadding(12, 12, 12, 12);
  if (family === 'medium') {
    const h = w.addStack();
    h.layoutHorizontally();
    h.spacing = 12;
    const left = h.addStack();
    left.size = new Size(124, 0);
    page(left, rows[0], today, false);
    const right = h.addStack();
    right.layoutVertically();
    right.spacing = 8;
    rows.slice(1, 4).forEach(r => row(right, r));
    right.addSpacer();
    return w;
  }
  // Stor: neste øvst, resten som liste under.
  page(w, rows[0], today, true);
  w.addSpacer(10);
  const list = w.addStack();
  list.layoutVertically();
  list.spacing = 8;
  rows.slice(1, 6).forEach(r => row(list, r));
  w.addSpacer();
  return w;
}

// ---------- Henting, med lagra kopi når det ikkje er nett ----------
async function load() {
  const fm = FileManager.local();
  const file = fm.joinPath(fm.documentsDirectory(), 'dagteljar-widget.json');
  try {
    const req = new Request(`${API}/widget/${NOKKEL}`);
    req.timeoutInterval = 15;
    const data = await req.loadJSON();
    const code = req.response && req.response.statusCode;
    if (code === 404) return { gone: true };
    if (code === 200 && Array.isArray(data.hendingar)) {
      fm.writeString(file, JSON.stringify(data.hendingar));
      return { list: data.hendingar };
    }
  } catch (e) { /* ingen nett: bruk kopien */ }
  if (fm.fileExists(file)) {
    try { return { list: JSON.parse(fm.readString(file)) }; } catch (e) { /* øydelagd kopi */ }
  }
  return { offline: true };
}

const now = new Date();
const today = dateOnly(now);
const family = config.widgetFamily || 'medium';
const res = await load();
let widget;
if (res.gone) {
  widget = new ListWidget();
  message(widget, 'Lenkja er slått av', 'Lag ein ny widget-kode i Dagteljar under Konto, og lim han inn i Scriptable på nytt.');
} else if (res.offline) {
  widget = new ListWidget();
  message(widget, 'Dagteljar', 'Fekk ikkje henta nedteljingane. Sjekk nettet.');
} else {
  const list = res.list.filter(ev => ev && typeof ev.title === 'string');
  widget = build(pick(list, today, (args.widgetParameter || '').trim()), today, family);
}
// Oppdater ved midnatt, så tala stemmer, og elles om lag kvar halvtime.
widget.refreshAfterDate = new Date(Math.min(addDays(today, 1).getTime() + 60e3, now.getTime() + 30 * 60e3));

if (config.runsInWidget) Script.setWidget(widget);
else await widget.presentMedium();
Script.complete();
