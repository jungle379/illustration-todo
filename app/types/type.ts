// -----------------------------
// 型定義
// -----------------------------
export type UserId = "hiro" | "aki" | "akihiro" | "dinner";

export type Event = {
  id: string;
  user_id: UserId;
  title: string;
  memo: string;
  date: string;
  start_time: string;
  end_time: string;
  large_needed?: number;
  medium_needed?: number;
  small_needed?: number;
};

export type TileProps = {
  view: string;
  date: Date;
};

export type EventInput = {
  title: string;
  memo: string;
  date: string;
  user_id: UserId | string;
  start_time: string;
  end_time: string;
  large_needed?: number;
  medium_needed?: number;
  small_needed?: number;
};

export type BulkDeleteParams =
  | { mode: "range"; start: string; end: string }
  | { mode: "month"; month: string };

export type UpdateEventInput = {
  id: string;
  title: string;
  date: string;
  memo: string;
  user_id: UserId | string;
  start_time: string;
  end_time: string;
  large_needed?: number;
  medium_needed?: number;
  small_needed?: number;
};

// -----------------------------