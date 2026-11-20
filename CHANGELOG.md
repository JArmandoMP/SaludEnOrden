# CHANGELOG · SaludEnOrden — Versionado SemVer + BUILD

Fuente de verdad de la versión: el parámetro `?v=` en `index.html`.
`sw.js` usa el mismo valor en el nombre de su caché y los instaladores se llaman
`SaludEnOrden-vMAJOR.MINOR.PATCH.BUILD.exe`.

## Último registro (para resúmenes rápidos)

- **Versión:** `0.13.2.4`
- **Fecha:** 2026-11-20
- **Qué se hizo:** El buscador de actualizaciones consulta ahora la API pública de GitHub Releases; si hay una versión
  nueva, la descarga solo tras confirmación del usuario (a `%LOCALAPPDATA%\SaludEnOrden\Updates`) y abre el instalador.
  Sin conexión o sin Release, mantiene el fallback en `Descargas`/`Escritorio`. Se añadieron avisos honestos de
  privacidad y distribución en el instalador y en Ajustes: uso personal gratuito, datos solo en el dispositivo, sin
  envío de historial a internet, hash verificable y advertencia de SmartScreen por falta de firma digital.
- **Qué genera:** `dist\SaludEnOrden-v0.13.2.4.exe`, desinstalador, `app_bundle.zip` y la app instalada en x86.
- **Por:** OpenCode (agente), a solicitud del titular.
- **Resultado:** **Exitoso** (verificación de extremo a extremo: API pública → Release `v0.13.2.4` → el buscador
  devuelve `available=true, version=0.13.2.4, source=github` con `current=0.13.2.3`; la descarga desde la app
  produjo un `.exe` de 30.43 MB con SHA256 idéntico al artefacto local. Con `current=0.13.2.4` devuelve
  `available=false`, sin falsos positivos).
- **Publicación:** repositorio público `JArmandoMP/SaludEnOrden` (el nombre anterior `historial-medico-personal`
  rediriga 301; por eso el código y los docs antiguos siguen funcionando). Release `v0.13.2.4` con el instalador
  adjunto, descarga anónima verificada (HTTP 200, 31.909.956 bytes).
- **Nota:** la URL embebida en el buscador usa el nombre antiguo del repo, que GitHub redirige correctamente; se
  conserva para no recompilar ni invalidar el SHA256 ya publicado.
- **Rotación de credencial (2026-11-20):** se retiró el token clásico compartido con los proyectos dados de baja
  (`Control de Gastos`, `synkora`). Se guardó un token de granularidad fina válido únicamente para `SaludEnOrden`
  (permiso `Contents: Read and Write`, 90 días) y se verificó `push` con exit 0. La revocación del token viejo
  debe hacerla el titular en GitHub. Sin cambio de versión ni de artefactos.
- **Respaldo local:** `R:\Programación\OpenCode\Historial Medico Personal - Respaldos\Versiones\2026-11\v0.13.2.3 (2026-11-20_1312)` y su ZIP, creados antes de este cambio.
- **Commit del cambio:** `5f4d3f5` (versión anterior). Push a `main` exitoso.
- **SHA256 del instalador:** `F298BFCACC9F14F53A1B1D3323E2FEEDBBD0FE3FCC35D43AFF6B258024DD6511` (`dist\SaludEnOrden-v0.13.2.4.exe`, 30.43 MB).

## Grados del formato `MAJOR.MINOR.PATCH.BUILD`

| Grado | Nombre | Cuándo se incrementa | Efecto en los siguientes |
|-------|--------|----------------------|--------------------------|
| 1 | **MAJOR** | Cambio incompatible: migración obligatoria de datos, cambio de esquema sin compatibilidad, eliminación de un módulo o cambio radical de arquitectura. | MINOR, PATCH y BUILD vuelven a `0`. |
| 2 | **MINOR** | Funcionalidad nueva compatible hacia atrás: módulo nuevo, opción nueva, flujo nuevo. No rompe los datos guardados. | PATCH y BUILD vuelven a `0`. |
| 3 | **PATCH** | Corrección de un error o ajuste de comportamiento sin funciones nuevas. | BUILD vuelve a `0`. |
| 4 | **BUILD** | Documentación, orden de carpetas, scripts, empaquetado, seguridad de proceso o ajustes que no cambian lo que hace la app. | No reinicia nada; sube en `1`. |

**Reglas de esta línea de versiones**

- Se reinicia la numeración: el equivalente a la última versión anterior (`3.0.2`) pasa a ser `0.13.2.0`.
- El techo es `3.0.2`: **nunca se volverá a superar** ese número.
- `0.x` indica desarrollo controlado; se pasará a `1.0.0.0` solo cuando el titular lo autorice.
- Los instaladores antiguos de tres números (`SaludEnOrden-v3.0.2.exe`) ya no son detectados
  por el buscador de actualizaciones: solo se reconocen nombres de cuatro números.
- Toda subida de versión debe ir acompañada de: fila nueva en este CHANGELOG + respaldo local
  con `Hacer-Respaldo.ps1` + commit/push a GitHub (sin datos personales).

## Historial adaptado (legacy → SemVer + BUILD)

| SemVer | Legacy | Fecha | Qué se hizo | Qué genera | Por | Resultado |
|--------|--------|-------|-------------|------------|-----|-----------|
| 0.1.0.0 | v1.1 | 2026-11-10 | App de un solo usuario; corrección de acentos y cédula profesional | Base funcional de la app | OpenCode (agente) | Posteriormente modificado → 0.2.0.0 |
| 0.2.0.0 | v1.2 | 2026-11-10 | Modo multiusuario, bienvenida, sesión cerrada y bitácora | Perfiles por usuario | OpenCode (agente) | Posteriormente modificado → 0.3.0.0 |
| 0.3.0.0 | v1.3 | 2026-11-10 | Contraseñas por usuario, barra de fuerza, panel de administrador y eventos de seguridad | Seguridad de cuentas | OpenCode (agente) | Posteriormente modificado → 0.3.1.0 |
| 0.3.1.0 | v1.4 | 2026-11-10 | Corrección: los diálogos aparecen encima de todas las pantallas | Arreglo de interfaz | OpenCode (agente) | Exitoso |
| 0.4.0.0 | v1.5 | 2026-11-10 | Fondo vectorial «Salud y vida» en las pantallas de acceso | Identidad visual | OpenCode (agente) | Exitoso |
| 0.5.0.0 | v1.6 | 2026-11-10 | Versión dinámica, paso «Protege tu cuenta», borrado voluntario y autoguardado cada 10 minutos | Persistencia y seguridad | OpenCode (agente) | Posteriormente modificado → 0.5.1.0 |
| 0.5.1.0 | v1.9 | 2026-11-10 | Ajustes: ruta del último respaldo e interruptor de auto-guardado | Control de respaldos | OpenCode (agente) | Exitoso |
| 0.6.0.0 | v2.0 | 2026-11-10 | Rebrand completo a SaludEnOrden: nombre, logo, favicon y respaldos | Marca de la app | OpenCode (agente) | Exitoso |
| 0.7.0.0 | v2.2 | 2026-11-10 | PWA: manifest, iconos y service worker con caché offline | App instalable | OpenCode (agente) | Posteriormente modificado → 0.7.1.0 |
| 0.7.1.0 | v2.3 | 2026-11-10 | Servidor interno en el puerto 8099, perfil persistente, fallback a Chrome/Edge y cierre de navegadores huérfanos | Escritorio estable | OpenCode (agente) | Exitoso |
| 0.8.0.0 | v2.4 | 2026-11-11 | Actualizaciones sin desinstalar: detecta la instalación existente y avisa si la app está abierta | Instalador actualizador | OpenCode (agente) | Exitoso |
| 0.8.1.0 | v2.4.1 | 2026-11-11 | Catálogo «Esposo/a», respaldo con selector de carpeta, restaurar verde y detalle del respaldo | Respaldos más claros | OpenCode (agente) | Exitoso |
| 0.8.2.0 | v2.4.2 | 2026-11-11 | Botones centrados en Ajustes | Interfaz | OpenCode (agente) | Exitoso |
| 0.8.3.0 | v2.4.3 | 2026-11-11 | Tarjeta «100% privado» reforzada y texto del auto-guardado retirado | Interfaz | OpenCode (agente) | Exitoso |
| 0.8.4.0 | v2.4.4 | 2026-11-11 | Interruptor movido dentro de la tarjeta de copia automática | Interfaz | OpenCode (agente) | Exitoso |
| 0.9.0.0 | v2.4.5 | 2026-11-11 | «Medición rápida» y tarjeta «Evolución de tus signos» con gráfica de tendencias | Funciones nuevas | OpenCode (agente) | Exitoso |
| 0.10.0.0 | v2.4.6 | 2026-11-11 | Bloqueo por inactividad (5/10/30 min) y resumen rápido en el informe/PDF | Seguridad e informe | OpenCode (agente) | Exitoso |
| 0.11.0.0 | v2.4.7 | 2026-11-11 | Tarjeta de emergencia imprimible con QR sin conexión y tomas marcadas desde la campana | Función nueva | OpenCode (agente) | Exitoso |
| 0.12.0.0 | v2.4.8 | 2026-11-11 | Respaldos cifrados (AES-256-GCM + PBKDF2) y opción «Texto más grande» | Seguridad y accesibilidad | OpenCode (agente) | Exitoso |
| 0.13.0.0 | v3.0.0 | 2026-11-11 | Carpeta de respaldo automático en disco y buscador de actualizaciones de un clic | Actualizaciones | OpenCode (agente) | Posteriormente modificado → 0.13.1.0 |
| 0.13.1.0 | v3.0.1 | 2026-11-11 | Corrección del caché offline: `index.html` se sirve primero desde la red y la app se recarga una vez | Arreglo de actualizaciones | OpenCode (agente) | Posteriormente modificado → 0.13.2.0 |
| 0.13.2.0 | v3.0.2 | 2026-11-11 | Menú Registrar simplificado: todo en «Medición rápida», con Pulso y SpO2 | Ajuste de interfaz | OpenCode (agente) | Posteriormente modificado → 0.13.2.1 |
| 0.13.2.1 | — | 2026-11-20 | Adopción SemVer + BUILD, changelog, orden de carpetas, Git portable con credencial protegida, remote sin token y scripts ajustados a cuatro números | Registro, copias y seguridad | OpenCode (agente) | Posteriormente modificado → 0.13.2.2 |
| 0.13.2.2 | — | 2026-11-20 | Instalador sin tkinter, detección HKLM/x86, cierre gradual, Escritorio OneDrive, desinstalador reforzado y migración real a `Program Files (x86)` | Instalador y desinstalador verificados | OpenCode (agente) | Posteriormente modificado → 0.13.2.3 |
| 0.13.2.3 | — | 2026-11-20 | Migración automática a x86: instalar, verificar y solo entonces borrar la instalación antigua de Program Files | Regla de instalación permanente | OpenCode (agente) | Posteriormente modificado → 0.13.2.4 |
| 0.13.2.4 | — | 2026-11-20 | Buscador vía GitHub Releases con descarga bajo confirmación y fallback local; avisos de privacidad y distribución en instalador y app | Descarga por link y avisos al usuario | OpenCode (agente) | **Exitoso** |

## Plantilla para el próximo cambio

```text
Versión: MAJOR.MINOR.PATCH.BUILD
Fecha: AAAA-MM-DD
Qué se hizo: ...
Qué genera: ...
Por: OpenCode (agente) / titular
Resultado: Exitoso | Posteriormente modificado → vX.Y.Z.W
Respaldo local: ... - Respaldos\Versiones\AAAA-MM\vX.Y.Z.W (...)
Commit: hash de Git
```
