import BodyShapeSection from '../components/mybody/BodyShapeSection'
import HealthSection from '../components/mybody/HealthSection'
import PageHeader from '../components/layout/PageHeader'
import { useSections } from '../context/SectionContext'

export default function MyBodyPage() {
  const { isSectionEnabled } = useSections()

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="내몸" subtitle="체형관리 · 건강관리" tab="mybody" />

      {isSectionEnabled('body-shape') && <BodyShapeSection />}
      <HealthSection />
    </div>
  )
}
