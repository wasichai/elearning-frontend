# Syllabus (temario)

Árbol de unidades y lecciones que también es un quipu vertical: el hilo baja por la unidad y cada lección es un nudo.

## Anatomía
Unidad (`details`/`summary`, 52px) con contador «2/5» → lista de lecciones (48px) con nudo de estado, título, tipo con icono (lectura, vídeo, PDF, presentación, evaluación, sesión) y duración o dato clave.

## Estados de lección
- Actual: `aria-current="page"`, fondo `brand-soft`, nudo en curso.
- Completada, en curso, pendiente, vencida (texto `danger` + icono), pendiente de corrección.
- Bloqueada (`is-locked`): candado + **cuándo** se abre («Se abre lun 9»), nunca solo gris.

## Qué aporta quien lo usa
Unidades con lecciones ordenadas, tipo, duración, estado y fecha de apertura. Abre por defecto solo la unidad que contiene la lección actual.

## Reglas
- Escritorio: panel lateral fijo de `syllabus-width` a la izquierda del visor. Móvil: hoja inferior desde el botón «Temario».
- El estado viaja en texto para lectores de pantalla (`.wq-sr`), no solo en el nudo.
- No uses bordes de color a la izquierda para marcar la lección actual: el fondo y el nudo bastan.
