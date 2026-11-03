import { expect, test } from '@playwright/test'
import { fakeApi, type FakeApiOptions } from './api'
import { horizontalOverflow } from './overflow'

// a 360 px, ninguna pantalla principal obliga a desplazarse en horizontal (4-responsive.md). no depende de capturas, así que corre en
// `yarn e2e` y en CI, a diferencia de e2e/visual. un título de texto real basta para saber que la pantalla ya pintó su contenido

const OFFERING = '/docencia/edicion-sgspe-2026-09'
const student: FakeApiOptions = { signedIn: true }
const teacher: FakeApiOptions = { signedIn: true, as: 'teacher' }
const creator: FakeApiOptions = { signedIn: true, as: 'creator' }
const reviewer: FakeApiOptions = { signedIn: true, as: 'reviewer' }

const SCREENS: { name: string; path: string; api?: FakeApiOptions }[] = [
  { name: 'catálogo', path: '/cursos' },
  { name: 'ficha del curso', path: '/cursos/srtm-anuncios' },
  { name: 'verificar un certificado', path: '/certificados' },
  { name: 'certificado', path: '/certificados/K7Q2-M9XW-4RTB', api: { certificateIssued: true } },
  { name: 'panel del estudiante', path: '/mis-cursos', api: student },
  { name: 'lección', path: '/mis-cursos/mat-srtm-1?leccion=lec-html', api: student },
  { name: 'evaluación', path: '/mis-cursos/mat-sgspe-1?leccion=lec-eva', api: student },
  { name: 'sesiones del estudiante', path: '/mis-cursos/mat-sgspe-1/sesiones', api: student },
  { name: 'finalización', path: '/mis-cursos/mat-sgspe-1/finalizacion', api: { ...student, courseComplete: true } },
  { name: 'panel docente', path: '/docencia', api: teacher },
  { name: 'matriculados', path: OFFERING, api: teacher },
  { name: 'cola de corrección', path: `${OFFERING}/correccion`, api: teacher },
  { name: 'corrección de un intento', path: `${OFFERING}/correccion/int-1`, api: teacher },
  { name: 'sesiones de la edición', path: `${OFFERING}/sesiones`, api: teacher },
  { name: 'asistencia', path: `${OFFERING}/sesiones/ses-1/asistencia`, api: teacher },
  { name: 'estudio', path: '/estudio', api: creator },
  { name: 'borrador', path: '/estudio/versiones/a1b2c3d4-0000-4000-8000-000000000002', api: creator },
  { name: 'importación', path: '/estudio/importar', api: creator },
  { name: 'bandeja de revisión', path: '/revision', api: reviewer },
  { name: 'revisión de una versión', path: '/revision/ver-sgspe-2', api: reviewer }
]

test.use({ viewport: { width: 360, height: 740 } })

for (const { name, path, api } of SCREENS) {
  test(`a 360 px no desborda: ${name}`, async ({ page }) => {
    await fakeApi(page, api ?? {})
    await page.goto(path)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await page.waitForLoadState('networkidle')

    const overflow = await horizontalOverflow(page)
    expect(overflow.wider).toEqual([])
    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth)
    expect(overflow.mainScrollWidth).toBeLessThanOrEqual(overflow.mainClientWidth)
  })
}
