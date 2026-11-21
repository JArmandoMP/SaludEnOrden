# SaludEnOrden — Historial médico personal

SaludEnOrden es una aplicación web local para guardar y consultar tu historial médico completo desde el navegador. Funciona sin conexión, sin servidor y sin crear cuenta: toda la información se almacena en este dispositivo.

## Cómo abrir la aplicación

### Como programa de escritorio (recomendado)
Ejecuta `dist/SaludEnOrden-v0.13.2.4.exe` y sigue el asistente (los instaladores nuevos se llaman `SaludEnOrden-vMAJOR.MINOR.PATCH.BUILD.exe`). Detecta si ya está instalada y la actualiza sin borrar tus datos. Se instalará en `C:\Program Files (x86)\SaludEnOrden` y creará accesos directos en el Escritorio y el Menú Inicio. Al abrirlo, se ejecuta en una ventana propia (sin navegador) y funciona sin internet.

### Como página web
Abre el archivo `index.html` con un navegador moderno (Chrome, Edge o Firefox).

No necesita conexión a internet ni dependencias externas.

## Instalar como programa de escritorio (opcional)

Si prefieres abrir SaludEnOrden en su propia ventana, como un programa normal (sin barra del navegador):

1. Ejecuta el instalador `Instalar SaludEnOrden.exe`.
2. Elige la carpeta de instalación y pulsa "Instalar".
3. Se creará un acceso directo en el Escritorio y en el Menú Inicio.
4. Al abrirlo, se ejecuta en modo ventana independiente y funciona sin internet (gracias a su caché offline).

## Módulos incluidos

- **Resumen:** panel inicial con alertas, dosis pendientes, próximas citas y accesos rápidos.
- **Mi perfil:** datos personales, grupo sanguíneo, alergias graves, contactos de emergencia, dirección y antecedentes familiares.
- **Monitoreo diario:** presión arterial, glucosa, peso, pulso, oxígeno, temperatura, síntomas y tendencias.
- **Historial clínico:** consultas, diagnósticos, cirugías, laboratorios y vacunas organizados cronológicamente.
- **Tratamientos:** medicamentos activos, horarios, dosis tomadas/omitidas, instrucciones y recetas adjuntas.
- **Citas médicas:** agenda, citas asistidas, recordatorios y vinculación con registros clínicos.
- **Documentos:** capturas, escaneos, estudios, recetas y otros archivos vinculados a tu historial.
- **Directorio médico:** médicos, clínicas, laboratorios y hospitales con datos de contacto.
- **Informe / PDF:** vista previa e impresión de todo el historial para compartir o archivar.

## Privacidad y almacenamiento

- Los datos se guardan localmente en IndexedDB del navegador.
- No se envía información a servidores ni servicios externos.
- Las imágenes y documentos adjuntos se almacenan como archivos binarios dentro del navegador.
- La información no se sincroniza entre dispositivos ni navegadores.
- Uso personal y distribución gratuita no comercial: cada persona guarda su propio historial en su equipo.
- La única conexión opcional es la búsqueda de versiones nuevas en GitHub Releases; no transmite datos personales.
- El instalador es de código abierto y no contiene datos personales; verifica el SHA256 publicado en `CHANGELOG.md`.
- No está firmado digitalmente: Windows SmartScreen puede mostrar una advertencia al descargarlo. Comprueba siempre la fuente y el hash antes de ejecutarlo.

## Descargas y actualizaciones

Los instaladores se publican en **GitHub Releases** del repositorio:
`https://github.com/JArmandoMP/SaludEnOrden/releases`

Desde **Configuración → Actualizaciones**, la app consulta la API pública de GitHub para detectar versiones nuevas. Si hay conexión, ofrece descargar el instalador; si no, busca un instalador en `Descargas` o el `Escritorio`. Ningún dato médico se envía en esa consulta.

> El repositorio debe ser público para que la descarga por link funcione en otras PC sin cuenta de GitHub.

## Respaldo y restauración

Desde **Configuración** puedes:

- **Respaldar datos:** descarga un archivo JSON con tu información y adjuntos.
- **Restaurar datos:** carga un respaldo JSON previamente descargado.
- **Borrar toda la información:** elimina los datos locales de este navegador.

Se recomienda crear respaldos periódicos, especialmente antes de limpiar el navegador o cambiar de dispositivo.

El repo incluye [`db-template/respaldo-vacio.json`](db-template/respaldo-vacio.json): un respaldo **sin ningún dato** (todas las colecciones vacías) que puede cargarse desde **Restaurar datos** para dejar la app como si nunca se hubiera ingresado información. Es público y seguro de compartir; tu respaldo real jamás se sube a GitHub.

## Datos de ejemplo

En **Configuración → Cargar datos de ejemplo** puedes generar un historial ficticio para probar la aplicación. Esto reemplaza los datos actuales del navegador.

## Imprimir o guardar en PDF

1. Abre la sección **Informe / PDF** o usa el botón de imprimir de la barra superior.
2. Revisa las opciones del informe.
3. Elige **Imprimir / Guardar PDF**.
4. En el diálogo del navegador selecciona **Guardar como PDF**, tamaño de papel **A4** y márgenes normales.

El informe incluye perfil, alertas, monitoreo, historial clínico, vacunas, tratamientos, citas, directorio médico y documentos.

## Recordatorios

La aplicación puede avisar sobre:

- Tomas de medicamentos pendientes.
- Próximas citas médicas.

Para usar notificaciones del navegador:

1. Activa las notificaciones en **Configuración**.
2. Acepta el permiso cuando el navegador lo solicite.
3. Mantén la aplicación abierta para que se revisen los recordatorios.

## Recomendaciones y limitaciones

- Usa Chrome o Edge para la mejor compatibilidad con impresión y almacenamiento local.
- El modo incógnito o privado puede borrar los datos al cerrar el navegador.
- Los adjuntos grandes pueden ocupar bastante espacio local; revisa el uso de almacenamiento en **Configuración**.
- Esta aplicación es una ayuda personal de organización y no sustituye la atención médica profesional.

## Estructura del proyecto

```text
index.html
assets/
  css/styles.css
  js/core.js
  js/data.js
  js/forms.js
  js/views.js
  js/report.js
  js/app.js
  img/hero.svg
  img/favicon.svg
README.md
```
