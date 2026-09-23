import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { IllustrationLog } from "@/app/types/todo";

export function useIllustrationLogs() {
  return useQuery({
    queryKey: ["illustration-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("illustration_logs")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as IllustrationLog[];
    },
  });
}

export function useIllustrationLogMutations(date: string) {
  const queryClient = useQueryClient();
  const key = ["illustration-logs"];
  const invalidate = () => queryClient.invalidateQueries({ queryKey: key });
  const add = useMutation({
    mutationFn: async (counts: Pick<IllustrationLog, "large" | "medium" | "small">) => {
      const { error } = await supabase.from("illustration_logs").insert({ date, ...counts });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("illustration_logs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
  return { add, remove };
}
