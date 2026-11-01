# Prompt para Claude Code: tema Quipu sobre @wasichai/ui

Copia el bloque en Claude Code, abierto en `elearning-frontend` (con `../wasichai-ui` y `../wasichai` al lado).

```text
Implementa el sistema de diseño «Quipu» en elearning-frontend como tema de app sobre @wasichai/ui.

Lee primero, en este orden:
1. CLAUDE.md de este repo (reglas no negociables: un WasichaiModule por pantalla, sin otra librería visual, textos por
   i18n en es y en, Wasichai primero, sin sobreingeniería, TDD, Definition of Done, un issue y un PR por paso).
2. docs/design-system/README.md y sus secciones (1-voz-y-tono.md … 5-direcciones-exploradas.md), tokens.json y las
   guías components/*/README.md. Es la referencia de diseño; sus vistas previas (preview.html) se ven en el artifact.
   Ojo: su sección de Tailwind es de Tailwind 3; aquí manda Tailwind 4 y el contrato de temas de @wasichai/ui.
3. ../wasichai-ui/packages/ui/README.md («Theme tokens», «Styling hooks (data-slot)», los temas opcionales) y
   ../wasichai-ui/packages/ui/src/themes/ant-design/ como modelo de hoja de tema con partials y pruebas.
4. ../wasichai-ui/packages/core/README.md, «Themes and preferences».

Estado actual (sin commitear, revísalo antes de seguir):
- src/theme/quipu.css: temas `quipu` y `quipu-dark` con los tokens de @wasichai/ui; src/theme/themes.ts los define;
  src/config.ts los ofrece (themes + systemThemes); index.html tiene el script de arranque; src/index.css importa el
  tema y declara Figtree (src/theme/fonts, OFL); etiquetas en classroom:theme.*; src/theme/quipu.test.ts comprueba
  tokens completos y contraste AA. README.md tiene la sección «Tema».
- src/modules/classroom/reading.ts: lockedReading(html, palette) añade, tras la CSP, un <style data-reading> con la
  tipografía de lectura larga en :where() (el autor siempre gana) y los colores del tema; Resources.tsx observa
  data-theme en <html> y le pasa la paleta; el iframe usa bg-surface. Pruebas nuevas en reading.test.ts.

Pasos (cada uno: issue, rama, prueba que falla primero, PR que cierra el issue):
0. Ejecuta yarn format && yarn lint && yarn typecheck && yarn test && yarn build, corrige lo que falle y separa el
   estado actual en dos PR: «feat: tema Quipu» y «feat: la lectura HTML con la tipografía y los colores del tema».
   Revisa en el navegador (yarn dev) claro, oscuro y el cambio de tema con una lectura abierta.
1. Hoja de controles: src/theme/quipu-controls.css, en @scope de los dos temas Quipu y sin entrar en un subárbol con
   otro tema, solo sobre los data-slot públicos: botones md e icon de 44px, sm de 36px con área táctil de 44px,
   texto 15px/600; campos (input, textarea, select-trigger) de 44px y texto de 16px, inválidos con borde danger de 2px
   sin saltar; deshabilitados con cursor not-allowed; pestañas de 44px con subrayado brand; alertas con radius-lg.
   Pruebas como themes/antDesign.test.ts: cada regla está en el scope y solo toca hooks.
2. Modo lectura: tema `quipu-lectura` (papel sepia, mismos pares AA; valores en docs/design-system/tokens.json, tema
   «lectura») aplicado como subárbol con data-theme en el contenedor de la lección, con un botón de alternar y A−/A+
   (17–23px) en la barra de la lección; la preferencia se guarda con el storagePrefix; la paleta llega al iframe.
   Textos en es y en; pruebas de comportamiento.
3. Letra de lectura: Literata (OFL, como Figtree) para enunciados de preguntas, respuestas en la corrección y el
   certificado (variable --font-read en @theme). Dentro del iframe la CSP no deja cargar fuentes: no la cambies sin
   un ADR en elearning-backend (font-src data: con la fuente incrustada es la opción a valorar).
4. Componentes de Quipu solo cuando una pantalla los necesite (regla 8), uno por PR: el progreso en nudos (círculo
   lección, rombo evaluación, doble anillo sesión; siempre con su texto) en Mis cursos y en UnitNav; las insignias de
   estado de aprendizaje con icono y palabra sobre Badge; la finalización con el sello de maíz (una animación, respeta
   prefers-reduced-motion); el certificado en A4 horizontal fijado al tema claro.
5. Lo que falte en Wasichai se pide allí (issue en wasichai-ui con este proyecto como segundo usuario), no se parchea:
   textos de app para las etiquetas de tema (hoy en classroom:theme.*), data-slot en los ítems del menú del shell
   (para llevarlos a 44px), el menú lateral que se pliega en móvil.
6. Propón el ADR «Sistema de diseño Quipu» en elearning-backend/docs/adr con lo decidido (tema de app, hoja de
   controles, modo lectura, fuentes servidas por la app).

Criterios en todo: WCAG 2.2 AA en los temas Quipu (texto 4,5:1, bordes y foco 3:1), el color nunca como único
indicador, objetivos de 44px, móvil primero en el aula y escritorio en docencia, voz y tono de 1-voz-y-tono.md.
Al terminar cada paso, di qué quedó hecho, qué comprobaste de verdad y qué queda.
```
