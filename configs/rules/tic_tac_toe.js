const Patterns = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
]

export const checkValidMove = ({ board, players, turn }, { account, square }) => {
  return turn === players[account] && board[square] === null
}

export const checkWin = ({ board, players, turn }, account) => {
  let win = false
  Patterns.forEach((pattern) => {
    if (board[pattern[0]] === players[account] && board[pattern[1]] === players[account] && board[pattern[2]] === players[account])
      win = true
  })
  return win
}

export const checkIfTie = ({ board, players, turn }) => {
  let filled = true
  board.forEach((square) => {
    if (square === null) filled = false
  })

  return filled
}
