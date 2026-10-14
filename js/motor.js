/* Kinti Bus · motor T-SQL sobre SQLite (sql.js).
   Traduce el T-SQL que se escribe en SSMS, ejecuta lote por lote con las reglas de SQL Server
   (transacciones, IDENTITY, restricciones con nombre, mensajes Msg N) y compara estados de la base.
   Corre en el Web Worker del navegador y en Node para las pruebas. */
(function (raiz, fabrica) {
  const m = fabrica();
  if (typeof module === 'object' && module.exports) module.exports = m; else raiz.Motor = m;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ================================================================ utilidades de texto */
  const MAY = s => String(s).toUpperCase();
  class ErrorSQL extends Error {
    constructor(num, texto, opc = {}) {
      super(texto);
      this.num = num; this.nivel = opc.nivel ?? 16; this.estado = opc.estado ?? 1; this.linea = opc.linea ?? 1;
      this.alcance = opc.alcance || 'instruccion';     // 'instruccion' | 'lote' | 'compilacion'
      this.terminada = opc.terminada || false;          // añade «The statement has been terminated.»
    }
  }

  /* ================================================================ tokenizador */
  const RE_ID_INI = /[A-Za-z_#À-ɏ]/;
  const RE_ID = /[A-Za-z0-9_#$@À-ɏ]/;
  function tokenizar(src) {
    const t = []; let i = 0, linea = 1;
    const n = src.length;
    while (i < n) {
      const c = src[i], ini = i, lin = linea;
      if (c === '\n') { t.push({ t: 'ws', v: '\n', linea: lin }); i++; linea++; continue; }
      if (c === ' ' || c === '\t' || c === '\r' || c === '\f' || c === '\v' || c === ' ') {
        while (i < n && /[ \t\r\f\v ]/.test(src[i])) i++;
        t.push({ t: 'ws', v: src.slice(ini, i), linea: lin }); continue;
      }
      if (c === '-' && src[i + 1] === '-') { while (i < n && src[i] !== '\n') i++; t.push({ t: 'com', v: src.slice(ini, i), linea: lin }); continue; }
      if (c === '/' && src[i + 1] === '*') {
        let prof = 1; i += 2;
        while (i < n && prof > 0) {
          if (src[i] === '/' && src[i + 1] === '*') { prof++; i += 2; continue; }
          if (src[i] === '*' && src[i + 1] === '/') { prof--; i += 2; continue; }
          if (src[i] === '\n') linea++;
          i++;
        }
        if (prof > 0) throw new ErrorSQL(113, "Missing end comment mark '*/'.", { nivel: 15, linea: lin, alcance: 'compilacion' });
        t.push({ t: 'com', v: src.slice(ini, i), linea: lin }); continue;
      }
      if (c === "'" || ((c === 'N' || c === 'n') && src[i + 1] === "'")) {
        const conN = c !== "'"; i += conN ? 2 : 1;
        let val = '';
        for (;;) {
          if (i >= n) throw new ErrorSQL(105, `Unclosed quotation mark after the character string '${val}'.`, { nivel: 15, linea: lin, alcance: 'compilacion' });
          if (src[i] === "'") { if (src[i + 1] === "'") { val += "'"; i += 2; continue; } i++; break; }
          if (src[i] === '\n') linea++;
          val += src[i++];
        }
        t.push({ t: 'str', v: src.slice(ini, i), val, linea: lin }); continue;
      }
      if (c === '[') {
        i++; let val = '';
        for (;;) {
          if (i >= n) throw new ErrorSQL(105, `Unclosed quotation mark after the character string '${val}'.`, { nivel: 15, linea: lin, alcance: 'compilacion' });
          if (src[i] === ']') { if (src[i + 1] === ']') { val += ']'; i += 2; continue; } i++; break; }
          val += src[i++];
        }
        t.push({ t: 'qid', v: src.slice(ini, i), val, linea: lin }); continue;
      }
      if (c === '"') {
        i++; let val = '';
        for (;;) {
          if (i >= n) throw new ErrorSQL(105, `Unclosed quotation mark after the character string '${val}'.`, { nivel: 15, linea: lin, alcance: 'compilacion' });
          if (src[i] === '"') { if (src[i + 1] === '"') { val += '"'; i += 2; continue; } i++; break; }
          val += src[i++];
        }
        t.push({ t: 'qid', v: src.slice(ini, i), val, dq: 1, linea: lin }); continue;
      }
      if (c === '@') {
        i++; if (src[i] === '@') i++;
        while (i < n && RE_ID.test(src[i])) i++;
        t.push({ t: 'var', v: src.slice(ini, i), val: src.slice(ini, i).toLowerCase(), linea: lin }); continue;
      }
      if (RE_ID_INI.test(c)) {
        while (i < n && RE_ID.test(src[i])) i++;
        const v = src.slice(ini, i);
        t.push({ t: 'id', v, val: v, u: v.toUpperCase(), linea: lin }); continue;
      }
      if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1] || ''))) {
        while (i < n && /[0-9]/.test(src[i])) i++;
        if (src[i] === '.' ) { i++; while (i < n && /[0-9]/.test(src[i])) i++; }
        if ((src[i] === 'e' || src[i] === 'E') && /[0-9+-]/.test(src[i + 1] || '')) { i += 2; while (i < n && /[0-9]/.test(src[i])) i++; }
        t.push({ t: 'num', v: src.slice(ini, i), linea: lin }); continue;
      }
      const dos = src.slice(i, i + 2);
      if (['<>', '!=', '>=', '<=', '!<', '!>', '==', '||', '+=', '-=', '*=', '/='].includes(dos)) { t.push({ t: 'op', v: dos, linea: lin }); i += 2; continue; }
      if (c === '`') { t.push({ t: 'bad', v: c, linea: lin }); i++; continue; }
      t.push({ t: 'op', v: c, linea: lin }); i++;
    }
    return t;
  }
  const sig = tk => tk.t !== 'ws' && tk.t !== 'com';
  const esPal = (tk, ...p) => tk && tk.t === 'id' && p.includes(tk.u);
  const esOp = (tk, ...p) => tk && tk.t === 'op' && p.includes(tk.v);

  /* separa lotes por GO (una línea que solo dice GO) */
  function lotes(toks) {
    const res = []; let act = [];
    for (let i = 0; i < toks.length; i++) {
      const tk = toks[i];
      if (esPal(tk, 'GO')) {
        let a = i - 1; while (a >= 0 && toks[a].t === 'ws' && toks[a].v !== '\n') a--;
        let b = i + 1; while (b < toks.length && toks[b].t === 'ws' && toks[b].v !== '\n') b++;
        const solo = (a < 0 || toks[a].v === '\n') && (b >= toks.length || toks[b].v === '\n' || toks[b].t === 'com' || (toks[b].t === 'num'));
        if (solo) { res.push(act); act = []; continue; }
      }
      act.push(tk);
    }
    res.push(act);
    return res.filter(l => l.some(sig));
  }

  /* ================================================================ división en instrucciones */
  const INICIO = new Set(['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'BEGIN', 'COMMIT', 'ROLLBACK', 'SAVE', 'USE', 'DECLARE', 'SET', 'PRINT',
    'EXEC', 'EXECUTE', 'CREATE', 'ALTER', 'DROP', 'TRUNCATE', 'MERGE', 'GRANT', 'REVOKE', 'DENY', 'IF', 'WHILE', 'RETURN', 'GOTO',
    'BREAK', 'CONTINUE', 'WAITFOR', 'RAISERROR', 'THROW', 'BULK', 'BACKUP', 'RESTORE', 'DBCC', 'KILL', 'SHUTDOWN', 'CHECKPOINT', 'WITH', 'END', 'ELSE']);
  function dividir(lote) {
    const inst = []; let act = [], prof = 0, primera = null, vistos = new Set(), previo = null;
    const cerrar = () => { if (act.some(sig)) inst.push(act); act = []; primera = null; vistos = new Set(); previo = null; prof = 0; };
    for (const tk of lote) {
      if (!sig(tk)) { act.push(tk); continue; }
      if (esOp(tk, ';') && prof === 0) { cerrar(); continue; }
      if (prof === 0 && tk.t === 'id' && INICIO.has(tk.u) && primera) {
        let sigue = false;
        const u = tk.u;
        if (u === 'SELECT') sigue = (primera === 'INSERT' && !vistos.has('SELECT') && !vistos.has('VALUES')) ||
                                     (primera === 'WITH' && !vistos.has('PRINCIPAL')) || esPal(previo, 'UNION', 'ALL', 'EXCEPT', 'INTERSECT');
        else if (u === 'INSERT' || u === 'UPDATE' || u === 'DELETE') sigue = (primera === 'WITH' && !vistos.has('PRINCIPAL')) || esPal(previo, 'ON', 'FOR', 'AFTER', 'OF');
        else if (u === 'SET') sigue = primera === 'UPDATE' && !vistos.has('SET');
        else if (u === 'WITH') sigue = true;
        else if (u === 'END' || u === 'ELSE') sigue = vistos.has('CASE');
        if (!sigue) cerrar();
      }
      if (!primera && tk.t === 'id') primera = tk.u;
      if (tk.t === 'id') {
        if (prof === 0 && ['SELECT', 'INSERT', 'UPDATE', 'DELETE'].includes(tk.u) && primera === 'WITH') vistos.add('PRINCIPAL');
        if (prof === 0) vistos.add(tk.u);
        if (tk.u === 'CASE') vistos.add('CASE');
      }
      if (esOp(tk, '(')) prof++;
      if (esOp(tk, ')')) prof = Math.max(0, prof - 1);
      act.push(tk); previo = tk;
    }
    cerrar();
    return inst;
  }

  /* ================================================================ funciones de fecha y conversión (como SQL Server) */
  const PARTES = { year: 'year', yy: 'year', yyyy: 'year', quarter: 'quarter', qq: 'quarter', q: 'quarter', month: 'month', mm: 'month', m: 'month',
    dayofyear: 'dayofyear', dy: 'dayofyear', y: 'dayofyear', day: 'day', dd: 'day', d: 'day', week: 'week', wk: 'week', ww: 'week',
    weekday: 'weekday', dw: 'weekday', hour: 'hour', hh: 'hour', minute: 'minute', mi: 'minute', n: 'minute', second: 'second', ss: 'second', s: 'second',
    millisecond: 'millisecond', ms: 'millisecond' };
  const pad = (x, k = 2) => String(x).padStart(k, '0');
  function aFecha(v) {
    if (v === null || v === undefined) return null;
    if (typeof v === 'number') { const d = new Date(Date.UTC(1900, 0, 1) + Math.round(v * 86400000)); return d; }
    const s = String(v).trim();
    let m = s.match(/^(\d{4})-?(\d{2})-?(\d{2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2})(?:\.(\d{1,7}))?)?)?$/);
    if (m) {
      const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0)));
      if (d.getUTCMonth() !== +m[2] - 1 || d.getUTCDate() !== +m[3] || +(m[4] || 0) > 23) throw new ErrorSQL(242, 'The conversion of a varchar data type to a datetime data type resulted in an out-of-range value.', { alcance: 'lote' });
      return d;
    }
    m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?: (\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);       // mdy, como SQL Server en inglés
    if (m) {
      const d = new Date(Date.UTC(+m[3], +m[1] - 1, +m[2], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0)));
      if (+m[1] > 12 || d.getUTCDate() !== +m[2]) throw new ErrorSQL(242, 'The conversion of a varchar data type to a datetime data type resulted in an out-of-range value.', { alcance: 'lote' });
      return d;
    }
    throw new ErrorSQL(241, 'Conversion failed when converting date and/or time from character string.', { alcance: 'lote' });
  }
  const txtFecha = d => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
  function parte(p) { const k = PARTES[String(p).toLowerCase()]; if (!k) throw new ErrorSQL(155, `'${p}' is not a recognized datepart option.`, { nivel: 15, alcance: 'compilacion' }); return k; }
  function datepart(p, v) {
    const d = aFecha(v); if (!d) return null;
    switch (parte(p)) {
      case 'year': return d.getUTCFullYear();
      case 'quarter': return Math.floor(d.getUTCMonth() / 3) + 1;
      case 'month': return d.getUTCMonth() + 1;
      case 'day': return d.getUTCDate();
      case 'dayofyear': return Math.floor((d - Date.UTC(d.getUTCFullYear(), 0, 1)) / 86400000) + 1;
      case 'week': { const ini = new Date(Date.UTC(d.getUTCFullYear(), 0, 1)); return Math.floor(((d - ini) / 86400000 + ini.getUTCDay()) / 7) + 1; }
      case 'weekday': return d.getUTCDay() + 1;
      case 'hour': return d.getUTCHours();
      case 'minute': return d.getUTCMinutes();
      case 'second': return d.getUTCSeconds();
      default: return 0;
    }
  }
  function dateadd(p, n, v) {
    const d = aFecha(v); if (!d || n === null) return null;
    n = Math.trunc(Number(n));
    const k = parte(p);
    if (k === 'year' || k === 'month' || k === 'quarter') {
      const meses = k === 'year' ? 12 * n : k === 'quarter' ? 3 * n : n;
      const dia = d.getUTCDate();
      const r = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + meses, 1, d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds()));
      const ult = new Date(Date.UTC(r.getUTCFullYear(), r.getUTCMonth() + 1, 0)).getUTCDate();
      r.setUTCDate(Math.min(dia, ult));
      return txtFecha(r);
    }
    const ms = { day: 86400000, dayofyear: 86400000, weekday: 86400000, week: 7 * 86400000, hour: 3600000, minute: 60000, second: 1000, millisecond: 1 }[k];
    return txtFecha(new Date(d.getTime() + n * ms));
  }
  function datediff(p, a, b) {
    const x = aFecha(a), y = aFecha(b); if (!x || !y) return null;
    const k = parte(p);
    if (k === 'year') return y.getUTCFullYear() - x.getUTCFullYear();
    if (k === 'quarter') return (y.getUTCFullYear() * 4 + Math.floor(y.getUTCMonth() / 3)) - (x.getUTCFullYear() * 4 + Math.floor(x.getUTCMonth() / 3));
    if (k === 'month') return (y.getUTCFullYear() * 12 + y.getUTCMonth()) - (x.getUTCFullYear() * 12 + x.getUTCMonth());
    const piso = (f, u) => Math.floor(f.getTime() / u);
    if (k === 'day' || k === 'dayofyear' || k === 'weekday') return piso(y, 86400000) - piso(x, 86400000);
    if (k === 'week') return Math.floor((piso(y, 86400000) + 4) / 7) - Math.floor((piso(x, 86400000) + 4) / 7);
    if (k === 'hour') return piso(y, 3600000) - piso(x, 3600000);
    if (k === 'minute') return piso(y, 60000) - piso(x, 60000);
    if (k === 'second') return piso(y, 1000) - piso(x, 1000);
    return y - x;
  }
  /* redondeo decimal exacto (como DECIMAL de SQL Server: mitad lejos de cero) */
  function redondear(x, s) {
    if (x === null || x === undefined) return null;
    const v = Number(x); if (!isFinite(v)) return v;
    s = Math.trunc(s);
    const txt = v.toPrecision(15);
    const signo = v < 0 ? -1 : 1;
    const abs = Math.abs(Number(txt));
    if (s >= 0) {
      const [ent, dec = ''] = abs.toFixed(Math.min(20, s + 6)).split('.');
      const cortado = dec.slice(0, s), sig = dec[s] || '0';
      let r = Number(ent + (s ? '.' + cortado : ''));
      if (sig >= '5') r = r + Math.pow(10, -s);
      return signo * Number(r.toFixed(s));
    }
    const f = Math.pow(10, -s);
    return signo * Math.round(abs / f) * f;
  }
  function aNumero(v, tipoTxt) {
    if (v === null || v === undefined) return null;
    if (typeof v === 'number') return v;
    const s = String(v).trim();
    if (/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(s)) return Number(s);
    if (tipoTxt === 'int') throw new ErrorSQL(245, `Conversion failed when converting the varchar value '${v}' to data type int.`, { alcance: 'lote' });
    throw new ErrorSQL(8114, 'Error converting data type varchar to numeric.', { alcance: 'lote' });
  }
  /* CAST y CONVERT */
  function convertir(tipo, v, estilo) {
    if (v === null || v === undefined) return null;
    const t = String(tipo).toUpperCase().replace(/\s+/g, '');
    const base = t.replace(/\(.*/, '');
    const args = (t.match(/\(([^)]*)\)/) || [, ''])[1].split(',').filter(Boolean);
    if (['INT', 'INTEGER', 'BIGINT', 'SMALLINT', 'TINYINT'].includes(base)) {
      const x = aNumero(v, 'int');
      return Math.trunc(x);
    }
    if (base === 'BIT') { const x = aNumero(v, 'int'); return x ? 1 : 0; }
    if (['DECIMAL', 'NUMERIC'].includes(base)) { const x = aNumero(v); return redondear(x, args.length > 1 ? +args[1] : 0); }
    if (base === 'MONEY' || base === 'SMALLMONEY') return redondear(aNumero(v), 4);
    if (base === 'FLOAT' || base === 'REAL') return aNumero(v);
    if (['DATE', 'DATETIME', 'DATETIME2', 'SMALLDATETIME', 'TIME'].includes(base)) {
      const d = aFecha(v);
      if (base === 'DATE') return txtFecha(d).slice(0, 10);
      if (base === 'TIME') return txtFecha(d).slice(11);
      return txtFecha(d);
    }
    if (['VARCHAR', 'NVARCHAR', 'CHAR', 'NCHAR', 'TEXT', 'NTEXT'].includes(base)) {
      let s;
      if (typeof v === 'number') s = Number.isInteger(v) ? String(v) : String(redondear(v, 6)).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
      else s = String(v);
      if (estilo !== undefined && estilo !== null && /^\d{4}-\d{2}-\d{2}/.test(s)) {
        const d = aFecha(s), dd = pad(d.getUTCDate()), mm = pad(d.getUTCMonth() + 1), yy = d.getUTCFullYear();
        const hh = `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
        const e = Number(estilo);
        s = { 101: `${mm}/${dd}/${yy}`, 103: `${dd}/${mm}/${yy}`, 104: `${dd}.${mm}.${yy}`, 105: `${dd}-${mm}-${yy}`, 112: `${yy}${mm}${dd}`,
              23: `${yy}-${mm}-${dd}`, 120: `${yy}-${mm}-${dd} ${hh}`, 108: hh, 126: `${yy}-${mm}-${dd}T${hh}` }[e] || s;
      }
      const largo = args[0] === 'MAX' ? Infinity : args.length ? +args[0] : 30;
      return s.slice(0, largo);
    }
    return v;
  }

  /* registra en una base de sql.js las funciones de T-SQL que SQLite no trae */
  function registrarFunciones(db, ctx) {
    const f = (n, fn) => db.create_function(n, fn);
    f('GETDATE', () => ctx.reloj);
    f('DEC2', x => (x === null ? null : typeof x === 'number' ? redondear(x, 2) : x));
    f('CONV', (tipo, v) => convertir(tipo, v));
    f('CONV3', (tipo, v, estilo) => convertir(tipo, v, estilo));
    f('DATEADD', (p, n, v) => dateadd(p, n, v));
    f('DATEDIFF', (p, a, b) => datediff(p, a, b));
    f('DATEPART', (p, v) => datepart(p, v));
    f('DATENAME', (p, v) => {
      const k = parte(p); const x = datepart(p, v); if (x === null) return null;
      if (k === 'month') return ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][x - 1];
      if (k === 'weekday') return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][x - 1];
      return String(x);
    });
    f('YEAR', v => datepart('year', v));
    f('MONTH', v => datepart('month', v));
    f('DAY', v => datepart('day', v));
    f('EOMONTH', v => { const d = aFecha(v); if (!d) return null; return txtFecha(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0))).slice(0, 10); });
    f('EOMONTH_2', (v, k) => { const d = aFecha(v); if (!d) return null; const r = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1 + (k ? Math.trunc(k) : 0), 0)); return txtFecha(r).slice(0, 10); });
    f('LEN', s => (s === null ? null : String(s).replace(/ +$/, '').length));
    f('LEFT', (s, k) => (s === null || k === null ? null : String(s).slice(0, Math.max(0, k))));
    f('RIGHT', (s, k) => (s === null || k === null ? null : (k <= 0 ? '' : String(s).slice(-k))));
    f('CHARINDEX', (a, b) => { if (a === null || b === null) return null; return String(b).toLowerCase().indexOf(String(a).toLowerCase()) + 1; });
    f('CHARINDEX_3', (a, b, ini) => { if (a === null || b === null) return null; const p = String(b).toLowerCase().indexOf(String(a).toLowerCase(), ini ? ini - 1 : 0); return p + 1; });
    f('REPLICATE', (s, k) => (s === null || k === null ? null : String(s).repeat(Math.max(0, k))));
    f('REVERSE', s => (s === null ? null : String(s).split('').reverse().join('')));
    f('SPACE', k => (k === null ? null : ' '.repeat(Math.max(0, k))));
    f('CEILING', x => (x === null ? null : Math.ceil(x)));
    f('FLOOR_T', x => (x === null ? null : Math.floor(x)));
    f('POWER_T', (x, y) => (x === null || y === null ? null : Math.pow(x, y)));
    f('SQRT_T', x => (x === null ? null : Math.sqrt(x)));
    f('SQUARE', x => (x === null ? null : x * x));
    f('SIGN_T', x => (x === null ? null : Math.sign(x)));
    f('ROUND_T', (x, s) => (x === null || s === null ? null : redondear(x, s)));
    f('ROUND_T_3', (x, s, trunc) => {
      if (x === null || s === null) return null;
      if (trunc) { const k = Math.pow(10, s); return Math.trunc(Number(x) * k) / k; }
      return redondear(x, s);
    });
    f('NEWID', () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, ch => { const r = Math.random() * 16 | 0; return (ch === 'x' ? r : (r & 3 | 8)).toString(16).toUpperCase(); }));
    f('UPPER', s => (s === null ? null : String(s).toUpperCase()));
    f('LOWER', s => (s === null ? null : String(s).toLowerCase()));
    f('LTRIM', s => (s === null ? null : String(s).replace(/^ +/, '')));
    f('RTRIM', s => (s === null ? null : String(s).replace(/ +$/, '')));
    f('FORMAT_T', (v, patron) => {
      if (v === null) return null;
      if (typeof v === 'number') {
        const m = String(patron).match(/^[NnCc](\d*)$/);
        if (m) { const d = m[1] === '' ? 2 : +m[1]; return (patron[0].toUpperCase() === 'C' ? '$' : '') + Number(v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }); }
        return String(v);
      }
      const d = aFecha(v);
      return String(patron).replace(/yyyy|MM|dd|HH|mm|ss/g, t => ({ yyyy: d.getUTCFullYear(), MM: pad(d.getUTCMonth() + 1), dd: pad(d.getUTCDate()), HH: pad(d.getUTCHours()), mm: pad(d.getUTCMinutes()), ss: pad(d.getUTCSeconds()) }[t]));
    });
    if (db.create_aggregate) {
      db.create_aggregate('AVG_T', {
        init: () => ({ s: 0, n: 0, real: false }),
        step: (st, x, tipo) => { if (x === null || x === undefined) return st; if (typeof x !== 'number') x = aNumero(x); if (tipo === 'real' || !Number.isInteger(x)) st.real = true; st.s += x; st.n++; return st; },
        finalize: st => (st.n === 0 ? null : st.real ? st.s / st.n : Math.trunc(st.s / st.n)),
      });
    }
  }

  /* ================================================================ traductor T-SQL → SQLite */
  const NO_SQLITE = new Set(['LIMIT', 'GLOB', 'REGEXP', 'PRAGMA', 'ATTACH', 'DETACH', 'VACUUM', 'REINDEX', 'AUTOINCREMENT', 'RETURNING', 'ILIKE']);
  const AGREGADOS = new Set(['COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'COUNT_BIG', 'STRING_AGG', 'STDEV', 'STDEVP', 'VAR', 'VARP', 'GROUPING', 'AVG_T']);
  const PALABRAS = new Set(['SELECT', 'FROM', 'WHERE', 'GROUP', 'BY', 'HAVING', 'ORDER', 'AS', 'AND', 'OR', 'NOT', 'NULL', 'IS', 'IN', 'LIKE',
    'BETWEEN', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'DISTINCT', 'ALL', 'TOP', 'ASC', 'DESC', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'FULL',
    'OUTER', 'CROSS', 'ON', 'UNION', 'EXCEPT', 'INTERSECT', 'EXISTS', 'ANY', 'SOME', 'INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE', 'INSERT',
    'WITH', 'OVER', 'PARTITION', 'ROWS', 'RANGE', 'OFFSET', 'FETCH', 'NEXT', 'FIRST', 'ONLY', 'TIES', 'PERCENT', 'COLLATE', 'ESCAPE', 'TRUE', 'FALSE', 'APPLY']);
  const FUNC_RENOMBRE = { ISNULL: 'IFNULL', GETUTCDATE: 'GETDATE', SYSDATETIME: 'GETDATE', SYSUTCDATETIME: 'GETDATE', CURRENT_TIMESTAMP: 'GETDATE',
    COUNT_BIG: 'COUNT', ROUND: 'ROUND_T', FLOOR: 'FLOOR_T', POWER: 'POWER_T', SQRT: 'SQRT_T', SIGN: 'SIGN_T', FORMAT: 'FORMAT_T' };
  const FUNC_PARTE = new Set(['DATEADD', 'DATEDIFF', 'DATEPART', 'DATENAME']);

  /* busca el paréntesis que cierra al de la posición i (en la lista de tokens significativos) */
  function cierre(s, i) {
    let p = 0;
    for (let k = i; k < s.length; k++) {
      if (esOp(s[k], '(')) p++;
      else if (esOp(s[k], ')')) { p--; if (p === 0) return k; }
    }
    return -1;
  }
  /* convierte una lista de tokens a texto SQLite (los tokens pueden traer «o» = texto de salida ya traducido) */
  function aTexto(s) {
    let out = '';
    for (let k = 0; k < s.length; k++) {
      const tk = s[k];
      const txt = tk.o !== undefined ? tk.o : tk.v;
      if (txt === '') continue;
      if (out && !/[\s(.]$/.test(out) && !/^[),.]/.test(txt) && !(esOp(tk, '(') && k > 0 && s[k - 1].t === 'id' && s[k - 1].fn)) out += ' ';
      out += txt;
    }
    return out;
  }
  function errSintaxis(tk, linea) {
    if (!tk) return new ErrorSQL(102, "Incorrect syntax near ')'.", { nivel: 15, linea, alcance: 'compilacion' });
    if (tk.t === 'id' && PALABRAS.has(tk.u)) return new ErrorSQL(156, `Incorrect syntax near the keyword '${tk.u.toLowerCase() === 'from' ? 'FROM' : tk.u}'.`, { nivel: 15, linea: tk.linea || linea, alcance: 'compilacion' });
    return new ErrorSQL(102, `Incorrect syntax near '${tk.t === 'str' ? tk.val : tk.t === 'qid' ? tk.val : tk.v}'.`, { nivel: 15, linea: tk.linea || linea, alcance: 'compilacion' });
  }

  function crearTraductor(ESQ, bdActual) {
    const tablas = new Map(ESQ.map(t => [t.tabla.toLowerCase(), t]));
    const colsTexto = new Set();
    const colsDe = new Map();
    for (const t of ESQ) {
      colsDe.set(t.tabla.toLowerCase(), new Set(t.cols.map(c => c[0].toLowerCase())));
      for (const [c, tipo] of t.cols) if (/CHAR|TEXT/i.test(tipo)) colsTexto.add(c.toLowerCase());
    }
    const idDe = t => { const x = tablas.get(t.toLowerCase()); return x ? x.cols.find(c => c[2].id)[0] : null; };

    /* ------------------------------------------ pasada de limpieza: nombres, cadenas, funciones */
    function limpiar(s, linea, otros) {
      const out = [];
      for (let k = 0; k < s.length; k++) {
        const tk = { ...s[k] };
        if (tk.t === 'bad') throw errSintaxis(tk, linea);
        if (tk.t === 'op' && (tk.v === '==' || tk.v === '||')) throw new ErrorSQL(102, `Incorrect syntax near '${tk.v[0]}'.`, { nivel: 15, linea: tk.linea, alcance: 'compilacion' });
        if (tk.t === 'id' && NO_SQLITE.has(tk.u)) throw errSintaxis(s[k + 1] ? { ...s[k + 1], t: s[k + 1].t === 'id' ? 'num' : s[k + 1].t } : { ...tk, t: 'num' }, linea);
        /* bd.dbo.tabla, dbo.tabla, INFORMATION_SCHEMA.X */
        if ((tk.t === 'id' || tk.t === 'qid') && esOp(s[k + 1], '.')) {
          const nom = (tk.t === 'id' ? tk.v : tk.val);
          const nl = nom.toLowerCase();
          if (/^kintibus_(test|prod)$/i.test(nom)) {
            if (nl !== bdActual.toLowerCase()) throw new ErrorSQL(916, `The server principal "${otros.usuario}" is not able to access the database "${nom}" under the current security context.`, { nivel: 14, estado: 2, linea: tk.linea });
            k++; if ((s[k + 1] && (s[k + 1].t === 'id' || s[k + 1].t === 'qid') && (s[k + 1].val || '').toLowerCase() === 'dbo') && esOp(s[k + 2], '.')) k += 2;
            continue;
          }
          if (nl === 'dbo') { k++; continue; }
          if (nl === 'information_schema' && s[k + 2] && (s[k + 2].t === 'id' || s[k + 2].t === 'qid')) {
            const x = (s[k + 2].val || '').toUpperCase();
            if (x === 'TABLES' || x === 'COLUMNS') { out.push({ ...s[k + 2], t: 'qid', o: `"INFORMATION_SCHEMA_${x}"`, val: `INFORMATION_SCHEMA_${x}` }); k += 2; continue; }
          }
        }
        if (tk.t === 'qid') { tk.o = '[' + tk.val.replace(/]/g, ']]') + ']'; }    /* con corchetes SQLite nunca lo toma como texto */
        if (tk.t === 'str') {
          let v = tk.val;
          const m = v.match(/^(\d{4})-?(\d{2})-?(\d{2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2})(?:\.\d{1,7})?)?)?$/);
          const plausible = m && +m[1] >= 1900 && +m[1] <= 2100 && +m[2] >= 1 && +m[2] <= 12 && +m[3] >= 1 && +m[3] <= 31;
          if (plausible && (v.includes('-') ? m[4] !== undefined : true)) {
            v = `${m[1]}-${m[2]}-${m[3]}` + (m[4] !== undefined ? ` ${pad(m[4])}:${m[5]}:${m[6] || '00'}` : '');
          }
          tk.o = "'" + v.replace(/'/g, "''") + "'";
        }
        if (tk.t === 'id') {
          if (tk.u === 'CURRENT_TIMESTAMP') { tk.o = 'GETDATE()'; out.push(tk); continue; }
          if (tk.u === 'SYSTEM_USER' || tk.u === 'CURRENT_USER' || tk.u === 'SESSION_USER') { tk.o = `'${otros.usuario}'`; out.push(tk); continue; }
          if (esOp(s[k + 1], '(')) {
            tk.fn = 1;
            if (FUNC_RENOMBRE[tk.u]) tk.o = FUNC_RENOMBRE[tk.u];
            if (tk.u === 'SCOPE_IDENTITY' || tk.u === 'IDENT_CURRENT' || tk.u === 'DB_NAME' || tk.u === 'SUSER_SNAME' || tk.u === 'USER_NAME' || tk.u === 'SUSER_NAME') {
              const c = cierre(s, k + 1);
              let val = 'NULL';
              if (tk.u === 'SCOPE_IDENTITY') { out.push({ t: 'var', v: '@@scope_identity', val: '@@scope_identity', linea: tk.linea }); k = c; continue; }
              else if (tk.u === 'DB_NAME') val = `'${bdActual}'`;
              else if (tk.u === 'IDENT_CURRENT') { const a = s[k + 2]; val = a && a.t === 'str' ? `(SELECT seq FROM sqlite_sequence WHERE name = '${a.val.replace(/^dbo\./i, '').replace(/'/g, "''")}' COLLATE NOCASE)` : 'NULL'; }
              else val = `'${otros.usuario}'`;
              out.push({ ...tk, fn: 0, o: val }); k = c; continue;
            }
            if (FUNC_PARTE.has(tk.u) && s[k + 2] && (s[k + 2].t === 'id' || s[k + 2].t === 'str') && esOp(s[k + 3], ',')) {
              const p = s[k + 2].t === 'id' ? s[k + 2].v : s[k + 2].val;
              if (!PARTES[p.toLowerCase()]) throw new ErrorSQL(155, `'${p}' is not a recognized ${tk.u.toLowerCase()} option.`, { nivel: 15, linea: tk.linea, alcance: 'compilacion' });
              out.push(tk); out.push(s[k + 1]); out.push({ t: 'str', v: `'${p}'`, o: `'${p}'`, val: p, linea: tk.linea }); k += 2; continue;
            }
          }
        }
        if (tk.t === 'var') {
          if (['@@rowcount', '@@trancount', '@@identity', '@@error'].includes(tk.val)) { /* se resuelve al ejecutar */ }
          else if (tk.val === '@@version') { tk.o = "'Microsoft SQL Server 2022 (simulador Kinti Bus)'"; tk.t = 'str'; }
          else if (tk.val === '@@servername') { tk.o = "'KINTI-SQL01'"; tk.t = 'str'; }
          else if (tk.val.startsWith('@@')) throw new ErrorSQL(50000, `El simulador no reconoce la variable del sistema ${tk.v}.`, { linea: tk.linea });
        }
        out.push(tk);
      }
      return out;
    }

    /* ------------------------------------------ CAST, CONVERT, TOP, OFFSET/FETCH, sugerencias de tabla, concatenación */
    function expresiones(s, linea) {
      /* AVG(x) → AVG_T(x, typeof(x)): con enteros, SQL Server devuelve un entero (corta los decimales) */
      for (let k = 0; k < s.length; k++) {
        if (!(s[k].t === 'id' && s[k].fn && s[k].u === 'AVG') || s[k].o === 'AVG_T' || esPal(s[k + 2], 'DISTINCT', 'ALL')) continue;
        const ce = cierre(s, k + 1); if (ce < 0) throw errSintaxis(null, linea);
        const expr = s.slice(k + 2, ce);
        if (!expr.length) continue;
        s.splice(k, ce - k + 1, { ...s[k], o: 'AVG_T' }, { t: 'op', v: '(' }, ...expr, { t: 'op', v: ',' },
          { t: 'id', v: 'typeof', o: 'typeof', fn: 1, u: 'TYPEOF' }, { t: 'op', v: '(' }, ...expr.map(x => ({ ...x })), { t: 'op', v: ')' }, { t: 'op', v: ')' });
      }
      for (let k = 0; k < s.length; k++) {
        const tk = s[k];
        if (tk.t === 'id' && tk.fn && (tk.u === 'CAST' || tk.u === 'TRY_CAST' || tk.u === 'CONVERT' || tk.u === 'TRY_CONVERT')) {
          const ab = k + 1, ce = cierre(s, ab);
          if (ce < 0) throw errSintaxis(null, linea);
          let tipoIni, tipoFin, exprIni, exprFin, estilo = null;
          if (tk.u.endsWith('CAST')) {
            let p = 0, as = -1;
            for (let j = ab + 1; j < ce; j++) { if (esOp(s[j], '(')) p++; else if (esOp(s[j], ')')) p--; else if (p === 0 && esPal(s[j], 'AS')) as = j; }
            if (as < 0) throw errSintaxis(s[ce], linea);
            exprIni = ab + 1; exprFin = as; tipoIni = as + 1; tipoFin = ce;
          } else {
            let p = 0, comas = [];
            for (let j = ab + 1; j < ce; j++) { if (esOp(s[j], '(')) p++; else if (esOp(s[j], ')')) p--; else if (p === 0 && esOp(s[j], ',')) comas.push(j); }
            if (!comas.length) throw errSintaxis(s[ce], linea);
            tipoIni = ab + 1; tipoFin = comas[0]; exprIni = comas[0] + 1; exprFin = comas[1] || ce;
            if (comas[1]) estilo = s.slice(comas[1] + 1, ce).map(x => x.o !== undefined ? x.o : x.v).join('');
          }
          const tipo = s.slice(tipoIni, tipoFin).map(x => x.v).join('');
          const expr = s.slice(exprIni, exprFin);
          const nuevo = [{ t: 'id', v: 'CONV', o: estilo !== null ? 'CONV3' : 'CONV', fn: 1, u: 'CONV', linea: tk.linea }, { t: 'op', v: '(' },
            { t: 'str', v: `'${tipo}'`, o: `'${tipo.replace(/'/g, "''")}'` }, { t: 'op', v: ',' }, ...expr];
          if (estilo !== null) nuevo.push({ t: 'op', v: ',' }, { t: 'num', v: estilo, o: estilo });
          nuevo.push({ t: 'op', v: ')' });
          s.splice(k, ce - k + 1, ...nuevo);
          continue;
        }
      }
      /* funciones con argumento opcional: el nombre depende de cuántos argumentos llegan */
      for (let k = 0; k < s.length; k++) {
        const tk = s[k];
        if (!(tk.t === 'id' && tk.fn && ['EOMONTH', 'CHARINDEX', 'ROUND'].includes(tk.u))) continue;
        const ce = cierre(s, k + 1); if (ce < 0) continue;
        let n = 1, p = 0;
        for (let j = k + 2; j < ce; j++) { if (esOp(s[j], '(')) p++; else if (esOp(s[j], ')')) p--; else if (p === 0 && esOp(s[j], ',')) n++; }
        if (tk.u === 'EOMONTH' && n === 2) s[k] = { ...tk, o: 'EOMONTH_2' };
        if (tk.u === 'CHARINDEX' && n === 3) s[k] = { ...tk, o: 'CHARINDEX_3' };
        if (tk.u === 'ROUND' && n === 3) s[k] = { ...tk, o: 'ROUND_T_3' };
      }
      /* sugerencias de tabla: WITH (NOLOCK), (NOLOCK) */
      for (let k = 0; k < s.length; k++) {
        if (esOp(s[k], '(') && s[k + 1] && s[k + 1].t === 'id' && ['NOLOCK', 'READUNCOMMITTED', 'ROWLOCK', 'UPDLOCK', 'HOLDLOCK', 'READPAST', 'TABLOCK', 'NOWAIT'].includes(s[k + 1].u)) {
          const c = cierre(s, k);
          const conWith = esPal(s[k - 1], 'WITH');
          s.splice(conWith ? k - 1 : k, c - k + 1 + (conWith ? 1 : 0));
          k = Math.max(0, k - 2);
        }
      }
      /* TOP n → LIMIT n al final de su SELECT */
      for (let k = 0; k < s.length; k++) {
        if (!esPal(s[k], 'TOP')) continue;
        let j = k - 1; if (esPal(s[j], 'DISTINCT', 'ALL')) j--;
        if (!esPal(s[j], 'SELECT')) {
          if (esPal(s[j], 'UPDATE', 'DELETE', 'INSERT')) throw new ErrorSQL(50000, `El simulador no habilita TOP en ${s[j].u}: use WHERE para elegir las filas.`, { linea: s[k].linea, alcance: 'compilacion' });
          continue;
        }
        let fin = k + 1, n;
        if (esOp(s[fin], '(')) { const c = cierre(s, fin); n = s.slice(fin + 1, c); fin = c + 1; } else { n = [s[fin]]; fin++; }
        if (!n.length || (n.length === 1 && n[0].t !== 'num' && n[0].t !== 'var')) throw errSintaxis(n[0], linea);
        if (esPal(s[fin], 'PERCENT') || (esPal(s[fin], 'WITH') && esPal(s[fin + 1], 'TIES'))) throw new ErrorSQL(50000, 'El simulador no habilita TOP … PERCENT ni WITH TIES.', { linea: s[k].linea, alcance: 'compilacion' });
        /* fin del alcance de este SELECT */
        let p = 0, fs = s.length;
        for (let q = j - 1; q >= 0; q--) { if (esOp(s[q], ')')) p++; else if (esOp(s[q], '(')) { if (p === 0) { fs = cierre(s, q); break; } p--; } }
        const lim = [{ t: 'id', v: 'LIMIT', o: 'LIMIT', u: 'LIMIT_OK' }, ...n.map(x => ({ ...x }))];
        s.splice(fs, 0, ...lim);
        s.splice(k, fin - k);
      }
      /* OFFSET n ROWS FETCH NEXT m ROWS ONLY */
      for (let k = 0; k < s.length; k++) {
        if (esPal(s[k], 'OFFSET') && esPal(s[k + 2], 'ROW', 'ROWS')) {
          const off = s[k + 1];
          if (esPal(s[k + 3], 'FETCH')) {
            const m = s[k + 5];
            s.splice(k, 9, { t: 'id', v: 'LIMIT', o: 'LIMIT', u: 'LIMIT_OK' }, { ...m }, { t: 'id', v: 'OFFSET', o: 'OFFSET', u: 'OFFSET' }, { ...off });
          } else s.splice(k, 3, { t: 'id', v: 'LIMIT', o: 'LIMIT -1 OFFSET', u: 'LIMIT_OK' }, { ...off });
        }
      }
      /* concatenación con + cuando hay texto a un lado */
      const esTexto = x => x && (x.t === 'str' || ((x.t === 'id' || x.t === 'qid') && !x.fn && colsTexto.has((x.val || '').toLowerCase())));
      let cambio = true;
      const marca = new Set();
      while (cambio) {
        cambio = false;
        for (let k = 0; k < s.length; k++) {
          if (!esOp(s[k], '+') || marca.has(k)) continue;
          const izq = s[k - 1], der = s[k + 1];
          const vecinoMarca = (marca.has(k - 2) && !esOp(s[k - 1], ')')) || (marca.has(k + 2) && !esOp(s[k + 1], '('));
          if (esTexto(izq) || esTexto(der) || vecinoMarca) { marca.add(k); cambio = true; }
        }
      }
      for (const k of marca) s[k] = { ...s[k], o: '||' };
      return s;
    }

    /* ------------------------------------------ análisis de GROUP BY y alias (errores 8120, 8121, 8127, 207) */
    function analizarSelect(s, linea) {
      if (s.some(x => esPal(x, 'OVER', 'UNION', 'EXCEPT', 'INTERSECT', 'APPLY'))) return;
      /* solo el SELECT principal (profundidad 0) */
      const ini = s.findIndex(x => esPal(x, 'SELECT'));
      if (ini < 0) return;
      let p = 0; const cl = {};
      for (let k = ini; k < s.length; k++) {
        if (esOp(s[k], '(')) p++; else if (esOp(s[k], ')')) p--;
        else if (p === 0 && s[k].t === 'id') {
          if (s[k].u === 'FROM' && cl.from === undefined) cl.from = k;
          else if (s[k].u === 'WHERE' && cl.where === undefined) cl.where = k;
          else if (s[k].u === 'GROUP' && esPal(s[k + 1], 'BY')) cl.group = k;
          else if (s[k].u === 'HAVING') cl.having = k;
          else if (s[k].u === 'ORDER' && esPal(s[k + 1], 'BY')) cl.order = k;
          else if (s[k].u === 'LIMIT_OK') cl.limit = k;
        }
      }
      const fin = (desde, ...siguientes) => Math.min(...siguientes.filter(x => x !== undefined && x > desde), s.length);
      let selIni = ini + 1; while (esPal(s[selIni], 'DISTINCT', 'ALL')) selIni++;
      const selFin = fin(ini, cl.from, cl.where, cl.group, cl.having, cl.order, cl.limit);
      /* tablas del FROM: nombre y alias */
      const tablasFrom = [];
      if (cl.from !== undefined) {
        const fFin = fin(cl.from, cl.where, cl.group, cl.having, cl.order, cl.limit);
        let q = 0;
        for (let k = cl.from + 1; k < fFin; k++) {
          if (esOp(s[k], '(')) { q++; if (q === 1 && esPal(s[k + 1], 'SELECT')) return; continue; }
          if (esOp(s[k], ')')) { q--; continue; }
          if (q) continue;
          const tk = s[k];
          if ((tk.t === 'id' || tk.t === 'qid') && !tk.fn && !(tk.t === 'id' && PALABRAS.has(tk.u))) {
            const prev = s[k - 1];
            if (prev && (esPal(prev, 'FROM', 'JOIN') || esOp(prev, ','))) {
              const nom = (tk.val || tk.v).toLowerCase();
              if (!colsDe.has(nom)) return;                 // vistas, CTE o tablas que no existen: no se analiza
              let alias = nom; let a = s[k + 1];
              if (esPal(a, 'AS')) a = s[k + 2];
              if (a && (a.t === 'id' || a.t === 'qid') && !(a.t === 'id' && PALABRAS.has(a.u))) alias = (a.val || a.v).toLowerCase();
              tablasFrom.push({ nom, alias });
            }
          }
        }
      }
      if (!tablasFrom.length) return;
      const columnaExiste = (c, calif) => tablasFrom.some(t => (!calif || t.alias === calif || t.nom === calif) && colsDe.get(t.nom).has(c));
      /* elementos de la lista de selección */
      const items = []; let actual = []; p = 0;
      for (let k = selIni; k < selFin; k++) {
        if (esOp(s[k], '(')) p++; else if (esOp(s[k], ')')) p--;
        if (p === 0 && esOp(s[k], ',')) { items.push(actual); actual = []; continue; }
        actual.push(s[k]);
      }
      if (actual.length) items.push(actual);
      const alias = new Set();
      const refsFuera = (lista) => {
        /* columnas que no están dentro de un agregado (ni en subconsultas) */
        const refs = []; let enAgg = 0, prof = 0; const pila = [];
        for (let k = 0; k < lista.length; k++) {
          const tk = lista[k];
          if (esOp(tk, '(')) { prof++; const prev = lista[k - 1]; const agg = prev && prev.fn && AGREGADOS.has(prev.u); pila.push(agg); if (agg) enAgg++; if (esPal(lista[k + 1], 'SELECT')) return null; continue; }
          if (esOp(tk, ')')) { prof--; if (pila.pop()) enAgg--; continue; }
          if (enAgg) continue;
          if ((tk.t === 'id' || tk.t === 'qid') && !tk.fn && !(tk.t === 'id' && (PALABRAS.has(tk.u) || tk.u === 'LIMIT_OK'))) {
            if (esOp(lista[k + 1], '.')) continue;          // calificador
            const calif = esOp(lista[k - 1], '.') && lista[k - 2] ? (lista[k - 2].val || lista[k - 2].v).toLowerCase() : null;
            refs.push({ c: (tk.val || tk.v).toLowerCase(), v: tk.val || tk.v, calif, califTxt: calif ? (lista[k - 2].val || lista[k - 2].v) : null });
          }
        }
        return refs;
      };
      /* ¿hay un agregado fuera de subconsultas? */
      const hayAgg = lista => {
        for (let k = 0; k < lista.length; k++) {
          if (esOp(lista[k], '(') && esPal(lista[k + 1], 'SELECT')) { const c = cierre(lista, k); if (c < 0) return false; k = c; continue; }
          if (lista[k].fn && AGREGADOS.has(lista[k].u) && esOp(lista[k + 1], '(')) return true;
        }
        return false;
      };
      const itemsLimpios = items.map(it => {
        let cuerpo = it;
        if (it.length > 2 && (it[0].t === 'id' || it[0].t === 'qid') && esOp(it[1], '=') ) { alias.add((it[0].val || it[0].v).toLowerCase()); cuerpo = it.slice(2); }
        else {
          const asI = it.findIndex((x, k) => esPal(x, 'AS') && k > 0);
          if (asI > 0) { const a = it[asI + 1]; if (a) alias.add((a.val || a.v).toLowerCase()); cuerpo = it.slice(0, asI); }
          else if (it.length >= 2) {
            const u = it[it.length - 1], pen = it[it.length - 2];
            if ((u.t === 'id' || u.t === 'qid' || u.t === 'str') && !(u.t === 'id' && PALABRAS.has(u.u)) && !esOp(pen, '.', '+', '-', '*', '/', '%', '=', '<', '>', '<>', '!=', '>=', '<=') && !esPal(pen, 'AND', 'OR', 'NOT', 'IS', 'LIKE', 'IN', 'WHEN', 'THEN', 'ELSE', 'CASE')) {
              alias.add((u.val || u.v).toLowerCase()); cuerpo = it.slice(0, -1);
            }
          }
        }
        return cuerpo;
      });
      /* SQL Server nombra la columna como Tabla.Columna (aunque se haya usado un alias) */
      const nombreSql = (r) => {
        const t = tablasFrom.find(t => (!r.calif || t.alias === r.calif || t.nom === r.calif) && colsDe.get(t.nom).has(r.c));
        if (!t) return r.califTxt ? `${r.califTxt}.${r.v}` : r.v;
        const tt = tablas.get(t.nom);
        return `${tt.tabla}.${tt.cols.find(c => c[0].toLowerCase() === r.c)[0]}`;
      };
      /* alias usados en WHERE / GROUP BY / HAVING → 207 (SQL Server no los reconoce ahí) */
      const revisarAlias = (desde, hasta) => {
        let q = 0;
        for (let k = desde; k < hasta; k++) {
          if (esOp(s[k], '(') && esPal(s[k + 1], 'SELECT')) { const c = cierre(s, k); if (c < 0) return; k = c; continue; }
          if (esOp(s[k], '(')) { q++; continue; } if (esOp(s[k], ')')) { q--; continue; }
          const tk = s[k];
          if ((tk.t === 'id' || tk.t === 'qid') && !tk.fn && !(tk.t === 'id' && PALABRAS.has(tk.u)) && !esOp(s[k - 1], '.') && !esOp(s[k + 1], '.')) {
            const c = (tk.val || tk.v).toLowerCase();
            if (alias.has(c) && !columnaExiste(c)) throw new ErrorSQL(207, `Invalid column name '${tk.val || tk.v}'.`, { linea: tk.linea || linea, alcance: 'compilacion' });
          }
        }
      };
      if (cl.where !== undefined) revisarAlias(cl.where + 1, fin(cl.where, cl.group, cl.having, cl.order, cl.limit));
      if (cl.group !== undefined) revisarAlias(cl.group + 2, fin(cl.group, cl.having, cl.order, cl.limit));
      if (cl.having !== undefined) revisarAlias(cl.having + 1, fin(cl.having, cl.order, cl.limit));

      const agrupa = cl.group !== undefined || itemsLimpios.some(hayAgg) || (cl.having !== undefined);
      if (!agrupa) return;
      const grupo = new Set(), grupoTxt = new Set();
      if (cl.group !== undefined) {
        const gFin = fin(cl.group, cl.having, cl.order, cl.limit);
        let it = []; let q = 0;
        const cerrarItem = () => { if (!it.length) return; grupoTxt.add(it.map(x => (x.o || x.v).toLowerCase()).join('')); if (it.length === 1 || (it.length === 3 && esOp(it[1], '.'))) grupo.add((it[it.length - 1].val || it[it.length - 1].v).toLowerCase()); it = []; };
        for (let k = cl.group + 2; k < gFin; k++) { if (esOp(s[k], '(')) q++; else if (esOp(s[k], ')')) q--; if (q === 0 && esOp(s[k], ',')) { cerrarItem(); continue; } it.push(s[k]); }
        cerrarItem();
      }
      for (const it of itemsLimpios) {
        if (it.length === 1 && esOp(it[0], '*')) {
          const t = tablasFrom[0], c0 = tablas.get(t.nom).cols[0][0];
          throw new ErrorSQL(8120, `Column '${tablas.get(t.nom).tabla}.${c0}' is invalid in the select list because it is not contained in either an aggregate function or the GROUP BY clause.`, { linea, alcance: 'compilacion' });
        }
        if (grupoTxt.has(it.map(x => (x.o || x.v).toLowerCase()).join(''))) continue;
        const refs = refsFuera(it);
        if (!refs) return;
        for (const r of refs) {
          if (!columnaExiste(r.c, r.calif)) continue;
          if (!grupo.has(r.c)) throw new ErrorSQL(8120, `Column '${nombreSql(r)}' is invalid in the select list because it is not contained in either an aggregate function or the GROUP BY clause.`, { linea, alcance: 'compilacion' });
        }
      }
      if (cl.having !== undefined) {
        const refs = refsFuera(s.slice(cl.having + 1, fin(cl.having, cl.order, cl.limit)));
        if (refs) for (const r of refs) if (columnaExiste(r.c, r.calif) && !grupo.has(r.c)) throw new ErrorSQL(8121, `Column '${nombreSql(r)}' is invalid in the HAVING clause because it is not contained in either an aggregate function or the GROUP BY clause.`, { linea, alcance: 'compilacion' });
      }
      if (cl.order !== undefined) {
        const refs = refsFuera(s.slice(cl.order + 2, fin(cl.order, cl.limit)));
        if (refs) for (const r of refs) if (columnaExiste(r.c, r.calif) && !grupo.has(r.c) && !alias.has(r.c)) throw new ErrorSQL(8127, `Column '${nombreSql(r)}' is invalid in the ORDER BY clause because it is not contained in either an aggregate function or the GROUP BY clause.`, { linea, alcance: 'compilacion' });
      }
    }

    /* ------------------------------------------ INSERT, UPDATE, DELETE */
    function tablaObjetivo(s, k) {
      const tk = s[k];
      if (!tk || !(tk.t === 'id' || tk.t === 'qid')) throw errSintaxis(tk, 1);
      return { nombre: tk.val || tk.v, idx: k };
    }
    function traducirInsert(s, linea) {
      let k = 1;
      if (esPal(s[k], 'TOP')) throw new ErrorSQL(50000, 'El simulador no habilita TOP en INSERT.', { linea, alcance: 'compilacion' });
      if (!esPal(s[k], 'INTO')) s.splice(k, 0, { t: 'id', v: 'INTO', u: 'INTO' });
      k++;
      const obj = tablaObjetivo(s, k);
      const tabla = tablas.get(obj.nombre.toLowerCase());
      if (!tabla) return { tabla: obj.nombre, s };          // SQLite dirá que no existe
      const id = idDe(tabla.tabla);
      let p = k + 1;
      if (esOp(s[p], '(') && !esPal(s[p + 1], 'SELECT')) {
        const c = cierre(s, p);
        const cols = s.slice(p + 1, c).filter(x => x.t === 'id' || x.t === 'qid').map(x => (x.val || x.v));
        if (id && cols.some(x => x.toLowerCase() === id.toLowerCase())) return { tabla: tabla.tabla, s, err: new ErrorSQL(544, `Cannot insert explicit value for identity column in table '${tabla.tabla}' when IDENTITY_INSERT is set to OFF.`, { linea }) };
        for (const x of cols) if (!colsDe.get(tabla.tabla.toLowerCase()).has(x.toLowerCase())) throw new ErrorSQL(207, `Invalid column name '${x}'.`, { linea, alcance: 'compilacion' });
        return { tabla: tabla.tabla, s };
      }
      /* sin lista de columnas: SQL Server espera todas menos la IDENTITY */
      const cols = tabla.cols.filter(c => !c[2].id).map(c => c[0]);
      if (esPal(s[p], 'VALUES')) {
        let q = p + 1;
        while (q < s.length) {
          if (!esOp(s[q], '(')) break;
          const c = cierre(s, q);
          let n = 1, prof = 0;
          for (let j = q + 1; j < c; j++) { if (esOp(s[j], '(')) prof++; else if (esOp(s[j], ')')) prof--; else if (prof === 0 && esOp(s[j], ',')) n++; }
          if (n !== cols.length) {
            if (n === cols.length + 1 && id) return { tabla: tabla.tabla, s, err: new ErrorSQL(8101, `An explicit value for the identity column in table '${tabla.tabla}' can only be specified when a column list is used and IDENTITY_INSERT is ON.`, { linea }) };
            throw new ErrorSQL(213, 'Column name or number of supplied values does not match table definition.', { linea, alcance: 'compilacion' });
          }
          q = c + 1; if (esOp(s[q], ',')) q++;
        }
      }
      if (esPal(s[p], 'DEFAULT')) return { tabla: tabla.tabla, s };
      s.splice(p, 0, { t: 'op', v: '(', o: '(' + cols.map(c => `"${c}"`).join(', ') + ')' });
      return { tabla: tabla.tabla, s };
    }
    /* UPDATE … FROM y DELETE … FROM de T-SQL → subconsulta por rowid */
    function partirClausulas(s, desde) {
      const r = {}; let p = 0;
      for (let k = desde; k < s.length; k++) {
        if (esOp(s[k], '(')) p++; else if (esOp(s[k], ')')) p--;
        else if (p === 0 && s[k].t === 'id') {
          if (s[k].u === 'SET' && r.set === undefined) r.set = k;
          else if (s[k].u === 'FROM' && r.from === undefined) r.from = k;
          else if (s[k].u === 'WHERE' && r.where === undefined) r.where = k;
          else if (s[k].u === 'OUTPUT') throw new ErrorSQL(50000, 'El simulador no habilita la cláusula OUTPUT.', { linea: s[k].linea, alcance: 'compilacion' });
        }
      }
      return r;
    }
    function aliasEnFrom(fromToks, objetivo) {
      /* devuelve {tabla, alias} si «objetivo» es tabla o alias dentro del FROM */
      const o = objetivo.toLowerCase();
      for (let k = 0; k < fromToks.length; k++) {
        const tk = fromToks[k];
        if (!(tk.t === 'id' || tk.t === 'qid') || tk.fn || (tk.t === 'id' && PALABRAS.has(tk.u))) continue;
        const prev = fromToks[k - 1];
        if (!(k === 0 || esPal(prev, 'FROM', 'JOIN') || esOp(prev, ','))) continue;
        const nom = (tk.val || tk.v);
        let a = fromToks[k + 1]; if (esPal(a, 'AS')) a = fromToks[k + 2];
        const al = a && (a.t === 'id' || a.t === 'qid') && !(a.t === 'id' && PALABRAS.has(a.u)) ? (a.val || a.v) : nom;
        if (al.toLowerCase() === o || nom.toLowerCase() === o) return { tabla: nom, alias: al };
      }
      return null;
    }
    function traducirUpdate(s, linea) {
      let k = 1;
      if (esPal(s[k], 'TOP')) throw new ErrorSQL(50000, 'El simulador no habilita TOP en UPDATE: use WHERE para elegir las filas.', { linea, alcance: 'compilacion' });
      const obj = tablaObjetivo(s, k);
      const c = partirClausulas(s, k + 1);
      if (c.set === undefined) throw errSintaxis(s[k + 1] || null, linea);
      const setFin = Math.min(...[c.from, c.where].filter(x => x !== undefined), s.length);
      /* SET a.col = … → SET col = … */
      for (let j = c.set + 1; j < setFin; j++) {
        if ((s[j].t === 'id' || s[j].t === 'qid') && esOp(s[j + 1], '.') && (s[j + 2] && (s[j + 2].t === 'id' || s[j + 2].t === 'qid')) && esOp(s[j + 3], '=') &&
            (esPal(s[j - 1], 'SET') || esOp(s[j - 1], ','))) { s[j] = { ...s[j], o: '' }; s[j + 1] = { ...s[j + 1], o: '' }; }
        if (esOp(s[j], '+=', '-=', '*=', '/=') && (s[j - 1].t === 'id' || s[j - 1].t === 'qid')) {
          const col = s[j - 1]; s[j] = { t: 'op', v: '=', o: `= ${col.o || col.v} ${s[j].v[0]}` };
        }
      }
      if (c.from === undefined) {
        const t = tablas.get(obj.nombre.toLowerCase());
        if (!t) {
          return { tabla: obj.nombre, s };
        }
        return { tabla: t.tabla, s };
      }
      const fromToks = s.slice(c.from, c.where !== undefined ? c.where : s.length);
      const ref = aliasEnFrom(fromToks.slice(1), obj.nombre);
      if (!ref) throw new ErrorSQL(4104, `The multi-part identifier could not be bound.`, { linea, alcance: 'compilacion' });
      const t = tablas.get(ref.tabla.toLowerCase());
      if (!t) throw new ErrorSQL(208, `Invalid object name '${ref.tabla}'.`, { linea });
      const fromTxt = aTexto(fromToks);
      const whereTxt = c.where !== undefined ? aTexto(s.slice(c.where)) : '';
      const setToks = s.slice(c.set + 1, setFin);
      /* cada asignación col = expr → col = (SELECT expr FROM … WHERE alias.rowid = tabla.rowid …) */
      const asig = []; let actual = [], p = 0;
      for (const tk of setToks) { if (esOp(tk, '(')) p++; else if (esOp(tk, ')')) p--; if (p === 0 && esOp(tk, ',')) { asig.push(actual); actual = []; continue; } actual.push(tk); }
      if (actual.length) asig.push(actual);
      const cond = `"${ref.alias}".rowid = "${t.tabla}".rowid` + (whereTxt ? ` AND (${whereTxt.replace(/^WHERE\s*/i, '')})` : '');
      const partes = asig.map(a => {
        const eq = a.findIndex(x => esOp(x, '='));
        const col = aTexto(a.slice(0, eq)), expr = aTexto(a.slice(eq + 1));
        return `${col} = (SELECT ${expr} ${fromTxt} WHERE ${cond} LIMIT 1)`;
      });
      const sql = `UPDATE "${t.tabla}" SET ${partes.join(', ')} WHERE rowid IN (SELECT "${ref.alias}".rowid ${fromTxt}${whereTxt ? ' ' + whereTxt : ''})`;
      return { tabla: t.tabla, sql };
    }
    function traducirDelete(s, linea) {
      let k = 1;
      if (esPal(s[k], 'TOP')) throw new ErrorSQL(50000, 'El simulador no habilita TOP en DELETE: use WHERE para elegir las filas.', { linea, alcance: 'compilacion' });
      if (esOp(s[k], '*')) throw errSintaxis(s[k], linea);
      if (!esPal(s[k], 'FROM')) {
        /* DELETE tabla WHERE … o DELETE alias FROM … */
        const obj = tablaObjetivo(s, k);
        if (esPal(s[k + 1], 'FROM')) {
          const c = partirClausulas(s, k + 1);
          const fromToks = s.slice(c.from, c.where !== undefined ? c.where : s.length);
          const ref = aliasEnFrom(fromToks.slice(1), obj.nombre);
          if (!ref) throw new ErrorSQL(4104, 'The multi-part identifier could not be bound.', { linea, alcance: 'compilacion' });
          const t = tablas.get(ref.tabla.toLowerCase());
          if (!t) throw new ErrorSQL(208, `Invalid object name '${ref.tabla}'.`, { linea });
          const whereTxt = c.where !== undefined ? ' ' + aTexto(s.slice(c.where)) : '';
          return { tabla: t.tabla, sql: `DELETE FROM "${t.tabla}" WHERE rowid IN (SELECT "${ref.alias}".rowid ${aTexto(fromToks)}${whereTxt})` };
        }
        s.splice(k, 0, { t: 'id', v: 'FROM', u: 'FROM' });
      }
      k++;
      const obj = tablaObjetivo(s, k);
      const c = partirClausulas(s, k + 1);
      const t = tablas.get(obj.nombre.toLowerCase());
      if (c.from !== undefined) {
        const fromToks = s.slice(c.from, c.where !== undefined ? c.where : s.length);
        const ref = aliasEnFrom(fromToks.slice(1), obj.nombre) || { tabla: obj.nombre, alias: obj.nombre };
        const tt = tablas.get(ref.tabla.toLowerCase());
        if (!tt) throw new ErrorSQL(208, `Invalid object name '${ref.tabla}'.`, { linea });
        const whereTxt = c.where !== undefined ? ' ' + aTexto(s.slice(c.where)) : '';
        return { tabla: tt.tabla, sql: `DELETE FROM "${tt.tabla}" WHERE rowid IN (SELECT "${ref.alias}".rowid ${aTexto(fromToks)}${whereTxt})` };
      }
      return { tabla: t ? t.tabla : obj.nombre, s };
    }

    /* columnas y valores de un INSERT … VALUES (para completar los mensajes de error como SQL Server) */
    function valoresInsert(ex, tablaNom) {
      try {
        const t = tablas.get(String(tablaNom).toLowerCase()); if (!t) return null;
        let k = 3, cols;
        if (esOp(ex[k], '(') && ex[k].o === undefined) { const c = cierre(ex, k); cols = ex.slice(k + 1, c).filter(x => x.t === 'id' || x.t === 'qid').map(x => x.val || x.v); k = c + 1; }
        else { cols = t.cols.filter(c => !c[2].id).map(c => c[0]); if (esOp(ex[k], '(')) k++; }
        if (!esPal(ex[k], 'VALUES')) return null;
        const tuplas = []; let q = k + 1;
        while (esOp(ex[q], '(')) {
          const c = cierre(ex, q); if (c < 0) return null;
          const elems = []; let act = [], p = 0;
          for (let j = q + 1; j < c; j++) { if (esOp(ex[j], '(')) p++; else if (esOp(ex[j], ')')) p--; if (p === 0 && esOp(ex[j], ',')) { elems.push(aTexto(act)); act = []; continue; } act.push(ex[j]); }
          elems.push(aTexto(act)); tuplas.push(elems);
          q = c + 1; if (esOp(ex[q], ',')) q++;
        }
        return { cols, tuplas };
      } catch (e) { return null; }
    }

    /* ------------------------------------------ traducción de una instrucción */
    function traducir(instToks, otros) {
      const s0 = instToks.filter(sig);
      const linea = s0[0].linea;
      const s = limpiar(s0, linea, otros);
      const u = s[0].t === 'id' ? s[0].u : '';
      const base = { linea, tipo: u, texto: instToks.map(x => x.v).join('').trim() };
      const permiso = (verbo, obj) => ({ ...base, tipo: 'PERMISO', err: new ErrorSQL(verbo === 'CREATE TABLE' ? 262 : 3701, verbo === 'CREATE TABLE' ? `CREATE TABLE permission denied in database '${bdActual}'.` : `Cannot ${verbo.toLowerCase()} the table '${obj}', because it does not exist or you do not have permission.`, { nivel: verbo === 'CREATE TABLE' ? 14 : 11, estado: verbo === 'CREATE TABLE' ? 1 : 5, linea }) });

      if (u === 'BEGIN') {
        if (esPal(s[1], 'TRAN', 'TRANSACTION')) return { ...base, tipo: 'BEGIN' };
        if (esPal(s[1], 'DISTRIBUTED')) return { ...base, tipo: 'BEGIN' };
        throw new ErrorSQL(50000, 'El simulador no habilita bloques BEGIN … END ni TRY … CATCH: escriba las instrucciones una tras otra.', { linea, alcance: 'compilacion' });
      }
      if (u === 'COMMIT' || u === 'ROLLBACK') {
        if (s.length > 1 && !esPal(s[1], 'TRAN', 'TRANSACTION', 'WORK')) {
          if (!(s.length === 2 && (s[1].t === 'id' || s[1].t === 'qid'))) throw errSintaxis(s[1], linea);
        }
        return { ...base, tipo: u };
      }
      if (u === 'SAVE') throw new ErrorSQL(50000, 'El simulador no habilita SAVE TRANSACTION.', { linea, alcance: 'compilacion' });
      if (u === 'USE') { const x = s[1]; return { ...base, tipo: 'USE', bd: x ? (x.val || x.v) : '' }; }
      if (u === 'PRINT') return { ...base, tipo: 'PRINT', sql: 'SELECT ' + aTexto(expresiones(s.slice(1), linea)) };
      if (u === 'DECLARE') {
        const decls = []; let k = 1;
        while (k < s.length) {
          const v = s[k]; if (!v || v.t !== 'var') throw errSintaxis(v, linea);
          k++; if (esPal(s[k], 'AS')) k++;
          let tipo = ''; while (k < s.length && !esOp(s[k], '=', ',')) { if (esOp(s[k], '(')) { const c = cierre(s, k); tipo += s.slice(k, c + 1).map(x => x.v).join(''); k = c + 1; continue; } tipo += s[k].v; k++; }
          let expr = null;
          if (esOp(s[k], '=')) { k++; let p = 0; const ini = k; while (k < s.length) { if (esOp(s[k], '(')) p++; else if (esOp(s[k], ')')) p--; else if (p === 0 && esOp(s[k], ',')) break; k++; } expr = aTexto(expresiones(s.slice(ini, k), linea)); }
          if (/^TABLE/i.test(tipo)) throw new ErrorSQL(50000, 'El simulador no habilita variables de tabla.', { linea, alcance: 'compilacion' });
          decls.push({ nombre: v.val, tipo: tipo.toUpperCase(), expr });
          if (esOp(s[k], ',')) k++;
        }
        return { ...base, tipo: 'DECLARE', decls };
      }
      if (u === 'SET') {
        if (s[1] && s[1].t === 'var') {
          const opIdx = 2;
          if (!esOp(s[opIdx], '=', '+=', '-=', '*=', '/=')) throw errSintaxis(s[opIdx], linea);
          let expr = aTexto(expresiones(s.slice(3), linea));
          if (s[opIdx].v !== '=') expr = `${s[1].v} ${s[opIdx].v[0]} (${expr})`;
          return { ...base, tipo: 'SETVAR', variable: s[1].val, expr };
        }
        const op = s[1] ? s[1].u : '';
        if (op === 'NOCOUNT' || op === 'XACT_ABORT') return { ...base, tipo: 'SETOPC', opcion: op, valor: esPal(s[2], 'ON') };
        if (op === 'IDENTITY_INSERT') { const t = s[2] ? (s[2].val || s[2].v) : ''; return { ...base, tipo: 'PERMISO', err: new ErrorSQL(1088, `Cannot find the object "${t}" because it does not exist or you do not have permissions.`, { nivel: 16, estado: 11, linea }) }; }
        if (['ANSI_NULLS', 'QUOTED_IDENTIFIER', 'ANSI_WARNINGS', 'ANSI_PADDING', 'ARITHABORT', 'DATEFORMAT', 'LANGUAGE', 'TRANSACTION', 'STATISTICS', 'ROWCOUNT', 'DEADLOCK_PRIORITY', 'LOCK_TIMEOUT', 'CONCAT_NULL_YIELDS_NULL', 'DATEFIRST', 'IMPLICIT_TRANSACTIONS', 'SHOWPLAN_ALL', 'SHOWPLAN_TEXT', 'NUMERIC_ROUNDABORT', 'ANSI_NULL_DFLT_ON'].includes(op)) return { ...base, tipo: 'SETOPC', opcion: op };
        throw errSintaxis(s[1], linea);
      }
      if (u === 'EXEC' || u === 'EXECUTE') {
        const p = s[1] ? (s[1].val || s[1].v).toLowerCase().replace(/^dbo\./, '') : '';
        const arg = s[2] ? (s[2].val || s[2].v) : null;
        if (['sp_help', 'sp_columns', 'sp_tables'].includes(p)) return { ...base, tipo: 'SP', proc: p, arg };
        return { ...base, tipo: 'PERMISO', err: new ErrorSQL(2812, `Could not find stored procedure '${s[1] ? (s[1].val || s[1].v) : ''}'.`, { nivel: 16, estado: 62, linea }) };
      }
      if (u === 'CREATE') return permiso('CREATE TABLE');
      if (u === 'DROP') { const t = s.slice(2).find(x => x.t === 'id' || x.t === 'qid'); return permiso('drop', t ? (t.val || t.v) : ''); }
      if (u === 'ALTER') { const t = s[2] ? (s[2].val || s[2].v) : ''; return { ...base, tipo: 'PERMISO', err: new ErrorSQL(4902, `Cannot find the object "${t}" because it does not exist or you do not have permissions.`, { nivel: 16, estado: 1, linea }) }; }
      if (u === 'TRUNCATE') { const t = s[2] ? (s[2].val || s[2].v) : ''; return { ...base, tipo: 'PERMISO', err: new ErrorSQL(1088, `Cannot find the object "${t}" because it does not exist or you do not have permissions.`, { nivel: 16, estado: 7, linea }) }; }
      if (['GRANT', 'REVOKE', 'DENY', 'BACKUP', 'RESTORE', 'DBCC', 'KILL', 'SHUTDOWN', 'BULK'].includes(u)) return { ...base, tipo: 'PERMISO', err: new ErrorSQL(262, `${u} permission denied in database '${bdActual}'.`, { nivel: 14, linea }) };
      if (['IF', 'WHILE', 'RETURN', 'GOTO', 'BREAK', 'CONTINUE', 'WAITFOR', 'RAISERROR', 'THROW', 'MERGE', 'END', 'ELSE', 'CHECKPOINT'].includes(u)) throw new ErrorSQL(50000, `El simulador no habilita ${u}: use SELECT, INSERT, UPDATE, DELETE y transacciones.`, { linea, alcance: 'compilacion' });

      if (u === 'SELECT' || u === 'WITH' || esOp(s[0], '(')) {
        /* SELECT … INTO → crear tablas no está permitido */
        let p = 0;
        for (let k = 0; k < s.length; k++) { if (esOp(s[k], '(')) p++; else if (esOp(s[k], ')')) p--; else if (p === 0 && esPal(s[k], 'INTO')) return { ...base, tipo: 'PERMISO', err: new ErrorSQL(262, `CREATE TABLE permission denied in database '${bdActual}'.`, { nivel: 14, linea }) }; }
        /* SELECT @x = expr (asignación) */
        let iSel = s.findIndex(x => esPal(x, 'SELECT'));
        let k2 = iSel + 1; while (esPal(s[k2], 'DISTINCT', 'ALL')) k2++;
        if (s[k2] && s[k2].t === 'var' && esOp(s[k2 + 1], '=')) {
          const asig = []; let q = 0, actual = [];
          let fFrom = s.length;
          for (let k = k2; k < s.length; k++) { if (esOp(s[k], '(')) q++; else if (esOp(s[k], ')')) q--; else if (q === 0 && esPal(s[k], 'FROM', 'WHERE', 'GROUP', 'ORDER', 'HAVING')) { fFrom = k; break; } }
          q = 0;
          for (let k = k2; k < fFrom; k++) { if (esOp(s[k], '(')) q++; else if (esOp(s[k], ')')) q--; if (q === 0 && esOp(s[k], ',')) { asig.push(actual); actual = []; continue; } actual.push(s[k]); }
          if (actual.length) asig.push(actual);
          const vars = asig.map(a => { if (a[0].t !== 'var' || !esOp(a[1], '=')) throw new ErrorSQL(141, 'A SELECT statement that assigns a value to a variable must not be combined with data-retrieval operations.', { nivel: 15, linea, alcance: 'compilacion' }); return a[0].val; });
          const exprs = asig.map(a => a.slice(2));
          const resto = s.slice(fFrom);
          const nuevo = [s[0], ...exprs.flatMap((e, i) => i ? [{ t: 'op', v: ',' }, ...e] : e), ...resto];
          return { ...base, tipo: 'SELECTVAR', vars, sql: aTexto(expresiones(nuevo, linea)) };
        }
        const ex = expresiones(s, linea);
        analizarSelect(ex, linea);
        return { ...base, tipo: 'SELECT', sql: aTexto(ex) };
      }
      if (u === 'INSERT') {
        const r = traducirInsert(s, linea);
        if (r.err) return { ...base, tipo: 'DML', verbo: 'INSERT', tabla: r.tabla, err: r.err };
        const ex = expresiones(r.s, linea);
        const iSel = ex.findIndex((x, k) => esPal(x, 'SELECT') && k > 2);
        if (iSel > 0) analizarSelect(ex.slice(iSel), linea);
        return { ...base, tipo: 'DML', verbo: 'INSERT', tabla: r.tabla, sql: aTexto(ex), valores: valoresInsert(ex, r.tabla) };
      }
      if (u === 'UPDATE') {
        const ex = expresiones(s, linea);
        const r = traducirUpdate(ex, linea);
        return { ...base, tipo: 'DML', verbo: 'UPDATE', tabla: r.tabla, sql: r.sql || aTexto(r.s) };
      }
      if (u === 'DELETE') {
        const ex = expresiones(s, linea);
        const r = traducirDelete(ex, linea);
        return { ...base, tipo: 'DML', verbo: 'DELETE', tabla: r.tabla, sql: r.sql || aTexto(r.s) };
      }
      throw errSintaxis(s[0], linea);
    }
    return { traducir };
  }

  /* ================================================================ errores de SQLite → mensajes de SQL Server */
  function traducirError(e, inst, ctx, ESQ) {
    if (e instanceof ErrorSQL) return e;
    const m = String(e && e.message || e);
    const linea = inst.linea;
    const bd = ctx.bd;
    const verbo = inst.verbo || 'INSERT';
    const real = (tabla, col) => {
      const t = ESQ.find(x => x.tabla.toLowerCase() === String(tabla).toLowerCase());
      if (!t) return { tabla, col };
      const c = col ? t.cols.find(x => x[0].toLowerCase() === String(col).toLowerCase()) : null;
      return { tabla: t.tabla, col: c ? c[0] : col };
    };
    let x;
    /* valores de la columna en las filas del INSERT … VALUES (para citar el valor como SQL Server) */
    const valoresDe = col => {
      const v = inst.valores; if (!v || !ctx || !ctx._escalar) return [];
      const i = v.cols.findIndex(c => c.toLowerCase() === String(col).toLowerCase()); if (i < 0) return [];
      return v.tuplas.map(tu => { const e = tu[i]; if (!e || /@/.test(e)) return undefined; try { return ctx._escalar('SELECT ' + e); } catch (er) { return undefined; } });
    };
    const lit = v => (typeof v === 'number' ? String(v) : "'" + String(v).replace(/'/g, "''") + "'");
    if ((x = m.match(/FK\|(INSERT|UPDATE|DELETE)\|([^|]+)\|([^|]+)\|([^|]+)\|([^|]+)\|([^|']+)/))) {
      const [, v, nombre, hijo, col, padre, pcol] = x;
      if (v === 'DELETE') return new ErrorSQL(547, `The DELETE statement conflicted with the REFERENCE constraint "${nombre}". The conflict occurred in database "${bd}", table "dbo.${hijo}", column '${col}'.`, { estado: 0, linea, terminada: true });
      return new ErrorSQL(547, `The ${v} statement conflicted with the FOREIGN KEY constraint "${nombre}". The conflict occurred in database "${bd}", table "dbo.${padre}", column '${pcol}'.`, { estado: 0, linea, terminada: true });
    }
    if ((x = m.match(/IDUPD\|([^|]+)\|([^|']+)/))) return new ErrorSQL(8102, `Cannot update identity column '${x[2]}'.`, { linea });
    if ((x = m.match(/CHECK constraint failed: (.+)$/))) {
      const nombre = x[1].trim().replace(/^"|"$/g, '');
      const p = nombre.split('|');
      if (p[0] === 'TIPO') {
        if (p[3] === 'numeric') return new ErrorSQL(8114, 'Error converting data type varchar to numeric.', { linea, alcance: 'lote' });
        const malo = valoresDe(p[2]).find(v => typeof v === 'string' && !/^[+-]?(\d+\.?\d*|\.\d+)$/.test(v.trim()));
        return new ErrorSQL(245, malo !== undefined ? `Conversion failed when converting the varchar value '${malo}' to data type ${p[3]}.` : `Conversion failed when converting the varchar value to data type ${p[3]}.`, { linea, alcance: 'lote' });
      }
      if (p[0] === 'RANGO') return new ErrorSQL(p[3] === 'numeric' ? 8115 : 220, p[3] === 'numeric' ? 'Arithmetic overflow error converting numeric to data type numeric.' : `Arithmetic overflow error for data type ${p[3]}.`, { linea, terminada: true });
      if (p[0] === 'FECHA') return new ErrorSQL(241, 'Conversion failed when converting date and/or time from character string.', { linea, alcance: 'lote' });
      if (p[0] === 'LARGO') {
        const largo = valoresDe(p[2]).find(v => typeof v === 'string' && v.length > +p[3]);
        return new ErrorSQL(2628, `String or binary data would be truncated in table '${bd}.dbo.${p[1]}', column '${p[2]}'.` + (largo !== undefined ? ` Truncated value: '${largo.slice(0, +p[3])}'.` : ''), { linea, terminada: true });
      }
      const t = ESQ.find(tt => tt.cols.some(c => c[2].ck && c[2].ck[0] === nombre));
      const c = t ? t.cols.find(cc => cc[2].ck && cc[2].ck[0] === nombre) : null;
      const deTabla = c && c[2].ck[2] === 'tabla';
      return new ErrorSQL(547, `The ${verbo} statement conflicted with the CHECK constraint "${nombre}". The conflict occurred in database "${bd}", table "dbo.${t ? t.tabla : inst.tabla}"` + (c && !deTabla ? `, column '${c[0]}'.` : '.'), { estado: 0, linea, terminada: true });
    }
    if ((x = m.match(/NOT NULL constraint failed: ([^.]+)\.(\S+)/))) {
      const r = real(x[1], x[2]);
      return new ErrorSQL(515, `Cannot insert the value NULL into column '${r.col}', table '${bd}.dbo.${r.tabla}'; column does not allow nulls. ${verbo === 'UPDATE' ? 'UPDATE' : 'INSERT'} fails.`, { estado: 2, linea, terminada: true });
    }
    if ((x = m.match(/UNIQUE constraint failed: (.+)$/))) {
      const cols = x[1].split(',').map(z => z.trim().split('.'));
      const tabla = real(cols[0][0]).tabla;
      const t = ESQ.find(tt => tt.tabla === tabla);
      const nombresCol = cols.map(z => z[1].toLowerCase());
      /* valor duplicado: la primera fila del INSERT que choca con una existente (o con otra del mismo INSERT) */
      let dup = '';
      try {
        const porCol = nombresCol.map(c => valoresDe(c));
        const n = porCol.length && porCol[0].length;
        const ix0 = t && (t.indices || []).find(i => i.cols.map(c => c.toLowerCase()).join() === nombresCol.join());
        const vistos = new Set();
        for (let j = 0; j < n; j++) {
          const vals = porCol.map(a => a[j]);
          if (vals.some(v => v === undefined || v === null)) continue;
          const clave = JSON.stringify(vals);
          const existe = ctx._escalar(`SELECT COUNT(*) FROM "${tabla}" WHERE ${nombresCol.map((c, i) => `"${c}" = ${lit(vals[i])}`).join(' AND ')}${ix0 ? ' AND (' + ix0.donde + ')' : ''}`);
          if (existe > 0 || vistos.has(clave)) { dup = ` The duplicate key value is (${vals.join(', ')}).`; break; }
          vistos.add(clave);
        }
      } catch (er) { dup = ''; }
      if (t) {
        const ix = (t.indices || []).find(i => i.cols.map(c => c.toLowerCase()).join() === nombresCol.join());
        if (ix) return new ErrorSQL(2601, `Cannot insert duplicate key row in object 'dbo.${t.tabla}' with unique index '${ix.nombre}'.${dup}`, { nivel: 14, linea, terminada: true });
        const c = t.cols.find(cc => cc[0].toLowerCase() === nombresCol[0]);
        if (c && c[2].uq) return new ErrorSQL(2627, `Violation of UNIQUE KEY constraint '${c[2].uq}'. Cannot insert duplicate key in object 'dbo.${t.tabla}'.${dup}`, { nivel: 14, linea, terminada: true });
        if (c && c[2].pk) return new ErrorSQL(2627, `Violation of PRIMARY KEY constraint 'PK_${t.tabla}'. Cannot insert duplicate key in object 'dbo.${t.tabla}'.${dup}`, { nivel: 14, linea, terminada: true });
      }
      return new ErrorSQL(2627, `Violation of UNIQUE KEY constraint. Cannot insert duplicate key in object 'dbo.${tabla}'.`, { nivel: 14, linea, terminada: true });
    }
    if ((x = m.match(/no such table: (?:main\.)?(.+)$/))) return new ErrorSQL(208, `Invalid object name '${x[1].replace(/^"|"$/g, '')}'.`, { linea, alcance: 'diferido' });
    if ((x = m.match(/no such column: (.+)$/))) { const c = x[1].replace(/^"|"$/g, ''); return new ErrorSQL(c.includes('.') ? 4104 : 207, c.includes('.') ? `The multi-part identifier "${c}" could not be bound.` : `Invalid column name '${c}'.`, { linea, alcance: 'compilacion' }); }
    if ((x = m.match(/ambiguous column name: (.+)$/))) return new ErrorSQL(209, `Ambiguous column name '${x[1].replace(/^.*\./, '')}'.`, { linea, alcance: 'compilacion' });
    if ((x = m.match(/table \S+ has (\d+) columns but (\d+) values were supplied/))) return new ErrorSQL(213, 'Column name or number of supplied values does not match table definition.', { linea, alcance: 'compilacion' });
    if ((x = m.match(/(\d+) values for (\d+) columns/))) {
      const v = +x[1], c = +x[2];
      return v < c ? new ErrorSQL(109, 'There are more columns in the INSERT statement than values specified in the VALUES clause. The number of values in the VALUES clause must match the number of columns specified in the INSERT statement.', { nivel: 15, linea, alcance: 'compilacion' })
                   : new ErrorSQL(110, 'There are fewer columns in the INSERT statement than values specified in the VALUES clause. The number of values in the VALUES clause must match the number of columns specified in the INSERT statement.', { nivel: 15, linea, alcance: 'compilacion' });
    }
    if (/misuse of aggregate/.test(m)) return new ErrorSQL(147, 'An aggregate may not appear in the WHERE clause unless it is in a subquery contained in a HAVING clause or a select list, and the column being aggregated is an outer reference.', { nivel: 15, linea, alcance: 'compilacion' });
    if ((x = m.match(/no such function: (\w+)/))) return new ErrorSQL(195, `'${x[1]}' is not a recognized built-in function name.`, { nivel: 15, estado: 10, linea, alcance: 'compilacion' });
    if ((x = m.match(/wrong number of arguments to function (\w+)/))) return new ErrorSQL(174, `The ${x[1].replace(/_T$/, '').toLowerCase()} function requires a different number of arguments.`, { nivel: 15, linea, alcance: 'compilacion' });
    if ((x = m.match(/near "([^"]*)": syntax error/))) {
      const tk = x[1];
      if (/^[A-Za-z_]+$/.test(tk) && PALABRAS.has(tk.toUpperCase())) return new ErrorSQL(156, `Incorrect syntax near the keyword '${tk.toUpperCase()}'.`, { nivel: 15, linea, alcance: 'compilacion' });
      return new ErrorSQL(102, `Incorrect syntax near '${tk.replace(/^"|"$/g, '')}'.`, { nivel: 15, linea, alcance: 'compilacion' });
    }
    if (/incomplete input/.test(m)) return new ErrorSQL(102, `Incorrect syntax near '${(inst.texto.trim().split(/\s+/).pop() || '').slice(-20)}'.`, { nivel: 15, linea, alcance: 'compilacion' });
    if (/unknown database/.test(m)) { const z = m.match(/unknown database (\S+)/); return new ErrorSQL(208, `Invalid object name '${z ? z[1] : ''}'.`, { linea, alcance: 'diferido' }); }
    if (/sub-select returns \d+ columns/.test(m) || /row value misused/.test(m)) return new ErrorSQL(116, 'Only one expression can be specified in the select list when the subquery is not introduced with EXISTS.', { linea, alcance: 'compilacion' });
    if (/interrupted/.test(m)) return new ErrorSQL(3617, 'Query was canceled by user.', { nivel: 11, linea, alcance: 'lote' });
    return new ErrorSQL(50000, `Error del motor del simulador: ${m}`, { linea });
  }

  /* ================================================================ conexión */
  const ALCANCE_LOTE = new Set([241, 242, 245, 8114, 208, 3617]);
  class Conexion {
    constructor(SQL, db, opc) {
      this.SQL = SQL; this.db = db;
      this.bd = opc.bd; this.entorno = opc.entorno; this.usuario = opc.usuario || 'analista';
      this.ESQ = opc.esquema;
      this.dml = opc.dml !== false;
      this.ctx = { reloj: opc.reloj || '2026-10-12 09:00:00' };
      this.trancount = 0; this.filas = 0; this.identidad = null; this.nocount = false; this.xactAbort = false; this.ultimoError = 0;
      this.cambios = 0;                         // filas modificadas en total (para saber si la base cambió)
      this.trad = crearTraductor(this.ESQ, this.bd);
      registrarFunciones(db, this.ctx);
      db.exec('PRAGMA recursive_triggers = OFF; PRAGMA foreign_keys = OFF;');
    }
    set reloj(v) { this.ctx.reloj = v; }
    get reloj() { return this.ctx.reloj; }
    exportar() {
      if (this.trancount) throw new Error('Hay una transacción abierta');
      const b = this.db.export();
      registrarFunciones(this.db, this.ctx);
      this.db.exec('PRAGMA recursive_triggers = OFF; PRAGMA foreign_keys = OFF;');
      return b;
    }
    cerrar() { try { this.db.close(); } catch (e) { /* ya cerrada */ } }

    _valor(v) {
      if (v === null || v === undefined) return 'NULL';
      if (typeof v === 'number') return String(v);
      return "'" + String(v).replace(/'/g, "''") + "'";
    }
    _sustituir(sql, vars, declaradas) {
      if (!/@/.test(sql)) return sql;
      return tokenizar(sql).map(tk => {
        if (tk.t !== 'var') return tk.v;
        if (tk.val.startsWith('@@')) {
          const sis = { '@@rowcount': this.filas, '@@trancount': this.trancount, '@@identity': this.identidad, '@@scope_identity': this.identidadLote, '@@error': this.ultimoError };
          return tk.val in sis ? this._valor(sis[tk.val] === undefined ? null : sis[tk.val]) : tk.v;
        }
        if (!declaradas.has(tk.val)) throw new ErrorSQL(137, `Must declare the scalar variable "${tk.v}".`, { nivel: 15, estado: 2, alcance: 'compilacion' });
        return vars.has(tk.val) ? this._valor(vars.get(tk.val)) : 'NULL';
      }).join('');
    }
    _escalar(sql) {
      const st = this.db.prepare(sql);
      try { return st.step() ? st.get()[0] : null; } finally { st.free(); }
    }
    _consulta(sql, max) {
      const st = this.db.prepare(sql);
      try {
        const cols = st.getColumnNames();
        const filas = []; let total = 0;
        while (st.step()) { total++; if (filas.length < max) filas.push(st.get()); if (total >= 200000) break; }
        return { cols, filas, total };
      } finally { st.free(); }
    }
    _tipoVar(tipo, v) {
      if (v === null || v === undefined) return null;
      const t = tipo.replace(/\(.*/, '');
      if (!t) return v;
      try { return convertir(tipo, v); } catch (e) { throw e; }
    }

    /* Ejecuta un texto con uno o más lotes. Devuelve eventos en orden (resultados y mensajes). */
    ejecutar(texto, opc = {}) {
      const eventos = []; this.tran = [];
      const msg = (txt, error, num, nivel, estado, linea) => eventos.push({ tipo: 'mensaje', texto: txt, error: !!error, num, nivel, estado, linea });
      const maxFilas = opc.maxFilas || 1000;
      let toks;
      try { toks = tokenizar(texto); } catch (e) { const er = e instanceof ErrorSQL ? e : traducirError(e, { linea: 1, texto }, this, this.ESQ); this._error(msg, er); return this._fin(eventos); }
      const ls = lotes(toks);
      if (!ls.length) return this._fin(eventos);
      for (const lote of ls) {
        const vars = new Map(), declaradas = new Set();
        this.identidadLote = null;                  /* SCOPE_IDENTITY() vale dentro del lote */
        let insts;
        try { insts = dividir(lote); } catch (e) { this._error(msg, e); continue; }
        /* compilación: traducir y preparar todo el lote antes de ejecutar (como SQL Server) */
        const plan = [];
        let errorCompilacion = null;
        const declPrevias = new Set();
        for (const it of insts) {
          let tr;
          try {
            tr = this.trad.traducir(it, { usuario: this.usuario, filas: this.filas, trancount: this.trancount, identidad: this.identidad, ultimoError: this.ultimoError });
            if (tr.tipo === 'DECLARE') tr.decls.forEach(d => { if (declPrevias.has(d.nombre)) throw new ErrorSQL(134, `The variable name '${d.nombre}' has already been declared. Variable names must be unique within a query batch or stored procedure.`, { nivel: 15, linea: tr.linea, alcance: 'compilacion' }); declPrevias.add(d.nombre); });
            const sqlComp = tr.sql;
            if (sqlComp && !tr.err) {
              const prueba = this._sustituir(sqlComp, new Map(), declPrevias);
              try { this.db.prepare(prueba).free(); }
              catch (e) {
                const er = traducirError(e, tr, this, this.ESQ);
                if (er.alcance === 'diferido') tr.errDiferido = er; else throw er;
              }
            }
            if (tr.tipo === 'SETVAR' && !declPrevias.has(tr.variable)) throw new ErrorSQL(137, `Must declare the scalar variable "${tr.variable}".`, { nivel: 15, estado: 2, linea: tr.linea, alcance: 'compilacion' });
            if (tr.tipo === 'SELECTVAR') tr.vars.forEach(v => { if (!declPrevias.has(v)) throw new ErrorSQL(137, `Must declare the scalar variable "${v}".`, { nivel: 15, estado: 2, linea: tr.linea, alcance: 'compilacion' }); });
          } catch (e) {
            errorCompilacion = e instanceof ErrorSQL ? e : traducirError(e, { linea: it.find(sig).linea, texto: '' }, this, this.ESQ);
            break;
          }
          plan.push(tr);
        }
        if (errorCompilacion) { this._error(msg, errorCompilacion); continue; }
        /* ejecución */
        for (const tr of plan) {
          try {
            if (tr.err) throw tr.err;
            if (tr.errDiferido) throw tr.errDiferido;
            const r = this._instruccion(tr, vars, declaradas, msg, eventos, maxFilas);
            if (r === 'fin') break;
          } catch (e) {
            const er = e instanceof ErrorSQL ? e : traducirError(e, tr, this, this.ESQ);
            if (!er.linea || er.linea === 1) er.linea = tr.linea;
            this._error(msg, er);
            this.ultimoError = er.num;
            if (this.xactAbort && this.trancount > 0) { this.db.exec('ROLLBACK'); this.trancount = 0; this.cambios++; this.tran.push('ROLLBACK'); break; }
            if (er.alcance === 'lote' || er.alcance === 'diferido' || ALCANCE_LOTE.has(er.num) || er.alcance === 'compilacion') break;
          }
        }
      }
      return this._fin(eventos);
    }
    _error(msg, e) {
      const num = e.num || 50000;
      msg(`Msg ${num}, Level ${e.nivel ?? 16}, State ${e.estado ?? 1}, Line ${e.linea || 1}\n${e.message}` + (e.terminada ? '\nThe statement has been terminated.' : ''), true, num, e.nivel, e.estado, e.linea);
    }
    _fin(eventos) {
      return { eventos, trancount: this.trancount, cambios: this.cambios, identidad: this.identidad, tran: this.tran };
    }
    _instruccion(tr, vars, declaradas, msg, eventos, maxFilas) {
      const afect = n => { if (!this.nocount) msg(`(${n} ${n === 1 ? 'row' : 'rows'} affected)`); };
      switch (tr.tipo) {
        case 'BEGIN':
          if (this.trancount === 0) { this.db.exec('BEGIN'); this.tran.push('BEGIN'); }
          this.trancount++; this.filas = 0; return;
        case 'COMMIT':
          if (this.trancount === 0) throw new ErrorSQL(3902, 'The COMMIT TRANSACTION request has no corresponding BEGIN TRANSACTION.', { linea: tr.linea });
          this.trancount--; if (this.trancount === 0) { this.db.exec('COMMIT'); this.tran.push('COMMIT'); }
          this.filas = 0; return;
        case 'ROLLBACK':
          if (this.trancount === 0) throw new ErrorSQL(3903, 'The ROLLBACK TRANSACTION request has no corresponding BEGIN TRANSACTION.', { linea: tr.linea });
          this.db.exec('ROLLBACK'); this.trancount = 0; this.filas = 0; this.cambios++; this.tran.push('ROLLBACK'); return;
        case 'USE':
          if (tr.bd.toLowerCase() === this.bd.toLowerCase()) { msg(`Changed database context to '${this.bd}'.`); return; }
          if (/^kintibus_(test|prod)$/i.test(tr.bd)) throw new ErrorSQL(916, `The server principal "${this.usuario}" is not able to access the database "${tr.bd}" under the current security context.`, { nivel: 14, estado: 2, linea: tr.linea });
          throw new ErrorSQL(911, `Database '${tr.bd}' does not exist. Make sure that the name is entered correctly.`, { nivel: 16, estado: 1, linea: tr.linea });
        case 'SETOPC':
          if (tr.opcion === 'NOCOUNT') this.nocount = tr.valor;
          if (tr.opcion === 'XACT_ABORT') this.xactAbort = tr.valor;
          return;
        case 'PRINT': {
          const v = this._escalar(this._sustituir(tr.sql, vars, declaradas));
          msg(v === null ? '' : String(v)); return;
        }
        case 'DECLARE':
          for (const d of tr.decls) {
            declaradas.add(d.nombre);
            vars.set(d.nombre, d.expr ? this._tipoVar(d.tipo, this._escalar('SELECT ' + this._sustituir(d.expr, vars, declaradas))) : null);
            d.tipoDecl = d.tipo;
          }
          tr.decls.forEach(d => { vars.set(d.nombre + ':tipo', d.tipo); });
          return;
        case 'SETVAR': {
          const v = this._escalar('SELECT ' + this._sustituir(tr.expr, vars, declaradas));
          vars.set(tr.variable, this._tipoVar(vars.get(tr.variable + ':tipo') || '', v)); return;
        }
        case 'SELECTVAR': {
          const r = this._consulta(this._sustituir(tr.sql, vars, declaradas), 1e9);
          if (r.filas.length) { const f = r.filas[r.filas.length - 1]; tr.vars.forEach((v, i) => vars.set(v, this._tipoVar(vars.get(v + ':tipo') || '', f[i]))); }
          this.filas = r.total; afect(r.total); return;
        }
        case 'SP': return this._sp(tr, eventos, afect);
        case 'PERMISO': throw tr.err;
        case 'SELECT': {
          const r = this._consulta(this._sustituir(tr.sql, vars, declaradas), maxFilas);
          eventos.push({ tipo: 'resultado', cols: r.cols, filas: r.filas, total: r.total, linea: tr.linea });
          this.filas = r.total; afect(r.total); return;
        }
        case 'DML': {
          if (!this.dml) {
            throw new ErrorSQL(229, `The ${tr.verbo} permission was denied on the object '${tr.tabla}', database '${this.bd}', schema 'dbo'.`, { nivel: 14, estado: 5, linea: tr.linea });
          }
          const sql = this._sustituir(tr.sql, vars, declaradas);
          this.db.run(sql);
          const n = this.db.getRowsModified();
          this.filas = n; this.cambios += n;
          if (tr.verbo === 'INSERT' && n > 0) {
            const t = this.ESQ.find(x => x.tabla.toLowerCase() === String(tr.tabla).toLowerCase());
            if (t && t.cols.some(c => c[2].id)) this.identidad = this.identidadLote = this._escalar('SELECT last_insert_rowid()');
          }
          afect(n); return;
        }
        default: return;
      }
    }
    _sp(tr, eventos, afect) {
      if (tr.proc === 'sp_tables' || !tr.arg) {
        const filas = this.ESQ.map(t => [this.bd, 'dbo', t.tabla, 'TABLE', null]);
        eventos.push({ tipo: 'resultado', cols: ['TABLE_QUALIFIER', 'TABLE_OWNER', 'TABLE_NAME', 'TABLE_TYPE', 'REMARKS'], filas, total: filas.length, linea: tr.linea });
        afect(filas.length); return;
      }
      const t = this.ESQ.find(x => x.tabla.toLowerCase() === String(tr.arg).replace(/^dbo\./i, '').toLowerCase());
      if (!t) throw new ErrorSQL(15009, `The object '${tr.arg}' does not exist in database '${this.bd}' or is invalid for this operation.`, { estado: 1, linea: tr.linea });
      const filas = t.cols.map(([c, tipo, o]) => {
        const base = tipo.replace(/\(.*/, '').toLowerCase();
        const l = (tipo.match(/\((\d+)\)/) || [])[1];
        const pr = tipo.match(/\((\d+),(\d+)\)/);
        return [c, base, 'no', l ? String(/^n/.test(base) ? +l * 2 : +l) : base === 'int' ? '4' : base === 'smallint' ? '2' : base === 'tinyint' || base === 'bit' ? '1' : base === 'datetime' ? '8' : base === 'date' ? '3' : '5',
                pr ? pr[1] : '', pr ? pr[2] : '', o.nn || o.pk ? 'no' : 'yes', o.id ? 'IDENTITY' : o.pk ? 'PRIMARY KEY' : o.fk ? `FK → ${o.fk[0]}` : ''];
      });
      eventos.push({ tipo: 'resultado', cols: ['Column_name', 'Type', 'Computed', 'Length', 'Prec', 'Scale', 'Nullable', 'Clave'], filas, total: filas.length, linea: tr.linea });
      afect(filas.length);
    }
  }

  /* ================================================================ estado y comparación */
  function volcar(db, ESQ) {
    const r = {};
    for (const t of ESQ) {
      const pk = t.cols.find(c => c[2].pk)[0];
      const st = db.prepare(`SELECT * FROM "${t.tabla}" ORDER BY "${pk}"`);
      const filas = [];
      while (st.step()) filas.push(st.get());
      st.free();
      r[t.tabla] = filas;
    }
    return r;
  }
  const norm = v => (v === null || v === undefined ? null : typeof v === 'number' ? Math.round(v * 10000) / 10000 : String(v));
  /* Forma canónica: filas que ya existían se identifican por su PK; las nuevas, por su contenido
     (sin la PK y con las FK hacia filas nuevas reemplazadas por el contenido de la fila referida). */
  function canonica(estado, inicio, ESQ) {
    const res = {}; const firmaNueva = {};
    for (const t of ESQ) {
      const iPk = t.cols.findIndex(c => c[2].pk);
      const ids0 = new Set(inicio[t.tabla].map(f => f[iPk]));
      const fks = t.cols.map((c, i) => c[2].fk ? { i, tabla: c[2].fk[0] } : null).filter(Boolean);
      const firma = f => {
        const v = f.map(norm);
        for (const fk of fks) {
          const ref = firmaNueva[fk.tabla] && firmaNueva[fk.tabla].get(f[fk.i]);
          if (ref !== undefined) v[fk.i] = 'NUEVA:' + ref;
        }
        return v;
      };
      const exist = new Map(), nuevas = [];
      firmaNueva[t.tabla] = new Map();
      for (const f of estado[t.tabla]) {
        const id = f[iPk];
        if (ids0.has(id)) exist.set(id, JSON.stringify(firma(f)));
        else {
          const v = firma(f); v[iPk] = '*';
          const s = JSON.stringify(v);
          nuevas.push(s); firmaNueva[t.tabla].set(id, s);
        }
      }
      nuevas.sort();
      res[t.tabla] = { exist, nuevas, ids0, iPk };
    }
    return res;
  }
  /* Compara el estado del analista con el esperado (ambos desde el mismo inicio). */
  function comparar(inicio, actual, esperado, ESQ) {
    const A = canonica(actual, inicio, ESQ), E = canonica(esperado, inicio, ESQ), I = canonica(inicio, inicio, ESQ);
    const tablas = [];
    let ok = true;
    for (const t of ESQ) {
      const a = A[t.tabla], e = E[t.tabla], i = I[t.tabla];
      const resumen = x => {
        let borradas = 0, cambiadas = 0;
        for (const [id, f] of i.exist) { if (!x.exist.has(id)) borradas++; else if (x.exist.get(id) !== f) cambiadas++; }
        return { nuevas: x.nuevas.length, borradas, cambiadas };
      };
      const ra = resumen(a), re = resumen(e);
      /* diferencias concretas */
      const dif = [];
      for (const [id, f] of e.exist) { if (!a.exist.has(id)) dif.push({ id, tipo: 'falta', esperado: JSON.parse(f) }); else if (a.exist.get(id) !== f) dif.push({ id, tipo: 'distinta', esperado: JSON.parse(f), actual: JSON.parse(a.exist.get(id)) }); }
      for (const [id, f] of a.exist) if (!e.exist.has(id)) dif.push({ id, tipo: 'sobra', actual: JSON.parse(f) });
      const cuenta = arr => arr.reduce((m, s) => m.set(s, (m.get(s) || 0) + 1), new Map());
      const ca = cuenta(a.nuevas), ce = cuenta(e.nuevas);
      for (const [s, n] of ce) { const k = ca.get(s) || 0; for (let j = k; j < n; j++) dif.push({ tipo: 'nueva-falta', esperado: JSON.parse(s) }); }
      for (const [s, n] of ca) { const k = ce.get(s) || 0; for (let j = k; j < n; j++) dif.push({ tipo: 'nueva-sobra', actual: JSON.parse(s) }); }
      if (dif.length) ok = false;
      tablas.push({ tabla: t.tabla, cols: t.cols.map(c => c[0]), analista: ra, esperado: re, dif: dif.slice(0, 12), totalDif: dif.length });
    }
    return { ok, tablas };
  }
  /* Texto canónico del estado respecto del inicio: dos estados dan el mismo texto si y solo si comparar() los da por iguales.
     Su huella SHA-256 es lo único que se usa para validar un cambio (la solución no viaja en la página). */
  function firma(inicio, estado, ESQ) {
    const C = canonica(estado, inicio, ESQ);
    return JSON.stringify(ESQ.map(t => [t.tabla, [...C[t.tabla].exist], C[t.tabla].nuevas]));
  }

  /* crea una base nueva con el esquema y los datos de Datos.generar() */
  function crearBase(SQL, Datos, filas, bd) {
    const db = new SQL.Database();
    const ctx = { reloj: '2026-10-12 09:00:00' };
    registrarFunciones(db, ctx);
    db.exec('PRAGMA foreign_keys = OFF;');
    db.exec(Datos.ddlSQLite());
    db.exec('BEGIN;' + Datos.insertsSQLite(filas) + 'COMMIT;');
    db.exec(Datos.ddlDisparadores());
    db.exec(Datos.ddlMetadatos(bd));
    return db;
  }

  return { tokenizar, lotes, dividir, crearTraductor, Conexion, ErrorSQL, traducirError, registrarFunciones, volcar, comparar, firma, crearBase, convertir, redondear, aFecha, txtFecha };
});
