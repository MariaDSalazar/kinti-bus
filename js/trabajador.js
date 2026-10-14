/* Kinti Bus · trabajador: aloja las bases TEST y PRODUCCIÓN del analista (sql.js) fuera de la página,
   para que una consulta pesada nunca congele la pantalla. */
'use strict';
const V = (self.location && self.location.search) || '';           /* la versión viaja en la dirección del trabajador */
importScripts('../vendor/sql-wasm.js' + V, 'datos.js' + V, 'filas.js' + V, 'motor.js' + V, 'escenario.js' + V);

let SQL = null;
const ESQ = Datos.ESQUEMA;
const B = { base: null, cacheK: -1, cache: null };      // bytes de la jornada en el ticket k
let con = { TEST: null, PROD: null };
let ticketK = -1, inicio = null, volcado = null, cuenta = 'analista';
let REFS = [];             // scripts de los tickets ya resueltos: los manda la página al abrirlos con la llave de cada uno
let paseActivo = false;

function abrir(bytes, ent, reloj) {
  return new Motor.Conexion(SQL, new SQL.Database(bytes), { bd: 'KintiBus_' + ent, entorno: ent, esquema: ESQ, usuario: cuenta, reloj, dml: ent === 'TEST' });
}
function aplicar(bytes, ent, sql, reloj) {
  const c = new Motor.Conexion(SQL, new SQL.Database(bytes), { bd: 'KintiBus_' + ent, entorno: ent, esquema: ESQ, usuario: 'dba', reloj, dml: true });
  const r = c.ejecutar(sql);
  const err = r.eventos.filter(e => e.error);
  if (c.trancount) c.ejecutar('COMMIT');
  const b = c.exportar(); c.cerrar();
  if (err.length) throw new Error('La solución de referencia falló: ' + err[0].texto);
  return b;
}
function base() {
  if (B.base) return B.base;
  const g = Datos.generar();
  const t = Motor.crearBase(SQL, Datos, g.test, 'KintiBus_TEST'), p = Motor.crearBase(SQL, Datos, g.prod, 'KintiBus_PROD');
  B.base = { TEST: t.export(), PROD: p.export() }; t.close(); p.close();
  return B.base;
}
/* estado de la jornada al empezar el ticket k (se aplican las soluciones de los tickets anteriores) */
function estadoInicio(k) {
  let desde = 0, est = base();
  if (B.cache && B.cacheK <= k) { desde = B.cacheK; est = B.cache; }
  for (let i = desde; i < k; i++) {
    const t = Escenario.TICKETS[i];
    if (t.tipo !== 'cambio') continue;
    if (!REFS[i]) throw new Error('Falta el cierre del ticket ' + t.id + '.');
    est = { TEST: aplicar(est.TEST, 'TEST', REFS[i], t.hora), PROD: aplicar(est.PROD, 'PROD', REFS[i], t.hora) };
  }
  B.cache = est; B.cacheK = k;
  return est;
}
function volcarBytes(bytes, ent, reloj) { const c = abrir(bytes, ent, reloj); const v = Motor.volcar(c.db, ESQ); c.cerrar(); return v; }

function prepararTicket(k, guardadoTest) {
  const t = Escenario.TICKETS[k];
  inicio = estadoInicio(k);
  volcado = {};
  if (con.TEST) con.TEST.cerrar();
  if (con.PROD) con.PROD.cerrar();
  con = { TEST: null, PROD: null };
  let restaurado = false;
  if (guardadoTest) { try { con.TEST = abrir(guardadoTest, 'TEST', t.hora); con.TEST.ejecutar('SELECT 1'); restaurado = true; } catch (e) { con.TEST = null; } }
  if (!con.TEST) con.TEST = abrir(inicio.TEST, 'TEST', t.hora);
  con.PROD = abrir(inicio.PROD, 'PROD', t.hora);
  ticketK = k; paseActivo = false;
  return { restaurado };
}
function inicial(ent) {
  if (!volcado[ent]) volcado[ent] = volcarBytes(inicio[ent], ent, Escenario.TICKETS[ticketK].hora);
  return volcado[ent];
}
/* revisión del solicitante: solo se calcula la huella del estado; la página la usa como llave del ticket.
   Si el cambio no es el pedido, la llave no abre nada (aquí no hay ninguna solución con qué comparar). */
async function validar(ent) {
  const txt = Motor.firma(inicial(ent), Motor.volcar(con[ent].db, ESQ), ESQ);
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(txt));
  return { huella: Array.from(new Uint8Array(h), x => x.toString(16).padStart(2, '0')).join('') };
}
/* quita BEGIN/COMMIT/ROLLBACK: en el pase la transacción la controla la herramienta de despliegue */
function sinControl(texto) {
  const toks = Motor.tokenizar(texto);
  const partes = [];
  for (const lote of Motor.lotes(toks)) {
    for (const inst of Motor.dividir(lote)) {
      const s = inst.filter(x => x.t !== 'ws' && x.t !== 'com');
      if (!s.length) continue;
      const u = s[0].t === 'id' ? s[0].u : '';
      if (u === 'BEGIN' && s[1] && s[1].t === 'id' && ['TRAN', 'TRANSACTION'].includes(s[1].u)) continue;
      if (u === 'COMMIT' || u === 'ROLLBACK' || u === 'GO') continue;
      partes.push(inst.map(x => x.v).join('').trim());
    }
    partes.push('GO');
  }
  while (partes.length && partes[partes.length - 1] === 'GO') partes.pop();
  return partes.map(p => (p === 'GO' ? 'GO' : p + ';')).join('\n');
}
function revisarPase(script) {
  const t = Escenario.TICKETS[ticketK];
  let limpio;
  try { limpio = sinControl(script); } catch (e) { return { ok: false, motivo: 'El script no se puede leer: ' + e.message }; }
  if (!limpio.trim()) return { ok: false, motivo: 'El script está vacío.' };
  const c = abrir(inicio.TEST, 'TEST', t.hora);
  c.ejecutar('BEGIN TRAN');
  const r = c.ejecutar(limpio);
  const errores = r.eventos.filter(e => e.error).map(e => e.texto);
  const actual = Motor.volcar(c.db, ESQ);
  c.ejecutar('ROLLBACK'); c.cerrar();
  /* el DBA solo revisa que el script corra sin errores y que cambie datos; si el cambio es el pedido, lo dice el solicitante */
  const ini = inicial('TEST');
  const sinCambios = Motor.comparar(ini, actual, ini, ESQ).ok;
  return { ok: !errores.length && !sinCambios, errores, sinCambios };
}
/* valores de las consultas de un ticket (solo el modo revisión las tiene: vienen descifradas con su clave) */
function respuestas(sqls) {
  const t = Escenario.TICKETS[ticketK];
  const val = (bytes, ent, sql) => { const c = abrir(bytes, ent, t.hora); const r = c.ejecutar(sql); c.cerrar(); const res = r.eventos.find(x => x.tipo === 'resultado'); return res && res.filas.length ? res.filas[0][0] : null; };
  return {
    prod: sqls.map(sql => val(inicio.PROD, 'PROD', sql)),
    test: sqls.map(sql => val(inicio.TEST, 'TEST', sql)),
  };
}

const ops = {
  async iniciar(d) {
    if (!SQL) SQL = await initSqlJs({ locateFile: f => '../vendor/' + f + V });
    cuenta = d.cuenta || 'analista';
    REFS = d.refs || [];
    base();
    const r = prepararTicket(d.k, d.test || null);
    return { ...r, trancount: { TEST: 0, PROD: 0 } };
  },
  ejecutar(d) {
    const c = con[d.entorno];
    const r = c.ejecutar(d.texto, { maxFilas: 1000 });
    return { ...r, entorno: d.entorno };
  },
  validar(d) { return validar(d.entorno || 'PROD'); },
  restaurar(d) {
    const t = Escenario.TICKETS[ticketK];
    con[d.entorno].cerrar();
    con[d.entorno] = abrir(inicio[d.entorno], d.entorno, t.hora);
    if (d.entorno === 'PROD') paseActivo = false;
    return { ok: true };
  },
  exportar(d) {
    const c = con[d.entorno];
    if (c.trancount) return { bytes: null };
    const b = c.exportar();
    return { bytes: b };
  },
  respuestas(d) { return respuestas(d.sql || []); },
  revisarPase(d) { return revisarPase(d.script); },
  desplegar(d) {
    const c = con.PROD;
    if (c.trancount) return { error: 'Hay una transacción abierta en PRODUCCIÓN: ciérrala antes de desplegar.' };
    const limpio = sinControl(d.script);
    c.ejecutar('BEGIN TRAN');
    c.dml = true;
    let r;
    try { r = c.ejecutar(limpio); } finally { c.dml = false; }
    paseActivo = true;
    return { ...r, eventos: [{ tipo: 'mensaje', texto: 'BEGIN TRAN   -- abierto por la herramienta de despliegue' }, ...r.eventos], trancount: c.trancount };
  },
};

self.onmessage = async ev => {
  const { id, op, datos } = ev.data;
  try {
    const r = await ops[op](datos || {});
    const transferir = r && r.bytes ? [r.bytes.buffer] : [];
    self.postMessage({ id, ok: true, r }, transferir);
  } catch (e) {
    self.postMessage({ id, ok: false, error: String(e && e.message || e) });
  }
};
