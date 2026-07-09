import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2, X } from 'lucide-react'
import Modal, { btnPrimary, btnSecondary, inputClass, selectClass } from '../common/Modal'
import NutrientPreview from './NutrientPreview'
import { generateId, saveSupplementProduct } from '../../db'
import { searchCatalog } from '../../supplements/catalog'
import {
  aggregateNutrients,
  getActiveSupplements,
  previewNutrientChanges,
  searchProductsByQuery,
  DAY_PART_LABELS,
  MEAL_LABELS,
} from '../../supplements/nutrients'
import { todayISO } from '../../utils/dates'
import type {
  NutrientAmount,
  PurchaseHistoryEntry,
  SupplementDayPart,
  SupplementMealRelation,
  SupplementProduct,
  SupplementSchedule,
  UserOwnedInput,
} from '../../types'

type EntryMode = 'choose' | 'repurchase' | 'new'

type AddSupplementModalProps = {
  open: boolean
  onClose: () => void
  products: SupplementProduct[]
  onSaved: () => void
}

const emptyNutrient = (): NutrientAmount => ({ name: '', amount: 0, unit: 'mg' })
const defaultSchedule = (): SupplementSchedule => ({
  dayPart: 'morning',
  meal: 'after',
})

export default function AddSupplementModal({
  open,
  onClose,
  products,
  onSaved,
}: AddSupplementModalProps) {
  const [mode, setMode] = useState<EntryMode>('choose')
  const [name, setName] = useState('')
  const [capacity, setCapacity] = useState('')
  const [nutrients, setNutrients] = useState<NutrientAmount[]>([emptyNutrient()])
  const [schedules, setSchedules] = useState<SupplementSchedule[]>([defaultSchedule()])
  const [price, setPrice] = useState('')
  const [store, setStore] = useState('')
  const [purchaseDate, setPurchaseDate] = useState(todayISO())
  const [repurchaseId, setRepurchaseId] = useState<string | null>(null)
  const [nameQuery, setNameQuery] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setMode('choose')
    setName('')
    setCapacity('')
    setNutrients([emptyNutrient()])
    setSchedules([defaultSchedule()])
    setPrice('')
    setStore('')
    setPurchaseDate(todayISO())
    setRepurchaseId(null)
    setNameQuery('')
    setError('')
  }, [open])

  const active = getActiveSupplements(products, todayISO())
  const currentNutrients = aggregateNutrients(active).map((n) => ({
    name: n.name,
    amount: n.amount,
    unit: n.unit,
  }))

  const preview = useMemo(
    () =>
      previewNutrientChanges(
        currentNutrients,
        nutrients.filter((n) => n.name.trim() && n.amount > 0),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nutrients, products],
  )

  const personalSuggestions = searchProductsByQuery(products, nameQuery || name)
  const catalogSuggestions = searchCatalog(nameQuery || name).filter(
    (c) => !personalSuggestions.some((p) => p.name === c.name),
  )

  const applyProduct = (product: SupplementProduct | { name: string; nutrients: NutrientAmount[]; capacity?: string }) => {
    setName(product.name)
    setNameQuery(product.name)
    setNutrients(product.nutrients.length ? product.nutrients.map((n) => ({ ...n })) : [emptyNutrient()])
    if ('capacity' in product && product.capacity) setCapacity(product.capacity)
    if ('id' in product && 'schedule' in product) {
      setSchedules(product.schedule.length ? product.schedule.map((s) => ({ ...s })) : [defaultSchedule()])
      setRepurchaseId(product.id)
    }
  }

  const handleRepurchaseSave = async () => {
    const target = products.find((p) => p.id === repurchaseId)
    if (!target) {
      setError('재구매할 제품을 선택하세요.')
      return
    }
    const parsedPrice = parseInt(price, 10)
    if (!parsedPrice || parsedPrice <= 0) {
      setError('구매 가격을 입력하세요.')
      return
    }
    const entry: PurchaseHistoryEntry = {
      id: generateId(),
      date: purchaseDate,
      price: parsedPrice,
      store: store.trim() || undefined,
    }
    await saveSupplementProduct({
      ...target,
      endedAt: null,
      purchaseHistory: [...(target.purchaseHistory ?? []), entry],
    })
    onSaved()
    onClose()
  }

  const handleNewSave = async () => {
    if (!name.trim()) {
      setError('제품명을 입력하세요.')
      return
    }
    const cleanNutrients = nutrients.filter((n) => n.name.trim() && n.amount > 0)
    if (cleanNutrients.length === 0) {
      setError('성분을 하나 이상 입력하세요.')
      return
    }
    const parsedPrice = price.trim() ? parseInt(price, 10) : 0
    const history: PurchaseHistoryEntry[] =
      parsedPrice > 0
        ? [
            {
              id: generateId(),
              date: purchaseDate,
              price: parsedPrice,
              store: store.trim() || undefined,
            },
          ]
        : []

    const record: UserOwnedInput<SupplementProduct> = {
      id: generateId(),
      name: name.trim(),
      nutrients: cleanNutrients.map((n) => ({
        name: n.name.trim(),
        amount: n.amount,
        unit: n.unit.trim() || 'mg',
      })),
      capacity: capacity.trim() || undefined,
      schedule: schedules,
      purchaseHistory: history,
      startedAt: todayISO(),
      endedAt: null,
    }
    await saveSupplementProduct(record)
    onSaved()
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        mode === 'choose' ? '영양제 추가' : mode === 'repurchase' ? '기존 제품 재구매' : '신규 제품 등록'
      }
    >
      {mode === 'choose' && (
        <div className="flex flex-col gap-3">
          <button
            type="button"
            className={`${btnSecondary} justify-start py-3 text-left`}
            onClick={() => setMode('repurchase')}
          >
            <span className="font-semibold text-text-primary">기존 복용 제품 재구매</span>
            <span className="mt-0.5 block text-xs text-text-muted">
              가격 · 구매처 · 날짜만 입력
            </span>
          </button>
          <button
            type="button"
            className={`${btnSecondary} justify-start py-3 text-left`}
            onClick={() => setMode('new')}
          >
            <span className="font-semibold text-text-primary">신규 제품 등록</span>
            <span className="mt-0.5 block text-xs text-text-muted">
              이름 · 성분 · 복용법 · 구매 정보
            </span>
          </button>
        </div>
      )}

      {mode === 'repurchase' && (
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-text-secondary">제품 선택</span>
            <select
              className={selectClass}
              value={repurchaseId ?? ''}
              onChange={(e) => setRepurchaseId(e.target.value || null)}
            >
              <option value="">선택…</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.endedAt ? ' (종료됨)' : ''}
                </option>
              ))}
            </select>
          </label>
          <div className="flex gap-2">
            <label className="flex min-w-0 flex-1 flex-col gap-1.5">
              <span className="text-sm text-text-secondary">구매일</span>
              <input
                type="date"
                className={inputClass}
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
              />
            </label>
            <label className="flex min-w-0 flex-1 flex-col gap-1.5">
              <span className="text-sm text-text-secondary">가격</span>
              <input
                type="number"
                className={`${inputClass} tabular-nums`}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="28000"
              />
            </label>
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-text-secondary">구매처</span>
            <input
              className={inputClass}
              value={store}
              onChange={(e) => setStore(e.target.value)}
              placeholder="쿠팡, 올리브영…"
            />
          </label>
          {error && <p className="text-xs text-danger">{error}</p>}
          <div className="flex gap-2">
            <button type="button" className={btnSecondary} onClick={() => setMode('choose')}>
              뒤로
            </button>
            <button type="button" className={btnPrimary} onClick={handleRepurchaseSave}>
              저장
            </button>
          </div>
        </div>
      )}

      {mode === 'new' && (
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            handleNewSave()
          }}
        >
          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-text-secondary">제품명</span>
            <input
              className={inputClass}
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setNameQuery(e.target.value)
              }}
              placeholder="오메가3"
              required
            />
            {(personalSuggestions.length > 0 || catalogSuggestions.length > 0) && nameQuery && (
              <ul className="max-h-32 overflow-y-auto rounded-xl border border-border bg-surface-raised text-sm">
                {personalSuggestions.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left hover:bg-surface-overlay"
                      onClick={() => applyProduct(p)}
                    >
                      {p.name}
                      <span className="ml-1 text-xs text-text-muted">내 기록</span>
                    </button>
                  </li>
                ))}
                {catalogSuggestions.map((c) => (
                  <li key={c.name}>
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left hover:bg-surface-overlay"
                      onClick={() => applyProduct(c)}
                    >
                      {c.name}
                      <span className="ml-1 text-xs text-text-muted">추천</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-text-secondary">용량</span>
            <input
              className={inputClass}
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              placeholder="90정"
            />
          </label>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">성분</span>
              <button
                type="button"
                className="text-xs text-accent"
                onClick={() => setNutrients((prev) => [...prev, emptyNutrient()])}
              >
                <Plus size={14} className="inline" /> 추가
              </button>
            </div>
            {nutrients.map((n, i) => (
              <div key={i} className="flex gap-1.5">
                <input
                  className={`${inputClass} min-w-0 flex-[2]`}
                  placeholder="Vitamin A"
                  value={n.name}
                  onChange={(e) =>
                    setNutrients((prev) =>
                      prev.map((row, j) => (j === i ? { ...row, name: e.target.value } : row)),
                    )
                  }
                />
                <input
                  type="number"
                  className={`${inputClass} w-20 shrink-0 tabular-nums`}
                  placeholder="1000"
                  value={n.amount || ''}
                  onChange={(e) =>
                    setNutrients((prev) =>
                      prev.map((row, j) =>
                        j === i ? { ...row, amount: parseFloat(e.target.value) || 0 } : row,
                      ),
                    )
                  }
                />
                <input
                  className={`${inputClass} w-16 shrink-0`}
                  placeholder="IU"
                  value={n.unit}
                  onChange={(e) =>
                    setNutrients((prev) =>
                      prev.map((row, j) => (j === i ? { ...row, unit: e.target.value } : row)),
                    )
                  }
                />
                {nutrients.length > 1 && (
                  <button
                    type="button"
                    className="shrink-0 text-text-muted hover:text-danger"
                    onClick={() => setNutrients((prev) => prev.filter((_, j) => j !== i))}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">복용법</span>
              <button
                type="button"
                className="text-xs text-accent"
                onClick={() => setSchedules((prev) => [...prev, defaultSchedule()])}
              >
                <Plus size={14} className="inline" /> 슬롯
              </button>
            </div>
            {schedules.map((s, i) => (
              <div key={i} className="flex flex-wrap items-center gap-1.5">
                <select
                  className={`${selectClass} w-auto`}
                  value={s.dayPart}
                  onChange={(e) =>
                    setSchedules((prev) =>
                      prev.map((row, j) =>
                        j === i ? { ...row, dayPart: e.target.value as SupplementDayPart } : row,
                      ),
                    )
                  }
                >
                  {(Object.keys(DAY_PART_LABELS) as SupplementDayPart[]).map((k) => (
                    <option key={k} value={k}>
                      {DAY_PART_LABELS[k]}
                    </option>
                  ))}
                </select>
                <select
                  className={`${selectClass} w-auto`}
                  value={s.meal}
                  onChange={(e) =>
                    setSchedules((prev) =>
                      prev.map((row, j) =>
                        j === i ? { ...row, meal: e.target.value as SupplementMealRelation } : row,
                      ),
                    )
                  }
                >
                  {(Object.keys(MEAL_LABELS) as SupplementMealRelation[]).map((k) => (
                    <option key={k} value={k}>
                      {MEAL_LABELS[k]}
                    </option>
                  ))}
                </select>
                <input
                  type="time"
                  className={`${inputClass} w-auto`}
                  value={s.alarmTime ?? ''}
                  onChange={(e) =>
                    setSchedules((prev) =>
                      prev.map((row, j) =>
                        j === i ? { ...row, alarmTime: e.target.value || undefined } : row,
                      ),
                    )
                  }
                  title="알람 시각"
                />
                {schedules.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setSchedules((prev) => prev.filter((_, j) => j !== i))}
                    className="text-text-muted hover:text-danger"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div>
            <p className="mb-1.5 text-sm text-text-secondary">성분 미리보기</p>
            <NutrientPreview changes={preview} />
          </div>

          <div className="flex gap-2">
            <label className="flex min-w-0 flex-1 flex-col gap-1.5">
              <span className="text-sm text-text-secondary">구매일</span>
              <input
                type="date"
                className={inputClass}
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
              />
            </label>
            <label className="flex min-w-0 flex-1 flex-col gap-1.5">
              <span className="text-sm text-text-secondary">가격</span>
              <input
                type="number"
                className={`${inputClass} tabular-nums`}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="선택"
              />
            </label>
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm text-text-secondary">구매처</span>
            <input
              className={inputClass}
              value={store}
              onChange={(e) => setStore(e.target.value)}
              placeholder="선택"
            />
          </label>

          {error && <p className="text-xs text-danger">{error}</p>}
          <div className="flex gap-2">
            <button type="button" className={btnSecondary} onClick={() => setMode('choose')}>
              뒤로
            </button>
            <button type="submit" className={btnPrimary}>
              저장
            </button>
          </div>
        </form>
      )}
    </Modal>
  )
}
