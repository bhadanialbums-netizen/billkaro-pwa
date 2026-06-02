# BillKaro — Professional PWA Billing Software

## Folder Structure
```
billkaro/
├── index.html          ← Main app (open this)
├── manifest.json       ← PWA manifest
├── sw.js               ← Service Worker (offline support)
├── css/
│   └── style.css       ← All styles
├── js/
│   ├── db.js           ← IndexedDB database layer
│   ├── app.js          ← Main app logic
│   └── pdf.js          ← PDF generation
└── icons/              ← PWA icons (all sizes)
```

## Features
✅ PWA — Mobile par install hoga (Android app jaisa)
✅ Offline mode — Internet bina bhi kaam karta hai
✅ IndexedDB — Data kabhi lose nahi hoga
✅ Party-wise custom rates
✅ Old due carry-forward
✅ Professional PDF invoice (jsPDF)
✅ Logo + QR code on bill
✅ Bank details on bill
✅ 3 Bill themes + custom colors
✅ WhatsApp share
✅ Stock management with low stock alerts
✅ Customer ledger PDF
✅ Export/Import backup (JSON)
✅ Mobile responsive + bottom nav
✅ Dark mode support

## Local Use (Offline)
1. Saara folder download karo
2. `index.html` Chrome/Edge mein open karo
3. Settings mein dukaan info bharo
4. Install banner dikhe toh "Install Karo" dabao — phone par app ban jaayegi

## Vercel Deployment
1. GitHub par naya repo banao
2. Saara code push karo
3. vercel.com par login karo
4. "Import Git Repository" → apna repo select karo
5. Deploy! — `yourname.vercel.app` mil jaayega

## Technology
- Pure HTML + CSS + JavaScript
- IndexedDB (no localStorage)
- Service Worker (PWA/offline)
- jsPDF + jsPDF-AutoTable (PDF generation)
- Chart.js (dashboard charts)
- Tabler Icons

## Data Storage
Data IndexedDB mein save hota hai — browser ke andar.
**IMPORTANT:** Regular backup lena zaroori hai!
Settings → Backup → "Backup Download Karo"
