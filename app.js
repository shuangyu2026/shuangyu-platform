// === 双鱼配送管理平台 v3.0 - Supabase 全数据同步版 ===
// 内网外网共用同一个 Supabase 数据库，真正实现多端同步

// === Supabase 配置（硬编码，与内网 NoCode 共用同一个项目） ===
var SUPABASE_URL = 'https://vezhaacuwtdambltjcmk.supabase.co';
var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlemhhYWN1d3RkYW1ibHRqY21rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1ODMxNDEsImV4cCI6MjA5NjE1OTE0MX0.dEooXVfyCeuEQmM9nJfGOj7fWfcEwCMihiN1BUVK2G0';
var db = null;

function initSupabase() {
  if (window.supabase && window.supabase.createClient) {
    db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    return true;
  }
  return false;
}

// === 应用状态 ===
var appData = { deliveries: [], drivers: [], merchants: [], pricing: { start_price: 280, price_per_km: 2.6, price_per_point: 18 } };
var driverPhotos = {};
var currentPage = 'dashboard';
var pages = [
  { id: 'dashboard', label: '数据总览', icon: '📊' },
  { id: 'delivery', label: '配送记录', icon: '📦' },
  { id: 'drivers', label: '骑手管理', icon: '🏍' },
  { id: 'stores', label: '门店维护', icon: '🏪' },
  { id: 'billing', label: '计费配置', icon: '💰' }
];

// === 导航 ===
function initNav() {
  document.getElementById('navList').innerHTML = pages.map(function(p) { return '<div class="nav-item ' + (p.id === currentPage ? 'active' : '') + '" onclick="switchPage(\'' + p.id + '\')">' + p.icon + ' ' + p.label + '</div>'; }).join('');
  document.getElementById('mobileNav').innerHTML = pages.map(function(p) { return '<div class="mobile-nav-item ' + (p.id === currentPage ? 'active' : '') + '" onclick="switchPage(\'' + p.id + '\')"><span style="font-size:18px">' + p.icon + '</span>' + p.label + '</div>'; }).join('');
}
function switchPage(id) { currentPage = id; initNav(); renderPage(); }
function renderPage() { ({ dashboard: renderDashboard, delivery: renderDelivery, drivers: renderDrivers, stores: renderStores, billing: renderBilling })[currentPage](); }

function calcGross(r) { var c = appData.pricing || {}; return Number(c.start_price || 280) + (r.distance_km || 0) * Number(c.price_per_km || 2.6) + (r.delivery_points || 0) * Number(c.price_per_point || 18) + Number(r.upstairs_fee_total || 0); }

// === Supabase 数据操作 ===
async function loadAllData() {
  if (!db) { setSyncStatus('Supabase 未连接'); return; }
  setSyncStatus('加载中...');
  try {
    var [delResp, drvResp, merResp, priResp, photoResp] = await Promise.all([
      db.from('deliveries').select('*'),
      db.from('drivers').select('*'),
      db.from('merchants').select('*'),
      db.from('pricing').select('*').eq('id', 'default').single(),
      db.from('driver_photos').select('*')
    ]);
    if (delResp.data) appData.deliveries = delResp.data;
    if (drvResp.data) appData.drivers = drvResp.data;
    if (merResp.data) appData.merchants = merResp.data;
    if (priResp.data) appData.pricing = priResp.data;
    if (photoResp.data) {
      driverPhotos = {};
      photoResp.data.forEach(function(row) { driverPhotos[row.driver_id] = { photo_url: row.photo_url, file_name: row.file_name }; });
    }
    setSyncStatus('已同步 ' + new Date().toLocaleTimeString());
  } catch (e) {
    console.error('加载数据失败:', e);
    setSyncStatus('加载失败');
  }
}

function setSyncStatus(msg) {
  var el = document.getElementById('syncStatus');
  if (el) el.textContent = msg;
}

// === CRUD: Deliveries ===
async function saveDelivery(record, isNew) {
  if (!db) return;
  if (isNew) {
    var resp = await db.from('deliveries').insert(record);
    if (resp.error) { alert('保存失败: ' + resp.error.message); return false; }
  } else {
    var resp2 = await db.from('deliveries').update(record).eq('id', record.id);
    if (resp2.error) { alert('更新失败: ' + resp2.error.message); return false; }
  }
  return true;
}
async function removeDelivery(id) {
  if (!db) return;
  await db.from('deliveries').delete().eq('id', id);
}

// === CRUD: Drivers ===
async function saveDriver(record, isNew) {
  if (!db) return;
  if (isNew) {
    var resp = await db.from('drivers').insert(record);
    if (resp.error) { alert('保存失败: ' + resp.error.message); return false; }
  } else {
    var resp2 = await db.from('drivers').update(record).eq('id', record.id);
    if (resp2.error) { alert('更新失败: ' + resp2.error.message); return false; }
  }
  return true;
}
async function removeDriver(id) {
  if (!db) return;
  await db.from('drivers').delete().eq('id', id);
}

// === CRUD: Merchants ===
async function saveMerchant(record, isNew) {
  if (!db) return;
  if (isNew) {
    var resp = await db.from('merchants').insert(record);
    if (resp.error) { alert('保存失败: ' + resp.error.message); return false; }
  } else {
    var resp2 = await db.from('merchants').update(record).eq('id', record.id);
    if (resp2.error) { alert('更新失败: ' + resp2.error.message); return false; }
  }
  return true;
}
async function removeMerchant(id) {
  if (!db) return;
  await db.from('merchants').delete().eq('id', id);
}

// === CRUD: Pricing ===
async function savePricing(pricing) {
  if (!db) return;
  pricing.id = 'default';
  pricing.updated_at = new Date().toISOString();
  await db.from('pricing').upsert(pricing);
}

// === Photo functions ===
async function uploadDriverPhoto(driverId, driverName, file) {
  if (!db) { alert('Supabase 未连接'); return null; }
  try {
    var ext = file.name.split('.').pop();
    var fileName = driverId + '_' + Date.now() + '.' + ext;
    if (driverPhotos[driverId] && driverPhotos[driverId].file_name) {
      await db.storage.from('driver-photos').remove([driverPhotos[driverId].file_name]);
    }
    var upResp = await db.storage.from('driver-photos').upload(fileName, file, { cacheControl: '3600', upsert: true });
    if (upResp.error) { alert('上传失败: ' + upResp.error.message); return null; }
    var urlResp = db.storage.from('driver-photos').getPublicUrl(fileName);
    var photoUrl = urlResp.data.publicUrl;
    var dbResp = await db.from('driver_photos').upsert({
      driver_id: driverId, driver_name: driverName, photo_url: photoUrl, file_name: fileName, updated_at: new Date().toISOString()
    }, { onConflict: 'driver_id' });
    if (dbResp.error) { alert('数据库写入失败: ' + dbResp.error.message); return null; }
    driverPhotos[driverId] = { photo_url: photoUrl, file_name: fileName };
    return photoUrl;
  } catch (e) { alert('上传异常: ' + e.message); return null; }
}

async function deleteDriverPhoto(driverId) {
  if (!db) return;
  try {
    if (driverPhotos[driverId] && driverPhotos[driverId].file_name) {
      await db.storage.from('driver-photos').remove([driverPhotos[driverId].file_name]);
    }
    await db.from('driver_photos').delete().eq('driver_id', driverId);
    delete driverPhotos[driverId];
  } catch (e) { console.warn('删除照片异常:', e); }
}

function getDriverPhotoHtml(driverId, driverName, size) {
  var p = driverPhotos[driverId];
  if (p && p.photo_url) {
    var cls = size === 'large' ? 'driver-photo-large' : 'driver-photo';
    return '<img class="' + cls + '" src="' + p.photo_url + '" alt="' + driverName + '" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'" /><div class="driver-avatar" style="display:none">' + (driverName ? driverName[0] : '?') + '</div>';
  }
  return '<div class="driver-avatar">' + (driverName ? driverName[0] : '?') + '</div>';
}

// === DASHBOARD ===
function renderDashboard() {
  var d = appData.deliveries || [], tt = d.length, tk = d.reduce(function(s, r) { return s + (r.distance_km || 0); }, 0), tr = d.reduce(function(s, r) { return s + calcGross(r); }, 0), av = tt ? tr / tt : 0;
  var dm = {}; d.forEach(function(r) { var n = r.driver_name || '?'; if (!dm[n]) dm[n] = { t: 0, r: 0, k: 0 }; dm[n].t++; dm[n].r += calcGross(r); dm[n].k += (r.distance_km || 0); });
  var dtm = {}; d.forEach(function(r) { var dt = r.delivery_date || ''; if (!dtm[dt]) dtm[dt] = { t: 0, r: 0 }; dtm[dt].t++; dtm[dt].r += calcGross(r); });
  var dates = Object.keys(dtm).sort().slice(-7);
  var dr = Object.entries(dm).sort(function(a, b) { return b[1].t - a[1].t; }).map(function(e) { return '<tr><td style="font-weight:500">' + e[0] + '</td><td style="text-align:right">' + e[1].t + '</td><td style="text-align:right">' + e[1].k.toFixed(1) + '</td><td style="text-align:right;color:#16a34a">\u00a5' + e[1].r.toFixed(0) + '</td></tr>'; }).join('');
  var m = document.getElementById('main-content');
  m.innerHTML = '<div class="page-header"><div><h2>数据总览</h2><p class="subtitle">配送业务数据概览与统计分析</p></div><button class="btn btn-outline" onclick="refreshData()">🔄 刷新数据</button></div><div class="stats-grid"><div class="stat-card"><div class="stat-label">总单数</div><div class="stat-value">' + tt + '</div></div><div class="stat-card"><div class="stat-label">总公里</div><div class="stat-value" style="color:#2563eb">' + tk.toFixed(1) + 'km</div></div><div class="stat-card"><div class="stat-label">总收入</div><div class="stat-value" style="color:#16a34a">\u00a5' + tr.toFixed(0) + '</div></div><div class="stat-card"><div class="stat-label">单均</div><div class="stat-value" style="color:#ea580c">\u00a5' + av.toFixed(1) + '</div></div></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px"><div class="card"><h4 style="margin:0 0 12px;font-size:14px;font-weight:600">日配送趋势</h4><div class="chart-box"><canvas id="cBar"></canvas></div></div><div class="card"><h4 style="margin:0 0 12px;font-size:14px;font-weight:600">日收入趋势</h4><div class="chart-box"><canvas id="cLine"></canvas></div></div></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:16px"><div class="card"><h4 style="margin:0 0 12px;font-size:14px;font-weight:600">骑手占比</h4><div class="chart-box"><canvas id="cPie"></canvas></div></div><div class="card"><h4 style="margin:0 0 12px;font-size:14px;font-weight:600">骑手统计</h4><table class="data-table"><thead><tr><th>骑手</th><th style="text-align:right">单数</th><th style="text-align:right">公里</th><th style="text-align:right">收入</th></tr></thead><tbody>' + dr + '</tbody></table></div></div>';
  setTimeout(function() {
    var cl = ['#ea580c', '#2563eb', '#16a34a', '#8b5cf6', '#ec4899', '#f59e0b', '#06b6d4'];
    var b = document.getElementById('cBar'); if (b) new Chart(b, { type: 'bar', data: { labels: dates.map(function(x) { return x.slice(5); }), datasets: [{ data: dates.map(function(x) { return dtm[x] ? dtm[x].t : 0; }), backgroundColor: '#fb923c', borderRadius: 6 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } } });
    var l = document.getElementById('cLine'); if (l) new Chart(l, { type: 'line', data: { labels: dates.map(function(x) { return x.slice(5); }), datasets: [{ data: dates.map(function(x) { return dtm[x] ? dtm[x].r.toFixed(0) : 0; }), borderColor: '#16a34a', backgroundColor: 'rgba(22,163,106,.1)', fill: true, tension: .4 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } } });
    var p = document.getElementById('cPie'); if (p) { var ns = Object.keys(dm); new Chart(p, { type: 'doughnut', data: { labels: ns, datasets: [{ data: ns.map(function(n) { return dm[n].t; }), backgroundColor: cl.slice(0, ns.length) }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { font: { size: 11 } } } } } }); }
  }, 50);
}

// === DELIVERY ===
var delS = { search: '', driver: '', page: 1, ps: 10 };
function renderDelivery() {
  var list = (appData.deliveries || []).slice();
  if (delS.search) { var s = delS.search.toLowerCase(); list = list.filter(function(r) { return (r.id || '').toLowerCase().indexOf(s) >= 0 || (r.merchant_name || '').toLowerCase().indexOf(s) >= 0 || (r.driver_name || '').toLowerCase().indexOf(s) >= 0; }); }
  if (delS.driver) list = list.filter(function(r) { return r.driver_name === delS.driver; });
  list.sort(function(a, b) { return (b.delivery_date || '').localeCompare(a.delivery_date || ''); });
  var tot = list.length, tp = Math.ceil(tot / delS.ps) || 1; if (delS.page > tp) delS.page = tp;
  var st = (delS.page - 1) * delS.ps, pg = list.slice(st, st + delS.ps);
  var tRev = list.reduce(function(s, r) { return s + calcGross(r); }, 0), tKm = list.reduce(function(s, r) { return s + (r.distance_km || 0); }, 0);
  var dns = []; var sn = {}; (appData.deliveries || []).forEach(function(r) { if (r.driver_name && !sn[r.driver_name]) { sn[r.driver_name] = 1; dns.push(r.driver_name); } });
  var rows = pg.map(function(r) { return '<tr><td style="font-family:monospace;font-size:11px;color:#94a3b8">' + r.id + '</td><td>' + (r.delivery_date || '-') + '</td><td><span class="badge badge-orange">' + (r.driver_name || '-') + '</span></td><td>' + (r.merchant_name || '-') + '</td><td>' + (r.distance_km || 0).toFixed(1) + '</td><td>' + (r.delivery_points || 0) + '</td><td>' + (r.upstairs_fee_total ? '\u00a5' + r.upstairs_fee_total : '-') + '</td><td style="font-weight:600;color:#16a34a">\u00a5' + calcGross(r).toFixed(0) + '</td><td><button class="btn-icon" onclick="openDM(\'' + r.id + '\')">编辑</button> <button class="btn-icon danger" onclick="delDel(\'' + r.id + '\')">删除</button></td></tr>'; }).join('');
  var dOpts = dns.map(function(n) { return '<option value="' + n + '"' + (delS.driver === n ? ' selected' : '') + '>' + n + '</option>'; }).join('');
  var m = document.getElementById('main-content');
  m.innerHTML = '<div class="page-header"><div><h2>配送记录</h2><p class="subtitle">管理所有配送单据</p></div><div style="display:flex;gap:8px"><button class="btn btn-outline" onclick="exportCSV()">导出</button><button class="btn btn-primary" onclick="openDM()">+ 新增</button></div></div><div class="stats-grid"><div class="stat-card"><div class="stat-label">筛选结果</div><div class="stat-value">' + tot + '单</div></div><div class="stat-card"><div class="stat-label">总公里</div><div class="stat-value" style="color:#2563eb">' + tKm.toFixed(1) + '</div></div><div class="stat-card"><div class="stat-label">总收入</div><div class="stat-value" style="color:#16a34a">\u00a5' + tRev.toFixed(0) + '</div></div></div><div class="card" style="margin-bottom:16px"><div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap"><input style="flex:1;min-width:180px;padding:8px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px" placeholder="搜索单号/门店/骑手..." value="' + delS.search + '" oninput="delS.search=this.value;delS.page=1;renderDelivery()"><select style="padding:8px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px" onchange="delS.driver=this.value;delS.page=1;renderDelivery()"><option value="">全部骑手</option>' + dOpts + '</select><span style="font-size:12px;color:#94a3b8;margin-left:auto">共' + tot + '条</span></div></div><div class="card" style="padding:0;overflow:hidden"><table class="data-table"><thead><tr><th>单号</th><th>日期</th><th>骑手</th><th>门店</th><th>km</th><th>站点</th><th>上楼费</th><th>毛收入</th><th>操作</th></tr></thead><tbody>' + (pg.length ? rows : '<tr><td colspan="9" style="text-align:center;padding:40px;color:#94a3b8">暂无数据</td></tr>') + '</tbody></table>' + (tp > 1 ? '<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-top:1px solid #f1f5f9"><span style="font-size:12px;color:#94a3b8">第' + delS.page + '/' + tp + '页</span><div style="display:flex;gap:4px"><button class="btn-outline" style="padding:4px 10px" ' + (delS.page <= 1 ? 'disabled' : '') + ' onclick="delS.page--;renderDelivery()">&lt;</button><button class="btn-outline" style="padding:4px 10px" ' + (delS.page >= tp ? 'disabled' : '') + ' onclick="delS.page++;renderDelivery()">&gt;</button></div></div>' : '') + '</div>';
}

function openDM(id) {
  var r = id ? (appData.deliveries || []).find(function(x) { return x.id === id; }) : null;
  var dns = []; var sn = {}; (appData.deliveries || []).concat(appData.drivers || []).forEach(function(x) { var n = x.driver_name || x.name; if (n && !sn[n]) { sn[n] = 1; dns.push(n); } });
  var mns = (appData.merchants || []).map(function(x) { return x.name; });
  var dO = dns.map(function(n) { return '<option value="' + n + '"' + (r && r.driver_name === n ? ' selected' : '') + '>' + n + '</option>'; }).join('');
  var mO = mns.map(function(n) { return '<option value="' + n + '"' + (r && r.merchant_name === n ? ' selected' : '') + '>' + n + '</option>'; }).join('');
  showModal(r ? '编辑记录' : '新增记录', '<div class="form-group"><label>日期 *</label><input type="date" id="f-date" value="' + (r ? r.delivery_date : new Date().toISOString().slice(0, 10)) + '"></div><div class="form-group"><label>骑手 *</label><select id="f-driver"><option value="">--</option>' + dO + '</select></div><div class="form-group"><label>门店</label><select id="f-merchant"><option value="">--</option>' + mO + '</select></div><div class="form-row"><div class="form-group"><label>公里</label><input type="number" step="0.1" id="f-km" value="' + (r ? r.distance_km : '') + '"></div><div class="form-group"><label>站点</label><input type="number" id="f-pts" value="' + (r ? r.delivery_points : '') + '"></div><div class="form-group"><label>上楼费</label><input type="number" id="f-up" value="' + (r ? r.upstairs_fee_total : '') + '"></div></div>', async function() {
    var dt = document.getElementById('f-date').value, dn = document.getElementById('f-driver').value;
    if (!dt || !dn) { alert('请填写必填项'); return; }
    var o = { delivery_date: dt, driver_name: dn, merchant_name: document.getElementById('f-merchant').value, distance_km: Number(document.getElementById('f-km').value) || 0, delivery_points: Number(document.getElementById('f-pts').value) || 0, upstairs_fee_total: Number(document.getElementById('f-up').value) || 0, updated_at: new Date().toISOString() };
    if (r) { o.id = r.id; await saveDelivery(o, false); }
    else { o.id = 'del-' + Date.now(); o.created_at = new Date().toISOString(); await saveDelivery(o, true); }
    closeModal(); await loadAllData(); renderDelivery();
  });
}
async function delDel(id) { if (!confirm('确定删除?')) return; await removeDelivery(id); await loadAllData(); renderDelivery(); }
function exportCSV() { var rs = [['单号', '日期', '骑手', '门店', 'km', '站点', '上楼费', '毛收入']]; (appData.deliveries || []).forEach(function(r) { rs.push([r.id, r.delivery_date, r.driver_name, r.merchant_name, r.distance_km, r.delivery_points, r.upstairs_fee_total, calcGross(r).toFixed(2)]); }); var csv = '\ufeff' + rs.map(function(r) { return r.join(','); }).join('\n'); var b = new Blob([csv], { type: 'text/csv;charset=utf-8' }); var a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'deliveries.csv'; a.click(); }

// === DRIVERS ===
function renderDrivers() {
  var drs = appData.drivers || [], dl = appData.deliveries || [];
  var ds = drs.map(function(dr) { var ts = dl.filter(function(x) { return x.driver_name === dr.name; }); return { id: dr.id, name: dr.name, phone: dr.phone || '', plate: dr.plate || '', trips: ts.length, rev: ts.reduce(function(s, x) { return s + calcGross(x); }, 0), km: ts.reduce(function(s, x) { return s + (x.distance_km || 0); }, 0) }; });
  var cards = ds.map(function(dr) {
    var photoHtml = getDriverPhotoHtml(dr.id, dr.name, 'small');
    return '<div class="driver-card"><div class="driver-header">' + photoHtml + '<div><div class="driver-name">' + dr.name + '</div><div class="driver-info">' + dr.phone + ' ' + dr.plate + '</div></div></div><div class="driver-stats"><span>单量:' + dr.trips + '</span><span>收入:\u00a5' + dr.rev.toFixed(0) + '</span><span>km:' + dr.km.toFixed(1) + '</span></div><div class="driver-actions"><label class="photo-upload-btn"><input type="file" accept="image/*" style="display:none" onchange="handlePhotoUpload(\'' + dr.id + '\',\'' + dr.name + '\',this)">📷 照片</label><button class="btn-icon" onclick="openDrM(\'' + dr.id + '\')">编辑</button><button class="btn-icon danger" onclick="delDr(\'' + dr.id + '\')">删除</button></div></div>';
  }).join('');
  var connStatus = db ? '<span style="color:#16a34a">✓ 数据库已连接</span>' : '<span style="color:#dc2626">✗ 未连接</span>';
  document.getElementById('main-content').innerHTML = '<div class="page-header"><div><h2>骑手管理</h2><p class="subtitle">管理骑手信息与业绩 | ' + connStatus + '</p></div><button class="btn btn-primary" onclick="openDrM()">+ 添加</button></div><div class="stats-grid"><div class="stat-card"><div class="stat-label">骑手数</div><div class="stat-value">' + drs.length + '</div></div><div class="stat-card"><div class="stat-label">总单数</div><div class="stat-value">' + dl.length + '</div></div><div class="stat-card"><div class="stat-label">总收入</div><div class="stat-value" style="color:#16a34a">\u00a5' + dl.reduce(function(s, x) { return s + calcGross(x); }, 0).toFixed(0) + '</div></div></div><div class="card"><div class="driver-grid">' + cards + '</div></div>';
}

async function handlePhotoUpload(driverId, driverName, input) {
  var file = input.files && input.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) { alert('照片大小不能超过 5MB'); return; }
  var btn = input.parentElement;
  btn.innerHTML = '<span style="color:#ea580c">上传中...</span>';
  try {
    var ext = file.name.split('.').pop();
    var fileName = driverId + '_' + Date.now() + '.' + ext;
    if (driverPhotos[driverId] && driverPhotos[driverId].file_name) {
      await db.storage.from('driver-photos').remove([driverPhotos[driverId].file_name]);
    }
    var upResp = await db.storage.from('driver-photos').upload(fileName, file, { cacheControl: '3600', upsert: true });
    if (upResp.error) { alert('上传失败: ' + upResp.error.message); renderDrivers(); return; }
    var urlResp = db.storage.from('driver-photos').getPublicUrl(fileName);
    var photoUrl = urlResp.data.publicUrl;
    var dbResp = await db.from('driver_photos').upsert({ driver_id: driverId, driver_name: driverName, photo_url: photoUrl, file_name: fileName, updated_at: new Date().toISOString() }, { onConflict: 'driver_id' });
    if (dbResp.error) { alert('数据库写入失败: ' + dbResp.error.message); renderDrivers(); return; }
    driverPhotos[driverId] = { photo_url: photoUrl, file_name: fileName };
    renderDrivers();
  } catch(e) { alert('上传异常: ' + e.message); renderDrivers(); }
}

async function handlePhotoDelete(driverId) {
  if (!confirm('确定删除该骑手照片?')) return;
  try {
    if (driverPhotos[driverId] && driverPhotos[driverId].file_name) {
      await db.storage.from('driver-photos').remove([driverPhotos[driverId].file_name]);
    }
    await db.from('driver_photos').delete().eq('driver_id', driverId);
    delete driverPhotos[driverId];
  } catch(e) { console.warn('删除照片异常:', e); }
  closeModal();
  renderDrivers();
}

function openDrM(id) {
  var dr = id ? (appData.drivers || []).find(function(x) { return x.id === id; }) : null;
  var photoSection = '';
  if (dr) {
    var p = driverPhotos[dr.id];
    if (p && p.photo_url) {
      photoSection = '<div class="form-group"><label>当前照片</label><div class="photo-preview"><img class="driver-photo-large" src="' + p.photo_url + '" /><button class="photo-delete-btn" type="button" onclick="handlePhotoDelete(\'' + dr.id + '\')">×</button></div></div>';
    } else {
      photoSection = '<div class="form-group"><label>照片</label><div style="color:#94a3b8;font-size:12px">暂无照片，可在卡片上点击📷上传</div></div>';
    }
  }
  showModal(dr ? '编辑骑手' : '添加骑手', '<div class="form-group"><label>姓名 *</label><input id="f-name" value="' + (dr ? dr.name : '') + '"></div><div class="form-group"><label>电话</label><input id="f-phone" value="' + (dr ? dr.phone : '') + '"></div><div class="form-group"><label>车牌</label><input id="f-plate" value="' + (dr ? dr.plate : '') + '"></div>' + photoSection, function() {
    var nm = document.getElementById('f-name').value.trim(); if (!nm) { alert('姓名不能为空'); return; }
    var ph = document.getElementById('f-phone').value, pl = document.getElementById('f-plate').value;
    if (dr) {
      Object.assign(dr, { name: nm, phone: ph, plate: pl });
      db.from('drivers').update({ name: nm, phone: ph, plate: pl, updated_at: new Date().toISOString() }).eq('id', dr.id).then(function() { closeModal(); renderDrivers(); });
    } else {
      var newDr = { id: 'DRV' + Date.now(), name: nm, phone: ph, plate: pl };
      appData.drivers.push(newDr);
      db.from('drivers').insert(newDr).then(function() { closeModal(); renderDrivers(); });
    }
  });
}

async function delDr(id) {
  if (!confirm('确定删除该骑手?')) return;
  appData.drivers = appData.drivers.filter(function(x) { return x.id !== id; });
  await db.from('drivers').delete().eq('id', id);
  if (driverPhotos[id] && driverPhotos[id].file_name) {
    await db.storage.from('driver-photos').remove([driverPhotos[id].file_name]);
    await db.from('driver_photos').delete().eq('driver_id', id);
    delete driverPhotos[id];
  }
  renderDrivers();
}

// === STORES ===
function renderStores() {
  var st = appData.merchants || [], wu = st.filter(function(s) { return s.has_upstairs; }).length;
  var rows = st.map(function(s, i) { return '<tr><td>' + (i + 1) + '</td><td style="font-weight:500">' + s.name + '</td><td>' + (s.has_upstairs ? '<span class="badge badge-green">有上楼费</span>' : '<span class="badge">无</span>') + '</td><td>' + (s.has_upstairs ? '¥' + Number(s.upstairs_fee || 0) : '—') + '</td><td><button class="btn-icon" onclick="openStM(\'' + s.id + '\')">编辑</button> <button class="btn-icon danger" onclick="delSt(\'' + s.id + '\')">删除</button></td></tr>'; }).join('');
  document.getElementById('main-content').innerHTML = '<div class="page-header"><div><h2>上楼门店维护</h2><p class="subtitle">维护门店上楼费配置</p></div><button class="btn btn-primary" onclick="openStM()">+ 添加</button></div><div class="stats-grid"><div class="stat-card"><div class="stat-label">门店总数</div><div class="stat-value">' + st.length + '</div></div><div class="stat-card"><div class="stat-label">含上楼费</div><div class="stat-value" style="color:#16a34a">' + wu + '</div></div><div class="stat-card"><div class="stat-label">无上楼费</div><div class="stat-value" style="color:#94a3b8">' + (st.length - wu) + '</div></div></div><div class="card" style="padding:0;overflow:hidden"><table class="data-table"><thead><tr><th>#</th><th>门店</th><th>上楼</th><th>费用</th><th>操作</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
}

function openStM(id) {
  var s = id ? (appData.merchants || []).find(function(x) { return x.id === id; }) : null;
  showModal(s ? '编辑门店' : '添加门店', '<div class="form-group"><label>名称 *</label><input id="f-name" value="' + (s ? s.name : '') + '"></div><div class="form-group"><label><input type="checkbox" id="f-up" ' + (s && s.has_upstairs ? 'checked' : '') + ' onchange="document.getElementById(\'f-fee-r\').style.display=this.checked?\'block\':\'none\'"> 有上楼费</label></div><div id="f-fee-r" style="display:' + (s && s.has_upstairs ? 'block' : 'none') + '"><div class="form-group"><label>金额(元/次)</label><input type="number" id="f-fee" value="' + (s ? s.upstairs_fee : '') + '"></div></div>', function() {
    var nm = document.getElementById('f-name').value.trim(); if (!nm) { alert('名称不能为空'); return; }
    var hu = document.getElementById('f-up').checked, uf = hu ? Number(document.getElementById('f-fee').value) || 0 : 0;
    if (s) {
      Object.assign(s, { name: nm, has_upstairs: hu, upstairs_fee: uf });
      db.from('merchants').update({ name: nm, has_upstairs: hu, upstairs_fee: uf, updated_at: new Date().toISOString() }).eq('id', s.id).then(function() { closeModal(); renderStores(); });
    } else {
      var newSt = { id: 'MER' + Date.now(), name: nm, has_upstairs: hu, upstairs_fee: uf };
      appData.merchants.push(newSt);
      db.from('merchants').insert(newSt).then(function() { closeModal(); renderStores(); });
    }
  });
}

async function delSt(id) {
  if (!confirm('确定删除?')) return;
  appData.merchants = appData.merchants.filter(function(x) { return x.id !== id; });
  await db.from('merchants').delete().eq('id', id);
  renderStores();
}

// === BILLING ===
function renderBilling() {
  var c = appData.pricing || { start_price: 280, price_per_km: 2.6, price_per_point: 18 };
  document.getElementById('main-content').innerHTML = '<div class="page-header"><div><h2>计费配置</h2><p class="subtitle">配置费用计算规则</p></div><button class="btn btn-primary" onclick="editBill()">编辑</button></div><div class="stats-grid"><div class="stat-card"><div class="stat-label">起步价</div><div class="stat-value">¥' + c.start_price + '</div><div class="stat-sub">元/单</div></div><div class="stat-card"><div class="stat-label">公里单价</div><div class="stat-value" style="color:#ea580c">¥' + c.price_per_km + '</div><div class="stat-sub">元/km</div></div><div class="stat-card"><div class="stat-label">站点单价</div><div class="stat-value" style="color:#16a34a">¥' + c.price_per_point + '</div><div class="stat-sub">元/站</div></div></div><div class="card" style="background:linear-gradient(135deg,#1e293b,#0f172a);color:#fff;padding:24px"><h4 style="color:#fb923c;margin:0 0 12px">计费公式</h4><div style="background:rgba(255,255,255,.05);padding:16px;border-radius:8px;font-family:monospace;font-size:13px"><p style="color:#fdba74;margin:0">毛收入 = 起步价 + km×公里单价 + 站点×站点单价 + 上楼费</p><p style="color:#86efac;margin:8px 0 0">净收入 = 毛收入 × (1-9%税)</p></div></div><div class="card"><h4 style="margin:0 0 16px;font-size:14px;font-weight:600">费用试算</h4><div class="form-row"><div class="form-group"><label>公里</label><input type="number" id="d-km" value="30" oninput="cDemo()"></div><div class="form-group"><label>站点</label><input type="number" id="d-pt" value="6" oninput="cDemo()"></div><div class="form-group"><label>上楼费</label><input type="number" id="d-up" value="100" oninput="cDemo()"></div></div><div class="stats-grid" style="margin-top:16px"><div class="stat-card"><div class="stat-label">毛收入</div><div class="stat-value" id="d-g">—</div></div><div class="stat-card"><div class="stat-label">净收入(扣9%)</div><div class="stat-value" style="color:#16a34a" id="d-n">—</div></div></div></div>';
  cDemo();
}

function cDemo() {
  var c = appData.pricing || { start_price: 280, price_per_km: 2.6, price_per_point: 18 };
  var km = Number(document.getElementById('d-km') && document.getElementById('d-km').value) || 0;
  var pt = Number(document.getElementById('d-pt') && document.getElementById('d-pt').value) || 0;
  var up = Number(document.getElementById('d-up') && document.getElementById('d-up').value) || 0;
  var g = Number(c.start_price) + km * Number(c.price_per_km) + pt * Number(c.price_per_point) + up;
  var ge = document.getElementById('d-g'), ne = document.getElementById('d-n');
  if (ge) ge.textContent = '¥' + g.toFixed(2);
  if (ne) ne.textContent = '¥' + (g * 0.91).toFixed(2);
}

function editBill() {
  var c = appData.pricing || { start_price: 280, price_per_km: 2.6, price_per_point: 18 };
  showModal('编辑计费', '<div class="form-group"><label>起步价</label><input type="number" id="f-sp" value="' + c.start_price + '"></div><div class="form-group"><label>公里单价</label><input type="number" step="0.1" id="f-pk" value="' + c.price_per_km + '"></div><div class="form-group"><label>站点单价</label><input type="number" step="0.1" id="f-pp" value="' + c.price_per_point + '"></div>', function() {
    appData.pricing = { start_price: Number(document.getElementById('f-sp').value) || 280, price_per_km: Number(document.getElementById('f-pk').value) || 2.6, price_per_point: Number(document.getElementById('f-pp').value) || 18 };
    db.from('pricing').upsert({ id: 'default', start_price: appData.pricing.start_price, price_per_km: appData.pricing.price_per_km, price_per_point: appData.pricing.price_per_point, updated_at: new Date().toISOString() }).then(function() { closeModal(); renderBilling(); });
  });
}

// === Modal ===
function showModal(t, b, fn) { var o = document.getElementById('modal-overlay'); o.innerHTML = '<div class="modal"><div class="modal-header"><h3>' + t + '</h3><button class="modal-close" onclick="closeModal()">×</button></div>' + b + '<div class="modal-footer"><button class="btn btn-outline" onclick="closeModal()">取消</button><button class="btn btn-primary" id="m-ok">确定</button></div></div>'; o.style.display = 'flex'; document.getElementById('m-ok').onclick = fn; }
function closeModal() { document.getElementById('modal-overlay').style.display = 'none'; }

// === Data Load from Supabase ===
async function loadData() {
  document.getElementById('syncStatus').textContent = '加载中...';
  try {
    var [delResp, drResp, merResp, prResp, phResp] = await Promise.all([
      db.from('deliveries').select('*'),
      db.from('drivers').select('*'),
      db.from('merchants').select('*'),
      db.from('pricing').select('*'),
      db.from('driver_photos').select('*')
    ]);
    if (delResp.data) appData.deliveries = delResp.data;
    if (drResp.data) appData.drivers = drResp.data;
    if (merResp.data) appData.merchants = merResp.data;
    if (prResp.data && prResp.data.length > 0) appData.pricing = prResp.data[0];
    driverPhotos = {};
    if (phResp.data) phResp.data.forEach(function(row) { driverPhotos[row.driver_id] = { photo_url: row.photo_url, file_name: row.file_name }; });
    document.getElementById('syncStatus').textContent = '已同步 ' + new Date().toLocaleTimeString();
  } catch(e) {
    console.warn('Supabase加载失败，尝试本地缓存:', e);
    var lc = localStorage.getItem('sy_data');
    if (lc) { try { appData = JSON.parse(lc); } catch(e2) {} }
    document.getElementById('syncStatus').textContent = '离线模式';
  }
  localStorage.setItem('sy_data', JSON.stringify(appData));
}

async function refreshData() {
  document.getElementById('syncStatus').textContent = '刷新中...';
  await loadData();
  renderPage();
}

function exportCSV() {
  var rs = [['单号', '日期', '骑手', '门店', 'km', '站点', '上楼费', '毛收入']];
  (appData.deliveries || []).forEach(function(r) { rs.push([r.id, r.delivery_date, r.driver_name, r.merchant_name, r.distance_km, r.delivery_points, r.upstairs_fee_total, calcGross(r).toFixed(2)]); });
  var csv = '\ufeff' + rs.map(function(r) { return r.join(','); }).join('\n');
  var b = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  var a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'deliveries.csv'; a.click();
}

// === Init ===
(async function() {
  initSupabase();
  if (!db) {
    document.getElementById('main-content').innerHTML = '<div style="text-align:center;padding:60px"><h2 style="color:#dc2626">Supabase 连接失败</h2><p>请检查网络或联系管理员</p></div>';
    return;
  }
  await loadData();
  initNav();
  renderPage();
})();
