// ========================
// VARIABILI GLOBALI
// ========================
const adminLoginForm = document.getElementById("adminLoginForm");
const adminLoginMessage = document.getElementById("adminLoginMessage");
const adminLoginSection = document.getElementById("adminLoginSection");
const adminDashboard = document.getElementById("adminDashboard");
const adminLogoutBtn = document.getElementById("adminLogoutBtn");
const corsoDettaglio = document.getElementById("corsoDettaglio");
const corsoTitolo = document.getElementById("corsoTitolo");
const backToCorsiBtn = document.getElementById("backToCorsi");
const corsiSection = document.getElementById("corsiSection");
const baseURL = window.location.origin;

// ======= TENDINA MESE =======
let currentMonth = null;  // mese selezionato
let meseSelect = null;     // elemento select, creato dinamicamente

// helper: crea una riga vuota
function emptyRow() {
    return { nome: "", cognome: "", email: "", cell: "", tessera: "", dataCert: "", pagato: false, importo: "" };
}

function escapeHtml(s){
    if (!s && s !== 0) return "";
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ========================
// LOGIN ADMIN
// ========================
adminLoginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("adminUsername").value;
    const password = document.getElementById("adminPassword").value;
    try {
        const res = await fetch(`${baseURL}/admin/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        adminLoginMessage.textContent = data.message || "";
        if (res.ok && data.status === "ok") {
            adminLoginSection.style.display = "none";
            adminDashboard.style.display = "block";
        }
    } catch (err) {
        adminLoginMessage.textContent = "Errore connessione!";
        console.error(err);
    }
});

adminLogoutBtn.addEventListener("click", async () => {
    try { await fetch(`${baseURL}/admin/logout`, { method: "POST", credentials: "include" }); } 
    catch (e) { console.warn("logout failed", e); }
    adminDashboard.style.display = "none";
    adminLoginSection.style.display = "block";
});

// ========================
// TABLE HTML & DATA
// ========================
function buildTableHtml(rows) {
    if (!rows || !rows.length) rows = [emptyRow()];
    let html = `<table border="1" style="width:100%; border-collapse: collapse;">
        <thead>
            <tr>
                <th>Nome</th><th>Cognome</th><th>Email</th><th>Cellulare</th>
                <th>Numero Tessera</th><th>Data Certificato</th>
                <th>Pagato</th><th>Importo Pagato</th><th>Elimina</th>
            </tr>
        </thead>
        <tbody>`;
    rows.forEach((r, idx) => {
        html += `<tr data-index="${idx}">
            <td contenteditable="true" data-field="nome">${escapeHtml(r.nome)}</td>
            <td contenteditable="true" data-field="cognome">${escapeHtml(r.cognome)}</td>
            <td contenteditable="true" data-field="email">${escapeHtml(r.email || "")}</td>
            <td contenteditable="true" data-field="cell">${escapeHtml(r.cell)}</td>
            <td contenteditable="true" data-field="tessera">${escapeHtml(r.tessera)}</td>
            <td contenteditable="true" data-field="dataCert">${escapeHtml(r.dataCert)}</td>
            <td><input type="checkbox" data-field="pagato" ${r.pagato ? "checked" : ""}></td>
            <td contenteditable="true" data-field="importo">${escapeHtml(r.importo)}</td>
            <td><button class="btn deleteRow">Elimina</button></td>
        </tr>`;
    });
    html += `</tbody></table>
        <div style="margin-top:10px">
            <button class="btn addRow">Aggiungi Riga</button>
            <button class="btn saveTable">Salva</button>
        </div>`;
    return html;
}

function buildBodyBuildingTableHtml(rows) {
    if (!rows || !rows.length) rows = [emptyRow()];
    let html = `<table border="1" style="width:100%; border-collapse: collapse;">
        <thead>
            <tr>
                <th>Nome</th><th>Cognome</th><th>Email</th><th>Telefono</th>
                <th>Numero Tessera</th><th>Data Certificato</th>
                <th>Pagato</th><th>Importo</th><th>File</th><th>Carica</th><th>Elimina</th>
            </tr>
        </thead>
        <tbody>`;
    rows.forEach((r, idx) => {
        const userId = r.id || "";  
        html += `<tr data-index="${idx}" data-userid="${userId}">
            <td contenteditable="true" data-field="nome">${escapeHtml(r.nome)}</td>
            <td contenteditable="true" data-field="cognome">${escapeHtml(r.cognome)}</td>
            <td contenteditable="true" data-field="email">${escapeHtml(r.email || "")}</td>
            <td contenteditable="true" data-field="cell">${escapeHtml(r.cell)}</td>
            <td contenteditable="true" data-field="tessera">${escapeHtml(r.tessera)}</td>
            <td contenteditable="true" data-field="dataCert">${escapeHtml(r.dataCert)}</td>
            <td><input type="checkbox" data-field="pagato" ${r.pagato ? "checked" : ""}></td>
            <td contenteditable="true" data-field="importo">${escapeHtml(r.importo)}</td>
            <td><input type="file" class="uploadPdf"></td>
            <td><button class="btn uploadBtn">Carica</button></td>
            <td><button class="btn deleteRow">Elimina</button></td>
        </tr>`;
    });
    html += `</tbody></table>
        <div style="margin-top:10px">
            <button class="btn addRow">Aggiungi Riga</button>
            <button class="btn saveTable">Salva</button>
        </div>`;
    return html;
}

function collectTableData(container, isBodyBuilding=false) {
    const tbody = container.querySelector("tbody");
    const result = [];
    if (!tbody) return result;
    tbody.querySelectorAll("tr").forEach(tr => {
        const cells = tr.querySelectorAll("td");
        const pagatoInput = cells[isBodyBuilding?6:6].querySelector("input[type='checkbox']");
        result.push({
            nome: cells[0].textContent.trim(),
            cognome: cells[1].textContent.trim(),
            email: cells[2].textContent.trim(),
            cell: cells[3].textContent.trim(),
            tessera: cells[4].textContent.trim(),
            dataCert: cells[5].textContent.trim(),
            pagato: !!(pagatoInput && pagatoInput.checked),
            importo: cells[7].textContent.trim()
        });
    });
    return result;
}

function saveTempForCorso(corso, container, isBodyBuilding=false) {
    const data = collectTableData(container, isBodyBuilding);
    if (!data.length) data.push(emptyRow());
    sessionStorage.setItem(`temp_course_${corso}_${currentMonth}`, JSON.stringify(data));
}

// ========================
// CREAZIONE SELECT MESE
// ========================
function createMonthSelect(container) {
    const oldSelect = container.querySelector("#meseSelect");
    if (oldSelect) oldSelect.remove();

    const select = document.createElement("select");
    select.id = "meseSelect";

    const months = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
    const startYear = 2025;
    const startMonthIndex = 9; // Ottobre
    const totalYears = 10;

    for (let y = 0; y < totalYears; y++) {
        const year = startYear + y;
        const fromMonth = (y === 0) ? startMonthIndex : 0;
        for (let m = fromMonth; m < 12; m++) {
            const option = document.createElement("option");
            option.value = `${months[m]}-${year}`;
            option.textContent = `${months[m]} ${year}`;
            select.appendChild(option);
        }
    }

    container.prepend(select);
    meseSelect = select;

    if(!currentMonth || ![...select.options].some(o=>o.value===currentMonth)){
        currentMonth = "Ottobre-2025";
    }
    select.value = currentMonth;

    select.addEventListener("change", ()=>{
        currentMonth = select.value;
        const corso = corsoTitolo.textContent;
        openCourse(corso);
    });
}

// ========================
// OPEN COURSE
// ========================
document.querySelectorAll(".corso-link").forEach(link => {
    link.addEventListener("click", (e) => {
        e.preventDefault();
        const corso = link.dataset.corso;
        openCourse(corso);
    });
});

async function openCourse(corso) {
    corsiSection.style.display = "none";
    corsoDettaglio.style.display = "block";
    corsoTitolo.textContent = corso;
    adminDashboard.classList.add("minimized-header");

    if(!meseSelect) createMonthSelect(corsoDettaglio);

    const oldContainer = corsoDettaglio.querySelector("div[id^='container_']");
    if (oldContainer) oldContainer.remove();

    const container = document.createElement("div");
    container.id = `container_${corso}`;
    corsoDettaglio.appendChild(container);

    let rows = null;
    const tempKey = `temp_course_${corso}_${currentMonth}`;
    const temp = sessionStorage.getItem(tempKey);
    if (temp) {
        try { rows = JSON.parse(temp); } catch(e){ rows=null; console.warn("temp parse error", e);}
    }

    if (!rows) {
        try {
            const res = await fetch(`${baseURL}/admin/course-data/${encodeURIComponent(corso)}?mese=${encodeURIComponent(currentMonth)}`, { credentials: "include" });
            const data = await res.json();
            rows = (res.ok && data.status==="ok" && Array.isArray(data.rows)) ? (data.rows.length ? data.rows : [emptyRow()]) : [emptyRow()];
        } catch(e){ console.error("Errore caricamento dati:", e); rows = [emptyRow()]; }
    }

    if(corso==="BodyBuilding"){
        container.innerHTML = buildBodyBuildingTableHtml(rows);
        attachDelegatedListeners(corso, container, true);
        
    } else {
        container.innerHTML = buildTableHtml(rows);
        attachDelegatedListeners(corso, container, false);
        
    }
}

// ========================
// ATTACH LISTENERS
// ========================
async function attachDelegatedListeners(corso, container, isBodyBuilding=false) {
    const newContainer = container.cloneNode(true);
    container.parentNode.replaceChild(newContainer, container);
    addPaymentReminderButton(newContainer);
    addTotalMonthButton(newContainer);
    addInstructorTotalControls(newContainer, corso);

    const totalMonthSpan = newContainer.querySelector(".totalMonthValue");

    function updateTotalMonth() {
        const tbody = newContainer.querySelector("tbody");
        if (!tbody) return;
        let total = 0;
        tbody.querySelectorAll("tr").forEach(tr => {
            const pagato = tr.querySelector("input[type='checkbox']");
            const impCell = tr.querySelector("td[data-field='importo']");
            if(pagato && pagato.checked && impCell){
                const v = parseFloat(impCell.textContent.trim().replace(",", "."));
                if(!isNaN(v)) total += v;
            }
        });
        if(totalMonthSpan) totalMonthSpan.textContent = total.toFixed(2) + " €";
    }

    newContainer.addEventListener("click", async (ev) => {
        const target = ev.target;
        const tbody = newContainer.querySelector("tbody");
        if (!tbody) return;

        // --- AGGIUNGI RIGA ---
        if(target.matches(".addRow")) {
            const newRow = document.createElement("tr");
            if(isBodyBuilding){
                newRow.innerHTML = `
                    <td contenteditable="true" data-field="nome"></td>
                    <td contenteditable="true" data-field="cognome"></td>
                    <td contenteditable="true" data-field="email"></td>
                    <td contenteditable="true" data-field="cell"></td>
                    <td contenteditable="true" data-field="tessera"></td>
                    <td contenteditable="true" data-field="dataCert"></td>
                    <td><input type="checkbox" data-field="pagato"></td>
                    <td contenteditable="true" data-field="importo"></td>
                    <td>
                        <input type="file" class="uploadPdf">
                        <button class="btn uploadBtn">Carica</button>
                    </td>
                    <td><button class="btn deleteRow">Elimina</button></td>`;
            } else {
                newRow.innerHTML = `
                    <td contenteditable="true" data-field="nome"></td>
                    <td contenteditable="true" data-field="cognome"></td>
                    <td contenteditable="true" data-field="email"></td>
                    <td contenteditable="true" data-field="cell"></td>
                    <td contenteditable="true" data-field="tessera"></td>
                    <td contenteditable="true" data-field="dataCert"></td>
                    <td><input type="checkbox" data-field="pagato"></td>
                    <td contenteditable="true" data-field="importo"></td>
                    <td><button class="btn deleteRow">Elimina</button></td>`;
            }
            tbody.appendChild(newRow);
            saveTempForCorso(corso, newContainer, isBodyBuilding);
            updateTotalMonth();
            return;
        }

        // --- ELIMINA RIGA ---
        if(target.matches(".deleteRow")) {
            const tr = target.closest("tr");
            if(tr) tr.remove();
            if(!tbody.children.length){
                const r = emptyRow();
                if(isBodyBuilding) tbody.innerHTML = buildBodyBuildingTableHtml([r]).match(/<tbody>([\s\S]*)<\/tbody>/)[1];
                else tbody.innerHTML = buildTableHtml([r]).match(/<tbody>([\s\S]*)<\/tbody>/)[1];
            }
            // ricalcola row_index di tutte le righe
            tbody.querySelectorAll("tr").forEach((tr, i) => tr.dataset.rowindex = i);
            saveTempForCorso(corso, newContainer, isBodyBuilding);
            updateTotalMonth();
            return;
        }

        // --- CARICA FILE ---
        if(target.matches(".uploadBtn")) {
            const tr = target.closest("tr");
            if(!tr) return;

            const fileInput = tr.querySelector(".uploadPdf");
            if(!fileInput || !fileInput.files.length){
                alert("Seleziona un file da caricare");
                return;
            }

            // costruisci i dati della riga corrente
            const rowData = {};
            tr.querySelectorAll("[data-field]").forEach(el => {
                if(el.type === "checkbox") rowData[el.dataset.field] = el.checked;
                else rowData[el.dataset.field] = el.textContent.trim();
            });

            let userId = tr.dataset.userid;

            // se la riga non ha ancora user_id, salvala sul backend singolarmente
            if(!userId){
                try {
                    const res = await fetch(`${baseURL}/admin/course-data-single/${encodeURIComponent(corso)}`, {
                        method:"POST",
                        headers:{"Content-Type":"application/json"},
                        credentials:"include",
                        body:JSON.stringify({row: rowData, mese: currentMonth})
                    });
                    const data = await res.json();
                    if(res.ok && data.status==="ok" && data.user_id){
                        userId = data.user_id;
                        tr.dataset.userid = userId;
                    } else {
                        alert("Errore salvataggio riga prima del caricamento file");
                        return;
                    }
                } catch(err){
                    console.error(err);
                    alert("Errore salvataggio riga prima del caricamento file");
                    return;
                }
            }

            // upload del file
            const formData = new FormData();
            formData.append("file", fileInput.files[0]);

            try {
                const res = await fetch(`${baseURL}/admin/upload/${userId}`, {
                    method:"POST",
                    body: formData,
                    credentials:"include"
                });
                const data = await res.json();
                if(res.ok && data.status==="ok"){
                    alert("File caricato correttamente");
                    fileInput.value = "";
                } else {
                    alert("Errore caricamento file: " + (data.message||"unknown"));
                }
            } catch(err){
                console.error(err);
                alert("Errore caricamento file");
            }

            return;
        }

        // --- SALVA TABELLA ---
        if(target.matches(".saveTable")) {
            const tbody = newContainer.querySelector("tbody");
            const allRows = [];
            tbody.querySelectorAll("tr").forEach(tr => {
                const r = {};
                tr.querySelectorAll("[data-field]").forEach(el => {
                    if(el.type === "checkbox") r[el.dataset.field] = el.checked;
                    else r[el.dataset.field] = el.textContent.trim();
                });
                allRows.push(r);
            });

            try {
                const res = await fetch(`${baseURL}/admin/course-data/${encodeURIComponent(corso)}`, {
                    method:"POST",
                    headers:{"Content-Type":"application/json"},
                    credentials:"include",
                    body:JSON.stringify({rows:allRows, mese:currentMonth})
                });
                const data = await res.json();
                if(res.ok && data.status==="ok"){
                    alert("Dati salvati con successo!");
                    sessionStorage.removeItem(`temp_course_${corso}_${currentMonth}`);
                    updateTotalMonth();
                } else {
                    alert("Errore salvataggio dati: " + (data.message || "unknown"));
                }
            } catch(err){
                console.error(err);
                alert("Errore salvataggio dati");
            }
        }
    });

    newContainer.addEventListener("input", () => {
        saveTempForCorso(corso, newContainer, isBodyBuilding);
        updateTotalMonth();
    });
    newContainer.addEventListener("change", () => {
        saveTempForCorso(corso, newContainer, isBodyBuilding);
        updateTotalMonth();
    });
}

// --- Bottone promemoria pagamenti ---
function addPaymentReminderButton(container) {
    if (container.querySelector(".paymentReminderBtn")) return;

    const btn = document.createElement("button");
    btn.textContent = "Invia promemoria pagamenti";
    btn.className = "btn paymentReminderBtn";
    btn.style.marginTop = "10px";
    container.appendChild(btn);

    btn.addEventListener("click", async () => {
        const tbody = container.querySelector("tbody");
        if (!tbody) return;

        const unpaidEmails = [];
        tbody.querySelectorAll("tr").forEach(tr => {
            const pagatoInput = tr.querySelector("input[type='checkbox']");
            const emailCell = tr.querySelector("td[data-field='email']");
            if (pagatoInput && !pagatoInput.checked && emailCell) {
                const email = emailCell.textContent.trim();
                if(email) unpaidEmails.push(email);
            }
        });

        if (unpaidEmails.length === 0) {
            alert("Tutti hanno già pagato!");
            return;
        }

        try {
            const res = await fetch(`${baseURL}/admin/send-payment-reminder`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ emails: unpaidEmails, mese: currentMonth })
            });
            const data = await res.json();

            if(res.ok && data.status === "ok"){
                alert(`Mail inviate correttamente: ${data.sent.length}`);
            } else {
                alert(`Errore invio mail: ${data.message || "unknown"}`);
            }
        } catch(err){
            console.error(err);
            alert("Errore invio mail");
        }
    });
}

// --- Bottone totale mese ---
async function addTotalMonthButton(container, corso) {
    if (container.querySelector(".totalMonthContainer")) return;

    const wrapper = document.createElement("div");
    wrapper.className = "totalMonthContainer";
    wrapper.style.position = "absolute";
    wrapper.style.bottom = "20px";
    wrapper.style.left = "20px";
    wrapper.style.display = "flex";
    wrapper.style.alignItems = "center";
    wrapper.style.gap = "8px";

    const btn = document.createElement("button");
    btn.textContent = "Totale mese";
    btn.className = "btn totalMonthBtn";

    const totalSpan = document.createElement("span");
    totalSpan.className = "totalMonthValue";
    totalSpan.textContent = "0 €";
    totalSpan.style.display = "none"; // 🔹 inizialmente nascosto
    totalSpan.style.transition = "opacity 0.3s ease";

    wrapper.appendChild(btn);
    wrapper.appendChild(totalSpan);
    container.appendChild(wrapper);

    // Carica il totale dal backend (ma non lo mostra subito)
    try {
        const res = await fetch(`${baseURL}/admin/course-totals/${encodeURIComponent(corso)}?mese=${encodeURIComponent(currentMonth)}`, {
            credentials: "include"
        });
        const data = await res.json();
        if (res.ok && data.status === "ok" && data.totals) {
            const total = parseFloat(data.totals.total_cassa) || 0;
            totalSpan.textContent = total.toFixed(2) + " €";
        }
    } catch (err) {
        console.warn("Errore caricamento totale mese:", err);
    }

    // Calcola e salva al click
    btn.addEventListener("click", async () => {
        // 🔹 Mostra lo span quando clicchi
        totalSpan.style.display = "inline";

        const tbody = container.querySelector("tbody");
        if (!tbody) return;

        let total = 0;
        tbody.querySelectorAll("tr").forEach(tr => {
            const pagato = tr.querySelector("input[type='checkbox']");
            const importoCell = tr.querySelector("td[data-field='importo']");
            if (pagato && pagato.checked && importoCell) {
                const value = parseFloat(importoCell.textContent.trim().replace(",", "."));
                if (!isNaN(value)) total += value;
            }
        });

        totalSpan.textContent = total.toFixed(2) + " €";

        // salva subito totale mese sul backend
        try {
            await fetch(`${baseURL}/admin/course-totals/${encodeURIComponent(corso)}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    mese: currentMonth,
                    total_cassa: total
                })
            });
        } catch (err) {
            console.warn("Errore salvataggio totale mese:", err);
        }
    });
}

// ========================
// CONTROLLI TOTALE ISTRUTTORE
// ========================
async function addInstructorTotalControls(container, corso) {
    if (container.querySelector(".instructorControls")) return;

    // wrapper in basso a destra (posizione assoluta)
    const wrapper = document.createElement("div");
    wrapper.className = "instructorControls";
    wrapper.style.position = "absolute";
    wrapper.style.bottom = "20px";
    wrapper.style.right = "20px";
    wrapper.style.display = "flex";
    wrapper.style.alignItems = "center";
    wrapper.style.gap = "8px";

    const input = document.createElement("input");
    input.type = "number";
    input.placeholder = "Importo istruttore";
    input.className = "instructorInput";
    input.style.padding = "4px";
    input.style.fontSize = "12px";

    const addBtn = document.createElement("button");
    addBtn.textContent = "Aggiungi";
    addBtn.className = "btn addInstructorBtn";

    const totalBtn = document.createElement("button");
    totalBtn.textContent = "Totale istruttore";
    totalBtn.className = "btn instructorTotalBtn";

    const totalSpan = document.createElement("span");
    totalSpan.className = "instructorTotalValue";
    totalSpan.textContent = "0 €";
    totalSpan.style.display = "none"; // 🔹 inizialmente nascosto
    totalSpan.style.transition = "opacity 0.3s ease";

    wrapper.appendChild(input);
    wrapper.appendChild(addBtn);
    wrapper.appendChild(totalBtn);
    wrapper.appendChild(totalSpan);
    container.appendChild(wrapper);

    // valore corrente (caricato dal server)
    let totalInstructor = 0;

    try {
        const res = await fetch(`${baseURL}/admin/course-totals/${encodeURIComponent(corso)}?mese=${encodeURIComponent(currentMonth)}`, { credentials: "include" });
        const data = await res.json();
        if (res.ok && data.status === "ok" && data.totals) {
            totalInstructor = parseFloat(data.totals.total_istruttore) || 0;
            totalSpan.textContent = totalInstructor.toFixed(2) + " €";
        }
    } catch (err) {
        console.warn("Impossibile caricare totale istruttore:", err);
    }

    wrapper.dataset.totalInstructor = totalInstructor;

    async function saveInstructorTotalToServer() {
        try {
            await fetch(`${baseURL}/admin/course-totals/${encodeURIComponent(corso)}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    mese: currentMonth,
                    total_istruttore: totalInstructor
                })
            });
        } catch (err) {
            console.warn("Errore salvataggio totale istruttore:", err);
        }
    }

    addBtn.addEventListener("click", async () => {
        const v = parseFloat((input.value || "").toString().replace(",", "."));
        if (isNaN(v)) {
            alert("Inserisci un valore numerico valido");
            return;
        }
        totalInstructor += v;
        wrapper.dataset.totalInstructor = totalInstructor;
        input.value = "";
        totalSpan.textContent = totalInstructor.toFixed(2) + " €";
        await saveInstructorTotalToServer();
    });

    totalBtn.addEventListener("click", () => {
        totalSpan.style.display = "inline"; // 🔹 mostra solo al click
        totalSpan.textContent = totalInstructor.toFixed(2) + " €";
    });
}

// ========================
// TORNA ALLA LISTA CORSI
// ========================
backToCorsiBtn.addEventListener("click", ()=>{
    corsoDettaglio.style.display = "none";
    corsiSection.style.display = "block";
    adminDashboard.classList.remove("minimized-header");
});