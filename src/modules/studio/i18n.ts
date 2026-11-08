import { diffMessages } from '../../shared/diffMessages'
import { importMessages } from './importI18n'

// textos del módulo, espacio de nombres 'studio' (= id del módulo)
const es = {
  nav: {
    group: 'Contenido',
    versions: 'Mis versiones'
  },
  versions: {
    title: 'Mis versiones',
    subtitle: 'Las versiones de curso que escribes: su estado, lo que comentó el revisor y lo que falta.',
    loading: 'Cargando tus versiones…',
    empty: 'Aún no tienes versiones',
    emptyHint:
      'Empieza por «Nuevo curso»: al guardarlo se abre su primer borrador, que aparecerá aquí para añadirle contenido y, con sus lecciones, enviarlo a revisión.',
    coursesHint:
      '¿Un curso aún sin versiones? Ábrelo en la lista de cursos, que incluye los de todas las personas. Al final de su ficha puedes crear su primer borrador.',
    allCourses: 'Ver todos los cursos',
    name: '{{course}} — versión {{number}}',
    number: 'Versión {{number}}',
    newCourse: 'Nuevo curso',
    newVersion: 'Nueva versión',
    newVersionLabel: 'Nueva versión de {{course}}',
    submitLabel: 'Enviar a revisión la versión {{number}} de {{course}}',
    updated: 'Actualizada el {{date}}',
    openComments_one: '{{value}} comentario por atender',
    openComments_other: '{{value}} comentarios por atender'
  },
  status: {
    BORRADOR: 'Borrador',
    EN_REVISION: 'En revisión',
    APROBADA: 'Aprobada',
    PUBLICADA: 'Publicada',
    RETIRADA: 'Retirada'
  },
  generator: {
    MODEL: 'Generado con IA',
    DETERMINISTIC: 'Generado sin IA, ilustrativo'
  },
  statusHint: {
    BORRADOR: 'Puedes editar su contenido y, cuando esté lista, enviarla a revisión.',
    EN_REVISION: 'Está en revisión: no se puede editar hasta que el revisor decida. Si pide cambios, vuelve a borrador.',
    APROBADA: 'El revisor la aprobó y espera a que se publique. Ya no se edita: para cambiarla, crea una versión nueva.',
    PUBLICADA: 'Está publicada y no cambia. Para corregirla, crea una versión nueva a partir de ella.',
    RETIRADA: 'Está retirada. Puedes crear una versión nueva a partir de ella.'
  },
  version: {
    title: 'Versión',
    breadcrumbs: 'Ruta',
    rail: 'Estado y revisión de la versión',
    path: 'Recorrido de la versión',
    stepDone: 'hecho',
    stepPending: 'pendiente',
    readOnly: 'Solo lectura',
    subtitle: 'Versión {{number}} · {{code}}',
    loading: 'Cargando la versión…',
    state: 'Estado: {{status}}',
    edit: 'Editar la versión',
    submit: 'Enviar a revisión',
    submitting: 'Enviando…',
    submitted: 'Enviada a revisión.',
    submitTitle: '¿Enviar a revisión?',
    submitDescription:
      'Mientras la versión {{number}} esté en revisión no podrás editarla. El revisor puede aprobarla, pedirte cambios (vuelve a borrador) o rechazarla.',
    checking: 'Comprobando que la versión tenga lecciones…',
    checkFailed: 'No pudimos comprobar si la versión tiene lecciones, así que aún no se envía. Inténtalo de nuevo.',
    recheck: 'Vuelve a comprobarla antes de enviarla otra vez.',
    blockedTitle: 'Aún no se puede enviar a revisión',
    blockedNoUnits: 'Esta versión no tiene lecciones, y sin ellas no hay nada que revisar. Empieza por su primera unidad y añádele al menos una lección.',
    blockedNoLessons: 'Sus unidades aún no tienen lecciones, y sin ellas no hay nada que revisar. Añade al menos una.',
    notDraftTitle: 'Esta versión ya no es un borrador',
    notDraftDescription: 'Ahora está en estado «{{status}}», así que no se puede enviar. Ábrela para ver cómo sigue.',
    open: 'Abrir la versión',
    rejectedNoLessons: 'El servidor no aceptó el envío: la versión {{number}} no tiene lecciones.',
    rejectedState: 'El servidor no aceptó el envío: el estado de la versión cambió hace un momento.',
    rejectedUnknown: 'El servidor no aceptó el envío y no pudimos comprobar por qué.',
    submitConfirm: 'Sí, enviar a revisión',
    cancel: 'Volver',
    copy: 'Crear versión nueva',
    copying: 'Creando…',
    copyTitle: '¿Crear una versión nueva?',
    copyDescription:
      'Se copia el contenido de la versión {{number}} (unidades, lecciones, evaluaciones y enlaces a recursos) a un borrador tuyo. La versión {{number}} y quien la cursa no cambian, y los comentarios y decisiones se quedan con ella.',
    copyConfirm: 'Sí, crear el borrador'
  },
  firstDraft: {
    title: 'Primer borrador',
    hint: 'Este curso aún no tiene versiones. Crea su primer borrador, vacío y a tu nombre, para añadirle el contenido.',
    create: 'Crear primer borrador',
    creating: 'Creando…',
    checkFailed: 'No pudimos comprobar si este curso tiene versiones.',
    failed: 'No pudimos crear el borrador. Inténtalo de nuevo.',
    failedStatus: 'No pudimos crear el borrador. Inténtalo de nuevo. Código del error: {{status}}.',
    refused: 'No tienes permiso para crear versiones. Si crees que deberías, pide a la coordinación que revise tus permisos.',
    notFound: 'Este curso ya no existe o no puedes leerlo.',
    conflict: 'Este curso ya tiene una versión: otra persona pudo crearla hace un momento. Si es tuya, está en «Mis versiones».',
    toVersions: 'Ir a mis versiones'
  },
  newCourse: {
    title: 'Nuevo curso',
    loading: 'Cargando el formulario…',
    subtitle: 'Al guardarlo se abre su primer borrador, vacío, para que le añadas el contenido.',
    creatingDraft: 'Curso guardado. Creando su primer borrador…',
    savedTitle: 'El curso «{{title}}» se guardó, pero falta su borrador',
    openCourse: 'Abrir el curso'
  },
  newUnit: {
    title: 'Nueva unidad',
    subtitle: 'De la versión {{number}} de {{course}}',
    backToVersion: 'Volver a la versión'
  },
  newLesson: {
    title: 'Nueva lección',
    subtitle: 'De la unidad {{order}}. {{title}}',
    unitGone: 'Esta unidad ya no está en la versión'
  },
  // las etiquetas de los campos de estos formularios: la metadata de Wasichai solo tiene un idioma (ADR-070 de Wasichai). claves: objeto y campo
  // de model/model.json del backend, y en español, su misma etiqueta. un campo sin clave muestra la del servidor
  recordForm: {
    curso: {
      codigo: 'Código',
      slug: 'Identificador en URL',
      titulo: 'Título',
      resumen: 'Resumen',
      idioma: 'Idioma',
      nivel: 'Nivel',
      conocimientos_previos: 'Conocimientos previos',
      categoria: 'Categoría'
    },
    unidad: {
      orden: 'Orden',
      titulo: 'Título',
      descripcion: 'Descripción',
      objetivos: 'Objetivos',
      horas_estimadas: 'Horas estimadas'
    },
    leccion: {
      orden: 'Orden',
      titulo: 'Título',
      tipo: 'Tipo',
      duracion_minutos: 'Duración estimada (minutos)',
      resumen: 'Resumen'
    }
  },
  // la ayuda bajo cada campo, en lenguaje llano; sin ella, la descripción del servidor, si la hay
  recordHelp: {
    curso: {
      codigo: 'Lo identifica en los informes y certificados, por ejemplo RENT-101.',
      slug: 'Lo que va en la dirección del curso: minúsculas y guiones, por ejemplo rentas-municipales.',
      idioma: 'El idioma en que se imparte: es para español, en para inglés.'
    },
    unidad: {
      objetivos: 'Uno por línea.'
    }
  },
  syllabus: {
    title: 'Contenido',
    empty: 'Esta versión aún no tiene unidades.',
    firstDraftDefaults: 'Se creó con modalidad asíncrona, por semanas y de 1 semana: ajústalo en «Editar la versión».',
    addFirstUnit: 'Añadir la primera unidad',
    addFirstLesson: 'Añadir la primera lección',
    addLesson: 'Añadir una lección',
    addLessonLabel: 'Añadir una lección a «{{title}}»',
    addUnit: 'Añadir una unidad',
    unit: 'Unidad {{order}}. {{title}}',
    lesson: '{{order}}. {{title}}',
    edit: 'Editar',
    editUnitLabel: 'Editar la unidad «{{title}}»',
    editLessonLabel: 'Editar la lección «{{title}}»',
    noLessons: 'Sin lecciones.',
    assessment: 'con evaluación',
    resources_one: '{{value}} recurso',
    resources_other: '{{value}} recursos',
    source: 'Fuente: {{ref}}',
    sourceToggle: 'Fuente técnica'
  },
  lessonType: {
    LECTURA: 'Lectura',
    VIDEO: 'Video',
    PRESENTACION: 'Presentación',
    LABORATORIO: 'Laboratorio',
    EVALUACION: 'Evaluación',
    SESION: 'Sesión'
  },
  comments: {
    title: 'Comentarios de revisión',
    empty: 'El revisor no ha dejado comentarios.',
    open_one: '{{value}} comentario por atender',
    open_other: '{{value}} comentarios por atender',
    allResolved: 'Todos los comentarios están resueltos.',
    resolved: 'Resuelto',
    pending: 'Por atender',
    of: 'Comentarios de {{name}}',
    whole: 'Comentarios de toda la versión',
    orphans: 'Comentarios de secciones que ya no están',
    inSyllabus: 'Los de una unidad o una lección están junto a ella, en «Contenido».'
  },
  // las diferencias con la versión anterior (VersionDiffSection)
  diff: diffMessages.es,
  decisions: {
    title: 'Decisiones del revisor',
    empty: 'Aún no hay decisiones sobre esta versión.'
  },
  decision: {
    APROBAR: 'Aprobada',
    PEDIR_CAMBIOS: 'Pidió cambios',
    RECHAZAR: 'Rechazada'
  },
  action: {
    conflict: 'El servidor no lo aceptó: {{detail}}',
    invalid: 'El servidor rechazó los datos: {{detail}}',
    notFound: 'Esta versión ya no está entre las tuyas.',
    refused: 'No tienes permiso para hacerlo. Si crees que deberías, pide a la coordinación que revise tus permisos.',
    network: 'No hay conexión con el servidor. Revisa tu conexión e inténtalo de nuevo.',
    failed: 'No pudimos guardarlo. Inténtalo de nuevo.',
    failedStatus: 'No pudimos guardarlo. Inténtalo de nuevo. Código del error: {{status}}.'
  },
  problem: {
    versions: {
      invalid: 'No pudimos cargar tus versiones',
      notFound: 'Tus versiones no están disponibles',
      conflict: 'No pudimos cargar tus versiones',
      refused: 'No pudimos cargar tus versiones',
      server: 'No pudimos cargar tus versiones',
      network: 'No pudimos conectar con el servidor',
      contract: 'No pudimos leer la respuesta del servidor'
    },
    version: {
      invalid: 'No pudimos cargar la versión',
      notFound: 'Esta versión no está entre las tuyas',
      conflict: 'No pudimos cargar la versión',
      refused: 'No pudimos cargar la versión',
      server: 'No pudimos cargar la versión',
      network: 'No pudimos conectar con el servidor',
      contract: 'No pudimos leer la respuesta del servidor'
    },
    notFoundHint: 'Aquí solo ves las versiones que escribiste. El enlace puede ser de otra persona, o la versión ya no existe.',
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
  },
  import: importMessages.es
}

// mismas claves que es: el tipo lo exige al compilar e i18n.test.tsx lo comprueba hoja a hoja
const en: typeof es = {
  nav: {
    group: 'Content',
    versions: 'My versions'
  },
  versions: {
    title: 'My versions',
    subtitle: 'The course versions you write: their status, what the reviewer commented and what is left.',
    loading: 'Loading your versions…',
    empty: 'You have no versions yet',
    emptyHint:
      'Start with “New course”: when you save it, its first draft opens, and it will appear here so you can add content and, once it has lessons, send it for review.',
    coursesHint:
      'A course with no versions yet? Open it from the list of courses, which includes everyone’s. At the end of its page you can create its first draft.',
    allCourses: 'See all courses',
    name: '{{course}} — version {{number}}',
    number: 'Version {{number}}',
    newCourse: 'New course',
    newVersion: 'New version',
    newVersionLabel: 'New version of {{course}}',
    submitLabel: 'Send version {{number}} of {{course}} for review',
    updated: 'Updated on {{date}}',
    openComments_one: '{{value}} comment to address',
    openComments_other: '{{value}} comments to address'
  },
  status: {
    BORRADOR: 'Draft',
    EN_REVISION: 'In review',
    APROBADA: 'Approved',
    PUBLICADA: 'Published',
    RETIRADA: 'Withdrawn'
  },
  generator: {
    MODEL: 'AI-generated',
    DETERMINISTIC: 'Generated without AI, illustrative'
  },
  statusHint: {
    BORRADOR: 'You can edit its content and, when it is ready, send it for review.',
    EN_REVISION: 'It is in review: it cannot be edited until the reviewer decides. If changes are requested, it returns to draft.',
    APROBADA: 'The reviewer approved it and it is waiting to be published. It is no longer edited: to change it, create a new version.',
    PUBLICADA: 'It is published and does not change. To correct it, create a new version from it.',
    RETIRADA: 'It is withdrawn. You can create a new version from it.'
  },
  version: {
    title: 'Version',
    breadcrumbs: 'Breadcrumb',
    rail: 'Version status and review',
    path: 'Version path',
    stepDone: 'done',
    stepPending: 'pending',
    readOnly: 'Read only',
    subtitle: 'Version {{number}} · {{code}}',
    loading: 'Loading the version…',
    state: 'Status: {{status}}',
    edit: 'Edit the version',
    submit: 'Send for review',
    submitting: 'Sending…',
    submitted: 'Sent for review.',
    submitTitle: 'Send for review?',
    submitDescription:
      'While version {{number}} is in review you will not be able to edit it. The reviewer can approve it, request changes (it returns to draft) or reject it.',
    checking: 'Checking that the version has lessons…',
    checkFailed: 'We could not check whether the version has lessons, so it has not been sent. Please try again.',
    recheck: 'Check it again before sending it again.',
    blockedTitle: 'It cannot be sent for review yet',
    blockedNoUnits: 'This version has no lessons, and without them there is nothing to review. Start with its first unit and add at least one lesson to it.',
    blockedNoLessons: 'Its units have no lessons yet, and without them there is nothing to review. Add at least one.',
    notDraftTitle: 'This version is no longer a draft',
    notDraftDescription: 'Its status is now “{{status}}”, so it cannot be sent. Open it to see what comes next.',
    open: 'Open the version',
    rejectedNoLessons: 'The server did not accept it: version {{number}} has no lessons.',
    rejectedState: 'The server did not accept it: the status of the version changed a moment ago.',
    rejectedUnknown: 'The server did not accept it and we could not check why.',
    submitConfirm: 'Yes, send for review',
    cancel: 'Go back',
    copy: 'Create new version',
    copying: 'Creating…',
    copyTitle: 'Create a new version?',
    copyDescription:
      'The content of version {{number}} (units, lessons, assessments and links to resources) is copied to a draft of yours. Version {{number}} and its students are not affected, and its comments and decisions stay with it.',
    copyConfirm: 'Yes, create the draft'
  },
  firstDraft: {
    title: 'First draft',
    hint: 'This course has no versions yet. Create its first draft, empty and in your name, to add the content.',
    create: 'Create first draft',
    creating: 'Creating…',
    checkFailed: 'We could not check whether this course has versions.',
    failed: 'We could not create the draft. Please try again.',
    failedStatus: 'We could not create the draft. Please try again. Error code: {{status}}.',
    refused: 'You do not have permission to create versions. If you think you should, ask the coordination team to review your permissions.',
    notFound: 'This course no longer exists or you cannot read it.',
    conflict: 'This course already has a version: someone else may have just created it. If it is yours, it is in “My versions”.',
    toVersions: 'Go to my versions'
  },
  newCourse: {
    title: 'New course',
    loading: 'Loading the form…',
    subtitle: 'When you save it, its first draft opens, empty, for you to add the content.',
    creatingDraft: 'Course saved. Creating its first draft…',
    savedTitle: 'The course “{{title}}” was saved, but its draft is missing',
    openCourse: 'Open the course'
  },
  newUnit: {
    title: 'New unit',
    subtitle: 'Of version {{number}} of {{course}}',
    backToVersion: 'Back to the version'
  },
  newLesson: {
    title: 'New lesson',
    subtitle: 'In unit {{order}}. {{title}}',
    unitGone: 'This unit is no longer in the version'
  },
  recordForm: {
    curso: {
      codigo: 'Code',
      slug: 'URL slug',
      titulo: 'Title',
      resumen: 'Summary',
      idioma: 'Language',
      nivel: 'Level',
      conocimientos_previos: 'Prior knowledge',
      categoria: 'Category'
    },
    unidad: {
      orden: 'Order',
      titulo: 'Title',
      descripcion: 'Description',
      objetivos: 'Objectives',
      horas_estimadas: 'Estimated hours'
    },
    leccion: {
      orden: 'Order',
      titulo: 'Title',
      tipo: 'Type',
      duracion_minutos: 'Estimated duration (minutes)',
      resumen: 'Summary'
    }
  },
  recordHelp: {
    curso: {
      codigo: 'Identifies it in reports and certificates, for example RENT-101.',
      slug: 'What goes in the course address: lowercase and hyphens, for example municipal-revenue.',
      idioma: 'The language it is taught in: es for Spanish, en for English.'
    },
    unidad: {
      objetivos: 'One per line.'
    }
  },
  syllabus: {
    title: 'Content',
    empty: 'This version has no units yet.',
    firstDraftDefaults: 'It was created as asynchronous, by weeks and lasting 1 week: adjust this in “Edit the version”.',
    addFirstUnit: 'Add the first unit',
    addFirstLesson: 'Add the first lesson',
    addLesson: 'Add a lesson',
    addLessonLabel: 'Add a lesson to “{{title}}”',
    addUnit: 'Add a unit',
    unit: 'Unit {{order}}. {{title}}',
    lesson: '{{order}}. {{title}}',
    edit: 'Edit',
    editUnitLabel: 'Edit the unit “{{title}}”',
    editLessonLabel: 'Edit the lesson “{{title}}”',
    noLessons: 'No lessons.',
    assessment: 'with assessment',
    resources_one: '{{value}} resource',
    resources_other: '{{value}} resources',
    source: 'Source: {{ref}}',
    sourceToggle: 'Technical source'
  },
  lessonType: {
    LECTURA: 'Reading',
    VIDEO: 'Video',
    PRESENTACION: 'Presentation',
    LABORATORIO: 'Lab',
    EVALUACION: 'Assessment',
    SESION: 'Session'
  },
  comments: {
    title: 'Review comments',
    empty: 'The reviewer has left no comments.',
    open_one: '{{value}} comment to address',
    open_other: '{{value}} comments to address',
    allResolved: 'All comments are resolved.',
    resolved: 'Resolved',
    pending: 'To address',
    of: 'Comments on {{name}}',
    whole: 'Comments on the whole version',
    orphans: 'Comments on sections that no longer exist',
    inSyllabus: 'Those on a unit or a lesson are next to it, under “Content”.'
  },
  diff: diffMessages.en,
  decisions: {
    title: 'Reviewer decisions',
    empty: 'There are no decisions on this version yet.'
  },
  decision: {
    APROBAR: 'Approved',
    PEDIR_CAMBIOS: 'Requested changes',
    RECHAZAR: 'Rejected'
  },
  action: {
    conflict: 'The server did not accept it: {{detail}}',
    invalid: 'The server rejected the data: {{detail}}',
    notFound: 'This version is no longer among yours.',
    refused: 'You do not have permission to do this. If you think you should, ask the coordination team to review your permissions.',
    network: 'There is no connection to the server. Check your connection and try again.',
    failed: 'We could not save it. Please try again.',
    failedStatus: 'We could not save it. Please try again. Error code: {{status}}.'
  },
  problem: {
    versions: {
      invalid: 'We could not load your versions',
      notFound: 'Your versions are not available',
      conflict: 'We could not load your versions',
      refused: 'We could not load your versions',
      server: 'We could not load your versions',
      network: 'We could not reach the server',
      contract: 'We could not read the server response'
    },
    version: {
      invalid: 'We could not load the version',
      notFound: 'This version is not among yours',
      conflict: 'We could not load the version',
      refused: 'We could not load the version',
      server: 'We could not load the version',
      network: 'We could not reach the server',
      contract: 'We could not read the server response'
    },
    notFoundHint: 'Here you only see the versions you wrote. The link may belong to someone else, or the version no longer exists.',
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
  },
  import: importMessages.en
}

export const studioMessages = { es, en }
