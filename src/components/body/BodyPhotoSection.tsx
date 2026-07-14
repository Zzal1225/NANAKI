import { useEffect, useRef, useState } from 'react'
import { Camera, Trash2 } from 'lucide-react'
import { Card } from '../common/Card'
import Modal from '../common/Modal'
import { useAsync } from '../../hooks/useAsync'
import {
  deleteBodyPhoto,
  generateId,
  getAllBodyPhotos,
  getBodyPhotoObjectUrl,
  saveBodyPhoto,
} from '../../db'
import { compressBodyPhoto } from '../../utils/imageCompress'
import { formatDate, todayISO } from '../../utils/dates'

export default function BodyPhotoSection({ month }: { month?: string }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const { data: photos, reload } = useAsync(() => getAllBodyPhotos(), [])

  const monthPhotos = month ? (photos ?? []).filter((p) => p.date.startsWith(month)) : (photos ?? [])

  useEffect(() => {
    if (!previewId) {
      setPreviewUrl(null)
      return
    }
    let url: string | null = null
    getBodyPhotoObjectUrl(previewId).then((u) => {
      url = u
      setPreviewUrl(u)
    })
    return () => {
      if (url) URL.revokeObjectURL(url)
    }
  }, [previewId])

  const handleFile = async (file: File) => {
    setUploading(true)
    try {
      const blob = await compressBodyPhoto(file)
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

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text-secondary">눈바디</h2>
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-1.5 rounded-lg bg-accent/20 px-3 py-2 text-xs font-medium text-accent disabled:opacity-50"
        >
          <Camera size={14} />
          {uploading ? '저장 중…' : '사진 추가'}
        </button>
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

      <Modal open={!!previewId} onClose={() => setPreviewId(null)} title="눈바디">
        {previewUrl && (
          <img src={previewUrl} alt="눈바디" className="max-h-[70dvh] w-full rounded-xl object-contain" />
        )}
      </Modal>
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
