import express from "express";
import { createServer as createViteServer } from "vite";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";

async function startServer() {
  const app = express();
  const PORT = 3000;
  const httpServer = createServer(app);
  
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Multiplayer state
  const rooms = new Map<string, {
    users: { id: string, name: string }[],
    playingChannel: any | null
  }>();

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join_room", ({ roomId, userName }) => {
      socket.join(roomId);
      
      if (!rooms.has(roomId)) {
        rooms.set(roomId, { users: [], playingChannel: null });
      }
      
      const room = rooms.get(roomId)!;
      room.users.push({ id: socket.id, name: userName });
      
      // Send current state to the new user
      socket.emit("room_state", room);
      
      // Notify others
      socket.to(roomId).emit("user_joined", { id: socket.id, name: userName });
      
      // Store roomId on socket for disconnect handling
      (socket as any).roomId = roomId;
    });

    socket.on("change_channel", ({ roomId, channel }) => {
      const room = rooms.get(roomId);
      if (room) {
        room.playingChannel = channel;
        io.to(roomId).emit("channel_changed", channel);
      }
    });

    socket.on("chat_message", ({ roomId, userName, message }) => {
      io.to(roomId).emit("chat_message", { userName, message, timestamp: Date.now() });
    });

    socket.on("disconnect", () => {
      const roomId = (socket as any).roomId;
      if (roomId && rooms.has(roomId)) {
        const room = rooms.get(roomId)!;
        room.users = room.users.filter(u => u.id !== socket.id);
        
        socket.to(roomId).emit("user_left", socket.id);
        
        if (room.users.length === 0) {
          rooms.delete(roomId);
        }
      }
      console.log("User disconnected:", socket.id);
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
