# Diseño responsive

El aula se diseña primero para móvil (es donde se estudia en el trayecto y en casa); el espacio docente se optimiza para escritorio (es donde se corrige y se pasa lista en lote).

## Puntos de corte
| Token | Ancho | Cambio |
|---|---|---|
| — | < 768px | Una columna, margen `space-4`, navegación en cajón, acciones a ancho completo, hojas inferiores para temario y filtros. |
| `bp-md` | 768px | Tarjetas de curso a 2 columnas, margen `space-6`. |
| `bp-lg` | 1024px | Navegación lateral fija (`sidebar-width`); lección con temario lateral (`syllabus-width`). |
| `bp-xl` | 1280px | Espacio docente completo: tabla de matriculados con todas las columnas, corrección a dos paneles, calendario mensual. |

## Aula (móvil primero)
- Shell: barra superior de 56px con menú; el cajón entra desde la izquierda, se cierra con Esc, al tocar el velo o al navegar.
- Mis cursos: retomar como tarjeta compacta con anillo de 48px; tarjetas a una columna.
- Lección: barra mínima con progreso de lectura, `read-body` 18/30, acción fija al pie que se oculta al bajar.
- Evaluación: una pregunta por pantalla, cabecera de dos líneas, «Entregar» siempre visible.
- Sesiones: vista agenda, no calendario mensual.

## Docencia (escritorio optimizado)
- Tabla de matriculados densa (`body-sm`, `wq-btn--sm`), encabezado fijo, exportar CSV.
- Corrección en dos paneles con atajos de teclado; en tableta la lista de entregas pasa a un select.
- Asistencia: en tableta los botones de 44px permiten marcar con el dedo durante la sesión.
- Por debajo de `bp-md` la tabla se convierte en tarjetas por estudiante.

## Reglas generales
- Nunca desplazamiento horizontal de página; solo dentro de tablas (`wq-table-wrap`) y pestañas.
- Textos de campo a 16px como mínimo en móvil.
- Imágenes y vídeos a ancho de contenedor; la lectura nunca supera `measure`.
