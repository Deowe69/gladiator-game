# Ikonky předmětů

Sem stačí nakopírovat obrázky. Kód je najde sám — **nic se nemusí přepisovat**.
Když soubor chybí, hra automaticky použije emoji jako dosud.

## Kam a jak pojmenovat

### `img/items/` — ikonky konkrétních předmětů
Název souboru = **id předmětu** + `.png`

| soubor | předmět |
|---|---|
| `w1.png` | Bronzový Meč |
| `w2.png` | Železný Kopí |
| `w3.png` | Ocelová Kosa |
| `w4.png` | Meč Achillea |
| `w5.png` | Luk Artemidy |
| `a1.png` | Kožená Zbroj |
| `a2.png` | Bronzová Zbroj |
| `a3.png` | Athénin Štít |
| `a4.png` | Zbroj Spartana |
| `h1.png` | Korintská Helma |
| `h2.png` | Helma Heros |
| `g1.png` | Kožené Rukavice |
| `g2.png` | Železné Rukavice |
| `b1.png` | Běžné Boty |
| `b2.png` | Hermovy Boty |
| `b3.png` | Kožený Pás |
| `m1.png` | Hermův Amulet |
| `m2.png` | Apollónův Prsten |
| `m4.png` | Afroditin Amulet |
| `m5.png` | Zeusův Prsten |
| `p1.png` | Malý Lektvar |
| `p2.png` | Střední Lektvar |
| `p3.png` | Ambrózie Bohů |
| `p4.png` | Nektár Olimpu |

### `img/slots/` — obrázky prázdných slotů (nepovinné)
Název souboru = **klíč slotu** + `.png`

`weapon.png`, `helmet.png`, `chest.png`, `shield.png`,
`gloves.png`, `boots.png`, `ring.png`, `amulet.png`, `belt.png`

## Doporučení k obrázkům

- **Formát:** PNG s průhledným pozadím (funguje i `.jpg`, ale bez průhlednosti)
- **Velikost:** 64×64 px stačí; zbraně můžou být na výšku, např. 64×128 px
- **Poměr stran** se zachová — obrázek se do slotu vepíše, nedeformuje se

## Kde se ikonky zobrazí

- sloty vybavení v Přehledu
- políčka v batohu
- karty předmětů v obchodě
