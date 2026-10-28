// textos del módulo, espacio de nombres 'catalog' (= id del módulo)
const es = {
  catalog: {
    title: 'Catálogo de cursos',
    subtitle: 'Cursos abiertos, con su carga de trabajo y sus próximas ediciones.',
    results: 'Resultados',
    loading: 'Cargando cursos…',
    count_one: '{{count, number}} curso',
    count_other: '{{count, number}} cursos'
  },
  filters: {
    legend: 'Filtrar cursos',
    search: 'Buscar cursos',
    searchPlaceholder: 'Título o tema',
    submit: 'Buscar',
    all: 'Cualquiera',
    category: 'Categoría',
    categoryOption: '{{name}} ({{count, number}})',
    level: 'Nivel',
    modality: 'Modalidad',
    startsFrom: 'Empieza desde',
    sort: 'Ordenar por',
    page: 'Página',
    size: 'Tamaño de página',
    clear: 'Limpiar filtros'
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
    HIBRIDA: 'Híbrida'
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
    none: 'Sin ediciones programadas por ahora',
    state: {
      open: 'Inscripción abierta',
      closed: 'Inscripción cerrada',
      running: 'En curso',
      scheduled: 'Inscripción aún no abierta'
    }
  },
  detail: {
    back: '← Catálogo',
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
    unit: 'Unidad {{order}}. {{title}}',
    unitMeta_one: '{{count}} lección · {{hours}} h estimadas',
    unitMeta_other: '{{count}} lecciones · {{hours}} h estimadas',
    showLessons_one: 'Ver la lección',
    showLessons_other: 'Ver las {{count}} lecciones',
    minutes: '{{value}} min',
    offerings: 'Ediciones',
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
    hint: {
      invalid: 'Revisa los filtros o empieza de nuevo.',
      notFound: 'El servidor no reconoce esta dirección (error {{status}}). Inténtalo de nuevo más tarde.',
      refused: 'El servidor rechazó la consulta (error {{status}}). Inténtalo de nuevo más tarde.',
      server: 'El servidor tuvo un problema (error {{status}}). Inténtalo de nuevo en unos minutos.',
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
  catalog: {
    title: 'Course catalog',
    subtitle: 'Open courses, with their workload and upcoming offerings.',
    results: 'Results',
    loading: 'Loading courses…',
    count_one: '{{count, number}} course',
    count_other: '{{count, number}} courses'
  },
  filters: {
    legend: 'Filter courses',
    search: 'Search courses',
    searchPlaceholder: 'Title or topic',
    submit: 'Search',
    all: 'Any',
    category: 'Category',
    categoryOption: '{{name}} ({{count, number}})',
    level: 'Level',
    modality: 'Mode',
    startsFrom: 'Starting from',
    sort: 'Sort by',
    page: 'Page',
    size: 'Page size',
    clear: 'Clear filters'
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
    HIBRIDA: 'Blended'
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
    none: 'No offerings scheduled yet',
    state: {
      open: 'Enrollment open',
      closed: 'Enrollment closed',
      running: 'In progress',
      scheduled: 'Enrollment not open yet'
    }
  },
  detail: {
    back: '← Catalog',
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
    unit: 'Unit {{order}}. {{title}}',
    unitMeta_one: '{{count}} lesson · {{hours}} h estimated',
    unitMeta_other: '{{count}} lessons · {{hours}} h estimated',
    showLessons_one: 'Show the lesson',
    showLessons_other: 'Show the {{count}} lessons',
    minutes: '{{value}} min',
    offerings: 'Offerings',
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
    hint: {
      invalid: 'Check the filters or start over.',
      notFound: 'The server does not recognise this address (error {{status}}). Please try again later.',
      refused: 'The server refused the request (error {{status}}). Please try again later.',
      server: 'The server had a problem (error {{status}}). Please try again in a few minutes.',
      network: 'Check your connection and try again.',
      unexpected: 'Something unexpected went wrong. Please try again.',
      contract: 'The response is not in the format this page expects; this usually happens during an update. Please try again in a few minutes.'
    },
    violation: '{{field}}: {{message}}',
    retry: 'Retry'
  }
}

export const catalogMessages = { es, en }
