# Sistema de diseño Quipu

Copia en el repositorio del sistema de diseño de wasichai-learning, publicado como artifact de Claude
(«Quipu», tipo Design System). Es la referencia de diseño: el código de la app no lo importa.

- `README.md` (este archivo): principios, fundamentos visuales, iconografía y Tailwind.
- `1-voz-y-tono.md` … `5-direcciones-exploradas.md`: voz y tono, patrones de pantalla, accesibilidad, responsive y
  las direcciones descartadas.
- `tokens.json`: los tokens (fuente de verdad); `tokens.css`, su versión en variables CSS con los temas `light`,
  `dark` y `lectura`.
- `components/<Componente>/README.md`: guía de uso; `preview.html`: vista previa que el artifact pinta con
  `tokens.css` y `components/bundle.css` precargados (abierta suelta, sale sin estilo).
- `components/Pantalla*/`: pantallas de ejemplo (Mis cursos, lección, certificado, ficha de curso, resultado…).
- `assets/Logos/`: la marca propuesta.

Cómo se traduce al tema de la app (`src/theme/`) y qué falta: `PROMPT-claude-code.md`.

> Nota: `README.md` de la sección «Tailwind y @wasichai/ui» muestra una configuración de Tailwind 3; la app usa
> Tailwind 4 y el contrato de temas de `@wasichai/ui` (`[data-theme]` + tokens), que es lo que manda.

---

**Quipu** es el sistema de diseño de wasichai-learning: un lugar de estudio cuidado donde el progreso se cuenta como en un quipu andino, nudo a nudo. Papel cálido para leer largo rato, tinta grafito, terracota para avanzar, maíz para celebrar y musgo para lo completado.

> Cada nudo cuenta. Mostramos el avance real, sin inflarlo y sin juegos.

Los tokens viven en `tokens.json` y se publican como variables CSS (`var(--brand)`, `var(--space-4)`…), listas para el tema de Tailwind de `@wasichai/ui` (ver «Tailwind y @wasichai/ui»). Los componentes son clases `wq-*` en `components/bundle.css`.

## Principios

### 1. La lectura manda
El aula existe para leer, ver y pensar. La interfaz se retira cuando empieza el contenido.
- En la lección, oculta la navegación global; deja solo ruta, herramientas de lectura y «siguiente».
- Pon el cuerpo en `read-body` (Literata 19/32) a `measure` (68ch). Nunca a ancho completo.
- Ofrece el tema `lectura` (papel sepia) con un toque; se recuerda por estudiante.

### 2. Progreso honesto, siempre visible
El estudiante siempre sabe dónde está, cuánto le falta y qué vence.
- Cada curso muestra su **quipu**: un nudo por lección, evaluación o sesión, con su estado real.
- Cifras exactas («5 de 8 lecciones»), nunca redondeadas hacia arriba. Sin rachas, puntos, rankings ni insignias de vanidad.
- Los plazos llevan día de la semana, fecha y hora de Lima: «vie 13 nov, 23:59».

### 3. Calma por defecto, celebración contenida
Superficies cálidas y quietas para sesiones largas; la energía se guarda para los logros.
- `maiz` y `wq-btn--celebrate` solo aparecen al completar un curso y en el certificado.
- Una sola animación de celebración (`duration-celebrate`, el sello que se anuda), una vez y nunca en bucle.
- Nada parpadea; los avisos de plazo usan `warning`, no rojo, hasta que algo vence.

### 4. Una acción clara por pantalla
- Una sola `wq-btn--primary` visible por vista: «Continuar lección 5», «Entregar», «Guardar y pasar al siguiente».
- Lo destructivo nunca está a un clic: pasa por `Dialog` con motivo y botón `wq-btn--danger` con el verbo exacto.

### 5. El estado nunca es solo un color
- Cada estado combina forma, icono y palabra: insignias, nudos (círculo = lección, rombo = evaluación, doble anillo = sesión), asistencia.
- Contraste AA en los tres temas; foco visible siempre; objetivos de 44px.

### 6. Hecho aquí, para aquí
Español del Perú, hora de Lima, notas sobre 20, créditos ECTS, soles. La raíz andina está en la idea —contar con nudos— y en una paleta de tintes naturales, no en grecas ni en motivos decorativos.

## Fundamentos visuales

### Color
La paleta sale de los tintes naturales de los quipus: algodón crudo, nogal, cochinilla atenuada a terracota, maíz y musgo.

| Rol | Tokens | Regla |
|---|---|---|
| Superficies | `bg`, `surface`, `surface-sunken`, `surface-inverse` | `bg` es el papel de la página; `surface` eleva tarjetas, diálogos y campos; `surface-sunken` hunde pistas, temario y cabeceras de tabla. |
| Tinta | `ink`, `ink-muted`, `ink-inverse` | `ink` para texto; `ink-muted` para metadatos (horas, créditos, fechas). Ambos ≥4,5:1 sobre las tres superficies. |
| Hilos | `line`, `line-strong` | `line` separa (decorativo); `line-strong` dibuja controles y el cordón del quipu (≥3:1). |
| Marca | `brand`, `brand-hover`, `brand-soft`, `on-brand` | Terracota: avanzar, lo actual, la selección. Nunca para errores. |
| Logro | `maiz`, `maiz-soft`, `maiz-ink`, `on-maiz` | Solo finalización y certificado. `maiz` es relleno; el texto de logro va en `maiz-ink`. |
| Semánticos | `success`, `warning`, `danger`, `info` + `-soft` | Texto/icono en el tono fuerte sobre `bg`, `surface` o su `-soft`. `danger` es carmín, distinto de la terracota, y siempre lleva icono. |
| Aprendizaje | `state-todo`, `state-active`, `state-done`, `state-overdue`, `state-review` + `-soft` | Alias de los anteriores: no iniciado (gris), en curso (terracota), completado (musgo), vencido (carmín), pendiente de corrección (azul). |
| Foco | `focus` | Azul que no compite con la marca: 2px sólido, 2px de separación. |
| Velo | `scrim` | Detrás de diálogos y del cajón móvil. |

Proporción: 80 % papel y tinta, 15 % hilos y neutros, 5 % color. Si una pantalla tiene más de un bloque terracota grande, sobra uno.

### Temas
- **Claro** (`light`): por defecto.
- **Oscuro** (`dark`): grafito profundo (`bg` #131719), tinta crema; la marca se aclara a `#e58a63` y lleva texto oscuro (`on-brand`). Sigue `prefers-color-scheme` salvo elección explícita.
- **Lectura** (`lectura`): papel sepia y tinta cálida para lecciones largas. Se aplica con `data-theme="lectura"` en el contenedor de la lección (y en el iframe); el resto del shell no cambia.
- El certificado y el reproductor fijan su tema (`data-theme="light"` y `"dark"`) para verse igual en cualquier modo.

### Tipografía
Dos familias con papeles separados y archivos incluidos en `fonts/` (SIL OFL):
- **Figtree** (`font-ui`): interfaz. Geométrica, cálida y muy legible a 14–16px; cifras tabulares (`wq-tnum`) en notas, tiempos y tablas.
- **Literata** (`font-read`): lectura larga, enunciados de preguntas, respuestas de estudiantes y certificado. Diseñada para pantalla, con eje óptico.
- **JetBrains Mono** (`font-mono`): códigos de certificado.

Escala de interfaz: `display` 40/44 · `title-1` 30/36 · `title-2` 23/30 · `title-3` 18/26 · `body` 16/24 · `body-sm` 14/20 · `label` 14/20 600 · `caption` 12/16 600 · `numeral` 28/32.
Escala de lectura: `read-title` 36/44 · `read-h2` 26/34 · `read-h3` 21/30 · `read-body` 19/32 · `read-body-sm` 17/28 · `read-quote` 21/34 itálica.

Reglas: medida de lectura 60–72 caracteres (`measure`); en móvil `read-body` baja a 18/30 y `read-title` a 28/36; separa párrafos con 1,1em, no con sangría; mayúscula inicial en todos los títulos y botones; versalitas espaciadas solo en el antetítulo del certificado.

### Espaciado y composición
Base de 4px: `space-1` 4 · `space-2` 8 · `space-3` 12 · `space-4` 16 · `space-5` 20 · `space-6` 24 · `space-8` 32 · `space-10` 40 · `space-12` 48 · `space-16` 64.
- Margen lateral: `space-4` en móvil, `space-6` en tableta, `space-8` en escritorio.
- Relleno de tarjeta `space-5`; de diálogo `space-6`; antes de cada `read-h2`, `space-12`.
- Shell: navegación de `sidebar-width` (272px); lección con temario de `syllabus-width` (320px).

### Radios
`radius-xs` 4 (insignias, nudos de evaluación) · `radius-sm` 6 (campos) · `radius-md` 10 (botones, tarjetas, avisos) · `radius-lg` 16 (diálogos, visor) · `radius-full` (nudos, anillos, avatares). Esquinas suaves, nunca píldoras en botones.

### Elevación
El papel se apila, no flota. `elevation-1` para tarjetas en reposo, `elevation-2` para hover, menús y toasts, `elevation-3` para diálogos y cajón móvil. Separa con `line` antes que con sombra. En oscuro, la elevación sube la superficie (`surface` sobre `bg`) además de la sombra.

### Movimiento
| Token | Valor | Uso |
|---|---|---|
| `duration-instant` | 90ms | Hover, pulsado |
| `duration-quick` | 160ms | Foco, abrir select |
| `duration-base` | 240ms | Diálogos, cajón, expandir unidad |
| `duration-slow` | 420ms | Llenar barra o anillo, anudar un nudo |
| `duration-celebrate` | 900ms | Sello de finalización (una vez) |
| `ease-standard` | cubic-bezier(0.2, 0, 0, 1) | Por defecto |
| `ease-exit` | cubic-bezier(0.4, 0, 1, 1) | Salidas |
| `ease-knot` | cubic-bezier(0.34, 1.4, 0.64, 1) | Solo el nudo que se completa |

Con `prefers-reduced-motion: reduce` todo pasa a instantáneo; diálogos y toasts solo funden en 120ms; el punto «En vivo» y los esqueletos dejan de animarse.

### Estados de interacción
Hover: `surface-sunken` o `brand-hover`. Foco: anillo `focus` en todo lo interactivo, nunca eliminado. Pulsado: baja 1px. Deshabilitado: `surface-sunken` + `ink-muted` y una frase que diga por qué. Cargando: esqueleto con la geometría real o spinner con gerundio («Entregando…»). Vacío: `EmptyState` con cordones. Error: `danger` + icono + qué hacer.

## Iconografía
Trazo de 2px, extremos redondeados, cuadrícula de 24px, a 20px por defecto (`wq-i`), 16 en metadatos (`wq-i--sm`), 24 en visores (`wq-i--lg`). Se aplican como máscaras CSS (`<span class="wq-i wq-i-check">`) y heredan `currentColor`. El juego incluido cubre estados (círculo, medio círculo, check, reloj tachado, reloj de arena), tipos de lección (lectura, vídeo, PDF, presentación, evaluación, en vivo) y acciones. Es un juego propio dibujado al estilo de Lucide; si `@wasichai/ui` ya usa Lucide, sustitúyelos 1:1 por nombre. Sin emojis en la interfaz.

**Marca**: cordón principal con tres cuerdas y nudos en `brand`, `maiz` y `success`, junto a «wasichai» en Figtree 700. Es una propuesta de este sistema (no había logotipo en las fuentes); vive en `assets/Logos`.

## Tailwind y @wasichai/ui
Declara el tema apuntando a las variables, no a los valores, para que claro, oscuro y lectura funcionen con `data-theme`:

```js
// tailwind.config.js (preset de @wasichai/ui)
export default {
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)', surface: { DEFAULT: 'var(--surface)', sunken: 'var(--surface-sunken)', inverse: 'var(--surface-inverse)' },
        ink: { DEFAULT: 'var(--ink)', muted: 'var(--ink-muted)', inverse: 'var(--ink-inverse)' },
        line: { DEFAULT: 'var(--line)', strong: 'var(--line-strong)' },
        brand: { DEFAULT: 'var(--brand)', hover: 'var(--brand-hover)', soft: 'var(--brand-soft)', on: 'var(--on-brand)' },
        maiz: { DEFAULT: 'var(--maiz)', soft: 'var(--maiz-soft)', ink: 'var(--maiz-ink)', on: 'var(--on-maiz)' },
        success: { DEFAULT: 'var(--success)', soft: 'var(--success-soft)' },
        warning: { DEFAULT: 'var(--warning)', soft: 'var(--warning-soft)' },
        danger: { DEFAULT: 'var(--danger)', hover: 'var(--danger-hover)', soft: 'var(--danger-soft)', on: 'var(--on-danger)' },
        info: { DEFAULT: 'var(--info)', soft: 'var(--info-soft)' },
        state: { todo: 'var(--state-todo)', active: 'var(--state-active)', done: 'var(--state-done)', overdue: 'var(--state-overdue)', review: 'var(--state-review)' },
        focus: 'var(--focus)',
      },
      fontFamily: { ui: 'var(--font-ui)', read: 'var(--font-read)', mono: 'var(--font-mono)' },
      spacing: { 1: 'var(--space-1)', 2: 'var(--space-2)', 3: 'var(--space-3)', 4: 'var(--space-4)', 5: 'var(--space-5)', 6: 'var(--space-6)', 8: 'var(--space-8)', 10: 'var(--space-10)', 12: 'var(--space-12)', 16: 'var(--space-16)', target: 'var(--target-min)' },
      borderRadius: { xs: 'var(--radius-xs)', sm: 'var(--radius-sm)', md: 'var(--radius-md)', lg: 'var(--radius-lg)', full: 'var(--radius-full)' },
      boxShadow: { 1: 'var(--elevation-1)', 2: 'var(--elevation-2)', 3: 'var(--elevation-3)' },
      maxWidth: { measure: 'var(--measure)', 'measure-ui': 'var(--measure-ui)' },
      minHeight: { target: 'var(--target-min)' },
      transitionDuration: { instant: '90ms', quick: '160ms', base: '240ms', slow: '420ms' },
      transitionTimingFunction: { standard: 'var(--ease-standard)', exit: 'var(--ease-exit)', knot: 'var(--ease-knot)' },
      screens: { md: '768px', lg: '1024px', xl: '1280px' },
    },
  },
};
```

Las variables las genera `tokens.json` (este sistema publica `tokens.css`); `@wasichai/ui` debe importarlas antes de `@tailwind base`. Usa `motion-safe:` / `motion-reduce:` para las transiciones. El navegador recibe `<meta name="theme-color">` con `bg` del tema activo.
