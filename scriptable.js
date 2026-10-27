// Dagteljar-widget for Scriptable (https://scriptable.app)
// Viser nedteljingane frå Dagteljar-kontoen din på startskjermen og låseskjermen.
// Skriptet hentar den nyaste widget-koden frå Dagteljar kvar gong, så du slepp å lime inn på nytt
// når widgeten blir betre. Lenkja under kan berre lese nedteljingane, og ho kan slåast av i Dagteljar under Konto.

const NOKKEL = '__NOKKEL__';
const API = '__API__';
const KODE = '__KODE__';

const fm = FileManager.local();
const fil = fm.joinPath(fm.libraryDirectory(), 'dagteljar-widget-kode.js');
try {
  const req = new Request(KODE + '?t=' + Date.now());
  req.timeoutInterval = 15;
  const kode = await req.loadString();
  if (req.response.statusCode === 200 && kode.includes('dagteljar-widget-kode')) fm.writeString(fil, kode);
} catch (e) { /* ingen nett: bruk koden frå sist */ }

if (fm.fileExists(fil)) {
  await importModule(fil).run(NOKKEL, API);
} else {
  const w = new ListWidget();
  const t = w.addText('Dagteljar: fekk ikkje henta widgeten. Sjekk nettet og prøv igjen.');
  t.font = Font.systemFont(12);
  if (config.runsInWidget) Script.setWidget(w);
  else await w.presentSmall();
  Script.complete();
}
