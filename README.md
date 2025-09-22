# Chess Online Server

Simple WebSocket server for random chess player matching.

## Features
- Random player matching (first come, first served)
- Real-time move broadcasting
- Automatic disconnect handling
- No ratings or complexity

## Quick Deploy Options

### Option 1: Heroku (Recommended)
1. Create account at [heroku.com](https://heroku.com)
2. Install Heroku CLI
3. Run these commands:
```bash
heroku create your-chess-server
git add .
git commit -m "Initial chess server"
git push heroku main
```

### Option 2: Railway
1. Go to [railway.app](https://railway.app)
2. Connect your GitHub repo
3. Deploy automatically

### Option 3: Render
1. Go to [render.com](https://render.com)
2. Create new Web Service
3. Connect your repo
4. Set build command: `npm install`
5. Set start command: `npm start`

## Environment Variables
- `PORT`: Server port (automatically set by hosting platform)

## API Endpoints
- `GET /` - Server status
- `GET /health` - Health check
- `WebSocket /` - Game connection

## WebSocket Messages

### Client to Server:
```json
{"type": "find_game"}
{"type": "make_move", "roomId": "room_123", "move": "e2e4"}
```

### Server to Client:
```json
{"type": "game_found", "roomId": "room_123", "color": "w"}
{"type": "move_received", "move": "e2e4"}
{"type": "opponent_disconnected"}
```

## Testing
1. Deploy the server
2. Update the WebSocket URL in your extension
3. Test with multiple browser windows
