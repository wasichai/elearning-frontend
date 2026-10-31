# SideNav

Navegación lateral del shell con grupos «Aprendizaje» y «Docencia»; fija en escritorio y cajón plegable en móvil.

## Anatomía
Marca (cordón con tres nudos + «wasichai» en Figtree 700) · grupos con etiqueta `caption` · ítems de 44px con icono, texto y contador opcional (lecciones pendientes, entregas por corregir).

## Estados
Hover `surface-sunken`; actual `aria-current="page"` con `brand-soft`, icono `brand` y peso 650; foco con anillo.

## Responsive
- ≥`bp-lg` (1024px): columna fija de `sidebar-width`.
- <`bp-lg`: barra superior de 56px con botón menú (`aria-expanded`), el panel entra desde la izquierda con `duration-base`, velo `scrim`; se cierra con Esc, al tocar el velo, al navegar o con el botón «Cerrar menú». El foco va al primer ítem al abrir y vuelve al botón al cerrar. Esto corrige la limitación actual del menú móvil que no se pliega.
- El grupo «Docencia» solo aparece para quien tiene el rol docente.
