# Pantalla · Mis cursos (escritorio)

«Mis cursos» en escritorio: shell con navegación agrupada, bloque «Retoma donde lo dejaste», plazos de la semana y cuadrícula de tarjetas de curso.

## Jerarquía
1. Saludo con lo que importa esta semana (una frase, datos reales).
2. **Retoma donde lo dejaste**: anillo del curso + lección exacta + única acción primaria de la página.
3. Plazos próximos (aviso de evaluación, sesión en vivo) — máximo dos.
4. Pestañas En curso / Completados / Todos y cuadrícula de `CourseCard`.

## Reglas
- Una sola acción primaria (`brand`) en la página; las tarjetas usan secundaria salvo la del curso que se retoma.
- Orden de tarjetas: plazo más próximo primero; completados al final.
- Vacío: EmptyState «Aún no tienes cursos» con «Explorar el catálogo».
