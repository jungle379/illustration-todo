export type SizeCounts = {
  large: number;
  medium: number;
  small: number;
};

export type Practice = {
  id: string;
  title: string;
  notes: string;
  entryType: "day" | "week";
  date: string | null;
  weekStart: string | null;
  done: boolean;
  dates: string[];
};

export type EventItem = {
  id: string;
  title: string;
  date: string;
  notes: string;
  largeNeeded: number;
  mediumNeeded: number;
  smallNeeded: number;
  produced: SizeCounts;
  remaining: SizeCounts;
};

export type IllustrationDay = {
  id: string;
  entryId: string;
  date: string;
} & SizeCounts;

export type IllustrationEntry = {
  id: string;
  eventId: string | null;
  entryType: "day" | "week";
  date: string | null;
  weekStart: string | null;
  createdAt: string;
  days: IllustrationDay[];
} & SizeCounts;

export type Summary = {
  from: string;
  to: string;
  illustrations: {
    totals: SizeCounts;
    byDate: Record<string, SizeCounts>;
  };
  practices: {
    dailyCount: number;
    weeklyDaySlots: number;
    dailyByDate: Record<string, number>;
    weeklyByDate: Record<string, number>;
  };
};
