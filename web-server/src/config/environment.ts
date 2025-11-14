// Environment configuration v3.0
// CloudFront now proxies both frontend (S3) and backend (ALB)
// All requests go through CloudFront domain - no more mixed content issues!

const currentHost = window.location.hostname;

// Determine if we're running locally or on AWS
const isLocalDevelopment =
  currentHost === "localhost" || currentHost === "127.0.0.1";

// Base URLs for different environments
const LOCAL_BASE_URL = "http://localhost:3002";
// In production, use same-origin (CloudFront) for all API calls
// CloudFront will route /user/* /questions/* /matching/* /collaboration/* to ALB
const PROD_BASE_URL = window.location.origin;

export const config = {
  // API endpoints
  api: {
    baseUrl: isLocalDevelopment ? LOCAL_BASE_URL : PROD_BASE_URL,
    userService: isLocalDevelopment
      ? "http://localhost:3002"
      : `${PROD_BASE_URL}/user`,
    questionService: isLocalDevelopment
      ? "http://localhost:3003/questions"
      : `${PROD_BASE_URL}/questions/`, // Trailing slash to match CloudFront /questions/* pattern
    matchingService: isLocalDevelopment
      ? "http://localhost:3001"
      : `${PROD_BASE_URL}/matching`, // Not used for HTTP, only WebSocket
    collaborationService: isLocalDevelopment
      ? "http://localhost:3004/collaboration"
      : `${PROD_BASE_URL}/collaboration/`, // Trailing slash to match CloudFront /collaboration/* pattern
  },

  // WebSocket endpoints
  ws: {
    matchingService: isLocalDevelopment
      ? "ws://localhost:3001"
      : `wss://${window.location.host}/matching/`, // Trailing slash to match /matching/* CloudFront pattern
    collaborationService: isLocalDevelopment
      ? "http://localhost:3004"
      : `https://${window.location.host}`, // Socket.IO client will add /collaboration/socket.io path
  },

  // Auth endpoints
  auth: {
    github: isLocalDevelopment
      ? "http://localhost:3002/auth/github"
      : `${PROD_BASE_URL}/user/auth/github`,
    logout: isLocalDevelopment
      ? "http://localhost:3002/auth/logout"
      : `${PROD_BASE_URL}/user/auth/logout`,
    refresh: isLocalDevelopment
      ? "http://localhost:3002/auth/refresh"
      : `${PROD_BASE_URL}/user/auth/refresh`,
    token: isLocalDevelopment
      ? "http://localhost:3002/token"
      : `${PROD_BASE_URL}/user/token`,
    profile: isLocalDevelopment
      ? "http://localhost:3002/profile"
      : `${PROD_BASE_URL}/user/profile`,
  },

  // Environment flags
  isDevelopment: isLocalDevelopment,
  isProduction: !isLocalDevelopment,
};

// Helper to build API URLs
export const getApiUrl = (
  service: keyof typeof config.api,
  path: string = ""
): string => {
  const baseUrl = config.api[service];
  // Remove leading slash from path to avoid double slashes
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  return cleanPath ? `${baseUrl}/${cleanPath}` : baseUrl;
};

export default config;
