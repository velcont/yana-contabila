# YANA Local Agent

Permite Yanei (rulează în cloud) să citească/scrie fișiere și să execute comenzi pe **laptopul tău**.

## Cum funcționează

```
 YANA cloud  ──►  bridge edge function  ──◄──  agent.mjs (rulează pe Mac)
```

Agentul tău întreabă bridge-ul la fiecare 2 secunde "ai comenzi pentru mine?".
Când YANA are nevoie să facă ceva local, scrie comanda în coadă, iar agentul o execută.

## Cerințe

- Node.js 18+ instalat (`node --version`)
- Un cont YANA activ

## Pașii de instalare

### 1. Descarcă agent-ul

```bash
curl -o ~/yana-agent.mjs https://yana-contabila.lovable.app/yana-local-agent/agent.mjs
```

### 2. Generează un cod de împerechere

- Deschide [/yana](https://yana-contabila.lovable.app/yana) → **Settings** → **Conectare laptop**
- Apasă **"Generează cod"** — primești 6 cifre, valabile 10 minute.

### 3. Pornește agent-ul și introdu codul

```bash
node ~/yana-agent.mjs
```

La prima rulare îți cere codul. Token-ul persistent se salvează în
`~/.yana-local-agent.json` (mod 600 — doar tu poți citi).

### 4. Lasă-l să ruleze

Agentul afișează `👂 Ascult comenzi de la YANA...`.
În /yana poți cere acum:
- *"Citește ~/Documents/factura.pdf și spune-mi ce conține"*
- *"Listează fișierele din ~/Desktop"*
- *"Rulează `git status` în ~/projects/contab"*
- *"Creează ~/raport.md cu un rezumat al lunii"*

## Securitate ⚠️

Conform setării alese (**Trust total după pairing**):
- Agentul execută **orice** comandă primită de la YANA fără confirmare
- Are aceleași drepturi ca utilizatorul care l-a pornit
- **NU** rula pe un Mac cu date sensibile la care nu vrei ca YANA să aibă acces
- Pentru oprire: `Ctrl+C`. Pentru revocare permanentă: șterge dispozitivul din /yana → Settings.

## Comenzi suportate

| Tool                | Descriere                            |
| ------------------- | ------------------------------------ |
| `local_fs_read`     | Citește un fișier (max 200 KB)       |
| `local_fs_write`    | Scrie/înlocuiește un fișier          |
| `local_fs_list`     | Listează un folder                   |
| `local_bash_exec`   | Rulează o comandă bash (timeout 30s) |

## Troubleshooting

- **"Token invalid sau revocat"** → Ai șters dispozitivul din UI. Șterge `~/.yana-local-agent.json` și re-pairează.
- **"Pairing code expirat"** → Generează unul nou (valabil 10 min).
- **YANA spune "agentul local pare offline"** → Verifică terminalul în care rulează `node agent.mjs`.