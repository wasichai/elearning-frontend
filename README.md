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
(`src/modules/catalog/test/fixtures.ts`, los mismos de las pruebas unitarias) y filtra como el servidor. El servidor web lo
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

Los mensajes de commit siguen Conventional Commits (lo comprueba commitlint al hacer commit).
