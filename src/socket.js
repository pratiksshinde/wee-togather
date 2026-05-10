import { io } from "socket.io-client";

export const socket = io(import.meta.env.VITE_SOCKET_URL, {
  withCredentials: true,
});
console.log("🔌 Attempting to connect to socket server at:", import.meta.env.VITE_SOCKET_URL);
socket.on("connect", () => {
  console.log("🔌 Socket connected to server:", socket.id);
});

socket.on("disconnect", (reason) => {
  console.log("🔌 Socket disconnected:", reason);
});

socket.on("connect_error", (error) => {
  console.error("🔌 Socket connection error:", error);
});