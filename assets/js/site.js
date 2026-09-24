/* =========================================================
   BRITOV.COACH — SITIO PÚBLICO
   ========================================================= */
(function () {
  "use strict";

  const LOCAL_KEY = "britov_coach_preview";
  let content = null;

  function getLocalPreview() {
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
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

  function isObject(item) {
    return (item && typeof item === 'object' && !Array.isArray(item));
  }

  function mergeWithDefaults(data) {
    return deepMerge(DEFAULT_CONTENT, data || {});
  }

  async function loadContent() {
    try {
      const res = await fetch("/api/config");
      if (res.ok) {
        const data = await res.json();
        return mergeWithDefaults(data);
      }
    } catch (e) {
      console.warn("No se pudo conectar a la API de SQLite, usando respaldo local.", e);
    }
    return mergeWithDefaults(getLocalPreview());
  }

  // --- ANALYTICS TRACKING ---
  function trackVisit() {
    try {
      fetch("/api/analytics/track-visit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ page: "home" })
      }).catch(() => {});
    } catch (e) {}
  }

  function trackMedia(type, url, caption) {
    if (!url) return;
    try {
      fetch("/api/analytics/track-media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ media_type: type, media_url: url, media_caption: caption || "" })
      }).catch(() => {});
    } catch (e) {}
  }

  // --- RENDERING ---
  function applyColors(colors) {
    const root = document.documentElement.style;
    const map = {
      black: "--black", charcoal: "--charcoal",
      violetDeep: "--violet-900", violet: "--violet-700",
      violetBright: "--violet-500", gray: "--gray-300"
    };
    Object.entries(map).forEach(([key, cssVar]) => {
      if (colors && colors[key]) root.setProperty(cssVar, colors[key]);
    });
  }

  function renderBackgrounds(backgrounds) {
    if (!backgrounds) return;

    // Hero Background
    const heroLayer = document.getElementById("hero-bg-layer");
    if (heroLayer) {
      if (backgrounds.hero && backgrounds.hero.image) {
        const opacity = backgrounds.hero.opacity !== undefined ? backgrounds.hero.opacity : 0.35;
        heroLayer.innerHTML = `<img src="${backgrounds.hero.image}" alt="" style="opacity:${opacity};">`;
      } else {
        heroLayer.innerHTML = "";
      }
    }

    // About Background
    const aboutLayer = document.getElementById("about-bg-layer");
    if (aboutLayer) {
      if (backgrounds.about && backgrounds.about.image) {
        const opacity = backgrounds.about.opacity !== undefined ? backgrounds.about.opacity : 0.20;
        aboutLayer.innerHTML = `<img src="${backgrounds.about.image}" alt="" style="opacity:${opacity};">`;
      } else {
        aboutLayer.innerHTML = "";
      }
    }

    // Contact Background
    const contactLayer = document.getElementById("contact-bg-layer");
    if (contactLayer) {
      if (backgrounds.contact && backgrounds.contact.image) {
        const opacity = backgrounds.contact.opacity !== undefined ? backgrounds.contact.opacity : 0.30;
        contactLayer.innerHTML = `<img src="${backgrounds.contact.image}" alt="" style="opacity:${opacity};">`;
      } else {
        contactLayer.innerHTML = "";
      }
    }
  }

  function renderNav(nav) {
    if (!nav) return;
    const nAbout = document.getElementById("nav-about");
    const nServices = document.getElementById("nav-services");
    const nProcess = document.getElementById("nav-process");
    const nGallery = document.getElementById("nav-gallery");
    const nVideos = document.getElementById("nav-videos");
    const nContact = document.getElementById("nav-contact");
    const nCta = document.getElementById("nav-cta-btn");

    if (nAbout) nAbout.textContent = nav.about || "Sobre mí";
    if (nServices) nServices.textContent = nav.services || "Servicios";
    if (nProcess) nProcess.textContent = nav.process || "Cómo trabajamos";
    if (nGallery) nGallery.textContent = nav.gallery || "Galería";
    if (nVideos) nVideos.textContent = nav.videos || "Videos";
    if (nContact) nContact.textContent = nav.contact || "Contacto";
    if (nCta) nCta.textContent = nav.ctaBtn || "Reservar";
  }

  function renderRibbon(ribbon) {
    const bar1 = document.getElementById("ribbon");
    const bar2 = document.getElementById("ribbon-footer");
    const txt1 = document.getElementById("ribbon-text");
    const txt2 = document.getElementById("ribbon-text-footer");
    const active = !!(ribbon && ribbon.active && ribbon.text);
    [bar1, bar2].forEach(b => { if (b) b.hidden = !active; });
    if (active) {
      if (txt1) txt1.textContent = ribbon.text;
      if (txt2) txt2.textContent = ribbon.text;
    }
  }

  let heroTimer = null;

  function renderHero(hero) {
    if (!hero) return;
    const kicker = document.getElementById("hero-kicker");
    const heading = document.getElementById("hero-heading");
    const subhead = document.getElementById("hero-subhead");
    const cta1 = document.getElementById("hero-cta-1");
    const cta2 = document.getElementById("hero-cta-2");
    if (kicker) kicker.textContent = hero.kicker || "";
    if (heading) heading.textContent = hero.heading || "";
    if (subhead) subhead.textContent = hero.subheading || "";
    if (cta1) cta1.textContent = hero.ctaPrimary || "Reservar";
    if (cta2) cta2.textContent = hero.ctaSecondary || "Ver servicios";

    const box = document.getElementById("hero-visual");
    if (!box) return;

    if (heroTimer) {
      clearInterval(heroTimer);
      heroTimer = null;
    }

    let imageList = [];
    if (Array.isArray(hero.images) && hero.images.length > 0) {
      imageList = hero.images.filter(img => img && img.url);
    }
    if (!imageList.length && hero.image) {
      imageList = [{ url: hero.image, caption: "" }];
    }

    if (!imageList.length) {
      box.innerHTML = `<svg class="ph-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 7v10M18 7v10M3 12h3M18 12h3M9 12h6"/></svg>`;
      return;
    }

    let html = imageList.map((item, i) => `
      <img src="${item.url}" alt="${escapeHtml(item.caption || "")}" class="hero-slide ${i === 0 ? "active" : ""}" data-index="${i}">
    `).join("");

    if (imageList.length > 1) {
      html += `<div class="hero-dots">` + imageList.map((_, i) => `
        <button class="${i === 0 ? "active" : ""}" data-index="${i}" aria-label="Foto ${i + 1}"></button>
      `).join("") + `</div>`;
    }

    box.innerHTML = html;

    if (imageList.length <= 1) return;

    let currentIndex = 0;
    const slides = box.querySelectorAll(".hero-slide");
    const dots = box.querySelectorAll(".hero-dots button");

    function goToSlide(index) {
      currentIndex = index;
      slides.forEach((slide, idx) => {
        slide.classList.toggle("active", idx === currentIndex);
      });
      dots.forEach((dot, idx) => {
        dot.classList.toggle("active", idx === currentIndex);
      });
    }

    dots.forEach((dot, idx) => {
      dot.addEventListener("click", () => {
        goToSlide(idx);
        resetTimer();
      });
    });

    function nextSlide() {
      const next = (currentIndex + 1) % imageList.length;
      goToSlide(next);
    }

    function resetTimer() {
      if (heroTimer) clearInterval(heroTimer);
      if (hero.autoplay !== false) {
        const intervalSec = (hero.interval && hero.interval > 0) ? hero.interval : 4;
        heroTimer = setInterval(nextSlide, intervalSec * 1000);
      }
    }

    if (hero.autoplay !== false) {
      resetTimer();
    }
  }

  function renderAbout(about) {
    if (!about) return;
    const heading = document.getElementById("about-heading");
    const text = document.getElementById("about-text");
    const badgeText = document.getElementById("about-badge-text");
    const badgeWrap = document.getElementById("about-badge-wrap");

    if (heading) heading.textContent = about.heading || "Sobre mí";
    if (text) text.textContent = about.text || "";
    if (badgeText) badgeText.textContent = about.badge || "";
    if (badgeWrap) badgeWrap.style.display = about.badge ? "inline-flex" : "none";

    if (about.image) {
      const box = document.getElementById("about-photo");
      if (box) box.innerHTML = `<img src="${about.image}" alt="">`;
    }
  }

  function renderServices(servicesSection, services) {
    const heading = document.getElementById("services-heading");
    const lede = document.getElementById("services-lede");
    if (heading && servicesSection) heading.textContent = servicesSection.heading || "Servicios";
    if (lede && servicesSection) lede.textContent = servicesSection.lede || "";

    const row = document.getElementById("services-row");
    if (!row) return;
    row.innerHTML = (services || []).map(s => `
      <div class="card">
        <h3>${escapeHtml(s.title)}</h3>
        <p>${escapeHtml(s.text)}</p>
      </div>
    `).join("");
  }

  function renderProcess(processSection, process) {
    const heading = document.getElementById("process-heading");
    const lede = document.getElementById("process-lede");
    if (heading && processSection) heading.textContent = processSection.heading || "Cómo trabajamos";
    if (lede && processSection) lede.textContent = processSection.lede || "";

    const row = document.getElementById("process-row");
    if (!row) return;
    row.innerHTML = (process || []).map((p, i) => `
      <div class="process-item">
        <span class="num">${String(i + 1).padStart(2, "0")}</span>
        <h3>${escapeHtml(p.title)}</h3>
        <p>${escapeHtml(p.text)}</p>
      </div>
    `).join("");
  }

  function renderVideosSection(videosSection, videos) {
    const heading = document.getElementById("videos-heading");
    const lede = document.getElementById("videos-lede");
    if (heading && videosSection) heading.textContent = videosSection.heading || "Videos";
    if (lede && videosSection) lede.textContent = videosSection.lede || "";

    const grid = document.getElementById("video-grid");
    if (!grid) return;
    const list = (videos || []).filter(v => v.url);
    if (!list.length) {
      grid.innerHTML = `<p style="color:var(--gray-500);font-size:14px;">Todavía no hay videos cargados. Se agregan desde el panel admin.</p>`;
      return;
    }
    grid.innerHTML = list.map(v => {
      const videoInfo = toEmbedUrl(v.url);
      const mediaHtml = videoInfo.isDirectFile
        ? `<video src="${escapeAttr(videoInfo.url)}" controls preload="metadata" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border:0;background:#000;"></video>`
        : `<iframe src="${escapeAttr(videoInfo.url)}" title="${escapeHtml(v.caption || "")}" allowfullscreen loading="lazy"></iframe>`;

      return `
        <div class="video-card">
          <div class="frame-wrap">${mediaHtml}</div>
          <div class="cap">${escapeHtml(v.caption || "")}</div>
        </div>
      `;
    }).join("");

    grid.querySelectorAll(".video-card").forEach((card, idx) => {
      card.addEventListener("click", () => {
        if (list[idx]) trackMedia("video", list[idx].url, list[idx].caption);
      }, { once: true });
    });
  }

  function toEmbedUrl(rawUrl) {
    if (!rawUrl) return { isDirectFile: false, url: "" };
    const url = rawUrl.trim();

    const ext = url.split(/[?#]/)[0].split('.').pop().toLowerCase();
    const isDirectFile = /^(mp4|webm|mov|ogg|m4v)$/.test(ext) || url.startsWith("/uploads/video-");
    if (isDirectFile) {
      return { isDirectFile: true, url: url };
    }

    try {
      if (url.includes("youtube.com/shorts/")) {
        const id = url.split("youtube.com/shorts/")[1].split(/[?&]/)[0];
        return { isDirectFile: false, url: `https://www.youtube.com/embed/${id}` };
      }
      if (url.includes("youtube.com/watch?v=")) {
        const id = new URL(url).searchParams.get("v");
        return { isDirectFile: false, url: `https://www.youtube.com/embed/${id}` };
      }
      if (url.includes("youtu.be/")) {
        const id = url.split("youtu.be/")[1].split(/[?&]/)[0];
        return { isDirectFile: false, url: `https://www.youtube.com/embed/${id}` };
      }
      if (url.includes("vimeo.com/") && !url.includes("player.vimeo.com")) {
        const id = url.split("vimeo.com/")[1].split(/[?&]/)[0];
        return { isDirectFile: false, url: `https://player.vimeo.com/video/${id}` };
      }
      if (url.includes("instagram.com/reel/") || url.includes("instagram.com/p/")) {
        const parts = url.split("/").filter(Boolean);
        const typeIdx = parts.findIndex(p => p === "reel" || p === "p");
        if (typeIdx !== -1 && parts[typeIdx + 1]) {
          const id = parts[typeIdx + 1];
          return { isDirectFile: false, url: `https://www.instagram.com/${parts[typeIdx]}/${id}/embed` };
        }
      }
    } catch (e) { /* fall through */ }

    return { isDirectFile: false, url: url };
  }

  function renderGalleryAndFilmstrip(gallerySection, gallery) {
    const heading = document.getElementById("gallery-heading");
    const lede = document.getElementById("gallery-lede");
    if (heading && gallerySection) heading.textContent = gallerySection.heading || "Galería";
    if (lede && gallerySection) lede.textContent = gallerySection.lede || "";

    const viewer = document.getElementById("gallery-viewer");
    const filmstrip = document.getElementById("filmstrip");
    if (!viewer || !filmstrip) return;

    const photos = (gallery || []).filter(g => g.url);

    if (!photos.length) {
      viewer.innerHTML = `<p class="gallery-empty">Todavía no hay fotos cargadas. Se agregan desde el panel admin.</p>`;
      filmstrip.innerHTML = `<button class="empty" disabled>Sin fotos</button>`;
      return;
    }

    trackMedia("photo", photos[0].url, photos[0].caption);

    viewer.innerHTML =
      photos.map((p, i) => `<img data-i="${i}" src="${p.url}" alt="${escapeHtml(p.caption || "")}" class="${i === 0 ? "active" : ""}">`).join("") +
      `<span class="gallery-caption" id="gallery-caption">${escapeHtml(photos[0].caption || "")}</span>`;

    filmstrip.innerHTML = photos.map((p, i) => `
      <button data-i="${i}" class="${i === 0 ? "active" : ""}" aria-label="Ver foto ${i + 1}">
        <img src="${p.url}" alt="">
      </button>
    `).join("");

    filmstrip.querySelectorAll("button[data-i]").forEach(btn => {
      btn.addEventListener("click", () => {
        const i = parseInt(btn.getAttribute("data-i"), 10);
        filmstrip.querySelectorAll("button").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        viewer.querySelectorAll("img").forEach(img => {
          img.classList.toggle("active", parseInt(img.getAttribute("data-i"), 10) === i);
        });
        const captionElem = document.getElementById("gallery-caption");
        if (captionElem) captionElem.textContent = photos[i].caption || "";

        trackMedia("photo", photos[i].url, photos[i].caption);

        const galSec = document.getElementById("gallery");
        if (galSec) galSec.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    });
  }

  function renderContactAndSocial(contact, social) {
    if (!contact) return;
    const heading = document.getElementById("contact-heading");
    const text = document.getElementById("contact-text");
    const labelName = document.getElementById("label-f-name");
    const labelEmail = document.getElementById("label-f-email");
    const labelMsg = document.getElementById("label-f-msg");
    const btnSubmit = document.getElementById("btn-f-submit");

    if (heading) heading.textContent = contact.heading || "Empecemos";
    if (text) text.textContent = contact.text || "";
    if (labelName) labelName.textContent = contact.nameLabel || "Nombre";
    if (labelEmail) labelEmail.textContent = contact.emailLabel || "Email";
    if (labelMsg) labelMsg.textContent = contact.msgLabel || "Contame tu objetivo";
    if (btnSubmit) btnSubmit.textContent = contact.btnText || "Enviar";

    const whatsappNum = (social && social.whatsapp) || contact.whatsapp || "";
    const instagramUrl = (social && social.instagram) || contact.instagram || "";

    const links = document.getElementById("contact-links");
    if (links) {
      let html = "";
      if (whatsappNum) html += `<a class="btn btn-ghost" href="https://wa.me/${whatsappNum.replace(/\D/g,"")}" target="_blank" rel="noopener">WhatsApp</a>`;
      if (instagramUrl) html += `<a class="btn btn-ghost" href="${instagramUrl}" target="_blank" rel="noopener">Instagram</a>`;
      links.innerHTML = html;
    }

    const footerSocial = document.getElementById("footer-social");
    if (footerSocial) {
      const socialList = [];
      if (instagramUrl) {
        socialList.push({ name: "Instagram", url: instagramUrl, svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>` });
      }
      if (whatsappNum) {
        socialList.push({ name: "WhatsApp", url: `https://wa.me/${whatsappNum.replace(/\D/g,"")}`, svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>` });
      }
      if (social && social.facebook) {
        socialList.push({ name: "Facebook", url: social.facebook, svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>` });
      }
      if (social && social.tiktok) {
        socialList.push({ name: "TikTok", url: social.tiktok, svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"/></svg>` });
      }
      if (social && social.youtube) {
        socialList.push({ name: "YouTube", url: social.youtube, svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"/><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/></svg>` });
      }
      if (social && social.linkedin) {
        socialList.push({ name: "LinkedIn", url: social.linkedin, svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>` });
      }
      if (social && social.twitter) {
        socialList.push({ name: "Twitter", url: social.twitter, svg: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"/></svg>` });
      }

      footerSocial.innerHTML = socialList.map(s => `
        <a href="${escapeHtml(s.url)}" target="_blank" rel="noopener" aria-label="${s.name}">${s.svg}</a>
      `).join("");
    }

    renderWhatsAppBubble(whatsappNum, social);
  }

  function renderFooter(brand, footer) {
    const parts = (brand || "Britov.Coach").split(".");
    const logo = document.getElementById("brand-logo");
    const fb1 = document.getElementById("footer-brand-1");
    const fb2 = document.getElementById("footer-brand-2");
    const fdesc = document.getElementById("footer-brand-desc");
    const flabel = document.getElementById("footer-filmstrip-label");
    const fcopy = document.getElementById("footer-copy");

    if (logo) logo.innerHTML = parts[0] + (parts[1] ? `<span>.${parts[1]}</span>` : "");
    if (fb1) fb1.textContent = parts[0];
    if (fb2) fb2.textContent = parts[1] ? "." + parts[1] : "";

    if (fdesc && footer) fdesc.textContent = footer.brandDesc || "";
    if (flabel && footer) flabel.textContent = footer.filmstripLabel || "Galería — elegí una foto para verla arriba";
    if (fcopy && footer) fcopy.textContent = footer.copyright || `© ${new Date().getFullYear()} ${brand}. Todos los derechos reservados.`;
  }

  function renderWhatsAppBubble(whatsappNum, social) {
    const bubbleElem = document.getElementById("whatsapp-bubble");
    if (!bubbleElem) return;

    const isActive = social ? (social.whatsappBubbleActive !== false) : true;
    const cleanNum = whatsappNum ? whatsappNum.replace(/\D/g, "") : "";

    if (!isActive || !cleanNum) {
      bubbleElem.hidden = true;
      return;
    }

    const defaultMsg = (social && social.whatsappDefaultMsg) || "¡Hola! Quisiera más información sobre los entrenamientos.";
    const waUrl = `https://wa.me/${cleanNum}?text=${encodeURIComponent(defaultMsg)}`;

    bubbleElem.hidden = false;
    bubbleElem.innerHTML = `
      <a href="${waUrl}" target="_blank" rel="noopener" class="wa-bubble-btn" aria-label="Contactar por WhatsApp">
        <svg viewBox="0 0 24 24">
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-1.143 4.174 4.186-1.097z"/>
        </svg>
      </a>
    `;
  }

  function escapeHtml(str) {
    return String(str || "").replace(/[&<>"']/g, m => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[m]));
  }

  function setupMobileNav() {
    const toggle = document.getElementById("nav-toggle");
    const nav = document.getElementById("main-nav");
    if (!toggle || !nav) return;
    toggle.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    nav.querySelectorAll("a").forEach(a => a.addEventListener("click", () => {
      nav.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    }));
  }

  function setupScrollReveal(effects) {
    const reveals = document.querySelectorAll(".reveal");
    if (!reveals.length) return;

    const isActive = !effects || effects.scrollRevealActive !== false;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (!isActive || prefersReducedMotion || !("IntersectionObserver" in window)) {
      reveals.forEach(el => el.classList.add("visible"));
      return;
    }

    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });

    reveals.forEach(el => observer.observe(el));
  }

  async function init() {
    setupMobileNav();
    trackVisit();
    content = await loadContent();
    applyColors(content.colors);
    renderBackgrounds(content.backgrounds);
    renderNav(content.nav);
    renderRibbon(content.ribbon);
    renderHero(content.hero);
    renderAbout(content.about);
    renderServices(content.servicesSection, content.services);
    renderProcess(content.processSection, content.process);
    renderGalleryAndFilmstrip(content.gallerySection, content.gallery);
    renderVideosSection(content.videosSection, content.videos);
    renderContactAndSocial(content.contact, content.social);
    renderFooter(content.brand, content.footer);
    setupScrollReveal(content.effects);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
