import { useEffect, useRef, useState } from "react";
import {
  connectWebSocket,
  joinQueue,
  closeWebSocket,
  acceptMatch as sendAccept,
  declineMatch as sendDecline,
} from "../services/websocket";
import { getQuestionById } from "../services/questionService";
import { Match, Question, WebSocketMessage } from "../types";

export const useMatchmaking = (
  userId: string,
  difficulty: string,
  language: string,
  topics: string[],
  timeout: number = 60 //timeout afer 60 seconds
) => {
  const [match, setMatch] = useState<Match | null>(null);
  const [question, setQuestion] = useState<Question | null>(null);
  const [isFinding, setIsFinding] = useState(false);
  const [timeProgress, setTimeProgress] = useState(0);
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const interval = useRef<ReturnType<typeof setInterval> | null>(null);

  const findMatch = async () => {
    setMatch(null);
    setQuestion(null);
    setIsFinding(true);
    setTimeProgress(0);
    setError(null);

    try {
      await connectWebSocket(async (msg: WebSocketMessage) => {
        if (msg.event === "match_found") {
          stopSearching(); // need to be initialised
          setIsAccepting(false); //to clear any state
          setMatch(msg.match);

          // Fetch the question details using the questionId
          if (msg.match.questionId) {
            try {
              const questionData = await getQuestionById(msg.match.questionId);
              setQuestion(questionData);
            } catch (err) {
              console.error("Error fetching question:", err);
              setError("Failed to load question details");
            }
          }
        }
        if (msg.event === "match_acceptance_update") {
          // Update match with current acceptance count
          setMatch(msg.match);
        }
        if (msg.event === "match_accepted") {
          setMatch(msg.match);
          setIsAccepting(false);
        }
        if (msg.event === "match_declined") {
          console.log("Match declined:", msg.match.id);
          const decliningUserId = msg.match.decliningUserId;
          const wasDeclinedByMe = decliningUserId === userId;
          const declinedMatchId = msg.match.id;
          const reason = msg.reason;

          setMatch(msg.match);

          // Handle timeout - both users removed from queue
          if (reason === "timeout") {
            setError("Match timed out. Click 'Find Match' to search again.");
            stopSearching();
            setTimeout(() => {
              setMatch(null);
              setError(null);
            }, 3000);
            setIsAccepting(false);
            return;
          }

          // Handle manual decline
          if (wasDeclinedByMe) {
            // I declined, clear after 3 seconds
            setError("You declined the match.");
            setTimeout(() => {
              // Only clear if we're still showing the same declined match
              setMatch((currentMatch) => {
                if (
                  currentMatch?.id === declinedMatchId &&
                  currentMatch.status === "declined"
                ) {
                  setError(null);
                  setIsFinding(false);
                  return null;
                }
                return currentMatch; // Don't clear if a new match has appeared
              });
            }, 3000);
          } else {
            // Other user declined, show message and prepare for re-matching
            setError("Match was declined by peer. Searching again...");

            // Set finding state immediately to show we're searching
            setIsFinding(true);
            setTimeProgress(0);

            // Start the progress timer for the re-search
            if (interval.current) {
              clearInterval(interval.current);
            }
            interval.current = setInterval(() => {
              setTimeProgress((t) => {
                const increment = t + 1;
                if (increment >= timeout) {
                  stopSearching();
                  setError(
                    "No Match found. Please try again or try different topics/levels."
                  );
                  return timeout;
                }
                return increment;
              });
            }, 1000);

            // Clear the declined match after 3 seconds only if no new match found
            setTimeout(() => {
              setMatch((currentMatch) => {
                if (
                  currentMatch?.id === declinedMatchId &&
                  currentMatch.status === "declined"
                ) {
                  setError(null);
                  return null;
                }
                // Don't clear if a new match has been found
                return currentMatch;
              });
            }, 3000);
          }

          setIsAccepting(false);
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

  const cancelSearch = () => {
    stopSearching();
    closeWebSocket();
    setMatch(null);
    setQuestion(null);
    setError(null);
  };

  const acceptMatch = async () => {
    if (!match) return;
    setIsAccepting(true);
    try {
      await sendAccept(match.id);
    } catch (e) {
      setError("Failed to accept match");
      setIsAccepting(false);
    }
  };

  const declineMatch = async () => {
    if (!match) return;
    try {
      await sendDecline(match.id);
      setMatch(null);
      stopSearching();
    } catch (e) {
      setError("Failed to decline match");
    }
  };

  const resetMatch = () => {
    setMatch(null);
    setQuestion(null);
    setIsFinding(false);
    setIsAccepting(false);
    setTimeProgress(0);
    setError(null);
    closeWebSocket();
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

  return {
    match,
    question,
    findMatch,
    cancelSearch,
    acceptMatch,
    declineMatch,
    isFinding,
    isAccepting,
    timeProgress,
    error,
    resetMatch,
  };
};
