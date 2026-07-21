import { useEffect, useMemo, useRef, useState } from 'react'
import { Camera, Columns2, Trash2 } from 'lucide-react'
import { ReactCompareSlider, ReactCompareSliderImage } from 'react-compare-slider'
import { Card } from '../common/Card'
import Modal, { btnPrimary, btnSecondary } from '../common/Modal'
import { IntervalDaysField } from './IntervalDaysField'
import { useAsync } from '../../hooks/useAsync'
import {
  deleteBodyPhoto,
  generateId,
  getAllBodyPhotos,
  getBodyPhotoObjectUrl,
  saveBodyPhoto,
  getAppSettings,
  saveAppSettings,
} from '../../db'
import { compressBodyPhoto } from '../../utils/imageCompress'
import { formatDate, todayISO } from '../../utils/dates'
import { resolveBodySectionIntervals } from '../../body/sectionConfig'
import {
  findLastPhotoDate,
  getNextDueDate,
  isMeasurementDue,
} from '../../body/sectionReminders'

const FIRST_PHOTO_HINT =
  '다음 사진부터는 첫 번째 사진과 같은 각도로 촬영이 권장되니 비교하기 쉬운 각도로 촬영해주세요.'

export default function BodyPhotoSection({ month }: { month?: string }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [savingInterval, setSavingInterval] = useState(false)
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [compareOpen, setCompareOpen] = useState(false)
  const [overlay, setOverlay] = useState<{
    file: File
    previewUrl: string
    prevUrl: string
  } | null>(null)
  const [hintOpen, setHintOpen] = useState(false)

  const { data: photos, reload } = useAsync(() => getAllBodyPhotos(), [])
  const { data: settings, reload: reloadSettings } = useAsync(() => getAppSettings(), [])

  const allPhotos = photos ?? []
  const monthPhotos = month ? allPhotos.filter((p) => p.date.startsWith(month)) : allPhotos
  const intervals = resolveBodySectionIntervals(settings?.bodySectionIntervals)
  const today = todayISO()
  const lastDate = findLastPhotoDate(allPhotos)
  const due = isMeasurementDue(lastDate, intervals.photo, today)
  const nextDue = getNextDueDate(lastDate, intervals.photo)

  const latestTwo = useMemo(() => allPhotos.slice(0, 2), [allPhotos])

  useEffect(() => {
    return () => {
      if (overlay?.previewUrl) URL.revokeObjectURL(overlay.previewUrl)
      if (overlay?.prevUrl) URL.revokeObjectURL(overlay.prevUrl)
    }
  }, [overlay])

  const updateInterval = async (days: number) => {
    if (!settings) return
    setSavingInterval(true)
    try {
      await saveAppSettings({
        ...settings,
        bodySectionIntervals: {
          ...settings.bodySectionIntervals,
          photo: days,
        },
      })
      reloadSettings()
    } finally {
      setSavingInterval(false)
    }
  }

  const startCapture = () => {
    if (allPhotos.length === 0) {
      setHintOpen(true)
      return
    }
    inputRef.current?.click()
  }

  const confirmFirstAndPick = () => {
    setHintOpen(false)
    inputRef.current?.click()
  }

  const handleFile = async (file: File) => {
    if (allPhotos.length === 0) {
      await saveCompressed(file)
      return
    }
    const prev = allPhotos[0]
    const prevUrl = await getBodyPhotoObjectUrl(prev.id)
    if (!prevUrl) {
      await saveCompressed(file)
      return
    }
    const previewUrl = URL.createObjectURL(file)
    setOverlay({ file, previewUrl, prevUrl })
  }

  const saveCompressed = async (file: File) => {
    setUploading(true)
    try {
      const blob = await compressBodyPhoto(file, 1200, 0.8)
      await saveBodyPhoto({
        id: generateId(),
        date: todayISO(),
        mimeType: 'image/jpeg',
        blob,
      })
      reload()
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const confirmOverlaySave = async () => {
    if (!overlay) return
    const file = overlay.file
    setOverlay(null)
    await saveCompressed(file)
  }

  const cancelOverlay = () => {
    if (overlay?.previewUrl) URL.revokeObjectURL(overlay.previewUrl)
    if (overlay?.prevUrl) URL.revokeObjectURL(overlay.prevUrl)
    setOverlay(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-text-primary">눈바디</h3>
        <div className="flex items-center gap-2">
          <IntervalDaysField
            days={intervals.photo}
            disabled={savingInterval}
            onChange={(d) => void updateInterval(d)}
          />
          {latestTwo.length >= 2 && (
            <button
              type="button"
              onClick={() => setCompareOpen(true)}
              className="rounded-lg border border-border p-2 text-text-secondary hover:border-accent/50 hover:text-accent"
              title="비교"
              aria-label="사진 비교"
            >
              <Columns2 size={16} />
            </button>
          )}
          <button
            type="button"
            disabled={uploading}
            onClick={startCapture}
            className="flex items-center gap-1.5 rounded-lg bg-accent/20 px-3 py-2 text-xs font-medium text-accent disabled:opacity-50"
          >
            <Camera size={14} />
            {uploading ? '저장 중…' : '사진 추가'}
          </button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void handleFile(file)
          }}
        />
      </div>

      {due && (
        <p className="rounded-lg border border-accent/30 bg-accent/5 px-3 py-2 text-xs text-accent">
          촬영 예정
          {lastDate ? ` · 마지막 ${formatDate(lastDate)}` : ' · 사진 없음'}
          {nextDue && nextDue > today ? ` · 다음 ${formatDate(nextDue)}` : ''}
        </p>
      )}

      {!monthPhotos.length ? (
        <Card>
          <p className="text-sm text-text-muted">
            {month ? '이 달의 눈바디가 없습니다.' : '눈바디 사진이 없습니다.'}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {monthPhotos.map((photo) => (
            <BodyPhotoThumb
              key={photo.id}
              photoId={photo.id}
              date={photo.date}
              onOpen={() => setPreviewId(photo.id)}
              onDelete={async () => {
                await deleteBodyPhoto(photo.id)
                reload()
              }}
            />
          ))}
        </div>
      )}

      <Modal open={hintOpen} onClose={() => setHintOpen(false)} title="첫 눈바디 촬영">
        <p className="text-sm leading-relaxed text-text-secondary">{FIRST_PHOTO_HINT}</p>
        <button type="button" className={`${btnPrimary} mt-4`} onClick={confirmFirstAndPick}>
          확인 후 촬영
        </button>
      </Modal>

      <Modal open={!!overlay} onClose={cancelOverlay} title="각도 맞추기">
        {overlay && (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-text-muted">
              이전 사진을 반투명으로 겹쳤습니다. 비슷한 구도인지 확인한 뒤 저장하세요.
            </p>
            <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-surface-overlay">
              <img
                src={overlay.previewUrl}
                alt="이번 사진"
                className="absolute inset-0 h-full w-full object-cover"
              />
              <img
                src={overlay.prevUrl}
                alt="이전 사진"
                className="absolute inset-0 h-full w-full object-cover opacity-30"
              />
              <div className="absolute bottom-2 left-2 rounded bg-black/50 px-2 py-0.5 text-[10px] text-white">
                이번 70% · 이전 30%
              </div>
            </div>
            <div className="flex gap-2">
              <button type="button" className={`${btnSecondary} flex-1`} onClick={cancelOverlay}>
                다시 선택
              </button>
              <button
                type="button"
                className={`${btnPrimary} flex-1`}
                disabled={uploading}
                onClick={() => void confirmOverlaySave()}
              >
                저장
              </button>
            </div>
          </div>
        )}
      </Modal>

      <PhotoPreviewModal photoId={previewId} onClose={() => setPreviewId(null)} />

      <CompareModal
        open={compareOpen}
        leftId={latestTwo[1]?.id}
        rightId={latestTwo[0]?.id}
        leftLabel={latestTwo[1] ? formatDate(latestTwo[1].date, 'M/d') : ''}
        rightLabel={latestTwo[0] ? formatDate(latestTwo[0].date, 'M/d') : ''}
        onClose={() => setCompareOpen(false)}
      />
    </section>
  )
}

function BodyPhotoThumb({
  photoId,
  date,
  onOpen,
  onDelete,
}: {
  photoId: string
  date: string
  onOpen: () => void
  onDelete: () => Promise<void>
}) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    let objectUrl: string | null = null
    getBodyPhotoObjectUrl(photoId).then((u) => {
      objectUrl = u
      setUrl(u)
    })
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [photoId])

  return (
    <div className="group relative aspect-[3/4] overflow-hidden rounded-xl border border-border bg-surface-overlay">
      <button type="button" className="h-full w-full" onClick={onOpen}>
        {url ? (
          <img src={url} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-text-muted">…</div>
        )}
      </button>
      <p className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-1.5 text-[10px] text-white">
        {formatDate(date, 'M/d')}
      </p>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          void onDelete()
        }}
        className="absolute right-1 top-1 rounded-md bg-black/50 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
      >
        <Trash2 size={12} />
      </button>
    </div>
  )
}

function PhotoPreviewModal({
  photoId,
  onClose,
}: {
  photoId: string | null
  onClose: () => void
}) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!photoId) {
      setUrl(null)
      return
    }
    let objectUrl: string | null = null
    getBodyPhotoObjectUrl(photoId).then((u) => {
      objectUrl = u
      setUrl(u)
    })
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [photoId])

  return (
    <Modal open={!!photoId} onClose={onClose} title="눈바디">
      {url && (
        <img src={url} alt="눈바디" className="max-h-[70dvh] w-full rounded-xl object-contain" />
      )}
    </Modal>
  )
}

function CompareModal({
  open,
  leftId,
  rightId,
  leftLabel,
  rightLabel,
  onClose,
}: {
  open: boolean
  leftId?: string
  rightId?: string
  leftLabel: string
  rightLabel: string
  onClose: () => void
}) {
  const [leftUrl, setLeftUrl] = useState<string | null>(null)
  const [rightUrl, setRightUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !leftId || !rightId) {
      setLeftUrl(null)
      setRightUrl(null)
      return
    }
    let l: string | null = null
    let r: string | null = null
    void Promise.all([getBodyPhotoObjectUrl(leftId), getBodyPhotoObjectUrl(rightId)]).then(
      ([lu, ru]) => {
        l = lu
        r = ru
        setLeftUrl(lu)
        setRightUrl(ru)
      },
    )
    return () => {
      if (l) URL.revokeObjectURL(l)
      if (r) URL.revokeObjectURL(r)
    }
  }, [open, leftId, rightId])

  return (
    <Modal open={open} onClose={onClose} title="눈바디 비교">
      {leftUrl && rightUrl ? (
        <div className="flex flex-col gap-2">
          <div className="flex justify-between text-[11px] text-text-muted">
            <span>이전 {leftLabel}</span>
            <span>최근 {rightLabel}</span>
          </div>
          <div className="overflow-hidden rounded-xl">
            <ReactCompareSlider
              itemOne={<ReactCompareSliderImage src={leftUrl} alt="이전" />}
              itemTwo={<ReactCompareSliderImage src={rightUrl} alt="최근" />}
              className="aspect-[3/4] w-full"
            />
          </div>
        </div>
      ) : (
        <p className="text-sm text-text-muted">비교할 사진을 불러오는 중…</p>
      )}
    </Modal>
  )
}
