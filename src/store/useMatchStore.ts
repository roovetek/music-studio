import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Match, Delivery, AIMetadata, ReasoningEntry, BoundingBox, SkeletonKeypoint, TrajectoryPoint } from '../lib/supabase';

interface MatchState {
  activeMatch: Match | null;
  deliveries: Delivery[];
  aiMetadata: AIMetadata[];
  reasoningFeed: ReasoningEntry[];
  currentTimestamp: number;
  isAnalyzing: boolean;
  activeBoundingBoxes: BoundingBox[];
  activeSkeletonKeypoints: SkeletonKeypoint[];
  activeTrajectoryPoints: TrajectoryPoint[];
  isOnline: boolean;
  pendingSyncCount: number;

  setActiveMatch: (match: Match | null) => void;
  addDelivery: (delivery: Delivery) => void;
  setDeliveries: (deliveries: Delivery[]) => void;
  addAIMetadata: (meta: AIMetadata) => void;
  appendReasoning: (entry: ReasoningEntry) => void;
  clearReasoning: () => void;
  setCurrentTimestamp: (t: number) => void;
  setIsAnalyzing: (v: boolean) => void;
  setActiveOverlayData: (
    boxes: BoundingBox[],
    keypoints: SkeletonKeypoint[],
    trajectory: TrajectoryPoint[]
  ) => void;
  clearOverlayData: () => void;
  setIsOnline: (v: boolean) => void;
  incrementPendingSync: () => void;
  decrementPendingSync: () => void;
  getTotalRuns: () => number;
  getTotalWickets: () => number;
  getOverSummary: () => { over: number; runs: number; wickets: number }[];
}

export const useMatchStore = create<MatchState>()(
  persist(
    (set, get) => ({
      activeMatch: null,
      deliveries: [],
      aiMetadata: [],
      reasoningFeed: [],
      currentTimestamp: 0,
      isAnalyzing: false,
      activeBoundingBoxes: [],
      activeSkeletonKeypoints: [],
      activeTrajectoryPoints: [],
      isOnline: navigator.onLine,
      pendingSyncCount: 0,

      setActiveMatch: (match) => set({ activeMatch: match }),

      addDelivery: (delivery) =>
        set((state) => ({ deliveries: [...state.deliveries, delivery] })),

      setDeliveries: (deliveries) => set({ deliveries }),

      addAIMetadata: (meta) =>
        set((state) => ({ aiMetadata: [...state.aiMetadata, meta] })),

      appendReasoning: (entry) =>
        set((state) => ({
          reasoningFeed: [entry, ...state.reasoningFeed].slice(0, 50),
        })),

      clearReasoning: () => set({ reasoningFeed: [] }),

      setCurrentTimestamp: (t) => set({ currentTimestamp: t }),

      setIsAnalyzing: (v) => set({ isAnalyzing: v }),

      setActiveOverlayData: (boxes, keypoints, trajectory) =>
        set({
          activeBoundingBoxes: boxes,
          activeSkeletonKeypoints: keypoints,
          activeTrajectoryPoints: trajectory,
        }),

      clearOverlayData: () =>
        set({
          activeBoundingBoxes: [],
          activeSkeletonKeypoints: [],
          activeTrajectoryPoints: [],
        }),

      setIsOnline: (v) => set({ isOnline: v }),

      incrementPendingSync: () =>
        set((state) => ({ pendingSyncCount: state.pendingSyncCount + 1 })),

      decrementPendingSync: () =>
        set((state) => ({
          pendingSyncCount: Math.max(0, state.pendingSyncCount - 1),
        })),

      getTotalRuns: () => {
        const { deliveries } = get();
        return deliveries.reduce((sum, d) => sum + d.runs + d.extras, 0);
      },

      getTotalWickets: () => {
        const { deliveries } = get();
        return deliveries.filter((d) => d.wicket).length;
      },

      getOverSummary: () => {
        const { deliveries } = get();
        const overMap = new Map<number, { runs: number; wickets: number }>();
        for (const d of deliveries) {
          const existing = overMap.get(d.over_number) ?? { runs: 0, wickets: 0 };
          overMap.set(d.over_number, {
            runs: existing.runs + d.runs + d.extras,
            wickets: existing.wickets + (d.wicket ? 1 : 0),
          });
        }
        return Array.from(overMap.entries())
          .sort(([a], [b]) => a - b)
          .map(([over, stats]) => ({ over, ...stats }));
      },
    }),
    {
      name: 'cricket-match-store',
      partialize: (state) => ({
        activeMatch: state.activeMatch,
        deliveries: state.deliveries,
        aiMetadata: state.aiMetadata,
        pendingSyncCount: state.pendingSyncCount,
      }),
    }
  )
);
