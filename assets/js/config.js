/* =========================================================
   BRITOV.COACH — CONFIGURACIÓN POR DEFECTO COMPLETA
   ========================================================= */

const DEFAULT_CONTENT = {
  brand: "Britov.Coach",

  ribbon: {
    active: true,
    text: "Primera sesión de evaluación sin cargo — cupos limitados este mes"
  },

  colors: {
    black: "#0b0a0f",
    charcoal: "#17151d",
    violetDeep: "#2c1a4d",
    violet: "#5b3aa0",
    violetBright: "#8b5cf6",
    gray: "#a8a3b3"
  },

  // --- EFECTOS Y ANIMACIONES ---
  effects: {
    scrollRevealActive: true
  },

  // --- VISIBILIDAD DE SECCIONES ---
  sections: {
    hero: true,
    about: true,
    services: true,
    process: true,
    gallery: true,
    videos: true,
    contact: true
  },

  // --- FOTOS DE FONDO Y OPACIDAD ---
  backgrounds: {
    hero: { image: "/uploads/photo-1790225910261-670298077.png", opacity: 0.35 },
    about: { image: "/uploads/photo-1790225930717-710121742.jpg", opacity: 0.20 },
    contact: { image: "/uploads/photo-1790225958867-383414922.jpg", opacity: 0.30 }
  },

  // --- MENÚ DE NAVEGACIÓN Y BOTONES ---
  nav: {
    about: "Sobre mí",
    services: "Servicios",
    process: "Cómo trabajamos",
    gallery: "Galería",
    videos: "Videos",
    contact: "Contacto",
    ctaBtn: "Reservar"
  },

  hero: {
    kicker: "Entrenamiento personal en Barcelona",
    heading: "Tu cuerpo cambia cuando cambia tu plan, no tu fuerza de voluntad",
    subheading: "Entrenamiento personalizado y grupal con seguimiento real: evaluación inicial, plan a medida y ajustes semana a semana.",
    ctaPrimary: "Reservar evaluación",
    ctaSecondary: "Ver servicios",
    image: "/uploads/photo-1790225910261-670298077.png",
    images: [
      { url: "/uploads/photo-1790225910261-670298077.png", caption: "Entrenamiento Personalizado" },
      { url: "/uploads/photo-1790225930717-710121742.jpg", caption: "Seguimiento en Vivo" }
    ],
    autoplay: true,
    interval: 4,
    fit: "cover"
  },

  about: {
    heading: "Sobre mí",
    text: "Soy entrenadora personal certificada (Personal Training y Group Fitness, ORTHOS Barcelona). Trabajo con personas que quieren un plan claro, sostenible y adaptado a su rutina real — no una tabla genérica de internet. Cada plan se revisa y se ajusta con el progreso.",
    badge: "Certificación Personal Training & Group Fitness — ORTHOS Barcelona",
    image: "/uploads/photo-1790225930717-710121742.jpg"
  },

  servicesSection: {
    heading: "Servicios",
    lede: "Tres formas de entrenar, un solo criterio: plan claro y seguimiento constante."
  },

  services: [
    { title: "Entrenamiento 1:1", text: "Sesiones individuales presenciales, plan de progresión y técnica corregida en vivo." },
    { title: "Entrenamiento grupal", text: "Grupos reducidos, misma exigencia técnica, precio más accesible y buena energía." },
    { title: "Plan online", text: "Rutina y seguimiento a distancia con revisión semanal, para quien entrena por su cuenta." }
  ],

  processSection: {
    heading: "Cómo trabajamos",
    lede: "Nuestro método paso a paso para lograr resultados reales."
  },

  process: [
    { title: "Evaluación inicial", text: "Objetivo, historial, movilidad y disponibilidad real." },
    { title: "Plan a medida", text: "Progresión concreta: qué, cuánto y por qué en cada fase." },
    { title: "Seguimiento y ajuste", text: "Revisión periódica del plan según cómo responde tu cuerpo." }
  ],

  gallerySection: {
    heading: "Galería",
    lede: "Elegí una foto desde la cinta al final de la página para verla en grande acá.",
    fit: "contain",
    height: "tall"
  },

  videosSection: {
    heading: "Videos",
    lede: "Mira nuestros entrenamientos en acción."
  },

  gallery: [
    { url: "/uploads/photo-1790225829732-949945207.png", caption: "Entrenamiento en Gimnasio" },
    { url: "/uploads/photo-1790225910261-670298077.png", caption: "Seguimiento Personalizado" },
    { url: "/uploads/photo-1790225930717-710121742.jpg", caption: "Técnica y Fuerza" },
    { url: "/uploads/photo-1790225958867-383414922.jpg", caption: "Evaluación de Progreso" }
  ],

  videos: [
    { url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", caption: "Demostración de Rutina y Técnica" }
  ],

  contact: {
    heading: "Empecemos",
    text: "Contame tu objetivo y disponibilidad, te respondo en menos de 24 horas.",
    nameLabel: "Nombre",
    emailLabel: "Email",
    msgLabel: "Contame tu objetivo",
    btnText: "Enviar",
    whatsapp: "",
    instagram: ""
  },

  footer: {
    brandDesc: "Entrenamiento personal y grupal en Barcelona, con seguimiento real de cada plan.",
    filmstripLabel: "Galería — elegí una foto para verla arriba",
    copyright: "© 2026 Britov.Coach. Todos los derechos reservados."
  },

  social: {
    whatsapp: "",
    instagram: "",
    facebook: "",
    tiktok: "",
    youtube: "",
    linkedin: "",
    twitter: "",
    whatsappBubbleActive: true,
    whatsappDefaultMsg: "¡Hola! Quisiera más información sobre los entrenamientos."
  }
};
