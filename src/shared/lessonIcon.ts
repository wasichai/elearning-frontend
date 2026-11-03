import { BookOpen, CirclePlay, ClipboardCheck, FileText, FlaskConical, Presentation, Radio, type LucideIcon } from 'lucide-react'

const LESSON_ICONS: Record<string, LucideIcon> = {
  LECTURA: BookOpen,
  VIDEO: CirclePlay,
  PRESENTACION: Presentation,
  LABORATORIO: FlaskConical,
  EVALUACION: ClipboardCheck,
  SESION: Radio
}

// el tipo de lección es un vocabulario abierto: lo que no se conoce lleva el icono de un documento
export const lessonIcon = (type: string): LucideIcon => LESSON_ICONS[type] ?? FileText
