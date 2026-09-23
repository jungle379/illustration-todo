import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { BulkDeleteParams } from "@/app/types/type";

const getMonthRange = (month: string) => {
  // month is expected to be "YYYY-MM" from <input type="month">
  const [y, m] = month.split("-").map((v) => Number(v));
  const start = `${month}-01`;

  // JS Date months are 0-based; day=0 gives the last day of the previous month.
  const lastDay = new Date(y, m, 0);
  const end = format(lastDay, "yyyy-MM-dd");

  return { start, end };
};

export const useBulkDeleteEvents = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: BulkDeleteParams) => {
      let query = supabase.from("events").delete();

      if (params.mode === "range") {
        query = query.gte("date", params.start).lte("date", params.end);
      }

      if (params.mode === "month") {
        const { start, end } = getMonthRange(params.month);

        query = query.gte("date", start).lte("date", end);
      }

      const { error } = await query;
      if (error) throw error;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });
};
