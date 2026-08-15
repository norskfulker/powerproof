export type BudgetFilter = 'all' | 'under_1l' | '1l_5l' | '5l_20l' | 'above_20l'
export type SortOption = 'trending' | 'best_match' | 'top_rated' | 'setup_asc' | 'margin_desc'

export interface DiscoverFilters {
  budget: BudgetFilter
  category: string
  sort: SortOption
  search: string
}
