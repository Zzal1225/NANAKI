import BodyMetricsSection from '../components/body/BodyMetricsSection'
import BodyPhotoSection from '../components/body/BodyPhotoSection'
import MeasurementIntervalSettings from '../components/body/MeasurementIntervalSettings'
import PageHeader from '../components/layout/PageHeader'
import { useSections } from '../context/SectionContext'

export default function BodyPage() {
  const { isSectionEnabled } = useSections()

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="체형" subtitle="체중 · 둘레 · 눈바디" tab="body" />

      {isSectionEnabled('body-metrics') && <BodyMetricsSection />}
      {isSectionEnabled('body-photo') && <BodyPhotoSection />}
      {isSectionEnabled('body-intervals') && <MeasurementIntervalSettings />}
    </div>
  )
}
