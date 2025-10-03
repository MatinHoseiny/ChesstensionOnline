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
      return baseUrl;
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
  const promotionOverlayEl = document.getElementById("promotionOverlay");
  const playAgainBtn   = document.getElementById("playAgainBtn");
  const cancelSearchBtn = document.getElementById("cancelSearchBtn");
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
    };
    
    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.handleMessage(message);
    };
    
    this.ws.onclose = () => {
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
    // Don't start a new search if already in a game
    if (this.isOnline && !this.isWaiting) {
      return;
    }
    
    // Ensure we're not in a game state
    this.isOnline = false;
    this.isWaiting = false;
    
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.connect();
      // Wait for connection then find game
      this.ws.onopen = () => {
        this.sendFindGame();
      };
    } else {
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
    
  }
  
  sendMove(moveData) {
    if (this.isOnline && this.ws && this.isMyTurn) {
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
        
      } else {
        turnIndicator.textContent = turn === 'w' ? 'White to move' : 'Black to move';
        turnIndicator.className = 'turn-indicator';
      }
    }
  }
  
  updateUI(state) {
    const btn = document.getElementById('playOnlineBtn');
    const cancelBtn = document.getElementById('cancelSearchBtn');
    if (!btn) return;
    
    switch(state) {
      case 'searching':
        btn.textContent = 'Searching for opponent...';
        btn.disabled = true;
        if (cancelBtn) cancelBtn.style.display = 'flex';
        break;
      case 'playing':
        btn.textContent = 'Playing Online';
        btn.disabled = true;
        if (cancelBtn) cancelBtn.style.display = 'none';
        break;
      case 'disconnected':
        btn.textContent = 'Play Online';
        btn.disabled = false;
        if (cancelBtn) cancelBtn.style.display = 'none';
        break;
    }
  }
  
  handleOpponentDisconnect() {
    this.isOnline = false;
    this.updateUI('disconnected');
    alert('Opponent disconnected. Returning to menu.');
    showMenuScreen();
  }
  
  cancelSearch() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'cancel_search' }));
      this.ws.close();
    }
    this.isWaiting = false;
    this.isOnline = false;
    this.ws = null;
    this.updateUI('disconnected');
    
    // Reset any game state
    if (typeof resetGame === 'function') {
      resetGame();
    }
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
  let aiEnabled=false, aiColor="b", aiDepth=4; // Original depth
  
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
    // Only save state when playing with computer (not online)
    if (aiEnabled) {
    const data=snapshotState();
    if (typeof chrome!=="undefined" && chrome.storage?.local)
      chrome.storage.local.set({ [STORAGE_KEY]: data });
    else
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
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
    const isPromotion = (side==="w" && r1===0) || (side==="b" && r1===7);
    
    if (inBounds(r1,c) && !b[r1][c]){
      if (isPromotion) {
        // Generate all promotion moves
        out.push({r:r1,c,promote:"Q"});
        out.push({r:r1,c,promote:"R"});
        out.push({r:r1,c,promote:"B"});
        out.push({r:r1,c,promote:"N"});
      } else {
      out.push({r:r1,c});
      }
      const r2=r+2*dir;
      if (r===start && !b[r2][c]) out.push({r:r2,c});
    }
    for (const dc of [-1,1]){
      const cc=c+dc; if (!inBounds(r1,cc)) continue;
      const t=b[r1][cc]; if (t && t.color!==side) {
        if (isPromotion) {
          // Generate all promotion captures
          out.push({r:r1,c:cc,promote:"Q"});
          out.push({r:r1,c:cc,promote:"R"});
          out.push({r:r1,c:cc,promote:"B"});
          out.push({r:r1,c:cc,promote:"N"});
        } else {
          out.push({r:r1,c:cc});
        }
      }
    }
    if (ep){
      const {r:er,c:ec}=ep;
      if (er===r+dir && Math.abs(ec-c)===1){
        const adj=b[r][ec];
        if (adj && adj.type==="P" && adj.color!==side) {
          if (isPromotion) {
            // Generate all promotion en passant moves
            out.push({r:er,c:ec,special:"enpassant",promote:"Q"});
            out.push({r:er,c:ec,special:"enpassant",promote:"R"});
            out.push({r:er,c:ec,special:"enpassant",promote:"B"});
            out.push({r:er,c:ec,special:"enpassant",promote:"N"});
          } else {
            out.push({r:er,c:ec,special:"enpassant"});
          }
        }
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
    
    // Handle promotion
    if (meta && meta.promote) {
      b[tr][tc] = {type: meta.promote, color: moving.color, hasMoved: true};
    } else {
      b[tr][tc]={...moving,hasMoved:true};
    }
    b[sr][sc]=null;

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

  /* ---------------- Enhanced AI with Phase 1 improvements ---------------- */
  
  // Generate position hash for transposition table
  function getPositionHash(pos) {
    let hash = '';
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = pos.board[r][c];
        if (piece) {
          hash += piece.color + piece.type + r + c;
        } else {
          hash += '--' + r + c;
        }
      }
    }
    // Include castling rights and en passant
    hash += pos.castlingRights ? JSON.stringify(pos.castlingRights) : 'null';
    hash += pos.enPassantTarget ? JSON.stringify(pos.enPassantTarget) : 'null';
    return hash;
  }
  
  // Check for three-fold repetition
  function isRepetition(pos) {
    if (!positionHistory || positionHistory.length < 6) return false;
    
    const currentHash = getPositionHash(pos);
    let count = 0;
    
    // Check last 6 positions (3 moves each side)
    for (let i = positionHistory.length - 1; i >= Math.max(0, positionHistory.length - 6); i--) {
      if (positionHistory[i] === currentHash) {
        count++;
        if (count >= 2) return true; // Consider 2-fold as repetition to be more aggressive
      }
    }
    
    return false;
  }
  
  // Simple, reliable repetition detection
  function wouldCauseRepetition(pos, move) {
    if (!positionHistory || positionHistory.length < 2) return false;
    
    try {
      // Simulate the move to get the resulting position
      const testPos = clonePosition(pos.board, pos.enPassantTarget, pos.castlingRights);
      applySimMove(testPos, move.from.r, move.from.c, move.to.r, move.to.c, move.meta);
      
      // Get hash of the resulting position
      const futureHash = getPositionHash(testPos);
      
      // Check if this position appeared in recent history
      for (let i = positionHistory.length - 1; i >= Math.max(0, positionHistory.length - 4); i--) {
        if (positionHistory[i] === futureHash) {
          return true; // This move would repeat a recent position
        }
      }
      
      return false;
    } catch (error) {
      console.error('Repetition check error:', error);
      return false; // If error, assume no repetition
    }
  }
  
  function isPerpetualCheck(pos, move, side) {
    // Detect if this move would create a perpetual check pattern
    try {
      if (!isCheckMove(pos, move, side)) return false;
      
      // If we don't have enough history, allow the check
      if (!positionHistory || positionHistory.length < 3) return false;
      
      // Check if we've been alternating between similar positions with checks
      const movingPiece = pos.board[move.from.r][move.from.c];
      if (!movingPiece) return false;
      
      // Knights and Queens are common perpetual check pieces
      if (movingPiece.type === "N" || movingPiece.type === "Q") {
        // If we've made several moves recently, avoid repeated checks
        if (positionHistory.length >= 4) {
          return true;
        }
      }
      
      return false;
    } catch (error) {
      return false; // If error, assume not perpetual
    }
  }
  
  // Advanced piece values (exact values from top engines)
  // These are the actual MG (middlegame) values used by top engines in centipawns
  const PIECE_VALUES = {
    P: 126,   // Pawn (PawnValueMg)
    N: 781,   // Knight (KnightValueMg)  
    B: 825,   // Bishop (BishopValueMg)
    R: 1276,  // Rook (RookValueMg)
    Q: 2538,  // Queen (QueenValueMg)
    K: 32000  // King (extremely high to prevent capture)
  };
  
  // Phase values for game phase calculation
  const PHASE_VALUES = {
    P: 0, N: 1, B: 1, R: 2, Q: 4, K: 0
  };
  const TOTAL_PHASE = 24;

  // Advanced Piece-Square Tables (PST) for positional evaluation
  // Values are from white's perspective, will be flipped for black
  const PIECE_SQUARE_TABLES = {
    P: [ // Pawn PST (encourages central control and advancement)
      [  0,  0,  0,  0,  0,  0,  0,  0],
      [ 50, 50, 50, 50, 50, 50, 50, 50],
      [ 10, 10, 20, 30, 30, 20, 10, 10],
      [  5,  5, 10, 25, 25, 10,  5,  5],
      [  0,  0,  0, 20, 20,  0,  0,  0],
      [  5, -5,-10,  0,  0,-10, -5,  5],
      [  5, 10, 10,-20,-20, 10, 10,  5],
      [  0,  0,  0,  0,  0,  0,  0,  0]
    ],
    N: [ // Knight PST (avoids edges, prefers central squares)
      [-50,-40,-30,-30,-30,-30,-40,-50],
      [-40,-20,  0,  0,  0,  0,-20,-40],
      [-30,  0, 10, 15, 15, 10,  0,-30],
      [-30,  5, 15, 20, 20, 15,  5,-30],
      [-30,  0, 15, 20, 20, 15,  0,-30],
      [-30,  5, 10, 15, 15, 10,  5,-30],
      [-40,-20,  0,  5,  5,  0,-20,-40],
      [-50,-40,-30,-30,-30,-30,-40,-50]
    ],
    B: [ // Bishop PST (prefers long diagonals)
      [-20,-10,-10,-10,-10,-10,-10,-20],
      [-10,  0,  0,  0,  0,  0,  0,-10],
      [-10,  0,  5, 10, 10,  5,  0,-10],
      [-10,  5,  5, 10, 10,  5,  5,-10],
      [-10,  0, 10, 10, 10, 10,  0,-10],
      [-10, 10, 10, 10, 10, 10, 10,-10],
      [-10,  5,  0,  0,  0,  0,  5,-10],
      [-20,-10,-10,-10,-10,-10,-10,-20]
    ],
    R: [ // Rook PST (prefers 7th rank and open files)
      [  0,  0,  0,  0,  0,  0,  0,  0],
      [  5, 10, 10, 10, 10, 10, 10,  5],
      [ -5,  0,  0,  0,  0,  0,  0, -5],
      [ -5,  0,  0,  0,  0,  0,  0, -5],
      [ -5,  0,  0,  0,  0,  0,  0, -5],
      [ -5,  0,  0,  0,  0,  0,  0, -5],
      [ -5,  0,  0,  0,  0,  0,  0, -5],
      [  0,  0,  0,  5,  5,  0,  0,  0]
    ],
    Q: [ // Queen PST (slight central preference)
      [-20,-10,-10, -5, -5,-10,-10,-20],
      [-10,  0,  0,  0,  0,  0,  0,-10],
      [-10,  0,  5,  5,  5,  5,  0,-10],
      [ -5,  0,  5,  5,  5,  5,  0, -5],
      [  0,  0,  5,  5,  5,  5,  0, -5],
      [-10,  5,  5,  5,  5,  5,  0,-10],
      [-10,  0,  5,  0,  0,  0,  0,-10],
      [-20,-10,-10, -5, -5,-10,-10,-20]
    ],
    K: [ // King PST - Middlegame (safety first)
      [-30,-40,-40,-50,-50,-40,-40,-30],
      [-30,-40,-40,-50,-50,-40,-40,-30],
      [-30,-40,-40,-50,-50,-40,-40,-30],
      [-30,-40,-40,-50,-50,-40,-40,-30],
      [-20,-30,-30,-40,-40,-30,-30,-20],
      [-10,-20,-20,-20,-20,-20,-20,-10],
      [ 20, 20,  0,  0,  0,  0, 20, 20],
      [ 20, 30, 10,  0,  0, 10, 30, 20]
    ]
  };

  // Endgame King PST (active king)
  const KING_ENDGAME_PST = [
    [-50,-40,-30,-20,-20,-30,-40,-50],
    [-30,-20,-10,  0,  0,-10,-20,-30],
    [-30,-10, 20, 30, 30, 20,-10,-30],
    [-30,-10, 30, 40, 40, 30,-10,-30],
    [-30,-10, 30, 40, 40, 30,-10,-30],
    [-30,-10, 20, 30, 30, 20,-10,-30],
    [-30,-30,  0,  0,  0,  0,-30,-30],
    [-50,-30,-30,-30,-30,-30,-30,-50]
  ]; // 4*Q + 4*R + 4*B + 8*N = 24
  
  // Advanced evaluation constants
  const CHECKMATE_BONUS = 50000;  // Much higher bonus for checkmate
  const CHECK_BONUS = 100;        // Increased for tactical awareness
  const CASTLE_BONUS = 60;        // Increased importance of king safety
  const PROMOTION_BONUS = 400;    
  const PIECE_SAFETY_BONUS = 25;  
  const CENTER_CONTROL_BONUS = 20; 
  const DEVELOPMENT_BONUS = 15;   
  const MOBILITY_BONUS = 4;       // New: piece mobility
  const DOUBLED_PAWN_PENALTY = 20; // New: pawn structure
  const ISOLATED_PAWN_PENALTY = 15; // New: pawn structure
  const BISHOP_PAIR_BONUS = 50;   // New: bishop pair advantage
  
  // Advanced move ordering bonuses
  const MVV_LVA_BONUS = 1000000; // Most Valuable Victim - Least Valuable Attacker
  const KILLER_MOVE_BONUS = 900000;
  const HISTORY_MOVE_BONUS = 800000;
  
  // Enhanced material evaluation
  function evalMaterial(board) {
    let score = 0;
    for(let r = 0; r < 8; r++) {
      for(let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if(!piece) continue;
        const value = PIECE_VALUES[piece.type];
        score += (piece.color === "w" ? value : -value);
      }
    }
    return score;
  }
  
  // Get piece-square table value
  function getPSTValue(piece, r, c, isEndgame = false) {
    if (!piece) return 0;
    
    let table;
    if (piece.type === 'K' && isEndgame) {
      table = KING_ENDGAME_PST;
    } else {
      table = PIECE_SQUARE_TABLES[piece.type];
    }
    
    if (!table) return 0;
    
    // For black pieces, flip the table vertically
    const row = piece.color === 'w' ? r : 7 - r;
    return table[row][c];
  }

  // Advanced positional evaluation
  function evalPosition(board) {
    let score = 0;
    
    // Calculate game phase for endgame detection
    let phase = 0;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece) {
          phase += PHASE_VALUES[piece.type] || 0;
        }
      }
    }
    const isEndgame = phase < 8; // Less than 8 phase points = endgame
    
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (!piece) continue;
        
        // Get advanced piece-square table value
        let positionBonus = getPSTValue(piece, r, c, isEndgame);
        
        // Additional advanced positional factors
        switch (piece.type) {
          case 'P':
            // Passed pawn bonus (simplified)
            const advancementRank = piece.color === 'w' ? 7 - r : r;
            if (advancementRank >= 4) {
              positionBonus += advancementRank * 15; // Strong bonus for advanced pawns
            }
            break;
            
          case 'N':
            // Knight outpost bonus (protected advanced knight)
            const isAdvanced = piece.color === 'w' ? r <= 4 : r >= 3;
            if (isAdvanced && (c >= 2 && c <= 5)) {
              positionBonus += 30; // Outpost bonus
            }
            break;
            
          case 'B':
            // Bishop pair and mobility bonus
            let diagonalSquares = 0;
            // Count free diagonal squares (simplified mobility)
            const directions = [[1,1], [1,-1], [-1,1], [-1,-1]];
            for (const [dr, dc] of directions) {
              for (let i = 1; i < 8; i++) {
                const nr = r + i * dr, nc = c + i * dc;
                if (nr < 0 || nr >= 8 || nc < 0 || nc >= 8) break;
                if (board[nr][nc]) break;
                diagonalSquares++;
              }
            }
            positionBonus += diagonalSquares * 3; // Mobility bonus
            break;
            
          case 'R':
            // Rook on open/semi-open file
            let fileOpen = true;
            for (let row = 0; row < 8; row++) {
              if (board[row][c] && board[row][c].type === 'P') {
                fileOpen = false;
                break;
              }
            }
            if (fileOpen) positionBonus += 25; // Open file bonus
            
            // 7th rank bonus (attacking opponent's pawns)
            const on7thRank = piece.color === 'w' ? r === 1 : r === 6;
            if (on7thRank) positionBonus += 35;
            break;
            
          case 'Q':
            // Queen development penalty in opening
            if (!isEndgame) {
              const earlyDevelopment = piece.color === 'w' ? r < 6 : r > 1;
              if (earlyDevelopment) positionBonus -= 25; // Discourage early queen development
            }
            break;
        }
        
        // Apply bonus based on piece color
        if (piece.color === 'w') {
          score += positionBonus;
        } else {
          score -= positionBonus;
        }
      }
    }
    
    return score;
  }
  
  // King safety evaluation
  function evalKingSafety(board) {
    let score = 0;
    
    // Find kings
    let whiteKing = null, blackKing = null;
    for(let r = 0; r < 8; r++) {
      for(let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if(piece && piece.type === "K") {
          if(piece.color === "w") whiteKing = {r, c};
          else blackKing = {r, c};
        }
      }
    }
    
    if(whiteKing) {
      // Penalize king in center during opening/midgame
      const centerDistance = Math.abs(whiteKing.r - 3.5) + Math.abs(whiteKing.c - 3.5);
      score -= centerDistance * 10;
    }
    
    if(blackKing) {
      const centerDistance = Math.abs(blackKing.r - 3.5) + Math.abs(blackKing.c - 3.5);
      score += centerDistance * 10;
    }
    
    return score;
  }
  
  // Advanced pawn structure evaluation
  function evalPawnStructure(board) {
    let score = 0;
    
    // Count pawns on each file and track positions
    const whitePawnFiles = [0,0,0,0,0,0,0,0];
    const blackPawnFiles = [0,0,0,0,0,0,0,0];
    const whitePawnPositions = [];
    const blackPawnPositions = [];
    
    for(let r = 0; r < 8; r++) {
      for(let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if(piece && piece.type === "P") {
          if(piece.color === "w") {
            whitePawnFiles[c]++;
            whitePawnPositions.push({r, c});
          } else {
            blackPawnFiles[c]++;
            blackPawnPositions.push({r, c});
          }
        }
      }
    }
    
    // Advanced doubled pawns penalty
    for(let c = 0; c < 8; c++) {
      if(whitePawnFiles[c] > 1) {
        score -= DOUBLED_PAWN_PENALTY * (whitePawnFiles[c] - 1);
      }
      if(blackPawnFiles[c] > 1) {
        score += DOUBLED_PAWN_PENALTY * (blackPawnFiles[c] - 1);
      }
    }
    
    // Isolated pawns penalty
    for(let c = 0; c < 8; c++) {
      const hasWhiteNeighbor = (c > 0 && whitePawnFiles[c-1] > 0) || (c < 7 && whitePawnFiles[c+1] > 0);
      const hasBlackNeighbor = (c > 0 && blackPawnFiles[c-1] > 0) || (c < 7 && blackPawnFiles[c+1] > 0);
      
      if(whitePawnFiles[c] > 0 && !hasWhiteNeighbor) {
        score -= ISOLATED_PAWN_PENALTY;
        // Extra penalty for central isolated pawns
        if(c >= 3 && c <= 4) score -= 10;
      }
      if(blackPawnFiles[c] > 0 && !hasBlackNeighbor) {
        score += ISOLATED_PAWN_PENALTY;
        if(c >= 3 && c <= 4) score += 10;
      }
    }
    
    // Advanced passed pawns evaluation
    for(const pos of whitePawnPositions) {
      try {
        if(isPassedPawn(board, pos.r, pos.c, "w")) {
          const advancement = 7 - pos.r;
          score += advancement * 20; // Linear bonus for advancement
        }
      } catch(e) {
        // Skip if error
      }
    }
    for(const pos of blackPawnPositions) {
      try {
        if(isPassedPawn(board, pos.r, pos.c, "b")) {
          const advancement = pos.r;
          score -= advancement * 20;
        }
      } catch(e) {
        // Skip if error
      }
    }
    
    // Pawn chains (connected pawns)
    for(const pos of whitePawnPositions) {
      try {
        if(hasPawnSupport(board, pos.r, pos.c, "w")) {
          score += 8; // Chain bonus for connected pawns
        }
      } catch(e) {
        // Skip if error
      }
    }
    for(const pos of blackPawnPositions) {
      try {
        if(hasPawnSupport(board, pos.r, pos.c, "b")) {
          score -= 8;
        }
      } catch(e) {
        // Skip if error
      }
    }
    
    return score;
  }
  
  // Helper: Check if pawn has diagonal support
  function hasPawnSupport(board, r, c, color) {
    const direction = color === "w" ? 1 : -1;
    const supportRank = r + direction;
    
    if(supportRank < 0 || supportRank >= 8) return false;
    
    // Check left diagonal support
    if(c > 0) {
      const leftSupport = board[supportRank][c-1];
      if(leftSupport && leftSupport.type === "P" && leftSupport.color === color) {
        return true;
      }
    }
    
    // Check right diagonal support
    if(c < 7) {
      const rightSupport = board[supportRank][c+1];
      if(rightSupport && rightSupport.type === "P" && rightSupport.color === color) {
        return true;
      }
    }
    
    return false;
  }

  // Helper: Check if there's a pawn on a file
  function hasPawnOnFile(board, file, color) {
    for(let r = 0; r < 8; r++) {
      const piece = board[r][file];
      if(piece && piece.type === "P" && piece.color === color) {
        return true;
      }
    }
    return false;
  }

  // Helper: Check if pawn is passed (no enemy pawns blocking)
  function isPassedPawn(board, r, c, color) {
    const direction = color === "w" ? -1 : 1;
    const enemyColor = color === "w" ? "b" : "w";
    
    // Check the file and adjacent files for enemy pawns ahead
    for(let checkFile = Math.max(0, c-1); checkFile <= Math.min(7, c+1); checkFile++) {
      for(let checkRank = r + direction; checkRank >= 0 && checkRank < 8; checkRank += direction) {
        const piece = board[checkRank][checkFile];
        if(piece && piece.type === "P" && piece.color === enemyColor) {
          return false; // Enemy pawn blocks this pawn
        }
      }
    }
    
    return true; // No enemy pawns found, it's passed
  }
  
  // Simplified, reliable evaluation function
  function evalPos(pos) {
    let score = 0;
    
    try {
      // 1. MATERIAL BALANCE (most important)
      score += evalMaterial(pos.board);
      
      // 1.5. AGGRESSIVE CHECKMATE DETECTION
      score += evalCheckmateOpportunities(pos);
      
      // 1.6. ENDGAME MATERIAL ADJUSTMENT (reduce material focus in endgame)
      // Note: Material adjustment handled in individual evaluation functions
      
      // 2. BASIC POSITIONAL FACTORS
      score += evalPosition(pos.board);
      
      // 3. KING SAFETY
      score += evalKingSafety(pos.board);
      
      // 4. BASIC PAWN STRUCTURE (simplified)
      score += evalPawnStructure(pos.board);
      
      // 5. CENTER CONTROL
      score += evalCenterControl(pos.board);
      
      // 6. PIECE DEVELOPMENT
      score += evalDevelopment(pos.board);
      
      // 7. CHECK BONUS
      const whiteInCheck = isInCheckFor(pos.board, "w");
      const blackInCheck = isInCheckFor(pos.board, "b");
      if (whiteInCheck) score -= CHECK_BONUS;
      if (blackInCheck) score += CHECK_BONUS;
      
      // 8. CASTLING BONUS
      score += evalCastling(pos);
      
      // 9. REPETITION PENALTY
      if (isRepetition(pos)) score -= 500;
      
      // 10. ENDGAME CHECKMATING STRATEGIES
      score += evalEndgameCheckmating(pos);
      
    } catch (error) {
      console.error('Evaluation error:', error);
      // Fallback to basic material evaluation only
      score = evalMaterial(pos.board);
    }
    
    return score;
  }
  
  // Castling evaluation
  function evalCastling(pos) {
    let score = 0;
    const { castlingRights } = pos;
    
    // Bonus for having castling rights
    if (castlingRights.wk || castlingRights.wq) score += 20;
    if (castlingRights.bk || castlingRights.bq) score -= 20;
    
    return score;
  }
  
  // Aggressive checkmate opportunity detection
  function evalCheckmateOpportunities(pos) {
    let score = 0;
    
    // Skip checkmate detection during evaluation to prevent infinite recursion
    // Checkmate detection is handled in the main AI move selection
    return score;
  }
  
  // Advanced endgame checkmating strategies
  function evalEndgameCheckmating(pos) {
    let score = 0;
    
    try {
      const board = pos.board;
      
      // Calculate game phase for endgame detection
      let phase = 0;
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const piece = board[r][c];
          if (piece) {
            phase += PHASE_VALUES[piece.type] || 0;
          }
        }
      }
      const isEndgame = phase < 8; // Less than 8 phase points = endgame
      
      if (!isEndgame) return 0; // Only apply in endgame
      
      // 1. KING ACTIVITY IN ENDGAME
      score += evalKingActivity(board);
      
      // 2. CHECKMATE PATTERN RECOGNITION
      score += evalCheckmatePatterns(board);
      
      // 3. ENDGAME PIECE COORDINATION
      score += evalPieceCoordination(board);
      
      // 4. MATING NET DETECTION
      score += evalMatingNet(board);
      
    } catch (error) {
      // If any error occurs, return 0 to prevent crashes
      return 0;
    }
    
    return score;
  }
  
  // King activity evaluation
  function evalKingActivity(board) {
    let score = 0;
    
    try {
    
    // Find both kings
    let whiteKing = null, blackKing = null;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece && piece.type === "K") {
          if (piece.color === "w") whiteKing = {r, c};
          else blackKing = {r, c};
        }
      }
    }
    
    if (whiteKing) {
      // King centralization bonus (more important in endgame)
      const centerDistance = Math.abs(whiteKing.r - 3.5) + Math.abs(whiteKing.c - 3.5);
      score += (7 - centerDistance) * 15; // Up to 105 points for center
      
      // King mobility (squares it can move to)
      const kingMoves = getKingMobility(board, whiteKing.r, whiteKing.c, "w");
      score += kingMoves * 8; // 8 points per legal move
    }
    
    if (blackKing) {
      // King centralization bonus (more important in endgame)
      const centerDistance = Math.abs(blackKing.r - 3.5) + Math.abs(blackKing.c - 3.5);
      score -= (7 - centerDistance) * 15; // Up to 105 points for center
      
      // King mobility (squares it can move to)
      const kingMoves = getKingMobility(board, blackKing.r, blackKing.c, "b");
      score -= kingMoves * 8; // 8 points per legal move
    }
    
    } catch (error) {
      // If any error occurs, return 0 to prevent crashes
      return 0;
    }
    
    return score;
  }
  
  // Get king mobility (number of legal moves)
  function getKingMobility(board, r, c, color) {
    let moves = 0;
    const directions = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
    
    for (const [dr, dc] of directions) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
        const target = board[nr][nc];
        if (!target || target.color !== color) {
          // Simplified mobility count (avoid calling isSquareAttacked during evaluation)
          moves++;
        }
      }
    }
    return moves;
  }
  
  // Checkmate pattern recognition
  function evalCheckmatePatterns(board) {
    let score = 0;
    
    try {
      // 1. Back rank mate patterns
      score += evalBackRankMate(board);
      
      // 2. Smothered mate patterns
      score += evalSmotheredMate(board);
      
      // 3. Queen + King mate patterns
      score += evalQueenKingMate(board);
    } catch (error) {
      // If any error occurs, return 0 to prevent crashes
      return 0;
    }
    
    return score;
  }
  
  // Back rank mate evaluation
  function evalBackRankMate(board) {
    let score = 0;
    
    // Check white back rank (rank 0)
    const whiteBackRank = board[0];
    const whiteKing = whiteBackRank.find(p => p && p.type === "K" && p.color === "w");
    if (whiteKing) {
      // Count blocking pieces
      let blockingPieces = 0;
      for (let c = 0; c < 8; c++) {
        const piece = whiteBackRank[c];
        if (piece && piece.color === "w" && piece.type !== "K") {
          blockingPieces++;
        }
      }
      // Fewer blocking pieces = more vulnerable to back rank mate
      if (blockingPieces <= 1) score -= 50;
    }
    
    // Check black back rank (rank 7)
    const blackBackRank = board[7];
    const blackKing = blackBackRank.find(p => p && p.type === "K" && p.color === "b");
    if (blackKing) {
      // Count blocking pieces
      let blockingPieces = 0;
      for (let c = 0; c < 8; c++) {
        const piece = blackBackRank[c];
        if (piece && piece.color === "b" && piece.type !== "K") {
          blockingPieces++;
        }
      }
      // Fewer blocking pieces = more vulnerable to back rank mate
      if (blockingPieces <= 1) score += 50;
    }
    
    return score;
  }
  
  // Smothered mate evaluation
  function evalSmotheredMate(board) {
    let score = 0;
    
    // Look for kings surrounded by their own pieces
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece && piece.type === "K") {
          const color = piece.color;
          let friendlyPieces = 0;
          let totalSquares = 0;
          
          // Count friendly pieces around king
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              if (dr === 0 && dc === 0) continue;
              const nr = r + dr, nc = c + dc;
              if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
                totalSquares++;
                const neighbor = board[nr][nc];
                if (neighbor && neighbor.color === color) {
                  friendlyPieces++;
                }
              }
            }
          }
          
          // If king is mostly surrounded by friendly pieces, it's vulnerable to smothered mate
          if (totalSquares > 0 && friendlyPieces >= totalSquares * 0.7) {
            if (color === "w") score -= 30;
            else score += 30;
          }
        }
      }
    }
    
    return score;
  }
  
  // Queen + King mate patterns
  function evalQueenKingMate(board) {
    let score = 0;
    
    // Look for queen + king coordination
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece && piece.type === "Q") {
          const color = piece.color;
          
          // Find the king of the same color
          let king = null;
          for (let kr = 0; kr < 8; kr++) {
            for (let kc = 0; kc < 8; kc++) {
              const kPiece = board[kr][kc];
              if (kPiece && kPiece.type === "K" && kPiece.color === color) {
                king = {r: kr, c: kc};
                break;
              }
            }
            if (king) break;
          }
          
          if (king) {
            // Distance between queen and king (closer = better coordination)
            const distance = Math.abs(r - king.r) + Math.abs(c - king.c);
            if (distance <= 3) {
              if (color === "w") score += 25;
              else score -= 25;
            }
          }
        }
      }
    }
    
    return score;
  }
  
  // Piece coordination evaluation
  function evalPieceCoordination(board) {
    let score = 0;
    
    try {
      // Look for pieces that can work together for mate
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece && piece.type !== "P" && piece.type !== "K") {
          const color = piece.color;
          
          // Count other pieces that can coordinate with this piece
          let coordinationScore = 0;
          for (let or = 0; or < 8; or++) {
            for (let oc = 0; oc < 8; oc++) {
              const otherPiece = board[or][oc];
              if (otherPiece && otherPiece.color === color && otherPiece !== piece) {
                const distance = Math.abs(r - or) + Math.abs(c - oc);
                if (distance <= 4) {
                  coordinationScore += 5; // Bonus for nearby pieces
                }
              }
            }
          }
          
          if (color === "w") score += coordinationScore;
          else score -= coordinationScore;
        }
      }
    }
    
    } catch (error) {
      // If any error occurs, return 0 to prevent crashes
      return 0;
    }
    
    return score;
  }
  
  // Mating net detection
  function evalMatingNet(board) {
    let score = 0;
    
    try {
      // Look for pieces that can create mating nets
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece && piece.type === "Q") {
          const color = piece.color;
          
          // Check if queen can create mating threats
          const queenThreats = getQueenThreats(board, r, c, color);
          if (queenThreats > 0) {
            if (color === "w") score += queenThreats * 10;
            else score -= queenThreats * 10;
          }
        }
      }
    }
    
    } catch (error) {
      // If any error occurs, return 0 to prevent crashes
      return 0;
    }
    
    return score;
  }
  
  // Get queen threats (squares it attacks)
  function getQueenThreats(board, r, c, color) {
    let threats = 0;
    const directions = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
    
    for (const [dr, dc] of directions) {
      let nr = r + dr, nc = c + dc;
      while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
        const target = board[nr][nc];
        if (target) {
          if (target.color !== color) threats++;
          break;
        }
        threats++;
        nr += dr;
        nc += dc;
      }
    }
    
    return threats;
  }
  
  // Promotion potential evaluation
  function evalPromotionPotential(board) {
    let score = 0;
    
    // Check for pawns close to promotion
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece && piece.type === "P") {
          const isWhite = piece.color === "w";
          const promotionDistance = isWhite ? r : 7 - r;
          
          if (promotionDistance <= 2) {
            const bonus = (3 - promotionDistance) * 50;
            score += isWhite ? bonus : -bonus;
          }
        }
      }
    }
    
    return score;
  }
  
  // Endgame evaluation with basic tablebase knowledge
  function evalEndgame(board) {
    let score = 0;
    
    // Count pieces for endgame detection
    let pieceCount = 0;
    let whitePieces = 0, blackPieces = 0;
    let whitePawns = 0, blackPawns = 0;
    let whiteQueens = 0, blackQueens = 0;
    
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece) {
          pieceCount++;
          if (piece.color === "w") {
            whitePieces++;
            if (piece.type === "P") whitePawns++;
            if (piece.type === "Q") whiteQueens++;
          } else {
            blackPieces++;
            if (piece.type === "P") blackPawns++;
            if (piece.type === "Q") blackQueens++;
          }
        }
      }
    }
    
    // Endgame detection (few pieces remaining)
    if (pieceCount <= 8) {
      // King activity bonus in endgame
      const whiteKing = findKing("w", board);
      const blackKing = findKing("b", board);
      
      if (whiteKing) {
        const whiteKingActivity = Math.abs(whiteKing.r - 3.5) + Math.abs(whiteKing.c - 3.5);
        score += whiteKingActivity * 5; // Encourage king activity
      }
      
      if (blackKing) {
        const blackKingActivity = Math.abs(blackKing.r - 3.5) + Math.abs(blackKing.c - 3.5);
        score -= blackKingActivity * 5;
      }
      
      // Pawn advancement bonus in endgame
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const piece = board[r][c];
          if (piece && piece.type === "P") {
            const isWhite = piece.color === "w";
            const advancement = isWhite ? (7 - r) : r;
            const bonus = advancement * 20;
            score += isWhite ? bonus : -bonus;
          }
        }
      }
    }
    
    // King and pawn endgame knowledge
    if (pieceCount <= 6 && whitePawns + blackPawns > 0) {
      // Encourage king to support pawns
      const whiteKing = findKing("w", board);
      const blackKing = findKing("b", board);
      
      if (whiteKing && whitePawns > 0) {
        // Find white pawns and encourage king to be near them
        for (let r = 0; r < 8; r++) {
          for (let c = 0; c < 8; c++) {
            const piece = board[r][c];
            if (piece && piece.type === "P" && piece.color === "w") {
              const distance = Math.abs(whiteKing.r - r) + Math.abs(whiteKing.c - c);
              score += Math.max(0, 20 - distance * 5);
            }
          }
        }
      }
      
      if (blackKing && blackPawns > 0) {
        for (let r = 0; r < 8; r++) {
          for (let c = 0; c < 8; c++) {
            const piece = board[r][c];
            if (piece && piece.type === "P" && piece.color === "b") {
              const distance = Math.abs(blackKing.r - r) + Math.abs(blackKing.c - c);
              score -= Math.max(0, 20 - distance * 5);
            }
          }
        }
      }
    }
    
    return score;
  }
  
  // Piece safety evaluation (protect your pieces)
  function evalPieceSafety(board) {
    let score = 0;
    
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (!piece) continue;
        
        const isWhite = piece.color === "w";
        const isAttacked = isSquareAttacked(r, c, isWhite ? "b" : "w", board);
        const isDefended = isSquareAttacked(r, c, piece.color, board);
        
        if (isAttacked && !isDefended) {
          // Piece is hanging - big penalty
          const pieceValue = PIECE_VALUES[piece.type] || 0;
          score += isWhite ? -pieceValue * 0.5 : pieceValue * 0.5;
        } else if (isDefended && !isAttacked) {
          // Piece is well defended - small bonus
          score += isWhite ? PIECE_SAFETY_BONUS : -PIECE_SAFETY_BONUS;
        }
      }
    }
    
    return score;
  }
  
  // Center control evaluation
  function evalCenterControl(board) {
    let score = 0;
    const centerSquares = [[3,3], [3,4], [4,3], [4,4]]; // d4, d5, e4, e5
    
    for (const [r, c] of centerSquares) {
      const piece = board[r][c];
      if (piece) {
        const isWhite = piece.color === "w";
        const pieceValue = PIECE_VALUES[piece.type] || 0;
        score += isWhite ? pieceValue * 0.1 : -pieceValue * 0.1;
      }
    }
    
    // Bonus for pieces controlling center
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (!piece) continue;
        
        const distanceToCenter = Math.abs(r - 3.5) + Math.abs(c - 3.5);
        const centerBonus = Math.max(0, 4 - distanceToCenter) * CENTER_CONTROL_BONUS;
        
        if (piece.color === "w") {
          score += centerBonus;
        } else {
          score -= centerBonus;
        }
      }
    }
    
    return score;
  }
  
  // Piece development evaluation
  function evalDevelopment(board) {
    let score = 0;
    
    // Check if pieces are developed (moved from starting position)
    const startingPieces = {
      w: { N: [[0,1], [0,6]], B: [[0,2], [0,5]], R: [[0,0], [0,7]] },
      b: { N: [[7,1], [7,6]], B: [[7,2], [7,5]], R: [[7,0], [7,7]] }
    };
    
    for (const color of ["w", "b"]) {
      for (const pieceType of ["N", "B", "R"]) {
        for (const [startR, startC] of startingPieces[color][pieceType]) {
          const piece = board[startR][startC];
          if (piece && piece.type === pieceType && piece.color === color) {
            // Piece still on starting square - penalty
            score += color === "w" ? -DEVELOPMENT_BONUS : DEVELOPMENT_BONUS;
          }
        }
      }
    }
    
    return score;
  }
  
  // Advanced evaluation functions
  function evalBishopPair(board) {
    let score = 0;
    let whiteBishops = 0, blackBishops = 0;
    
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece && piece.type === "B") {
          if (piece.color === "w") whiteBishops++;
          else blackBishops++;
        }
      }
    }
    
    // Bishop pair bonus (~50 centipawns)
    if (whiteBishops >= 2) score += 50;
    if (blackBishops >= 2) score -= 50;
    
    return score;
  }
  
  function evalRookOnOpenFiles(board) {
    let score = 0;
    
    for (let c = 0; c < 8; c++) {
      let pawnsOnFile = 0;
      let whiteRook = null, blackRook = null;
      
      for (let r = 0; r < 8; r++) {
        const piece = board[r][c];
        if (piece) {
          if (piece.type === "P") pawnsOnFile++;
          else if (piece.type === "R") {
            if (piece.color === "w") whiteRook = r;
            else blackRook = r;
          }
        }
      }
      
      // Open file bonus (no pawns)
      if (pawnsOnFile === 0) {
        if (whiteRook !== null) score += 25;
        if (blackRook !== null) score -= 25;
      }
      // Semi-open file bonus (only opponent pawns)
      else {
        let whitePawns = 0, blackPawns = 0;
        for (let r = 0; r < 8; r++) {
          const piece = board[r][c];
          if (piece && piece.type === "P") {
            if (piece.color === "w") whitePawns++;
            else blackPawns++;
          }
        }
        if (whitePawns === 0 && blackRook !== null) score -= 15;
        if (blackPawns === 0 && whiteRook !== null) score += 15;
      }
    }
    
    return score;
  }
  
  function evalKnightOutposts(board) {
    let score = 0;
    
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece && piece.type === "N") {
          const isWhite = piece.color === "w";
          
          // Check if knight is on an outpost (4th/5th rank, protected by pawn)
          if ((isWhite && r >= 2 && r <= 4) || (!isWhite && r >= 3 && r <= 5)) {
            // Check for pawn protection
            const pawnRow = isWhite ? r + 1 : r - 1;
            let protected = false;
            
            if (pawnRow >= 0 && pawnRow < 8) {
              for (const dc of [-1, 1]) {
                const pc = c + dc;
                if (pc >= 0 && pc < 8) {
                  const protector = board[pawnRow][pc];
                  if (protector && protector.type === "P" && protector.color === piece.color) {
                    protected = true;
                    break;
                  }
                }
              }
            }
            
            if (protected) {
              score += isWhite ? 30 : -30;
            }
          }
        }
      }
    }
    
    return score;
  }
  
  function evalPassedPawns(board, phase) {
    let score = 0;
    
    for (let c = 0; c < 8; c++) {
      for (let r = 0; r < 8; r++) {
        const piece = board[r][c];
        if (piece && piece.type === "P") {
          const isWhite = piece.color === "w";
          let isPassed = true;
          
          // Check if pawn is passed (no enemy pawns blocking)
          const direction = isWhite ? -1 : 1;
          const startRow = isWhite ? r - 1 : r + 1;
          const endRow = isWhite ? 0 : 7;
          
          for (let checkR = startRow; checkR !== endRow + direction; checkR += direction) {
            if (checkR < 0 || checkR > 7) break;
            
            for (const checkC of [c - 1, c, c + 1]) {
              if (checkC >= 0 && checkC < 8) {
                const checkPiece = board[checkR][checkC];
                if (checkPiece && checkPiece.type === "P" && checkPiece.color !== piece.color) {
                  isPassed = false;
                  break;
                }
              }
            }
            if (!isPassed) break;
          }
          
          if (isPassed) {
            const rank = isWhite ? 7 - r : r;
            const bonus = rank * rank * 10; // Exponential bonus for advanced passed pawns
            
            // Bonus increases in endgame
            const phaseBonus = (TOTAL_PHASE - phase) / TOTAL_PHASE;
            const finalBonus = bonus * (1 + phaseBonus);
            
            score += isWhite ? finalBonus : -finalBonus;
          }
        }
      }
    }
    
    return score;
  }
  
  // Calculate centrality bonus for move ordering
  function getCentralityBonus(r, c) {
    const centerDistance = Math.abs(3.5 - r) + Math.abs(3.5 - c);
    return Math.max(0, 7 - centerDistance);
  }
  
  function allMoves(pos,side){
    const {board:b,enPassantTarget:ep,castlingRights:cr}=pos, out=[];
    for(let r=0;r<8;r++) for(let c=0;c<8;c++){
      const p=b[r][c]; if (!p||p.color!==side) continue;
      for(const m of genLegalFor(r,c,b,side,ep,cr)) out.push({from:{r,c},to:{r:m.r,c:m.c},meta:m});
    } return out;
  }
  
  // Advanced opening book based on top engines
  const openingBook = {
    // Starting position - top engine preferred openings
    "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w": [
      "e2e4", "d2d4", "g1f3", "c2c4"  // Top 4 most principled openings
    ],
    
    // === KING'S PAWN GAME (1.e4) ===
    // After 1.e4 - Black's main responses
    "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b": [
      "e7e5", "c7c5", "e7e6", "c7c6", "d7d6", "g8f6"
    ],
    
    // === RUY LOPEZ ===
    // 1.e4 e5 2.Nf3 Nc6 3.Bb5 (Spanish Opening)
    "r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b": [
      "a7a6", "f7f5", "g8f6", "f8c5", "b8d4"
    ],
    
    // === ITALIAN GAME ===
    // 1.e4 e5 2.Nf3 Nc6 3.Bc4
    "r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b": [
      "f8c5", "f8e7", "f7f5", "g8f6"
    ],
    
    // === SICILIAN DEFENSE ===
    // 1.e4 c5 - White's responses
    "rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w": [
      "g1f3", "b1c3", "f2f4", "c2c3"  // Open, Closed, Grand Prix, Alapin
    ],
    
    // Sicilian Dragon - 1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 g6
    "rnbqkb1r/pp2pp1p/3p1np1/8/3NP3/2N5/PPP2PPP/R1BQKB1R w": [
      "f2f3", "c1e3", "f1e2", "h2h3"  // Yugoslav Attack, Positional
    ],
    
    // === FRENCH DEFENSE ===
    // 1.e4 e6 - White's main systems
    "rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w": [
      "d2d4", "g1f3", "b1c3", "f2f4"  // Advance, King's Indian Attack, Exchange, King's Indian Attack
    ],
    
    // French Advance - 1.e4 e6 2.d4 d5 3.e5
    "rnbqkbnr/ppp2ppp/4p3/3pP3/3P4/8/PPP2PPP/RNBQKBNR b": [
      "c7c5", "b8c6", "g8e7", "f7f6"
    ],
    
    // === CARO-KANN DEFENSE ===
    // 1.e4 c6 - White's responses
    "rnbqkbnr/pp1ppppp/2p5/8/4P3/8/PPPP1PPP/RNBQKBNR w": [
      "d2d4", "b1c3", "g1f3", "f2f4"
    ],
    
    // === QUEEN'S PAWN GAME (1.d4) ===
    // After 1.d4 - Black's main responses
    "rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b": [
      "d7d5", "g8f6", "e7e6", "c7c5", "f7f5"
    ],
    
    // === QUEEN'S GAMBIT ===
    // 1.d4 d5 2.c4 - Queen's Gambit
    "rnbqkbnr/ppp1pppp/8/3p4/2PP4/8/PP2PPPP/RNBQKBNR b": [
      "e7e6", "c7c6", "d5c4", "b8c6", "g8f6"  // Declined, Slav, Accepted
    ],
    
    // Queen's Gambit Declined - 1.d4 d5 2.c4 e6
    "rnbqkbnr/ppp2ppp/4p3/3p4/2PP4/8/PP2PPPP/RNBQKBNR w": [
      "b1c3", "g1f3", "c4d5", "e2e3"
    ],
    
    // === NIMZO-INDIAN DEFENSE ===
    // 1.d4 Nf6 2.c4 e6 3.Nc3 Bb4
    "rnbqk2r/pppp1ppp/4pn2/8/1bPP4/2N5/PP2PPPP/R1BQKBNR w": [
      "e2e3", "g1f3", "f2f3", "a2a3", "d1c2"
    ],
    
    // === KING'S INDIAN DEFENSE ===
    // 1.d4 Nf6 2.c4 g6 3.Nc3 Bg7
    "rnbqk2r/pppppn1p/6p1/8/2PP4/2N5/PP2PPPP/R1BQKBNR w": [
      "e2e4", "g1f3", "f2f3", "h2h3"  // Classical, Fianchetto, Four Pawns
    ],
    
    // === ENGLISH OPENING ===
    // 1.c4 - English Opening responses
    "rnbqkbnr/pppppppp/8/8/2P5/8/PP1PPPPP/RNBQKBNR b": [
      "e7e5", "g8f6", "c7c5", "e7e6", "g7g6"
    ],
    
    // === RETI OPENING ===
    // 1.Nf3 - Reti Opening
    "rnbqkbnr/pppppppp/8/8/8/5N2/PPPPPPPP/RNBQKB1R b": [
      "d7d5", "g8f6", "c7c5", "e7e6", "g7g6"
    ],
    
    // === ADVANCED VARIATIONS ===
    
    // Ruy Lopez Berlin Defense - 1.e4 e5 2.Nf3 Nc6 3.Bb5 Nf6
    "r1bqkb1r/pppp1ppp/2n2n2/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w": [
      "e1g1", "d2d3", "c1g5", "f1e1"
    ],
    
    // Sicilian Najdorf - 1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 a6
    "rnbqkb1r/1p2pppp/p2p1n2/8/3NP3/2N5/PPP2PPP/R1BQKB1R w": [
      "c1g5", "f1e2", "f2f3", "h2h3", "g2g3"
    ],
    
    // Queen's Indian Defense - 1.d4 Nf6 2.c4 e6 3.Nf3 b6
    "rnbqkb1r/p1pp1ppp/1p2pn2/8/2PP4/5N2/PP2PPPP/RNBQKB1R w": [
      "g2g3", "a2a3", "b1c3", "e2e3"
    ],
    
    // Catalan Opening - 1.d4 Nf6 2.c4 e6 3.g3
    "rnbqkb1r/pppp1ppp/4pn2/8/2PP4/6P1/PP2PP1P/RNBQKBNR b": [
      "d7d5", "c7c5", "f8b4", "b7b6"
    ],
    
    // Grünfeld Defense - 1.d4 Nf6 2.c4 g6 3.Nc3 d5
    "rnbqkb1r/ppp1pp1p/5np1/3p4/2PP4/2N5/PP2PPPP/R1BQKBNR w": [
      "c4d5", "g1f3", "e2e3", "c1f4"
    ]
  };

  // Advanced opening move selection with priorities
  function getOpeningMove(pos, side) {
    const fen = getFEN(pos, side);
    const moves = openingBook[fen];
    if (moves && moves.length > 0) {
      // Weighted selection - first moves are more likely to be chosen
      const weights = moves.map((_, i) => Math.max(1, moves.length - i));
      const totalWeight = weights.reduce((sum, w) => sum + w, 0);
      
      let random = Math.random() * totalWeight;
      for (let i = 0; i < moves.length; i++) {
        random -= weights[i];
        if (random <= 0) {
          return moves[i];
        }
      }
      
      // Fallback to first move
      return moves[0];
    }
    return null;
  }

  // Convert move string to move object
  function parseOpeningMove(moveString, side) {
    if (moveString.length !== 4) return null;
    
    const from = { r: 8 - parseInt(moveString[1]), c: moveString.charCodeAt(0) - 97 };
    const to = { r: 8 - parseInt(moveString[3]), c: moveString.charCodeAt(2) - 97 };
    
    return { from, to, meta: {} };
  }

  // Check if a move gives check
  function isCheckMove(pos, move, side) {
    const testPos = clonePosition(pos.board, pos.enPassantTarget, pos.castlingRights);
    applySimMove(testPos, move.from.r, move.from.c, move.to.r, move.to.c, move.meta);
    return isInCheckFor(testPos.board, opposite(side));
  }

  // Check if a move gives checkmate
  function isCheckmateMove(pos, move, side) {
    const testPos = clonePosition(pos.board, pos.enPassantTarget, pos.castlingRights);
    applySimMove(testPos, move.from.r, move.from.c, move.to.r, move.to.c, move.meta);
    
    const opponentInCheck = isInCheckFor(testPos.board, opposite(side));
    const opponentMoves = allMoves(testPos, opposite(side));
    
    return opponentInCheck && opponentMoves.length === 0;
  }

  // Get FEN string for opening book lookup
  function getFEN(pos, side) {
    let fen = "";
    
    // Board position
    for (let r = 0; r < 8; r++) {
      let emptyCount = 0;
      for (let c = 0; c < 8; c++) {
        const piece = pos.board[r][c];
        if (piece) {
          if (emptyCount > 0) {
            fen += emptyCount;
            emptyCount = 0;
          }
          const symbol = piece.color === "w" ? piece.type.toUpperCase() : piece.type.toLowerCase();
          fen += symbol;
        } else {
          emptyCount++;
        }
      }
      if (emptyCount > 0) fen += emptyCount;
      if (r < 7) fen += "/";
    }
    
    fen += " " + side;
    return fen;
  }

  // Smart move ordering with checkmate detection
  // Simplified move ordering for better performance
  function orderMoves(moves, pos, side) {
    return moves.sort((a, b) => {
      // 1. CAPTURES FIRST (MVV-LVA)
      const aTarget = pos.board[a.to.r] ? pos.board[a.to.r][a.to.c] : null;
      const bTarget = pos.board[b.to.r] ? pos.board[b.to.r][b.to.c] : null;
      
      if (aTarget && !bTarget) return -1; // a is capture, b is not
      if (!aTarget && bTarget) return 1;  // b is capture, a is not
      
      if (aTarget && bTarget) {
        const aVictimValue = PIECE_VALUES[aTarget.type] || 0;
        const bVictimValue = PIECE_VALUES[bTarget.type] || 0;
        if (aVictimValue !== bVictimValue) return bVictimValue - aVictimValue;
      }
      
      // 2. CHECKS (with error handling)
      try {
        const aIsCheck = isCheckMove(pos, a, side);
        const bIsCheck = isCheckMove(pos, b, side);
        if (aIsCheck && !bIsCheck) return -1;
        if (!aIsCheck && bIsCheck) return 1;
        
        // 2.5. ENDGAME CHECKMATE PRIORITY
        if (aIsCheck && bIsCheck) {
          // Both are checks - prioritize potential checkmates
          const aIsCheckmate = isCheckmateMove(pos, a, side);
          const bIsCheckmate = isCheckmateMove(pos, b, side);
          if (aIsCheckmate && !bIsCheckmate) return -1;
          if (!aIsCheckmate && bIsCheckmate) return 1;
        }
      } catch (e) {
        // Skip check detection if error - no crash
      }
      
      // 3. PROMOTIONS
      const aIsPromotion = a.meta && a.meta.promote;
      const bIsPromotion = b.meta && b.meta.promote;
      if (aIsPromotion && !bIsPromotion) return -1;
      if (!aIsPromotion && bIsPromotion) return 1;
      
      // 5. CASTLING MOVES (with safety checks)
      const aIsCastle = a && a.meta && (a.meta.special === "castle-k" || a.meta.special === "castle-q");
      const bIsCastle = b && b.meta && (b.meta.special === "castle-k" || b.meta.special === "castle-q");
      if (aIsCastle && !bIsCastle) return -1;
      if (!aIsCastle && bIsCastle) return 1;
      
      // 6. ENDGAME KING ACTIVITY
      const gamePhase = getGamePhase(pos.board);
      if (gamePhase < 8) { // Endgame
        const aKingActivity = getKingActivityScore(pos, a, side);
        const bKingActivity = getKingActivityScore(pos, b, side);
        if (aKingActivity !== bKingActivity) {
          return bKingActivity - aKingActivity; // Higher activity first
        }
      }
      
      // 7. CENTER CONTROL (fast heuristic) - with safety checks
      let aCenterDistance = 7, bCenterDistance = 7; // Default to edge distance
      if (a && a.to && a.to.r !== undefined && a.to.c !== undefined) {
        aCenterDistance = Math.abs(a.to.r - 3.5) + Math.abs(a.to.c - 3.5);
      }
      if (b && b.to && b.to.r !== undefined && b.to.c !== undefined) {
        bCenterDistance = Math.abs(b.to.r - 3.5) + Math.abs(b.to.c - 3.5);
      }
      
      return aCenterDistance - bCenterDistance;
    });
  }
  
  // Get game phase for endgame detection
  function getGamePhase(board) {
    let phase = 0;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece) {
          phase += PHASE_VALUES[piece.type] || 0;
        }
      }
    }
    return phase;
  }
  
  // Get king activity score for move ordering
  function getKingActivityScore(pos, move, side) {
    if (move.from && pos.board[move.from.r] && pos.board[move.from.r][move.from.c]) {
      const piece = pos.board[move.from.r][move.from.c];
      if (piece && piece.type === "K") {
        // King moves get higher priority in endgame
        const centerDistance = Math.abs(move.to.r - 3.5) + Math.abs(move.to.c - 3.5);
        return 50 - centerDistance; // Closer to center = higher score
      }
    }
    return 0;
  }
  
  // Check if a capture is safe (not recaptured)
  function isSafeCapture(pos, move, side) {
    const target = pos.board[move.to.r][move.to.c];
    if (!target) return true;
    
    // Simulate the capture
    const testPos = clonePosition(pos.board, pos.enPassantTarget, pos.castlingRights);
    applySimMove(testPos, move.from.r, move.from.c, move.to.r, move.to.c, move.meta);
    
    // Check if the captured square can be recaptured
    const opponentMoves = allMoves(testPos, opposite(side));
    const canRecapture = opponentMoves.some(oppMove => 
      oppMove.to.r === move.to.r && oppMove.to.c === move.to.c
    );
    
    return !canRecapture;
  }
  
  // Check if a move is safe (doesn't hang pieces)
  function isMoveSafe(pos, move, side) {
    // Simulate the move
    const testPos = clonePosition(pos.board, pos.enPassantTarget, pos.castlingRights);
    applySimMove(testPos, move.from.r, move.from.c, move.to.r, move.to.c, move.meta);
    
    // Check if any of our pieces are hanging after this move
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = testPos.board[r][c];
        if (piece && piece.color === side) {
          const isAttacked = isSquareAttacked(r, c, opposite(side), testPos.board);
          const isDefended = isSquareAttacked(r, c, side, testPos.board);
          
          if (isAttacked && !isDefended) {
            return false; // Piece is hanging
          }
        }
      }
    }
    
    return true;
  }
  
  // Transposition table for position caching (with size limit)
  const transpositionTable = new Map();
  const MAX_TT_SIZE = 10000; // Limit transposition table size
  
  // Position history for repetition detection
  let positionHistory = [];
  
  
  // Quiescence search for tactical depth
  function quiescence(pos, alpha, beta, side, depth = 0) {
    // Limit quiescence depth to prevent infinite recursion
    if (depth >= 5) return evalPos(pos) * (side === "w" ? 1 : -1);
    
    const standPat = evalPos(pos) * (side === "w" ? 1 : -1);
    
    if (standPat >= beta) return beta;
    if (standPat > alpha) alpha = standPat;
    
    const captures = allMoves(pos, side).filter(move => {
      const target = pos.board[move.to.r][move.to.c];
      return target !== null;
    });
    
    // Limit quiescence depth for speed
    if (captures.length > 8) {
      captures.splice(8); // Only consider top 8 captures
    }
    
    const orderedCaptures = orderMoves(captures, pos, side);
    
    for (const move of orderedCaptures) {
      const child = clonePosition(pos.board, pos.enPassantTarget, pos.castlingRights);
      applySimMove(child, move.from.r, move.from.c, move.to.r, move.to.c, move.meta);
      
      const score = -quiescence(child, -beta, -alpha, opposite(side), depth + 1);
      
      if (score >= beta) return beta;
      if (score > alpha) alpha = score;
    }
    
    return alpha;
  }

  function negamax(pos, depth, alpha, beta, side) {
    const originalAlpha = alpha;
    
    // Transposition table lookup
    const posHash = getPositionHash(pos);
    const ttEntry = transpositionTable.get(posHash);
    if (ttEntry && ttEntry.depth >= depth) {
      if (ttEntry.flag === 'exact') return { score: ttEntry.score, move: ttEntry.move };
      if (ttEntry.flag === 'lower') alpha = Math.max(alpha, ttEntry.score);
      if (ttEntry.flag === 'upper') beta = Math.min(beta, ttEntry.score);
      if (alpha >= beta) return { score: ttEntry.score, move: ttEntry.move };
    }
    
    const moves = allMoves(pos, side);
    const inChk = isInCheckFor(pos.board, side);
    
    if (depth === 0 || moves.length === 0) {
      if (moves.length === 0) return { score: inChk ? -100000 + (3 - depth) : 0 };
      
      // Use quiescence search at leaf nodes
      const score = quiescence(pos, alpha, beta, side);
      return { score: score, move: null };
    }
    
    // Order moves for better performance
    const orderedMoves = orderMoves(moves, pos, side);
    
    let best = { score: -Infinity, move: null };
    let bestMove = null;
    
    for (const mv of orderedMoves) {
      const child = clonePosition(pos.board, pos.enPassantTarget, pos.castlingRights);
      applySimMove(child, mv.from.r, mv.from.c, mv.to.r, mv.to.c, mv.meta);
      const res = negamax(child, depth - 1, -beta, -alpha, opposite(side));
      const sc = -res.score;
      
      if (sc > best.score) {
        best = { score: sc, move: mv };
        bestMove = mv;
      }
      
      if (sc > alpha) alpha = sc;
      if (alpha >= beta) break;
    }
    
    // Store in transposition table
    let flag = 'exact';
    if (best.score <= originalAlpha) flag = 'upper';
    if (best.score >= beta) flag = 'lower';
    
    // Manage transposition table size
    if (transpositionTable.size >= MAX_TT_SIZE) {
      // Clear half the entries (simple cleanup)
      const entries = Array.from(transpositionTable.entries());
      transpositionTable.clear();
      for (let i = 0; i < entries.length / 2; i++) {
        transpositionTable.set(entries[i][0], entries[i][1]);
      }
    }
    
    transpositionTable.set(posHash, new TTEntry(best.score, depth, flag, bestMove));
    
    return best;
  }
  
  // Transposition table entry class
  class TTEntry {
    constructor(score, depth, flag, move) {
      this.score = score;
      this.depth = depth;
      this.flag = flag; // 'exact', 'lower', 'upper'
      this.move = move;
    }
  }
  function aiMove(){
    if (!aiEnabled || gameOver || pendingPromotion) return;
    if (turn!==aiColor) return;
    
    // Safety checks
    if (!board || !Array.isArray(board) || board.length !== 8) {
      console.error('Invalid board state');
      return;
    }
    
    const pos=clonePosition(board,enPassantTarget,castlingRights);
    
    // 1. CHECK OPENING BOOK FIRST (only for first few moves)
    const moveCount = history.length;
    if (moveCount < 4) { // Only use opening book for first 4 moves
      const openingMoveString = getOpeningMove(pos, aiColor);
      if (openingMoveString) {
        const openingMove = parseOpeningMove(openingMoveString, aiColor);
        if (openingMove) {
          // Verify the opening move is legal
          const allLegalMoves = allMoves(pos, aiColor);
          const isLegal = allLegalMoves.some(move => 
            move.from.r === openingMove.from.r && 
            move.from.c === openingMove.from.c && 
            move.to.r === openingMove.to.r && 
            move.to.c === openingMove.to.c
          );
          
          if (isLegal) {
            makeMove(openingMove.from.r, openingMove.from.c, openingMove.to.r, openingMove.to.c, openingMove.meta);
            lastMove = {from: openingMove.from, to: openingMove.to};
            if (!pendingPromotion) { turn = opposite(turn); updateAll(); }
            return;
          }
        }
      }
    }
    
    // 2. TACTICAL SEARCH (checkmate, checks, captures)
    const allLegalMoves = allMoves(pos, aiColor);
    if (!allLegalMoves || allLegalMoves.length === 0) {
      console.error('No legal moves found');
      updateAll();
      return;
    }
    
    const orderedMoves = orderMoves(allLegalMoves, pos, aiColor);
    
    // Look for immediate checkmate (with error handling)
    try {
      for (const move of orderedMoves) {
        if (isCheckmateMove(pos, move, aiColor)) {
          makeMove(move.from.r, move.from.c, move.to.r, move.to.c, move.meta);
          lastMove = {from: move.from, to: move.to};
          if (!pendingPromotion) { turn = opposite(turn); updateAll(); }
          return;
        }
      }
    } catch (error) {
      console.error('Checkmate detection error:', error);
      // Continue with normal search
    }
    
    // 3. OPTIMIZED ITERATIVE DEEPENING SEARCH
    let bestMove = null;
    let bestScore = -Infinity;
    const startTime = Date.now();
    const maxTime = 2000; // 2 seconds max
    
    try {
      for (let depth = 1; depth <= aiDepth; depth++) {
        const result = negamax(pos, depth, -Infinity, Infinity, aiColor);
        if (result.move) {
          bestMove = result.move;
          bestScore = result.score;
        }
        
        // Early termination conditions
        if (bestScore > CHECKMATE_BONUS - 1000) break; // Winning move found
        if (Date.now() - startTime > maxTime) break; // Time limit reached
        if (depth >= 3 && bestScore < -CHECKMATE_BONUS + 1000) break; // Losing position
      }
    } catch (error) {
      console.error('AI search error:', error);
      // Fallback to first legal move
      if (allLegalMoves.length > 0) {
        bestMove = allLegalMoves[0];
      }
    }
    
    // If no move found or the best move leads to repetition, find alternative
    let needsAlternative = false;
    try {
      needsAlternative = !bestMove || wouldCauseRepetition(pos, bestMove) || isPerpetualCheck(pos, bestMove, aiColor);
    } catch (error) {
      console.error('Repetition check error:', error);
      needsAlternative = !bestMove; // Only check if we have no move
    }
    
    if (needsAlternative) { 
      // Finding alternative move...
      
      // Filter out moves that cause repetition or perpetual check
      let goodMoves = [];
      try {
        goodMoves = allLegalMoves.filter(move => {
          try {
            return !wouldCauseRepetition(pos, move) && !isPerpetualCheck(pos, move, aiColor);
          } catch (e) {
            return true; // If error checking, assume move is good
          }
        });
      } catch (error) {
        console.error('Move filtering error:', error);
        goodMoves = allLegalMoves; // Use all moves if filtering fails
      }
      
      // If no good moves found, use all moves
      if (goodMoves.length === 0) {
        goodMoves = allLegalMoves;
      }
      
      if (goodMoves.length > 0) {
        // Add some randomization to avoid predictable play
        const randomIndex = Math.floor(Math.random() * Math.min(3, goodMoves.length));
        bestMove = goodMoves[randomIndex];
        // Selected alternative move to avoid repetition
      } else {
        // Fallback to a random legal move
        const randomIndex = Math.floor(Math.random() * allLegalMoves.length);
        bestMove = allLegalMoves[randomIndex];
        // Using random fallback move
      }
      
      if (!bestMove) {
        console.error('No move found by AI');
        updateAll(); 
        return; 
      }
    }
    
    makeMove(bestMove.from.r,bestMove.from.c,bestMove.to.r,bestMove.to.c,bestMove.meta);
    lastMove={from:bestMove.from,to:bestMove.to};
    if (!pendingPromotion){ turn=opposite(turn); updateAll(); }
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
    overlayActionsEl.style.display="block";
    overlayEl.classList.add("visible");
    overlayEl.setAttribute("aria-hidden","false");
  }
  function openPromotion(color,at,onChoose){
    pendingPromotion={color,at,choose:onChoose};
    promotionOverlayEl.classList.add("visible");
    promotionOverlayEl.setAttribute("aria-hidden","false");
  }
  function hideOverlay(){
    overlayEl.classList.remove("visible");
    overlayEl.setAttribute("aria-hidden","true");
    promotionOverlayEl.classList.remove("visible");
    promotionOverlayEl.setAttribute("aria-hidden","true");
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
    
    const k = findKing(turn, board);
    let inChk = false;
    
    if (k) {
      try {
        inChk = isSquareAttacked(k.r, k.c, opposite(turn), board);
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
        
        // Add rank number to left column - based on display position
        if (displayC === 0) { // left column in display
          const rank = String(8 - displayR); // 8-1
          d.dataset.rank = rank;
        }
        
        // Add file letter to bottom row - based on display position
        if (displayR === 7) { // bottom row in display
          const file = String.fromCharCode(97 + displayC); // a-h
          d.dataset.file = file;
        }
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
          
          // Create move indicator as actual DOM element to avoid rotation issues
          const indicator = document.createElement("div");
          indicator.className = cap ? "move-indicator capture" : "move-indicator legal";
          d.appendChild(indicator);
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
      gameOver=true; showOverlay("CHECKMATE",`${winner} wins`);
    } else if (!check && !any){
      gameOver=true; showOverlay("STALEMATE","No legal moves — Draw");
    } else if (check){
      gameStatusEl.textContent="Check!"; hideBanner();
    } else {
      gameStatusEl.textContent=""; hideBanner();
    }
  }
  function updateAll(){
    console.log('updateAll called, current state:', {aiEnabled, aiColor, turn, gameOver, pendingPromotion});
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
    
    
    if (selected && intended){
      // Check if it's the player's turn in online games
      if (typeof onlineChess !== 'undefined' && onlineChess.isOnline && !onlineChess.isMyTurn) {
        return;
      }
      
      const from={r:selected.r,c:selected.c}, to={r,c};
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
          // Human move completed, switching turn
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
          selected = null; 
          legalMoves = []; 
          render(); 
          return;
        }
        
        // Check if player can select this piece (own pieces only)
        if (!onlineChess.canSelectPiece(cell)) {
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
      return; // Not the player's turn
    }
    
    pushHistory();
    const target = board[tr][tc];
    if (meta && meta.special==="enpassant"){
      const dir=moving.color==="w"?1:-1, cap=board[tr+dir][tc];
      if (cap) recordCapture(cap);
      board[tr+dir][tc]=null;
    } else if (target) recordCapture(target);

    // Handle promotion
    if (meta && meta.promote) {
      board[tr][tc] = {type: meta.promote, color: moving.color, hasMoved: true};
    } else {
      board[tr][tc]={...moving,hasMoved:true};
    }
    board[sr][sc]=null;

    if (moving.type==="P" && Math.abs(tr-sr)===2) enPassantTarget={r:(tr+sr)/2,c:sc};
    else enPassantTarget=null;
    
    // Track position for repetition detection
    const currentPos = {board, enPassantTarget, castlingRights};
    const posHash = getPositionHash(currentPos);
    positionHistory.push(posHash);
    
    // Keep position history manageable (last 20 positions)
    if (positionHistory.length > 20) {
      positionHistory.shift();
    }

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
    
    // Clear AI state
    moveHistory = [];
    positionHistory = [];
    transpositionTable.clear();
    
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
  if (joinPanel) { joinPanel.classList.add("show"); }
  if (createPanel) { createPanel.classList.add("show"); }
  }
  function hideJoinPanels(){
  if (joinPanel) { joinPanel.classList.remove("show"); }
  if (createPanel) { createPanel.classList.remove("show"); }
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
  document.addEventListener('DOMContentLoaded', function() {
  if (newGameBtn) newGameBtn.addEventListener("click", ()=>{
      // Cancel online search if active
      if (typeof onlineChess !== 'undefined' && onlineChess.isWaiting) {
        onlineChess.cancelSearch();
      }
      
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

    // Close overlay button
    const closeOverlayBtn = document.getElementById("closeOverlayBtn");
    if (closeOverlayBtn) closeOverlayBtn.addEventListener("click", ()=>{
      hideOverlay();
    });

    // Exit to Menu button
    const exitToMenuBtn = document.getElementById("exitToMenuBtn");
    if (exitToMenuBtn) exitToMenuBtn.addEventListener("click", ()=>{
      // Cancel online search if active
      if (typeof onlineChess !== 'undefined' && onlineChess.isWaiting) {
        onlineChess.cancelSearch();
      }
      
      // Reset game state
      aiEnabled = false;
      closeCpuTray();
      closeJoinTray();
      syncAiControlsUI();
      
      // Clear saved state so extension opens on menu next time
      clearState();
      
      // Hide overlay and go back to menu
      hideOverlay();
      showMenuScreen();
  });

  // Toggle the CPU options tray without disabling side buttons
  if (toggleAiBtn) toggleAiBtn.addEventListener("click", ()=>{
      // Cancel online search if active
      if (typeof onlineChess !== 'undefined' && onlineChess.isWaiting) {
        onlineChess.cancelSearch();
      }
      
    if (cpuTrayOpen) {
      closeCpuTray();
    } else {
      openCpuTray();
    }
  });
// Tabs functionality removed

  // Choose CPU side -> start game vs computer
  if (aiWhiteBtn) aiWhiteBtn.addEventListener("click", ()=>{
      // Cancel online search if active
      if (typeof onlineChess !== 'undefined' && onlineChess.isWaiting) {
        onlineChess.cancelSearch();
      }
      
    aiEnabled=true; aiColor="w";
    closeCpuTray();
    closeJoinTray();
    resetGame(); syncAiControlsUI(); showGameScreen(); maybeTriggerAIMove();
  });
  if (aiBlackBtn) aiBlackBtn.addEventListener("click", ()=>{
      // Cancel online search if active
      if (typeof onlineChess !== 'undefined' && onlineChess.isWaiting) {
        onlineChess.cancelSearch();
      }
      
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

    // Cancel search button
    if (cancelSearchBtn) {
      cancelSearchBtn.addEventListener('click', () => {
        onlineChess.cancelSearch();
    });
  }

  // Join/Create Room button behavior (show both panels, exclusive with CPU tray)
 if (openJoinPanelBtn) openJoinPanelBtn.addEventListener("click", ()=>{
  // Cancel online search if active
  if (typeof onlineChess !== 'undefined' && onlineChess.isWaiting) {
    onlineChess.cancelSearch();
  }
  
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

    // Move all event listeners INSIDE DOMContentLoaded
  if (undoBtn) undoBtn.addEventListener("click", undo);
  if (redoBtn) redoBtn.addEventListener("click", redo);
  if (backToMenuBtn) backToMenuBtn.addEventListener("click", ()=>{
    closeCpuTray();
    closeJoinTray();
      clearState();
    showMenuScreen();
  });

  window.addEventListener("keydown",(e)=>{
    if (e.ctrlKey && e.key==="z"){ e.preventDefault(); undo(); }
    if (e.ctrlKey && (e.key==="y" || (e.shiftKey && e.key.toLowerCase()==="z"))){ e.preventDefault(); redo(); }
  });
    
  if (promotionOverlayEl){
    promotionOverlayEl.addEventListener("click",(e)=>{
      const btn=e.target.closest("button[data-promote]");
      if (!btn || !pendingPromotion) return;
      const piece=btn.getAttribute("data-promote"); // Q R B N
      pendingPromotion.choose(piece);
    });
  }

  }); // End DOMContentLoaded

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
      // If there's a saved game, go directly to game screen
      showGameScreen();
    } else {
      resetGame();
      // If no saved game, stay on menu screen
      showMenuScreen();
    }
    hideOverlay();
  });
})();

