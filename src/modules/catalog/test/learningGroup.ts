import type { WasichaiModule } from '@wasichai/core'

// solo para las pruebas: el grupo «Aprendizaje» del menú lo declara el aula (módulo classroom) y la entrada del catálogo
// va en él. las pruebas que registran el catálogo sin el aula lo traen con este módulo, sin rutas ni pantallas del aula
export const learningGroup: WasichaiModule = {
  id: 'learning-group',
  navGroups: [{ id: 'learning', labelKey: 'learning', order: 5 }]
}
