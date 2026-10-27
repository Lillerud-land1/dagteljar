#!/usr/bin/env bash
# Byggjer index.html (GitHub Pages / installerbar app) frå dagteljar.html (kjelda som òg blir publisert på claude.ai).
set -euo pipefail
cd "$(dirname "$0")"

# Versjonen endrar seg når kjelda gjer det. Appen samanliknar han med versjon.txt for å hente ny versjon utan omstart.
VERSJON=$(cat dagteljar.html bygg.sh | sha1sum | cut -c1-12)

{
  cat <<'HEAD'
<!doctype html>
<html lang="nn">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="description" content="Tel ned til bursdagar, jul og Halloween, og tel dagar sidan noko fint skjedde.">
<meta name="theme-color" content="#E5E8ED" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0E1117" media="(prefers-color-scheme: dark)">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Dagteljar">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="dagteljar-versjon" content="__VERSJON__">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" type="image/png" sizes="32x32" href="icons/favicon-32.png">
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">
<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style>
</head>
<body>
HEAD
  cat dagteljar.html
  cat <<'TAIL'
<script>
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
</script>
</body>
</html>
TAIL
} | sed "s/__VERSJON__/$VERSJON/" > index.html
echo "$VERSJON" > versjon.txt

echo "Bygde index.html (versjon $VERSJON)"
