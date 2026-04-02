// tests/integration/eventLoop.test.js
// Tests the full tick() execution order across all three queues
// Run in browser console: testEventLoop()

const testEventLoop = () => {
  const results = [];

  const check = (desc, got, expected) => {
    const g = typeof got      === 'object' ? JSON.stringify(got)      : String(got);
    const e = typeof expected === 'object' ? JSON.stringify(expected) : String(expected);
    const pass = g === e;
    results.push({ pass, desc });
    console.log(pass ? `✅ ${desc}` : `❌ ${desc}\n   got:      ${g}\n   expected: ${e}`);
  };

  // helper — run all ticks synchronously and collect phase order
  const runAllTicks = () => {
    const phases = [];
    let safety = 0;
    while (safety < 100) {
      const result = EventLoop.tick();
      phases.push(result.phase);
      if (result.done) break;
      safety++;
    }
    return phases;
  };

  // ── TEST 1: callStack runs before microtask and macrotask ──
  EventLoop.reset();
  EventLoop.load(`console.log('sync');\nPromise.resolve();\nsetTimeout(() => {}, 0);`);
  const phases1 = runAllTicks();
  check('callStack phase runs first',    phases1[0], 'callStack');
  check('microtask phase runs second',   phases1[1], 'microtask');
  check('macrotask phase runs third',    phases1[2], 'macrotask');
  check('loop ends with idle',           phases1[phases1.length - 1], 'idle');

  // ── TEST 2: microtask drains completely before macrotask ──
  EventLoop.reset();
  EventLoop.load(`Promise.resolve();\nPromise.resolve();\nPromise.resolve();\nsetTimeout(() => {}, 0);`);
  const phases2 = runAllTicks();
  // all 3 microtasks drain in ONE microtask phase, then ONE macrotask phase
  check('microtask phase comes before macrotask', phases2.indexOf('microtask') < phases2.indexOf('macrotask'), true);
  check('only one microtask phase needed (drain)', phases2.filter(p => p === 'microtask').length, 1);

  // ── TEST 3: only sync tasks — no microtask or macrotask phase ──
  EventLoop.reset();
  EventLoop.load(`console.log('a');\nconsole.log('b');`);
  const phases3 = runAllTicks();
  check('two sync tasks produce two callStack phases', phases3.filter(p => p === 'callStack').length, 2);
  check('no microtask phase when none queued',         phases3.includes('microtask'), false);
  check('no macrotask phase when none queued',         phases3.includes('macrotask'), false);

  // ── TEST 4: only macrotasks — no callStack or microtask phase ──
  EventLoop.reset();
  EventLoop.load(`setTimeout(() => {}, 0);\nsetTimeout(() => {}, 0);`);
  const phases4 = runAllTicks();
  check('no callStack phase when none queued',  phases4.includes('callStack'), false);
  check('no microtask phase when none queued',  phases4.includes('microtask'), false);
  check('two macrotask phases for two tasks',   phases4.filter(p => p === 'macrotask').length, 2);

  // ── TEST 5: console output captured in log ──
  EventLoop.reset();
  EventLoop.load(`console.log('hello world');`);
  runAllTicks();
  const log = EventLoop.getLog();
  const realLogs = log.filter(e => e.type === 'log');
  check('console.log captured in output log',    realLogs.length,          1);
  check('log message is correct',                realLogs[0].message,      'hello world');

  // ── TEST 6: reset clears everything ──
  EventLoop.reset();
  check('reset clears tick count',   EventLoop.getTickCount(), 0);
  check('reset clears log',          EventLoop.getLog().length, 0);
  check('reset clears callStack',    CallStack.isEmpty(),       true);
  check('reset clears microtask q',  MicrotaskQueue.isEmpty(),  true);
  check('reset clears macrotask q',  MacrotaskQueue.isEmpty(),  true);

  // ── TEST 7: load returns correct task count ──
  EventLoop.reset();
  const count = EventLoop.load(`console.log('a');\nPromise.resolve();\nsetTimeout(() => {}, 0);`);
  check('load returns 3 for 3 valid tasks', count, 3);

  // ── TEST 8: onTick callback fires ──
  EventLoop.reset();
  let tickFired = false;
  EventLoop.onTick(() => { tickFired = true; });
  EventLoop.load(`console.log('test');`);
  EventLoop.tick();
  check('onTick callback fires after tick', tickFired, true);

  // ── TEST 9: snapshot reflects queue states ──
  EventLoop.reset();
  EventLoop.load(`console.log('snap');\nPromise.resolve();`);
  const snap = EventLoop.snapshot();
  check('snapshot has callStack array',  Array.isArray(snap.callStack), true);
  check('snapshot has microtask array',  Array.isArray(snap.microtask), true);
  check('snapshot has macrotask array',  Array.isArray(snap.macrotask), true);
  check('callStack has 1 item loaded',   snap.callStack.length,         1);
  check('microtask has 1 item loaded',   snap.microtask.length,         1);

  // ── summary ──
  EventLoop.reset();
  EventLoop.onTick(null);
  const passed = results.filter(r => r.pass).length;
  console.log(`\n${passed}/${results.length} tests passed`);
  return results;
};