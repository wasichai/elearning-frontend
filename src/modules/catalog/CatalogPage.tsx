import { PageHeader } from '@wasichai/core'
import { useTranslation } from 'react-i18next'

// se completa en E7.2
export function CatalogPage() {
  const { t } = useTranslation('catalog')
  return <PageHeader title={t('catalog.title')} subtitle={t('catalog.subtitle')} />
}
