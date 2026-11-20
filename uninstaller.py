import os, sys, time, base64, shutil, subprocess, ctypes

APP_NAME = "SaludEnOrden"
UNINSTALL_KEY = r"Software\Microsoft\Windows\CurrentVersion\Uninstall\%s" % APP_NAME

MB_OK = 0
MB_OKCANCEL = 1
MB_YESNO = 4
MB_YESNOCANCEL = 3
MB_ICONINFORMATION = 0x40
MB_ICONQUESTION = 0x20
MB_ICONWARNING = 0x30
MB_ICONERROR = 0x10
IDOK = 1
IDCANCEL = 2
IDYES = 6
IDNO = 7


def dialog(text, title, flags=MB_OK):
    """Cuadro nativo de Windows. Sin dependencias externas."""
    try:
        return ctypes.windll.user32.MessageBoxW(0, text, title, flags)
    except Exception:
        return IDOK


def log(msg):
    try:
        d = os.path.join(os.environ.get("APPDATA", ""), APP_NAME)
        os.makedirs(d, exist_ok=True)
        with open(os.path.join(d, "uninstall.log"), "a", encoding="utf-8") as f:
            f.write(msg + "\n")
    except Exception:
        pass


def app_dir():
    if getattr(sys, "frozen", False):
        return os.path.dirname(sys.executable)
    return os.path.dirname(os.path.abspath(__file__))


def app_running():
    try:
        out = subprocess.run(
            ["tasklist", "/FI", "IMAGENAME eq SaludEnOrden.exe", "/FO", "CSV", "/NH"],
            capture_output=True, timeout=10,
        )
        return "SaludEnOrden.exe" in (out.stdout or b"").decode("utf-8", "ignore")
    except Exception:
        return False


def close_app():
    """Cerrar la app antes de borrar archivos para evitar bloqueos."""
    if not app_running():
        return True
    try:
        subprocess.run(["taskkill", "/IM", "SaludEnOrden.exe"],
                       capture_output=True, timeout=15)
    except Exception:
        pass
    for _ in range(10):
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


def _try_remove_file(path):
    try:
        if os.path.exists(path):
            os.remove(path)
            log("acceso eliminado: " + path)
    except Exception as e:
        log("no se pudo eliminar acceso " + path + ": " + str(e))


def remove_shortcuts():
    appdata = os.environ.get("APPDATA", "")
    desktop = os.path.join(os.path.expanduser("~"), "Desktop")
    public_desktop = os.path.join(os.environ.get("PUBLIC", "C:\\Users\\Public"), "Desktop")
    start = os.path.join(appdata, "Microsoft", "Windows", "Start Menu", "Programs")
    common_start = os.path.join(os.environ.get("ProgramData", "C:\\ProgramData"),
                               "Microsoft", "Windows", "Start Menu", "Programs")
    names = [APP_NAME + ".lnk", "Desinstalar " + APP_NAME + ".lnk"]
    for folder in (desktop, public_desktop, start, common_start):
        for name in names:
            _try_remove_file(os.path.join(folder, name))


def remove_registry():
    import winreg
    for hive, label in ((winreg.HKEY_CURRENT_USER, "HKCU"),
                        (winreg.HKEY_LOCAL_MACHINE, "HKLM")):
        try:
            winreg.DeleteKey(hive, UNINSTALL_KEY)
            log("registro eliminado: " + label)
        except FileNotFoundError:
            pass
        except Exception as e:
            log("registry err " + label + ": " + str(e))


def remove_health_data():
    """Solo se llama si el usuario solicito expresamente BORRAR sus datos.
    Nunca se ejecuta por defecto: los datos de salud se conservan siempre."""
    appdata = os.path.join(os.environ.get("APPDATA", ""), APP_NAME)
    candidates = [
        os.path.join(appdata, "ChromeProfile"),
        os.path.join(appdata, "EBWebView"),
        os.path.join(appdata, "WebView2"),
        # pywebview guarda aqui el perfil WebView2 real de la aplicacion.
        os.path.join(appdata, "pywebview", "EBWebView"),
        os.path.join(os.environ.get("TEMP", ""), "SaludEnOrdenProfile"),
    ]
    for p in candidates:
        try:
            if os.path.isdir(p):
                shutil.rmtree(p, ignore_errors=True)
                log("datos eliminados (solicitado): " + p)
        except Exception as e:
            log("no se pudieron eliminar datos " + p + ": " + str(e))


def perform_uninstall(target, delete_data=False, skip_registry=False):
    log("=== desinstalacion iniciada: " + target + " ===")
    close_app()

    if not skip_registry:
        remove_shortcuts()
        remove_registry()
    if delete_data:
        remove_health_data()
    else:
        log("datos personales conservados (opcion por defecto)")

    for item in os.listdir(target):
        p = os.path.join(target, item)
        if os.path.basename(sys.executable).lower() == item.lower():
            continue
        try:
            if os.path.isdir(p) and not os.path.islink(p):
                shutil.rmtree(p, ignore_errors=True)
            else:
                os.remove(p)
        except Exception as e:
            log("no se pudo borrar " + p + ": " + str(e))
    log("=== desinstalacion completada ===")

    # Borrar el propio EXE y la carpeta despues de cerrar este proceso.
    # Se usa PowerShell con comando codificado para soportar rutas con acentos.
    try:
        exe = sys.executable
        script = (
            "Start-Sleep -Seconds 3; "
            "Remove-Item -LiteralPath '%s' -Force -ErrorAction SilentlyContinue; "
            "Remove-Item -LiteralPath '%s' -Recurse -Force -ErrorAction SilentlyContinue"
        ) % (exe.replace("'", "''"), target.replace("'", "''"))
        encoded = base64.b64encode(script.encode("utf-16le")).decode("ascii")
        subprocess.Popen(
            ["powershell", "-NoProfile", "-WindowStyle", "Hidden", "-EncodedCommand", encoded],
            creationflags=0x08000000,
        )
    except Exception as e:
        log("no se pudo programar autoborrado: " + str(e))


def main():
    args = sys.argv[1:]
    silent = "--silent" in args
    skip_registry = "--test" in args
    target = None
    if "--dir" in args:
        i = args.index("--dir")
        if i + 1 < len(args):
            target = args[i + 1].strip()
    if not target:
        target = app_dir()
    delete_data = "--delete-data" in args

    if not silent:
        choice = dialog(
            "Se eliminara el programa y sus accesos directos de:\n%s\n\n"
            "Tus datos de salud NO se tocaran.\n\n"
            "¿Deseas borrar TAMBIEN tus datos personales? (NO recomendado)\n\n"
            "Si  = conservar mis datos (recomendado)\n"
            "No = borrar tambien mis datos de salud" % target,
            "Desinstalar " + APP_NAME,
            MB_YESNOCANCEL | MB_ICONQUESTION,
        )
        if choice == IDCANCEL:
            return 0
        delete_data = (choice == IDNO)
        if delete_data:
            confirm = dialog(
                "Esto borrara tus datos personales de salud del perfil.\n\n"
                "Esta accion NO se puede deshacer. ¿Estas SEGURO?",
                "Confirmacion importante", MB_YESNO | MB_ICONWARNING,
            )
            if confirm != IDYES:
                return 0

    try:
        perform_uninstall(target, delete_data=delete_data, skip_registry=skip_registry)
        if not silent:
            dialog(
                APP_NAME + " se desinstalo correctamente.\n\n"
                "Tus datos personales se conservaron en:\n"
                + os.path.join(os.environ.get("APPDATA", ""), APP_NAME),
                "Desinstalacion completada", MB_OK | MB_ICONINFORMATION,
            )
        return 0
    except Exception as e:
        log("ERROR: " + str(e))
        if not silent:
            dialog("No se pudo desinstalar:\n%s" % e, "Error", MB_ICONERROR)
        return 1


if __name__ == "__main__":
    sys.exit(main())
