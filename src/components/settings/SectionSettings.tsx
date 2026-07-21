import { Blocks } from 'lucide-react'
import { useRef, useState } from 'react'
import Modal, { btnPrimary } from '../common/Modal'
import { useSections } from '../../context/SectionContext'
import { ALL_SECTIONS, ALL_TABS } from '../../config/sections'
import type { TabId } from '../../types'
import { wipeAllLocalData } from '../../db/wipeAllData'
import { exportAllDataCsv, importAllDataCsv } from '../../export/csvExport'
import { exportJsonBackup, importJsonBackup } from '../../export/jsonBackup'

interface SectionSettingsProps {
  tab?: TabId
  /** 헤더 한 줄용 작은 버튼 */
  compact?: boolean
}

export default function SectionSettings({ tab, compact = false }: SectionSettingsProps) {
  const isHome = !tab
  const [open, setOpen] = useState(false)
  const [confirmWipe, setConfirmWipe] = useState(false)
  const [confirmRestore, setConfirmRestore] = useState<'json' | 'csv' | null>(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [wiping, setWiping] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const jsonInputRef = useRef<HTMLInputElement>(null)
  const csvInputRef = useRef<HTMLInputElement>(null)
  const { isTabEnabled, isSectionEnabled, toggleTab, toggleSection } = useSections()

  const sections = tab ? ALL_SECTIONS.filter((s) => s.tab === tab) : []
  const groups = [...new Set(sections.map((s) => s.group ?? s.label))]

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          compact
            ? 'inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-text-secondary transition-colors hover:border-accent/50 hover:text-text-primary'
            : 'rounded-xl border border-border p-2.5 text-text-secondary hover:border-accent/50'
        }
        title={isHome ? '앱 구성' : '섹션 설정'}
        aria-label={isHome ? '앱 구성' : '섹션 설정'}
      >
        <Blocks size={compact ? 15 : 18} />
      </button>

      <Modal
        open={open}
        onClose={() => {
          setOpen(false)
          setConfirmWipe(false)
          setConfirmRestore(null)
          setPendingFile(null)
          setError(null)
        }}
        title={isHome ? '앱 구성' : '섹션 설정'}
      >
        {isHome ? (
          <>
            <p className="mb-4 text-xs text-text-muted">사용할 탭만 켜 두세요.</p>
            <div className="mb-2">
              <h3 className="mb-2 text-sm font-semibold text-text-secondary">탭</h3>
              <div className="flex flex-col gap-2">
                {ALL_TABS.filter((t) => !t.alwaysOn).map((t) => (
                  <ToggleRow
                    key={t.id}
                    label={t.label}
                    enabled={isTabEnabled(t.id)}
                    onToggle={() => toggleTab(t.id)}
                  />
                ))}
              </div>
            </div>

            <div className="mt-6 border-t border-border pt-4">
              {!confirmWipe ? (
                <button
                  type="button"
                  onClick={() => setConfirmWipe(true)}
                  className="w-full rounded-xl border border-danger/40 px-4 py-3 text-sm text-danger hover:bg-danger/10"
                >
                  데이터 초기화
                </button>
              ) : (
                <div className="flex flex-col gap-3 rounded-xl border border-danger/40 bg-danger/5 p-4">
                  <p className="text-sm text-text-primary">
                    가계부·건강·습관 등 <strong>모든 기록</strong>이 삭제됩니다. 되돌릴 수 없습니다.
                  </p>
                  <p className="text-xs text-text-muted">
                    몇 초 걸릴 수 있습니다. 완료될 때까지 새로고침하지 마세요.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmWipe(false)}
                      className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm text-text-secondary hover:bg-surface-overlay"
                    >
                      취소
                    </button>
                    <button
                      type="button"
                      disabled={wiping}
                      onClick={async () => {
                        setWiping(true)
                        await wipeAllLocalData()
                      }}
                      className={`${btnPrimary} flex-1 !bg-danger hover:!bg-danger/90`}
                    >
                      {wiping ? '삭제 중…' : '삭제'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <p className="mb-4 text-xs text-text-muted">
              이 탭에서 쓸 섹션만 켜 두세요. 백업은 앱 전체 데이터 기준입니다.
            </p>

            <div>
              <h3 className="mb-2 text-sm font-semibold text-text-secondary">섹션</h3>
              {groups.map((group) => (
                <div key={group} className="mb-4">
                  {sections.some((s) => s.group) && (
                    <p className="mb-1.5 text-xs text-text-muted">{group}</p>
                  )}
                  <div className="flex flex-col gap-2">
                    {sections
                      .filter((s) => (s.group ?? s.label) === group)
                      .map((s) => (
                        <ToggleRow
                          key={s.id}
                          label={s.label}
                          enabled={isSectionEnabled(s.id)}
                          onToggle={() => toggleSection(s.id)}
                        />
                      ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 border-t border-border pt-4">
              <h3 className="mb-2 text-sm font-semibold text-text-secondary">백업 · 가져오기</h3>
              {error && (
                <p className="mb-3 rounded-xl border border-danger/40 bg-danger/5 px-3 py-2 text-xs text-danger">
                  {error}
                </p>
              )}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true)
                    setError(null)
                    try {
                      await exportJsonBackup()
                    } catch (e) {
                      setError(e instanceof Error ? e.message : 'JSON 백업에 실패했습니다.')
                    } finally {
                      setBusy(false)
                    }
                  }}
                  className="rounded-xl border border-border px-3 py-3 text-sm text-text-secondary hover:bg-surface-overlay"
                >
                  {busy ? '처리 중…' : 'JSON 백업'}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => jsonInputRef.current?.click()}
                  className="rounded-xl border border-border px-3 py-3 text-sm text-text-secondary hover:bg-surface-overlay"
                >
                  JSON 복원
                </button>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true)
                    setError(null)
                    try {
                      await exportAllDataCsv()
                    } catch (e) {
                      setError(e instanceof Error ? e.message : 'CSV 내보내기에 실패했습니다.')
                    } finally {
                      setBusy(false)
                    }
                  }}
                  className="rounded-xl border border-border px-3 py-3 text-sm text-text-secondary hover:bg-surface-overlay"
                >
                  {busy ? '처리 중…' : 'CSV 내보내기'}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => csvInputRef.current?.click()}
                  className="rounded-xl border border-border px-3 py-3 text-sm text-text-secondary hover:bg-surface-overlay"
                >
                  CSV 가져오기
                </button>
              </div>

              <input
                ref={jsonInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  e.target.value = ''
                  if (!file) return
                  setPendingFile(file)
                  setConfirmRestore('json')
                  setError(null)
                }}
              />
              <input
                ref={csvInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  e.target.value = ''
                  if (!file) return
                  setPendingFile(file)
                  setConfirmRestore('csv')
                  setError(null)
                }}
              />

              {confirmRestore && pendingFile && (
                <div className="mt-3 flex flex-col gap-3 rounded-xl border border-warning/40 bg-warning/5 p-4">
                  <p className="text-sm text-text-primary">
                    <strong>{pendingFile.name}</strong> 파일로 기존 데이터를 모두 교체합니다.
                  </p>
                  <p className="text-xs text-text-muted">
                    복원 전 JSON 백업을 권장합니다. 완료 후 페이지가 새로고침됩니다.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmRestore(null)
                        setPendingFile(null)
                      }}
                      className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm text-text-secondary hover:bg-surface-overlay"
                    >
                      취소
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={async () => {
                        if (!pendingFile) return
                        setBusy(true)
                        setError(null)
                        try {
                          if (confirmRestore === 'json') {
                            await importJsonBackup(pendingFile)
                          } else {
                            await importAllDataCsv(pendingFile)
                          }
                        } catch (err) {
                          setError(err instanceof Error ? err.message : '가져오기에 실패했습니다.')
                          setConfirmRestore(null)
                          setPendingFile(null)
                        } finally {
                          setBusy(false)
                        }
                      }}
                      className={`${btnPrimary} flex-1`}
                    >
                      {busy ? '복원 중…' : '교체하기'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </Modal>
    </>
  )
}

function ToggleRow({
  label,
  enabled,
  onToggle,
}: {
  label: string
  enabled: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm transition-colors ${
        enabled ? 'border-accent/50 bg-accent/10 text-text-primary' : 'border-border text-text-muted'
      }`}
    >
      <span>{label}</span>
      <span
        className={`h-5 w-9 rounded-full p-0.5 transition-colors ${enabled ? 'bg-accent' : 'bg-border'}`}
      >
        <span
          className={`block h-4 w-4 rounded-full bg-white transition-transform ${enabled ? 'translate-x-4' : ''}`}
        />
      </span>
    </button>
  )
}
