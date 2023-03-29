// Global Exception Handler
process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION! Shutting down...")
  console.error(err.name, err.message)
  if (process.env.NODE_ENV === "production") process.exit(1)
})

import "./configs/dotenv/config.js"
import RedisClient from "./configs/redis/client.js"
import { Server } from "socket.io"
import lobby from "./configs/lobby/config.js"

const io = new Server({
  serveClient: false,
  cors: { origin: process.env.CLIENT_ORIGIN_URL },
})

const ticTakToeNamespace = io.of("/tic-tac-toe")

ticTakToeNamespace.on("connection", (socket) => {
  console.log("connected")

  socket.on("addToGameLobby", async ({ account }) => {
    lobby.emit("addToGameLobby", { io: ticTakToeNamespace, playerId: socket.id, account })
  })

  socket.on("state:server", () => {})

  socket.on("disconnecting", async () => {
    lobby.emit("removeFromGameLobby", { io: ticTakToeNamespace, disconnectedPlayerId: socket.id })
    console.log("disconnected")
  })
})

const port = process.env.PORT || 3000
const server = io.listen(port)

// Global Promise Rejection Handler
process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED REJECTION!")
  console.error(err.name, err.message)
  server.close(() => process.env.NODE_ENV === "production" && process.exit(1))
})

// SIGTERM Handler
process.on("SIGTERM", () => {
  console.error("SIGTERM RECEIVED!")
  server.close(() => console.log("Process terminated!"))
})
