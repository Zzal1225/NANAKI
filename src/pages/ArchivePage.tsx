import { useEffect, useState } from 'react'
import { Trash2, Star } from 'lucide-react'
import { Card } from '../components/common/Card'
import SearchBar from '../components/common/SearchBar'
import Modal, { FormField, inputClass, selectClass, btnPrimary } from '../components/common/Modal'
import { useAsync } from '../hooks/useAsync'
import {
  generateId,
  getAllArchiveItems,
  searchArchiveItems,
  saveArchiveItem,
  deleteArchiveItem,
} from '../db'
import { formatDate, todayISO, ARCHIVE_TYPE_LABELS } from '../utils/dates'
import type { ArchiveItem, ArchiveType, UserOwnedInput } from '../types'
import PageHeader from '../components/layout/PageHeader'
import MonthNav from '../components/layout/MonthNav'
import GlobalSearch from '../components/search/GlobalSearch'
import { useSections } from '../context/SectionContext'
import { useMonthScope } from '../hooks/useMonthScope'
import { getRecordsDataStartMonth } from '../utils/dataStartMonth'

export default function ArchivePage() {
  const { isSectionEnabled } = useSections()
  const { month, setMonth, minMonth } = useMonthScope({
    getStartMonth: getRecordsDataStartMonth,
  })
  const [query, setQuery] = useState('')
  const [filterType, setFilterType] = useState<ArchiveType | 'all'>('all')
  const [showModal, setShowModal] = useState(false)
  const [items, setItems] = useState<ArchiveItem[]>([])

  const { data: allItems, reload } = useAsync(() => getAllArchiveItems(), [])

  useEffect(() => {
    const load = async () => {
      const useLocalSearch = !isSectionEnabled('records-search') && query.trim()
      let result = useLocalSearch
        ? await searchArchiveItems(query)
        : allItems ?? []
      result = result.filter((i: ArchiveItem) => i.date.startsWith(month))
      if (filterType !== 'all') {
        result = result.filter((i: ArchiveItem) => i.type === filterType)
      }
      setItems(result)
    }
    load()
  }, [query, filterType, allItems, isSectionEnabled, month])

  const types: (ArchiveType | 'all')[] = ['all', 'product', 'place', 'treatment', 'other']

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="기록"
        tab="records"
        onAdd={() => setShowModal(true)}
      >
        <MonthNav month={month} onChange={setMonth} minMonth={minMonth} />
      </PageHeader>

      {isSectionEnabled('records-search') && (
        <GlobalSearch placeholder="아카이브 검색 — '그 소스 먹어봤는데...'" />
      )}

      {isSectionEnabled('records-list') && (
      <>
      {!isSectionEnabled('records-search') && (
      <SearchBar
        value={query}
        onChange={setQuery}
        placeholder="이 소스 먹어봤는데 어땠더라...?"
      />
      )}

      <div className="flex gap-2 overflow-x-auto pb-1">
        {types.map((t) => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              filterType === t
                ? 'bg-accent text-surface'
                : 'border border-border text-text-secondary hover:border-accent/50'
            }`}
          >
            {t === 'all' ? '전체' : ARCHIVE_TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <Card>
          <p className="text-sm text-text-muted">
            {query ? '검색 결과가 없습니다.' : '아직 기록이 없습니다. 경험한 것들을 기록해보세요.'}
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <Card key={item.id}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="shrink-0 rounded-md bg-archive/20 px-1.5 py-0.5 text-[10px] font-medium text-archive">
                      {ARCHIVE_TYPE_LABELS[item.type]}
                    </span>
                    <h3 className="truncate text-sm font-semibold">{item.title}</h3>
                  </div>
                  <p className="mt-1 text-xs text-text-muted">
                    {formatDate(item.date, 'yyyy.M.d')}
                    {item.location && ` · ${item.location}`}
                  </p>
                  {item.rating && (
                    <div className="mt-1 flex">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          size={12}
                          className={i < item.rating! ? 'fill-warning text-warning' : 'text-border'}
                        />
                      ))}
                    </div>
                  )}
                  {item.memo && <p className="mt-1.5 text-sm text-text-secondary">{item.memo}</p>}
                  {item.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {item.tags.map((tag) => (
                        <span key={tag} className="rounded-full bg-surface px-2 py-0.5 text-[10px] text-text-muted">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={async () => { await deleteArchiveItem(item.id); reload() }}
                  className="shrink-0 text-text-muted hover:text-danger"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ArchiveModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onSave={async (item) => {
          await saveArchiveItem(item)
          reload()
          setShowModal(false)
        }}
      />
      </>
      )}
    </div>
  )
}

function ArchiveModal({
  open,
  onClose,
  onSave,
}: {
  open: boolean
  onClose: () => void
  onSave: (item: UserOwnedInput<ArchiveItem>) => Promise<void>
}) {
  const [type, setType] = useState<ArchiveType>('product')
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(todayISO())
  const [rating, setRating] = useState(0)
  const [tags, setTags] = useState('')
  const [memo, setMemo] = useState('')
  const [location, setLocation] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    await onSave({
      id: generateId(),
      type,
      title: title.trim(),
      date,
      rating: rating || undefined,
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      memo: memo || undefined,
      location: location || undefined,
    })
    setTitle('')
    setRating(0)
    setTags('')
    setMemo('')
    setLocation('')
  }

  return (
    <Modal open={open} onClose={onClose} title="아카이브 추가">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField label="유형">
          <select className={selectClass} value={type} onChange={(e) => setType(e.target.value as ArchiveType)}>
            {Object.entries(ARCHIVE_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </FormField>
        <FormField label="제목">
          <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: OO마트 저지방 우유" required />
        </FormField>
        <FormField label="날짜">
          <input type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} required />
        </FormField>
        <FormField label="평점">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(n === rating ? 0 : n)}
                className="p-1"
              >
                <Star
                  size={24}
                  className={n <= rating ? 'fill-warning text-warning' : 'text-border'}
                />
              </button>
            ))}
          </div>
        </FormField>
        <FormField label="장소">
          <input className={inputClass} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="예: 이마트 역삼점" />
        </FormField>
        <FormField label="태그 (쉼표 구분)">
          <input className={inputClass} value={tags} onChange={(e) => setTags(e.target.value)} placeholder="예: 우유, 저지방, 단백질" />
        </FormField>
        <FormField label="메모">
          <textarea
            className={`${inputClass} min-h-[80px] resize-none`}
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="맛, 느낌, 재구매 의사 등..."
          />
        </FormField>
        <button type="submit" className={btnPrimary}>저장</button>
      </form>
    </Modal>
  )
}
