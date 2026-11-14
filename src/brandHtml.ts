import { appLogoUrl, appName, type BrandEnv } from './brand'

const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// el index.html con la marca del despliegue: el título de la pestaña antes de que cargue la app (después lo sincroniza core) y,
// con logo, el icono. lo aplica vite.config.ts al servir y al compilar
export function brandHtml(html: string, env: BrandEnv): string {
  const logo = appLogoUrl(env)
  const titled = html.replace(/<title>[^<]*<\/title>/, `<title>${escape(appName(env))}</title>`)
  return logo ? titled.replace('</head>', `<link rel="icon" href="${escape(logo)}" />\n</head>`) : titled
}
