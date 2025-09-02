# 🚀 MetaShipX – Battleship Clasic Web3 dApp pe MultiversX (Supernova)

[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![MultiversX](https://img.shields.io/badge/Built%20with-MultiversX-00ff87)](https://multiversx.com/)

O dApp blockchain inovatoare pentru gaming competitiv, cooperativ & reward pooling, cu boss fight, NFT, AI și prize pool transparent, construit pentru viitorul play&earn.

## 🎮 Descriere

MetaShipX reinventează jocul Battleship într-un format Web3, unde:
- Navele sunt NFT-uri unice, cu caracteristici speciale
- Scorurile și atacurile sunt înregistrate pe blockchain
- Modul "Boss Fight" aduce elemente de cooperare și strategie
- Sistem transparent de recompense on-chain
- Integrare AI pentru jucători single-player

## 🏗️ Structură Proiect

```
MetaShipX/
├── contracts/          # Smart contract-uri în Rust
│   ├── battleship/     # Logica de bază a jocului
│   ├── nft/            # Contracte NFT pentru nave
│   └── staking/        # Sistemul de reward-uri și staking
│
├── frontend/           # Aplicația web (React + TypeScript)
│   ├── public/         # Resurse statice
│   ├── src/
│   │   ├── components/ # Componente React
│   │   ├── pages/      # Paginile aplicației
│   │   ├── services/   # Servicii API și blockchain
│   │   └── styles/     # Stiluri globale
│   └── package.json
│
├── assets/             # Resurse grafice
│   ├── nfts/           # Modele 3D și imagini pentru NFT-uri
│   ├── images/         # Imagini pentru UI/UX
│   └── avatars/        # Avatare personalizate
│
├── tests/              # Teste automate
│   ├── unit/           # Teste unitare
│   ├── integration/    # Teste de integrare
│   └── e2e/            # Teste end-to-end
│
├── scripts/            # Script-uri de automatizare
│   ├── ai/             # Script-uri pentru AI
│   └── analytics/      # Analize și statistici
│
├── UML/                # Diagrame de arhitectură
├── docs/               # Documentație
│   ├── guides/         # Ghiduri de utilizare
│   └── api/            # Documentație API
├── .env.example        # Configurare mediu
└── README.md
```

## 🛠️ Tehnologii

### Frontend
- **Framework**: React 18+ cu TypeScript
- **UI Library**: Chakra UI + Tailwind CSS
- **State Management**: Redux Toolkit
- **Blockchain**: @multiversx/sdk-dapp v5+
- **Build Tool**: Vite.js

### Backend (Smart Contracts)
- **Limbaj**: Rust
- **Framework**: MultiversX Rust Framework
- **Testare**: multiversx-sc-scenario

### Alte unelte
- **Version Control**: Git
- **CI/CD**: GitHub Actions
- **Testare**: Jest, React Testing Library
- **Linting/Formatare**: ESLint, Prettier

## 🚀 Rulare Locală

### Cerințe preliminare
- Node.js 18+
- Rust (latest stable)
- MultiversX CLI
- Git

### Instalare

1. Clonează repository-ul:
```bash
git clone https://github.com/yourusername/MetaShipX.git
cd MetaShipX
```

2. Instalare dependințe frontend:
```bash
cd frontend
npm install
```

3. Configurare variabile de mediu:
```bash
cp .env.example .env
# Editează fișierul .env cu datele tale
```

4. Pornește aplicația:
```bash
npm run dev
```

## 🎮 Funcționalități Cheie

- **Login Web3** - Conectare sigură cu portofel MultiversX
- **Battleship PvP/PvE** - Joacă împotriva altor jucători sau AI
- **Boss Fight Co-op** - Modează-ți echipa și luptă împotriva boss-urilor puternice
- **Sistem de Recompense** - Primește EGLD și NFT-uri pentru performanță
- **Leaderboard** - Urmărește-ți poziția în clasamentul global

## 🤝 Contribuții

Contribuțiile sunt binevenite! Vă rugăm să citiți [ghidul de contribuție](docs/guides/CONTRIBUTING.md) pentru detalii despre cum să vă implicați.

## 📜 Licență

Acest proiect este licențiat sub licența MIT - vezi fișierul [LICENSE](LICENSE) pentru detalii.

## ✨ Mulțumiri

- Echipă MultiversX pentru suportul oferit
- Comunitatea pentru feedback și sugestii
- Toți contributorii care au adus la viață acest proiect