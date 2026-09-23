import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { DailyTodo } from "@/app/types/todo";

export function useDailyTodos() {
  return useQuery({
    queryKey: ["daily-todos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_todos")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as DailyTodo[];
    },
  });
}

export function useDailyTodoMutations(date: string) {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["calendar-data"] });

  const add = useMutation({
    mutationFn: async (title: string) => {
      const { error } = await supabase.from("daily_todos").insert({ date, title });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
  const toggle = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const { error } = await supabase.from("daily_todos").update({ completed }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("daily_todos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
  return { add, toggle, remove };
}
