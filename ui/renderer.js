// ui/renderer.js
// Reads tick events from EventLoop and updates the DOM
// Creates cards, animates them, writes to console panel

const Renderer = (() => {

  // ── DOM REFERENCES ──
  const els = {
    callStackBody:  () => document.getElementById('callstack-body'),
    microtaskBody:  () => document.getElementById('microtask-body'),
    macrotaskBody:  () => document.getElementById('macrotask-body'),
    consoleOutput:  () => document.getElementById('console-output'),
    codeInput:      () => document.getElementById('code-input'),
    btnRun:         () => document.getElementById('btn-run'),
    btnStep:        () => document.getElementById('btn-step'),
    btnReset:       () => document.getElementById('btn-reset'),
    speedSlider:    () => document.getElementById('speed-slider'),
    speedLabel:     () => document.getElementById('speed-label'),
    exampleSelect:  () => document.getElementById('example-select'),
  };

  // ── CREATE A TASK CARD ──
  const createCard = (task) => {
    const card = document.createElement('div');
    card.className = `task-card ${task.type}`;
    card.id        = `card-${task.id}`;
    card.textContent = task.label;
    return card;
  };

  // ── SHOW EMPTY HINT ──
  const showEmptyHint = (body, text = 'Empty') => {
    const hint = document.createElement('p');
    hint.className   = 'empty-hint';
    hint.textContent = text;
    body.appendChild(hint);
  };

  // ── CLEAR A PANEL BODY ──
  const clearBody = (body) => {
    if (body) body.innerHTML = '';
  };

  // ── RENDER ALL THREE QUEUES ──
  // Called after every tick with the latest snapshot
  const renderQueues = (snapshot) => {
    const { callStack, microtask, macrotask } = snapshot;

    // ── Call Stack ──
    const csBody = els.callStackBody();
    clearBody(csBody);
    if (callStack.length === 0) {
      showEmptyHint(csBody, 'Empty');
    } else {
      callStack.forEach(task => {
        csBody.appendChild(createCard(task));
      });
    }

    // ── Microtask Queue ──
    const mtBody = els.microtaskBody();
    clearBody(mtBody);
    if (microtask.length === 0) {
      showEmptyHint(mtBody, 'Empty');
    } else {
      microtask.forEach(task => {
        mtBody.appendChild(createCard(task));
      });
    }

    // ── Macrotask Queue ──
    const macBody = els.macrotaskBody();
    clearBody(macBody);
    if (macrotask.length === 0) {
      showEmptyHint(macBody, 'Empty');
    } else {
      macrotask.forEach(task => {
        macBody.appendChild(createCard(task));
      });
    }
  };

  // ── FLASH EXECUTING CARD ──
  // Briefly highlights a card green when it executes
  const flashCard = (taskId) => {
    const card = document.getElementById(`card-${taskId}`);
    if (!card) return;
    card.classList.add('executing');
    setTimeout(() => {
      card.classList.remove('executing');
      card.classList.add('removing');
      card.addEventListener('animationend', () => card.remove(), { once: true });
    }, 400);
  };

  // ── WRITE TO CONSOLE PANEL ──
  const writeConsole = (logEntries) => {
    const output = els.consoleOutput();
    if (!output) return;

    // clear placeholder hint on first real log
    const hint = output.querySelector('.empty-hint');
    if (hint) hint.remove();

    // only render new entries (compare by id)
    const existing = output.querySelectorAll('.console-line');
    const existingIds = new Set(
      [...existing].map(el => el.dataset.id)
    );

    logEntries.forEach(entry => {
      if (existingIds.has(String(entry.id))) return; // already rendered

      // skip system messages from console output panel
      if (entry.type === 'system') return;

      const line = document.createElement('div');
      line.className       = `console-line ${entry.type}`;
      line.dataset.id      = entry.id;
      line.textContent     = entry.message;
      output.appendChild(line);
    });

    // auto scroll to bottom
    output.scrollTop = output.scrollHeight;
  };

  // ── WRITE SYSTEM MESSAGE TO CONSOLE ──
  // Shows things like "loaded 3 tasks", "loop complete"
  const writeSystem = (message) => {
    const output = els.consoleOutput();
    if (!output) return;

    const hint = output.querySelector('.empty-hint');
    if (hint) hint.remove();

    const line = document.createElement('div');
    line.className   = 'console-line system';
    line.textContent = message;
    output.appendChild(line);
    output.scrollTop = output.scrollHeight;
  };

  // ── UPDATE LOOP STATUS DOT ──
  const setLoopStatus = (active) => {
    const dot = document.querySelector('.loop-dot');
    if (!dot) return;
    dot.classList.toggle('active', active);
  };

  // ── SET BUTTONS STATE ──
  const setButtonState = (state) => {
    // state: 'idle' | 'running' | 'done'
    const run   = els.btnRun();
    const step  = els.btnStep();
    const reset = els.btnReset();

    if (state === 'running') {
      run.disabled  = true;
      step.disabled = true;
    } else if (state === 'idle') {
      run.disabled  = false;
      step.disabled = false;
    } else if (state === 'done') {
      run.disabled  = true;
      step.disabled = true;
    }
  };

  // ── CLEAR EVERYTHING ──
  const clearAll = () => {
    clearBody(els.callStackBody());
    clearBody(els.microtaskBody());
    clearBody(els.macrotaskBody());
    clearBody(els.consoleOutput());

    showEmptyHint(els.callStackBody(), 'Empty');
    showEmptyHint(els.microtaskBody(), 'Empty');
    showEmptyHint(els.macrotaskBody(), 'Empty');

    const output = els.consoleOutput();
    if (output) {
      const hint = document.createElement('p');
      hint.className   = 'empty-hint';
      hint.textContent = 'Output will appear here when you run code...';
      output.appendChild(hint);
    }

    setLoopStatus(false);
    setButtonState('idle');
  };

  // ── WIRE UP EVENT LOOP CALLBACKS ──
  const init = () => {

    // fires after every tick
    EventLoop.onTick((data) => {
      setLoopStatus(true);
      renderQueues(data.stacks);
      writeConsole(data.log);

      // flash the card that just executed
      if (data.phase === 'callStack' && data.task) {
        flashCard(data.task.id);
      }
      if (data.phase === 'microtask' && data.tasks) {
        data.tasks.forEach(t => flashCard(t.id));
      }
      if (data.phase === 'macrotask' && data.task) {
        flashCard(data.task.id);
      }
    });

    // fires when all queues are empty
    EventLoop.onDone((data) => {
      setLoopStatus(false);
      setButtonState('done');
      writeSystem(`✓ loop complete — ${data.tick} ticks`);
    });

    
    els.btnRun().addEventListener('click', async () => {
      const code = els.codeInput().value.trim();
      if (!code) {
        writeSystem('⚠ no code to run — type something above');
        return;
      }
      clearAll();
      setButtonState('running');
      await EventLoop.run(code);
    });

    // ── STEP BUTTON ──
    els.btnStep().addEventListener('click', async () => {
      const code = els.codeInput().value.trim();
      if (!code) {
        writeSystem('⚠ no code to run — type something above');
        return;
      }

      // first click — load and show initial queue state
      if (EventLoop.getTickCount() === 0 && !EventLoop.isRunning()) {
        clearAll();
        await EventLoop.step(code);
        renderQueues(EventLoop.snapshot());
        writeSystem('▶ loaded — click Step to advance one tick');
        return;
      }

      // subsequent clicks — advance one tick
      if (EventLoop.isRunning()) {
        EventLoop.tick();
      }
    });


    // ── RESET BUTTON ──
    els.btnReset().addEventListener('click', () => {
      EventLoop.reset();
      clearAll();
      writeSystem('↺ reset — ready');
    });

    // ── SPEED SLIDER ──
    // els.speedSlider().addEventListener('input', (e) => {
    //   const val = Number(e.target.value);
    //   EventLoop.setSpeed(val);
    //   els.speedLabel().textContent = val;
    // });

    // ── SPEED SLIDER ──
    els.speedSlider().addEventListener('input', (e) => {
      const val = Number(e.target.value);
      EventLoop.setSpeed(val);
      els.speedLabel().textContent = val;
    });

    // ── EXAMPLE SELECTOR ──
    const examples = {
      basic: `console.log('sync 1');
console.log('sync 2');
setTimeout(() => console.log('macro 1'), 0);
Promise.resolve().then(() => console.log('micro 1'));
console.log('sync 3');`,

      promises: `setTimeout(() => console.log('timeout'), 0);
Promise.resolve().then(() => console.log('promise 1'));
Promise.resolve().then(() => console.log('promise 2'));
Promise.resolve().then(() => console.log('promise 3'));`,

      mixed: `console.log('1');
setTimeout(() => console.log('2'), 0);
Promise.resolve().then(() => console.log('3'));
setTimeout(() => console.log('4'), 0);
Promise.resolve().then(() => console.log('5'));
console.log('6');`,

      nested: `console.log('Start');
setTimeout(() => console.log('Timeout 1'), 0);
Promise.resolve().then(() => {
  console.log('Promise 1');
  Promise.resolve().then(() => {
    console.log('Promise 1.1');
  });
  setTimeout(() => console.log('Timeout 1.1'), 0);
});
Promise.resolve().then(() => {
  console.log('Promise 2');
});
console.log('Middle');
setTimeout(() => {
  console.log('Timeout 2');
  Promise.resolve().then(() => {
    console.log('Promise inside Timeout 2');
  });
}, 0);
console.log('End');`,
    };

    const exampleSelect = els.exampleSelect();
    if (exampleSelect) {
      exampleSelect.addEventListener('change', (e) => {
        const key = e.target.value;
        if (!key || !examples[key]) return;
        els.codeInput().value = examples[key];
        EventLoop.reset();
        clearAll();
        writeSystem(`loaded example: ${key} — press Run`);
        e.target.value = '';
      });
    }

    // ── initial render ──
    clearAll();
    writeSystem('ready — type code above and press Run');

    // ── initial render ──
    // clearAll();
    // writeSystem('ready — type code above and press Run');
  };

  // ── PUBLIC API ──
  return {
    init,
    renderQueues,
    writeConsole,
    writeSystem,
    clearAll,
  };

})();

// boot the renderer once DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  Renderer.init();
});