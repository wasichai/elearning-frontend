// textos del módulo, espacio de nombres 'classroom' (= id del módulo)
const es = {
  nav: {
    group: 'Aprendizaje',
    myCourses: 'Mis cursos'
  },
  enrollments: {
    title: 'Mis cursos',
    subtitle: 'Los cursos en los que estás matriculado y por dónde vas.',
    loading: 'Cargando tus cursos…',
    next: 'Siguiente: {{lesson}}',
    finished: 'Has completado todas las lecciones disponibles.',
    continue: 'Continuar',
    continueLabel: 'Continuar «{{course}}»',
    review: 'Repasar',
    reviewLabel: 'Repasar «{{course}}»',
    empty: 'Todavía no estás matriculado en ningún curso',
    emptyHint: 'Explora el catálogo y matricúlate en una edición con la inscripción abierta.',
    toCatalog: 'Ver el catálogo'
  },
  offering: {
    dates: 'Edición',
    timeZone: 'Fechas en {{zone}}',
    status: {
      PROGRAMADA: 'Aún no empieza',
      INSCRIPCION_ABIERTA: 'Aún no empieza',
      EN_CURSO: 'En curso',
      FINALIZADA: 'Finalizada',
      CANCELADA: 'Cancelada'
    }
  },
  progress: {
    course: 'Progreso del curso',
    value: '{{completed}} de {{total}} lecciones · {{percent}} %',
    valueText: '{{completed}} de {{total}} lecciones completadas, {{percent}} %'
  },
  classroom: {
    back: '← Mis cursos',
    loading: 'Cargando el aula…',
    notFound: 'No encontramos este curso en tus matrículas',
    notFoundHint: 'El enlace puede ser de otra persona, o la matrícula ya no está activa.',
    units: 'Unidades del curso',
    showUnits: 'Ver las unidades',
    hideUnits: 'Ocultar las unidades',
    unit: 'Unidad {{order}}. {{title}}',
    unitProgress: '{{completed}} de {{total}}',
    unitProgressLabel: '{{completed}} de {{total}} lecciones completadas',
    position: 'Unidad {{unit}} · Lección {{lesson}}',
    minutes: '{{value}} min',
    previous: 'Anterior',
    next: 'Siguiente',
    steps: 'Lección anterior y siguiente',
    lessonMissing: 'Esa lección no está en este curso; te mostramos la siguiente por hacer.',
    empty: 'Este curso todavía no tiene lecciones.'
  },
  completion: {
    section: 'Tu avance en esta lección',
    mark: 'Marcar como completada',
    marking: 'Guardando…',
    done: 'Lección completada',
    video: 'Se completa al terminar el vídeo.',
    notYet: 'Se completa con la evaluación o la sesión (próximamente)',
    next: 'Siguiente lección',
    nextLabel: 'Siguiente lección: {{lesson}}',
    pending: 'Te queda una lección anterior por hacer',
    courseDone: 'Has completado todas las lecciones disponibles del curso.',
    backToCourses: 'Volver a Mis cursos',
    conflict: 'Esta lección no se puede completar así. Ya te mostramos su estado actual.',
    failed: 'No pudimos guardar tu avance. Inténtalo de nuevo.'
  },
  lessonStatus: {
    NO_INICIADA: 'Sin empezar',
    INICIADA: 'Empezada',
    COMPLETADA: 'Completada',
    APROBADA: 'Aprobada'
  },
  lessonType: {
    LECTURA: 'Lectura',
    VIDEO: 'Vídeo',
    PRESENTACION: 'Presentación',
    LABORATORIO: 'Laboratorio',
    EVALUACION: 'Evaluación',
    SESION: 'Sesión en vivo'
  },
  resource: {
    resources: 'Material de la lección',
    none: 'Esta lección no tiene material.',
    noFile: 'Este recurso todavía no tiene archivo.',
    loading: 'Cargando el contenido…',
    download: 'Descargar',
    downloadLabel: 'Descargar {{name}} ({{size}})',
    downloading: 'Descargando…',
    failed: 'No pudimos cargar este recurso.',
    failedStatus: 'No pudimos cargar este recurso (error {{status}}).',
    foreign: 'Este recurso apunta fuera de la aplicación y no se abre.',
    retry: 'Reintentar'
  },
  problem: {
    enrollments: {
      invalid: 'No pudimos cargar tus cursos',
      notFound: 'Tus cursos no están disponibles',
      conflict: 'No pudimos cargar tus cursos',
      refused: 'No pudimos cargar tus cursos',
      server: 'No pudimos cargar tus cursos',
      network: 'No pudimos conectar con el servidor',
      contract: 'No pudimos leer la respuesta del servidor'
    },
    classroom: {
      invalid: 'No pudimos abrir este curso',
      notFound: 'No encontramos este curso en tus matrículas',
      conflict: 'No pudimos abrir este curso',
      refused: 'No pudimos abrir este curso',
      server: 'No pudimos cargar el aula',
      network: 'No pudimos conectar con el servidor',
      contract: 'No pudimos leer la respuesta del servidor'
    },
    hint: {
      invalid: 'El servidor no aceptó la consulta (error {{status}}). Inténtalo de nuevo más tarde.',
      notFound: 'El servidor no reconoce esta dirección (error {{status}}). Inténtalo de nuevo más tarde.',
      conflict: 'El servidor no aceptó la consulta (error {{status}}). Inténtalo de nuevo más tarde.',
      refused: 'El servidor rechazó la consulta (error {{status}}). Inténtalo de nuevo más tarde.',
      server: 'El servidor tuvo un problema (error {{status}}). Inténtalo de nuevo en unos minutos.',
      network: 'Comprueba tu conexión e inténtalo de nuevo.',
      unexpected: 'Ocurrió un error inesperado. Inténtalo de nuevo.',
      contract: 'La respuesta no tiene el formato que esta página espera; suele pasar durante una actualización. Inténtalo de nuevo en unos minutos.'
    },
    retry: 'Reintentar'
  }
}

// mismas claves que es: el tipo lo exige al compilar e i18n.test.tsx lo comprueba hoja a hoja
const en: typeof es = {
  nav: {
    group: 'Learning',
    myCourses: 'My courses'
  },
  enrollments: {
    title: 'My courses',
    subtitle: 'The courses you are enrolled in and how far you have got.',
    loading: 'Loading your courses…',
    next: 'Next: {{lesson}}',
    finished: 'You have completed every available lesson.',
    continue: 'Continue',
    continueLabel: 'Continue “{{course}}”',
    review: 'Review',
    reviewLabel: 'Review “{{course}}”',
    empty: 'You are not enrolled in any course yet',
    emptyHint: 'Browse the catalog and enroll in an offering that is open for enrollment.',
    toCatalog: 'Browse the catalog'
  },
  offering: {
    dates: 'Offering',
    timeZone: 'Dates in {{zone}}',
    status: {
      PROGRAMADA: 'Not started yet',
      INSCRIPCION_ABIERTA: 'Not started yet',
      EN_CURSO: 'In progress',
      FINALIZADA: 'Finished',
      CANCELADA: 'Cancelled'
    }
  },
  progress: {
    course: 'Course progress',
    value: '{{completed}} of {{total}} lessons · {{percent}}%',
    valueText: '{{completed}} of {{total}} lessons completed, {{percent}}%'
  },
  classroom: {
    back: '← My courses',
    loading: 'Loading the classroom…',
    notFound: 'We could not find this course among your enrollments',
    notFoundHint: 'The link may belong to someone else, or the enrollment is no longer active.',
    units: 'Course units',
    showUnits: 'Show the units',
    hideUnits: 'Hide the units',
    unit: 'Unit {{order}}. {{title}}',
    unitProgress: '{{completed}} of {{total}}',
    unitProgressLabel: '{{completed}} of {{total}} lessons completed',
    position: 'Unit {{unit}} · Lesson {{lesson}}',
    minutes: '{{value}} min',
    previous: 'Previous',
    next: 'Next',
    steps: 'Previous and next lesson',
    lessonMissing: 'That lesson is not part of this course; here is your next one.',
    empty: 'This course has no lessons yet.'
  },
  completion: {
    section: 'Your progress in this lesson',
    mark: 'Mark as completed',
    marking: 'Saving…',
    done: 'Lesson completed',
    video: 'Completed when the video ends.',
    notYet: 'Completed with the assessment or the session (coming soon)',
    next: 'Next lesson',
    nextLabel: 'Next lesson: {{lesson}}',
    pending: 'You still have an earlier lesson to do',
    courseDone: 'You have completed every available lesson in the course.',
    backToCourses: 'Back to My courses',
    conflict: 'This lesson cannot be completed this way. Here is its current state.',
    failed: 'We could not save your progress. Please try again.'
  },
  lessonStatus: {
    NO_INICIADA: 'Not started',
    INICIADA: 'Started',
    COMPLETADA: 'Completed',
    APROBADA: 'Passed'
  },
  lessonType: {
    LECTURA: 'Reading',
    VIDEO: 'Video',
    PRESENTACION: 'Slides',
    LABORATORIO: 'Lab',
    EVALUACION: 'Assessment',
    SESION: 'Live session'
  },
  resource: {
    resources: 'Lesson materials',
    none: 'This lesson has no materials.',
    noFile: 'This resource has no file yet.',
    loading: 'Loading the content…',
    download: 'Download',
    downloadLabel: 'Download {{name}} ({{size}})',
    downloading: 'Downloading…',
    failed: 'We could not load this resource.',
    failedStatus: 'We could not load this resource (error {{status}}).',
    foreign: 'This resource points outside the application and will not be opened.',
    retry: 'Retry'
  },
  problem: {
    enrollments: {
      invalid: 'We could not load your courses',
      notFound: 'Your courses are not available',
      conflict: 'We could not load your courses',
      refused: 'We could not load your courses',
      server: 'We could not load your courses',
      network: 'We could not reach the server',
      contract: 'We could not read the server response'
    },
    classroom: {
      invalid: 'We could not open this course',
      notFound: 'We could not find this course among your enrollments',
      conflict: 'We could not open this course',
      refused: 'We could not open this course',
      server: 'We could not load the classroom',
      network: 'We could not reach the server',
      contract: 'We could not read the server response'
    },
    hint: {
      invalid: 'The server did not accept the request (error {{status}}). Please try again later.',
      notFound: 'The server does not recognise this address (error {{status}}). Please try again later.',
      conflict: 'The server did not accept the request (error {{status}}). Please try again later.',
      refused: 'The server refused the request (error {{status}}). Please try again later.',
      server: 'The server had a problem (error {{status}}). Please try again in a few minutes.',
      network: 'Check your connection and try again.',
      unexpected: 'Something unexpected went wrong. Please try again.',
      contract: 'The response is not in the format this page expects; this usually happens during an update. Please try again in a few minutes.'
    },
    retry: 'Retry'
  }
}

export const classroomMessages = { es, en }
