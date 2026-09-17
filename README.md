# Britov.Coach — Landing + Panel Admin con SQLite

Sitio web listo para correr con **Node.js + Express + SQLite**. No requiere configurar ninguna base de datos ni servicio externo en la nube (como Firebase o Supabase). Todo se guarda localmente en el archivo `database.sqlite` y la carpeta `uploads/`.

## Características principales
- **Landing pública (`index.html`)**: Cinta promocional, portada, sobre mí, servicios, cómo trabajamos, galería con visor interactivo, videos incrustados y sección de contacto.
- **Panel admin (`/admin`)**: Permite cambiar colores del sitio, textos, cinta de promoción, enlaces de videos (YouTube/Vimeo) y **subir fotos directamente desde tu computadora** o mediante links externos.
- **Base de datos SQLite local**: Almacenamiento rápido en un solo archivo de disco (`database.sqlite`), sin necesidad de servidores externos.
- **Seguridad**: Autenticación segura con hash de contraseñas (bcrypt) y tokens de sesión.

---

## Cómo ejecutar el proyecto

### 1) Instalar dependencias
Abrí una terminal en la carpeta del proyecto y ejecutá:
```bash
npm install
```

### 2) Iniciar el servidor
```bash
npm start
```

El servidor iniciará automáticamente en `http://localhost:3000`.

### 3) Acceder al panel de administración
- **URL**: `http://localhost:3000/admin`
- **Email por defecto**: `admin@britov.coach`
- **Contraseña por defecto**: `admin`

> ⚠️ **Recomendación**: Podés cambiar la contraseña inicial directamente desde la sección **Seguridad / Cambiar contraseña** en el panel admin.

---

## Subida de Fotos y Videos
- **Fotos**: Dentro del panel de administración (sección *Galería de fotos*), hacé clic en el botón `📁 Subir` para seleccionar un archivo de foto desde tu computadora. La foto se guardará automáticamente en la carpeta `/uploads` y se mostrará en la web.
- **Videos**: Pegá enlaces de YouTube o Vimeo (ej. `https://www.youtube.com/watch?v=...`) y se incrustarán automáticamente en la sección de videos de la landing.

---

## Estructura del proyecto
```
index.html              (sitio público)
server.js               (servidor Express + API SQLite + subida de fotos)
database.sqlite         (base de datos SQLite creada automáticamente)
uploads/                (carpeta donde se guardan las fotos subidas)
package.json            (dependencias de Node.js)
admin/
  index.html            (panel de administración)
assets/
  css/
    styles.css          (estilos del sitio público)
    admin.css           (estilos del panel admin)
  js/
    config.js           (contenido por defecto)
    site.js             (lógica pública — conecta con /api/config)
    admin.js            (lógica admin — autenticación y API SQLite)
```
