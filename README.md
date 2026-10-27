# Dagteljar

Tel ned til bursdagar, jul og Halloween, og tel dagar sidan noko fint skjedde. Nedteljingane kan gjentakast kvar veke, kvar månad eller kvart år, og kvar av dei kan ha eige bilete og eigen farge.

**Opne appen:** https://lillerud-land1.github.io/dagteljar/

## Installere som app

- **iPhone (Safari):** opne lenkja, trykk på Del-knappen og vel «Legg til på Heim-skjerm».
- **Android (Chrome):** opne lenkja, trykk på menyen (tre prikkar) og vel «Installer app».
- **PC (Chrome eller Edge):** trykk på installer-ikonet til høgre i adressefeltet.

## Konto og synk

Utan konto blir nedteljingane lagra berre på eininga du brukar. Trykk på person-knappen øvst og lag ein konto med namn og passord, og logg inn med det same på PC-en og telefonen, så ser du dei same nedteljingane og bileta overalt. Nedteljingar som alt låg på eininga, blir flytta inn på kontoen. Det finst ingen «gløymt passord», så skriv passordet ned.

## Oppdatere

Dra ned øvst på sida på telefonen, eller trykk på pil-knappen øvst på PC-en. Då hentar appen det som er lagt inn på andre einingar, og om det finst ein ny versjon av appen, blir han lasta med ein gong. Når du opnar appen att frå bakgrunnen, hentar han ny versjon av seg sjølv.

## Widget på iPhone

Logg inn, trykk på person-knappen og vel «Kopier widget-koden». Lim koden inn i den gratis appen [Scriptable](https://apps.apple.com/app/scriptable/id1405459188), og legg til ein Scriptable-widget på startskjermen eller låseskjermen. Skriv eit namn, til dømes Halloween, i «Parameter» for å vise éi bestemt nedteljing. Koden kan berre lese nedteljingane, og «Slå av widget-lenkjene» stoppar alle widgetane.

## Bilete

Kvar nedteljing kan ha ein ferdig illustrasjon (kake, gåve, ballongar, juletre, graskar, fyrverkeri, flagg, påskeegg, sankthansbål, hjarte, pote, sol og strand) eller eit eige bilete. Appen vel ein illustrasjon av seg sjølv ut frå namnet, til dømes kake for «Bursdag til Emma».

## Filer

- `dagteljar.html`: kjelda til appen (same fil blir publisert på claude.ai).
- `bygg.sh`: lagar `index.html` og `versjon.txt` frå kjelda. Køyr han etter kvar endring. Auk `CACHE` i `sw.js` når du endrar `sw.js` eller filene i `SHELL`.
- `scriptable.js`: det korte skriptet som blir lima inn i Scriptable. Appen set inn ein lenkje-nøkkel som berre kan lese, før han kopierer det. Skriptet hentar `widget-kode.js` (sjølve widgeten) kvar gong, så endringar der når alle widgetar utan ny innliming.
- `manifest.webmanifest`, `sw.js`, `icons/`: det som gjer sida installerbar og brukande utan nett.
- `worker/`: serveren for kontoar og synk (Cloudflare Worker med D1-database, `https://dagteljar.brannlogg-admin.workers.dev`). Passorda blir lagra som PBKDF2-hash. Legg ut endringar med `npx wrangler deploy` i `worker/`. Lokal test: `npx wrangler dev --port 8787` (appen på `localhost` brukar han automatisk) og `npx wrangler d1 execute dagteljar --local --file schema.sql` første gongen.
