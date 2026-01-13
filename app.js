// ====== CONFIG ======
const CURRENCY = 'NGN';
const fmt = new Intl.NumberFormat('en-NG', { style: 'currency', currency: CURRENCY });

// Product catalog (unit costs)
const PRODUCT_CATALOG = {
  "Tydineal Cream": 700,
  "Tydisil Cream": 945,
  "Anofast Gel": 700,
  "Tydiclear Cream": 515,
  "Tydibact Cream": 580,
  "Borocare Cream": 1520,
  "Klaract Cream": 1565,
  "Ciprofloxacin Tablet": 400,
  "Metformin Tablet": 800,
  "Vitamin C Syrup": 300,
  "Gentamicin Inj": 5995,
  "Diclofenac Inj": 4550,
  "Artemether Inj": 4350,
  "M&B Isopropyl Alcohol": 950,
};

// ====== STORAGE (LocalStorage) ======
const LS = {
  payments: 'st_payments',
  receivables: 'st_receivables',
  inventory: 'st_inventory',
  favorites: 'st_favorites',
};

function lsGet(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    console.warn('Storage read error', e);
    return fallback;
  }
}

function lsSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    alert('Failed to save data. Try freeing some storage.');
  }
}

// ====== STATE ======
let payments = lsGet(LS.payments, []);
let receivables = lsGet(LS.receivables, []);
let inventory = lsGet(LS.inventory, Object.keys(PRODUCT_CATALOG).map(name => ({ productName: name, price: PRODUCT_CATALOG[name], quantity: 0 })));
let favorites = lsGet(LS.favorites, []); // array of customer names

// ====== UI HELPERS ======
function $(sel) { return document.querySelector(sel); }
function el(tag, opts = {}) { const e = document.createElement(tag); Object.assign(e, opts); return e; }
function toDateStr(d) { const dt = new Date(d); return isNaN(dt) ? '' : dt.toLocaleDateString(); }
function toDateTimeStr(d) { const dt = new Date(d); return isNaN(dt) ? '' : dt.toLocaleString(); }

// ====== TABS ======
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(sec => sec.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
  });
});

// ====== PAYMENTS ======
function renderPayments() {
  const tbody = $('#payments-table tbody');
  tbody.innerHTML = '';
  let total = 0;
  payments.forEach((p, idx) => {
    total += Number(p.amount) || 0;
    const tr = el('tr');
    tr.appendChild(el('td', { textContent: toDateStr(p.date) }));
    tr.appendChild(el('td', { textContent: p.name }));
    tr.appendChild(el('td', { textContent: p.type }));
    tr.appendChild(el('td', { textContent: fmt.format(p.amount), className: 'right' }));
    const tdAct = el('td');
    const del = el('button', { textContent: 'Delete', className: 'secondary' });
    del.addEventListener('click', () => { payments.splice(idx,1); lsSet(LS.payments, payments); renderPayments(); });
    tdAct.appendChild(del);
    tr.appendChild(tdAct);
    tbody.appendChild(tr);
  });
  $('#payments-total').textContent = fmt.format(total);
}

$('#payment-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const item = {
    date: $('#p-date').value || new Date().toISOString(),
    name: $('#p-name').value.trim(),
    type: $('#p-type').value,
    amount: Number($('#p-amount').value || 0),
  };
  payments.push(item);
  lsSet(LS.payments, payments);
  e.target.reset();
  renderPayments();
});

// Export payments CSV
$('#export-payments').addEventListener('click', () => {
  const rows = [['Date','Name','Type','Amount'], ...payments.map(p => [p.date, p.name, p.type, p.amount])];
  downloadCSV('payments.csv', rows);
});

// ====== RECEIVABLES ======
function renderReceivablesAll() {
  // sort by createdAt desc (fallback to now if missing)
  const rows = receivables.slice().sort((a,b) => {
    const ad = new Date(a.createdAt || a.invoiceDate || Date.now()).getTime();
    const bd = new Date(b.createdAt || b.invoiceDate || Date.now()).getTime();
    return bd - ad;
  });
  const tbody = $('#receivables-table tbody');
  tbody.innerHTML = '';
  let total = 0;
  rows.forEach((r, idx) => {
    total += Number(r.amount) || 0;
    const tr = el('tr');
    tr.appendChild(el('td', { textContent: toDateTimeStr(r.createdAt) }));
    tr.appendChild(el('td', { textContent: toDateStr(r.invoiceDate) }));
    tr.appendChild(el('td', { textContent: r.customerName }));
    tr.appendChild(el('td', { textContent: r.invoiceNumber }));
    tr.appendChild(el('td', { textContent: fmt.format(r.amount), className: 'right' }));
    tr.appendChild(el('td', { textContent: r.comment || '' }));
    const tdAct = el('td');
    const del = el('button', { textContent: 'Delete', className: 'secondary' });
    del.addEventListener('click', () => {
      const origIdx = receivables.findIndex(x => x === rows[idx]);
      if (origIdx >= 0) receivables.splice(origIdx,1);
      lsSet(LS.receivables, receivables);
      renderReceivables();
    });
    tdAct.appendChild(del);
    tr.appendChild(tdAct);
    tbody.appendChild(tr);
  });
  $('#receivables-total').textContent = fmt.format(total);
}

function renderFavSelect() {
  const sel = $('#r-fav-select');
  sel.innerHTML = '';
  const ph = el('option', { value: '', textContent: 'Favorites…' });
  sel.appendChild(ph);
  favorites.forEach(name => sel.appendChild(el('option', { value: name, textContent: name })));
  sel.addEventListener('change', () => {
    if (sel.value) $('#r-customer').value = sel.value;
    sel.value = '';
  });
}

function renderFavoritesUI() {
  const list = $('#fav-list');
  list.innerHTML = '';
  favorites.forEach((name, idx) => {
    const chip = el('span', { className: 'chip', textContent: name });
    const x = el('button', { className: 'chip-x', textContent: '×', title: 'Remove' });
    x.addEventListener('click', () => {
      favorites.splice(idx,1);
      lsSet(LS.favorites, favorites);
      renderReceivables();
    });
    const wrap = el('span', { className: 'chip-wrap' });
    wrap.appendChild(chip); wrap.appendChild(x);
    list.appendChild(wrap);
  });
}

function renderCustomerBoards() {
  const container = $('#customer-boards');
  container.innerHTML = '';
  favorites.forEach(name => {
    const card = el('div', { className: 'card' });
    const head = el('div', { className: 'card-head' });
    head.appendChild(el('h2', { textContent: `Receivables • ${name}` }));
    card.appendChild(head);
    const tbl = el('table', { className: 'data-table' });
    tbl.innerHTML = '<thead><tr><th>Entered</th><th>Invoice Date</th><th>Invoice #</th><th class="right">Amount</th><th>Comment</th><th></th></tr></thead>';
    const tbody = el('tbody');
    const rows = receivables.filter(r => r.customerName === name).sort((a,b) => {
      const ad = new Date(a.createdAt || a.invoiceDate || Date.now()).getTime();
      const bd = new Date(b.createdAt || b.invoiceDate || Date.now()).getTime();
      return bd - ad;
    });
    let total = 0;
    rows.forEach((r, idx) => {
      total += Number(r.amount) || 0;
      const tr = el('tr');
      tr.appendChild(el('td', { textContent: toDateTimeStr(r.createdAt) }));
      tr.appendChild(el('td', { textContent: toDateStr(r.invoiceDate) }));
      tr.appendChild(el('td', { textContent: r.invoiceNumber }));
      tr.appendChild(el('td', { textContent: fmt.format(r.amount), className: 'right' }));
      tr.appendChild(el('td', { textContent: r.comment || '' }));
      const tdAct = el('td');
      const del = el('button', { textContent: 'Delete', className: 'secondary' });
      del.addEventListener('click', () => {
        const globalIdx = receivables.findIndex(x => x === rows[idx]);
        if (globalIdx >= 0) receivables.splice(globalIdx,1);
        lsSet(LS.receivables, receivables);
        renderReceivables();
      });
      tdAct.appendChild(del);
      tr.appendChild(tdAct);
      tbody.appendChild(tr);
    });
    tbl.appendChild(tbody);
    const tfoot = el('tfoot');
    const trf = el('tr');
    trf.appendChild(el('td', { colSpan: 3, className: 'right', textContent: 'Total' }));
    trf.appendChild(el('td', { className: 'right', textContent: fmt.format(total) }));
    trf.appendChild(el('td', {}));
    trf.appendChild(el('td', {}));
    tfoot.appendChild(trf);
    tbl.appendChild(tfoot);
    card.appendChild(tbl);
    container.appendChild(card);
  });
}

function renderReceivables() {
  renderReceivablesAll();
  renderFavoritesUI();
  renderFavSelect();
  renderCustomerBoards();
}

$('#receivable-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const item = {
    createdAt: new Date().toISOString(), // entry timestamp
    invoiceDate: $('#r-date').value || new Date().toISOString(),
    customerName: $('#r-customer').value.trim(),
    invoiceNumber: $('#r-number').value.trim(),
    amount: Number($('#r-amount').value || 0),
    comment: $('#r-comment').value.trim(),
  };
  receivables.push(item);
  lsSet(LS.receivables, receivables);
  e.target.reset();
  renderReceivables();
});

$('#export-receivables').addEventListener('click', () => {
  const rows = [['Entered','Invoice Date','Customer Name','Invoice Number','Amount','Comment'], ...receivables.map(r => [r.createdAt || '', r.invoiceDate, r.customerName, r.invoiceNumber, r.amount, r.comment])];
  downloadCSV('receivables.csv', rows);
});

// Favorites management
$('#fav-add').addEventListener('click', () => {
  const name = $('#fav-input').value.trim();
  if (!name) return;
  if (favorites.includes(name)) { alert('Already added.'); return; }
  if (favorites.length >= 5) { alert('You can keep up to five favorite customers.'); return; }
  favorites.push(name);
  lsSet(LS.favorites, favorites);
  $('#fav-input').value = '';
  renderReceivables();
});

// ====== INVENTORY ======
function populateProductSelect() {
  const sel = $('#s-product');
  sel.innerHTML = '';
  Object.keys(PRODUCT_CATALOG).sort().forEach(name => {
    const opt = el('option', { value: name, textContent: name });
    sel.appendChild(opt);
  });
  // initial price
  updatePriceFromCatalog();
}

function updatePriceFromCatalog() {
  const name = $('#s-product').value;
  const price = PRODUCT_CATALOG[name];
  $('#s-price').value = (price ?? 0).toFixed(2);
}

$('#s-product').addEventListener('change', updatePriceFromCatalog);

function renderInventory() {
  const tbody = $('#inventory-table tbody');
  tbody.innerHTML = '';
  let total = 0;
  inventory.forEach((i, idx) => {
    total += (Number(i.price) || 0) * (Number(i.quantity) || 0);
    const tr = el('tr');
    tr.appendChild(el('td', { textContent: i.productName }));
    tr.appendChild(el('td', { textContent: fmt.format(i.price), className: 'right' }));
    // qty editor
    const qtyTd = el('td', { className: 'right' });
    const qtyInput = el('input', { type: 'number', min: '0', step: '1', value: i.quantity });
    qtyInput.addEventListener('change', () => {
      i.quantity = Number(qtyInput.value || 0);
      lsSet(LS.inventory, inventory);
      renderInventory();
    });
    qtyTd.appendChild(qtyInput);
    tr.appendChild(qtyTd);

    tr.appendChild(el('td', { textContent: fmt.format((Number(i.price)||0) * (Number(i.quantity)||0)), className: 'right' }));

    const tdAct = el('td');
    const del = el('button', { textContent: 'Delete', className: 'secondary' });
    del.addEventListener('click', () => { inventory.splice(idx,1); lsSet(LS.inventory, inventory); renderInventory(); });
    tdAct.appendChild(del);
    tr.appendChild(tdAct);

    tbody.appendChild(tr);
  });
  $('#inventory-total').textContent = fmt.format(total);
}

// ====== CSV HELPERS ======
function downloadCSV(filename, rows) {
  const escape = (s) => {
    if (s === null || s === undefined) return '';
    s = String(s);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) return '"' + s.replace(/"/g,'""') + '"';
    return s;
  };
  const csv = rows.map(r => r.map(escape).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ====== INIT ======
window.addEventListener('load', () => {
  // Register SW (for offline)
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js');
  }
  renderPayments();
  renderReceivables();
  populateProductSelect();
  renderInventory();
});
