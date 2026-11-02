import { expect, test } from '@playwright/test'
import { fakeApi } from './api'

// la corrección, las sesiones y la asistencia del docente (ADR-0016) con la API simulada, que guarda el estado como el servidor

const OFFERING = '/docencia/edicion-sgspe-2026-09'

test('recorrido de corrección: cola → intento → bajar la entrega → calificar → el intento da su nota y sale de la cola', async ({ page }) => {
  const api = await fakeApi(page, { signedIn: true, as: 'teacher' })
  await page.goto(OFFERING)
  await page.getByRole('navigation', { name: 'Secciones de la edición' }).getByRole('link', { name: 'Corrección (1)' }).click()
  await expect(page).toHaveURL(`${OFFERING}/correccion`)
  await page.getByRole('link', { name: 'Corregir «Evaluación final» de estudiante@demo.local' }).click()

  await expect(page.getByText('Pendiente de corrección: 2 de 10 puntos por ahora')).toBeVisible()
  await expect(page.getByText('Cita la ordenanza (2 pts)')).toBeVisible()
  await expect(page.getByText('Respuesta correcta: La municipalidad')).toBeVisible()

  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Descargar la entrega liquidacion.pdf' }).click()
  expect((await download).suggestedFilename()).toBe('liquidacion.pdf')
  expect(api.fileRequests).toEqual([{ path: '/api/objects/entrega/records/ent-1/files/archivo', authorization: 'Bearer token-e2e' }])

  const open = page.getByRole('form', { name: 'Calificar 2. Explica cómo se liquida.' })
  await open.getByLabel('Puntos (de 0 a 4)').fill('3')
  await open.getByLabel('Comentario para el estudiante (opcional)').fill('Falta la ordenanza.')
  await open.getByRole('button', { name: 'Guardar la nota' }).click()
  await expect(open.getByText('Nota guardada')).toBeVisible()
  await expect(page.getByText('Pendiente de corrección: 5 de 10 puntos por ahora')).toBeVisible()

  const file = page.getByRole('form', { name: 'Calificar 3. Sube la liquidación.' })
  await file.getByLabel('Puntos (de 0 a 4)').fill('3')
  await file.getByRole('button', { name: 'Guardar la nota' }).click()
  await expect(page.getByText('Corregido: 80 %, aprobado (8 de 10 puntos)')).toBeVisible()

  // cambiar una nota ya puesta exige motivo, y viaja al servidor
  await open.getByLabel('Puntos (de 0 a 4)').fill('4')
  await open.getByRole('button', { name: 'Cambiar la nota' }).click()
  const dialog = page.getByRole('dialog', { name: '¿Cambiar esta nota?' })
  await dialog.getByRole('button', { name: 'Cambiar la nota' }).click()
  await expect(dialog.getByRole('alert')).toBeVisible()
  await dialog.getByRole('textbox').fill('Revisión pedida')
  await dialog.getByRole('button', { name: 'Cambiar la nota' }).click()
  await expect(dialog).toBeHidden()
  await expect(page.getByText('Corregido: 90 %, aprobado (9 de 10 puntos)')).toBeVisible()

  await page.getByRole('link', { name: '← Cola de corrección' }).click()
  await expect(page.getByText('Nada pendiente por corregir')).toBeVisible()
  expect(api.unexpected).toEqual([])
})

test('corregir en lote: la posición, guardar y pasar, y un mensaje claro al terminar la última', async ({ page }) => {
  const api = await fakeApi(page, { signedIn: true, as: 'teacher', secondAttempt: true })
  await page.goto(`${OFFERING}/correccion`)
  await page.getByRole('link', { name: 'Corregir «Evaluación final» de estudiante@demo.local' }).click()
  await expect(page.getByText('1 de 2')).toBeVisible()

  const gradeBoth = async () => {
    await page.getByRole('form', { name: 'Calificar 2. Explica cómo se liquida.' }).getByRole('button', { name: 'Cita la ordenanza (2 pts)' }).click()
    await page.getByRole('form', { name: 'Calificar 3. Sube la liquidación.' }).getByLabel('Puntos (de 0 a 4)').fill('3')
  }
  // la rúbrica suma, y el total a la vista lo adelanta
  await gradeBoth()
  await expect(page.getByRole('form', { name: 'Calificar 2. Explica cómo se liquida.' }).getByLabel('Puntos (de 0 a 4)')).toHaveValue('2')
  await expect(page.getByText('Con lo escrito sin guardar: 7 de 10 puntos')).toBeVisible()

  await page.getByRole('button', { name: 'Guardar y pasar al siguiente' }).click()
  await expect(page).toHaveURL(`${OFFERING}/correccion/int-2`)
  await expect(page.getByText('Estudiante: ana.torres@demo.local')).toBeVisible()
  await expect(page.getByRole('form', { name: 'Calificar 3. Sube la liquidación.' }).getByLabel('Puntos (de 0 a 4)')).toHaveValue('')

  await gradeBoth()
  await page.getByRole('button', { name: 'Guardar y terminar' }).click()
  await expect(page.getByText('Has corregido la última entrega de la cola.')).toBeVisible()
  await page.getByRole('link', { name: 'Volver a la cola' }).click()
  await expect(page.getByText('Nada pendiente por corregir')).toBeVisible()
  expect(api.unexpected).toEqual([])
})

test('salir con cambios sin guardar avisa, y seguir no pierde lo escrito', async ({ page }) => {
  await fakeApi(page, { signedIn: true, as: 'teacher' })
  await page.goto(`${OFFERING}/correccion/int-1`)
  const form = page.getByRole('form', { name: 'Calificar 2. Explica cómo se liquida.' })
  await form.getByLabel('Comentario para el estudiante (opcional)').fill('Falta la ordenanza.')

  await page.getByRole('link', { name: '← Cola de corrección' }).click()
  const dialog = page.getByRole('dialog', { name: '¿Salir sin guardar?' })
  await dialog.getByRole('button', { name: 'Seguir aquí' }).click()
  await expect(page).toHaveURL(`${OFFERING}/correccion/int-1`)
  await expect(form.getByLabel('Comentario para el estudiante (opcional)')).toHaveValue('Falta la ordenanza.')

  await page.getByRole('link', { name: '← Cola de corrección' }).click()
  await dialog.getByRole('button', { name: 'Salir sin guardar' }).click()
  await expect(page).toHaveURL(`${OFFERING}/correccion`)
})

test('un fallo al guardar no pierde lo escrito, y se puede reintentar', async ({ page }) => {
  await fakeApi(page, { signedIn: true, as: 'teacher' })
  await page.goto(`${OFFERING}/correccion/int-1`)
  await page.route('**/api/lms/teaching/attempts/int-1/grades', (route) =>
    route.fulfill({ status: 500, json: { status: 500, title: 'Error', detail: 'fallo' } })
  )
  const open = page.getByRole('form', { name: 'Calificar 2. Explica cómo se liquida.' })
  await open.getByLabel('Puntos (de 0 a 4)').fill('3')
  await open.getByLabel('Comentario para el estudiante (opcional)').fill('Falta la ordenanza.')
  await page.getByRole('form', { name: 'Calificar 3. Sube la liquidación.' }).getByLabel('Puntos (de 0 a 4)').fill('3')

  await page.getByRole('button', { name: 'Guardar y terminar' }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'No se guardó todo' })).toBeVisible()
  await expect(open.getByLabel('Comentario para el estudiante (opcional)')).toHaveValue('Falta la ordenanza.')

  await page.unroute('**/api/lms/teaching/attempts/int-1/grades')
  await page.getByRole('button', { name: 'Guardar y terminar' }).click()
  await expect(page.getByText('Has corregido la última entrega de la cola.')).toBeVisible()
})

test('crear una serie, reprogramar con motivo y cancelar con confirmación', async ({ page }) => {
  const api = await fakeApi(page, { signedIn: true, as: 'teacher' })
  await page.goto(`${OFFERING}/sesiones`)

  await page.getByRole('button', { name: 'Crear sesiones' }).click()
  const form = page.getByRole('form', { name: 'Crear una sesión o una serie' })
  await form.getByLabel('Título').fill('Clase semanal')
  await form.getByRole('combobox', { name: 'Repetición' }).click()
  await page.getByRole('option', { name: 'Días de la semana' }).click()
  await form.getByLabel('Desde').fill('2026-11-16')
  await form.getByLabel('Hasta').fill('2026-11-27')
  await form.getByLabel('Hora local').fill('18:30')
  await form.getByRole('checkbox', { name: 'Lunes' }).check()
  await form.getByRole('checkbox', { name: 'Miércoles' }).check()
  await form.getByRole('button', { name: 'Crear la serie' }).click()

  await expect(page.getByText('Se crearon 4 sesiones.')).toBeVisible()
  const series = page.getByRole('article', { name: 'Clase semanal' })
  await expect(series).toHaveCount(4)
  await expect(series.first()).toContainText('16 de noviembre de 2026, 18:30')

  const first = page.getByRole('article', { name: 'Presentación del curso' })
  await first.getByRole('button', { name: 'Reprogramar «Presentación del curso»' }).click()
  const reschedule = page.getByRole('dialog', { name: 'Reprogramar «Presentación del curso»' })
  await expect(reschedule.getByLabel('Nueva hora local')).toHaveValue('08:00')
  await reschedule.getByLabel('Nueva hora local').fill('10:00')
  await reschedule.getByLabel('Motivo').fill('Cruce de horarios')
  await reschedule.getByRole('button', { name: 'Reprogramar y avisar' }).click()
  await expect(reschedule).toBeHidden()
  await expect(first).toContainText('Reprogramada')
  await expect(first).toContainText('10:00')

  await first.getByRole('button', { name: 'Cancelar la sesión «Presentación del curso»' }).click()
  const cancel = page.getByRole('dialog', { name: '¿Cancelar «Presentación del curso»?' })
  await cancel.getByRole('button', { name: 'Sí, cancelar la sesión' }).click()
  await expect(cancel.getByRole('alert')).toBeVisible()
  await cancel.getByRole('textbox').fill('El docente está enfermo')
  await cancel.getByRole('button', { name: 'Sí, cancelar la sesión' }).click()
  await expect(cancel).toBeHidden()
  await expect(first).toContainText('Cancelada')
  await expect(first.getByRole('button')).toHaveCount(0)

  // el servidor lo guardó
  await page.reload()
  await expect(page.getByRole('article', { name: 'Presentación del curso' })).toContainText('Cancelada')
  expect(api.unexpected).toEqual([])
})

test('pasar asistencia; cambiar una ya registrada pide motivo y una recarga la conserva', async ({ page }) => {
  const api = await fakeApi(page, { signedIn: true, as: 'teacher' })
  await page.goto(`${OFFERING}/sesiones`)
  await page.getByRole('link', { name: 'Pasar asistencia de «Presentación del curso»' }).click()
  await expect(page).toHaveURL(`${OFFERING}/sesiones/ses-1/asistencia`)

  const student = page.getByRole('radiogroup', { name: 'Asistencia de estudiante@demo.local' })
  await student.getByRole('radio', { name: 'Presente' }).check()
  await expect(page.getByLabel('Motivo del cambio')).toHaveCount(0)
  await page.getByRole('button', { name: 'Guardar la asistencia' }).click()
  await expect(page.getByText('Asistencia guardada')).toBeVisible()

  await student.getByRole('radio', { name: 'Tarde' }).check()
  await page.getByRole('button', { name: 'Guardar la asistencia' }).click()
  await expect(page.getByRole('alert')).toContainText('Indica un motivo')
  await page.getByLabel('Motivo del cambio').fill('Llegó a las 8:20')
  await page.getByRole('button', { name: 'Guardar la asistencia' }).click()
  await expect(page.getByText('Asistencia guardada')).toBeVisible()

  await page.reload()
  await expect(page.getByRole('radiogroup', { name: 'Asistencia de estudiante@demo.local' }).getByRole('radio', { name: 'Tarde' })).toBeChecked()
  expect(api.unexpected).toEqual([])
})

test('un intento de otra edición se explica', async ({ page }) => {
  await fakeApi(page, { signedIn: true, as: 'teacher' })
  await page.goto(`${OFFERING}/correccion/de-otra-edicion`)
  await expect(page.getByRole('alert')).toContainText('Este intento no es de tus ediciones')
})

test.describe('en un teléfono', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })

  for (const path of [`${OFFERING}/correccion/int-1`, `${OFFERING}/sesiones`, `${OFFERING}/sesiones/ses-1/asistencia`]) {
    test(`${path} cabe en su área`, async ({ page }) => {
      await fakeApi(page, { signedIn: true, as: 'teacher' })
      await page.goto(path)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      await expect(page.locator('main').getByRole('button').first()).toBeVisible()

      // lo que se desplaza dentro de su propio contenedor (las tablas) no empuja la página
      const wider = await page.locator('main').evaluate((main) => {
        const right = main.getBoundingClientRect().right
        return [...main.querySelectorAll('*')]
          .filter((element) => element.getBoundingClientRect().right > right + 0.5 && !element.closest('.overflow-x-auto'))
          .map((element) => `${element.tagName}.${String(element.className).slice(0, 80)}`)
      })
      expect(wider).toEqual([])
    })
  }
})
