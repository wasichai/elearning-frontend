// textos del módulo, espacio de nombres 'teaching' (= id del módulo)
const es = {
  nav: {
    group: 'Docencia',
    offerings: 'Mis ediciones'
  },
  offerings: {
    title: 'Mis ediciones',
    subtitle: 'Las ediciones de curso que tienes asignadas como docente.',
    loading: 'Cargando tus ediciones…',
    empty: 'No tienes ediciones asignadas',
    emptyHint: 'Cuando la coordinación te asigne como docente de una edición, aparecerá aquí con sus matriculados.',
    code: '{{course}} · edición {{offering}}',
    enrolled_one: '{{value}} matriculado',
    enrolled_other: '{{value}} matriculados',
    pending_one: '{{value}} intento por corregir',
    pending_other: '{{value}} intentos por corregir',
    nothingPending: 'Nada por corregir',
    back: '← Mis ediciones'
  },
  offering: {
    timeZone: 'Fechas en {{zone}}',
    status: {
      PROGRAMADA: 'Programada',
      INSCRIPCION_ABIERTA: 'Inscripción abierta',
      EN_CURSO: 'En curso',
      FINALIZADA: 'Finalizada',
      CANCELADA: 'Cancelada'
    }
  },
  roster: {
    title: 'Edición',
    subtitle: 'Edición {{code}}',
    loading: 'Cargando los matriculados…',
    notFound: 'Esta edición no está entre las tuyas',
    notFoundHint: 'Solo ves las ediciones que tienes asignadas como docente. El enlace puede ser de otra edición, o la asignación ya no está vigente.',
    empty: 'Esta edición aún no tiene matriculados.',
    heading_one: '{{value}} matriculado',
    heading_other: '{{value}} matriculados',
    student: 'Estudiante',
    noEmail: 'Sin correo registrado',
    status: 'Matrícula',
    progress: 'Progreso',
    attendance: 'Asistencia',
    assessments: 'Evaluaciones',
    progressValue: '{{percent}} % ({{completed}} de {{total}} lecciones)',
    attendanceValue: '{{attended}} de {{total}} sesiones',
    noSessions: 'Sin sesiones aún',
    noAssessments: 'Sin evaluaciones',
    assessmentNone: 'sin intentos',
    assessmentPending: 'pendiente de corrección',
    assessmentPassed: '{{percent}} %, aprobada',
    assessmentFailed: '{{percent}} %, no aprobada',
    enrollmentStatus: {
      ACTIVA: 'Activa',
      RETIRADA: 'Retirada',
      FINALIZADA: 'Finalizada'
    }
  },
  problem: {
    offerings: {
      invalid: 'No pudimos cargar tus ediciones',
      notFound: 'Tus ediciones no están disponibles',
      conflict: 'No pudimos cargar tus ediciones',
      refused: 'No pudimos cargar tus ediciones',
      server: 'No pudimos cargar tus ediciones',
      network: 'No pudimos conectar con el servidor',
      contract: 'No pudimos leer la respuesta del servidor'
    },
    roster: {
      invalid: 'No pudimos cargar los matriculados',
      notFound: 'Esta edición no está entre las tuyas',
      conflict: 'No pudimos cargar los matriculados',
      refused: 'No pudimos cargar los matriculados',
      server: 'No pudimos cargar los matriculados',
      network: 'No pudimos conectar con el servidor',
      contract: 'No pudimos leer la respuesta del servidor'
    },
    hint: {
      invalid: 'El servidor no aceptó la consulta (error {{status}}). Inténtalo de nuevo más tarde.',
      notFound: 'El servidor no reconoce esta dirección (error {{status}}).',
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
    group: 'Teaching',
    offerings: 'My offerings'
  },
  offerings: {
    title: 'My offerings',
    subtitle: 'The course offerings you are assigned to as a teacher.',
    loading: 'Loading your offerings…',
    empty: 'You have no offerings assigned',
    emptyHint: 'When coordination assigns you as a teacher of an offering, it will appear here with its students.',
    code: '{{course}} · offering {{offering}}',
    enrolled_one: '{{value}} student',
    enrolled_other: '{{value}} students',
    pending_one: '{{value}} attempt to grade',
    pending_other: '{{value}} attempts to grade',
    nothingPending: 'Nothing to grade',
    back: '← My offerings'
  },
  offering: {
    timeZone: 'Dates in {{zone}}',
    status: {
      PROGRAMADA: 'Scheduled',
      INSCRIPCION_ABIERTA: 'Enrollment open',
      EN_CURSO: 'In progress',
      FINALIZADA: 'Finished',
      CANCELADA: 'Cancelled'
    }
  },
  roster: {
    title: 'Offering',
    subtitle: 'Offering {{code}}',
    loading: 'Loading the students…',
    notFound: 'This offering is not one of yours',
    notFoundHint: 'You only see the offerings you are assigned to as a teacher. The link may be for another offering, or the assignment is no longer current.',
    empty: 'This offering has no students yet.',
    heading_one: '{{value}} student',
    heading_other: '{{value}} students',
    student: 'Student',
    noEmail: 'No email on record',
    status: 'Enrollment',
    progress: 'Progress',
    attendance: 'Attendance',
    assessments: 'Assessments',
    progressValue: '{{percent}}% ({{completed}} of {{total}} lessons)',
    attendanceValue: '{{attended}} of {{total}} sessions',
    noSessions: 'No sessions yet',
    noAssessments: 'No assessments',
    assessmentNone: 'no attempts',
    assessmentPending: 'awaiting grading',
    assessmentPassed: '{{percent}}%, passed',
    assessmentFailed: '{{percent}}%, not passed',
    enrollmentStatus: {
      ACTIVA: 'Active',
      RETIRADA: 'Withdrawn',
      FINALIZADA: 'Finished'
    }
  },
  problem: {
    offerings: {
      invalid: 'We could not load your offerings',
      notFound: 'Your offerings are not available',
      conflict: 'We could not load your offerings',
      refused: 'We could not load your offerings',
      server: 'We could not load your offerings',
      network: 'We could not reach the server',
      contract: 'We could not read the server response'
    },
    roster: {
      invalid: 'We could not load the students',
      notFound: 'This offering is not one of yours',
      conflict: 'We could not load the students',
      refused: 'We could not load the students',
      server: 'We could not load the students',
      network: 'We could not reach the server',
      contract: 'We could not read the server response'
    },
    hint: {
      invalid: 'The server did not accept the request (error {{status}}). Please try again later.',
      notFound: 'The server does not recognise this address (error {{status}}).',
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

export const teachingMessages = { es, en }
