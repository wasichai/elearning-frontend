import { PageHeader } from '@wasichai/core'
import { useTranslation } from 'react-i18next'

// se completa en E7.3
export function CourseDetailPage() {
  const { t } = useTranslation('catalog')
  return <PageHeader title={t('course.title')} />
}
