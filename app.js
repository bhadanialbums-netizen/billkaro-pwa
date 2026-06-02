/* ============================================================
   BillKaro — Main Application Logic (app.js)
   Dashboard, Products, Customers, Bills, Settings, Dues
   ============================================================ */

/* =================== APP STATE =================== */
const App = {
  currentScreen: 'dashboard',
  billItems: [],
  currentCustId: null,
  partialDueNow: 0,
  billRowId: 0,
  charts: {},
  crRows: [],
  ecCrRows: [],
  installPrompt: null,
  isOnline: navigator.onLine
};

/* =================== INIT =================== */
async function initApp() {
  await BKDb.seedDefaults();
  registerSW();
  initPWA();
  initOnlineStatus();
  await renderDashboard();
  rprods();
  rcusts();
  updateSidebarShopName();
  document.getElementById('bdate').value = today();
  setupKeyboardShortcuts();
}

/* =================== SERVICE WORKER =================== */
function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').then(reg => {
      console.log('SW registered');
      navigator.serviceWorker.addEventListener('message', e => {
        if (e.data.type === 'SYNC_NOW') syncData();
      });
    }).catch(e => console.log('SW error:', e));
  }
}

/* =================== PWA INSTALL =================== */
function initPWA() {
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    App.installPrompt = e;
    const banner = document.getElementById('install-banner');
    if (banner) { banner.classList.add('show'); }
  });
  window.addEventListener('appinstalled', () => {
    document.getElementById('install-banner')?.classList.remove('show');
    toast('BillKaro install ho gaya! ✓', 'success');
  });
}

function installApp() {
  if (App.installPrompt) {
    App.installPrompt.prompt();
    App.installPrompt.userChoice.then(r => {
      App.installPrompt = null;
      document.getElementById('install-banner')?.classList.remove('show');
    });
  }
}

/* =================== ONLINE STATUS =================== */
function initOnlineStatus() {
  const bar = document.getElementById('offline-bar');
  const update = () => {
    App.isOnline = navigator.onLine;
    if (bar) bar.classList.toggle('show', !App.isOnline);
    if (App.isOnline) syncData();
  };
  window.addEventListener('online', update);
  window.addEventListener('offline', update);
  update();
}

async function syncData() {
  /* Placeholder for cloud sync — extend when backend added */
  console.log('Sync triggered (no backend connected)');
}

/* =================== NAVIGATION =================== */
const TITLES = {
  dashboard: ['Dashboard', 'Aaj ka overview'],
  billing:   ['Naya Bill', 'Customer select karo aur items add karo'],
  bills:     ['Bills', 'Sab bills ki list'],
  customers: ['Customers / Parties', 'Party-wise rates manage karo'],
  products:  ['Products', 'Default rates aur stock manage karo'],
  dues:      ['Due List', 'Pending collections'],
  settings:  ['Settings', 'Dukaan, bank, theme, logo']
};

function go(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('sc-' + name)?.classList.add('active');
  App.currentScreen = name;

  /* Desktop nav */
  document.querySelectorAll('.ni').forEach(el => {
    el.classList.toggle('active', el.dataset.screen === name);
  });
  /* Mobile nav */
  document.querySelectorAll('.bnav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.screen === name);
  });

  const t = TITLES[name] || [name, ''];
  document.getElementById('tt').textContent = t[0];
  document.getElementById('ts').textContent = t[1];

  closeSidebar();

  if (name === 'dashboard') renderDashboard();
  if (name === 'bills')     rbills();
  if (name === 'customers') rcusts();
  if (name === 'products')  rprods();
  if (name === 'dues')      rdues();
  if (name === 'billing')   initBilling();
  if (name === 'settings')  initSettings();
}

/* Mobile sidebar toggle */
function toggleSidebar() {
  document.querySelector('.sidebar').classList.toggle('open');
  document.querySelector('.sidebar-overlay').classList.toggle('show');
}
function closeSidebar() {
  document.querySelector('.sidebar').classList.remove('open');
  document.querySelector('.sidebar-overlay').classList.remove('show');
}

/* =================== KEYBOARD SHORTCUTS =================== */
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', e => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'n') { e.preventDefault(); go('billing'); }
      if (e.key === 'd') { e.preventDefault(); go('dashboard'); }
      if (e.key === 'b') { e.preventDefault(); go('bills'); }
    }
    if (e.key === 'Escape') {
      document.querySelectorAll('.mb.open').forEach(m => m.classList.remove('open'));
    }
  });
}

/* =================== DASHBOARD =================== */
async function renderDashboard() {
  const td = today();
  const allBills = await BKDb.getAll('bills');
  const customers = await BKDb.getAll('customers');

  const todayBills = allBills.filter(b => b.date === td);
  const thisMonth = allBills.filter(b => b.date?.startsWith(td.slice(0, 7)));
  const todayAmt = todayBills.reduce((s, b) => s + (b.total || 0), 0);
  const monthAmt = thisMonth.reduce((s, b) => s + (b.total || 0), 0);
  const totalDue = customers.reduce((s, c) => s + (c.due || 0), 0);
  const dueCount = customers.filter(c => (c.due || 0) > 0).length;

  /* Stats */
  document.getElementById('dash-stats').innerHTML = `
    <div class="sc">
      <div class="sc-icon" style="background:var(--accent-bg)"><i class="ti ti-currency-rupee" style="color:var(--accent);font-size:18px"></i></div>
      <div class="sl2">Aaj ka total</div>
      <div class="sv">₹${todayAmt.toLocaleString()}</div>
      <div style="font-size:11px;color:var(--text3);margin-top:2px">${todayBills.length} bills aaj</div>
    </div>
    <div class="sc">
      <div class="sc-icon" style="background:var(--accent-bg)"><i class="ti ti-calendar-month" style="color:var(--accent);font-size:18px"></i></div>
      <div class="sl2">Is mahine</div>
      <div class="sv">₹${monthAmt.toLocaleString()}</div>
      <div style="font-size:11px;color:var(--text3);margin-top:2px">${thisMonth.length} bills</div>
    </div>
    <div class="sc">
      <div class="sc-icon" style="background:var(--red-bg)"><i class="ti ti-alert-circle" style="color:var(--red-text);font-size:18px"></i></div>
      <div class="sl2">Total due</div>
      <div class="sv" style="color:var(--red)">₹${totalDue.toLocaleString()}</div>
      <div style="font-size:11px;color:var(--red-text);margin-top:2px">${dueCount} customers</div>
    </div>
    <div class="sc">
      <div class="sc-icon" style="background:var(--green-bg)"><i class="ti ti-users" style="color:var(--green-text);font-size:18px"></i></div>
      <div class="sl2">Customers</div>
      <div class="sv">${customers.length}</div>
      <div style="font-size:11px;color:var(--text3);margin-top:2px">parties registered</div>
    </div>`;

  /* Today's bills */
  const tb = document.getElementById('dash-tb');
  if (!todayBills.length) {
    tb.innerHTML = '<div class="empty-state" style="padding:20px 0"><i class="ti ti-receipt"></i><p>Aaj koi bill nahi</p></div>';
  } else {
    tb.innerHTML = [...todayBills].reverse().slice(0, 6).map(b => `
      <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:13px;cursor:pointer" onclick="openBillDetail('${b.id}')">
        <div><span style="color:var(--text3);font-family:'DM Mono',monospace;font-size:12px">${b.no}</span>
        <span style="margin-left:8px;font-weight:500">${b.cn || 'Guest'}</span></div>
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-family:'DM Mono',monospace">₹${b.total}</span>
          ${(b.nd || 0) > 0 ? `<span class="badge br">Baki ₹${b.nd}</span>` : `<span class="badge bg">Paid</span>`}
        </div>
      </div>`).join('');
  }

  /* Due list */
  const dl = document.getElementById('dash-dl');
  const dueCustomers = customers.filter(c => (c.due || 0) > 0).sort((a, b) => b.due - a.due);
  if (!dueCustomers.length) {
    dl.innerHTML = '<div class="empty-state" style="padding:20px 0"><i class="ti ti-circle-check"></i><p>Koi due nahi! 🎉</p></div>';
  } else {
    dl.innerHTML = dueCustomers.slice(0, 6).map(c => `
      <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:13px">
        <div><span style="font-weight:500">${c.name}</span>
        <span style="color:var(--text3);font-size:12px;margin-left:6px">${c.mobile || ''}</span></div>
        <div style="display:flex;align-items:center;gap:6px">
          <span style="font-family:'DM Mono',monospace;color:var(--red-text);font-weight:600">₹${c.due}</span>
          <button class="btn btn-xs btn-g" onclick="openCollect('${c.id}')">Collect</button>
        </div>
      </div>`).join('');
  }

  /* Sales chart */
  renderSalesChart(allBills);
  renderTopCustomers(allBills, customers);
}

function renderSalesChart(allBills) {
  const canvas = document.getElementById('sales-chart');
  if (!canvas) return;
  const labels = [], data = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const ds = d.toISOString().slice(0, 10);
    labels.push(ds.slice(5));
    data.push(allBills.filter(b => b.date === ds).reduce((s, b) => s + (b.total || 0), 0));
  }
  if (App.charts.sales) App.charts.sales.destroy();
  App.charts.sales = new Chart(canvas, {
    type: 'bar',
    data: { labels, datasets: [{ label: 'Sales', data, backgroundColor: 'rgba(37,99,235,0.7)', borderRadius: 6 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
  });
}

function renderTopCustomers(allBills, customers) {
  const el = document.getElementById('dash-top-custs');
  if (!el) return;
  const custTotals = {};
  allBills.forEach(b => { if (b.cid) custTotals[b.cid] = (custTotals[b.cid] || 0) + (b.total || 0); });
  const sorted = Object.entries(custTotals).sort((a, b) => b[1] - a[1]).slice(0, 5);
  el.innerHTML = sorted.length ? sorted.map(([cid, total]) => {
    const c = customers.find(x => x.id === cid);
    return `<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--border);font-size:13px">
      <span style="font-weight:500">${c?.name || 'Unknown'}</span>
      <span style="font-family:'DM Mono',monospace;color:var(--accent)">₹${total.toLocaleString()}</span>
    </div>`;
  }).join('') : '<div style="color:var(--text3);font-size:13px">Koi data nahi</div>';
}

/* =================== PRODUCTS =================== */
async function saveprod() {
  const n = document.getElementById('np-n').value.trim();
  const r = parseFloat(document.getElementById('np-r').value) || 0;
  if (!n || r <= 0) { smsg('pm-msg', 'Naam aur rate zaroori!', 'r'); return; }
  const all = await BKDb.getAll('products');
  if (all.find(p => p.name.toLowerCase() === n.toLowerCase())) { smsg('pm-msg', 'Yeh product already hai!', 'r'); return; }
  await BKDb.put('products', {
    id: 'p' + uid(), name: n, rate: r,
    gst: parseFloat(document.getElementById('np-g').value) || 0,
    unit: document.getElementById('np-u').value,
    hsn: document.getElementById('np-h').value.trim(),
    stock: parseFloat(document.getElementById('np-s').value) || 0,
    minStock: parseFloat(document.getElementById('np-ms').value) || 5,
    category: document.getElementById('np-cat').value.trim(),
    barcode: document.getElementById('np-bc').value.trim(),
    createdAt: now()
  });
  smsg('pm-msg', '✓ Product save ho gaya!', 'g');
  clrprod(); rprods(); toast('Product saved!', 'success');
}

function clrprod() {
  ['np-n', 'np-h', 'np-s', 'np-ms', 'np-cat', 'np-bc'].forEach(id => { const e = document.getElementById(id); if (e) e.value = ''; });
  document.getElementById('np-r').value = '';
  document.getElementById('np-g').value = '0';
  document.getElementById('np-u').value = 'Pcs';
}

async function rprods() {
  const q = (document.getElementById('psl')?.value || '').toLowerCase();
  const all = await BKDb.getAll('products');
  const rows = all.filter(p => !q || p.name.toLowerCase().includes(q) || (p.category || '').toLowerCase().includes(q));
  const tbody = document.getElementById('pbody');
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:30px"><div class="empty-state"><i class="ti ti-box"></i><p>Koi product nahi</p></div></td></tr>';
    return;
  }
  tbody.innerHTML = rows.map(p => {
    const low = p.stock <= (p.minStock || 5) && p.stock > 0;
    const out = p.stock === 0;
    return `<tr>
      <td><span style="font-weight:500">${p.name}</span>${p.category ? `<div style="font-size:11px;color:var(--text3)">${p.category}</div>` : ''}</td>
      <td><span style="font-family:'DM Mono',monospace;font-weight:600">₹${p.rate}</span></td>
      <td><span class="badge bx">${p.gst}%</span></td>
      <td>${p.unit}</td>
      <td>
        <span class="${out ? 'low-stock' : low ? 'low-stock' : 'good-stock'}">${p.stock}</span>
        ${low && !out ? '<span class="badge ba" style="font-size:10px;margin-left:4px">Low</span>' : ''}
        ${out ? '<span class="badge br" style="font-size:10px;margin-left:4px">Out</span>' : ''}
      </td>
      <td>${p.barcode ? `<span style="font-family:'DM Mono',monospace;font-size:11px">${p.barcode}</span>` : '—'}</td>
      <td>
        <div style="display:flex;gap:4px">
          <button class="btn btn-g btn-sm btn-ic" onclick="oeprod('${p.id}')" title="Edit"><i class="ti ti-pencil"></i></button>
          <button class="btn btn-d btn-sm btn-ic" onclick="delprod('${p.id}')" title="Delete"><i class="ti ti-trash"></i></button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

async function delprod(id) {
  if (!confirm('Delete karein?')) return;
  await BKDb.delete('products', id);
  rprods(); toast('Product deleted');
}

async function oeprod(id) {
  const p = await BKDb.get('products', id);
  if (!p) return;
  document.getElementById('ep-id').value = id;
  document.getElementById('ep-n').value = p.name;
  document.getElementById('ep-r').value = p.rate;
  document.getElementById('ep-g').value = p.gst;
  document.getElementById('ep-u').value = p.unit;
  document.getElementById('ep-s').value = p.stock;
  document.getElementById('ep-ms').value = p.minStock || 5;
  document.getElementById('ep-cat').value = p.category || '';
  document.getElementById('ep-bc').value = p.barcode || '';
  om('m-eprod');
}

async function updprod() {
  const id = document.getElementById('ep-id').value;
  const p = await BKDb.get('products', id);
  if (!p) return;
  p.name = document.getElementById('ep-n').value.trim();
  p.rate = parseFloat(document.getElementById('ep-r').value) || 0;
  p.gst = parseFloat(document.getElementById('ep-g').value) || 0;
  p.unit = document.getElementById('ep-u').value;
  p.stock = parseFloat(document.getElementById('ep-s').value) || 0;
  p.minStock = parseFloat(document.getElementById('ep-ms').value) || 5;
  p.category = document.getElementById('ep-cat').value.trim();
  p.barcode = document.getElementById('ep-bc').value.trim();
  p.updatedAt = now();
  await BKDb.put('products', p);
  cm('m-eprod'); rprods(); toast('Product updated!', 'success');
}

/* =================== CUSTOMERS =================== */
async function savecust() {
  const n = document.getElementById('nc-n').value.trim();
  if (!n) { smsg('cm-msg', 'Naam zaroori!', 'r'); return; }
  const cr = {};
  App.crRows.forEach(r => { if (r.pid && r.rate !== '') cr[r.pid] = parseFloat(r.rate); });
  await BKDb.put('customers', {
    id: 'c' + uid(), name: n,
    mobile: document.getElementById('nc-m').value.trim(),
    address: document.getElementById('nc-a').value.trim(),
    gstin: document.getElementById('nc-g').value.trim(),
    due: parseFloat(document.getElementById('nc-d').value) || 0,
    customRates: cr, createdAt: now()
  });
  smsg('cm-msg', '✓ Customer save ho gaya!', 'g');
  clrcust(); rcusts(); toast('Customer saved!', 'success');
}

function clrcust() {
  ['nc-n', 'nc-m', 'nc-a', 'nc-g', 'nc-d'].forEach(id => { const e = document.getElementById(id); if (e) e.value = ''; });
  App.crRows = []; rcrl();
}

async function rcusts() {
  const q = (document.getElementById('csl')?.value || '').toLowerCase();
  const all = await BKDb.getAll('customers');
  const rows = all.filter(c => !q || c.name.toLowerCase().includes(q) || (c.mobile || '').includes(q));
  const tbody = document.getElementById('cbody');
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:30px"><div class="empty-state"><i class="ti ti-users"></i><p>Koi customer nahi</p></div></td></tr>';
    return;
  }
  tbody.innerHTML = rows.map(c => {
    const crCount = Object.keys(c.customRates || {}).length;
    return `<tr>
      <td><span style="font-weight:500">${c.name}</span>${c.address ? `<div style="font-size:11px;color:var(--text3)">${c.address}</div>` : ''}</td>
      <td>${c.mobile || '—'}</td>
      <td>${crCount > 0 ? `<span class="badge ba">${crCount} custom rates</span>` : '<span style="color:var(--text3)">Default</span>'}</td>
      <td>${(c.due || 0) > 0 ? `<span class="badge br">₹${c.due}</span>` : '<span class="badge bg">Clear</span>'}</td>
      <td>
        <div style="display:flex;gap:4px">
          <button class="btn btn-g btn-sm btn-ic" onclick="oecust('${c.id}')" title="Edit"><i class="ti ti-pencil"></i></button>
          <button class="btn btn-g btn-sm btn-ic" onclick="openLedger('${c.id}')" title="Ledger"><i class="ti ti-book"></i></button>
          <button class="btn btn-d btn-sm btn-ic" onclick="delcust('${c.id}')" title="Delete"><i class="ti ti-trash"></i></button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

async function delcust(id) {
  if (!confirm('Delete karein?')) return;
  await BKDb.delete('customers', id);
  rcusts(); toast('Customer deleted');
}

async function oecust(id) {
  const c = await BKDb.get('customers', id);
  if (!c) return;
  document.getElementById('ec-id').value = id;
  document.getElementById('ec-n').value = c.name;
  document.getElementById('ec-m').value = c.mobile || '';
  document.getElementById('ec-a').value = c.address || '';
  document.getElementById('ec-g').value = c.gstin || '';
  App.ecCrRows = Object.entries(c.customRates || {}).map(([pid, rate]) => ({ id: uid(), pid, rate }));
  rcrl('ec-crl', App.ecCrRows);
  om('m-ecust');
}

async function updcust() {
  const id = document.getElementById('ec-id').value;
  const c = await BKDb.get('customers', id);
  if (!c) return;
  c.name = document.getElementById('ec-n').value.trim();
  c.mobile = document.getElementById('ec-m').value.trim();
  c.address = document.getElementById('ec-a').value.trim();
  c.gstin = document.getElementById('ec-g').value.trim();
  const cr = {};
  App.ecCrRows.forEach(r => { if (r.pid && r.rate !== '') cr[r.pid] = parseFloat(r.rate); });
  c.customRates = cr; c.updatedAt = now();
  await BKDb.put('customers', c);
  cm('m-ecust'); rcusts(); toast('Customer updated!', 'success');
}

/* Custom rate rows */
async function rcrl(lid = 'crl', rows = App.crRows) {
  const el = document.getElementById(lid);
  if (!el) return;
  const prods = await BKDb.getAll('products');
  el.innerHTML = rows.map(r => {
    const opts = prods.map(p => `<option value="${p.id}" ${r.pid === p.id ? 'selected' : ''}>${p.name} (₹${p.rate})</option>`).join('');
    return `<div class="crrow">
      <select onchange="upcr('${lid}',this,'p','${r.id}')" style="flex:2"><option value="">-- Product --</option>${opts}</select>
      <input type="number" placeholder="Rate ₹" value="${r.rate}" min="0" step="0.5"
        oninput="upcr('${lid}',this,'r','${r.id}')" style="flex:1;max-width:100px;font-family:'DM Mono',monospace">
      <button class="btn btn-d btn-sm btn-ic" onclick="rmcr('${lid}','${r.id}')"><i class="ti ti-x"></i></button>
    </div>`;
  }).join('');
}

function acrrow(lid = 'crl', rows = App.crRows) {
  rows.push({ id: uid(), pid: '', rate: '' });
  rcrl(lid, rows);
}
function upcr(lid, el, f, rid) {
  const rows = lid === 'crl' ? App.crRows : App.ecCrRows;
  const r = rows.find(x => x.id === rid);
  if (r) r[f === 'p' ? 'pid' : 'rate'] = el.value;
}
function rmcr(lid, rid) {
  if (lid === 'crl') App.crRows = App.crRows.filter(r => r.id !== rid);
  else App.ecCrRows = App.ecCrRows.filter(r => r.id !== rid);
  rcrl(lid, lid === 'crl' ? App.crRows : App.ecCrRows);
}
function aecrow() { acrrow('ec-crl', App.ecCrRows); }

/* =================== BILLING =================== */
function initBilling() {
  const d = document.getElementById('bdate');
  if (d && !d.value) d.value = today();
  if (!App.billItems.length) addrow();
}

async function csearch(v) {
  const q = v.trim().toLowerCase();
  const drop = document.getElementById('cdrop');
  if (!q) { drop.style.display = 'none'; clearcs(); return; }
  const all = await BKDb.getAll('customers');
  const m = all.filter(c => c.name.toLowerCase().includes(q) || (c.mobile || '').includes(q)).slice(0, 8);
  if (!m.length) { drop.style.display = 'none'; clearcs(); return; }
  drop.innerHTML = m.map(c => {
    const d2 = (c.due || 0) > 0 ? `<span class="badge br" style="font-size:10px">₹${c.due}</span>` : '';
    const cr = Object.keys(c.customRates || {}).length;
    const cb = cr > 0 ? `<span class="badge ba" style="font-size:10px">${cr} rates</span>` : '';
    return `<div class="aco" onclick="selc('${c.id}')">
      <div><span style="font-weight:500">${c.name}</span> <span style="font-size:11px;color:var(--text3)">${c.mobile || ''}</span></div>
      <div style="display:flex;gap:4px">${d2}${cb}</div>
    </div>`;
  }).join('');
  drop.style.display = 'block';
}

function hdrop() { const d = document.getElementById('cdrop'); if (d) d.style.display = 'none'; }

async function selc(id) {
  const c = await BKDb.get('customers', id);
  if (!c) return;
  App.currentCustId = id;
  document.getElementById('bc-search').value = c.name + (c.mobile ? ' — ' + c.mobile : '');
  hdrop();
  document.getElementById('cfd').style.display = 'block';
  document.getElementById('cf-n').textContent = c.name;
  document.getElementById('cf-m').textContent = c.mobile || '';
  const cr = Object.keys(c.customRates || {}).length;
  document.getElementById('cf-rb').innerHTML = cr > 0
    ? `<span class="badge ba"><i class="ti ti-star" style="font-size:10px"></i> ${cr} custom rates</span>`
    : '<span class="badge bx">Default rates</span>';
  if ((c.due || 0) > 0) {
    document.getElementById('cf-db').innerHTML = `<span class="badge br">Baki ₹${c.due}</span>`;
    document.getElementById('dueb').style.display = 'block';
    document.getElementById('due-at').textContent = '₹' + c.due;
  } else {
    document.getElementById('cf-db').innerHTML = '<span class="badge bg">Due clear</span>';
    document.getElementById('dueb').style.display = 'none';
  }
  App.partialDueNow = 0;
  document.getElementById('p-now').value = '';
  await rafr(); calcb();
}

function clearcs() {
  App.currentCustId = null;
  document.getElementById('cfd').style.display = 'none';
  document.getElementById('dueb').style.display = 'none';
  App.partialDueNow = 0;
  rafr(); calcb();
}

async function cfull() {
  const c = await BKDb.get('customers', App.currentCustId);
  if (!c) return;
  document.getElementById('p-now').value = Math.max(0, (c.due || 0) - App.partialDueNow);
  calcb();
}

async function gr(pid) {
  const p = await BKDb.get('products', pid);
  if (!p) return { rate: 0, ic: false, gst: 0 };
  if (App.currentCustId) {
    const c = await BKDb.get('customers', App.currentCustId);
    if (c?.customRates?.[pid] !== undefined) return { rate: c.customRates[pid], ic: true, gst: p.gst };
  }
  return { rate: p.rate, ic: false, gst: p.gst };
}

async function addrow() {
  const id = 'r' + App.billRowId++;
  App.billItems.push({ id, pid: '', rate: 0, qty: 1, gst: 0, ic: false });
  await rbrows();
}

async function rbrows() {
  const prods = await BKDb.getAll('products');
  const tbody = document.getElementById('bitems');
  tbody.innerHTML = '';
  App.billItems.forEach(it => {
    const opts = prods.map(p => `<option value="${p.id}" ${it.pid === p.id ? 'selected' : ''}>${p.name}</option>`).join('');
    const tag = it.pid ? (it.ic ? `<span class="rp rp-c">Party</span>` : `<span class="rp rp-d">Default</span>`) : '';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><select onchange="oprod('${it.id}',this.value)" style="min-width:130px"><option value="">-- Select --</option>${opts}</select></td>
      <td><div style="display:flex;align-items:center;gap:4px">
        <input type="number" value="${it.rate}" min="0" step="0.5" oninput="orate('${it.id}',this.value)" style="width:76px;font-family:'DM Mono',monospace">
        ${tag}
      </div></td>
      <td><input type="number" value="${it.qty}" min="1" oninput="oqty('${it.id}',this.value)" style="width:58px;font-family:'DM Mono',monospace"></td>
      <td style="font-family:'DM Mono',monospace;font-weight:500">₹${(it.rate * it.qty).toFixed(0)}</td>
      <td><span class="badge bx">${it.gst}%</span></td>
      <td><button class="btn btn-d btn-sm btn-ic" onclick="rmrow('${it.id}')"><i class="ti ti-x"></i></button></td>`;
    tbody.appendChild(tr);
  });
  calcb();
}

async function oprod(id, pid) {
  const it = App.billItems.find(x => x.id === id);
  if (!it) return;
  it.pid = pid;
  if (pid) { const r = await gr(pid); it.rate = r.rate; it.ic = r.ic; it.gst = r.gst; }
  else { it.rate = 0; it.ic = false; it.gst = 0; }
  await rbrows();
}
function orate(id, v) { const it = App.billItems.find(x => x.id === id); if (it) { it.rate = parseFloat(v) || 0; calcb(); } }
function oqty(id, v) { const it = App.billItems.find(x => x.id === id); if (it) { it.qty = parseInt(v) || 1; calcb(); } }
function rmrow(id) { App.billItems = App.billItems.filter(x => x.id !== id); rbrows(); }

async function rafr() {
  for (const it of App.billItems) {
    if (it.pid) { const r = await gr(it.pid); it.rate = r.rate; it.ic = r.ic; it.gst = r.gst; }
  }
  await rbrows();
}

async function calcb() {
  const sub = App.billItems.reduce((s, i) => s + (i.rate * i.qty), 0);
  const gst = App.billItems.reduce((s, i) => s + (i.rate * i.qty * i.gst / 100), 0);
  const pn = parseFloat(document.getElementById('p-now')?.value) || 0;
  App.partialDueNow = pn;
  const c = App.currentCustId ? await BKDb.get('customers', App.currentCustId) : null;
  const od = (c?.due) || 0;
  const cd = Math.max(0, od - pn);
  const tot = sub + gst + cd;
  const pi = parseFloat(document.getElementById('pamt')?.value) || 0;
  const nd = Math.max(0, tot - pi);

  document.getElementById('s-sub').textContent = '₹' + sub.toFixed(0);
  const gstr = document.getElementById('s-gstr');
  if (gst > 0) { gstr.style.display = 'flex'; document.getElementById('s-gst').textContent = '+₹' + gst.toFixed(0); }
  else gstr.style.display = 'none';
  const crr = document.getElementById('s-crr');
  if (cd > 0) { crr.style.display = 'flex'; document.getElementById('s-cr').textContent = '+₹' + cd.toFixed(0); }
  else crr.style.display = 'none';
  const prr = document.getElementById('s-prr');
  if (pn > 0 && od > 0) { prr.style.display = 'flex'; document.getElementById('s-pr').textContent = '-₹' + Math.min(pn, od).toFixed(0); }
  else prr.style.display = 'none';
  document.getElementById('s-tot').textContent = '₹' + tot.toFixed(0);
  const pdr = document.getElementById('s-pdr'), ndr = document.getElementById('s-ndr');
  if (pi > 0) {
    pdr.style.display = 'flex'; document.getElementById('s-pd').textContent = '-₹' + pi.toFixed(0);
    ndr.style.display = 'flex'; document.getElementById('s-nd').textContent = '₹' + nd.toFixed(0);
  } else {
    pdr.style.display = 'none';
    ndr.style.display = tot > 0 ? 'flex' : 'none';
    document.getElementById('s-nd').textContent = '₹' + tot.toFixed(0);
  }
}

async function savebill() {
  const sub = App.billItems.reduce((s, i) => s + (i.rate * i.qty), 0);
  const gst = App.billItems.reduce((s, i) => s + (i.rate * i.qty * i.gst / 100), 0);
  if (!App.billItems.filter(i => i.pid).length) { toast('Item add karo!'); return; }
  const c = App.currentCustId ? await BKDb.get('customers', App.currentCustId) : null;
  const od = (c?.due) || 0;
  const cd = Math.max(0, od - App.partialDueNow);
  const total = parseFloat((sub + gst + cd).toFixed(2));
  const pi = parseFloat(document.getElementById('pamt')?.value) || 0;
  const paid = Math.min(pi, total);
  const nd = Math.max(0, total - paid);
  const date = document.getElementById('bdate').value || today();
  const shop = await BKDb.getSetting('shop') || {};
  const pfx = shop.bp || 'BK';
  let seq = (await BKDb.getSetting('billSeq')) || 1;

  const prods = await BKDb.getAll('products');
  const bill = {
    id: 'b' + uid(),
    no: pfx + String(seq++).padStart(4, '0'),
    date, cid: App.currentCustId,
    cn: c?.name || (document.getElementById('bc-search')?.value || 'Guest'),
    cm2: c?.mobile || '', ca: c?.address || '', cg: c?.gstin || '',
    items: App.billItems.filter(i => i.pid).map(i => ({
      pid: i.pid, pn: prods.find(p => p.id === i.pid)?.name || '',
      rate: i.rate, qty: i.qty, gst: i.gst, ic: i.ic, amt: i.rate * i.qty
    })),
    sub: parseFloat(sub.toFixed(2)), gst: parseFloat(gst.toFixed(2)),
    cd, total, paid, pm: document.getElementById('pmode')?.value || 'Cash',
    nd, note: document.getElementById('bnote')?.value || '',
    createdAt: now(), status: nd > 0 ? 'partial' : 'paid'
  };

  await BKDb.put('bills', bill);
  await BKDb.setSetting('billSeq', seq);

  /* Update stock */
  for (const it of bill.items) {
    const p = await BKDb.get('products', it.pid);
    if (p && p.stock > 0) { p.stock = Math.max(0, p.stock - it.qty); await BKDb.put('products', p); }
  }
  /* Update customer due */
  if (c) { c.due = parseFloat(nd.toFixed(2)); await BKDb.put('customers', c); }

  await BKDb.setSetting('lastBill', bill);
  toast('✓ Bill ' + bill.no + ' saved!', 'success');
  resetb();

  /* Ask to print */
  if (confirm('Bill save ho gaya! Print/PDF karna hai?')) {
    await BKPdf.saveBill(bill);
  }
}

function resetb() {
  App.currentCustId = null; App.partialDueNow = 0;
  App.billItems = []; App.billRowId = 0;
  ['bc-search', 'pamt', 'bnote', 'p-now'].forEach(id => {
    const e = document.getElementById(id); if (e) e.value = '';
  });
  document.getElementById('cfd').style.display = 'none';
  document.getElementById('dueb').style.display = 'none';
  initBilling(); calcb();
}

/* =================== BILLS LIST =================== */
async function rbills() {
  const q = (document.getElementById('bsq')?.value || '').toLowerCase();
  const f = document.getElementById('bsf')?.value || '';
  const df = document.getElementById('bdf')?.value || '';
  const dt = document.getElementById('bdt')?.value || '';
  let rows = await BKDb.getAll('bills');
  rows.sort((a, b) => b.date.localeCompare(a.date));
  if (q) rows = rows.filter(b => b.no.toLowerCase().includes(q) || (b.cn || '').toLowerCase().includes(q));
  if (f === 'due') rows = rows.filter(b => (b.nd || 0) > 0);
  if (f === 'paid') rows = rows.filter(b => !((b.nd || 0) > 0));
  if (df) rows = rows.filter(b => b.date >= df);
  if (dt) rows = rows.filter(b => b.date <= dt);

  const tbody = document.getElementById('bbody');
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:30px"><div class="empty-state"><i class="ti ti-receipt"></i><p>Koi bill nahi mila</p></div></td></tr>';
    return;
  }
  tbody.innerHTML = rows.map(b => `
    <tr>
      <td><span style="font-weight:600;font-family:'DM Mono',monospace;color:var(--accent);cursor:pointer" onclick="openBillDetail('${b.id}')">${b.no}</span></td>
      <td>${b.date}</td>
      <td><span style="font-weight:500">${b.cn || 'Guest'}</span></td>
      <td style="font-family:'DM Mono',monospace">₹${b.total}</td>
      <td style="font-family:'DM Mono',monospace;color:var(--green-text)">₹${b.paid}</td>
      <td style="font-family:'DM Mono',monospace;color:${(b.nd || 0) > 0 ? 'var(--red-text)' : 'var(--text3)'}">₹${b.nd || 0}</td>
      <td>${(b.nd || 0) > 0 ? `<span class="badge ba">Baki</span>` : `<span class="badge bg">Paid</span>`}</td>
      <td>
        <div style="display:flex;gap:4px">
          <button class="btn btn-g btn-sm btn-ic" onclick="openBillDetail('${b.id}')" title="View"><i class="ti ti-eye"></i></button>
          <button class="btn btn-g btn-sm btn-ic" onclick="pdfBill('${b.id}')" title="PDF"><i class="ti ti-file-pdf"></i></button>
          <button class="btn btn-g btn-sm btn-ic" onclick="waBill('${b.id}')" title="WhatsApp"><i class="ti ti-brand-whatsapp"></i></button>
          <button class="btn btn-d btn-sm btn-ic" onclick="delBill('${b.id}')" title="Delete"><i class="ti ti-trash"></i></button>
        </div>
      </td>
    </tr>`).join('');
}

async function pdfBill(id) {
  const b = await BKDb.get('bills', id);
  if (b) await BKPdf.saveBill(b);
}

async function waBill(id) {
  const b = await BKDb.get('bills', id);
  if (b) await BKPdf.shareBillWhatsApp(b);
}

async function delBill(id) {
  if (!confirm('Delete karein?')) return;
  await BKDb.delete('bills', id);
  rbills(); toast('Bill deleted');
}

let vbid = null;
async function openBillDetail(id) {
  const b = await BKDb.get('bills', id);
  if (!b) return;
  vbid = id;
  const shop = await BKDb.getSetting('shop') || {};
  const bank = await BKDb.getSetting('bank') || {};
  const theme = await BKDb.getSetting('theme') || {};
  const print = await BKDb.getSetting('print') || {};
  const logo = await BKDb.getSetting('logo');
  const qrImg = await BKDb.getSetting('qr');
  const col = theme.color || '#2563eb';

  const logoHtml = print.lo && logo ? `<img src="${logo}" style="height:45px;max-width:120px;object-fit:contain" alt="logo">` : '';
  const qrHtml = print.qr && qrImg ? `<div style="text-align:center"><img src="${qrImg}" style="width:70px;height:70px;object-fit:contain"><div style="font-size:10px;color:#666;margin-top:2px">Scan to pay</div></div>` : '';
  const bankHtml = print.bk && (bank.an || bank.ui) ? `<div style="margin-top:8px;padding:8px;background:#f8f9fa;border-radius:6px;font-size:12px"><div style="font-weight:600;margin-bottom:3px;color:${col}">Payment Details</div>${bank.an ? `<div>Bank: ${bank.bn || ''} | A/C: ${bank.an} | IFSC: ${bank.if || ''}</div>` : ''}${bank.ui ? `<div>UPI: ${bank.ui}</div>` : ''}</div>` : '';
  const footerHtml = print.ft && shop.ft ? `<div style="margin-top:10px;font-size:11px;color:#888;text-align:center;border-top:1px solid #eee;padding-top:8px">${shop.ft}</div>` : '';
  const signHtml = print.sg ? `<div style="margin-top:18px;text-align:right;font-size:12px;color:#666"><div style="border-top:1px solid #999;display:inline-block;min-width:110px;padding-top:4px">Authorized Signature</div></div>` : '';

  document.getElementById('bill-dc').innerHTML = `
    <div style="border-bottom:3px solid ${col};padding-bottom:12px;margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start">
        <div style="display:flex;align-items:center;gap:10px">
          ${logoHtml}
          <div>
            <div style="font-size:15px;font-weight:700;color:${col}">${shop.sn || 'BillKaro'}</div>
            ${shop.tg ? `<div style="font-size:11px;color:#888">${shop.tg}</div>` : ''}
            <div style="font-size:11px;color:#666">${shop.a1 || ''}${shop.ct ? ', ' + shop.ct : ''}${shop.st ? ', ' + shop.st : ''}</div>
            ${shop.mb ? `<div style="font-size:11px;color:#666">Ph: ${shop.mb}</div>` : ''}
            ${print.gs && shop.gs ? `<div style="font-size:11px;color:#666">GSTIN: ${shop.gs}</div>` : ''}
          </div>
        </div>
        <div style="text-align:right">
          <div style="font-size:18px;font-weight:700;color:${col}">TAX INVOICE</div>
          <div style="font-size:13px;font-weight:600">${b.no}</div>
          <div style="font-size:12px;color:#888">${b.date}</div>
        </div>
      </div>
    </div>
    <div style="display:flex;justify-content:space-between;margin-bottom:12px;font-size:12px;gap:8px">
      <div style="background:#f8f9fa;padding:8px 12px;border-radius:6px;flex:1">
        <div style="font-weight:600;color:${col};margin-bottom:3px">Bill To:</div>
        <div style="font-weight:600">${b.cn || 'Guest'}</div>
        ${b.cm2 ? `<div>${b.cm2}</div>` : ''}${b.ca ? `<div>${b.ca}</div>` : ''}
        ${b.cg ? `<div>GSTIN: ${b.cg}</div>` : ''}
      </div>
      <div style="background:#f8f9fa;padding:8px 12px;border-radius:6px;min-width:120px;text-align:right">
        <div style="font-weight:600;color:${col};margin-bottom:3px">Payment:</div>
        <div>${b.pm}</div>
        ${(b.nd || 0) > 0 ? `<div style="color:#dc2626;font-weight:600">Due: ₹${b.nd}</div>` : `<div style="color:#16a34a;font-weight:600">✓ Paid</div>`}
      </div>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:12.5px;margin-bottom:10px">
      <thead><tr style="background:${col};color:#fff">
        <th style="padding:7px 8px;text-align:left">#</th>
        <th style="padding:7px 8px;text-align:left">Item</th>
        <th style="padding:7px 8px;text-align:right">Rate</th>
        <th style="padding:7px 8px;text-align:center">Qty</th>
        <th style="padding:7px 8px;text-align:center">GST</th>
        <th style="padding:7px 8px;text-align:right">Amount</th>
      </tr></thead>
      <tbody>${b.items.map((it, i) => `
        <tr style="background:${i % 2 === 0 ? '#fff' : '#f9fafb'}">
          <td style="padding:6px 8px;border-bottom:1px solid #eee">${i + 1}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #eee">${it.pn}${it.ic ? ' <span style="font-size:9px;background:#fffbeb;color:#b45309;padding:1px 5px;border-radius:10px">Party</span>' : ''}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right">₹${it.rate}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:center">${it.qty}</td>
          <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:center">${it.gst}%</td>
          <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right;font-weight:600">₹${it.amt.toFixed(0)}</td>
        </tr>`).join('')}
      </tbody>
    </table>
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
      <div style="flex:1">${bankHtml}${qrHtml ? `<div style="margin-top:10px">${qrHtml}</div>` : ''}</div>
      <div style="min-width:190px">
        <table style="width:100%;font-size:12.5px">
          <tr><td style="padding:4px 6px;color:#666">Subtotal</td><td style="padding:4px 6px;text-align:right">₹${b.sub}</td></tr>
          ${b.gst > 0 ? `<tr><td style="padding:4px 6px;color:#666">GST</td><td style="padding:4px 6px;text-align:right">₹${b.gst}</td></tr>` : ''}
          ${(b.cd || 0) > 0 ? `<tr><td style="padding:4px 6px;color:#b45309">Pichla baki</td><td style="padding:4px 6px;text-align:right;color:#b45309">+₹${b.cd}</td></tr>` : ''}
          <tr style="background:${col};color:#fff"><td style="padding:6px 8px;font-weight:700;border-radius:4px 0 0 4px">TOTAL</td><td style="padding:6px 8px;text-align:right;font-weight:700;border-radius:0 4px 4px 0">₹${b.total}</td></tr>
          <tr><td style="padding:4px 6px;color:#16a34a">Paid (${b.pm})</td><td style="padding:4px 6px;text-align:right;color:#16a34a">-₹${b.paid}</td></tr>
          ${(b.nd || 0) > 0 ? `<tr style="background:#fef2f2"><td style="padding:4px 6px;color:#dc2626;font-weight:600">Balance Due</td><td style="padding:4px 6px;text-align:right;color:#dc2626;font-weight:600">₹${b.nd}</td></tr>` : `<tr><td style="padding:4px 6px;color:#16a34a" colspan="2">✓ Fully Paid</td></tr>`}
        </table>
      </div>
    </div>
    ${b.note ? `<div style="margin-top:8px;font-size:11px;color:#888">Note: ${b.note}</div>` : ''}
    ${footerHtml}${signHtml}`;
  om('m-bill');
}

async function printb() {
  if (!vbid) return;
  const b = await BKDb.get('bills', vbid);
  if (b) await BKPdf.printBill(b);
}

async function pdfb() {
  if (!vbid) return;
  const b = await BKDb.get('bills', vbid);
  if (b) await BKPdf.saveBill(b);
}

async function wab() {
  if (!vbid) return;
  const b = await BKDb.get('bills', vbid);
  if (b) await BKPdf.shareBillWhatsApp(b);
}

/* =================== DUES =================== */
async function rdues() {
  const all = await BKDb.getAll('customers');
  const dc = all.filter(c => (c.due || 0) > 0).sort((a, b) => b.due - a.due);
  const tbody = document.getElementById('duebody');
  if (!dc.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:30px"><div class="empty-state"><i class="ti ti-circle-check" style="color:var(--green-text)"></i><p>Koi due nahi! 🎉</p></div></td></tr>';
    return;
  }
  tbody.innerHTML = dc.map(c => `
    <tr>
      <td><span style="font-weight:500">${c.name}</span></td>
      <td>${c.mobile || '—'}</td>
      <td><span style="font-family:'DM Mono',monospace;font-weight:600;color:var(--red-text)">₹${c.due}</span></td>
      <td><button class="btn btn-g btn-sm" onclick="openCollect('${c.id}')"><i class="ti ti-coin"></i> Collect</button></td>
      <td><button class="btn btn-p btn-sm" onclick="go('billing')"><i class="ti ti-plus"></i> Bill</button></td>
    </tr>`).join('');
}

async function openCollect(cid) {
  const c = await BKDb.get('customers', cid);
  if (!c) return;
  document.getElementById('col-cid').value = cid;
  document.getElementById('col-info').innerHTML = `<strong>${c.name}</strong> ka baki: <span style="color:var(--red-text);font-weight:600;font-family:'DM Mono',monospace">₹${c.due}</span>`;
  document.getElementById('col-a').value = c.due;
  om('m-coll');
}

async function docoll() {
  const cid = document.getElementById('col-cid').value;
  const c = await BKDb.get('customers', cid);
  if (!c) return;
  const a = parseFloat(document.getElementById('col-a').value) || 0;
  if (!a) { toast('Amount daalo!'); return; }
  const col = Math.min(a, c.due);
  c.due = parseFloat((c.due - col).toFixed(2));
  await BKDb.put('customers', c);
  cm('m-coll'); rdues();
  toast('✓ ₹' + col + ' collect ho gaya!', 'success');
}

async function openLedger(cid) {
  await BKPdf.generateLedger(cid);
}

/* =================== SETTINGS =================== */
function stab(n) {
  document.querySelectorAll('.stab').forEach((t, i) => {
    t.classList.remove('active');
    const p = ['shop', 'bank', 'theme', 'logo', 'backup'];
    if (p[i] === n) t.classList.add('active');
  });
  document.querySelectorAll('.spanel').forEach(p => p.classList.remove('active'));
  document.getElementById('sp-' + n)?.classList.add('active');
}

async function initSettings() {
  const shop  = (await BKDb.getSetting('shop'))  || {};
  const bank  = (await BKDb.getSetting('bank'))  || {};
  const theme = (await BKDb.getSetting('theme')) || {};
  const print = (await BKDb.getSetting('print')) || {};
  const logo  = await BKDb.getSetting('logo');
  const qr    = await BKDb.getSetting('qr');

  const sf = { 's-sn': 'sn', 's-tg': 'tg', 's-a1': 'a1', 's-ct': 'ct', 's-st': 'st', 's-pn': 'pn', 's-mb': 'mb', 's-em': 'em', 's-gs': 'gs', 's-bp': 'bp', 's-ft': 'ft' };
  Object.entries(sf).forEach(([eid, k]) => { const e = document.getElementById(eid); if (e) e.value = shop[k] || ''; });
  const bf = { 'b-hn': 'hn', 'b-bn': 'bn', 'b-an': 'an', 'b-if': 'if', 'b-br': 'br', 'b-at': 'at', 'b-ui': 'ui', 'b-um': 'um' };
  Object.entries(bf).forEach(([eid, k]) => { const e = document.getElementById(eid); if (e) e.value = bank[k] || ''; });

  rtgrid();
  document.querySelectorAll('.swatch').forEach(sw => { sw.classList.toggle('active', sw.dataset.c === (theme.color || '#2563eb')); });
  if (logo) { const lp = document.getElementById('logo-prev'); if (lp) { lp.src = logo; lp.style.display = 'block'; } document.getElementById('logo-lbl')?.classList.remove('hidden'); document.getElementById('logo-rm')?.classList.remove('hidden'); }
  if (qr) { const qp = document.getElementById('qr-prev'); if (qp) { qp.src = qr; qp.style.display = 'block'; } document.getElementById('qr-lbl')?.classList.remove('hidden'); document.getElementById('qr-rm')?.classList.remove('hidden'); }
  const pc = { 'pr-lo': 'lo', 'pr-qr': 'qr', 'pr-bk': 'bk', 'pr-gs': 'gs', 'pr-ft': 'ft', 'pr-sg': 'sg' };
  Object.entries(pc).forEach(([eid, k]) => { const e = document.getElementById(eid); if (e) e.checked = print[k] !== false && print[k] !== undefined ? print[k] : k !== 'sg'; });
}

async function saveshop() {
  const sf = { 's-sn': 'sn', 's-tg': 'tg', 's-a1': 'a1', 's-ct': 'ct', 's-st': 'st', 's-pn': 'pn', 's-mb': 'mb', 's-em': 'em', 's-gs': 'gs', 's-bp': 'bp', 's-ft': 'ft' };
  const data = {};
  Object.entries(sf).forEach(([eid, k]) => { data[k] = document.getElementById(eid)?.value || ''; });
  await BKDb.setSetting('shop', data);
  updateSidebarShopName();
  smsg('sh-msg', '✓ Save ho gaya!', 'g'); toast('Dukaan info saved!', 'success');
}

async function savebank() {
  const bf = { 'b-hn': 'hn', 'b-bn': 'bn', 'b-an': 'an', 'b-if': 'if', 'b-br': 'br', 'b-at': 'at', 'b-ui': 'ui', 'b-um': 'um' };
  const data = {};
  Object.entries(bf).forEach(([eid, k]) => { data[k] = document.getElementById(eid)?.value || ''; });
  await BKDb.setSetting('bank', data);
  smsg('bk-msg', '✓ Save ho gaya!', 'g'); toast('Bank details saved!', 'success');
}

async function savetheme() {
  await BKDb.setSetting('theme', { name: (await BKDb.getSetting('theme'))?.name || 'classic', color: (await BKDb.getSetting('theme'))?.color || '#2563eb' });
  smsg('th-msg', '✓ Theme saved!', 'g'); toast('Theme saved!', 'success');
}

async function savepr() {
  const pc = { 'pr-lo': 'lo', 'pr-qr': 'qr', 'pr-bk': 'bk', 'pr-gs': 'gs', 'pr-ft': 'ft', 'pr-sg': 'sg' };
  const data = {};
  Object.entries(pc).forEach(([eid, k]) => { const e = document.getElementById(eid); if (e) data[k] = e.checked; });
  await BKDb.setSetting('print', data);
  smsg('pr-msg', '✓ Saved!', 'g'); toast('Print settings saved!', 'success');
}

async function updateSidebarShopName() {
  const shop = await BKDb.getSetting('shop');
  const el = document.getElementById('sb-shop');
  if (el) el.textContent = '■ ' + (shop?.sn || 'BillKaro');
}

/* Theme grid */
const THEMES = [
  { id: 'classic', name: 'Classic Blue', desc: 'Professional', prev: `<div style="background:#2563eb;height:28px;display:flex;align-items:center;padding:0 8px"><span style="color:#fff;font-weight:700;font-size:10px">TAX INVOICE</span></div><div style="padding:6px 8px;font-size:9px"><div style="font-weight:700;color:#2563eb">Shop Name</div><div style="margin-top:3px;background:#eff6ff;padding:3px 5px;border-radius:3px;font-size:8px">Item ×5 — ₹50</div></div><div style="background:#2563eb;height:18px;display:flex;align-items:center;justify-content:flex-end;padding:0 8px;margin-top:2px"><span style="color:#fff;font-size:9px;font-weight:700">TOTAL ₹50</span></div>` },
  { id: 'elegant', name: 'Elegant Dark', desc: 'Premium', prev: `<div style="background:#1f2937;height:32px;display:flex;align-items:center;padding:0 8px;justify-content:space-between"><span style="color:#fff;font-weight:700;font-size:10px">INVOICE</span><span style="color:#9ca3af;font-size:9px">BK0001</span></div><div style="padding:6px 8px;font-size:9px"><div style="font-weight:700;color:#1f2937">Shop Name</div></div><div style="background:#1f2937;height:18px;display:flex;align-items:center;justify-content:flex-end;padding:0 8px;margin-top:2px"><span style="color:#fff;font-size:9px;font-weight:700">TOTAL ₹50</span></div>` },
  { id: 'minimal', name: 'Minimal', desc: 'Clean & simple', prev: `<div style="padding:8px;border-bottom:2px solid #16a34a"><div style="display:flex;justify-content:space-between"><span style="font-weight:700;font-size:10px;color:#16a34a">Shop Name</span><span style="font-size:9px;color:#666">Invoice</span></div></div><div style="padding:5px 8px;font-size:8px;border-bottom:1px solid #eee;display:flex;justify-content:space-between"><span>Pen ×5</span><span>₹50</span></div><div style="padding:4px 8px;display:flex;justify-content:space-between;border-top:1px solid #16a34a;margin-top:2px"><span style="font-size:9px;color:#16a34a;font-weight:700">TOTAL</span><span style="font-size:9px;font-weight:700">₹50</span></div>` },
];

async function rtgrid() {
  const theme = await BKDb.getSetting('theme') || {};
  const cur = theme.name || 'classic';
  document.getElementById('tgrid').innerHTML = THEMES.map(t => `
    <div class="tcard ${cur === t.id ? 'sel' : ''}" onclick="selth('${t.id}')">
      <div class="tcheck">✓</div>
      <div class="tprev">${t.prev}</div>
      <div class="tname">${t.name}</div>
      <div style="font-size:11px;color:var(--text3);text-align:center;margin-top:2px">${t.desc}</div>
    </div>`).join('');
}

async function selth(id) {
  const theme = (await BKDb.getSetting('theme')) || {};
  theme.name = id;
  await BKDb.setSetting('theme', theme);
  rtgrid();
}

async function pcolor(el) {
  document.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
  el.classList.add('active');
  const theme = (await BKDb.getSetting('theme')) || {};
  theme.color = el.dataset.c;
  await BKDb.setSetting('theme', theme);
  document.getElementById('ccolor').value = el.dataset.c;
}

async function pcustc(v) {
  document.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
  const theme = (await BKDb.getSetting('theme')) || {};
  theme.color = v;
  await BKDb.setSetting('theme', theme);
}

async function prevbill() {
  const dummy = { id: 'prev', no: 'DEMO-001', date: today(), cid: null, cn: 'Ram Kumar (Demo)', cm2: '9876543210', ca: 'Patna, Bihar', cg: '', items: [{ pn: 'Pen', rate: 10, qty: 5, gst: 0, ic: false, amt: 50 }, { pn: 'Notebook', rate: 50, qty: 2, gst: 12, ic: true, amt: 100 }], sub: 150, gst: 12, cd: 0, total: 162, paid: 100, pm: 'Cash', nd: 62, note: 'Demo preview' };
  await BKDb.put('bills', dummy);
  await openBillDetail('prev');
  await BKDb.delete('bills', 'prev');
}

/* Upload logo/QR */
function upllogo(inp) {
  const f = inp.files[0]; if (!f) return;
  if (f.size > 2 * 1024 * 1024) { toast('2MB se badi hai!'); return; }
  const r = new FileReader();
  r.onload = async e => {
    await BKDb.setSetting('logo', e.target.result);
    const lp = document.getElementById('logo-prev');
    if (lp) { lp.src = e.target.result; lp.style.display = 'block'; }
    document.getElementById('logo-lbl')?.classList.remove('hidden');
    document.getElementById('logo-rm')?.classList.remove('hidden');
    toast('✓ Logo uploaded!', 'success');
  };
  r.readAsDataURL(f);
}

async function rmlogo() {
  await BKDb.setSetting('logo', null);
  const lp = document.getElementById('logo-prev');
  if (lp) { lp.style.display = 'none'; lp.src = ''; }
  document.getElementById('logo-lbl')?.classList.add('hidden');
  document.getElementById('logo-rm')?.classList.add('hidden');
  toast('Logo removed');
}

function uplqr(inp) {
  const f = inp.files[0]; if (!f) return;
  if (f.size > 2 * 1024 * 1024) { toast('2MB se badi hai!'); return; }
  const r = new FileReader();
  r.onload = async e => {
    await BKDb.setSetting('qr', e.target.result);
    const qp = document.getElementById('qr-prev');
    if (qp) { qp.src = e.target.result; qp.style.display = 'block'; }
    document.getElementById('qr-lbl')?.classList.remove('hidden');
    document.getElementById('qr-rm')?.classList.remove('hidden');
    toast('✓ QR uploaded!', 'success');
  };
  r.readAsDataURL(f);
}

async function rmqr() {
  await BKDb.setSetting('qr', null);
  const qp = document.getElementById('qr-prev');
  if (qp) { qp.style.display = 'none'; qp.src = ''; }
  document.getElementById('qr-lbl')?.classList.add('hidden');
  document.getElementById('qr-rm')?.classList.add('hidden');
  toast('QR removed');
}

/* =================== BACKUP =================== */
async function exportDB() {
  const data = await BKDb.exportAll();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `BillKaro-Backup-${today()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  toast('✓ Backup download ho gaya!', 'success');
}

function importDB() { document.getElementById('import-file')?.click(); }

async function handleImport(inp) {
  const f = inp.files[0]; if (!f) return;
  if (!confirm('Import karoge? Existing data replace ho jaayega!')) return;
  const text = await f.text();
  try {
    const data = JSON.parse(text);
    await BKDb.importAll(data);
    toast('✓ Data import ho gaya!', 'success');
    setTimeout(() => location.reload(), 1500);
  } catch (e) {
    toast('Invalid file!', 'error');
  }
}

/* =================== UTILS =================== */
function om(id) { document.getElementById(id)?.classList.add('open'); }
function cm(id) { document.getElementById(id)?.classList.remove('open'); }

let toastTimer;
function toast(msg, type = '') {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.className = 'show' + (type ? ' ' + type : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
}

function smsg(id, msg, c) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.style.color = c === 'g' ? 'var(--green-text)' : 'var(--red-text)';
  setTimeout(() => { if (el) el.textContent = ''; }, 3000);
}

function today() { return new Date().toISOString().slice(0, 10); }
function now() { return new Date().toISOString(); }
function uid() { return Date.now().toString(36) + Math.random().toString(36).substr(2, 5); }

/* Close modals on backdrop click */
document.addEventListener('click', e => {
  if (e.target.classList.contains('mb')) e.target.classList.remove('open');
});

/* Start app when DOM ready */
document.addEventListener('DOMContentLoaded', initApp);
