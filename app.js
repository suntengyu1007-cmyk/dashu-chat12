const ui = { meta: null, cases: [], report: null, notebook: [], metrics: null };
const titles = { submit: '采购填报', auto: '主单明细', review: '人工审核', ops: '营运确认', biz: '商分确认', report: '追损月报', notebook: '市调错误错题本', flow: '阶段对比', iteration: '迭代看板' };
const browserDemo = {
  meta: { ok: true, app: { version: 'MVP 0.7 Dense', mode: 'DEMO' }, states: {}, dictionaries: { errorReasons: { PRICE_ENTRY_ERROR: { label: '价格录入错误' } } } },
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
  const mobileTitles = { submit: '快速发起追损', auto: '主单明细', review: '待办确认', report: '追损月报', notebook: '错误错题本' };
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

function renderAll() { renderAuto(); renderReview(); renderOps(); renderBiz(); renderReport(); renderNotebook(); renderFlow(); renderIteration(); }
async function loadAll() {
  const [meta, cases, report, notebook, metrics] = await Promise.all([api('/api/meta'), api('/api/cases'), api('/api/reports/monthly?month=2026-09'), api('/api/notebook?month=2026-09'), api('/api/metrics/iteration')]);
  ui.meta = meta; ui.cases = cases.cases; ui.report = report.report; ui.notebook = notebook.entries; ui.metrics = metrics.metrics;
  document.querySelector('#version-badge').textContent = meta.app.version; document.querySelector('#mode-badge').textContent = 'Demo';
  const mobile = document.body.dataset.experience === 'mobile';
  document.querySelector('#environment-banner').innerHTML = mobile ? '<strong>移动端：</strong> 快速填报与待办确认。' : '<strong>电脑端：</strong> 完整明细、证据对比与闭环分析。';
  renderAll();
}

document.querySelectorAll('.nav-item').forEach((button) => button.addEventListener('click', () => switchView(button.dataset.view)));
document.querySelector('#submission-form').addEventListener('submit', submitCase);
loadAll().then(() => { const requested = new URL(location.href).searchParams.get('view'); if (titles[requested]) switchView(requested); }).catch((error) => showToast(`加载失败：${error.message}`, true));

