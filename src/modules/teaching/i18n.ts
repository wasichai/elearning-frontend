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
    more: 'De esta edición',
    toQueue: 'Cola de corrección',
    toQueuePending_one: 'Cola de corrección ({{value}} intento)',
    toQueuePending_other: 'Cola de corrección ({{value}} intentos)',
    toSessions: 'Sesiones y asistencia',
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
  queue: {
    title: 'Cola de corrección',
    back: '← Volver a la edición',
    loading: 'Cargando la cola de corrección…',
    empty: 'No hay intentos por corregir en esta edición.',
    student: 'Estudiante',
    lesson: 'Evaluación',
    submittedAt: 'Enviado',
    pendingQuestions: 'Preguntas por corregir',
    action: 'Acción',
    grade: 'Corregir',
    gradeLabel: 'Corregir «{{lesson}}» de {{student}}'
  },
  grading: {
    title: 'Corregir un intento',
    student: 'Estudiante: {{student}}',
    back: '← Cola de corrección',
    loading: 'Cargando el intento…',
    attempt: 'Intento {{number}}',
    open: 'Este intento todavía no se ha enviado: no se puede corregir.',
    pending: 'Pendiente de corrección: {{score}} de {{max}} puntos por ahora',
    passed: 'Corregido: {{percent}} %, aprobado ({{score}} de {{max}} puntos)',
    failed: 'Corregido: {{percent}} %, no aprobado ({{score}} de {{max}} puntos)',
    prompt: '{{order}}. {{prompt}}',
    answer: 'Respuesta:',
    noAnswer: 'sin responder',
    noFile: 'Sin archivo entregado.',
    download: 'Descargar la entrega',
    downloadLabel: 'Descargar la entrega {{name}}',
    downloading: 'Descargando…',
    solution: 'Respuesta correcta: {{answer}}',
    accepted: 'Respuestas aceptadas: {{answers}}',
    rubric: 'Rúbrica:',
    criterion: '{{description}} ({{points}} pts)',
    questionPoints: '{{points}} de {{max}} puntos',
    questionPending: 'Pendiente de corrección',
    formLabel: 'Calificar {{question}}',
    points: 'Puntos (de 0 a {{max}})',
    pointsInvalid: 'Escribe un número de 0 a {{max}}.',
    comment: 'Comentario para el estudiante (opcional)',
    save: 'Guardar la nota',
    change: 'Cambiar la nota',
    saving: 'Guardando…',
    saved: 'Nota guardada',
    reasonTitle: '¿Cambiar esta nota?',
    reasonDescription: 'Esta pregunta ya tiene nota. El cambio y su motivo quedan en el historial, que no se borra.',
    reasonConfirm: 'Cambiar la nota',
    reasonNeeded: 'Esta nota ya está puesta; para cambiarla hay que indicar un motivo. El servidor dice: «{{detail}}».'
  },
  sessions: {
    title: 'Sesiones de la edición',
    loading: 'Cargando las sesiones…',
    empty: 'Esta edición todavía no tiene sesiones.',
    timeZone: 'Horas en {{zone}}',
    new: 'Crear sesiones',
    created_one: 'Se creó {{value}} sesión.',
    created_other: 'Se crearon {{value}} sesiones.',
    status: {
      PROGRAMADA: 'Programada',
      REPROGRAMADA: 'Reprogramada',
      CANCELADA: 'Cancelada'
    },
    type: {
      TEORIA: 'Teoría',
      LABORATORIO: 'Laboratorio',
      CONSULTA: 'Consulta',
      RECUPERACION: 'Recuperación'
    },
    modality: {
      PRESENCIAL: 'Presencial',
      VIRTUAL: 'Virtual'
    },
    recovers: 'Recupera «{{title}}»',
    join: 'Abrir el enlace de la sesión',
    joinLabel: 'Abrir el enlace de la sesión «{{title}}» (se abre en otra pestaña)',
    attendance: 'Pasar asistencia',
    attendanceLabel: 'Pasar asistencia de «{{title}}»',
    reschedule: 'Reprogramar',
    rescheduleLabel: 'Reprogramar «{{title}}»',
    cancel: 'Cancelar la sesión',
    cancelLabel: 'Cancelar la sesión «{{title}}»'
  },
  cancel: {
    title: '¿Cancelar «{{title}}»?',
    description: 'Se avisará a los matriculados de esta edición. Una sesión cancelada no se puede reactivar.',
    confirm: 'Sí, cancelar la sesión'
  },
  reschedule: {
    title: 'Reprogramar «{{title}}»',
    description: 'La nueva fecha y hora van en {{zone}}. Se avisará a los matriculados de esta edición.',
    date: 'Nueva fecha',
    time: 'Nueva hora local',
    reason: 'Motivo',
    whenRequired: 'Indica la nueva fecha y la nueva hora.',
    dismiss: 'Volver',
    confirm: 'Reprogramar y avisar',
    saving: 'Reprogramando…'
  },
  reason: {
    invalid: 'Indica un motivo de hasta {{max}} caracteres, sin saltos de línea.'
  },
  form: {
    title: 'Crear una sesión o una serie',
    name: 'Título',
    type: 'Tipo',
    modality: 'Modalidad',
    duration: 'Duración (minutos)',
    link: 'Enlace de la reunión (https, opcional)',
    linkPlaceholder: 'https://',
    location: 'Lugar',
    original: 'Sesión que recupera',
    originalOption: '{{title}} · {{when}}',
    noOriginal: 'Una recuperación necesita una sesión que recuperar, y esta edición aún no tiene ninguna.',
    schedule: 'Cuándo',
    zoneHint: 'La hora es local en {{zone}}; cada sesión de la serie conserva esa hora, también al cambiar el horario de verano.',
    pattern: 'Repetición',
    patterns: {
      ONCE: 'Una sola vez',
      DAILY: 'Todos los días',
      ALTERNATE_DAYS: 'Un día sí y otro no',
      WEEKDAYS: 'Días de la semana'
    },
    date: 'Fecha',
    startDate: 'Desde',
    endDate: 'Hasta',
    localTime: 'Hora local',
    days: 'Días de la semana',
    weekDays: {
      MONDAY: 'Lunes',
      TUESDAY: 'Martes',
      WEDNESDAY: 'Miércoles',
      THURSDAY: 'Jueves',
      FRIDAY: 'Viernes',
      SATURDAY: 'Sábado',
      SUNDAY: 'Domingo'
    },
    required: 'Este dato es obligatorio.',
    durationInvalid: 'Escribe un número entero de minutos, mayor que cero.',
    linkInvalid: 'El enlace debe empezar por https://.',
    endBeforeStart: 'La fecha final no puede ser anterior a la inicial.',
    daysRequired: 'Elige al menos un día.',
    createOne: 'Crear la sesión',
    createSeries: 'Crear la serie',
    creating: 'Creando…'
  },
  attendance: {
    title: 'Asistencia',
    back: '← Sesiones de la edición',
    loading: 'Cargando la asistencia…',
    empty: 'Esta edición aún no tiene matriculados.',
    cancelled: 'Esta sesión está cancelada.',
    student: 'Estudiante',
    status: 'Asistencia',
    rowLabel: 'Asistencia de {{student}}',
    statuses: {
      PRESENTE: 'Presente',
      TARDE: 'Tarde',
      AUSENTE: 'Ausente',
      JUSTIFICADO: 'Justificado'
    },
    reason: 'Motivo del cambio',
    reasonHint: 'Obligatorio porque cambias una asistencia ya registrada.',
    save: 'Guardar la asistencia',
    saving: 'Guardando…',
    saved: 'Asistencia guardada'
  },
  action: {
    conflict: 'El servidor no lo aceptó: {{detail}}',
    invalid: 'El servidor rechazó los datos: {{detail}}',
    notFound: 'Esto ya no está entre lo tuyo: puede que la edición haya cambiado de docente.',
    failed: 'No pudimos guardarlo. Inténtalo de nuevo.',
    failedStatus: 'No pudimos guardarlo (error {{status}}). Inténtalo de nuevo.'
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
    queue: {
      invalid: 'No pudimos cargar la cola de corrección',
      notFound: 'Esta edición no está entre las tuyas',
      conflict: 'No pudimos cargar la cola de corrección',
      refused: 'No pudimos cargar la cola de corrección',
      server: 'No pudimos cargar la cola de corrección',
      network: 'No pudimos conectar con el servidor',
      contract: 'No pudimos leer la respuesta del servidor'
    },
    attempt: {
      invalid: 'No pudimos cargar el intento',
      notFound: 'Este intento no es de tus ediciones',
      conflict: 'No pudimos cargar el intento',
      refused: 'No pudimos cargar el intento',
      server: 'No pudimos cargar el intento',
      network: 'No pudimos conectar con el servidor',
      contract: 'No pudimos leer la respuesta del servidor'
    },
    sessions: {
      invalid: 'No pudimos cargar las sesiones',
      notFound: 'Esta edición no está entre las tuyas',
      conflict: 'No pudimos cargar las sesiones',
      refused: 'No pudimos cargar las sesiones',
      server: 'No pudimos cargar las sesiones',
      network: 'No pudimos conectar con el servidor',
      contract: 'No pudimos leer la respuesta del servidor'
    },
    attendance: {
      invalid: 'No pudimos cargar la asistencia',
      notFound: 'Esta sesión no es de tus ediciones',
      conflict: 'No pudimos cargar la asistencia',
      refused: 'No pudimos cargar la asistencia',
      server: 'No pudimos cargar la asistencia',
      network: 'No pudimos conectar con el servidor',
      contract: 'No pudimos leer la respuesta del servidor'
    },
    notFoundHint: 'Solo ves lo que corresponde a las ediciones que tienes asignadas. El enlace puede ser de otra edición, o la asignación ya no está vigente.',
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
    more: 'In this offering',
    toQueue: 'Grading queue',
    toQueuePending_one: 'Grading queue ({{value}} attempt)',
    toQueuePending_other: 'Grading queue ({{value}} attempts)',
    toSessions: 'Sessions and attendance',
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
  queue: {
    title: 'Grading queue',
    back: '← Back to the offering',
    loading: 'Loading the grading queue…',
    empty: 'There are no attempts to grade in this offering.',
    student: 'Student',
    lesson: 'Assessment',
    submittedAt: 'Submitted',
    pendingQuestions: 'Questions to grade',
    action: 'Action',
    grade: 'Grade',
    gradeLabel: 'Grade “{{lesson}}” by {{student}}'
  },
  grading: {
    title: 'Grade an attempt',
    student: 'Student: {{student}}',
    back: '← Grading queue',
    loading: 'Loading the attempt…',
    attempt: 'Attempt {{number}}',
    open: 'This attempt has not been submitted yet: it cannot be graded.',
    pending: 'Awaiting grading: {{score}} of {{max}} points so far',
    passed: 'Graded: {{percent}}%, passed ({{score}} of {{max}} points)',
    failed: 'Graded: {{percent}}%, not passed ({{score}} of {{max}} points)',
    prompt: '{{order}}. {{prompt}}',
    answer: 'Answer:',
    noAnswer: 'not answered',
    noFile: 'No file uploaded.',
    download: 'Download the submission',
    downloadLabel: 'Download the submission {{name}}',
    downloading: 'Downloading…',
    solution: 'Correct answer: {{answer}}',
    accepted: 'Accepted answers: {{answers}}',
    rubric: 'Rubric:',
    criterion: '{{description}} ({{points}} pts)',
    questionPoints: '{{points}} of {{max}} points',
    questionPending: 'Awaiting grading',
    formLabel: 'Grade {{question}}',
    points: 'Points (0 to {{max}})',
    pointsInvalid: 'Enter a number from 0 to {{max}}.',
    comment: 'Comment for the student (optional)',
    save: 'Save the grade',
    change: 'Change the grade',
    saving: 'Saving…',
    saved: 'Grade saved',
    reasonTitle: 'Change this grade?',
    reasonDescription: 'This question already has a grade. The change and its reason stay in the history, which is never deleted.',
    reasonConfirm: 'Change the grade',
    reasonNeeded: 'This grade is already set; changing it requires a reason. The server says: “{{detail}}”.'
  },
  sessions: {
    title: 'Offering sessions',
    loading: 'Loading the sessions…',
    empty: 'This offering has no sessions yet.',
    timeZone: 'Times in {{zone}}',
    new: 'Create sessions',
    created_one: '{{value}} session created.',
    created_other: '{{value}} sessions created.',
    status: {
      PROGRAMADA: 'Scheduled',
      REPROGRAMADA: 'Rescheduled',
      CANCELADA: 'Cancelled'
    },
    type: {
      TEORIA: 'Theory',
      LABORATORIO: 'Lab',
      CONSULTA: 'Office hours',
      RECUPERACION: 'Make-up'
    },
    modality: {
      PRESENCIAL: 'In person',
      VIRTUAL: 'Online'
    },
    recovers: 'Makes up for “{{title}}”',
    join: 'Open the session link',
    joinLabel: 'Open the link of the session “{{title}}” (opens in a new tab)',
    attendance: 'Take attendance',
    attendanceLabel: 'Take attendance for “{{title}}”',
    reschedule: 'Reschedule',
    rescheduleLabel: 'Reschedule “{{title}}”',
    cancel: 'Cancel the session',
    cancelLabel: 'Cancel the session “{{title}}”'
  },
  cancel: {
    title: 'Cancel “{{title}}”?',
    description: 'Students in this offering will be notified. A cancelled session cannot be reactivated.',
    confirm: 'Yes, cancel the session'
  },
  reschedule: {
    title: 'Reschedule “{{title}}”',
    description: 'The new date and time are in {{zone}}. Students in this offering will be notified.',
    date: 'New date',
    time: 'New local time',
    reason: 'Reason',
    whenRequired: 'Enter the new date and the new time.',
    dismiss: 'Back',
    confirm: 'Reschedule and notify',
    saving: 'Rescheduling…'
  },
  reason: {
    invalid: 'Enter a reason of up to {{max}} characters, without line breaks.'
  },
  form: {
    title: 'Create a session or a series',
    name: 'Title',
    type: 'Type',
    modality: 'Modality',
    duration: 'Duration (minutes)',
    link: 'Meeting link (https, optional)',
    linkPlaceholder: 'https://',
    location: 'Location',
    original: 'Session it makes up for',
    originalOption: '{{title}} · {{when}}',
    noOriginal: 'A make-up needs a session to make up for, and this offering has none yet.',
    schedule: 'When',
    zoneHint: 'The time is local in {{zone}}; every session in the series keeps it, also across daylight saving changes.',
    pattern: 'Repeat',
    patterns: {
      ONCE: 'Just once',
      DAILY: 'Every day',
      ALTERNATE_DAYS: 'Every other day',
      WEEKDAYS: 'Days of the week'
    },
    date: 'Date',
    startDate: 'From',
    endDate: 'Until',
    localTime: 'Local time',
    days: 'Days of the week',
    weekDays: {
      MONDAY: 'Monday',
      TUESDAY: 'Tuesday',
      WEDNESDAY: 'Wednesday',
      THURSDAY: 'Thursday',
      FRIDAY: 'Friday',
      SATURDAY: 'Saturday',
      SUNDAY: 'Sunday'
    },
    required: 'This field is required.',
    durationInvalid: 'Enter a whole number of minutes, greater than zero.',
    linkInvalid: 'The link must start with https://.',
    endBeforeStart: 'The end date cannot be before the start date.',
    daysRequired: 'Choose at least one day.',
    createOne: 'Create the session',
    createSeries: 'Create the series',
    creating: 'Creating…'
  },
  attendance: {
    title: 'Attendance',
    back: '← Offering sessions',
    loading: 'Loading the attendance…',
    empty: 'This offering has no students yet.',
    cancelled: 'This session is cancelled.',
    student: 'Student',
    status: 'Attendance',
    rowLabel: 'Attendance of {{student}}',
    statuses: {
      PRESENTE: 'Present',
      TARDE: 'Late',
      AUSENTE: 'Absent',
      JUSTIFICADO: 'Excused'
    },
    reason: 'Reason for the change',
    reasonHint: 'Required because you are changing attendance already recorded.',
    save: 'Save the attendance',
    saving: 'Saving…',
    saved: 'Attendance saved'
  },
  action: {
    conflict: 'The server did not accept it: {{detail}}',
    invalid: 'The server rejected the data: {{detail}}',
    notFound: 'This is no longer yours: the offering may have changed teacher.',
    failed: 'We could not save it. Please try again.',
    failedStatus: 'We could not save it (error {{status}}). Please try again.'
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
    queue: {
      invalid: 'We could not load the grading queue',
      notFound: 'This offering is not one of yours',
      conflict: 'We could not load the grading queue',
      refused: 'We could not load the grading queue',
      server: 'We could not load the grading queue',
      network: 'We could not reach the server',
      contract: 'We could not read the server response'
    },
    attempt: {
      invalid: 'We could not load the attempt',
      notFound: 'This attempt is not from your offerings',
      conflict: 'We could not load the attempt',
      refused: 'We could not load the attempt',
      server: 'We could not load the attempt',
      network: 'We could not reach the server',
      contract: 'We could not read the server response'
    },
    sessions: {
      invalid: 'We could not load the sessions',
      notFound: 'This offering is not one of yours',
      conflict: 'We could not load the sessions',
      refused: 'We could not load the sessions',
      server: 'We could not load the sessions',
      network: 'We could not reach the server',
      contract: 'We could not read the server response'
    },
    attendance: {
      invalid: 'We could not load the attendance',
      notFound: 'This session is not from your offerings',
      conflict: 'We could not load the attendance',
      refused: 'We could not load the attendance',
      server: 'We could not load the attendance',
      network: 'We could not reach the server',
      contract: 'We could not read the server response'
    },
    notFoundHint: 'You only see what belongs to the offerings assigned to you. The link may be for another offering, or the assignment is no longer current.',
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
