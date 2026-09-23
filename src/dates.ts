import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek";
import "dayjs/locale/ja";

dayjs.extend(isoWeek);
dayjs.locale("ja");

export { dayjs };

export function iso(date: dayjs.Dayjs | Date | string) {
  return dayjs(date).format("YYYY-MM-DD");
}

export function weekStartOf(date: string | Date) {
  return iso(dayjs(date).startOf("isoWeek"));
}

export function weekEndOf(date: string | Date) {
  return iso(dayjs(date).endOf("isoWeek"));
}

export function monthStartOf(date: string | Date) {
  return iso(dayjs(date).startOf("month"));
}

export function monthEndOf(date: string | Date) {
  return iso(dayjs(date).endOf("month"));
}

export function weekDates(weekStart: string) {
  return Array.from({ length: 7 }, (_, i) =>
    iso(dayjs(weekStart).add(i, "day")),
  );
}
