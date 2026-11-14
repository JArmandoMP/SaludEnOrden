import os, sys, shutil, subprocess, tkinter as tk
from tkinter import ttk, messagebox

APP_NAME = "SaludEnOrden"

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

def remove_shortcuts():
    # Desktop
    desk = os.path.join(os.path.expanduser("~"), "Desktop", APP_NAME + ".lnk")
    if os.path.exists(desk):
        try: os.remove(desk)
        except Exception: pass
    # Start Menu
    sm = os.path.join(os.environ.get("APPDATA", ""), "Microsoft", "Windows", "Start Menu", "Programs", APP_NAME + ".lnk")
    if os.path.exists(sm):
        try: os.remove(sm)
        except Exception: pass

def remove_registry():
    try:
        import winreg
        key_path = r"Software\Microsoft\Windows\CurrentVersion\Uninstall\%s" % APP_NAME
        try:
            winreg.DeleteKey(winreg.HKEY_CURRENT_USER, key_path)
        except FileNotFoundError:
            pass
    except Exception as e:
        log("registry err: " + str(e))

def remove_profile(keep):
    if keep:
        return
    prof = os.path.join(os.environ.get("APPDATA", ""), APP_NAME)
    if os.path.exists(prof):
        # don't delete the whole APPDATA\SaludEnOrden if it has logs; just remove profile subdir
        profdir = os.path.join(prof, "")  # keep logs
        # remove Chrome profile
        cprof = os.path.join(os.environ.get("TEMP", ""), "SaludEnOrdenProfile")
        if os.path.exists(cprof):
            try: shutil.rmtree(cprof, ignore_errors=True)
            except Exception: pass
        # remove launcher.log? keep for debugging; user can delete manually

class Uninstaller(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("Desinstalar " + APP_NAME)
        self.geometry("460x260")
        self.resizable(False, False)
        self.keep_data = tk.BooleanVar(value=True)

        frm = ttk.Frame(self, padding=20)
        frm.pack(fill="both", expand=True)
        ttk.Label(frm, text="Desinstalar " + APP_NAME, font=("Segoe UI", 16, "bold")).pack(anchor="w")
        ttk.Label(frm, text="Se eliminará el programa y sus accesos directos.", foreground="#555").pack(anchor="w", pady=(0,12))

        ttk.Checkbutton(frm, text="Conservar mis datos y configuración", variable=self.keep_data).pack(anchor="w", pady=(0,12))

        self.status = ttk.Label(frm, text="Listo.", foreground="#555")
        self.status.pack(anchor="w", pady=(0,8))

        btns = ttk.Frame(frm)
        btns.pack(fill="x")
        ttk.Button(btns, text="Cancelar", command=self.destroy).pack(side="right")
        ttk.Button(btns, text="Desinstalar", command=self.uninstall).pack(side="right", padx=(0,6))

    def uninstall(self):
        target = app_dir()
        self.status.config(text="Desinstalando...")
        self.update()
        try:
            remove_shortcuts()
            remove_registry()
            remove_profile(self.keep_data.get())
            # delete all files in target except this exe
            for item in os.listdir(target):
                p = os.path.join(target, item)
                if os.path.basename(sys.executable).lower() == item.lower():
                    continue
                try:
                    if os.path.isdir(p) and not os.path.islink(p):
                        shutil.rmtree(p, ignore_errors=True)
                    else:
                        os.remove(p)
                except Exception:
                    pass
            self.status.config(text="Desinstalación completada.")
            # schedule self-deletion via a helper bat
            try:
                bat = os.path.join(os.environ.get("TEMP", ""), "saludenorden_uninstall.bat")
                with open(bat, "w", encoding="utf-8") as f:
                    f.write("@echo off\n")
                    f.write("timeout /t 2 /nobreak >nul\n")
                    f.write('del /f /q "%s"\n' % sys.executable)
                    f.write('rmdir /s /q "%s" 2>nul\n' % target)
                    f.write('del /f /q "%s"\n' % bat)
                subprocess.Popen(["cmd", "/c", bat], creationflags=0x08000000)
            except Exception:
                pass
            messagebox.showinfo("Desinstalación completada", APP_NAME + " se desinstaló correctamente.")
            self.destroy()
        except Exception as e:
            self.status.config(text="Error.")
            messagebox.showerror("Error", str(e))

if __name__ == "__main__":
    Uninstaller().mainloop()
