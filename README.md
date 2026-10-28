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

Los mensajes de commit siguen Conventional Commits (lo comprueba commitlint al hacer commit).
