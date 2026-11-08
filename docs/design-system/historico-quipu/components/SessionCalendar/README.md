# SessionCalendar

Calendario mensual y agenda de sesiones en vivo, con estados programada, en vivo, realizada, reprogramada y cancelada.

## Vistas
- **Mes** (escritorio docente): cuadrícula de 7 columnas; hoy con círculo `brand`; cada sesión es un chip con hora y título.
- **Agenda** (móvil y estudiante): lista por fecha con acción directa («Unirme», «Ver grabación»).

## Estados de sesión
Programada (`info-soft`) · En vivo (`danger-soft` + insignia «En vivo ahora» con punto latiendo) · Realizada (`success-soft`) · Reprogramada (`warning-soft` + fecha anterior y motivo) · Cancelada (contorno discontinuo + texto tachado + palabra «Cancelada»).

## Acciones docentes
Programar (formulario: fecha, hora, duración, enlace), Reprogramar (pide nueva fecha y **motivo**), Cancelar (`Dialog` destructivo con motivo). Ambas notifican a los matriculados.

## Reglas
Todas las horas en America/Lima con la etiqueta «Hora de Lima (UTC−5)» visible. Formato 24 h. Semana empieza en lunes.
