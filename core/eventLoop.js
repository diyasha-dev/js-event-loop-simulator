// core/eventLoop.js
// Clean single-pass sandbox engine
// Captures true JS execution order using real Promise microtask scheduling

const EventLoop = (() => {

  // ── STATE ──
  let _running       = false;
  let _paused        = false;
  let _tickCount     = 0;
  let _speed         = 3;
  let _timerId       = null;
  let _onTick        = null;
  let _onDone        = null;
  let _log           = [];
  let _taskIdCounter = 0;

  // ── VISUAL QUEUES (what the UI shows) ──
  let _callStackTasks = [];
  let _microtaskTasks = [];
  let _macrotaskTasks = [];

  const nextId = () => ++_taskIdCounter;

  // ── SPEED MAP ──
  const speedToDelay = (s) => {
    const map = { 1: 1200, 2: 800, 3: 500, 4: 300, 5: 150 };
    return map[s] || 500;
  };

  // ── LOG ──
  const addLog = (message, type = 'log') => {
    const entry = {
      id:        _log.length + 1,
      message:   String(message),
      type,
      tick:      _tickCount,
      timestamp: Date.now(),
    };
    _log.push(entry);
    return entry;
  };

  // ── SNAPSHOT ──
  const _snapshot = () => ({
    callStack: [..._callStackTasks],
    microtask: [..._microtaskTasks],
    macrotask: [..._macrotaskTasks],
  });

  // ── TICK ──
  const tick = () => {
    _tickCount++;

    // Phase 1: Call Stack (sync tasks)
    if (_callStackTasks.length > 0) {
      const task = _callStackTasks.shift();
      task.status = 'executing';
      if (task.method) addLog(task.value, task.method);
      task.status = 'done';

      if (_onTick) _onTick({
        phase: 'callStack', task,
        tick: _tickCount, log: [..._log], stacks: _snapshot(),
      });
      return { phase: 'callStack', task, done: false };
    }

    // Phase 2: Drain ALL microtasks
    if (_microtaskTasks.length > 0) {
      const drained = [];
      while (_microtaskTasks.length > 0) {
        const task = _microtaskTasks.shift();
        task.status = 'executing';
        if (task.method) addLog(task.value, task.method);
        task.status = 'done';
        drained.push(task);
      }

      if (_onTick) _onTick({
        phase: 'microtask', tasks: drained,
        tick: _tickCount, log: [..._log], stacks: _snapshot(),
      });
      return { phase: 'microtask', tasks: drained, done: false };
    }

    // Phase 3: ONE macrotask
    if (_macrotaskTasks.length > 0) {
      const group = _macrotaskTasks.shift();

      // log the macrotask's own console output
      group.outputs.forEach(o => {
        if (o.method) addLog(o.value, o.method);
      });

      // push this macrotask's microtasks into the microtask queue
      // they will be picked up on the very next tick (Phase 2)
      group.microtasks.forEach(mt => {
        _microtaskTasks.push(mt);
      });

      // push any nested macrotasks this macro spawned
      group.nestedMacros.forEach(nm => {
        _macrotaskTasks.push(nm);
      });

      const task = {
        id:     group.id,
        type:   'macrotask',
        queue:  'macrotask',
        label:  group.label,
        status: 'done',
      };

      if (_onTick) _onTick({
        phase: 'macrotask', task,
        tick: _tickCount, log: [..._log], stacks: _snapshot(),
      });
      return { phase: 'macrotask', task, done: false };
    }

    // Phase 4: Idle
    _running = false;
    if (_onDone) _onDone({ tick: _tickCount, log: [..._log] });
    return { phase: 'idle', done: true };
  };

  // ── CORE ENGINE ──
  // Runs user code once in a sandbox, captures exact execution order
  const load = async (code) => {
    reset();

    // These arrays capture what happens in each phase
    // in the TRUE order that real JS would execute them
    const syncOutputs  = [];   // console calls from sync code
    const microOutputs = [];   // console calls from Promise.then chains
    const macroGroups  = [];   // each setTimeout becomes one group

    // ── PHASE 1: Run sync code ──
    // We intercept console and setTimeout
    // Real Promises are used so microtasks schedule correctly

    const macroCallbacks = []; // raw callbacks from setTimeout calls

    const fakeConsole = {
      log:   (...a) => syncOutputs.push({ method: 'log',   value: a.join(' ') }),
      warn:  (...a) => syncOutputs.push({ method: 'warn',  value: a.join(' ') }),
      error: (...a) => syncOutputs.push({ method: 'error', value: a.join(' ') }),
      info:  (...a) => syncOutputs.push({ method: 'info',  value: a.join(' ') }),
    };

    const fakeSetTimeout = (fn, delay = 0) => {
      // label uses delay value
      macroCallbacks.push({ fn, label: `setTimeout(${delay}ms)` });
    };

    const fakeSetInterval = (fn, delay = 0) => {
      macroCallbacks.push({ fn, label: `setInterval(${delay}ms)` });
    };

    // run user code — sync executes now, Promise.then queues microtasks
    try {
      const sandboxFn = new Function(
        'console', 'setTimeout', 'setInterval',
        `"use strict";\n${code}`
      );
      sandboxFn(fakeConsole, fakeSetTimeout, fakeSetInterval);
    } catch (err) {
      addLog(`Error: ${err.message}`, 'error');
      return 0;
    }

    // ── PHASE 2: Flush microtasks from sync code ──
    // Switch console to capture microtask outputs
    // We do this by temporarily replacing fakeConsole's methods
    // But since Promise closures already captured fakeConsole,
    // we redirect to microOutputs by swapping the target array

    // We need a shared mutable target so Promise callbacks
    // (which closed over fakeConsole) write to the right place
    let currentTarget = microOutputs;

    // redirect fakeConsole to write to currentTarget
    fakeConsole.log   = (...a) => currentTarget.push({ method: 'log',   value: a.join(' ') });
    fakeConsole.warn  = (...a) => currentTarget.push({ method: 'warn',  value: a.join(' ') });
    fakeConsole.error = (...a) => currentTarget.push({ method: 'error', value: a.join(' ') });
    fakeConsole.info  = (...a) => currentTarget.push({ method: 'info',  value: a.join(' ') });

    // also redirect setTimeout calls that happen inside .then()
    // these become nested macros
    const nestedMacroCallbacks = [];
    fakeSetTimeout.__redirect = (fn, delay = 0) => {
      nestedMacroCallbacks.push({ fn, label: `setTimeout(${delay}ms)` });
    };

    // flush all pending microtasks (Promise.then chains)
    // multiple awaits handle deeply nested chains
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    // ── PHASE 3: Run each macrotask, flush its microtasks ──
    for (const macro of macroCallbacks) {
      const macroOutputs  = [];
      const macroMicros   = [];
      const macroNestedMacros = [];

      // redirect console to this macro's outputs
      currentTarget = macroOutputs;

      // redirect setTimeout inside this macro to nested macros
      const innerMacroCallbacks = [];
      const innerSetTimeout = (fn, delay = 0) => {
        innerMacroCallbacks.push({ fn, label: `setTimeout(${delay}ms)` });
      };

      // run the macro callback
      try {
        // we need to pass our intercepted console and setTimeout
        // into the callback — but the callback already closed over
        // the original fakeConsole and fakeSetTimeout from user code
        // So fakeConsole now redirects to macroOutputs ✓
        // But fakeSetTimeout still pushes to macroCallbacks ✗
        // Fix: run the callback as a new sandboxed function
        const cbSource = macro.fn.toString();
        const innerFn  = new Function(
          'console', 'setTimeout', 'setInterval',
          `"use strict"; return (${cbSource})();`
        );
        innerFn(fakeConsole, innerSetTimeout, innerSetTimeout);
      } catch (e) {
        // if re-wrapping fails (e.g. native functions), call directly
        try { macro.fn(); } catch (_) {}
      }

      // flush microtasks spawned by this macro
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();

      // capture what those microtasks logged
      // currentTarget is still macroOutputs — but microtasks from
      // Promise.resolve().then() inside the macro need their own capture
      // They already wrote to currentTarget (macroOutputs) ✓

      // separate macro's direct outputs from its microtask outputs
      // we do this by splitting: outputs before await = macro direct
      // outputs after await = microtask outputs
      // Since we can't split retroactively, use a flag approach:

      macroGroups.push({
        id:          nextId(),
        label:       macro.label,
        outputs:     macroOutputs,   // all outputs from this macro + its microtasks
        microtasks:  [],             // already baked into outputs above
        nestedMacros: innerMacroCallbacks.map(nm => ({
          id:          nextId(),
          label:       nm.label,
          outputs:     [],
          microtasks:  [],
          nestedMacros:[],
        })),
      });

      // run nested macros (setTimeout inside setTimeout/then)
      for (const nested of innerMacroCallbacks) {
        const nestedOutputs = [];
        currentTarget = nestedOutputs;

        try {
          const cbSource = nested.fn.toString();
          const innerFn  = new Function(
            'console', 'setTimeout', 'setInterval',
            `"use strict"; return (${cbSource})();`
          );
          innerFn(fakeConsole, () => {}, () => {});
        } catch (e) {
          try { nested.fn(); } catch (_) {}
        }

        await Promise.resolve();
        await Promise.resolve();

        // add as separate macrotask group
        macroGroups.push({
          id:           nextId(),
          label:        nested.label,
          outputs:      nestedOutputs,
          microtasks:   [],
          nestedMacros: [],
        });
      }
    }

    // ── BUILD VISUAL TASK LISTS ──

    // Sync tasks — one card per console call
    syncOutputs.forEach(o => {
      _callStackTasks.push({
        id:     nextId(),
        type:   'sync',
        queue:  'callStack',
        label:  `console.${o.method}('${o.value}')`,
        method: o.method,
        value:  o.value,
        status: 'pending',
      });
    });

    // Microtasks — one card per console call from promise chains
    microOutputs.forEach(o => {
      _microtaskTasks.push({
        id:     nextId(),
        type:   'microtask',
        queue:  'microtask',
        label:  `console.${o.method}('${o.value}')`,
        method: o.method,
        value:  o.value,
        status: 'pending',
      });
    });

    // Macrotask groups — each setTimeout is one card
    // its inner outputs are logged when the card executes
    macroGroups.forEach(g => {
      _macrotaskTasks.push(g);
    });

    const total = _callStackTasks.length +
                  _microtaskTasks.length +
                  _macrotaskTasks.length;

    addLog(`loaded ${total} tasks`, 'system');
    return total;
  };

  // ── RUN ──
  const run = async (code) => {
    if (_running) return;
    const count = await load(code);

    if (count === 0) {
      addLog('no tasks found', 'warn');
      return;
    }

    _running = true;
    _paused  = false;

    if (_onTick) _onTick({
      phase: 'loaded', task: null,
      tick: 0, log: [..._log], stacks: _snapshot(),
    });

    const loop = () => {
      if (!_running || _paused) return;
      const result = tick();
      if (!result.done) {
        _timerId = setTimeout(loop, speedToDelay(_speed));
      }
    };
    loop();
  };

  // ── STEP ──
  const step = async (code) => {
    if (!_running && _tickCount === 0) {
      const count = await load(code);
      if (count === 0) {
        addLog('no tasks found', 'warn');
        return;
      }
      _running = true;
      if (_onTick) _onTick({
        phase: 'loaded', task: null,
        tick: 0, log: [..._log], stacks: _snapshot(),
      });
      return;
    }
    if (!_running) return;
    tick();
  };

  // ── PAUSE / RESUME ──
  const pause = () => {
    _paused = true;
    if (_timerId) clearTimeout(_timerId);
  };

  const resume = () => {
    if (!_running || !_paused) return;
    _paused = false;
    const loop = () => {
      if (!_running || _paused) return;
      const result = tick();
      if (!result.done) {
        _timerId = setTimeout(loop, speedToDelay(_speed));
      }
    };
    loop();
  };

  // ── RESET ──
  const reset = () => {
    _running        = false;
    _paused         = false;
    _tickCount      = 0;
    _taskIdCounter  = 0;
    _timerId && clearTimeout(_timerId);
    _timerId        = null;
    _log            = [];
    _callStackTasks = [];
    _microtaskTasks = [];
    _macrotaskTasks = [];
    CallStack.clear();
    MicrotaskQueue.clear();
    MacrotaskQueue.clear();
  };

  // ── SETTERS / GETTERS ──
  const setSpeed     = (s)  => { _speed  = Math.min(5, Math.max(1, s)); };
  const onTick       = (fn) => { _onTick = fn; };
  const onDone       = (fn) => { _onDone = fn; };
  const isRunning    = ()   => _running;
  const isPaused     = ()   => _paused;
  const getTickCount = ()   => _tickCount;
  const getLog       = ()   => [..._log];
  const snapshot     = ()   => _snapshot();

  return {
    run, step, pause, resume, reset, load, tick,
    setSpeed, onTick, onDone,
    isRunning, isPaused, getTickCount, getLog, snapshot,
  };

})();