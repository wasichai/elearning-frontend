// textos del módulo, espacio de nombres 'catalog' (= id del módulo)
const es = {
  nav: { courses: 'Catálogo' },
  catalog: {
    title: 'Catálogo de cursos',
    subtitle: 'Cursos abiertos, con su carga de trabajo y sus próximas ediciones.',
    eyebrow: 'Catálogo · cursos y próximas ediciones',
    results: 'Resultados',
    loading: 'Cargando cursos…',
    count_one: '{{count, number}} curso',
    count_other: '{{count, number}} cursos',
    groupCount_one: '{{count, number}} curso',
    groupCount_other: '{{count, number}} cursos',
    groupCountOnPage_one: '{{count, number}} curso en esta página',
    groupCountOnPage_other: '{{count, number}} cursos en esta página',
    noCollection: 'Sin colección'
  },
  filters: {
    legend: 'Filtrar cursos',
    search: 'Buscar cursos',
    searchPlaceholder: 'Título o tema',
    submit: 'Buscar',
    all: 'Cualquiera',
    category: 'Categoría',
    categoryOption: '{{name}} ({{count, number}})',
    categoryAll: 'Todas',
    categoryCount: '({{count, number}})',
    more: 'Más filtros',
    moreActive_one: '{{count, number}} activo',
    moreActive_other: '{{count, number}} activos',
    active: 'Filtros activos',
    activeValue: '{{label}}: {{value}}',
    removeOne: 'Quitar filtro {{filter}}',
    query: 'Búsqueda',
    showResults_one: 'Ver {{count, number}} curso',
    showResults_other: 'Ver {{count, number}} cursos',
    showResultsPending: 'Ver resultados',
    level: 'Nivel',
    modality: 'Modalidad',
    startsFrom: 'Empieza desde',
    sort: 'Ordenar por',
    page: 'Página',
    size: 'Tamaño de página',
    duration: 'Duración',
    enrollmentOpen: 'Inscripción',
    prerequisiteKnowledge: 'Conocimientos previos',
    minTheoryHours: 'Horas de teoría (mínimo)',
    minPracticeHours: 'Horas de práctica o laboratorio (mínimo)',
    minAutonomousHours: 'Horas de trabajo autónomo (mínimo)',
    clear: 'Limpiar filtros'
  },
  duration: {
    upTo2: 'Hasta 2 semanas',
    from3to8: 'De 3 a 8 semanas',
    semester: 'Semestral (12 a 26 semanas)',
    range: 'De {{min}} a {{max}} semanas'
  },
  enrollmentFilter: {
    true: 'Con inscripción abierta',
    false: 'Sin inscripción abierta'
  },
  knowledgeFilter: {
    none: 'Sin conocimientos previos'
  },
  sort: {
    upcoming: 'Próxima edición',
    title: 'Título',
    duration: 'Duración'
  },
  level: {
    INICIAL: 'Inicial',
    INTERMEDIO: 'Intermedio',
    AVANZADO: 'Avanzado'
  },
  modality: {
    ASINCRONA: 'Asíncrona',
    SINCRONA: 'Síncrona',
    HIBRIDA: 'Híbrida',
    PRESENCIAL: 'Presencial'
  },
  course: {
    illustrative: 'Contenido ilustrativo',
    level: 'Nivel',
    modality: 'Modalidad',
    duration: 'Duración',
    durationValue_one: '{{count, number}} semana · {{hours}} h',
    durationValue_other: '{{count, number}} semanas · {{hours}} h'
  },
  offering: {
    next: 'Próxima edición:',
    nextLabel: 'Próxima edición',
    none: 'Sin ediciones programadas por ahora',
    state: {
      open: 'Inscripción abierta',
      closed: 'Inscripción cerrada',
      full: 'Edición completa',
      running: 'En curso',
      scheduled: 'Inscripción aún no abierta'
    }
  },
  detail: {
    back: '← Catálogo',
    loading: 'Cargando el curso…',
    onThisPage: 'En esta página',
    about: 'Datos del curso',
    credits: 'Créditos',
    creditsApproved: '{{value}} {{system}}',
    creditsProposed: '{{value}} {{system}}, propuesta',
    syllabusUnits_one: '{{count}} unidad',
    syllabusUnits_other: '{{count}} unidades',
    syllabusLessons_one: '{{count}} lección',
    syllabusLessons_other: '{{count}} lecciones',
    syllabusCount: '{{units}} y {{lessons}}',
    noOfferingsHint: 'Vuelve a esta página más adelante.',
    offeringHint: {
      full: 'No quedan plazas en esta edición.',
      closed: 'Ya no se admiten matrículas en esta edición.',
      running: 'Esta edición ya empezó y no admite matrículas.',
      scheduled: 'Esta edición todavía no admite matrículas.'
    },
    notFoundHint: 'No existe, ya no está publicado o el enlace está mal escrito.',
    language: 'Idioma',
    code: 'Código',
    version: 'Versión',
    versionNumber: '{{number}}',
    versionPublished: '{{number}}, publicada el {{date}}',
    goals: 'Qué aprenderás',
    objectives: 'Objetivos',
    outcomes: 'Resultados de aprendizaje',
    before: 'Antes de empezar',
    prerequisiteKnowledge: 'Conocimientos previos',
    requirements: 'Requisitos',
    syllabus: 'Temario',
    unitNumber: 'Unidad {{order}}.',
    unitMeta_one: '{{count}} lección · {{hours}} h estimadas',
    unitMeta_other: '{{count}} lecciones · {{hours}} h estimadas',
    unitLessons_one: '{{count}} lección',
    unitLessons_other: '{{count}} lecciones',
    minutes: '{{value}} min',
    offerings: 'Ediciones',
    yourOffering: 'Tu edición',
    otherOfferings: 'Otras ediciones',
    collection: 'Colección',
    enrollment: 'Inscripción',
    until: 'hasta el {{date}}',
    schedule: 'Horario',
    capacity: 'Plazas',
    seats_one: '{{count}} plaza',
    seats_other: '{{count}} plazas',
    timeZone: 'Fechas en',
    timeZoneValue: '{{name}} ({{zone}})',
    offeringTeachers: 'Docentes',
    teacherWithRole: '{{name}} ({{role}})',
    teachers: 'Docentes',
    workload: 'Carga de trabajo',
    workloadAndCredits: 'Carga de trabajo y créditos',
    assessmentAndCertification: 'Evaluación y certificación',
    assessment: 'Evaluación',
    certification: 'Certificación',
    sources: 'Fuentes'
  },
  enroll: {
    action: 'Matricularme',
    actionLabel: 'Matricularme en la edición {{dates}}',
    enrolling: 'Matriculando…',
    goToCourse: 'Ir al curso',
    enrolled: 'Tienes matrícula',
    finished: 'Matrícula finalizada',
    enrolledElsewhere: 'Ya tienes matrícula en este curso.',
    signIn: 'Inicia sesión para matricularte',
    conflict: 'No pudimos matricularte en esta edición.',
    unavailable: 'Esta edición ya no está disponible.',
    forbidden: 'Tu cuenta no puede matricularse en cursos. Consulta con tu institución.',
    termsRequired: 'Para matricularte debes aceptar los términos de uso.',
    forbiddenUnknown: 'No pudimos matricularte ni comprobar por qué. Inténtalo de nuevo.',
    failed: 'No pudimos matricularte. Inténtalo de nuevo.'
  },
  lessonType: {
    LECTURA: 'Lectura',
    VIDEO: 'Vídeo',
    PRESENTACION: 'Presentación',
    LABORATORIO: 'Laboratorio',
    EVALUACION: 'Evaluación',
    SESION: 'Sesión en vivo'
  },
  teacherRole: {
    TITULAR: 'titular',
    ASISTENTE: 'asistente'
  },
  workload: {
    caption_one: 'Horas en {{count}} semana',
    caption_other: 'Horas en {{count}} semanas',
    component: 'Componente',
    perWeek: 'Por semana',
    total: 'Total',
    theory: 'Teoría',
    practice: 'Práctica',
    supervised: 'Supervisadas',
    autonomous: 'Autónomas',
    sum: 'Total',
    contact: 'Horas de contacto',
    directed: 'Horas dirigidas',
    hours: '{{value}} h'
  },
  credits: {
    proposed_one: '{{value}} crédito {{system}} propuesto — no oficial',
    proposed_other: '{{value}} créditos {{system}} propuestos — no oficiales',
    approved: 'Créditos aprobados: {{value}} {{system}}',
    warnings: 'Avisos de la propuesta',
    how: 'Cómo se calculó',
    method: 'Método',
    parameters: 'Parámetros',
    calculation: 'Cálculo',
    calculationValue: '{{hours}} h → {{calculated}} calculados → {{proposed}} propuestos',
    policy: 'Política',
    policyValue: '{{id}}, versión {{version}}',
    source: 'Fuente'
  },
  empty: {
    none: 'Todavía no hay cursos publicados',
    filtered: 'Ningún curso coincide con la búsqueda',
    filteredHint: 'Prueba con menos filtros o con otras palabras.',
    pastLastPage: 'Esta página ya no tiene cursos',
    firstPage: 'Ir a la primera página'
  },
  problem: {
    catalog: {
      invalid: 'Algún filtro de la búsqueda no es válido',
      notFound: 'El catálogo no está disponible',
      refused: 'El catálogo no está disponible',
      server: 'No pudimos cargar el catálogo',
      network: 'No pudimos conectar con el servidor',
      contract: 'No pudimos leer la respuesta del servidor'
    },
    course: {
      invalid: 'No pudimos abrir este curso',
      notFound: 'Curso no encontrado',
      refused: 'No pudimos abrir este curso',
      server: 'No pudimos cargar el curso',
      network: 'No pudimos conectar con el servidor',
      contract: 'No pudimos leer la respuesta del servidor'
    },
    technical: 'Detalles',
    code: 'Código del error: {{status}}',
    hint: {
      invalid: 'Revisa los filtros o empieza de nuevo.',
      notFound: 'No encontramos lo que buscabas. Inténtalo de nuevo más tarde.',
      refused: 'Tu cuenta no tiene acceso a esto. Si crees que debería tenerlo, pídeselo a quien administra la plataforma.',
      server: 'El servidor no pudo responder. Inténtalo de nuevo en unos minutos.',
      network: 'Comprueba tu conexión e inténtalo de nuevo.',
      unexpected: 'Ocurrió un error inesperado. Inténtalo de nuevo.',
      contract: 'La respuesta no tiene el formato que esta página espera; suele pasar durante una actualización. Inténtalo de nuevo en unos minutos.'
    },
    violation: '{{field}}: {{message}}',
    retry: 'Reintentar'
  }
}

// mismas claves que es: el tipo lo exige al compilar e i18n.test.ts lo comprueba hoja a hoja
const en: typeof es = {
  nav: { courses: 'Catalog' },
  catalog: {
    title: 'Course catalog',
    subtitle: 'Open courses, with their workload and upcoming offerings.',
    eyebrow: 'Catalog · courses and upcoming offerings',
    results: 'Results',
    loading: 'Loading courses…',
    count_one: '{{count, number}} course',
    count_other: '{{count, number}} courses',
    groupCount_one: '{{count, number}} course',
    groupCount_other: '{{count, number}} courses',
    groupCountOnPage_one: '{{count, number}} course on this page',
    groupCountOnPage_other: '{{count, number}} courses on this page',
    noCollection: 'No collection'
  },
  filters: {
    legend: 'Filter courses',
    search: 'Search courses',
    searchPlaceholder: 'Title or topic',
    submit: 'Search',
    all: 'Any',
    category: 'Category',
    categoryOption: '{{name}} ({{count, number}})',
    categoryAll: 'All',
    categoryCount: '({{count, number}})',
    more: 'More filters',
    moreActive_one: '{{count, number}} active',
    moreActive_other: '{{count, number}} active',
    active: 'Active filters',
    activeValue: '{{label}}: {{value}}',
    removeOne: 'Remove filter {{filter}}',
    query: 'Search',
    showResults_one: 'Show {{count, number}} course',
    showResults_other: 'Show {{count, number}} courses',
    showResultsPending: 'Show results',
    level: 'Level',
    modality: 'Mode',
    startsFrom: 'Starting from',
    sort: 'Sort by',
    page: 'Page',
    size: 'Page size',
    duration: 'Duration',
    enrollmentOpen: 'Enrollment',
    prerequisiteKnowledge: 'Prior knowledge',
    minTheoryHours: 'Theory hours (minimum)',
    minPracticeHours: 'Practice or lab hours (minimum)',
    minAutonomousHours: 'Self-study hours (minimum)',
    clear: 'Clear filters'
  },
  duration: {
    upTo2: 'Up to 2 weeks',
    from3to8: '3 to 8 weeks',
    semester: 'Semester (12 to 26 weeks)',
    range: '{{min}} to {{max}} weeks'
  },
  enrollmentFilter: {
    true: 'Open for enrollment',
    false: 'Not open for enrollment'
  },
  knowledgeFilter: {
    none: 'No prior knowledge'
  },
  sort: {
    upcoming: 'Next offering',
    title: 'Title',
    duration: 'Duration'
  },
  level: {
    INICIAL: 'Beginner',
    INTERMEDIO: 'Intermediate',
    AVANZADO: 'Advanced'
  },
  modality: {
    ASINCRONA: 'Self-paced',
    SINCRONA: 'Live online',
    HIBRIDA: 'Blended',
    PRESENCIAL: 'In person'
  },
  course: {
    illustrative: 'Illustrative content',
    level: 'Level',
    modality: 'Mode',
    duration: 'Duration',
    durationValue_one: '{{count, number}} week · {{hours}} h',
    durationValue_other: '{{count, number}} weeks · {{hours}} h'
  },
  offering: {
    next: 'Next offering:',
    nextLabel: 'Next offering',
    none: 'No offerings scheduled yet',
    state: {
      open: 'Enrollment open',
      closed: 'Enrollment closed',
      full: 'Offering full',
      running: 'In progress',
      scheduled: 'Enrollment not open yet'
    }
  },
  detail: {
    back: '← Catalog',
    loading: 'Loading the course…',
    onThisPage: 'On this page',
    about: 'Course details',
    credits: 'Credits',
    creditsApproved: '{{value}} {{system}}',
    creditsProposed: '{{value}} {{system}}, proposed',
    syllabusUnits_one: '{{count}} unit',
    syllabusUnits_other: '{{count}} units',
    syllabusLessons_one: '{{count}} lesson',
    syllabusLessons_other: '{{count}} lessons',
    syllabusCount: '{{units}} and {{lessons}}',
    noOfferingsHint: 'Check this page again later.',
    offeringHint: {
      full: 'There are no seats left in this offering.',
      closed: 'This offering no longer accepts enrollments.',
      running: 'This offering has started and does not accept enrollments.',
      scheduled: 'This offering does not accept enrollments yet.'
    },
    notFoundHint: 'It does not exist, is no longer published, or the link is mistyped.',
    language: 'Language',
    code: 'Code',
    version: 'Version',
    versionNumber: '{{number}}',
    versionPublished: '{{number}}, published {{date}}',
    goals: 'What you will learn',
    objectives: 'Objectives',
    outcomes: 'Learning outcomes',
    before: 'Before you start',
    prerequisiteKnowledge: 'Prior knowledge',
    requirements: 'Requirements',
    syllabus: 'Syllabus',
    unitNumber: 'Unit {{order}}.',
    unitMeta_one: '{{count}} lesson · {{hours}} h estimated',
    unitMeta_other: '{{count}} lessons · {{hours}} h estimated',
    unitLessons_one: '{{count}} lesson',
    unitLessons_other: '{{count}} lessons',
    minutes: '{{value}} min',
    offerings: 'Offerings',
    yourOffering: 'Your offering',
    otherOfferings: 'Other offerings',
    collection: 'Collection',
    enrollment: 'Enrollment',
    until: 'until {{date}}',
    schedule: 'Schedule',
    capacity: 'Seats',
    seats_one: '{{count}} seat',
    seats_other: '{{count}} seats',
    timeZone: 'Dates in',
    timeZoneValue: '{{name}} ({{zone}})',
    offeringTeachers: 'Teachers',
    teacherWithRole: '{{name}} ({{role}})',
    teachers: 'Teachers',
    workload: 'Workload',
    workloadAndCredits: 'Workload and credits',
    assessmentAndCertification: 'Assessment and certification',
    assessment: 'Assessment',
    certification: 'Certification',
    sources: 'Sources'
  },
  enroll: {
    action: 'Enroll',
    actionLabel: 'Enroll in the {{dates}} offering',
    enrolling: 'Enrolling…',
    goToCourse: 'Go to the course',
    enrolled: 'You are enrolled',
    finished: 'Enrollment finished',
    enrolledElsewhere: 'You are already enrolled in this course.',
    signIn: 'Sign in to enroll',
    conflict: 'We could not enroll you in this offering.',
    unavailable: 'This offering is no longer available.',
    forbidden: 'Your account cannot enroll in courses. Please ask your institution.',
    termsRequired: 'To enroll you need to accept the terms of use.',
    forbiddenUnknown: 'We could not enroll you or check why. Please try again.',
    failed: 'We could not enroll you. Please try again.'
  },
  lessonType: {
    LECTURA: 'Reading',
    VIDEO: 'Video',
    PRESENTACION: 'Slides',
    LABORATORIO: 'Lab',
    EVALUACION: 'Assessment',
    SESION: 'Live session'
  },
  teacherRole: {
    TITULAR: 'lead',
    ASISTENTE: 'assistant'
  },
  workload: {
    caption_one: 'Hours over {{count}} week',
    caption_other: 'Hours over {{count}} weeks',
    component: 'Component',
    perWeek: 'Per week',
    total: 'Total',
    theory: 'Theory',
    practice: 'Practice',
    supervised: 'Supervised',
    autonomous: 'Self-study',
    sum: 'Total',
    contact: 'Contact hours',
    directed: 'Directed hours',
    hours: '{{value}} h'
  },
  credits: {
    proposed_one: '{{value}} proposed {{system}} credit — not official',
    proposed_other: '{{value}} proposed {{system}} credits — not official',
    approved: 'Approved credits: {{value}} {{system}}',
    warnings: 'Notes on the proposal',
    how: 'How it was calculated',
    method: 'Method',
    parameters: 'Parameters',
    calculation: 'Calculation',
    calculationValue: '{{hours}} h → {{calculated}} calculated → {{proposed}} proposed',
    policy: 'Policy',
    policyValue: '{{id}}, version {{version}}',
    source: 'Source'
  },
  empty: {
    none: 'No courses published yet',
    filtered: 'No course matches your search',
    filteredHint: 'Try fewer filters or other words.',
    pastLastPage: 'This page has no courses any more',
    firstPage: 'Go to the first page'
  },
  problem: {
    catalog: {
      invalid: 'Some search filter is not valid',
      notFound: 'The catalog is not available',
      refused: 'The catalog is not available',
      server: 'We could not load the catalog',
      network: 'We could not reach the server',
      contract: 'We could not read the server response'
    },
    course: {
      invalid: 'We could not open this course',
      notFound: 'Course not found',
      refused: 'We could not open this course',
      server: 'We could not load the course',
      network: 'We could not reach the server',
      contract: 'We could not read the server response'
    },
    technical: 'Details',
    code: 'Error code: {{status}}',
    hint: {
      invalid: 'Check the filters or start over.',
      notFound: 'We could not find what you were looking for. Please try again later.',
      refused: 'Your account does not have access to this. If you think it should, ask whoever runs the platform.',
      server: 'The server could not respond. Please try again in a few minutes.',
      network: 'Check your connection and try again.',
      unexpected: 'Something unexpected went wrong. Please try again.',
      contract: 'The response is not in the format this page expects; this usually happens during an update. Please try again in a few minutes.'
    },
    violation: '{{field}}: {{message}}',
    retry: 'Retry'
  }
}

export const catalogMessages = { es, en }
