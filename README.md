<p align="center">
  <img src="demo.gif" alt="Demo FitManage WebApp" width="800"/>
</p>
# Gymnica Fitness Club — Web App (Public Clean Version)

**IT (Italiano)**  
Questo repository contiene la **versione pubblica pulita** della mia web app per la gestione di una palestra/fitness club.  
Il codice è **completo lato frontend** e **backend Flask**, ma **tutti i dati personali** (email, PEC, telefono, indirizzo, link social, codice fiscale, ecc.) sono stati sostituiti da **placeholder** come `INSERISCI_EMAIL`, `INSERISCI_URL`, `INSERISCI_TELEFONO`.

> La versione privata in produzione utilizza dati reali e variabili d'ambiente non incluse in questo repository.

## Funzionalità principali
- **Lato utente:** registrazione/login, visualizzazione corsi e informazioni.
- **Lato admin:** gestione iscritti, pagamenti, caricamento file (es. PDF), totali mensili, promemoria pagamenti.
- **Stack:** Flask (Python), HTML/CSS/JS, PostgreSQL (in produzione), Render (deploy).

## Come eseguire in locale
1. Crea l'ambiente virtuale e installa le dipendenze:
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # su Windows: .venv\Scripts\activate
   pip install -r backend/requirements.txt
   ```
2. (Opzionale) Copia `.env.example` in `.env` e personalizza i campi BRAND/contatti:
   ```bash
   cp .env.example .env
   ```
3. Avvia l'app in locale:
   ```bash
   python backend/app.py
   # Apri http://localhost:5000 (admin su /admin)
   ```

## Sicurezza / Privacy
- Questo repository non contiene dati personali reali.
- Tutti i contatti/indirizzi/social sono esposti come placeholder (`INSERISCI_*`).  
- Per l'uso in produzione, definire variabili d'ambiente e credenziali sicure.

---

**EN (English)**  
This repository contains the **public clean** version of my gym/fitness club management web app.  
The code is **complete on frontend** and **Flask backend**, but all **personal data** (email, PEC, phone, address, social links, fiscal codes, etc.) have been replaced with **placeholders** like `INSERISCI_EMAIL`, `INSERISCI_URL`, `INSERISCI_TELEFONO`.

> The private production version uses real data and environment variables that are not included here.

## Main Features
- **User side:** registration/login, courses and info pages.
- **Admin side:** members/payments management, file uploads (e.g. PDFs), monthly totals, payment reminders.
- **Stack:** Flask (Python), HTML/CSS/JS, PostgreSQL (production), Render (deploy).

## Run locally
1. Create venv and install deps:
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # Windows: .venv\Scripts\activate
   pip install -r backend/requirements.txt
   ```
2. (Optional) Copy `.env.example` to `.env` and customize BRAND/contact placeholders.
3. Start the app:
   ```bash
   python backend/app.py
   # Open http://localhost:5000 (admin at /admin)
   ```

## Security / Privacy
- No real personal data are included.
- All contacts/addresses/social links are placeholders (`INSERISCI_*`).  
- For production, provide real environment variables and secure credentials.

