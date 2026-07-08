import { useState } from 'react'
import { Card } from '../common/Card'
import { useAsync } from '../../hooks/useAsync'
import { getAppSettings, saveAppSettings } from '../../db'
import { BODY_METRIC_LABELS, DEFAULT_BODY_INTERVALS } from '../../body/measurementReminders'
import type { BodyMetricKey } from '../../types'

export default function MeasurementIntervalSettings() {
  const { data: settings, reload } = useAsync(() => getAppSettings(), [])
  const [saving, setSaving] = useState(false)

  if (!settings) return null

  const intervals = { ...DEFAULT_BODY_INTERVALS, ...settings.bodyMeasurementIntervals }

  const updateInterval = async (metric: BodyMetricKey, days: number) => {
    setSaving(true)
    try {
      await saveAppSettings({
        ...settings,
        bodyMeasurementIntervals: {
          ...settings.bodyMeasurementIntervals,
          [metric]: days,
        },
      })
      reload()
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-text-secondary">측정 주기</h2>
      <Card className="flex flex-col gap-3">
        {(Object.keys(BODY_METRIC_LABELS) as BodyMetricKey[]).map((metric) => (
          <label key={metric} className="flex items-center justify-between gap-3 text-sm">
            <span className="text-text-secondary">{BODY_METRIC_LABELS[metric]}</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={365}
                disabled={saving}
                className="w-16 rounded-lg border border-border bg-surface px-2 py-1 text-right text-sm"
                value={intervals[metric]}
                onChange={(e) => {
                  const n = parseInt(e.target.value, 10)
                  if (n >= 1) void updateInterval(metric, n)
                }}
              />
              <span className="text-xs text-text-muted">일</span>
            </div>
          </label>
        ))}
      </Card>
    </section>
  )
}
