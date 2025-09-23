const WebSocket = require('ws');
const http = require('http');
const express = require('express');

// Simple WebSocket server for random chess matching
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Serve static files (for health check)
app.get('/', (req, res) => {
  res.json({ 
    status: 'Chess Online Server Running',
    players: waitingPlayers.size,
    games: activeGames.size,
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Store waiting players and active games
const waitingPlayers = new Map();
const activeGames = new Map();

console.log('Chess Online Server Starting...');

wss.on('connection', (ws) => {
  console.log('New player connected');
  
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      handleMessage(ws, message);
    } catch (error) {
      console.error('Invalid message:', error);
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
    case 'make_move':
      handleMove(ws, message);
      break;
    case 'disconnect':
      handleDisconnect(ws);
      break;
  }
}

function addToQueue(ws) {
  // Add player to waiting queue
  const playerId = generatePlayerId();
  waitingPlayers.set(playerId, { ws, timestamp: Date.now() });
  
  console.log(`Player ${playerId} added to queue. Queue size: ${waitingPlayers.size}`);
  
  // Try to find a match
  if (waitingPlayers.size >= 2) {
    matchPlayers();
  } else {
    // Send waiting message
    ws.send(JSON.stringify({
      type: 'waiting',
      message: 'Searching for opponent...'
    }));
  }
}

function matchPlayers() {
  if (waitingPlayers.size < 2) return;
  
  // Get first two players (FIFO - first in, first out)
  const players = Array.from(waitingPlayers.entries()).slice(0, 2);
  const [player1Id, player1] = players[0];
  const [player2Id, player2] = players[1];
  
  // Create game room
  const roomId = generateRoomId();
  const game = {
    roomId,
    player1: { id: player1Id, ws: player1.ws, color: 'w', playerId: 'player1' },
    player2: { id: player2Id, ws: player2.ws, color: 'b', playerId: 'player2' },
    moves: [],
    status: 'active',
    createdAt: Date.now()
  };
  
  activeGames.set(roomId, game);
  
  // Remove from waiting queue
  waitingPlayers.delete(player1Id);
  waitingPlayers.delete(player2Id);
  
  console.log(`Game ${roomId} created: ${player1Id} vs ${player2Id}`);
  
  // Notify both players
  player1.ws.send(JSON.stringify({
    type: 'game_found',
    roomId: roomId,
    playerId: 'player1',
    color: 'w',
    message: 'Game found! You are White.'
  }));
  
  player2.ws.send(JSON.stringify({
    type: 'game_found',
    roomId: roomId,
    playerId: 'player2',
    color: 'b',
    message: 'Game found! You are Black.'
  }));
}

function handleMove(ws, message) {
  const game = activeGames.get(message.roomId);
  if (!game) return;
  
  // Validate it's the player's turn
  const currentPlayer = game.player1.ws === ws ? game.player1 : game.player2;
  const opponent = game.player1.ws === ws ? game.player2 : game.player1;
  
  // Add move to game
  game.moves.push({
    move: message.move,
    playerId: message.playerId,
    timestamp: Date.now()
  });
  
  // Send move to opponent
  opponent.ws.send(JSON.stringify({
    type: 'move_received',
    move: message.move,
    roomId: message.roomId
  }));
  
  console.log(`Move made in game ${message.roomId} by ${message.playerId}: ${JSON.stringify(message.move)}`);
}

function handleDisconnect(ws) {
  // Remove from waiting queue
  for (const [playerId, player] of waitingPlayers.entries()) {
    if (player.ws === ws) {
      waitingPlayers.delete(playerId);
      console.log(`Player ${playerId} disconnected from queue`);
      break;
    }
  }
  
  // Handle active game disconnection
  for (const [roomId, game] of activeGames.entries()) {
    if (game.player1.ws === ws || game.player2.ws === ws) {
      const opponent = game.player1.ws === ws ? game.player2 : game.player1;
      opponent.ws.send(JSON.stringify({
        type: 'opponent_disconnected',
        message: 'Your opponent has disconnected.'
      }));
      
      activeGames.delete(roomId);
      console.log(`Game ${roomId} ended due to disconnection`);
      break;
    }
  }
}

function generatePlayerId() {
  return 'player_' + Math.random().toString(36).substr(2, 9);
}

function generateRoomId() {
  return 'room_' + Math.random().toString(36).substr(2, 9);
}

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Chess Online Server running on port ${PORT}`);
  console.log('Players can connect to: ws://localhost:' + PORT);
});

// Clean up old waiting players (5 minutes timeout)
setInterval(() => {
  const now = Date.now();
  for (const [playerId, player] of waitingPlayers.entries()) {
    if (now - player.timestamp > 5 * 60 * 1000) { // 5 minutes
      player.ws.close();
      waitingPlayers.delete(playerId);
      console.log(`Removed stale player ${playerId}`);
    }
  }
}, 60000); // Check every minute
