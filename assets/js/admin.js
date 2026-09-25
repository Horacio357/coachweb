/* =========================================================
   BRITOV.COACH — PANEL ADMIN COMPLETO (SQLITE & HERO SLIDER)
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
    
    // Listas dinámicas
    photoList: document.getElementById("photo-list"),
    videoList: document.getElementById("video-list"),
    servicesList: document.getElementById("services-list"),
    processList: document.getElementById("process-list"),
    heroPhotoList: document.getElementById("hero-photo-list"),
    
    // Botones de agregar
    addPhoto: document.getElementById("add-photo"),
    addVideo: document.getElementById("add-video"),
    addService: document.getElementById("add-service"),
    addProcessStep: document.getElementById("add-process-step"),
    addHeroPhoto: document.getElementById("add-hero-photo"),

    // Seguridad
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

  function isObject(item) {
    return (item && typeof item === 'object' && !Array.isArray(item));
  }

  function deepMerge(target, source) {
    const output = Object.assign({}, target);
    if (isObject(target) && isObject(source)) {
      Object.keys(source).forEach(key => {
        if (isObject(source[key])) {
          if (!(key in target)) Object.assign(output, { [key]: source[key] });
          else output[key] = deepMerge(target[key], source[key]);
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      });
    }
    return output;
  }

  function mergeWithDefaults(data) {
    return JSON.parse(JSON.stringify(deepMerge(DEFAULT_CONTENT, data || {})));
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

  function setupSectionToggles() {
    document.querySelectorAll("[data-section]").forEach(cb => {
      cb.addEventListener("change", (e) => {
        const key = e.target.getAttribute("data-section");
        const isChecked = e.target.checked;
        document.querySelectorAll(`[data-section="${key}"]`).forEach(el => el.checked = isChecked);
      });
    });
  }

  async function showPanel() {
    els.loginScreen.style.display = "none";
    els.shell.style.display = "block";
    els.shell.classList.add("visible");
    await loadContent();
    await loadAnalytics();
    populateForm();
    setupOpacitySliders();
    setupFileUploads();
    setupSectionToggles();
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

  function setupOpacitySliders() {
    const sliders = [
      { slider: "bg-hero-opacity", val: "bg-hero-opacity-val" },
      { slider: "bg-about-opacity", val: "bg-about-opacity-val" },
      { slider: "bg-contact-opacity", val: "bg-contact-opacity-val" }
    ];

    sliders.forEach(item => {
      const sliderElem = document.getElementById(item.slider);
      const valElem = document.getElementById(item.val);
      if (sliderElem && valElem) {
        sliderElem.addEventListener("input", (e) => {
          valElem.textContent = e.target.value + "%";
        });
      }
    });
  }

  function updateFieldPreview(textInputId, previewImgId, previewBoxId) {
    const textInput = document.getElementById(textInputId);
    const previewImg = document.getElementById(previewImgId);
    const previewBox = document.getElementById(previewBoxId);
    if (!textInput || !previewImg || !previewBox) return;

    const val = textInput.value.trim();
    if (val && !val.startsWith("Subiendo")) {
      previewImg.src = val;
      previewBox.style.display = "block";
    } else {
      previewBox.style.display = "none";
    }
  }

  function setupFileUploads() {
    const bindUpload = (fileInputId, textInputId, clearBtnId, previewImgId, previewBoxId) => {
      const fileInput = document.getElementById(fileInputId);
      const textInput = document.getElementById(textInputId);
      const clearBtn = document.getElementById(clearBtnId);

      if (textInput) {
        textInput.addEventListener("input", () => {
          updateFieldPreview(textInputId, previewImgId, previewBoxId);
        });
      }

      if (clearBtn && textInput) {
        clearBtn.addEventListener("click", () => {
          textInput.value = "";
          updateFieldPreview(textInputId, previewImgId, previewBoxId);
        });
      }

      if (!fileInput || !textInput) return;

      fileInput.addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("photo", file);
        textInput.value = "Subiendo...";
        updateFieldPreview(textInputId, previewImgId, previewBoxId);

        try {
          const res = await fetch("/api/upload", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: formData
          });
          const data = await res.json();
          if (res.ok && data.success) {
            textInput.value = data.url;
            updateFieldPreview(textInputId, previewImgId, previewBoxId);
            els.saveBtn.click();
          } else {
            alert("Error al subir imagen: " + (data.error || "Desconocido"));
            textInput.value = "";
            updateFieldPreview(textInputId, previewImgId, previewBoxId);
          }
        } catch (err) {
          alert("Error de conexión al subir la imagen.");
          textInput.value = "";
          updateFieldPreview(textInputId, previewImgId, previewBoxId);
        }
      });
    };

    bindUpload("file-bg-hero", "bg-hero-img", "clear-bg-hero", "preview-bg-hero", "preview-box-bg-hero");
    bindUpload("file-bg-about", "bg-about-img", "clear-bg-about", "preview-bg-about", "preview-box-bg-about");
    bindUpload("file-bg-contact", "bg-contact-img", "clear-bg-contact", "preview-bg-contact", "preview-box-bg-contact");
    bindUpload("file-about-img", "t-about-img", "clear-about-img", "preview-about-img", "preview-box-about-img");

    setupBulkUpload();
  }

  function setupBulkUpload() {
    const bulkInput = document.getElementById("bulk-photo-upload");
    const statusSpan = document.getElementById("bulk-upload-status");
    if (!bulkInput) return;

    bulkInput.addEventListener("change", async (e) => {
      const files = Array.from(e.target.files || []);
      if (!files.length) return;

      if (statusSpan) {
        statusSpan.style.color = "var(--violet-200)";
        statusSpan.textContent = `⏳ Subiendo ${files.length} fotos...`;
      }

      const formData = new FormData();
      files.forEach(f => formData.append("photos", f));

      try {
        const res = await fetch("/api/upload-multiple", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData
        });
        const data = await res.json();

        if (res.status === 401) {
          alert("Su sesión ha expirado. Por favor, vuelva a iniciar sesión.");
          showLogin();
          return;
        }

        if (res.ok && data.success && Array.isArray(data.files)) {
          // Limpiar filas vacías por defecto de la galería
          currentContent.gallery = (currentContent.gallery || []).filter(item => item && item.url && item.url.trim() !== "");
          data.files.forEach(item => {
            currentContent.gallery.push({ url: item.url, caption: "" });
          });
          renderPhotoList();
          els.saveBtn.click();
          if (statusSpan) {
            statusSpan.style.color = "#9ee6b8";
            statusSpan.textContent = `✅ ¡${data.files.length} fotos cargadas y guardadas exitosamente!`;
            setTimeout(() => { statusSpan.textContent = ""; }, 5000);
          }
        } else {
          alert("Error en la carga masiva: " + (data.error || "Desconocido"));
          if (statusSpan) statusSpan.textContent = "";
        }
      } catch (err) {
        console.error(err);
        alert("Error de conexión durante la carga masiva.");
        if (statusSpan) statusSpan.textContent = "";
      } finally {
        bulkInput.value = "";
      }
    });
  }

  function populateForm() {
    const c = currentContent;

    // Cinta y Colores
    document.getElementById("ribbon-active").checked = !!c.ribbon.active;
    document.getElementById("ribbon-text").value = c.ribbon.text || "";

    // Visibilidad de Secciones
    const sec = c.sections || {};
    ["hero", "about", "services", "process", "gallery", "videos", "contact"].forEach(key => {
      const isVis = sec[key] !== false;
      document.querySelectorAll(`[data-section="${key}"]`).forEach(cb => cb.checked = isVis);
    });

    // Efectos
    const eff = c.effects || {};
    const srElem = document.getElementById("scroll-reveal-active");
    if (srElem) srElem.checked = (eff.scrollRevealActive !== false);

    document.getElementById("c-black").value = c.colors.black || "#0b0a0f";
    document.getElementById("c-charcoal").value = c.colors.charcoal || "#17151d";
    document.getElementById("c-violetDeep").value = c.colors.violetDeep || "#2c1a4d";
    document.getElementById("c-violet").value = c.colors.violet || "#5b3aa0";
    document.getElementById("c-violetBright").value = c.colors.violetBright || "#8b5cf6";
    document.getElementById("c-gray").value = c.colors.gray || "#a8a3b3";

    // Fondos y Opacidad
    const bg = c.backgrounds || {};
    document.getElementById("bg-hero-img").value = (bg.hero && bg.hero.image) || "";
    document.getElementById("bg-hero-opacity").value = Math.round(((bg.hero && bg.hero.opacity !== undefined) ? bg.hero.opacity : 0.35) * 100);
    document.getElementById("bg-hero-opacity-val").textContent = Math.round(((bg.hero && bg.hero.opacity !== undefined) ? bg.hero.opacity : 0.35) * 100) + "%";
    updateFieldPreview("bg-hero-img", "preview-bg-hero", "preview-box-bg-hero");

    document.getElementById("bg-about-img").value = (bg.about && bg.about.image) || "";
    document.getElementById("bg-about-opacity").value = Math.round(((bg.about && bg.about.opacity !== undefined) ? bg.about.opacity : 0.20) * 100);
    document.getElementById("bg-about-opacity-val").textContent = Math.round(((bg.about && bg.about.opacity !== undefined) ? bg.about.opacity : 0.20) * 100) + "%";
    updateFieldPreview("bg-about-img", "preview-bg-about", "preview-box-bg-about");

    document.getElementById("bg-contact-img").value = (bg.contact && bg.contact.image) || "";
    document.getElementById("bg-contact-opacity").value = Math.round(((bg.contact && bg.contact.opacity !== undefined) ? bg.contact.opacity : 0.30) * 100);
    document.getElementById("bg-contact-opacity-val").textContent = Math.round(((bg.contact && bg.contact.opacity !== undefined) ? bg.contact.opacity : 0.30) * 100) + "%";
    updateFieldPreview("bg-contact-img", "preview-bg-contact", "preview-box-bg-contact");

    // Menú Navegación
    const nav = c.nav || {};
    document.getElementById("n-about").value = nav.about || "Sobre mí";
    document.getElementById("n-services").value = nav.services || "Servicios";
    document.getElementById("n-process").value = nav.process || "Cómo trabajamos";
    document.getElementById("n-gallery").value = nav.gallery || "Galería";
    document.getElementById("n-videos").value = nav.videos || "Videos";
    document.getElementById("n-contact").value = nav.contact || "Contacto";
    document.getElementById("n-cta").value = nav.ctaBtn || "Reservar";

    // Portada Hero
    document.getElementById("t-brand").value = c.brand || "";
    document.getElementById("t-hero-kicker").value = c.hero.kicker || "";
    document.getElementById("t-hero-heading").value = c.hero.heading || "";
    document.getElementById("t-hero-sub").value = c.hero.subheading || "";
    document.getElementById("t-hero-cta1").value = c.hero.ctaPrimary || "";
    document.getElementById("t-hero-cta2").value = c.hero.ctaSecondary || "";

    // Animación y Fotos de Portada (Hero Visual)
    document.getElementById("hero-autoplay").checked = (c.hero.autoplay !== false);
    document.getElementById("hero-interval").value = c.hero.interval || 4;
    const heroFit = document.getElementById("hero-fit-mode");
    if (heroFit) heroFit.value = c.hero.fit || "cover";

    if ((!c.hero.images || c.hero.images.length === 0) && c.hero.image) {
      c.hero.images = [{ url: c.hero.image, caption: "" }];
    }

    // Sobre Mí
    document.getElementById("t-about-heading").value = c.about.heading || "";
    document.getElementById("t-about-text").value = c.about.text || "";
    document.getElementById("t-about-badge").value = c.about.badge || "";
    document.getElementById("t-about-img").value = c.about.image || "";
    updateFieldPreview("t-about-img", "preview-about-img", "preview-box-about-img");

    // Secciones Encabezados
    const ss = c.servicesSection || {};
    document.getElementById("t-services-heading").value = ss.heading || "";
    document.getElementById("t-services-lede").value = ss.lede || "";

    const ps = c.processSection || {};
    document.getElementById("t-process-heading").value = ps.heading || "";
    document.getElementById("t-process-lede").value = ps.lede || "";

    const gs = c.gallerySection || {};
    document.getElementById("t-gallery-heading").value = gs.heading || "";
    document.getElementById("t-gallery-lede").value = gs.lede || "";
    const galFit = document.getElementById("gallery-fit-mode");
    if (galFit) galFit.value = gs.fit || "contain";
    const galHeight = document.getElementById("gallery-height-mode");
    if (galHeight) galHeight.value = gs.height || "tall";

    const vs = c.videosSection || {};
    document.getElementById("t-videos-heading").value = vs.heading || "";
    document.getElementById("t-videos-lede").value = vs.lede || "";

    // Contacto (Textos)
    document.getElementById("t-contact-heading").value = c.contact.heading || "";
    document.getElementById("t-contact-text").value = c.contact.text || "";
    document.getElementById("t-contact-name-label").value = c.contact.nameLabel || "Nombre";
    document.getElementById("t-contact-email-label").value = c.contact.emailLabel || "Email";
    document.getElementById("t-contact-msg-label").value = c.contact.msgLabel || "Contame tu objetivo";
    document.getElementById("t-contact-btn-text").value = c.contact.btnText || "Enviar";

    // Footer
    const ft = c.footer || {};
    document.getElementById("t-footer-desc").value = ft.brandDesc || "";
    document.getElementById("t-footer-filmstrip-label").value = ft.filmstripLabel || "";
    document.getElementById("t-footer-copy").value = ft.copyright || "";

    // Redes Sociales y Burbuja
    const soc = c.social || {};
    document.getElementById("wa-bubble-active").checked = (soc.whatsappBubbleActive !== false);
    document.getElementById("wa-default-msg").value = soc.whatsappDefaultMsg || "¡Hola! Quisiera más información sobre los entrenamientos.";

    document.getElementById("s-wsp").value = soc.whatsapp || c.contact.whatsapp || "";
    document.getElementById("s-ig").value = soc.instagram || c.contact.instagram || "";
    document.getElementById("s-fb").value = soc.facebook || "";
    document.getElementById("s-tt").value = soc.tiktok || "";
    document.getElementById("s-yt").value = soc.youtube || "";
    document.getElementById("s-li").value = soc.linkedin || "";

    // Renderizado listas dinámicas
    renderHeroPhotoList();
    renderPhotoList();
    renderVideoList();
    renderServicesList();
    renderProcessList();
  }

  /* ---------------- listas dinámicas ---------------- */
  function renderHeroPhotoList() {
    if (!els.heroPhotoList) return;
    els.heroPhotoList.innerHTML = "";
    (currentContent.hero.images || []).forEach((item, i) => els.heroPhotoList.appendChild(heroPhotoRow(item, i)));
  }

  function heroPhotoRow(item, i) {
    const row = document.createElement("div");
    row.className = "item-row";
    row.style.gridTemplateColumns = "56px 1fr 1fr auto auto";
    row.innerHTML = `
      <img class="thumb" src="${item.url || ""}" alt="" onerror="this.style.opacity=0.2">
      <div>
        <input type="text" data-field="url" placeholder="URL de la foto de portada..." value="${escapeAttr(item.url)}" style="width:100%;">
      </div>
      <input type="text" data-field="caption" placeholder="Descripción corta (opcional)" value="${escapeAttr(item.caption)}">
      <label class="btn btn-danger" style="padding:6px 10px;font-size:12px;cursor:pointer;" title="Cambiar foto desde tu computadora">
        📁 Cambiar foto
        <input type="file" accept="image/*" class="file-upload-input" style="display:none;">
      </label>
      <button type="button" class="remove" title="Quitar esta foto">❌ Quitar</button>
    `;

    const urlInput = row.querySelector('[data-field="url"]');
    const thumbImg = row.querySelector(".thumb");
    const captionInput = row.querySelector('[data-field="caption"]');
    const fileInput = row.querySelector(".file-upload-input");

    urlInput.addEventListener("input", (e) => {
      currentContent.hero.images[i].url = e.target.value;
      thumbImg.src = e.target.value;
      thumbImg.style.opacity = "1";
    });

    captionInput.addEventListener("input", (e) => {
      currentContent.hero.images[i].caption = e.target.value;
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
          currentContent.hero.images[i].url = data.url;
          thumbImg.src = data.url;
          thumbImg.style.opacity = "1";
          els.saveBtn.click();
        } else {
          alert("Error al subir imagen: " + (data.error || "Desconocido"));
          urlInput.value = currentContent.hero.images[i].url || "";
        }
      } catch (err) {
        alert("Error de conexión al subir la imagen.");
        urlInput.value = currentContent.hero.images[i].url || "";
      }
    });

    row.querySelector(".remove").addEventListener("click", () => {
      currentContent.hero.images.splice(i, 1);
      renderHeroPhotoList();
      els.saveBtn.click();
    });

    return row;
  }

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
      <label class="btn btn-danger" style="padding:6px 10px;font-size:12px;cursor:pointer;" title="Cambiar foto desde tu computadora">
        📁 Cambiar foto
        <input type="file" accept="image/*" class="file-upload-input" style="display:none;">
      </label>
      <button type="button" class="remove" title="Quitar esta foto">❌ Quitar</button>
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
          els.saveBtn.click();
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
      els.saveBtn.click();
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
    row.style.gridTemplateColumns = "1fr 1fr auto auto";
    row.innerHTML = `
      <input type="text" data-field="url" placeholder="URL de YouTube, Shorts, Reels o subir video..." value="${escapeAttr(item.url)}">
      <input type="text" data-field="caption" placeholder="Descripción" value="${escapeAttr(item.caption)}">
      <label class="btn btn-danger" style="padding:6px 10px;font-size:12px;cursor:pointer;" title="Cambiar video desde tu computadora">
        📁 Cambiar video
        <input type="file" accept="video/*" class="video-upload-input" style="display:none;">
      </label>
      <button type="button" class="remove" title="Quitar este video">❌ Quitar</button>
    `;

    const urlInput = row.querySelector('[data-field="url"]');
    const captionInput = row.querySelector('[data-field="caption"]');
    const fileInput = row.querySelector(".video-upload-input");

    urlInput.addEventListener("input", (e) => {
      currentContent.videos[i].url = e.target.value;
    });

    captionInput.addEventListener("input", (e) => {
      currentContent.videos[i].caption = e.target.value;
    });

    fileInput.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const formData = new FormData();
      formData.append("photo", file);
      urlInput.value = "Subiendo video (por favor espere)...";

      try {
        const res = await fetch("/api/upload", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData
        });
        const data = await res.json();
        if (res.ok && data.success) {
          urlInput.value = data.url;
          currentContent.videos[i].url = data.url;
          els.saveBtn.click();
        } else {
          alert("Error al subir video: " + (data.error || "Desconocido"));
          urlInput.value = currentContent.videos[i].url || "";
        }
      } catch (err) {
        alert("Error de conexión al subir el video.");
        urlInput.value = currentContent.videos[i].url || "";
      }
    });

    row.querySelector(".remove").addEventListener("click", () => {
      currentContent.videos.splice(i, 1);
      renderVideoList();
      els.saveBtn.click();
    });

    return row;
  }

  function renderServicesList() {
    els.servicesList.innerHTML = "";
    (currentContent.services || []).forEach((item, i) => els.servicesList.appendChild(serviceRow(item, i)));
  }

  function serviceRow(item, i) {
    const row = document.createElement("div");
    row.className = "item-row";
    row.style.gridTemplateColumns = "1fr 2fr auto";
    row.innerHTML = `
      <input type="text" data-field="title" placeholder="Título del Servicio" value="${escapeAttr(item.title)}">
      <input type="text" data-field="text" placeholder="Descripción del servicio" value="${escapeAttr(item.text)}">
      <button type="button" class="remove">Quitar</button>
    `;
    row.querySelector('[data-field="title"]').addEventListener("input", (e) => {
      currentContent.services[i].title = e.target.value;
    });
    row.querySelector('[data-field="text"]').addEventListener("input", (e) => {
      currentContent.services[i].text = e.target.value;
    });
    row.querySelector(".remove").addEventListener("click", () => {
      currentContent.services.splice(i, 1);
      renderServicesList();
    });
    return row;
  }

  function renderProcessList() {
    els.processList.innerHTML = "";
    (currentContent.process || []).forEach((item, i) => els.processList.appendChild(processRow(item, i)));
  }

  function processRow(item, i) {
    const row = document.createElement("div");
    row.className = "item-row";
    row.style.gridTemplateColumns = "1fr 2fr auto";
    row.innerHTML = `
      <input type="text" data-field="title" placeholder="Título del Paso" value="${escapeAttr(item.title)}">
      <input type="text" data-field="text" placeholder="Descripción del paso" value="${escapeAttr(item.text)}">
      <button type="button" class="remove">Quitar</button>
    `;
    row.querySelector('[data-field="title"]').addEventListener("input", (e) => {
      currentContent.process[i].title = e.target.value;
    });
    row.querySelector('[data-field="text"]').addEventListener("input", (e) => {
      currentContent.process[i].text = e.target.value;
    });
    row.querySelector(".remove").addEventListener("click", () => {
      currentContent.process.splice(i, 1);
      renderProcessList();
    });
    return row;
  }

  // Eventos para botones de agregar
  if (els.addHeroPhoto) {
    els.addHeroPhoto.addEventListener("click", () => {
      currentContent.hero.images = currentContent.hero.images || [];
      currentContent.hero.images.push({ url: "", caption: "" });
      renderHeroPhotoList();
    });
  }

  els.addPhoto.addEventListener("click", () => {
    currentContent.gallery.push({ url: "", caption: "" });
    renderPhotoList();
  });

  els.addVideo.addEventListener("click", () => {
    currentContent.videos.push({ url: "", caption: "" });
    renderVideoList();
  });

  els.addService.addEventListener("click", () => {
    currentContent.services = currentContent.services || [];
    currentContent.services.push({ title: "", text: "" });
    renderServicesList();
  });

  els.addProcessStep.addEventListener("click", () => {
    currentContent.process = currentContent.process || [];
    currentContent.process.push({ title: "", text: "" });
    renderProcessList();
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
        els.saveStatus.textContent = "✅ Cambios guardados exitosamente en la base de datos SQLite.";
        els.saveStatus.style.color = "#9ee6b8";
        await loadAnalytics();
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
    const c = currentContent;

    // Cinta y Colores
    c.ribbon.active = document.getElementById("ribbon-active").checked;
    c.ribbon.text = document.getElementById("ribbon-text").value.trim();

    // Visibilidad de Secciones
    c.sections = c.sections || {};
    ["hero", "about", "services", "process", "gallery", "videos", "contact"].forEach(key => {
      const cb = document.querySelector(`[data-section="${key}"]`);
      if (cb) c.sections[key] = cb.checked;
    });

    // Efectos
    c.effects = c.effects || {};
    const srElem = document.getElementById("scroll-reveal-active");
    if (srElem) c.effects.scrollRevealActive = srElem.checked;

    c.colors.black = document.getElementById("c-black").value;
    c.colors.charcoal = document.getElementById("c-charcoal").value;
    c.colors.violetDeep = document.getElementById("c-violetDeep").value;
    c.colors.violet = document.getElementById("c-violet").value;
    c.colors.violetBright = document.getElementById("c-violetBright").value;
    c.colors.gray = document.getElementById("c-gray").value;

    // Fondos y Opacidad
    c.backgrounds = c.backgrounds || {};
    c.backgrounds.hero = {
      image: document.getElementById("bg-hero-img").value.trim(),
      opacity: parseFloat(document.getElementById("bg-hero-opacity").value) / 100
    };
    c.backgrounds.about = {
      image: document.getElementById("bg-about-img").value.trim(),
      opacity: parseFloat(document.getElementById("bg-about-opacity").value) / 100
    };
    c.backgrounds.contact = {
      image: document.getElementById("bg-contact-img").value.trim(),
      opacity: parseFloat(document.getElementById("bg-contact-opacity").value) / 100
    };

    // Menú Navegación
    c.nav = c.nav || {};
    c.nav.about = document.getElementById("n-about").value.trim();
    c.nav.services = document.getElementById("n-services").value.trim();
    c.nav.process = document.getElementById("n-process").value.trim();
    c.nav.gallery = document.getElementById("n-gallery").value.trim();
    c.nav.videos = document.getElementById("n-videos").value.trim();
    c.nav.contact = document.getElementById("n-contact").value.trim();
    c.nav.ctaBtn = document.getElementById("n-cta").value.trim();

    // Portada (Hero)
    c.brand = document.getElementById("t-brand").value.trim();
    c.hero.kicker = document.getElementById("t-hero-kicker").value.trim();
    c.hero.heading = document.getElementById("t-hero-heading").value.trim();
    c.hero.subheading = document.getElementById("t-hero-sub").value.trim();
    c.hero.ctaPrimary = document.getElementById("t-hero-cta1").value.trim();
    c.hero.ctaSecondary = document.getElementById("t-hero-cta2").value.trim();

    c.hero.autoplay = document.getElementById("hero-autoplay").checked;
    c.hero.interval = parseInt(document.getElementById("hero-interval").value, 10) || 4;
    const heroFitEl = document.getElementById("hero-fit-mode");
    if (heroFitEl) c.hero.fit = heroFitEl.value;

    if (c.hero.images && c.hero.images.length > 0) {
      c.hero.image = c.hero.images[0].url;
    }

    // Sobre Mí
    c.about.heading = document.getElementById("t-about-heading").value.trim();
    c.about.text = document.getElementById("t-about-text").value.trim();
    c.about.badge = document.getElementById("t-about-badge").value.trim();
    c.about.image = document.getElementById("t-about-img").value.trim();

    // Encabezados Secciones
    c.servicesSection = c.servicesSection || {};
    c.servicesSection.heading = document.getElementById("t-services-heading").value.trim();
    c.servicesSection.lede = document.getElementById("t-services-lede").value.trim();

    c.processSection = c.processSection || {};
    c.processSection.heading = document.getElementById("t-process-heading").value.trim();
    c.processSection.lede = document.getElementById("t-process-lede").value.trim();

    c.gallerySection = c.gallerySection || {};
    c.gallerySection.heading = document.getElementById("t-gallery-heading").value.trim();
    c.gallerySection.lede = document.getElementById("t-gallery-lede").value.trim();
    const galFitEl = document.getElementById("gallery-fit-mode");
    if (galFitEl) c.gallerySection.fit = galFitEl.value;
    const galHeightEl = document.getElementById("gallery-height-mode");
    if (galHeightEl) c.gallerySection.height = galHeightEl.value;

    c.videosSection = c.videosSection || {};
    c.videosSection.heading = document.getElementById("t-videos-heading").value.trim();
    c.videosSection.lede = document.getElementById("t-videos-lede").value.trim();

    // Contacto (Textos)
    c.contact.heading = document.getElementById("t-contact-heading").value.trim();
    c.contact.text = document.getElementById("t-contact-text").value.trim();
    c.contact.nameLabel = document.getElementById("t-contact-name-label").value.trim();
    c.contact.emailLabel = document.getElementById("t-contact-email-label").value.trim();
    c.contact.msgLabel = document.getElementById("t-contact-msg-label").value.trim();
    c.contact.btnText = document.getElementById("t-contact-btn-text").value.trim();

    // Footer
    c.footer = c.footer || {};
    c.footer.brandDesc = document.getElementById("t-footer-desc").value.trim();
    c.footer.filmstripLabel = document.getElementById("t-footer-filmstrip-label").value.trim();
    c.footer.copyright = document.getElementById("t-footer-copy").value.trim();

    // Redes Sociales y WhatsApp
    c.social = c.social || {};
    c.social.whatsappBubbleActive = document.getElementById("wa-bubble-active").checked;
    c.social.whatsappDefaultMsg = document.getElementById("wa-default-msg").value.trim();
    c.social.whatsapp = document.getElementById("s-wsp").value.trim();
    c.social.instagram = document.getElementById("s-ig").value.trim();
    c.social.facebook = document.getElementById("s-fb").value.trim();
    c.social.tiktok = document.getElementById("s-tt").value.trim();
    c.social.youtube = document.getElementById("s-yt").value.trim();
    c.social.linkedin = document.getElementById("s-li").value.trim();

    if (c.social.whatsapp) c.contact.whatsapp = c.social.whatsapp;
    if (c.social.instagram) c.contact.instagram = c.social.instagram;

    // Coleccionar Listas Dinámicas desde el DOM
    if (els.heroPhotoList) {
      c.hero.images = Array.from(els.heroPhotoList.querySelectorAll(".item-row")).map(row => ({
        url: row.querySelector('[data-field="url"]')?.value.trim() || "",
        caption: row.querySelector('[data-field="caption"]')?.value.trim() || ""
      }));
      if (c.hero.images.length > 0) c.hero.image = c.hero.images[0].url;
    }

    if (els.photoList) {
      c.gallery = Array.from(els.photoList.querySelectorAll(".item-row")).map(row => ({
        url: row.querySelector('[data-field="url"]')?.value.trim() || "",
        caption: row.querySelector('[data-field="caption"]')?.value.trim() || ""
      }));
    }

    if (els.videoList) {
      c.videos = Array.from(els.videoList.querySelectorAll(".item-row")).map(row => ({
        url: row.querySelector('[data-field="url"]')?.value.trim() || "",
        caption: row.querySelector('[data-field="caption"]')?.value.trim() || ""
      }));
    }

    if (els.servicesList) {
      c.services = Array.from(els.servicesList.querySelectorAll(".item-row")).map(row => ({
        title: row.querySelector('[data-field="title"]')?.value.trim() || "",
        text: row.querySelector('[data-field="text"]')?.value.trim() || ""
      }));
    }

    if (els.processList) {
      c.process = Array.from(els.processList.querySelectorAll(".item-row")).map(row => ({
        title: row.querySelector('[data-field="title"]')?.value.trim() || "",
        text: row.querySelector('[data-field="text"]')?.value.trim() || ""
      }));
    }
  }

  boot();
})();
