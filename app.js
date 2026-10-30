const ui = { meta: null, cases: [], report: null, notebook: [], metrics: null };
const titles = { submit: '采购填报', auto: '主单明细', review: '人工审核', ops: '营运确认', biz: '商分确认', report: '追损月报', notebook: '市调错误错题本', flow: '阶段对比', iteration: '迭代看板' };
const browserDemo = {
  meta: { ok: true, app: { version: 'MVP 0.9 分岗月报', mode: 'DEMO' }, states: {}, dictionaries: { errorReasons: { PRICE_ENTRY_ERROR: { label: '价格录入错误' } } } },
  cases: [
    { id: 'LR-DEMO-001', orderNumber: 'LOSS-DEMO-001', state: 'HUMAN_REVIEW', lossReason: '活动跟价价格录入错误，需核对活动期间成交金额与图片证据。', facts: demoFacts('LOSS-DEMO-001') },
    { id: 'LR-DEMO-002', orderNumber: 'LOSS-DEMO-002', state: 'OPS_CONFIRMATION', lossReason: '市调图片与美菜商品规格不一致。', facts: demoFacts('LOSS-DEMO-002') },
    { id: 'LR-DEMO-003', orderNumber: 'LOSS-DEMO-003', state: 'BIZ_CONFIRMATION', lossReason: '活动跟价金额异常，申请复核。', facts: demoFacts('LOSS-DEMO-003') }
  ],
  report: { month: '2026-09', caseCount: 2, errorChannels: [{ label: '市调采价', count: 1 }], errorReasons: [{ label: '价格录入错误', count: 1 }], suggestions: [{ suggestion: '录入前核对规格与单位' }] },
  notebook: [{ id: 'NOTE-DEMO-001', status: 'ACTIVE', personId: 'survey-demo-01', personName: '演示市调员A', errorReason: 'PRICE_ENTRY_ERROR', correctJudgement: '可追损', reinforcementPoints: ['录入前核对规格与单位'] }],
  metrics: { orderResolutionSuccessRate: 100, operationsReturnRate: 8.3, businessFinanceReturnRate: 4.2 }
};

function escapeHtml(value) { return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;'); }
function pct(value) { return value === null || value === undefined ? '—' : `${Number(value).toFixed(1)}%`; }
function browserDemoApi(path, options = {}) {
  if (path === '/api/meta') return browserDemo.meta;
  if (path === '/api/cases' && (!options.method || options.method === 'GET')) return { ok: true, cases: browserDemo.cases, summary: { total: browserDemo.cases.length } };
  if (path.startsWith('/api/reports/monthly')) return { ok: true, report: browserDemo.report };
  if (path.startsWith('/api/notebook')) return { ok: true, entries: browserDemo.notebook };
  if (path === '/api/metrics/iteration') return { ok: true, metrics: browserDemo.metrics };
  if (path === '/api/cases' && options.method === 'POST') {
    const payload = JSON.parse(options.body || '{}');
    const orderNumber = payload.orderNumber || 'LOSS-DEMO-NEW';
    const created = { id: 'LR-DEMO-NEW', orderNumber, state: 'HUMAN_REVIEW', lossReason: payload.lossReason || '待补充', facts: demoFacts(orderNumber) };
    browserDemo.cases = [created, ...browserDemo.cases.filter((item) => item.id !== created.id)];
    return { ok: true, case: created };
  }
  const transitionMatch = path.match(/^\/api\/cases\/([^/]+)\/transition$/);
  if (transitionMatch && options.method === 'POST') {
    const record = browserDemo.cases.find((item) => item.id === decodeURIComponent(transitionMatch[1]));
    if (record) record.state = JSON.parse(options.body || '{}').nextState || record.state;
    return { ok: true, case: record };
  }
  throw new Error('Demo 操作暂不可用');
}
async function api(path, options = {}) {
  if (location.port !== '4180') return browserDemoApi(path, options);
  const response = await fetch(path, { headers: { 'content-type': 'application/json', ...(options.headers || {}) }, ...options });
  const payload = await response.json(); if (!response.ok) throw new Error(payload.error || '请求失败'); return payload;
}
function showToast(message, isError = false) { const toast = document.querySelector('#toast'); toast.textContent = message; toast.className = `toast is-visible${isError ? ' is-error' : ''}`; clearTimeout(showToast.timer); showToast.timer = setTimeout(() => toast.className = 'toast', 2800); }

function demoFacts(orderNumber) {
  return {
    city: '广州', category: '猪肉', judgement: 'RECOVERABLE_CANDIDATE',
    mainOrderId: orderNumber, activityId: 'ACT-DEMO-202609-0186',
    createdAt: '2026-09-18 09:32', endedAt: '2026-09-20 23:59',
    followPriceAmount: 286.40, surveyChannel: '线下门店市调',
    surveyPrice: 19.90, meicaiPrice: 21.80,
    imageConclusion: '规格一致；市调价录入低于图片标价 2.00 元/斤',
    judgementReason: '活动期、成交量、金额和双图证据齐全，进入人工审核。'
  };
}

function switchView(view) {
  document.querySelectorAll('.nav-item').forEach((item) => item.classList.toggle('is-active', item.dataset.view === view));
  document.querySelectorAll('.view').forEach((panel) => panel.classList.toggle('is-active', panel.dataset.viewPanel === view));
  const mobileTitles = { submit: '快速发起追损', auto: '主单明细', review: '人工审核', ops:'营运确认', biz:'商分确认', report: '追损月报', notebook: '错误错题本' };
  document.querySelector('#page-title').textContent = document.body.dataset.experience === 'mobile' ? (mobileTitles[view] || titles[view]) : titles[view];
  const url = new URL(location.href); url.searchParams.set('view', view); history.replaceState(null, '', url);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function summaryCard(record, actionHtml = '') {
  if (!record) return '<div class="empty">当前没有待处理事项</div>';
  const facts = record.facts || {};
  return `<article class="case-card compact-card">
    <span class="demo-watermark">Demo</span>
    <div class="compact-summary"><div><span>单号</span><strong>${escapeHtml(record.orderNumber)}</strong></div><div><span>摘要</span><strong>${escapeHtml(facts.city || '待识别')} · ${escapeHtml(facts.category || '待识别')}</strong></div></div>
    ${actionHtml}
  </article>`;
}

function renderSubmitResult(record) { document.querySelector('#submit-result').innerHTML = `<div class="success-strip">提交成功：系统已查询主单与活动明细。</div><article class="submission-receipt"><span>单号</span><strong>${escapeHtml(record.orderNumber)}</strong><span>采购填写的追损原因</span><p>${escapeHtml(record.lossReason)}</p><button class="primary-button" data-action="view-detail">查看主单明细与图片对比</button></article>`; }

function evidenceVisual(type) {
  if (type === 'survey') return `<svg class="evidence-visual" role="img" aria-label="市调现场演示图片" viewBox="0 0 640 360" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="surveyBg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#4b3525"/><stop offset="1" stop-color="#b58454"/></linearGradient><linearGradient id="surveyMeat" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ef9e91"/><stop offset="1" stop-color="#bf544c"/></linearGradient></defs><rect width="640" height="360" fill="url(#surveyBg)"/><rect y="252" width="640" height="108" fill="#37291f"/><rect x="150" y="48" width="370" height="242" rx="20" fill="#f7f1e7"/><rect x="176" y="73" width="318" height="136" rx="16" fill="#dce7dc"/><path d="M238 115c40-35 82-24 111 5 38-24 82-8 93 27-9 40-42 60-91 52-49 15-96-13-113-51z" fill="url(#surveyMeat)"/><text x="182" y="245" font-family="Arial,sans-serif" font-size="20" font-weight="700" fill="#3b352f">鲜猪肉 · 500g</text><text x="480" y="258" text-anchor="end" font-family="Arial,sans-serif" font-size="38" font-weight="900" fill="#b92e27">¥19.90</text><rect x="18" y="18" width="124" height="34" rx="17" fill="#111" fill-opacity=".7"/><text x="80" y="40" text-anchor="middle" fill="#fff" font-family="Arial,sans-serif" font-size="14">市调现场 · DEMO</text></svg>`;
  return `<svg class="evidence-visual" role="img" aria-label="美菜商品演示图片" viewBox="0 0 640 360" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="mcBg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#dcefe5"/><stop offset="1" stop-color="#9bc8af"/></linearGradient><linearGradient id="mcMeat" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f2a39a"/><stop offset="1" stop-color="#c4514b"/></linearGradient></defs><rect width="640" height="360" fill="url(#mcBg)"/><rect x="84" y="34" width="472" height="292" rx="22" fill="#fff"/><rect x="110" y="62" width="214" height="194" rx="16" fill="#ecf4ee"/><path d="M144 135c35-44 89-48 126-10 31-18 62 5 55 45-13 39-51 64-96 54-49 11-88-14-98-51z" fill="url(#mcMeat)"/><text x="348" y="99" font-family="Arial,sans-serif" font-size="14" font-weight="700" fill="#17805c">美菜自营 · 品质保障</text><text x="348" y="144" font-family="Arial,sans-serif" font-size="28" font-weight="800" fill="#17352b">鲜猪肉</text><text x="348" y="177" font-family="Arial,sans-serif" font-size="16" fill="#687a73">规格 500g / 份</text><text x="348" y="238" font-family="Arial,sans-serif" font-size="18" fill="#b84b44">活动跟价</text><text x="520" y="254" text-anchor="end" font-family="Arial,sans-serif" font-size="42" font-weight="900" fill="#b92e27">¥21.80</text><rect x="18" y="18" width="126" height="34" rx="17" fill="#0d5d44"/><text x="81" y="40" text-anchor="middle" fill="#fff" font-family="Arial,sans-serif" font-size="14">美菜页面 · DEMO</text></svg>`;
}

function renderAuto() {
  const record = ui.cases.find((item) => item.state === 'HUMAN_REVIEW') || ui.cases[0];
  const judgement = record?.facts?.judgement; const facts = record?.facts || {};
  const active = judgement === 'RECOVERABLE_CANDIDATE' ? 'recoverable' : judgement === 'NOT_RECOVERABLE' ? 'not-recoverable' : 'supplement';
  document.querySelector('#auto-content').innerHTML = `<article class="case-card compact-workbench">
    <div class="workbench-head"><div><span class="demo-watermark">Demo 数据</span><h3>主单事实与证据核查</h3></div><div class="workbench-status"><span>当前节点</span><b>待人工审核</b></div></div>
    <div class="dense-table-wrap"><table class="master-detail-table"><tbody>
      <tr><th>主单 ID</th><td>${escapeHtml(facts.mainOrderId || record?.orderNumber)}</td><th>活动 ID</th><td>${escapeHtml(facts.activityId)}</td><th>市调渠道</th><td>${escapeHtml(facts.surveyChannel)}</td></tr>
      <tr><th>创建时间</th><td>${escapeHtml(facts.createdAt)}</td><th>结束时间</th><td>${escapeHtml(facts.endedAt)}</td><th>跟价金额</th><td class="money">¥ ${Number(facts.followPriceAmount || 0).toFixed(2)}</td></tr>
      <tr><th>追损原因</th><td colspan="5">${escapeHtml(record?.lossReason || '待补充')}</td></tr>
    </tbody></table></div>
    <div class="evidence-table-wrap"><table class="evidence-table">
      <thead><tr><th>核查项</th><th>市调证据</th><th>美菜证据</th><th>系统对比</th></tr></thead>
      <tbody>
        <tr class="image-row"><th>原始图片</th><td>${evidenceVisual('survey')}</td><td>${evidenceVisual('meicai')}</td><td rowspan="4" class="compare-cell"><span class="difference-tag">发现差异</span><b>${escapeHtml(facts.imageConclusion)}</b><small>图片、规格、价格与活动时间已完成自动比对</small></td></tr>
        <tr><th>图片价格</th><td class="price-cell">¥ ${Number(facts.surveyPrice || 0).toFixed(2)}</td><td class="price-cell">¥ ${Number(facts.meicaiPrice || 0).toFixed(2)}</td></tr>
        <tr><th>商品规格</th><td>500g / 份</td><td>500g / 份</td></tr>
        <tr><th>证据来源</th><td>线下门店市调</td><td>美菜活动商品页</td></tr>
      </tbody>
    </table></div>
    <div class="compact-decision"><div><span>系统判断</span><div class="compact-options"><b class="${active === 'recoverable' ? 'is-selected' : ''}">可追损</b><b class="${active === 'not-recoverable' ? 'is-selected' : ''}">不可追损</b><b class="${active === 'supplement' ? 'is-selected' : ''}">需补充</b></div></div><p>${escapeHtml(facts.judgementReason)}</p></div>
  </article>`;
}

function renderReview() {
  const record = ui.cases.find((item) => item.state === 'HUMAN_REVIEW');
  const actions = record ? `<div class="simple-actions"><button class="primary-button" data-action="review-approve" data-id="${record.id}">通过</button><button class="secondary-button" data-action="review-return" data-id="${record.id}">退回</button></div>` : '';
  if (document.body.dataset.experience !== 'mobile') {
    document.querySelector('#review-content').innerHTML = summaryCard(record, actions);
    return;
  }
  const opsRecord = ui.cases.find((item) => item.state === 'OPS_CONFIRMATION');
  const bizRecord = ui.cases.find((item) => item.state === 'BIZ_CONFIRMATION');
  const task = (label, item, action, approveText) => item ? `<article class="case-card mobile-task"><div class="task-role"><span>${label}</span><b>待确认</b></div><strong>${escapeHtml(item.orderNumber)}</strong><p>${escapeHtml(item.facts?.city || '待识别')} · ${escapeHtml(item.facts?.category || '待识别')}</p><button class="primary-button" data-action="${action}" data-id="${item.id}">${approveText}</button></article>` : '';
  document.querySelector('#review-content').innerHTML = `<div class="mobile-task-list">${task('人工审核', record, 'review-approve', '审核通过')}${task('营运确认', opsRecord, 'ops-approve', '确认业务事实')}${task('商分确认', bizRecord, 'biz-approve', '确认并结案')}</div>` || '<div class="empty">当前没有待处理事项</div>';
}

function renderOps() {
  const record = ui.cases.find((item) => item.state === 'OPS_CONFIRMATION');
  const actions = record ? `<div class="simple-actions"><button class="primary-button" data-action="ops-approve" data-id="${record.id}">确认无误</button><button class="secondary-button" data-action="ops-return" data-id="${record.id}">退回</button></div>` : '';
  document.querySelector('#ops-content').innerHTML = summaryCard(record, actions);
}

function renderBiz() {
  const record = ui.cases.find((item) => item.state === 'BIZ_CONFIRMATION');
  const actions = record ? `<div class="simple-actions"><button class="primary-button" data-action="biz-approve" data-id="${record.id}">确认</button><button class="secondary-button" data-action="biz-return" data-id="${record.id}">退回</button></div><div class="success-strip subtle">确认后：已进入月报 / 错题本判断</div>` : '';
  document.querySelector('#biz-content').innerHTML = summaryCard(record, actions);
}

function renderReport() {
  const r = ui.report; const topChannel = r.errorChannels[0]; const topReason = r.errorReasons[0]; const suggestion = r.suggestions[0];
  document.querySelector('#report-content').innerHTML = `<div class="four-blocks">
    <article class="summary-block"><span>错误渠道</span><strong>${escapeHtml(topChannel?.label || '暂无')}</strong></article>
    <article class="summary-block"><span>错误原因</span><strong>${escapeHtml(topReason?.label || '暂无')}</strong></article>
    <article class="summary-block"><span>数量</span><strong>${r.caseCount}</strong></article>
    <article class="summary-block"><span>优化建议</span><strong>${escapeHtml(suggestion?.suggestion || '暂无')}</strong></article>
  </div>`;
}

function renderNotebook() {
  const item = ui.notebook.find((entry) => entry.status === 'ACTIVE');
  document.querySelector('#notebook-content').innerHTML = item ? `<div class="four-blocks">
    <article class="summary-block"><span>人员</span><strong>${escapeHtml(item.personName)}</strong></article>
    <article class="summary-block"><span>错误原因</span><strong>${escapeHtml(ui.meta.dictionaries.errorReasons[item.errorReason]?.label || item.errorReason)}</strong></article>
    <article class="summary-block"><span>正确做法</span><strong>${escapeHtml(item.correctJudgement)}</strong></article>
    <article class="summary-block"><span>加强点</span><strong>${escapeHtml(item.reinforcementPoints[0] || '暂无')}</strong></article>
  </div>` : '<div class="empty">当前没有个人错题</div>';
}

function repeatedErrorRate() {
  const active = ui.notebook.filter((item) => item.status === 'ACTIVE'); if (!active.length) return 0;
  const keys = active.map((item) => `${item.personId}:${item.errorReason}`); return ((keys.length - new Set(keys).size) / keys.length) * 100;
}

function renderIteration() {
  const m = ui.metrics; const manualReturnRate = Math.max(Number(m.operationsReturnRate || 0), Number(m.businessFinanceReturnRate || 0));
  document.querySelector('#iteration-content').innerHTML = `<div class="three-metrics"><article class="metric"><span>系统识别成功率</span><strong>${pct(m.orderResolutionSuccessRate)}</strong></article><article class="metric"><span>人工退回率</span><strong>${pct(manualReturnRate)}</strong></article><article class="metric"><span>重复错误率</span><strong>${pct(repeatedErrorRate())}</strong></article></div>`;
}

function renderFlow() {
  document.querySelector('#flow-content').innerHTML = `<article class="comparison-card">
    <div class="comparison-head"><div><span class="demo-watermark">阶段对比</span><h3>现状与新阶段，一张表看清</h3></div><div class="phase-pills"><span>现状：人工串联</span><b>新阶段：系统闭环</b></div></div>
    <div class="comparison-scroll"><table class="stage-comparison"><thead><tr><th>对比维度</th><th class="current-col">现状</th><th class="target-col">新阶段</th><th>升级价值</th></tr></thead><tbody>
      <tr><th>采购入口</th><td>只报单号，原因另行沟通</td><td>单号＋明细追损原因一次提交</td><td><b>减少反复追问</b></td></tr>
      <tr><th>信息查询</th><td>人工跨系统查主单、活动、时间和金额</td><td>系统自动返回完整主单事实</td><td><b>从找数变成看结论</b></td></tr>
      <tr><th>图片证据</th><td>市调图、美菜图分散，依赖人工肉眼核对</td><td>双图同表展示，自动输出差异结论</td><td><b>证据统一、判断更快</b></td></tr>
      <tr><th>审核流转</th><td>群聊或线下逐人通知，状态难追踪</td><td>人审→营运→商分自动通知与留痕</td><td><b>节点清楚、责任可回查</b></td></tr>
      <tr><th>结果沉淀</th><td>月底人工整理，错误经验分散</td><td>自动进入月报；市调错误进入个人错题本</td><td><b>追损结果反哺培训</b></td></tr>
    </tbody></table></div>
    <div class="target-flow"><span>采购发起</span><i>→</i><span>系统整理</span><i>→</i><span>人工审核</span><i>→</i><span>营运确认</span><i>→</i><span>商分确认</span><i>→</i><strong>月报 / 错题本</strong></div>
  </article>`;
}

async function transition(id, payload, successMessage = '处理完成') { try { await api(`/api/cases/${encodeURIComponent(id)}/transition`, { method: 'POST', body: JSON.stringify(payload) }); await loadAll(); showToast(successMessage); } catch (error) { showToast(error.message, true); } }
async function submitCase(event) { event.preventDefault(); const form = new FormData(event.currentTarget); const orderNumber = form.get('orderNumber'); const lossReason = form.get('lossReason'); try { const result = await api('/api/cases', { method: 'POST', body: JSON.stringify({ orderNumber, lossReason }) }); await loadAll(); renderSubmitResult(result.case); showToast('已查询主单明细'); } catch (error) { showToast(error.message, true); } }

document.addEventListener('click', (event) => {
  const button = event.target.closest('[data-action]'); if (!button) return; const id = button.dataset.id;
  if (button.dataset.action === 'view-detail') switchView('auto');
  if (button.dataset.action === 'review-approve') transition(id, { nextState: 'OPS_CONFIRMATION', actorRole: 'reviewer', actor: '演示审核人', note: '审核通过' });
  if (button.dataset.action === 'review-return') transition(id, { nextState: 'HUMAN_RETURNED', actorRole: 'reviewer', actor: '演示审核人', returnReason: '需补充核验' });
  if (button.dataset.action === 'ops-approve') transition(id, { nextState: 'BIZ_CONFIRMATION', actorRole: 'operations', actor: '演示营运确认人', note: '确认无误' });
  if (button.dataset.action === 'ops-return') transition(id, { nextState: 'OPS_RETURNED', actorRole: 'operations', actor: '演示营运确认人', returnReason: '需重新核对' });
  if (button.dataset.action === 'biz-return') transition(id, { nextState: 'BIZ_RETURNED', actorRole: 'business_finance', actor: '演示商分确认人', returnReason: '需重新确认' });
  if (button.dataset.action === 'biz-approve') transition(id, { nextState: 'PENDING_EXECUTION', actorRole: 'business_finance', actor: '演示商分确认人', responsibilityType: 'SURVEYOR_ERROR', responsiblePersonId: 'survey-demo-new', responsiblePersonName: '演示市调员A', errorChannel: 'MARKET_PRICE_COLLECTION', errorReason: 'PRICE_ENTRY_ERROR', originalJudgement: '无需追损', correctJudgement: '可追损', confirmationNote: '确认' }, '已进入月报 / 错题本判断');
});

function renderAll() { renderAuto(); renderReview(); renderOps(); renderBiz(); renderReport(); renderNotebook(); renderIteration(); }
async function loadAll() {
  const [meta, cases, report, notebook, metrics] = await Promise.all([api('/api/meta'), api('/api/cases'), api('/api/reports/monthly?month=2026-09'), api('/api/notebook?month=2026-09'), api('/api/metrics/iteration')]);
  ui.meta = meta; ui.cases = cases.cases; ui.report = report.report; ui.notebook = notebook.entries; ui.metrics = metrics.metrics;
  document.querySelector('#version-badge').textContent = meta.app.version; document.querySelector('#mode-badge').textContent = 'Demo';
  const mobile = document.body.dataset.experience === 'mobile';
  document.querySelector('#environment-banner').innerHTML = mobile ? '<strong>移动端：</strong> 快速填报与待办确认。' : '<strong>电脑端：</strong> 完整明细、证据对比与闭环分析。';
  renderAll();
}

// Shared, evidence-first review screens. All records below are illustrative Demo data.
function caseDetails(record, role = '主单明细', action = '') {
  if (!record) return '<div class="empty">当前没有待处理明细</div>';
  const f = record.facts || demoFacts(record.orderNumber);
  return `<article class="plain-panel"><h3>${role} · ${escapeHtml(record.orderNumber)}</h3><p class="muted">演示案例，不代表真实判责或已执行处罚</p><div class="comparison-scroll"><table class="detail-grid"><tbody>
  <tr><th>主单 ID</th><td>${escapeHtml(record.orderNumber)}</td><th>活动 ID</th><td>${escapeHtml(f.activityId)}</td></tr>
  <tr><th>城市 / 品类</th><td>${escapeHtml(f.city)} / ${escapeHtml(f.category)}</td><th>商品 / SKU</th><td>鲜猪肉 500g / SKU-DEMO-0186</td></tr>
  <tr><th>创建时间</th><td>${escapeHtml(f.createdAt)}</td><th>结束时间</th><td>${escapeHtml(f.endedAt)}</td></tr>
  <tr><th>市调渠道 / 人员</th><td>${escapeHtml(f.surveyChannel)} / 演示市调员 A</td><th>活动跟价金额</th><td>¥${Number(f.followPriceAmount).toFixed(2)}</td></tr>
  <tr><th>采购追损原因</th><td colspan="3">${escapeHtml(record.lossReason)}</td></tr>
  <tr><th>系统核查意见</th><td colspan="3">待人工核实商品、规格、时间及价格证据；跟价金额不直接等于最终追损金额。</td></tr></tbody></table></div>
  ${stageHistory(record)}<div class="comparison-scroll"><table class="detail-grid evidence-review"><thead><tr><th>证据</th><th>市调</th><th>美菜</th></tr></thead><tbody><tr><th>图片</th><td>${evidenceVisual('survey')}</td><td>${evidenceVisual('meicai')}</td></tr><tr><th>图片标价</th><td>¥19.90 / 500g</td><td>¥21.80 / 500g</td></tr><tr><th>核查结果</th><td colspan="2">商品及规格一致；图示价格差 ¥1.90 / 500g。需对照原始录入记录确认录入错误，不能仅凭两个渠道存在价差判责。</td></tr></tbody></table></div>
  <div class="review-checks"><b>${role}核查重点</b><p>${role === '营运确认' ? '确认实际业务损失、影响数量、活动时间和责任对象；存在争议时反馈具体字段与补充证据。' : '核对同一主单与 SKU、原始录入价格、图片标价、规格单位、时间及实际损失依据，形成可回查的判断。'}</p></div>
  ${action ? `<div class="simple-actions"><button class="primary-button" data-action="${action}-approve" data-id="${record.id}">确认</button><button class="secondary-button" data-action="feedback" data-id="${record.id}" data-role="${action}">我要反馈</button></div><form class="feedback-form" data-feedback-id="${record.id}" hidden><label>反馈字段与原因<textarea name="feedback" placeholder="例如：SKU 不一致，请补充原始录入记录" required></textarea></label><button class="primary-button" type="submit" data-id="${record.id}" data-role="${action}">提交反馈</button><span>提交后保留原始证据及反馈记录，等待补充。</span></form>` : ''}${record.feedback ? `<p class="feedback-log">反馈记录：${escapeHtml(record.feedback)}</p>` : ''}</article>`;
}
function renderAuto() { document.querySelector('#auto-content').innerHTML = caseDetails(ui.cases[0]); }
function renderReview() {
  const sections = [['HUMAN_REVIEW','人工审核','review']];
  document.querySelector('#review-content').innerHTML = sections.map(([state,label,action]) => ui.cases.filter(x=>x.state===state).map(x=>caseDetails(x,label,action)).join('')).join('') || '<div class="empty">当前没有待处理明细</div>';
  document.querySelector('#review-content').insertAdjacentHTML('afterbegin', roleHeader('review'));
}
function renderOps() { document.querySelector('#ops-content').innerHTML = roleHeader('ops') + (ui.cases.filter(x=>x.state==='OPS_CONFIRMATION').map(x=>caseDetails(x,'营运确认','ops')).join('') || '<div class="empty">当前没有待确认明细</div>'); }
function bizTable() {
  const rows=ui.cases.filter(x=>x.state==='BIZ_CONFIRMATION');
  return `<div class="plain-panel comparison-scroll"><table class="detail-grid"><thead><tr><th>主单 / 活动</th><th>商品 / 时间</th><th>渠道 / 原因</th><th>跟价金额</th><th>审核意见</th><th>营运意见</th><th>责任 / 规则</th><th>操作</th></tr></thead><tbody>${rows.map(x=>`<tr><td>${escapeHtml(x.orderNumber)}<small>${escapeHtml(x.facts.activityId)}</small></td><td>鲜猪肉 500g<small>${escapeHtml(x.facts.createdAt)} 至 ${escapeHtml(x.facts.endedAt)}</small></td><td>${escapeHtml(x.facts.surveyChannel)}<small>${escapeHtml(x.lossReason)}</small></td><td>¥${Number(x.facts.followPriceAmount).toFixed(2)}<small>最终追损金额待核定</small></td><td>演示：证据已核对</td><td>演示：业务事实已确认</td><td>责任待最终确认<small>适用现行规则原文，未配置扣罚公式</small></td><td><button class="primary-button" data-action="biz-approve" data-id="${x.id}">确认</button><button class="secondary-button" data-action="feedback" data-id="${x.id}" data-role="biz">我要反馈</button></td></tr><tr><td colspan="8"><form class="feedback-form" data-feedback-id="${x.id}" hidden><textarea name="feedback" placeholder="填写商分反馈" required></textarea><button type="submit" data-id="${x.id}" data-role="biz">提交反馈</button></form></td></tr>`).join('') || '<tr><td colspan="8">暂无待确认明细</td></tr>'}</tbody></table></div>`;
}
function renderBiz(){document.querySelector('#biz-content').innerHTML=roleHeader('biz')+bizTable().replaceAll('演示：证据已核对','审核员 A（演示）<small>证据已核对</small>').replaceAll('演示：业务事实已确认','营运专员 B（演示）<small>业务事实已确认</small>');}
const mistakeSamples = [
 ['LOSS-DEMO-101','10-08','演示市调员 A','线下门店','鲜猪肉 500g','价格录入错误','图片 ¥19.90，录入 ¥17.90','市调采价真实性与价格录入核对','待判责 / 未执行处罚','先放大价签，再核对单位后录入'],
 ['LOSS-DEMO-102','10-15','演示市调员 A','竞对小程序','牛奶 250ml×12','规格不一致','误将 250ml×10 对比 250ml×12','同品同规比价核验','已确认需整改 / 扣罚待核定','品牌、规格、件数逐项勾选'],
 ['LOSS-DEMO-103','10-23','演示市调员 A','线下门店','调味品 1L','图片时效错误','使用已结束活动图片','市调图片时效核验','待补证 / 未执行处罚','核对拍摄时间与活动有效期']
];
function renderNotebook(){
 document.querySelector('#notebook-content').innerHTML=`<div class="notebook-tabs"><button class="primary-button" data-notebook="personal">我的错题 · 本月</button><button class="secondary-button" data-notebook="public">公共错题本</button></div><section id="personal-notes" class="plain-panel"><h3>2026 年 10 月 · 演示市调员 A 的错单明细</h3><p>3 条演示案例；逐单展示错误、规则、处理状态和加强点。当前未接真实处罚系统，“已处罚”只允许在回读执行凭证后展示。</p><div class="comparison-scroll"><table class="detail-grid"><thead><tr>${['主单 ID','日期','人员','渠道','商品','错误类型','错误事实','适用核查规则','处理 / 处罚状态','加强点'].map(x=>`<th>${x}</th>`).join('')}</tr></thead><tbody>${mistakeSamples.map(row=>`<tr>${row.map(v=>`<td>${escapeHtml(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div><h4>本月处罚规则回查</h4><p>展示字段：规则名称、版本、生效时间、命中条款、责任比例、核定金额、执行日期、执行凭证。本 Demo 仅列核查规则名称，处罚条款、比例和金额待权威规则及人工判定接入后填充。</p></section><section id="public-notes" class="plain-panel" hidden><h3>公共错题本 · 高频错误榜（演示样本）</h3><p>按匿名同类错误汇总，学习纠错，不公开个人处罚信息。样本 12 条，排序为演示数据。</p><div class="comparison-scroll"><table class="detail-grid"><thead><tr><th>排序 / 错误</th><th>数量 / 占比</th><th>典型情况</th><th>关联样例</th><th>正确做法</th><th>检查点</th></tr></thead><tbody><tr><td>1 · 价格录入错误</td><td>6 / 50%</td><td>价签 19.90，录成 17.90</td><td>LOSS-DEMO-101</td><td>以同一商品原始有效价签核对录入</td><td>价格数字、单位、促销条件</td></tr><tr><td>2 · 规格不一致</td><td>4 / 33.3%</td><td>10 盒与 12 盒直接比价</td><td>LOSS-DEMO-102</td><td>核对品牌、净含量、包装件数</td><td>同品同规，不凭外观认定</td></tr><tr><td>3 · 图片时效错误</td><td>2 / 16.7%</td><td>引用已结束促销价</td><td>LOSS-DEMO-103</td><td>核对拍摄时间与价格有效期</td><td>时间、门店、活动限制</td></tr></tbody></table></div><h4>学习反馈</h4><p>高频问题进入下月培训；复测需回查新产生的同类任务，比较重复错误率后更新公共案例。</p></section>`;
}
function renderFlow(){
 const rows=[
 ['采购发起','在月度明细表填写主单 ID、渠道、原因，补充价格、数量、损失证据','填写主单 ID＋明细原因，系统查询后核对提交','必填校验、同主单防重，缺失明细退回补充','减少补数；检查字段完整率与重复提交率'],
 ['明细查询','人工跨系统查主单、SKU、活动和价格','同页关联活动 ID、创建 / 结束时间、金额、渠道、商品与人员','保留来源、查询时间和原始快照；匹配失败不能输出确定结论','核对同案一致性与查询成功率'],
 ['图片证据','人工收集市调与美菜截图并解释差异','双图同表展示，关联规格、价签、单位、有效期与原始录入','系统差异只作为线索，审核人核实证据后判断','衡量证据齐全率与补证次数'],
 ['人工审核','当前判责负责人核对材料并沟通补充','查看完整主单与双图，确认进入营运或我要反馈','反馈必须具体到字段和原因；记录审核人、时间、前后值','统计补证原因、退回率与处理时长'],
 ['营运确认','逐人沟通业务事实与承担方','同一明细核对实际损失、数量、时间、责任对象，确认或反馈','未确认不得自动进入商分；争议回到对应审核节点','统计营运争议类型与二次退回率'],
 ['商分确认','人工汇总并在核对表回查最终结果','简洁明细表核对前序意见、金额、责任与规则后确认','确认结论与实际扣罚执行分开记录，接入执行凭证才能标已处罚','金额闭合、规则版本与执行状态可追溯'],
 ['月报','月底人工整理渠道、原因及结果','仅纳入最终确认案件，输出明细、错误渠道、原因、建议','区分跟价金额、核定追损金额、实际执行金额','用结案明细对齐汇总，统计建议落实情况'],
 ['个人错题本','错误经验分散，无法按人回看','按月列本人错单、事实、规则、处罚状态和加强点','非本人错误不自动记错；改判后同步更正','跟踪同类再犯率及复测通过率'],
 ['公共错题本','依赖口头培训和零散案例','匿名汇总高频错误、典型样例、正确做法和核查点','同类型去重，样例保留证据；不公开个人处罚','看高频错误占比与培训后的变化']
 ];
 document.querySelector('#flow-content').innerHTML=`<article class="plain-panel"><h3>现行流程 → 新阶段：逐节点升级</h3><p>现状以当前月度追损表及已附追责流程为基线；新阶段为产品设计，通知、数据查询和处罚执行仍需接入业务系统。</p><div class="comparison-scroll"><table class="detail-grid"><thead><tr><th>节点</th><th>现状怎么做</th><th>新阶段怎么做</th><th>控制与异常处理</th><th>升级价值 / 验收</th></tr></thead><tbody>${rows.map(r=>`<tr>${r.map((v,i)=>`<${i?'td':'th'}>${escapeHtml(v)}</${i?'td':'th'}>`).join('')}</tr>`).join('')}</tbody></table></div><h4>流转规则</h4><p>采购提交 → 自动查数与证据整理 → 人工审核 → 营运确认 → 商分确认 → 月报与错题本。任一节点“我要反馈”均保留明细并记录问题，补充后回到原节点重新确认。</p><h4>分阶段上线与验收</h4><p>阶段一：双端 Demo 验证字段、证据与交互；阶段二：接入只读主单及图片来源，验证一致性、查不到与多 SKU 场景；阶段三：接入身份、通知和审核留痕，验证反馈与重新确认；阶段四：接入有效规则、执行凭证、月报和错题本，确保汇总可回查、改判可同步。</p></article>`;
}
document.addEventListener('click',event=>{
 const feedback=event.target.closest('[data-action="feedback"]');
 if(feedback){const form=document.querySelector(`[data-feedback-id="${feedback.dataset.id}"]`); if(form){form.hidden=!form.hidden; if(!form.hidden)form.querySelector('textarea').focus();}}
 const tab=event.target.closest('[data-notebook]'); if(tab){document.querySelector('#personal-notes').hidden=tab.dataset.notebook!=='personal';document.querySelector('#public-notes').hidden=tab.dataset.notebook!=='public';}
});
document.addEventListener('submit',event=>{if(!event.target.matches('.feedback-form'))return;event.preventDefault();const button=event.target.querySelector('button');const record=browserDemo.cases.find(x=>x.id===button.dataset.id);if(record){record.feedback=new FormData(event.target).get('feedback');record.state={review:'HUMAN_RETURNED',ops:'OPS_RETURNED',biz:'BIZ_RETURNED'}[button.dataset.role];document.querySelectorAll(`[data-id="${record.id}"][data-action$="-approve"]`).forEach(b=>{b.disabled=true;b.textContent='待补充';});event.target.innerHTML=`<p class="feedback-log">已提交反馈：${escapeHtml(record.feedback)}。当前状态：待补充，未进入下一节点。</p>`;showToast('反馈已记录，等待补充');}});
const roleOwners = {review:{label:'人工审核',person:'审核员 A（演示）',order:1,scope:'核对主单、原始录入及双图证据，形成审核意见。'},ops:{label:'营运确认',person:'营运专员 B（演示）',order:2,scope:'接收审核通过的案件，确认实际业务事实、损失口径及责任对象。'},biz:{label:'商分确认',person:'商分专员 C（演示）',order:3,scope:'接收营运确认的案件，核对金额、规则及前序意见，确认结案口径。'}};
function roleHeader(role){const r=roleOwners[role];return `<div class="plain-panel role-header"><b>第 ${r.order} 步 · ${r.label}</b><p>本节点办理人：<strong>${r.person}</strong></p><p>${r.scope}</p><small>人工审核 A → 营运 B → 商分 C；三个独立工作台，按顺序进入各自待办。人员名称为 Demo 占位。</small></div>`;}
function stageHistory(record){const active={HUMAN_REVIEW:1,OPS_CONFIRMATION:2,BIZ_CONFIRMATION:3,PENDING_EXECUTION:4}[record.state]||1;return `<div class="comparison-scroll"><table class="detail-grid"><thead><tr><th>顺序</th><th>办理节点</th><th>对应人员</th><th>处理状态</th><th>意见</th></tr></thead><tbody>${Object.values(roleOwners).map(r=>`<tr><td>${r.order}</td><td>${r.label}</td><td>${r.person}</td><td>${r.order<active?'已确认（演示）':r.order===active?'待处理':'待前序完成'}</td><td>${r.order<active?'本节点已完成核对（演示）':'—'}</td></tr>`).join('')}</tbody></table></div>`;}
function renderReport(){
 const rows=[
 ['LOSS-DEMO-201','ACT-DEMO-10201','10-08','广州','猪肉','鲜猪肉 500g','线下门店','价格录入错误','价签19.90，录入17.90','286.40','120.00','审核员 A / 10-09','营运专员 B / 10-10','商分专员 C / 10-11','已确认 / 待执行','价格录入核对','拍照后逐位核价'],
 ['LOSS-DEMO-202','ACT-DEMO-10202','10-15','广州','乳品','牛奶250ml×12','竞对小程序','规格不一致','10盒与12盒直接比价','180.00','80.00','审核员 A / 10-16','营运专员 B / 10-17','商分专员 C / 10-18','已确认 / 待执行','同品同规核验','品牌、净含量及件数核对'],
 ['LOSS-DEMO-203','ACT-DEMO-10203','10-23','深圳','调味品','调味品1L','线下门店','图片已过期','引用已结束活动图片','96.00','0.00','审核员 A / 10-24','营运专员 B / 10-25','商分专员 C / 10-26','已确认 / 不追损','图片时效核验','核实活动期及适用门店']
 ];
 document.querySelector('#report-content').innerHTML=`<article class="plain-panel"><h3>2026 年 10 月追损月报</h3><p>演示数据 · 已确认 3 单，核定可追损 2 单、不追损 1 单。跟价金额 ¥562.40，核定追损 ¥200.00，实际执行 ¥0.00；统计口径与下表逐单闭合。</p><h4>一、逐单明细</h4><p>三个办理节点分别显示人员、时间和处理顺序，向右滑动可查看全部字段。</p><div class="comparison-scroll"><table class="detail-grid"><thead><tr>${['主单ID','活动ID','发起日期','城市','品类','商品','错误渠道','错误原因','具体事实','跟价金额','核定追损金额','①人工审核 / 人员及时间','②营运确认 / 人员及时间','③商分确认 / 人员及时间','最终状态','适用核查规则','市调加强点'].map(v=>`<th>${v}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(v=>`<td>${escapeHtml(v)}</td>`).join('')}</tr>`).join('')}</tbody></table></div><h4>二、渠道与原因分析</h4><table class="detail-grid"><thead><tr><th>维度</th><th>分布</th><th>问题机制</th></tr></thead><tbody><tr><td>错误渠道</td><td>线下门店 2 单；竞对小程序 1 单</td><td>门店证据缺少有效期核对；线上商品容易遗漏包装件数。</td></tr><tr><td>错误原因</td><td>价格录入、规格不一致、时效错误各 1 单</td><td>录入、同规和有效期三个校验环节均需明确检查动作。</td></tr></tbody></table><h4>三、优化建议与跟进</h4><table class="detail-grid"><thead><tr><th>问题 / 关联单</th><th>优化动作</th><th>建议负责岗位</th><th>验收方式</th></tr></thead><tbody><tr><td>录入错误 / 201</td><td>图片标价与录入价并排展示，差异触发二次核对</td><td>产品配置；市调执行</td><td>回查新增样本的图价一致率及同类再犯情况</td></tr><tr><td>规格不一致 / 202</td><td>提交前核对品牌、净含量、单位与包装件数</td><td>市调负责人；审核人员</td><td>抽查同规校验记录，追踪规格原因退回情况</td></tr><tr><td>图片过期 / 203</td><td>收集拍摄时间、价格有效期、门店和促销限制</td><td>市调负责人；营运</td><td>核对证据是否覆盖对应活动期间</td></tr></tbody></table><h4>四、市调注意事项</h4><ol><li>同一主单与 SKU 对应同一商品，核对品牌、规格、单位和包装件数。</li><li>价签完整清晰，核对普通价、会员价、促销门槛及限购条件。</li><li>拍摄时间和价格有效期覆盖本次市调，核对门店、城市及渠道。</li><li>录入后再次对照原图，不用不同渠道的价差直接认定人员错误。</li><li>证据不足时补充原始记录；处罚以有效规则、确认结果及执行凭证回查。</li></ol><h4>五、错题本联动</h4><p>最终认定为市调人员错误的案件进入个人本月错题；匿名同类问题汇入公共错题本。后续改判同步更新月报、个人及公共案例。</p></article>`;
}
// Comparative design belongs in the Feishu document, not the application.
document.querySelectorAll('[data-view="flow"], [data-view-panel="flow"]').forEach(el=>el.remove());
delete titles.flow;
if(document.body.dataset.experience==='mobile'){
 document.querySelector('.mobile-nav').innerHTML=[['submit','＋','发起'],['auto','▤','明细'],['review','1','人审'],['ops','2','营运'],['biz','3','商分'],['report','⌁','月报'],['notebook','◇','错题本']].map(([view,icon,label])=>`<button class="nav-item" data-view="${view}"><i>${icon}</i><span>${label}</span></button>`).join('');
}
document.querySelectorAll('.nav-item').forEach((button) => button.addEventListener('click', () => switchView(button.dataset.view)));
document.querySelector('#submission-form').addEventListener('submit', submitCase);
loadAll().then(() => { const requested = new URL(location.href).searchParams.get('view'); if (titles[requested]) switchView(requested); }).catch((error) => showToast(`加载失败：${error.message}`, true));

