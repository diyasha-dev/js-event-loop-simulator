# ⚙ JS Event Loop Simulator

> **Visualize JavaScript's concurrency model in real time**

An interactive, browser-based simulator that shows exactly how JavaScript's Event Loop works — the Call Stack, Microtask Queue, and Macrotask Queue — all animated live as your code runs.

![JS Event Loop Simulator](https://img.shields.io/badge/vanilla-JavaScript-f7df1e?style=flat-square&logo=javascript)
![No Dependencies](https://img.shields.io/badge/dependencies-zero-34d399?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-a78bfa?style=flat-square)

🔗 **[Live Demo →](https://js-event-loop-simulator.vercel.app/)**

---

## What Is This?

JavaScript is single-threaded but appears to handle many things at once. This simulator makes the invisible visible — you type JS code, hit Run, and watch every task move through the three queues in real time with color-coded animations.

It's built for:
- Developers learning async JavaScript
- Anyone who has wondered *why* `Promise` resolves before `setTimeout`
- Interview prep for JavaScript concurrency questions
- Teaching JavaScript execution order

---

## How the Event Loop Works

```
Each tick of the event loop:

  1. Run everything on the Call Stack        (sync code)
  2. Drain ALL microtasks until empty        (Promise, async/await)
  3. Take ONE macrotask and run it           (setTimeout, setInterval)
  4. Repeat from step 2
```

This is why `Promise.resolve().then()` always runs before `setTimeout(..., 0)` — even with a 0ms delay.

---

## Features

| Feature | Description |
|---|---|
| **Real sandbox execution** | Your code actually runs in a controlled JS sandbox |
| **Live queue visualization** | Watch tasks enter and leave each queue in real time |
| **Step mode** | Advance one tick at a time to follow execution manually |
| **Console output** | Color-coded `[SYNC]` `[MICRO]` `[MACRO]` badges on every line |
| **Phase indicator** | Always shows which phase the event loop is in |
| **Share links** | Generate a URL that loads your code for anyone |
| **Built-in examples** | 4 classic examples to learn from |
| **Keyboard shortcuts** | `Space` step · `R` run · `Esc` reset |
| **Zero dependencies** | Pure HTML, CSS, JavaScript — no frameworks |

---

## The Three Queues

| Queue | Priority | What runs here | Real JS example |
|---|---|---|---|
| **Call Stack** | Immediate | Synchronous code — LIFO order | `console.log()`, variable declarations |
| **Microtask Queue** | High | Drains completely before any macrotask | `Promise.then()`, `async/await` |
| **Macrotask Queue** | Low | One task per tick | `setTimeout()`, `setInterval()` |

---

## Try These Examples

### Classic order test
```javascript
console.log('sync 1');
setTimeout(() => console.log('macro'), 0);
Promise.resolve().then(() => console.log('micro'));
console.log('sync 2');

// Output: sync 1 → sync 2 → micro → macro
```

### The interview question
```javascript
console.log('1');
setTimeout(() => console.log('2'), 0);
Promise.resolve().then(() => console.log('3'));
setTimeout(() => console.log('4'), 0);
Promise.resolve().then(() => console.log('5'));
console.log('6');

// Output: 1 → 6 → 3 → 5 → 2 → 4
```

### Nested promises
```javascript
console.log('Start');
setTimeout(() => console.log('Timeout 1'), 0);
Promise.resolve().then(() => {
  console.log('Promise 1');
  Promise.resolve().then(() => {
    console.log('Promise 1.1');
  });
});
Promise.resolve().then(() => console.log('Promise 2'));
console.log('End');

// Output: Start → End → Promise 1 → Promise 2 → Promise 1.1 → Timeout 1
```

---

## Project Structure

```
js-event-loop-simulator/
│
├── index.html                  # App shell — layout, panels, buttons
├── style.css                   # Dark theme, animations, typography
│
├── core/                       # Pure logic — zero DOM dependencies
│   ├── parser.js               # Classifies each line of code
│   ├── CallStack.js            # LIFO stack implementation
│   ├── MicrotaskQueue.js       # FIFO queue — drain all per tick
│   ├── MacrotaskQueue.js       # FIFO queue — one per tick
│   └── eventLoop.js           # Sandbox engine + tick() scheduler
│
├── ui/
│   └── renderer.js             # DOM updates, animations, event handlers
│
├── tests/
│   ├── unit/
│   │   ├── parser.test.js
│   │   ├── CallStack.test.js
│   │   ├── MicrotaskQueue.test.js
│   │   └── MacrotaskQueue.test.js
│   └── integration/
│       └── eventLoop.test.js
│
└── examples/
    ├── basic.js
    ├── promises.js
    └── mixed.js
```

---

## How It Works — Architecture

```
USER TYPES CODE  (textarea)
       ↓
SANDBOX ENGINE  →  runs code with intercepted globals
   • fakeConsole  →  captures all console.log calls
   • fakeSetTimeout  →  collects macro callbacks
   • real Promise  →  preserves true microtask order
       ↓
QUEUES  →  tasks distributed by execution phase:
   • sync outputs   →  Call Stack
   • promise outputs →  Microtask Queue
   • timeout outputs →  Macrotask Queue
       ↓
EVENT LOOP tick():
   Step 1: Pop one item from Call Stack
   Step 2: Drain ALL microtasks (loop until empty)
   Step 3: Take ONE macrotask
   Step 4: Repeat from Step 2
       ↓
UI RENDERER  →  animates cards + writes to console panel
```

---

## Tech Stack

| Technology | Role | Why |
|---|---|---|
| **HTML5** | App shell, panels, textarea | Structure without abstraction |
| **CSS3** (Grid + Flex) | Layout, dark theme, animations | Full visual control |
| **Vanilla JavaScript** | Sandbox engine, queues, scheduler, DOM | Learn the mechanics directly |
| **Inter** | UI font — buttons, labels, headings | Clean and modern |
| **JetBrains Mono** | Code font — textarea, cards, console | Developer authenticity |
| **Vercel** | Deployment | Zero config, instant deploys |

---

## Running Locally

No build step. No npm install. Just open it.

```bash
git clone https://github.com/diyasha-dev/js-event-loop-simulator
cd js-event-loop-simulator
```

Then either:
- Open `index.html` directly in Chrome, or
- Use **Live Server** in VS Code (right-click → Open with Live Server)

---

## Keyboard Shortcuts

| Key | Action |
|---|---|
| `Space` | Step one tick (when not typing in textarea) |
| `R` | Run all ticks automatically |
| `Esc` | Reset everything |

---

## Testing

All core logic is unit tested with zero DOM dependencies.

Open `index.html` in Chrome → F12 → Console, then run:

```javascript
testParser();          // 13 tests
testCallStack();       // 13 tests
testMicrotaskQueue();  // 19 tests
testMacrotaskQueue();  // 20 tests
testEventLoop();       // 22 integration tests
```

---

## What I Learned Building This

- How JavaScript's event loop actually works at the spec level
- Why microtasks always drain completely before any macrotask runs
- How to build a sandboxed code execution engine using `new Function()`
- How real `Promise` microtask scheduling works in the browser
- CSS Grid for complex multi-panel layouts
- Building a fully interactive educational tool with zero dependencies

---

## License

MIT — free to use, modify, and share.

---

## References

- [WHATWG HTML Spec — Event Loop](https://html.spec.whatwg.org/multipage/webappapis.html#event-loops)
- [MDN — Event Loop](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Event_loop)
- [Jake Archibald — Tasks, microtasks, queues and schedules](https://jakearchibald.com/2015/tasks-microtasks-queues-and-schedules/)

---

<p align="center">Built with vanilla JS · zero dependencies · <a href="https://js-event-loop-simulator.vercel.app">Live Demo</a></p>
