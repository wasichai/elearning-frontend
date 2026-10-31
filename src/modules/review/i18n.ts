import { diffMessages } from '../../shared/diffMessages'

// textos del módulo, espacio de nombres 'review' (= id del módulo)
const es = {
  nav: {
    group: 'Revisión',
    inbox: 'Bandeja de revisión'
  },
  inbox: {
    title: 'Bandeja de revisión',
    subtitle: 'Las versiones de curso que esperan tu revisión, la que más espera primero.',
    loading: 'Cargando la bandeja…',
    empty: 'No hay versiones esperando tu revisión',
    emptyHint: 'Cuando alguien envíe a revisión una versión que puedas revisar, aparecerá aquí.',
    code: '{{course}} · versión {{number}}',
    waiting: 'En revisión desde el {{date}}',
    openComments_one: '{{value}} comentario abierto',
    openComments_other: '{{value}} comentarios abiertos',
    noOpenComments: 'Sin comentarios abiertos',
    assigned: 'Asignada a ti'
  },
  version: {
    title: 'Revisar una versión',
    subtitle: '{{course}} · versión {{number}}',
    back: '← Bandeja de revisión',
    loading: 'Cargando la versión…',
    updated: 'Actualizada el {{date}}',
    closed: 'Esta versión ya no está en revisión: no admite comentarios ni decisiones. Aún puedes marcar comentarios como resueltos.'
  },
  status: {
    BORRADOR: 'Borrador',
    EN_REVISION: 'En revisión',
    APROBADA: 'Aprobada',
    PUBLICADA: 'Publicada',
    RETIRADA: 'Retirada'
  },
  lessonType: {
    LECTURA: 'Lectura',
    VIDEO: 'Vídeo',
    PRESENTACION: 'Presentación',
    LABORATORIO: 'Laboratorio',
    EVALUACION: 'Evaluación',
    SESION: 'Sesión'
  },
  content: {
    whole: 'La versión completa',
    unit: 'Unidad {{order}}. {{title}}',
    lesson: 'Lección {{unit}}.{{order}}. {{title}}',
    resources_one: '{{value}} recurso',
    resources_other: '{{value}} recursos',
    assessment: 'con evaluación',
    source: 'origen {{source}}',
    empty: 'Esta versión aún no tiene unidades.'
  },
  comments: {
    whole: 'Comentarios generales',
    none: 'Sin comentarios generales.',
    others: 'Otros comentarios',
    section: 'Sección: {{section}}',
    listLabel: 'Comentarios de {{section}}',
    add: 'Comentar',
    addLabel: 'Comentar {{section}}',
    formLabel: 'Nuevo comentario sobre {{section}}',
    text: 'Comentario',
    empty: 'Escribe el comentario.',
    send: 'Enviar comentario',
    sending: 'Enviando…',
    cancel: 'Cancelar',
    resolve: 'Marcar como resuelto',
    resolving: 'Marcando…',
    resolved: 'Resuelto'
  },
  decide: {
    title: 'Tu decisión',
    hint: 'Aprobar deja la versión lista para publicar. Pedir cambios la devuelve al autor como borrador; rechazarla la retira. Ambas piden un motivo.',
    APROBAR: 'Aprobar',
    PEDIR_CAMBIOS: 'Pedir cambios',
    RECHAZAR: 'Rechazar',
    cancel: 'Cancelar',
    approveTitle: '¿Aprobar esta versión?',
    approveDescription: 'Quedará aprobada y lista para publicar. Ya no admitirá comentarios.',
    PEDIR_CAMBIOSTitle: '¿Pedir cambios?',
    PEDIR_CAMBIOSDescription: 'La versión vuelve al autor como borrador. Explica qué tiene que cambiar.',
    RECHAZARTitle: '¿Rechazar esta versión?',
    RECHAZARDescription: 'La versión queda retirada y no se podrá publicar. Explica por qué.'
  },
  decided: {
    APROBAR: 'Versión aprobada. Estado: {{status}}.',
    PEDIR_CAMBIOS: 'Cambios pedidos. Estado: {{status}}.',
    RECHAZAR: 'Versión rechazada. Estado: {{status}}.'
  },
  decision: {
    APROBAR: 'Aprobada',
    PEDIR_CAMBIOS: 'Cambios pedidos',
    RECHAZAR: 'Rechazada'
  },
  // las diferencias con la versión anterior (VersionDiffSection)
  diff: diffMessages.es,
  history: {
    title: 'Historial de decisiones',
    empty: 'Aún no hay decisiones sobre esta versión.'
  },
  publish: {
    title: 'Publicar',
    hint: 'La versión está aprobada. Al publicarla, el curso la ofrecerá y ya no podrá cambiar.',
    action: 'Publicar la versión',
    confirmTitle: '¿Publicar esta versión?',
    confirmDescription: 'Una versión publicada no cambia: lo que haga falta después irá en una versión nueva.',
    done: 'Versión publicada.'
  },
  action: {
    conflict: 'El servidor no lo aceptó: {{detail}}',
    invalid: 'El servidor rechazó los datos: {{detail}}',
    notFound: 'Esta versión ya no está a tu cargo: puede que se haya asignado a otra persona.',
    refused: 'No tienes permiso para hacerlo. Nadie revisa su propia versión, y con un revisor asignado solo decide esa persona.',
    network: 'No hay conexión con el servidor. Revisa tu conexión e inténtalo de nuevo.',
    failed: 'No pudimos guardarlo. Inténtalo de nuevo.',
    failedStatus: 'No pudimos guardarlo (error {{status}}). Inténtalo de nuevo.'
  },
  problem: {
    inbox: {
      invalid: 'No pudimos cargar la bandeja',
      notFound: 'La bandeja no está disponible',
      conflict: 'No pudimos cargar la bandeja',
      refused: 'No tienes permiso para revisar versiones',
      server: 'No pudimos cargar la bandeja',
      network: 'No pudimos conectar con el servidor',
      contract: 'No pudimos leer la respuesta del servidor'
    },
    version: {
      invalid: 'No pudimos cargar la versión',
      notFound: 'Esta versión no está a tu cargo',
      conflict: 'No pudimos cargar la versión',
      refused: 'No puedes revisar esta versión',
      server: 'No pudimos cargar la versión',
      network: 'No pudimos conectar con el servidor',
      contract: 'No pudimos leer la respuesta del servidor'
    },
    notFoundHint: 'Solo ves las versiones en revisión que te tocan. El enlace puede ser de otra versión, o se asignó a otra persona.',
    hint: {
      invalid: 'El servidor no aceptó la petición. Inténtalo de nuevo.',
      notFound: 'Puede que ya no exista.',
      conflict: 'El servidor no lo aceptó en este momento. Inténtalo de nuevo.',
      refused: 'Revisar versiones exige el permiso de aprobar, y nadie revisa su propia versión. Si crees que deberías, pide acceso a la coordinación.',
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
    group: 'Review',
    inbox: 'Review inbox'
  },
  inbox: {
    title: 'Review inbox',
    subtitle: 'The course versions waiting for your review, the longest waiting first.',
    loading: 'Loading the inbox…',
    empty: 'No versions are waiting for your review',
    emptyHint: 'When someone submits a version you can review, it will show up here.',
    code: '{{course}} · version {{number}}',
    waiting: 'In review since {{date}}',
    openComments_one: '{{value}} open comment',
    openComments_other: '{{value}} open comments',
    noOpenComments: 'No open comments',
    assigned: 'Assigned to you'
  },
  version: {
    title: 'Review a version',
    subtitle: '{{course}} · version {{number}}',
    back: '← Review inbox',
    loading: 'Loading the version…',
    updated: 'Updated {{date}}',
    closed: 'This version is no longer in review: it takes no comments or decisions. You can still mark comments as resolved.'
  },
  status: {
    BORRADOR: 'Draft',
    EN_REVISION: 'In review',
    APROBADA: 'Approved',
    PUBLICADA: 'Published',
    RETIRADA: 'Withdrawn'
  },
  lessonType: {
    LECTURA: 'Reading',
    VIDEO: 'Video',
    PRESENTACION: 'Slides',
    LABORATORIO: 'Lab',
    EVALUACION: 'Assessment',
    SESION: 'Session'
  },
  content: {
    whole: 'The whole version',
    unit: 'Unit {{order}}. {{title}}',
    lesson: 'Lesson {{unit}}.{{order}}. {{title}}',
    resources_one: '{{value}} resource',
    resources_other: '{{value}} resources',
    assessment: 'with assessment',
    source: 'source {{source}}',
    empty: 'This version has no units yet.'
  },
  comments: {
    whole: 'General comments',
    none: 'No general comments.',
    others: 'Other comments',
    section: 'Section: {{section}}',
    listLabel: 'Comments on {{section}}',
    add: 'Comment',
    addLabel: 'Comment on {{section}}',
    formLabel: 'New comment on {{section}}',
    text: 'Comment',
    empty: 'Write the comment.',
    send: 'Send comment',
    sending: 'Sending…',
    cancel: 'Cancel',
    resolve: 'Mark as resolved',
    resolving: 'Marking…',
    resolved: 'Resolved'
  },
  decide: {
    title: 'Your decision',
    hint: 'Approving leaves the version ready to publish. Requesting changes sends it back to the author as a draft; rejecting withdraws it. Both need a reason.',
    APROBAR: 'Approve',
    PEDIR_CAMBIOS: 'Request changes',
    RECHAZAR: 'Reject',
    cancel: 'Cancel',
    approveTitle: 'Approve this version?',
    approveDescription: 'It will be approved and ready to publish. It will take no more comments.',
    PEDIR_CAMBIOSTitle: 'Request changes?',
    PEDIR_CAMBIOSDescription: 'The version goes back to the author as a draft. Explain what needs to change.',
    RECHAZARTitle: 'Reject this version?',
    RECHAZARDescription: 'The version is withdrawn and cannot be published. Explain why.'
  },
  decided: {
    APROBAR: 'Version approved. Status: {{status}}.',
    PEDIR_CAMBIOS: 'Changes requested. Status: {{status}}.',
    RECHAZAR: 'Version rejected. Status: {{status}}.'
  },
  decision: {
    APROBAR: 'Approved',
    PEDIR_CAMBIOS: 'Changes requested',
    RECHAZAR: 'Rejected'
  },
  diff: diffMessages.en,
  history: {
    title: 'Decision history',
    empty: 'No decisions on this version yet.'
  },
  publish: {
    title: 'Publish',
    hint: 'The version is approved. Once published, the course offers it and it can no longer change.',
    action: 'Publish the version',
    confirmTitle: 'Publish this version?',
    confirmDescription: 'A published version never changes: anything needed later goes in a new version.',
    done: 'Version published.'
  },
  action: {
    conflict: 'The server did not accept it: {{detail}}',
    invalid: 'The server rejected the data: {{detail}}',
    notFound: 'This version is no longer yours to review: it may have been assigned to someone else.',
    refused: 'You are not allowed to do this. Nobody reviews their own version, and with an assigned reviewer only that person decides.',
    network: 'There is no connection to the server. Check your connection and try again.',
    failed: 'We could not save it. Try again.',
    failedStatus: 'We could not save it (error {{status}}). Try again.'
  },
  problem: {
    inbox: {
      invalid: 'We could not load the inbox',
      notFound: 'The inbox is not available',
      conflict: 'We could not load the inbox',
      refused: 'You are not allowed to review versions',
      server: 'We could not load the inbox',
      network: 'We could not reach the server',
      contract: 'We could not read the server response'
    },
    version: {
      invalid: 'We could not load the version',
      notFound: 'This version is not yours to review',
      conflict: 'We could not load the version',
      refused: 'You cannot review this version',
      server: 'We could not load the version',
      network: 'We could not reach the server',
      contract: 'We could not read the server response'
    },
    notFoundHint: 'You only see the versions in review that are yours. The link may be for another version, or it was assigned to someone else.',
    hint: {
      invalid: 'The server did not accept the request. Try again.',
      notFound: 'It may no longer exist.',
      conflict: 'The server did not accept it right now. Try again.',
      refused:
        'Reviewing versions needs the approve permission, and nobody reviews their own version. If you think you should, ask the coordination for access.',
      server: 'The server had a problem (error {{status}}). Try again in a few minutes.',
      network: 'Check your connection and try again.',
      unexpected: 'An unexpected error happened. Try again.',
      contract: 'The response is not in the format this page expects; this usually happens during an update. Try again in a few minutes.'
    },
    retry: 'Retry'
  }
}

export const reviewMessages = { es, en }
