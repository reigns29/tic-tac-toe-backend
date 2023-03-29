import EventEmitter from "events"
import { v4 as uuid } from "uuid"

const activePlayers = {}
const GameQueue = {
  "/tic-tac-toe": [],
}
export const roomData = {
  "/tic-tac-toe": {},
}

const lobby = new EventEmitter()

lobby.on("addToGameLobby", async ({ io, playerId, account }) => {
  // TODO: check staked amount
  // get player socket
  const playerSocket = io.sockets.get(playerId)

  // check if already playing
  if (activePlayers[account]) return playerSocket.emit("error:playing_account")

  // set player active
  activePlayers[account] = true
  playerSocket.emit("wait")

  // set account on player socket
  playerSocket.data.account = account

  // Enqueue
  const len = GameQueue[playerSocket.nsp.name].push(playerId)

  if (len === 2) {
    const namespace = playerSocket.nsp.name
    const gameRoomId = uuid()
    const players = {}

    // join all players to room
    GameQueue[namespace].forEach((playerId, idx) => {
      // get socket from socketId
      const socket = io.sockets.get(playerId)
      // assign room playerId
      players[socket.data.account] = idx
      // gameRoomId on socket
      socket.data.gameRoomId = gameRoomId
      // join socket to gameRoom
      socket.join(gameRoomId)
    })
    // reset queue
    GameQueue[namespace] = []

    // init state
    const board = [null, null, null, null, null, null, null, null, null]
    const turn = 0
    const state = { board, turn, players }
    roomData[namespace][gameRoomId] = state
    // send ready confirmation to players
    io.in(gameRoomId).emit("ready", { state })
  }
})

lobby.on("removeFromGameLobby", ({ io, disconnectedPlayerId }) => {
  // get player socket
  const playerSocket = io.sockets.get(disconnectedPlayerId)
  // get player game room id and account
  const gameRoomId = playerSocket.data.gameRoomId
  const currentPlayerAccount = playerSocket.data.account

  if (gameRoomId) {
    // get all players (Set) from room
    const players = io.adapter.rooms.get(gameRoomId)

    // if no players in room means game is finished and just mark player as inactive
    if (!players) return delete activePlayers[currentPlayerAccount]

    // delete disconnected player id
    players.delete(disconnectedPlayerId)
    // get winner id by filtering disconnected player id
    const winnerId = [...players][0]
    const winnerSocket = io.sockets.get(winnerId)
    const winnerAccount = winnerSocket.data.account
    // declare winner
    lobby.emit("declareWinner", { io, winnerAccount, gameRoomId })
  } else {
    // Remove from Queue
    const namespace = playerSocket.nsp.name
    GameQueue[namespace] = GameQueue[namespace].filter((playerId) => playerId !== disconnectedPlayerId)
  }

  // set player in-active
  delete activePlayers[currentPlayerAccount]
})

lobby.on("declareWinner", ({ io, winnerAccount, gameRoomId }) => {
  // emit finish game event with winner account
  io.in(gameRoomId).emit("finish", winnerAccount)
  // destroy room
  io.socketsLeave(gameRoomId)

  // TODO: send prize to winner
})

lobby.on("declareDraw", ({ io, gameRoomId }) => {
  // emit finish game event without winner account
  io.in(gameRoomId).emit("finish")
  // destroy room
  io.socketsLeave(gameRoomId)
})

export default lobby
