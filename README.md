# elearning-frontend

Interfaz web de wasichai-learning, una plataforma e-learning open source sobre [Wasichai](https://github.com/wasichai/wasichai).
Es una aplicación React que monta los paquetes `@wasichai/*`; el servidor está en
[elearning-backend](https://github.com/wasichai/elearning-backend), junto con
[toda la documentación del proyecto](https://github.com/wasichai/elearning-backend/tree/main/docs).

## Requisitos

- Node 26 (`.node-version`) y Yarn 1.
- Un token de GitHub con `read:packages` para instalar `@wasichai/*` desde GitHub Packages. Va en tu `~/.npmrc`,
  nunca en el repositorio:

  ```
  //npm.pkg.github.com/:_authToken=<token>
  ```

  Con la CLI de GitHub: `echo "//npm.pkg.github.com/:_authToken=$(gh auth token)" >> ~/.npmrc` (el token de `gh` debe
  tener el alcance `read:packages`: `gh auth refresh -s read:packages`).

## Puesta en marcha

```bash
yarn install
yarn dev            # http://localhost:5180
```

`yarn dev` envía `/api` al backend (`http://localhost:8090` por defecto; otro con `WASICHAI_API_URL`). Para arrancar
el backend, sigue su [README](https://github.com/wasichai/elearning-backend#readme). Con el backend en el perfil `dev`,
el login propone el administrador de la semilla de Wasichai (`admin@wasichai.local`).

Variables (opcionales; copia `.env.example` a `.env` o expórtalas en tu shell):

| Variable           | Para qué                                                                    | Por defecto             |
| ------------------ | --------------------------------------------------------------------------- | ----------------------- |
| `VITE_APP_NAME`    | Nombre visible del producto; se fija al compilar                            | `wasichai-learning`     |
| `WASICHAI_API_URL` | Backend al que `yarn dev` y `yarn preview` envían `/api`; no entra al build | `http://localhost:8090` |

## Estructura

La aplicación es una sola `<WasichaiApp>` de `@wasichai/core` (sin router propio): `src/config.ts` arma su
configuración, `src/modules.ts` lista los módulos y `src/index.css` carga Tailwind con el tema de `@wasichai/ui`.

| Módulo                   | Qué es                                                                                            |
| ------------------------ | ------------------------------------------------------------------------------------------------- |
| `src/modules/catalog/`   | Catálogo público (`/cursos`, `/cursos/:slug`), sin sesión                                         |
| `src/modules/classroom/` | Aula del estudiante (`/mis-cursos`, `/mis-cursos/:enrollmentId`), con sesión, grupo «Aprendizaje» |

Un módulo no importa a otro: se enlazan por clave de ruta (`'catalog:courses'`). Lo que comparten (piezas del contrato,
formato de fechas, estado de error) vive en `src/shared/`, y las comprobaciones de frontera en `src/test/boundaries.ts`.

## Comandos

| Comando          | Qué hace                                             |
| ---------------- | ---------------------------------------------------- |
| `yarn dev`       | Servidor de desarrollo en el puerto 5180             |
| `yarn lint`      | Formato (Prettier) y tipos (TypeScript)              |
| `yarn typecheck` | Solo tipos                                           |
| `yarn test`      | Pruebas con Vitest                                   |
| `yarn e2e`       | Pruebas extremo a extremo (Playwright, API simulada) |
| `yarn e2e:real`  | Humo extremo a extremo contra el backend de verdad   |
| `yarn build`     | Tipos y build de producción en `dist/`               |
| `yarn preview`   | Sirve `dist/` en el puerto 5180, con el mismo proxy  |
| `yarn format`    | Formatea todo con Prettier                           |

## Pruebas extremo a extremo

`yarn e2e` recorre la build de producción en Chromium (Playwright), con el idioma `es-PE` y la zona `America/Lima`. No
necesita backend: `e2e/api.ts` contesta `/api/**` dentro del navegador con los ejemplos del contrato
(`src/modules/*/test/fixtures.ts`, los mismos de las pruebas unitarias) y filtra como el servidor. Las pruebas del aula
entran con una sesión de estudiante simulada (`fakeApi(page, { signedIn: true })`), y el aula guarda su progreso en la
prueba, así una recarga lo conserva como el servidor. El servidor web lo
arranca Playwright (`yarn build && yarn preview`, puerto 5180); en local reutiliza un `yarn preview` que ya esté abierto,
que sirve `dist/` del disco: si lo reutilizas, haz antes `yarn build`.

La primera vez, instala el navegador: `npx playwright install chromium` (en Linux, `--with-deps` también instala las
librerías del sistema). Si una prueba falla, `npx playwright show-trace test-results/<prueba>/trace.zip` enseña el
recorrido paso a paso.

### Humo contra el backend real

`yarn e2e:real` (que pone `E2E_REAL=1`; `yarn e2e` nunca las corre) ejecuta solo `e2e/real/`: sin simular nada, contra el
backend al que `vite preview` envía `/api` (`WASICHAI_API_URL`, por defecto `http://localhost:8090`). Comprueba que el
catálogo muestra los tres cursos publicados de los datos de demostración y no el borrador, que cada ficha cumple el
contrato de la interfaz, que la del curso de IA da 216 h y créditos ECTS propuestos, que un slug inexistente es «Curso
no encontrado» y que un `POST` anónimo a la ruta pública responde 401.

Y los recorridos del aula (`e2e/real/classroom.spec.ts`): un estudiante nuevo —lo crea en cada ejecución el
administrador del perfil dev (`WASICHAI_EMAIL`/`WASICHAI_PASSWORD`, por defecto los de la semilla)— inicia sesión, se
matricula desde la ficha de SRTM, abre la lectura en el `iframe` aislado, la completa y la sigue viendo completada al
recargar; baja la guía PDF y termina el vídeo, que completa su lección. Con `WASICHAI_DEMO_PASSWORD` comprueba además
que el estudiante demo encuentra su curso en «Mis cursos». En CI corren en el trabajo `e2e-real`, contra el `main` de
`elearning-backend`.

Antes, el backend tiene que estar en marcha en el perfil `dev` y con los datos de demostración aplicados: sigue
[la puesta en marcha del backend](https://github.com/wasichai/elearning-backend/blob/main/docs/development/getting-started.md)
(`elearning-backend/docs/development/getting-started.md`) hasta `python3 model/apply.py --demo`. El catálogo público se
lee de una proyección que se refresca cada 30 s: tras aplicar los datos, espera ese tiempo. Si el backend no contesta,
la prueba lo dice antes de abrir el navegador.

```bash
yarn e2e:real                                          # backend en http://localhost:8090
WASICHAI_API_URL=http://localhost:8091 yarn e2e:real   # otro backend
```

Si reutilizas un `yarn preview` ya abierto, su proxy apunta al backend con el que se arrancó, no al de `WASICHAI_API_URL`.

## Limitaciones

- **Volver tras el inicio de sesión**: no lo ofrece `@wasichai/core` 1.3.0 (`LoginPage` lleva siempre al inicio y
  `AuthGate` no recuerda de dónde se venía); pendiente en wasichai-ui. Mientras tanto, en la ficha de un curso el botón
  dice «Inicia sesión para matricularte» y lleva al inicio de sesión de Wasichai; después, la persona vuelve al catálogo
  por su cuenta. No hay puente local (regla 7 de `CLAUDE.md`).
- **El menú del shell en el móvil**: el panel lateral de `@wasichai/core` no se pliega en pantallas estrechas. Las
  páginas del aula caben en el espacio que deja (lo prueba `e2e/classroom.spec.ts`), pero el plegado es de core.

## Integración continua

`.github/workflows/ci.yml` corre en cada `push` a `main` y en cada PR, con Node 26 (`.node-version`): `yarn install
--frozen-lockfile`, `yarn lint`, `yarn typecheck`, `yarn test`, `yarn build` y `yarn e2e` (Chromium instalado con
`npx playwright install --with-deps chromium`; si falla, las trazas quedan como artefacto `playwright`). En los PR, el
trabajo `commits` pasa commitlint por todos los commits del PR. El humo contra el backend real no corre en CI.

El flujo solo pide `contents: read` y `packages: read`. Para instalar `@wasichai/*` de GitHub Packages necesita un token
que pueda leerlos; hay dos maneras:

- **Secreto `PACKAGES_TOKEN`** (Settings → Secrets and variables → Actions → New repository secret): un token personal
  (_classic_) con solo el permiso `read:packages`, de una cuenta que pueda leer los paquetes de `wasichai`. Caduca: pon
  una fecha y renuévalo.
- **Acceso de Actions a los paquetes**: en la organización, en la configuración de cada paquete `@wasichai/*`
  (`core`, `ui`, `testing`; Package settings → Manage Actions access), añade `elearning-frontend` con el rol _Read_.
  Entonces basta el token del propio flujo (`GITHUB_TOKEN`) y no hace falta el secreto: si `PACKAGES_TOKEN` no existe,
  el flujo usa ese.

Un `401`/`403` en `yarn install` significa que ninguno de los dos está en su sitio.

Los mensajes de commit siguen Conventional Commits (lo comprueba commitlint al hacer commit y, en los PR, la CI).

## Licencia

[LGPL-3.0-or-later](LICENSE), provisional
([ADR-0015](https://github.com/wasichai/elearning-backend/blob/main/docs/adr/0015-licencia-lgpl-provisional.md)). Cubre
este repositorio; `@wasichai/*`, de los que depende, aún no tienen licencia
([docs/legal/licensing.md](https://github.com/wasichai/elearning-backend/blob/main/docs/legal/licensing.md)).
