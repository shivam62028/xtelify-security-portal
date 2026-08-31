# Xtelify Outlook Desktop Helper

Enables the **Share via Outlook** button to open **Microsoft Outlook Desktop** with the vulnerability Excel report automatically attached — no download, no manual attachment.

---

## Requirements

| Item | Details |
|---|---|
| OS | Windows 10 / 11 |
| Python | 3.9 or newer ([python.org](https://python.org)) |
| Outlook | **Classic Outlook** 2016, 2019, 2021, or Microsoft 365 Desktop |
| Network | Must be able to reach the Xtelify backend server (HTTPS) |

> **⚠ New Outlook for Windows** (the web-based replacement released 2024) does **not** support COM automation. If you see a "Class not registered" error, switch back to Classic Outlook in the Windows Settings.

---

## One-Click Setup (Recommended)

1. Copy this entire `outlook-helper/` folder to your **Windows PC**
2. Double-click **`install_and_run.bat`**
3. Wait for it to install dependencies (first run only, ~30 seconds)
4. **Keep the terminal window open** while using the portal

That's it. The portal will automatically detect the helper and enable the "Share via Outlook" button.

---

## Manual Setup

```bat
cd outlook-helper
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt
.venv\Scripts\python outlook_helper.py
```

---

## Auto-start with Windows (Optional)

To have the helper start automatically when you log in:

1. Press `Win + R`, type `shell:startup`, press Enter
2. Create a shortcut to `install_and_run.bat` in that folder
3. The helper will start in the background on every login

---

## How It Works

```
Portal (browser)
    │
    │ 1. POST /api/share/outlook
    │    (filters, recipient)
    ▼
Xtelify Backend (Airtel server)
    │
    │ Generates XLSX from current Export View filters
    │ Stores file with UUID token (15-min TTL)
    │ Returns: { token, png_token, subject, body, stats }
    │
    ▼
Portal (browser)
    │
    │ 2. POST http://127.0.0.1:7789/create-draft
    │    (token, recipient, subject, body)
    ▼
Outlook Helper (this process — your Windows PC)
    │
    │ Downloads XLSX from backend using token
    │ Saves to %TEMP%\xtelify_outlook\
    │ win32com → Outlook.Application.CreateItem(0)
    │ Sets .To / .Subject / .Body
    │ Attachments.Add(xlsx_path)
    │ .Display()  ← non-modal, Outlook opens immediately
    │
    ▼
Microsoft Outlook Desktop
    New draft, fully populated, XLSX attached — user clicks Send
```

---

## Troubleshooting

### "Outlook Helper is not running"
- Start the helper by running `install_and_run.bat`
- Confirm the terminal shows: `Running on http://127.0.0.1:7789`

### "Class not registered" / Outlook not found
- You are running New Outlook (web-based). Switch to Classic Outlook.
- Or: Outlook is not installed. Install Microsoft 365 Desktop.

### "Could not attach the Excel file"
- Outlook may be in **Protected View** / **Safe Mode**. Restart Outlook normally.
- Try running `install_and_run.bat` **as Administrator**.

### "Download token expired"
- The 15-minute token expired before the helper connected to the backend.
- Click "Share via Outlook" again to generate a fresh report.

### "Cannot reach backend"
- The helper downloads the file from the Xtelify server.
- Confirm your PC can access `https://<xtelify-server>/api/...` in a browser.

### Port 7789 already in use
Edit `outlook_helper.py` and change `PORT = 7789` to another port (e.g., `7790`).
The browser will still ping `7789` — update the health check URL in `App.tsx` if you change this.

---

## Security Notes

- The helper binds **only** to `127.0.0.1` — not accessible from any network
- It never accepts file paths from the browser — only short-lived tokens
- Temporary files in `%TEMP%\xtelify_outlook\` are deleted 5 minutes after Outlook opens
- Tokens are single-use with a 15-minute TTL
- MongoDB is never accessed by the helper

---

## Files

| File | Purpose |
|---|---|
| `outlook_helper.py` | The helper service (Flask + win32com) |
| `requirements.txt` | Python dependencies |
| `install_and_run.bat` | One-click Windows installer and launcher |
| `README.md` | This file |
