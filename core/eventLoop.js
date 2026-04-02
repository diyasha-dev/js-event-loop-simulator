// core/eventLoop.js
// The scheduler — coordinates all three queues
// One tick = one step in the simulation
// Enforces the real JS event loop rules exactly

const EventLoop = (() => {

  // ── STATE ──
  let _running   = false;
  let _paused    = false;
  let _tickCount = 0;
  let _speed     = 3;        // 1 (slow) → 5 (fast)
  let _timerId   = null;
  let _onTick    = null;     // callback → UI gets notified after every tick
  let _onDone    = null;     // callback → UI gets notified when loop finishes
  let _log       = [];       // execution log for the console panel

  // ── SPEED → DELAY MAP ──
  // speed 1 = 1200ms per tick (slow, easy to follow)
  // speed 5 = 150ms  per tick (fast)
  const speedToDelay = (s) => {
    const map = { 1: 1200, 2: 800, 3: 500, 4: 300, 5: 150 };
    return map[s] || 500;
  };

  // ── LOG HELPER ──
  const addLog = (message, type = 'log') => {
    const entry = {
      id:        _log.length + 1,
      message,
      type,      // 'log' | 'info' | 'warn' | 'system'
      tick:      _tickCount,
      timestamp: Date.now(),
    };
    _log.push(entry);
    return entry;
  };

  // ── EVAL A TASK ──
  // Safely extracts the console output from a task label
  // We don't eval real code — we simulate the output visually
  // ── EVAL A TASK ──
  const executeTask = (task) => {
    task.status = 'executing';

    // Strategy: find console.xxx('...') anywhere in the raw line
    // Works for direct calls AND arrow-wrapped calls
    // Tries single quote, double quote, backtick in order
    const raw = task.raw;

    // match console.log('...') or console.log("...") or console.log(`...`)
    const match =
      raw.match(/console\.(log|warn|error|info)\s*\(\s*'([^']*)'\s*\)/) ||
      raw.match(/console\.(log|warn|error|info)\s*\(\s*"([^"]*)"\s*\)/) ||
      raw.match(/console\.(log|warn|error|info)\s*\(\s*`([^`]*)`\s*\)/);

    if (match) {
      const method = match[1];   // log | warn | error | info
      const value  = match[2];   // clean string content, no quotes at all
      addLog(value, method);
    } else {
      addLog(`executed: ${task.label}`, 'system');
    }

    task.status = 'done';
    return task;
  };

  // ── SINGLE TICK ──
  // This is the core event loop algorithm
  // Returns a status object describing what happened this tick
  const tick = () => {
    _tickCount++;

    // ── PHASE 1: Call Stack ──
    // If anything is on the call stack, run it first
    if (!CallStack.isEmpty()) {
      const task = CallStack.pop();
      executeTask(task);

      if (_onTick) _onTick({
        phase:   'callStack',
        task,
        tick:    _tickCount,
        log:     [..._log],
        stacks:  _snapshot(),
      });
      return { phase: 'callStack', task, done: false };
    }

    // ── PHASE 2: Microtask Queue ──
    // Drain ALL microtasks before touching macrotasks
    // This loops until microtask queue is completely empty
    if (!MicrotaskQueue.isEmpty()) {
      const drained = [];

      while (!MicrotaskQueue.isEmpty()) {
        const task = MicrotaskQueue.dequeue();
        executeTask(task);
        drained.push(task);
        _tickCount++;
      }

      if (_onTick) _onTick({
        phase:   'microtask',
        tasks:   drained,
        tick:    _tickCount,
        log:     [..._log],
        stacks:  _snapshot(),
      });
      return { phase: 'microtask', tasks: drained, done: false };
    }

    // ── PHASE 3: Macrotask Queue ──
    // Take exactly ONE macrotask per tick
    if (!MacrotaskQueue.isEmpty()) {
      const task = MacrotaskQueue.dequeue();
      executeTask(task);

      if (_onTick) _onTick({
        phase:   'macrotask',
        task,
        tick:    _tickCount,
        log:     [..._log],
        stacks:  _snapshot(),
      });
      return { phase: 'macrotask', task, done: false };
    }

    // ── PHASE 4: All queues empty — loop is idle ──
    _running = false;
    if (_onDone) _onDone({
      tick:  _tickCount,
      log:   [..._log],
    });
    return { phase: 'idle', done: true };
  };

  // ── SNAPSHOT ──
  // Captures current state of all three queues for the UI
  const _snapshot = () => ({
    callStack: CallStack.snapshot(),
    microtask: MicrotaskQueue.snapshot(),
    macrotask: MacrotaskQueue.snapshot(),
  });

  // ── LOAD TASKS ──
// ── LOAD TASKS ──
  // Parses code and distributes tasks to their queues
  const load = (code) => {
    reset();

    const tasks = Parser.parse(code);
    if (tasks.length === 0) return 0;

    // separate by queue type
    const syncTasks  = tasks.filter(t => t.queue === 'callStack');
    const microTasks = tasks.filter(t => t.queue === 'microtask');
    const macroTasks = tasks.filter(t => t.queue === 'macrotask');

    // push sync tasks in REVERSE order so first line ends up on top
    // CallStack is LIFO — last pushed = first executed
    // reversing means line 1 is pushed last = sits on top = runs first
    [...syncTasks].reverse().forEach(task => CallStack.push(task));

    // queues are FIFO so push in normal reading order
    microTasks.forEach(task => MicrotaskQueue.enqueue(task));
    macroTasks.forEach(task => MacrotaskQueue.enqueue(task));

    addLog(`loaded ${tasks.length} tasks`, 'system');
    return tasks.length;
  };
  // ── RUN (auto mode) ──
  // Runs all ticks automatically with delay between each
  const run = (code) => {
    if (_running) return;

    const count = load(code);
    if (count === 0) {
      addLog('no tasks found — check your code', 'warn');
      return;
    }

    _running = true;
    _paused  = false;

    const loop = () => {
      if (!_running || _paused) return;

      const result = tick();
      if (!result.done) {
        _timerId = setTimeout(loop, speedToDelay(_speed));
      }
    };

    loop();
  };

  // ── STEP (manual mode) ──
  // Advances exactly one tick — for the Step button
  const step = (code) => {
    // if not loaded yet, load first
    if (!_running && _tickCount === 0) {
      const count = load(code);
      if (count === 0) {
        addLog('no tasks found — check your code', 'warn');
        return;
      }
      _running = true;
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
  // Wipes everything back to initial state
  const reset = () => {
    _running   = false;
    _paused    = false;
    _tickCount = 0;
    _timerId   && clearTimeout(_timerId);
    _timerId   = null;
    _log       = [];
    CallStack.clear();
    MicrotaskQueue.clear();
    MacrotaskQueue.clear();
  };

  // ── SETTERS ──
  const setSpeed    = (s)  => { _speed   = Math.min(5, Math.max(1, s)); };
  const onTick      = (fn) => { _onTick  = fn; };
  const onDone      = (fn) => { _onDone  = fn; };

  // ── GETTERS ──
  const isRunning   = ()   => _running;
  const isPaused    = ()   => _paused;
  const getTickCount= ()   => _tickCount;
  const getLog      = ()   => [..._log];
  const snapshot    = ()   => _snapshot();

  // ── PUBLIC API ──
  return {
    run,
    step,
    pause,
    resume,
    reset,
    load,
    tick,
    setSpeed,
    onTick,
    onDone,
    isRunning,
    isPaused,
    getTickCount,
    getLog,
    snapshot,
  };

})();