# Colofón

El sistema de diseño de wasichai-learning desde el 8 de noviembre de 2026: una edición académica moderna. Reemplaza a
Quipu. La decisión y las alternativas están en el
[ADR-0044](https://github.com/wasichai/elearning-backend/blob/main/docs/adr/0044-sistema-de-diseno-colofon.md) del
backend; el plan, en [`../../superpowers/plans/2026-11-08-colofon.md`](../../superpowers/plans/2026-11-08-colofon.md).

Los artboards `.dc.html` de esta carpeta son la fuente de verdad visual (son las fuentes de las láminas del
canvas, que se ven en el [canvas](https://claude.ai/artifact/3FfeqzTPiBKQzEcKR7MqKc); como HTML sirven de referencia legible
de estructura, tokens y textos, y no se abren sueltos: cargan el runtime del canvas, que no está en el repositorio). `canvas.json` es la disposición del lienzo. `tokens.json` recoge los valores exactos. Canvas publicado:
<https://claude.ai/artifact/3FfeqzTPiBKQzEcKR7MqKc>. Auditoría y decisión: <https://claude.ai/artifact/2vSwNNERREDaTSCPQMbU1C>.

## Principios

1. **Lectura primero.** El aula existe para leer; la interfaz se retira cuando empieza el contenido. Texto en Newsreader,
   a `--measure` (66ch), nunca a ancho completo.
2. **Progreso honesto.** Cifras exactas, segmentos reales, sin rachas ni insignias de vanidad. Lo que la API no da se
   oculta; no se pone un marcador en su lugar.
3. **Filetes en lugar de cajas.** La estructura la dan `--rule` (1px `--border`) y `--rule-strong` (1px `--ink`, que abre
   cada sección «§»). Las sombras son solo para lo que flota (`--shadow-overlay`).
4. **Un solo acento para actuar.** `--brand` (azul tinta) es el único color de acción; los demás colores son estados.
5. **El estado nunca va solo por color.** Siempre icono o palabra además del tono. WCAG 2.2 AA, objetivos de 44 px y
   foco con anillo de 2 px `--focus` separado 2 px.

## Tokens

Valores exactos en [`tokens.json`](tokens.json). Tres temas: `colofon` (claro), `colofon-dark` y `colofon-lectura`
(sepia, solo en el subárbol de la lección; fondo #F2EBDD, tinta #3A2F22).

| Grupo               | Tokens (tema claro)                                                                                                                    |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Marca y texto       | brand #1F3A64, brand-strong #152A4A, brand-soft #E3E9F2, on-brand #FFFFFF, ink #17202B, ink-muted #4F5B69, link #24508C, focus #2A5DB0 |
| Superficies, bordes | surface #FFFFFF, surface-muted #F4F5F7, shell #EDEFF3, table-head #EEF1F5, border #D3D8DF, border-control #7D8794                      |
| Estados             | success #2D6A45 / #E4F0E8, warning #8A5300 / #F8EED9, danger #B42318 / #FBE9E7, notice #2B5E6E / #E2EEF1                               |
| Radios              | radius 3px, radius-card 4px                                                                                                            |
| Espaciado           | space-1…9 = 4, 8, 12, 16, 24, 32, 48, 72, 112                                                                                          |
| Medidas             | measure 66ch, index-col 280px, margin-col 264px, content-max 1200px                                                                    |
| Rejilla             | 4 / 8 / 12 / 12 columnas a 390 / 768 / 1280 / 1440; medianil 16 / 24 / 24 / 24; margen 16 / 32 / 48 / 72                               |

## Tipografía

- **Newsreader** (variable, `opsz` 6–72, `wght` 300–700, normal e itálica) para títulos y lectura, con
  `font-optical-sizing: auto`.
- **Source Sans 3** (variable, `wght` 300–800, normal e itálica) para la interfaz, con
  `font-variant-numeric: tabular-nums lining-nums`.
- Autoalojadas en woff2, con su licencia OFL.

| Estilo    | Familia       | Tamaño / interlineado / peso                          |
| --------- | ------------- | ----------------------------------------------------- |
| display   | Newsreader    | 56 / 60 / 330                                         |
| h1        | Newsreader    | 44 / 50 / 380                                         |
| h2        | Newsreader    | 32 / 38 / 440                                         |
| h3        | Newsreader    | 25 / 31 / 520                                         |
| h4        | Newsreader    | 20 / 27 / 600                                         |
| h5        | Source Sans 3 | 17 / 24 / 650                                         |
| meta      | Source Sans 3 | 15 / 20 / 600, `all-small-caps`, interletraje +0,07em |
| body      | Source Sans 3 | 16 / 24 / 400                                         |
| secondary | Source Sans 3 | 14 / 20 / 400                                         |
| label     | Source Sans 3 | 15 / 20 / 600                                         |
| reading   | Newsreader    | 20 / 33 / 400                                         |

## Qué artboard es la fuente de cada pantalla

| Artboard                                       | Es la fuente de                                                         |
| ---------------------------------------------- | ----------------------------------------------------------------------- |
| [`Main.dc.html`](Main.dc.html)                 | El concepto: la idea del sistema                                        |
| [`Foundations.dc.html`](Foundations.dc.html)   | Tokens, escala tipográfica, espaciado y rejilla                         |
| [`Components.dc.html`](Components.dc.html)     | Componentes: controles, estados, insignias, tablas, progreso segmentado |
| [`Dashboard.dc.html`](Dashboard.dc.html)       | Inicio del estudiante (panel)                                           |
| [`Catalog.dc.html`](Catalog.dc.html)           | Catálogo de cursos                                                      |
| [`CourseDetail.dc.html`](CourseDetail.dc.html) | Ficha del curso (ejemplo SRTM)                                          |
| [`Classroom.dc.html`](Classroom.dc.html)       | Aula: lo que el estudiante necesita para entrar, y la lección           |
| [`Schedule.dc.html`](Schedule.dc.html)         | Horario del estudiante (agenda semanal)                                 |
| [`Mobile.dc.html`](Mobile.dc.html)             | Las pantallas a 390×844                                                 |
| [`Responsive.dc.html`](Responsive.dc.html)     | Adaptación a 768 y notas de comportamiento                              |

Los artboards muestran datos de ejemplo. Donde muestren algo que la API no da, no se pinta.
