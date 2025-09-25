const WebSocket = require('ws');
const http = require('http');
const express = require('express');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Store waiting players and active games
const waitingPlayers = new Map();
const activeGames = new Map();

// Player ID counter
let playerIdCounter = 1;

// Serve static files
app.use(express.static('.'));

// WebSocket connection handling
wss.on('connection', (ws) => {
  console.log('New WebSocket connection');
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      handleMessage(ws, data);
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  });
  
  ws.on('close', () => {
    handleDisconnect(ws);
  });
});

function handleMessage(ws, message) {
  switch(message.type) {
    case 'find_game':
      addToQueue(ws);
      break;
    case 'cancel_search':
      removeFromQueue(ws);
      break;
    case 'make_move':
      handleMove(ws, message);
      break;
    case 'disconnect':
      handleDisconnect(ws);
      break;
  }
}

function addToQueue(ws) {
  const playerId = playerIdCounter++;
  const player = {
    id: playerId,
    ws: ws,
    timestamp: Date.now()
  };
  
  waitingPlayers.set(playerId, player);
  ws.playerId = playerId;
  
  console.log(`Player ${playerId} added to queue. Queue size: ${waitingPlayers.size}`);
  
  // Send waiting confirmation
  ws.send(JSON.stringify({
    type: 'waiting',
    playerId: playerId
  }));
  
  // Try to match players
  if (waitingPlayers.size >= 2) {
    matchPlayers();
  }
}

function removeFromQueue(ws) {
  // Find and remove player from waiting queue
  for (const [playerId, player] of waitingPlayers.entries()) {
    if (player.ws === ws) {
      waitingPlayers.delete(playerId);
      console.log(`Player ${playerId} removed from queue. Queue size: ${waitingPlayers.size}`);
      break;
    }
  }
}

function matchPlayers() {
  if (waitingPlayers.size < 2) return;
  
  // Get first two players
  const players = Array.from(waitingPlayers.values()).slice(0, 2);
  const player1 = players[0];
  const player2 = players[1];
  
  // Remove from waiting queue
  waitingPlayers.delete(player1.id);
  waitingPlayers.delete(player2.id);
  
  // Create game room
  const roomId = `room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const game = {
    roomId: roomId,
    player1: player1,
    player2: player2,
    currentTurn: 'w', // White goes first
    board: null, // Will be initialized by client
    moves: []
  };
  
  activeGames.set(roomId, game);
  
  // Assign colors
  const player1Color = Math.random() < 0.5 ? 'w' : 'b';
  const player2Color = player1Color === 'w' ? 'b' : 'w';
  
  // Notify both players
  player1.ws.send(JSON.stringify({
    type: 'game_found',
    roomId: roomId,
    playerId: player1.id,
    color: player1Color,
    opponentId: player2.id
  }));
  
  player2.ws.send(JSON.stringify({
    type: 'game_found',
    roomId: roomId,
    playerId: player2.id,
    color: player2Color,
    opponentId: player1.id
  }));
  
  console.log(`Game ${roomId} created: Player ${player1.id} (${player1Color}) vs Player ${player2.id} (${player2Color})`);
}

function handleMove(ws, message) {
  const { roomId, move, playerId } = message;
  const game = activeGames.get(roomId);
  
  if (!game) {
    console.error(`Game ${roomId} not found`);
    return;
  }
  
  // Validate it's the player's turn
  const isPlayer1 = game.player1.id === playerId;
  const isPlayer2 = game.player2.id === playerId;
  
  if (!isPlayer1 && !isPlayer2) {
    console.error(`Player ${playerId} not in game ${roomId}`);
    return;
  }
  
  // Add move to game history
  game.moves.push({
    playerId: playerId,
    move: move,
    timestamp: Date.now()
  });
  
  // Switch turns
  game.currentTurn = game.currentTurn === 'w' ? 'b' : 'w';
  
  // Send move to opponent
  const opponent = isPlayer1 ? game.player2 : game.player1;
  opponent.ws.send(JSON.stringify({
    type: 'move_received',
    move: move,
    currentTurn: game.currentTurn
  }));
  
  console.log(`Move in ${roomId}: Player ${playerId} moved`);
}

function handleDisconnect(ws) {
  // Remove from waiting queue
  removeFromQueue(ws);
  
  // Handle active games
  for (const [roomId, game] of activeGames.entries()) {
    if (game.player1.ws === ws || game.player2.ws === ws) {
      const opponent = game.player1.ws === ws ? game.player2 : game.player1;
      
      // Notify opponent
      if (opponent.ws.readyState === WebSocket.OPEN) {
        opponent.ws.send(JSON.stringify({
          type: 'opponent_disconnected'
        }));
      }
      
      // Remove game
      activeGames.delete(roomId);
      console.log(`Game ${roomId} ended due to disconnect`);
    }
  }
}

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Chess server running on port ${PORT}`);
});
