# wasichai-learning — frontend (`elearning-frontend`)

Interfaz web de wasichai-learning, una plataforma e-learning open source construida **sobre Wasichai**: esta aplicación
consume los paquetes `@wasichai/*` de [wasichai/wasichai-ui](https://github.com/wasichai/wasichai-ui) y no reimplementa
nada de lo que ya ofrecen (login, administración, metadatos, formularios, auditoría, tema).

**La documentación del producto vive en el backend**:
[elearning-backend/docs](https://github.com/wasichai/elearning-backend/tree/main/docs) (requisitos, arquitectura, ADR,
seguridad, operación, hoja de ruta). Léela antes de cambiar comportamiento; las decisiones de este repositorio también
son ADR de allí (en especial [ADR-0005](https://github.com/wasichai/elearning-backend/blob/main/docs/adr/0005-lms-en-el-registro-de-wasichai-ui.md)).

## Stack (no negociable sin ADR nuevo)

React 19.3, Vite 8, TypeScript 7, Tailwind CSS 4, react-router 8, TanStack Query 5, i18next; Vitest 5 + Testing
Library + jsdom. Node 26 (`.node-version`), Yarn 1. `@wasichai/core`, `@wasichai/ui` y `@wasichai/testing` desde
GitHub Packages, **fijados a la misma versión exacta** (dependen entre sí a versión exacta).

## Reglas

1. **Toda pantalla del LMS es un `WasichaiModule`** registrado en la única `<WasichaiApp config modules />` de
   `src/main.tsx` (ADR-0005). Rutas, menú, i18n y _slots_ se declaran en el módulo; `createRegistry` los valida.
2. **Sin segundo router ni segunda librería visual.** Nada de `createBrowserRouter`, `<BrowserRouter>` ni otro kit de
   componentes: el router lo pone `WasichaiApp`, los componentes vienen de `@wasichai/ui` y el estilo de Tailwind con
   los tokens de su tema.
3. **Enlaces con `useWasichaiLinks()`**, por clave de ruta (`'<módulo>:<ruta>'`). **Sin URLs literales** en el código:
   ni rutas de pantalla ni de la API (la API se llama con el cliente de `@wasichai/core`, relativo a `apiBaseUrl`).
4. **Los permisos en la UI son cortesía; decide el servidor.** Ocultar un menú o un botón según
   `GET /auth/me/permissions` está bien, pero nunca sustituye la comprobación del backend. Nunca se compara un nombre
   de rol.
5. **Español e inglés**, con i18n por módulo (`WasichaiModule.i18n`, espacio de nombres = id del módulo). Ningún texto
   visible escrito a mano en un componente.
6. **El nombre del producto sale de `VITE_APP_NAME`** (`config.appName`), nunca del código.
7. **Wasichai primero**: lo que falte en `@wasichai/*` se pide allí con este proyecto como segundo usuario concreto,
   no se parchea aquí. Sin clases ni rutas internas de los paquetes, solo su API pública.
8. **Sin sobreingeniería**: una abstracción necesita un segundo usuario concreto; cada dependencia, un requisito.

## Trabajo

- Código y nombres técnicos en inglés; documentos, comentarios y mensajes de commit en español.
- `.editorconfig` es ley (160 columnas, LF). `yarn format` antes de commitear.
- Conventional Commits (commitlint en el _hook_ `commit-msg`). Un issue y un PR por paso; el PR cierra su issue.
- TDD: la prueba que falla primero.
- El token de GitHub Packages va en `~/.npmrc`, **nunca** en el repositorio (el `.npmrc` de aquí solo nombra el registro).

## Comandos

```bash
yarn install
yarn dev                     # http://localhost:5180, /api -> WASICHAI_API_URL (http://localhost:8090)
yarn lint                    # prettier --check + tsc
yarn typecheck
yarn test                    # vitest run
yarn build && yarn preview
```

## Definition of Done

Funciona · tiene pruebas del comportamiento nuevo · maneja errores · permisos en el servidor · sin secretos · textos en
es y en · documentado · `yarn lint && yarn typecheck && yarn test && yarn build` en verde, **ejecutados de verdad**.
