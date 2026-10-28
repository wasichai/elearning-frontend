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
    toCatalog: 'Ver el catálogo',
    certified: 'Certificado emitido',
    certificate: 'Ver el certificado de «{{course}}»'
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
    empty: 'Este curso todavía no tiene lecciones.',
    more: 'Más del curso',
    finished: 'Este curso está finalizado: puedes repasarlo, pero ya no se registra avance ni se empiezan intentos.'
  },
  subpage: {
    back: '← Volver al aula'
  },
  completion: {
    section: 'Tu avance en esta lección',
    mark: 'Marcar como completada',
    marking: 'Guardando…',
    done: 'Lección completada',
    how: {
      EXPLICIT: 'Se completa al marcarla como completada.',
      VIDEO_END: 'Se completa al terminar el vídeo.',
      ASSESSMENT: 'Se completa al aprobar la evaluación.',
      ATTENDANCE: 'Se completa al asistir a la sesión.',
      NOT_YET: 'Esta evaluación o sesión todavía no está disponible.'
    },
    videoPart: 'Se completa al ver el {{percent}} % del vídeo.',
    next: 'Siguiente lección',
    nextLabel: 'Siguiente lección: {{lesson}}',
    pending: 'Te queda una lección anterior por hacer',
    courseDone: 'Has completado todas las lecciones disponibles del curso.',
    backToCourses: 'Volver a Mis cursos',
    conflict: 'Esta lección no se puede completar así. Ya te mostramos su estado actual.',
    failed: 'No pudimos guardar tu avance. Inténtalo de nuevo.'
  },
  assessment: {
    attempts: 'Intentos',
    attemptsValue: '{{used}} de {{max}} usados',
    timeLimit: 'Tiempo por intento',
    noTimeLimit: 'Sin límite',
    passing: 'Nota para aprobar',
    percent: '{{value}} %',
    best: 'Tu mejor resultado',
    noBest: 'Aún sin intentos enviados',
    bestPending: 'Pendiente de corrección',
    bestPassed: '{{value}} % · aprobado',
    bestFailed: '{{value}} % · no aprobado',
    timerStarts: 'Tendrás {{value}} min desde que empieces; el plazo lo controla el servidor.',
    start: 'Empezar el intento',
    retry: 'Empezar otro intento',
    starting: 'Empezando…',
    resume: 'Retomar el intento abierto',
    exhausted_one: 'Ya usaste tu único intento.',
    exhausted_other: 'Ya usaste tus {{count}} intentos.',
    back: '← Volver a la evaluación'
  },
  attempt: {
    loading: 'Cargando el intento…',
    notFound: 'No encontramos este intento entre los tuyos.',
    title: 'Intento {{number}}',
    answered: '{{answered}} de {{total}} preguntas respondidas',
    noLimit: 'Sin límite de tiempo',
    timeLeft: 'Tiempo restante',
    deadline: 'Hasta el {{when}} ({{zone}})',
    stage: {
      fiveMinutes: 'Quedan 5 minutos para enviar el intento.',
      oneMinute: 'Queda 1 minuto para enviar el intento.',
      over: 'Se acabó el tiempo del intento.'
    },
    expiredLocal: 'Se acabó el tiempo. El servidor solo acepta lo que llegó dentro del plazo: si envías ahora, puede rechazarlo.',
    save: 'Guardar respuestas',
    saving: 'Guardando…',
    saved: 'Respuestas guardadas a las {{time}}',
    submit: 'Enviar el intento',
    submitting: 'Enviando…',
    confirmTitle: '¿Enviar el intento?',
    confirmAll: 'Respondiste todas las preguntas. Después de enviarlo no podrás cambiar tus respuestas.',
    confirmUnanswered_one: 'Te queda {{count}} pregunta sin responder ({{answered}} de {{total}}). Después de enviarlo no podrás cambiar tus respuestas.',
    confirmUnanswered_other: 'Te quedan {{count}} preguntas sin responder ({{answered}} de {{total}}). Después de enviarlo no podrás cambiar tus respuestas.',
    confirmSubmit: 'Enviar',
    confirmCancel: 'Seguir respondiendo',
    expired: 'El plazo de este intento ya venció',
    conflict: 'El servidor no aceptó el cambio',
    serverSays: 'El servidor dice: «{{detail}}». Te mostramos el estado actual.',
    invalid: 'Alguna respuesta no corresponde a su pregunta. Revísalas e inténtalo de nuevo.',
    failed: 'No pudimos guardar el intento. Inténtalo de nuevo.',
    failedStatus: 'No pudimos guardar el intento (error {{status}}). Inténtalo de nuevo.'
  },
  question: {
    prompt: '{{order}}. {{prompt}}',
    points_one: '{{value}} punto',
    points_other: '{{value}} puntos',
    type: {
      SINGLE: 'Una respuesta',
      MULTIPLE: 'Varias respuestas',
      TRUE_FALSE: 'Verdadero o falso',
      SHORT: 'Respuesta corta',
      OPEN: 'Respuesta abierta',
      FILE: 'Entrega de archivo'
    },
    shortPlaceholder: 'Tu respuesta',
    rubric: 'Se corrige con esta rúbrica:',
    criterion: '{{description}} ({{points}})',
    fileNone: 'Aún no entregaste ningún archivo.',
    fileDelivered: 'Entregado: {{name}}',
    fileDeliveredUnnamed: 'Archivo entregado',
    fileHint: 'Un archivo de hasta {{size}}. Elegir otro reemplaza la entrega mientras el intento esté abierto.',
    fileTooBig: 'El archivo supera el máximo de {{size}}.',
    uploading: 'Subiendo el archivo…',
    uploadFailed: 'No pudimos subir el archivo. Inténtalo de nuevo.',
    uploadFailedStatus: 'No pudimos subir el archivo (error {{status}}). Inténtalo de nuevo.'
  },
  result: {
    title: 'Resultado del intento {{number}}',
    pending: 'Pendiente de corrección',
    pendingHint: 'Tu docente corregirá las preguntas que lo necesitan. Por ahora llevas {{score}} de {{max}} puntos.',
    passed: '{{percent}} % · Aprobado',
    failed: '{{percent}} % · No aprobado',
    score: '{{score}} de {{max}} puntos; se aprueba con {{passing}} %.',
    yourAnswer: 'Tu respuesta:',
    noAnswer: 'sin responder',
    questionPoints: '{{points}} de {{max}} puntos',
    questionPending: 'Pendiente de corrección',
    correct: 'Correcta',
    incorrect: 'Incorrecta',
    comment: 'Comentario del docente:',
    solution: 'Respuesta correcta: {{answer}}',
    accepted: 'Respuestas aceptadas: {{answers}}'
  },
  sessions: {
    title: 'Sesiones en vivo',
    loading: 'Cargando las sesiones…',
    none: 'Este curso no tiene sesiones en vivo.',
    noneForLesson: 'Esta lección aún no tiene sesión programada.',
    ofLesson: 'La sesión de esta lección',
    timeZone: 'Horas en {{zone}}',
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
    join: 'Entrar a la sesión',
    joinLabel: 'Entrar a la sesión «{{title}}» (se abre en otra pestaña)',
    toLesson: 'Ver la lección',
    attendance: 'Tu asistencia:',
    attendanceNone: 'aún sin registrar',
    attendanceStatus: {
      PRESENTE: 'presente',
      TARDE: 'tarde',
      AUSENTE: 'ausente',
      JUSTIFICADO: 'justificada'
    }
  },
  completionPanel: {
    title: 'Finalización y certificado',
    titleIssued: 'Tu certificado',
    loading: 'Cargando las reglas de finalización…',
    rules: 'Para terminar el curso',
    noRules: 'Este curso no declara reglas de finalización.',
    met: 'Cumples todas las reglas: ya puedes pedir tu certificado.',
    notMet: 'Aún te falta alguna regla.',
    rule: {
      LESSONS: 'Completar todas las lecciones',
      ASSESSMENTS: 'Aprobar todas las evaluaciones',
      ATTENDANCE: 'Asistencia mínima a las sesiones'
    },
    ruleMet: '(cumplida)',
    rulePending: '(pendiente)'
  },
  certificate: {
    view: 'Ver e imprimir el certificado',
    issuedTitle: 'Tu certificado',
    issued: 'Certificado emitido a nombre de {{name}}.',
    alreadyIssued: 'Ya tenías un certificado emitido a nombre de {{name}}; es el mismo, no se emite otro.',
    code: 'Código de verificación: {{code}}',
    requestTitle: 'Pedir el certificado',
    name: 'Nombre para el certificado',
    nameHint: 'Tal como quieres que aparezca, hasta {{max}} caracteres. No se puede cambiar después.',
    nameInvalid: 'Escribe un nombre de 1 a {{max}} caracteres.',
    request: 'Emitir mi certificado',
    requesting: 'Emitiendo…',
    notYet: 'Cuando cumplas todas las reglas podrás pedir aquí tu certificado.',
    pendingRules: 'El servidor indica que aún falta alguna regla; arriba está la lista actualizada.',
    failed: 'No pudimos emitir el certificado. Inténtalo de nuevo.',
    failedStatus: 'No pudimos emitir el certificado (error {{status}}). Inténtalo de nuevo.',
    documentTitle: 'Certificado de {{name}} · {{course}}',
    heading: 'Certificado de aprobación',
    certifies: 'Se certifica que',
    passedCourse: 'aprobó el curso «{{course}}».',
    completedCourse: 'completó el curso «{{course}}».',
    courseCode: 'Curso',
    courseVersion: '{{code}} · versión {{version}}',
    offering: 'Edición',
    hours: 'Carga de trabajo',
    hoursValue: '{{value}} h',
    issuedAt: 'Emitido el',
    rule: '{{rule}}: {{detail}}',
    verifyCode: 'Código {{code}}',
    verifyAt: 'Verificable en {{url}}',
    print: 'Imprimir'
  },
  verify: {
    title: 'Verificar un certificado',
    subtitle: 'Escribe el código que figura en el certificado para comprobar que es auténtico.',
    code: 'Código del certificado',
    placeholder: 'XXXX-XXXX-XXXX',
    submit: 'Verificar',
    notFound: 'No hay ningún certificado con ese código',
    notFoundHint: 'Revisa el código «{{code}}»: puede tener un error de escritura.',
    loading: 'Verificando el certificado…',
    valid: 'Certificado auténtico, emitido por esta plataforma.',
    another: 'Verificar otro certificado'
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
    attempt: {
      invalid: 'No pudimos abrir el intento',
      notFound: 'No encontramos este intento',
      conflict: 'No pudimos abrir el intento',
      refused: 'No pudimos abrir el intento',
      server: 'No pudimos cargar el intento',
      network: 'No pudimos conectar con el servidor',
      contract: 'No pudimos leer la respuesta del servidor'
    },
    sessions: {
      invalid: 'No pudimos cargar las sesiones',
      notFound: 'No encontramos las sesiones de este curso',
      conflict: 'No pudimos cargar las sesiones',
      refused: 'No pudimos cargar las sesiones',
      server: 'No pudimos cargar las sesiones',
      network: 'No pudimos conectar con el servidor',
      contract: 'No pudimos leer la respuesta del servidor'
    },
    completion: {
      invalid: 'No pudimos cargar las reglas de finalización',
      notFound: 'No encontramos este curso en tus matrículas',
      conflict: 'No pudimos cargar las reglas de finalización',
      refused: 'No pudimos cargar las reglas de finalización',
      server: 'No pudimos cargar las reglas de finalización',
      network: 'No pudimos conectar con el servidor',
      contract: 'No pudimos leer la respuesta del servidor'
    },
    certificate: {
      invalid: 'No pudimos verificar el certificado',
      notFound: 'No hay ningún certificado con ese código',
      conflict: 'No pudimos verificar el certificado',
      refused: 'No pudimos verificar el certificado',
      server: 'No pudimos verificar el certificado',
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
    toCatalog: 'Browse the catalog',
    certified: 'Certificate issued',
    certificate: 'View the certificate for “{{course}}”'
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
    empty: 'This course has no lessons yet.',
    more: 'More from the course',
    finished: 'This course is finished: you can review it, but progress is no longer recorded and no new attempts can be started.'
  },
  subpage: {
    back: '← Back to the classroom'
  },
  completion: {
    section: 'Your progress in this lesson',
    mark: 'Mark as completed',
    marking: 'Saving…',
    done: 'Lesson completed',
    how: {
      EXPLICIT: 'Completed when you mark it as completed.',
      VIDEO_END: 'Completed when the video ends.',
      ASSESSMENT: 'Completed when you pass the assessment.',
      ATTENDANCE: 'Completed when you attend the session.',
      NOT_YET: 'This assessment or session is not available yet.'
    },
    videoPart: 'Completed when you have watched {{percent}}% of the video.',
    next: 'Next lesson',
    nextLabel: 'Next lesson: {{lesson}}',
    pending: 'You still have an earlier lesson to do',
    courseDone: 'You have completed every available lesson in the course.',
    backToCourses: 'Back to My courses',
    conflict: 'This lesson cannot be completed this way. Here is its current state.',
    failed: 'We could not save your progress. Please try again.'
  },
  assessment: {
    attempts: 'Attempts',
    attemptsValue: '{{used}} of {{max}} used',
    timeLimit: 'Time per attempt',
    noTimeLimit: 'No limit',
    passing: 'Pass mark',
    percent: '{{value}}%',
    best: 'Your best result',
    noBest: 'No attempts submitted yet',
    bestPending: 'Awaiting grading',
    bestPassed: '{{value}}% · passed',
    bestFailed: '{{value}}% · not passed',
    timerStarts: 'You will have {{value}} min from the moment you start; the server keeps the time.',
    start: 'Start the attempt',
    retry: 'Start another attempt',
    starting: 'Starting…',
    resume: 'Resume the open attempt',
    exhausted_one: 'You have used your only attempt.',
    exhausted_other: 'You have used all {{count}} attempts.',
    back: '← Back to the assessment'
  },
  attempt: {
    loading: 'Loading the attempt…',
    notFound: 'We could not find this attempt among yours.',
    title: 'Attempt {{number}}',
    answered: '{{answered}} of {{total}} questions answered',
    noLimit: 'No time limit',
    timeLeft: 'Time left',
    deadline: 'Until {{when}} ({{zone}})',
    stage: {
      fiveMinutes: '5 minutes left to submit the attempt.',
      oneMinute: '1 minute left to submit the attempt.',
      over: 'The time for this attempt is over.'
    },
    expiredLocal: 'Time is up. The server only accepts what arrived on time: if you submit now, it may refuse it.',
    save: 'Save answers',
    saving: 'Saving…',
    saved: 'Answers saved at {{time}}',
    submit: 'Submit the attempt',
    submitting: 'Submitting…',
    confirmTitle: 'Submit the attempt?',
    confirmAll: 'You answered every question. Once submitted, you cannot change your answers.',
    confirmUnanswered_one: '{{count}} question is still unanswered ({{answered}} of {{total}}). Once submitted, you cannot change your answers.',
    confirmUnanswered_other: '{{count}} questions are still unanswered ({{answered}} of {{total}}). Once submitted, you cannot change your answers.',
    confirmSubmit: 'Submit',
    confirmCancel: 'Keep answering',
    expired: 'The deadline for this attempt has passed',
    conflict: 'The server did not accept the change',
    serverSays: 'The server says: “{{detail}}”. Here is the current state.',
    invalid: 'Some answer does not match its question. Check them and try again.',
    failed: 'We could not save the attempt. Please try again.',
    failedStatus: 'We could not save the attempt (error {{status}}). Please try again.'
  },
  question: {
    prompt: '{{order}}. {{prompt}}',
    points_one: '{{value}} point',
    points_other: '{{value}} points',
    type: {
      SINGLE: 'One answer',
      MULTIPLE: 'Several answers',
      TRUE_FALSE: 'True or false',
      SHORT: 'Short answer',
      OPEN: 'Open answer',
      FILE: 'File upload'
    },
    shortPlaceholder: 'Your answer',
    rubric: 'Graded with this rubric:',
    criterion: '{{description}} ({{points}})',
    fileNone: 'You have not uploaded a file yet.',
    fileDelivered: 'Uploaded: {{name}}',
    fileDeliveredUnnamed: 'File uploaded',
    fileHint: 'One file up to {{size}}. Choosing another replaces it while the attempt is open.',
    fileTooBig: 'The file is larger than the {{size}} limit.',
    uploading: 'Uploading the file…',
    uploadFailed: 'We could not upload the file. Please try again.',
    uploadFailedStatus: 'We could not upload the file (error {{status}}). Please try again.'
  },
  result: {
    title: 'Result of attempt {{number}}',
    pending: 'Awaiting grading',
    pendingHint: 'Your teacher will grade the questions that need it. So far you have {{score}} of {{max}} points.',
    passed: '{{percent}}% · Passed',
    failed: '{{percent}}% · Not passed',
    score: '{{score}} of {{max}} points; the pass mark is {{passing}}%.',
    yourAnswer: 'Your answer:',
    noAnswer: 'not answered',
    questionPoints: '{{points}} of {{max}} points',
    questionPending: 'Awaiting grading',
    correct: 'Correct',
    incorrect: 'Incorrect',
    comment: 'Teacher’s comment:',
    solution: 'Correct answer: {{answer}}',
    accepted: 'Accepted answers: {{answers}}'
  },
  sessions: {
    title: 'Live sessions',
    loading: 'Loading the sessions…',
    none: 'This course has no live sessions.',
    noneForLesson: 'This lesson has no session scheduled yet.',
    ofLesson: 'The session for this lesson',
    timeZone: 'Times in {{zone}}',
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
    join: 'Join the session',
    joinLabel: 'Join the session “{{title}}” (opens in a new tab)',
    toLesson: 'Go to the lesson',
    attendance: 'Your attendance:',
    attendanceNone: 'not recorded yet',
    attendanceStatus: {
      PRESENTE: 'present',
      TARDE: 'late',
      AUSENTE: 'absent',
      JUSTIFICADO: 'excused'
    }
  },
  completionPanel: {
    title: 'Completion and certificate',
    titleIssued: 'Your certificate',
    loading: 'Loading the completion rules…',
    rules: 'To finish the course',
    noRules: 'This course declares no completion rules.',
    met: 'You meet every rule: you can now request your certificate.',
    notMet: 'Some rule is still pending.',
    rule: {
      LESSONS: 'Complete every lesson',
      ASSESSMENTS: 'Pass every assessment',
      ATTENDANCE: 'Minimum session attendance'
    },
    ruleMet: '(met)',
    rulePending: '(pending)'
  },
  certificate: {
    view: 'View and print the certificate',
    issuedTitle: 'Your certificate',
    issued: 'Certificate issued to {{name}}.',
    alreadyIssued: 'You already had a certificate issued to {{name}}; it is the same one, no new one is issued.',
    code: 'Verification code: {{code}}',
    requestTitle: 'Request the certificate',
    name: 'Name on the certificate',
    nameHint: 'As you want it to appear, up to {{max}} characters. It cannot be changed later.',
    nameInvalid: 'Enter a name of 1 to {{max}} characters.',
    request: 'Issue my certificate',
    requesting: 'Issuing…',
    notYet: 'Once you meet every rule you can request your certificate here.',
    pendingRules: 'The server says some rule is still pending; the list above is up to date.',
    failed: 'We could not issue the certificate. Please try again.',
    failedStatus: 'We could not issue the certificate (error {{status}}). Please try again.',
    documentTitle: 'Certificate of {{name}} · {{course}}',
    heading: 'Certificate of achievement',
    certifies: 'This certifies that',
    passedCourse: 'passed the course “{{course}}”.',
    completedCourse: 'completed the course “{{course}}”.',
    courseCode: 'Course',
    courseVersion: '{{code}} · version {{version}}',
    offering: 'Offering',
    hours: 'Workload',
    hoursValue: '{{value}} h',
    issuedAt: 'Issued on',
    rule: '{{rule}}: {{detail}}',
    verifyCode: 'Code {{code}}',
    verifyAt: 'Verify at {{url}}',
    print: 'Print'
  },
  verify: {
    title: 'Verify a certificate',
    subtitle: 'Enter the code shown on the certificate to check that it is genuine.',
    code: 'Certificate code',
    placeholder: 'XXXX-XXXX-XXXX',
    submit: 'Verify',
    notFound: 'There is no certificate with that code',
    notFoundHint: 'Check the code “{{code}}”: it may contain a typo.',
    loading: 'Verifying the certificate…',
    valid: 'Genuine certificate, issued by this platform.',
    another: 'Verify another certificate'
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
    attempt: {
      invalid: 'We could not open the attempt',
      notFound: 'We could not find this attempt',
      conflict: 'We could not open the attempt',
      refused: 'We could not open the attempt',
      server: 'We could not load the attempt',
      network: 'We could not reach the server',
      contract: 'We could not read the server response'
    },
    sessions: {
      invalid: 'We could not load the sessions',
      notFound: 'We could not find the sessions of this course',
      conflict: 'We could not load the sessions',
      refused: 'We could not load the sessions',
      server: 'We could not load the sessions',
      network: 'We could not reach the server',
      contract: 'We could not read the server response'
    },
    completion: {
      invalid: 'We could not load the completion rules',
      notFound: 'We could not find this course among your enrollments',
      conflict: 'We could not load the completion rules',
      refused: 'We could not load the completion rules',
      server: 'We could not load the completion rules',
      network: 'We could not reach the server',
      contract: 'We could not read the server response'
    },
    certificate: {
      invalid: 'We could not verify the certificate',
      notFound: 'There is no certificate with that code',
      conflict: 'We could not verify the certificate',
      refused: 'We could not verify the certificate',
      server: 'We could not verify the certificate',
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
