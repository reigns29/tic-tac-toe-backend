// Global Exception Handler
process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION! Shutting down...")
  console.error(err.name, err.message)
  if (process.env.NODE_ENV === "production") process.exit(1)
})

import "./configs/dotenv/config.js"
import { Server } from "socket.io"
import lobby, { roomData } from "./configs/lobby/config.js"
import { checkIfTie, checkWin, checkValidMove } from "./configs/rules/tic_tac_toe.js"

const io = new Server({
  serveClient: false,
  cors: { origin: process.env.CLIENT_ORIGIN_URL },
})

const ticTakToeNamespace = io.of("/tic-tac-toe")

ticTakToeNamespace.on("connection", (socket) => {
  socket.on("addToGameLobby", async ({ account }) => {
    lobby.emit("addToGameLobby", { io: ticTakToeNamespace, playerId: socket.id, account })
  })

  socket.on("disconnecting", async () => {
    lobby.emit("removeFromGameLobby", { io: ticTakToeNamespace, disconnectedPlayerId: socket.id })
  })

  socket.on("state:server", async ({ square }) => {
    const currentPlayerAccount = socket.data.account
    const gameRoomId = socket.data.gameRoomId
    const state = roomData[socket.nsp.name][gameRoomId]

    if (checkValidMove(state, { account: currentPlayerAccount, square })) {
      // Update state
      state.board[square] = state.players[currentPlayerAccount]
      state.turn = +!state.turn

      // Send updated state
      ticTakToeNamespace.in(gameRoomId).emit("state:client", { state })

      // check new state
      if (checkWin(state, currentPlayerAccount))
        lobby.emit("declareWinner", { io: ticTakToeNamespace, gameRoomId, winnerAccount: currentPlayerAccount })
      else if (checkIfTie(state)) lobby.emit("declareDraw", { io: ticTakToeNamespace, gameRoomId })
    }
  })
})

const port = process.env.PORT || 3000
const server = io.listen(port)

// Global Promise Rejection Handler
process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED REJECTION!")
  console.error(err.name, err.message)
  console.error(err)
  server.close(() => process.env.NODE_ENV === "production" && process.exit(1))
})

// SIGTERM Handler
process.on("SIGTERM", () => {
  console.error("SIGTERM RECEIVED!")
  server.close(() => console.log("Process terminated!"))
})
