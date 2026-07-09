import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, Plus } from 'lucide-react'
import PageHeader from '../components/layout/PageHeader'
import { useAsync } from '../hooks/useAsync'
import { getAllSupplementProducts, saveSupplementProduct } from '../db'
import { getActiveSupplements } from '../supplements/nutrients'
import {
  ensureNotificationPermission,
  scheduleTodayAlarms,
} from '../supplements/alarms'
import { todayISO } from '../utils/dates'
import type { SupplementProduct } from '../types'
import AddSupplementModal from '../components/supplements/AddSupplementModal'
import ActiveSupplementsList, {
  PurchaseHistorySection,
} from '../components/supplements/ActiveSupplementsList'
import SupplementCalendar from '../components/supplements/SupplementCalendar'

export default function SupplementsPage() {
  const { data: products, reload } = useAsync(() => getAllSupplementProducts(), [])
  const [showAdd, setShowAdd] = useState(false)
  const list = products ?? []
  const active = getActiveSupplements(list, todayISO())

  useEffect(() => {
    if (!products) return
    ensureNotificationPermission().then((perm) => {
      if (perm === 'granted') scheduleTodayAlarms(products)
    })
  }, [products])

  const handleEnd = async (product: SupplementProduct) => {
    if (!confirm(`${product.name} 복용을 종료할까요?\n구매 이력은 남습니다.`)) return
    await saveSupplementProduct({
      ...product,
      endedAt: todayISO(),
    })
    reload()
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="영양제"
        tab="health"
        actions={
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="rounded-xl bg-accent p-2.5 text-surface"
            aria-label="영양제 추가"
          >
            <Plus size={18} />
          </button>
        }
      >
        <Link
          to="/health"
          className="mt-1 inline-flex items-center gap-0.5 text-sm text-text-muted hover:text-text-primary"
        >
          <ChevronLeft size={14} />
          건강
        </Link>
      </PageHeader>

      <ActiveSupplementsList products={active} onEnd={handleEnd} />
      <SupplementCalendar products={list} onChanged={reload} />
      <PurchaseHistorySection products={list} />

      <AddSupplementModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        products={list}
        onSaved={reload}
      />
    </div>
  )
}
