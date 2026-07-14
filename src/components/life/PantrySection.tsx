import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { Card } from '../common/Card'
import Modal, { FormField, btnPrimary, btnSecondary, inputClass } from '../common/Modal'
import { useAsync } from '../../hooks/useAsync'
import {
  deletePantryItem,
  generateId,
  getAllArchiveItems,
  getAllPantryItems,
  savePantryItem,
} from '../../db'
import {
  daysUntilExpiry,
  formatRemainingDays,
  getPantryStatus,
  PANTRY_STATUS_META,
} from '../../life/pantryStatus'
import { formatDate, todayISO } from '../../utils/dates'
import type { ArchiveItem, PantryItem, UserOwnedInput } from '../../types'

export default function PantrySection({ month }: { month?: string }) {
  const { data: items, loading, reload } = useAsync(() => getAllPantryItems(), [])
  const { data: archives } = useAsync(() => getAllArchiveItems(), [])
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<PantryItem | null>(null)

  const archiveMap = useMemo(
    () => new Map((archives ?? []).map((a) => [a.id, a])),
    [archives],
  )

  const visibleItems = useMemo(() => {
    if (!items) return []
    if (!month) return items
    return items.filter(
      (item) => item.expiresAt.startsWith(month) || (item.purchasedAt?.startsWith(month) ?? false),
    )
  }, [items, month])

  const openCreate = () => {
    setEditing(null)
    setModalOpen(true)
  }

  const openEdit = (item: PantryItem) => {
    setEditing(item)
    setModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('이 항목을 삭제할까요?')) return
    await deletePantryItem(id)
    await reload()
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-text-secondary">냉장고 · 소비기한</h2>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-lg bg-accent/20 p-2 text-accent"
          aria-label="냉장고 항목 추가"
        >
          <Plus size={16} />
        </button>
      </div>

      {loading && !items ? (
        <Card>
          <p className="text-sm text-text-muted">불러오는 중...</p>
        </Card>
      ) : (items?.length ?? 0) === 0 ? (
        <Card>
          <p className="text-sm text-text-muted">
            구매일·유통기한을 등록하면 남은 기간과 상태(여유/임박/폐기)를 보여줍니다.
          </p>
        </Card>
      ) : visibleItems.length === 0 ? (
        <Card>
          <p className="text-sm text-text-muted">이 달의 냉장고 항목이 없습니다.</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {visibleItems.map((item) => {
            const status = getPantryStatus(item.expiresAt)
            const meta = PANTRY_STATUS_META[status]
            const days = daysUntilExpiry(item.expiresAt)
            const linked = (item.linkedArchiveIds ?? [])
              .map((id) => archiveMap.get(id))
              .filter(Boolean) as ArchiveItem[]
            return (
              <Card key={item.id} className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium">
                    {item.emoji ? `${item.emoji} ` : ''}
                    {item.name}
                    {item.quantity != null && (
                      <span className="ml-1 text-sm font-normal text-text-muted">
                        {item.quantity}
                        {item.unit ?? ''}
                      </span>
                    )}
                  </p>
                  <p className="mt-1 text-xs text-text-muted">
                    {item.purchasedAt && `구매일: ${formatDate(item.purchasedAt, 'M/d')} · `}
                    유통기한: {formatDate(item.expiresAt, 'M/d')}
                    {' · '}
                    남은 기간: {formatRemainingDays(days)}
                  </p>
                  <p className={`mt-0.5 text-xs ${meta.className}`}>
                    {meta.emoji} {meta.label}
                  </p>
                  {linked.length > 0 && (
                    <p className="mt-1 text-xs text-archive">
                      기록:{' '}
                      {linked.map((a, i) => (
                        <span key={a.id}>
                          {i > 0 && ', '}
                          <Link to="/records" className="hover:underline">
                            {a.title}
                          </Link>
                        </span>
                      ))}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openEdit(item)}
                    className="rounded-lg p-2 text-text-muted hover:bg-surface-overlay hover:text-text-primary"
                    aria-label="편집"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    className="rounded-lg p-2 text-text-muted hover:bg-danger/10 hover:text-danger"
                    aria-label="삭제"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <PantryModal
        open={modalOpen}
        editing={editing}
        archives={archives ?? []}
        onClose={() => setModalOpen(false)}
        onSaved={async () => {
          setModalOpen(false)
          await reload()
        }}
      />
    </section>
  )
}

function PantryModal({
  open,
  editing,
  archives,
  onClose,
  onSaved,
}: {
  open: boolean
  editing: PantryItem | null
  archives: ArchiveItem[]
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('')
  const [purchasedAt, setPurchasedAt] = useState(todayISO())
  const [expiresAt, setExpiresAt] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unit, setUnit] = useState('')
  const [linkedIds, setLinkedIds] = useState<string[]>([])
  const [archiveQuery, setArchiveQuery] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    if (editing) {
      setName(editing.name)
      setEmoji(editing.emoji ?? '')
      setPurchasedAt(editing.purchasedAt ?? '')
      setExpiresAt(editing.expiresAt)
      setQuantity(editing.quantity != null ? String(editing.quantity) : '')
      setUnit(editing.unit ?? '')
      setLinkedIds(editing.linkedArchiveIds ?? [])
    } else {
      setName('')
      setEmoji('')
      setPurchasedAt(todayISO())
      setExpiresAt('')
      setQuantity('')
      setUnit('')
      setLinkedIds([])
    }
    setArchiveQuery('')
    setError('')
  }, [open, editing])

  const filteredArchives = useMemo(() => {
    const q = archiveQuery.trim().toLowerCase()
    const list = archives
    if (!q) return list.slice(0, 30)
    return list
      .filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.tags.some((t) => t.toLowerCase().includes(q)) ||
          a.memo?.toLowerCase().includes(q),
      )
      .slice(0, 30)
  }, [archives, archiveQuery])

  const toggleLink = (id: string) => {
    setLinkedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const handleSave = async () => {
    if (!name.trim()) {
      setError('이름을 입력하세요.')
      return
    }
    if (!expiresAt) {
      setError('유통기한을 입력하세요.')
      return
    }
    const qty = quantity.trim() ? Number(quantity) : undefined
    if (quantity.trim() && (Number.isNaN(qty) || (qty ?? 0) < 0)) {
      setError('수량을 확인하세요.')
      return
    }

    const record: UserOwnedInput<PantryItem> = {
      id: editing?.id ?? generateId(),
      name: name.trim(),
      emoji: emoji.trim() || undefined,
      purchasedAt: purchasedAt || undefined,
      expiresAt,
      quantity: qty,
      unit: unit.trim() || undefined,
      linkedArchiveIds: linkedIds.length ? linkedIds : undefined,
    }
    await savePantryItem(record)
    onSaved()
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? '냉장고 항목 편집' : '냉장고 항목 추가'}>
      <div className="flex flex-col gap-4">
        <div className="flex gap-2">
          <FormField label="이모지">
            <input
              className={`${inputClass} w-16 text-center`}
              value={emoji}
              onChange={(e) => setEmoji(e.target.value)}
              placeholder="🥚"
              maxLength={4}
            />
          </FormField>
          <div className="min-w-0 flex-1">
            <FormField label="이름">
              <input
                className={inputClass}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="예: 계란"
              />
            </FormField>
          </div>
        </div>

        <FormField label="구매일 (선택)">
          <input
            type="date"
            className={inputClass}
            value={purchasedAt}
            onChange={(e) => setPurchasedAt(e.target.value)}
          />
        </FormField>

        <FormField label="유통기한">
          <input
            type="date"
            className={inputClass}
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            required
          />
        </FormField>

        <div className="flex gap-2">
          <div className="flex-1">
            <FormField label="수량 (선택)">
              <input
                type="number"
                min={0}
                step="any"
                className={inputClass}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="6"
              />
            </FormField>
          </div>
          <div className="w-24">
            <FormField label="단위">
              <input
                className={inputClass}
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="개"
              />
            </FormField>
          </div>
        </div>

        <FormField label={`연결된 기록 (${linkedIds.length})`}>
          <input
            className={inputClass}
            value={archiveQuery}
            onChange={(e) => setArchiveQuery(e.target.value)}
            placeholder="기록 검색…"
          />
          {archives.length === 0 ? (
            <p className="mt-2 text-xs text-text-muted">
              아직 기록이 없습니다. 기록 탭에서 추가한 뒤 연결할 수 있습니다.
            </p>
          ) : (
            <ul className="mt-2 max-h-36 overflow-y-auto rounded-xl border border-border">
              {filteredArchives.map((a) => {
                const checked = linkedIds.includes(a.id)
                return (
                  <li key={a.id}>
                    <label className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-surface-overlay">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleLink(a.id)}
                        className="accent-accent"
                      />
                      <span className="min-w-0 truncate">{a.title}</span>
                      <span className="shrink-0 text-xs text-text-muted">{a.date}</span>
                    </label>
                  </li>
                )
              })}
              {filteredArchives.length === 0 && (
                <li className="px-3 py-2 text-xs text-text-muted">검색 결과 없음</li>
              )}
            </ul>
          )}
        </FormField>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex gap-2">
          <button type="button" className={btnSecondary} onClick={onClose}>
            취소
          </button>
          <button type="button" className={btnPrimary} onClick={handleSave}>
            저장
          </button>
        </div>
      </div>
    </Modal>
  )
}
