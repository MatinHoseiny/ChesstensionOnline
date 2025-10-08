# ♟️ Chesstention

<div align="center">

**A sleek, intelligent chess extension — play online, offline, or against adaptive AI.**

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/MatinHoseiny/ChesstentionOnline)
[![License](https://img.shields.io/badge/license-AGPL--3.0-orange.svg)](LICENSE)
[![Chrome Web Store](https://img.shields.io/badge/Chrome-Extension-green.svg)](https://chrome.google.com/webstore)
[![Firefox Add-ons](https://img.shields.io/badge/Firefox-Add--on-orange.svg)](https://addons.mozilla.org)

</div>

---

## ✨ Highlights

| | |
|:--|:--|
| 🌐 **Online Multiplayer** | Real-time WebSocket + WebRTC matches |
| 🤖 **Adaptive AI** | Negamax + α-β pruning + positional heuristics |
| 🏠 **Local Play** | Hot-seat 2-player mode |
| 🎨 **Modern Design** | Themed boards, Maestro pieces, video backgrounds |
| 💾 **Smart Saving** | Resume games anytime |
| 🔄 **Undo / Redo** | Full move history navigation |

---

## 🧠 Engine Overview

> Designed for tactical depth and human-like play.

- **Search:** Negamax with α-β pruning & iterative deepening  
- **Heuristics:** mobility, king safety, pawn structure, center control  
- **Evaluation:** Piece-square tables + dynamic weighting  
- **Move ordering:** MVV-LVA, killer, history heuristics  
- **Difficulty scaling:** adaptive depth & randomness for realism  

---

## ⚙️ Tech Stack

| Layer | Technology |
|-------|-------------|
| 🎮 Gameplay | Vanilla JavaScript (ES6 Modules) |
| 🧩 Interface | CSS3 + Custom Themes |
| 🔗 Networking | WebSocket + WebRTC |
| 💾 Storage | LocalStorage |
| 🧠 AI | Custom Negamax Engine |
| 📦 Packaging | Chrome / Firefox Extension APIs |

---

## 🚀 Quick Install

### 🧩 Chrome / Edge
1. Download the latest ZIP  
2. Visit `chrome://extensions/` → enable **Developer Mode**  
3. Click **Load unpacked** → select the folder  
4. Pin **Chesstention** for easy access  

### 🦊 Firefox
1. Open `about:debugging` → **This Firefox**  
2. Click **Load Temporary Add-on** → select `manifest.json`

---

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


---

## 💡 Roadmap

- 📘 Opening Book & ECO support  
- 🧠 ML-based evaluation tuning  
- 💬 In-game chat  
- 📱 PWA mobile version  

---

## 📜 License

Licensed under the **GNU AGPL-3.0**.  
Pieces by **Lichess Maestro Set** – [AGPL-3.0 License](https://github.com/lichess-org/lila/tree/master/public/piece/maestro).

---

<div align="center">

**Built with ♟️, ❤️, and pure JavaScript for chess lovers worldwide.**

[![GitHub stars](https://img.shields.io/github/stars/MatinHoseiny/ChesstentionOnline?style=social)](https://github.com/MatinHoseiny/ChesstentionOnline)
[![GitHub forks](https://img.shields.io/github/forks/MatinHoseiny/ChesstentionOnline?style=social)](https://github.com/MatinHoseiny/ChesstentionOnline)

</div>

