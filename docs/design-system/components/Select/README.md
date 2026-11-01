# Select

Selector de una opción: `select` nativo estilizado por defecto y lista personalizada (`wq-menu`) cuando las opciones llevan icono o estado.

## Cuándo usarlo
- Nativo (`wq-select` dentro de `wq-select-wrap`): formularios, móvil. Es el más accesible; úsalo salvo que necesites iconos.
- Personalizado (`wq-menu` + `role="listbox"`): filtros de la tabla docente con iconos de estado.
- Menos de 5 opciones visibles a la vez → usa casillas de opción (`wq-choice`) en lugar de select.

## Estados
Hover, foco, abierto (`elevation-2`), opción activa por teclado (`is-active`), elegida (`aria-selected="true"`, `brand` + check), opción deshabilitada (`aria-disabled`), error y deshabilitado como en Field.

## Qué aporta quien lo usa
Etiqueta, opciones con texto completo, placeholder en forma de instrucción («Elige un motivo»). En el personalizado: navegación con flechas, Enter, Esc y escritura para saltar.
