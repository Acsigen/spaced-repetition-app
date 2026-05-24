# Vocabular spaniol SRS

Aplicație Fresh 2 + Preact pentru vocabular spaniol, cu interfață în română,
persistență locală în Deno KV și programare FSRS prin `ts-fsrs@5.4.1`.

## Rulare locală

```sh
deno task dev
```

Serverul de dezvoltare ascultă implicit pe `127.0.0.1`. Aplicația nu are login
intern: protejează ruta publică în Pangolin sau într-un proxy echivalent dacă o
expui în afara mașinii locale.

Datele sunt salvate în `./data/spanish-srs.kv`, sau în calea din `KV_PATH`.

## Producție

```sh
deno task build
deno task start
```

Pentru container:

```sh
docker compose up --build
```

Stackul Docker Compose construiește imaginea, rulează serviciul one-shot
`spanish-srs-test` cu `deno task verify`, apoi pornește `spanish-srs` doar dacă
verificările au trecut.

Containerul runtime folosește volumul `/data` și `KV_PATH=/data/spanish-srs.kv`.
Setează `PUBLIC_ORIGIN` la originea publică protejată de Pangolin, de exemplu
`https://spanish.example.com`; cererile API mutante cu `Origin` diferit sunt
respinse.

Pentru a rula doar poarta de test:

```sh
docker compose run --rm spanish-srs-test
```

## Verificări

```sh
deno fmt --check
deno lint
deno task check
deno task test
```
