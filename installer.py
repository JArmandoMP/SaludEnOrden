import os, sys, time, zipfile, ctypes, subprocess

APP_NAME = "SaludEnOrden"
APP_VERSION = "0.13.2.1"   # sincronizar con index.html (?v=) en cada subida de version
BUNDLE = "app_bundle.zip"
UNINSTALL_KEY = r"Software\Microsoft\Windows\CurrentVersion\Uninstall\%s" % APP_NAME
KNOWN_DIRS = (
    os.path.join(os.environ.get("ProgramFiles(x86)", "") or "C:\\Program Files (x86)", APP_NAME),
    os.path.join(os.environ.get("ProgramFiles", "") or "C:\\Program Files", APP_NAME),
)

MB_OK = 0
MB_OKCANCEL = 1
MB_ICONINFORMATION = 0x40
MB_ICONQUESTION = 0x20
MB_ICONERROR = 0x10
IDOK = 1
IDYES = 6


def dialog(text, title, flags=MB_OK):
    """Cuadro nativo de Windows. Sin dependencias externas (tkinter no siempre esta)."""
    try:
        return ctypes.windll.user32.MessageBoxW(0, text, title, flags)
    except Exception:
        return IDOK


def log(msg):
    try:
        d = os.path.join(os.environ.get("APPDATA", ""), APP_NAME)
        os.makedirs(d, exist_ok=True)
        with open(os.path.join(d, "install.log"), "a", encoding="utf-8") as f:
            f.write(msg + "\n")
    except Exception:
        pass


def resource_path(rel):
    if getattr(sys, "frozen", False):
        return os.path.join(sys._MEIPASS, rel)
    return os.path.join(os.path.dirname(os.path.abspath(__file__)), rel)


def default_install_dir():
    """Ubicacion estandar: C:\\Program Files (x86)\\SaludEnOrden."""
    base = (os.environ.get("ProgramFiles(x86)")
            or os.environ.get("ProgramFiles")
            or os.path.expanduser("~"))
    return os.path.join(base, APP_NAME)


def _is_installed(loc):
    return bool(loc) and os.path.isdir(loc) and os.path.exists(os.path.join(loc, "SaludEnOrden.exe"))


def detect_install_dir():
    """Detecta una instalacion previa para ACTUALIZARLA SIN DESINSTALAR."""
    import winreg
    found = []
    for hive in (winreg.HKEY_CURRENT_USER, winreg.HKEY_LOCAL_MACHINE):
        try:
            key = winreg.OpenKey(hive, UNINSTALL_KEY)
            try:
                loc, _ = winreg.QueryValueEx(key, "InstallLocation")
            finally:
                winreg.CloseKey(key)
            if _is_installed(loc):
                found.append(loc)
        except Exception:
            pass
    for d in KNOWN_DIRS:
        if _is_installed(d) and d not in found:
            found.append(d)
    for d in found:
        if "Program Files (x86)" in d:
            return d
    return found[0] if found else None


def app_running():
    try:
        out = subprocess.run(
            ["tasklist", "/FI", "IMAGENAME eq SaludEnOrden.exe", "/FO", "CSV", "/NH"],
            capture_output=True, timeout=10,
        )
        return "SaludEnOrden.exe" in (out.stdout or b"").decode("utf-8", "ignore")
    except Exception:
        return False


def close_running_app():
    """Cerrar primero con WM_CLOSE (da tiempo a guardar) y solo forzar si hace falta."""
    try:
        from ctypes import wintypes
        u = ctypes.windll.user32
        EnumWindows = u.EnumWindows
        EnumWindows.argtypes = [ctypes.WINFUNCTYPE(wintypes.BOOL, wintypes.HWND, wintypes.LPARAM), wintypes.LPARAM]
        GetWindowText = u.GetWindowTextW
        GetWindowText.argtypes = [wintypes.HWND, wintypes.LPWSTR, ctypes.c_int]
        target = []

        @ctypes.WINFUNCTYPE(wintypes.BOOL, wintypes.LPARAM)
        def cb(hwnd, _):
            buf = ctypes.create_unicode_buffer(256)
            GetWindowText(hwnd, buf, 256)
            if buf.value == APP_NAME:
                target.append(hwnd)
            return True

        EnumWindows(cb, 0)
        for hwnd in target:
            u.PostMessageW(hwnd, 0x0010, 0, 0)  # WM_CLOSE
    except Exception:
        pass
    for _ in range(12):
        if not app_running():
            return True
        time.sleep(0.5)
    try:
        subprocess.run(["taskkill", "/IM", "SaludEnOrden.exe", "/F"],
                       capture_output=True, timeout=15)
    except Exception:
        pass
    time.sleep(1)
    return not app_running()


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
    try:
        subprocess.run(["powershell", "-NoProfile", "-Command", " ".join(parts)],
                       check=True, capture_output=True)
        return True
    except Exception:
        return False


def perform_install(target, bundle, run_after=False):
    log("=== instalacion v%s en %s ===" % (APP_VERSION, target))
    if app_running():
        log("app en ejecucion: cerrando...")
        close_running_app()

    os.makedirs(target, exist_ok=True)
    with zipfile.ZipFile(bundle, "r") as z:
        members = z.namelist()
        for member in members:
            z.extract(member, target)
    log("extraidos %d archivos" % len(members))

    launcher = os.path.join(target, "SaludEnOrden.exe")
    uninstaller = os.path.join(target, "Desinstalar SaludEnOrden.exe")
    if not os.path.exists(launcher):
        raise RuntimeError("La extraccion no genero SaludEnOrden.exe")

    icon = os.path.join(target, "_internal", "assets", "img", "icon.ico")
    if not os.path.exists(icon):
        icon = None
    desk = os.path.join(os.path.expanduser("~"), "Desktop")
    create_shortcut(launcher, os.path.join(desk, APP_NAME + ".lnk"), icon, target)
    sm = os.path.join(os.environ.get("APPDATA", ""), "Microsoft", "Windows", "Start Menu", "Programs")
    os.makedirs(sm, exist_ok=True)
    create_shortcut(launcher, os.path.join(sm, APP_NAME + ".lnk"), icon, target)
    if os.path.exists(uninstaller):
        create_shortcut(uninstaller, os.path.join(sm, "Desinstalar " + APP_NAME + ".lnk"), icon, target)

    import winreg
    key = winreg.CreateKey(winreg.HKEY_CURRENT_USER, UNINSTALL_KEY)
    winreg.SetValueEx(key, "DisplayName", 0, winreg.REG_SZ, APP_NAME)
    winreg.SetValueEx(key, "DisplayVersion", 0, winreg.REG_SZ, APP_VERSION)
    winreg.SetValueEx(key, "DisplayIcon", 0, winreg.REG_SZ, icon if icon else launcher)
    winreg.SetValueEx(key, "UninstallString", 0, winreg.REG_SZ, '"' + uninstaller + '"')
    winreg.SetValueEx(key, "QuietUninstallString", 0, winreg.REG_SZ, '"' + uninstaller + '"')
    winreg.SetValueEx(key, "Publisher", 0, winreg.REG_SZ, "SaludEnOrden")
    winreg.SetValueEx(key, "InstallLocation", 0, winreg.REG_SZ, target)
    winreg.SetValueEx(key, "NoModify", 0, winreg.REG_DWORD, 1)
    winreg.SetValueEx(key, "NoRepair", 0, winreg.REG_DWORD, 1)
    winreg.CloseKey(key)
    log("registro actualizado. OK")

    if run_after:
        try:
            subprocess.Popen(["explorer.exe", launcher], cwd=target)
        except Exception:
            subprocess.Popen([launcher], cwd=target)
    return target


def main():
    args = sys.argv[1:]
    silent = "--silent" in args
    target = None
    if "--dir" in args:
        i = args.index("--dir")
        if i + 1 < len(args):
            target = args[i + 1].strip()
    run_after = "--run" in args

    existing = detect_install_dir()
    if not target:
        target = existing or default_install_dir()

    bundle = resource_path(BUNDLE)
    if not os.path.exists(bundle):
        dialog("No se encontro el paquete de instalacion (app_bundle.zip).", "Error", MB_ICONERROR)
        return 2

    if not silent:
        if existing:
            Text = ("Se detecto una instalacion existente en:\n%s\n\n"
                    "Se actualizara sin desinstalar ni borrar tus datos.\n\n"
                    "¿Continuar?" % existing)
        else:
            Text = ("Instalar %s v%s en:\n%s\n\n¿Continuar?" % (APP_NAME, APP_VERSION, target))
        if dialog(Text, "Instalar " + APP_NAME, MB_OKCANCEL | MB_ICONQUESTION) != IDOK:
            return 0

    try:
        perform_install(target, bundle, run_after=run_after)
        if not silent:
            dialog("%s v%s se instalo correctamente en:\n%s\n\nTus datos personales no se tocaron."
                   % (APP_NAME, APP_VERSION, target),
                   "Instalacion completada", MB_OK | MB_ICONINFORMATION)
        return 0
    except Exception as e:
        log("ERROR: " + str(e))
        if not silent:
            dialog("No se pudo instalar:\n%s" % e, "Error", MB_ICONERROR)
        return 1


if __name__ == "__main__":
    sys.exit(main())
