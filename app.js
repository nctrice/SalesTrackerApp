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

// ====== UI HELPERS ======
function $(sel) { return document.querySelector(sel); }
function el(tag, opts = {}) { const e = document.createElement(tag); Object.assign(e, opts); return e; }
function toDateStr(d) { return new Date(d).toLocaleDateString(); }

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
    date: $('#p-date').value || new Date(),
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
function renderReceivables() {
  const tbody = $('#receivables-table tbody');
  tbody.innerHTML = '';
  let total = 0;
  receivables.forEach((r, idx) => {
    total += Number(r.amount) || 0;
    const tr = el('tr');
    tr.appendChild(el('td', { textContent: toDateStr(r.invoiceDate) }));
    tr.appendChild(el('td', { textContent: r.customerName }));
    tr.appendChild(el('td', { textContent: r.invoiceNumber }));
    tr.appendChild(el('td', { textContent: fmt.format(r.amount), className: 'right' }));
    tr.appendChild(el('td', { textContent: r.comment || '' }));
    const tdAct = el('td');
    const del = el('button', { textContent: 'Delete', className: 'secondary' });
    del.addEventListener('click', () => { receivables.splice(idx,1); lsSet(LS.receivables, receivables); renderReceivables(); });
    tdAct.appendChild(del);
    tr.appendChild(tdAct);
    tbody.appendChild(tr);
  });
  $('#receivables-total').textContent = fmt.format(total);
}

$('#receivable-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const item = {
    invoiceDate: $('#r-date').value || new Date(),
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
  const rows = [['Invoice Date','Customer Name','Invoice Number','Amount','Comment'], ...receivables.map(r => [r.invoiceDate, r.customerName, r.invoiceNumber, r.amount, r.comment])];
  downloadCSV('receivables.csv', rows);
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

$('#stock-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = $('#s-product').value;
  const price = Number($('#s-price').value || 0);
  const qty = Number($('#s-qty').value || 0);
  const idx = inventory.findIndex(x => x.productName === name);
  if (idx >= 0) {
    // update existing row's price & qty
    inventory[idx].price = price;
    inventory[idx].quantity = qty;
  } else {
    inventory.push({ productName: name, price, quantity: qty });
  }
  lsSet(LS.inventory, inventory);
  e.target.reset();
  populateProductSelect(); // reset price
  renderInventory();
});

$('#export-inventory').addEventListener('click', () => {
  const rows = [['Product Name','Price','Quantity','Total Value'], ...inventory.map(i => [i.productName, i.price, i.quantity, (Number(i.price)||0)*(Number(i.quantity)||0)])];
  downloadCSV('inventory.csv', rows);
});

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
