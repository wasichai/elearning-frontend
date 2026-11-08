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
    emptyHint:
      'Cuando la coordinación te asigne como docente de una edición, aparecerá aquí con sus matriculados, lo que queda por corregir y sus próximas sesiones.',
    toEnrollments: 'Ir a Mis cursos',
    enrolled_one: '{{value}} matriculado',
    enrolled_other: '{{value}} matriculados',
    pending_one: '{{value}} intento por corregir',
    pending_other: '{{value}} intentos por corregir',
    nothingPending: 'Nada por corregir'
  },
  panel: {
    rail: 'Agenda',
    offerings: 'Tus ediciones',
    sessions: 'Sesiones',
    noUpcoming: 'Sin sesiones próximas',
    upcoming_one: '{{value}} próxima sesión',
    upcoming_other: '{{value}} próximas sesiones',
    figures: {
      offerings: 'Ediciones asignadas',
      pending: 'Intentos por corregir',
      enrolled: 'Matriculados'
    },
    tray: {
      title: 'Por corregir',
      order: 'Lo más antiguo arriba.',
      none: 'No tienes entregas por corregir.',
      queue: 'Ver la cola',
      age: 'Enviado {{age}}',
      more_one: 'Ver {{value}} entrega más en la cola',
      more_other: 'Ver {{value}} entregas más en la cola',
      retry: 'Reintentar: cola de corrección'
    },
    agenda: {
      title: 'Próximas sesiones',
      none: 'No tienes sesiones próximas.',
      failed: 'No pudimos cargar tus próximas sesiones.',
      retry: 'Reintentar: sesiones',
      running: 'En curso',
      toAttendance: 'Pasar asistencia',
      more_one: 'Y {{count}} sesión más.',
      more_other: 'Y {{count}} sesiones más.'
    }
  },
  frame: {
    breadcrumbs: 'Ruta',
    sections: 'Secciones de la edición',
    switch: 'Cambiar de edición',
    option: '{{course}}, {{dates}}',
    roster: 'Matriculados',
    queue: 'Corrección',
    queuePending: 'Corrección ({{value}})',
    sessions: 'Sesiones'
  },
  leave: {
    title: '¿Salir sin guardar?',
    description: 'Se perderá lo que has escrito y aún no has guardado.',
    stay: 'Seguir aquí',
    confirm: 'Salir sin guardar'
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
    loading: 'Cargando los matriculados…',
    notFound: 'Esta edición no está entre las tuyas',
    notFoundHint: 'Solo ves las ediciones que tienes asignadas como docente. El enlace puede ser de otra edición, o la asignación ya no está vigente.',
    empty: 'Esta edición aún no tiene matriculados.',
    heading_one: '{{value}} matriculado',
    heading_other: '{{value}} matriculados',
    summary: {
      title: 'Resumen de la edición',
      students: 'Matriculados',
      mean: 'Avance medio',
      meanHint: 'Media del avance de cada estudiante, redondeada.',
      percent: '{{value}} %',
      attendance: 'Asistencia',
      attendanceValue: '{{attended}} de {{total}}',
      attendanceHint: 'Asistencias sumadas de todos los estudiantes.',
      pending: 'Evaluaciones por corregir'
    },
    lowest: {
      title: 'Menor avance',
      description: 'Matrículas activas, de menor a mayor porcentaje.',
      write: 'Escribir',
      writeLabel: 'Escribir a {{email}}'
    },
    search: 'Buscar por nombre o correo',
    filters: 'Filtrar matriculados',
    filterOption: '{{label}} ({{value}})',
    filter: {
      ALL: 'Todos',
      ACTIVA: 'Activa',
      FINALIZADA: 'Finalizada',
      RETIRADA: 'Retirada',
      PENDING: 'Con evaluación por corregir'
    },
    shown_one: '{{shown}} de {{value}} matriculado',
    shown_other: '{{shown}} de {{value}} matriculados',
    noResults: 'Nadie coincide con la búsqueda',
    clearFilters: 'Quitar los filtros',
    sortBy: 'Ordenar por',
    sort: {
      'email-asc': 'Correo, de la A a la Z',
      'email-desc': 'Correo, de la Z a la A',
      'progress-asc': 'Menor avance primero',
      'progress-desc': 'Mayor avance primero',
      'attendance-asc': 'Menor asistencia primero',
      'attendance-desc': 'Mayor asistencia primero'
    },
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
    assessmentNone: 'Sin intentos',
    assessmentPending: 'Pendiente de corrección',
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
    loading: 'Cargando la cola de corrección…',
    empty: 'Nada pendiente por corregir',
    pendingCount_one: '{{value}} pregunta por corregir',
    pendingCount_other: '{{value}} preguntas por corregir',
    student: 'Estudiante',
    lesson: 'Evaluación',
    submittedAt: 'Enviado',
    pendingQuestions: 'Preguntas por corregir',
    action: 'Acción',
    grade: 'Corregir',
    gradeLabel: 'Corregir «{{lesson}}» de {{student}}'
  },
  grading: {
    position: '{{position}} de {{total}}',
    positionLabel: 'Posición en la cola',
    previous: 'Anterior',
    next: 'Siguiente',
    saveNext: 'Guardar y pasar al siguiente',
    saveFinish: 'Guardar y terminar',
    saveFailed: 'No se guardó todo. Lo que escribiste sigue aquí: revisa el aviso de la pregunta y vuelve a intentarlo.',
    finished: 'Has corregido la última entrega de la cola.',
    finishedSaved: 'Corrección guardada.',
    toQueue: 'Volver a la cola',
    projected: 'Con lo escrito sin guardar: {{score}} de {{max}} puntos',
    chosen: 'Elegido',
    rubricHint: 'Cada criterio elegido suma sus puntos a la nota. Solo se guardan la nota y el comentario.',
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
    reasonDescription:
      'Esta pregunta ya tiene nota. El cambio y su motivo quedan en el historial, que no se borra. Lo leen los docentes de esta edición y la administración; el estudiante, no.',
    reasonConfirm: 'Cambiar la nota',
    reasonNeeded: 'Esta nota ya está puesta; para cambiarla hay que indicar un motivo. El servidor dice: «{{detail}}».'
  },
  sessions: {
    title: 'Sesiones de la edición',
    loading: 'Cargando las sesiones…',
    empty: 'Esta edición todavía no tiene sesiones.',
    timeZone: 'Horas en {{zone}}',
    new: 'Programar sesión',
    upcoming: 'Próximas',
    past: 'Pasadas',
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
    description:
      'Se avisará a los matriculados de esta edición con una alerta y, si hay correo configurado, también por correo. Una sesión cancelada no se puede reactivar.',
    confirm: 'Sí, cancelar la sesión'
  },
  reschedule: {
    title: 'Reprogramar «{{title}}»',
    description:
      'La nueva fecha y hora van en {{zone}}. Se avisará a los matriculados de esta edición con una alerta y, si hay correo configurado, también por correo.',
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
    creating: 'Creando…',
    close: 'Cerrar sin crear'
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
      JUSTIFICADO: 'Justificada'
    },
    summary: 'Resumen de la asistencia',
    unmarked: 'Sin marcar',
    rowUnsaved: 'Sin guardar',
    markAll: 'Marcar a todos presentes',
    markAllHint: 'Solo cambia a quienes siguen sin marcar. No se guarda hasta que pulses «Guardar la asistencia».',
    unsaved_one: '{{value}} cambio sin guardar',
    unsaved_other: '{{value}} cambios sin guardar',
    allSaved: 'Todo guardado',
    saveFailed: 'No se guardó. Lo que marcaste sigue aquí: vuelve a intentarlo.',
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
    refused: 'No tienes permiso para hacerlo. Si crees que deberías, pide a la coordinación que revise tu asignación.',
    network: 'No hay conexión con el servidor. Revisa tu conexión e inténtalo de nuevo.',
    failed: 'No pudimos guardarlo. Inténtalo de nuevo.',
    failedStatus: 'No pudimos guardarlo. Inténtalo de nuevo. Código del error: {{status}}.'
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
    technical: 'Detalles',
    code: 'Código del error: {{status}}',
    hint: {
      invalid: 'No pudimos completar la consulta. Inténtalo de nuevo más tarde.',
      notFound: 'No encontramos lo que buscabas. Inténtalo de nuevo más tarde.',
      conflict: 'No pudimos completar la consulta. Inténtalo de nuevo más tarde.',
      refused: 'Tu cuenta no tiene acceso a esto. Si crees que debería tenerlo, pídeselo a quien administra la plataforma.',
      server: 'El servidor no pudo responder. Inténtalo de nuevo en unos minutos.',
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
    emptyHint:
      'When coordination assigns you as a teacher of an offering, it will appear here with its students, what is left to grade and its upcoming sessions.',
    toEnrollments: 'Go to My courses',
    enrolled_one: '{{value}} student',
    enrolled_other: '{{value}} students',
    pending_one: '{{value}} attempt to grade',
    pending_other: '{{value}} attempts to grade',
    nothingPending: 'Nothing to grade'
  },
  panel: {
    rail: 'Schedule',
    offerings: 'Your offerings',
    sessions: 'Sessions',
    noUpcoming: 'No upcoming sessions',
    upcoming_one: '{{value}} upcoming session',
    upcoming_other: '{{value}} upcoming sessions',
    figures: {
      offerings: 'Assigned offerings',
      pending: 'Attempts to grade',
      enrolled: 'Students'
    },
    tray: {
      title: 'To grade',
      order: 'Oldest first.',
      none: 'You have nothing to grade.',
      queue: 'See the queue',
      age: 'Submitted {{age}}',
      more_one: 'See {{value}} more submission in the queue',
      more_other: 'See {{value}} more submissions in the queue',
      retry: 'Retry: grading queue'
    },
    agenda: {
      title: 'Upcoming sessions',
      none: 'You have no upcoming sessions.',
      failed: 'We could not load your upcoming sessions.',
      retry: 'Retry: sessions',
      running: 'In progress',
      toAttendance: 'Take attendance',
      more_one: 'And {{count}} more session.',
      more_other: 'And {{count}} more sessions.'
    }
  },
  frame: {
    breadcrumbs: 'Path',
    sections: 'Offering sections',
    switch: 'Change offering',
    option: '{{course}}, {{dates}}',
    roster: 'Students',
    queue: 'Grading',
    queuePending: 'Grading ({{value}})',
    sessions: 'Sessions'
  },
  leave: {
    title: 'Leave without saving?',
    description: 'What you wrote and have not saved will be lost.',
    stay: 'Stay here',
    confirm: 'Leave without saving'
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
    loading: 'Loading the students…',
    notFound: 'This offering is not one of yours',
    notFoundHint: 'You only see the offerings you are assigned to as a teacher. The link may be for another offering, or the assignment is no longer current.',
    empty: 'This offering has no students yet.',
    heading_one: '{{value}} student',
    heading_other: '{{value}} students',
    summary: {
      title: 'Offering summary',
      students: 'Students',
      mean: 'Average progress',
      meanHint: 'Average of each student’s progress, rounded.',
      percent: '{{value}}%',
      attendance: 'Attendance',
      attendanceValue: '{{attended}} of {{total}}',
      attendanceHint: 'Attendances added up across all students.',
      pending: 'Assessments to grade'
    },
    lowest: {
      title: 'Lowest progress',
      description: 'Active enrollments, from lowest to highest percentage.',
      write: 'Write',
      writeLabel: 'Write to {{email}}'
    },
    search: 'Search by name or email',
    filters: 'Filter students',
    filterOption: '{{label}} ({{value}})',
    filter: {
      ALL: 'All',
      ACTIVA: 'Active',
      FINALIZADA: 'Finished',
      RETIRADA: 'Withdrawn',
      PENDING: 'With an assessment to grade'
    },
    shown_one: '{{shown}} of {{value}} student',
    shown_other: '{{shown}} of {{value}} students',
    noResults: 'Nobody matches the search',
    clearFilters: 'Clear the filters',
    sortBy: 'Sort by',
    sort: {
      'email-asc': 'Email, A to Z',
      'email-desc': 'Email, Z to A',
      'progress-asc': 'Lowest progress first',
      'progress-desc': 'Highest progress first',
      'attendance-asc': 'Lowest attendance first',
      'attendance-desc': 'Highest attendance first'
    },
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
    assessmentNone: 'No attempts',
    assessmentPending: 'Awaiting grading',
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
    loading: 'Loading the grading queue…',
    empty: 'Nothing left to grade',
    pendingCount_one: '{{value}} question to grade',
    pendingCount_other: '{{value}} questions to grade',
    student: 'Student',
    lesson: 'Assessment',
    submittedAt: 'Submitted',
    pendingQuestions: 'Questions to grade',
    action: 'Action',
    grade: 'Grade',
    gradeLabel: 'Grade “{{lesson}}” by {{student}}'
  },
  grading: {
    position: '{{position}} of {{total}}',
    positionLabel: 'Position in the queue',
    previous: 'Previous',
    next: 'Next',
    saveNext: 'Save and go to the next one',
    saveFinish: 'Save and finish',
    saveFailed: 'Not everything was saved. What you wrote is still here: check the message on the question and try again.',
    finished: 'You graded the last submission in the queue.',
    finishedSaved: 'Grading saved.',
    toQueue: 'Back to the queue',
    projected: 'With what you wrote and have not saved: {{score}} of {{max}} points',
    chosen: 'Chosen',
    rubricHint: 'Each chosen criterion adds its points to the grade. Only the grade and the comment are saved.',
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
    reasonDescription:
      'This question already has a grade. The change and its reason stay in the history, which is never deleted. It is read by the teachers of this offering and the administration, not by the student.',
    reasonConfirm: 'Change the grade',
    reasonNeeded: 'This grade is already set; changing it requires a reason. The server says: “{{detail}}”.'
  },
  sessions: {
    title: 'Offering sessions',
    loading: 'Loading the sessions…',
    empty: 'This offering has no sessions yet.',
    timeZone: 'Times in {{zone}}',
    new: 'Schedule a session',
    upcoming: 'Upcoming',
    past: 'Past',
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
    description: 'Students in this offering will get an alert and, if email is configured, an email too. A cancelled session cannot be reactivated.',
    confirm: 'Yes, cancel the session'
  },
  reschedule: {
    title: 'Reschedule “{{title}}”',
    description: 'The new date and time are in {{zone}}. Students in this offering will get an alert and, if email is configured, an email too.',
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
    creating: 'Creating…',
    close: 'Close without creating'
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
    summary: 'Attendance summary',
    unmarked: 'Not marked',
    rowUnsaved: 'Not saved',
    markAll: 'Mark everyone present',
    markAllHint: 'It only changes those still not marked. Nothing is saved until you press “Save the attendance”.',
    unsaved_one: '{{value}} unsaved change',
    unsaved_other: '{{value}} unsaved changes',
    allSaved: 'All saved',
    saveFailed: 'It was not saved. What you marked is still here: try again.',
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
    refused: 'You are not allowed to do this. If you think you should be, ask the coordinators to check your assignment.',
    network: 'There is no connection to the server. Check your connection and try again.',
    failed: 'We could not save it. Please try again.',
    failedStatus: 'We could not save it. Please try again. Error code: {{status}}.'
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
    technical: 'Details',
    code: 'Error code: {{status}}',
    hint: {
      invalid: 'We could not complete the request. Please try again later.',
      notFound: 'We could not find what you were looking for. Please try again later.',
      conflict: 'We could not complete the request. Please try again later.',
      refused: 'Your account does not have access to this. If you think it should, ask whoever runs the platform.',
      server: 'The server could not respond. Please try again in a few minutes.',
      network: 'Check your connection and try again.',
      unexpected: 'Something unexpected went wrong. Please try again.',
      contract: 'The response is not in the format this page expects; this usually happens during an update. Please try again in a few minutes.'
    },
    retry: 'Retry'
  }
}

export const teachingMessages = { es, en }
