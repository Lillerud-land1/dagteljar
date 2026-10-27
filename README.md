# Dagteljar

Tel ned til bursdagar, jul og Halloween, og tel dagar sidan noko fint skjedde. Nedteljingane kan gjentakast kvar veke, kvar månad eller kvart år, og kvar av dei kan ha eige bilete og eigen farge.

**Opne appen:** https://lillerud-land1.github.io/dagteljar/

## Installere som app

- **iPhone (Safari):** opne lenkja, trykk på Del-knappen og vel «Legg til på Heim-skjerm».
- **Android (Chrome):** opne lenkja, trykk på menyen (tre prikkar) og vel «Installer app».
- **PC (Chrome eller Edge):** trykk på installer-ikonet til høgre i adressefeltet.

## Konto og synk

Utan konto blir nedteljingane lagra berre på eininga du brukar. Trykk på person-knappen øvst og lag ein konto med namn og passord, og logg inn med det same på PC-en og telefonen, så ser du dei same nedteljingane og bileta overalt. Nedteljingar som alt låg på eininga, blir flytta inn på kontoen. Det finst ingen «gløymt passord», så skriv passordet ned.

## Bilete

Kvar nedteljing kan ha ein ferdig illustrasjon (kake, gåve, ballongar, juletre, graskar, fyrverkeri, flagg, påskeegg, sankthansbål, hjarte, pote, sol og strand) eller eit eige bilete. Appen vel ein illustrasjon av seg sjølv ut frå namnet, til dømes kake for «Bursdag til Emma».

## Filer

- `dagteljar.html`: kjelda til appen (same fil blir publisert på claude.ai).
- `bygg.sh`: lagar `index.html` frå kjelda. Køyr han etter kvar endring, og auk `CACHE` i `sw.js`.
- `manifest.webmanifest`, `sw.js`, `icons/`: det som gjer sida installerbar og brukande utan nett.
- `worker/`: serveren for kontoar og synk (Cloudflare Worker med D1-database, `https://dagteljar.brannlogg-admin.workers.dev`). Passorda blir lagra som PBKDF2-hash. Legg ut endringar med `npx wrangler deploy` i `worker/`. Lokal test: `npx wrangler dev --port 8787` (appen på `localhost` brukar han automatisk) og `npx wrangler d1 execute dagteljar --local --file schema.sql` første gongen.
