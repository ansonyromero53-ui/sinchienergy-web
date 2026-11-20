// Aparición suave al hacer scroll
const io = new IntersectionObserver((entries) => {
  entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
}, { threshold: 0.15 });
document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

// Inclinación 3D de los envases con el mouse
const hero = document.getElementById('hero');
const tilt = document.getElementById('tilt');
hero.addEventListener('mousemove', (e) => {
  const r = hero.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width - 0.5;
  const y = (e.clientY - r.top) / r.height - 0.5;
  tilt.style.transform = 'perspective(1400px) rotateY(' + (x * 12).toFixed(1) + 'deg) rotateX(' + (-y * 8).toFixed(1) + 'deg)';
});
hero.addEventListener('mouseleave', () => { tilt.style.transform = ''; });

const API = '/api';
const csrf = () => (document.cookie.match(/(?:^|;\s*)csrftoken=([^;]+)/) || [])[1] || '';
async function post(path, data) {
  if (!csrf()) { try { await fetch(API + '/cuenta/sesion', { credentials: 'same-origin' }); } catch (_) {} }
  const r = await fetch(API + path, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrf() }, body: JSON.stringify(data) });
  let j = {};
  try { j = await r.json(); } catch (_) {}
  if (!r.ok || !j.ok) throw new Error(j.error || 'No se pudo enviar. Inténtalo otra vez.');
  return j;
}
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Lista de espera (correo)
const form = document.getElementById('form');
const mail = document.getElementById('mail');
const err = document.getElementById('error');
const ok = document.getElementById('ok');
mail.addEventListener('input', () => { err.hidden = true; });
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const v = mail.value.trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) { err.textContent = 'Escribe un correo válido.'; err.hidden = false; return; }
  const hp = document.querySelector('input[form="form"][name="web"]');
  try {
    await post('/suscribir', { email: v, web: hp ? hp.value : '' });
    form.hidden = true; ok.hidden = false;
  } catch (x) { err.textContent = x.message; err.hidden = false; }
});

// Novedades
(async () => {
  try {
    const j = await fetch(API + '/novedades').then((r) => r.json());
    if (!j.novedades || !j.novedades.length) return;
    document.getElementById('novedades').hidden = false;
    const fmt = new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'long', year: 'numeric' });
    document.getElementById('newsList').innerHTML = j.novedades.map((n) =>
      '<article class="news-card"><span class="news-date">' + esc(fmt.format(new Date(n.fecha + 'T12:00:00'))) + '</span><h3>' + esc(n.titulo) + '</h3><p class="muted">' + esc(n.texto) + '</p></article>').join('');
  } catch (_) {}
})();

// Productos para separar
const sel = document.getElementById('prodSel');
(async () => {
  try {
    const j = await fetch(API + '/productos').then((r) => r.json());
    // Si en el admin el formato se escribe como "Sachet 60 g · Maracuyá", se agrupa por formato y se elige el sabor
    const grupos = {};
    j.productos.filter((p) => !/ULTRA/i.test(p.nombre || '')).forEach((p) => {
      const [f0, sabor] = String(p.formato).split(' · ');
      // "SINCHI CARB RACE" -> "RACE · Sachet 60 g"
      const linea = String(p.nombre || '').replace(/^SINCHI(\s+CARB)?\s*/i, '').trim();
      const fmt = linea ? linea + ' · ' + f0 : f0;
      (grupos[fmt] = grupos[fmt] || []).push({ id: p.id, txt: sabor ? fmt + ' · ' + sabor : fmt, sabor, linea });
    });
    const orden = (k) => (/^RACE/i.test(k) ? 0 : 1);
    sel.innerHTML = '<option value="">Elige</option>' + Object.entries(grupos).sort((x, y) => orden(x[0]) - orden(y[0])).map(([fmt, ps]) =>
      ps.length > 1 || ps[0].sabor
        ? '<optgroup label="' + esc(fmt) + '">' + ps.map((p) => '<option value="' + p.id + '">' + esc(p.txt) + '</option>').join('') + '</optgroup>'
        : '<option value="' + ps[0].id + '">' + esc(ps[0].txt) + '</option>').join('');
  } catch (_) { sel.innerHTML = '<option value="">No disponible ahora</option>'; }
})();

// Separar: en la web abre un panel; en la app va directo en la página
const sepWrap = document.getElementById('sepWrap');
const openSep = () => { sepWrap.classList.add('open'); document.body.classList.add('lock'); setTimeout(() => sepWrap.querySelector('input').focus(), 150); };
const closeSep = () => { sepWrap.classList.remove('open'); document.body.classList.remove('lock'); };
document.getElementById('sepOpen').addEventListener('click', openSep);
document.getElementById('sepClose').addEventListener('click', closeSep);
sepWrap.addEventListener('click', (e) => { if (e.target === sepWrap) closeSep(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSep(); });
document.querySelectorAll('a[href="#separar"]').forEach((a) => a.addEventListener('click', (e) => {
  if (document.documentElement.classList.contains('is-app')) return;
  e.preventDefault(); openSep();
}));

// Separar
const sep = document.getElementById('sepForm');
const sepMsg = document.getElementById('sepMsg');
sep.addEventListener('submit', async (e) => {
  e.preventDefault();
  const d = Object.fromEntries(new FormData(sep).entries());
  sepMsg.className = 'form-msg';
  if (!d.nombre.trim() || d.celular.replace(/\D/g, '').length < 9 || !d.producto) {
    sepMsg.textContent = 'Completa tu nombre, un celular válido y el producto.'; sepMsg.classList.add('bad'); return;
  }
  const btn = sep.querySelector('button[type=submit]');
  btn.disabled = true; sepMsg.textContent = 'Enviando…';
  try {
    await post('/separar', d);
    sep.reset();
    sepMsg.textContent = '¡Listo! Ya separaste el tuyo. Te escribiremos por WhatsApp cuando esté disponible y pagas con Yape o Plin.'; sepMsg.classList.add('good');
  } catch (x) { sepMsg.textContent = x.message; sepMsg.classList.add('bad'); }
  btn.disabled = false;
});

// Cuenta: menú y datos para separar
(async () => {
  try {
    const s = await fetch('/api/cuenta/sesion', { credentials: 'same-origin' }).then((r) => r.json());
    const u = s && s.usuario;
    if (!u) return;
    const a = document.getElementById('navCuenta');
    if (a) a.textContent = 'Mi SINCHI';
    const f = document.getElementById('sepForm');
    if (!f) return;
    const put = (n, v) => { const i = f.querySelector('[name="' + n + '"]'); if (i && !i.value && v) i.value = v; };
    put('nombre', [u.nombre, u.apellido].filter(Boolean).join(' '));
    put('celular', u.celular);
    put('email', u.email);
  } catch (_) {}
})();

// App instalable: el botón solo aparece si la app se puede instalar y aún no está instalada
let deferred = null;
const root = document.documentElement;
const UA = navigator.userAgent;
const isIOS = /iphone|ipad|ipod/i.test(UA) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isAndroid = /android/i.test(UA);
const isApp = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true || /[?&]app=1/.test(location.search);
const getFlag = () => { try { return localStorage.getItem('sinchi_instalada') === '1'; } catch (_) { return false; } };
const setFlag = (v) => { try { v ? localStorage.setItem('sinchi_instalada', '1') : localStorage.removeItem('sinchi_instalada'); } catch (_) {} };
const showInstall = (v) => root.classList.toggle('can-install', !!v && !isApp());
if (isApp()) { root.classList.add('is-app'); setFlag(true); }
// Chrome, Edge, Samsung: este evento solo llega si la app NO está instalada
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; setFlag(false); showInstall(true); });
// Safari (iPhone) y Firefox no avisan si ya está instalada: se muestra hasta que la persona confirme
if (!('onbeforeinstallprompt' in window) && (isIOS || isAndroid) && !isApp() && !getFlag()) showInstall(true);
// Si ya está instalada (Chrome Android), ocultar
if (navigator.getInstalledRelatedApps) navigator.getInstalledRelatedApps().then((l) => { if (l && l.length) { setFlag(true); showInstall(false); } }).catch(() => {});
window.matchMedia('(display-mode: standalone)').addEventListener?.('change', (e) => { if (e.matches) { root.classList.add('is-app'); showInstall(false); } });
const modal = document.getElementById('iosModal');
const btns = document.querySelectorAll('.install-btn');
document.getElementById('iosClose').addEventListener('click', () => { modal.hidden = true; });
const done = document.getElementById('iosDone');
if (done) done.addEventListener('click', () => { setFlag(true); showInstall(false); modal.hidden = true; });
btns.forEach((b) => b.addEventListener('click', async () => {
  if (deferred) {
    deferred.prompt();
    const r = await deferred.userChoice; deferred = null;
    if (r && r.outcome === 'accepted') { setFlag(true); showInstall(false); }
    return;
  }
  if (!isIOS) {
    modal.querySelector('h3').textContent = 'Instala SINCHI CARB';
    modal.querySelector('ol').innerHTML = '<li>Abre el menú del navegador (⋮).</li><li>Elige <b>“Instalar app”</b> o <b>“Agregar a pantalla de inicio”</b>.</li>';
  }
  modal.hidden = false;
}));
window.addEventListener('appinstalled', () => { deferred = null; setFlag(true); showInstall(false); });
if ('serviceWorker' in navigator) { window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js')); }

document.getElementById('year').textContent = new Date().getFullYear();

// Contador de dorsales Origen
(async () => {
  try {
    const j = await fetch(API + '/cuenta/origen').then((r) => r.json());
    if (!j.ok || !(j.restantes > 0)) throw 0;
    document.getElementById('origenN').textContent = j.restantes;
    document.getElementById('origenPill').classList.remove('is-wait');
  } catch (_) { document.getElementById('origenPill').hidden = true; }
})();
// Copiar número de Yape / Plin
document.querySelectorAll('.paytile').forEach((b) => b.addEventListener('click', async () => {
  const n = b.dataset.copy, act = b.querySelector('.pt-act');
  try { await navigator.clipboard.writeText(n); } catch (_) {
    const t = document.createElement('textarea'); t.value = n; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); } catch (e) {} t.remove();
  }
  b.classList.add('ok'); act.textContent = 'Copiado';
  if (window.gtag) gtag('event', 'copiar_numero_pago', { metodo: b.querySelector('b').textContent });
  setTimeout(() => { b.classList.remove('ok'); act.textContent = 'Copiar'; }, 1800);
}));

// ULTRA: avísame (misma lista de acceso anticipado)
const uf = document.getElementById('ultraForm');
if (uf) uf.addEventListener('submit', async (e) => {
  e.preventDefault();
  const v = document.getElementById('ultraMail').value.trim(), msg = document.getElementById('ultraMsg');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) { msg.textContent = 'Escribe un correo válido.'; return; }
  try {
    await post('/suscribir', { email: v, web: '' });
    uf.hidden = true; msg.textContent = 'Listo. Serás de los primeros en conocer ULTRA.';
    if (window.gtag) gtag('event', 'avisame_ultra');
  } catch (x) { msg.textContent = x.message; }
});
