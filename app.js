/* ═══════════════════════════════════════════
   DocView — app.js  v2.1
   100% client-side · GitHub Pages ready
═══════════════════════════════════════════ */
'use strict';

/* ─── PDF.js worker ─── */
if (typeof pdfjsLib !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

const SAMPLE_URL =
  'https://raw.githubusercontent.com/mozilla/pdf.js/master/web/compressed.tracemonkey-pldi-09.pdf';

/* ══════════════════════════════════════════
   PDF MODULE
══════════════════════════════════════════ */
const PDF = (() => {
  let pdfDoc = null, page = 1, total = 1, zoom = 1.2;
  let scrollMode = true;
  let rendering = false;
  let scrollObserver = null;

  async function load(arrayBuffer) {
    pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    page = 1;
    total = pdfDoc.numPages;
    zoom = calcFitZoom(await pdfDoc.getPage(1));
    updateScrollModeUI();
    await render();
    document.getElementById('pdfNav').style.display = 'flex';
  }

  function calcFitZoom(pg) {
    const vp = pg.getViewport({ scale: 1 });
    const avail = Math.min(window.innerWidth - 80, 960);
    return Math.min(avail / vp.width, 1.6);
  }

  /* ── Scroll mode: render all pages stacked ── */
  async function renderAll() {
    if (rendering) return;
    rendering = true;
    if (scrollObserver) { scrollObserver.disconnect(); scrollObserver = null; }

    const container = document.getElementById('vContent');
    container.innerHTML = '';
    const dpr = window.devicePixelRatio || 1;

    for (let i = 1; i <= total; i++) {
      const wrap = document.createElement('div');
      wrap.className = 'pdf-page-wrap';
      wrap.dataset.pageNum = i;

      const label = document.createElement('div');
      label.className = 'pdf-page-label';
      label.textContent = `${i} / ${total}`;
      wrap.appendChild(label);

      const canvas = document.createElement('canvas');
      wrap.appendChild(canvas);
      container.appendChild(wrap);

      const pg = await pdfDoc.getPage(i);
      const vp = pg.getViewport({ scale: zoom * dpr });
      canvas.width = vp.width;
      canvas.height = vp.height;
      canvas.style.width  = vp.width  / dpr + 'px';
      canvas.style.height = vp.height / dpr + 'px';
      await pg.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
    }

    rendering = false;
    setupScrollObserver();
    updatePager();
  }

  /* ── Page mode: single page ── */
  async function renderOne() {
    if (rendering) return;
    rendering = true;
    if (scrollObserver) { scrollObserver.disconnect(); scrollObserver = null; }

    const container = document.getElementById('vContent');
    container.innerHTML = '';
    const dpr = window.devicePixelRatio || 1;
    const pg = await pdfDoc.getPage(page);
    const vp = pg.getViewport({ scale: zoom * dpr });

    const canvas = document.createElement('canvas');
    canvas.width = vp.width;
    canvas.height = vp.height;
    canvas.style.width  = vp.width  / dpr + 'px';
    canvas.style.height = vp.height / dpr + 'px';
    container.appendChild(canvas);

    await pg.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
    rendering = false;
    updatePager();
    document.querySelector('.viewer-body').scrollTop = 0;
  }

  async function render() {
    if (scrollMode) await renderAll();
    else await renderOne();
  }

  /* ── IntersectionObserver: update pager while scrolling ── */
  function setupScrollObserver() {
    const body = document.querySelector('.viewer-body');
    const wraps = document.querySelectorAll('.pdf-page-wrap');
    if (!wraps.length) return;

    scrollObserver = new IntersectionObserver(entries => {
      let best = null, bestRatio = 0;
      entries.forEach(e => {
        if (e.intersectionRatio > bestRatio) {
          bestRatio = e.intersectionRatio;
          best = e.target;
        }
      });
      if (best) {
        page = parseInt(best.dataset.pageNum);
        updatePager();
      }
    }, { root: body, threshold: Array.from({ length: 11 }, (_, i) => i / 10) });

    wraps.forEach(w => scrollObserver.observe(w));
  }

  function updatePager() {
    document.getElementById('pdfPager').textContent = `${page} / ${total}`;
    document.getElementById('pdfZoom').textContent = Math.round(zoom * 100) + '%';
    const pb = document.getElementById('pdfPrevBtn');
    const nb = document.getElementById('pdfNextBtn');
    if (!scrollMode) {
      if (pb) pb.style.opacity = page <= 1    ? '.3' : '1';
      if (nb) nb.style.opacity = page >= total ? '.3' : '1';
    } else {
      if (pb) pb.style.opacity = '1';
      if (nb) nb.style.opacity = '1';
    }
  }

  function prev() {
    if (scrollMode) {
      jumpToPage(Math.max(1, page - 1));
    } else {
      if (page > 1) { page--; renderOne(); }
    }
  }

  function next() {
    if (scrollMode) {
      jumpToPage(Math.min(total, page + 1));
    } else {
      if (page < total) { page++; renderOne(); }
    }
  }

  function jumpToPage(n) {
    const wrap = document.querySelector(`.pdf-page-wrap[data-page-num="${n}"]`);
    if (wrap) {
      wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
      page = n;
      updatePager();
    }
  }

  function zoomIn()  { zoom = Math.min(4, zoom + 0.2); render(); }
  function zoomOut() { zoom = Math.max(0.3, zoom - 0.2); render(); }

  function toggleScrollMode() {
    scrollMode = !scrollMode;
    updateScrollModeUI();
    render();
  }

  function updateScrollModeUI() {
    const btn   = document.getElementById('scrollModeBtn');
    const ico   = document.getElementById('scrollModeIco');
    const label = document.getElementById('scrollModeLabel');
    if (!btn) return;
    if (scrollMode) {
      btn.title = 'Ganti ke mode halaman';
      btn.classList.add('active-mode');
      if (label) label.textContent = 'Scroll';
      if (ico) ico.innerHTML = '<line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>';
    } else {
      btn.title = 'Ganti ke mode scroll';
      btn.classList.remove('active-mode');
      if (label) label.textContent = 'Halaman';
      if (ico) ico.innerHTML = '<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/>';
    }
  }

  function reset() {
    if (scrollObserver) { scrollObserver.disconnect(); scrollObserver = null; }
    pdfDoc = null; page = 1; total = 1; zoom = 1.2; rendering = false;
  }

  return { load, prev, next, zoomIn, zoomOut, toggleScrollMode, reset };
})();

/* ══════════════════════════════════════════
   WORD MODULE
══════════════════════════════════════════ */
const Word = {
  async load(arrayBuffer) {
    const result = await mammoth.convertToHtml({ arrayBuffer });
    document.getElementById('vContent').innerHTML =
      `<div class="word-wrap">${result.value || '<p style="color:var(--muted)">Dokumen kosong</p>'}</div>`;
  }
};

/* ══════════════════════════════════════════
   EXCEL MODULE
══════════════════════════════════════════ */
const Excel = (() => {
  let wb = null;

  function load(arrayBuffer) {
    wb = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
    renderSheetTabs();
    renderSheet(0);
  }

  function renderSheetTabs() {
    const tabs = document.getElementById('excelSheets');
    tabs.innerHTML = '';
    tabs.classList.remove('hidden');
    wb.SheetNames.forEach((name, i) => {
      const btn = document.createElement('button');
      btn.className = 'sheet-tab' + (i === 0 ? ' active' : '');
      btn.textContent = name;
      btn.onclick = () => {
        tabs.querySelectorAll('.sheet-tab').forEach((t, j) => t.classList.toggle('active', j === i));
        renderSheet(i);
      };
      tabs.appendChild(btn);
    });
  }

  function renderSheet(idx) {
    const name = wb.SheetNames[idx];
    const data = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1 });
    const el = document.getElementById('vContent');
    if (!data.length) {
      el.innerHTML = '<p style="text-align:center;padding:60px;color:var(--muted)">Sheet kosong</p>';
      return;
    }
    const cols = data.reduce((m, r) => Math.max(m, r.length), 0);
    const letters = Array.from({ length: cols }, (_, i) => colLetter(i));
    let html = '<div class="xls-wrap"><table class="xls-table"><thead><tr><th>#</th>';
    letters.forEach(c => html += `<th>${c}</th>`);
    html += '</tr></thead><tbody>';
    data.forEach((row, ri) => {
      html += `<tr><td>${ri + 1}</td>`;
      for (let ci = 0; ci < cols; ci++) {
        html += `<td>${row[ci] != null ? esc(String(row[ci])) : ''}</td>`;
      }
      html += '</tr>';
    });
    html += '</tbody></table></div>';
    el.innerHTML = html;
  }

  function colLetter(n) {
    let s = ''; n++;
    while (n > 0) { n--; s = String.fromCharCode(65 + n % 26) + s; n = Math.floor(n / 26); }
    return s;
  }

  function reset() { wb = null; }
  return { load, reset };
})();

/* ══════════════════════════════════════════
   VIEWER
══════════════════════════════════════════ */
const Viewer = (() => {
  let current = null;

  function showModal() {
    document.getElementById('viewerModal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function setInfo(name, meta, type) {
    document.getElementById('vName').textContent = name;
    document.getElementById('vMeta').textContent = meta;
    const ico = document.getElementById('vIcon');
    const map = {
      pdf:  { html: pdfSvg(),  bg: 'var(--pdf-bg)' },
      docx: { html: wordSvg(), bg: 'var(--doc-bg)' },
      xlsx: { html: xlsSvg(),  bg: 'var(--xls-bg)' },
    };
    const info = map[type] || map.pdf;
    ico.innerHTML = info.html;
    ico.style.background = info.bg;
  }

  function showLoading(yes) {
    document.getElementById('vLoading').style.display = yes ? 'flex' : 'none';
  }

  function resetControls() {
    document.getElementById('pdfNav').style.display = 'none';
    const sheets = document.getElementById('excelSheets');
    sheets.classList.add('hidden');
    sheets.innerHTML = '';
    PDF.reset();
    Excel.reset();
  }

  async function openBuffer(name, arrayBuffer, type) {
    current = { name, arrayBuffer, type };
    resetControls();
    showModal();
    setInfo(name, `${fmtSize(arrayBuffer.byteLength)} · ${type.toUpperCase()}`, type);
    document.getElementById('vContent').innerHTML = '';
    showLoading(true);

    try {
      if (type === 'pdf')       await PDF.load(arrayBuffer);
      else if (type === 'docx') await Word.load(arrayBuffer);
      else if (type === 'xlsx') Excel.load(arrayBuffer);
    } catch (err) {
      document.getElementById('vContent').innerHTML =
        `<div style="text-align:center;padding:60px">
          <div style="font-size:40px;margin-bottom:14px">⚠️</div>
          <div style="font-weight:700;margin-bottom:8px;color:var(--pdf-c)">Gagal membuka dokumen</div>
          <div style="font-size:13px;color:var(--muted)">${esc(err.message)}</div>
        </div>`;
      toast('Gagal membuka dokumen', 'err');
    } finally {
      showLoading(false);
    }
  }

  async function openFile(file) {
    const type = detectType(file.name, file.type);
    if (!type) { toast('Format tidak didukung. Gunakan PDF, DOCX, atau XLSX.', 'err'); return; }
    const buf = await file.arrayBuffer();
    await openBuffer(file.name, buf, type);
  }

  async function openFromUrl() {
    const raw = document.getElementById('urlInput').value.trim();
    if (!raw) { toast('Masukkan URL terlebih dahulu', 'err'); return; }

    let url;
    try { url = new URL(raw); }
    catch { toast('URL tidak valid', 'err'); return; }

    const name = decodeURIComponent(url.pathname.split('/').pop()) || 'document';
    const type = detectType(name, '');
    if (!type) { toast('Tipe file tidak diketahui. Pastikan URL diakhiri .pdf, .docx, atau .xlsx', 'err'); return; }

    resetControls();
    showModal();
    setInfo(name, 'Mengambil dari URL…', type);
    document.getElementById('vContent').innerHTML = '';
    showLoading(true);

    try {
      const res = await fetch(raw);
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      const buf = await res.arrayBuffer();
      await openBuffer(name, buf, type);
    } catch (err) {
      showLoading(false);
      document.getElementById('vContent').innerHTML =
        `<div style="text-align:center;padding:60px">
          <div style="font-size:40px;margin-bottom:14px">🌐</div>
          <div style="font-weight:700;margin-bottom:10px;color:var(--pdf-c)">Gagal mengambil URL</div>
          <div style="font-size:13px;color:var(--muted);margin-bottom:8px">${esc(err.message)}</div>
          <div style="font-size:12px;color:var(--faint)">Server mungkin memblokir request karena kebijakan CORS.</div>
        </div>`;
      toast('Gagal mengambil URL', 'err');
    }
  }

  function download() {
    if (!current) return;
    const blob = new Blob([current.arrayBuffer]);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = current.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }

  function close() {
    document.getElementById('viewerModal').classList.add('hidden');
    document.getElementById('vContent').innerHTML = '';
    document.body.style.overflow = '';
    current = null;
  }

  return { openFile, openFromUrl, download, close };
})();

/* ══════════════════════════════════════════
   UI CONTROLLER
══════════════════════════════════════════ */
const UI = (() => {
  let theme = localStorage.getItem('dv_theme') || 'light';

  function init() {
    applyTheme(theme);
    setupDrop();
    setupFileInput();
    setupKeyboard();
    go('home');
  }

  /* ─ Pages ─ */
  function go(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    const pg = document.getElementById(`page-${page}`);
    if (pg) pg.classList.add('active');
    const nb = document.querySelector(`[data-page="${page}"]`);
    if (nb) nb.classList.add('active');
    closeSidebar();
  }

  /* ─ Sidebar ─ */
  function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('overlay').classList.toggle('show');
  }
  function closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('overlay').classList.remove('show');
  }

  /* ─ Open tabs ─ */
  function switchOpenTab(which, btn) {
    document.querySelectorAll('.open-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('panelFile').classList.toggle('active', which === 'file');
    document.getElementById('panelUrl').classList.toggle('active', which === 'url');
    // Clear CORS result when switching tabs
    if (which === 'file') hideCorsResult();
  }

  /* ─ Theme ─ */
  function toggleTheme() {
    theme = theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('dv_theme', theme);
    applyTheme(theme);
  }
  function applyTheme(t) {
    document.body.className = t;
    const lbl = document.getElementById('themeLabel');
    const ico = document.getElementById('themeIco');
    if (t === 'dark') {
      if (lbl) lbl.textContent = 'Light Mode';
      if (ico) ico.innerHTML = '<path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>';
    } else {
      if (lbl) lbl.textContent = 'Dark Mode';
      if (ico) ico.innerHTML = '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>';
    }
  }

  /* ─ CORS check ─ */
  async function checkCors() {
    const raw = document.getElementById('urlInput').value.trim();
    if (!raw) { toast('Masukkan URL terlebih dahulu', 'err'); return; }

    let url;
    try { url = new URL(raw); }
    catch { showCorsResult('err', '❌ URL tidak valid'); return; }

    const btn = document.getElementById('corsCheckBtn');
    btn.disabled = true;
    btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation:spin .7s linear infinite"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg> Mengecek…`;

    showCorsResult('checking',
      `<span style="display:flex;align-items:center;gap:8px">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation:spin .7s linear infinite;flex-shrink:0"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
        Mengecek akses CORS ke <strong>${esc(url.hostname)}</strong>…
      </span>`);

    try {
      // Use HEAD first (lighter), fall back to GET with Range header
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      let res;
      try {
        res = await fetch(raw, { method: 'HEAD', signal: controller.signal });
      } catch {
        res = await fetch(raw, { method: 'GET', headers: { Range: 'bytes=0-0' }, signal: controller.signal });
      }
      clearTimeout(timeout);

      if (res.ok || res.status === 206 || res.status === 304) {
        const type = detectType(url.pathname, res.headers.get('content-type') || '');
        const typeStr = type ? ` · Tipe: <strong>${type.toUpperCase()}</strong>` : '';
        showCorsResult('ok',
          `✅ <strong>URL dapat diakses!</strong> CORS diizinkan${typeStr}. Klik <em>Buka</em> untuk membuka dokumen.`);
      } else {
        showCorsResult('warn',
          `⚠️ Server merespons dengan status <strong>${res.status}</strong>. File mungkin tidak ditemukan atau membutuhkan autentikasi.`);
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        showCorsResult('err', '❌ <strong>Timeout</strong> — server tidak merespons dalam 8 detik.');
      } else {
        showCorsResult('err',
          `❌ <strong>CORS diblokir</strong> — browser tidak diizinkan mengakses URL ini. Coba download filenya lalu buka via tab "Dari Komputer".`);
      }
    } finally {
      btn.disabled = false;
      btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> Cek CORS`;
    }
  }

  function showCorsResult(type, html) {
    const el = document.getElementById('corsResult');
    el.className = `cors-result cors-result-${type}`;
    el.innerHTML = html;
    el.classList.remove('hidden');
  }

  function hideCorsResult() {
    document.getElementById('corsResult').classList.add('hidden');
  }

  /* ─ CORS info toggle ─ */
  function toggleCors() {
    const body    = document.getElementById('corsBody');
    const chevron = document.getElementById('corsChevron');
    const open    = body.classList.toggle('open');
    chevron.style.transform = open ? 'rotate(180deg)' : '';
  }

  /* ─ Sample ─ */
  function loadSample() {
    const input = document.getElementById('urlInput');
    input.value = SAMPLE_URL;
    // Switch to URL tab if not already
    switchOpenTab('url', document.getElementById('tabUrl'));
    hideCorsResult();
    toast('Contoh file dimuat. Klik "Buka" untuk membukanya.', 'ok');
  }

  /* ─ Drop setup ─ */
  function setupDrop() {
    const zone = document.getElementById('dropZone');
    if (!zone) return;
    ['dragenter','dragover'].forEach(ev =>
      zone.addEventListener(ev, e => { e.preventDefault(); zone.classList.add('over'); }));
    ['dragleave','drop'].forEach(ev =>
      zone.addEventListener(ev, () => zone.classList.remove('over')));
    zone.addEventListener('drop', e => {
      e.preventDefault();
      const files = Array.from(e.dataTransfer.files);
      if (files.length) Viewer.openFile(files[0]);
    });

    // Global drag-and-drop anywhere on page
    document.addEventListener('dragover', e => e.preventDefault());
    document.addEventListener('drop', e => {
      e.preventDefault();
      if (e.dataTransfer.files.length) Viewer.openFile(e.dataTransfer.files[0]);
    });
  }

  function setupFileInput() {
    const input = document.getElementById('fileInput');
    input.addEventListener('change', () => {
      if (input.files.length) { Viewer.openFile(input.files[0]); input.value = ''; }
    });
    document.getElementById('urlInput').addEventListener('keydown', e => {
      if (e.key === 'Enter') Viewer.openFromUrl();
    });
  }

  function setupKeyboard() {
    document.addEventListener('keydown', e => {
      const modal = document.getElementById('viewerModal');
      if (!modal.classList.contains('hidden')) {
        if (e.key === 'Escape') Viewer.close();
        if (e.key === 'ArrowLeft')       PDF.prev();
        if (e.key === 'ArrowRight')      PDF.next();
        if (e.key === '+' || e.key === '=') PDF.zoomIn();
        if (e.key === '-')               PDF.zoomOut();
      }
    });
  }

  return { init, go, toggleSidebar, closeSidebar, toggleTheme, switchOpenTab, checkCors, toggleCors, loadSample };
})();

/* ══════════════════════════════════════════
   HELPERS
══════════════════════════════════════════ */
function detectType(name, mime) {
  const n = (name || '').toLowerCase();
  if (n.endsWith('.pdf') || mime.includes('pdf')) return 'pdf';
  if (n.endsWith('.docx') || n.endsWith('.doc') || mime.includes('word')) return 'docx';
  if (n.endsWith('.xlsx') || n.endsWith('.xls') || mime.includes('sheet') || mime.includes('excel')) return 'xlsx';
  return null;
}

function fmtSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

function esc(str) {
  const d = document.createElement('div');
  d.appendChild(document.createTextNode(String(str)));
  return d.innerHTML;
}

let _toastTimer;
function toast(msg, type = '') {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast ${type}`;
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => t.classList.add('hidden'), 3500);
}

function pdfSvg() {
  return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="1.8"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`;
}
function wordSvg() {
  return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="1.8"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`;
}
function xlsSvg() {
  return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>`;
}

/* ─── Boot ─── */
document.addEventListener('DOMContentLoaded', UI.init);
