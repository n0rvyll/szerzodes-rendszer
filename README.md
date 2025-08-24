# Szerződés Tablet Rendszer

Egy modern, Next.js-alapú szerződéskezelő rendszer, amely lehetővé teszi PDF dokumentumok feltöltését, megosztását, adminisztrációját és digitális visszajelzését. A rendszer célja, hogy egyszerűen, biztonságosan és gyorsan kezelje a szerződéskötési folyamatokat tableten vagy asztali gépen.

## Fő funkciók

- **Admin felület**: Jogosult felhasználók számára elérhető, védett bejelentkezéssel
- **PDF feltöltés és megosztás**: Dokumentumok kezelése, link generálás
- **E-mail és SMS értesítések**: Automatikus értesítések küldése
- **Visszajelzés kezelése**: Linkek visszavonása, státusz követése
- **Reszponzív, modern UI**: Tailwind CSS alapú, letisztult felület

## Technológia

- **Next.js (App Router, SSR/ISR)**
- **TypeScript**
- **Tailwind CSS**
- **Node.js API route-ok**
- **.env alapú konfiguráció**

## Architektúra

```
Felhasználó
   │
   ▼
[Next.js Frontend]
   │        │
   │        └── [API Route-ok] ──► [Auth / PDF / E-mail / SMS logika]
   │                                 │
   │                                 └── [uploads/ könyvtár] (PDF fájlok)
   │
   └── [Admin UI] ──► [Bejelentkezés] ──► [Session Cookie]
```

## Telepítés

1. Repository klónozása:
   ```sh
   git clone <repo-url>
   cd szerzodes-rendszer
   ```
2. Függőségek telepítése:
   ```sh
   npm install
   ```
3. `.env` fájl létrehozása a gyökérben (példa lentebb)
4. Fejlesztői szerver indítása:
   ```sh
   npm run dev
   ```

## Példa .env fájl

```
ADMIN_USER=admin
ADMIN_PASS=password
AUTH_SECRET=valamiTitkosKulcs
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=no-reply@localhost
NEXT_PUBLIC_BASE_URL=http://localhost:3000
BASE_URL=http://localhost:3000
LINK_EXPIRES_HOURS=24
NEXT_UPLOADS_DIR=uploads
PORT=3000
NODE_ENV=development
```

## Főbb mappák

- `app/` – Next.js oldalak, API route-ok, logika
- `components/` – Újrahasznosítható React komponensek
- `public/` – Statikus fájlok (pl. ikonok, pdf worker)
- `uploads/` – Feltöltött PDF dokumentumok

## Fejlesztői tippek

- A bejelentkezéshez az `.env`-ben megadott admin adatokat használd.
- SMTP beállítások nélkül az e-mail funkciók nem működnek.
- A PDF fájlok az `uploads/` mappába kerülnek.
