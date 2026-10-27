-- Databasen til Dagteljar-synken (Cloudflare D1).
CREATE TABLE IF NOT EXISTS brukarar (
  namn  TEXT PRIMARY KEY,
  salt  TEXT NOT NULL,
  hash  TEXT NOT NULL,
  iter  INTEGER NOT NULL,
  laga  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS okter (
  tokenhash TEXT PRIMARY KEY,
  namn      TEXT NOT NULL,
  laga      INTEGER NOT NULL,
  sist      INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS okter_namn ON okter(namn);

CREATE TABLE IF NOT EXISTS hendingar (
  namn  TEXT NOT NULL,
  id    TEXT NOT NULL,
  data  TEXT NOT NULL,
  endra INTEGER NOT NULL,
  PRIMARY KEY (namn, id)
);

CREATE TABLE IF NOT EXISTS bilete (
  id    TEXT PRIMARY KEY,
  namn  TEXT NOT NULL,
  type  TEXT NOT NULL,
  data  BLOB NOT NULL,
  laga  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS bilete_namn ON bilete(namn);

-- Lenkjer som berre kan lese nedteljingane, til widgeten på startskjermen. Berre hashen blir lagra.
CREATE TABLE IF NOT EXISTS widgetnoklar (
  hash  TEXT PRIMARY KEY,
  namn  TEXT NOT NULL,
  laga  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS widgetnoklar_namn ON widgetnoklar(namn, laga);

CREATE TABLE IF NOT EXISTS forsok (
  namn TEXT NOT NULL,
  ts   INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS forsok_namn ON forsok(namn, ts);
