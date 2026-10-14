/* Kinti Bus · Mesa de Datos. Puesto del analista: cola de tickets, consola TEST/PRODUCCIÓN, incidentes,
   pase a producción y certificado de avance. Todo corre en el navegador del analista (entorno aislado).
   Sin instrucciones ni validación visible: el analista decide; el DBA y los solicitantes responden como en una empresa. */
(function () {
'use strict';
const VERSION = 3;
const T = Escenario.TICKETS, PER = Escenario.PERSONAS;
const ESQ = Datos.ESQUEMA;
const FECHA = 'Lun 12 oct 2026', DIA_ISO = '2026-10-12';
const MAX_PUNTOS = T.reduce((a, t) => a + (t.tipo === 'cambio' ? 120 : 100), 0);
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const app = $('#app');

/* ================================================================ íconos (sin emojis) */
const IC = {
  play: '<path d="M7 5l12 7-12 7z" fill="currentColor" stroke="none"/>', check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
  candado: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>',
  abierto: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 017.6-1.7"/>',
  deshacer: '<path d="M9 5L4 10l5 5"/><path d="M4 10h10a6 6 0 010 12h-4"/>', guardar: '<path d="M5 4h11l3 3v13H5z"/><path d="M8 4v5h7V4M8 20v-6h8v6"/>',
  alerta: '<path d="M12 3L2 20h20z"/><path d="M12 10v4M12 17v.5"/>',
  cohete: '<path d="M12 2c3 2 5 6 5 10l-2 4H9l-2-4c0-4 2-8 5-10z"/><circle cx="12" cy="10" r="2"/><path d="M9 16l-2 4 3-1M15 16l2 4-3-1"/>',
  base: '<ellipse cx="12" cy="5" rx="7" ry="2.5"/><path d="M5 5v14c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V5"/><path d="M5 12c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5"/>',
  ticket: '<path d="M3 7h18v3a2 2 0 000 4v3H3v-3a2 2 0 000-4z"/><path d="M14 7v10" stroke-dasharray="2 2"/>',
  reloj: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  trofeo: '<path d="M8 4h8v5a4 4 0 01-8 0z"/><path d="M8 6H5a3 3 0 003 4M16 6h3a3 3 0 01-3 4M12 13v4M8 21h8M9.5 17h5"/>',
  salir: '<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10"/>', lista: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.5M4 12h.5M4 18h.5"/>',
  libro: '<path d="M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2z"/><path d="M4 19V5M8 7h7"/>', descargar: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  reiniciar: '<path d="M4 4v6h6"/><path d="M5 10a8 8 0 112 7"/>', consola: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 9l3 3-3 3M12 15h5"/>',
  mensaje: '<path d="M4 5h16v11H9l-5 4z"/>',
};
const ico = (n, cls = '') => `<svg class="ico ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[n]}</svg>`;
const LOGO = `<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="30" fill="#EAAA00"/><rect x="15" y="17" width="34" height="30" rx="6" fill="#002C71"/><rect x="19" y="21" width="26" height="12" rx="2" fill="#cfe0ff"/><circle cx="22" cy="41" r="2.6" fill="#EAAA00"/><circle cx="42" cy="41" r="2.6" fill="#EAAA00"/><rect x="18" y="47" width="6" height="5" rx="1.5" fill="#002C71"/><rect x="40" y="47" width="6" height="5" rx="1.5" fill="#002C71"/><path d="M45 13c6-6 13-3 15 1-5-1-9 0-13 4z" fill="#910048"/></svg>`;
function sticker(tipo) {
  const boca = { feliz: '<path d="M46 74q14 12 28 0" stroke="#002C71" stroke-width="5" fill="none" stroke-linecap="round"/>',
    duda: '<path d="M47 78q13-8 26 0" stroke="#002C71" stroke-width="5" fill="none" stroke-linecap="round"/>',
    alarma: '<ellipse cx="60" cy="77" rx="9" ry="7" fill="#002C71"/>' }[tipo];
  const cejas = tipo === 'feliz' ? '' : '<path d="M40 44l12 4M80 44l-12 4" stroke="#002C71" stroke-width="4" stroke-linecap="round"/>';
  const luz = tipo === 'alarma' ? '<rect x="52" y="6" width="16" height="9" rx="4" fill="#910048"/><path d="M44 6l-6-5M76 6l6-5" stroke="#910048" stroke-width="3" stroke-linecap="round"/>' : '';
  return `<svg class="sticker" viewBox="0 0 120 120" aria-hidden="true">${luz}<rect x="18" y="14" width="84" height="88" rx="16" fill="#EAAA00"/><rect x="26" y="24" width="68" height="40" rx="8" fill="#e8f0ff"/>
    <circle cx="46" cy="52" r="6" fill="#002C71"/><circle cx="74" cy="52" r="6" fill="#002C71"/>${cejas}${boca}
    <rect x="22" y="100" width="18" height="12" rx="4" fill="#002C71"/><rect x="80" y="100" width="18" height="12" rx="4" fill="#002C71"/>
    <circle cx="30" cy="88" r="5" fill="#fff"/><circle cx="90" cy="88" r="5" fill="#fff"/></svg>`;
}
function aviso(txt, tipo = '') {
  const d = document.createElement('div');
  d.className = 'aviso ' + tipo; d.innerHTML = txt;
  const caja = $('#avisos');
  while (caja.children.length >= 2) caja.firstChild.remove();
  caja.appendChild(d);
  setTimeout(() => d.remove(), tipo === 'mal' ? 7000 : 4500);
}

/* ================================================================ almacenamiento */
const LS = 'kintibus:v2:';
const almacen = {
  leer(c) { try { return JSON.parse(localStorage.getItem(LS + c)); } catch (e) { return null; } },
  escribir(c, v) { try { localStorage.setItem(LS + c, JSON.stringify(v)); return true; } catch (e) { return false; } },
};
const IDB = {
  db: null,
  abrir() {
    return new Promise(res => {
      try {
        const r = indexedDB.open('kintibus', 1);
        r.onupgradeneeded = () => r.result.createObjectStore('bases');
        r.onsuccess = () => { this.db = r.result; res(true); };
        r.onerror = () => res(false);
        setTimeout(() => res(!!this.db), 3000);
      } catch (e) { res(false); }
    });
  },
  op(modo, fn) {
    return new Promise(res => {
      if (!this.db) return res(null);
      try { const tx = this.db.transaction('bases', modo); const r = fn(tx.objectStore('bases')); tx.oncomplete = () => res(r && 'result' in r ? r.result : true); tx.onerror = () => res(null); }
      catch (e) { res(null); }
    });
  },
  poner(k, v) { return this.op('readwrite', s => s.put(v, k)); },
  sacar(k) { return this.op('readonly', s => s.get(k)); },
  borrar(k) { return this.op('readwrite', s => s.delete(k)); },
};

/* ================================================================ trabajador (motor SQL) con recuperación */
const W = {
  w: null, n: 0, pend: new Map(),
  crear() {
    this.w = new Worker('js/trabajador.js?v=' + VERSION);
    this.w.onmessage = e => {
      const p = this.pend.get(e.data.id); if (!p) return;
      this.pend.delete(e.data.id); clearTimeout(p.to);
      if (e.data.ok) p.res(e.data.r); else p.rej(new Error(e.data.error));
    };
    this.w.onerror = () => this.caida('error');
  },
  pedir(op, datos, ms = 12000) {
    return new Promise((res, rej) => {
      const id = ++this.n;
      const to = setTimeout(() => { this.pend.delete(id); this.caida('tiempo'); rej(Object.assign(new Error('tiempo'), { tiempo: true })); }, ms);
      this.pend.set(id, { res, rej, to });
      this.w.postMessage({ id, op, datos });
    });
  },
  caida(motivo) {
    try { this.w.terminate(); } catch (e) { /* ya terminó */ }
    for (const p of this.pend.values()) { clearTimeout(p.to); p.rej(Object.assign(new Error('caida'), { caida: true })); }
    this.pend.clear();
    this.crear();
    if (P && UI.listo) recuperar(motivo);
  },
};

/* ================================================================ estado */
let P = null;                     // progreso del analista (se guarda en el navegador)
const UI = { cambios: { TEST: 0, PROD: 0 }, listo: false, entorno: 'TEST', salida: 'resultados', izq: 'tickets', ocupado: false, ultimo: { TEST: null, PROD: null }, respuestas: null, vista: 'consola' };
function nuevoAvance(cuenta) {
  return { v: VERSION, cuenta, k: 0, cerrados: {}, puntos: 0, t: nuevoTicket(0), incidentes: [], m: { rollbacks: 0, pasesOk: 0, criticos: 0 }, inicio: new Date().toISOString(), llaves: {} };
}
function nuevoTicket(k) {
  return { id: T[k] ? T[k].id : null, inc: null, pase: null, desplegado: false, intentos: 0, prodDeploys: 0, ejecutoTest: false, editor: { TEST: '', PROD: '' }, tran: { TEST: 0, PROD: 0 }, criticos: 0 };
}
function guardar() { if (!P) return; P.ultima = new Date().toISOString(); if (!almacen.escribir(P.cuenta, P)) aviso('No se pudo guardar el avance en este navegador.', 'mal'); }
const ticket = () => T[P.k];
const horaTicket = () => (ticket() ? ticket().hora.slice(11, 16) : '17:30');
const normTxt = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toUpperCase().replace(/\s+/g, ' ');
const nombrePropio = s => s.trim().replace(/\s+/g, ' ').toLocaleLowerCase('es').replace(/(^|[\s'-])(\p{L})/gu, (m, a, b) => a + b.toLocaleUpperCase('es')).replace(/ (De|Del|La|Las|Los|Y) /g, m => m.toLowerCase());

/* ================================================================ tickets sellados
   Cada ticket trae un sello (AES-GCM) con su solución y el requerimiento del siguiente. La llave sale de la respuesta
   correcta o de la huella del estado correcto de PRODUCCIÓN: se guarda al cerrar el ticket y no se puede calcular antes. */
const ABIERTO = [];
let LL = {};
function registrar(k, llave, contenido) {
  LL[T[k].id] = llave; ABIERTO[k] = contenido;
  if (T[k + 1] && contenido.sig) Object.assign(T[k + 1], contenido.sig);
}
async function abrirSellos() {
  for (let k = 0; k < T.length; k++) {
    const ll = LL[T[k].id];
    if (!ll || ABIERTO[k]) continue;
    try { registrar(k, ll, await Escenario.abrir(ll, T[k].sello)); } catch (e) { /* llave dañada: el ticket sigue sellado */ }
  }
}
function resuelto(r) { P.llaves[ticket().id] = r.llave; registrar(P.k, r.llave, r.contenido); }
const refs = () => T.map((t, i) => (i < P.k && t.tipo === 'cambio' && ABIERTO[i] ? ABIERTO[i].ref : null));

/* ================================================================ ingreso: nombre, apellido y la clave común */
function vistaPortada() {
  app.innerHTML = `<div class="portada">
    <div class="lado-a">
      <div style="display:flex;gap:14px;align-items:center"><div style="width:64px;height:64px">${LOGO}</div><h1>Kinti Bus<br><b>Mesa de Datos</b></h1></div>
      <svg class="bus-fondo" viewBox="0 0 64 64">${LOGO.replace(/<svg[^>]*>|<\/svg>/g, '')}</svg>
    </div>
    <div class="lado-b">
      <form class="tarjeta" id="fIngreso" autocomplete="off">
        <h2 style="margin-bottom:16px">Ingreso</h2>
        <div class="campo"><label for="iNom">Nombres</label><input id="iNom" required maxlength="40" spellcheck="false"></div>
        <div class="campo"><label for="iApe">Apellidos</label><input id="iApe" required maxlength="40" spellcheck="false"></div>
        <div class="campo"><label for="iClave">Contraseña</label><input id="iClave" type="password" required spellcheck="false" autocapitalize="none"></div>
        <p class="error-txt" id="eIngreso"></p>
        <button class="btn grande" style="width:100%;justify-content:center">${ico('abierto')} Ingresar</button>
      </form>
    </div></div>`;
  $('#iNom').focus();
  $('#fIngreso').onsubmit = async e => {
    e.preventDefault();
    const n = nombrePropio($('#iNom').value), a = nombrePropio($('#iApe').value);
    if (n.length < 2 || a.length < 2 || !/^[\p{L} .'-]+$/u.test(n + a)) { $('#eIngreso').textContent = 'Escribe tus nombres y apellidos (solo letras).'; return; }
    const clave = $('#iClave').value.trim().toUpperCase(), btn = $('#fIngreso button');
    let llaves = null;
    if (sha256(`${CUENTAS.sal}:${clave}`) !== CUENTAS.comun) {
      btn.disabled = true; $('#eIngreso').textContent = '';
      llaves = await Escenario.revision(clave);         /* la clave de revisión no tiene huella: solo ella abre su sello */
      btn.disabled = false;
      if (!llaves) { $('#eIngreso').textContent = 'Contraseña incorrecta.'; return; }
    }
    const s = { nombre: n, apellido: a, revisor: !!llaves, llaves };
    sessionStorage.setItem('kintibus:sesion', JSON.stringify(s));
    entrar(s);
  };
}
async function entrar(s) {
  const cuenta = normTxt(`${s.nombre} ${s.apellido}`).toLowerCase().replace(/[^a-z0-9]+/g, '.');
  P = almacen.leer(cuenta);
  if (!P || (P.v !== VERSION && P.v !== 2)) P = nuevoAvance(cuenta);
  P.v = VERSION; P.llaves = P.llaves || {};
  LL = { ...P.llaves, ...(s.llaves || {}) };
  await abrirSellos();
  /* avance de la versión anterior (sin llaves): la jornada completa se conserva; una a medias vuelve a empezar */
  if (P.k < T.length && T.slice(0, P.k).some((t, i) => !ABIERTO[i])) P = nuevoAvance(cuenta);
  P.nombre = s.nombre; P.apellido = s.apellido; P.revisor = !!(s.revisor && s.llaves);
  P.login = 'KINTI\\' + (cuenta[0] + normTxt(s.apellido).split(' ')[0].toLowerCase()).replace(/[^a-z0-9]/g, '');
  guardar();
  tomarCuenta();
  arrancar();
}

/* ================================================================ arranque del puesto de trabajo */
async function arrancar() {
  app.innerHTML = `<div class="cargando"><div class="giro"></div><p>Conectando con <b>KINTI-SQL01</b>…</p></div>`;
  await IDB.abrir();
  if (P.k >= T.length) { vistaFinal(); return; }
  if (!(await iniciarConexion())) return;
  UI.listo = true;
  vistaTrabajo();
}
async function iniciarConexion() {
  /* mientras se prepara la conexión del ticket nada se ejecuta: la consulta caería en la conexión anterior */
  UI.ocupado = true;
  if ($('#herr')) { pintarHerramientas(); pintarEstado('Conectando…'); }
  try { return await conectar(); } finally { UI.ocupado = false; }
}
async function conectar() {
  const t = ticket();
  let bytes = null;
  if (P.t.id === t.id) bytes = await IDB.sacar(`${P.cuenta}:${P.k}:test`);
  else { P.t = nuevoTicket(P.k); guardar(); }
  try {
    await W.pedir('iniciar', { cuenta: P.cuenta, k: P.k, test: bytes, refs: refs() }, 60000);
    /* una transacción que quedó abierta se pierde al recargar (SQL Server la deshace al cerrar la conexión) */
    let perdida = false;
    for (const ent of ['TEST', 'PROD']) if (P.t.tran[ent] > 0) { perdida = true; P.t.tran[ent] = 0; }
    P.t.desplegado = false;
    if (perdida) aviso('La conexión anterior se cerró: SQL Server deshizo la transacción abierta.', 'oro');
    UI.cambios = { TEST: 0, PROD: 0 };
    guardar();
    return true;
  } catch (e) {
    app.innerHTML = `<div class="cargando">${sticker('alarma').replace('class="sticker"', 'class="sticker" style="width:110px;margin:auto"')}<p><b>No se pudo abrir el motor SQL en este navegador.</b><br>Actualiza la página. Si continúa, usa Chrome, Edge o Firefox actualizados.</p><p><button class="btn" onclick="location.reload()">Reintentar</button></p></div>`;
    return false;
  }
}
async function recuperar(motivo) {
  UI.ocupado = false;
  if (!(await iniciarConexion())) return;
  if (motivo === 'tiempo') aviso('La consulta tardó demasiado y se canceló. Se reabrió la conexión: cualquier transacción abierta se deshizo.', 'mal');
  else aviso('El motor se reinició. Lo confirmado (COMMIT) está a salvo; lo no confirmado se deshizo.', 'oro');
  pintarTodo();
}

/* ================================================================ puesto de trabajo */
function vistaTrabajo() {
  app.innerHTML = `
  <header class="barra">
    <div class="marca"><span style="display:inline-flex">${LOGO}</span><span>Kinti Bus<small>Mesa de Datos</small></span></div>
    <div class="reloj">${ico('reloj')} <span id="bReloj"></span></div>
    <div class="espacio"></div>
    <div class="dato cuenta"><b id="bNombre"></b><span>Analista de datos</span></div>
    <div class="puntos" id="bPuntos"></div>
    <button class="bb" id="bInc" title="Incidentes reportados">${ico('alerta')}<span class="txt">Incidentes</span> <span class="n" id="bIncN">0</span></button>
    <button class="bb" id="bCert" title="Certificado de avance">${ico('trofeo')}<span class="txt">Certificado</span></button>
    <button class="bb" id="bSalir" title="Salir">${ico('salir')}</button>
  </header>
  <div class="trabajo">
    <aside class="panel" id="pLista"><div class="cab pest" id="izqTabs"></div><div class="cuerpo" id="lista"></div></aside>
    <section class="panel" id="pTicket"><div class="cuerpo" id="ticket"></div></section>
    <section class="panel consola visible" id="pConsola">
      <div class="entornos" id="entornos"></div>
      <div id="banner"></div>
      <div class="editor" id="editor"><div class="lineas" id="lineas"></div><div class="zona"><pre class="resaltado" id="resaltado" aria-hidden="true"></pre><textarea id="sql" spellcheck="false" autocapitalize="off" autocomplete="off" aria-label="Editor de consultas SQL"></textarea></div></div>
      <div class="herr" id="herr"></div>
      <div class="salida"><div class="tabs" id="tabsSalida"></div><div class="area" id="areaSalida"></div></div>
      <div class="estado" id="estado"></div>
    </section>
  </div>
  <nav class="vista-movil" id="vistaMovil">
    <button data-v="lista">${ico('lista')}Tickets</button><button data-v="ticket">${ico('ticket')}Ticket</button><button data-v="consola" class="on">${ico('consola')}Consola</button>
  </nav>`;
  $('#bInc').onclick = dialogoIncidentes;
  $('#bCert').onclick = dialogoCertificado;
  $('#bSalir').onclick = () => confirmar('Salir', 'Tu avance queda guardado en este navegador. ¿Salir de la Mesa de Datos?', 'Salir', () => { sessionStorage.removeItem('kintibus:sesion'); location.reload(); });
  $$('#vistaMovil button').forEach(b => b.onclick = () => verMovil(b.dataset.v));
  prepararEditor();
  pintarTodo();
}
function verMovil(v) {
  UI.vista = v;
  $$('#vistaMovil button').forEach(b => b.classList.toggle('on', b.dataset.v === v));
  $('#pLista').classList.toggle('visible', v === 'lista');
  $('#pTicket').classList.toggle('visible', v === 'ticket');
  $('#pConsola').classList.toggle('visible', v === 'consola');
}
function pintarTodo() { pintarBarra(); pintarLista(); pintarTicket(); pintarConsola(); }
function pintarBarra() {
  $('#bReloj').textContent = `${FECHA} · ${horaTicket()}`;
  $('#bNombre').textContent = `${P.nombre} ${P.apellido}`;
  $('#bPuntos').textContent = `${P.puntos} pts`;
  $('#bIncN').textContent = P.incidentes.length;
}

/* ---------------- cola de tickets y explorador de objetos ---------------- */
function pintarLista() {
  $('#izqTabs').innerHTML = [['tickets', 'lista', 'Tickets'], ['objetos', 'base', 'Objetos']].map(([k, i, tx]) => `<button data-l="${k}" class="${UI.izq === k ? 'on' : ''}">${ico(i)} ${tx}</button>`).join('');
  $$('#izqTabs button').forEach(b => b.onclick = () => { UI.izq = b.dataset.l; pintarLista(); });
  if (UI.izq === 'objetos') { $('#lista').innerHTML = explorador(); return; }
  const cerrados = Object.keys(P.cerrados).length;
  let h = `<div class="cargo"><b>${cerrados} de ${T.length} cerrados</b>Jornada del lunes 12 de octubre</div><div class="progreso"><i style="width:${Math.round(100 * cerrados / T.length)}%"></i></div>`;
  h += T.map((t, i) => {
    const cerrado = !!P.cerrados[t.id], actual = i === P.k;
    return `<button class="tk ${cerrado ? 'cerrado' : ''} ${actual ? 'actual' : ''}" data-k="${i}" ${!cerrado && !actual && !P.revisor ? 'disabled' : ''}>
      <span class="est">${cerrado ? ico('check') : actual ? ico('play') : ico('candado')}</span>
      <span><b>${t.id} · ${t.hora.slice(11, 16)}</b><span class="t">${t.titulo ? esc(t.titulo) : 'En cola'}</span></span></button>`;
  }).join('');
  if (P.revisor) h += `<div class="cargo" style="background:var(--oro-claro);margin-top:12px"><b>Modo revisión</b>Puede abrir cualquier ticket y ver su solución.</div>`;
  $('#lista').innerHTML = h;
  $$('#lista .tk').forEach(b => b.onclick = () => {
    const k = +b.dataset.k;
    if (k === P.k) { verMovil('ticket'); return; }
    if (P.cerrados[T[k].id] && !P.revisor) { dialogoResumen(k); return; }
    if (P.revisor) confirmar('Ir al ticket', `¿Abrir ${T[k].id}? (modo revisión)`, 'Abrir', async () => { P.k = k; P.t = nuevoTicket(k); guardar(); await reiniciarTicket(); });
  });
}
function explorador() {
  return `<p class="nota-obj"><b>KintiBus_TEST · KintiBus_PROD</b><br>Tablas</p><div class="dicc">${ESQ.map(t => `<details><summary>dbo.${t.tabla}</summary><table>${t.cols.map(([c, tipo, o]) => `<tr><td class="c">${c}${o.pk ? '<span class="k pk">PK</span>' : ''}${o.fk ? '<span class="k fk">FK</span>' : ''}</td><td class="t">${tipo}${o.id ? ' IDENTITY' : ''}${o.nn || o.pk ? '' : ' NULL'}${o.fk ? ` → ${o.fk[0]}` : ''}</td></tr>`).join('')}</table></details>`).join('')}</div>`;
}
async function reiniciarTicket() {
  UI.ultimo = { TEST: null, PROD: null }; UI.respuestas = null; UI.entorno = 'TEST';
  UI.ocupado = true; $('#ticket').innerHTML = '';                 /* nada del ticket anterior mientras se conecta */
  await IDB.borrar(`${P.cuenta}:${P.k}:test`);
  if (await iniciarConexion()) pintarTodo();
}

/* ---------------- requerimiento ---------------- */
function avatar(p) { return `<span class="avatar" style="background:${p.color}">${p.ini}</span>`; }
function pintarTicket() {
  const t = ticket(); if (!t) return;
  const p = PER[t.de], s = P.t;
  const pr = { Alta: 'alta', Urgente: 'urgente' }[t.prioridad] || '';
  let est = '';
  if (s.inc) est = '<span class="chip urgente">Incidente sin reportar</span>';
  else if (s.desplegado) est = `<span class="chip alta">${s.pase.cr} desplegado</span>`;
  else if (s.pase) est = `<span class="chip alta">${s.pase.cr} aprobado</span>`;
  $('#ticket').innerHTML = `<div class="solicitante">${avatar(p)}<div class="quien"><b>${esc(p.nombre)}</b><span>${esc(p.cargo)}</span></div></div>
    <h2 class="ticket-tit">${esc(t.titulo)}</h2>
    <div class="chips"><span class="chip">${ico('ticket')} ${t.id}</span><span class="chip ${pr}">Prioridad ${esc(t.prioridad.toLowerCase())}</span><span class="chip">${ico('reloj')} ${t.hora.slice(11, 16)}</span><span class="chip">${t.tipo === 'consulta' ? 'Consulta de datos' : 'Cambio de datos'}</span>${est}</div>
    <div class="mensaje">${t.mensaje}</div>
    ${t.tipo === 'consulta' ? formRespuesta(t) : ''}
    ${P.revisor ? `<div class="fila-btn"><button class="btn sec peq" id="bSol">${ico('libro')} Ver solución</button></div>` : ''}`;
  if (t.tipo === 'consulta') prepararRespuesta(t);
  if (P.revisor) $('#bSol').onclick = dialogoSolucion;
}

/* ---------------- respuesta de los tickets de consulta ---------------- */
function formRespuesta(t) {
  return `<div class="respuesta"><h4>${ico('mensaje')} Respuesta para ${esc(PER[t.de].nombre.split(' ')[0])}</h4>
    ${t.campos.map((r, i) => `<div class="campo"><label for="r${i}">${esc(r.etiqueta)}</label><input id="r${i}" ${r.tipo === 'numero' ? 'inputmode="decimal"' : ''} value="${esc((P.t.resp || [])[i] || '')}"></div>`).join('')}
    <p class="error-txt" id="eResp"></p>
    <button class="btn oro" id="bResp">${ico('check')} Enviar respuesta</button></div>`;
}
function prepararRespuesta(t) {
  const ins = $$('#ticket .respuesta input');
  ins.forEach((inp, i) => inp.oninput = () => { P.t.resp = P.t.resp || []; P.t.resp[i] = inp.value; guardar(); });
  const b = $('#bResp');
  b.onclick = () => enviarRespuesta(t, ins.map(x => x.value));
  ins.forEach(inp => inp.onkeydown = e => { if (e.key === 'Enter') b.click(); });
}
function enviarRespuesta(t, vals) {
  if (UI.ocupado) return;
  const b = $('#bResp'); if (b) b.disabled = true;
  return ocupar(() => revisarRespuesta(t, vals)).finally(() => { const b2 = $('#bResp'); if (b2 && P.k < T.length && T[P.k].id === t.id) b2.disabled = false; });
}
async function revisarRespuesta(t, vals) {
  const e = $('#eResp');
  if (vals.some(v => !String(v).trim())) { e.textContent = 'Completa todos los datos.'; return; }
  P.t.intentos++;
  const r = await Escenario.probar(P.k, Escenario.material(vals, t.campos));
  if (r) {
    resuelto(r);
    await cerrarTicket(Math.max(40, 100 - 20 * (P.t.intentos - 1)), '¡Gracias! Era justo lo que necesitaba.');
    return;
  }
  guardar();
  e.textContent = '';
  const p = PER[t.de];
  dialogo({ titulo: `Respuesta de ${esc(p.nombre)}`, clase: 'vino', cuerpo: `<div class="qa mal">${sticker('duda')}<div><p><b>${esc(p.nombre)}:</b> «Revisé y ese dato no cuadra con lo que tengo. ¿Lo puedes verificar?»</p></div></div>` });
}

/* ---------------- consola ---------------- */
function pintarConsola() {
  const tr = P.t.tran[UI.entorno];
  $('#entornos').innerHTML = `
    <button class="test ${UI.entorno === 'TEST' ? 'on' : ''}" data-e="TEST">${ico('base')} TEST <span class="bd">KintiBus_TEST</span></button>
    <button class="prod ${UI.entorno === 'PROD' ? 'on' : ''}" data-e="PROD">${ico(P.t.pase && !P.t.desplegado ? 'abierto' : 'candado')} PRODUCCIÓN <span class="bd">KintiBus_PROD</span></button>
    <span class="tran ${tr ? '' : 'no'}"><i></i>${tr ? `Transacción abierta · @@TRANCOUNT = ${tr}` : 'Sin transacción abierta'}</span>`;
  $$('#entornos button').forEach(b => b.onclick = () => cambiarEntorno(b.dataset.e));
  $('#editor').className = 'editor ' + (UI.entorno === 'PROD' ? 'prod' : '');
  const ta = $('#sql');
  if (ta.dataset.ent !== UI.entorno || ta.dataset.tk !== P.t.id) { ta.value = P.t.editor[UI.entorno] || ''; ta.dataset.ent = UI.entorno; ta.dataset.tk = P.t.id; refrescarEditor(); }
  pintarBanner(); pintarHerramientas(); pintarSalida(); pintarEstado(); pintarBarra();
  if (ticket().tipo === 'cambio') pintarTicket();
}
function cambiarEntorno(e) {
  P.t.editor[UI.entorno] = $('#sql').value;
  UI.entorno = e; guardar();
  pintarConsola();
}
function pintarBanner() {
  const s = P.t;
  $('#banner').innerHTML = s.inc ? `<div class="banner alerta">${ico('alerta')}<span class="txt"><b>Incidente abierto en ${s.inc.entorno === 'PROD' ? 'PRODUCCIÓN' : 'TEST'}:</b> ${s.inc.motivo}</span><button class="btn vino peq" id="bnReportar">${ico('alerta')} Reportar incidente</button></div>` : '';
  const b = $('#bnReportar'); if (b) b.onclick = dialogoIncidente;
}
function pintarHerramientas() {
  const t = ticket(), s = P.t, e = UI.entorno, tr = s.tran[e], oc = UI.ocupado;
  const dis = c => (c && !oc ? '' : 'disabled');
  let h = `<button class="btn" id="hEjec" ${dis(true)} title="Ejecutar (F5 o Ctrl+Enter)">${ico('play')}<span class="txt">Ejecutar</span> <small style="opacity:.75">F5</small></button>
    <span class="sep"></span><button class="btn sec" id="hCommit" ${dis(tr > 0)}>${ico('guardar')}<span class="txt">COMMIT</span></button>
    <button class="btn sec" id="hRollback" ${dis(tr > 0)}>${ico('deshacer')}<span class="txt">ROLLBACK</span></button><div class="der">`;
  if (e === 'TEST') h += `<button class="btn sec peq" id="hRest" ${dis(tr === 0)} title="Restaurar KintiBus_TEST desde el respaldo">${ico('reiniciar')}<span class="txt">Restaurar TEST</span></button>`;
  if (t.tipo === 'cambio') h += `<button class="btn verde peq" id="hPase" ${dis(!s.pase)}>${ico('cohete')}<span class="txt">Solicitar pase</span></button>
    <button class="btn oro peq" id="hDesp" ${dis(s.pase && !s.desplegado)}>${ico('cohete')}<span class="txt">Desplegar pase</span></button>`;
  h += `<button class="btn sec peq" id="hReporte" ${dis(true)} title="Reportar un incidente">${ico('alerta')}<span class="txt">Incidente</span></button></div>`;
  $('#herr').innerHTML = h;
  const on = (id, fn) => { const b = $('#' + id); if (b) b.onclick = fn; };
  on('hEjec', ejecutar); on('hCommit', () => correr('COMMIT', e)); on('hRollback', () => correr('ROLLBACK', e));
  on('hRest', restaurarTest); on('hPase', dialogoPase); on('hDesp', desplegar); on('hReporte', dialogoIncidente);
}
function pintarEstado(msg) {
  const e = UI.entorno, u = UI.ultimo[e];
  const filas = u ? u.eventos.filter(x => x.tipo === 'resultado').reduce((a, x) => a + x.total, 0) : 0;
  const err = u && u.eventos.some(x => x.error);
  const est = $('#estado');
  est.className = 'estado ' + (e === 'PROD' ? 'prod' : '') + (err ? ' err' : '');
  est.innerHTML = `<span>${msg || (UI.ocupado ? 'Ejecutando consulta…' : u ? (err ? 'La consulta terminó con errores.' : 'Consulta ejecutada correctamente.') : 'Conectado.')}</span>
    <span class="der"><span>KINTI-SQL01</span><span>KintiBus_${e}</span><span>${esc(P.login)}</span><span>${horaTicket()}:00</span><span>${filas} filas</span></span>`;
}

/* ---------------- salida (resultados y mensajes) ---------------- */
const DEC = /^(precio|descuento|preciobase|monto|total|suma|ventas|dinero|recaudado|valor|importe|promedio)/i;
function celda(v, col) {
  if (v === null || v === undefined) return '<td class="nul">NULL</td>';
  if (typeof v === 'number') {
    let s;
    if (DEC.test(col) && !/^(n|cantidad|boletos|viajes)/i.test(col)) s = v.toFixed(Number.isInteger(v * 100) || Math.abs(v * 100 - Math.round(v * 100)) < 1e-6 ? 2 : 6);
    else if (Number.isInteger(v)) s = String(v);
    else s = String(Math.round(v * 1e6) / 1e6);
    return `<td class="n">${s}</td>`;
  }
  let s = String(v);
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(s)) s += '.000';
  return `<td title="${esc(s)}">${esc(s)}</td>`;
}
const nombreCol = c => (/[()+\-*/,']/.test(c) || /\s/.test(c) && /[^\w\sáéíóúñÁÉÍÓÚÑ]/.test(c) ? '(No column name)' : c);
function pintarSalida() {
  const e = UI.entorno, u = UI.ultimo[e];
  const res = u ? u.eventos.filter(x => x.tipo === 'resultado') : [];
  const msgs = u ? u.eventos.filter(x => x.tipo === 'mensaje') : [];
  const hayErr = msgs.some(m => m.error);
  const tabs = [['resultados', `Resultados${res.length ? ` (${res.length})` : ''}`], ['mensajes', `Mensajes${hayErr ? ' <span class="pt mal"></span>' : ''}`]];
  $('#tabsSalida').innerHTML = tabs.map(([k, tx]) => `<button data-s="${k}" class="${UI.salida === k ? 'on' : ''}">${tx}</button>`).join('');
  $$('#tabsSalida button').forEach(b => b.onclick = () => { UI.salida = b.dataset.s; pintarSalida(); });
  const a = $('#areaSalida');
  if (!u) { a.innerHTML = ''; return; }
  if (UI.salida === 'resultados') {
    a.innerHTML = res.map(r => `<table class="grid"><thead><tr><th class="rn"></th>${r.cols.map(c => `<th>${esc(nombreCol(c))}</th>`).join('')}</tr></thead><tbody>${r.filas.map((f, i) => `<tr><td class="rn">${i + 1}</td>${f.map((x, j) => celda(x, r.cols[j])).join('')}</tr>`).join('')}</tbody></table>${r.total > r.filas.length ? `<p class="resumen-filas">Se muestran ${r.filas.length} de ${r.total} filas.</p>` : ''}`).join('');
  } else {
    a.innerHTML = `<div class="msgs">${msgs.map(m => `<div class="${m.error ? 'e' : 'o'}">${esc(m.texto)}</div>`).join('')}${msgs.length ? '' : '<div class="o">Commands completed successfully.</div>'}<div class="fin">\nCompletion time: ${DIA_ISO}T${horaTicket()}:${String(new Date().getSeconds()).padStart(2, '0')}.${String(Date.now() % 10000000).padStart(7, '0')}-05:00</div></div>`;
  }
}

/* ---------------- editor con resaltado ---------------- */
const KW = /^(SELECT|FROM|WHERE|AND|OR|NOT|NULL|IS|IN|LIKE|BETWEEN|AS|ON|JOIN|INNER|LEFT|RIGHT|FULL|OUTER|CROSS|GROUP|BY|ORDER|HAVING|ASC|DESC|DISTINCT|TOP|INSERT|INTO|VALUES|UPDATE|SET|DELETE|BEGIN|TRAN|TRANSACTION|COMMIT|ROLLBACK|CASE|WHEN|THEN|ELSE|END|EXISTS|UNION|ALL|DECLARE|USE|GO|WITH|NOLOCK|PRINT|INT|VARCHAR|NVARCHAR|DECIMAL|DATE|DATETIME|CAST|CONVERT)$/i;
const FN = /^(COUNT|SUM|AVG|MIN|MAX|GETDATE|ISNULL|COALESCE|LEN|UPPER|LOWER|LTRIM|RTRIM|TRIM|LEFT|RIGHT|SUBSTRING|REPLACE|ROUND|YEAR|MONTH|DAY|DATEADD|DATEDIFF|DATEPART|SCOPE_IDENTITY|CONCAT|IIF|ABS)$/i;
function resaltar(src) {
  return src.replace(/(--[^\n]*)|(\/\*[\s\S]*?(?:\*\/|$))|(N?'(?:[^']|'')*'?)|(\b\d+(?:\.\d+)?\b)|(@@?\w+)|([A-Za-z_À-ɏ][\wÀ-ɏ]*)|([\s\S])/g, (m, c1, c2, s, n, v, w, o) => {
    if (c1 || c2) return `<span class="cm">${esc(m)}</span>`;
    if (s) return `<span class="s">${esc(s)}</span>`;
    if (n) return `<span class="n2">${n}</span>`;
    if (v) return `<span class="f">${esc(v)}</span>`;
    if (w) return KW.test(w) ? `<span class="k">${w}</span>` : FN.test(w) ? `<span class="f">${w}</span>` : esc(w);
    return esc(o);
  }) + '\n';
}
function refrescarEditor() {
  const ta = $('#sql'); if (!ta) return;
  $('#resaltado').innerHTML = resaltar(ta.value);
  const n = ta.value.split('\n').length;
  $('#lineas').textContent = Array.from({ length: n }, (_, i) => i + 1).join('\n');
  sincronizar();
}
function sincronizar() { const ta = $('#sql'); $('#resaltado').scrollTop = ta.scrollTop; $('#resaltado').scrollLeft = ta.scrollLeft; $('#lineas').scrollTop = ta.scrollTop; }
function prepararEditor() {
  const ta = $('#sql');
  let t0 = null;
  ta.addEventListener('input', () => { refrescarEditor(); clearTimeout(t0); t0 = setTimeout(() => { P.t.editor[UI.entorno] = ta.value; guardar(); }, 400); });
  ta.addEventListener('scroll', sincronizar);
  ta.addEventListener('keydown', e => {
    if (e.key === 'F5' || (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) || (e.key.toLowerCase() === 'e' && (e.ctrlKey || e.metaKey) && !e.shiftKey)) { e.preventDefault(); ejecutar(); return; }
    if (e.key === 'Tab' && !e.shiftKey) {
      e.preventDefault();
      const i = ta.selectionStart, f = ta.selectionEnd;
      ta.setRangeText('    ', i, f, 'end'); refrescarEditor();
    }
  });
  document.addEventListener('keydown', e => { if (e.key === 'F5' && UI.listo && document.activeElement !== ta && !$('dialog[open]')) { e.preventDefault(); ejecutar(); } });
}

/* ================================================================ acciones */
async function ocupar(fn) {
  if (UI.ocupado) return;
  UI.ocupado = true; pintarHerramientas(); pintarEstado();
  try { await fn(); }
  catch (e) { if (!e.tiempo && !e.caida) aviso('El motor no pudo completar la operación: ' + esc(e.message), 'mal'); }
  finally { UI.ocupado = false; if (UI.listo && ticket()) { pintarHerramientas(); pintarEstado(); } }     /* tras el último ticket ya no hay consola */
}
function ejecutar() {
  const ta = $('#sql');
  const sel = ta.selectionStart !== ta.selectionEnd ? ta.value.slice(ta.selectionStart, ta.selectionEnd) : ta.value;
  if (!sel.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '').trim()) return;
  P.t.editor[UI.entorno] = ta.value;
  return correr(sel, UI.entorno);
}
function correr(texto, e) {
  return ocupar(async () => {
    const s = P.t;
    const r = await W.pedir('ejecutar', { entorno: e, texto }, 12000);
    UI.ultimo[e] = r;
    s.tran[e] = r.trancount;
    if (e === 'TEST') s.ejecutoTest = true;
    const cambioEstado = r.cambios !== UI.cambios[e];
    UI.cambios[e] = r.cambios;
    for (const op of r.tran) await trasTransaccion(op, e);
    if (P.t !== s) return;                      /* el COMMIT cerró el ticket: lo demás ya no aplica */
    UI.salida = r.eventos.some(x => x.error) || !r.eventos.some(x => x.tipo === 'resultado') ? 'mensajes' : 'resultados';
    if (e === 'TEST' && s.tran.TEST === 0 && (cambioEstado || r.tran.length)) await guardarTest();
    guardar();
    pintarConsola();
  });
}
/* COMMIT y ROLLBACK (escritos en el editor o con los botones). En PRODUCCIÓN, con un pase desplegado,
   el COMMIT lo revisa el solicitante: si el cambio no es el pedido, es un incidente crítico. */
async function trasTransaccion(op, e) {
  const s = P.t;
  if (op === 'ROLLBACK') {
    P.m.rollbacks++;
    if (e === 'PROD' && s.desplegado) {
      s.inc = { entorno: 'PROD', motivo: `el pase ${s.pase.cr} se revirtió con ROLLBACK.` };
      s.desplegado = false; s.pase = null;
    }
  } else if (op === 'COMMIT' && e === 'PROD' && s.desplegado && s.tran.PROD === 0) {
    const v = await W.pedir('validar', { entorno: 'PROD' }, 20000);
    const r = await Escenario.probar(P.k, v.huella);
    if (r) { resuelto(r); await cerrarCambio(); } else await incidenteCritico();
  }
}
async function guardarTest() {
  try { const r = await W.pedir('exportar', { entorno: 'TEST' }, 15000); if (r.bytes) await IDB.poner(`${P.cuenta}:${P.k}:test`, r.bytes); } catch (e) { /* sin persistencia: no es grave */ }
}
function restaurarTest() {
  if (P.t.tran.TEST > 0) return;
  confirmar('Restaurar TEST', 'KintiBus_TEST vuelve al estado del inicio de este ticket. Se pierden los cambios confirmados en TEST.', 'Restaurar', () => ocupar(async () => {
    await W.pedir('restaurar', { entorno: 'TEST' }, 20000);
    UI.cambios.TEST = 0; UI.ultimo.TEST = null;
    await IDB.borrar(`${P.cuenta}:${P.k}:test`);
    guardar(); pintarConsola();
    aviso('KintiBus_TEST restaurada.', 'ok');
  }));
}
async function desplegar() {
  const s = P.t;
  if (!s.pase || s.desplegado) return;
  if (s.tran.PROD > 0) { aviso('Hay una transacción abierta en PRODUCCIÓN.', 'oro'); return; }
  P.t.editor[UI.entorno] = $('#sql').value;
  UI.entorno = 'PROD';
  await ocupar(async () => {
    const r = await W.pedir('desplegar', { script: s.pase.script }, 20000);
    if (r.error) { aviso(esc(r.error), 'mal'); return; }
    UI.ultimo.PROD = r; s.tran.PROD = r.trancount; s.prodDeploys++; UI.cambios.PROD = r.cambios; UI.salida = 'mensajes';
    if (r.trancount) s.desplegado = true;
    else { s.inc = { entorno: 'PROD', motivo: `el pase ${s.pase.cr} falló y SQL Server revirtió la transacción.` }; s.pase = null; }
    guardar();
  });
  pintarConsola();
}
async function incidenteCritico() {
  const s = P.t, p = PER[ticket().de];
  s.criticos++; P.m.criticos++;
  await W.pedir('restaurar', { entorno: 'PROD' }, 20000);
  UI.cambios.PROD = 0;
  s.desplegado = false; s.pase = null;
  s.inc = { entorno: 'PROD', motivo: 'el cambio confirmado no es el solicitado. El DBA restauró el respaldo.', critico: true };
  guardar();
  dialogo({ titulo: 'Incidente crítico en producción', clase: 'vino', cuerpo: `<div class="qa mal">${sticker('alarma')}<div><p><b>${esc(p.nombre)}:</b> «Revisé en el sistema y el cambio no quedó como lo pedí.»</p><p><b>${esc(PER.esteban.nombre)} (DBA):</b> «Restauré KintiBus_PROD desde el respaldo previo al pase.»</p></div></div>`, botones: [['Reportar incidente', 'btn vino', dialogoIncidente]] });
}
async function cerrarCambio() {
  const s = P.t;
  P.m.pasesOk++;
  await cerrarTicket(Math.max(20, 100 + (s.prodDeploys === 1 && !s.criticos ? 20 : 0) - 40 * s.criticos), '¡Listo! Ya lo veo en producción. Gracias.');
}
async function cerrarTicket(pts, gracias) {
  const t = ticket();
  P.cerrados[t.id] = { puntos: pts, fecha: new Date().toISOString(), intentos: P.t.intentos, deploys: P.t.prodDeploys };
  P.puntos += pts;
  await IDB.borrar(`${P.cuenta}:${P.k}:test`);
  P.k++;
  P.t = nuevoTicket(P.k);
  UI.ultimo = { TEST: null, PROD: null }; UI.respuestas = null; UI.entorno = 'TEST'; UI.salida = 'resultados'; UI.cambios = { TEST: 0, PROD: 0 };
  guardar();
  const p = PER[t.de];
  const cuerpo = `<div class="qa ok">${sticker('feliz')}<div><h3>Ticket ${t.id} cerrado · +${pts} puntos</h3><p><b>${esc(p.nombre)}:</b> «${esc(gracias)}»</p></div></div>`;
  if (P.k >= T.length) { dialogo({ titulo: 'Jornada completa', clase: 'verde', cuerpo, botones: [['Ver mi resultado', 'btn verde', vistaFinal]], alCerrar: vistaFinal }); return; }
  dialogo({ titulo: 'Ticket cerrado', clase: 'verde', cuerpo, botones: [['Siguiente ticket', 'btn verde', null]], alCerrar: async () => { if (await iniciarConexion()) pintarTodo(); } });
}

/* ================================================================ diálogos */
function dialogo({ titulo, clase = '', cuerpo, botones = [['Cerrar', 'btn']], alCerrar, ancho }) {
  const d = document.createElement('dialog');
  if (ancho) d.style.width = ancho;
  d.innerHTML = `<div class="dcab ${clase}"><h3>${titulo}</h3><button class="x" aria-label="Cerrar">×</button></div><div class="dcuerpo">${cuerpo}</div><div class="dpie">${botones.map(([tx, cl], i) => `<button class="${cl}" data-i="${i}">${tx}</button>`).join('')}</div>`;
  document.body.appendChild(d);
  let hecho = false;
  const cerrar = (fn) => { if (hecho) return; hecho = true; d.close(); d.remove(); if (fn) fn(); else if (alCerrar) alCerrar(); };
  $$('.dpie button', d).forEach(b => b.onclick = () => { const fn = botones[+b.dataset.i][2]; if (fn === false) return; cerrar(fn ? () => { fn(); } : null); });
  $('.x', d).onclick = () => cerrar(null);
  d.addEventListener('cancel', e => { e.preventDefault(); cerrar(null); });
  d.showModal();
  return d;
}
function confirmar(titulo, texto, si, fn, clase = '') {
  dialogo({ titulo, clase, cuerpo: `<p style="margin:0">${texto}</p>`, botones: [['Cancelar', 'btn sec', () => {}], [si, 'btn ' + (clase === 'vino' ? 'vino' : ''), fn]] });
}
function dialogoIncidente() {
  const s = P.t, e = s.inc ? s.inc.entorno : UI.entorno;
  const tipos = ['El resultado no es el esperado', 'Afectó más filas de las previstas', 'SQL Server devolvió un error', 'Los datos de PRODUCCIÓN no son iguales a los de TEST', 'Otro'];
  const d = dialogo({ titulo: 'Reporte de incidente', clase: 'vino', cuerpo: `<p style="margin-top:0">Ticket <b>${ticket().id}</b> · <b>${e === 'PROD' ? 'PRODUCCIÓN' : 'TEST'}</b></p>
      <div class="opciones-radio">${tipos.map((tx, i) => `<label><input type="radio" name="tipoInc" value="${i}" ${i === 0 ? 'checked' : ''}> ${tx}</label>`).join('')}</div>
      <div class="campo"><label for="iDesc">Descripción</label><textarea id="iDesc" rows="4"></textarea><span class="ayuda">Mínimo 25 caracteres.</span></div>
      <p class="error-txt" id="eInc"></p>`,
    botones: [['Cancelar', 'btn sec', () => {}], ['Enviar reporte', 'btn vino', false]] });
  const enviar = $$('.dpie button', d)[1];
  enviar.onclick = () => {
    const desc = $('#iDesc', d).value.trim();
    if (desc.length < 25) { $('#eInc', d).textContent = 'La descripción debe tener al menos 25 caracteres.'; return; }
    const tipo = tipos[+$('input[name=tipoInc]:checked', d).value];
    const id = 'INC-' + String(P.incidentes.length + 1).padStart(3, '0');
    P.incidentes.push({ id, ticket: ticket().id, entorno: e, tipo, desc, hora: horaTicket(), fecha: new Date().toISOString(), critico: !!(s.inc && s.inc.critico) });
    s.inc = null;
    aviso(`Incidente ${id} registrado.`, 'ok');
    guardar(); d.close(); d.remove(); pintarConsola(); pintarBarra();
  };
}
function dialogoPase() {
  const s = P.t;
  if (s.inc) { aviso('Hay un incidente sin reportar en este ticket.', 'oro'); return; }
  if (s.tran.TEST > 0) { aviso('Hay una transacción abierta en TEST.', 'oro'); return; }
  if (!s.ejecutoTest) { aviso('El DBA solo recibe scripts probados en TEST.', 'oro'); return; }
  const script = (UI.entorno === 'TEST' ? $('#sql').value : s.editor.TEST || '').trim();
  const cr = `CR-${ticket().id.slice(4)}-${String(s.prodDeploys + 1).padStart(2, '0')}`;
  const d = dialogo({ titulo: `Solicitud de pase ${cr}`, clase: 'verde', cuerpo: `
      <p style="margin:0 0 6px;font-size:13px">Script para <b>KintiBus_PROD</b> · revisión: ${esc(PER.esteban.nombre)} (DBA)</p>
      <textarea class="script" id="iScript" spellcheck="false">${esc(script)}</textarea><p class="error-txt" id="ePase"></p>`,
    botones: [['Cancelar', 'btn sec', () => {}], ['Enviar al DBA', 'btn verde', false]], ancho: 'min(760px, calc(100vw - 24px))' });
  const enviar = $$('.dpie button', d)[1];
  enviar.onclick = async () => {
    const sc = $('#iScript', d).value;
    enviar.disabled = true; $('#ePase', d).textContent = 'El DBA está revisando el script…';
    try {
      const r = await W.pedir('revisarPase', { script: sc }, 20000);
      if (!r.ok) {
        enviar.disabled = false;
        $('#ePase', d).innerHTML = r.motivo ? `Rechazado: ${esc(r.motivo)}` : r.errores && r.errores.length ? `Rechazado: el script falla en una copia de TEST.<br><code>${esc(r.errores[0].split('\n').slice(0, 2).join(' '))}</code>` : 'Rechazado: el script no modifica datos.';
        return;
      }
      s.pase = { cr, script: sc };
      guardar(); d.close(); d.remove();
      aviso(`Pase ${cr} aprobado por ${esc(PER.esteban.nombre)} (DBA).`, 'ok');
      pintarConsola();
    } catch (e) { enviar.disabled = false; $('#ePase', d).textContent = 'El DBA no pudo revisar el script (tiempo agotado). Intenta de nuevo.'; }
  };
}
function dialogoIncidentes() {
  const filas = P.incidentes.slice().reverse().map(i => `<tr><td><b>${i.id}</b><br><small>${i.hora}</small></td><td>${i.ticket}<br><small>${i.entorno === 'PROD' ? 'PRODUCCIÓN' : 'TEST'}${i.critico ? ' · crítico' : ''}</small></td><td><b>${esc(i.tipo)}</b><br>${esc(i.desc)}</td></tr>`).join('');
  dialogo({ titulo: 'Mesa de incidentes', cuerpo: P.incidentes.length ? `<table class="tabla-inc"><thead><tr><th>Incidente</th><th>Ticket</th><th>Descripción</th></tr></thead><tbody>${filas}</tbody></table>` : '<p>Sin incidentes reportados.</p>', ancho: 'min(760px, calc(100vw - 24px))' });
}
function dialogoResumen(k) {
  const t = T[k], c = P.cerrados[t.id];
  dialogo({ titulo: `${t.id} · ${esc(t.titulo)}`, cuerpo: `<div class="mensaje" style="margin-top:0">${t.mensaje}</div><p>Cerrado con <b>${c.puntos} puntos</b>.</p>` });
}
async function dialogoSolucion() {
  try {
    const a = ABIERTO[P.k], t = ticket();
    let h = '';
    if (a.ref) h = `<div class="sol"><p>Solución de referencia:</p><pre>${esc(a.ref)}</pre></div>`;
    if (a.sql) { const R = UI.respuestas || await W.pedir('respuestas', { sql: a.sql }); UI.respuestas = R; h = `<div class="sol">${a.sql.map((s, i) => `<p><b>${esc(t.campos[i].etiqueta)}:</b> PRODUCCIÓN = <code>${esc(R.prod[i])}</code> · TEST = <code>${esc(R.test[i])}</code></p><pre>${esc(s)}</pre>`).join('')}</div>`; }
    dialogo({ titulo: 'Solución (modo revisión)', cuerpo: h, ancho: 'min(760px, calc(100vw - 24px))' });
  } catch (e) { aviso('No se pudo obtener la solución.', 'mal'); }
}

/* ================================================================ certificado de avance */
function fechaHoy() { const f = new Date(); return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`; }
function cargarImg(src) { return new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; }); }
async function dibujarCertificado() {
  try { await Promise.all(['400', '600', '700', '800'].map(w => document.fonts.load(`${w} 40px Poppins`))); } catch (e) { /* fuente del sistema */ }
  const nombre = `${P.nombre} ${P.apellido}`, k = Object.keys(P.cerrados).length;
  const W2 = 1600, H = 1131, cv = document.createElement('canvas'); cv.width = W2; cv.height = H;
  const x = cv.getContext('2d');
  const AZ = '#002C71', ORO = '#EAAA00', VINO = '#910048', GR = '#4a5461', VERDE = '#1d6f4f';
  const caja = (cx, cy, w, h, r) => { x.beginPath(); if (x.roundRect) x.roundRect(cx, cy, w, h, r); else x.rect(cx, cy, w, h); };
  x.fillStyle = '#fff'; x.fillRect(0, 0, W2, H);
  x.fillStyle = AZ; x.fillRect(0, 0, W2, 22); x.fillStyle = ORO; x.fillRect(0, 22, W2, 8);
  x.strokeStyle = ORO; x.lineWidth = 3; x.strokeRect(40, 60, W2 - 80, H - 100);
  /* marca centrada: ícono del bus y nombre */
  x.font = '400 19px Poppins, sans-serif'; const anchoSub = x.measureText('Mesa de Datos · simulación').width;
  x.font = '700 30px Poppins, sans-serif'; const anchoMarca = 90 + 18 + Math.max(x.measureText('Kinti Bus').width, anchoSub), m0 = (W2 - anchoMarca) / 2;
  const kb = await cargarImg('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" ${LOGO.slice(5)}`)); if (kb) x.drawImage(kb, m0, 86, 90, 90);
  x.textAlign = 'left'; x.fillStyle = AZ; x.fillText('Kinti Bus', m0 + 108, 125); x.font = '400 19px Poppins, sans-serif'; x.fillStyle = GR; x.fillText('Mesa de Datos · simulación', m0 + 108, 154);
  x.textAlign = 'center';
  x.fillStyle = ORO; x.font = '800 22px Poppins, sans-serif'; x.fillText('CERTIFICADO DE AVANCE', W2 / 2, 232);
  x.fillStyle = GR; x.font = '400 24px Poppins, sans-serif'; x.fillText('Se certifica que', W2 / 2, 292);
  let t = 76; x.font = `800 ${t}px Poppins, sans-serif`; while (x.measureText(nombre).width > W2 - 360 && t > 40) { t -= 4; x.font = `800 ${t}px Poppins, sans-serif`; }
  x.fillStyle = AZ; x.fillText(nombre, W2 / 2, 380);
  x.fillStyle = ORO; x.fillRect(W2 / 2 - 220, 404, 440, 4);
  x.fillStyle = GR; x.font = '400 24px Poppins, sans-serif';
  x.fillText('trabajó como analista de datos en la Mesa de Datos de Kinti Bus, con bases de TEST y PRODUCCIÓN,', W2 / 2, 456);
  x.fillText('resolviendo tickets con consultas y cambios en T-SQL (SELECT, INSERT, UPDATE, DELETE y transacciones).', W2 / 2, 492);
  x.fillStyle = VINO; x.font = '700 30px Poppins, sans-serif';
  x.fillText(k >= T.length ? `Jornada completa: ${T.length} de ${T.length} tickets` : `Avance: ${k} de ${T.length} tickets · llegó hasta ${T[P.k].id}`, W2 / 2, 556);
  const stats = [[`${k}/${T.length}`, 'tickets cerrados'], [String(P.m.pasesOk), 'pases a producción'], [String(P.incidentes.length), 'incidentes reportados'], [String(P.m.rollbacks), 'ROLLBACK aplicados'], [String(P.m.criticos), 'incidentes críticos'], [String(P.puntos), 'puntos']];
  const cw = (W2 - 240) / stats.length;
  stats.forEach(([v, et], i) => {
    const cx = 120 + cw * i + cw / 2;
    x.fillStyle = '#f2f5fa'; x.strokeStyle = '#d8e2f2'; x.lineWidth = 2;
    caja(cx - cw / 2 + 10, 600, cw - 20, 118, 16); x.fill(); x.stroke();
    x.fillStyle = AZ; x.font = '800 42px Poppins, sans-serif'; x.fillText(v, cx, 662);
    x.fillStyle = GR; x.font = '400 18px Poppins, sans-serif'; x.fillText(et, cx, 696);
  });
  /* avance ticket por ticket */
  const tw = (W2 - 240) / T.length;
  T.forEach((tk, i) => {
    const cx = 120 + tw * i + 6, w = tw - 12, cerrado = !!P.cerrados[tk.id], actual = i === P.k;
    caja(cx, 752, w, 52, 10);
    x.fillStyle = cerrado ? VERDE : actual ? '#fff6dc' : '#eef1f5'; x.fill();
    x.lineWidth = 2; x.strokeStyle = cerrado ? VERDE : actual ? ORO : '#d8e2f2'; x.stroke();
    x.fillStyle = cerrado ? '#fff' : actual ? '#6b4e00' : '#8a95a1'; x.font = '700 18px Poppins, sans-serif'; x.fillText(tk.id, cx + w / 2, 785);
  });
  x.fillStyle = AZ; x.font = '600 24px Poppins, sans-serif'; x.fillText(fechaHoy(), W2 / 2, 930);
  x.fillStyle = GR; x.font = '400 18px Poppins, sans-serif'; x.fillText('Fecha', W2 / 2, 958);
  x.fillStyle = '#8a95a1'; x.font = '400 14px Poppins, sans-serif';
  x.fillText('Kinti Bus es una empresa ficticia: sus personas, datos y tickets son inventados.', W2 / 2, H - 54);
  return cv;
}
async function dialogoCertificado() {
  const url = (await dibujarCertificado()).toDataURL('image/png');
  const nombre = `Certificado-KintiBus-${P.cuenta.replace(/\./g, '-')}.png`;
  dialogo({ titulo: 'Certificado de avance', cuerpo: `<img class="cert-img" src="${url}" alt="Certificado de avance de ${esc(P.nombre)} ${esc(P.apellido)}">`,
    botones: [['Cerrar', 'btn sec', () => {}], [`${ico('descargar')} Descargar PNG`, 'btn oro', false]], ancho: 'min(860px, calc(100vw - 24px))' });
  const b = $$('dialog .dpie button').pop();
  b.onclick = () => { const a = document.createElement('a'); a.href = url; a.download = nombre; document.body.appendChild(a); a.click(); a.remove(); };
}

/* ================================================================ fin de la jornada */
function vistaFinal() {
  UI.listo = false;
  app.innerHTML = `<div class="portada"><div class="lado-a"><div style="display:flex;gap:14px;align-items:center"><div style="width:64px;height:64px">${LOGO}</div><h1>Jornada<br><b>completa</b></h1></div>
    <p><b>${esc(P.nombre)}</b>, cerraste los ${T.length} tickets del lunes en Kinti Bus.</p>
    <div class="puntos"><div class="punto">${ico('trofeo')}<span><b>${P.puntos} puntos</b><br>de ${MAX_PUNTOS} posibles</span></div><div class="punto">${ico('cohete')}<span><b>${P.m.pasesOk} pases</b><br>a producción</span></div>
    <div class="punto">${ico('alerta')}<span><b>${P.incidentes.length} incidentes</b><br>reportados</span></div><div class="punto">${ico('deshacer')}<span><b>${P.m.rollbacks} ROLLBACK</b><br>aplicados</span></div></div></div>
    <div class="lado-b"><div class="tarjeta" style="text-align:center"><div style="width:120px;margin:0 auto">${sticker('feliz')}</div><h2>Certificado de avance</h2>
    <div class="fila-btn"><button class="btn oro grande" id="fCert">${ico('trofeo')} Ver y descargar</button></div>
    <div class="fila-btn"><button class="btn sec" id="fInc">${ico('alerta')} Mis incidentes</button>${P.revisor ? `<button class="btn sec" id="fReini">${ico('reiniciar')} Reiniciar jornada</button>` : ''}<button class="btn sec" id="fSalir">${ico('salir')} Salir</button></div></div></div></div>`;
  $('#fCert').onclick = dialogoCertificado; $('#fInc').onclick = dialogoIncidentes;
  $('#fSalir').onclick = () => { sessionStorage.removeItem('kintibus:sesion'); location.reload(); };
  if (P.revisor) $('#fReini').onclick = () => { P.k = 0; P.cerrados = {}; P.puntos = 0; P.t = nuevoTicket(0); P.incidentes = []; P.m = { rollbacks: 0, pasesOk: 0, criticos: 0 }; guardar(); location.reload(); };
}

/* ================================================================ una sesión, una pestaña */
const canal = 'BroadcastChannel' in self ? new BroadcastChannel('kintibus') : null;
const YO = Math.random().toString(36).slice(2);
function tomarCuenta() { if (canal && P) canal.postMessage({ tipo: 'tomar', cuenta: P.cuenta, id: YO }); }
if (canal) canal.onmessage = e => {
  const m = e.data;
  if (m.tipo === 'tomar' && P && m.cuenta === P.cuenta && m.id !== YO && !$('.velo')) {
    UI.listo = false;
    const v = document.createElement('div'); v.className = 'velo';
    v.innerHTML = `<div class="cajita"><h3 style="margin-top:0;color:var(--azul)">Tu sesión se abrió en otra pestaña</h3><p>Para no mezclar tu trabajo, solo una pestaña puede usarla a la vez.</p><button class="btn" id="vAqui">Usar en esta pestaña</button></div>`;
    document.body.appendChild(v);
    $('#vAqui').onclick = () => location.reload();
  }
};

/* ================================================================ inicio */
W.crear();
window.addEventListener('beforeunload', () => { if (P && UI.listo && $('#sql')) { P.t.editor[UI.entorno] = $('#sql').value; guardar(); } });
let sesion = null;
try { sesion = JSON.parse(sessionStorage.getItem('kintibus:sesion')); } catch (e) { sesion = null; }
if (sesion && sesion.nombre) entrar(sesion); else vistaPortada();
window.KB = { get P() { return P; }, UI, W, T };          // para las pruebas automáticas
})();
