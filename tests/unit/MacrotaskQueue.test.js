// tests/unit/MacrotaskQueue.test.js
// Run in browser console: testMacrotaskQueue()

const testMacrotaskQueue = () => {
  const results = [];

  const check = (desc, got, expected) => {
    const g = typeof got      === 'object' ? JSON.stringify(got)      : String(got);
    const e = typeof expected === 'object' ? JSON.stringify(expected) : String(expected);
    const pass = g === e;
    results.push({ pass, desc });
    console.log(pass ? `✅ ${desc}` : `❌ ${desc}\n   got:      ${g}\n   expected: ${e}`);
  };

  MacrotaskQueue.clear();

  // ── isEmpty on fresh queue ──
  check('isEmpty returns true when empty', MacrotaskQueue.isEmpty(), true);
  check('size is 0 when empty',            MacrotaskQueue.size(),    0);

  // ── enqueue one item ──
  const t1 = { id: 1, type: 'macrotask', label: "setTimeout(() => {}, 0)", queue: 'macrotask', status: 'pending' };
  MacrotaskQueue.enqueue(t1);
  check('not empty after enqueue', MacrotaskQueue.isEmpty(), false);
  check('size is 1 after enqueue', MacrotaskQueue.size(),    1);

  // ── peek does not remove ──
  const peeked = MacrotaskQueue.peek();
  check('peek returns front item label', peeked.label, "setTimeout(() => {}, 0)");
  check('size still 1 after peek',       MacrotaskQueue.size(), 1);

  // ── enqueue second item ──
  const t2 = { id: 2, type: 'macrotask', label: "setInterval(() => {}, 1000)", queue: 'macrotask', status: 'pending' };
  MacrotaskQueue.enqueue(t2);
  check('size is 2 after second enqueue', MacrotaskQueue.size(), 2);

  // ── FIFO: dequeue returns FIRST enqueued ──
  const dequeued = MacrotaskQueue.dequeue();
  check('dequeue returns first enqueued (FIFO)', dequeued.label,           "setTimeout(() => {}, 0)");
  check('size is 1 after dequeue',               MacrotaskQueue.size(),    1);

  // ── KEY DIFFERENCE: only ONE item dequeued per tick ──
  MacrotaskQueue.clear();
  ['macro-1','macro-2','macro-3'].forEach((label, i) => {
    MacrotaskQueue.enqueue({ id: i, type: 'macrotask', label, queue: 'macrotask', status: 'pending' });
  });
  const firstTick = MacrotaskQueue.dequeue();
  check('only ONE macrotask taken per tick',        firstTick.label,         'macro-1');
  check('remaining 2 tasks still in queue',         MacrotaskQueue.size(),   2);
  check('second tick takes next macrotask',         MacrotaskQueue.dequeue().label, 'macro-2');
  check('one task remains after two ticks',         MacrotaskQueue.size(),   1);

  // ── dequeue on empty returns null ──
  MacrotaskQueue.clear();
  check('dequeue on empty returns null', MacrotaskQueue.dequeue(), null);

  // ── peek on empty returns null ──
  check('peek on empty returns null', MacrotaskQueue.peek(), null);

  // ── peekNext returns upcoming tasks without removing ──
  MacrotaskQueue.clear();
  ['a','b','c','d','e'].forEach((label, i) => {
    MacrotaskQueue.enqueue({ id: i, type: 'macrotask', label, queue: 'macrotask', status: 'pending' });
  });
  const next3 = MacrotaskQueue.peekNext(3);
  check('peekNext returns 3 items',              next3.length,            3);
  check('peekNext index 0 is front of queue',    next3[0].label,          'a');
  check('peekNext index 2 is third in queue',    next3[2].label,          'c');
  check('peekNext does not remove items',        MacrotaskQueue.size(),   5);

  // ── snapshot is a copy, not a reference ──
  const snap = MacrotaskQueue.snapshot();
  snap.pop();
  check('snapshot mutation does not affect queue', MacrotaskQueue.size(), 5);

  // ── FIFO ordering across 5 items ──
  MacrotaskQueue.clear();
  ['a','b','c','d','e'].forEach((label, i) => {
    MacrotaskQueue.enqueue({ id: i, type: 'macrotask', label, queue: 'macrotask', status: 'pending' });
  });
  const order = [];
  while (!MacrotaskQueue.isEmpty()) {
    order.push(MacrotaskQueue.dequeue().label);
  }
  check('FIFO order preserved across 5 items', order.join(','), 'a,b,c,d,e');

  // ── clear wipes everything ──
  MacrotaskQueue.enqueue(t1);
  MacrotaskQueue.clear();
  check('clear empties the queue', MacrotaskQueue.isEmpty(), true);

  // ── summary ──
  MacrotaskQueue.clear();
  const passed = results.filter(r => r.pass).length;
  console.log(`\n${passed}/${results.length} tests passed`);
  return results;
};