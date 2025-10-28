// ========================
// VARIABILI GLOBALI
// ========================
const homeContainer = document.getElementById("homeContainer");
const registerSection = document.getElementById("registerSection");
const loginSection = document.getElementById("loginSection");
const areaSection = document.getElementById("areaSection");
const logoutBtn = document.getElementById("logoutBtn");
const showCorsiBtn = document.getElementById("showCorsi");
const registerMessage = document.getElementById("registerMessage");
const loginMessage = document.getElementById("loginMessage");
const corsiList = document.getElementById("corsiList");
const baseURL = window.location.origin;
// Timer login globale
let loginTimerInterval = null;
let loginEndTime = null;

// ========================
// MOSTRA SEZIONI
// ========================

// Mostra/nasconde lista corsi
showCorsiBtn.addEventListener("click", () => {
    corsiList.style.display = (corsiList.style.display === "none") ? "block" : "none";
});

// Mostra/nasconde info dei corsi
document.querySelectorAll(".corsoBtn").forEach(btn => {
    btn.addEventListener("click", () => {
        const info = btn.nextElementSibling;
        info.style.display = (info.style.display === "none") ? "block" : "none";
    });
});

// BODYBUILDING: gestione bottoni tariffe
const bodyBtn = Array.from(document.querySelectorAll(".corsoBtn"))
                     .find(btn => btn.textContent.trim() === "BODYBUILDING");

if (bodyBtn) {
    const bodyInfo = bodyBtn.nextElementSibling;
    const baseInfo = bodyInfo.querySelector(".baseInfo");
    const lightInfo = bodyInfo.querySelector(".lightInfo");
    const morningInfo = bodyInfo.querySelector(".morningInfo");

    // Nascondi inizialmente
    [baseInfo, lightInfo, morningInfo].forEach(div => div.style.display = "none");

    bodyInfo.querySelectorAll(".tariffaBtn").forEach(tBtn => {
        tBtn.addEventListener("click", () => {
            const tariffa = tBtn.dataset.tariffa;
            baseInfo.style.display = tariffa === "base" ? "block" : "none";
            lightInfo.style.display = tariffa === "light" ? "block" : "none";
            morningInfo.style.display = tariffa === "morning" ? "block" : "none";
        });
    });
}

document.getElementById("downloadPdfLink").addEventListener("click", (e) => {
    alert("Il PDF verrà scaricato.");
});

document.getElementById("safeGuardingLink").addEventListener("click", (e) => {
    alert("Il modulo Safe Guarding verrà scaricato.");
});

const mapLink = document.getElementById("mapLink");

mapLink.addEventListener("click", () => {
    mapLink.style.backgroundColor = "#FFD43B";
    mapLink.style.color = "#3D2B6D";
    
    setTimeout(() => {
        mapLink.style.backgroundColor = "";
        mapLink.style.color = "";
    }, 500);
});

const instaLink = document.getElementById("instaLink");

instaLink.addEventListener("click", (e) => {
    // Evidenzia il link temporaneamente
    instaLink.style.backgroundColor = "#FFD43B";
    instaLink.style.color = "#3D2B6D";
    
    setTimeout(() => {
        instaLink.style.backgroundColor = "";
        instaLink.style.color = "";
    }, 500);
});

const phoneLink = document.getElementById("phoneLink");

phoneLink.addEventListener("click", (e) => {
    // Evidenzia il link
    phoneLink.style.backgroundColor = "#FFD43B";
    phoneLink.style.color = "#3D2B6D";
    
    // Torna normale dopo mezzo secondo
    setTimeout(() => {
        phoneLink.style.backgroundColor = "";
        phoneLink.style.color = "";
    }, 500);
});

const emailLink = document.getElementById("emailLink");

emailLink.addEventListener("click", (e) => {
    // Evidenzia il link
    emailLink.style.backgroundColor = "#FFD43B";
    emailLink.style.color = "#3D2B6D";
    
    // Torna normale dopo mezzo secondo
    setTimeout(() => {
        emailLink.style.backgroundColor = "";
        emailLink.style.color = "";
    }, 500);
});


document.getElementById("showRegister").addEventListener("click", () => {
    homeContainer.style.display = "none";
    registerSection.style.display = "block";
});

document.getElementById("showLogin").addEventListener("click", () => {
    homeContainer.style.display = "none";
    loginSection.style.display = "block";
});

document.getElementById("backHomeFromRegister").addEventListener("click", () => {
    registerSection.style.display = "none";
    homeContainer.style.display = "flex";
});

document.getElementById("backHomeFromLogin").addEventListener("click", () => {
    loginSection.style.display = "none";
    homeContainer.style.display = "flex";
});

// ========================
// REGISTRAZIONE
// ========================
document.getElementById("registerForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const nome_cognome = document.getElementById("regNomeCognome").value.trim();
    const email = document.getElementById("regEmail").value.trim();
    const password = document.getElementById("regPassword").value;
    const phone = document.getElementById("regPhone").value.trim();
    const registerMessage = document.getElementById("registerMessage");

    // --- Controllo nome e cognome ---
    if (!nome_cognome) {
        registerMessage.style.color = "red";
        registerMessage.textContent = "Inserisci Nome e Cognome";
        return;
    }

    // --- Controllo password ---
    const pwdRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!pwdRegex.test(password)) {
        registerMessage.style.color = "red";
        registerMessage.textContent = "La password deve avere almeno 8 caratteri, una maiuscola, una minuscola e un numero.";
        return;
    }

    // --- Controllo telefono ---
    const phoneRegex = /^[0-9]{8,15}$/;
    if (!phoneRegex.test(phone)) {
        registerMessage.style.color = "red";
        registerMessage.textContent = "Numero di telefono non valido (solo numeri, 8-15 cifre).";
        return;
    }

    // --- Invio dati al backend ---
    try {
        const res = await fetch(`${baseURL}/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include", // <--- aggiunto per includere i cookie/sessione
            body: JSON.stringify({ nome_cognome, email, password, phone })
        });

        const data = await res.json();

        if (!res.ok) {
            registerMessage.style.color = "red";
            registerMessage.textContent = data.message;
        } else {
            registerMessage.style.color = "green";
            registerMessage.textContent = "Registrazione completata! Verrai avvisato via email quando la tua scheda sarà caricata.";
            showArea(nome_cognome);
        }

    } catch (err) {
        registerMessage.style.color = "red";
        registerMessage.textContent = "Errore di connessione!";
        console.error(err);
    }
});

// ========================
// LOGIN
// ========================
document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("loginInput").value.trim();
    const password = document.getElementById("loginPassword").value.trim();
    const loginMessage = document.getElementById("loginMessage");

    if (!email || !password) {
        loginMessage.style.color = "red";
        loginMessage.textContent = "Compila tutti i campi";
        return;
    }

    try {
        const res = await fetch(`${baseURL}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        // --- BLOCCO tentativi ---
        if (res.status === 429 && data.remaining_seconds) {
            if (loginTimerInterval) clearInterval(loginTimerInterval);
            loginEndTime = Date.now() + data.remaining_seconds * 1000;

            loginTimerInterval = setInterval(() => {
                const remaining = Math.max(0, Math.floor((loginEndTime - Date.now()) / 1000));
                const minutes = Math.floor(remaining / 60);
                const seconds = remaining % 60;

                if (remaining <= 0) {
                    clearInterval(loginTimerInterval);
                    loginTimerInterval = null;
                    loginMessage.textContent = "Puoi riprovare a fare login.";
                } else {
                    loginMessage.textContent = `Superato il numero di tentativi: attendi ${minutes}:${seconds < 10 ? '0'+seconds : seconds} minuti`;
                }
            }, 1000);

        } else if (!res.ok) {
            loginMessage.style.color = "red";
            loginMessage.textContent = data.message;
        } else {
            loginMessage.style.color = "green";
            loginMessage.textContent = data.message;
            showArea(data.nome_cognome); // usa nome_cognome restituito dal backend
        }

    } catch (err) {
        loginMessage.style.color = "red";
        loginMessage.textContent = "Errore di connessione!";
        console.error(err);
    }
});

document.getElementById("downloadSchedaLink").addEventListener("click", async (e) => {
    e.preventDefault(); 

    const msgDiv = document.getElementById("schedaMsg");
    msgDiv.textContent = "";
    msgDiv.style.color = "";

    try {
        const response = await fetch(`${baseURL}/scheda`, { credentials: "include" });

        const contentType = response.headers.get("Content-Type") || "";

        // Se la risposta è JSON, allora c'è un messaggio di errore
        if (contentType.includes("application/json")) {
            const data = await response.json();
            msgDiv.style.color = "red";
            msgDiv.textContent = data.message || "Nessun file disponibile";
            return; // Non fare il download
        }

        if (!response.ok) {
            msgDiv.style.color = "red";
            msgDiv.textContent = "Si è verificato un errore durante il download";
            return;
        }

        // Download del file
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;

        const disposition = response.headers.get("Content-Disposition");
        let filename = "scheda.pdf";
        if (disposition && disposition.includes("filename=")) {
            filename = disposition.split("filename=")[1].replace(/"/g, "").trim();
        }

        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);

        msgDiv.style.color = "green";
        msgDiv.textContent = "Scheda scaricata correttamente!";

    } catch (err) {
        console.error(err);
        msgDiv.style.color = "red";
        msgDiv.textContent = "Si è verificato un errore durante il download";
    }
});

// ========================
// AREA PERSONALE
// ========================
function showArea(username) {
    registerSection.style.display = "none";
    loginSection.style.display = "none";
    homeContainer.style.display = "none";
    areaSection.style.display = "block";
    document.getElementById("username").textContent = username;
    document.getElementById("downloadSchedaLink").href = `${baseURL}/scheda`;
}

// ========================
// LOGOUT
// ========================
logoutBtn.addEventListener("click", async () => {
    try {
        await fetch(`${baseURL}/logout`, {method: "POST", credentials: "include"});
        areaSection.style.display = "none";
        homeContainer.style.display = "flex";
    } catch (err) {
        console.error("Errore logout:", err);
    }
});

// ========================
// CONTROLLO SESSIONE AL CARICAMENTO PAGINA
// ========================
window.addEventListener("load", async () => {
    try {
        const res = await fetch(`${baseURL}/me`, {method: "GET", credentials: "include"});
        const data = await res.json();

        if (data.status === "ok") {
            showArea(data.user.username);
        } else {
            homeContainer.style.display = "flex";
        }
    } catch (err) {
        console.error("Errore sessione:", err);
        homeContainer.style.display = "flex";
    }
});