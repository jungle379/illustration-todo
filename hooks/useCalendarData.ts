import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { DailyTodo, IllustrationLog } from "@/app/types/todo";

export type CalendarData = {
  todos: DailyTodo[];
  logs: IllustrationLog[];
};

export function useCalendarData() {
  return useQuery({
    queryKey: ["calendar-data"],
    queryFn: async (): Promise<CalendarData> => {
      const todosResult = await supabase
        .from("daily_todos")
        .select("*")
        .order("created_at", { ascending: true });
      if (todosResult.error) throw todosResult.error;

      const logsResult = await supabase
        .from("illustration_logs")
        .select("*")
        .order("created_at", { ascending: false });
      if (logsResult.error) throw logsResult.error;

      return {
        todos: todosResult.data as DailyTodo[],
        logs: logsResult.data as IllustrationLog[],
      };
    },
  });
}
