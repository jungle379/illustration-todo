import {
  ActionIcon,
  AppShell,
  Badge,
  Center,
  Button,
  Card,
  Checkbox,
  Group,
  Loader,
  Modal,
  NumberInput,
  Paper,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Table,
  Text,
  TextInput,
  Textarea,
  Title,
  UnstyledButton,
} from "@mantine/core";
import { Calendar } from "@mantine/dates";
import { useDisclosure } from "@mantine/hooks";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  IconCalendarEvent,
  IconCheck,
  IconPlus,
  IconRefresh,
  IconTrash,
} from "@tabler/icons-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { api } from "./api";
import {
  dayjs,
  iso,
  monthEndOf,
  monthStartOf,
  weekDates,
  weekEndOf,
  weekStartOf,
} from "./dates";
import type {
  EventItem,
  IllustrationEntry,
  Practice,
  SizeCounts,
  Summary,
} from "./types";

const emptyCounts: SizeCounts = { large: 0, medium: 0, small: 0 };

async function showApiToast<T>(request: Promise<T>, successMessage: string) {
  const toastId = toast.loading("処理中...");
  try {
    const result = await request;
    toast.success(successMessage, { id: toastId });
    return result;
  } catch (error) {
    toast.error(
      error instanceof Error ? error.message : "処理に失敗しました",
      { id: toastId },
    );
    throw error;
  }
}

function evenSplit(total: number, parts: number) {
  const base = Math.floor(total / parts);
  const extra = total % parts;
  return Array.from({ length: parts }, (_, i) => base + (i < extra ? 1 : 0));
}

function addCounts(a: SizeCounts, b: SizeCounts): SizeCounts {
  return {
    large: a.large + b.large,
    medium: a.medium + b.medium,
    small: a.small + b.small,
  };
}

function monthWeekStarts(from: string, to: string) {
  const starts: string[] = [];
  let current = weekStartOf(from);
  while (current <= to) {
    starts.push(current);
    current = iso(dayjs(current).add(7, "day"));
  }
  return starts;
}

function combineSummaries(
  summaries: Summary[],
  from: string,
  to: string,
): Summary {
  const byDate: Record<string, SizeCounts> = {};
  const dailyByDate: Record<string, number> = {};
  const weeklyByDate: Record<string, number> = {};

  for (const summary of summaries) {
    for (const [date, counts] of Object.entries(summary.illustrations.byDate)) {
      if (date >= from && date <= to) {
        byDate[date] = addCounts(byDate[date] ?? emptyCounts, counts);
      }
    }
    for (const [date, count] of Object.entries(summary.practices.dailyByDate)) {
      if (date >= from && date <= to) dailyByDate[date] = count;
    }
    for (const [date, count] of Object.entries(summary.practices.weeklyByDate)) {
      if (date >= from && date <= to) weeklyByDate[date] = count;
    }
  }

  return {
    from,
    to,
    illustrations: {
      totals: Object.values(byDate).reduce(addCounts, emptyCounts),
      byDate,
    },
    practices: {
      dailyCount: Object.values(dailyByDate).reduce((sum, count) => sum + count, 0),
      weeklyDaySlots: Object.values(weeklyByDate).reduce(
        (sum, count) => sum + count,
        0,
      ),
      dailyByDate,
      weeklyByDate,
    },
  };
}

function SizePills({
  counts,
  prefix = "",
}: {
  counts: SizeCounts;
  prefix?: string;
}) {
  return (
    <Group gap={6}>
      <Badge variant="light" color="red">
        {prefix}大 {counts.large}
      </Badge>
      <Badge variant="light" color="orange">
        {prefix}中 {counts.medium}
      </Badge>
      <Badge variant="light" color="yellow">
        {prefix}小 {counts.small}
      </Badge>
    </Group>
  );
}

export function App() {
  const [cursor, setCursor] = useState(iso(new Date()));
  const [selected, setSelected] = useState(iso(new Date()));
  const [mode, setMode] = useState<"day" | "week">("day");
  const [events, setEvents] = useState<EventItem[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [eventOpened, eventModal] = useDisclosure(false);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);

  const monthFrom = monthStartOf(cursor);
  const monthTo = monthEndOf(cursor);
  const weekFrom = weekStartOf(selected);
  const weekTo = weekEndOf(selected);
  const queryClient = useQueryClient();
  const summaryStarts = Array.from(
    new Set([...monthWeekStarts(monthFrom, monthTo), weekFrom]),
  );
  const practicesQuery = useQuery({
    queryKey: ["practices", monthFrom, monthTo],
    queryFn: () => api.practices(monthFrom, monthTo),
  });
  const illustrationsQuery = useQuery({
    queryKey: ["illustrations", weekFrom, weekTo],
    queryFn: () => api.illustrations(weekFrom, weekTo),
  });
  const summariesQuery = useQuery({
    queryKey: ["summaries", monthFrom, monthTo, weekFrom],
    queryFn: async () => {
      const summaries: Summary[] = [];
      for (const start of summaryStarts) {
        summaries.push(await api.summary(start, weekEndOf(start)));
      }
      return summaries;
    },
  });
  const practices = practicesQuery.data ?? [];
  const illustrations = illustrationsQuery.data ?? [];
  const summaries = summariesQuery.data ?? [];
  const weekSummary = summaries.find((summary) => summary.from === weekFrom) ?? null;
  const monthSummary = summaries.length
    ? combineSummaries(summaries, monthFrom, monthTo)
    : null;

  const refreshSummaries = useCallback(async () => {
    await summariesQuery.refetch();
  }, [summariesQuery]);

  const refreshPracticeData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ["practices"], refetchType: "none" });
      await practicesQuery.refetch();
      await queryClient.invalidateQueries({ queryKey: ["summaries"], refetchType: "none" });
      await refreshSummaries();
    } finally {
      setIsRefreshing(false);
    }
  }, [practicesQuery, queryClient, refreshSummaries]);

  const refreshIllustrationData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ["illustrations"], refetchType: "none" });
      await illustrationsQuery.refetch();
      await queryClient.invalidateQueries({ queryKey: ["summaries"], refetchType: "none" });
      await refreshSummaries();
    } finally {
      setIsRefreshing(false);
    }
  }, [illustrationsQuery, queryClient, refreshSummaries]);

  const refreshEvents = useCallback(async () => {
    setEvents(await api.events());
  }, []);

  const refreshAllData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ["illustrations"], refetchType: "none" });
      await illustrationsQuery.refetch();
      await queryClient.invalidateQueries({ queryKey: ["summaries"], refetchType: "none" });
      await summariesQuery.refetch();
      await queryClient.invalidateQueries({ queryKey: ["practices"], refetchType: "none" });
      await practicesQuery.refetch();
    } finally {
      setIsRefreshing(false);
    }
  }, [illustrationsQuery, practicesQuery, queryClient, summariesQuery]);

  const isLoading =
    isRefreshing ||
    practicesQuery.isPending ||
    illustrationsQuery.isPending ||
    summariesQuery.isPending;

  const producedByDate = useMemo(() => {
    const map = new Map<string, SizeCounts>();
    for (const entry of illustrations) {
      if (entry.entryType === "day" && entry.date) {
        map.set(entry.date, addCounts(map.get(entry.date) ?? emptyCounts, entry));
      } else {
        for (const day of entry.days) {
          map.set(day.date, addCounts(map.get(day.date) ?? emptyCounts, day));
        }
      }
    }
    return map;
  }, [illustrations]);

  const practicesByDate = useMemo(() => {
    const map = new Map<string, Practice[]>();
    for (const practice of practices) {
      for (const date of practice.dates) {
        const list = map.get(date) ?? [];
        list.push(practice);
        map.set(date, list);
      }
    }
    return map;
  }, [practices]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, EventItem[]>();
    for (const event of events) {
      const list = map.get(event.date) ?? [];
      list.push(event);
      map.set(event.date, list);
    }
    return map;
  }, [events]);

  const upcoming = useMemo(
    () =>
      [...events]
        .filter((event) => event.date >= iso(new Date()))
        .sort((a, b) => a.date.localeCompare(b.date)),
    [events],
  );

  if (isLoading) {
    return (
      <Center h="100vh">
        <Loader size="lg" />
      </Center>
    );
  }

  return (
    <AppShell header={{ height: 64 }} padding="md">
      <AppShell.Header>
        <Group h="100%" px="lg" justify="space-between">
          <Group>
            <IconCalendarEvent size={22} />
            <Title order={3}>イラスト TODO</Title>
          </Group>
          <Group>
            <SegmentedControl
              value={mode}
              onChange={(value) => setMode(value as "day" | "week")}
              data={[
                { label: "日ごと", value: "day" },
                { label: "週ごと", value: "week" },
              ]}
            />
            <Button
              variant="default"
              leftSection={<IconRefresh size={16} />}
              onClick={() => void refreshAllData()}
            >
              更新
            </Button>
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={() => {
                setEditingEvent(null);
                eventModal.open();
              }}
            >
              イベントを追加
            </Button>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Main>
        <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="md">
          <Card withBorder padding="md" style={{ gridColumn: "span 2" }}>
            <Group justify="space-between" mb="sm">
              <Title order={4}>{dayjs(cursor).format("YYYY年M月")}</Title>
              <Group>
                <Button
                  variant="default"
                  size="xs"
                  onClick={() =>
                    setCursor(iso(dayjs(cursor).subtract(1, "month")))
                  }
                >
                  前月
                </Button>
                <Button
                  variant="default"
                  size="xs"
                  onClick={() => setCursor(iso(new Date()))}
                >
                  今月
                </Button>
                <Button
                  variant="default"
                  size="xs"
                  onClick={() => setCursor(iso(dayjs(cursor).add(1, "month")))}
                >
                  翌月
                </Button>
              </Group>
            </Group>
            <Calendar
              date={cursor}
              onDateChange={(value) => {
                if (value) {
                  setCursor(value);
                  setSelected(value);
                }
              }}
              static
              size="lg"
              getDayProps={(date) => ({
                selected: date === selected,
                onClick: () => setSelected(date),
              })}
              renderDay={(date) => {
                return (
                  <UnstyledButton w="100%">
                    <Text size="sm" ta="center">
                      {dayjs(date).date()}
                    </Text>
                  </UnstyledButton>
                );
              }}
            />
            <Group mt="md" grow>
              <Paper withBorder p="sm">
                <Text size="sm" fw={600}>
                  今週の合算
                </Text>
                {weekSummary && (
                  <SizePills counts={weekSummary.illustrations.totals} />
                )}
                <Text size="xs" c="dimmed" mt={4}>
                  練習 {weekSummary?.practices.dailyCount ?? 0} 件 / 週分散{" "}
                  {weekSummary?.practices.weeklyDaySlots ?? 0} 枠
                </Text>
              </Paper>
              <Paper withBorder p="sm">
                <Text size="sm" fw={600}>
                  今月の合算
                </Text>
                {monthSummary && (
                  <SizePills counts={monthSummary.illustrations.totals} />
                )}
                <Text size="xs" c="dimmed" mt={4}>
                  練習 {monthSummary?.practices.dailyCount ?? 0} 件 / 週分散{" "}
                  {monthSummary?.practices.weeklyDaySlots ?? 0} 枠
                </Text>
              </Paper>
            </Group>
          </Card>

          <Stack>
            <Card withBorder>
              <Title order={5} mb="xs">
                今後のイベント（残り枚数）
              </Title>
              <Stack gap="sm">
                {upcoming.length === 0 && (
                  <Text size="sm" c="dimmed">
                    予定はありません
                  </Text>
                )}
                {upcoming.map((event) => (
                  <Paper
                    key={event.id}
                    withBorder
                    p="sm"
                    onClick={() => {
                      setEditingEvent(event);
                      eventModal.open();
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    <Group justify="space-between">
                      <Text fw={600}>{event.title}</Text>
                      <Text size="sm" c="dimmed">
                        {event.date}
                      </Text>
                    </Group>
                    <SizePills counts={event.remaining} prefix="残 " />
                  </Paper>
                ))}
              </Stack>
            </Card>

            {mode === "day" ? (
              <DayPanel
                date={selected}
                practices={practicesByDate.get(selected) ?? []}
                events={events}
                dayEvents={eventsByDate.get(selected) ?? []}
                illustrations={illustrations.filter(
                  (entry) =>
                    (entry.entryType === "day" && entry.date === selected) ||
                    entry.days.some((day) => day.date === selected),
                )}
                produced={producedByDate.get(selected) ?? emptyCounts}
                onPracticeChanged={refreshPracticeData}
                onIllustrationChanged={refreshIllustrationData}
                onEditEvent={(event) => {
                  setEditingEvent(event);
                  eventModal.open();
                }}
              />
            ) : (
              <WeekPanel
                weekStart={weekFrom}
                practices={practices.filter((p) => p.weekStart === weekFrom)}
                events={events}
                illustrations={illustrations.filter(
                  (entry) => entry.weekStart === weekFrom,
                )}
                producedByDate={producedByDate}
                onPracticeChanged={refreshPracticeData}
                onIllustrationChanged={refreshIllustrationData}
              />
            )}
          </Stack>
        </SimpleGrid>
      </AppShell.Main>

      <EventModal
        opened={eventOpened}
        onClose={eventModal.close}
        event={editingEvent}
        defaultDate={selected}
        onSaved={async () => {
          eventModal.close();
          await refreshEvents();
        }}
      />
    </AppShell>
  );
}

function DayPanel({
  date,
  practices,
  events,
  dayEvents,
  illustrations,
  produced,
  onPracticeChanged,
  onIllustrationChanged,
  onEditEvent,
}: {
  date: string;
  practices: Practice[];
  events: EventItem[];
  dayEvents: EventItem[];
  illustrations: IllustrationEntry[];
  produced: SizeCounts;
  onPracticeChanged: () => Promise<void>;
  onIllustrationChanged: () => Promise<void>;
  onEditEvent: (event: EventItem) => void;
}) {
  const [title, setTitle] = useState("");
  const [eventId, setEventId] = useState<string | null>(events[0]?.id ?? null);
  const [counts, setCounts] = useState<SizeCounts>(emptyCounts);
  const [checkedPracticeIds, setCheckedPracticeIds] = useState<Set<string>>(
    () => new Set(practices.filter((practice) => practice.done).map((practice) => practice.id)),
  );

  useEffect(() => {
    setEventId(events[0]?.id ?? null);
  }, [events]);

  useEffect(() => {
    setCheckedPracticeIds(
      new Set(
        practices
          .filter((practice) => practice.done)
          .map((practice) => practice.id),
      ),
    );
  }, [practices]);

  return (
    <Card withBorder>
      <Title order={5}>{dayjs(date).format("M月D日（dd）")} の入力</Title>
      <Text size="sm" c="dimmed" mb="sm">
        当日の実績 大/中/小 {produced.large}/{produced.medium}/{produced.small}
      </Text>

      {dayEvents.map((event) => (
        <Paper key={event.id} withBorder p="sm" mb="sm">
          <Group justify="space-between">
            <Text fw={600}>{event.title}</Text>
            <Button size="compact-xs" variant="subtle" onClick={() => onEditEvent(event)}>
              編集
            </Button>
          </Group>
          <Text size="xs" c="dimmed">
            必要
          </Text>
          <SizePills
            counts={{
              large: event.largeNeeded,
              medium: event.mediumNeeded,
              small: event.smallNeeded,
            }}
          />
          <Text size="xs" c="dimmed" mt={6}>
            残り
          </Text>
          <SizePills counts={event.remaining} />
        </Paper>
      ))}

      <Text fw={600} mt="sm" mb={6}>
        練習
      </Text>
      <Stack gap={6}>
        {practices.map((practice) => (
          <Group
            key={practice.id}
            justify="space-between"
            wrap="nowrap"
            style={{
              opacity: checkedPracticeIds.has(practice.id) ? 0.5 : 1,
              transition: "opacity 0.2s ease",
            }}
          >
            <Checkbox
              checked={checkedPracticeIds.has(practice.id)}
              label={
                <Group gap={6}>
                  <Text
                    size="sm"
                    c={checkedPracticeIds.has(practice.id) ? "dimmed" : undefined}
                  >
                    {practice.title}
                  </Text>
                  {practice.entryType === "week" && (
                    <Badge size="xs">週</Badge>
                  )}
                </Group>
              }
              onChange={(event) => {
                const checked = event.currentTarget.checked;
                setCheckedPracticeIds((current) => {
                  const next = new Set(current);
                  if (checked) next.add(practice.id);
                  else next.delete(practice.id);
                  return next;
                });
              }}
            />
            <ActionIcon
              variant="subtle"
              color="red"
              onClick={async () => {
                await showApiToast(
                  api.deletePractice(practice.id),
                  "練習を削除しました",
                );
                await onPracticeChanged();
              }}
            >
              <IconTrash size={16} />
            </ActionIcon>
          </Group>
        ))}
      </Stack>
      <Group mt="xs" align="flex-end">
        <TextInput
          flex={1}
          placeholder="今日の練習"
          value={title}
          onChange={(e) => setTitle(e.currentTarget.value)}
        />
        <Button
          onClick={async () => {
            if (!title.trim()) return;
            await showApiToast(
              api.createPractice({
                title,
                entryType: "day",
                date,
              }),
              "練習を追加しました",
            );
            setTitle("");
            await onPracticeChanged();
          }}
        >
          追加
        </Button>
      </Group>

      <Text fw={600} mt="md" mb={6}>
        イラスト実績（日ごと）
      </Text>
      <Select
        label="対象イベント"
        data={events.map((event) => ({
          value: event.id,
          label: `${event.date} ${event.title}`,
        }))}
        value={eventId}
        onChange={setEventId}
        mb="xs"
      />
      <Group grow>
        <NumberInput
          label="大"
          min={0}
          value={counts.large}
          onChange={(v) => setCounts((c) => ({ ...c, large: Number(v) || 0 }))}
        />
        <NumberInput
          label="中"
          min={0}
          value={counts.medium}
          onChange={(v) => setCounts((c) => ({ ...c, medium: Number(v) || 0 }))}
        />
        <NumberInput
          label="小"
          min={0}
          value={counts.small}
          onChange={(v) => setCounts((c) => ({ ...c, small: Number(v) || 0 }))}
        />
      </Group>
      <Button
        mt="sm"
        fullWidth
        leftSection={<IconCheck size={16} />}
        onClick={async () => {
          await showApiToast(
            api.createIllustration({
              eventId,
              entryType: "day",
              date,
              ...counts,
            }),
            "実績を保存しました",
          );
          setCounts(emptyCounts);
          await onIllustrationChanged();
        }}
      >
        実績を保存
      </Button>

      {illustrations
        .filter((entry) => entry.entryType === "day")
        .map((entry) => (
          <Group key={entry.id} justify="space-between" mt="xs">
            <SizePills counts={entry} />
            <ActionIcon
              color="red"
              variant="subtle"
              onClick={async () => {
                await showApiToast(
                  api.deleteIllustration(entry.id),
                  "実績を削除しました",
                );
                await onIllustrationChanged();
              }}
            >
              <IconTrash size={16} />
            </ActionIcon>
          </Group>
        ))}
    </Card>
  );
}

function WeekPanel({
  weekStart,
  practices,
  events,
  illustrations,
  producedByDate,
  onPracticeChanged,
  onIllustrationChanged,
}: {
  weekStart: string;
  practices: Practice[];
  events: EventItem[];
  illustrations: IllustrationEntry[];
  producedByDate: Map<string, SizeCounts>;
  onPracticeChanged: () => Promise<void>;
  onIllustrationChanged: () => Promise<void>;
}) {
  const dates = weekDates(weekStart);
  const [title, setTitle] = useState("");
  const [selectedDays, setSelectedDays] = useState<string[]>(dates);
  const [eventId, setEventId] = useState<string | null>(events[0]?.id ?? null);
  const [totals, setTotals] = useState<SizeCounts>(emptyCounts);
  const [split, setSplit] = useState<SizeCounts[]>(
    dates.map(() => emptyCounts),
  );

  useEffect(() => {
    setSelectedDays(weekDates(weekStart));
    setSplit(weekDates(weekStart).map(() => emptyCounts));
    setEventId(events[0]?.id ?? null);
  }, [weekStart, events]);

  const applyEven = () => {
    const large = evenSplit(totals.large, 7);
    const medium = evenSplit(totals.medium, 7);
    const small = evenSplit(totals.small, 7);
    setSplit(
      dates.map((_, i) => ({
        large: large[i],
        medium: medium[i],
        small: small[i],
      })),
    );
  };

  return (
    <Card withBorder>
      <Title order={5}>
        {dayjs(weekStart).format("M/D")} 週の入力
      </Title>
      <Text size="sm" c="dimmed" mb="sm">
        週合計を入れて、日ごとに分散できます
      </Text>

      <Text fw={600} mb={6}>
        練習（週）
      </Text>
      <TextInput
        placeholder="今週の練習"
        value={title}
        onChange={(e) => setTitle(e.currentTarget.value)}
        mb="xs"
      />
      <Group gap={6} mb="xs">
        {dates.map((date) => (
          <Checkbox
            key={date}
            label={dayjs(date).format("dd")}
            checked={selectedDays.includes(date)}
            onChange={(event) => {
              const checked = event.currentTarget.checked;
              setSelectedDays((current) =>
                checked
                  ? [...current, date]
                  : current.filter((d) => d !== date),
              );
            }}
          />
        ))}
      </Group>
      <Button
        mb="md"
        onClick={async () => {
          if (!title.trim()) return;
          await showApiToast(
            api.createPractice({
              title,
              entryType: "week",
              weekStart,
              dates: selectedDays,
            }),
            "週の練習を追加しました",
          );
          setTitle("");
          await onPracticeChanged();
        }}
      >
        週の練習を追加
      </Button>
      {practices.map((practice) => (
        <Group key={practice.id} justify="space-between" mb={4}>
          <Text size="sm">
            {practice.title}（{practice.dates.map((d) => dayjs(d).format("D")).join(",")}日）
          </Text>
          <ActionIcon
            color="red"
            variant="subtle"
            onClick={async () => {
              await showApiToast(
                api.deletePractice(practice.id),
                "練習を削除しました",
              );
              await onPracticeChanged();
            }}
          >
            <IconTrash size={16} />
          </ActionIcon>
        </Group>
      ))}

      <Text fw={600} mt="sm" mb={6}>
        イラスト実績（週）
      </Text>
      <Select
        label="対象イベント"
        data={events.map((event) => ({
          value: event.id,
          label: `${event.date} ${event.title}`,
        }))}
        value={eventId}
        onChange={setEventId}
        mb="xs"
      />
      <Group grow>
        <NumberInput
          label="大 合計"
          min={0}
          value={totals.large}
          onChange={(v) => setTotals((c) => ({ ...c, large: Number(v) || 0 }))}
        />
        <NumberInput
          label="中 合計"
          min={0}
          value={totals.medium}
          onChange={(v) => setTotals((c) => ({ ...c, medium: Number(v) || 0 }))}
        />
        <NumberInput
          label="小 合計"
          min={0}
          value={totals.small}
          onChange={(v) => setTotals((c) => ({ ...c, small: Number(v) || 0 }))}
        />
      </Group>
      <Button variant="light" mt="xs" onClick={applyEven}>
        7日に均等分散
      </Button>

      <Table mt="sm" striped>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>日</Table.Th>
            <Table.Th>大</Table.Th>
            <Table.Th>中</Table.Th>
            <Table.Th>小</Table.Th>
            <Table.Th>実績</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {dates.map((date, i) => {
            const produced = producedByDate.get(date) ?? emptyCounts;
            return (
              <Table.Tr key={date}>
                <Table.Td>{dayjs(date).format("M/D (dd)")}</Table.Td>
                <Table.Td>
                  <NumberInput
                    size="xs"
                    min={0}
                    value={split[i]?.large ?? 0}
                    onChange={(v) =>
                      setSplit((rows) =>
                        rows.map((row, idx) =>
                          idx === i ? { ...row, large: Number(v) || 0 } : row,
                        ),
                      )
                    }
                  />
                </Table.Td>
                <Table.Td>
                  <NumberInput
                    size="xs"
                    min={0}
                    value={split[i]?.medium ?? 0}
                    onChange={(v) =>
                      setSplit((rows) =>
                        rows.map((row, idx) =>
                          idx === i ? { ...row, medium: Number(v) || 0 } : row,
                        ),
                      )
                    }
                  />
                </Table.Td>
                <Table.Td>
                  <NumberInput
                    size="xs"
                    min={0}
                    value={split[i]?.small ?? 0}
                    onChange={(v) =>
                      setSplit((rows) =>
                        rows.map((row, idx) =>
                          idx === i ? { ...row, small: Number(v) || 0 } : row,
                        ),
                      )
                    }
                  />
                </Table.Td>
                <Table.Td>
                  {produced.large}/{produced.medium}/{produced.small}
                </Table.Td>
              </Table.Tr>
            );
          })}
        </Table.Tbody>
      </Table>
      <Button
        mt="sm"
        fullWidth
        onClick={async () => {
          await showApiToast(
            api.createIllustration({
              eventId,
              entryType: "week",
              weekStart,
              large: totals.large,
              medium: totals.medium,
              small: totals.small,
              days: dates.map((date, i) => ({
                date,
                ...(split[i] ?? emptyCounts),
              })),
            }),
            "週の実績を保存しました",
          );
          setTotals(emptyCounts);
          setSplit(dates.map(() => emptyCounts));
          await onIllustrationChanged();
        }}
      >
        週の実績を保存
      </Button>

      {illustrations.map((entry) => (
        <Group key={entry.id} justify="space-between" mt="xs">
          <SizePills counts={entry} />
          <ActionIcon
            color="red"
            variant="subtle"
            onClick={async () => {
              await showApiToast(
                api.deleteIllustration(entry.id),
                "実績を削除しました",
              );
              await onIllustrationChanged();
            }}
          >
            <IconTrash size={16} />
          </ActionIcon>
        </Group>
      ))}
    </Card>
  );
}

function EventModal({
  opened,
  onClose,
  event,
  defaultDate,
  onSaved,
}: {
  opened: boolean;
  onClose: () => void;
  event: EventItem | null;
  defaultDate: string;
  onSaved: () => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [notes, setNotes] = useState("");
  const [needed, setNeeded] = useState<SizeCounts>(emptyCounts);

  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setDate(event.date);
      setNotes(event.notes);
      setNeeded({
        large: event.largeNeeded,
        medium: event.mediumNeeded,
        small: event.smallNeeded,
      });
    } else {
      setTitle("");
      setDate(defaultDate);
      setNotes("");
      setNeeded(emptyCounts);
    }
  }, [event, defaultDate, opened]);

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={event ? "イベントを編集" : "イベントを追加"}
    >
      <Stack>
        <TextInput
          label="イベント名"
          value={title}
          onChange={(e) => setTitle(e.currentTarget.value)}
        />
        <TextInput
          label="開催日"
          type="date"
          value={date}
          onChange={(e) => setDate(e.currentTarget.value)}
        />
        <Group grow>
          <NumberInput
            label="大 必要枚数"
            min={0}
            value={needed.large}
            onChange={(v) => setNeeded((c) => ({ ...c, large: Number(v) || 0 }))}
          />
          <NumberInput
            label="中 必要枚数"
            min={0}
            value={needed.medium}
            onChange={(v) =>
              setNeeded((c) => ({ ...c, medium: Number(v) || 0 }))
            }
          />
          <NumberInput
            label="小 必要枚数"
            min={0}
            value={needed.small}
            onChange={(v) => setNeeded((c) => ({ ...c, small: Number(v) || 0 }))}
          />
        </Group>
        <Textarea
          label="メモ"
          value={notes}
          onChange={(e) => setNotes(e.currentTarget.value)}
        />
        {event && (
          <Paper withBorder p="sm">
            <Text size="sm">制作済み</Text>
            <SizePills counts={event.produced} />
            <Text size="sm" mt="xs">
              残り
            </Text>
            <SizePills counts={event.remaining} />
          </Paper>
        )}
        <Group justify="space-between">
          {event ? (
            <Button
              color="red"
              variant="light"
              onClick={async () => {
                await showApiToast(
                  api.deleteEvent(event.id),
                  "イベントを削除しました",
                );
                await onSaved();
              }}
            >
              削除
            </Button>
          ) : (
            <span />
          )}
          <Button
            onClick={async () => {
              if (!title.trim()) return;
              const body = {
                title,
                date,
                notes,
                largeNeeded: needed.large,
                mediumNeeded: needed.medium,
                smallNeeded: needed.small,
              };
              await showApiToast(
                event ? api.updateEvent(event.id, body) : api.createEvent(body),
                event ? "イベントを更新しました" : "イベントを追加しました",
              );
              await onSaved();
            }}
          >
            保存
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
