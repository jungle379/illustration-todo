import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { UpdateEventInput } from "@/app/types/type";

export const useUpdateEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      title,
      date,
      memo,
      user_id,
      start_time,
      end_time,
      large_needed,
      medium_needed,
      small_needed,
    }: UpdateEventInput) => {
      const { error } = await supabase
        .from("events")
        .update({ id, title, date, memo, user_id, start_time, end_time, large_needed, medium_needed, small_needed })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });
};
