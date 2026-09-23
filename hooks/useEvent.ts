import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export const useEvents = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ["events"],
    enabled: options?.enabled ?? true,
    queryFn: async () => {
      const q = supabase.from("events").select("*");
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
};
