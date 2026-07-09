import { formatCurrency } from '../../utils/format'
import type { SupplementProduct } from '../../types'
import { formatScheduleLabel, aggregateNutrients } from '../../supplements/nutrients'
import { Card } from '../common/Card'
import { btnSecondary } from '../common/Modal'

type ActiveSupplementsListProps = {
  products: SupplementProduct[]
  onEnd: (product: SupplementProduct) => void
}

export default function ActiveSupplementsList({ products, onEnd }: ActiveSupplementsListProps) {
  const nutrients = aggregateNutrients(products)

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-text-secondary">복용중 · 합산 성분</h2>

      {products.length === 0 ? (
        <Card>
          <p className="text-sm text-text-muted">복용 중인 영양제가 없습니다.</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-2">
          {products.map((p) => (
            <Card key={p.id} className="flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium">{p.name}</p>
                  {p.capacity && <p className="text-xs text-text-muted">{p.capacity}</p>}
                </div>
                <button
                  type="button"
                  className={`${btnSecondary} w-auto shrink-0 px-3 py-1.5 text-xs`}
                  onClick={() => onEnd(p)}
                >
                  복용 종료
                </button>
              </div>
              <p className="text-xs text-text-secondary">
                {p.schedule.map((s) => formatScheduleLabel(s)).join(' · ') || '복용법 미설정'}
              </p>
              <ul className="text-xs text-text-muted">
                {p.nutrients.map((n) => (
                  <li key={`${n.name}-${n.unit}`}>
                    {n.name} {n.amount}
                    {n.unit}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}

      {nutrients.length > 0 && (
        <Card className="flex flex-col gap-2">
          <p className="text-sm font-medium">합산 영양성분</p>
          <ul className="flex flex-col gap-1.5">
            {nutrients.map((n) => (
              <li key={`${n.name}-${n.unit}`} className="text-sm">
                <span className="font-medium">
                  {n.name} {n.amount}
                  {n.unit}
                </span>
                <span className="mt-0.5 block text-xs text-text-muted">
                  {n.sources.map((s) => `${s.productName} ${s.amount}${s.unit}`).join(', ')}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </section>
  )
}

type PurchaseHistorySectionProps = {
  products: SupplementProduct[]
}

export function PurchaseHistorySection({ products }: PurchaseHistorySectionProps) {
  const withHistory = products
    .map((p) => ({
      product: p,
      history: [...(p.purchaseHistory ?? [])].sort((a, b) => b.date.localeCompare(a.date)),
    }))
    .filter((row) => row.history.length > 0)

  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-text-secondary">구매 이력</h2>
      {withHistory.length === 0 ? (
        <Card>
          <p className="text-sm text-text-muted">구매 이력이 없습니다.</p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {withHistory.map(({ product, history }) => (
            <Card key={product.id} className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">{product.name}</p>
                <span className="text-xs text-text-muted">
                  {product.endedAt ? `종료 ${product.endedAt}` : '현재 복용중'}
                </span>
              </div>
              <ul className="flex flex-col gap-2 border-t border-border pt-2">
                {history.map((h) => (
                  <li key={h.id} className="text-sm">
                    <p className="tabular-nums text-text-secondary">
                      {h.date.slice(0, 7).replace('-', '.')}
                    </p>
                    <p className="font-medium">{formatCurrency(h.price)}</p>
                    {h.store && <p className="text-xs text-text-muted">{h.store}</p>}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}
    </section>
  )
}
