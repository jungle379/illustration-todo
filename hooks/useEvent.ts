import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export const useEvents = () => {
  return useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const q = supabase.from("events").select("*");
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });
};
