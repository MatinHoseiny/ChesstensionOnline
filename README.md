<p align="center" style="margin-top: -20px; margin-bottom: -40px;">
  <img src="images/chesstention-logo.png" alt="Chesstention Logo" width="900" style="border-radius: 12px; box-shadow: 0 0 6px rgba(0,0,0,0.15);" />
</p>


<p align="center" style="color: #aaaaaa; font-size: 15px;">
  A sleek, intelligent chess extension — play online, offline, or against adaptive AI.
</p>


<div align="center">

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/MatinHoseiny/ChesstentionOnline)
[![License](https://img.shields.io/badge/license-AGPL--3.0-orange.svg)](LICENSE)
[![Chrome Web Store](https://img.shields.io/badge/Chrome-Extension-green.svg)](https://chrome.google.com/webstore)
[![Firefox Add-ons](https://img.shields.io/badge/Firefox-Add--on-orange.svg)](https://addons.mozilla.org)

</div>

<hr style="height:2px;border:none;background:linear-gradient(90deg,#00c6ff,#0072ff);border-radius:1px;">


## ✨ Highlights
<div align="center">

| | |
|:--:|:--:|
| 🌐 **Online Multiplayer** | Real-time WebSocket + WebRTC matches |
| 🤖 **Adaptive AI** | Negamax + α-β pruning + positional heuristics |
| 🏠 **Local Play** | Hot-seat 2-player mode |
| 💾 **Smart Saving** | Resume games anytime |
| 🔄 **Undo / Redo** | Full move history navigation |

</div>


<hr style="height:2px;border:none;background:linear-gradient(90deg,#00c6ff,#0072ff);border-radius:1px;">


## 📸 Screenshots

<div align="center">
  <table>
    <tr>
      <td align="center" width="50%">
        <img src="images/readme1 (2).png" alt="Main Menu" width="95%" style="border-radius:14px; box-shadow:0 0 15px rgba(0,0,0,0.35); margin:8px;" /><br>
        <sub><b>Main Menu</b><br><i>Select between Online, AI, or Local play modes instantly</i></sub>
      </td>
      <td align="center" width="50%">
        <img src="media/readme1 (1).gif" alt="Chesstention Gameplay Demo" width="95%" style="border-radius:14px; box-shadow:0 0 15px rgba(0,0,0,0.35); margin:8px;" /><br>
        <sub><b>Gameplay Demo</b><br><i>Board, moves, and AI in action</i></sub>
      </td>
    </tr>
  </table>
</div>




<hr style="height:2px;border:none;background:linear-gradient(90deg,#00c6ff,#0072ff);border-radius:1px;">



## 🧠 Engine Overview

> Built for realistic, tactical, and human-like chess play.

- **Negamax search** with α-β pruning & iterative deepening  
- **Evaluation:** material, mobility, king safety, pawn structure  
- **Heuristics:** MVV-LVA, history ordering  
- **Dynamic difficulty:** adaptive depth & evaluation noise for realism  

<hr style="height:2px;border:none;background:linear-gradient(90deg,#00c6ff,#0072ff);border-radius:1px;">

## 🔬 Deep AI Capabilities

The custom engine is a highly capable and professionally engineered system, moving beyond simple minimax to achieve strategic depth:

* **Optimized Search:** Utilizes **Iterative Deepening Search (IDS)** paired with **Transposition Tables (TT)**. This guarantees the engine finds the best move within its time limit and avoids re-evaluating identical positions, significantly improving speed and depth.
* **Quiescence Search (Q-Search):** An essential tactical layer that is activated at the end of the primary search. It specifically evaluates **forcing moves** (checks and captures) to prevent the "Horizon Effect" and ensures no immediate tactical blunders are missed.
* **Adaptive Evaluation & Game Phase:** The positional evaluation is **dynamic**, relying on a $\text{game phase}$ calculation (based on remaining material). This allows the AI to correctly shift strategic focus:
    * **Middlegame:** Prioritizes **King Safety**, **Development**, and **Center Control**.
    * **Endgame:** Prioritizes **King Activity** and the advanced push of **Passed Pawns** (using an exponential bonus).
* **Strategic Pattern Recognition:** The engine contains explicit logic for advanced chess concepts, including the detection and evaluation of favorable **Outposts**, the **Bishop Pair** advantage, and penalties for poor structure (e.g., **Doubled/Isolated Pawns**).
* **Tactical Awareness & Ordering:** Implements **$\text{MVV-LVA}$ (Most Valuable Victim - Least Valuable Attacker)** move ordering to prioritize dangerous captures. It also includes heuristics to recognize and exploit immediate **Forks**, **Pins**, and **Skewers**.
* **Opening Book:** Integrates a curated library of top-engine opening lines, ensuring the AI begins the game with theoretically sound and high-quality moves.

<hr style="height:2px;border:none;background:linear-gradient(90deg,#00c6ff,#0072ff);border-radius:1px;">

## ⚙️ Tech Stack

<div align="center">

| Layer | Technology |
|-------|-------------|
| 🎮 Gameplay | Vanilla JavaScript (ES6 Modules) |
| 🧩 Interface | CSS3 + Custom Themes |
| 🔗 Networking | WebSocket + WebRTC |
| 🧠 AI | Custom Negamax Engine |
| 📦 Packaging | Chrome / Firefox Extension APIs |

</div>


<p align="center">
  <img src="https://img.shields.io/badge/JavaScript-ES6+-yellow?logo=javascript&logoColor=white&style=for-the-badge" />
  <img src="https://img.shields.io/badge/WebSocket-Real--Time-blue?logo=websocket&style=for-the-badge" />
  <img src="https://img.shields.io/badge/CSS3-Responsive-blueviolet?logo=css3&logoColor=white&style=for-the-badge" />
</p>

<hr style="height:2px;border:none;background:linear-gradient(90deg,#00c6ff,#0072ff);border-radius:1px;">


## 🚀 Quick Install

### 🧩 Chrome / Edge
1. Download the latest release  
2. Go to `chrome://extensions/` → enable **Developer Mode** 3. Click **Load unpacked** → select the folder  
4. Pin **Chesstention** for quick access  

### 🦊 Firefox
1. Open `about:debugging` → **This Firefox** 2. Click **Load Temporary Add-on** → select `manifest.json`

<hr style="height:2px;border:none;background:linear-gradient(90deg,#00c6ff,#0072ff);border-radius:1px;">

## 🧱 Project Structure

```
chesstention/
├── 📁 images/          # Chess pieces & icons
├── 📁 media/           # Background videos
├── 📄 manifest.json    # Extension manifest
├── 📄 popup.html       # Main interface
├── 📄 script.js        # Game logic
├── 📄 style.css        # Styling
└── 📄 README.md        # Documentation
```

<hr style="height:2px;border:none;background:linear-gradient(90deg,#00c6ff,#0072ff);border-radius:1px;">

## 💡 Roadmap

- 📘 Opening Book & ECO support  
- 🧠 ML-based evaluation tuning  
- 💬 In-game chat  
- 📱 PWA mobile version  

<hr style="height:2px;border:none;background:linear-gradient(90deg,#00c6ff,#0072ff);border-radius:1px;">

## 📜 License

Licensed under the **GNU AGPL-3.0**.  
Pieces by **Lichess Maestro Set** – [AGPL-3.0 License](https://github.com/lichess-org/lila/tree/master/public/piece/maestro)

<hr style="height:2px;border:none;background:linear-gradient(90deg,#00c6ff,#0072ff);border-radius:1px;">

<div align="center">

**Built with ♟️, ❤️.**

[![GitHub stars](https://img.shields.io/github/stars/MatinHoseiny/ChesstentionOnline?style=social)](https://github.com/MatinHoseiny/ChesstentionOnline)
[![GitHub forks](https://img.shields.io/github/forks/MatinHoseiny/ChesstentionOnline?style=social)](https://github.com/MatinHoseiny/ChesstentionOnline)
