import BodyMetricsSection from '../components/body/BodyMetricsSection'
import BodyPhotoSection from '../components/body/BodyPhotoSection'
import MeasurementIntervalSettings from '../components/body/MeasurementIntervalSettings'
import SupplementsSummarySection from '../components/supplements/SupplementsSummarySection'
import SupplementCalendar from '../components/supplements/SupplementCalendar'
import PageHeader from '../components/layout/PageHeader'
import { useSections } from '../context/SectionContext'

export default function HealthPage() {
  const { isSectionEnabled } = useSections()

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="건강" tab="health" />

      {(isSectionEnabled('body-metrics') ||
        isSectionEnabled('body-photo') ||
        isSectionEnabled('body-intervals')) && (
        <div className="flex flex-col gap-5">
          <h2 className="text-sm font-semibold text-text-secondary">체형</h2>
          {isSectionEnabled('body-metrics') && <BodyMetricsSection />}
          {isSectionEnabled('body-photo') && <BodyPhotoSection />}
          {isSectionEnabled('body-intervals') && <MeasurementIntervalSettings />}
        </div>
      )}

      {isSectionEnabled('supplements-summary') && (
        <>
          <SupplementsSummarySection />
          <SupplementCalendar />
        </>
      )}
    </div>
  )
}
