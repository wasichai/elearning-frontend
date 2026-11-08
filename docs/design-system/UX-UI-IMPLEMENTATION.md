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
- **Menú del shell** (#141): la sección de administración es un estado del menú, con `shellNav` (`src/shellNav.ts`) y una sola `WasichaiApp`. Sin `admin` ni `MANAGE_ORGANIZATION`, solo el LMS en cualquier ruta; con permiso, una entrada «Administración» fuera de las rutas de core, y «Datos» y «Administración» en ellas. Ítems de 44 px y el actual con barra y peso, no solo color.
- **Destino de «Inicio»** (#142, #178): `homeRoute` (`src/shellNav.ts`), con `canAdminister`. Quien administra conserva el panel de core, con el menú del LMS en `/`. Los demás aterrizan en la primera sección que el servidor les deja abrir, con los predicados de sus menús: aula (`canLearn`, `src/shared/learning.ts`: `matricula: READ`), docencia, estudio, revisión; sin ninguna (la autoridad), el panel, que queda dentro del shell con su cierre de sesión. «Mis cursos» se ofrece solo con `canLearn`, salvo con los permisos cargando o en error; «Catálogo» va en «Aprendizaje» para cualquiera con sesión, y la cabecera pública lleva a «Inicio» a quien no tiene matrículas. Nadie aterriza en un 403.
- **Marca en el shell y el login** (#181): `@wasichai/*` 1.8.0, `appLogo` = `QuipuMark` (`src/config.ts`, `size-7`): barra lateral, cajón, barra estrecha y login, `aria-hidden`; el nombre sigue siendo el texto accesible. El panel ya no muestra el lema de Wasichai (`appTagline: ''`). «Inicio» sigue marcándose junto a la sección que es el inicio de cada quien: `shellHome` es fijo y ocultarlo deja a la autoridad sin vuelta al panel (wasichai/wasichai-ui#176).
- **Aula sin ruido** (#185): el temario no dice «Sin empezar» a la vista, porque lo dice el nudo vacío (sí lo lee un lector de pantalla); muestra lo que avanzó y la lección actual. El aula, las sesiones y la finalización cargan con un esqueleto con su forma (`CourseSkeleton`, `CourseFrame.tsx`), no con «Cargando el aula…» en una pantalla vacía. «Mis cursos» dice la zona horaria una sola vez por página («Fechas y horas en…») cuando todas las ediciones comparten zona; si no, cada tarjeta dice la suya, y el riel no repite la zona de la página.
- **Catálogo y ficha** (#187): la tarjeta lleva nivel, modalidad y duración en una fila con iconos (`IconFact`, `catalog/parts.tsx`; el nombre del dato es `sr-only`), y «Contenido ilustrativo» es una marca discreta, no una insignia de color. La ficha abre su contenido con «En esta página» (anclas de `Section`), que en el móvil se desliza y en escritorio salta de línea. Las fuentes `owner/repo@commit:ruta` se leen por su documento, con la referencia exacta debajo en monoespaciada, y los docentes llevan sus iniciales.
- **Panel docente** (#189): «Intentos por corregir» es una cifra neutra en la cabecera, sin el azul de aviso: la acción está en la bandeja. Cada entrega lleva la inicial de quien entregó (`Initials`, `src/shared`, también en los docentes de la ficha); el nombre está pedido al backend (elearning-backend#376). «Tus ediciones» dice la zona una vez si todas la comparten.
- **Estudio, revisión y estados vacíos** (#191): los formularios del estudio dicen «Idioma», no «Idioma (BCP 47)», y llevan ayudas en lenguaje llano (`recordHelp` en `studio/i18n.ts`, que `DynamicForm` pinta como la descripción del campo). Cada `EmptyState` lleva el icono de lo que falta (lo exige `src/emptyStates.test.ts`), y el tema lo pinta a 40 px en `ink-muted` (`quipu-controls.css`, `data-slot='query-state'`). «Versión N» es un título en tinta y las listas del estudio y la revisión cargan con `ListSkeleton`.
- **Errores en lenguaje llano** (#193): las pistas de `problem.hint` dicen qué pasó y qué hacer, sin el estado HTTP en la frase. Un 403 habla del acceso de la cuenta, no de un rechazo del servidor. El código va aparte: `ProblemState` recibe `technical` y lo pliega en «Detalles» («Código del error: 403»). Pendiente: los avisos en línea de una acción y 15 pantallas secundarias que cargan con texto.
- **El nombre de quien entregó** (#200, elearning-backend#376): la bandeja «Por corregir», la cola y la corrección ponen el nombre delante y el correo debajo (`Submitter` en `teaching/parts.tsx`); las iniciales y las etiquetas de «Corregir» salen del nombre. Sin `name` (un servidor anterior o una cuenta deshabilitada) todo sigue con el correo.
- **`classroom`** (#109–#113): panel con «Continuar aprendiendo» y riel de sesiones y evaluaciones; temario con resumen del curso, en hoja en el móvil; lección con barra mínima y lectura a altura de ventana; evaluación con ficha previa, índice de nudos y barra fija; resultado con anillo y desglose, donde cada pregunta enlaza a su lección de repaso si la tiene (#161: el resultado da el id y el título sale del temario del aula; al volver atrás se reabre el resultado, arriba, sin recordar la pregunta); finalización y certificado. El panel lee `GET classroom/panel` por páginas, todas o ningún dato (#158): sin tope de cursos. Si falla, se piden solo las matrículas: los cursos siguen y los dos bloques del riel lo dicen.
- **Logros del aula** (#154): filas en el panel del temario, entre el avance y las unidades, abiertas hasta tres y plegadas con más. Nudo de lo hecho en musgo; maíz solo en el certificado. Sin puntos ni medallas, y un tipo desconocido se omite.
- **`teaching`** (#114–#117): panel con cifras, bandeja «Por corregir» y agenda; marco de edición con selector y pestañas; matriculados con búsqueda, filtros, orden y tarjetas bajo `md`; corrección a dos paneles con rúbrica, total fijo y «Guardar y pasar al siguiente»; sesiones por fecha y asistencia con control segmentado y marcado en lote. El panel lee `GET teaching/panel` por páginas, todas o ningún dato (#158): sin tope de ediciones; la bandeja pinta los 5 primeros de cada cola y cuenta el resto con `pendingAttempts`. Si falla, se pide solo la lista de ediciones: cifras y tarjetas siguen, y la bandeja y la agenda lo dicen.
- **`studio`** (#118–#120): versiones agrupadas por curso; detalle con línea de estados en el riel, comentarios junto a su sección y comparación con leyenda; importación por pasos con informe por gravedad. «Nuevo curso» (#161) guarda el curso y abre su primer borrador sin importar; un borrador sin ninguna lección, tenga o no unidades, no se ofrece enviar (#170): dice qué falta y lleva a su primera unidad o a su primera lección, que se añade desde la unidad porque el selector de core solo trae cien. La lista no sabe cuántas lecciones tiene: el diálogo lee el detalle antes de dejar confirmar. Un `409` al enviar se explica con lo que se relee, nunca con su código ni su `detail`. La gravedad del informe y sus totales los da el servidor (#161, elearning-backend#256); un tipo de problema nuevo se ve bajo un título genérico. «Tus importaciones» (#161, elearning-backend#266) va antes del formulario: retoma lo que sigue en marcha, abre el informe, el motivo o el borrador de lo terminado y pliega lo que pasa de tres filas; lista hasta 50 y las terminadas se guardan 30 días, así que no es un historial completo. Las etiquetas de los campos de «Nuevo curso», «Nueva unidad» y «Nueva lección» salen del i18n del módulo (#174), porque la metadata solo tiene un idioma; las opciones de enumerado y las fichas de core siguen en español hasta que Wasichai lo admita.
- **`review`** (#121): bandeja por antigüedad con comentarios abiertos a la vista; panel de decisión fijo en escritorio y antes del contenido en el móvil; comentarios desplegables por sección.
- **`catalog`** (#122–#124): cuadrícula de `CourseCard` con filtros progresivos y «Más filtros» en hoja; ficha con ediciones fijas en escritorio y acción al pie en el móvil; matrícula con el 409 leído en la barra.
- **`terms`** (#162): `src/modules/terms`, «Términos de uso» en «Aprendizaje», para cualquiera con sesión: lee, acepta y vuelve por `returnTo` (validado con `safeReturnTo`), o retira. Un 403 de matrícula o progreso se aclara con `GET /terms` (`useTermsRefusal`, `src/shared/terms.ts`), nunca con el texto del problema: la matrícula lleva a los términos; la lección avisa sin sacar a la persona de lo que lee. Publicar es de `administration`, en la sección (`isSectionRoute`). El texto es dato y se pinta como texto.
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
