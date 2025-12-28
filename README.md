# SalesTrackerNEW (PWA)

A simple, offline-capable **Progressive Web App** to record:
- **Payments to company** (Date, Name, Type: Transfer/Cheque, Amount)
- **Accounts Receivables** (Invoice date, Customer, Invoice #, Amount, Comment)
- **Stock** with product dropdown and auto-filled **Price**; edit **Quantity**; per-item **Total Value** and **Grand Total**.

### Tech
- Pure HTML/CSS/JS
- **LocalStorage** for persistence (Option A)
- PWA manifest + service worker for offline and "Add to Home Screen" on iPhone

## How to host from Windows via GitHub Pages
1. Create a new repo `SalesTrackerNEW` on GitHub.
2. Upload ALL files from this folder.
3. In repo **Settings → Pages**: Source = `Deploy from a branch`; Branch = `main` (root).
4. After a minute, your site will be live at `https://<your-username>.github.io/SalesTrackerNEW/`.

## How to install on iPhone
1. Open Safari and navigate to your GitHub Pages URL.
2. When it loads, tap **Share** (square with arrow) → **Add to Home Screen** → **Add**.
3. You now have an app icon. Launch it from Home Screen.
4. Data is saved locally (LocalStorage) and works offline.

## CSV Export
Each tab has an **Export CSV** button. Downloads a `.csv` file with your data.

## Notes
- Currency format defaults to **NGN** (Nigeria).
- LocalStorage is browser-specific. To migrate, use CSV exports.
- For cloud sync or IndexedDB, I can upgrade the storage layer upon request.
