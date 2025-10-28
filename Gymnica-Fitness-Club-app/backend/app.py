# app.py
import os
from datetime import datetime
from dotenv import load_dotenv
from flask import Flask, request, jsonify, session, g, send_from_directory, send_file
from flask_cors import CORS
import bcrypt
from werkzeug.utils import secure_filename
from flask_mail import Mail, Message
import psycopg2
import psycopg2.extras

# --- Config base ---
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
FRONTEND_DIR = os.path.join(BASE_DIR, "..", "frontend", "templates")
UPLOAD_FOLDER = os.path.join(BASE_DIR, "..", "db", "schede")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

load_dotenv(os.path.join(BASE_DIR, "key.env"))

app = Flask(__name__, static_folder=None)
app.secret_key = os.environ.get("SECRET_KEY") or "dev-secret"
CORS(app, supports_credentials=True)

# Mail config
app.config['MAIL_SERVER'] = os.environ.get("MAIL_SERVER", "smtp.gmail.com")
app.config['MAIL_PORT'] = int(os.environ.get("MAIL_PORT", 587))
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = os.environ.get("MAIL_USERNAME")
app.config['MAIL_PASSWORD'] = os.environ.get("MAIL_PASSWORD")
app.config['MAIL_DEFAULT_SENDER'] = (os.environ.get("MAIL_FROM_NAME", "Gym"), app.config['MAIL_USERNAME'])
mail = Mail(app)

# Admin credentials
ADMIN_USERNAME = os.environ.get("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "adminpass")

# --- DB helpers ---
def get_db():
    if 'db' not in g:
        g.db = psycopg2.connect(
            host=os.environ.get("DB_HOST"),
            user=os.environ.get("DB_USER"),
            password=os.environ.get("DB_PASSWORD"),
            dbname=os.environ.get("DB_NAME"),
            port=os.environ.get("DB_PORT"),
        )
    return g.db

@app.teardown_appcontext
def close_db(exc):
    db = g.pop('db', None)
    if db:
        db.close()

def init_db():
    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
    CREATE TABLE IF NOT EXISTS utenti (
        id SERIAL PRIMARY KEY,
        nome_cognome VARCHAR(255),
        username VARCHAR(255),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        pdf_path TEXT,
        data_creazione TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS login_attempts (
        id SERIAL PRIMARY KEY,
        ip VARCHAR(50) NOT NULL,
        tentativi_falliti INT DEFAULT 0,
        last_attempt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS admin_attempts (
        id SERIAL PRIMARY KEY,
        ip VARCHAR(50) NOT NULL,
        tentativi_falliti INT DEFAULT 0,
        last_attempt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS corsi_data (
        id SERIAL PRIMARY KEY,
        corso VARCHAR(100) NOT NULL,
        row_index INT NOT NULL,
        mese VARCHAR(20) NOT NULL DEFAULT 'Gennaio-2025',
        nome VARCHAR(100),
        cognome VARCHAR(100),
        email VARCHAR(255),
        cell VARCHAR(50),
        tessera VARCHAR(50),
        dataCert VARCHAR(50),
        pagato SMALLINT DEFAULT 0,
        importo VARCHAR(50),
        UNIQUE (corso, row_index, mese)
    );
    """)

    cur.execute("""
    CREATE TABLE IF NOT EXISTS course_totals (
        corso VARCHAR(100) NOT NULL,
        mese VARCHAR(20) NOT NULL,
        total_cassa DOUBLE PRECISION DEFAULT 0,
        total_istruttore DOUBLE PRECISION DEFAULT 0,
        PRIMARY KEY (corso, mese)
    );
    """)

    conn.commit()
    print("init_db: tutte le tabelle create / verificate")

# --- utility email ---
def send_email(to, subject, body):
    try:
        msg = Message(subject, recipients=[to], body=body)
        mail.send(msg)
        print(f"Email inviata a {to}")
    except Exception as e:
        print("Errore invio email:", e)

# Per HTML
@app.route("/")
def index():
    return send_from_directory(FRONTEND_DIR, "index.html")

@app.route("/admin")
def admin():
    return send_from_directory(FRONTEND_DIR, "admin.html")

# Per JS/CSS/IMG
@app.route("/static/<path:filename>")
def static_files(filename):
    return send_from_directory(os.path.join(BASE_DIR, "..", "frontend", "static"), filename)

# ------------------------
# --- ROTTE UTENTE ---
# ------------------------
@app.route("/register", methods=["POST"])
def register():
    data = request.get_json() or {}
    nome_cognome = (data.get("nome_cognome") or "").strip()
    email = (data.get("email") or "").strip()
    password = (data.get("password") or "").strip()
    phone = (data.get("phone") or "").strip()

    if not nome_cognome or not email or not password or not phone:
        return jsonify({"status":"error","message":"Compila tutti i campi"}), 400

    conn = get_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    cur.execute("SELECT id FROM utenti WHERE email=%s", (email,))
    if cur.fetchone():
        return jsonify({"status":"error","message":"Email già esistente"}), 400

    pw_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    username = nome_cognome
    cur.execute(
        "INSERT INTO utenti (nome_cognome, username, email, password_hash, phone) VALUES (%s, %s, %s, %s, %s)",
        (nome_cognome, username, email, pw_hash, phone)
    )
    conn.commit()

    # separazione nome e cognome
    parts = nome_cognome.split()
    nome = parts[0]
    cognome = " ".join(parts[1:]) if len(parts) > 1 else ""

# inserimento corsi_data mesi futuri (5 anni)
    month_names = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno",
                "Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"]

    oggi = datetime.today()
    anno_corrente = oggi.year
    mese_corrente = oggi.month

    for year in range(anno_corrente, anno_corrente + 5):
        for m_idx in range(12):
        # salta mesi già passati nel primo anno
            if year == anno_corrente and m_idx + 1 < mese_corrente:
                continue
            mese = f"{month_names[m_idx]}-{year}"

        # calcola il prossimo row_index disponibile
            cur.execute(
                "SELECT COALESCE(MAX(row_index), -1) + 1 AS idx FROM corsi_data WHERE corso=%s AND mese=%s",
                ("BodyBuilding", mese)
            )
            row_index = cur.fetchone()["idx"]

        # evita duplicati dello stesso utente nello stesso mese
            cur.execute(
                "SELECT 1 FROM corsi_data WHERE corso=%s AND nome=%s AND cognome=%s AND cell=%s AND mese=%s",
                ("BodyBuilding", nome, cognome, phone, mese)
            )
            if not cur.fetchone():
                cur.execute(
                    "INSERT INTO corsi_data (corso, row_index, mese, nome, cognome, email, cell, tessera, dataCert, pagato, importo) "
                    "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 0, '')",
                    ("BodyBuilding", row_index, mese, nome, cognome, email, phone, "", "")
                )
    conn.commit()
    return jsonify({"status":"ok","message":"Registrazione completata"}), 201

# ------------------------
# --- LOGIN / LOGOUT ---
# ------------------------
MAX_ATTEMPTS = 3
BLOCK_TIME_SECONDS = 60  # 1 minuto

def check_ip_block(table_name, ip):
    conn = get_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    cur.execute(f"SELECT tentativi_falliti, last_attempt FROM {table_name} WHERE ip=%s", (ip,))
    row = cur.fetchone()

    if row:
        tentativi = row["tentativi_falliti"]
        last = row["last_attempt"]

        if tentativi >= MAX_ATTEMPTS and last:
            cur.execute("SELECT EXTRACT(EPOCH FROM (NOW() - %s::timestamp)) AS elapsed", (last,))
            elapsed = cur.fetchone()["elapsed"]
            remaining = max(0, BLOCK_TIME_SECONDS - int(elapsed))
            if remaining > 0:
                return True, remaining
            else:
                cur.execute(f"UPDATE {table_name} SET tentativi_falliti=0, last_attempt=NULL WHERE ip=%s", (ip,))
                conn.commit()

    return False, 0

def record_failed_attempt(table_name, ip):
    conn = get_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    cur.execute(f"SELECT tentativi_falliti FROM {table_name} WHERE ip=%s", (ip,))
    row = cur.fetchone()

    if row:
        cur.execute(f"UPDATE {table_name} SET tentativi_falliti=tentativi_falliti+1, last_attempt=NOW() WHERE ip=%s", (ip,))
    else:
        cur.execute(f"INSERT INTO {table_name} (ip, tentativi_falliti, last_attempt) VALUES (%s, 1, NOW())", (ip,))
    conn.commit()

def reset_attempts(table_name, ip):
    conn = get_db()
    cur = conn.cursor()
    cur.execute(f"UPDATE {table_name} SET tentativi_falliti=0, last_attempt=NULL WHERE ip=%s", (ip,))
    conn.commit()

@app.route("/login", methods=["POST"])
def login():
    ip = request.remote_addr
    blocked, remaining = check_ip_block("login_attempts", ip)
    if blocked:
        return jsonify({"status":"error","message":f"Superato il numero di tentativi: attendi {remaining} secondi", "remaining_seconds": remaining}), 429

    data = request.get_json() or {}
    email = (data.get("email") or "").strip()
    password = (data.get("password") or "").strip()

    if not email or not password:
        return jsonify({"status":"error","message":"Compila tutti i campi"}), 400

    conn = get_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("SELECT id, password_hash, nome_cognome FROM utenti WHERE email=%s", (email,))
    row = cur.fetchone()
    if row and bcrypt.checkpw(password.encode('utf-8'), row["password_hash"].encode('utf-8')):
        session['user_id'] = row["id"]
        reset_attempts("login_attempts", ip)
        return jsonify({"status":"ok","message":"Login riuscito","nome_cognome": row["nome_cognome"]})
    else:
        record_failed_attempt("login_attempts", ip)
        return jsonify({"status":"error","message":"Email o Password errate"}), 401

@app.route("/me", methods=["GET"])
def me():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"status":"error","message":"Non autenticato"}), 401
    conn = get_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("SELECT id, nome_cognome, username, email, phone, data_creazione FROM utenti WHERE id=%s", (user_id,))
    row = cur.fetchone()
    if not row:
        return jsonify({"status":"error","message":"Utente non trovato"}), 404
    return jsonify({"status":"ok","user":row})

@app.route("/logout", methods=["POST"])
def logout():
    session.pop("user_id", None)
    return jsonify({"status":"ok","message":"Logout effettuato"})

# ------------------------
# --- ROTTE ADMIN ---
# ------------------------
@app.route("/admin/login", methods=["POST"])
def admin_login():
    ip = request.remote_addr
    blocked, remaining = check_ip_block("admin_attempts", ip)
    if blocked:
        return jsonify({"status":"error","message":f"Superato il numero di tentativi: attendi {remaining} secondi", "remaining_seconds": remaining}), 429

    data = request.get_json() or {}
    username = (data.get("username") or "").strip()
    password = (data.get("password") or "").strip()

    if not username or not password:
        return jsonify({"status":"error","message":"Compila tutti i campi"}), 400

    if username==ADMIN_USERNAME and password==ADMIN_PASSWORD:
        session['admin_logged_in']=True
        reset_attempts("admin_attempts", ip)
        return jsonify({"status":"ok","message":"Login admin riuscito"})
    else:
        record_failed_attempt("admin_attempts", ip)
        return jsonify({"status":"error","message":"Username o Password errate"}), 401

@app.route("/admin/logout", methods=["POST"])
def admin_logout():
    session.pop("admin_logged_in", None)
    return jsonify({"status":"ok","message":"Logout admin effettuato"})

# --- LISTA UTENTI ---
@app.route("/admin/users", methods=["GET"])
def admin_users():
    if not session.get("admin_logged_in"):
        return jsonify({"status":"error","message":"Non autorizzato"}), 401
    conn=get_db()
    cur=conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("SELECT id, COALESCE(username,nome_cognome) AS username,email,phone,data_creazione FROM utenti")
    users=[row for row in cur.fetchall()]
    return jsonify({"status":"ok","users":users})

# --- UPLOAD PDF ---
@app.route("/admin/upload/<int:user_id>", methods=["POST"])
def admin_upload(user_id):
    if not session.get("admin_logged_in"):
        return jsonify({"status":"error","message":"Non autorizzato"}), 401

    if 'file' not in request.files:
        return jsonify({"status":"error","message":"Nessun file inviato"}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({"status":"error","message":"File senza nome"}), 400

    filename = secure_filename(file.filename)
    safe_name = f"{user_id}_{filename}"
    path = os.path.join(UPLOAD_FOLDER, safe_name)
    try:
        file.save(path)
    except Exception as e:
        return jsonify({"status":"error","message":"Errore salvataggio file"}), 500

    conn = get_db()
    cur = conn.cursor()
    cur.execute("UPDATE utenti SET pdf_path=%s WHERE id=%s", (safe_name, user_id))
    conn.commit()

    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("SELECT email, COALESCE(username,nome_cognome) AS username FROM utenti WHERE id=%s", (user_id,))
    row = cur.fetchone()
    if row and row["email"]:
        send_email(
            row["email"],
            "Hai ricevuto un file dalla Gymnica Fitness Club",
            f"Ciao {row['username']},\n\nHai ricevuto un file dalla Gymnica Fitness Club. Puoi scaricarlo dal tuo profilo."
        )

    return jsonify({"status":"ok","message":"PDF caricato e email inviata"})

# --- SCARICA PDF ---
@app.route("/scheda", methods=["GET"])
def get_scheda():
    user_id = session.get("user_id")
    if not user_id:
        return jsonify({"status":"error","message":"Non autenticato"}), 401

    conn = get_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("SELECT pdf_path FROM utenti WHERE id=%s", (user_id,))
    row = cur.fetchone()
    if not row or not row["pdf_path"]:
        return jsonify({"status":"error","message":"Nessun file disponibile"}), 200

    pdf_filename = row["pdf_path"]
    pdf_path = os.path.join(UPLOAD_FOLDER, pdf_filename)

    if not os.path.isfile(pdf_path):
        return jsonify({"status":"error","message":"File non trovato sul server"}), 200

    return send_file(pdf_path, as_attachment=True)

# ------------------------
# --- ROTTE ADMIN CORSI ---
# ------------------------
def generate_months(start_month=10, start_year=2025, years_ahead=5):
    months_names = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno",
                    "Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"]
    months = []
    for y in range(start_year, start_year + years_ahead + 1):
        for m in range(1, 13):
            if y == start_year and m < start_month:
                continue
            months.append(f"{months_names[m-1]}-{y}")
    return months

@app.route("/admin/course-data/<corso>", methods=["GET"])
def get_course_data_route(corso):
    if not session.get("admin_logged_in"):
        return jsonify({"status":"error","message":"Non autorizzato"}), 401

    mese = request.args.get("mese", "Ottobre-2025")
    conn = get_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    cur.execute("""
        SELECT cd.row_index, u.id AS user_id, cd.nome, cd.cognome, cd.email, cd.cell, cd.tessera, cd.dataCert, cd.pagato, cd.importo
        FROM corsi_data cd
        LEFT JOIN utenti u ON cd.email = u.email
        WHERE cd.corso = %s AND cd.mese = %s
        ORDER BY cd.row_index
    """, (corso, mese))

    rows = []
    for r in cur.fetchall():
        rows.append({
            "row_index": r["row_index"],
            "id": r["user_id"] or "",
            "nome": r["nome"] or "",
            "cognome": r["cognome"] or "",
            "email": r["email"] or "",
            "cell": r["cell"] or "",
            "tessera": r["tessera"] or "",
            "dataCert": r["dataCert"] or "",
            "pagato": bool(r["pagato"]),
            "importo": r["importo"] or ""
        })
    return jsonify({"status":"ok","rows": rows})

@app.route("/admin/course-data/<corso>", methods=["POST"])
def save_course_data_route(corso):
    if not session.get("admin_logged_in"):
        return jsonify({"status": "error", "message": "Non autorizzato"}), 401

    data = request.get_json() or {}
    rows = data.get("rows", [])
    mese = data.get("mese", "Ottobre-2025")
    if not isinstance(rows, list):
        return jsonify({"status": "error", "message": "Formato dati non valido"}), 400

    conn = get_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    # elimina dati esistenti solo per il mese specINSERISCI_PEC
    cur.execute("DELETE FROM corsi_data WHERE corso=%s AND mese=%s", (corso, mese))

    saved_rows = []

    for r in rows:
        nome = r.get("nome", "")
        cognome = r.get("cognome", "")
        email = r.get("email", "")
        cell = r.get("cell", "") or r.get("cellulare", "")
        tessera = r.get("tessera", "") or r.get("numero_tessera", "")
        dataCert = r.get("dataCert", "") or r.get("data_certificato", "")
        pagato = 1 if r.get("pagato") else 0
        importo = str(r.get("importo", ""))

        # calcolo row_index
        cur.execute("SELECT COALESCE(MAX(row_index), -1) + 1 AS idx FROM corsi_data WHERE corso=%s AND mese=%s", (corso, mese))
        idx = cur.fetchone()["idx"]

        cur.execute(
            "INSERT INTO corsi_data (corso,row_index,mese,nome,cognome,email,cell,tessera,dataCert,pagato,importo) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
            (corso, idx, mese, nome, cognome, email, cell, tessera, dataCert, pagato, importo)
        )
        saved_rows.append({"index": idx, "email": email})

        # Propaga ai mesi successivi se siamo a Ottobre-2025
        if mese == "Ottobre-2025":
            mesi_successivi = generate_months()
            for m in mesi_successivi:
                cur.execute("SELECT row_index FROM corsi_data WHERE corso=%s AND email=%s AND cell=%s AND mese=%s", (corso, email, cell, m))
                existing = cur.fetchone()
                if existing:
                    cur.execute(
                        "UPDATE corsi_data SET nome=%s, cognome=%s, tessera=%s, dataCert=%s WHERE corso=%s AND email=%s AND cell=%s AND mese=%s",
                        (nome, cognome, tessera, dataCert, corso, email, cell, m)
                    )
                else:
                    cur.execute("SELECT COALESCE(MAX(row_index),-1)+1 AS idx FROM corsi_data WHERE corso=%s AND mese=%s", (corso, m))
                    new_idx = cur.fetchone()["idx"]
                    cur.execute(
                        "INSERT INTO corsi_data (corso,row_index,mese,nome,cognome,email,cell,tessera,dataCert,pagato,importo) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,0,'')",
                        (corso, new_idx, m, nome, cognome, email, cell, tessera, dataCert)
                    )

    conn.commit()
    return jsonify({"status": "ok", "message": "Dati salvati correttamente", "rows": saved_rows})

@app.route("/admin/course-data-single/<corso>", methods=["POST"])
def save_single_course_row(corso):
    if not session.get("admin_logged_in"):
        return jsonify({"status": "error", "message": "Non autorizzato"}), 401

    data = request.get_json() or {}
    mese = data.get("mese", "Ottobre-2025")
    row = data.get("row")
    if not row:
        return jsonify({"status": "error", "message": "Nessuna riga inviata"}), 400

    nome = row.get("nome", "")
    cognome = row.get("cognome", "")
    email = row.get("email", "")
    cell = row.get("cell", "") or row.get("cellulare", "")
    tessera = row.get("tessera", "") or row.get("numero_tessera", "")
    dataCert = row.get("dataCert", "") or row.get("data_certificato", "")
    pagato = 1 if row.get("pagato") else 0
    importo = str(row.get("importo", ""))

    if not email:
        return jsonify({"status": "error", "message": "Email mancante"}), 400

    conn = get_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    # verifica se utente esiste
    cur.execute("SELECT id FROM utenti WHERE email=%s", (email,))
    user = cur.fetchone()
    if user:
        user_id = user["id"]
    else:
        cur.execute(
            "INSERT INTO utenti (nome_cognome, email, phone) VALUES (%s, %s, %s) RETURNING id",
            (f"{nome} {cognome}".strip(), email, cell)
        )
        user_id = cur.fetchone()["id"]

    # calcolo row_index
    cur.execute("SELECT COALESCE(MAX(row_index), -1) + 1 AS idx FROM corsi_data WHERE corso=%s AND mese=%s", (corso, mese))
    row_index = cur.fetchone()["idx"]

    cur.execute(
        "INSERT INTO corsi_data (corso,row_index,mese,nome,cognome,email,cell,tessera,dataCert,pagato,importo) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
        (corso, row_index, mese, nome, cognome, email, cell, tessera, dataCert, pagato, importo)
    )

    conn.commit()
    return jsonify({"status": "ok", "message": "Riga salvata correttamente", "user_id": user_id, "row_index": row_index})

@app.route("/admin/send-payment-reminder", methods=["POST"])
def send_payment_reminder():
    if not session.get("admin_logged_in"):
        return jsonify({"status":"error","message":"Non autorizzato"}), 401

    data = request.get_json() or {}
    emails = data.get("emails", [])
    mese = data.get("mese", "")

    if not emails or not mese:
        return jsonify({"status":"error","message":"Dati mancanti"}), 400

    subject = f"Promemoria pagamento mese {mese}"
    body = f"Ciao, stanno per scadere i termini di pagamento, ti ricordiamo di saldare il mese di {mese}."

    success = []
    failed = []

    for email in emails:
        try:
            msg = Message(subject, recipients=[email], body=body)
            mail.send(msg)
            success.append(email)
        except Exception as e:
            print(f"Errore invio a {email}: {e}")
            failed.append(email)

    return jsonify({"status": "ok","sent": success,"failed": failed,"message": f"Inviate {len(success)} mail, fallite {len(failed)}"})

@app.route("/admin/course-totals/<corso>", methods=["GET"])
def get_course_totals(corso):
    if not session.get("admin_logged_in"):
        return jsonify({"status":"error","message":"Non autorizzato"}), 401
    mese = request.args.get("mese", "Ottobre-2025")
    conn = get_db()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("SELECT total_cassa, total_istruttore FROM course_totals WHERE corso=%s AND mese=%s", (corso, mese))
    row = cur.fetchone()
    if not row:
        return jsonify({"status":"ok","totals":{"total_cassa":0,"total_istruttore":0}})
    return jsonify({"status":"ok","totals":{"total_cassa":row["total_cassa"] or 0,"total_istruttore":row["total_istruttore"] or 0}})

@app.route("/admin/course-totals/<corso>", methods=["POST"])
def save_course_totals(corso):
    if not session.get("admin_logged_in"):
        return jsonify({"status":"error","message":"Non autorizzato"}), 401

    data = request.get_json() or {}
    mese = data.get("mese", "Ottobre-2025")
    total_cassa = float(data.get("total_cassa", 0) or 0)
    total_istruttore = float(data.get("total_istruttore", 0) or 0)

    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO course_totals (corso,mese,total_cassa,total_istruttore)
        VALUES (%s,%s,%s,%s)
        ON CONFLICT (corso, mese)
        DO UPDATE SET total_cassa = EXCLUDED.total_cassa, total_istruttore = EXCLUDED.total_istruttore
    """, (corso, mese, total_cassa, total_istruttore))
    conn.commit()

    return jsonify({"status":"ok","message":"Totali salvati"})

# --- run ---
# --- run ---
if __name__ == "__main__":
    with app.app_context():
        init_db()
        print("DB inizializzato correttamente")
    # Solo per test locale
    app.run(host="127.0.0.1", port=8000, debug=True)