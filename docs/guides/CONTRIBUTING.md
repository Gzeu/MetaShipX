# Ghid de Contribuție

Vă mulțumim că doriți să contribuiți la MetaShipX! Acest ghid vă va ajuta să vă integrați în comunitate și să contribuiți eficient la proiect.

## 🛠 Cum să începeți

1. **Fork** repository-ul
2. **Clonează** fork-ul tău local:
   ```bash
   git clone https://github.com/yourusername/MetaShipX.git
   cd MetaShipX
   ```
3. Adaugă repository-ul original ca remote:
   ```bash
   git remote add upstream https://github.com/original/MetaShipX.git
   ```
4. Creează o nouă ramură pentru funcționalitatea ta:
   ```bash
   git checkout -b feature/nume-feature
   ```

## 🔧 Proces de Dezvoltare

### Codarea
- Urmați standardele de codare existente
- Scrieți cod curat, documentat și testat
- Păstrați commit-urile mici și cu scop clar

### Testarea
- Rulați testele înainte de a trimite un PR
- Adăugați teste pentru noile funcționalități
- Asigurați-vă că toate testele trec

### Documentația
- Actualizați documentația pentru modificările majore
- Adăugați comentarii pentru codul complex
- Actualizați fișierul CHANGELOG.md dacă este cazul

## 📝 Trimiterea Pull Request-urilor

1. Asigurați-vă că branch-ul dumneavoastră este actualizat cu `main`
   ```bash
   git pull upstream main
   ```
2. Rezolvați eventualele conflicte
3. Rulați testele din nou
4. Trimiteți un PR către branch-ul `main`
5. Completați template-ul PR-ului cu toate detaliile necesare

## 🏷 Standarde pentru Commit-uri

Folosiți următorul format pentru commit-uri:

```
tip(scope): descriere scurtă

[Descriere mai detaliată dacă este necesară]

Fixes #issue-number
```

Tipuri de commit-uri acceptate:
- `feat`: O nouă funcționalitate
- `fix`: O corectare de bug
- `docs`: Modificări la documentație
- `style`: Formatare, puncte și virgule lipsă, etc.
- `refactor`: Refactorizare cod existent
- `test`: Adăugare sau modificare teste
- `chore`: Actualizări la task-uri de build, manager de pachete, etc.

## 📜 Codul de Conduită

Acest proiect urmează [Codul de Conduită al Contribuitorilor](CODE_OF_CONDUCT.md). Prin participare, sunteți de acord să respectați termenii acestuia.

## ❓ Întrebări?

Dacă aveți întrebări, deschideți un issue sau contactați-ne pe [Discord](link-invitatie-discord).

Vă mulțumim pentru contribuția dumneavoastră! 🚀
