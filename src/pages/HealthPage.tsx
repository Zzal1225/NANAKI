import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BodyMetricsSection from '../components/body/BodyMetricsSection'
import BodyPhotoSection from '../components/body/BodyPhotoSection'
import MeasurementIntervalSettings from '../components/body/MeasurementIntervalSettings'
import SupplementsSummarySection from '../components/supplements/SupplementsSummarySection'
import SupplementCalendar from '../components/supplements/SupplementCalendar'
import PageHeader from '../components/layout/PageHeader'
import MonthNav from '../components/layout/MonthNav'
import { useSections } from '../context/SectionContext'
import { useMonthScope } from '../hooks/useMonthScope'
import { getHealthDataStartMonth } from '../utils/dataStartMonth'

export default function HealthPage() {
  const { isSectionEnabled } = useSections()
  const navigate = useNavigate()
  const { month, setMonth, minMonth } = useMonthScope({
    getStartMonth: getHealthDataStartMonth,
  })
  const [openCreateTick, setOpenCreateTick] = useState(0)

  const handleAdd = () => {
    if (isSectionEnabled('body-metrics')) {
      setOpenCreateTick((t) => t + 1)
      return
    }
    navigate('/health/supplements')
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="건강" tab="health" onAdd={handleAdd}>
        <MonthNav month={month} onChange={setMonth} minMonth={minMonth} />
      </PageHeader>

      {(isSectionEnabled('body-metrics') ||
        isSectionEnabled('body-photo') ||
        isSectionEnabled('body-intervals')) && (
        <div className="flex flex-col gap-5">
          <h2 className="text-sm font-semibold text-text-secondary">체형</h2>
          {isSectionEnabled('body-metrics') && (
            <BodyMetricsSection month={month} openCreateTick={openCreateTick} />
          )}
          {isSectionEnabled('body-photo') && <BodyPhotoSection month={month} />}
          {isSectionEnabled('body-intervals') && <MeasurementIntervalSettings />}
        </div>
      )}

      {isSectionEnabled('supplements-summary') && (
        <>
          <SupplementsSummarySection />
          <SupplementCalendar month={month} onMonthChange={setMonth} />
        </>
      )}
    </div>
  )
}
