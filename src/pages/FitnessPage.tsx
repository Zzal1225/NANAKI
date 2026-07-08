import ExerciseSection from '../components/fitness/ExerciseSection'
import PageHeader from '../components/layout/PageHeader'
import { useSections } from '../context/SectionContext'

export default function FitnessPage() {
  const { isSectionEnabled } = useSections()

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="운동" subtitle="운동 기록" tab="fitness" />

      {isSectionEnabled('fitness-exercise') && <ExerciseSection />}
    </div>
  )
}
