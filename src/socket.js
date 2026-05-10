import { io } from "socket.io-client";

export const socket = io(process.env.REACT_APP_SOCKET_URL, {
  withCredentials: true,
});

socket.on("connect", () => {
  console.log("🔌 Socket connected to server:", socket.id);
});

socket.on("disconnect", (reason) => {
  console.log("🔌 Socket disconnected:", reason);
});

socket.on("connect_error", (error) => {
  console.error("🔌 Socket connection error:", error);
});