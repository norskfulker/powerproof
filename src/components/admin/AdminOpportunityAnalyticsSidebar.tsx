import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card } from '@/components/ui'
import { BarChart3, TrendingUp, Eye, Heart, Zap, AlertCircle } from '@/lib/icons'

interface AnalyticsData {
  total_views: number
  total_saves: number
  total_clicks: number
  views_last_30d: number
  saves_last_30d: number
  engagement_ratio: number
  score: number
  trend_velocity: number
}

interface RelatedData {
  category?: { name: string; opportunity_count: number }
  related_opportunities?: Array<{ id: string; slug: string; title: string; score: number }>
  doc_templates?: Array<{ id: string; template_name: string }>
  promo_panels?: Array<{ id: string; title: string; route?: string | null }>
}

export function AdminOpportunityAnalyticsSidebar({ opportunityId, slug }: { opportunityId: string; slug: string }) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [relatedData, setRelatedData] = useState<RelatedData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        // Fetch analytics
        const { data: analyticsData } = await supabase
          .from('admin_opportunity_analytics')
          .select('*')
          .eq('id', opportunityId)
          .single()

        if (analyticsData) {
          setAnalytics(analyticsData as any)
        }

        // Fetch doc templates
        const { data: docsData } = await supabase
          .from('admin_doc_template_links')
          .select('id, template_name')
          .eq('opportunity_id', opportunityId)
          .limit(5)

        const promoRoutes = [`/opportunities/${slug}`, `/opportunity/${slug}`]
        const { data: promoData } = await supabase
          .from('promotional_panels')
          .select('id, title, route')
          .in('route', promoRoutes)
          .limit(5)

        setRelatedData({
          doc_templates: (docsData as any) || [],
          promo_panels: (promoData as any) || [],
        })
      } catch (error) {
        console.error('Failed to fetch sidebar data:', error)
      } finally {
        setLoading(false)
      }
    }

    if (opportunityId) fetchData()
  }, [opportunityId, slug])

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <div className="h-20 bg-gray-200 rounded-lg animate-pulse" />
        <div className="h-20 bg-gray-200 rounded-lg animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
      {/* Analytics Cards */}
      <div className="space-y-3">
        <h3 className="font-semibold text-sm flex items-center gap-2 text-gray-700">
          <BarChart3 className="w-4 h-4" />
          Analytics
        </h3>

        <div className="grid grid-cols-2 gap-2">
          <Card className="p-3 bg-background">
            <div className="text-xs text-gray-500">Views (30d)</div>
            <div className="text-lg font-bold text-blue-600">{analytics?.views_last_30d || 0}</div>
          </Card>
          <Card className="p-3 bg-background">
            <div className="text-xs text-gray-500">Saves (30d)</div>
            <div className="text-lg font-bold text-success">{analytics?.saves_last_30d || 0}</div>
          </Card>
          <Card className="p-3 bg-background">
            <div className="text-xs text-gray-500">Total Views</div>
            <div className="text-lg font-bold text-gray-700">{analytics?.total_views || 0}</div>
          </Card>
          <Card className="p-3 bg-background">
            <div className="text-xs text-gray-500">Engagement</div>
            <div className="text-lg font-bold text-purple-600">{analytics?.engagement_ratio?.toFixed(2) || 0}</div>
          </Card>
        </div>
      </div>

      {/* Score & Trend */}
      <div className="space-y-2">
        <div className="flex items-center justify-between p-3 bg-background rounded-lg border border-yellow-100">
          <div className="text-xs font-semibold text-gray-600">Viability Score</div>
          <div className="text-xl font-bold text-yellow-600">{analytics?.score || 'N/A'}</div>
        </div>
        <div className="flex items-center justify-between p-3 bg-background rounded-lg border border-red-100">
          <div className="flex items-center gap-2 text-xs font-semibold text-gray-600">
            <TrendingUp className="w-4 h-4" />
            Trend Velocity
          </div>
          <div className="text-xl font-bold text-destructive">{analytics?.trend_velocity || '0'}</div>
        </div>
      </div>

      {/* Doc Templates */}
      {relatedData?.doc_templates && relatedData.doc_templates.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-semibold text-xs text-gray-700">Related Docs</h4>
          <div className="space-y-1">
            {relatedData.doc_templates.slice(0, 3).map((d) => (
              <div key={d.id} className="text-xs p-2 bg-background rounded border border-gray-100 truncate">
                {d.template_name}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Promo Panels */}
      {relatedData?.promo_panels && relatedData.promo_panels.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-semibold text-xs text-gray-700">Promo Panels</h4>
          <div className="space-y-1">
            {relatedData.promo_panels.slice(0, 3).map((p) => (
              <div key={p.id} className="text-xs p-2 bg-background rounded border border-gray-100 truncate">
                {p.title}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quality Indicators */}
      <div className="space-y-2">
        <h4 className="font-semibold text-xs text-gray-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          Quality
        </h4>
        <div className="space-y-1 text-xs">
          <div className="flex items-center justify-between p-2 bg-background rounded border border-gray-100">
            <span className="text-gray-600">Headers Complete</span>
            <span className="text-success font-semibold">✓</span>
          </div>
          <div className="flex items-center justify-between p-2 bg-background rounded border border-gray-100">
            <span className="text-gray-600">Financials</span>
            <span className="text-success font-semibold">✓</span>
          </div>
          <div className="flex items-center justify-between p-2 bg-background rounded border border-saffron-100">
            <span className="text-gray-600">Content Depth</span>
            <span className="text-warning font-semibold">◔</span>
          </div>
        </div>
      </div>
    </div>
  )
}
