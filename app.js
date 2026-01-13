
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
  payments:   'st_payments',
  receivables:'st_receivables',
  inventory:  'st_inventory',
  favorites:  'st_favorites',
  ledgers:    'st_ledgers',
  debits:     'st_debits',
};

function lsGet(key, fallback) { try { const raw = localStorage.getItem(key); if (!raw) return fallback; return JSON.parse(raw); } catch(e){ return fallback; } }
function lsSet(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch(e) { alert('Save failed'); } }

// ====== STATE ======
let payments   = lsGet(LS.payments, []);       // [{date, name, type, amount, ledger, createdAt}]
let receivables= lsGet(LS.receivables, []);
let inventory  = lsGet(LS.inventory, Object.keys(PRODUCT_CATALOG).map(name => ({ productName: name, price: PRODUCT_CATALOG[name], quantity: 0 })));
let favorites  = lsGet(LS.favorites, []);
let ledgers    = lsGet(LS.ledgers, []);        // ["Main", "Bank A", ...]
let debits     = lsGet(LS.debits, []);         // [{date, invoiceType, invoiceNumber, amount, ledger, createdAt}]

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
  });
});

// ====== LEDGERS ======
function renderLedgersUI(){
  const list = $('#ledger-list'); list.innerHTML = '';
  ledgers.forEach((name, idx) => {
    const wrap = el('span', { className: 'chip-wrap' });
    wrap.appendChild(el('span', { className: 'chip', textContent: name }));
    const x = el('button', { className:'chip-x', textContent:'×', title:'Remove' });
    x.addEventListener('click', () => {
      ledgers.splice(idx,1);
      lsSet(LS.ledgers, ledgers);
      populateLedgerSelects(); renderPaymentsAll(); renderLedgerBoards();
    });
    wrap.appendChild(x);
    list.appendChild(wrap);
  });
}

$('#ledger-add').addEventListener('click', () => {
  const name = $('#ledger-input').value.trim();
  if(!name) return;
  if(ledgers.includes(name)) { alert('Ledger already exists'); return; }
  ledgers.push(name);
  lsSet(LS.ledgers, ledgers);
  $('#ledger-input').value='';
  renderLedgersUI();
  populateLedgerSelects();
});

function populateLedgerSelects(){
  ['#p-ledger','#d-ledger'].forEach(sel => {
    const s = $(sel); if(!s) return; s.innerHTML='';
    const ph = el('option', { value:'', textContent:'Select ledger...' });
    s.appendChild(ph);
    ledgers.forEach(name => s.appendChild(el('option', { value:name, textContent:name })));
  });
}

// ====== PAYMENTS (CREDITS) ======
function renderPaymentsAll(){
  const rows = payments.slice().sort((a,b)=> toDate(a.date)-toDate(b.date)); // earliest -> latest
  const tbody = $('#payments-table tbody'); tbody.innerHTML='';
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
    del.addEventListener('click', () => {
      const gi = payments.findIndex(x=>x===rows[idx]);
      if(gi>=0) { payments.splice(gi,1); lsSet(LS.payments, payments); renderPaymentsAll(); renderLedgerBoards(); }
    });
    tdAct.appendChild(del); tr.appendChild(tdAct); tbody.appendChild(tr);
  });
  $('#payments-total').textContent = fmt.format(total);
}

$('#payment-form').addEventListener('submit', (e)=>{
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
  renderPaymentsAll(); renderLedgerBoards();
});

$('#export-payments').addEventListener('click', ()=>{
  const rows = [['Date','Name','Type','Ledger','Amount'],
    ...payments.slice().sort((a,b)=> toDate(a.date)-toDate(b.date))
      .map(p=>[p.date,p.name,p.type,p.ledger,p.amount])];
  downloadCSV('payments_all.csv', rows);
});

// ====== DEBITS ======
$('#debit-form').addEventListener('submit', (e)=>{
  e.preventDefault();
  const item = {
    createdAt: new Date().toISOString(),
    date:  $('#d-date').value || new Date().toISOString(),
    invoiceType:   $('#d-invtype').value.trim(),
    invoiceNumber: $('#d-invnum').value.trim(),
    amount: Number($('#d-amount').value || 0),
    ledger: $('#d-ledger').value,
  };
  if(!item.ledger){ alert('Please select a ledger'); return; }
  debits.push(item); lsSet(LS.debits, debits);
  e.target.reset();
  renderLedgerBoards();
});

// ====== LEDGER BOARDS ======
function renderLedgerBoards(){
  const container = $('#ledger-boards'); container.innerHTML='';
  ledgers.forEach(name => {
    const credits = payments.filter(p=>p.ledger===name).sort((a,b)=> toDate(a.date)-toDate(b.date)); // earliest -> latest
    const debs    = debits.filter(d=>d.ledger===name).sort((a,b)=> toDate(a.date)-toDate(b.date));  // earliest -> latest

    let totalCredit = credits.reduce((s,p)=> s + (Number(p.amount)||0), 0);
    let totalDebit  = debs.reduce((s,d)=> s + (Number(d.amount)||0), 0);
    const balance = totalDebit - totalCredit;

    const card = el('div', { className:'card' });
    const head = el('div', { className:'card-head' });
    head.appendChild(el('h2', { textContent: `Ledger • ${name}` }));
    const tools = el('div');

    // Statement export (combined Credit + Debit, earliest -> latest)
    const btnStmt = el('button', { className:'secondary', textContent:'Export Statement' });
    btnStmt.addEventListener('click', ()=>{
      const combined = [
        ...credits.map(p=>({kind:'Credit', date:p.date, a:p.name, b:p.type, amount:p.amount})),
        ...debs.map(d=>({kind:'Debit',  date:d.date, a:d.invoiceType, b:d.invoiceNumber, amount:d.amount})),
      ].sort((a,b)=> new Date(a.date) - new Date(b.date));
      const rows = [['Date','Kind','Desc A','Desc B','Amount'],
        ...combined.map(r=>[r.date, r.kind, r.a, r.b, r.amount])];
      downloadCSV(`ledger_${name}_statement.csv`, rows);
    });
    tools.appendChild(btnStmt);
    head.appendChild(tools);
    card.appendChild(head);

    // Combined table for review (not an export)
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
        if(r.isCredit){
          const i = payments.indexOf(r.ref); if(i>=0) payments.splice(i,1); lsSet(LS.payments, payments);
        } else {
          const i = debits.indexOf(r.ref); if(i>=0) debits.splice(i,1); lsSet(LS.debits, debits);
        }
        renderPaymentsAll(); renderLedgerBoards();
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
  const rows = receivables.slice().sort((a,b) => new Date((a.createdAt||a.invoiceDate)) - new Date((b.createdAt||b.invoiceDate)) ).reverse(); // newest first
  const tbody = document.querySelector('#receivables-table tbody');
  tbody.innerHTML = '';
  let total = 0;
  rows.forEach((r, idx) => {
    total += Number(r.amount) || 0;
    const tr = el('tr');
    tr.appendChild(el('td', { textContent: new Date(r.createdAt).toLocaleString() }));
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
  document.querySelector('#receivables-total').textContent = fmt.format(total);
}

function renderFavSelect() {
  const sel = document.querySelector('#r-fav-select'); sel.innerHTML = '';
  const ph = el('option', { value: '', textContent: 'Favorites…' }); sel.appendChild(ph);
  favorites.forEach(name => sel.appendChild(el('option', { value: name, textContent: name })));
  sel.addEventListener('change', () => { if (sel.value) document.querySelector('#r-customer').value = sel.value; sel.value = ''; });
}

function renderFavoritesUI() {
  const list = document.querySelector('#fav-list'); list.innerHTML = '';
  favorites.forEach((name, idx) => {
    const chip = el('span', { className: 'chip', textContent: name });
    const x = el('button', { className: 'chip-x', textContent: '×', title: 'Remove' });
    x.addEventListener('click', () => { favorites.splice(idx,1); lsSet(LS.favorites, favorites); renderReceivables(); });
    const wrap = el('span', { className: 'chip-wrap' }); wrap.appendChild(chip); wrap.appendChild(x); list.appendChild(wrap);
  });
}

function renderCustomerBoards() {
  const container = document.querySelector('#customer-boards'); container.innerHTML = '';
  favorites.forEach(name => {
    const card = el('div', { className: 'card' });
    const head = el('div', { className: 'card-head' }); head.appendChild(el('h2', { textContent: `Receivables • ${name}` })); card.appendChild(head);
    const tbl = el('table', { className: 'data-table' });
    tbl.innerHTML = '<thead><tr><th>Entered</th><th>Invoice Date</th><th>Invoice #</th><th class="right">Amount</th><th>Comment</th><th></th></tr></thead>';
    const tbody = el('tbody');
    const rows = receivables
      .filter(r => r.customerName === name)
      .sort((a,b) => new Date((a.createdAt||a.invoiceDate)) - new Date((b.createdAt||b.invoiceDate)) )
      .reverse();
    let total = 0;
    rows.forEach((r, idx) => {
      total += Number(r.amount) || 0;
      const tr = el('tr');
      tr.appendChild(el('td', { textContent: new Date(r.createdAt).toLocaleString() }));
      tr.appendChild(el('td', { textContent: toDateStr(r.invoiceDate) }));
      tr.appendChild(el('td', { textContent: r.invoiceNumber }));
      tr.appendChild(el('td', { textContent: fmt.format(r.amount), className: 'right' }));
      tr.appendChild(el('td', { textContent: r.comment || '' }));
      const tdAct = el('td'); const del = el('button', { textContent: 'Delete', className: 'secondary' });
      del.addEventListener('click', () => {
        const gi = receivables.findIndex(x => x === rows[idx]);
        if (gi >= 0) receivables.splice(gi,1);
        lsSet(LS.receivables, receivables);
        renderReceivables();
      });
      tdAct.appendChild(del); tr.appendChild(tdAct); tbody.appendChild(tr);
    });
    tbl.appendChild(tbody);
    const tfoot = el('tfoot'); const trf = el('tr');
    trf.appendChild(el('td', { colSpan: 3, className: 'right', textContent: 'Total' }));
    trf.appendChild(el('td', { className: 'right', textContent: fmt.format(total) }));
    trf.appendChild(el('td', {}));
    trf.appendChild(el('td', {}));
    tfoot.appendChild(trf); tbl.appendChild(tfoot);
    card.appendChild(tbl); container.appendChild(card);
  });
}

function renderReceivables() { renderReceivablesAll(); renderFavoritesUI(); renderFavSelect(); renderCustomerBoards(); }

// Receivables form
document.querySelector('#receivable-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const item = {
    createdAt: new Date().toISOString(),
    invoiceDate: document.querySelector('#r-date').value || new Date().toISOString(),
    customerName: document.querySelector('#r-customer').value.trim(),
    invoiceNumber: document.querySelector('#r-number').value.trim(),
    amount: Number(document.querySelector('#r-amount').value || 0),
    comment: document.querySelector('#r-comment').value.trim()
  };
  receivables.push(item); lsSet(LS.receivables, receivables);
  e.target.reset(); renderReceivables();
});

document.querySelector('#export-receivables').addEventListener('click', () => {
  const rows = [['Entered','Invoice Date','Customer Name','Invoice Number','Amount','Comment'],
    ...receivables.map(r => [r.createdAt || '', r.invoiceDate, r.customerName, r.invoiceNumber, r.amount, r.comment])];
  downloadCSV('receivables.csv', rows);
});

// ====== INVENTORY ======
function populateProductSelect(){
  const sel = document.querySelector('#s-product'); sel.innerHTML='';
  Object.keys(PRODUCT_CATALOG).sort().forEach(name=> sel.appendChild(el('option',{value:name,textContent:name})) );
  updatePriceFromCatalog();
}
function updatePriceFromCatalog(){
  const name = document.querySelector('#s-product').value;
  const price = PRODUCT_CATALOG[name];
  document.querySelector('#s-price').value = (price ?? 0).toFixed(2);
}
document.querySelector('#s-product').addEventListener('change', updatePriceFromCatalog);

function renderInventory(){
  const tbody = document.querySelector('#inventory-table tbody'); tbody.innerHTML='';
  let total=0;
  inventory.forEach((i, idx)=>{
    total += (Number(i.price)||0)*(Number(i.quantity)||0);
    const tr = el('tr');
    tr.appendChild(el('td',{textContent:i.productName}));
    tr.appendChild(el('td',{textContent:fmt.format(i.price), className:'right'}));
    const qtyTd = el('td',{className:'right'});
    const qtyInput = el('input',{type:'number',min:'0',step:'1',value:i.quantity});
    qtyInput.addEventListener('change',()=>{
      i.quantity = Number(qtyInput.value||0);
      lsSet(LS.inventory, inventory);
      renderInventory();
    });
    qtyTd.appendChild(qtyInput); tr.appendChild(qtyTd);
    tr.appendChild(el('td',{textContent:fmt.format((Number(i.price)||0)*(Number(i.quantity)||0)), className:'right'}));
    const tdAct=el('td'); const del=el('button',{textContent:'Delete',className:'secondary'});
    del.addEventListener('click',()=>{inventory.splice(idx,1); lsSet(LS.inventory, inventory); renderInventory();});
    tdAct.appendChild(del); tr.appendChild(tdAct); tbody.appendChild(tr);
  });
  document.querySelector('#inventory-total').textContent = fmt.format(total);
}

document.querySelector('#stock-form').addEventListener('submit',(e)=>{
  e.preventDefault();
  const name=document.querySelector('#s-product').value;
  const price=Number(document.querySelector('#s-price').value||0);
  const qty=Number(document.querySelector('#s-qty').value||0);
  const idx=inventory.findIndex(x=>x.productName===name);
  if(idx>=0){ inventory[idx].price=price; inventory[idx].quantity=qty; }
  else { inventory.push({productName:name, price, quantity:qty}); }
  lsSet(LS.inventory, inventory);
  e.target.reset();
  populateProductSelect(); renderInventory();
});

document.querySelector('#export-inventory').addEventListener('click',()=>{
  const rows=[['Product Name','Price','Quantity','Total Value'],
    ...inventory.map(i=>[i.productName,i.price,i.quantity,(Number(i.price)||0)*(Number(i.quantity)||0)])];
  downloadCSV('inventory.csv', rows);
});

// ====== CSV HELPERS ======
function downloadCSV(filename, rows){
  const escape = (s)=>{
    if(s===null||s===undefined) return '';
    s=String(s);
    if(s.includes(',')||s.includes('"')||s.includes('\n')) return '"'+s.replace(/"/g,'""')+'"';
    return s;
  };
  const csv = rows.map(r=> r.map(escape).join(',')).join('\n');
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download=filename; a.click();
  URL.revokeObjectURL(url);
}

// ====== INIT ======
window.addEventListener('load', () => {
  // Payment mode toggle
  const creditRadio = document.getElementById('mode-credit');
  const debitRadio  = document.getElementById('mode-debit');
  const paymentForm = document.getElementById('payment-form');
  const debitForm   = document.getElementById('debit-form');
  function syncForms(){
    if(creditRadio && debitRadio && paymentForm && debitForm){
      if(creditRadio.checked){ paymentForm.classList.remove('hidden'); debitForm.classList.add('hidden'); }
      else if(debitRadio.checked){ debitForm.classList.remove('hidden'); paymentForm.classList.add('hidden'); }
    }
  }
  if(creditRadio){ creditRadio.addEventListener('change', syncForms); }
  if(debitRadio){  debitRadio.addEventListener('change', syncForms);  }
  syncForms();

  // Register SW (for offline)
  if('serviceWorker' in navigator){ navigator.serviceWorker.register('sw.js'); }

  // Render all
  renderLedgersUI(); populateLedgerSelects(); renderPaymentsAll(); renderLedgerBoards();
  renderReceivables();
  populateProductSelect(); renderInventory();
});
