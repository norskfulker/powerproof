"use client";

import { useMemo, type ReactNode } from "react";
import { useCurrency } from "@/hooks/useCurrency";
import {
  formatCategoryBadge,
  normalizeEaseLevel,
  OPPORTUNITY_STATUS_BADGE_MAP as BADGE_CONFIG,
} from "@/lib/opportunityLabels";
import { formatSetupBounds } from "@/lib/opportunityFormatters";
import { renderCategoryIcon } from "@/lib/categoryIcons";

type OpportunityLike = {
  category_slug?: string | null;
  monthly_profit_min?: number | null;
  monthly_profit_max?: number | null;
  setup_min?: number | null;
  setup_max?: number | null;
  payback_months_min?: number | null;
  payback_months_max?: number | null;
  margin_pct?: number | null;
  ease?: string | null;
  badge?: string | null;
};

const ICON_GRADIENT_BY_BADGE: Record<string, string> = {
  trending: "linear-gradient(135deg, hsl(var(--bg-surface)) 0%, hsl(var(--saffron-100)) 42%, hsl(var(--saffron-300) / 0.55) 100%)",
  hot: "linear-gradient(135deg, hsl(var(--bg-surface)) 0%, hsl(var(--red-50)) 42%, hsl(var(--red-200) / 0.55) 100%)",
  new: "linear-gradient(135deg, hsl(var(--bg-surface)) 0%, hsl(var(--blue-100)) 42%, hsl(var(--blue-300) / 0.55) 100%)",
  low: "linear-gradient(135deg, hsl(var(--bg-surface)) 0%, hsl(var(--primary-50)) 42%, hsl(var(--primary-200) / 0.55) 100%)",
  global: "linear-gradient(135deg, hsl(var(--bg-surface)) 0%, hsl(var(--bg-sunken)) 60%, hsl(var(--bg-surface-alt)) 100%)",
};

const INDUSTRY_COLOR_BY_CATEGORY: Record<string, { bg: string; border: string; ink: string; iconBg: string }> = {
  "daily-cashflow": { bg: "hsl(var(--blue-100) / 0.45)", border: "hsl(var(--blue-300) / 0.7)", ink: "hsl(var(--blue-700))", iconBg: "hsl(var(--blue-200) / 0.7)" },
  franchise: { bg: "hsl(var(--saffron-50) / 0.85)", border: "hsl(var(--saffron-300) / 0.8)", ink: "hsl(var(--saffron-700))", iconBg: "hsl(var(--saffron-100))" },
  "ev-energy": { bg: "hsl(var(--primary-50) / 0.85)", border: "hsl(var(--primary-200))", ink: "hsl(var(--primary-ink))", iconBg: "hsl(var(--primary-100))" },
  "food-agri": { bg: "hsl(var(--success-bg))", border: "hsl(var(--success) / 0.25)", ink: "hsl(var(--success))", iconBg: "hsl(var(--success) / 0.12)" },
  healthcare: { bg: "hsl(var(--red-50))", border: "hsl(var(--red-200) / 0.8)", ink: "hsl(var(--destructive))", iconBg: "hsl(var(--red-100) / 0.75)" },
  digital: { bg: "hsl(var(--blue-100) / 0.45)", border: "hsl(var(--blue-300) / 0.7)", ink: "hsl(var(--blue-700))", iconBg: "hsl(var(--blue-200) / 0.75)" },
  manufacturing: { bg: "hsl(var(--bg-sunken))", border: "hsl(var(--border-default))", ink: "hsl(var(--foreground))", iconBg: "hsl(var(--bg-surface-alt))" },
  retail: { bg: "hsl(var(--saffron-50) / 0.85)", border: "hsl(var(--saffron-300) / 0.75)", ink: "hsl(var(--saffron-700))", iconBg: "hsl(var(--saffron-100))" },
  textile: { bg: "hsl(var(--badge-global-bg) / 0.22)", border: "hsl(var(--badge-global) / 0.35)", ink: "hsl(var(--badge-global))", iconBg: "hsl(var(--badge-global-bg) / 0.35)" },
  services: { bg: "hsl(var(--bg-sunken))", border: "hsl(var(--border-default))", ink: "hsl(var(--foreground))", iconBg: "hsl(var(--bg-surface-alt))" },
  construction: { bg: "hsl(var(--warning-bg))", border: "hsl(var(--warning) / 0.25)", ink: "hsl(var(--warning))", iconBg: "hsl(var(--warning) / 0.14)" },
  "beauty-wellness": { bg: "hsl(var(--badge-hot-bg) / 0.24)", border: "hsl(var(--badge-hot) / 0.3)", ink: "hsl(var(--badge-hot))", iconBg: "hsl(var(--badge-hot-bg) / 0.4)" },
  education: { bg: "hsl(var(--blue-100) / 0.45)", border: "hsl(var(--blue-300) / 0.7)", ink: "hsl(var(--blue-700))", iconBg: "hsl(var(--blue-200) / 0.75)" },
  "fintech-finance": { bg: "hsl(var(--primary-50) / 0.9)", border: "hsl(var(--primary-200))", ink: "hsl(var(--primary-ink))", iconBg: "hsl(var(--primary-100))" },
  "logistics-mobility": { bg: "hsl(var(--badge-new-bg) / 0.3)", border: "hsl(var(--badge-new) / 0.35)", ink: "hsl(var(--badge-new))", iconBg: "hsl(var(--badge-new-bg) / 0.55)" },
};

function normalizeIndustryKey(value: unknown) {
  return String(value ?? "").trim().toLowerCase().replace(/_/g, "-");
}

export function useOpportunityMetrics(opportunity: OpportunityLike) {
  const { formatMoney } = useCurrency();

  return useMemo(() => {
    const profitStr = (() => {
      const mn = opportunity.monthly_profit_min;
      const mx = opportunity.monthly_profit_max;
      if (mn && mx && mn > 0 && mx > 0) return `${formatMoney(mn)}–${formatMoney(mx)} /mo`;
      return "—";
    })();

    const investStr = (() => {
      if (opportunity.setup_max && opportunity.setup_max > 0) return `Up to ${formatMoney(opportunity.setup_max)}`;
      const hint = formatSetupBounds(opportunity.setup_min, opportunity.setup_max, formatMoney);
      if (hint !== "—") return hint;
      return "—";
    })();

    const breakevenStr = (() => {
      const mn = opportunity.payback_months_min;
      const mx = opportunity.payback_months_max;
      if (!mn && !mx) return null;
      if (mn && mx && mn !== mx) return `${mn}–${mx} mo`;
      return `${mn ?? mx} mo`;
    })();
    const paybackAverageMonths = (() => {
      const mn = opportunity.payback_months_min;
      const mx = opportunity.payback_months_max;
      if (mn && mx) return (Number(mn) + Number(mx)) / 2;
      return Number(mn ?? mx ?? 0);
    })();

    const ease = normalizeEaseLevel(opportunity.ease);
    const marginPct = opportunity.margin_pct ?? 0;

    const easeColor =
      ease === "Easy"
        ? "hsl(var(--primary))"
        : ease === "Medium"
          ? "hsl(var(--saffron-600))"
          : ease === "Hard"
            ? "hsl(var(--destructive))"
            : "hsl(var(--foreground))";

    const marginColor =
      marginPct <= 20 ? "hsl(var(--destructive))" : marginPct <= 40 ? "hsl(var(--saffron-600))" : "hsl(var(--primary))";

    const badge = opportunity.badge ? (BADGE_CONFIG as any)[opportunity.badge] ?? null : null;
    const badgeLabel = formatCategoryBadge(opportunity.category_slug);

    const iconGradient =
      opportunity.badge && ICON_GRADIENT_BY_BADGE[opportunity.badge]
        ? ICON_GRADIENT_BY_BADGE[opportunity.badge]
        : "linear-gradient(135deg, hsl(var(--bg-surface)) 0%, hsl(var(--bg-sunken)) 100%)";

    const categoryIcon: ReactNode = renderCategoryIcon(opportunity.category_slug ?? "", null, "h-5 w-5");
    const industryLabel = formatCategoryBadge(opportunity.category_slug);
    const industryTone =
      INDUSTRY_COLOR_BY_CATEGORY[normalizeIndustryKey(opportunity.category_slug)] ?? {
        bg: "hsl(var(--bg-sunken))",
        border: "hsl(var(--border-default))",
        ink: "hsl(var(--foreground))",
        iconBg: "hsl(var(--bg-surface-alt))",
      };
    const recoveryTone =
      !breakevenStr || !Number.isFinite(paybackAverageMonths) || paybackAverageMonths <= 0
        ? null
        : paybackAverageMonths <= 6
          ? { ink: "hsl(var(--success))", bg: "hsl(var(--success-bg))" }
          : paybackAverageMonths <= 18
            ? { ink: "hsl(var(--warning))", bg: "hsl(var(--warning-bg))" }
            : { ink: "hsl(var(--destructive))", bg: "hsl(var(--destructive) / 0.1)" };

    return {
      profitStr,
      investStr,
      breakevenStr,
      ease,
      marginPct,
      easeColor,
      marginColor,
      badge,
      badgeLabel,
      iconGradient,
      showScores: true,
      showSetup: true,
      showEase: true,
      categoryIcon,
      industryLabel,
      industryTone,
      recoveryTone,
    };
  }, [
    opportunity.badge,
    opportunity.category_slug,
    opportunity.ease,
    opportunity.margin_pct,
    opportunity.monthly_profit_max,
    opportunity.monthly_profit_min,
    opportunity.payback_months_max,
    opportunity.payback_months_min,
    opportunity.setup_min,
    opportunity.setup_max,
    formatMoney,
  ]);
}
