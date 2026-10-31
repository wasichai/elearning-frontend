# CourseCard

Tarjeta de curso para «Mis cursos» y el catálogo: banda de cordones, datos académicos, avance y una acción.

## Variantes
- **Matriculado en curso**: quipu del curso + cifra + aviso del próximo plazo; acción «Continuar».
- **Completado** (`is-done`): banda en `maiz-soft`, nota final, insignia «Certificado».
- **Vencido** (`is-overdue`): banda en `danger-soft` + insignia «Vencido».
- **Catálogo**: banda neutra, resumen de 1–2 líneas, horas, créditos ECTS, ediciones, cupos; acción «Matricularme».
- **Cargando**: esqueleto con la misma geometría (`aria-busy="true"`).

## Qué aporta quien lo usa
Área y edición (kicker), título (enlace; toda la tarjeta es clicable vía `::after`), horas, créditos ECTS, nº de sesiones, estado de avance real, el plazo más próximo y la acción. La banda se genera con una semilla del `slug` para que cada curso tenga su propio patrón estable.

## Reglas
- Una sola acción visible; el resto en la ficha.
- Unidades en español: «40 horas», «3 ECTS», fechas «vie 13 nov».
- Cuadrícula: 1 columna en móvil, 2 desde `bp-md`, 3 desde `bp-xl`.
