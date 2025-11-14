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
  const [hasAccepted, setHasAccepted] = useState(false); // Track if user accepted

  const interval = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasAcceptedRef = useRef(false); // Ref to track acceptance for WebSocket callback

  const findMatch = async () => {
    setMatch(null);
    setQuestion(null);
    setIsFinding(true);
    setTimeProgress(0);
    setError(null);
    setHasAccepted(false); // Reset acceptance state
    hasAcceptedRef.current = false; // Reset ref

    try {
      await connectWebSocket(async (msg: WebSocketMessage) => {
        if (msg.event === "match_found") {
          stopSearching(); // need to be initialised
          setIsAccepting(false); //to clear any state
          setHasAccepted(false); // Reset acceptance for new match
          hasAcceptedRef.current = false; // Reset ref
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
          console.log("Decline reason:", msg.reason);
          console.log("Declining user ID:", msg.match.decliningUserId);
          console.log("Current user ID:", userId);
          console.log("Has accepted (ref):", hasAcceptedRef.current);

          const decliningUserId = msg.match.decliningUserId;
          const wasDeclinedByMe = decliningUserId === userId;

          setMatch(msg.match);

          if (msg.reason === "timeout") {
            // Timeout case - only rejoin if user had accepted
            if (hasAcceptedRef.current) {
              // User accepted but peer didn't respond - auto rejoin
              setError("The other user didn't respond. Rejoining the queue...");

              // Clear match immediately to avoid showing stale match info
              setMatch(null);
              setQuestion(null);

              setIsFinding(true);
              setTimeProgress(0);

              //using try-catch block in case joining queue is failed and preventing UI to stall
              try {
                await joinQueue({ id: userId, difficulty, language, topics });
              } catch (err) {
                console.error("Failed to rejoin queue after timeout:", err);
                setError(
                  "Failed to rejoin queue. Please hit Find Match again."
                );
                stopSearching();
                return;
              }

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

              // Clear error message after 3 seconds
              setTimeout(() => {
                setError(null);
              }, 3000);
            } else {
              // User didn't accept in time - don't rejoin
              stopSearching();
              setError("You didn't accept in time.");
            }
          } else if (wasDeclinedByMe) {
            // User declined - show modal requiring manual action
            stopSearching();
            setError("You declined the match.");
          } else {
            // Peer declined - auto rejoin queue
            setError("Match was declined by peer. Searching again...");

            // Clear match immediately to avoid showing stale match info
            setMatch(null);
            setQuestion(null);

            setIsFinding(true);
            setTimeProgress(0);

            //using try-catch block in case joining queue is failed and preventing UI to stall
            try {
              await joinQueue({ id: userId, difficulty, language, topics });
            } catch (err) {
              console.error("Failed to rejoin queue after decline:", err); //to debug when requeuing failed
              setError("Failed to rejoin queue. Please hit Find Match again."); //to notify user
              stopSearching(); // stop the timer since we’re not actually queued
              return;
            }

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

            // Clear error message after 3 seconds
            setTimeout(() => {
              setError(null);
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
    setHasAccepted(true); // Mark that user has accepted
    hasAcceptedRef.current = true; // Set ref for WebSocket callback
    try {
      await sendAccept(match.id);
    } catch (e) {
      setError("Failed to accept match");
      setIsAccepting(false);
      setHasAccepted(false); // Reset if accept failed
      hasAcceptedRef.current = false; // Reset ref if accept failed
    }
  };

  const declineMatch = async () => {
    if (!match) return;
    try {
      await sendDecline(match.id);
      //setMatch(null);
      //stopSearching();
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
    setHasAccepted(false); // Reset acceptance state
    hasAcceptedRef.current = false; // Reset ref
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
    hasAccepted,
  };
};
