import {
  Banknote,
  Handshake,
  Zap,
  Wheat,
  HeartPulse,
  Monitor,
  Factory,
  ShoppingBag,
  Shirt,
  Briefcase,
  Hammer,
  Sparkles,
  GraduationCap,
  CreditCard,
  Truck,
  Shapes,
  Building2,
  LayoutDashboard,
  Layers,
  MessageCircle,
  Folder,
  Shield,
  User,
  Cpu,
} from '@/lib/icons'
import type { ReactNode } from 'react'

/** Map DB slugs (often snake_case) to icon map keys (kebab-case). */
export function normalizeCategorySlugForIcon(slug: string) {
  return String(slug || '').trim().replace(/_/g, '-')
}

export function getCategoryIcon(slug: string, className = 'w-5 h-5') {
  const props = { className }
  const key = normalizeCategorySlugForIcon(slug)
  if (
    key.includes('food') ||
    key.startsWith('bakery') ||
    key.startsWith('dairy-') ||
    key.startsWith('beverage') ||
    key.startsWith('spice') ||
    key.startsWith('snack') ||
    key.startsWith('tea-') ||
    key.startsWith('coffee') ||
    key.startsWith('pickle') ||
    key.startsWith('chocolate') ||
    key.startsWith('nuts-') ||
    key.startsWith('honey') ||
    key.startsWith('sauce') ||
    key.startsWith('frozen-') ||
    key.startsWith('ice-cream') ||
    key.startsWith('spices-') ||
    key.startsWith('packaged-') ||
    key.startsWith('meal')
  ) {
    return <Wheat {...props} />
  }
  if (key.includes('tech') || key.includes('digital') || key.includes('software') || key.includes('data')) {
    return <Monitor {...props} />
  }
  if (key.includes('health') || key.includes('medical') || key.includes('wellness') || key.includes('pharma')) {
    return <HeartPulse {...props} />
  }
  if (key.includes('edu') || key.includes('training') || key.includes('coaching')) {
    return <GraduationCap {...props} />
  }
  if (key.includes('finance') || key.includes('fintech') || key.includes('insurance')) {
    return <CreditCard {...props} />
  }
  if (key.includes('logistic') || key.includes('transport') || key.includes('fleet') || key.includes('delivery')) {
    return <Truck {...props} />
  }
  if (key.includes('beauty') || key.includes('salon') || key.includes('cosmetic')) {
    return <Sparkles {...props} />
  }
  if (key.includes('textile') || key.includes('garment') || key.includes('apparel') || key.includes('fashion')) {
    return <Shirt {...props} />
  }
  if (key.includes('construct') || key.includes('infra') || key.includes('civil')) {
    return <Hammer {...props} />
  }
  if (key.includes('energy') || key.includes('solar') || key.includes('ev-') || key === 'ev-energy') {
    return <Zap {...props} />
  }
  const map: Record<string, ReactNode> = {
    'daily-cashflow': <Banknote {...props} />,
    franchise: <Handshake {...props} />,
    'ev-energy': <Zap {...props} />,
    'food-agri': <Wheat {...props} />,
    healthcare: <HeartPulse {...props} />,
    digital: <Monitor {...props} />,
    manufacturing: <Factory {...props} />,
    retail: <ShoppingBag {...props} />,
    textile: <Shirt {...props} />,
    services: <Briefcase {...props} />,
    construction: <Hammer {...props} />,
    'beauty-wellness': <Sparkles {...props} />,
    education: <GraduationCap {...props} />,
    'fintech-finance': <CreditCard {...props} />,
    'logistics-mobility': <Truck {...props} />,
  }
  return map[key] ?? <Shapes {...props} />
}

export function getNavIcon(key: string, className = 'w-5 h-5') {
  const props = { className }
  const map: Record<string, ReactNode> = {
    opportunities: <Building2 {...props} />,
    sectors: <Layers {...props} />,
    franchise: <Handshake {...props} />,
    chats: <MessageCircle {...props} />,
    projects: <Briefcase {...props} />,
    workforce: <Cpu {...props} />,
    admin: <Shield {...props} />,
    profile: <User {...props} />,
    command_center: <LayoutDashboard {...props} />,
  }
  return map[key] ?? <Shapes {...props} />
}
