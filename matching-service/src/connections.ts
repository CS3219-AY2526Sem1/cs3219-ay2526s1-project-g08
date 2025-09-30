import WebSocket from "ws";

// Global map tied to the container lifecycle
export const activeConnections: Map<string, WebSocket> = new Map();
