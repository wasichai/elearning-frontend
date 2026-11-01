# Pantalla · Lección de lectura (escritorio)

Vista de lección con temario lateral a la izquierda y lectura larga centrada a medida óptima.

## Composición
- Columna izquierda `syllabus-width` (320px): volver a «Mis cursos», progreso del curso y temario con la unidad actual abierta.
- Columna de lectura: barra fija con ruta y herramientas (tamaño de texto, modo lectura), cuerpo `wq-reading` (Literata 19/32, 68ch, márgenes generosos), navegación al pie.
- Sin navegación global visible: la lección es un espacio de foco. El shell vuelve con «Mis cursos».

## Modo lectura
El botón de libro activa el tema `lectura` (`data-theme="lectura"`) en el contenedor y en el iframe: papel sepia, tinta cálida, mismo contraste AA. Se recuerda por estudiante. En tema oscuro, el modo lectura mantiene el oscuro pero sube el interlineado a 34px.

## Reglas
- Medida de línea `measure` siempre; nunca a ancho completo en pantallas grandes.
- La lectura HTML se sirve en iframe sandbox; el sistema inyecta `reading.css` y el `data-theme`.
