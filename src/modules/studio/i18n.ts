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
    emptyHint: 'Cuando crees o importes una versión de un curso, aparecerá aquí para editarla y enviarla a revisión.',
    name: '{{course}} — versión {{number}}',
    updated: 'Actualizada el {{date}}',
    openComments_one: '{{value}} comentario por atender',
    openComments_other: '{{value}} comentarios por atender',
    back: '← Mis versiones'
  },
  status: {
    BORRADOR: 'Borrador',
    EN_REVISION: 'En revisión',
    APROBADA: 'Aprobada',
    PUBLICADA: 'Publicada',
    RETIRADA: 'Retirada'
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
    submitConfirm: 'Sí, enviar a revisión',
    cancel: 'Volver',
    copy: 'Crear una versión nueva a partir de esta',
    copying: 'Creando…',
    copyTitle: '¿Crear una versión nueva?',
    copyDescription:
      'Se copia el contenido de la versión {{number}} (unidades, lecciones, evaluaciones y enlaces a recursos) a un borrador tuyo. La versión {{number}} y quien la cursa no cambian, y los comentarios y decisiones se quedan con ella.',
    copyConfirm: 'Sí, crear el borrador'
  },
  syllabus: {
    title: 'Contenido',
    empty: 'Esta versión aún no tiene unidades.',
    unit: 'Unidad {{order}}. {{title}}',
    lesson: '{{order}}. {{title}}',
    edit: 'Editar',
    editUnitLabel: 'Editar la unidad «{{title}}»',
    editLessonLabel: 'Editar la lección «{{title}}»',
    noLessons: 'Sin lecciones.',
    assessment: 'con evaluación',
    resources_one: '{{value}} recurso',
    resources_other: '{{value}} recursos',
    source: 'Fuente: {{ref}}'
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
    pending: 'Por atender'
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
    failedStatus: 'No pudimos guardarlo (error {{status}}). Inténtalo de nuevo.'
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
    emptyHint: 'When you create or import a version of a course, it will appear here to edit it and send it for review.',
    name: '{{course}} — version {{number}}',
    updated: 'Updated on {{date}}',
    openComments_one: '{{value}} comment to address',
    openComments_other: '{{value}} comments to address',
    back: '← My versions'
  },
  status: {
    BORRADOR: 'Draft',
    EN_REVISION: 'In review',
    APROBADA: 'Approved',
    PUBLICADA: 'Published',
    RETIRADA: 'Withdrawn'
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
    submitConfirm: 'Yes, send for review',
    cancel: 'Go back',
    copy: 'Create a new version from this one',
    copying: 'Creating…',
    copyTitle: 'Create a new version?',
    copyDescription:
      'The content of version {{number}} (units, lessons, assessments and links to resources) is copied to a draft of yours. Version {{number}} and its students are not affected, and its comments and decisions stay with it.',
    copyConfirm: 'Yes, create the draft'
  },
  syllabus: {
    title: 'Content',
    empty: 'This version has no units yet.',
    unit: 'Unit {{order}}. {{title}}',
    lesson: '{{order}}. {{title}}',
    edit: 'Edit',
    editUnitLabel: 'Edit the unit “{{title}}”',
    editLessonLabel: 'Edit the lesson “{{title}}”',
    noLessons: 'No lessons.',
    assessment: 'with assessment',
    resources_one: '{{value}} resource',
    resources_other: '{{value}} resources',
    source: 'Source: {{ref}}'
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
    pending: 'To address'
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
    failedStatus: 'We could not save it (error {{status}}). Please try again.'
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
  },
  import: importMessages.en
}

export const studioMessages = { es, en }
