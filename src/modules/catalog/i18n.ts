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
    all: 'Todas',
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
    title: 'Curso',
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
      server: 'No pudimos cargar el catálogo',
      network: 'No pudimos conectar con el servidor',
      contract: 'No pudimos leer la respuesta del servidor'
    },
    course: {
      invalid: 'No pudimos abrir este curso',
      notFound: 'Curso no encontrado',
      server: 'No pudimos cargar el curso',
      network: 'No pudimos conectar con el servidor',
      contract: 'No pudimos leer la respuesta del servidor'
    },
    hint: {
      invalid: 'Revisa los filtros o empieza de nuevo.',
      notFound: 'El servidor no reconoce esta dirección (error {{status}}). Inténtalo de nuevo más tarde.',
      server: 'El servidor tuvo un problema (error {{status}}). Inténtalo de nuevo en unos minutos.',
      network: 'Comprueba tu conexión e inténtalo de nuevo.',
      unexpected: 'Ocurrió un error inesperado. Inténtalo de nuevo.',
      contract: 'La respuesta no tiene el formato que esta página espera; suele pasar durante una actualización. Inténtalo de nuevo en unos minutos.'
    },
    violation: '{{field}}: {{message}}',
    retry: 'Reintentar'
  }
}

export const catalogMessages = { es }
