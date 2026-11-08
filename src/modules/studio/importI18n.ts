// textos de la importación (clave 'import' del espacio de nombres 'studio'), aparte para que i18n.ts no crezca de más
const es = {
  title: 'Importar un manual',
  subtitle:
    'Crea un borrador de un curso a partir de un manual AsciiDoc de un repositorio permitido: sus capítulos como unidades y sus secciones como lecciones.',
  link: 'Importar desde un repositorio',
  loading: 'Cargando los orígenes permitidos…',
  sources: {
    title: 'Orígenes permitidos',
    anyCommit: 'cualquier commit',
    pinned: 'solo el commit {{sha}}',
    hint: 'Solo se importa de estos repositorios. Los decide quien administra el servidor.',
    empty: 'No hay orígenes permitidos',
    emptyHint: 'Quien administra el servidor decide de qué repositorios se importa. Pídele que añada el del manual.'
  },
  form: {
    title: 'Qué importar',
    repository: 'Repositorio',
    sha: 'Commit',
    shaHint: 'El identificador completo del commit: 40 caracteres hexadecimales.',
    shaPinned: 'Este origen solo permite este commit.',
    shaInvalid: 'Escribe el commit completo: 40 caracteres entre 0-9 y a-f.',
    path: 'Ruta del maestro',
    pathHint: 'El archivo AsciiDoc principal, relativo a la raíz del repositorio (por ejemplo, manual/maestro.adoc).',
    pathInvalid: 'Escribe una ruta dentro del repositorio: tramos de letras, cifras, «.», «-» o «_» separados por «/», sin «..».',
    course: 'Curso',
    coursePlaceholder: 'Elige un curso',
    coursesLoading: 'Cargando los cursos…',
    coursesEmpty: 'No hay cursos que puedas leer. Crea el curso antes de importar su manual.',
    coursesFailed: 'No pudimos cargar los cursos.',
    courseOption: '{{title}} ({{code}})',
    courseRequired: 'Elige el curso al que irá el borrador.',
    preview: 'Se importará {{source}}',
    note: 'La importación crea siempre una versión nueva en borrador, sin el texto del manual; nunca publica ni cambia lo publicado.',
    submit: 'Importar como borrador',
    submitting: 'Encolando…'
  },
  error: {
    invalid: 'El servidor rechazó la fuente o el curso: {{detail}}',
    refused:
      'El servidor no lo permitió: el repositorio o el commit no están entre los orígenes permitidos, o no tienes permiso para importar (crear versiones, unidades y lecciones). Elige uno de la lista «Orígenes permitidos»; si el manual está en otro, pide a quien administra el servidor que lo añada.',
    courseNotFound: 'El curso elegido ya no existe. Elige otro.',
    network: 'No hay conexión con el servidor. Revisa tu conexión e inténtalo de nuevo.',
    tooMany: 'Tienes demasiados trabajos en marcha. Espera a que termine alguno e inténtalo de nuevo.',
    failed: 'No pudimos encolar la importación. Inténtalo de nuevo. Código del error: {{status}}.',
    unexpected: 'No pudimos encolar la importación. Inténtalo de nuevo.'
  },
  status: {
    PENDIENTE: 'En cola',
    EN_CURSO: 'Importando',
    HECHO: 'Importación terminada',
    FALLIDO: 'La importación falló'
  },
  statusHint: {
    PENDIENTE:
      'El trabajo espera su turno. Esta página consulta su estado cada pocos segundos. Si sales, el trabajo sigue y podrás retomarlo desde esta pantalla.',
    EN_CURSO: 'Se está leyendo el manual y creando el borrador. Si sales, el trabajo sigue y podrás retomarlo desde esta pantalla.',
    HECHO: 'El borrador está listo: revísalo y edítalo antes de enviarlo a revisión.',
    FALLIDO: 'No se creó ningún borrador.'
  },
  job: {
    title: 'Estado de la importación',
    loading: 'Consultando la importación…',
    transient: 'Último fallo pasajero, se reintenta solo: {{error}}',
    failed: 'Motivo: {{error}}',
    noReason: 'el servidor no dio el motivo',
    failedHint:
      'Suele pasar si el maestro no existe en ese commit, el origen dejó de estar permitido, el curso desapareció o el manual tiene demasiados archivos. Corrígelo e importa de nuevo.',
    openDraft: 'Abrir el borrador',
    retry: 'Revisar y reintentar',
    another: 'Importar otro manual',
    back: 'Volver a tus importaciones',
    notFound: 'Esta importación ya no está disponible',
    notFoundHint: 'Solo la ve quien la pidió, y las terminadas se guardan 30 días.'
  },
  jobs: {
    title: 'Tus importaciones',
    retention: 'Hasta las 50 más recientes. Las terminadas se guardan 30 días; después salen de esta lista y el borrador sigue en «Mis versiones».',
    loading: 'Cargando tus importaciones…',
    empty: 'Aún no tienes importaciones. Las que pidas quedarán aquí, aunque salgas de esta pantalla.',
    failed: 'No pudimos cargar tus importaciones. Puedes importar igual.',
    refused: 'No puedes ver tus importaciones.',
    active_one: '{{count}} importación en marcha',
    active_other: '{{count}} importaciones en marcha',
    status: {
      PENDIENTE: 'En cola',
      EN_CURSO: 'Importando',
      HECHO: 'Terminada',
      FALLIDO: 'Falló'
    },
    requested: 'Pedida el {{date}}',
    finished: 'Terminó el {{date}}',
    follow: 'Seguir la importación',
    report: 'Ver el informe',
    reason: 'Ver el motivo',
    actionFor: '{{action}}: {{subject}}',
    more: 'Ver {{count}} más',
    less: 'Ver menos'
  },
  report: {
    title: 'Informe',
    source: 'Fuente: {{source}}',
    files: 'Archivos',
    includes: 'Inclusiones',
    sections: 'Secciones',
    images: 'Imágenes',
    units: 'Unidades',
    lessons: 'Lecciones',
    noProblems: 'Sin problemas: todo se resolvió.',
    problems_one: '{{value}} problema. Un problema no detiene la importación: revisa esa parte en el borrador.',
    problems_other: '{{value}} problemas. Un problema no detiene la importación: revisa esas partes en el borrador.',
    truncated: 'Se muestran {{shown}} de {{total}}.',
    bySeverity: 'Problemas por gravedad',
    partial: 'Las cifras por gravedad cuentan todos; la lista, solo los que se muestran.',
    group: '{{kind}} ({{value}})',
    otherKind: 'Otro tipo de problema',
    line: '{{origin}}, línea {{line}}',
    wholeFile: '{{origin}}, el archivo entero'
  },
  severity: {
    GAP: 'Puede faltar temario',
    CHECK: 'A revisar'
  },
  steps: {
    label: 'Pasos de la importación',
    source: 'Origen',
    queue: 'Cola',
    run: 'Lectura',
    result: 'Resultado',
    failed: 'Falló',
    done: 'hecho',
    pending: 'pendiente'
  },
  kind: {
    MISSING_INCLUDE: 'Inclusión que no existe',
    INCLUDE_OUTSIDE_ROOT: 'Inclusión fuera del repositorio',
    INCLUDE_CYCLE: 'Inclusiones en círculo',
    INCLUDE_TOO_DEEP: 'Inclusiones demasiado anidadas',
    UNRESOLVED_ATTRIBUTE: 'Atributo sin valor',
    UNSUPPORTED_INCLUDE_OPTION: 'Opción de inclusión no admitida',
    MISSING_IMAGE: 'Imagen que no existe',
    IMAGE_OUTSIDE_ROOT: 'Imagen fuera del repositorio',
    BROKEN_REFERENCE: 'Referencia rota',
    DUPLICATE_ANCHOR: 'Ancla repetida',
    FILE_TOO_LARGE: 'Archivo demasiado grande'
  },
  problem: {
    invalid: 'No pudimos cargar los orígenes permitidos',
    notFound: 'La importación no está disponible',
    conflict: 'No pudimos cargar los orígenes permitidos',
    refused: 'No puedes importar manuales',
    server: 'No pudimos cargar los orígenes permitidos',
    network: 'No pudimos conectar con el servidor',
    contract: 'No pudimos leer la respuesta del servidor',
    refusedHint: 'Importar exige poder crear versiones de curso, unidades y lecciones. Si crees que deberías, pide a la coordinación que revise tus permisos.'
  }
}

// mismas claves que es
const en: typeof es = {
  title: 'Import a manual',
  subtitle: 'Create a draft of a course from an AsciiDoc manual in an allowed repository: its chapters become units and its sections lessons.',
  link: 'Import from a repository',
  loading: 'Loading the allowed sources…',
  sources: {
    title: 'Allowed sources',
    anyCommit: 'any commit',
    pinned: 'only commit {{sha}}',
    hint: 'Importing only works from these repositories. Whoever runs the server decides them.',
    empty: 'There are no allowed sources',
    emptyHint: 'Whoever runs the server decides which repositories can be imported. Ask them to add the one with the manual.'
  },
  form: {
    title: 'What to import',
    repository: 'Repository',
    sha: 'Commit',
    shaHint: 'The full commit id: 40 hexadecimal characters.',
    shaPinned: 'This source only allows this commit.',
    shaInvalid: 'Enter the full commit: 40 characters from 0-9 and a-f.',
    path: 'Master file path',
    pathHint: 'The main AsciiDoc file, relative to the repository root (for example, manual/master.adoc).',
    pathInvalid: 'Enter a path inside the repository: parts of letters, digits, “.”, “-” or “_” separated by “/”, without “..”.',
    course: 'Course',
    coursePlaceholder: 'Choose a course',
    coursesLoading: 'Loading the courses…',
    coursesEmpty: 'There are no courses you can read. Create the course before importing its manual.',
    coursesFailed: 'We could not load the courses.',
    courseOption: '{{title}} ({{code}})',
    courseRequired: 'Choose the course the draft belongs to.',
    preview: 'It will import {{source}}',
    note: 'Importing always creates a new draft version, without the text of the manual; it never publishes or changes what is published.',
    submit: 'Import as a draft',
    submitting: 'Queuing…'
  },
  error: {
    invalid: 'The server rejected the source or the course: {{detail}}',
    refused:
      'The server did not allow it: the repository or the commit are not among the allowed sources, or you are not allowed to import (create versions, units and lessons). Choose one from the “Allowed sources” list; if the manual is elsewhere, ask whoever runs the server to add it.',
    courseNotFound: 'The chosen course no longer exists. Choose another one.',
    network: 'There is no connection to the server. Check your connection and try again.',
    tooMany: 'You have too many jobs running. Wait for one to finish and try again.',
    failed: 'We could not queue the import. Please try again. Error code: {{status}}.',
    unexpected: 'We could not queue the import. Please try again.'
  },
  status: {
    PENDIENTE: 'Queued',
    EN_CURSO: 'Importing',
    HECHO: 'Import finished',
    FALLIDO: 'The import failed'
  },
  statusHint: {
    PENDIENTE:
      'The job is waiting for its turn. This page checks its status every few seconds. If you leave, the job continues and you can pick it up from this screen.',
    EN_CURSO: 'The manual is being read and the draft created. If you leave, the job continues and you can pick it up from this screen.',
    HECHO: 'The draft is ready: review and edit it before sending it for review.',
    FALLIDO: 'No draft was created.'
  },
  job: {
    title: 'Import status',
    loading: 'Checking the import…',
    transient: 'Last temporary failure, retried automatically: {{error}}',
    failed: 'Reason: {{error}}',
    noReason: 'the server gave no reason',
    failedHint:
      'This usually happens when the master file does not exist at that commit, the source is no longer allowed, the course was removed or the manual has too many files. Fix it and import again.',
    openDraft: 'Open the draft',
    retry: 'Review and try again',
    another: 'Import another manual',
    back: 'Back to your imports',
    notFound: 'This import is no longer available',
    notFoundHint: 'Only the person who requested it can see it, and finished ones are kept for 30 days.'
  },
  jobs: {
    title: 'Your imports',
    retention: 'Up to the 50 most recent. Finished ones are kept for 30 days; after that they leave this list and the draft stays in “My versions”.',
    loading: 'Loading your imports…',
    empty: 'You have no imports yet. The ones you request will stay here, even if you leave this screen.',
    failed: 'We could not load your imports. You can still import.',
    refused: 'You cannot see your imports.',
    active_one: '{{count}} import running',
    active_other: '{{count}} imports running',
    status: {
      PENDIENTE: 'Queued',
      EN_CURSO: 'Importing',
      HECHO: 'Finished',
      FALLIDO: 'Failed'
    },
    requested: 'Requested on {{date}}',
    finished: 'Finished on {{date}}',
    follow: 'Follow the import',
    report: 'See the report',
    reason: 'See the reason',
    actionFor: '{{action}}: {{subject}}',
    more: 'Show {{count}} more',
    less: 'Show less'
  },
  report: {
    title: 'Report',
    source: 'Source: {{source}}',
    files: 'Files',
    includes: 'Includes',
    sections: 'Sections',
    images: 'Images',
    units: 'Units',
    lessons: 'Lessons',
    noProblems: 'No problems: everything was resolved.',
    problems_one: '{{value}} problem. A problem does not stop the import: check that part in the draft.',
    problems_other: '{{value}} problems. A problem does not stop the import: check those parts in the draft.',
    truncated: 'Showing {{shown}} of {{total}}.',
    bySeverity: 'Problems by severity',
    partial: 'The figures by severity count all of them; the list, only the ones shown.',
    group: '{{kind}} ({{value}})',
    otherKind: 'Another kind of problem',
    line: '{{origin}}, line {{line}}',
    wholeFile: '{{origin}}, the whole file'
  },
  severity: {
    GAP: 'Syllabus may be incomplete',
    CHECK: 'To check'
  },
  steps: {
    label: 'Import steps',
    source: 'Source',
    queue: 'Queue',
    run: 'Reading',
    result: 'Result',
    failed: 'Failed',
    done: 'done',
    pending: 'pending'
  },
  kind: {
    MISSING_INCLUDE: 'Missing include',
    INCLUDE_OUTSIDE_ROOT: 'Include outside the repository',
    INCLUDE_CYCLE: 'Include cycle',
    INCLUDE_TOO_DEEP: 'Includes nested too deep',
    UNRESOLVED_ATTRIBUTE: 'Attribute without a value',
    UNSUPPORTED_INCLUDE_OPTION: 'Unsupported include option',
    MISSING_IMAGE: 'Missing image',
    IMAGE_OUTSIDE_ROOT: 'Image outside the repository',
    BROKEN_REFERENCE: 'Broken reference',
    DUPLICATE_ANCHOR: 'Duplicate anchor',
    FILE_TOO_LARGE: 'File too large'
  },
  problem: {
    invalid: 'We could not load the allowed sources',
    notFound: 'Importing is not available',
    conflict: 'We could not load the allowed sources',
    refused: 'You cannot import manuals',
    server: 'We could not load the allowed sources',
    network: 'We could not reach the server',
    contract: 'We could not read the server response',
    refusedHint:
      'Importing requires creating course versions, units and lessons. If you think you should, ask the coordination team to review your permissions.'
  }
}

export const importMessages = { es, en }
