import Modal, { btnPrimary, btnSecondary } from '../common/Modal'

type BudgetUnsetPromptModalProps = {
  open: boolean
  categoryName: string
  onLater: () => void | Promise<void>
  onSetBudget: () => void
}

export default function BudgetUnsetPromptModal({
  open,
  categoryName,
  onLater,
  onSetBudget,
}: BudgetUnsetPromptModalProps) {
  return (
    <Modal open={open} onClose={onLater} title="예산 미설정">
      <div className="flex flex-col gap-4">
        <p className="text-sm leading-relaxed text-text-secondary">
          <span className="font-semibold text-text-primary">{categoryName}</span> 카테고리의 예산이 아직
          설정되지 않았습니다. 지금 예산을 설정하시겠습니까?
        </p>
        <div className="flex gap-2">
          <button type="button" className={btnSecondary} onClick={onLater}>
            나중에
          </button>
          <button type="button" className={btnPrimary} onClick={onSetBudget}>
            예산 설정
          </button>
        </div>
      </div>
    </Modal>
  )
}
