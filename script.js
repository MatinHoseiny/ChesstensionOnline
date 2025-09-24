/*
  Chesstention – focused fixes build
  - Background video fixed to media/menu-background.mp4
  - "Play vs Computer" tray behaves correctly (no disabled side buttons, toggle active state)
  - "Join/Create Room" button shows its panels
  - Opening one tray closes the other (no overlap)
  - No principal logic changes beyond the requested UI behavior
*/

(() => {
  /* ---------------- Video bg (lock to menu-background.mp4) ---------------- */
  const bgVideoEl = document.getElementById("bgVideo");
  if (bgVideoEl) {
    // Keep the <source> tag in HTML, but also set the element's src directly for reliability
    const fixedSrc =
      (typeof chrome !== "undefined" && chrome.runtime?.getURL)
        ? chrome.runtime.getURL("media/menu-background.mp4")
        : "media/menu-background.mp4";
    bgVideoEl.src = fixedSrc;
    
    // Smooth video looping solution
    bgVideoEl.addEventListener('timeupdate', function() {
      // When video is near the end (last 0.5 seconds), prepare for smooth loop
      if (this.duration - this.currentTime < 0.5) {
        this.style.opacity = '0.3';
      }
    });
    
    bgVideoEl.addEventListener('ended', function() {
      // Fade out slightly before restarting
      this.style.opacity = '0.3';
      this.currentTime = 0;
      this.play();
      // Fade back in after a brief moment
      setTimeout(() => {
        this.style.opacity = '0.55';
      }, 100);
    });
    
    // Ensure smooth playback
    bgVideoEl.addEventListener('canplay', function() {
      this.style.opacity = '0.55';
    });
  }

  /* ---------------- Pieces ---------------- */
  const PIECES = {
    w: { K:"images/w_king.svg", Q:"images/w_queen.svg", R:"images/w_rook.svg", B:"images/w_bishop.svg", N:"images/w_knight.svg", P:"images/w_pawn.svg" },
    b: { K:"images/b_king.svg", Q:"images/b_queen.svg", R:"images/b_rook.svg", B:"images/b_bishop.svg", N:"images/b_knight.svg", P:"images/b_pawn.svg" },
  };
  const getURL = (p)=>{
    try {
      const baseUrl = (typeof chrome!=="undefined" && chrome.runtime?.getURL) ? chrome.runtime.getURL(p) : p;
      // Add cache-busting parameter to force reload of updated SVGs
      return baseUrl + '?v=' + Date.now();
    } catch { return p; }
  };

  /* ---------------- DOM ---------------- */
  const menuScreenEl   = document.getElementById("menuScreen");
  const gameScreenEl   = document.getElementById("gameScreen");
  const boardEl        = document.getElementById("board");
  const turnIndicatorEl= document.getElementById("turnIndicator");
  const gameStatusEl   = document.getElementById("gameStatus");
  const newGameBtn     = document.getElementById("newGameBtn");
  const toggleAiBtn    = document.getElementById("toggleAiBtn");
  const aiWhiteBtn     = document.getElementById("aiWhiteBtn");
  const aiBlackBtn     = document.getElementById("aiBlackBtn");
  const cpuOptionsEl   = document.getElementById("cpuOptions");
  const bannerEl       = document.getElementById("banner");
  const statusBarEl    = document.querySelector(".status-bar");
  const overlayEl      = document.getElementById("overlay");
  const overlayTitleEl = document.getElementById("overlayTitle");
  const overlaySubEl   = document.getElementById("overlaySub");
  const overlayActionsEl= document.getElementById("overlayActions");
  const promoPanelEl   = document.getElementById("promoPanel");
  const playAgainBtn   = document.getElementById("playAgainBtn");
  const capturedByWhiteEl = document.getElementById("capturedByWhite");
  const capturedByBlackEl = document.getElementById("capturedByBlack");
  const backToMenuBtn  = document.getElementById("backToMenuBtn");
  const undoBtn        = document.getElementById("undoBtn");
  const redoBtn        = document.getElementById("redoBtn");
  let   themeBtn       = document.getElementById("themeBtn");

  // Join/Create controls
  const openJoinPanelBtn = document.getElementById("openJoinPanel");
  const joinPanel        = document.getElementById("joinPanel");
  const createPanel      = document.getElementById("createPanel");
// --- Profile DOM ---
const profilePanel      = document.getElementById('profilePanel');
const profileNameInput  = document.getElementById('profileName');
const profilePicInput   = document.getElementById('profilePic');
const profileSaveBtn    = document.getElementById('profileSaveBtn');
const profileClearBtn   = document.getElementById('profileClearBtn');
const profilePreviewImg = document.getElementById('profilePreview');
const profilePreviewName= document.getElementById('profilePreviewName');

// Bottom tabs removed

// Online Chess System - Completely Rewritten
class OnlineChess {
  constructor() {
    this.ws = null;
    this.roomId = null;
    this.isOnline = false;
    this.isWaiting = false;
    this.playerId = null;
    this.playerColor = null; // 'w' or 'b'
    this.isMyTurn = false;
  }
  
  connect() {
    // Connect to public chess server
    this.ws = new WebSocket('wss://web-production-e734b.up.railway.app');
    
    this.ws.onopen = () => {
      console.log('Connected to online server');
    };
    
    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.handleMessage(message);
    };
    
    this.ws.onclose = () => {
      console.log('Disconnected from server');
      this.isOnline = false;
      this.isWaiting = false;
      this.updateUI('disconnected');
    };
    
    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.updateUI('disconnected');
    };
  }
  
  handleMessage(message) {
    console.log('Received message:', message);
    switch(message.type) {
      case 'game_found':
        this.startOnlineGame(message.roomId, message.playerId, message.color);
        break;
      case 'move_received':
        this.applyOpponentMove(message.move);
        break;
      case 'opponent_disconnected':
        this.handleOpponentDisconnect();
        break;
      case 'waiting':
        this.updateUI('searching');
        break;
    }
  }
  
  findGame() {
    console.log('Finding game...');
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.log('Connecting to server...');
      this.connect();
      // Wait for connection then find game
      this.ws.onopen = () => {
        console.log('Connected! Sending find game request...');
        this.sendFindGame();
      };
    } else {
      console.log('Already connected, sending find game request...');
      this.sendFindGame();
    }
  }
  
  sendFindGame() {
    this.ws.send(JSON.stringify({
      type: 'find_game',
      timestamp: Date.now()
    }));
    this.isWaiting = true;
    this.updateUI('searching');
  }
  
  startOnlineGame(roomId, playerId, color) {
    this.roomId = roomId;
    this.playerId = playerId;
    this.playerColor = color;
    this.isOnline = true;
    this.isWaiting = false;
    
    // Determine if it's my turn (white goes first)
    this.isMyTurn = (color === 'w');
    
    console.log(`Game started! I am ${color === 'w' ? 'White' : 'Black'}, my turn: ${this.isMyTurn}`);
    
    // Start the game
    aiEnabled = false;
    resetGame();
    showGameScreen();
    this.updateUI('playing');
    
    // Update turn indicator
    this.updateTurnIndicator();
    
    // Force update the UI to show correct turn state
    updateAll();
  }
  
  applyOpponentMove(moveData) {
    console.log('Applying opponent move:', moveData);
    
    // Temporarily disable online checks for opponent moves
    const wasOnline = this.isOnline;
    this.isOnline = false;
    
    // Use the existing makeMove function to properly apply the move
    const { from, to, meta } = moveData;
    makeMove(from.r, from.c, to.r, to.c, meta);
    
    // Restore online state
    this.isOnline = wasOnline;
    
    // Update turn - now it's my turn
    this.isMyTurn = true;
    turn = this.playerColor;
    
    // Clear any selected pieces and legal moves
    selected = null;
    legalMoves = [];
    
    // Update UI
    updateAll();
    this.updateTurnIndicator();
    
    console.log(`Opponent move applied. Now it's my turn (${this.playerColor})`);
  }
  
  sendMove(moveData) {
    if (this.isOnline && this.ws && this.isMyTurn) {
      console.log('Sending move:', moveData);
      this.ws.send(JSON.stringify({
        type: 'make_move',
        roomId: this.roomId,
        move: moveData,
        playerId: this.playerId
      }));
      
      // Update turn
      this.isMyTurn = false;
      turn = this.playerColor === 'w' ? 'b' : 'w';
      this.updateTurnIndicator();
    }
  }
  
  // Check if player can make moves
  canMakeMove() {
    if (!this.isOnline) return true; // Local games always allow moves
    return this.isMyTurn;
  }
  
  // Check if player can select this piece
  canSelectPiece(piece) {
    if (!this.isOnline) return true; // Local games allow all selections
    if (!piece) return false;
    
    // Only allow selecting own pieces
    return piece.color === this.playerColor;
  }
  
  // Update turn after move
  updateTurnAfterMove() {
    if (this.isOnline) {
      this.isMyTurn = false;
      // Don't change the global turn variable - let the opponent's move handle it
      this.updateTurnIndicator();
      
      // Force UI update to show the move with a small delay
      setTimeout(() => {
        updateAll();
      }, 10);
      
      console.log(`Turn updated after my move. Now waiting for opponent.`);
    }
  }
  
  updateTurnIndicator() {
    const turnIndicator = document.getElementById('turnIndicator');
    if (turnIndicator) {
      if (this.isOnline) {
        const myTurn = this.isMyTurn;
        const myColor = this.playerColor === 'w' ? 'White' : 'Black';
        const opponentColor = this.playerColor === 'w' ? 'Black' : 'White';
        
        turnIndicator.textContent = myTurn 
          ? `Your turn (${myColor})` 
          : `Waiting for ${opponentColor}`;
        turnIndicator.className = `turn-indicator ${myTurn ? 'my-turn' : 'opponent-turn'}`;
        
        console.log(`Turn indicator updated: ${turnIndicator.textContent}, myTurn: ${myTurn}`);
      } else {
        turnIndicator.textContent = turn === 'w' ? 'White to move' : 'Black to move';
        turnIndicator.className = 'turn-indicator';
      }
    }
  }
  
  updateUI(state) {
    const btn = document.getElementById('playOnlineBtn');
    if (!btn) return;
    
    switch(state) {
      case 'searching':
        btn.textContent = 'Searching for opponent...';
        btn.disabled = true;
        break;
      case 'playing':
        btn.textContent = 'Playing Online';
        btn.disabled = true;
        break;
      case 'disconnected':
        btn.textContent = 'Play Online';
        btn.disabled = false;
        break;
    }
  }
  
  handleOpponentDisconnect() {
    this.isOnline = false;
    this.updateUI('disconnected');
    alert('Opponent disconnected. Returning to menu.');
    showMenuScreen();
  }
}

// Initialize online chess
let onlineChess;
try {
  onlineChess = new OnlineChess();
} catch (error) {
  console.error('Failed to initialize online chess:', error);
  onlineChess = null;
}

// In-game player chip
// Player info removed - no profile concept

const PROFILE_KEY = 'chesstention:profile'; // { name: string, avatarDataURL: string|null }

// Save name + (optionally) current preview
if (profileSaveBtn){
  profileSaveBtn.addEventListener('click', ()=>{
    PROFILE.name = (profileNameInput.value || '').trim();
    // if there’s a preview image shown, keep it; otherwise retain previous
    updateProfilePreviewUI(PROFILE);
    saveProfile(PROFILE);
    // reflect into in-game chip if already in a game vs AI
  });
}

// Clear avatar only (keep name)
if (profileClearBtn){
  profileClearBtn.addEventListener('click', ()=>{
    PROFILE.avatarDataURL = null;
    updateProfilePreviewUI(PROFILE);
    saveProfile(PROFILE);
  });
}

// When a new file is picked, preview it; save on "Save"
if (profilePicInput){
  profilePicInput.addEventListener('change', (e)=>{
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      PROFILE.avatarDataURL = reader.result; // data URL
      updateProfilePreviewUI(PROFILE);
      // do not auto-save until user clicks Save (feel free to auto-save if you prefer)
    };
    reader.readAsDataURL(file);
  });
}

function loadProfile(){
  let p = null;
  if (typeof chrome !== "undefined" && chrome.storage?.local){
    // synchronous use via callback isn’t needed here; we’ll mirror localStorage for simplicity
    try { p = JSON.parse(localStorage.getItem(PROFILE_KEY)); } catch {}
  } else {
    try { p = JSON.parse(localStorage.getItem(PROFILE_KEY)); } catch {}
  }
  if (!p) p = { name: '', avatarDataURL: null };
  return p;
}

function saveProfile(p){
  localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
}

function updateProfilePreviewUI(p){
  if (!profilePanel) return;
  if (profileNameInput) profileNameInput.value = p.name || '';
  if (profilePreviewName) profilePreviewName.textContent = p.name || '';
  if (profilePreviewImg) profilePreviewImg.src = p.avatarDataURL || '';
}

// Player info functionality removed

  /* ---------------- Game state ---------------- */
  let board=null, turn="w", selected=null, legalMoves=[], boardFlipped=false;
  let enPassantTarget=null, castlingRights=null, capturedByWhite=[], capturedByBlack=[];
  let gameOver=false, lastMove=null, pendingPromotion=null;
  let aiEnabled=false, aiColor="b", aiDepth=2;
  
  // Function to determine if board should be flipped
  function shouldFlipBoard() {
    if (typeof onlineChess !== 'undefined' && onlineChess.isOnline) {
      // In online mode, flip if player is black
      return onlineChess.playerColor === 'b';
    } else if (aiEnabled) {
      // In AI mode, flip if player is black (opposite of AI color)
      return aiColor === 'w'; // If AI is white, player is black
    }
    return false; // Default: no flip
  }
// Load existing profile into UI at start
let PROFILE = loadProfile();
updateProfilePreviewUI(PROFILE);
  // Undo/Redo
  const history=[], future=[];
  let suppressAIMove=false;

  // UI open-state (for exclusive trays)
  let cpuTrayOpen = false;
  let joinTrayOpen = false;

  /* ---------------- Theme ---------------- */
  const THEME_KEY="chesscursor:theme";
  let theme="classic";
  let themeStyleEl=null;
  const THEMES={
    classic:{ light:"#f0d9b5", dark:"#b58863" },
    green:  { light:"#EEEED2", dark:"#769656" },
    blue:   { light:"#f0f0dc", dark:"#3c70a4" }
  };
  function syncThemeBtnUI(){
    if (!themeBtn) return;
    // Remove active class from all indicators
    const indicators = themeBtn.querySelectorAll('.theme-indicator');
    indicators.forEach(indicator => indicator.classList.remove('active'));
    
    // Add active class to current theme indicator
    if (theme === 'green') {
      indicators[1].classList.add('active');
    } else if (theme === 'blue') {
      indicators[2].classList.add('active');
    } else {
      indicators[0].classList.add('active');
    }
  }
  function applyTheme(name){
    theme = THEMES[name] ? name : "classic";
    const { light,dark } = THEMES[theme];
    if (!themeStyleEl){
      themeStyleEl=document.createElement("style");
      themeStyleEl.id="chess-theme-style";
      document.head.appendChild(themeStyleEl);
    }
    themeStyleEl.textContent = `
      .light { background:${light} !important; }
      .dark  { background:${dark}  !important; }
    `;
    syncThemeBtnUI();
    if (typeof chrome !== "undefined" && chrome.storage?.local)
      chrome.storage.local.set({ [THEME_KEY]:theme });
    else
      localStorage.setItem(THEME_KEY, theme);
  }
  function loadTheme(){
    const set=(t)=>applyTheme(t||"classic");
    if (typeof chrome!=="undefined" && chrome.storage?.local)
      chrome.storage.local.get(THEME_KEY,(r)=>set(r?.[THEME_KEY]));
    else
      set(localStorage.getItem(THEME_KEY));
  }
  if (!themeBtn){
    const center=document.querySelector(".status-center");
    if (center){
      themeBtn=document.createElement("button");
      themeBtn.id="themeBtn";
      themeBtn.type="button";
      themeBtn.className="theme-inline classic";
      themeBtn.title="Toggle theme";
      themeBtn.setAttribute("aria-label","Toggle theme");
      themeBtn.textContent="●";
      center.insertBefore(themeBtn, document.getElementById("gameStatus"));
    }
  }
if (themeBtn){
  // Individual color dot clicks
  const indicators = themeBtn.querySelectorAll('.theme-indicator');
  
  // Classic theme (brown dot)
  indicators[0].addEventListener("click", (e)=>{
    e.stopPropagation();
    applyTheme("classic");
  });
  
  // Green theme (green dot)
  indicators[1].addEventListener("click", (e)=>{
    e.stopPropagation();
    applyTheme("green");
  });
  
  // Blue theme (blue dot)
  indicators[2].addEventListener("click", (e)=>{
    e.stopPropagation();
    applyTheme("blue");
  });
}

  /* ---------------- Persistence ---------------- */
  const STORAGE_KEY="chesscursor:v1";
  const snapshotState = () => ({
  board, turn, enPassantTarget, castlingRights,
  capturedByWhite, capturedByBlack, gameOver, lastMove,
  aiEnabled, aiColor, aiDepth
});
  function saveState(){
    const data=snapshotState();
    if (typeof chrome!=="undefined" && chrome.storage?.local)
      chrome.storage.local.set({ [STORAGE_KEY]: data });
    else
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }
  function loadState(cb){
    if (typeof chrome!=="undefined" && chrome.storage?.local)
      chrome.storage.local.get(STORAGE_KEY,(r)=>cb(r?.[STORAGE_KEY]||null));
    else {
      const raw=localStorage.getItem(STORAGE_KEY);
      cb(raw?JSON.parse(raw):null);
    }
  }
  function clearState(){
    if (typeof chrome!=="undefined" && chrome.storage?.local)
      chrome.storage.local.remove(STORAGE_KEY);
    else
      localStorage.removeItem(STORAGE_KEY);
  }
  function applyState(snap){
    board = snap.board;
    turn  = snap.turn;
    enPassantTarget = snap.enPassantTarget;
    castlingRights  = snap.castlingRights;
    capturedByWhite = snap.capturedByWhite||[];
    capturedByBlack = snap.capturedByBlack||[];
    gameOver = !!snap.gameOver;
    lastMove = snap.lastMove||null;
    aiEnabled = !!snap.aiEnabled;
    aiColor   = snap.aiColor==="w"?"w":"b";
    aiDepth   = Number.isFinite(snap.aiDepth)? snap.aiDepth : 2;

    selected=null; legalMoves=[]; pendingPromotion=null;
    hideOverlay(); hideBanner(); syncAiControlsUI(); updateAll();
    if (!suppressAIMove) maybeTriggerAIMove();
  }

  /* ---------------- History ---------------- */
  function pushHistory(){
    history.push(JSON.stringify(snapshotState()));
    if (history.length>200) history.shift();
    future.length=0;
  }
  function undo(){
    if (!history.length) return;
    future.push(JSON.stringify(snapshotState()));
    const prev=JSON.parse(history.pop());
    suppressAIMove=true; applyState(prev); suppressAIMove=false;
    updateAll();
  }
  function redo(){
    if (!future.length) return;
    history.push(JSON.stringify(snapshotState()));
    if (history.length>200) history.shift();
    const next=JSON.parse(future.pop());
    suppressAIMove=true; applyState(next); suppressAIMove=false;
    updateAll();
  }

  /* ---------------- Helpers ---------------- */
  const inBounds=(r,c)=>r>=0&&r<8&&c>=0&&c<8;
  const opposite=(s)=>s==="w"?"b":"w";
  const cloneBoard=(b)=>b.map(row=>row.map(c=>c?{...c}:null));

  function startingBoard(){
    const b=Array.from({length:8},()=>Array(8).fill(null));
    const put=(r,c,t,clr)=> b[r][c]={type:t,color:clr,hasMoved:false};
    // black
    put(0,0,"R","b"); put(0,1,"N","b"); put(0,2,"B","b"); put(0,3,"Q","b");
    put(0,4,"K","b"); put(0,5,"B","b"); put(0,6,"N","b"); put(0,7,"R","b");
    for(let c=0;c<8;c++) put(1,c,"P","b");
    // white
    for(let c=0;c<8;c++) put(6,c,"P","w");
    put(7,0,"R","w"); put(7,1,"N","w"); put(7,2,"B","w"); put(7,3,"Q","w");
    put(7,4,"K","w"); put(7,5,"B","w"); put(7,6,"N","w"); put(7,7,"R","w");
    return b;
  }
  function findKing(side,b=board){
    for(let r=0;r<8;r++) for(let c=0;c<8;c++){
      const p=b[r][c]; if (p&&p.type==="K"&&p.color===side) return {r,c};
    } return null;
  }
  function rayAttack(r,c,b,by,dirs,who){
    for(const [dr,dc] of dirs){
      let rr=r+dr, cc=c+dc;
      while(inBounds(rr,cc)){
        const p=b[rr][cc];
        if (p){ if (p.color===by && who.includes(p.type)) return true; break; }
        rr+=dr; cc+=dc;
      }
    } return false;
  }
  function isSquareAttacked(r,c,by,b=board){
    // Safety checks
    if (!b || !Array.isArray(b) || b.length !== 8) {
      console.error('Invalid board in isSquareAttacked');
      return false;
    }
    if (r < 0 || r > 7 || c < 0 || c > 7) {
      console.error('Invalid coordinates in isSquareAttacked:', {r, c});
      return false;
    }
    
    // pawns
    const pr = by==="w"? r+1 : r-1;
    for(const dc of [-1,1]){
      const rr=pr, cc=c+dc;
      if (inBounds(rr,cc)){
        const p=b[rr][cc];
        if (p&&p.color===by&&p.type==="P") return true;
      }
    }
    // knights
    for(const [dr,dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]){
      const rr=r+dr, cc=c+dc; if (!inBounds(rr,cc)) continue;
      const p=b[rr][cc]; if (p&&p.color===by&&p.type==="N") return true;
    }
    if (rayAttack(r,c,b,by,[[-1,-1],[-1,1],[1,-1],[1,1]],["B","Q"])) return true;
    if (rayAttack(r,c,b,by,[[-1,0],[1,0],[0,-1],[0,1]],["R","Q"])) return true;
    for(let dr=-1;dr<=1;dr++) for(let dc=-1;dc<=1;dc++){
      if(!dr&&!dc) continue; const rr=r+dr, cc=c+dc; if (!inBounds(rr,cc)) continue;
      const p=b[rr][cc]; if (p&&p.color===by&&p.type==="K") return true;
    }
    return false;
  }
  const isInCheckFor=(b,side)=>{ const k=findKing(side,b); return k? isSquareAttacked(k.r,k.c,opposite(side),b):false; };
  const isInCheck=(side)=> isInCheckFor(board,side);

  function pawnMoves(r,c,b,side,ep){
    const dir=side==="w"?-1:1, start=side==="w"?6:1, out=[];
    const r1=r+dir;
    if (inBounds(r1,c) && !b[r1][c]){
      out.push({r:r1,c});
      const r2=r+2*dir;
      if (r===start && !b[r2][c]) out.push({r:r2,c});
    }
    for (const dc of [-1,1]){
      const cc=c+dc; if (!inBounds(r1,cc)) continue;
      const t=b[r1][cc]; if (t && t.color!==side) out.push({r:r1,c:cc});
    }
    if (ep){
      const {r:er,c:ec}=ep;
      if (er===r+dir && Math.abs(ec-c)===1){
        const adj=b[r][ec];
        if (adj && adj.type==="P" && adj.color!==side) out.push({r:er,c:ec,special:"enpassant"});
      }
    }
    return out;
  }
  function knightMoves(r,c,b,side){
    const out=[];
    for(const [dr,dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]){
      const rr=r+dr, cc=c+dc; if (!inBounds(rr,cc)) continue;
      const t=b[rr][cc]; if (!t || t.color!==side) out.push({r:rr,c:cc});
    } return out;
  }
  const slide=(r,c,b,side,dirs)=>{
    const out=[];
    for(const [dr,dc] of dirs){
      let rr=r+dr, cc=c+dc;
      while(inBounds(rr,cc)){
        const t=b[rr][cc];
        if (!t) out.push({r:rr,c:cc});
        else { if (t.color!==side) out.push({r:rr,c:cc}); break; }
        rr+=dr; cc+=dc;
      }
    } return out;
  };
  const bishopMoves=(r,c,b,s)=>slide(r,c,b,s,[[-1,-1],[-1,1],[1,-1],[1,1]]);
  const rookMoves  =(r,c,b,s)=>slide(r,c,b,s,[[-1,0],[1,0],[0,-1],[0,1]]);
  const queenMoves =(r,c,b,s)=>slide(r,c,b,s,[[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]]);
  function kingMoves(r,c,b,side,cr){
    const out=[]; for(let dr=-1;dr<=1;dr++) for(let dc=-1;dc<=1;dc++){
      if(!dr&&!dc) continue; const rr=r+dr, cc=c+dc;
      if (inBounds(rr,cc)){ const t=b[rr][cc]; if (!t||t.color!==side) out.push({r:rr,c:cc}); }
    }
    const rights=cr[side], home=side==="w"?7:0;
    if (r===home && c===4 && rights && !isSquareAttacked(r,c,opposite(side),b)){
      if (rights.K && !b[home][5] && !b[home][6] &&
          b[home][7] && b[home][7].type==="R" && b[home][7].color===side &&
          !isSquareAttacked(home,5,opposite(side),b) &&
          !isSquareAttacked(home,6,opposite(side),b)) out.push({r:home,c:6,special:"castle-k"});
      if (rights.Q && !b[home][1] && !b[home][2] && !b[home][3] &&
          b[home][0] && b[home][0].type==="R" && b[home][0].color===side &&
          !isSquareAttacked(home,3,opposite(side),b) &&
          !isSquareAttacked(home,2,opposite(side),b)) out.push({r:home,c:2,special:"castle-q"});
    }
    return out;
  }
  function clonePosition(b,ep,cr){
    return {
      board: cloneBoard(b),
      enPassantTarget: ep?{...ep}:null,
      castlingRights: { w:{K:!!cr.w.K,Q:!!cr.w.Q}, b:{K:!!cr.b.K,Q:!!cr.b.Q} }
    };
  }
  function applySimMove(pos,sr,sc,tr,tc,meta){
    const b=pos.board, moving=b[sr][sc], target=b[tr][tc];
    if (meta && meta.special==="enpassant"){
      const dir=moving.color==="w"?1:-1; b[tr+dir][tc]=null;
    }
    b[tr][tc]={...moving,hasMoved:true}; b[sr][sc]=null;

    if (moving.type==="K"){
      if (moving.color==="w"){ pos.castlingRights.w.K=false; pos.castlingRights.w.Q=false; }
      else { pos.castlingRights.b.K=false; pos.castlingRights.b.Q=false; }
      const home=moving.color==="w"?7:0;
      if (meta && meta.special==="castle-k"){ b[home][5]={...b[home][7],hasMoved:true}; b[home][7]=null; }
      if (meta && meta.special==="castle-q"){ b[home][3]={...b[home][0],hasMoved:true}; b[home][0]=null; }
    }
    if (moving.type==="R"){
      if (moving.color==="w"){ if (sr===7&&sc===0) pos.castlingRights.w.Q=false; if (sr===7&&sc===7) pos.castlingRights.w.K=false; }
      else { if (sr===0&&sc===0) pos.castlingRights.b.Q=false; if (sr===0&&sc===7) pos.castlingRights.b.K=false; }
    }
    if (target && target.type==="R"){
      if (target.color==="w"){ if (tr===7&&tc===0) pos.castlingRights.w.Q=false; if (tr===7&&tc===7) pos.castlingRights.w.K=false; }
      else { if (tr===0&&tc===0) pos.castlingRights.b.Q=false; if (tr===0&&tc===7) pos.castlingRights.b.K=false; }
    }
    if (moving.type==="P" && Math.abs(tr-sr)===2) pos.enPassantTarget={r:(tr+sr)/2,c:sc};
    else pos.enPassantTarget=null;
  }
  function genLegalFor(r,c,b,side,ep,cr){
    const p=b[r][c]; if (!p||p.color!==side) return [];
    let moves=[];
    switch(p.type){
      case "P": moves=pawnMoves(r,c,b,side,ep); break;
      case "N": moves=knightMoves(r,c,b,side); break;
      case "B": moves=bishopMoves(r,c,b,side); break;
      case "R": moves=rookMoves(r,c,b,side); break;
      case "Q": moves=queenMoves(r,c,b,side); break;
      case "K": moves=kingMoves(r,c,b,side,cr); break;
    }
    const legal=[];
    for(const m of moves){
      const sim=clonePosition(b,ep,cr);
      applySimMove(sim,r,c,m.r,m.c,m);
      if (!isInCheckFor(sim.board,side)) legal.push(m);
    }
    return legal;
  }
  function hasAnyLegalMoves(side){
    for(let r=0;r<8;r++) for(let c=0;c<8;c++){
      const p=board[r][c]; if (!p || p.color!==side) continue;
      if (genLegalFor(r,c,board,side,enPassantTarget,castlingRights).length) return true;
    } return false;
  }

  /* ---------------- AI tiny negamax ---------------- */
  const PV={P:100,N:320,B:330,R:500,Q:900,K:0};
  const evalMat=(b)=>{ let s=0; for(let r=0;r<8;r++) for(let c=0;c<8;c++){ const p=b[r][c]; if(!p)continue; s+=(p.color==="w"?PV[p.type]:-PV[p.type]); } return s; };
  function allMoves(pos,side){
    const {board:b,enPassantTarget:ep,castlingRights:cr}=pos, out=[];
    for(let r=0;r<8;r++) for(let c=0;c<8;c++){
      const p=b[r][c]; if (!p||p.color!==side) continue;
      for(const m of genLegalFor(r,c,b,side,ep,cr)) out.push({from:{r,c},to:{r:m.r,c:m.c},meta:m});
    } return out;
  }
  const evalPos=(pos)=> evalMat(pos.board) + 0.1*(allMoves(pos,"w").length - allMoves(pos,"b").length);
  function negamax(pos,depth,alpha,beta,side){
    const moves=allMoves(pos,side), inChk=isInCheckFor(pos.board,side);
    if (depth===0 || moves.length===0){
      if (moves.length===0) return { score: inChk ? -100000+(3-depth) : 0 };
      return { score: evalPos(pos)*(side==="w"?1:-1) };
    }
    let best={score:-Infinity,move:null};
    for(const mv of moves){
      const child=clonePosition(pos.board,pos.enPassantTarget,pos.castlingRights);
      applySimMove(child,mv.from.r,mv.from.c,mv.to.r,mv.to.c,mv.meta);
      const res=negamax(child,depth-1,-beta,-alpha,opposite(side));
      const sc=-res.score;
      if (sc>best.score) best={score:sc,move:mv};
      if (sc>alpha) alpha=sc;
      if (alpha>=beta) break;
    }
    return best;
  }
  function aiMove(){
    if (!aiEnabled || gameOver || pendingPromotion) return;
    if (turn!==aiColor) return;
    const pos=clonePosition(board,enPassantTarget,castlingRights);
    const { move }=negamax(pos,aiDepth,-Infinity,Infinity,aiColor);
    if (!move){ updateAll(); return; }
    makeMove(move.from.r,move.from.c,move.to.r,move.to.c,move.meta);
    lastMove={from:move.from,to:move.to};
    if (!pendingPromotion){ turn=opposite(turn); updateAll(); maybeTriggerAIMove(); }
  }
  function maybeTriggerAIMove(){
    if (!aiEnabled || gameOver || pendingPromotion) return;
    if (turn!==aiColor) return;
    setTimeout(aiMove,150);
  }

  /* ---------------- UI helpers ---------------- */
  function showBanner(text,kind){
    if (!bannerEl) return;
    bannerEl.textContent=text;
    bannerEl.className="banner show"+(kind?" "+kind:"");
    statusBarEl?.classList.add("has-banner");
    if (turnIndicatorEl) turnIndicatorEl.style.display="none";
    if (gameStatusEl)    gameStatusEl.style.display="none";
  }
  function hideBanner(){
    if (!bannerEl) return;
    bannerEl.textContent=""; bannerEl.className="banner";
    statusBarEl?.classList.remove("has-banner");
    if (turnIndicatorEl) turnIndicatorEl.style.display="";
    if (gameStatusEl)    gameStatusEl.style.display="";
  }
  function showOverlay(title,sub){
    overlayTitleEl.textContent=title;
    overlaySubEl.textContent=sub||"";
    promoPanelEl.style.display="none";
    overlayActionsEl.style.display="block";
    overlayEl.classList.add("visible");
    overlayEl.setAttribute("aria-hidden","false");
  }
  function openPromotion(color,at,onChoose){
    pendingPromotion={color,at,choose:onChoose};
    overlayTitleEl.textContent="Promotion";
    overlaySubEl.textContent=color==="w"?"White pawn reached last rank":"Black pawn reached last rank";
    promoPanelEl.style.display="block";
    overlayActionsEl.style.display="none";
    overlayEl.classList.add("visible");
    overlayEl.setAttribute("aria-hidden","false");
  }
  function hideOverlay(){
    overlayEl.classList.remove("visible");
    overlayEl.setAttribute("aria-hidden","true");
    promoPanelEl.style.display="none";
    overlayActionsEl.style.display="block";
  }

  // IMPORTANT: Do NOT disable ai side buttons (fix for issue #2)
  function syncAiControlsUI(){
    if (!toggleAiBtn || !aiWhiteBtn || !aiBlackBtn) return;
    // Keep label about actual mode
    toggleAiBtn.textContent = cpuTrayOpen ? "Playing vs Computer" : "Play vs Computer";
    toggleAiBtn.classList.toggle("is-active", cpuTrayOpen);
    // Ensure side buttons are ALWAYS clickable
    aiWhiteBtn.disabled = false;
    aiBlackBtn.disabled = false;
    aiWhiteBtn.classList.toggle("is-active", aiEnabled && aiColor==="w");
    aiBlackBtn.classList.toggle("is-active", aiEnabled && aiColor==="b");
    // Show/hide tray
    cpuOptionsEl?.classList.toggle("show", cpuTrayOpen);
  }

  function useScreen(menuActive){
    const hasClassState = menuScreenEl?.classList.contains("screen");
    if (hasClassState){
      menuScreenEl.classList.toggle("is-active", menuActive);
      menuScreenEl.classList.toggle("is-hidden", !menuActive);
      gameScreenEl.classList.toggle("is-active", !menuActive);
      gameScreenEl.classList.toggle("is-hidden", menuActive);
    } else {
      menuScreenEl.style.display = menuActive ? "block" : "none";
      gameScreenEl.style.display = menuActive ? "none"  : "block";
    }
    document.body.classList.toggle("game-active", !menuActive);
  }
  const showMenuScreen=()=>useScreen(true);
  const showGameScreen=()=>useScreen(false);

  /* ---------------- Render ---------------- */
  function render(){
    console.log('Rendering board...');
    boardEl.innerHTML="";
    
    // Safety check for board state
    if (!board || !Array.isArray(board) || board.length !== 8) {
      console.error('Invalid board state in render function');
      return;
    }
    
    // Update board flip state
    boardFlipped = shouldFlipBoard();
    
    // Apply flipped class to board
    if (boardFlipped) {
      boardEl.classList.add('flipped');
    } else {
      boardEl.classList.remove('flipped');
    }
    
    const k = findKing(turn);
    let inChk = false;
    
    if (k) {
      try {
        inChk = isSquareAttacked(k.r, k.c, opposite(turn));
      } catch (error) {
        console.error('Error checking if king is in check:', error);
        inChk = false;
      }
    } else {
      console.warn('King not found for turn:', turn);
    }
    for(let r=0;r<8;r++){
      for(let c=0;c<8;c++){
        // Calculate display coordinates (flip if needed)
        const displayR = boardFlipped ? 7-r : r;
        const displayC = boardFlipped ? 7-c : c;
        
        const d=document.createElement("div");
        d.className="square "+(((displayR+displayC)&1)===0?"light":"dark");
        d.dataset.r=String(r); d.dataset.c=String(c);
        if (inChk && k && r===k.r && c===k.c) d.classList.add("in-check");
        if (selected && selected.r===r && selected.c===c) d.classList.add("selected");
        if (lastMove){
          if (lastMove.from.r===r && lastMove.from.c===c) d.classList.add("last-from");
          if (lastMove.to.r===r && lastMove.to.c===c)     d.classList.add("last-to");
        }
        const lm=legalMoves.find(m=>m.r===r&&m.c===c);
        if (lm){
          const cap=!!board[r][c] || lm.special==="enpassant";
          d.classList.add(cap?"capture-move":"legal-move");
        }
        const p=board[r][c];
        if (p){
          const img=document.createElement("img");
          img.src=getURL(PIECES[p.color][p.type]);
          img.className="piece";
          img.alt=(p.color==="w"?"White ":"Black ")+p.type;
          d.appendChild(img);
        }
        d.addEventListener("click", onSquareClick);
        boardEl.appendChild(d);
      }
    }
    turnIndicatorEl.textContent = turn==="w"?"White's Turn":"Black's Turn";
  }
  function renderCaptured(){
    capturedByWhiteEl.innerHTML="";
    capturedByBlackEl.innerHTML="";
    for(const s of capturedByWhite){ const i=document.createElement("img"); i.src=s; i.width=18;i.height=18; capturedByWhiteEl.appendChild(i); }
    for(const s of capturedByBlack){ const i=document.createElement("img"); i.src=s; i.width=18;i.height=18; capturedByBlackEl.appendChild(i); }
  }
  function updateStatusMessage(){
    if (gameOver) return;
    const check=isInCheck(turn), any=hasAnyLegalMoves(turn);
    if (check && !any){
      const winner=turn==="w"?"Black":"White";
      gameStatusEl.textContent=`Checkmate – ${winner} Wins!`;
      gameOver=true; showBanner(`CHECKMATE — ${winner} wins`,"win"); showOverlay("CHECKMATE",`${winner} wins`);
    } else if (!check && !any){
      gameStatusEl.textContent="Stalemate – Draw";
      gameOver=true; showBanner("STALEMATE — Draw","draw"); showOverlay("STALEMATE","No legal moves — Draw");
    } else if (check){
      gameStatusEl.textContent="Check!"; hideBanner();
    } else {
      gameStatusEl.textContent=""; hideBanner();
    }
  }
  function updateAll(){
    render(); renderCaptured(); updateStatusMessage();
    if (!pendingPromotion) saveState();
  }

  /* ---------------- Interaction ---------------- */
  function onSquareClick(e){
    if (gameOver || pendingPromotion) return;
    if (aiEnabled && turn===aiColor) return;
    const r=Number(e.currentTarget.dataset.r), c=Number(e.currentTarget.dataset.c);
    const cell=board[r][c];
    const intended=legalMoves.find(m=>m.r===r&&m.c===c);
    
    console.log('Cell clicked:', {r, c, cell, selected, intended, isOnline: typeof onlineChess !== 'undefined' ? onlineChess.isOnline : false, isMyTurn: typeof onlineChess !== 'undefined' ? onlineChess.isMyTurn : true});
    
    if (selected && intended){
      // Check if it's the player's turn in online games
      if (typeof onlineChess !== 'undefined' && onlineChess.isOnline && !onlineChess.isMyTurn) {
        console.log('Not your turn in online game - move blocked');
        return;
      }
      
      const from={r:selected.r,c:selected.c}, to={r,c};
      console.log('Making move:', {from, to, intended});
      makeMove(from.r,from.c,to.r,to.c,intended);
      selected=null; legalMoves=[]; lastMove={from,to};
      
      // Send move to online opponent if playing online
      if (typeof onlineChess !== 'undefined' && onlineChess.isOnline) {
        onlineChess.sendMove({
          from: {r: from.r, c: from.c},
          to: {r: to.r, c: to.c},
          meta: intended
        });
        // Update turn for online game
        onlineChess.updateTurnAfterMove();
        
        // Force UI update to show the move with a small delay
        setTimeout(() => {
          updateAll();
        }, 10);
      } else {
        // Local game turn switching
        if (!pendingPromotion) { 
          turn = opposite(turn); 
          updateAll(); 
          maybeTriggerAIMove(); 
        }
      }
      return;
    }
    if (selected && selected.r===r && selected.c===c){ selected=null; legalMoves=[]; render(); return; }
    // Check if player can select this piece (online validation)
    if (cell && cell.color === turn) {
      // For online games, check if player can select this piece
      if (typeof onlineChess !== 'undefined' && onlineChess.isOnline) {
        // Check if it's the player's turn
        if (!onlineChess.isMyTurn) {
          console.log('Not your turn in online game');
          selected = null; 
          legalMoves = []; 
          render(); 
          return;
        }
        
        // Check if player can select this piece (own pieces only)
        if (!onlineChess.canSelectPiece(cell)) {
          console.log('Cannot select opponent piece in online game');
          selected = null; 
          legalMoves = []; 
          render(); 
          return;
        }
      }
      
      selected = {r, c}; 
      legalMoves = genLegalFor(r, c, board, turn, enPassantTarget, castlingRights); 
      render(); 
      return; 
    }
    
    // For online games, prevent selecting opponent pieces entirely
    if (typeof onlineChess !== 'undefined' && onlineChess.isOnline && cell && cell.color !== turn) {
      console.log('Cannot select opponent piece in online game');
      selected = null; 
      legalMoves = []; 
      render(); 
      return;
    }
    selected=null; legalMoves=[]; render();
  }
  function recordCapture(p){
    const s=getURL(PIECES[p.color][p.type]);
    if (p.color==="w") capturedByBlack.push(s); else capturedByWhite.push(s);
  }
  function makeMove(sr,sc,tr,tc,meta){
    // Validate move parameters
    if (sr < 0 || sr > 7 || sc < 0 || sc > 7 || tr < 0 || tr > 7 || tc < 0 || tc > 7) {
      console.error('Invalid move coordinates:', {sr, sc, tr, tc});
      return;
    }
    
    const moving = board[sr][sc];
    if (!moving) {
      console.error('No piece at source position:', {sr, sc});
      return;
    }
    
    // Check if it's online and if it's the player's turn
    if (typeof onlineChess !== 'undefined' && onlineChess.isOnline && !onlineChess.canMakeMove()) {
      console.log('Not your turn in online game');
      return; // Not the player's turn
    }
    
    pushHistory();
    const target = board[tr][tc];
    if (meta && meta.special==="enpassant"){
      const dir=moving.color==="w"?1:-1, cap=board[tr+dir][tc];
      if (cap) recordCapture(cap);
      board[tr+dir][tc]=null;
    } else if (target) recordCapture(target);

    board[tr][tc]={...moving,hasMoved:true}; board[sr][sc]=null;

    if (moving.type==="P" && Math.abs(tr-sr)===2) enPassantTarget={r:(tr+sr)/2,c:sc};
    else enPassantTarget=null;

    if (moving.type==="K"){
      castlingRights[moving.color].K=false; castlingRights[moving.color].Q=false;
      const home=moving.color==="w"?7:0;
      if (meta && meta.special==="castle-k"){ board[home][5]={...board[home][7],hasMoved:true}; board[home][7]=null; }
      else if (meta && meta.special==="castle-q"){ board[home][3]={...board[home][0],hasMoved:true}; board[home][0]=null; }
    }
    if (moving.type==="R"){
      if (moving.color==="w"){ if (sr===7&&sc===0) castlingRights.w.Q=false; if (sr===7&&sc===7) castlingRights.w.K=false; }
      else { if (sr===0&&sc===0) castlingRights.b.Q=false; if (sr===0&&sc===7) castlingRights.b.K=false; }
    }
    if (target && target.type==="R"){
      if (target.color==="w"){ if (tr===7&&tc===0) castlingRights.w.Q=false; if (tr===7&&tc===7) castlingRights.w.K=false; }
      else { if (tr===0&&tc===0) castlingRights.b.Q=false; if (tr===0&&tc===7) castlingRights.b.K=false; }
    }

    // promotion
    if (moving.type==="P"){
      const lastRow=moving.color==="w"?0:7;
      if (tr===lastRow){
        if (aiEnabled && moving.color===aiColor){
          board[tr][tc].type="Q";
        } else {
          openPromotion(moving.color,{r:tr,c:tc},(choice)=>{
            board[tr][tc].type=choice;
            pendingPromotion=null; hideOverlay();
            turn=opposite(turn); updateAll(); maybeTriggerAIMove();
          });
        }
      }
    }
  }

  /* ---------------- Flow ---------------- */
  function resetGame(){
    board=startingBoard(); turn="w"; selected=null; legalMoves=[];
    enPassantTarget=null;
    castlingRights={ w:{K:true,Q:true}, b:{K:true,Q:true} };
    capturedByWhite=[]; capturedByBlack=[];
    gameOver=false; lastMove=null; pendingPromotion=null;
    gameStatusEl.textContent=""; history.length=0; future.length=0;
    
    // Validate board after reset
    if (!board || !Array.isArray(board) || board.length !== 8) {
      console.error('Board reset failed, reinitializing...');
      board = startingBoard();
    }
    
    hideOverlay(); hideBanner(); clearState(); updateAll();
    maybeTriggerAIMove();
  }
// ---- CPU tray helpers (exclusive with Join/Create) ----
function openCpuTray(){
  cpuTrayOpen = true;
  toggleAiBtn?.classList.add("is-active");
  closeJoinTray();                       // <-- ensure Join button deactivates
  cpuOptionsEl?.classList.add("show");
  showBanner("Choose the opponent color","draw");
  syncAiControlsUI();
}

function closeCpuTray(){
  cpuTrayOpen = false;
  cpuOptionsEl?.classList.remove("show");
  toggleAiBtn?.classList.remove("is-active");
  syncAiControlsUI();
}
  function showJoinPanels(){
    if (joinPanel) { joinPanel.classList.add("show"); joinPanel.style.display="block"; }
    if (createPanel) { createPanel.classList.add("show"); createPanel.style.display="block"; }
  }
  function hideJoinPanels(){
    if (joinPanel) { joinPanel.classList.remove("show"); joinPanel.style.display="none"; }
    if (createPanel) { createPanel.classList.remove("show"); createPanel.style.display="none"; }
  }

  // ---- Join/Create helpers ----
function openJoinTray(){
  joinTrayOpen = true;
  closeCpuTray();                        // <-- ensure CPU button deactivates
  showJoinPanels();
}
function closeJoinTray(){
  joinTrayOpen = false;
  hideJoinPanels();
  // Always deactivate room button when tray is closed
  openJoinPanelBtn?.classList.remove("is-active");
}

  /* ---------------- Events ---------------- */
  if (newGameBtn) newGameBtn.addEventListener("click", ()=>{
    aiEnabled=false;
    closeCpuTray();
    closeJoinTray();
    syncAiControlsUI();
    resetGame();
    showGameScreen();
 // hides chip

  });

  if (playAgainBtn) playAgainBtn.addEventListener("click", ()=>{
    closeCpuTray();
    closeJoinTray();
    resetGame();
    showGameScreen();
 // hides chip

  });

  // Toggle the CPU options tray without disabling side buttons
  if (toggleAiBtn) toggleAiBtn.addEventListener("click", ()=>{
    if (cpuTrayOpen) {
      closeCpuTray();
    } else {
      openCpuTray();
    }
  });
// Tabs functionality removed

  // Choose CPU side -> start game vs computer
  if (aiWhiteBtn) aiWhiteBtn.addEventListener("click", ()=>{
    aiEnabled=true; aiColor="w";
    closeCpuTray();
    closeJoinTray();
    resetGame(); syncAiControlsUI(); showGameScreen(); maybeTriggerAIMove();

  });
  if (aiBlackBtn) aiBlackBtn.addEventListener("click", ()=>{
    aiEnabled=true; aiColor="b";
    closeCpuTray();
    closeJoinTray();
    resetGame(); syncAiControlsUI(); showGameScreen();

  });

  // Play Online button
  const playOnlineBtn = document.getElementById('playOnlineBtn');
  if (playOnlineBtn) {
    playOnlineBtn.addEventListener('click', () => {
      onlineChess.findGame();
    });
  }

  // Join/Create Room button behavior (show both panels, exclusive with CPU tray)
 if (openJoinPanelBtn) openJoinPanelBtn.addEventListener("click", ()=>{
  if (joinTrayOpen) {
    closeJoinTray();
    openJoinPanelBtn.classList.remove("is-active");
  } else {
    openJoinTray();
    openJoinPanelBtn.classList.add("is-active");
    // close CPU tray if open
    toggleAiBtn?.classList.remove("is-active");
    closeCpuTray();
  }
});


  if (undoBtn) undoBtn.addEventListener("click", undo);
  if (redoBtn) redoBtn.addEventListener("click", redo);
  if (backToMenuBtn) backToMenuBtn.addEventListener("click", ()=>{
    closeCpuTray();
    closeJoinTray();
    showMenuScreen();
  });

  window.addEventListener("keydown",(e)=>{
    if (e.ctrlKey && e.key==="z"){ e.preventDefault(); undo(); }
    if (e.ctrlKey && (e.key==="y" || (e.shiftKey && e.key.toLowerCase()==="z"))){ e.preventDefault(); redo(); }
  });
  if (promoPanelEl){
    promoPanelEl.addEventListener("click",(e)=>{
      const btn=e.target.closest("button[data-promote]");
      if (!btn || !pendingPromotion) return;
      const piece=btn.getAttribute("data-promote"); // Q R B N
      pendingPromotion.choose(piece);
    });
  }

  /* ---------------- Init ---------------- */
  // Ensure both trays are closed initially
  closeCpuTray();
  closeJoinTray();

  loadTheme();
  syncThemeBtnUI();

  // Make sure overlay starts hidden
  hideOverlay();

  // Load or start fresh
  loadState((snap) => {
    if (snap && Array.isArray(snap.board) && snap.board.length === 8) {
      applyState(snap);
    } else {
      resetGame();
    }
    hideOverlay();
  });
})();
