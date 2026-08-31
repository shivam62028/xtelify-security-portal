#!/usr/bin/env python3
"""
Xtelify Outlook Desktop Helper  v1.1.0
=======================================
Runs ONLY on the user's local Windows PC.
Binds to 127.0.0.1:7789 — NOT accessible from the network.

Purpose
-------
Bridges the browser-sandboxed Xtelify Security Portal to the locally
installed Microsoft Outlook Desktop application.

The portal (running in a browser) cannot attach files to Outlook directly —
the browser sandbox prevents all access to COM automation, the filesystem,
and running processes.  This helper runs outside the browser sandbox and
uses Windows COM (pywin32) to control Outlook Desktop directly.

Flow
----
  1. User clicks "Share via Outlook" in the portal.
  2. Portal calls POST /api/share/outlook on the FastAPI backend.
     Backend generates the XLSX from the same filters as Export View,
     stores it with a secure UUID token (15-min TTL), returns the token.
  3. Portal calls POST http://127.0.0.1:7789/create-draft on this helper.
  4. Helper downloads the XLSX from the backend using the token.
  5. Helper uses win32com to:
       a. Dispatch("Outlook.Application")
       b. CreateItem(0)           — new MailItem
       c. Set .To / .Subject / .Body
       d. Attachments.Add(...)    — attach the XLSX (and optional PNG)
       e. .Display()              — show the draft to the user
  6. Outlook Desktop opens showing the fully prepared draft.
  7. User reviews and clicks Send.

Endpoints
---------
  GET  /health         — checks whether Outlook COM is available
  POST /create-draft   — creates Outlook draft with XLSX attachment

Security
--------
  • Binds only to 127.0.0.1  (loopback — no network exposure)
  • Never accepts arbitrary file paths from the browser
  • Only accepts tokens; downloads the actual file from the backend
  • Tokens are single-use with 15-min server-side TTL
  • Temp files stored in %TEMP%\\xtelify_outlook\\ and deleted after 5 min
  • CORS allows browser origin (required for browser → localhost fetch)
  • Does NOT expose MongoDB, FastAPI internals, or Outlook credentials

Supported Outlook versions
--------------------------
  • Classic Outlook for Windows 2016 / 2019 / 2021 / Microsoft 365 Desktop
  • NOTE: "New Outlook for Windows" (2024 web-based replacement) does NOT
    support COM automation — the helper detects this and reports it clearly.
"""

import os
import sys
import time
import logging
import tempfile
import threading
from pathlib import Path

# ── Third-party imports ──────────────────────────────────────────────────────
try:
    import requests
except ImportError:
    print(
        "ERROR: 'requests' is not installed.\n"
        "Run:  pip install -r requirements.txt",
        file=sys.stderr,
    )
    sys.exit(1)

try:
    from flask import Flask, request, jsonify
except ImportError:
    print(
        "ERROR: 'flask' is not installed.\n"
        "Run:  pip install -r requirements.txt",
        file=sys.stderr,
    )
    sys.exit(1)

# ── Configuration ────────────────────────────────────────────────────────────
HOST              = "127.0.0.1"   # LOOPBACK ONLY — never "0.0.0.0"
PORT              = 7789
TEMP_SUBDIR       = "xtelify_outlook"
CLEANUP_DELAY_SEC = 300           # delete temp files 5 min after .Display()
DOWNLOAD_TIMEOUT  = 90            # seconds

# ── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("xtelify-outlook-helper")

# ── Flask app ────────────────────────────────────────────────────────────────
app = Flask(__name__)


@app.after_request
def _add_cors(response):
    """
    Allow the browser (on any origin — the portal may be on HTTPS) to call
    this loopback helper.  Modern browsers (Chrome 66+, Firefox, Edge) permit
    http://127.0.0.1 requests from HTTPS pages because 127.0.0.1 is a
    "potentially trustworthy origin" per the W3C Secure Contexts spec.
    """
    response.headers["Access-Control-Allow-Origin"]  = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Accept"
    return response


# ── Outlook availability check ───────────────────────────────────────────────

def _check_outlook() -> dict:
    """
    Tries to dispatch Outlook.Application via COM.
    Returns a dict: {available, version, error}.
    """
    try:
        import win32com.client  # noqa: import-outside-toplevel

        ol = win32com.client.Dispatch("Outlook.Application")
        version = str(getattr(ol, "Version", "unknown"))

        # Test that MAPI is accessible (catches "New Outlook" shell stub)
        ol.GetNamespace("MAPI")

        return {"available": True, "version": version, "error": None}

    except ImportError:
        return {
            "available": False,
            "version":   None,
            "error":     "pywin32 not installed. Run: pip install pywin32",
        }
    except Exception as exc:
        err = str(exc)
        # "New Outlook" or Outlook not installed returns 0x80040154
        if "0x80040154" in err or "class not registered" in err.lower():
            return {
                "available": False,
                "version":   None,
                "error": (
                    "Microsoft Outlook Desktop is not installed on this PC, "
                    "or you are running the new web-based Outlook which does not "
                    "support COM automation.  Please install or switch to "
                    "Classic Outlook (2016/2019/2021/M365 Desktop) and restart "
                    "this helper."
                ),
            }
        return {"available": False, "version": None, "error": err}


# ── Endpoints ────────────────────────────────────────────────────────────────

@app.route("/health", methods=["GET", "OPTIONS"])
def health():
    if request.method == "OPTIONS":
        return jsonify({}), 200

    status = _check_outlook()
    return jsonify({
        "ok":               True,
        "helper_version":   "1.1.0",
        "outlook_available": status["available"],
        "outlook_version":  status["version"],
        "outlook_error":    status["error"],
    })


@app.route("/create-draft", methods=["POST", "OPTIONS"])
def create_draft():
    if request.method == "OPTIONS":
        return jsonify({}), 200

    # ── Parse JSON body ───────────────────────────────────────────────────────
    body = request.get_json(force=True, silent=True) or {}

    token       = (body.get("token") or "").strip()
    png_token   = (body.get("png_token") or "").strip() or None
    backend_url = (body.get("backend_url") or "").rstrip("/").strip()
    recipient   = (body.get("recipient") or "").strip()
    subject     = (body.get("subject") or "Vulnerability Report").strip()
    mail_body   = (body.get("body") or "").strip()
    xlsx_fname  = (body.get("xlsx_filename") or "Vulnerability_Report.xlsx").strip()
    png_fname   = (body.get("png_filename") or "Resolved_Unresolved_Graph.png").strip()

    # ── Validate required fields ──────────────────────────────────────────────
    if not token:
        return jsonify({"error": "Missing required field: token"}), 400
    if not backend_url or not backend_url.startswith(("http://", "https://")):
        return jsonify({"error": "Missing or invalid required field: backend_url"}), 400
    if not recipient or "@" not in recipient:
        return jsonify({"error": "Missing or invalid required field: recipient"}), 400

    # ── Prepare temp directory ────────────────────────────────────────────────
    tmp_dir = Path(tempfile.gettempdir()) / TEMP_SUBDIR
    try:
        tmp_dir.mkdir(parents=True, exist_ok=True)
    except OSError as exc:
        return jsonify({"error": f"Cannot create temp directory: {exc}"}), 500

    # Use a per-request prefix to avoid filename collisions
    prefix   = token[:8]
    xlsx_path = tmp_dir / f"{prefix}_{xlsx_fname}"
    png_path  = (tmp_dir / f"{prefix}_{png_fname}") if png_token else None

    # ── Download XLSX from backend ────────────────────────────────────────────
    xlsx_url = f"{backend_url}/api/share/download/{token}"
    log.info("Downloading XLSX: %s", xlsx_url)

    try:
        with requests.get(xlsx_url, timeout=DOWNLOAD_TIMEOUT, stream=True) as resp:
            if resp.status_code == 404:
                return jsonify({
                    "error": (
                        "Download token not found or has expired (15-min TTL). "
                        "Please click 'Share via Outlook' again to generate a fresh report."
                    )
                }), 404

            if resp.status_code != 200:
                return jsonify({
                    "error": (
                        f"Backend returned HTTP {resp.status_code} when downloading the Excel report. "
                        "Is the Xtelify server reachable from this PC?"
                    )
                }), 502

            with open(xlsx_path, "wb") as fh:
                for chunk in resp.iter_content(chunk_size=65_536):
                    fh.write(chunk)

    except requests.RequestException as exc:
        return jsonify({
            "error": (
                f"Cannot reach the Xtelify backend to download the Excel report: {exc}\n"
                f"Backend URL attempted: {xlsx_url}"
            )
        }), 502

    # ── Verify XLSX integrity ─────────────────────────────────────────────────
    if not xlsx_path.exists() or xlsx_path.stat().st_size == 0:
        return jsonify({
            "error": "Downloaded Excel file is empty. Please try again."
        }), 502

    log.info("XLSX saved: %s (%s bytes)", xlsx_path, f"{xlsx_path.stat().st_size:,}")

    # ── Download graph PNG (optional) ─────────────────────────────────────────
    if png_token and png_path:
        png_url = f"{backend_url}/api/share/download/{png_token}"
        log.info("Downloading graph PNG: %s", png_url)
        try:
            with requests.get(png_url, timeout=30, stream=True) as resp_png:
                if resp_png.status_code == 200:
                    with open(png_path, "wb") as fh:
                        for chunk in resp_png.iter_content(chunk_size=65_536):
                            fh.write(chunk)
                    if not png_path.exists() or png_path.stat().st_size == 0:
                        log.warning("Graph PNG is empty — skipping")
                        png_path = None
                    else:
                        log.info("Graph PNG saved: %s (%s bytes)", png_path, f"{png_path.stat().st_size:,}")
                else:
                    log.warning("Graph PNG download returned HTTP %s — skipping", resp_png.status_code)
                    png_path = None
        except requests.RequestException as exc:
            log.warning("Graph PNG download failed (%s) — continuing without graph", exc)
            png_path = None

    # ── Connect to Outlook via COM ────────────────────────────────────────────
    try:
        import win32com.client  # noqa
    except ImportError:
        return jsonify({
            "error": (
                "pywin32 is not installed in this helper's environment. "
                "Run:  pip install pywin32  in the outlook-helper folder."
            )
        }), 500

    log.info("Connecting to Outlook via COM...")
    try:
        outlook = win32com.client.Dispatch("Outlook.Application")
    except Exception as exc:
        err_str = str(exc)
        if "0x80040154" in err_str or "class not registered" in err_str.lower():
            return jsonify({
                "error": (
                    "Microsoft Outlook Desktop is not installed or not registered on this PC. "
                    "Install Classic Outlook (2016/2019/2021/M365 Desktop) and try again."
                )
            }), 500
        return jsonify({"error": f"Cannot connect to Outlook: {err_str}"}), 500

    # ── Create draft MailItem ─────────────────────────────────────────────────
    log.info("Creating Outlook MailItem draft...")
    try:
        mail = outlook.CreateItem(0)   # 0 = olMailItem
        mail.To      = recipient
        mail.Subject = subject
        mail.Body    = mail_body
    except Exception as exc:
        return jsonify({"error": f"Failed to create Outlook mail item: {exc}"}), 500

    # ── Attach XLSX ───────────────────────────────────────────────────────────
    log.info("Attaching XLSX: %s", xlsx_path)
    try:
        mail.Attachments.Add(str(xlsx_path))
    except Exception as exc:
        return jsonify({
            "error": (
                f"Could not attach the Excel file to the Outlook draft: {exc}. "
                "If Outlook is open in Protected Mode, try restarting Outlook normally."
            )
        }), 500

    # ── Attach graph PNG (optional) ───────────────────────────────────────────
    graph_attached = False
    if png_path and png_path.exists() and png_path.stat().st_size > 0:
        log.info("Attaching graph PNG: %s", png_path)
        try:
            mail.Attachments.Add(str(png_path))
            graph_attached = True
        except Exception as exc:
            log.warning("Could not attach graph PNG (non-fatal): %s", exc)

    # ── Validate attachment count ─────────────────────────────────────────────
    attach_count = mail.Attachments.Count
    log.info("Attachments on draft: %d", attach_count)

    if attach_count < 1:
        return jsonify({
            "error": (
                "The XLSX attachment failed — the Outlook draft has 0 attachments. "
                "This can happen if Outlook is running in Protected Mode or as a "
                "different Windows user.  Try running this helper as Administrator."
            )
        }), 500

    # ── Display draft — does NOT auto-send ───────────────────────────────────
    log.info("Displaying Outlook draft (non-modal)...")
    try:
        mail.Display(False)   # False = non-modal; Outlook window appears immediately
    except Exception as exc:
        return jsonify({"error": f"Could not display the Outlook draft: {exc}"}), 500

    log.info("✓ Outlook draft displayed — %d attachment(s)", attach_count)

    # ── Schedule temp file cleanup after 5 minutes ────────────────────────────
    def _cleanup():
        time.sleep(CLEANUP_DELAY_SEC)
        for p in filter(None, [xlsx_path, png_path]):
            try:
                if p.exists():
                    p.unlink()
                    log.debug("Cleaned up temp file: %s", p)
            except OSError:
                pass

    threading.Thread(target=_cleanup, daemon=True).start()

    return jsonify({
        "ok":               True,
        "attachment_count": attach_count,
        "graph_attached":   graph_attached,
        "message":          "Outlook draft displayed with XLSX attachment.",
    })


# ── Entry point ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    log.info("=" * 62)
    log.info("  Xtelify Outlook Desktop Helper  v1.1.0")
    log.info("=" * 62)
    log.info("  Binding to: http://%s:%d  (loopback only)", HOST, PORT)
    log.info("  Keep this window open while using Share via Outlook.")
    log.info("  Press Ctrl+C to stop.")
    log.info("")

    # Pre-check Outlook at startup
    status = _check_outlook()
    if status["available"]:
        log.info("  ✓ Outlook Desktop found  (v%s)", status["version"])
    else:
        log.warning("  ⚠ Outlook check: %s", status["error"])
        log.warning("  The helper will still start; draft creation may fail.")

    log.info("=" * 62)
    app.run(host=HOST, port=PORT, threaded=True, use_reloader=False)
