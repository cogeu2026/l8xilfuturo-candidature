/* ===== L8xilFuturo 2026 · Call artisti ===== */

/* ---- CONFIGURAZIONE: modifica solo qui ---- */
const CONFIG = {
  // URL della Web App di Google Apps Script (finisce con /exec). Vedi README.md
  ENDPOINT: "https://script.google.com/macros/s/AKfycbyxoGLRkxxSe6omentWfhqeSt2O850i2Yk9A7-uPR4nG5Q-XSU9rbLGQo7aZUS3g0Mn/exec",
  // Chiusura candidature (ora italiana)
  DEADLINE: "2026-11-22T23:59:59+01:00",
  MAX_FILES: 2,
  MAX_FILE_MB: 10,
  ALLOWED_EXT: ["mp3", "wav", "m4a", "aac", "ogg", "flac"],
};
/* ------------------------------------------- */

(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const form = $("#form");
  const startedAt = Date.now();
  let files = [];

  document.querySelectorAll(".maxmb").forEach((el) => (el.textContent = CONFIG.MAX_FILE_MB));

  /* ---- scadenza + countdown ---- */
  const deadline = new Date(CONFIG.DEADLINE);
  function updateCountdown() {
    const ms = deadline - Date.now();
    const el = $("#countdown");
    if (ms <= 0) {
      el.textContent = "candidature chiuse";
      form.hidden = true;
      $("#closed").hidden = false;
      return;
    }
    const d = Math.floor(ms / 864e5);
    const h = Math.floor((ms % 864e5) / 36e5);
    el.textContent = d > 0 ? `mancano ${d} ${d === 1 ? "giorno" : "giorni"}` : `mancano ${h} ${h === 1 ? "ora" : "ore"}`;
  }
  updateCountdown();
  setInterval(updateCountdown, 60_000);

  /* ---- contatore caratteri ---- */
  const pres = $("#presentazione");
  pres.addEventListener("input", () => ($("#charCount").textContent = pres.value.length));

  /* ---- minorenni ---- */
  const eta = $("#eta");
  eta.addEventListener("input", () => {
    const n = parseInt(eta.value, 10);
    $("#minorBox").hidden = !(n >= 15 && n < 18);
  });

  /* ---- privacy dialog ---- */
  const dlg = $("#privacyDialog");
  $("#openPrivacy").addEventListener("click", () => (dlg.showModal ? dlg.showModal() : dlg.setAttribute("open", "")));

  /* ---- file ---- */
  const input = $("#files");
  const drop = $("#drop");
  const list = $("#filelist");
  const fmt = (b) => (b > 1048576 ? (b / 1048576).toFixed(1) + " MB" : Math.round(b / 1024) + " KB");
  const ext = (n) => (n.split(".").pop() || "").toLowerCase();

  function addFiles(fileList) {
    const errs = [];
    for (const f of fileList) {
      if (files.length >= CONFIG.MAX_FILES) { errs.push(`Puoi caricare al massimo ${CONFIG.MAX_FILES} brani.`); break; }
      if (!CONFIG.ALLOWED_EXT.includes(ext(f.name))) { errs.push(`"${f.name}" non è un formato audio accettato.`); continue; }
      if (f.size > CONFIG.MAX_FILE_MB * 1048576) { errs.push(`"${f.name}" supera i ${CONFIG.MAX_FILE_MB} MB: comprimilo in MP3 o usa un link.`); continue; }
      if (files.some((x) => x.name === f.name && x.size === f.size)) continue;
      files.push(f);
    }
    renderFiles();
    setFieldError(drop.closest(".field"), errs.join(" "));
  }
  function renderFiles() {
    list.innerHTML = "";
    files.forEach((f, i) => {
      const li = document.createElement("li");
      li.innerHTML = `<span class="dot"></span><span class="name"></span><span class="size">${fmt(f.size)}</span><button type="button" aria-label="Rimuovi">✕</button>`;
      li.querySelector(".name").textContent = f.name;
      li.querySelector("button").onclick = () => { files.splice(i, 1); renderFiles(); };
      list.appendChild(li);
    });
    drop.classList.toggle("is-full", files.length >= CONFIG.MAX_FILES);
  }
  input.addEventListener("change", () => { addFiles(input.files); input.value = ""; });
  ["dragenter", "dragover"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.add("is-over"); }));
  ["dragleave", "drop"].forEach((ev) => drop.addEventListener(ev, (e) => { e.preventDefault(); drop.classList.remove("is-over"); }));
  drop.addEventListener("drop", (e) => addFiles(e.dataTransfer.files));

  const toBase64 = (file) => new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result).split(",")[1]);
    r.onerror = () => rej(new Error("Lettura file non riuscita"));
    r.readAsDataURL(file);
  });

  /* ---- validazione ---- */
  function setFieldError(field, msg) {
    if (!field) return;
    field.classList.toggle("is-invalid", !!msg);
    let e = field.querySelector(".err");
    if (msg) {
      if (!e) { e = document.createElement("div"); e.className = "err"; field.appendChild(e); }
      e.textContent = msg;
    } else if (e) e.remove();
  }
  const val = (id) => $("#" + id).value.trim();

  function validate() {
    const errors = [];
    const check = (id, ok, msg) => {
      const f = $("#" + id).closest(".field");
      setFieldError(f, ok ? "" : msg);
      if (!ok) errors.push($("#" + id));
    };
    check("nome", val("nome").length >= 1, "Inserisci il nome.");
    check("cognome", val("cognome").length >= 1, "Inserisci il cognome.");
    check("nomeArte", val("nomeArte").length >= 1, "Inserisci il nome d'arte.");
    const n = Number(val("eta"));
    check("eta", Number.isInteger(n) && n >= 15 && n <= 25, "La call è per chi ha tra 15 e 25 anni.");
    check("provenienza", val("provenienza").length >= 2, "Dicci di dove sei.");
    check("presentazione", val("presentazione").length >= 20, "Scrivi almeno qualche riga (min. 20 caratteri).");
    check("email", /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val("email")), "Email non valida.");
    check("telefono", /^[+0-9 ().-]{6,20}$/.test(val("telefono")) && val("telefono").replace(/\D/g, "").length >= 6, "Numero non valido.");

    const link = val("link");
    const linkOk = !link || /^https?:\/\/\S+\.\S+/i.test(link);
    check("link", linkOk, "Il link deve iniziare con https://");
    const dropField = drop.closest(".field");
    if (!files.length && !link) { setFieldError(dropField, "Carica almeno un brano oppure inserisci un link."); errors.push(drop); }
    else setFieldError(dropField, "");

    const priv = $("#privacy");
    priv.closest(".check").classList.toggle("is-invalid", !priv.checked);
    if (!priv.checked) errors.push(priv);

    if (n >= 15 && n < 18) {
      const g = $("#genitore");
      g.closest(".check").classList.toggle("is-invalid", !g.checked);
      if (!g.checked) errors.push(g);
    }
    return errors;
  }

  /* ---- invio ---- */
  const btn = $("#submitBtn");
  const formError = $("#formError");
  const showError = (m) => { formError.textContent = m; formError.hidden = !m; };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    showError("");
    const errors = validate();
    if (errors.length) {
      showError("Controlla i campi evidenziati in rosso.");
      errors[0].scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => errors[0].focus?.({ preventScroll: true }), 300);
      return;
    }
    if (CONFIG.ENDPOINT.startsWith("INCOLLA")) { showError("Form non ancora collegato (manca ENDPOINT in app.js)."); return; }

    btn.classList.add("is-loading");
    btn.querySelector(".btn__label").textContent = files.length ? "Caricamento brani…" : "Invio in corso…";

    try {
      const payload = {
        website: form.website.value,
        elapsedMs: Date.now() - startedAt,
        nome: val("nome"), cognome: val("cognome"), nomeArte: val("nomeArte"),
        eta: Number(val("eta")), provenienza: val("provenienza"),
        presentazione: val("presentazione"),
        strumentazione: val("strumentazione"), esigenze: val("esigenze"),
        email: val("email"), telefono: val("telefono"),
        instagram: val("instagram").replace(/^@/, ""), altriSocial: val("altriSocial"),
        link: val("link"),
        privacy: $("#privacy").checked,
        genitore: $("#genitore").checked,
        files: await Promise.all(files.map(async (f) => ({ name: f.name, type: f.type || "audio/" + ext(f.name), data: await toBase64(f) }))),
      };

      // Content-Type text/plain = richiesta "semplice": niente preflight CORS verso Apps Script
      const res = await fetch(CONFIG.ENDPOINT, { method: "POST", body: JSON.stringify(payload) });
      const out = await res.json();
      if (!out.ok) throw new Error(out.error || "Invio non riuscito.");

      form.hidden = true;
      $("#successName").textContent = payload.nomeArte;
      const s = $("#success");
      s.hidden = false;
      s.scrollIntoView({ behavior: "smooth", block: "center" });
      s.focus({ preventScroll: true });
    } catch (err) {
      console.error(err);
      showError(err.message && !/fetch|network|json/i.test(err.message)
        ? err.message
        : "Invio non riuscito: controlla la connessione e riprova. Se il problema continua, prova con file più leggeri o con un link.");
    } finally {
      btn.classList.remove("is-loading");
      btn.querySelector(".btn__label").textContent = "Invia la candidatura";
    }
  });
})();
