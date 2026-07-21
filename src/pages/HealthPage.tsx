import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BodyWeightSection from '../components/body/BodyWeightSection'
import BodyCircumferenceSection from '../components/body/BodyCircumferenceSection'
import BodyPhotoSection from '../components/body/BodyPhotoSection'
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
  const { month, setMonth, minMonth, maxMonth } = useMonthScope({
    getStartMonth: getHealthDataStartMonth,
  })
  const [openCreateTick, setOpenCreateTick] = useState(0)

  const showBody =
    isSectionEnabled('body-weight') ||
    isSectionEnabled('body-circumference') ||
    isSectionEnabled('body-photo')

  const handleAdd = () => {
    if (isSectionEnabled('body-weight')) {
      setOpenCreateTick((t) => t + 1)
      return
    }
    if (isSectionEnabled('body-circumference') || isSectionEnabled('body-photo')) {
      return
    }
    navigate('/health/supplements')
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="건강" tab="health" onAdd={handleAdd}>
        <MonthNav month={month} onChange={setMonth} minMonth={minMonth} maxMonth={maxMonth} />
      </PageHeader>

      {showBody && (
        <div className="flex flex-col gap-6">
          <h2 className="text-sm font-semibold text-text-secondary">체형</h2>
          {isSectionEnabled('body-weight') && (
            <BodyWeightSection month={month} openCreateTick={openCreateTick} />
          )}
          {isSectionEnabled('body-circumference') && (
            <BodyCircumferenceSection month={month} />
          )}
          {isSectionEnabled('body-photo') && <BodyPhotoSection month={month} />}
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
