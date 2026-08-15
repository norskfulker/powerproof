import { create } from 'zustand';

interface AppState {
  search: string;
  budgetTag: string | null;
  categoryTags: string[];
  setSearch: (s: string) => void;
  setBudgetTag: (t: string | null) => void;
  toggleCategoryTag: (t: string) => void;
  clearFilters: () => void;

  /** War Room tab/route — drives platform-wide red theme. */
  warRoomTheme: boolean;
  setWarRoomTheme: (active: boolean) => void;

  /** ItchMyBack tab/route — drives platform-wide foreground accent theme. */
  itchTheme: boolean;
  setItchTheme: (active: boolean) => void;

  /** Compact in-app subscription plan picker. */
  subscriptionPricingDialogOpen: boolean;
  openSubscriptionPricingDialog: () => void;
  closeSubscriptionPricingDialog: () => void;

  /** Profile settings dialog (opened from the sidebar profile button). */
  profileDialogOpen: boolean;
  openProfileDialog: () => void;
  closeProfileDialog: () => void;
}

export const useFilterStore = create<AppState>((set) => ({
  search: '',
  budgetTag: null,
  categoryTags: [],
  setSearch: (search) => set({ search }),
  setBudgetTag: (budgetTag) => set({ budgetTag }),
  toggleCategoryTag: (tag) =>
    set((state) => ({
      categoryTags: state.categoryTags.includes(tag)
        ? state.categoryTags.filter((t) => t !== tag)
        : [...state.categoryTags, tag],
    })),
  clearFilters: () => set({ search: '', budgetTag: null, categoryTags: [] }),

  warRoomTheme: false,
  setWarRoomTheme: (warRoomTheme) => set({ warRoomTheme }),

  itchTheme: false,
  setItchTheme: (itchTheme) => set({ itchTheme }),

  subscriptionPricingDialogOpen: false,
  openSubscriptionPricingDialog: () => set({ subscriptionPricingDialogOpen: true }),
  closeSubscriptionPricingDialog: () => set({ subscriptionPricingDialogOpen: false }),

  profileDialogOpen: false,
  openProfileDialog: () => set({ profileDialogOpen: true }),
  closeProfileDialog: () => set({ profileDialogOpen: false }),
}));

export function openSubscriptionPricingDialog() {
  useFilterStore.getState().openSubscriptionPricingDialog()
}

export function openProfileDialog() {
  useFilterStore.getState().openProfileDialog()
}
