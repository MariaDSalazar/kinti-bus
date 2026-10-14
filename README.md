# Kinti Bus · Mesa de Datos

Simulador de un día de trabajo como analista de datos en Kinti Bus, una cooperativa ficticia de buses interprovinciales, con una base de TEST y una de PRODUCCIÓN.

## Cómo está hecho

- El sitio es estático: no hay un servidor que pueda caerse.
- Cada jugador trabaja con sus propias bases TEST y PRODUCCIÓN dentro de su navegador. Las mueve un motor SQL en WebAssembly ([sql.js](https://github.com/sql-js/sql.js)) con una capa que responde como SQL Server: mismos mensajes y mismos errores.
- La carpeta [`sql/`](sql/) trae `KintiBus_TEST.sql` y `KintiBus_PROD.sql`, que crean las mismas dos bases en SQL Server.

## Ejecutar en local

Es un sitio estático. Desde la carpeta del repositorio:

```
python -m http.server 8000
```

y abrir `http://localhost:8000`.

## Créditos

Kinti Bus, sus empleados y sus clientes son ficticios; las cédulas no son válidas.

Componentes de terceros:

- [sql.js](https://github.com/sql-js/sql.js) (MIT).
- Poppins y Cascadia Mono (SIL Open Font License).
