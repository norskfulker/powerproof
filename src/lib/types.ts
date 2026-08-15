export type BadgeType = 'trending' | 'hot' | 'low' | 'new' | 'global';
export type EaseLevel = 'Easy' | 'Medium' | 'Hard';
export type ProfileTab = 'overview' | 'saved' | 'plan' | 'settings';

export interface Opportunity {
  id: string;
  slug?: string;
  title: string;
  sub: string;
  badge: BadgeType;
  badgeLabel: string;
  setup: string;
  margin: string;
  ease: string;
  score: number;
  scoreLabel?: string;
  locked: boolean;
  category?: string;
  budgetMin?: number;
  budgetMax?: number;
  country?: string;
  trendVelocity?: number;
  tagline?: string;
  monthlyRevEst?: string;
  logo_url: string | null;
  hero_image_url: string | null;
}

export interface Category {
  slug: string
  lucide: string
  name: string
  count: number
}

export interface User {
  name: string;
  email: string;
  avatar?: string;
  plan: string;
  joinedAt: string;
  savedOpportunities: string[];
  role?: 'user' | 'admin';
}

export interface FilterState {
  search: string;
  budgetTag: string | null;
  categoryTags: string[];
  setSearch: (s: string) => void;
  setBudgetTag: (t: string | null) => void;
  toggleCategoryTag: (t: string) => void;
  clearFilters: () => void;
}

// Admin types
export interface AdminUser {
  id: string;
  name: string;
  email: string;
  plan: string;
  role: 'user' | 'admin';
  savedOpportunities: string[];
  joinedAt: string;
  lastActive: string;
  viewCount: number;
}

export interface AdminOpportunity extends Opportunity {
  status: 'live' | 'draft' | 'archived';
  viewCount: number;
  saveCount: number;
  unlockClickCount: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  govtSchemes: string[];
  tags: string[];
}

export interface AnalyticsData {
  totalUsers: number;
  proUsers: number;
  totalPageviews: number;
  uniqueVisitors: number;
  conversionRate: number;
  revenue: number;
  userGrowth: { date: string; total: number; pro: number }[];
  topOpportunities: { id: string; title: string; views: number; saves: number; unlockClicks: number }[];
  categoryPerformance: { slug: string; name: string; icon: string; views: number; count: number }[];
}
