# Image Optimization — Migración a WebP

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reducir el directorio `public/images/` de 44.3 MB / 107 archivos a ~3–4 MB / ~27 archivos eliminando variantes no utilizadas y convirtiendo todas las imágenes en uso a WebP (calidad 82, máx 1600px).

**Architecture:** Script Node.js con Sharp convierte todos los JPG/PNG de `public/images/` a WebP en el mismo directorio y elimina los originales. Antes del script se borran los archivos no referenciados. Después se actualizan los `src` en `.md` y `.astro`.

**Tech Stack:** Node.js ESM, sharp (devDependency), PowerShell para eliminación de archivos, Astro 5.17.1

---

## Archivos que cambian

| Acción | Archivo |
|---|---|
| Crear | `scripts/optimize-images.mjs` |
| Eliminar | 86 imágenes no referenciadas en `public/images/` |
| Modificar | `src/content/blog/expodron-2024.md` |
| Modificar | `src/content/blog/drones-ia-agtech-buena-vista-2026.md` |
| Modificar | `src/content/blog/network-support.md` |
| Modificar | `src/content/blog/earth-day-2022-climate-action.md` |
| Modificar | `src/content/blog/firehawk-project.md` |
| Modificar | `src/content/blog/empowering-bolivian-youth.md` |
| Modificar | `src/content/blog/ganaderia-drone-technology.md` |
| Modificar | `src/content/blog/los-pinos-urban-planning.md` |
| Modificar | `src/content/blog/fexpo-pinos-event.md` |
| Modificar | `src/pages/index.astro` |
| Modificar | `src/pages/[slug].astro` |
| Modificar | `src/pages/noticias.astro` |

---

## Task 1: Instalar Sharp

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Instalar sharp como devDependency**

```bash
npm install --save-dev sharp
```

Salida esperada: `added 1 package` (o similar, sin errores)

- [ ] **Step 2: Verificar instalación**

```bash
node -e "import('sharp').then(m => console.log('sharp OK:', m.default.versions.sharp))"
```

Salida esperada: `sharp OK: X.X.X`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add sharp as devDependency for image optimization"
```

---

## Task 2: Eliminar archivos no referenciados

**Files:**
- Eliminar: 81 archivos en `public/images/uploads/2024/08/`
- Eliminar: 4 archivos en `public/images/uploads/2026/05/`
- Eliminar: `public/images/logo/favicon-32x32.png`

- [ ] **Step 1: Verificar referencias antes de borrar (grep de seguridad)**

```bash
grep -r "favicon-32x32" src/
```

Salida esperada: sin resultados (confirma que no está referenciado)

- [ ] **Step 2: Eliminar variantes no usadas de `2024/08/`**

Conservar solo las 6 imágenes referenciadas en `expodron-2024.md`; eliminar todo lo demás.

PowerShell:
```powershell
$keep = @(
    'DSC00792-scaled.jpg',
    'DSC00792-1024x769.jpg',
    'DSC00829-1024x769.jpg',
    '20240817-GrupoEnExpoDron2024-1024x769.jpg',
    'IMG_20240817_101617-1024x576.jpg',
    'IMG-20240818-WA0014-976x1024.jpg'
)
$dir = "public\images\uploads\2024\08"
$deleted = Get-ChildItem $dir | Where-Object { $_.Name -notin $keep }
$deleted | Remove-Item -Force
Write-Host "Eliminados: $($deleted.Count) archivos"
```

Salida esperada: `Eliminados: 81 archivos`

- [ ] **Step 3: Verificar que solo quedan los 6 archivos correctos**

```powershell
Get-ChildItem "public\images\uploads\2024\08" | Select-Object Name
```

Salida esperada (exactamente estos 6):
```
20240817-GrupoEnExpoDron2024-1024x769.jpg
DSC00792-1024x769.jpg
DSC00792-scaled.jpg
DSC00829-1024x769.jpg
IMG-20240818-WA0014-976x1024.jpg
IMG_20240817_101617-1024x576.jpg
```

- [ ] **Step 4: Eliminar imágenes huérfanas de `2026/05/`**

```powershell
$dir = "public\images\uploads\2026\05"
@(
    '704715687_1001688008873885_9044390564626876089_n.jpg',
    '704731460_1001687925540560_4119953362436188948_n.jpg',
    '705247583_1001687978873888_3065305714793957238_n.jpg',
    '705259329_1001687855540567_112422131662873411_n.jpg'
) | ForEach-Object {
    Remove-Item "$dir\$_" -Force
    Write-Host "Eliminado: $_"
}
```

Salida esperada: 4 líneas `Eliminado: ...`

- [ ] **Step 5: Eliminar favicon-32x32.png**

```powershell
Remove-Item "public\images\logo\favicon-32x32.png" -Force
Write-Host "Eliminado favicon-32x32.png"
```

- [ ] **Step 6: Verificar total de imágenes restantes**

```powershell
(Get-ChildItem "public\images" -Recurse -Include *.jpg,*.png,*.svg,*.ico).Count
```

Salida esperada: `21` (6 uploads/2024/08 + 8 uploads/2026/05→4 quedan + 7 otras + 2 favicon + 2 logo)

- [ ] **Step 7: Commit**

```bash
git add -A public/images/
git commit -m "chore: remove unused WordPress image variants (86 files)"
```

---

## Task 3: Crear y ejecutar script de conversión a WebP

**Files:**
- Create: `scripts/optimize-images.mjs`

- [ ] **Step 1: Crear el directorio `scripts/` si no existe**

```bash
mkdir -p scripts
```

- [ ] **Step 2: Crear `scripts/optimize-images.mjs`**

```javascript
import sharp from 'sharp';
import { readdir, stat, unlink } from 'fs/promises';
import { join, extname, basename, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const INPUT_DIR = join(__dirname, '..', 'public', 'images');
const MAX_WIDTH = 1600;
const QUALITY = 82;

async function collectImages(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectImages(fullPath)));
    } else if (['.jpg', '.jpeg', '.png'].includes(extname(entry.name).toLowerCase())) {
      files.push(fullPath);
    }
  }
  return files;
}

async function convertToWebp(filePath) {
  const sizeBefore = (await stat(filePath)).size;
  const outputPath = filePath.replace(/\.(jpg|jpeg|png)$/i, '.webp');

  const metadata = await sharp(filePath).metadata();
  let pipeline = sharp(filePath);
  if (metadata.width > MAX_WIDTH) {
    pipeline = pipeline.resize(MAX_WIDTH);
  }

  await pipeline.webp({ quality: QUALITY }).toFile(outputPath);
  const sizeAfter = (await stat(outputPath)).size;
  await unlink(filePath);

  const pct = (((sizeBefore - sizeAfter) / sizeBefore) * 100).toFixed(1);
  console.log(
    `✓ ${basename(filePath).padEnd(50)} ${(sizeBefore / 1024).toFixed(0).padStart(6)}KB → ${(sizeAfter / 1024).toFixed(0).padStart(6)}KB  (-${pct}%)`
  );
  return { sizeBefore, sizeAfter };
}

const files = await collectImages(INPUT_DIR);
console.log(`Convirtiendo ${files.length} imágenes a WebP (calidad ${QUALITY}, máx ${MAX_WIDTH}px)...\n`);

let totalBefore = 0;
let totalAfter = 0;
for (const file of files) {
  const { sizeBefore, sizeAfter } = await convertToWebp(file);
  totalBefore += sizeBefore;
  totalAfter += sizeAfter;
}

console.log(`\nTotal: ${(totalBefore / 1024 / 1024).toFixed(1)} MB → ${(totalAfter / 1024 / 1024).toFixed(1)} MB  (-${(((totalBefore - totalAfter) / totalBefore) * 100).toFixed(1)}%)`);
```

- [ ] **Step 3: Ejecutar el script**

```bash
node scripts/optimize-images.mjs
```

Salida esperada (ejemplo):
```
Convirtiendo 21 imágenes a WebP (calidad 82, máx 1600px)...

✓ DSC00792-scaled.jpg                              1044KB →   180KB  (-82.7%)
✓ hero-bg.jpg                                      4250KB →   350KB  (-91.8%)
...
Total: X.X MB → X.X MB  (-XX.X%)
```

- [ ] **Step 4: Verificar que no queda ningún .jpg/.png en `public/images/`**

```powershell
Get-ChildItem "public\images" -Recurse -Include *.jpg,*.jpeg,*.png
```

Salida esperada: sin resultados

- [ ] **Step 5: Verificar que los .webp existen**

```powershell
Get-ChildItem "public\images" -Recurse -Include *.webp | Select-Object Name, @{n='KB';e={[math]::Round($_.Length/1KB,1)}}
```

Salida esperada: 19 archivos `.webp` (los 2 favicons en `public/` son .ico y .svg, no se convierten)

- [ ] **Step 6: Commit**

```bash
git add -A public/images/ scripts/optimize-images.mjs
git commit -m "feat: convert all images to WebP (quality 82, max 1600px)"
```

---

## Task 4: Actualizar referencias en archivos `.md`

**Files:**
- Modify: `src/content/blog/expodron-2024.md`
- Modify: `src/content/blog/drones-ia-agtech-buena-vista-2026.md`
- Modify: `src/content/blog/network-support.md`
- Modify: `src/content/blog/earth-day-2022-climate-action.md`
- Modify: `src/content/blog/firehawk-project.md`
- Modify: `src/content/blog/empowering-bolivian-youth.md`
- Modify: `src/content/blog/ganaderia-drone-technology.md`
- Modify: `src/content/blog/los-pinos-urban-planning.md`
- Modify: `src/content/blog/fexpo-pinos-event.md`

- [ ] **Step 1: Actualizar `expodron-2024.md` (6 referencias)**

En `src/content/blog/expodron-2024.md`, reemplazar:

| Antes | Después |
|---|---|
| `featuredImage: /images/uploads/2024/08/DSC00792-scaled.jpg` | `featuredImage: /images/uploads/2024/08/DSC00792-scaled.webp` |
| `/images/uploads/2024/08/IMG-20240818-WA0014-976x1024.jpg` | `/images/uploads/2024/08/IMG-20240818-WA0014-976x1024.webp` |
| `/images/uploads/2024/08/IMG_20240817_101617-1024x576.jpg` | `/images/uploads/2024/08/IMG_20240817_101617-1024x576.webp` |
| `/images/uploads/2024/08/20240817-GrupoEnExpoDron2024-1024x769.jpg` | `/images/uploads/2024/08/20240817-GrupoEnExpoDron2024-1024x769.webp` |
| `/images/uploads/2024/08/DSC00792-1024x769.jpg` | `/images/uploads/2024/08/DSC00792-1024x769.webp` |
| `/images/uploads/2024/08/DSC00829-1024x769.jpg` | `/images/uploads/2024/08/DSC00829-1024x769.webp` |

Forma rápida con PowerShell (desde la raíz del proyecto):
```powershell
(Get-Content "src\content\blog\expodron-2024.md") -replace '\.jpg', '.webp' | Set-Content "src\content\blog\expodron-2024.md"
```

- [ ] **Step 2: Actualizar `drones-ia-agtech-buena-vista-2026.md` (4 referencias)**

```powershell
(Get-Content "src\content\blog\drones-ia-agtech-buena-vista-2026.md") -replace '\.jpg', '.webp' | Set-Content "src\content\blog\drones-ia-agtech-buena-vista-2026.md"
```

Verifica: las 4 imágenes deben terminar en `.webp` (1 featuredImage + 3 inline)

- [ ] **Step 3: Actualizar los 7 posts con solo `featuredImage`**

```powershell
@(
    'src\content\blog\network-support.md',
    'src\content\blog\earth-day-2022-climate-action.md',
    'src\content\blog\firehawk-project.md',
    'src\content\blog\empowering-bolivian-youth.md',
    'src\content\blog\ganaderia-drone-technology.md',
    'src\content\blog\los-pinos-urban-planning.md',
    'src\content\blog\fexpo-pinos-event.md'
) | ForEach-Object {
    (Get-Content $_) -replace '\.jpg', '.webp' | Set-Content $_
    Write-Host "Actualizado: $_"
}
```

- [ ] **Step 4: Verificar que no queda ninguna referencia `.jpg` en los posts**

```bash
grep -r "\.jpg" src/content/blog/
```

Salida esperada: sin resultados

- [ ] **Step 5: Commit**

```bash
git add src/content/blog/
git commit -m "feat: update blog post image references to .webp"
```

---

## Task 5: Actualizar referencias en archivos `.astro`

**Files:**
- Modify: `src/pages/index.astro` (línea 17)
- Modify: `src/pages/[slug].astro` (línea 17)
- Modify: `src/pages/noticias.astro` (línea 12)

- [ ] **Step 1: Actualizar `index.astro` — hero-bg.jpg → hero-bg.webp**

En `src/pages/index.astro`, línea 17, cambiar:
```
src="/images/hero/hero-bg.jpg"
```
por:
```
src="/images/hero/hero-bg.webp"
```

- [ ] **Step 2: Actualizar `[slug].astro` — logo.png → logo.webp**

En `src/pages/[slug].astro`, línea 17, cambiar:
```javascript
const LOGO = '/images/logo/drone-lab-bolivia-logo.png';
```
por:
```javascript
const LOGO = '/images/logo/drone-lab-bolivia-logo.webp';
```

- [ ] **Step 3: Actualizar `noticias.astro` — logo.png → logo.webp**

En `src/pages/noticias.astro`, línea 12, cambiar:
```javascript
const LOGO = '/images/logo/drone-lab-bolivia-logo.png';
```
por:
```javascript
const LOGO = '/images/logo/drone-lab-bolivia-logo.webp';
```

- [ ] **Step 4: Verificar que no quedan referencias a .jpg o .png en `src/pages/`**

```bash
grep -r "\.jpg\|\.png" src/pages/
```

Salida esperada: sin resultados

- [ ] **Step 5: Commit**

```bash
git add src/pages/index.astro "src/pages/[slug].astro" src/pages/noticias.astro
git commit -m "feat: update Astro component image references to .webp"
```

---

## Task 6: Verificar build y revisión visual

- [ ] **Step 1: Verificar que el build de Astro no tiene errores**

```bash
npm run build
```

Salida esperada: `✓ Completed in X.XXs` sin errores ni warnings de imágenes no encontradas

- [ ] **Step 2: Levantar el servidor de desarrollo**

```bash
npm run dev
```

- [ ] **Step 3: Verificar visualmente las páginas con imágenes**

Abrir en el navegador:
- `http://localhost:4321/` — verificar que el hero-bg carga (fondo de la home)
- `http://localhost:4321/noticias` — verificar que las imágenes destacadas de los posts se muestran
- `http://localhost:4321/expodron-2024` — verificar las 5 imágenes inline dentro del artículo
- `http://localhost:4321/drones-ia-agtech-buena-vista-2026` — verificar las 3 imágenes inline

- [ ] **Step 4: Confirmar en DevTools que se sirven WebP**

En Chrome DevTools → Network → Img: verificar que las imágenes muestran `Type: webp` en la columna de tipo

- [ ] **Step 5: Commit final**

```bash
git add -A
git commit -m "chore: verify WebP migration complete — 44MB → ~3MB"
```
