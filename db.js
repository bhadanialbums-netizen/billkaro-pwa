/* ============================================================
   BillKaro — IndexedDB Database Layer (db.js)
   All data stored in IndexedDB — never localStorage
   ============================================================ */

const DB_NAME = 'BillKaroDB';
const DB_VERSION = 1;
let db = null;

const STORES = {
  products:  { keyPath: 'id', indexes: ['name', 'category'] },
  customers: { keyPath: 'id', indexes: ['name', 'mobile'] },
  bills:     { keyPath: 'id', indexes: ['date', 'customerId', 'status'] },
  settings:  { keyPath: 'key' },
  categories:{ keyPath: 'id', indexes: ['name'] },
  payments:  { keyPath: 'id', indexes: ['customerId', 'billId', 'date'] },
  sync_queue:{ keyPath: 'id', indexes: ['status', 'createdAt'] }
};

/* ---- Open / Init DB ---- */
function openDB() {
  return new Promise((resolve, reject) => {
    if (db) return resolve(db);
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = e => {
      const d = e.target.result;
      Object.entries(STORES).forEach(([name, cfg]) => {
        if (!d.objectStoreNames.contains(name)) {
          const store = d.createObjectStore(name, { keyPath: cfg.keyPath });
          (cfg.indexes || []).forEach(idx => store.createIndex(idx, idx, { unique: false }));
        }
      });
    };

    req.onsuccess = e => { db = e.target.result; resolve(db); };
    req.onerror = e => reject(e.target.error);
  });
}

/* ---- Generic CRUD ---- */
const BKDb = {

  /* Get all records from a store */
  getAll: async (store) => {
    const d = await openDB();
    return new Promise((resolve, reject) => {
      const tx = d.transaction(store, 'readonly');
      const req = tx.objectStore(store).getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },

  /* Get single by key */
  get: async (store, key) => {
    const d = await openDB();
    return new Promise((resolve, reject) => {
      const tx = d.transaction(store, 'readonly');
      const req = tx.objectStore(store).get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },

  /* Put (insert or update) */
  put: async (store, data) => {
    const d = await openDB();
    return new Promise((resolve, reject) => {
      const tx = d.transaction(store, 'readwrite');
      const req = tx.objectStore(store).put(data);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },

  /* Delete by key */
  delete: async (store, key) => {
    const d = await openDB();
    return new Promise((resolve, reject) => {
      const tx = d.transaction(store, 'readwrite');
      const req = tx.objectStore(store).delete(key);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  },

  /* Get by index */
  getByIndex: async (store, indexName, value) => {
    const d = await openDB();
    return new Promise((resolve, reject) => {
      const tx = d.transaction(store, 'readonly');
      const idx = tx.objectStore(store).index(indexName);
      const req = idx.getAll(value);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },

  /* Clear entire store */
  clear: async (store) => {
    const d = await openDB();
    return new Promise((resolve, reject) => {
      const tx = d.transaction(store, 'readwrite');
      const req = tx.objectStore(store).clear();
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  },

  /* Get settings value */
  getSetting: async (key) => {
    const rec = await BKDb.get('settings', key);
    return rec ? rec.value : null;
  },

  /* Set settings value */
  setSetting: async (key, value) => {
    await BKDb.put('settings', { key, value, updatedAt: new Date().toISOString() });
  },

  /* Export entire DB as JSON */
  exportAll: async () => {
    const data = {};
    for (const store of Object.keys(STORES)) {
      data[store] = await BKDb.getAll(store);
    }
    data._exportedAt = new Date().toISOString();
    data._version = DB_VERSION;
    return data;
  },

  /* Import from JSON */
  importAll: async (data) => {
    for (const store of Object.keys(STORES)) {
      if (!data[store]) continue;
      await BKDb.clear(store);
      for (const rec of data[store]) {
        await BKDb.put(store, rec);
      }
    }
  },

  /* Seed default data if empty */
  seedDefaults: async () => {
    const prods = await BKDb.getAll('products');
    if (prods.length > 0) return;

    const defaultProducts = [
      { id: 'p1', name: 'Pen', rate: 10, gst: 0, unit: 'Pcs', hsn: '', stock: 200, category: 'Stationery', minStock: 20, barcode: '', createdAt: now() },
      { id: 'p2', name: 'Notebook', rate: 50, gst: 12, unit: 'Pcs', hsn: '', stock: 80, category: 'Stationery', minStock: 10, barcode: '', createdAt: now() },
      { id: 'p3', name: 'Stapler', rate: 90, gst: 18, unit: 'Pcs', hsn: '', stock: 25, category: 'Stationery', minStock: 5, barcode: '', createdAt: now() },
    ];
    const defaultCustomers = [
      { id: 'c1', name: 'Ram Kumar', mobile: '9876543210', address: '', gstin: '', due: 150, customRates: { p1: 9, p2: 45 }, createdAt: now() },
      { id: 'c2', name: 'Shyam Lal', mobile: '9812345678', address: '', gstin: '', due: 0, customRates: { p1: 8 }, createdAt: now() },
    ];

    for (const p of defaultProducts) await BKDb.put('products', p);
    for (const c of defaultCustomers) await BKDb.put('customers', c);

    await BKDb.setSetting('shop', { sn: 'BillKaro Store', tg: 'Quality Products', a1: 'Market Road', ct: 'Patna', st: 'Bihar', pn: '800001', mb: '9876543210', em: '', gs: '', bp: 'BK', ft: 'Thank you for your business!' });
    await BKDb.setSetting('bank', { hn: '', bn: '', an: '', if: '', br: '', at: 'Savings', ui: '', um: '' });
    await BKDb.setSetting('theme', { name: 'classic', color: '#2563eb' });
    await BKDb.setSetting('print', { lo: true, qr: true, bk: true, gs: true, ft: true, sg: false });
    await BKDb.setSetting('billSeq', 1);
  }
};

function now() { return new Date().toISOString(); }
function uid() { return Date.now().toString(36) + Math.random().toString(36).substr(2, 5); }
