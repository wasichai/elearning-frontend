import { Card, CardBody, CardHeader } from '@wasichai/ui'
import { useTranslation } from 'react-i18next'
import type { Lab as LabData, LabEnvironment } from './contract'

const MILESTONES = 'milestones'

// el laboratorio de una lección (RF-LAB-01): objetivo, listas y entornos externos. la guía y los archivos son sus recursos;
// la entrega y la rúbrica, su evaluación. lo que viene vacío no se muestra
export function Lab({ lab }: { lab: LabData }) {
  const { t } = useTranslation('classroom')
  const lists = [
    ['requirements', lab.requirements],
    [MILESTONES, lab.milestones],
    ['acceptanceCriteria', lab.acceptanceCriteria],
    ['deliverables', lab.deliverables]
  ] as const
  if (!lab.objective && lists.every(([, items]) => items.length === 0) && lab.environments.length === 0) return null
  return (
    <Card role="region" aria-labelledby="lab-title">
      <CardHeader>
        <h3 id="lab-title" className="text-base font-semibold text-ink">
          {t('lab.title')}
        </h3>
      </CardHeader>
      <CardBody className="flex flex-col gap-5">
        {lab.objective ? (
          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">{t('lab.objective')}</p>
            <p className="max-w-prose text-base text-ink">{lab.objective}</p>
          </div>
        ) : null}
        {lists.map(([key, items]) => (
          <LabList key={key} name={key} items={items} />
        ))}
        {lab.environments.length === 0 ? null : <Environments environments={lab.environments} />}
      </CardBody>
    </Card>
  )
}

// los hitos van en orden; lo demás es una lista sin orden
function LabList({ name, items }: { name: string; items: readonly string[] }) {
  const { t } = useTranslation('classroom')
  if (items.length === 0) return null
  const id = `lab-${name}`
  const ordered = name === MILESTONES
  const List = ordered ? 'ol' : 'ul'
  return (
    <section aria-labelledby={id} className="flex flex-col gap-1.5">
      <h4 id={id} className="text-sm font-medium text-ink">
        {t(`lab.${name}`)}
      </h4>
      <List className={`flex flex-col gap-1 pl-5 text-sm text-ink ${ordered ? 'list-decimal' : 'list-disc'}`}>
        {items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </List>
    </section>
  )
}

// entornos externos: se abren en otra pestaña, sin opener ni referer. el servidor ya exige https público (SafeLink); si
// aun así llega otra cosa, se nombra sin enlazar
function Environments({ environments }: { environments: LabEnvironment[] }) {
  const { t } = useTranslation('classroom')
  return (
    <section aria-labelledby="lab-environments" className="flex flex-col gap-1.5">
      <h4 id="lab-environments" className="text-sm font-medium text-ink">
        {t('lab.environments')}
      </h4>
      <ul className="flex flex-col gap-1.5 text-sm">
        {environments.map((environment) => (
          <li key={environment.id}>
            {isHttps(environment.url) ? (
              <a
                href={environment.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t('lab.newTab', { title: environment.title })}
                className="text-link underline-offset-4 hover:underline"
              >
                {environment.title}
              </a>
            ) : (
              <span className="flex flex-wrap gap-x-2 text-ink">
                <span>{environment.title}</span>
                <span className="text-ink-muted">{t('lab.unsafe')}</span>
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

function isHttps(url: string): boolean {
  try {
    return new URL(url).protocol === 'https:'
  } catch {
    return false
  }
}
