# 🧾 BillKaro PWA — Professional Billing System

**Version 2.0** | Offline-First | Made in India 🇮🇳

---

## ✨ Features

### 📱 PWA (Progressive Web App)
- Android app jaisi feel
- Offline mode — bina internet ke bill banao
- Home screen par install ho sake
- Service Worker se caching
- Push notifications ready

### 🗄️ IndexedDB Database
- localStorage nahi, IndexedDB use hota hai
- Data kabhi lose nahi hota
- Products, Customers, Bills, Settings, Users — sab safe
- Auto-backup system

### 🔐 Authentication
- Email + Password login
- Mobile OTP login
- Admin account
- Multi-user support (Admin / User / Viewer roles)
- Data encryption (AES-256-GCM)

### 🧾 Bill Management
- Bill edit, delete, duplicate
- Bill search
- Date wise filter
- Customer wise filter
- Status filter (Paid / Due)

### 📄 PDF / Print
- Professional A4 invoice
- Thermal / POS print (58mm / 80mm)
- Logo support
- QR code payment
- Bank details
- GST details
- Footer text
- Signature box
- 3 themes (Classic Blue, Elegant Dark, Minimal Green)

### 📊 Dashboard
- Aaj ki sales
- Monthly sales
- Due customers
- Sales chart (7-day bar chart)
- Top customers
- Top products

### 👥 Customer Features
- Custom rates per customer
- Due management
- Payment collection
- Customer ledger
- WhatsApp reminder

### 📦 Product Features
- Stock management
- Low stock alerts
- HSN code support
- Category support
- GST rates

### 💾 Backup
- Export full database (JSON)
- Import / restore
- Encrypted backup
- CSV export (Bills, Customers, Products)
- Auto-backup on every bill save

### 🔄 Cloud Sync
- Background sync (Service Worker)
- Offline queue — online hote hi sync
- Conflict resolution

---

## 📁 Folder Structure

```
billkaro-pwa/
├── index.html          ← Main app file
├── manifest.json       ← PWA manifest
├── sw.js               ← Service Worker
├── css/
│   └── style.css       ← Complete stylesheet
├── js/
│   ├── db.js           ← IndexedDB layer
│   ├── auth.js         ← Authentication module
│   ├── sync.js         ← Cloud sync & backup
│   ├── pdf.js          ← Invoice PDF generation
│   ├── dashboard.js    ← Dashboard & charts
│   ├── billing.js      ← Billing logic
│   └── app.js          ← Main app controller
├── icons/
│   ├── icon-72.png
│   ├── icon-96.png
│   ├── icon-128.png
│   ├── icon-144.png
│   ├── icon-152.png
│   ├── icon-192.png
│   ├── icon-384.png
│   └── icon-512.png
├── generate-icons.js   ← Icon generator script
└── README.md
```

---

## 🚀 Setup / Installation

### Option 1: Direct Browser
1. `index.html` file browser mein open karo
2. First time setup form fill karo
3. App use karo!

### Option 2: Local HTTPS Server (Recommended for PWA)
```bash
# Python se simple server
python3 -m http.server 8080

# Ya npx se
npx serve .

# Browser mein open karo:
# http://localhost:8080
```

### Option 3: Deploy on any static hosting
- GitHub Pages
- Netlify
- Vercel
- Any cPanel hosting

---

## 📲 Android par Install Karo

1. Chrome browser mein app open karo
2. Three-dot menu → "Add to Home Screen"
3. Ya banner automatically aayega → "Install" click karo
4. App install hogi bilkul native jaisi!

## 💻 Desktop par Install Karo

1. Chrome mein open karo
2. Address bar ke side mein install icon ⊕ dikhega
3. Click karo → Install!

---

## 🔧 Customization

### Cloud Sync Add Karna Hai?
`js/sync.js` mein `syncItem()` function mein apna backend API call add karo:
```javascript
async function syncItem(item) {
  await fetch('https://your-api.com/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify(item)
  });
}
```

### Google Drive Backup
Google Drive API integrate karo `syncItem()` function extend karke.

### Custom Logo
Settings → Theme → Logo Upload section mein apni logo image upload karo.

---

## 🛡️ Security

- Passwords SHA-256 hash hote hain (PBKDF2 + salt)
- Backup files AES-256-GCM se encrypt ho sakti hain
- Session management with btoa encoding
- No data sent to external servers (unless you add backend)

---

## 📞 Technology Stack

| Technology | Use |
|---|---|
| HTML5 | App structure |
| CSS3 | Responsive UI |
| Vanilla JavaScript | App logic |
| IndexedDB | Offline database |
| Service Worker | PWA + offline caching |
| Web Crypto API | Encryption |
| Web Share API | Native sharing |
| Canvas API | Charts |
| Print API | Invoice printing |

---

## ⚡ Performance

- First load: ~100KB (CSS + JS)
- Fonts: Google Fonts (cached after first load)
- Fully offline after first load
- IndexedDB handles thousands of records
- Canvas charts (no external chart library)

---

## 🐛 Troubleshooting

**Service Worker kaam nahi kar raha?**
- HTTPS ya localhost par serve karo
- Chrome DevTools → Application → Service Workers check karo

**Data save nahi ho raha?**
- Browser ka storage quota check karo (Settings → Site Settings)
- Private/Incognito mode mein IndexedDB limited hota hai

**Install button nahi dikh raha?**
- HTTPS mandatory hai PWA install ke liye
- Chrome ya Edge use karo

---

## 📄 License

MIT License — Free to use, modify, distribute.

---

**Made with ❤️ for Indian Businesses by BillKaro Team**
