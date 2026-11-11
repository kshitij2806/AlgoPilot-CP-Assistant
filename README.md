# AlgoPilot - CP Assistant ⚡

> Built with the main aim to understand a problem before going for the solution.

An AI-powered browser extension designed to help students master competitive programming without copy-pasting.

Instead of pasting code and problem statements manually into ChatGPT or Claude, CP Assistant automatically extracts the problem statement, constraints, and test examples from the coding platform and guides the student step-by-step using pedagogical scaffolding.

---

## 🎯 Pedagogical Scaffolding Flow

1. 💡 **Understand Problem**: Summarizes the objective in plain English, clarifies input/output formats, explains constraint implications, and highlights critical edge cases—without spoiling the solution.
2. 🧠 **Intuition & Patterns**: Guides the student's thought process step-by-step. Pinpoints algorithmic paradigms (Two Pointers, Monotonic Stack, DP, Greedy) and the key invariant.
3. 🔍 **Progressive Hints**: Provides three graduated hints (from a gentle nudge to the critical transition logic).
4. 🐢 **Brute Force Solution**: Explains the baseline naive approach, gives code, and analyzes why it hits Time Limit Exceeded (TLE) under the given constraints.
5. ⚡ **Optimized Solution**: Delivers the accepted optimal algorithm, complexity analysis, and clean, commented code in your preferred programming language.

---

## 🌐 Supported Platforms

- **LeetCode** (`leetcode.com`, `leetcode.cn`)
- **Codeforces** (`codeforces.com`)
- **HackerRank** (`hackerrank.com`)
- **CodeChef** (`codechef.com`)
- **GeeksforGeeks** (`geeksforgeeks.org`)
- **Generic Fallback** (Extracts problem content on any other platform)

---

## 🚀 Installation & Setup

### 1. Build the Extension
```bash
npm install
npm run build
```
The compiled, ready-to-load extension will be located in the `dist/` directory.

### 2. Load into Chrome / Brave / Edge
1. Open your browser and navigate to `chrome://extensions/`.
2. Toggle on **Developer mode** (top-right corner).
3. Click **Load unpacked** (top-left corner).
4. Select the `dist` folder (`e:\leetcode-assistant\dist`).
5. Pin **CP Assistant** to your browser toolbar.

---

## ⚙️ Configuration & API Keys

Click the **Gear icon (⚙️)** in the top right of the extension:
1. **Choose your AI Provider**:
   - **Google Gemini** (Recommended, generous free tier: `gemini-1.5-flash`, `gemini-2.0-flash`)
   - **Groq** (Ultra-fast inference: `llama-3.3-70b-versatile`, `mixtral-8x7b-32768`)
   - **OpenAI** (`gpt-4o-mini`, `gpt-4o`)
2. **Add API Keys**:
   - Add one or more keys. The extension automatically rotates keys round-robin to avoid rate limit spikes.
3. **Select Preferred Language**:
   - Python 3, C++, Java, JavaScript, TypeScript, Rust, or Go.

---

## 📂 Project Architecture

```
leetcode-assistant/
├── public/
│   ├── manifest.json            # Manifest V3 configuration
│   └── icons/                   # Extension icons (16, 48, 128)
├── src/
│   ├── background/
│   │   ├── api-service.ts       # Service worker & message routing
│   │   ├── cache-manager.ts     # Two-tier LRU memory + storage cache
│   │   ├── key-manager.ts       # Secure storage & round-robin key rotation
│   │   ├── prompt-templates.ts  # 5-step pedagogical prompt engineering
│   │   └── providers/           # Base, Gemini, Groq, & OpenAI providers
│   ├── content/
│   │   ├── content.ts           # Content script bridge
│   │   └── extractor.ts         # Multi-platform DOM scrapers
│   ├── popup/
│   │   ├── popup.html           # UI layout (Popup & Side Panel)
│   │   ├── popup.css            # Dark mode theme & styling
│   │   ├── popup.ts             # Popup controller & interaction
│   │   └── components/          # Reusable UI components & Markdown renderer
│   ├── config/
│   │   └── constants.ts         # Defaults & supported domains
│   └── utils/
│       ├── types.ts             # Core TypeScript data contracts
│       ├── storage.ts           # Chrome storage wrapper
│       └── logger.ts            # Colored debugging logger
└── webpack.config.js            # Webpack bundling configuration
```
