import GlobalSearch from '../components/search/GlobalSearch'
import PageHeader from '../components/layout/PageHeader'
import { useSearchParams } from 'react-router-dom'

export default function SearchResultsPage() {
  const [searchParams] = useSearchParams()
  const initialQuery = searchParams.get('q') ?? ''

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="검색 결과" tab="home" hideSearch hideAdd backTo="/" />
      <GlobalSearch
        initialQuery={initialQuery}
        syncQueryToUrl
        placeholder="전체 검색"
      />
    </div>
  )
}
