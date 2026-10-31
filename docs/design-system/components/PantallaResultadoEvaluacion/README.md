# Pantalla · Resultado de evaluación (móvil)

Resultado de un intento: nota en anillo, si aprobó, qué falta corregir, desglose por pregunta y repaso de los errores.

## Composición
1. **Resumen**: anillo de 120px con la nota sobre 20 (`success` y `is-complete` si aprueba; `warning` si no llega al mínimo), insignia con el mínimo («Aprobada · mínimo 11»), título, intento, fecha y hora de entrega, tiempo usado.
2. **Pendiente de corrección** (si hay preguntas abiertas): aviso `info` con reloj de arena, explica que la nota puede subir y que se avisará.
3. **Pregunta por pregunta**: lista con número, tema, puntos y `StatusBadge` (Correcta, Incorrecta, Por corregir). Cada fila enlaza a su detalle.
4. **Repaso**: las incorrectas se muestran en `Question` en estado resultado, con enlace a la lección que la explica (solo si la evaluación permite ver respuestas).
5. **Acciones**: «Volver al curso» (primaria) e «Intentar de nuevo (queda 1 intento)» con la regla de nota («Se conserva tu nota más alta»).

## Variantes
- **No aprobada**: anillo y nota en `warning`, insignia «No aprobada · mínimo 11», texto «Te faltaron 2 puntos. Repasa las lecciones 3 y 4 antes de tu próximo intento». Sin rojo: no es un error.
- **Sin intentos**: se oculta «Intentar de nuevo»; se muestra «Usaste los 3 intentos. Tu nota es la más alta: 14/20».
- **Respuestas ocultas**: el desglose muestra solo puntos y estado, sin la opción correcta.

## Reglas
Nada de confeti ni de «¡Excelente!»: la nota y el desglose son la respuesta. En escritorio, resumen y desglose van en dos columnas (360px + resto).
