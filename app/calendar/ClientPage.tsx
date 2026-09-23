"use client";

import { useMemo, useState } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import {
  Modal,
  Badge,
  Button,
  ActionIcon,
  Checkbox,
  Divider,
  TextInput,
  Textarea,
  Select,
  NumberInput,
  Stack,
  Group,
  Card,
  Title,
  Box,
  SegmentedControl,
  Center,
  Loader,
  Text,
} from "@mantine/core";
import { Toaster, toast as sonnerToast } from "sonner";
import z from "zod";
import { useEvents } from "@/hooks/useEvent";
import { useAddEvent } from "@/hooks/useAddEvent";
import { useDeleteEvent } from "@/hooks/useDeleteEvent";
import { useUpdateEvent } from "@/hooks/useUpdateEvent";
import { useBulkDeleteEvents } from "@/hooks/useBulkDeleteEvent";
import { useDailyTodoMutations } from "@/hooks/useDailyTodos";
import { useIllustrationLogMutations } from "@/hooks/useIllustrationLogs";
import { useCalendarData } from "@/hooks/useCalendarData";
import { TileProps, Event, UserId } from "../types/type";

// -----------------------------
// Zodスキーマ
// -----------------------------
const eventSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, "タイトルは必須です")
      .max(50, "タイトルは50文字以内です"),

    memo: z.string().max(200, "メモは200文字以内です").optional(),

    start_time: z.string().trim(),

    end_time: z.string().trim(),

    user_id: z.enum(["hiro", "aki", "akihiro", "dinner"]),
  })
  .superRefine((data, ctx) => {
    if (data.user_id === "dinner") return;

    if (!/^\d{2}:\d{2}$/.test(data.start_time)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "時間形式が不正です",
        path: ["start_time"],
      });
    }

    if (!/^\d{2}:\d{2}$/.test(data.end_time)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "時間形式が不正です",
        path: ["end_time"],
      });
    }

    if (data.start_time && data.end_time && data.start_time >= data.end_time) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "終了時間は開始時間より後にしてください",
        path: ["end_time"],
      });
    }
  });
// -----------------------------

// カレンダーページ
export default function ClientPage() {
  const eventFeatureEnabled = false;
  // -----------------------------
  // State
  const [date, setDate] = useState<Date>(new Date());

  const [title, setTitle] = useState("");
  const [memo, setMemo] = useState("");
  const [eventUser, setEventUser] = useState<UserId>("aki");

  const [editDate, setEditDate] = useState("");

  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("18:00");
  const [needed, setNeeded] = useState({ large: 0, medium: 0, small: 0 });
  const [todoTitle, setTodoTitle] = useState("");
  const [logCounts, setLogCounts] = useState({ large: 0, medium: 0, small: 0 });

  const [opened, setOpened] = useState(false);
  const [deleteOpened, setDeleteOpened] = useState(false);
  const [bulkOpened, setBulkOpened] = useState(false);

  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  const handleUserChange = (value: UserId | null) => {
    if (!value) return;

    setEventUser(value);

    if (value === "dinner") {
      setStartTime("18:00");
      setEndTime("20:00");
      return;
    }

    setStartTime("09:00");
    setEndTime("18:00");
  };

  const [bulkMode, setBulkMode] = useState<"range" | "month">("range");
  const [bulkStart, setBulkStart] = useState("");
  const [bulkEnd, setBulkEnd] = useState("");
  const [bulkMonth, setBulkMonth] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  // -----------------------------

  const formattedDate = format(date, "yyyy-MM-dd");

  // -----------------------------
  // APIフック
  const { data: allEvents = [] } = useEvents({ enabled: eventFeatureEnabled });
  const { data: calendarData, isLoading: calendarLoading } = useCalendarData();
  const todoMutations = useDailyTodoMutations(formattedDate);
  const logMutations = useIllustrationLogMutations(formattedDate);

  const events = allEvents.filter((e) => e.date === formattedDate);
  const todos = (calendarData?.todos ?? []).filter((todo) => todo.date === formattedDate);
  const logs = (calendarData?.logs ?? []).filter((log) => log.date === formattedDate);
  const addEvent = useAddEvent();
  const deleteEvent = useDeleteEvent();
  const updateEvent = useUpdateEvent();
  const bulkDelete = useBulkDeleteEvents();
  // -----------------------------

  const formattedTime = (t: string) => t.slice(0, 5);

  // 🔴 日付マーク
  const eventDates = useMemo(
    // dinnerの予定はマークしない
    () => new Set(allEvents.filter((e) => e.user_id !== "dinner").map((e: Event) => e.date)),
    [allEvents],
  );

  // -----------------------------
  // カレンダーのタイルにマークを表示
  const tileContent = ({ date, view }: TileProps) => {
    if (view !== "month") return null;
    const d = format(date, "yyyy-MM-dd");
    if (eventDates.has(d)) {
      return <Box style={{ textAlign: "center" }}>●</Box>;
    }
    return null;
  };
  // -----------------------------

  // バリデーション関数
  const validate = () => {
    const result = eventSchema.safeParse({
      title,
      memo,
      start_time: eventUser === "dinner" ? "18:00" : startTime,
      end_time: eventUser === "dinner" ? "20:00" : endTime,
      user_id: eventUser,
    });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((err) => {
        const key = err.path[0] as string;
        if (key) fieldErrors[key] = err.message;
      });
      setErrors(fieldErrors);
      return false;
    }

    setErrors({});
    return true;
  };

  // ➕ 追加
  const handleAdd = async () => {
    if (!validate()) return;

    if (!formattedDate) {
      sonnerToast.error("日付が設定誤りです。");
      return;
    }
    await addEvent.mutateAsync({
      title,
      memo,
      date: formattedDate,
      user_id: eventUser,
      start_time: eventUser === "dinner" ? "18:00" : startTime,
      end_time: eventUser === "dinner" ? "20:00" : endTime,
      large_needed: needed.large,
      medium_needed: needed.medium,
      small_needed: needed.small,
    });

    setTitle("");
    setMemo("");
    setStartTime("09:00");
    setEndTime("18:00");
    setEventUser("aki");
    setNeeded({ large: 0, medium: 0, small: 0 });
    sonnerToast.success("予定を追加しました。");
    // スマホでのビューポート変化を回避するため、scrollTo呼び出しを削除
  };

  // ✏️ モーダル開く
  const openModal = (e: Event) => {
    setSelectedEvent(e);
    setTitle(e.title);
    setMemo(e.memo);
    setStartTime(e.user_id === "dinner" ? "18:00" : formattedTime(e.start_time));
    setEndTime(e.user_id === "dinner" ? "20:00" : formattedTime(e.end_time));
    setEventUser(e.user_id);
    setNeeded({
      large: e.large_needed ?? 0,
      medium: e.medium_needed ?? 0,
      small: e.small_needed ?? 0,
    });
    setEditDate(e.date);
    setOpened(true);
  };
  const closeModal = () => {
    setTitle("");
    setMemo("");
    setEventUser("aki");
    setStartTime("09:00");
    setEndTime("18:00");
    setOpened(false);
  };

  // ❌ 削除モーダル
  const openDeleteModal = (e: Event) => {
    setSelectedEvent(e);
    setDeleteOpened(true);
  };

  // ✏️ 更新
  const handleUpdate = async () => {
    if (!selectedEvent) return;
    if (!validate()) return;

    await updateEvent.mutateAsync({
      id: selectedEvent.id,
      title,
      date: editDate,
      memo,
      user_id: eventUser,
      start_time: eventUser === "dinner" ? "18:00" : formattedTime(startTime),
      end_time: eventUser === "dinner" ? "20:00" : formattedTime(endTime),
      large_needed: needed.large,
      medium_needed: needed.medium,
      small_needed: needed.small,
    });

    setOpened(false);
    setTitle("");
    setMemo("");
    setEventUser("aki");
    setStartTime("09:00");
    setEndTime("18:00");
    setNeeded({ large: 0, medium: 0, small: 0 });
    sonnerToast.success("予定を更新しました。");
    // スマホでのビューポート変化を回避するため、scrollTo呼び出しを削除
  };

  // 🗑 削除
  const handleDelete = async () => {
    if (!selectedEvent) return;

    try {
      await deleteEvent.mutateAsync(selectedEvent.id);

      setDeleteOpened(false);
      setOpened(false);
      setTitle("");
      setMemo("");
      setEventUser("aki");
      setStartTime("09:00");
      setEndTime("18:00");
      sonnerToast.success("予定を削除しました。");
      // スマホでのビューポート変化を回避するため、scrollTo呼び出しを削除
    } catch {
      sonnerToast.error("削除失敗");
      // スマホでのビューポート変化を回避するため、scrollTo呼び出しを削除
    }
  };

  // ⏰ ソート
  const sortedEvents = [...events].sort((a, b) =>
    a.start_time.localeCompare(b.start_time),
  );
  const illustrationTotals = logs.reduce(
    (totals, log) => ({
      large: totals.large + log.large,
      medium: totals.medium + log.medium,
      small: totals.small + log.small,
    }),
    { large: 0, medium: 0, small: 0 },
  );

  // -----------------------------
  // 一括削除
  // -----------------------------
  const handleBulkDelete = async () => {
    try {
      if (bulkMode === "range") {
        if (!bulkStart || !bulkEnd) {
          sonnerToast.error("期間を選択してください");
          return;
        }
        if (bulkStart > bulkEnd) {
          sonnerToast.error("開始日は終了日より前にしてください");
          return;
        }

        await bulkDelete.mutateAsync({
          mode: "range",
          start: bulkStart,
          end: bulkEnd,
        });
      }

      if (bulkMode === "month") {
        if (!bulkMonth) {
          sonnerToast.error("月を選択してください");
          return;
        }

        await bulkDelete.mutateAsync({
          mode: "month",
          month: bulkMonth,
        });
      }

      setBulkOpened(false);
      sonnerToast.success("削除しました");
      // スマホでのビューポート変化を回避するため、scrollTo呼び出しを削除
    } catch {
      sonnerToast.error("削除失敗");
      // スマホでのビューポート変化を回避するため、scrollTo呼び出しを削除
    }
  };

  // 件数
  const bulkCount = useMemo(() => {
    if (bulkMode === "range") {
      return allEvents.filter((e) => e.date >= bulkStart && e.date <= bulkEnd)
        .length;
    }

    if (bulkMode === "month") {
      return allEvents.filter((e) => e.date.startsWith(bulkMonth)).length;
    }
    return 0;
  }, [allEvents, bulkStart, bulkEnd, bulkMonth, bulkMode]);

  // -----------------------------

  if (calendarLoading) {
    return (
      <Center style={{ minHeight: "100vh" }}>
        <Loader />
      </Center>
    );
  }

  // 【スマホモーダル問題対策】
  // 原因: Mantineモーダルが開く際、bodyに`overflow: hidden`が付与される。
  //      スマートフォンではビューポート高さが変わる（URLバー隠れ/表示）ため、
  //      モーダル開閉時にbodyの高さが縮み、親Stackも一緒に縮む。
  // 対策: Stack に`overflow: hidden; position: relative;` を付与し、
  //      ビューポート変化の影響を最小化。window.scrollTo呼び出しも削除。
  return (
    <Stack p="md" maw={560} mx="auto" style={{ overflow: "hidden", position: "relative" }}>
      <Group align="end">
        <Title order={2}>共有カレンダー</Title>
      </Group>

      <Toaster position="top-right" />

      {/* カレンダー */}
      <Center>
        <Calendar
          className="app-react-calendar"
          value={date}
          onChange={(d) => setDate(d as Date)}
          tileContent={tileContent}
        />
      </Center>

      <Card shadow="sm" p="md">
        <Stack gap="sm">
          <Title order={4}>{format(date, "M月d日", { locale: ja })} の練習TODO</Title>
          <Group align="flex-end">
            <TextInput
              style={{ flex: 1 }}
              placeholder="今日の練習を入力"
              value={todoTitle}
              onChange={(e) => setTodoTitle(e.currentTarget.value)}
            />
            <Button
              disabled={!todoTitle.trim() || todoMutations.add.isPending}
              loading={todoMutations.add.isPending}
              onClick={async () => {
                try {
                  await todoMutations.add.mutateAsync(todoTitle.trim());
                  setTodoTitle("");
                  sonnerToast.success("TODOを追加しました");
                } catch {
                  sonnerToast.error("TODOの追加に失敗しました");
                }
              }}
            >
              追加
            </Button>
          </Group>
          {calendarLoading ? <Loader size="sm" /> : todos.length === 0 ? (
            <Text size="sm" c="dimmed">TODOはありません</Text>
          ) : todos.map((todo) => (
            <Group key={todo.id} justify="space-between" wrap="nowrap">
              <Checkbox
                checked={todo.completed}
                onChange={(e) =>
                  todoMutations.toggle.mutate({ id: todo.id, completed: e.currentTarget.checked })
                }
                label={<Text td={todo.completed ? "line-through" : undefined} c={todo.completed ? "dimmed" : undefined}>{todo.title}</Text>}
              />
              <ActionIcon
                color="red"
                variant="subtle"
                aria-label="TODOを削除"
                onClick={() => todoMutations.remove.mutate(todo.id)}
              >
                ×
              </ActionIcon>
            </Group>
          ))}
        </Stack>
      </Card>

      <Card shadow="sm" p="md">
        <Stack gap="sm">
          <Title order={4}>イラスト実績（{format(date, "M月d日", { locale: ja })}）</Title>
          <Group grow>
            {(["large", "medium", "small"] as const).map((size) => (
              <NumberInput
                key={size}
                label={size === "large" ? "大" : size === "medium" ? "中" : "小"}
                min={0}
                value={logCounts[size]}
                onChange={(value) => setLogCounts((current) => ({ ...current, [size]: Number(value) || 0 }))}
              />
            ))}
          </Group>
          <Button
            loading={logMutations.add.isPending}
            onClick={async () => {
              try {
                await logMutations.add.mutateAsync(logCounts);
                setLogCounts({ large: 0, medium: 0, small: 0 });
                sonnerToast.success("実績を保存しました");
              } catch {
                sonnerToast.error("実績の保存に失敗しました");
              }
            }}
          >
            実績を保存
          </Button>
          <Text size="sm" fw={600}>
            当日合計: 大 {illustrationTotals.large} / 中 {illustrationTotals.medium} / 小 {illustrationTotals.small}
          </Text>
          {calendarLoading ? <Loader size="sm" /> : logs.map((log) => (
            <Group key={log.id} justify="space-between">
              <Text>大 {log.large} / 中 {log.medium} / 小 {log.small}</Text>
              <ActionIcon color="red" variant="subtle" aria-label="実績を削除" onClick={() => logMutations.remove.mutate(log.id)}>×</ActionIcon>
            </Group>
          ))}
        </Stack>
      </Card>

      {/* 追加フォーム */}
      <Card
        shadow="sm"
        p="md"
        style={{ display: eventFeatureEnabled ? undefined : "none" }}
      >
        <Stack>
          <TextInput
            placeholder="タイトル"
            value={title}
            error={errors.title}
            onChange={(e) => setTitle(e.currentTarget.value)}
          />

          <Textarea
            placeholder="メモ(詳細や場所など)"
            value={memo}
            error={errors.memo}
            onChange={(e) => setMemo(e.currentTarget.value)}
          />

          <Select
            label="ユーザー"
            value={eventUser}
            onChange={(v) => handleUserChange(v as UserId | null)}
            data={[
              { value: "aki", label: "あきくま（ピンク）" },
              { value: "hiro", label: "ひろくま（青）" },
              { value: "akihiro", label: "あきくま・ひろくま（オレンジ）" },
              { value: "dinner", label: "ディナー" },
            ]}
          />

          <Group grow>
            <TextInput
              type="time"
              value={startTime}
              error={errors.start_time}
              disabled={eventUser === "dinner"}
              onChange={(e) => setStartTime(e.currentTarget.value)}
            />
            <TextInput
              type="time"
              value={endTime}
              error={errors.end_time}
              disabled={eventUser === "dinner"}
              onChange={(e) => setEndTime(e.currentTarget.value)}
            />
          </Group>

          <Text fw={600}>イベントのノルマ</Text>
          <Group grow>
            {(["large", "medium", "small"] as const).map((size) => (
              <NumberInput
                key={size}
                label={size === "large" ? "大" : size === "medium" ? "中" : "小"}
                min={0}
                value={needed[size]}
                onChange={(value) => setNeeded((current) => ({ ...current, [size]: Number(value) || 0 }))}
              />
            ))}
          </Group>

          <Button onClick={handleAdd}>追加</Button>
        </Stack>
      </Card>

      {/* 一覧 */}
      {sortedEvents.length > 0 && (
        <Stack style={{ display: eventFeatureEnabled ? undefined : "none" }}>
          <Group justify="space-between" align="center">
            <Box fw={700}>{format(date, "yyyy年M月d日(E)", { locale: ja })}</Box>
            {sortedEvents.filter((e) => e.user_id === "dinner").map((e: Event) => (
            <Card
              key={e.id}
              shadow="xs"
              p="xs"
              radius="md"
              onClick={() => openModal(e)}
              style={{
                cursor: "pointer",
                borderLeft: "4px solid #12b886",
                backgroundColor: "#f8fff8",
              }}
            >
              <Group justify="space-between" align="center">
                <Box fw={600} size="sm">{e.title || ""}</Box>
              </Group>
            </Card>
          ))}
          </Group>

          {sortedEvents
            .filter((e) => e.user_id !== "dinner")
            .map((e: Event) => (
              <Card
                key={e.id}
                shadow="xs"
                p="md"
                onClick={() => openModal(e)}
                style={{
                  cursor: "pointer",
                  borderLeft: `5px solid ${
                    e.user_id === "hiro"
                      ? "#228be6"
                      : e.user_id === "aki"
                        ? "#fa52bf"
                        : "#fab005"
                  }`,
                }}
              >
                <Group justify="space-between" align="flex-start">
                  <Stack gap={4} style={{ flex: 1 }}>
                    <Title order={5}>{e.title || "（タイトルなし）"}</Title>
                  </Stack>

                  <Badge
                    color={
                      e.user_id === "hiro"
                        ? "blue"
                        : e.user_id === "aki"
                          ? "pink"
                          : "yellow"
                    }
                  >
                    {e.user_id === "hiro"
                      ? "ひろくま"
                      : e.user_id === "aki"
                        ? "あきくま"
                        : "あきくま・ひろくま"}
                  </Badge>
                </Group>

                <Box
                  style={{
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {e.memo}
                </Box>

                <Box style={{ fontSize: 12, opacity: 0.7 }}>
                  {e.start_time} - {e.end_time}
                </Box>
                <Text size="xs" c="dimmed">
                  ノルマ: 大 {e.large_needed ?? 0} / 中 {e.medium_needed ?? 0} / 小 {e.small_needed ?? 0}
                </Text>
              </Card>
            ))}
        </Stack>
      )}

      {/* 一括削除ボタン */}
      <Button
        color="red"
        style={{ display: eventFeatureEnabled ? undefined : "none" }}
        onClick={() => setBulkOpened(true)}
      >
        一括削除
      </Button>

      {/* 編集モーダル */}
      <Modal opened={eventFeatureEnabled && opened} onClose={() => closeModal()} title="予定編集">
        <Stack>
          <TextInput
            type="date"
            value={editDate}
            onChange={(e) => setEditDate(e.currentTarget.value)}
          />
          <TextInput
            value={title}
            error={errors.title}
            onChange={(e) => setTitle(e.currentTarget.value)}
          />

          <Textarea
            value={memo}
            error={errors.memo}
            onChange={(e) => setMemo(e.currentTarget.value)}
          />

          <Select
            value={eventUser}
            onChange={(v) => handleUserChange(v as UserId | null)}
            data={[
              { value: "aki", label: "あきくま" },
              { value: "hiro", label: "ひろくま" },
              { value: "akihiro", label: "あきくま・ひろくま" },
              { value: "dinner", label: "ディナー" },
            ]}
          />

          <Group grow>
            <TextInput
              type="time"
              error={errors.start_time}
              value={startTime}
              disabled={eventUser === "dinner"}
              onChange={(e) => setStartTime(e.currentTarget.value)}
            />
            <TextInput
              type="time"
              value={endTime}
              error={errors.end_time}
              disabled={eventUser === "dinner"}
              onChange={(e) => setEndTime(e.currentTarget.value)}
            />
          </Group>

          <Text fw={600}>イベントのノルマ</Text>
          <Group grow>
            {(["large", "medium", "small"] as const).map((size) => (
              <NumberInput
                key={size}
                label={size === "large" ? "大" : size === "medium" ? "中" : "小"}
                min={0}
                value={needed[size]}
                onChange={(value) => setNeeded((current) => ({ ...current, [size]: Number(value) || 0 }))}
              />
            ))}
          </Group>

          <Group justify="space-between">
            <Button color="red" onClick={() => openDeleteModal(selectedEvent!)}>
              削除
            </Button>
            <Button onClick={handleUpdate}>保存</Button>
          </Group>
        </Stack>
      </Modal>

      {/* 削除確認モーダル */}
      <Modal
        opened={eventFeatureEnabled && deleteOpened}
        onClose={() => setDeleteOpened(false)}
        title="削除確認"
      >
        <Stack>
          <Box>この予定を削除しますか？</Box>

          <Group justify="space-between">
            <Button variant="default" onClick={() => setDeleteOpened(false)}>
              キャンセル
            </Button>

            <Button
              color="red"
              onClick={handleDelete}
              loading={deleteEvent.isPending}
              disabled={deleteEvent.isPending}
            >
              削除する
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* 一括削除モーダル */}
      <Modal
        opened={eventFeatureEnabled && bulkOpened}
        onClose={() => setBulkOpened(false)}
        title="一括削除"
      >
        <Stack>
          <SegmentedControl
            value={bulkMode}
            onChange={(v) => setBulkMode(v as "range" | "month")}
            data={[
              { label: "期間指定", value: "range" },
              { label: "月単位", value: "month" },
            ]}
          />

          {bulkMode === "range" && (
            <>
              <TextInput
                type="date"
                label="開始"
                value={bulkStart}
                onChange={(e) => setBulkStart(e.currentTarget.value)}
              />
              <TextInput
                type="date"
                label="終了"
                value={bulkEnd}
                onChange={(e) => setBulkEnd(e.currentTarget.value)}
              />
            </>
          )}

          {bulkMode === "month" && (
            <TextInput
              type="month"
              label="対象月"
              value={bulkMonth}
              onChange={(e) => setBulkMonth(e.currentTarget.value)}
            />
          )}

          <Box>削除対象: {bulkCount}件</Box>

          <Button color="red" onClick={handleBulkDelete}>
            削除する
          </Button>
        </Stack>
      </Modal>
    </Stack>
  );
}
