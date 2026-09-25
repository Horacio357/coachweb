const express = require("express");
const Database = require("better-sqlite3");
const multer = require("multer");
const bcrypt = require("bcryptjs");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de almacenamiento local para fotos y videos (uploads/)
const dataDir = process.env.RAILWAY_VOLUME_MOUNT_PATH || process.env.DATA_DIR || __dirname;
const uploadsDir = path.join(dataDir, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const isVideo = /mp4|webm|mov|ogg|quicktime|m4v/.test(ext.replace('.', ''));
    const prefix = isVideo ? "video-" : "photo-";
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, prefix + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB límite por archivo
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|svg|mp4|webm|mov|ogg|quicktime|m4v/;
    const extName = allowed.test(path.extname(file.originalname).toLowerCase());
    const mimeType = allowed.test(file.mimetype) || file.mimetype.startsWith("video/") || file.mimetype.startsWith("image/");
    if (extName && mimeType) {
      return cb(null, true);
    }
    cb(new Error("Solo se permiten imágenes (jpg, png, webp, etc.) o videos (mp4, webm, mov)."));
  }
});

// Inicialización de SQLite
const dbPath = path.join(dataDir, "database.sqlite");
const db = new Database(dbPath);

// Creación de tablas si no existen
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS site_config (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    content TEXT NOT NULL,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS page_views (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    page TEXT NOT NULL,
    user_agent TEXT,
    viewed_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS media_views (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    media_type TEXT NOT NULL, -- 'photo' o 'video'
    media_url TEXT NOT NULL,
    media_caption TEXT,
    viewed_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Crear usuario admin por defecto si no existe ningún usuario
const userCount = db.prepare("SELECT COUNT(*) as count FROM users").get().count;
if (userCount === 0) {
  const defaultAdminEmail = "admin@britov.coach";
  const defaultPassword = "admin";
  const hash = bcrypt.hashSync(defaultPassword, 10);
  db.prepare("INSERT INTO users (email, password_hash) VALUES (?, ?)").run(defaultAdminEmail, hash);
  console.log(`[SQLite] Usuario admin creado por defecto: ${defaultAdminEmail} / contraseña: ${defaultPassword}`);
}

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

  effects: {
    scrollRevealActive: true
  },

  sections: {
    hero: true,
    about: true,
    services: true,
    process: true,
    gallery: true,
    videos: true,
    contact: true
  },

  backgrounds: {
    hero: { image: "/uploads/photo-1790225910261-670298077.png", opacity: 0.35 },
    about: { image: "/uploads/photo-1790225930717-710121742.jpg", opacity: 0.20 },
    contact: { image: "/uploads/photo-1790225958867-383414922.jpg", opacity: 0.30 }
  },

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
    interval: 4
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
    lede: "Elegí una foto desde la cinta al final de la página para verla en grande acá."
  },

  videosSection: {
    heading: "Videos",
    lede: "Mira nuestros entrenamientos en action."
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

// Inicializar configuración por defecto si la tabla está vacía
const configCount = db.prepare("SELECT COUNT(*) as count FROM site_config").get().count;
if (configCount === 0) {
  db.prepare("INSERT INTO site_config (id, content) VALUES (1, ?)").run(JSON.stringify(DEFAULT_CONTENT));
  console.log("[SQLite] Configuración inicial cargada en la base de datos.");
}

// Session Tokens persistentes (basados en HMAC para sobrevivir a reinicios del servidor)
const crypto = require("crypto");
const SERVER_SECRET = "britov_coach_secret_key_2026";

function generateToken(user) {
  const payload = `${user.id}:${user.email}:${user.password_hash}`;
  const sig = crypto.createHmac("sha256", SERVER_SECRET).update(payload).digest("hex");
  return Buffer.from(`${user.id}:${sig}`).toString("base64");
}

function verifyToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return false;
  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) return false;

  try {
    const decoded = Buffer.from(token, "base64").toString("utf8");
    const [userIdStr, sig] = decoded.split(":");
    const userId = parseInt(userIdStr, 10);
    if (!userId || !sig) return false;

    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
    if (!user) return false;

    const expectedPayload = `${user.id}:${user.email}:${user.password_hash}`;
    const expectedSig = crypto.createHmac("sha256", SERVER_SECRET).update(expectedPayload).digest("hex");
    return sig === expectedSig;
  } catch (e) {
    return false;
  }
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

// Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Archivos estáticos
app.use("/uploads", express.static(uploadsDir));
app.use(express.static(__dirname));

// API ENDPOINTS

// 1. Obtener la configuración del sitio (Público)
app.get("/api/config", (req, res) => {
  try {
    const row = db.prepare("SELECT content FROM site_config WHERE id = 1").get();
    if (!row) {
      return res.json(DEFAULT_CONTENT);
    }
    const data = JSON.parse(row.content);
    const merged = deepMerge(DEFAULT_CONTENT, data);
    res.json(merged);
  } catch (err) {
    console.error("Error leyendo SQLite:", err);
    res.json(DEFAULT_CONTENT);
  }
});

// 2. Iniciar sesión admin
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email y contraseña requeridos" });
  }

  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: "Credenciales inválidas" });
  }

  const token = generateToken(user);
  res.json({ success: true, token, email: user.email });
});

// 3. Verificar estado de sesión
app.get("/api/check-auth", (req, res) => {
  if (verifyToken(req)) {
    res.json({ authenticated: true });
  } else {
    res.json({ authenticated: false });
  }
});

// 4. Guardar configuración completa (Requiere Auth)
app.post("/api/config", (req, res) => {
  if (!verifyToken(req)) {
    return res.status(401).json({ error: "No autorizado. Inicie sesión nuevamente." });
  }

  try {
    const newContent = req.body;
    if (!newContent || typeof newContent !== "object") {
      return res.status(400).json({ error: "Contenido inválido" });
    }
    db.prepare("INSERT OR REPLACE INTO site_config (id, content, updated_at) VALUES (1, ?, CURRENT_TIMESTAMP)").run(
      JSON.stringify(newContent)
    );
    res.json({ success: true, message: "Cambios guardados en SQLite correctamente" });
  } catch (err) {
    console.error("Error guardando en SQLite:", err);
    res.status(500).json({ error: "No se pudo guardar la configuración en la base de datos" });
  }
});

// 5. Endpoint para subir archivos de fotos o videos (Requiere Auth)
app.post("/api/upload", (req, res) => {
  if (!verifyToken(req)) {
    return res.status(401).json({ error: "No autorizado. Inicie sesión nuevamente." });
  }

  upload.single("photo")(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: "No se seleccionó ningún archivo para subir." });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ success: true, url: fileUrl, filename: req.file.filename });
  });
});

// 5b. Endpoint para carga masiva de fotos (hasta 50 fotos juntas)
app.post("/api/upload-multiple", (req, res) => {
  if (!verifyToken(req)) {
    return res.status(401).json({ error: "No autorizado. Inicie sesión nuevamente." });
  }

  upload.array("photos", 50)(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.files || !req.files.length) {
      return res.status(400).json({ error: "No se seleccionaron archivos para subir." });
    }

    const files = req.files.map(file => ({
      url: `/uploads/${file.filename}`,
      filename: file.filename
    }));

    res.json({ success: true, files });
  });
});

// 6. Cambiar contraseña admin
app.post("/api/change-password", (req, res) => {
  if (!verifyToken(req)) {
    return res.status(401).json({ error: "No autorizado." });
  }

  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 4) {
    return res.status(400).json({ error: "La nueva contraseña debe tener al menos 4 caracteres." });
  }

  const authHeader = req.headers.authorization;
  const token = authHeader.replace("Bearer ", "").trim();
  const session = activeTokens.get(token);

  const newHash = bcrypt.hashSync(newPassword, 10);
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(newHash, session.userId);

  res.json({ success: true, message: "Contraseña actualizada exitosamente." });
});

// --- ANALYTICS & METRICS ENDPOINTS ---
app.post("/api/analytics/track-visit", (req, res) => {
  try {
    const page = req.body.page || "home";
    const userAgent = req.headers["user-agent"] || "";
    db.prepare("INSERT INTO page_views (page, user_agent) VALUES (?, ?)").run(page, userAgent);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Error al registrar visita" });
  }
});

app.post("/api/analytics/track-media", (req, res) => {
  try {
    const { media_type, media_url, media_caption } = req.body;
    if (!media_type || !media_url) {
      return res.status(400).json({ error: "Parámetros requeridos faltantes" });
    }
    db.prepare("INSERT INTO media_views (media_type, media_url, media_caption) VALUES (?, ?, ?)").run(
      media_type, media_url, media_caption || ""
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Error al registrar métrica de media" });
  }
});

app.get("/api/analytics/stats", (req, res) => {
  if (!verifyToken(req)) {
    return res.status(401).json({ error: "No autorizado." });
  }

  try {
    const totalVisits = db.prepare("SELECT COUNT(*) as count FROM page_views").get().count;
    const visitsToday = db.prepare("SELECT COUNT(*) as count FROM page_views WHERE DATE(viewed_at) = DATE('now')").get().count;
    const visitsThisWeek = db.prepare("SELECT COUNT(*) as count FROM page_views WHERE viewed_at >= DATE('now', '-7 days')").get().count;

    const topPhotos = db.prepare(`
      SELECT media_url, media_caption, COUNT(*) as views 
      FROM media_views 
      WHERE media_type = 'photo' 
      GROUP BY media_url 
      ORDER BY views DESC 
      LIMIT 5
    `).all();

    const topVideos = db.prepare(`
      SELECT media_url, media_caption, COUNT(*) as views 
      FROM media_views 
      WHERE media_type = 'video' 
      GROUP BY media_url 
      ORDER BY views DESC 
      LIMIT 5
    `).all();

    res.json({
      totalVisits,
      visitsToday,
      visitsThisWeek,
      topPhotos,
      topVideos
    });
  } catch (err) {
    console.error("Error obteniendo estadísticas:", err);
    res.status(500).json({ error: "No se pudieron calcular las estadísticas" });
  }
});
app.get(["/admin", "/admin/*"], (req, res) => {
  res.sendFile(path.join(__dirname, "admin", "index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`\n==================================================`);
  console.log(` Britov.Coach con SQLite iniciado exitosamente!`);
  console.log(` Puerto: ${PORT} (0.0.0.0)`);
  console.log(` Sitio público: http://localhost:${PORT}`);
  console.log(` Panel Admin:   http://localhost:${PORT}/admin`);
  console.log(` Base SQLite:   ${dbPath}`);
  console.log(`==================================================\n`);
});
