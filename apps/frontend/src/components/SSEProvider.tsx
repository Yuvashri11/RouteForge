import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

export function SSEProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const eventSource = new EventSource("/api/events");

    const invalidateProfileQueries = () => {
      // Refetch currently mounted views immediately when profile usage changes.
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    };

    const handleMessage = (rawData: string) => {
      // Backward-compatible fallback if server sends JSON on the default message channel.
      try {
        const payload = JSON.parse(rawData);
        if (payload?.event === "profile_updated") {
          invalidateProfileQueries();
        }
      } catch {
        // Ignore non-JSON message payloads.
      }
    };

    eventSource.addEventListener("profile_updated", () => {
      invalidateProfileQueries();
    });

    eventSource.addEventListener("message", (e) => {
      handleMessage(e.data);
    });

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource?.close();
    };
  }, [queryClient]);

  return <>{children}</>;
}
