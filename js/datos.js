/* Kinti Bus · esquema de la base y carga de sus filas (generado por fuente/construir.js; no editar a mano). */
(function (raiz, fabrica) {
  const m = fabrica();
  if (typeof module === 'object' && module.exports) module.exports = m; else raiz.Datos = m;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ------------------------------------------------------------------ esquema
     [columna, tipo, opciones, descripción]
     opciones: pk, id (IDENTITY), nn (NOT NULL), uq (nombre de la restricción UNIQUE),
               fk [tabla, columna, nombre], ck [nombre, expresión], def (valor por defecto) */
  const ESQUEMA = [
    { tabla: 'Terminales', desc: 'Terminales terrestres donde Kinti Bus vende boletos y salen sus buses.',
      cols: [
        ['TerminalID', 'INT', { pk: 1, id: 1 }, 'Identificador de la terminal (lo asigna SQL Server).'],
        ['Nombre', 'NVARCHAR(60)', { nn: 1, uq: 'UQ_Terminales_Nombre' }, 'Nombre de la terminal.'],
        ['Ciudad', 'NVARCHAR(40)', { nn: 1 }, 'Ciudad.'],
        ['Provincia', 'NVARCHAR(40)', { nn: 1 }, 'Provincia.']] },
    { tabla: 'Rutas', desc: 'Rutas interprovinciales: origen, destino y precio base del boleto.',
      cols: [
        ['RutaID', 'INT', { pk: 1, id: 1 }, 'Identificador de la ruta.'],
        ['Codigo', 'VARCHAR(10)', { nn: 1, uq: 'UQ_Rutas_Codigo' }, 'Código comercial, por ejemplo QUI-GYE.'],
        ['OrigenID', 'INT', { nn: 1, fk: ['Terminales', 'TerminalID', 'FK_Rutas_Origen'] }, 'Terminal de salida.'],
        ['DestinoID', 'INT', { nn: 1, fk: ['Terminales', 'TerminalID', 'FK_Rutas_Destino'] }, 'Terminal de llegada.'],
        ['DistanciaKm', 'SMALLINT', { nn: 1 }, 'Distancia en kilómetros.'],
        ['DuracionMin', 'SMALLINT', { nn: 1 }, 'Duración estimada en minutos.'],
        ['PrecioBase', 'DECIMAL(6,2)', { nn: 1, ck: ['CK_Rutas_PrecioBase', 'PrecioBase > 0'] }, 'Precio del boleto en dólares, sin descuentos.'],
        ['Activa', 'BIT', { nn: 1, def: '1' }, '1 = la ruta opera; 0 = suspendida.']] },
    { tabla: 'Buses', desc: 'Flota de buses de la cooperativa.',
      cols: [
        ['BusID', 'INT', { pk: 1, id: 1 }, 'Identificador del bus.'],
        ['Placa', 'VARCHAR(8)', { nn: 1, uq: 'UQ_Buses_Placa' }, 'Placa, por ejemplo PBA-1823.'],
        ['Disco', 'SMALLINT', { nn: 1, uq: 'UQ_Buses_Disco' }, 'Número de disco (número interno del bus).'],
        ['Marca', 'NVARCHAR(30)', { nn: 1 }, 'Marca del chasis.'],
        ['Modelo', 'NVARCHAR(30)', { nn: 1 }, 'Modelo.'],
        ['Anio', 'SMALLINT', { nn: 1, ck: ['CK_Buses_Anio', 'Anio BETWEEN 2000 AND 2027'] }, 'Año de fabricación.'],
        ['Capacidad', 'TINYINT', { nn: 1, ck: ['CK_Buses_Capacidad', 'Capacidad BETWEEN 20 AND 60'] }, 'Número de asientos.'],
        ['Estado', 'VARCHAR(15)', { nn: 1, def: "'ACTIVO'", ck: ['CK_Buses_Estado', "Estado IN ('ACTIVO','MANTENIMIENTO','BAJA')"] }, 'ACTIVO, MANTENIMIENTO o BAJA.']] },
    { tabla: 'Conductores', desc: 'Conductores profesionales de la cooperativa.',
      cols: [
        ['ConductorID', 'INT', { pk: 1, id: 1 }, 'Identificador del conductor.'],
        ['Cedula', 'VARCHAR(10)', { nn: 1, uq: 'UQ_Conductores_Cedula' }, 'Cédula de identidad.'],
        ['Nombres', 'NVARCHAR(40)', { nn: 1 }, 'Nombres.'],
        ['Apellidos', 'NVARCHAR(40)', { nn: 1 }, 'Apellidos.'],
        ['Licencia', 'CHAR(1)', { nn: 1, ck: ['CK_Conductores_Licencia', "Licencia IN ('D','E')"] }, 'Tipo de licencia profesional: D o E.'],
        ['LicenciaVence', 'DATE', { nn: 1 }, 'Fecha en que vence la licencia.'],
        ['Activo', 'BIT', { nn: 1, def: '1' }, '1 = trabaja en la cooperativa.']] },
    { tabla: 'Clientes', desc: 'Pasajeros registrados. En TEST los correos y teléfonos están enmascarados.',
      cols: [
        ['ClienteID', 'INT', { pk: 1, id: 1 }, 'Identificador del cliente.'],
        ['Cedula', 'VARCHAR(10)', { nn: 1, uq: 'UQ_Clientes_Cedula' }, 'Cédula de identidad.'],
        ['Nombres', 'NVARCHAR(40)', { nn: 1 }, 'Nombres.'],
        ['Apellidos', 'NVARCHAR(40)', { nn: 1 }, 'Apellidos.'],
        ['Email', 'NVARCHAR(80)', {}, 'Correo electrónico (puede estar vacío).'],
        ['Telefono', 'VARCHAR(10)', {}, 'Celular (puede estar vacío).'],
        ['FechaNacimiento', 'DATE', {}, 'Fecha de nacimiento.'],
        ['Tarifa', 'VARCHAR(15)', { nn: 1, def: "'GENERAL'", ck: ['CK_Clientes_Tarifa', "Tarifa IN ('GENERAL','TERCERA EDAD','DISCAPACIDAD','MENOR')"] }, 'Tarifa que le corresponde: GENERAL, TERCERA EDAD, DISCAPACIDAD o MENOR.'],
        ['FechaRegistro', 'DATETIME', { nn: 1 }, 'Fecha y hora en que se registró.']] },
    { tabla: 'Viajes', desc: 'Salidas programadas: una ruta, un bus, un conductor y una hora de salida.',
      cols: [
        ['ViajeID', 'INT', { pk: 1, id: 1 }, 'Identificador del viaje.'],
        ['RutaID', 'INT', { nn: 1, fk: ['Rutas', 'RutaID', 'FK_Viajes_Rutas'] }, 'Ruta del viaje.'],
        ['BusID', 'INT', { nn: 1, fk: ['Buses', 'BusID', 'FK_Viajes_Buses'] }, 'Bus asignado.'],
        ['ConductorID', 'INT', { nn: 1, fk: ['Conductores', 'ConductorID', 'FK_Viajes_Conductores'] }, 'Conductor asignado.'],
        ['Salida', 'DATETIME', { nn: 1 }, 'Fecha y hora de salida.'],
        ['Estado', 'VARCHAR(12)', { nn: 1, def: "'PROGRAMADO'", ck: ['CK_Viajes_Estado', "Estado IN ('PROGRAMADO','EN RUTA','FINALIZADO','CANCELADO')"] }, 'PROGRAMADO, EN RUTA, FINALIZADO o CANCELADO.']] },
    { tabla: 'Boletos', desc: 'Boletos vendidos: un asiento de un viaje para un cliente.',
      cols: [
        ['BoletoID', 'INT', { pk: 1, id: 1 }, 'Identificador del boleto (lo asigna SQL Server).'],
        ['Codigo', 'VARCHAR(10)', { nn: 1, uq: 'UQ_Boletos_Codigo' }, 'Código impreso en el boleto, por ejemplo KB-004512.'],
        ['ViajeID', 'INT', { nn: 1, fk: ['Viajes', 'ViajeID', 'FK_Boletos_Viajes'] }, 'Viaje.'],
        ['ClienteID', 'INT', { nn: 1, fk: ['Clientes', 'ClienteID', 'FK_Boletos_Clientes'] }, 'Pasajero.'],
        ['Asiento', 'TINYINT', { nn: 1, ck: ['CK_Boletos_Asiento', 'Asiento BETWEEN 1 AND 60'] }, 'Número de asiento.'],
        ['Precio', 'DECIMAL(6,2)', { nn: 1, ck: ['CK_Boletos_Precio', 'Precio >= 0'] }, 'Precio del boleto.'],
        ['Descuento', 'DECIMAL(6,2)', { nn: 1, def: '0', ck: ['CK_Boletos_Descuento', 'Descuento >= 0 AND Descuento <= Precio', 'tabla'] }, 'Descuento aplicado en dólares.'],
        ['Canal', 'VARCHAR(10)', { nn: 1, ck: ['CK_Boletos_Canal', "Canal IN ('TAQUILLA','WEB','APP')"] }, 'TAQUILLA, WEB o APP.'],
        ['FechaVenta', 'DATETIME', { nn: 1 }, 'Fecha y hora de la venta.'],
        ['Estado', 'VARCHAR(12)', { nn: 1, def: "'VENDIDO'", ck: ['CK_Boletos_Estado', "Estado IN ('VENDIDO','USADO','ANULADO','REEMBOLSADO')"] }, 'VENDIDO, USADO, ANULADO o REEMBOLSADO.']],
      indices: [{ nombre: 'UX_Boletos_ViajeAsiento', cols: ['ViajeID', 'Asiento'], donde: "Estado IN ('VENDIDO','USADO')",
                  desc: 'Un asiento no se puede vender dos veces en el mismo viaje.' }] },
    { tabla: 'Pagos', desc: 'Pagos y devoluciones de cada boleto.',
      cols: [
        ['PagoID', 'INT', { pk: 1, id: 1 }, 'Identificador del pago.'],
        ['BoletoID', 'INT', { nn: 1, fk: ['Boletos', 'BoletoID', 'FK_Pagos_Boletos'] }, 'Boleto pagado.'],
        ['Monto', 'DECIMAL(6,2)', { nn: 1, ck: ['CK_Pagos_Monto', 'Monto >= 0'] }, 'Valor pagado en dólares.'],
        ['Metodo', 'VARCHAR(15)', { nn: 1, ck: ['CK_Pagos_Metodo', "Metodo IN ('EFECTIVO','TARJETA','TRANSFERENCIA')"] }, 'EFECTIVO, TARJETA o TRANSFERENCIA.'],
        ['FechaPago', 'DATETIME', { nn: 1 }, 'Fecha y hora del pago.'],
        ['Estado', 'VARCHAR(10)', { nn: 1, ck: ['CK_Pagos_Estado', "Estado IN ('APROBADO','RECHAZADO','DEVUELTO')"] }, 'APROBADO, RECHAZADO o DEVUELTO.'],
        ['Referencia', 'VARCHAR(20)', {}, 'Código de autorización o de transferencia.']] },
  ];

  const tablaDe = {};
  ESQUEMA.forEach(t => { tablaDe[t.tabla.toLowerCase()] = t; });

  function tipoBase(tipo) { return tipo.replace(/\(.*/, '').toUpperCase(); }
  function largo(tipo) { const m = tipo.match(/\((\d+)\)/); return m ? +m[1] : null; }
  const ENTEROS = { INT: 'int', SMALLINT: 'smallint', TINYINT: 'tinyint', BIT: 'bit' };
  const RANGOS = { TINYINT: [0, 255], SMALLINT: [-32768, 32767], INT: [-2147483648, 2147483647] };

  /* DDL de SQLite que imita las reglas de SQL Server (las comprobaciones llevan nombres para traducir el error) */
  function ddlSQLite() {
    const sql = [];
    for (const t of ESQUEMA) {
      const defs = [];
      for (const [c, tipo, o] of t.cols) {
        const b = tipoBase(tipo);
        let d = `"${c}" `;
        if (o.id) { defs.push(`"${c}" INTEGER PRIMARY KEY AUTOINCREMENT`); continue; }
        if (ENTEROS[b]) d += 'INTEGER';
        else if (b === 'DECIMAL') d += 'REAL';
        else if (b === 'DATE' || b === 'DATETIME') d += 'TEXT';
        else d += 'TEXT COLLATE NOCASE';
        if (o.nn) d += ' NOT NULL';
        if (o.def !== undefined) d += ` DEFAULT ${o.def}`;
        if (o.uq) d += ` CONSTRAINT "${o.uq}" UNIQUE`;
        if (o.ck) d += ` CONSTRAINT "${o.ck[0]}" CHECK (${o.ck[1]})`;
        if (ENTEROS[b]) {
          d += ` CONSTRAINT "TIPO|${t.tabla}|${c}|${ENTEROS[b]}" CHECK (typeof("${c}") IN ('integer','real','null'))`;
          if (RANGOS[b]) d += ` CONSTRAINT "RANGO|${t.tabla}|${c}|${ENTEROS[b]}" CHECK ("${c}" IS NULL OR "${c}" BETWEEN ${RANGOS[b][0]} AND ${RANGOS[b][1]})`;
        } else if (b === 'DECIMAL') {
          d += ` CONSTRAINT "TIPO|${t.tabla}|${c}|numeric" CHECK (typeof("${c}") IN ('integer','real','null'))`;
          d += ` CONSTRAINT "RANGO|${t.tabla}|${c}|numeric" CHECK ("${c}" IS NULL OR abs("${c}") < 10000)`;
        } else if (b === 'DATE' || b === 'DATETIME') {
          d += ` CONSTRAINT "FECHA|${t.tabla}|${c}|${b.toLowerCase()}" CHECK ("${c}" IS NULL OR datetime("${c}") IS NOT NULL)`;
        } else if (largo(tipo)) {
          d += ` CONSTRAINT "LARGO|${t.tabla}|${c}|${largo(tipo)}" CHECK ("${c}" IS NULL OR length("${c}") <= ${largo(tipo)})`;
        }
        defs.push(d);
      }
      sql.push(`CREATE TABLE "${t.tabla}" (\n  ${defs.join(',\n  ')}\n);`);
    }
    return sql.join('\n');
  }

  /* Disparadores: claves foráneas con el nombre de SQL Server, columnas IDENTITY y tipos normalizados
     (DECIMAL redondeado a 2, fechas en formato canónico, BIT en 0/1). Se crean después de cargar los datos. */
  function ddlDisparadores() {
    const sql = [];
    for (const t of ESQUEMA) {
      const pk = t.cols.find(c => c[2].pk)[0];
      for (const [c, , o] of t.cols) {
        if (!o.fk) continue;
        const [pt, pc, nombre] = o.fk;
        const datos = `${nombre}|${t.tabla}|${c}|${pt}|${pc}`;
        sql.push(`CREATE TRIGGER "fk_i_${nombre}" BEFORE INSERT ON "${t.tabla}" WHEN NEW."${c}" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "${pt}" WHERE "${pc}" = NEW."${c}") BEGIN SELECT RAISE(ABORT, 'FK|INSERT|${datos}'); END;`);
        sql.push(`CREATE TRIGGER "fk_u_${nombre}" BEFORE UPDATE OF "${c}" ON "${t.tabla}" WHEN NEW."${c}" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM "${pt}" WHERE "${pc}" = NEW."${c}") BEGIN SELECT RAISE(ABORT, 'FK|UPDATE|${datos}'); END;`);
        sql.push(`CREATE TRIGGER "fk_d_${nombre}" BEFORE DELETE ON "${pt}" WHEN EXISTS (SELECT 1 FROM "${t.tabla}" WHERE "${c}" = OLD."${pc}") BEGIN SELECT RAISE(ABORT, 'FK|DELETE|${datos}'); END;`);
      }
      sql.push(`CREATE TRIGGER "id_u_${t.tabla}" BEFORE UPDATE OF "${pk}" ON "${t.tabla}" WHEN NEW."${pk}" IS NOT OLD."${pk}" BEGIN SELECT RAISE(ABORT, 'IDUPD|${t.tabla}|${pk}'); END;`);
      const arreglos = [];
      for (const [c, tipo] of t.cols) {
        const b = tipoBase(tipo);
        if (b === 'DECIMAL') arreglos.push([c, `DEC2("${c}")`]);
        else if (b === 'DATETIME') arreglos.push([c, `datetime("${c}")`]);
        else if (b === 'DATE') arreglos.push([c, `date("${c}")`]);
        else if (b === 'BIT') arreglos.push([c, `(CASE WHEN "${c}" IS NULL THEN NULL WHEN "${c}" <> 0 THEN 1 ELSE 0 END)`]);
        else if (ENTEROS[b] && c !== pk) arreglos.push([c, `CAST("${c}" AS INTEGER)`]);
      }
      if (arreglos.length) {
        const set = arreglos.map(([c, e]) => `"${c}" = ${e}`).join(', ');
        const cond = arreglos.map(([c, e]) => `"${c}" IS NOT ${e}`).join(' OR ');
        for (const [ev, nom] of [['INSERT', 'i'], ['UPDATE', 'u']]) {
          sql.push(`CREATE TRIGGER "norm_${nom}_${t.tabla}" AFTER ${ev} ON "${t.tabla}" BEGIN UPDATE "${t.tabla}" SET ${set} WHERE "${pk}" = NEW."${pk}" AND (${cond}); END;`);
        }
      }
      for (const ix of t.indices || []) {
        sql.push(`CREATE UNIQUE INDEX "${ix.nombre}" ON "${t.tabla}" (${ix.cols.map(c => `"${c}"`).join(', ')}) WHERE ${ix.donde};`);
      }
    }
    return sql.join('\n');
  }

  /* Tablas de metadatos para INFORMATION_SCHEMA (de solo lectura, no cuentan en la validación) */
  function ddlMetadatos(bd) {
    const filasT = [], filasC = [];
    for (const t of ESQUEMA) {
      filasT.push(`('${bd}','dbo','${t.tabla}','BASE TABLE')`);
      t.cols.forEach(([c, tipo, o], i) => {
        const b = tipoBase(tipo).toLowerCase();
        const l = largo(tipo);
        const prec = tipo.match(/\((\d+),(\d+)\)/);
        filasC.push(`('${bd}','dbo','${t.tabla}','${c}',${i + 1},${o.def !== undefined ? `'${String(o.def).replace(/'/g, "''")}'` : 'NULL'},'${o.nn || o.pk ? 'NO' : 'YES'}','${b}',${l && !prec ? l : 'NULL'},${prec ? prec[1] : 'NULL'},${prec ? prec[2] : 'NULL'})`);
      });
    }
    return `CREATE TABLE "INFORMATION_SCHEMA_TABLES" (TABLE_CATALOG TEXT, TABLE_SCHEMA TEXT, TABLE_NAME TEXT COLLATE NOCASE, TABLE_TYPE TEXT);
INSERT INTO "INFORMATION_SCHEMA_TABLES" VALUES ${filasT.join(',')};
CREATE TABLE "INFORMATION_SCHEMA_COLUMNS" (TABLE_CATALOG TEXT, TABLE_SCHEMA TEXT, TABLE_NAME TEXT COLLATE NOCASE, COLUMN_NAME TEXT COLLATE NOCASE, ORDINAL_POSITION INTEGER, COLUMN_DEFAULT TEXT, IS_NULLABLE TEXT, DATA_TYPE TEXT, CHARACTER_MAXIMUM_LENGTH INTEGER, NUMERIC_PRECISION INTEGER, NUMERIC_SCALE INTEGER);
INSERT INTO "INFORMATION_SCHEMA_COLUMNS" VALUES ${filasC.join(',')};`;
  }

  /* DDL equivalente para SQL Server (cotejo con el motor real) */
  function ddlSqlServer() {
    const sql = [];
    for (const t of ESQUEMA) {
      const defs = [], checks = [];
      for (const [c, tipo, o] of t.cols) {
        let d = `${c} ${tipo}`;
        if (o.id) d += ' IDENTITY(1,1)';
        d += o.nn || o.pk ? ' NOT NULL' : ' NULL';
        if (o.pk) d += ` CONSTRAINT PK_${t.tabla} PRIMARY KEY`;
        if (o.def !== undefined) d += ` CONSTRAINT DF_${t.tabla}_${c} DEFAULT ${o.def}`;
        if (o.uq) d += ` CONSTRAINT ${o.uq} UNIQUE`;
        if (o.ck && o.ck[2] === 'tabla') checks.push(`CONSTRAINT ${o.ck[0]} CHECK (${o.ck[1]})`);
        else if (o.ck) d += ` CONSTRAINT ${o.ck[0]} CHECK (${o.ck[1]})`;
        if (o.fk) d += ` CONSTRAINT ${o.fk[2]} FOREIGN KEY REFERENCES ${o.fk[0]}(${o.fk[1]})`;
        defs.push(d);
      }
      defs.push(...checks);
      sql.push(`CREATE TABLE dbo.${t.tabla} (\n  ${defs.join(',\n  ')}\n);`);
      for (const ix of t.indices || []) sql.push(`CREATE UNIQUE INDEX ${ix.nombre} ON dbo.${t.tabla} (${ix.cols.join(', ')}) WHERE ${ix.donde};`);
    }
    return sql.join('\nGO\n') + '\nGO\n';
  }

  /* filas de las dos bases (js/filas.js; en Node se cargan con require) */
  function generar() {
    const F = typeof FILAS !== 'undefined' ? FILAS : require('./filas.js');
    const prod = {}, test = {};
    for (const t of ESQUEMA) {
      const cols = t.cols.map(c => c[0]);
      const obj = f => { const o = {}; cols.forEach((c, i) => { o[c] = f[i]; }); return o; };
      prod[t.tabla] = F.prod[t.tabla].map(obj);
      test[t.tabla] = F.test[t.tabla].map(x => (typeof x === 'number' ? { ...prod[t.tabla][x] } : obj(x)));
    }
    return { prod, test };
  }

  /* SQL de carga (SQLite): INSERT por lotes */
  function lit(v) {
    if (v === null || v === undefined) return 'NULL';
    if (typeof v === 'number') return String(v);
    return "'" + String(v).replace(/'/g, "''") + "'";
  }
  function insertsSQLite(datos) {
    const out = [];
    for (const t of ESQUEMA) {
      const filas = datos[t.tabla]; if (!filas || !filas.length) continue;
      const cols = t.cols.map(c => c[0]);
      for (let i = 0; i < filas.length; i += 400) {
        const lote = filas.slice(i, i + 400).map(f => '(' + cols.map(c => lit(f[c])).join(',') + ')');
        out.push(`INSERT INTO "${t.tabla}" (${cols.map(c => `"${c}"`).join(',')}) VALUES ${lote.join(',')};`);
      }
    }
    return out.join('\n');
  }

  return { ESQUEMA, tablaDe, tipoBase, largo, ddlSQLite, ddlDisparadores, ddlMetadatos, ddlSqlServer, generar, insertsSQLite, lit };
});
