import os, sys, time, zipfile, shutil, subprocess, tkinter as tk
from tkinter import ttk, filedialog, messagebox

APP_NAME = "SaludEnOrden"
BUNDLE = "app_bundle.zip"
UNINSTALL_KEY = r"Software\Microsoft\Windows\CurrentVersion\Uninstall\%s" % APP_NAME

def resource_path(rel):
    if getattr(sys, "frozen", False):
        return os.path.join(sys._MEIPASS, rel)
    return os.path.join(os.path.dirname(os.path.abspath(__file__)), rel)

def default_install_dir():
    base = os.environ.get("ProgramFiles") or os.path.expanduser("~")
    return os.path.join(base, APP_NAME)

def detect_install_dir():
    """Devuelve la carpeta de una instalacion existente (para actualizarla
    sin desinstalar) o None si no hay instalacion previa."""
    try:
        import winreg
        key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, UNINSTALL_KEY)
        try:
            loc, _ = winreg.QueryValueEx(key, "InstallLocation")
        finally:
            winreg.CloseKey(key)
        if loc and os.path.isdir(loc) and os.path.exists(os.path.join(loc, "SaludEnOrden.exe")):
            return loc
    except Exception:
        pass
    return None

def app_running():
    """True si SaludEnOrden.exe esta en ejecucion."""
    try:
        out = subprocess.run(
            ["tasklist", "/FI", "IMAGENAME eq SaludEnOrden.exe", "/FO", "CSV", "/NH"],
            capture_output=True, timeout=10,
        )
        # tasklist usa la codificacion OEM del sistema; decodificar con
        # 'ignore' evita errores con acentos (solo buscamos texto ASCII)
        text = (out.stdout or b"").decode("utf-8", "ignore")
        return "SaludEnOrden.exe" in text
    except Exception:
        return False

def close_running_app():
    try:
        subprocess.run(["taskkill", "/IM", "SaludEnOrden.exe", "/F"],
                       capture_output=True, timeout=15)
    except Exception:
        pass

def create_shortcut(target, shortcut_path, icon=None, workdir=None):
    if workdir is None:
        workdir = os.path.dirname(target)
    parts = [
        "$ws = New-Object -ComObject WScript.Shell;",
        "$sc = $ws.CreateShortcut('%s');" % shortcut_path.replace("'", "''"),
        "$sc.TargetPath = '%s';" % target.replace("'", "''"),
        "$sc.WorkingDirectory = '%s';" % workdir.replace("'", "''"),
    ]
    if icon:
        parts.append("$sc.IconLocation = '%s';" % icon.replace("'", "''"))
    parts.append("$sc.Save()")
    ps = " ".join(parts)
    try:
        subprocess.run(["powershell", "-NoProfile", "-Command", ps], check=True, capture_output=True)
        return True
    except Exception:
        return False

class Installer(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Instalar " + APP_NAME)
        self.geometry("520x360")
        self.resizable(False, False)
        self.existing = detect_install_dir()
        self.install_dir = tk.StringVar(value=self.existing or default_install_dir())
        self.desktop_sc = tk.BooleanVar(value=True)
        self.startmenu_sc = tk.BooleanVar(value=True)
        self.run_after = tk.BooleanVar(value=True)

        frm = ttk.Frame(self, padding=20)
        frm.pack(fill="both", expand=True)

        title_txt = "Actualizar " + APP_NAME if self.existing else "Instalar " + APP_NAME
        ttk.Label(frm, text=title_txt, font=("Segoe UI", 16, "bold")).pack(anchor="w")
        if self.existing:
            ttk.Label(
                frm,
                text="Se detectó una instalación existente en:\n" + self.existing +
                     "\nSe actualizará sin borrar tus datos.",
                foreground="#1a7a3a",
            ).pack(anchor="w", pady=(0, 12))
        else:
            ttk.Label(frm, text="Tu historial médico personal, privado y siempre a mano.", foreground="#555").pack(anchor="w", pady=(0,12))

        ttk.Label(frm, text="Carpeta de instalación:").pack(anchor="w")
        row = ttk.Frame(frm)
        row.pack(fill="x", pady=(2,10))
        ttk.Entry(row, textvariable=self.install_dir).pack(side="left", fill="x", expand=True)
        ttk.Button(row, text="Examinar...", command=self.browse).pack(side="left", padx=(6,0))

        ttk.Checkbutton(frm, text="Crear acceso directo en el Escritorio", variable=self.desktop_sc).pack(anchor="w")
        ttk.Checkbutton(frm, text="Crear acceso en el Menú Inicio", variable=self.startmenu_sc).pack(anchor="w")
        ttk.Checkbutton(frm, text="Ejecutar " + APP_NAME + " al terminar", variable=self.run_after).pack(anchor="w", pady=(0,12))

        self.status = ttk.Label(frm, text="Listo para instalar.", foreground="#555")
        self.status.pack(anchor="w", pady=(0,8))
        self.progress = ttk.Progressbar(frm, mode="determinate", maximum=100)
        self.progress.pack(fill="x", pady=(0,12))

        btns = ttk.Frame(frm)
        btns.pack(fill="x")
        ttk.Button(btns, text="Cancelar", command=self.destroy).pack(side="right")
        self.install_btn = ttk.Button(btns, text="Instalar", command=self.install)
        self.install_btn.pack(side="right", padx=(0,6))

    def browse(self):
        d = filedialog.askdirectory(initialdir=self.install_dir.get())
        if d:
            self.install_dir.set(d)

    def install(self):
        target = self.install_dir.get().strip()
        if not target:
            messagebox.showerror("Error", "Indica una carpeta de instalación.")
            return
        bundle = resource_path(BUNDLE)
        if not os.path.exists(bundle):
            messagebox.showerror("Error", "No se encontró el paquete de instalación (app_bundle.zip).")
            return
        if app_running():
            if messagebox.askyesno(
                APP_NAME + " está en ejecución",
                "La aplicación está abierta y no se puede actualizar mientras corre.\n\n"
                "¿Cerrarla ahora para continuar con la instalación?",
            ):
                close_running_app()
                time.sleep(2)
            if app_running():
                messagebox.showerror(
                    "Error",
                    "SaludEnOrden sigue en ejecución. Ciérrala manualmente y vuelve a intentar la instalación.",
                )
                return
        self.install_btn.config(state="disabled")
        self.progress["value"] = 0
        self.status.config(text="Instalando...")
        self.update_idletasks()
        import threading
        threading.Thread(target=self._do_install, args=(target, bundle), daemon=True).start()

    def _do_install(self, target, bundle):
        try:
            os.makedirs(target, exist_ok=True)
            with zipfile.ZipFile(bundle, 'r') as z:
                members = z.namelist()
                total = len(members) or 1
                for i, member in enumerate(members):
                    z.extract(member, target)
                    pct = int((i + 1) / total * 90)
                    self.after(0, lambda p=pct: self._set_progress(p, "Extrayendo archivos... %d%%" % p))
            self.after(0, lambda: self._set_progress(92, "Creando accesos directos..."))
            launcher = os.path.join(target, "SaludEnOrden.exe")
            uninstaller = os.path.join(target, "Desinstalar SaludEnOrden.exe")
            icon = os.path.join(target, "assets", "img", "icon.ico")
            if not os.path.exists(icon):
                icon = os.path.join(target, "_internal", "assets", "img", "icon.ico")
            if not os.path.exists(icon):
                icon = None
            if not os.path.exists(launcher):
                raise RuntimeError("La extracción no generó SaludEnOrden.exe en " + target)
            if self.desktop_sc.get():
                desk = os.path.join(os.path.expanduser("~"), "Desktop")
                create_shortcut(launcher, os.path.join(desk, APP_NAME + ".lnk"), icon, target)
            if self.startmenu_sc.get():
                sm = os.path.join(os.environ.get("APPDATA", ""), "Microsoft", "Windows", "Start Menu", "Programs")
                os.makedirs(sm, exist_ok=True)
                create_shortcut(launcher, os.path.join(sm, APP_NAME + ".lnk"), icon, target)
                if os.path.exists(uninstaller):
                    create_shortcut(uninstaller, os.path.join(sm, "Desinstalar " + APP_NAME + ".lnk"), icon, target)
            self.after(0, lambda: self._set_progress(96, "Registrando en Windows..."))
            try:
                import winreg
                key_path = r"Software\Microsoft\Windows\CurrentVersion\Uninstall\%s" % APP_NAME
                key = winreg.CreateKey(winreg.HKEY_CURRENT_USER, key_path)
                winreg.SetValueEx(key, "DisplayName", 0, winreg.REG_SZ, APP_NAME)
                winreg.SetValueEx(key, "DisplayIcon", 0, winreg.REG_SZ, icon if icon else launcher)
                winreg.SetValueEx(key, "UninstallString", 0, winreg.REG_SZ, '"' + uninstaller + '"')
                winreg.SetValueEx(key, "QuietUninstallString", 0, winreg.REG_SZ, '"' + uninstaller + '"')
                winreg.SetValueEx(key, "Publisher", 0, winreg.REG_SZ, "SaludEnOrden")
                winreg.SetValueEx(key, "InstallLocation", 0, winreg.REG_SZ, target)
                winreg.SetValueEx(key, "NoModify", 0, winreg.REG_DWORD, 1)
                winreg.SetValueEx(key, "NoRepair", 0, winreg.REG_DWORD, 1)
                winreg.CloseKey(key)
            except Exception:
                pass
            self.after(0, lambda: self._set_progress(100, "Instalación completada."))
            if self.run_after.get():
                # lanzar de-elevado: explorer arranca la app con los permisos
                # del usuario normal (evita heredar el UAC admin del instalador,
                # que rompe a Chrome/WebView2)
                try:
                    subprocess.Popen(["explorer.exe", launcher], cwd=target)
                except Exception:
                    subprocess.Popen([launcher], cwd=target)
            self.after(0, lambda: messagebox.showinfo("Instalación completada", APP_NAME + " se instaló en:\n" + target + "\n\nSi al abrirlo da error, revisa el log en:\n" + os.path.join(os.environ.get("APPDATA", ""), APP_NAME, "app.log")))
            self.after(0, self.destroy)
        except Exception as e:
            self.after(0, lambda: self._fail(str(e)))

    def _set_progress(self, value, text):
        self.progress["value"] = value
        self.status.config(text=text)
        self.update_idletasks()

    def _fail(self, msg):
        self.progress.stop()
        self.status.config(text="Error en la instalación.")
        self.install_btn.config(state="normal")
        messagebox.showerror("Error", msg)

if __name__ == "__main__":
    Installer().mainloop()
