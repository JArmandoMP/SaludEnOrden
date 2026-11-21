# Plantilla de datos vacía

`respaldo-vacio.json` sigue exactamente el formato que `HM.importBackup` espera en `assets/js/data.js`:

- `app: "vitalia"`, `version: 1`, `exportedAt`, `patient: null`
- `data` con las 9 tiendas vacías: `profile`, `vitals`, `records`, `treatments`, `doseLogs`, `appointments`, `providers`, `documents`, `settings`
- `files: []`

**Uso:** en SaludEnOrden entra a **Configuración → Restaurar datos** y selecciona este archivo. La app limpiará IndexedDB y dejará todas las colecciones vacías, como si nunca se hubiera ingresado información. No reemplaces tu respaldo real con este.

No contiene información personal: es seguro publicarlo en GitHub.
