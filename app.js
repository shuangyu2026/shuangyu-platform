// === 双鱼配送管理平台 v2.0 - External App ===
var REPO='shuangyu2026/shuangyu-platform',DATA_PATH='data.json',DATA_BRANCH='main';
var DATA_RAW_URL='https://raw.githubusercontent.com/'+REPO+'/'+DATA_BRANCH+'/'+DATA_PATH;

function getToken(){return localStorage.getItem('gh_token')||'';}
function configToken(){var t=prompt('请输入GitHub Token(用于数据写入同步):',getToken());if(t!==null){localStorage.setItem('gh_token',t.trim());alert('已保存');}}

var appData={deliveries:[],drivers:[],merchants:[],pricing:{start_price:280,price_per_km:2.6,price_per_point:18}};
var currentPage='dashboard';
var pages=[
  {id:'dashboard',label:'数据总览',icon:'📊'},
  {id:'delivery',label:'配送记录',icon:'📦'},
  {id:'drivers',label:'骑手管理',icon:'🏍'},
  {id:'stores',label:'门店维护',icon:'🏪'},
  {id:'billing',label:'计费配置',icon:'💰'}
];

function initNav(){
  document.getElementById('navList').innerHTML=pages.map(function(p){return'<div class="nav-item '+(p.id===currentPage?'active':'')+'" onclick="switchPage(\''+p.id+'\')">'+p.icon+' '+p.label+'</div>';}).join('');
  document.getElementById('mobileNav').innerHTML=pages.map(function(p){return'<div class="mobile-nav-item '+(p.id===currentPage?'active':'')+'" onclick="switchPage(\''+p.id+'\')"><span style="font-size:18px">'+p.icon+'</span>'+p.label+'</div>';}).join('');
}
function switchPage(id){currentPage=id;initNav();renderPage();}
function renderPage(){({dashboard:renderDashboard,delivery:renderDelivery,drivers:renderDrivers,stores:renderStores,billing:renderBilling})[currentPage]();}

function calcGross(r){var c=appData.pricing||{};return Number(c.start_price||280)+(r.distance_km||0)*Number(c.price_per_km||2.6)+(r.delivery_points||0)*Number(c.price_per_point||18)+Number(r.upstairs_fee_total||0);}

// === DASHBOARD ===
function renderDashboard(){
  var d=appData.deliveries||[],tt=d.length,tk=d.reduce(function(s,r){return s+(r.distance_km||0);},0),tr=d.reduce(function(s,r){return s+calcGross(r);},0),av=tt?tr/tt:0;
  var dm={};d.forEach(function(r){var n=r.driver_name||'?';if(!dm[n])dm[n]={t:0,r:0,k:0};dm[n].t++;dm[n].r+=calcGross(r);dm[n].k+=(r.distance_km||0);});
  var dtm={};d.forEach(function(r){var dt=r.delivery_date||'';if(!dtm[dt])dtm[dt]={t:0,r:0};dtm[dt].t++;dtm[dt].r+=calcGross(r);});
  var dates=Object.keys(dtm).sort().slice(-7);
  var dr=Object.entries(dm).sort(function(a,b){return b[1].t-a[1].t;}).map(function(e){return'<tr><td style="font-weight:500">'+e[0]+'</td><td style="text-align:right">'+e[1].t+'</td><td style="text-align:right">'+e[1].k.toFixed(1)+'</td><td style="text-align:right;color:#16a34a">\u00a5'+e[1].r.toFixed(0)+'</td></tr>';}).join('');
  var m=document.getElementById('main-content');
  m.innerHTML='<div class="page-header"><div><h2>数据总览</h2><p class="subtitle">配送业务数据概览与统计分析</p></div><button class="btn btn-outline" onclick="refreshData()">刷新</button></div><div class="stats-grid"><div class="stat-card"><div class="stat-label">总单数</div><div class="stat-value">'+tt+'</div></div><div class="stat-card"><div class="stat-label">总公里</div><div class="stat-value" style="color:#2563eb">'+tk.toFixed(1)+'km</div></div><div class="stat-card"><div class="stat-label">总收入</div><div class="stat-value" style="color:#16a34a">\u00a5'+tr.toFixed(0)+'</div></div><div class="stat-card"><div class="stat-label">单均</div><div class="stat-value" style="color:#ea580c">\u00a5'+av.toFixed(1)+'</div></div></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px"><div class="card"><h4 style="margin:0 0 12px;font-size:14px;font-weight:600">日配送趋势</h4><div class="chart-box"><canvas id="cBar"></canvas></div></div><div class="card"><h4 style="margin:0 0 12px;font-size:14px;font-weight:600">日收入趋势</h4><div class="chart-box"><canvas id="cLine"></canvas></div></div></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:16px"><div class="card"><h4 style="margin:0 0 12px;font-size:14px;font-weight:600">骑手占比</h4><div class="chart-box"><canvas id="cPie"></canvas></div></div><div class="card"><h4 style="margin:0 0 12px;font-size:14px;font-weight:600">骑手统计</h4><table class="data-table"><thead><tr><th>骑手</th><th style="text-align:right">单数</th><th style="text-align:right">公里</th><th style="text-align:right">收入</th></tr></thead><tbody>'+dr+'</tbody></table></div></div>';
  setTimeout(function(){
    var cl=['#ea580c','#2563eb','#16a34a','#8b5cf6','#ec4899','#f59e0b','#06b6d4'];
    var b=document.getElementById('cBar');if(b)new Chart(b,{type:'bar',data:{labels:dates.map(function(x){return x.slice(5);}),datasets:[{data:dates.map(function(x){return dtm[x]?dtm[x].t:0;}),backgroundColor:'#fb923c',borderRadius:6}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true}}}});
    var l=document.getElementById('cLine');if(l)new Chart(l,{type:'line',data:{labels:dates.map(function(x){return x.slice(5);}),datasets:[{data:dates.map(function(x){return dtm[x]?dtm[x].r.toFixed(0):0;}),borderColor:'#16a34a',backgroundColor:'rgba(22,163,106,.1)',fill:true,tension:.4}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true}}}});
    var p=document.getElementById('cPie');if(p){var ns=Object.keys(dm);new Chart(p,{type:'doughnut',data:{labels:ns,datasets:[{data:ns.map(function(n){return dm[n].t;}),backgroundColor:cl.slice(0,ns.length)}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'right',labels:{font:{size:11}}}}}});}
  },50);
}

// === DELIVERY ===
var delS={search:'',driver:'',page:1,ps:10};
function renderDelivery(){
  var list=(appData.deliveries||[]).slice();
  if(delS.search){var s=delS.search.toLowerCase();list=list.filter(function(r){return(r.id||'').toLowerCase().indexOf(s)>=0||(r.merchant_name||'').toLowerCase().indexOf(s)>=0||(r.driver_name||'').toLowerCase().indexOf(s)>=0;});}
  if(delS.driver)list=list.filter(function(r){return r.driver_name===delS.driver;});
  list.sort(function(a,b){return(b.delivery_date||'').localeCompare(a.delivery_date||'');});
  var tot=list.length,tp=Math.ceil(tot/delS.ps)||1;if(delS.page>tp)delS.page=tp;
  var st=(delS.page-1)*delS.ps,pg=list.slice(st,st+delS.ps);
  var tRev=list.reduce(function(s,r){return s+calcGross(r);},0),tKm=list.reduce(function(s,r){return s+(r.distance_km||0);},0);
  var dns=[];var sn={};(appData.deliveries||[]).forEach(function(r){if(r.driver_name&&!sn[r.driver_name]){sn[r.driver_name]=1;dns.push(r.driver_name);}});
  var rows=pg.map(function(r){return'<tr><td style="font-family:monospace;font-size:11px;color:#94a3b8">'+r.id+'</td><td>'+(r.delivery_date||'-')+'</td><td><span class="badge badge-orange">'+(r.driver_name||'-')+'</span></td><td>'+(r.merchant_name||'-')+'</td><td>'+(r.distance_km||0).toFixed(1)+'</td><td>'+(r.delivery_points||0)+'</td><td>'+(r.upstairs_fee_total?'\u00a5'+r.upstairs_fee_total:'-')+'</td><td style="font-weight:600;color:#16a34a">\u00a5'+calcGross(r).toFixed(0)+'</td><td><button class="btn-icon" onclick="openDM(\''+r.id+'\')">编辑</button> <button class="btn-icon danger" onclick="delDel(\''+r.id+'\')">删除</button></td></tr>';}).join('');
  var dOpts=dns.map(function(n){return'<option value="'+n+'"'+(delS.driver===n?' selected':'')+'>'+n+'</option>';}).join('');
  var m=document.getElementById('main-content');
  m.innerHTML='<div class="page-header"><div><h2>配送记录</h2><p class="subtitle">管理所有配送单据</p></div><div style="display:flex;gap:8px"><button class="btn btn-outline" onclick="exportCSV()">导出</button><button class="btn btn-primary" onclick="openDM()">+ 新增</button></div></div><div class="stats-grid"><div class="stat-card"><div class="stat-label">筛选结果</div><div class="stat-value">'+tot+'单</div></div><div class="stat-card"><div class="stat-label">总公里</div><div class="stat-value" style="color:#2563eb">'+tKm.toFixed(1)+'</div></div><div class="stat-card"><div class="stat-label">总收入</div><div class="stat-value" style="color:#16a34a">\u00a5'+tRev.toFixed(0)+'</div></div></div><div class="card" style="margin-bottom:16px"><div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap"><input style="flex:1;min-width:180px;padding:8px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px" placeholder="搜索单号/门店/骑手..." value="'+delS.search+'" oninput="delS.search=this.value;delS.page=1;renderDelivery()"><select style="padding:8px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:13px" onchange="delS.driver=this.value;delS.page=1;renderDelivery()"><option value="">全部骑手</option>'+dOpts+'</select><span style="font-size:12px;color:#94a3b8;margin-left:auto">共'+tot+'条</span></div></div><div class="card" style="padding:0;overflow:hidden"><table class="data-table"><thead><tr><th>单号</th><th>日期</th><th>骑手</th><th>门店</th><th>km</th><th>站点</th><th>上楼费</th><th>毛收入</th><th>操作</th></tr></thead><tbody>'+(pg.length?rows:'<tr><td colspan="9" style="text-align:center;padding:40px;color:#94a3b8">暂无数据</td></tr>')+'</tbody></table>'+(tp>1?'<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-top:1px solid #f1f5f9"><span style="font-size:12px;color:#94a3b8">第'+delS.page+'/'+tp+'页</span><div style="display:flex;gap:4px"><button class="btn-outline" style="padding:4px 10px" '+(delS.page<=1?'disabled':'')+' onclick="delS.page--;renderDelivery()">&lt;</button><button class="btn-outline" style="padding:4px 10px" '+(delS.page>=tp?'disabled':'')+' onclick="delS.page++;renderDelivery()">&gt;</button></div></div>':'')+'</div>';
}

function openDM(id){
  var r=id?(appData.deliveries||[]).find(function(x){return x.id===id;}):null;
  var dns=[];var sn={};(appData.deliveries||[]).concat(appData.drivers||[]).forEach(function(x){var n=x.driver_name||x.name;if(n&&!sn[n]){sn[n]=1;dns.push(n);}});
  var mns=(appData.merchants||[]).map(function(x){return x.name;});
  var dO=dns.map(function(n){return'<option value="'+n+'"'+(r&&r.driver_name===n?' selected':'')+'>'+n+'</option>';}).join('');
  var mO=mns.map(function(n){return'<option value="'+n+'"'+(r&&r.merchant_name===n?' selected':'')+'>'+n+'</option>';}).join('');
  showModal(r?'编辑记录':'新增记录','<div class="form-group"><label>日期 *</label><input type="date" id="f-date" value="'+(r?r.delivery_date:new Date().toISOString().slice(0,10))+'"></div><div class="form-group"><label>骑手 *</label><select id="f-driver"><option value="">--</option>'+dO+'</select></div><div class="form-group"><label>门店</label><select id="f-merchant"><option value="">--</option>'+mO+'</select></div><div class="form-row"><div class="form-group"><label>公里</label><input type="number" step="0.1" id="f-km" value="'+(r?r.distance_km:'')+'"></div><div class="form-group"><label>站点</label><input type="number" id="f-pts" value="'+(r?r.delivery_points:'')+'"></div><div class="form-group"><label>上楼费</label><input type="number" id="f-up" value="'+(r?r.upstairs_fee_total:'')+'"></div></div>',function(){
    var dt=document.getElementById('f-date').value,dn=document.getElementById('f-driver').value;
    if(!dt||!dn){alert('请填写必填项');return;}
    var o={delivery_date:dt,driver_name:dn,merchant_name:document.getElementById('f-merchant').value,distance_km:Number(document.getElementById('f-km').value)||0,delivery_points:Number(document.getElementById('f-pts').value)||0,upstairs_fee_total:Number(document.getElementById('f-up').value)||0};
    if(r)Object.assign(r,o);else{o.id='del-'+String((appData.deliveries||[]).length+1).padStart(4,'0');appData.deliveries.push(o);}
    closeModal();saveData();renderDelivery();
  });
}
function delDel(id){if(!confirm('确定删除?'))return;appData.deliveries=appData.deliveries.filter(function(x){return x.id!==id;});saveData();renderDelivery();}
function exportCSV(){var rs=[['单号','日期','骑手','门店','km','站点','上楼费','毛收入']];(appData.deliveries||[]).forEach(function(r){rs.push([r.id,r.delivery_date,r.driver_name,r.merchant_name,r.distance_km,r.delivery_points,r.upstairs_fee_total,calcGross(r).toFixed(2)]);});var csv='\ufeff'+rs.map(function(r){return r.join(',');}).join('\n');var b=new Blob([csv],{type:'text/csv;charset=utf-8'});var a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='deliveries.csv';a.click();}

// === DRIVERS ===
function renderDrivers(){
  var drs=appData.drivers||[],dl=appData.deliveries||[];
  var ds=drs.map(function(dr){var ts=dl.filter(function(x){return x.driver_name===dr.name;});return{id:dr.id,name:dr.name,phone:dr.phone||'',plate:dr.plate||'',trips:ts.length,rev:ts.reduce(function(s,x){return s+calcGross(x);},0),km:ts.reduce(function(s,x){return s+(x.distance_km||0);},0)};});
  var cards=ds.map(function(dr){return'<div class="driver-card"><div class="driver-header"><div class="driver-avatar">'+dr.name[0]+'</div><div><div class="driver-name">'+dr.name+'</div><div class="driver-info">'+dr.phone+' '+dr.plate+'</div></div></div><div class="driver-stats"><span>单量:'+dr.trips+'</span><span>收入:\u00a5'+dr.rev.toFixed(0)+'</span><span>km:'+dr.km.toFixed(1)+'</span></div><div class="driver-actions"><button class="btn-icon" onclick="openDrM(\''+dr.id+'\')">编辑</button><button class="btn-icon danger" onclick="delDr(\''+dr.id+'\')">删除</button></div></div>';}).join('');
  document.getElementById('main-content').innerHTML='<div class="page-header"><div><h2>骑手管理</h2><p class="subtitle">管理骑手信息与业绩</p></div><button class="btn btn-primary" onclick="openDrM()">+ 添加</button></div><div class="stats-grid"><div class="stat-card"><div class="stat-label">骑手数</div><div class="stat-value">'+drs.length+'</div></div><div class="stat-card"><div class="stat-label">总单数</div><div class="stat-value">'+dl.length+'</div></div><div class="stat-card"><div class="stat-label">总收入</div><div class="stat-value" style="color:#16a34a">\u00a5'+dl.reduce(function(s,x){return s+calcGross(x);},0).toFixed(0)+'</div></div></div><div class="card"><div class="driver-grid">'+cards+'</div></div>';
}
function openDrM(id){
  var dr=id?(appData.drivers||[]).find(function(x){return x.id===id;}):null;
  showModal(dr?'编辑骑手':'添加骑手','<div class="form-group"><label>姓名 *</label><input id="f-name" value="'+(dr?dr.name:'')+'"></div><div class="form-group"><label>电话</label><input id="f-phone" value="'+(dr?dr.phone:'')+'"></div><div class="form-group"><label>车牌</label><input id="f-plate" value="'+(dr?dr.plate:'')+'"></div>',function(){
    var nm=document.getElementById('f-name').value.trim();if(!nm){alert('姓名不能为空');return;}
    var ph=document.getElementById('f-phone').value,pl=document.getElementById('f-plate').value;
    if(dr)Object.assign(dr,{name:nm,phone:ph,plate:pl});else appData.drivers.push({id:'DRV'+Date.now(),name:nm,phone:ph,plate:pl});
    closeModal();saveData();renderDrivers();
  });
}
function delDr(id){if(!confirm('确定?'))return;appData.drivers=appData.drivers.filter(function(x){return x.id!==id;});saveData();renderDrivers();}

// === STORES ===
function renderStores(){
  var st=appData.merchants||[],wu=st.filter(function(s){return s.has_upstairs;}).length;
  var rows=st.map(function(s,i){return'<tr><td>'+(i+1)+'</td><td style="font-weight:500">'+s.name+'</td><td>'+(s.has_upstairs?'<span class="badge badge-green">有上楼费</span>':'<span class="badge">无</span>')+'</td><td>'+(s.has_upstairs?'\u00a5'+Number(s.upstairs_fee||0):'\u2014')+'</td><td><button class="btn-icon" onclick="openStM(\''+s.id+'\')">编辑</button> <button class="btn-icon danger" onclick="delSt(\''+s.id+'\')">删除</button></td></tr>';}).join('');
  document.getElementById('main-content').innerHTML='<div class="page-header"><div><h2>上楼门店维护</h2><p class="subtitle">维护门店上楼费配置</p></div><button class="btn btn-primary" onclick="openStM()">+ 添加</button></div><div class="stats-grid"><div class="stat-card"><div class="stat-label">门店总数</div><div class="stat-value">'+st.length+'</div></div><div class="stat-card"><div class="stat-label">含上楼费</div><div class="stat-value" style="color:#16a34a">'+wu+'</div></div><div class="stat-card"><div class="stat-label">无上楼费</div><div class="stat-value" style="color:#94a3b8">'+(st.length-wu)+'</div></div></div><div class="card" style="padding:0;overflow:hidden"><table class="data-table"><thead><tr><th>#</th><th>门店</th><th>上楼</th><th>费用</th><th>操作</th></tr></thead><tbody>'+rows+'</tbody></table></div>';
}
function openStM(id){
  var s=id?(appData.merchants||[]).find(function(x){return x.id===id;}):null;
  showModal(s?'编辑门店':'添加门店','<div class="form-group"><label>名称 *</label><input id="f-name" value="'+(s?s.name:'')+'"></div><div class="form-group"><label><input type="checkbox" id="f-up" '+(s&&s.has_upstairs?'checked':'')+' onchange="document.getElementById(\'f-fee-r\').style.display=this.checked?\'block\':\'none\'"> 有上楼费</label></div><div id="f-fee-r" style="display:'+(s&&s.has_upstairs?'block':'none')+'"><div class="form-group"><label>金额(元/次)</label><input type="number" id="f-fee" value="'+(s?s.upstairs_fee:'')+'"></div></div>',function(){
    var nm=document.getElementById('f-name').value.trim();if(!nm){alert('名称不能为空');return;}
    var hu=document.getElementById('f-up').checked,uf=hu?Number(document.getElementById('f-fee').value)||0:0;
    if(s)Object.assign(s,{name:nm,has_upstairs:hu,upstairs_fee:uf});else appData.merchants.push({id:'MER'+Date.now(),name:nm,has_upstairs:hu,upstairs_fee:uf});
    closeModal();saveData();renderStores();
  });
}
function delSt(id){if(!confirm('确定?'))return;appData.merchants=appData.merchants.filter(function(x){return x.id!==id;});saveData();renderStores();}

// === BILLING ===
function renderBilling(){
  var c=appData.pricing||{start_price:280,price_per_km:2.6,price_per_point:18};
  document.getElementById('main-content').innerHTML='<div class="page-header"><div><h2>计费配置</h2><p class="subtitle">配置费用计算规则</p></div><button class="btn btn-primary" onclick="editBill()">编辑</button></div><div class="stats-grid"><div class="stat-card"><div class="stat-label">起步价</div><div class="stat-value">\u00a5'+c.start_price+'</div><div class="stat-sub">元/单</div></div><div class="stat-card"><div class="stat-label">公里单价</div><div class="stat-value" style="color:#ea580c">\u00a5'+c.price_per_km+'</div><div class="stat-sub">元/km</div></div><div class="stat-card"><div class="stat-label">站点单价</div><div class="stat-value" style="color:#16a34a">\u00a5'+c.price_per_point+'</div><div class="stat-sub">元/站</div></div></div><div class="card" style="background:linear-gradient(135deg,#1e293b,#0f172a);color:#fff;padding:24px"><h4 style="color:#fb923c;margin:0 0 12px">计费公式</h4><div style="background:rgba(255,255,255,.05);padding:16px;border-radius:8px;font-family:monospace;font-size:13px"><p style="color:#fdba74;margin:0">毛收入 = 起步价 + km\u00d7公里单价 + 站点\u00d7站点单价 + 上楼费</p><p style="color:#86efac;margin:8px 0 0">净收入 = 毛收入 \u00d7 (1-9%税)</p></div></div><div class="card"><h4 style="margin:0 0 16px;font-size:14px;font-weight:600">费用试算</h4><div class="form-row"><div class="form-group"><label>公里</label><input type="number" id="d-km" value="30" oninput="cDemo()"></div><div class="form-group"><label>站点</label><input type="number" id="d-pt" value="6" oninput="cDemo()"></div><div class="form-group"><label>上楼费</label><input type="number" id="d-up" value="100" oninput="cDemo()"></div></div><div class="stats-grid" style="margin-top:16px"><div class="stat-card"><div class="stat-label">毛收入</div><div class="stat-value" id="d-g">\u2014</div></div><div class="stat-card"><div class="stat-label">净收入(扣9%)</div><div class="stat-value" style="color:#16a34a" id="d-n">\u2014</div></div></div></div>';
  cDemo();
}
function cDemo(){var c=appData.pricing||{start_price:280,price_per_km:2.6,price_per_point:18};var km=Number(document.getElementById('d-km')&&document.getElementById('d-km').value)||0;var pt=Number(document.getElementById('d-pt')&&document.getElementById('d-pt').value)||0;var up=Number(document.getElementById('d-up')&&document.getElementById('d-up').value)||0;var g=Number(c.start_price)+km*Number(c.price_per_km)+pt*Number(c.price_per_point)+up;var ge=document.getElementById('d-g'),ne=document.getElementById('d-n');if(ge)ge.textContent='\u00a5'+g.toFixed(2);if(ne)ne.textContent='\u00a5'+(g*0.91).toFixed(2);}
function editBill(){
  var c=appData.pricing||{start_price:280,price_per_km:2.6,price_per_point:18};
  showModal('编辑计费','<div class="form-group"><label>起步价</label><input type="number" id="f-sp" value="'+c.start_price+'"></div><div class="form-group"><label>公里单价</label><input type="number" step="0.1" id="f-pk" value="'+c.price_per_km+'"></div><div class="form-group"><label>站点单价</label><input type="number" step="0.1" id="f-pp" value="'+c.price_per_point+'"></div>',function(){
    appData.pricing={start_price:Number(document.getElementById('f-sp').value)||280,price_per_km:Number(document.getElementById('f-pk').value)||2.6,price_per_point:Number(document.getElementById('f-pp').value)||18};
    closeModal();saveData();renderBilling();
  });
}

// Modal
function showModal(t,b,fn){var o=document.getElementById('modal-overlay');o.innerHTML='<div class="modal"><div class="modal-header"><h3>'+t+'</h3><button class="modal-close" onclick="closeModal()">&times;</button></div>'+b+'<div class="modal-footer"><button class="btn btn-outline" onclick="closeModal()">取消</button><button class="btn btn-primary" id="m-ok">确定</button></div></div>';o.style.display='flex';document.getElementById('m-ok').onclick=fn;}
function closeModal(){document.getElementById('modal-overlay').style.display='none';}

// Data Sync
async function loadData(){
  var lc=localStorage.getItem('sy_data');if(lc){try{appData=JSON.parse(lc);}catch(e){}}
  try{var r=await fetch(DATA_RAW_URL+'?t='+Date.now());if(r.ok){var rm=await r.json();if(!lc||(rm.deliveries&&rm.deliveries.length>=(appData.deliveries||[]).length)){appData=rm;localStorage.setItem('sy_data',JSON.stringify(appData));}}}catch(e){}
  document.getElementById('syncStatus').textContent='已同步 '+new Date().toLocaleTimeString();
}
function saveData(){localStorage.setItem('sy_data',JSON.stringify(appData));syncGH();}
async function syncGH(){
  var tk=getToken();if(!tk){document.getElementById('syncStatus').textContent='未设置Token,仅本地保存';return;}
  try{
    var url='https://api.github.com/repos/'+REPO+'/contents/'+DATA_PATH;
    var gr=await fetch(url+'?ref='+DATA_BRANCH,{headers:{'Authorization':'token '+tk}});
    var sha=null;if(gr.ok){sha=(await gr.json()).sha;}
    var ct=btoa(unescape(encodeURIComponent(JSON.stringify(appData,null,2))));
    var bd={message:'sync',content:ct,branch:DATA_BRANCH};if(sha)bd.sha=sha;
    var pr=await fetch(url,{method:'PUT',headers:{'Authorization':'token '+tk,'Content-Type':'application/json'},body:JSON.stringify(bd)});
    if(pr.ok)document.getElementById('syncStatus').textContent='已保存 '+new Date().toLocaleTimeString();
    else document.getElementById('syncStatus').textContent='同步失败';
  }catch(e){document.getElementById('syncStatus').textContent='同步异常';}
}
async function refreshData(){document.getElementById('syncStatus').textContent='刷新中...';await loadData();renderPage();}

// Init
(async function(){await loadData();initNav();renderPage();})();
