/* =========================================================
   BRITOV.COACH — PANEL ADMIN (SQLITE BACKEND & DASHBOARD)
   ========================================================= */
(function () {
  "use strict";

  const TOKEN_KEY = "britov_token";
  let token = localStorage.getItem(TOKEN_KEY) || "";
  let currentContent = null;

  const els = {
    loginScreen: document.getElementById("login-screen"),
    loginForm: document.getElementById("login-form"),
    loginEmail: document.getElementById("login-email"),
    loginPass: document.getElementById("login-pass"),
    loginError: document.getElementById("login-error"),
    shell: document.getElementById("admin-shell"),
    logoutBtn: document.getElementById("logout-btn"),
    saveBtn: document.getElementById("save-btn"),
    saveStatus: document.getElementById("save-status"),
    photoList: document.getElementById("photo-list"),
    videoList: document.getElementById("video-list"),
    addPhoto: document.getElementById("add-photo"),
    addVideo: document.getElementById("add-video"),
    changePassForm: document.getElementById("change-pass-form"),
    newPassInput: document.getElementById("new-pass"),
    passMsg: document.getElementById("pass-msg"),
    // Dashboard elements
    statTotalVisits: document.getElementById("stat-total-visits"),
    statTodayVisits: document.getElementById("stat-today-visits"),
    statWeekVisits: document.getElementById("stat-week-visits"),
    statPhotoCount: document.getElementById("stat-photo-count"),
    topPhotosList: document.getElementById("top-photos-list"),
    topVideosList: document.getElementById("top-videos-list"),
  };

  function mergeWithDefaults(data) {
    const merged = Object.assign({}, DEFAULT_CONTENT, data || {});
    merged.social = Object.assign({}, DEFAULT_CONTENT.social, (data && data.social) || {});
    return JSON.parse(JSON.stringify(merged));
  }

  /* ---------------- boot ---------------- */
  async function boot() {
    if (token) {
      const isAuth = await checkAuth();
      if (isAuth) {
        showPanel();
        return;
      }
    }
    showLogin();
  }

  async function checkAuth() {
    try {
      const res = await fetch("/api/check-auth", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      return data.authenticated;
    } catch (e) {
      return false;
    }
  }

  function showLogin() {
    els.loginScreen.style.display = "flex";
    els.shell.style.display = "none";
    els.shell.classList.remove("visible");
  }

  async function showPanel() {
    els.loginScreen.style.display = "none";
    els.shell.style.display = "block";
    els.shell.classList.add("visible");
    await loadContent();
    await loadAnalytics();
    populateForm();
  }

  /* ---------------- analytics ---------------- */
  async function loadAnalytics() {
    try {
      const res = await fetch("/api/analytics/stats", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const stats = await res.json();
        renderAnalytics(stats);
      }
    } catch (e) {
      console.warn("No se pudieron cargar las analíticas", e);
    }
  }

  function renderAnalytics(stats) {
    if (els.statTotalVisits) els.statTotalVisits.textContent = stats.totalVisits || 0;
    if (els.statTodayVisits) els.statTodayVisits.textContent = stats.visitsToday || 0;
    if (els.statWeekVisits) els.statWeekVisits.textContent = stats.visitsThisWeek || 0;
    if (els.statPhotoCount) els.statPhotoCount.textContent = (currentContent.gallery || []).length;

    // Fotos más vistas
    if (els.topPhotosList) {
      if (stats.topPhotos && stats.topPhotos.length > 0) {
        els.topPhotosList.innerHTML = stats.topPhotos.map(item => `
          <div class="ranking-item">
            <div class="info">
              <img class="mini-thumb" src="${escapeAttr(item.media_url)}" alt="" onerror="this.style.opacity=0.2">
              <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:200px;">${escapeHtml(item.media_caption || "Foto")}</span>
            </div>
            <span class="badge-count">${item.views} vistas</span>
          </div>
        `).join("");
      } else {
        els.topPhotosList.innerHTML = `<p class="hint">Aún no hay interacciones con fotos de la galería.</p>`;
      }
    }

    // Videos más vistos
    if (els.topVideosList) {
      if (stats.topVideos && stats.topVideos.length > 0) {
        els.topVideosList.innerHTML = stats.topVideos.map(item => `
          <div class="ranking-item">
            <div class="info">
              <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:220px;">🎬 ${escapeHtml(item.media_caption || item.media_url)}</span>
            </div>
            <span class="badge-count">${item.views} vistas</span>
          </div>
        `).join("");
      } else {
        els.topVideosList.innerHTML = `<p class="hint">Aún no hay reproducciones de videos.</p>`;
      }
    }
  }

  /* ---------------- auth ---------------- */
  els.loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    els.loginError.textContent = "";
    const email = els.loginEmail.value.trim();
    const password = els.loginPass.value;

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        token = data.token;
        localStorage.setItem(TOKEN_KEY, token);
        showPanel();
      } else {
        els.loginError.textContent = data.error || "Email o contraseña incorrectos.";
      }
    } catch (err) {
      console.error(err);
      els.loginError.textContent = "Error al conectar con el servidor backend.";
    }
  });

  els.logoutBtn.addEventListener("click", () => {
    token = "";
    localStorage.removeItem(TOKEN_KEY);
    showLogin();
  });

  // Cambiar contraseña
  els.changePassForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    els.passMsg.textContent = "Actualizando...";
    els.passMsg.style.color = "var(--gray-300)";

    const newPassword = els.newPassInput.value;
    try {
      const res = await fetch("/api/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ newPassword })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        els.passMsg.textContent = "✅ Contraseña actualizada correctamente.";
        els.passMsg.style.color = "#9ee6b8";
        els.newPassInput.value = "";
      } else {
        els.passMsg.textContent = data.error || "Error al cambiar la contraseña.";
        els.passMsg.style.color = "#e0607a";
      }
    } catch (err) {
      els.passMsg.textContent = "Error de conexión con el servidor.";
      els.passMsg.style.color = "#e0607a";
    }
  });

  /* ---------------- load / populate ---------------- */
  async function loadContent() {
    try {
      const res = await fetch("/api/config");
      if (res.ok) {
        const data = await res.json();
        currentContent = mergeWithDefaults(data);
        return;
      }
    } catch (e) {
      console.warn("No se pudo cargar desde SQLite, usando contenido por defecto.", e);
    }
    currentContent = mergeWithDefaults(null);
  }

  function populateForm() {
    document.getElementById("ribbon-active").checked = !!currentContent.ribbon.active;
    document.getElementById("ribbon-text").value = currentContent.ribbon.text || "";

    document.getElementById("c-black").value = currentContent.colors.black || "#0b0a0f";
    document.getElementById("c-charcoal").value = currentContent.colors.charcoal || "#17151d";
    document.getElementById("c-violetDeep").value = currentContent.colors.violetDeep || "#2c1a4d";
    document.getElementById("c-violet").value = currentContent.colors.violet || "#5b3aa0";
    document.getElementById("c-violetBright").value = currentContent.colors.violetBright || "#8b5cf6";
    document.getElementById("c-gray").value = currentContent.colors.gray || "#a8a3b3";

    document.getElementById("t-brand").value = currentContent.brand || "";
    document.getElementById("t-hero-kicker").value = currentContent.hero.kicker || "";
    document.getElementById("t-hero-heading").value = currentContent.hero.heading || "";
    document.getElementById("t-hero-sub").value = currentContent.hero.subheading || "";
    document.getElementById("t-wsp").value = currentContent.contact.whatsapp || "";
    document.getElementById("t-ig").value = currentContent.contact.instagram || "";

    // Poblar Redes Sociales y Burbuja de WhatsApp
    const soc = currentContent.social || {};
    document.getElementById("wa-bubble-active").checked = (soc.whatsappBubbleActive !== false);
    document.getElementById("wa-default-msg").value = soc.whatsappDefaultMsg || "¡Hola! Quisiera más información sobre los entrenamientos.";

    document.getElementById("s-wsp").value = soc.whatsapp || currentContent.contact.whatsapp || "";
    document.getElementById("s-ig").value = soc.instagram || currentContent.contact.instagram || "";
    document.getElementById("s-fb").value = soc.facebook || "";
    document.getElementById("s-tt").value = soc.tiktok || "";
    document.getElementById("s-yt").value = soc.youtube || "";
    document.getElementById("s-li").value = soc.linkedin || "";

    renderPhotoList();
    renderVideoList();
  }

  /* ---------------- listas dinámicas ---------------- */
  function renderPhotoList() {
    els.photoList.innerHTML = "";
    currentContent.gallery.forEach((item, i) => els.photoList.appendChild(photoRow(item, i)));
    if (els.statPhotoCount) els.statPhotoCount.textContent = currentContent.gallery.length;
  }

  function photoRow(item, i) {
    const row = document.createElement("div");
    row.className = "item-row";
    row.style.gridTemplateColumns = "56px 1fr 1fr auto auto";
    row.innerHTML = `
      <img class="thumb" src="${item.url || ""}" alt="" onerror="this.style.opacity=0.2">
      <div>
        <input type="text" data-field="url" placeholder="URL o subir archivo..." value="${escapeAttr(item.url)}" style="width:100%;">
      </div>
      <input type="text" data-field="caption" placeholder="Descripción" value="${escapeAttr(item.caption)}">
      <label class="btn btn-danger" style="padding:6px 10px;font-size:12px;cursor:pointer;" title="Subir foto desde tu computadora">
        📁 Subir
        <input type="file" accept="image/*" class="file-upload-input" style="display:none;">
      </label>
      <button type="button" class="remove">Quitar</button>
    `;

    const urlInput = row.querySelector('[data-field="url"]');
    const thumbImg = row.querySelector(".thumb");
    const captionInput = row.querySelector('[data-field="caption"]');
    const fileInput = row.querySelector(".file-upload-input");

    urlInput.addEventListener("input", (e) => {
      currentContent.gallery[i].url = e.target.value;
      thumbImg.src = e.target.value;
      thumbImg.style.opacity = "1";
    });

    captionInput.addEventListener("input", (e) => {
      currentContent.gallery[i].caption = e.target.value;
    });

    fileInput.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const formData = new FormData();
      formData.append("photo", file);

      urlInput.value = "Subiendo...";

      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData
        });
        const data = await res.json();
        if (res.ok && data.success) {
          urlInput.value = data.url;
          currentContent.gallery[i].url = data.url;
          thumbImg.src = data.url;
          thumbImg.style.opacity = "1";
        } else {
          alert("Error al subir imagen: " + (data.error || "Desconocido"));
          urlInput.value = currentContent.gallery[i].url || "";
        }
      } catch (err) {
        alert("Error de conexión al subir la imagen.");
        urlInput.value = currentContent.gallery[i].url || "";
      }
    });

    row.querySelector(".remove").addEventListener("click", () => {
      currentContent.gallery.splice(i, 1);
      renderPhotoList();
    });

    return row;
  }

  function renderVideoList() {
    els.videoList.innerHTML = "";
    currentContent.videos.forEach((item, i) => els.videoList.appendChild(videoRow(item, i)));
  }

  function videoRow(item, i) {
    const row = document.createElement("div");
    row.className = "item-row";
    row.style.gridTemplateColumns = "1fr 1fr auto";
    row.innerHTML = `
      <input type="text" data-field="url" placeholder="Link de YouTube o Vimeo" value="${escapeAttr(item.url)}">
      <input type="text" data-field="caption" placeholder="Descripción" value="${escapeAttr(item.caption)}">
      <button type="button" class="remove">Quitar</button>
    `;
    row.querySelector('[data-field="url"]').addEventListener("input", (e) => {
      currentContent.videos[i].url = e.target.value;
    });
    row.querySelector('[data-field="caption"]').addEventListener("input", (e) => {
      currentContent.videos[i].caption = e.target.value;
    });
    row.querySelector(".remove").addEventListener("click", () => {
      currentContent.videos.splice(i, 1);
      renderVideoList();
    });
    return row;
  }

  els.addPhoto.addEventListener("click", () => {
    currentContent.gallery.push({ url: "", caption: "" });
    renderPhotoList();
  });

  els.addVideo.addEventListener("click", () => {
    currentContent.videos.push({ url: "", caption: "" });
    renderVideoList();
  });

  function escapeAttr(str) {
    return String(str || "").replace(/"/g, "&quot;");
  }

  function escapeHtml(str) {
    return String(str || "").replace(/[&<>"']/g, m => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[m]));
  }

  /* ---------------- guardar ---------------- */
  els.saveBtn.addEventListener("click", async () => {
    collectFormIntoContent();
    els.saveStatus.textContent = "Guardando en SQLite…";
    els.saveStatus.style.color = "var(--gray-300)";

    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(currentContent)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        els.saveStatus.textContent = "✅ Guardado exitosamente en la base de datos SQLite.";
        els.saveStatus.style.color = "#9ee6b8";
        await loadAnalytics(); // Recargar analíticas tras guardar
      } else {
        els.saveStatus.textContent = "❌ Error: " + (data.error || "No se pudo guardar.");
        els.saveStatus.style.color = "#e0607a";
      }
    } catch (e) {
      console.error(e);
      els.saveStatus.textContent = "❌ No se pudo conectar con el servidor.";
      els.saveStatus.style.color = "#e0607a";
    }

    setTimeout(() => { els.saveStatus.textContent = ""; }, 5000);
  });

  function collectFormIntoContent() {
    currentContent.ribbon.active = document.getElementById("ribbon-active").checked;
    currentContent.ribbon.text = document.getElementById("ribbon-text").value.trim();

    currentContent.colors.black = document.getElementById("c-black").value;
    currentContent.colors.charcoal = document.getElementById("c-charcoal").value;
    currentContent.colors.violetDeep = document.getElementById("c-violetDeep").value;
    currentContent.colors.violet = document.getElementById("c-violet").value;
    currentContent.colors.violetBright = document.getElementById("c-violetBright").value;
    currentContent.colors.gray = document.getElementById("c-gray").value;

    currentContent.brand = document.getElementById("t-brand").value.trim();
    currentContent.hero.kicker = document.getElementById("t-hero-kicker").value.trim();
    currentContent.hero.heading = document.getElementById("t-hero-heading").value.trim();
    currentContent.hero.subheading = document.getElementById("t-hero-sub").value.trim();
    currentContent.contact.whatsapp = document.getElementById("t-wsp").value.trim();
    currentContent.contact.instagram = document.getElementById("t-ig").value.trim();

    // Recolectar datos sociales y de la burbuja
    currentContent.social = currentContent.social || {};
    currentContent.social.whatsappBubbleActive = document.getElementById("wa-bubble-active").checked;
    currentContent.social.whatsappDefaultMsg = document.getElementById("wa-default-msg").value.trim();

    currentContent.social.whatsapp = document.getElementById("s-wsp").value.trim();
    currentContent.social.instagram = document.getElementById("s-ig").value.trim();
    currentContent.social.facebook = document.getElementById("s-fb").value.trim();
    currentContent.social.tiktok = document.getElementById("s-tt").value.trim();
    currentContent.social.youtube = document.getElementById("s-yt").value.trim();
    currentContent.social.linkedin = document.getElementById("s-li").value.trim();

    // Sincronizar whatsapp / instagram principal en contact
    if (currentContent.social.whatsapp) currentContent.contact.whatsapp = currentContent.social.whatsapp;
    if (currentContent.social.instagram) currentContent.contact.instagram = currentContent.social.instagram;
  }

  boot();
})();
