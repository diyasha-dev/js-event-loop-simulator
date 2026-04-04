// ui/renderer.js

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
  };

  // ── CREATE A TASK CARD ──
  const createCard = (task) => {
    const card = document.createElement('div');
    card.className   = `task-card ${task.type}`;
    card.id          = `card-${task.id}`;
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
  const renderQueues = (snapshot) => {
    const { callStack, microtask, macrotask } = snapshot;

    const csBody = els.callStackBody();
    clearBody(csBody);
    if (callStack.length === 0) {
      showEmptyHint(csBody, 'Empty');
    } else {
      callStack.forEach(task => csBody.appendChild(createCard(task)));
    }

    const mtBody = els.microtaskBody();
    clearBody(mtBody);
    if (microtask.length === 0) {
      showEmptyHint(mtBody, 'Empty');
    } else {
      microtask.forEach(task => mtBody.appendChild(createCard(task)));
    }

    const macBody = els.macrotaskBody();
    clearBody(macBody);
    if (macrotask.length === 0) {
      showEmptyHint(macBody, 'Empty');
    } else {
      macrotask.forEach(task => macBody.appendChild(createCard(task)));
    }
  };

  // ── FLASH EXECUTING CARD ──
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

    const hint = output.querySelector('.empty-hint');
    if (hint) hint.remove();

    const existing    = output.querySelectorAll('.console-line');
    const existingIds = new Set([...existing].map(el => el.dataset.id));

    logEntries.forEach(entry => {
      if (existingIds.has(String(entry.id))) return;
      if (entry.type === 'system') return;

      const line = document.createElement('div');
      line.className   = `console-line ${entry.type}`;
      line.dataset.id  = entry.id;
      line.textContent = entry.message;
      output.appendChild(line);
    });

    output.scrollTop = output.scrollHeight;
  };

  // ── WRITE SYSTEM MESSAGE ──
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

  // ── LOOP STATUS DOT ──
  const setLoopStatus = (active) => {
    const dot = document.querySelector('.loop-dot');
    if (!dot) return;
    dot.classList.toggle('active', active);
  };

  // ── BUTTON STATES ──
  const setButtonState = (state) => {
    const run   = els.btnRun();
    const step  = els.btnStep();

    if (state === 'running') {
      run.disabled  = true;
      step.disabled = true;
    } else {
      run.disabled  = false;
      step.disabled = false;
    }
  };

  // ── SET ACTIVE PHASE ──
  const setActivePhase = (phase) => {
    const panels = {
      callstack: document.getElementById('panel-callstack'),
      microtask: document.getElementById('panel-microtask'),
      macrotask: document.getElementById('panel-macrotask'),
    };

    Object.values(panels).forEach(p => {
      if (p) p.classList.remove('active-callstack', 'active-microtask', 'active-macrotask');
    });

    const label = document.getElementById('phase-label');

    if (phase === 'callStack') {
      if (panels.callstack) panels.callstack.classList.add('active-callstack');
      if (label) { label.className = 'phase-label phase-callstack'; label.textContent = 'call stack'; }
    } else if (phase === 'microtask') {
      if (panels.microtask) panels.microtask.classList.add('active-microtask');
      if (label) { label.className = 'phase-label phase-microtask'; label.textContent = 'microtask'; }
    } else if (phase === 'macrotask') {
      if (panels.macrotask) panels.macrotask.classList.add('active-macrotask');
      if (label) { label.className = 'phase-label phase-macrotask'; label.textContent = 'macrotask'; }
    } else {
      if (label) { label.className = 'phase-label phase-idle'; label.textContent = 'idle'; }
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

  // ── URL SHARE ──
  const initUrlShare = () => {
    const params  = new URLSearchParams(window.location.search);
    const encoded = params.get('code');
    if (encoded) {
      try {
        const code     = decodeURIComponent(atob(encoded));
        const textarea = document.getElementById('code-input');
        if (textarea) {
          textarea.value = code;
          writeSystem('📎 code loaded from URL — press Run');
        }
      } catch (e) {
        // invalid base64 — ignore
      }
    }
  };

  // ══════════════════════════════════════════
  // ── INIT — everything below is wired here ──
  // ══════════════════════════════════════════
  const init = () => {

    // ── EVENT LOOP CALLBACKS ──
    EventLoop.onTick((data) => {
      const tickEl = document.getElementById('tick-display');
      if (tickEl) tickEl.textContent = data.tick;

      setActivePhase(data.phase);
      setLoopStatus(true);
      renderQueues(data.stacks);
      writeConsole(data.log);

      if (data.phase === 'callStack' && data.task)  flashCard(data.task.id);
      if (data.phase === 'microtask' && data.tasks) data.tasks.forEach(t => flashCard(t.id));
      if (data.phase === 'macrotask' && data.task)  flashCard(data.task.id);
    });

    EventLoop.onDone((data) => {
      setLoopStatus(false);
      setButtonState('idle');
      setActivePhase('idle');
      writeSystem(`✓ loop complete — ${data.tick} ticks`);
    });

    // ── RUN BUTTON ──
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

      if (EventLoop.getTickCount() === 0 && !EventLoop.isRunning()) {
        clearAll();
        await EventLoop.step(code);
        renderQueues(EventLoop.snapshot());
        writeSystem('▶ loaded — click Step to advance one tick');
        return;
      }

      if (EventLoop.isRunning()) {
        EventLoop.tick();
      }
    });

    // ── RESET BUTTON ──
    els.btnReset().addEventListener('click', () => {
      EventLoop.reset();
      clearAll();
      setActivePhase('idle');
      const tickEl = document.getElementById('tick-display');
      if (tickEl) tickEl.textContent = '0';
      writeSystem('↺ reset — ready');
    });

    // ── SPEED SLIDER ──
    els.speedSlider().addEventListener('input', (e) => {
      const val = Number(e.target.value);
      EventLoop.setSpeed(val);
      els.speedLabel().textContent = val;
    });

    // ── SHARE BUTTON ──
    document.getElementById('btn-share').addEventListener('click', () => {
      const code = els.codeInput().value.trim();
      if (!code) {
        writeSystem('⚠ nothing to share — write some code first');
        return;
      }
      try {
        const encoded = btoa(encodeURIComponent(code));
        const url     = `${location.origin}${location.pathname}?code=${encoded}`;
        navigator.clipboard.writeText(url).then(() => {
          writeSystem('✓ share link copied to clipboard');
        }).catch(() => {
          writeSystem(`share link: ${url}`);
        });
      } catch (e) {
        writeSystem('⚠ could not generate share link');
      }
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

    document.getElementById('example-select').addEventListener('change', (e) => {
      const key = e.target.value;
      if (!key || !examples[key]) return;
      els.codeInput().value = examples[key];
      EventLoop.reset();
      clearAll();
      writeSystem(`loaded example: ${key} — press Run`);
      e.target.value = '';
    });

    // ── KEYBOARD SHORTCUTS ──
    document.addEventListener('keydown', async (e) => {
      if (e.code === 'Space' && e.target !== els.codeInput()) {
        e.preventDefault();
        els.btnStep().click();
      }
      if (e.code === 'KeyR' && e.target !== els.codeInput()) {
        e.preventDefault();
        els.btnRun().click();
      }
      if (e.code === 'Escape') {
        els.btnReset().click();
      }
    });

    // ── LOAD FROM URL IF PRESENT ──
    initUrlShare();

    // ── INITIAL STATE ──
    clearAll();
    writeSystem('ready — type code above and press Run');

  }; // ← init ends here

  // ── PUBLIC API ──
  return {
    init,
    renderQueues,
    writeConsole,
    writeSystem,
    clearAll,
    setActivePhase,
    initUrlShare,
  };

})(); // ← Renderer ends here

// ── BOOT — stays outside everything ──
document.addEventListener('DOMContentLoaded', () => {
  Renderer.init();
});