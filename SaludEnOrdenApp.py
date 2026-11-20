import os, sys, socket, threading, time, tempfile, shutil, subprocess, json, re
from urllib.parse import urlparse, parse_qs

APP_NAME = "SaludEnOrden"
PORT = 8099

# En modo --windowed (pythonw) sys.stdout/sys.stderr son None, y http.server
# intenta escribir el log de cada peticion en sys.stderr -> AttributeError ->
# responde 0 bytes (ventana en blanco / ERR_EMPTY_RESPONSE).
if sys.stdout is None:
    sys.stdout = open(os.devnull, "w", encoding="utf-8")
if sys.stderr is None:
    sys.stderr = open(os.devnull, "w", encoding="utf-8")

def app_dir():
    if getattr(sys, "frozen", False):
        # PyInstaller 6.x onedir: los archivos web estan en _internal/
        meipass = getattr(sys, "_MEIPASS", None)
        if meipass and os.path.exists(os.path.join(meipass, "index.html")):
            return meipass
        exe_dir = os.path.dirname(sys.executable)
        if os.path.exists(os.path.join(exe_dir, "_internal", "index.html")):
            return os.path.join(exe_dir, "_internal")
        return exe_dir
    return os.path.dirname(os.path.abspath(__file__))

def log_dir():
    d = os.path.join(os.environ.get("APPDATA", os.path.expanduser("~")), APP_NAME)
    try:
        os.makedirs(d, exist_ok=True)
    except Exception:
        d = os.path.expanduser("~")
    return d

def log(msg):
    try:
        with open(os.path.join(log_dir(), "app.log"), "a", encoding="utf-8") as f:
            f.write(msg + "\n")
    except Exception:
        pass

def msgbox(text):
    try:
        import ctypes
        ctypes.windll.user32.MessageBoxW(0, text, APP_NAME, 0x10)
    except Exception:
        pass

def server_already_running():
    """Otra instancia de la app sirve ya en el puerto fijo."""
    try:
        with socket.create_connection(("127.0.0.1", PORT), timeout=1):
            return True
    except OSError:
        return False

def find_browser():
    candidates = []
    for base in (os.environ.get("ProgramFiles"), os.environ.get("ProgramFiles(x86)"), os.environ.get("LOCALAPPDATA")):
        if base:
            candidates.append(os.path.join(base, "Google", "Chrome", "Application", "chrome.exe"))
    for base in (os.environ.get("ProgramFiles(x86)"), os.environ.get("ProgramFiles")):
        if base:
            candidates.append(os.path.join(base, "Microsoft", "Edge", "Application", "msedge.exe"))
    for c in candidates:
        if c and os.path.exists(c):
            return c
    return None

def kill_orphan_browsers(profile):
    """Cierra Chrome/Edge previos que usan el perfil de SaludEnOrden
    (quedan huerfanos si el launcher se cerro a la fuerza)."""
    try:
        pat = profile.replace("'", "''")
        ps = ("Get-CimInstance Win32_Process -Filter \"Name='chrome.exe' or Name='msedge.exe'\" | "
              "Where-Object { $_.CommandLine -like '*%s*' } | "
              "ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }" % pat)
        subprocess.run(["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", ps],
                       capture_output=True, timeout=20, creationflags=0x08000000)
        log("navegadores huerfanos del perfil cerrados")
    except Exception as e:
        log("kill orphan err: %r" % e)

def main():
    try:
        lp = os.path.join(log_dir(), "app.log")
        if os.path.exists(lp):
            os.remove(lp)
    except Exception:
        pass

    log("root = " + app_dir())
    log("frozen = " + str(getattr(sys, "frozen", False)))

    root = app_dir()
    if not os.path.exists(os.path.join(root, "index.html")):
        msgbox("No se encontro index.html en:\n" + root + "\n\nLa instalacion puede estar danada. Reinstala SaludEnOrden.")
        return

    if server_already_running():
        log("puerto %d ocupado: otra instancia ya esta en ejecucion" % PORT)
        msgbox("SaludEnOrden ya esta abierto (o el puerto %d esta ocupado).\nSi no ves la ventana, reinicia el equipo e intenta de nuevo." % PORT)
        return

    # cerrar navegadores huerfanos de ejecuciones anteriores
    kill_orphan_browsers(os.path.join(log_dir(), "ChromeProfile"))

    try:
        os.chdir(root)
    except Exception as e:
        log("chdir FAILED: " + repr(e))
        msgbox("No se pudo acceder a la carpeta de la aplicacion:\n" + str(e))
        return

    # SemVer + BUILD: SaludEnOrden-vMAJOR.MINOR.PATCH.BUILD.exe
    INSTALLER_RE = re.compile(r"SaludEnOrden-v(\d+)\.(\d+)\.(\d+)\.(\d+)\.exe", re.IGNORECASE)

    def _ver_tuple(v):
        # Siempre 4 partes (MAJOR.MINOR.PATCH.BUILD) para comparar con seguridad
        try:
            parts = [int(x) for x in v.split(".")]
        except Exception:
            parts = []
        return tuple((parts + [0, 0, 0, 0])[:4])

    def scan_updates(current):
        folders = []
        for env in ("USERPROFILE", "PUBLIC"):
            base = os.environ.get(env)
            if base:
                folders.append(os.path.join(base, "Downloads"))
                folders.append(os.path.join(base, "Desktop"))
        try:
            folders.append(os.path.dirname(os.path.dirname(app_dir())))
        except Exception:
            pass
        best = None
        for folder in folders:
            if not folder or not os.path.isdir(folder):
                continue
            try:
                for fn in os.listdir(folder):
                    m = INSTALLER_RE.search(fn)
                    if not m:
                        continue
                    v = "%s.%s.%s.%s" % (m.group(1), m.group(2), m.group(3), m.group(4))
                    if _ver_tuple(v) <= _ver_tuple(current):
                        continue
                    full = os.path.join(folder, fn)
                    if not os.path.isfile(full):
                        continue
                    if best is None or _ver_tuple(v) > _ver_tuple(best[0]):
                        best = (v, full)
            except Exception as e:
                log("scan err %r" % e)
        if best:
            return {"available": True, "version": best[0], "path": best[1]}
        return {"available": False, "version": None, "path": None}

    from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

    class QuietHandler(SimpleHTTPRequestHandler):
        def do_GET(self):
            parsed = urlparse(self.path)
            if parsed.path.startswith("/__api/"):
                self._handle_api(parsed)
                return
            super().do_GET()

        def _send_json(self, obj, status=200):
            data = json.dumps(obj).encode("utf-8")
            self.send_response(status)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(data)))
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            try:
                self.wfile.write(data)
            except Exception:
                pass

        def _handle_api(self, parsed):
            if parsed.path == "/__api/check-updates":
                qs = parse_qs(parsed.query)
                current = (qs.get("current") or ["0.0.0.0"])[0]
                try:
                    res = scan_updates(current)
                except Exception as e:
                    log("check-updates err: %r" % e)
                    res = {"available": False, "error": str(e)}
                self._send_json(res)
            elif parsed.path == "/__api/launch-installer":
                qs = parse_qs(parsed.query)
                path = (qs.get("path") or [""])[0]
                ok = False
                msg = ""
                try:
                    if path and os.path.isfile(path) and INSTALLER_RE.search(os.path.basename(path)):
                        os.startfile(path)
                        ok = True
                    else:
                        msg = "invalid path"
                except Exception as e:
                    msg = str(e)
                    log("launch-installer err: %r" % e)
                self._send_json({"ok": ok, "error": msg}, 200 if ok else 400)
            else:
                self._send_json({"error": "not found"}, 404)

        def log_message(self, fmt, *args):
            pass  # no escribir a stderr (es None en modo windowed)

    try:
        httpd = ThreadingHTTPServer(("127.0.0.1", PORT), QuietHandler)
    except Exception as e:
        log("bind FAILED: " + repr(e))
        msgbox("No se pudo iniciar el servidor local:\n" + str(e))
        return
    t = threading.Thread(target=httpd.serve_forever, daemon=True)
    t.start()

    # self-test de CONTENIDO (no solo conexion)
    ok = False
    try:
        with socket.create_connection(("127.0.0.1", PORT), timeout=5) as s:
            s.sendall(b"GET /index.html HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n")
            data = b""
            while True:
                chunk = s.recv(8192)
                if not chunk:
                    break
                data += chunk
        ok = len(data) > 0
        log("self-test: received %d bytes" % len(data))
    except Exception as e:
        log("self-test FAILED: " + repr(e))
    if not ok:
        msgbox("El servidor interno no responde. Revisa el log en:\n" + os.path.join(log_dir(), "app.log"))
        httpd.shutdown()
        return

    url = "http://localhost:%d/index.html" % PORT
    icon_path = os.path.join(root, "assets", "img", "icon.ico")

    import webview
    import logging
    try:
        logging.basicConfig(
            filename=os.path.join(log_dir(), "app.log"),
            level=logging.INFO,
            format="%(asctime)s %(name)s %(levelname)s: %(message)s",
        )
    except Exception:
        pass

    state = {"loaded": False, "fallback_done": False}

    def on_loaded():
        state["loaded"] = True
        log("webview loaded")

    window = webview.create_window(
        APP_NAME,
        url,
        width=1280,
        height=820,
        min_size=(900, 600),
        text_select=True,
    )
    window.events.loaded += on_loaded
    try:
        if os.path.exists(icon_path):
            window.icon = icon_path
    except Exception:
        pass

    def close_blank_window():
        try:
            import ctypes
            hwnd = ctypes.windll.user32.FindWindowW(None, APP_NAME)
            log("hwnd=%s" % hwnd)
            if hwnd:
                ctypes.windll.user32.PostMessageW(hwnd, 0x0010, 0, 0)  # WM_CLOSE
        except Exception as e:
            log("wmclose err: %r" % e)

    def launch_fallback():
        """WebView2 fallo: abrir en Chrome/Edge en ventana propia (app mode)."""
        if state["fallback_done"]:
            return None
        state["fallback_done"] = True
        browser = find_browser()
        log("fallback browser = " + str(browser))
        if not browser:
            msgbox("No se encontro Chrome ni Edge. Instala uno de ellos para abrir SaludEnOrden.")
            return None
        # perfil persistente: los datos se conservan entre sesiones
        profile = os.path.join(log_dir(), "ChromeProfile")
        try:
            os.makedirs(profile, exist_ok=True)
        except Exception:
            profile = None
        # si el navegador sale inmediatamente (reattach a un proceso previo),
        # cerrar los huerfanos y reintentar una vez
        for attempt in (1, 2):
            if profile:
                kill_orphan_browsers(profile)
                time.sleep(1)
            args = [browser, "--app=%s" % url, "--window-size=1280,820",
                    "--no-first-run", "--no-default-browser-check"]
            if profile:
                args.append("--user-data-dir=%s" % profile)
            log("fallback intento %d: %r" % (attempt, args))
            try:
                proc = subprocess.Popen(args)
            except Exception as e:
                log("fallback launch FAILED: %r" % e)
                msgbox("No se pudo abrir el navegador:\n" + str(e))
                return None
            time.sleep(3)
            if proc.poll() is None:
                log("fallback ok pid=%s" % proc.pid)
                return proc
            log("navegador salio inmediatamente (intento %d, code=%s)" % (attempt, proc.returncode))
        msgbox("No se pudo abrir la ventana de la aplicacion.\nCierra Chrome y Edge por completo e intenta de nuevo.\n\nLog:\n" + os.path.join(log_dir(), "app.log"))
        return None

    def watchdog():
        # si en 8 s la ventana webview no cargo (fallo de WebView2), cerrarla;
        # el hilo principal hara el fallback al navegador.
        deadline = time.time() + 8
        while time.time() < deadline:
            if state["loaded"]:
                return
            time.sleep(0.5)
        if state["loaded"]:
            return
        log("webview no cargo en 8s (probable fallo de WebView2); cerrando ventana y usando navegador")
        close_blank_window()

    watchdog_t = threading.Thread(target=watchdog, daemon=True)
    watchdog_t.start()

    webview.start(private_mode=False)  # datos persistentes si WebView2 funciona
    log("webview window closed, loaded=%s" % state["loaded"])

    if not state["loaded"]:
        proc = launch_fallback()
        if proc:
            try:
                proc.wait()
            except Exception:
                pass

    httpd.shutdown()
    log("done")

if __name__ == "__main__":
    main()
