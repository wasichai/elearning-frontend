import { DynamicForm, ErrorState, formError, useObjectDefinition, useSaveRecord, useWritePolicy, WritePolicyNotice } from '@wasichai/core'
import type { FieldViolation, Form, RecordItem, RecordPayload } from '@wasichai/core'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FormSkeleton } from '../../shared/PageSkeleton'

interface StudioRecordFormProps {
  objectName: string
  // solo estos campos, si se dan; los demás no se piden ni se validan
  form?: Form
  initial?: RecordItem
  // lo que el estudio ya sabe y no pregunta
  fixed?: Record<string, unknown>
  onSaved: (created: RecordItem) => void
  onCancel: () => void
}

// crear un registro dentro del estudio, con el formulario de metadatos de core y sus reglas: lo mismo que su pantalla de registro nuevo,
// salvo adónde lleva al guardar. core solo sabe abrir el registro creado
export function StudioRecordForm({ objectName, form, initial, fixed, onSaved, onCancel }: StudioRecordFormProps) {
  const { t } = useTranslation('studio')
  const definition = useObjectDefinition(objectName)
  const save = useSaveRecord(objectName)
  const policy = useWritePolicy(objectName)
  const [error, setError] = useState<string | null>(null)
  const [violations, setViolations] = useState<FieldViolation[]>([])
  if (definition.isError && !definition.data) return <ErrorState error={definition.error} onRetry={() => void definition.refetch()} />
  if (!definition.data) return <FormSkeleton label={t('newCourse.loading')} />
  if (!policy.canCreate) return <WritePolicyNotice policy={policy} />
  // la etiqueta de la metadata solo tiene un idioma (ADR-070 de Wasichai): la del módulo, si la hay, y si no la del servidor. solo cambia lo que se lee
  const localized = {
    ...definition.data,
    fields: definition.data.fields.map((field) => ({
      ...field,
      label: t(`recordForm.${objectName}.${field.name}`, { defaultValue: field.label }),
      description: t(`recordHelp.${objectName}.${field.name}`, { defaultValue: field.description ?? '' }) || null
    }))
  }
  const submit = async (payload: RecordPayload, reason?: string) => {
    setError(null)
    setViolations([])
    try {
      onSaved(await save.mutateAsync({ payload: { ...payload, attributes: { ...payload.attributes, ...fixed } }, reason }))
    } catch (cause) {
      const refused = formError(cause)
      setError(refused.message)
      setViolations(refused.violations)
    }
  }
  return (
    <DynamicForm
      definition={localized}
      form={form}
      record={initial}
      submitting={save.isPending}
      error={error}
      violations={violations}
      onCancel={onCancel}
      onSubmit={(payload, reason) => void submit(payload, reason)}
    />
  )
}
