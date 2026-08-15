import { useSearchParams } from 'react-router-dom'

import AdminCategories from '@/components/admin/AdminCategories'
import AdminOpportunities from '@/components/admin/AdminOpportunities'
import { AdminPageHeader } from '@/components/admin/adminUi'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function AdminOpportunitiesHubPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = searchParams.get('tab') === 'categories' ? 'categories' : 'opportunities'

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Opportunities"
        description="Manage live opportunities and sector categories."
      />

      <Tabs
        value={tab}
        onValueChange={(value) => {
          if (value === 'categories') setSearchParams({ tab: 'categories' })
          else setSearchParams({})
        }}
      >
        <TabsList className="mb-4 w-full justify-start">
          <TabsTrigger value="opportunities">
            Opportunities
          </TabsTrigger>
          <TabsTrigger value="categories">
            Categories
          </TabsTrigger>
        </TabsList>

        <TabsContent value="opportunities" className="mt-0">
          <AdminOpportunities embedded />
        </TabsContent>
        <TabsContent value="categories" className="mt-0">
          <AdminCategories embedded />
        </TabsContent>
      </Tabs>
    </div>
  )
}
