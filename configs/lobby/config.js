import EventEmitter from "events"
import { v4 as uuid } from "uuid"

const activePlayers = {}
let GameQueue = []

const lobby = new EventEmitter()

lobby.on("addToGameLobby", ({ io, playerId, account }) => {
  // TODO: check staked amount
  // get player socket
  const playerSocket = io.sockets.get(playerId)

  // check if already playing
  // if (activePlayers[account]) return playerSocket.send("error:playing_account")

  // set player active
  activePlayers[account] = true
  playerSocket.emit("wait")

  // set account on player socket
  playerSocket.data.account = account

  // Enqueue
  const len = GameQueue.push(playerId)

  if (len === 2) {
    const gameRoomId = uuid()
    // join all players to room
    GameQueue.forEach((playerId) => {
      // get socket from socketId
      const socket = io.sockets.get(playerId)
      // gameRoomId on socket
      socket.data.gameRoomId = gameRoomId
      // join socket to gameRoom
      socket.join(gameRoomId)
    })
    // reset queue
    GameQueue = []
    // send ready confirmation to players
    io.in(gameRoomId).emit("ready")
  }
})

lobby.on("removeFromGameLobby", ({ io, disconnectedPlayerId }) => {
  // get player socket
  const playerSocket = io.sockets.get(disconnectedPlayerId)
  // get player game room id
  const gameRoomId = playerSocket.data.gameRoomId

  if (gameRoomId) {
    // get all players (Set) from room
    const players = io.adapter.rooms.get(gameRoomId)

    // if no players in room means game is finished and just mark player as inactive
    if (!players) return delete activePlayers[playerSocket.data.account]

    // delete disconnected player id
    players.delete(disconnectedPlayerId)
    // get winner id by filtering disconnected player id
    const winnerId = [...players][0]
    // declare winner
    lobby.emit("declareWinner", { io, winnerId })
  } else {
    // Remove from Queue
    GameQueue = GameQueue.filter((playerId) => playerId !== disconnectedPlayerId)
  }

  // set player in-active
  delete activePlayers[playerSocket.data.account]
})

lobby.on("declareWinner", ({ io, winnerId }) => {
  const winnerSocket = io.sockets.get(winnerId)
  const gameRoomId = winnerSocket.data.gameRoomId
  const winnerAccount = winnerSocket.data.account

  // emit finish game event wither winner account
  io.in(gameRoomId).emit("finish", winnerAccount)
  // destroy room
  io.socketsLeave(gameRoomId)

  // TODO: send prize to winner
})

export default lobby
