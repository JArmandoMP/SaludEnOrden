# Registro de versiones · SaludEnOrden

Cada vez que se hacen cambios en la aplicación se toma una copia de seguridad con el número de versión
del momento. Si la app llegara a fallar, se restaura la carpeta (o ZIP) de la versión que funcionaba bien.

## Cómo crear un respaldo nuevo

Ejecutar `Hacer-Respaldo.ps1` (clic derecho → *Ejecutar con PowerShell*).
Crea, dentro de `R:\Programación\OpenCode\Historial Medico Personal - Respaldos\Versiones\AAAA-MM\`:

- `vMAJOR.MINOR.PATCH.BUILD (fecha_hora)` — copia completa lista para usar
- `SaludEnOrden-vMAJOR.MINOR.PATCH.BUILD (fecha_hora).zip` — el mismo respaldo comprimido

Los datos personales se guardan aparte en `... - Respaldos\Datos\` y **nunca** se suben a GitHub.

La versión se lee automáticamente de `index.html` (los enlaces terminan en `?v=MAJOR.MINOR.PATCH.BUILD`).
El detalle de cada cambio, con fecha, qué genera, autor y resultado, está en **`CHANGELOG.md`**.

### Nombres de los instaladores

Cada versión genera su propio instalador con los cuatro números en el nombre:

- Ejemplo: `SaludEnOrden-v0.13.2.4.exe`
- Formato: `SaludEnOrden-vMAJOR.MINOR.PATCH.BUILD.exe`

Todos se instalan encima de la instalación existente (sin desinstalar) y conservan los datos.

## Cómo restaurar una versión

1. Copia el contenido de la carpeta del respaldo (o descomprime el ZIP).
2. Pégalo sobre la carpeta `Historial Medico Personal`, reemplazando los archivos.
3. Abre `index.html`. Tus datos (perfiles, bitácora, etc.) viven en el navegador, no en estos archivos,
   así que restaurar la app no borra la información guardada.

## Versiones guardadas

Los números `v1.x`, `v2.x` y `v3.x` de abajo son **históricos** (previos al estándar).
Su equivalencia al formato `MAJOR.MINOR.PATCH.BUILD` está en `CHANGELOG.md`.

| Versión (legacy) | Fecha       | Respaldo                                             | Qué contiene |
|---------|-------------|------------------------------------------------------|--------------|
| v1.1    | 2026-11-10  | `Historial Medico Personal - RESPALDO 2026-11-10` y `Vitalia-RESPALDO-2026-11-10.zip` | App de un solo usuario con corrección de acentos y cédula profesional (estado previo al modo multiusuario) |
| v1.2    | 2026-11-10  | `Historial Medico Personal - v1.2 (2026-11-10_1647)` y `Vitalia-v1.2 (2026-11-10_1647).zip` | Modo multiusuario con pantalla de bienvenida y de sesión cerrada, botón "Cerrar sesión", bitácora de cambios con "Última actualización", corrección de la pantalla en blanco al iniciar sesión |
| v1.3    | 2026-11-10  | `Historial Medico Personal - v1.3 (2026-11-10_1712)` y `Vitalia-v1.3 (2026-11-10_1712).zip` | Contraseñas por usuario con barra de fuerza (se piden en cada apertura de la app), tarjeta "Seguridad del perfil", panel de administrador oculto (admin) para borrar la información de los usuarios, eventos de seguridad en la bitácora |
| v1.4    | 2026-11-10  | `Historial Medico Personal - v1.4 (2026-11-10_1721)` y `Vitalia-v1.4 (2026-11-10_1721).zip` | Corrección: los diálogos de confirmación (y avisos) ahora aparecen encima de todas las pantallas; antes quedaban detrás de la de bienvenida y el panel de administrador parecía no hacer nada al pulsar sus botones |
| v1.5    | 2026-11-10  | `Historial Medico Personal - v1.5 (2026-11-10_1728)` y `Vitalia-v1.5 (2026-11-10_1728).zip` | Nuevo fondo "Salud y vida" (SVG vectorial propio: hexágonos, cruces médicas y línea de latido con colores vivos verde/azul) en las pantallas de bienvenida, selección de usuario, contraseña, sesión cerrada y panel de administrador |
| v1.6    | 2026-11-10  | `Historial Medico Personal - v1.6 (2026-11-10_1741)` y `Vitalia-v1.6 (2026-11-10_1741).zip` | Versión dinámica en "Acerca de Vitalia" (antes mostraba siempre 1.0), paso "Protege tu cuenta" al crear un usuario nuevo (con barra de fuerza y opción de continuar sin contraseña), eliminación voluntaria de la propia cuenta en Ajustes y copia automática cada 10 minutos (y al ocultar/cerrar la ventana) con descarga y restauración desde Ajustes |
| v1.9    | 2026-11-10  | `Historial Medico Personal - v1.9 (2026-11-10_1812)` y `Vitalia-v1.9 (2026-11-10_1812).zip` | En Ajustes se muestra la ruta del último respaldo descargado (nombre de archivo + carpeta Descargas), se eliminaron los botones de descargar/restaurar la copia automática y se reemplazaron por un interruptor deslizable para activar/desactivar el auto-guardado; la copia automática se guarda en el almacenamiento local del navegador |
| v2.0    | 2026-11-10  | Historial Medico Personal - v2.0 (2026-11-10_1830) y SaludEnOrden-v2.0 (2026-11-10_1830).zip | Rebrand completo a SaludEnOrden: nombre en toda la app, nuevo logo (check + latido), favicon, respaldos con el nuevo nombre, version 2.0 |
| v2.2    | 2026-11-10  | Historial Medico Personal - v2.2 (2026-11-10_1843) y SaludEnOrden-v2.2 (2026-11-10_1843).zip | App instalable como programa de escritorio (PWA): manifest, iconos, service worker con caché offline; se abre en ventana propia sin navegador y funciona sin internet |
| v2.3    | 2026-11-10  | Historial Medico Personal - v2.3 (2026-11-10_2325) y SaludEnOrden-v2.3 (2026-11-10_2325).zip | App de escritorio definitiva: corrección del servidor interno que respondía 0 bytes (sys.stderr nulo en exes sin consola), instalación completa verificada, apertura en ventana propia con respaldo automático a Chrome/Edge modo app si WebView2 falla, perfil persistente para conservar datos entre sesiones, puerto fijo 8099, cierre de navegadores huérfanos y lanzamiento sin privilegios elevados desde el instalador |
| v2.4    | 2026-11-11  | Historial Medico Personal - v2.4 (2026-11-11_1111) y SaludEnOrden-v2.4 (2026-11-11_1111).zip | Actualizaciones sin desinstalar: el instalador detecta la instalación existente (lee su carpeta del registro de Windows y la muestra por defecto con el título "Actualizar"), y avisa si la aplicación está en ejecución ofreciendo cerrarla antes de instalar; detección a prueba de errores de codificación |
| v2.4.1  | 2026-11-11  | Historial Medico Personal - v2.4.1 (2026-11-11_1138) y SaludEnOrden-v2.4.1 (2026-11-11_1138).zip | Parche 1 de la rama v2.4 (los parches .1 a .8 llevarán a la v3.0.0). Instalador del parche: `SaludEnOrden-v2.4.1.exe`. El catálogo dice "Esposo/a" en lugar de "Pareja"; el botón azul de Ajustes se llama "Realizar respaldo" y permite elegir dónde guardar (selector de carpeta del sistema, con Descargas como respaldo si no está disponible); el botón "Restaurar respaldo" ahora es verde con icono de carpeta; al terminar el respaldo se muestra la fecha, el nombre del archivo y dónde se guardó (también en la nota de Ajustes y en la bitácora) |
| v2.4.2  | 2026-11-11  | Historial Medico Personal - v2.4.2 (2026-11-11_1153) y SaludEnOrden-v2.4.2 (2026-11-11_1153).zip | Parche 2 de la rama v2.4. Instalador del parche: `SaludEnOrden-v2.4.2.exe`. Botones centrados en Ajustes: "Realizar respaldo" + "Restaurar respaldo", "Cargar datos de ejemplo" + "Borrar todos los datos", y "Eliminar mi cuenta y su información" (nueva clase CSS .row-center) |
| v2.4.3  | 2026-11-11  | Historial Medico Personal - v2.4.3 (2026-11-11_1221) y SaludEnOrden-v2.4.3 (2026-11-11_1221).zip | Parche 3 de la rama v2.4. Instalador del parche: `SaludEnOrden-v2.4.3.exe`. El cuadro "100% privado" del menú lateral ahora se nota más: fondo azul más intenso, borde y sombra reforzados, y letras en azul fuerte; en Ajustes se quitó el texto "Activar auto-guardado automático" (el interruptor queda solo, en el mismo lugar, con etiqueta oculta para accesibilidad) |
| v2.4.4  | 2026-11-11  | Historial Medico Personal - v2.4.4 (2026-11-11_1343) y SaludEnOrden-v2.4.4 (2026-11-11_1343).zip | Parche 4 de la rama v2.4. Instalador del parche: `SaludEnOrden-v2.4.4.exe`. En Ajustes se quitaron los textos "Última copia automática…" y "Guardada en: almacenamiento local del navegador (localStorage)"; el interruptor azul deslizable se movió dentro de la tarjeta "Copia automática (cada 10 minutos)", a su lado derecho (misma lógica y etiqueta de accesibilidad) |
| v2.4.5  | 2026-11-11  | Historial Medico Personal - v2.4.5 (2026-11-11_1558) y SaludEnOrden-v2.4.5 (2026-11-11_1558).zip | Parche 5 de la rama v2.4. Instalador del parche: `SaludEnOrden-v2.4.5.exe`. Nueva opción "Medición rápida" en el botón Registrar: mini-ventana para anotar presión, glucosa, peso o temperatura en segundos sin salir de la pantalla. Nueva tarjeta "Evolución de tus signos" en el Resumen con gráfica de tendencia y pestañas por métrica |
| v2.4.6  | 2026-11-11  | Historial Medico Personal - v2.4.6 (2026-11-11_1611) y SaludEnOrden-v2.4.6 (2026-11-11_1611).zip | Parche 6 de la rama v2.4. Instalador del parche: `SaludEnOrden-v2.4.6.exe`. Nuevo bloqueo por inactividad en Ajustes > Seguridad: tras 5, 10 o 30 minutos sin actividad la app se cierra sola, guarda copia de seguridad y pide la contraseña (pantalla "Sesión bloqueada"). El Informe / PDF ahora incluye un "Resumen rápido para la consulta" con paciente, grupo sanguíneo, contacto de emergencia, medicamentos activos y últimas mediciones |
| v2.4.7  | 2026-11-11  | Historial Medico Personal - v2.4.7 (2026-11-11_1616) y SaludEnOrden-v2.4.7 (2026-11-11_1616).zip | Parche 7 de la rama v2.4. Instalador del parche: `SaludEnOrden-v2.4.7.exe`. Nueva Tarjeta de emergencia (en Mi perfil > "Tarjeta de emergencia"): tarjeta imprimible con nombre, grupo sanguíneo, alergias, medicamentos y contacto de emergencia, con código QR escaneable por cualquier teléfono (funciona 100% sin conexión). La campana de recordatorios ya permitía marcar tomas como tomadas |
| v2.4.8  | 2026-11-11  | Historial Medico Personal - v2.4.8 (2026-11-11_2032) y SaludEnOrden-v2.4.8 (2026-11-11_2032).zip | Parche 8 de la rama v2.4. Instalador del parche: \SaludEnOrden-v2.4.8.exe\. Nueva opción «Cifrar los respaldos» en Ajustes: los respaldos se protegen con contraseña (AES-256-GCM + PBKDF2, 150000 iteraciones); al restaurar un respaldo cifrado pide la contraseña. Nueva opción «Texto más grande» (accesibilidad): aumenta el tamaño de letra en toda la aplicación al instante |
| v3.0.0  | 2026-11-11  | Historial Medico Personal - v3.0.0 (2026-11-11_2032) y SaludEnOrden-v3.0.0 (2026-11-11_2032).zip | Nueva rama mayor; cierra la rama 2.4. Instalador: \SaludEnOrden-v3.0.0.exe\. «Carpeta de respaldo automático»: eliges una carpeta y cada auto-guardado escribe también \saludenorden-autoguardado.json\ ahí. Buscador de actualizaciones de un clic en Ajustes: busca instaladores más nuevos en Descargas/Escritorio y los abre por ti (endpoint /__api/check-updates + /__api/launch-installer del servidor interno) |
| v3.0.1  | 2026-11-11  | Historial Medico Personal - v3.0.1 (2026-11-11_2049) y SaludEnOrden-v3.0.1 (2026-11-11_2049).zip | Corrección de actualizaciones «no visibles»: el caché offline (service worker) de la versión anterior seguía sirviendo archivos viejos. Ahora el index.html se sirve «primero la red» en cada arranque, el caché se repara solo con cada navegación exitosa y la app se recarga automáticamente una vez cuando el service worker nuevo toma el control. Instalador: \SaludEnOrden-v3.0.1.exe\ |
| v3.0.2  | 2026-11-11  | Historial Medico Personal - v3.0.2 (2026-11-11_2057) y SaludEnOrden-v3.0.2 (2026-11-11_2057).zip | Simplificación del menú Registrar: se quitó «Signo vital» (redundante) y todo queda en «Medición rápida», que ahora incluye también Pulso y Saturación (SpO2); los síntomas no se agregaron al menú rápido (siguen disponibles en Monitoreo). Instalador: \SaludEnOrden-v3.0.2.exe\ |
