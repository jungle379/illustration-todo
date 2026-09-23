import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export const useEvents = (date?: string) => {
  return useQuery({
    queryKey: ["events", date ?? "all"],
    queryFn: async () => {
      let q = supabase.from("events").select("*");
      if (date) {
        q = q.eq("date", date);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
};
