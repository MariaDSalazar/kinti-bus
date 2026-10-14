/* Kinti Bus · escenario de la jornada (generado por fuente/construir.js; no editar a mano).
   Solo el primer requerimiento va a la vista. Cada ticket trae un sello (AES-GCM) con lo que se ve al cerrarlo y el
   requerimiento del siguiente; su llave sale de la respuesta correcta o del estado correcto de PRODUCCIÓN. */
(function (raiz, fabrica) {
  const m = fabrica();
  if (typeof module === 'object' && module.exports) module.exports = m; else raiz.Escenario = m;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const SAL = "26266c45563cb1bc7e9908d2", ITER = 200000;
  const PERSONAS = {
  "lorena": {
    "nombre": "Lorena Paredes",
    "cargo": "Jefa de Atención al Cliente",
    "color": "#910048",
    "ini": "LP"
  },
  "marco": {
    "nombre": "Marco Villacís",
    "cargo": "Coordinador de Operaciones",
    "color": "#002C71",
    "ini": "MV"
  },
  "daniela": {
    "nombre": "Daniela Chiriboga",
    "cargo": "Jefa Comercial",
    "color": "#8a6400",
    "ini": "DC"
  },
  "andres": {
    "nombre": "Andrés Toapanta",
    "cargo": "Supervisor de Flota",
    "color": "#1d5f4c",
    "ini": "AT"
  },
  "gabriela": {
    "nombre": "Gabriela Maldonado",
    "cargo": "Contadora",
    "color": "#5b3a8c",
    "ini": "GM"
  },
  "sofia": {
    "nombre": "Sofía Benítez",
    "cargo": "Gerente General",
    "color": "#002C38",
    "ini": "SB"
  },
  "esteban": {
    "nombre": "Esteban Ruales",
    "cargo": "Administrador de bases de datos (DBA)",
    "color": "#4a5461",
    "ini": "ER"
  }
};
  const TICKETS = [
  {
    "id": "REQ-2401",
    "tipo": "consulta",
    "de": "lorena",
    "hora": "2026-10-12 09:05:00",
    "prioridad": "Alta",
    "titulo": "Boleto perdido",
    "mensaje": "Hola, ¡bienvenido al equipo! Tengo en línea a una pasajera que perdió su boleto <b>KB-007227</b>. Viaja esta semana y no recuerda nada. ¿Me ayudas con el <b>número de viaje (ViajeID)</b>, el <b>asiento</b> y el <b>estado</b> de su boleto?",
    "campos": [
      {
        "etiqueta": "ViajeID",
        "tipo": "numero"
      },
      {
        "etiqueta": "Asiento",
        "tipo": "numero"
      },
      {
        "etiqueta": "Estado",
        "tipo": "texto"
      }
    ],
    "sello": "PBDuc12YnXwoXuvdf6281y6eLbqaG7Vc52qVxkWomd1EO3Bpe0UhIIJ/JoZ/GsY3+GuhkE5GLXXu95cy7XnwdqRZYv205mJWCuUHpy/6CQXM9n2+sYR2daabGpn+N3snUw3QE8vjUIeXL6UNTnfstL0Nm0dydU8S+qp+otF3Oqr1WzG2P9Ue7sySIWXNzYgBGCQ0R+XeD3k3JCMvllB+Ufzxwn39QbYmTZS3zyWpNtnF1gr4bE2i9AVQufBVjBkomgn6544gwkOwOSzwx8qIENIdk3HRGAuelIBmWm0dsbMi4+gPDaw2VEIee8HY+ShWVXZGze0QadYRtaQe3l6ckpFwTr/JAyFP85696QAPClxcD0Z6OJqdg/D5Ouk7m+PyzLPgnGyNgrfRaFYCb6PHRmXjddyeBlsZssfEbW6WOxMdRkHXLC1RrpqyByHDUWJH2tEgtbNE9oWLZSfUJjI33GeLKBLLshFBdsL5H0lyiFsRN5JGWk0khEUwklL2nsXUiI47yKmqlt0mIKfQhaQ1KvEvenfRiuRQTgk5sIyxcjTl8C2suUVvzXSiaga1kz+OqNRkF/CPr97GOMg2OcuhXC1VdapB4cb0ruRFlk1PdlP7+yunw1aiU3KWYpzwU0zOgjMgzrdPA2gROjJIINGdl+lzYhKFwTaGMZUycbAux518+yM="
  },
  {
    "id": "REQ-2402",
    "tipo": "consulta",
    "de": "sofia",
    "hora": "2026-10-12 09:20:00",
    "prioridad": "Media",
    "sello": "1+U1vOSKw56FRmhfaTap34CJLc6oA34AknyFaGUgQgCPfeg4Hno/HoKt4rrXsGZWXprETqzinlFcbYIpZ7xCc6dFDoWs8iOt1EgQSdVafoKREz8YtQjIEI4rELLWdMfEuJAQM0yUw1hcg8Sg9ibw5ZMOzgkRVkAt6OZw6ZdGhUilVJXMoJj264t/yvCr/ehPOfQM4z4eN+76M3Yd+4F+6CkcwHFu7Aru/wXl640A+2tXt32/5kCNmyna4K2WTKTcaPPxA8KXG8d1APEccrivVHI50JhoBZWlTEbWLfYnBIEJjwbMePX6BJDYxTC0RyxaIdkGPZe/fwN4RkOoyQrWIljwoDhvX8WX9WxA1odYkm9mwGxG4vLK3wX1bRsSnOuHYtuxz16+zhLVzq4ICIf6zxYzVg5LTbwyUrXtMYlkmB/5XQPSedkCC4oZLUJsfi3NS9FiKhkoeFqaBsHSzfYJx8Um2sUNjFmTU91YxuyidP2DxB63DYpp0fXf"
  },
  {
    "id": "REQ-2404",
    "tipo": "cambio",
    "de": "andres",
    "hora": "2026-10-12 10:05:00",
    "prioridad": "Media",
    "sello": "/GHTdGZtRti83QOwqJBvdDhLTnuhHAI68z4kdO/VnbySYNDneIK04lK4Y4xmp4J94fcNauPEGBIpFnDF4RXQ80EZ3+mQZ4UBza5DBEMysLp1XBeHlR3qKjEoklXtsQzNQ5Wr0URZjMwlYzY3gkkhaCgfQyEu0P25vazbqSzbnxUT+3ysAVvFhVrc535qQ0azw2iNB5vUsXzuweX1XpfTGHH2TfU7m68q2sFlVA8d9tH3hUVEnP7jAmYPlkBE4E4O+JP/XEebDxnywSLNHdVxsUlNiRhw/Wbv3hGWZwKosahyQ6EXq4Cq1a8/Ccdfr3ZAVYOGykS7ZDfroBL8sVuPkQZhhrLENVAF43wA1wcrDw9lvEN6RMgni3i9mg9qx+z8dyUI6rdsjfSIcWJYBj6PcS2jRxYGL7kxQQHbAIMAvysl/gGokUWhV7d0z3PxuedzIAR58loHhLE50A9REMCO+10uWdB1HBzt708isgE6hZmfX0eZioZ66yBFh7NyMS4k8AScT/00znHDMHgItQrGSVWB6F408V3H09T7lKrmBFeSGZIr6D+6G5GQEoyhadXTzutLTRZW8lGW2arU3TQ6AxP3X0WO1AdF5uBgW7LFr2pK3Nw07cxfw2q832+sWvAyD3TF8TyNavb36Ge3OQTsdSxPlztO/u69dzzC6XhbTBpiLra71NTlyAcKgqMKb6oT9DKsEw6VdaPEGUMy0eAYDdn5Dci8/7ZVBg0Oa1DS2qiIhnj1s3mHJVHEe9zNcdvVPla1nyZeRt8vFk17EiHnwwspB9httmKn/jx5oP2vfx/o3BVAbh4bYHssj74OlIzCOe0z9Hx94wl3l0g6hZBw3B/NxrcFZuftmE0tXhLXpDqMqOyfqgzoNVFF27uk3Ky3IyLYIkn8MYIFVOB8k4yaCpOjlM8tbOYSztqiXITZvc2WaW3xYzwopo7DjGNGcSbr0nHryKl9TNEnTjoS+wis4A6oeFU="
  },
  {
    "id": "REQ-2406",
    "tipo": "cambio",
    "de": "lorena",
    "hora": "2026-10-12 10:50:00",
    "prioridad": "Alta",
    "sello": "KGTFAHHj2Pi1m2OVBhibCnMifKuP5zP1VcxlzRSVLgO0LZe845yIqRx3R0fiQ1uHlyGLtbyx9XhLZTmPj2Qd5/auK/AMcoHsC4QwO3clLgTaFv7gffQgx9zwyrM4OrKmb7sXT+XPBX5pOXdZv7i5/uNpiSD7GMz5hWIEKmNcgx43rZYqFtXQe0AehlIBApUbwqe7hLG+RoU4lOssx6P6g2Qyh9dBM7kYKs0tpCdnRuMJ6HUWaDYIKB0z5heO/NhC+9SejG3s6QI6W0yoYSitNa4rMopA3YtlNiIDNU5nuWTd/AoNYSEqsO5es5+Nnhc5aY3pIdjN10PIVC/XId8yzZRlvXGrdqMK/oERCKr7zyrUhtyTVocEByWFaHIegiYtVydcOqo2Xq8NwiUub7cndDyhhP7R0oEu3NmSTMhcAETMpajYGhdEGaUWM1bBPlTp43fpK0ZGCzMUX47g2c4GVaJf06ezvGvD0fQ5mw674O1kXuy3eqtDZKjx4z8MfYNqA6Ic7WRFbvZJgsEoBch2yFGNEHeNZBrKxcaE3F2DD6Dfkr1KWjoAFC0G1TWMpl0tNOQjR+z0yf3I5O6biTWgPZZtaXPITrVeRNmOyhKSiQJaUa2c9jtYodItLAoniZNVvJ0Gc4FMWAoCKLWUdRmgW08ZFxBjXm2DyFUdWtTw/QWCn9HfikA/1pn4SRgWIiJFDiRe2bXZSqJenm5gjl6QNdH+Wu1/PzF5RvkSKxuTPLOxpEexjgRlumGySND8mRl+BfFSiBwjXBqbmnUlXGlhxtE/R8wzFZVSEEPBZPLrAWmfsyZM0KIAiDTpmEuFzqun4YZxs3IvFyOLdps2mNhocOEHqIl4XJIkjIUcSyHeycrrFgcU5iueEPCL572TSdwDb6M="
  },
  {
    "id": "REQ-2408",
    "tipo": "cambio",
    "de": "daniela",
    "hora": "2026-10-12 11:40:00",
    "prioridad": "Alta",
    "sello": "kJLzn+Y9z8oI504nAj3TBiij0NokMtsSUqfXAOhqitpXICcOVbp7TclKr5myU2jsQTu3Bk9H8dti6ozD5aoXJeReYlpg67Aeft5i0jHYXQHNo1bCUOHLpx/5oeI5Xw1o3P8JqIq7dxOS35OZt9hBgCSeoU7azLl7n6wL82OwApg8Kt/7cBUHaw3ruQm39gq4nhwYl59jag9Ue/Y/hlnHB0wr9pxBtIt11jrNEwzwg80MmCUUIE4fW00ylGJnis+bgUPSF6frhXjXhHG6X/NVZjR1n/+gDsZWN/z64dTKw6SVYSmHsrjPWVbfXh2dyUVbs4Mt9NQ64xfjqfLiYIGMjCqn7CzzJ2dgHhlfENhBo3XxWyToDSfJmIIy3PLZi2SQEb45WpNYBPbgPuGFC6oWlcaotcOOqkY96iI4vfVmamm00dhNXkGvV5nNTworIBUtIUllgdqJIzJAZWTOF175PUcRJCwDSq1SWlP8nZGTcSJ4QstyyZkN0V9rwtqpDnIGisBPW5tncvRem5LlbtxWxFpL6AN/s3eGO5BmQ4OfMptale//yWVZhooFs8opBvYwHZOiEprE+Pc3I1IZI7Z7r9/WAmUCzttrKEHCzAoPBfynzQc7PfA1gVuVJk2UEcY="
  },
  {
    "id": "REQ-2409",
    "tipo": "cambio",
    "de": "andres",
    "hora": "2026-10-12 12:10:00",
    "prioridad": "Alta",
    "sello": "bPVOUzEJBn+qWlECkA2eTBwEo/wbcUKDTNrhsdmhaSSLa8WOBBzWwu43XHiNW/1D/XHr0v9o7p1MeM8riLPTbrOu0d868aARm+VrTzJ8RQf930KyuknuEg+SWdUIeF6yvDfKYPU1PjT4BgMQDvc0cJirdp+VWG8g1gAu6Q4tFlTznXddjZSrdVkS2yu+FzXbKGyYgnDraUk4EJBAnMEF2TQ0mq974m5BifzNPctVxwiySt7Fdl3WAprP2hheoP6Y8S7daL/u8tMsItpQyvB/U/Vz6Y5slYA2lrt6MJnZQTgU4bzss6lOfknXTG7ZZNmaLJD+PsNPXIeOHbHtdaU/T81j5o+i1DfvDYslLGTFJcO6FQRQxlXJ43cSelzPPxGwAYD1USMX0iu3qpA8kbTg7OFD5BpUeGxr1bMndg+STD6OVcTz5dyoUqHMbVuDw8VCHRUiqmlMMVcm9gqeq5PCVogBh+nz0NtB23sjVbsNI+JZtciG0l05MIvSP3TXvy2IFQYmSRWeyly55Vd0HGySMofQuOpn/7NkOf+9281YgfyuKURYIqzQRhVCHqp4vRj6fW50OwHMb2405JVlxz3+O0xB6WocGdrIVjpBRGv76A3YqjnuWamDQz91sMKcECy3Qx9cLOmKf/O37Uyj4Pk6DZ/Gtv8o0CSVjPLgBEAdnwss8vXhC8h1RtGRivF4s1fnMucAei15nDFhVCyyRSpKIIPLXa85Rc3J4VlB670ZgoOscal3+e7pzNEf46mYhA9EkK/zkdv70Qrf5f2ASTXSZ1RM7NrLQGp2BMJ71XXtwCA2uQTm8mmWNeFNZG2IqwMr0eNx7LldntAV6x5vxO1Zw22tcX3rAQ=="
  },
  {
    "id": "REQ-2410",
    "tipo": "cambio",
    "de": "gabriela",
    "hora": "2026-10-12 14:05:00",
    "prioridad": "Media",
    "sello": "OMPhNzDV+2lNRomzZrdm0jUoGLOlDtTWmKcCGLf6vZSHNWq4i2XqdC498Tu0LD6fX4d/uLmDEicCLTdNPZ3zPMtHD40eHbvuSkDKnpVWLLZFJPTITzltxmsel15Erq7rxN0VhFyXO7f+ENRr1iVYLGgSH2oUp+N27FhmPU0Yqsi3VnG2jym2mtZ5mVhktMvDnUhUT1pYcEI/ObeCprvNkIz5cEvfqUX5317d7PKISupkviV51fmmL9kqiMxDUGVgeCPoYtRoFO9zAuSEZkdigDbwkQ6C6lGGJYqL/aDnZ9vfdlq1LCCme5DngyYbIjBDlpFhCy9YVrz4Qi9zJW0cc56YnNAE4I685Hyn2iPhO0pKlKlUF34BuMfyGYsfiJhBzLtt/JoyXK5AenlEjHRpkbvF7oCeCiBIQzPeyS1rWtS23HqDggKZU2pgHkRR3eW9gSSd1Wtz0DOFoY+gORTZMLB/x343NDQdcuwrWsgIwV/E+u/Qzmv0E3bQdZc5OhUuCVSP4XQg1ve6d2ZEyl0="
  },
  {
    "id": "REQ-2412",
    "tipo": "cambio",
    "de": "lorena",
    "hora": "2026-10-12 15:00:00",
    "prioridad": "Alta",
    "sello": "fd7Vbbix2/T0IhRKcHnuuMk1j/yjqRh7CamhdXKuAaxvTEFD1rt/vKBQIXmgRdYbpiCr0fDjKZtfyJ6RUdnBS0tSk2R/wR+1FC3OPYjuCws1db0T3m3ct6S518K73tjAnAH3QiIduZ89VEzMMYlJiOw79Ibq8Rv4iGZ0gQFBA6IS5PTb/DD9BAX/RxxQGPte6dklM8OEyj361amBkYCfFId/MeWTBQlJzXn3tkDAVEolXn3gvf6oxrd5+9k67EC2IF7KGq+a2SreqX6NGikJ+hmXLFbcMtAElw4Y1Y5sJP7qTnw63VsyNJ8qE4jbBMj1fQkQKQkW9cJnwJ5W+dnIrd1RAsqB/zQzBRvWlVaErxNbuE1czwmpugH9nOUGtIDo6pxT7886ZnoGlXJk95ikoeSde52dwztfHAl3nthzIEKp/ZESwSj211zhSf6rL7ZtzOoBG60ht605nIM7PYS7yqkEHUSnOnwS61LVLapF8TOufz4+uHtwTGuWWjX98/ppXDOidSevwqg1wBfHQyf5MZhVZRiQwvACmwoJX1+K0qygSOuICCgocNEpv8+lHq9RxzwRFcmsmQu+d37YePOr8/t4w8iDE6//3gqAqRWxp2YHbWy1IVbhHtqUEYxdnPfAvYBzLO/RB38MpNRPPPiLH81wUPF1O8GeGLhXhtrkhxkZDf9/nCrUvwv/J9iZmV9CSi2y/OW9P2nA8zTVxcU1u4DiOaT0+JpSbxvTvmf+D/6S/HDRWghRby/OMMibjPybpZgkb+vIXnS10JjSl87rsN56KtGFMjR5/tP+X6y9C7a0VgIm56VZHWVyyNNyBAe2lfIrAM81aTfshOvtiTFcSDsu2g63+oFK0sD85KxntP3wBSeaS9BL2ac+efGEznk6G2JyNNLjtYLaMbOMWPxET9q3gBz3jVjy56tDTnduNyr2nuoNe6yMeW0bZJzb426GaBOCFh7AWrG4G8Nx0+W8Dx34IuTbZ9kwfN7GqbMAN3Qs/d0BSSzRobrrxRtGiccwwjsXco7rpSuA4rMPcl1KDXukHQcc3dLP1TXmZw=="
  },
  {
    "id": "REQ-2413",
    "tipo": "cambio",
    "de": "marco",
    "hora": "2026-10-12 15:30:00",
    "prioridad": "Urgente",
    "sello": "1aYl0h7XFLQm0LmYt+aQYOgs1iVkXGA/4tig0MzC+pBKldVsG2W4BmcDzl/eRW4HEvti2LcKenHioRNLMTx9qg0p+4XpRdf+XSJmakKs0JoumnERsYFcehH6cB7NSSHWnGc67t6gXzFjadnph3I9BTyBZGiDLw6kHzfmVJggOp12g0YQaNwPHbsuBuVLFR8YC2gtpM+VUu4wOFQedJpMB53PP+RiKdaKQnjQgbEmGUNDJ54hDtXDMnNaSoTLpNoA7z6qHwh4JYDIWyBAYWVSeMhTMKU85h9eF2VEL9Q3IcSeDEl9tWgKgmqvIYwUj5LHNX52C95yrrSIVN81N+AuKMX0cFUiKE7jbVd/LvI3wmCd70GbB8Sfl6h/7LVjPC9mVa0dtZb2e1osvUiTgmc73RLIDqoGQdp7FK3kCahAP2o+sRNtfgn9F793k+hXd5TSSjdsYcwcmrwOXCiqJQv3Ruxf1CZvN1tBOXvsY+LcXEeiEbQ2fJUDJFJsIgJFqqKiLB6wI7+I+llE2fuEf7OU/z24/TJB1gNDNTWZ4VyrsertTdgjmE1jl1WeTo9NudalwpReWVazJu9nuKDVJ7O9RBS0SN240kpEuO1tkasBGnfx3W482+ETTseYgO28RwqFWaj5Aq5rHMdtGsqWyxwVaNiR2nNQIdgMfMSjiXE22ssReJ5TNo1k3C6/cGSQmRt6teH9yR0WBt9G16RJ0lLPsCGZdna8dDcq9Oxyr/NngHD6HwPSFMq5IF0WV/aqj63ydnkRqRUl94eeAQ0fYsfl/Jx7ZVCzqekmNnDCpqjYPxbxu4Nhi/m8oxMTLsEwZI27VOR4LwG4vi+mX4Fd4q2670i55c5ZUgUqrtv/0HOdOThT19VODoV1PEXEHmz2GRdNf2esg5StONWTKERz9En2tIJ2mMOArr2va8N05kbzwddUKVyOKZ7yniNth40zmGCgajN1huFROuigcP0HASyRRGLbLxtoRa1NTyb2WVA5hqC8SA34gXoLoC30o58UiJz3uKVxchJ/S6AMtOFdfZhow2iESwFBRTwmSmiJ5e8e+C792+OStRXbCiLcbg=="
  },
  {
    "id": "REQ-2415",
    "tipo": "consulta",
    "de": "sofia",
    "hora": "2026-10-12 16:50:00",
    "prioridad": "Alta",
    "sello": "v6IaL9W9HmVFVRO52MM8Mr3kMfrtTE416cqS/tI7+BIK8sKgQBSGSekZ3ehEp6Megj9YX4IHiY6TQPYRT7nvfdSisJcmVs0yg5QWVCfx+byCPNDOacwOUgNpYW5RLu1drecUTAseM7Cp4UMbRWhfwQ5Zi3lK1AUJ+/N42dNgT7VeLD0GLu9Na/ytCPHvF3JP7YaNfOZjf79OKerAnMBTSMcmgIJbADpbP4BGt8oMko/165Xl+AkrFwOIxgYCnmp/hnV8N6hiFZ/G7P9a5zaw00corndLWJ1bv+eZIo8VuxohKKYpRIZbQvZMlAWoR5rvBLsfc0Q4bG+radWBRZUqADuJU7v44XWEGeftBKyluUdErzHbLR5vlfkt"
  }
];
  const REVISION = "mvKfFSuMfKkF4k4o3CtCNl/X2Ku0mYn3fFPFy0/So3Nyie86eAkBW5M4mjcvj9gCWOsl/T0P8GbPe0XNQQaKM96TYQDM85d79hSfHkTrSBterUgGUkN1U3hidUvN30L/8ZxRK8MKx2s0epm3N9ka0UlJCUEtdA4kieQt5VsQkbuvkP/zCoJOXamqUAyyuZvj6eKsu05K0eWXPfcWrITA3XNMYWDMYfJmKTZYEjex8DYpQBjs9qfQIxbzR3HcQaJr/hlSpvXp1F96woMvEjXc0zISBKoyjnamKAiWEqQHeiweY+xfENJVPjV3YJHmTNWQwAdQEbgATeRUo0xpUYBdEkIgU6wW3U8COSnUfUMVXCctoBfWJ9OEC5R64R3dAnNphCbZA+2erm1xB9hmOHC+SxuJYN/VFAjLdEtaqKuF0tpKdFmUvEpJ7lkCz+a+nFojVXc2ocd4GQj34pv/iGIab/NolJAP5+zeNqr8kRAF4IX+UOXO27RP0HUpBlahowMtCLv7Tj2wpzlPGuO1mPTWJFkY9EiCHrsX3KOVt8faW/nriBS4extKaj/4OHezY5zwxzjEfjbJ44qO4wmhko7QqqfnhHXdYJx2Xt6DkmowKKD5o5a1NzaZoXx8onlRiHOOAChvm4uihseVC8cG0CL5ttFKysGA64Qeq7X3n/ht8+6HquBzk+sbjkTXliGUbdWJ/zLqhXF0kHoosTrTP97JF9y7UKgOVAnldRjKiICRNFPgq5AF6AWZE8C942W+VtCoVQF+D1e1P9ApyxdkaidJiGlbHLEWYLbH+tV1eKGkN7V2GUdru+zvlNgfxizWK7dx7xL/964vxTnz8jEuwuqbWwQZQA19570JntvcTpDlSezxqVIQHbtRGtnEfDI4wG/MKSuc/9pZael2Vs4jWjjWg5Av/6dG+DsC1OoVawD0sBR/hFxpHn8fpllewFRqJY2OrK3FjY8L/y3a90VejTuZgYEmGxUjRj07pp+POlb47V2J9ssPkx3YWICsMTjwB6KHBxpBGC5X2iGSLfq41xEZ+gpx5S3uqeKirue9rM0cRL4WBUp2ZyJjtSU3Ni8zU/MLmmEI5g==";
  const te = new TextEncoder(), td = new TextDecoder();
  const hex = b => Array.from(new Uint8Array(b), x => x.toString(16).padStart(2, '0')).join('');
  const deHex = h => Uint8Array.from(h.match(/../g), x => parseInt(x, 16));
  const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  function material(vals, campos) {
  return JSON.stringify(campos.map((c, i) => {
    const v = vals[i] === null || vals[i] === undefined ? '' : String(vals[i]);
    if (c.tipo !== 'numero') return v.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toUpperCase().replace(/\s+/g, ' ');
    let x = v.trim().replace(/\s|\$|USD/gi, '');
    if (x.includes(',') && x.includes('.')) x = x.replace(/,/g, '');
    else if (x.includes(',')) x = x.replace(',', '.');
    const n = x === '' ? NaN : Number(x);
    return isNaN(n) ? null : n.toFixed(2);
  }));
}
  async function derivar(mat, id) {
    const k = await crypto.subtle.importKey('raw', te.encode(mat), 'PBKDF2', false, ['deriveBits']);
    return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: te.encode(SAL + '|' + id), iterations: ITER, hash: 'SHA-256' }, k, 256));
  }
  async function abrir(llave, sello) {
    const k = await crypto.subtle.importKey('raw', deHex(llave), 'AES-GCM', false, ['decrypt']);
    const b = b64(sello);
    return JSON.parse(td.decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b.slice(0, 12) }, k, b.slice(12))));
  }
  /* llave y contenido del ticket k si el material (respuesta o huella del estado) es el correcto; si no, null */
  async function probar(k, mat) {
    try { const llave = await derivar(mat, TICKETS[k].id); return { llave, contenido: await abrir(llave, TICKETS[k].sello) }; } catch (e) { return null; }
  }
  async function revision(clave) {
    try { return (await abrir(await derivar(clave, 'revision'), REVISION)).llaves; } catch (e) { return null; }
  }
  return { PERSONAS, TICKETS, material, probar, abrir, revision };
});
