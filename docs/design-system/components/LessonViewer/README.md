# LessonViewer

Visor de lección: barra superior, contenido (lectura HTML en iframe, vídeo, PDF o presentación) y navegación «Anterior / Marcar como completada y seguir».

## Contenidos
- **Lectura (HTML en iframe)**: el iframe recibe la hoja `reading.css` del sistema (estilo `wq-reading`: `read-body` 19/32 en Literata, medida `measure` 68ch, títulos `read-h2`/`read-h3`, citas con hilo a la izquierda). El tema (claro, oscuro, lectura) se propaga al iframe vía `data-theme` en su `<html>`. Herramientas: tamaño de texto (A−/A+, pasos de 2px entre 17 y 23px) y modo lectura.
- **Vídeo**: reproductor siempre en tema oscuro (`data-theme="dark"`), reanuda donde se dejó, subtítulos y transcripción obligatorios, velocidad 0,75–2×, teclas: espacio, ←/→ 5 s.
- **Guía PDF / presentación**: tarjeta con miniatura, páginas y peso; abre en visor nativo en pestaña nueva y recuerda la página.
- **Error de carga**: estado vacío de error dentro del visor; nunca un iframe en blanco.

## Qué aporta quien lo usa
Ruta (unidad · lección n de m · tipo), contenido, duración estimada, fecha de actualización, criterio de completado (leído hasta el final / vídeo al 90 %), lección anterior y siguiente.

## Reglas
- La acción principal marca completada **y** avanza; si el criterio no se cumplió, se muestra deshabilitada con la razón («Ve el vídeo hasta el final para continuar»).
- En móvil la barra superior se oculta al desplazar hacia abajo y vuelve al subir.
