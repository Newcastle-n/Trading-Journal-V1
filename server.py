#!/usr/bin/env python3
"""Local server for Calm Trading Workspace."""

from __future__ import annotations

import atexit
import json
import os
import signal
import subprocess
import sys
import time
import webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent
DATA = ROOT / "data"
PID_FILE = ROOT / ".server.pid"
HOST = "127.0.0.1"
PORT = 8765

API_FILES = {
    "/api/journal": DATA / "journal.json",
    "/api/notes": DATA / "notes.json",
    "/api/booklet": DATA / "notes-booklet.json",
    "/api/settings": DATA / "settings.json",
    "/api/strategies": DATA / "strategies.json",
}


def read_json(path: Path):
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def write_json(path: Path, payload):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
        f.write("\n")


def normalize_iso_date(value: str) -> str | None:
    """Accept YYYY-MM-DD or YYYY-M-D and return zero-padded ISO date."""
    text = (value or "").strip()
    parts = text.split("-")
    if len(parts) != 3:
        return None
    try:
        year, month, day = (int(parts[0]), int(parts[1]), int(parts[2]))
        return f"{year:04d}-{month:02d}-{day:02d}"
    except ValueError:
        return None


def date_folder_candidates(iso_date: str) -> list[str]:
    """Folder name variants used on disk (padded and unpadded)."""
    normalized = normalize_iso_date(iso_date)
    if not normalized:
        return []
    year, month, day = normalized.split("-")
    return [
        normalized,
        f"{int(year)}-{int(month)}-{int(day)}",
        f"{int(year)}-{int(month):02d}-{int(day)}",
        f"{int(year)}-{int(month)}-{int(day):02d}",
    ]


def resolve_dated_media_folder(base: Path, iso_date: str) -> Path | None:
    if not base.exists():
        return None
    tried = set()
    for name in date_folder_candidates(iso_date):
        if name in tried:
            continue
        tried.add(name)
        folder = base / name
        if folder.is_dir():
            return folder
    # Fallback: scan once for matching normalized date
    target = normalize_iso_date(iso_date)
    if not target:
        return None
    for child in base.iterdir():
        if not child.is_dir() or child.name.startswith("#"):
            continue
        if normalize_iso_date(child.name) == target:
            return child
    return None


def list_media_dates(base: Path) -> dict:
    dates: list[str] = []
    folders: dict[str, str] = {}
    if not base.exists():
        return {"dates": dates, "folders": folders, "base": str(base), "ok": False}
    for child in sorted(base.iterdir(), key=lambda p: p.name):
        if not child.is_dir() or child.name.startswith("#"):
            continue
        iso = normalize_iso_date(child.name)
        if not iso:
            continue
        dates.append(iso)
        folders[iso] = child.name
    dates = sorted(set(dates))
    return {"dates": dates, "folders": folders, "base": str(base), "ok": True}


class Handler(SimpleHTTPRequestHandler):
    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        ".ttf": "font/ttf",
        ".otf": "font/otf",
        ".woff": "font/woff",
        ".woff2": "font/woff2",
    }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def _send_json(self, status: int, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _read_body(self):
        length = int(self.headers.get("Content-Length", 0))
        raw = self.rfile.read(length) if length else b"{}"
        return json.loads(raw.decode("utf-8") or "{}")

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path in API_FILES:
            path = API_FILES[parsed.path]
            if not path.exists():
                self._send_json(404, {"error": "not found"})
                return
            self._send_json(200, read_json(path))
            return
        if parsed.path == "/api/media-dates":
            try:
                settings = read_json(DATA / "settings.json")
                base = Path(str(settings.get("mediaBasePath") or "").strip())
                self._send_json(200, list_media_dates(base))
            except Exception as exc:  # noqa: BLE001
                self._send_json(500, {"error": str(exc)})
            return
        if parsed.path == "/":
            self.path = "/index.html"
        return SimpleHTTPRequestHandler.do_GET(self)

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path in API_FILES:
            try:
                payload = self._read_body()
                write_json(API_FILES[parsed.path], payload)
                self._send_json(200, payload)
            except Exception as exc:  # noqa: BLE001
                self._send_json(400, {"error": str(exc)})
            return

        if parsed.path == "/api/open-media":
            try:
                payload = self._read_body()
                # Prefer user-specified folder from journal entry
                explicit = str(
                    payload.get("mediaPath") or payload.get("path") or ""
                ).strip()
                date = str(payload.get("date") or "").strip()
                create_missing = bool(payload.get("createIfMissing", False))
                settings = read_json(DATA / "settings.json")
                base = (settings.get("mediaBasePath") or "").strip()

                if explicit:
                    folder = Path(explicit)
                    if not folder.exists():
                        if create_missing:
                            folder.mkdir(parents=True, exist_ok=True)
                        else:
                            self._send_json(
                                404,
                                {"error": f"پوشه پیدا نشد: {folder}"},
                            )
                            return
                elif base and date:
                    folder = resolve_dated_media_folder(Path(base), date)
                    if folder is None:
                        # Prefer existing unpadded/padded names; optionally create padded ISO.
                        if create_missing:
                            folder = Path(base) / (normalize_iso_date(date) or date)
                            folder.mkdir(parents=True, exist_ok=True)
                        else:
                            self._send_json(
                                404,
                                {
                                    "error": f"برای تاریخ {date} پوشه‌ای در مسیر رسانه‌ها پیدا نشد.",
                                },
                            )
                            return
                elif base:
                    folder = Path(base)
                    if not folder.exists():
                        self._send_json(404, {"error": f"مسیر پایه پیدا نشد: {folder}"})
                        return
                else:
                    self._send_json(
                        400,
                        {
                            "error": "مسیر پوشه مشخص نشده. در تنظیمات mediaBasePath را وارد کن.",
                        },
                    )
                    return

                if sys.platform.startswith("win"):
                    os.startfile(str(folder))  # type: ignore[attr-defined]
                else:
                    webbrowser.open(folder.as_uri())
                self._send_json(200, {"ok": True, "path": str(folder)})
            except Exception as exc:  # noqa: BLE001
                self._send_json(500, {"error": str(exc)})
            return

        self._send_json(404, {"error": "unknown endpoint"})

    def log_message(self, fmt, *args):
        sys.stderr.write("[%s] %s\n" % (self.log_date_time_string(), fmt % args))


class Server(ThreadingHTTPServer):
    # Windows + reuse=True lets multiple python.exe bind the same port (broken pages).
    allow_reuse_address = False
    daemon_threads = True


def _pids_on_port(port: int) -> list[int]:
    me = os.getpid()
    found: set[int] = set()
    if sys.platform.startswith("win"):
        try:
            out = subprocess.check_output(
                ["netstat", "-ano"],
                text=True,
                errors="ignore",
                creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
            )
        except (OSError, subprocess.CalledProcessError):
            return []
        needle = f":{port}"
        for line in out.splitlines():
            if "LISTENING" not in line or needle not in line:
                continue
            parts = line.split()
            if len(parts) < 5:
                continue
            local = parts[1]
            if not (local.endswith(needle) or local == f"0.0.0.0:{port}" or local == f"[::]:{port}"):
                continue
            try:
                pid = int(parts[-1])
            except ValueError:
                continue
            if pid > 0 and pid != me:
                found.add(pid)
    else:
        try:
            out = subprocess.check_output(
                ["lsof", "-ti", f"tcp:{port}"],
                text=True,
                errors="ignore",
            )
            for part in out.split():
                try:
                    pid = int(part)
                except ValueError:
                    continue
                if pid > 0 and pid != me:
                    found.add(pid)
        except (OSError, subprocess.CalledProcessError):
            pass
    return sorted(found)


def _kill_pid(pid: int) -> None:
    if sys.platform.startswith("win"):
        subprocess.run(
            ["taskkill", "/F", "/PID", str(pid), "/T"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
            check=False,
        )
    else:
        try:
            os.kill(pid, signal.SIGTERM)
        except OSError:
            pass


def free_port(port: int) -> None:
    """Stop any previous instance holding the port (and stale pid file)."""
    pids = set(_pids_on_port(port))
    if PID_FILE.exists():
        try:
            old = int(PID_FILE.read_text(encoding="utf-8").strip())
            if old > 0 and old != os.getpid():
                pids.add(old)
        except ValueError:
            pass
        try:
            PID_FILE.unlink(missing_ok=True)
        except OSError:
            pass

    if not pids:
        return

    print(f"Closing previous instance(s): {', '.join(map(str, sorted(pids)))}")
    for pid in sorted(pids):
        _kill_pid(pid)

    for _ in range(20):
        if not _pids_on_port(port):
            break
        time.sleep(0.1)


def write_pid() -> None:
    try:
        PID_FILE.write_text(str(os.getpid()), encoding="utf-8")
    except OSError:
        pass


def clear_pid() -> None:
    try:
        if PID_FILE.exists() and PID_FILE.read_text(encoding="utf-8").strip() == str(
            os.getpid()
        ):
            PID_FILE.unlink(missing_ok=True)
    except OSError:
        pass


def create_server() -> Server:
    free_port(PORT)
    try:
        return Server((HOST, PORT), Handler)
    except OSError:
        free_port(PORT)
        time.sleep(0.3)
        return Server((HOST, PORT), Handler)


def main():
    # Avoid Windows console crashes on Persian / special chars in logs.
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(encoding="utf-8", errors="replace")  # type: ignore[attr-defined]
        except Exception:
            pass

    os.chdir(ROOT)
    try:
        server = create_server()
    except OSError as exc:
        print(f"Could not bind {HOST}:{PORT}")
        print(f"Details: {exc}")
        raise SystemExit(1) from exc

    write_pid()
    atexit.register(clear_pid)
    atexit.register(server.server_close)

    url = f"http://{HOST}:{PORT}"
    print(f"Trading Workspace -> {url}")
    print("Close this window or press Ctrl+C to stop.")
    try:
        webbrowser.open(url)
    except Exception:
        pass

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
    finally:
        server.shutdown()
        server.server_close()
        clear_pid()


if __name__ == "__main__":
    main()
