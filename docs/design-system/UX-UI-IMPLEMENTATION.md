# Dirección e implementación del rediseño UX/UI

Traduce Quipu a composición de pantallas. **Quipu sigue siendo la fuente de verdad**: este documento no cambia colores,
temas ni radios, solo decide cómo se componen. Problemas de partida: [UX-UI-AUDIT.md](UX-UI-AUDIT.md).

## Prioridades

1. **Experiencia de aprendizaje**: panel del estudiante, detalle del curso, visor de lecciones, evaluaciones y resultados.
2. **Productividad docente**: panel, matriculados, correcciones, rúbricas, sesiones y asistencia.
3. **Gestión editorial**: estudio, comparación de versiones, importación y bandeja de revisión.
4. **Descubrimiento**: catálogo, fichas públicas, matrícula y certificados.

## Principios

1. **La siguiente acción primero.** Cada pantalla responde arriba a «¿qué hago ahora?», con una sola primaria.
2. **Una jerarquía, no una caja por dato.** Secciones con título y filas separadas por `border`; tarjeta solo para lo que es un
   objeto (un curso, una edición). Nunca tarjeta dentro de tarjeta.
3. **Solo datos reales.** Lo que el contrato no da no se muestra ni se inventa: ni rachas, puntos, valoraciones, precios,
   instructores, fotos o «horas restantes» estimadas. Si un dato se deriva, se deriva de forma exacta y se puede explicar.
4. **El contenido manda en el aula; la densidad manda en docencia.** Aula mobile-first y sosegada; docencia y edición
   aprovechan el ancho, con filtros y operaciones repetitivas a un clic.
5. **El estado nunca es solo un color.** `StatusBadge`, nudos y barras siempre con su palabra o cifra.
6. **El quipu es la firma.** Cordones y nudos cuentan avance real; la banda de cordones da identidad a cada curso. Es lo único
   decorativo que se permite, y una sola vez por tarjeta.

## Referencias y qué se toma de ellas

| Referencia                                            | Se toma                                                                                               | No se toma                                                     |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------- |
| Panel de aprendizaje con «Continue learning» y riel   | «Continuar» arriba, con avance y lecciones; cuerpo + riel lateral de resumen en escritorio              | Rachas, puntos, puesto, tiempo visto, promos, degradados       |
| Panel docente con selector de clase y listas          | Cifras de la clase, selector de edición, listas de seguimiento con acción directa, avance de la clase  | Ilustraciones 3D, donuts decorativos, etiquetas de nivel inventadas |
| Comparación de versiones con leyenda y línea de estado | Leyenda añadido/quitado/cambiado con forma además de color, conmutador de comparar, línea de estados en el riel | Barras de color como única señal, avatares                    |
| Catálogo con banda, chips y cuadrícula                | Banda de título, filtro por categorías en chips, buscador, recuento y cuadrícula de tarjetas           | Valoraciones, precios, carrito, fotos de stock, degradado azul |
| Moodle, Canvas, Linear, Notion, Coursera, Teachable   | Amplitud de gestión; organización del curso; jerarquía; lectura; descubrimiento                         | Copiar sus interfaces                                          |

## Decisiones visuales

- **Fondo y superficies**: página en `bg-surface-muted`, cabecera y paneles en `bg-surface`, tarjetas con `border-border`.
  Sombra solo al flotar (`shadow-2` en hover de lo enlazable; `shadow-1` nunca sobre un borde ya visible).
- **Tipografía**: Figtree para interfaz; Literata (`font-read`) para títulos de lección, enunciados y respuestas. Utilidades
  `text-display`, `text-title-1/2/3`, `text-numeral`, `text-read-*` (`src/index.css`). Cifras con `tabular-nums`. Sin
  mayúsculas sostenidas salvo el antetítulo del certificado.
- **Color**: 80 % papel y tinta, 15 % hilos, 5 % color. Un solo bloque grande de terracota por pantalla. `maiz` solo en
  finalización y certificado. Nada de colores fuera de los tokens.
- **Iconos**: `lucide-react`, la misma familia que ya trae `@wasichai/core`, a 16 px en metadatos y 20 px en acciones, con
  `aria-hidden` cuando acompañan a una palabra. Sin emojis.
- **Movimiento**: funcional y corto (`duration-[160ms]`); un solo sello al completar. `prefers-reduced-motion` lo apaga todo.

## Piezas compartidas (`src/shared`)

| Pieza                                     | Para qué                                                                               |
| ----------------------------------------- | -------------------------------------------------------------------------------------- |
| `ScreenHeader`, `ScreenBody`              | La cabecera y el cuerpo con el mismo contenedor (`reading`, `content`, `wide`)          |
| `Breadcrumbs`                             | Ruta cuando hay más de un nivel; texto y `aria-label` del módulo                        |
| `Section`                                 | Título de sección, descripción y acción                                                |
| `Stat`, `StatList`                        | Cifra con etiqueta, como lista de definiciones                                         |
| `Skeleton`                                | Carga con la geometría real, respetando el movimiento reducido                         |
| `StatusBadge`                             | Estados con icono y palabra: `todo`, `active`, `done`, `review`, `overdue`, `warning`, `achievement`, `neutral` |
| `CordBanner`                              | La banda de cordones de un curso, generada de su slug                                  |
| `QuipuMark`                               | La marca                                                                               |
| `SectionTabs`                             | Secciones de un recurso por URL, en `children` de `ScreenHeader`                        |
| `Notice`                                  | Avisos con icono y fondo                                                               |
| `VersionDiffSection`, `VersionStatusLine`, `VERSION_BADGE` | Qué cambió una versión y dónde está, en el estudio y en la bandeja del revisor |
| `useLeaveGuard`                           | Avisar antes de salir de un trabajo a medias, también por el menú del shell; el diálogo lo pone el módulo |
| `ReturnFocus`, `useFocusOnClose`          | Devolver el foco al cerrar un diálogo sin trigger o un formulario en línea              |
| `lessonIcon`, `upcomingSessions`, `formatSessionStart` | El icono por tipo de lección, las próximas sesiones y su comienzo en una agenda |
| `ProblemState`                            | Error con icono, qué hacer y su acción                                                 |
| `PublicLayout`                            | Marco público, con la entrada a la cuenta                                              |

`EmptyState` y `LoadingState` son los de `@wasichai/core`; `Button`, `Card`, `Dialog`, `Tabs`, `Select`, `Table`, `Badge` y
`Alert`, los de `@wasichai/ui`. No se crean equivalentes.

## Patrones

- **Pantalla**: `ScreenHeader` + `ScreenBody` con el mismo `width`.
- **Panel con riel**: `lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-10`; en móvil, el riel debajo.
- **Fila**: `flex` con `min-h-11`, separada por `divide-y divide-border`; toda la fila enlaza si solo tiene un destino.
- **Secciones de un recurso**: pestañas por URL dentro de la cabecera (`NavLink`, `aria-current="page"`), subrayadas en `brand`.
- **Tabla → tarjetas**: `Table` desde `md`; debajo, lista de tarjetas con la misma información.
- **Estados**: cargando con `LoadingState` o `Skeleton`; vacío con `EmptyState` y su acción; error con `ProblemState`.

## Breakpoints

| Ancho       | Cambio                                                                                         |
| ----------- | ---------------------------------------------------------------------------------------------- |
| < 768 px    | Una columna, margen 16 px, acciones a ancho completo, tablas como tarjetas, hoja para el temario |
| 768–1023 px | Tarjetas a 2 columnas, margen 24 px. El menú del shell pasa a lateral (es de core)             |
| ≥ 1024 px   | Riel lateral, temario lateral en la lección                                                    |
| ≥ 1280 px   | Docencia a dos paneles, cuadrículas a 3 columnas                                               |

Se comprueba con `e2e/visual` a 390, 1024 y 1440 px, además de 360 y 1920 en los flujos principales.

## Estados de interacción

Hover: `bg-surface-muted` o `brand-strong`. Foco: anillo `focus` de 2 px con separación (`quipu.css`). Pulsado: el del botón.
Deshabilitado: `not-allowed` y una frase que diga por qué. Cargando: gerundio en el botón. Objetivos de 44 px, filas de
temario de 48 px.

## Cambios por módulo

Lo hecho en cada módulo, en su issue y su PR de la épica #126:

- **Compartido** (#107, #108): `ScreenHeader`, `ScreenBody`, `Section`, `Stat`, `Skeleton`, `StatusBadge` con forma común, `CordBanner`, `ProblemState`, escala tipográfica, iconos en el menú y `e2e/visual`.
- **`classroom`** (#109–#113): panel con «Continuar aprendiendo» y riel de sesiones y evaluaciones; temario con resumen del curso, en hoja en el móvil; lección con barra mínima y lectura a altura de ventana; evaluación con ficha previa, índice de nudos y barra fija; resultado con anillo y desglose; finalización y certificado.
- **`teaching`** (#114–#117): panel con cifras, bandeja «Por corregir» y agenda; marco de edición con selector y pestañas; matriculados con búsqueda, filtros, orden y tarjetas bajo `md`; corrección a dos paneles con rúbrica, total fijo y «Guardar y pasar al siguiente»; sesiones por fecha y asistencia con control segmentado y marcado en lote.
- **`studio`** (#118–#120): versiones agrupadas por curso; detalle con línea de estados en el riel, comentarios junto a su sección y comparación con leyenda; importación por pasos con informe por gravedad.
- **`review`** (#121): bandeja por antigüedad con comentarios abiertos a la vista; panel de decisión fijo en escritorio y antes del contenido en el móvil; comentarios desplegables por sección.
- **`catalog`** (#122–#124): cuadrícula de `CourseCard` con filtros progresivos y «Más filtros» en hoja; ficha con ediciones fijas en escritorio y acción al pie en el móvil; matrícula con el 409 leído en la barra.
- **Cierre** (#125): las piezas repetidas pasan a `src/shared` (arriba). La pestaña del aula se llama «Lecciones» y «Temario» queda para el índice. Los encabezados de tabla sin mayúsculas, por `[data-slot='table-head']` en `quipu-controls.css`. Foco devuelto al cerrar diálogos y formularios en línea. Prueba de desbordamiento a 360 px y de los flujos con teclado en `yarn e2e`.

Lo que la prioridad 1 dejó fijado para las demás:

- **Una sola hoja.** La cabecera de la lección y su contenido comparten fondo. No se apilan bandas de color distinto.
- **Cabecera de recurso.** `ScreenHeader` con `Breadcrumbs` y `SectionTabs` en `children`. Las secciones van por URL, nunca como enlaces sueltos.
- **Una sola primaria también en el pie.** Si una zona ya tiene su acción, el pie de la pantalla no compite con ella.
- **No se sale de un toque de un trabajo a medias.** Dentro de un intento no se ofrece ir a otra lección; aplica también a una corrección o una asistencia sin guardar.
- **Una cifra no dice lo que no sabe.** Un intento usado va en neutro, no en musgo, porque no se sabe si aprobó. Se comprueba qué promete cada texto: «se guarda sola» o «te avisaremos» no se escriben si el sistema no lo hace.
- **Avisos con `Notice`.** `Alert` a solas es texto en su tono; `Notice` añade icono y fondo.
- **Saltos de título.** Un `h2` de sección baja los títulos de objeto a `h3`.
- **El foco no se pierde.** Un diálogo sin `DialogTrigger` va dentro de `ReturnFocus`; un formulario que sustituye a su botón pone el foco en su primer campo y lo devuelve con `useFocusOnClose`.
- **`main` desplaza, no la ventana.** `fullPage` no captura más que la ventana: para ver una pantalla entera, captura con una ventana alta.
