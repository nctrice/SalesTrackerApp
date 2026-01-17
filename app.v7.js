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
  payments:    'st_payments',     // [{date,name,type,amount,ledger,createdAt}]
  receivables: 'st_receivables',  // [{createdAt,invoiceDate,customerName,invoiceNumber,amount,comment,ledger}]
  inventory:   'st_inventory',    // [{productName,price,quantity,ledger}]
  favorites:   'st_favorites',
  ledgers:     'st_ledgers',
  debits:      'st_debits',       // [{date,invoiceType,invoiceNumber,amount,ledger,createdAt}]
};

function lsGet(key, fallback) { try { const raw = localStorage.getItem(key); if (!raw) return fallback; return JSON.parse(raw); } catch(e){ return fallback; } }
function lsSet(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch(e) { alert('Save failed'); } }

// ====== STATE ======
let payments    = lsGet(LS.payments, []);
let receivables = lsGet(LS.receivables, []);
let inventory   = lsGet(LS.inventory, []);
let favorites   = lsGet(LS.favorites, []);
let ledgers     = lsGet(LS.ledgers, []);
let debits      = lsGet(LS.debits, []);

// ====== UI HELPERS ======
const $  = sel => document.querySelector(sel);
const el = (tag, opts={}) => { const e=document.createElement(tag); Object.assign(e, opts); return e; }
const toDate    = d => new Date(d);
const toDateStr = d => { const dt = new Date(d); return isNaN(dt) ? '' : dt.toLocaleDateString(); };

// ====== TABS ======

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(sec => sec.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
    if (btn.dataset.tab === 'dashboard') renderDashboard();
  });
});


// ====== LEDGERS ======
function renderLedgersUI(){
  const list = $('#ledger-list'); if(!list) return; list.innerHTML = '';
  ledgers.forEach((name, idx) => {
    const wrap = el('span', { className: 'chip-wrap' });
    wrap.appendChild(el('span', { className: 'chip', textContent: name }));
    const x = el('button', { className:'chip-x', textContent:'×', title:'Remove' });
    x.addEventListener('click', () => {
      ledgers.splice(idx,1);
      lsSet(LS.ledgers, ledgers);
      populateLedgerSelects();
      renderPaymentsAll(); renderLedgerBoards(); renderReceivables(); renderInventory(); renderDashboard();
    });
    wrap.appendChild(x);
    list.appendChild(wrap);
  });
}

$('#ledger-add')?.addEventListener('click', () => {
  const input = $('#ledger-input'); if(!input) return;
  const name = input.value.trim();
  if(!name) return;
  if(ledgers.includes(name)) { alert('Ledger already exists'); return; }
  ledgers.push(name);
  lsSet(LS.ledgers, ledgers);
  input.value='';
  renderLedgersUI();
  populateLedgerSelects();
  renderDashboard();
});

function populateLedgerSelects(){
  ['#p-ledger','#d-ledger','#r-ledger','#s-ledger','#dash-ledger'].forEach(sel => {
    const s = $(sel); if(!s) return; s.innerHTML='';
    const ph = el('option', { value:'', textContent:'Select ledger...' });
    s.appendChild(ph);
    ledgers.forEach(name => s.appendChild(el('option', { value:name, textContent:name })));
    if (!s.value && ledgers.length > 0) s.value = ledgers[0];
  });
}

// ====== PAYMENTS (CREDITS) ======
function renderPaymentsAll(){
  const tbody = $('#payments-table tbody'); if(!tbody) return;
  const rows = payments.slice().sort((a,b)=> toDate(a.date)-toDate(b.date)); // earliest -> latest
  tbody.innerHTML='';
  let total = 0;
  rows.forEach((p, idx) => {
    total += Number(p.amount) || 0;
    const tr = el('tr');
    tr.appendChild(el('td', { textContent: toDateStr(p.date) }));
    tr.appendChild(el('td', { textContent: p.name }));
    tr.appendChild(el('td', { textContent: p.type }));
    tr.appendChild(el('td', { textContent: p.ledger || '' }));
    tr.appendChild(el('td', { textContent: fmt.format(p.amount), className:'right' }));
    const tdAct = el('td');
    const del = el('button', { textContent:'Delete', className:'secondary' });
    del.addEventListener('click', () => { const gi = payments.indexOf(p); if(gi>=0) { payments.splice(gi,1); lsSet(LS.payments, payments); renderPaymentsAll(); renderLedgerBoards(); renderDashboard(); } });
    tdAct.appendChild(del); tr.appendChild(tdAct); tbody.appendChild(tr);
  });
  $('#payments-total').textContent = fmt.format(total);
}

$('#payment-form')?.addEventListener('submit', (e)=>{
  e.preventDefault();
  const item = {
    createdAt: new Date().toISOString(),
    date:  $('#p-date').value || new Date().toISOString(),
    name:  $('#p-name').value.trim(),
    type:  $('#p-type').value,
    amount:Number($('#p-amount').value || 0),
    ledger:$('#p-ledger').value,
  };
  if(!item.ledger){ alert('Please select a ledger'); return; }
  payments.push(item); lsSet(LS.payments, payments);
  e.target.reset();
  renderPaymentsAll(); renderLedgerBoards(); renderDashboard();
});

$('#export-payments')?.addEventListener('click', ()=>{
  const rows = [['Date','Name','Type','Ledger','Amount'], ...payments.slice().sort((a,b)=> toDate(a.date)-toDate(b.date)).map(p=>[p.date,p.name,p.type,p.ledger,p.amount])];
  downloadCSV('payments_all.csv', rows);
});

// ====== DEBITS ======
$('#debit-form')?.addEventListener('submit', (e)=>{
  e.preventDefault();
  const item = {
    createdAt: new Date().toISOString(),
    date: $('#d-date').value || new Date().toISOString(),
    invoiceType:   $('#d-invtype').value.trim(),
    invoiceNumber: $('#d-invnum').value.trim(),
    amount: Number($('#d-amount').value || 0),
    ledger: $('#d-ledger').value,
  };
  if(!item.ledger){ alert('Please select a ledger'); return; }
  debits.push(item); lsSet(LS.debits, debits);
  e.target.reset();
  renderLedgerBoards(); renderDashboard();
});

// ====== LEDGER BOARDS ======
function renderLedgerBoards(){
  const container = $('#ledger-boards'); if(!container) return; container.innerHTML='';
  ledgers.forEach(name => {
    const credits = payments.filter(p=>p.ledger===name).sort((a,b)=> toDate(a.date)-toDate(b.date));
    const debs    = debits.filter(d=>d.ledger===name).sort((a,b)=> toDate(a.date)-toDate(b.date));

    let totalCredit = credits.reduce((s,p)=> s + (Number(p.amount)||0), 0);
    let totalDebit  = debs.reduce((s,d)=> s + (Number(d.amount)||0), 0);
    const balance = totalDebit - totalCredit;

    const card = el('div', { className:'card' });
    const head = el('div', { className:'card-head' });
    head.appendChild(el('h2', { textContent: `Ledger • ${name}` }));
    const tools = el('div');

    const btnStmt = el('button', { className:'secondary', textContent:'Export Statement' });
    btnStmt.addEventListener('click', ()=>{
      const combined = [
        ...credits.map(p=>({kind:'Credit', date:p.date, a:p.name, b:p.type, amount:p.amount})),
        ...debs.map(d=>({kind:'Debit',  date:d.date, a:d.invoiceType, b:d.invoiceNumber, amount:d.amount})),
      ].sort((a,b)=> new Date(a.date) - new Date(b.date));
      const rows = [['Date','Kind','Desc A','Desc B','Amount'], ...combined.map(r=>[r.date, r.kind, r.a, r.b, r.amount])];
      downloadCSV(`ledger_${name}_statement.csv`, rows);
    });
    tools.appendChild(btnStmt);
    head.appendChild(tools);
    card.appendChild(head);

    const tbl = el('table', { className:'data-table' });
    tbl.innerHTML = '<thead><tr><th>Date</th><th>Type</th><th>Details</th><th class="right">Amount</th><th></th></tr></thead>';
    const tbody = el('tbody');
    const combined = [
      ...credits.map(p=>({kind:'Credit', date:p.date, details:`${p.name} • ${p.type}`, amount:p.amount, ref:p, isCredit:true})),
      ...debs.map(d=>({kind:'Debit',  date:d.date, details:`${d.invoiceType} • ${d.invoiceNumber}`, amount:d.amount, ref:d, isCredit:false})),
    ].sort((a,b)=> toDate(a.date)-toDate(b.date));

    combined.forEach((r) => {
      const tr = el('tr');
      tr.appendChild(el('td', { textContent: toDateStr(r.date) }));
      tr.appendChild(el('td', { textContent: r.kind }));
      tr.appendChild(el('td', { textContent: r.details }));
      tr.appendChild(el('td', { textContent: fmt.format(r.amount), className:'right' }));
      const tdAct = el('td');
      const del = el('button', { textContent:'Delete', className:'secondary' });
      del.addEventListener('click', () => {
        if(r.isCredit){ const i = payments.indexOf(r.ref); if(i>=0) payments.splice(i,1); lsSet(LS.payments, payments); }
        else { const i = debits.indexOf(r.ref); if(i>=0) debits.splice(i,1); lsSet(LS.debits, debits); }
        renderPaymentsAll(); renderLedgerBoards(); renderDashboard();
      });
      tdAct.appendChild(del); tr.appendChild(tdAct); tbody.appendChild(tr);
    });
    tbl.appendChild(tbody);

    const tfoot = el('tfoot');
    const trf = el('tr');
    trf.appendChild(el('td', { textContent:'Totals', colSpan:2 }));
    trf.appendChild(el('td', { className:'right', textContent:`Credits: ${fmt.format(totalCredit)} • Debits: ${fmt.format(totalDebit)}` }));
    trf.appendChild(el('td', { className:'right', textContent:`Balance: ${fmt.format(balance)}` }));
    trf.appendChild(el('td', {}));
    tfoot.appendChild(trf); tbl.appendChild(tfoot);

    card.appendChild(tbl);
    container.appendChild(card);
  });
}

// ====== RECEIVABLES ======
function renderReceivablesAll() {
  const tbody = document.querySelector('#receivables-table tbody'); if(!tbody) return;
  const rows = receivables.slice().sort((a,b) => new Date(a.createdAt||a.invoiceDate) - new Date(b.createdAt||b.invoiceDate)).reverse();
  tbody.innerHTML = '';
  let total = 0;
  rows.forEach((r) => {
    total += Number(r.amount) || 0;
    const tr = el('tr');
    tr.appendChild(el('td', { textContent: new Date(r.createdAt).toLocaleString() }));
    tr.appendChild(el('td', { textContent: toDateStr(r.invoiceDate) }));
    tr.appendChild(el('td', { textContent: r.customerName }));
    tr.appendChild(el('td', { textContent: r.invoiceNumber }));
    tr.appendChild(el('td', { textContent: fmt.format(r.amount), className: 'right' }));
    tr.appendChild(el('td', { textContent: r.ledger || '' }));
    tr.appendChild(el('td', { textContent: r.comment || '' }));
    const tdAct = el('td');
    const del = el('button', { textContent: 'Delete', className: 'secondary' });
    del.addEventListener('click', () => {
      const idx = receivables.indexOf(r);
      if (idx >= 0) receivables.splice(idx,1);
      lsSet(LS.receivables, receivables);
      renderReceivables(); renderDashboard();
    });
    tdAct.appendChild(del);
    tr.appendChild(tdAct);
    tbody.appendChild(tr);
  });
  document.querySelector('#receivables-total').textContent = fmt.format(total);
}

function renderFavSelect() {
  const sel = document.querySelector('#r-fav-select'); if(!sel) return; sel.innerHTML = '';
  const ph = el('option', { value: '', textContent: 'Favorites…' }); sel.appendChild(ph);
  favorites.forEach(name => sel.appendChild(el('option', { value: name, textContent: name })));
  sel.addEventListener('change', () => { const cust = document.querySelector('#r-customer'); if (sel.value && cust) cust.value = sel.value; sel.value = ''; });
}

function renderFavoritesUI() {
  const list = document.querySelector('#fav-list'); if(!list) return; list.innerHTML = '';
  favorites.forEach((name, idx) => {
    const chip = el('span', { className: 'chip', textContent: name });
    const x = el('button', { className: 'chip-x', textContent: '×', title: 'Remove' });
    x.addEventListener('click', () => { favorites.splice(idx,1); lsSet(LS.favorites, favorites); renderReceivables(); });
    const wrap = el('span', { className: 'chip-wrap' }); wrap.appendChild(chip); wrap.appendChild(x); list.appendChild(wrap);
  });
}

// FAVORITES/CUSTOMER BOARDS — Delete only (NO Move here)
function renderCustomerBoards() {
  const container = document.querySelector('#customer-boards'); if(!container) return; container.innerHTML = '';
  favorites.forEach(name => {
    const card = el('div', { className: 'card' });
    const head = el('div', { className: 'card-head' }); head.appendChild(el('h2', { textContent: `Receivables • ${name}` })); card.appendChild(head);
    const tbl = el('table', { className: 'data-table' });
    tbl.innerHTML = '<thead><tr><th>Entered</th><th>Invoice Date</th><th>Invoice #</th><th class="right">Amount</th><th>Ledger</th><th>Comment</th><th></th></tr></thead>';
    const tbody = el('tbody');
    const rows = receivables.filter(r => r.customerName === name).sort((a,b) => new Date(a.createdAt||a.invoiceDate) - new Date(b.createdAt||b.invoiceDate)).reverse();
    let total = 0;
    rows.forEach(r => {
      total += Number(r.amount) || 0;
      const tr = el('tr');
      tr.appendChild(el('td', { textContent: new Date(r.createdAt).toLocaleString() }));
      tr.appendChild(el('td', { textContent: toDateStr(r.invoiceDate) }));
      tr.appendChild(el('td', { textContent: r.invoiceNumber }));
      tr.appendChild(el('td', { textContent: fmt.format(r.amount), className: 'right' }));
      tr.appendChild(el('td', { textContent: r.ledger || '' }));
      tr.appendChild(el('td', { textContent: r.comment || '' }));
      const tdAct = el('td');
      const del = el('button', { textContent: 'Delete', className: 'secondary' });
      del.addEventListener('click', () => { const gi = receivables.indexOf(r); if (gi >= 0) receivables.splice(gi,1); lsSet(LS.receivables, receivables); renderReceivables(); renderDashboard(); });
      tdAct.appendChild(del); tr.appendChild(tdAct); tbody.appendChild(tr);
    });
    tbl.appendChild(tbody);
    const tfoot = el('tfoot'); const trf = el('tr');
    trf.appendChild(el('td', { colSpan: 4, className: 'right', textContent: 'Total' }));
    trf.appendChild(el('td', { className: 'right', textContent: fmt.format(total) }));
    trf.appendChild(el('td', {})); trf.appendChild(el('td', {}));
    tfoot.appendChild(trf); tbl.appendChild(tfoot);
    card.appendChild(tbl); container.appendChild(card);
  });
}

// RECEIVABLES BY LEDGER — with Move + Delete
function renderReceivablesLedgerBoards() {
  const container = document.querySelector('#receivables-ledger-boards'); if(!container) return; container.innerHTML = '';
  ledgers.forEach(ledgerName => {
    const rows = receivables.filter(r => r.ledger === ledgerName).sort((a,b) => new Date(a.createdAt||a.invoiceDate) - new Date(b.createdAt||b.invoiceDate)).reverse();
    if (rows.length === 0) return; // skip empty ledgers

    const card = el('div', { className: 'card' });
    const head = el('div', { className: 'card-head' }); head.appendChild(el('h3', { textContent: `Ledger • ${ledgerName}` })); card.appendChild(head);
    const tbl = el('table', { className: 'data-table' });
    tbl.innerHTML = '<thead><tr><th>Entered</th><th>Invoice Date</th><th>Customer</th><th>Invoice #</th><th class="right">Amount</th><th>Comment</th><th></th></tr></thead>';
    const tbody = el('tbody');
    let total = 0;
    rows.forEach(r => {
      total += Number(r.amount) || 0;
      const tr = el('tr');
      tr.appendChild(el('td', { textContent: new Date(r.createdAt).toLocaleString() }));
      tr.appendChild(el('td', { textContent: toDateStr(r.invoiceDate) }));
      tr.appendChild(el('td', { textContent: r.customerName }));
      tr.appendChild(el('td', { textContent: r.invoiceNumber }));
      tr.appendChild(el('td', { textContent: fmt.format(r.amount), className: 'right' }));
      tr.appendChild(el('td', { textContent: r.comment || '' }));
      const tdAct = el('td');

      const move = el('button', { textContent: 'Move', className: 'secondary' });
      move.addEventListener('click', () => {
        if (ledgers.length === 0) { alert('No ledgers available'); return; }
        const list = ledgers.join(', ');
        const target = prompt(`Move to which ledger?
Available: ${list}`);
        if (target && ledgers.includes(target)) {
          r.ledger = target;
          lsSet(LS.receivables, receivables);
          renderReceivables(); renderDashboard();
        }
      });

      const del = el('button', { textContent: 'Delete', className: 'secondary' });
      del.addEventListener('click', () => { const gi = receivables.indexOf(r); if (gi >= 0) receivables.splice(gi,1); lsSet(LS.receivables, receivables); renderReceivables(); renderDashboard(); });

      tdAct.appendChild(move); tdAct.appendChild(del); tr.appendChild(tdAct); tbody.appendChild(tr);
    });
    tbl.appendChild(tbody);

    const tfoot = el('tfoot'); const trf = el('tr');
    trf.appendChild(el('td', { colSpan: 4, className: 'right', textContent: 'Total' }));
    trf.appendChild(el('td', { className: 'right', textContent: fmt.format(total) }));
    trf.appendChild(el('td', {})); trf.appendChild(el('td', {}));
    tfoot.appendChild(trf); tbl.appendChild(tfoot);

    card.appendChild(tbl); container.appendChild(card);
  });
}

function renderReceivables() { renderReceivablesAll(); renderFavoritesUI(); renderFavSelect(); renderCustomerBoards(); renderReceivablesLedgerBoards(); }

// Receivables form with Ledger assignment
$('#receivable-form')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const item = { createdAt: new Date().toISOString(), invoiceDate: $('#r-date').value || new Date().toISOString(), customerName: $('#r-customer').value.trim(), invoiceNumber: $('#r-number').value.trim(), amount: Number($('#r-amount').value || 0), ledger: $('#r-ledger').value, comment: $('#r-comment').value.trim() };
  if (!item.ledger) { alert('Please select a ledger for this receivable'); return; }
  receivables.push(item); lsSet(LS.receivables, receivables); e.target.reset(); renderReceivables(); renderDashboard();
});

$('#export-receivables')?.addEventListener('click', () => {
  const rows = [['Entered','Invoice Date','Customer Name','Invoice Number','Amount','Ledger','Comment'], ...receivables.map(r => [r.createdAt || '', r.invoiceDate, r.customerName, r.invoiceNumber, r.amount, r.ledger || '', r.comment])];
  downloadCSV('receivables.csv', rows);
});

// ====== INVENTORY (Per Ledger) ======
function populateProductSelect(){ const sel = document.querySelector('#s-product'); if(!sel) return; sel.innerHTML=''; Object.keys(PRODUCT_CATALOG).sort().forEach(name=> sel.appendChild(el('option',{value:name,textContent:name})) ); updatePriceFromCatalog(); }
function updatePriceFromCatalog(){ const name = document.querySelector('#s-product')?.value; const price = PRODUCT_CATALOG[name]; const fld = document.querySelector('#s-price'); if(fld) fld.value = (price ?? 0).toFixed(2); }
document.querySelector('#s-product')?.addEventListener('change', updatePriceFromCatalog);

function renderInventory(){ const tbody = document.querySelector('#inventory-table tbody'); if(!tbody) return; tbody.innerHTML=''; let total=0; inventory.forEach((i, idx)=>{ total += (Number(i.price)||0)*(Number(i.quantity)||0); const tr = el('tr'); tr.appendChild(el('td',{textContent:i.productName})); tr.appendChild(el('td',{textContent:fmt.format(i.price), className:'right'})); const qtyTd = el('td',{className:'right'}); const qtyInput = el('input',{type:'number',min:'0',step:'1',value:i.quantity}); qtyInput.addEventListener('change',()=>{ i.quantity = Number(qtyInput.value||0); lsSet(LS.inventory, inventory); renderInventory(); renderDashboard();}); qtyTd.appendChild(qtyInput); tr.appendChild(qtyTd); tr.appendChild(el('td',{textContent:i.ledger || ''})); tr.appendChild(el('td',{textContent:fmt.format((Number(i.price)||0)*(Number(i.quantity)||0)), className:'right'})); const tdAct=el('td'); const del=el('button',{textContent:'Delete',className:'secondary'}); del.addEventListener('click',()=>{inventory.splice(idx,1); lsSet(LS.inventory, inventory); renderInventory(); renderDashboard();}); tdAct.appendChild(del); tr.appendChild(tdAct); tbody.appendChild(tr);}); document.querySelector('#inventory-total').textContent = fmt.format(total); }

// Stock per ledger: save handler
$('#stock-form')?.addEventListener('submit',(e)=>{ e.preventDefault(); const name=$('#s-product').value; const price=Number($('#s-price').value||0); const ledger=$('#s-ledger').value; const qty=Number($('#s-qty').value||0); if (!ledger) { alert('Please select a ledger for this stock'); return; } const idx=inventory.findIndex(x=>x.productName===name && x.ledger===ledger); if(idx>=0){ inventory[idx].price=price; inventory[idx].quantity=qty;} else { inventory.push({productName:name, price, quantity:qty, ledger}); } lsSet(LS.inventory, inventory); e.target.reset(); populateProductSelect(); renderInventory(); renderDashboard(); });

$('#export-inventory')?.addEventListener('click',()=>{ const rows=[['Product Name','Price','Quantity','Ledger','Total Value'], ...inventory.map(i=>[i.productName,i.price,i.quantity,i.ledger,(Number(i.price)||0)*(Number(i.quantity)||0)])]; downloadCSV('inventory.csv', rows); });

// ====== DASHBOARD ======
function renderDashboard(){ const sel = $('#dash-ledger'); if (!sel) return; const ledger = sel.value || ledgers[0] || ''; if (!ledger) { ['#dash-debits','#dash-credits','#dash-receivables','#dash-stock'].forEach(id => { const n=$(id); if(n) n.textContent = fmt.format(0); }); const worthBox = $('#dash-worth'); if (worthBox){ worthBox.textContent = fmt.format(0); worthBox.classList.remove('positive','negative'); } return; } const D = debits.filter(d => d.ledger === ledger).reduce((s,d)=> s + (Number(d.amount)||0), 0); const C = payments.filter(p => p.ledger === ledger).reduce((s,p)=> s + (Number(p.amount)||0), 0); const R = receivables.filter(r => r.ledger === ledger).reduce((s,r)=> s + (Number(r.amount)||0), 0); const S = inventory.filter(i => i.ledger === ledger).reduce((s,i)=> s + (Number(i.price)||0)*(Number(i.quantity)||0), 0); $('#dash-debits').textContent = fmt.format(D); $('#dash-credits').textContent = fmt.format(C); $('#dash-receivables').textContent = fmt.format(R); $('#dash-stock').textContent = fmt.format(S); const W = D - (C + R + S); const worthBox = $('#dash-worth'); worthBox.textContent = fmt.format(W); worthBox.classList.remove('positive','negative'); if (W > 0) worthBox.classList.add('positive'); else if (W < 0) worthBox.classList.add('negative'); }

$('#dash-ledger')?.addEventListener('change', renderDashboard);

// ====== CSV HELPERS ======
function downloadCSV(filename, rows){ const escape = (s)=>{ if(s===null||s===undefined) return ''; s=String(s); if(s.includes(',')||s.includes('"')||s.includes('
')) return '"'+s.replace(/"/g,'""')+'"'; return s; }; const csv = rows.map(r=> r.map(escape).join(',')).join('
'); const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'}); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download=filename; a.click(); URL.revokeObjectURL(url); }

// ====== INIT ======
window.addEventListener('load', () => {
  // Payment mode toggle
  const creditRadio = document.getElementById('mode-credit');
  const debitRadio  = document.getElementById('mode-debit');
  const paymentForm = document.getElementById('payment-form');
  const debitForm   = document.getElementById('debit-form');
  function syncForms(){ if(creditRadio && debitRadio && paymentForm && debitForm){ if(creditRadio.checked){ paymentForm.classList.remove('hidden'); debitForm.classList.add('hidden'); } else if(debitRadio.checked){ debitForm.classList.remove('hidden'); paymentForm.classList.add('hidden'); } } }
  if(creditRadio){ creditRadio.addEventListener('change', syncForms); }
  if(debitRadio){  debitRadio.addEventListener('change', syncForms);  }
  syncForms();

  // Register SW (for offline)
  if('serviceWorker' in navigator){ navigator.serviceWorker.register('sw.js'); }

  // Render all
  renderLedgersUI(); populateLedgerSelects();
  renderPaymentsAll(); renderLedgerBoards();
  renderReceivables();
  populateProductSelect(); renderInventory();
  renderDashboard();
});
