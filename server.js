const express = require("express");
const Database = require("better-sqlite3");
const multer = require("multer");
const bcrypt = require("bcryptjs");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de almacenamiento local para fotos (uploads/)
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "photo-" + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB límite por foto
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|svg/;
    const extName = allowed.test(path.extname(file.originalname).toLowerCase());
    const mimeType = allowed.test(file.mimetype);
    if (extName && mimeType) {
      return cb(null, true);
    }
    cb(new Error("Solo se permiten imágenes (jpg, png, gif, webp, svg)."));
  }
});

// Inicialización de SQLite
const dbPath = path.join(__dirname, "database.sqlite");
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
  const defaultPassword = "admin"; // Se recomienda cambiar desde el admin
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
  hero: {
    kicker: "Entrenamiento personal en Barcelona",
    heading: "Tu cuerpo cambia cuando cambia tu plan, no tu fuerza de voluntad",
    subheading:
      "Entrenamiento personalizado y grupal con seguimiento real: evaluación inicial, plan a medida y ajustes semana a semana.",
    ctaPrimary: "Reservar evaluación",
    ctaSecondary: "Ver servicios",
    image: ""
  },
  about: {
    heading: "Sobre mí",
    text:
      "Soy entrenadora personal certificada (Personal Training y Group Fitness, ORTHOS Barcelona). Trabajo con personas que quieren un plan claro, sostenible y adaptado a su rutina real — no una tabla genérica de internet. Cada plan se revisa y se ajusta con el progreso.",
    image: ""
  },
  services: [
    {
      title: "Entrenamiento 1:1",
      text: "Sesiones individuales presenciales, plan de progresión y técnica corregida en vivo."
    },
    {
      title: "Entrenamiento grupal",
      text: "Grupos reducidos, misma exigencia técnica, precio más accesible y buena energía."
    },
    {
      title: "Plan online",
      text: "Rutina y seguimiento a distancia con revisión semanal, para quien entrena por su cuenta."
    }
  ],
  process: [
    { title: "Evaluación inicial", text: "Objetivo, historial, movilidad y disponibilidad real." },
    { title: "Plan a medida", text: "Progresión concreta: qué, cuánto y por qué en cada fase." },
    { title: "Seguimiento y ajuste", text: "Revisión periódica del plan según cómo responde tu cuerpo." }
  ],
  gallery: [
    { url: "", caption: "Foto 1 — reemplazá desde el panel admin" },
    { url: "", caption: "Foto 2 — reemplazá desde el panel admin" },
    { url: "", caption: "Foto 3 — reemplazá desde el panel admin" },
    { url: "", caption: "Foto 4 — reemplazá desde el panel admin" }
  ],
  videos: [
    { url: "", caption: "Video 1 — agregá un link de YouTube o Vimeo desde el admin" }
  ],
  contact: {
    heading: "Empecemos",
    text: "Contame tu objetivo y disponibilidad, te respondo en menos de 24 horas.",
    whatsapp: "",
    instagram: ""
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

// Session Tokens simples en memoria
const activeTokens = new Map();

function generateToken() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function verifyToken(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return false;
  const token = authHeader.replace("Bearer ", "").trim();
  return activeTokens.has(token);
}

// Middleware
app.use(cors());
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

// Archivos estáticos
app.use("/uploads", express.static(uploadsDir));
app.use(express.static(__dirname));

// API ENDPOINTS

// 1. Obtener la configuración del sitio (Público)
app.get("/api/config", (req, res) => {
  try {
    const row = db.prepare("SELECT content FROM site_config WHERE id = 1").get();
    if (!row) {
      return res.status(404).json({ error: "Configuración no encontrada" });
    }
    const data = JSON.parse(row.content);
    // Asegurar estructura social por defecto si es una BD existente
    if (!data.social) data.social = DEFAULT_CONTENT.social;
    res.json(data);
  } catch (err) {
    console.error("Error leyendo SQLite:", err);
    res.status(500).json({ error: "Error al leer la base de datos SQLite" });
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

  const token = generateToken();
  activeTokens.set(token, { userId: user.id, email: user.email });
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
    db.prepare("UPDATE site_config SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1").run(
      JSON.stringify(newContent)
    );
    res.json({ success: true, message: "Cambios guardados en SQLite correctamente" });
  } catch (err) {
    console.error("Error guardando en SQLite:", err);
    res.status(500).json({ error: "No se pudo guardar la configuración en la base de datos" });
  }
});

// 5. Endpoint para subir archivos de fotos desde la computadora (Requiere Auth)
app.post("/api/upload", (req, res) => {
  if (!verifyToken(req)) {
    return res.status(401).json({ error: "No autorizado. Inicie sesión nuevamente." });
  }

  upload.single("photo")(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: "No se seleccionó ninguna imagen para subir." });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ success: true, url: fileUrl, filename: req.file.filename });
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

// Registrar visita a la web (Público)
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

// Registrar interacción con fotos o videos (Público)
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

// Obtener métricas consolidadas (Dashboard Admin - Requiere Auth)
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

app.listen(PORT, () => {
  console.log(`\n==================================================`);
  console.log(` Britov.Coach con SQLite iniciado exitosamente!`);
  console.log(` Sitio público: http://localhost:${PORT}`);
  console.log(` Panel Admin:   http://localhost:${PORT}/admin`);
  console.log(` Base SQLite:   ${dbPath}`);
  console.log(`==================================================\n`);
});
