// textos del módulo, espacio de nombres 'terms' (= id del módulo)
const es = {
  nav: { entry: 'Términos de uso' },
  title: 'Términos de uso',
  loading: 'Cargando los términos…',
  load: {
    failed: 'No pudimos cargar los términos',
    failedHint: 'Puede ser un problema de conexión o del servidor. Tu aceptación no ha cambiado.',
    contract: 'No pudimos leer la respuesta del servidor',
    retry: 'Reintentar'
  },
  none: {
    title: 'Tu organización aún no ha publicado sus términos',
    person: 'Hasta que los publique, nadie puede matricularse ni registrar su progreso. No es por nada que hayas hecho: consulta con tu institución.',
    admin: 'Hasta entonces, nadie puede matricularse ni registrar su progreso. Debes publicarlos para que tu organización pueda empezar.',
    publish: 'Publicar los términos'
  },
  facts: {
    version: 'Versión vigente',
    published: 'Publicada el {{date}}',
    retention: 'Plazo de conservación',
    days_one: '{{formatted}} día',
    days_other: '{{formatted}} días',
    retentionHint: 'Tus datos personales se conservan este tiempo, contado desde que aceptas.'
  },
  text: { title: 'Texto de los términos' },
  status: {
    label: 'Tu aceptación',
    actions: 'Qué puedes hacer',
    none: {
      title: 'Aún no has aceptado estos términos',
      body: 'Sin aceptarlos no puedes matricularte ni registrar tu progreso. El catálogo sigue abierto.',
      returning: 'Para continuar con lo que estabas haciendo, primero debes aceptarlos.'
    },
    current: {
      title: 'Aceptaste estos términos',
      body: 'Versión {{version}}, el {{accepted}}. Tu aceptación vale hasta el {{expires}}.'
    },
    older: {
      title: 'Tu aceptación sigue vigente',
      body: 'Aceptaste la versión {{version}} el {{accepted}} y vale hasta el {{expires}}. No tienes que hacer nada para seguir usando la plataforma.',
      renew: 'Si aceptas la versión {{next}}, sustituye a la anterior, con su plazo contado desde hoy.'
    },
    withdrawn: {
      title: 'Retiraste tu aceptación',
      body: 'Lo hiciste el {{date}} y tus datos se están suprimiendo. Cuando termine podrás aceptar otra vez; hasta entonces no puedes matricularte ni registrar tu progreso.'
    },
    expired: {
      title: 'Tu aceptación venció',
      body: 'Venció el {{date}} y tus datos se están suprimiendo. Cuando termine podrás aceptar otra vez; hasta entonces no puedes matricularte ni registrar tu progreso.'
    },
    withdrawing: {
      title: 'Tu retirada está en curso',
      body: 'Tus datos se están suprimiendo. Aún no ha terminado.',
      reference: 'Referencia de la solicitud: {{jobId}}'
    }
  },
  accept: {
    action: 'Aceptar los términos',
    actionVersion: 'Aceptar la versión {{version}}',
    again: 'Volver a aceptar',
    accepting: 'Guardando…',
    erasing: 'Tus datos de la aceptación anterior todavía se están suprimiendo. Podrás aceptar cuando termine: inténtalo de nuevo en unos minutos.',
    changed: 'Se publicó una versión nueva mientras leías. Aquí la tienes: léela antes de aceptarla.',
    conflict: 'No pudimos registrar tu aceptación. Vuelve a leer los términos e inténtalo de nuevo.',
    failed: 'No pudimos registrar tu aceptación. Inténtalo de nuevo.'
  },
  back: {
    withoutAccepting: 'Volver sin aceptar',
    done: 'Volver a lo que hacías'
  },
  withdraw: {
    title: 'Retirar tu aceptación',
    intro:
      'Puedes retirarla cuando quieras. Al hacerlo, tus datos personales se suprimen en segundo plano y no puedes matricularte ni registrar tu progreso hasta aceptar otra vez.',
    erasedLabel: 'Se suprime',
    erased:
      'Tus eventos de aprendizaje, progreso, asistencias, entregas, intentos sin calificar, valoraciones (con sus puntajes, comentarios y apelaciones), denuncias resueltas y los trabajos que pediste.',
    anonymizedLabel: 'Queda sin tu nombre',
    anonymized:
      'Tus matrículas (la activa pasa a retirada), intentos calificados y sus notas, certificados (su código sigue verificándolos, sin titular), denuncias abiertas y ejecuciones de agente. Tu perfil docente se vacía y deja de publicarse.',
    keptLabel: 'No se suprime',
    kept: 'Tu cuenta, con su nombre, correo y roles: la deshabilita o elimina tu organización. Las notificaciones enviadas. Lo que hiciste para la organización (autoría, revisiones, notas que pusiste, sesiones), con tu identificador de cuenta. El registro de auditoría guarda una copia hasta que se purgue.',
    action: 'Retirar mi aceptación',
    confirmTitle: '¿Retirar tu aceptación?',
    confirmDescription:
      'Tus datos se suprimen o quedan sin tu nombre, como detalla esta pantalla, y no se puede deshacer. Tus matrículas activas pasan a retiradas.',
    confirm: 'Retirar y suprimir',
    withdrawing: 'Retirando…',
    cancel: 'Conservarla',
    failed: 'No pudimos retirar tu aceptación. Inténtalo de nuevo.',
    missing: 'No tienes una aceptación que retirar.'
  }
}

const en: typeof es = {
  nav: { entry: 'Terms of use' },
  title: 'Terms of use',
  loading: 'Loading the terms…',
  load: {
    failed: 'We could not load the terms',
    failedHint: 'It may be a connection or server problem. Your acceptance has not changed.',
    contract: 'We could not read the server response',
    retry: 'Try again'
  },
  none: {
    title: 'Your organization has not published its terms yet',
    person: 'Until it does, nobody can enroll or record their progress. It is nothing you did: please check with your institution.',
    admin: 'Until then, nobody can enroll or record their progress. You must publish them so your organization can get started.',
    publish: 'Publish the terms'
  },
  facts: {
    version: 'Current version',
    published: 'Published on {{date}}',
    retention: 'Retention period',
    days_one: '{{formatted}} day',
    days_other: '{{formatted}} days',
    retentionHint: 'Your personal data is kept for this long, counted from when you accept.'
  },
  text: { title: 'Text of the terms' },
  status: {
    label: 'Your acceptance',
    actions: 'What you can do',
    none: {
      title: 'You have not accepted these terms yet',
      body: 'Without accepting them you cannot enroll or record your progress. The catalog stays open.',
      returning: 'To continue with what you were doing, you first need to accept them.'
    },
    current: {
      title: 'You accepted these terms',
      body: 'Version {{version}}, on {{accepted}}. Your acceptance is valid until {{expires}}.'
    },
    older: {
      title: 'Your acceptance is still valid',
      body: 'You accepted version {{version}} on {{accepted}} and it is valid until {{expires}}. You do not need to do anything to keep using the platform.',
      renew: 'If you accept version {{next}}, it replaces the previous one, with its period counted from today.'
    },
    withdrawn: {
      title: 'You withdrew your acceptance',
      body: 'You did so on {{date}} and your data is being erased. When it finishes you can accept again; until then you cannot enroll or record your progress.'
    },
    expired: {
      title: 'Your acceptance expired',
      body: 'It expired on {{date}} and your data is being erased. When it finishes you can accept again; until then you cannot enroll or record your progress.'
    },
    withdrawing: {
      title: 'Your withdrawal is in progress',
      body: 'Your data is being erased. It has not finished yet.',
      reference: 'Request reference: {{jobId}}'
    }
  },
  accept: {
    action: 'Accept the terms',
    actionVersion: 'Accept version {{version}}',
    again: 'Accept again',
    accepting: 'Saving…',
    erasing: 'The data from your previous acceptance is still being erased. You can accept when it finishes: please try again in a few minutes.',
    changed: 'A new version was published while you were reading. Here it is: read it before accepting.',
    conflict: 'We could not record your acceptance. Read the terms again and retry.',
    failed: 'We could not record your acceptance. Please try again.'
  },
  back: {
    withoutAccepting: 'Go back without accepting',
    done: 'Back to what you were doing'
  },
  withdraw: {
    title: 'Withdraw your acceptance',
    intro:
      'You can withdraw it whenever you want. When you do, your personal data is erased in the background and you cannot enroll or record your progress until you accept again.',
    erasedLabel: 'Erased',
    erased:
      'Your learning events, progress, attendance, submissions, ungraded attempts, ratings (with their scores, comments and appeals), resolved reports and the jobs you requested.',
    anonymizedLabel: 'Kept without your name',
    anonymized:
      'Your enrollments (an active one becomes withdrawn), graded attempts and their grades, certificates (their code still verifies them, with no holder), open reports and agent runs. Your teacher profile is emptied and no longer published.',
    keptLabel: 'Not erased',
    kept: 'Your account, with its name, email and roles: your organization disables or deletes it. Notifications already sent. What you did for the organization (authorship, reviews, grades you gave, sessions), with your account identifier. The audit log keeps a copy until it is purged.',
    action: 'Withdraw my acceptance',
    confirmTitle: 'Withdraw your acceptance?',
    confirmDescription:
      'Your data is erased or stripped of your name, as this screen details, and this cannot be undone. Your active enrollments become withdrawn.',
    confirm: 'Withdraw and erase',
    withdrawing: 'Withdrawing…',
    cancel: 'Keep it',
    failed: 'We could not withdraw your acceptance. Please try again.',
    missing: 'You have no acceptance to withdraw.'
  }
}

export const termsMessages = { es, en }
