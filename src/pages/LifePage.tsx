import { useEffect, useState } from 'react'
import PageHeader from '../components/layout/PageHeader'
import MonthNav from '../components/layout/MonthNav'
import { useSections } from '../context/SectionContext'
import LifeRoutinesSection from '../components/life/LifeRoutinesSection'
import PantrySection from '../components/life/PantrySection'
import PurchaseCyclesSection from '../components/life/PurchaseCyclesSection'
import { useAsync } from '../hooks/useAsync'
import { useMonthScope } from '../hooks/useMonthScope'
import { getAllLifeRoutines, getAllPantryItems } from '../db'
import {
  clearLifeAlarms,
  ensureNotificationPermission,
  scheduleLifeReminders,
} from '../life/alarms'
import { getLifeDataStartMonth } from '../utils/dataStartMonth'

export default function LifePage() {
  const { isSectionEnabled } = useSections()
  const { month, setMonth, minMonth } = useMonthScope({
    getStartMonth: getLifeDataStartMonth,
  })
  const [openCreateTick, setOpenCreateTick] = useState(0)
  const { data: routines } = useAsync(() => getAllLifeRoutines(), [])
  const { data: pantry } = useAsync(() => getAllPantryItems(), [])

  useEffect(() => {
    if (!routines || !pantry) return
    ensureNotificationPermission().then((perm) => {
      if (perm === 'granted') scheduleLifeReminders(routines, pantry)
    })
    return () => clearLifeAlarms()
  }, [routines, pantry])

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="생활" tab="life" onAdd={() => setOpenCreateTick((t) => t + 1)}>
        <MonthNav month={month} onChange={setMonth} minMonth={minMonth} />
      </PageHeader>

      {isSectionEnabled('life-routines') && (
        <LifeRoutinesSection month={month} openCreateTick={openCreateTick} />
      )}
      {isSectionEnabled('life-pantry') && <PantrySection month={month} />}
      {isSectionEnabled('life-purchase-cycles') && <PurchaseCyclesSection month={month} />}
    </div>
  )
}
