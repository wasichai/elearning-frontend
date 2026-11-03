// textos del módulo, espacio de nombres 'administration' (= id del módulo)
const es = {
  nav: {
    group: 'Plataforma',
    entry: 'Administración'
  },
  publish: {
    nav: 'Términos de uso',
    title: 'Publicar términos de uso',
    subtitle: 'Cada persona acepta la versión vigente y el plazo de conservación que ofrece.',
    loading: 'Cargando los términos vigentes…',
    refused: 'No tienes permiso para publicar los términos',
    refusedHint: 'Solo quien administra la organización puede hacerlo. Consulta con quien la administra.',
    loadFailed: 'No pudimos cargar los términos vigentes',
    loadFailedHint: 'Vuelve a intentarlo para partir de lo publicado.',
    retry: 'Reintentar',
    current: 'Versión vigente: {{version}}. Plazo: {{days}}. Publicada el {{date}}.',
    days_one: '{{formatted}} día',
    days_other: '{{formatted}} días',
    none: 'Aún no hay términos publicados: nadie puede matricularse ni registrar su progreso hasta que los publiques.',
    formLabel: 'Versión nueva de los términos',
    text: 'Texto de los términos',
    textHint: 'Se muestra tal cual, como texto. Hasta 100 000 caracteres.',
    textError: 'Escribe el texto de los términos.',
    textServerError: 'El texto debe tener entre 1 y 100 000 caracteres.',
    retention: 'Plazo de conservación, en días',
    retentionHint: 'De 1 a 36 500. Se cuenta desde que cada persona acepta.',
    retentionError: 'Escribe un número entero de días, de 1 a 36 500.',
    submit: 'Publicar versión nueva',
    confirmTitle: '¿Publicar esta versión?',
    confirmDescription:
      'Una versión publicada no se puede cambiar: para corregirla habrá que publicar otra. Pasa a ser la vigente, pero no altera ninguna aceptación: quien ya aceptó conserva su versión y su plazo.',
    confirm: 'Publicar',
    publishing: 'Publicando…',
    cancel: 'Seguir editando',
    failed: 'No pudimos publicar los términos. Inténtalo de nuevo.',
    invalid: 'El servidor rechazó los datos: {{detail}}',
    published: 'Publicaste la versión {{version}}',
    publishedBody: 'Ya es la versión vigente. Las aceptaciones anteriores no cambian.',
    leaveTitle: '¿Salir sin publicar?',
    leaveDescription: 'Se perderá lo que has escrito.',
    leave: 'Salir',
    stay: 'Seguir editando'
  }
}

const en: typeof es = {
  nav: {
    group: 'Platform',
    entry: 'Administration'
  },
  publish: {
    nav: 'Terms of use',
    title: 'Publish terms of use',
    subtitle: 'Each person accepts the current version and the retention period it offers.',
    loading: 'Loading the current terms…',
    refused: 'You do not have permission to publish the terms',
    refusedHint: 'Only whoever manages the organization can do it. Please check with them.',
    loadFailed: 'We could not load the current terms',
    loadFailedHint: 'Try again to start from what is published.',
    retry: 'Try again',
    current: 'Current version: {{version}}. Period: {{days}}. Published on {{date}}.',
    days_one: '{{formatted}} day',
    days_other: '{{formatted}} days',
    none: 'No terms have been published yet: nobody can enroll or record their progress until you publish them.',
    formLabel: 'New version of the terms',
    text: 'Text of the terms',
    textHint: 'It is shown as is, as text. Up to 100,000 characters.',
    textError: 'Write the text of the terms.',
    textServerError: 'The text must have between 1 and 100,000 characters.',
    retention: 'Retention period, in days',
    retentionHint: 'From 1 to 36,500. It counts from when each person accepts.',
    retentionError: 'Enter a whole number of days, from 1 to 36,500.',
    submit: 'Publish new version',
    confirmTitle: 'Publish this version?',
    confirmDescription:
      'A published version cannot be changed: to correct it you will have to publish another. It becomes the current one but does not alter any acceptance: whoever already accepted keeps their version and period.',
    confirm: 'Publish',
    publishing: 'Publishing…',
    cancel: 'Keep editing',
    failed: 'We could not publish the terms. Please try again.',
    invalid: 'The server rejected the data: {{detail}}',
    published: 'You published version {{version}}',
    publishedBody: 'It is now the current version. Earlier acceptances do not change.',
    leaveTitle: 'Leave without publishing?',
    leaveDescription: 'What you wrote will be lost.',
    leave: 'Leave',
    stay: 'Keep editing'
  }
}

export const administrationMessages = { es, en }
