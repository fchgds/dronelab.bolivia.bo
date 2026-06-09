# Diseño: Limpieza y migración de imágenes a WebP

**Fecha:** 2026-06-09  
**Proyecto:** dronelab.bolivia.bo  
**Framework:** Astro 5.17.1, salida estática

---

## Contexto

El directorio `public/images/` contiene 107 archivos de imagen (44.3 MB), pero solo 12 imágenes únicas son referenciadas en los 9 posts del blog y los componentes Astro. Las 88 variantes de tamaño restantes son residuo de una migración desde WordPress y nunca se sirven. Ninguna imagen está optimizada actualmente — se sirven como archivos estáticos sin compresión ni formato moderno.

---

## Objetivo

1. Eliminar todos los archivos de imagen no referenciados
2. Convertir todas las imágenes en uso a WebP (calidad 82, máx 1600px de ancho)
3. Actualizar todas las referencias (`.md` y `.astro`) a las nuevas extensiones `.webp`
4. Resultado esperado: de 44.3 MB y 107 archivos a ~3–4 MB y ~27 archivos

---

## Imágenes en uso (a conservar y convertir)

### Blog posts — frontmatter `featuredImage`

| Post | Imagen actual |
|---|---|
| `expodron-2024.md` | `uploads/2024/08/DSC00792-scaled.jpg` |
| `drones-ia-agtech-buena-vista-2026.md` | `uploads/2026/05/707360240_1004758141900205_6222446949174206431_n.jpg` |
| `network-support.md` | `uploads/2021/09/flying-labs-latam-retreat-members.jpg` |
| `earth-day-2022-climate-action.md` | `uploads/2022/04/bolivia-unida-por-el-planeta.jpg` |
| `firehawk-project.md` | `uploads/2023/11/firehawk-el-porton-monitoring.jpg` |
| `empowering-bolivian-youth.md` | `uploads/2024/10/emprendimiento-con-drones-jovenes.jpg` |
| `ganaderia-drone-technology.md` | `uploads/2024/12/ganaderia-modelo-aereo-la-nina.jpg` |
| `los-pinos-urban-planning.md` | `uploads/2025/01/los-pinos-planificacion-aerea.jpg` |
| `fexpo-pinos-event.md` | `uploads/2025/03/fexpo-pinos-equipo-wingtra.jpg` |

### Blog posts — imágenes inline en markdown

Solo `expodron-2024.md` y `drones-ia-agtech-buena-vista-2026.md` tienen imágenes inline:

**expodron-2024.md:**
- `uploads/2024/08/IMG-20240818-WA0014-976x1024.jpg`
- `uploads/2024/08/IMG_20240817_101617-1024x576.jpg`
- `uploads/2024/08/20240817-GrupoEnExpoDron2024-1024x769.jpg`
- `uploads/2024/08/DSC00792-1024x769.jpg`
- `uploads/2024/08/DSC00829-1024x769.jpg`

**drones-ia-agtech-buena-vista-2026.md:**
- `uploads/2026/05/704731179_1001687808873905_7727194908074053820_n.jpg`
- `uploads/2026/05/704715058_1001687892207230_6312674159863671724_n.jpg`
- `uploads/2026/05/704689966_1001688038873882_389558605126595979_n.jpg`

### Componentes Astro

| Archivo | Imagen |
|---|---|
| `src/pages/index.astro` | `images/hero/hero-bg.jpg` (4000×2250, 4.25 MB) |
| `src/pages/[slug].astro` | `images/logo/drone-lab-bolivia-logo.png` (placeholder) |
| `src/pages/noticias.astro` | `images/logo/drone-lab-bolivia-logo.png` (placeholder) |

### Favicon (excluidos de conversión)
- `public/favicon.ico` — requerimiento del navegador, no se toca
- `public/favicon.svg` — ya es vectorial, no se toca
- `public/images/logo/favicon-32x32.png` — no referenciado en código; se elimina

---

## Archivos a eliminar (no referenciados)

### `public/images/uploads/2024/08/` — 82 archivos

Se conservan 6, se eliminan los 82 restantes. Lista de los que se conservan:
- `DSC00792-scaled.jpg`
- `DSC00792-1024x769.jpg`
- `DSC00829-1024x769.jpg`
- `20240817-GrupoEnExpoDron2024-1024x769.jpg`
- `IMG_20240817_101617-1024x576.jpg`
- `IMG-20240818-WA0014-976x1024.jpg`

Todos los demás (originales RAW de 5–8 MB, variantes 150×150 hasta 2880×1800, `-scaled` de las otras fotos) se eliminan.

### `public/images/uploads/2026/05/` — 4 archivos sin referencia

- `704715687_1001688008873885_9044390564626876089_n.jpg`
- `704731460_1001687925540560_4119953362436188948_n.jpg`
- `705247583_1001687978873888_3065305714793957238_n.jpg`
- `705259329_1001687855540567_112422131662873411_n.jpg`

### `public/images/logo/`
- `favicon-32x32.png` — no referenciado en ningún archivo

---

## Script de conversión: `scripts/optimize-images.mjs`

Script Node.js que usa la librería **Sharp**.

### Comportamiento

1. Escanea `public/images/` recursivamente buscando `.jpg`, `.jpeg`, `.png`
2. Para cada archivo encontrado:
   - Si tiene ancho > 1600px, redimensiona a 1600px manteniendo aspect ratio
   - Convierte a WebP con calidad 82
   - Guarda como `<mismo-nombre>.webp` en el mismo directorio
   - Elimina el archivo original
3. Excluye `favicon.ico` y `favicon.svg`
4. Imprime un log de cada conversión con tamaño antes/después

### Dependencia

Sharp se instala como devDependency:
```
npm install --save-dev sharp
```

---

## Actualización de referencias

### Archivos `.md` en `src/content/blog/`

Reemplazar `.jpg` por `.webp` en:
- `featuredImage:` de los 9 posts
- Las 8 imágenes inline de `expodron-2024.md` y `drones-ia-agtech-buena-vista-2026.md`

### Archivos `.astro`

| Archivo | Cambio |
|---|---|
| `src/pages/index.astro` | `hero-bg.jpg` → `hero-bg.webp` |
| `src/pages/[slug].astro` | `drone-lab-bolivia-logo.png` → `drone-lab-bolivia-logo.webp` |
| `src/pages/noticias.astro` | `drone-lab-bolivia-logo.png` → `drone-lab-bolivia-logo.webp` |

---

## Orden de ejecución

1. Instalar Sharp como devDependency
2. Eliminar archivos no referenciados (80+ archivos)
3. Ejecutar `scripts/optimize-images.mjs` (convierte + elimina originales)
4. Actualizar referencias en archivos `.md`
5. Actualizar referencias en archivos `.astro`
6. Verificar con `npm run build` que no haya errores
7. Revisar visualmente en browser (`npm run dev`)

---

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Eliminar un archivo que sí se usa | Construir lista exhaustiva de referencias antes de eliminar |
| Sharp no disponible en el proyecto | Instalar como devDependency explícita |
| `favicon-32x32.png` referenciado en lugar no detectado | Verificar con grep antes de eliminar |
| Build roto por referencia no actualizada | Correr `npm run build` como paso de verificación |
