import { useEffect, useRef, useState } from "react";
import {
  connectWebSocket,
  joinQueue,
  closeWebSocket,
} from "../services/websocket";
import { Match, WebSocketMessage } from "../types";

export const useMatchmaking = (
  userId: string,
  difficulty: string,
  language: string,
  topics: string[],
  timeout: number = 60 //timeout afer 60 seconds
) => {
  const [match, setMatch] = useState<Match | null>(null);
  const [isFinding, setIsFinding] = useState(false);
  const [timeProgress, setTimeProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const interval = useRef<ReturnType<typeof setInterval> | null>(null);

  const findMatch = async () => {
    setMatch(null);
    setIsFinding(true);
    setTimeProgress(0);
    setError(null);

    try {
      await connectWebSocket((msg: WebSocketMessage) => {
        if (msg.event === "match_found") {
          stopSearching(); //need to be initialised
          setMatch(msg.match);
        }
      });

      await joinQueue({ id: userId, difficulty, language, topics }); //informing server on request to join queue

      // Start the timer AFTER successful connection and queue join
      interval.current = setInterval(() => {
        setTimeProgress((t) => {
          const increment = t + 1;
          if (increment >= timeout) {
            stopSearching();
            setError(
              "No Match found. Please try again or try different topics/levels."
            );
          }
          return increment;
        });
      }, 1000);
    } catch (error) {
      console.error("Failed to connect to matching service:", error);
      setError("Failed to connect to matching service. Please try again.");
      setIsFinding(false);
      return;
    }
  };

  const stopSearching = () => {
    if (interval.current) {
      clearInterval(interval.current);
      interval.current = null;
    }
    setIsFinding(false);
  };

  const resetMatch = () => {
    setMatch(null);
    setIsFinding(false);
    setTimeProgress(0);
    setError(null);
  };

  useEffect(() => {
    // Clean up on page unload/refresh if WebSocket is active
    const handleBeforeUnload = () => {
      if (isFinding) {
        closeWebSocket();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      // Only clean up on component unmount, not on every isFinding change
      stopSearching();
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []); // Empty dependency array - only runs on mount/unmount

  return { match, findMatch, isFinding, timeProgress, error, resetMatch };
};
