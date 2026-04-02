// tests/unit/MicrotaskQueue.test.js
// Run in browser console: testMicrotaskQueue()

const testMicrotaskQueue = () => {
  const results = [];

  const check = (desc, got, expected) => {
    const g = typeof got      === 'object' ? JSON.stringify(got)      : String(got);
    const e = typeof expected === 'object' ? JSON.stringify(expected) : String(expected);
    const pass = g === e;
    results.push({ pass, desc });
    console.log(pass ? `✅ ${desc}` : `❌ ${desc}\n   got:      ${g}\n   expected: ${e}`);
  };

  MicrotaskQueue.clear();

  // ── isEmpty on fresh queue ──
  check('isEmpty returns true when empty', MicrotaskQueue.isEmpty(), true);
  check('size is 0 when empty',            MicrotaskQueue.size(),    0);

  // ── enqueue one item ──
  const t1 = { id: 1, type: 'microtask', label: "Promise.resolve()", queue: 'microtask', status: 'pending' };
  MicrotaskQueue.enqueue(t1);
  check('not empty after enqueue', MicrotaskQueue.isEmpty(), false);
  check('size is 1 after enqueue', MicrotaskQueue.size(),    1);

  // ── peek does not remove ──
  const peeked = MicrotaskQueue.peek();
  check('peek returns front item label', peeked.label, "Promise.resolve()");
  check('size still 1 after peek',       MicrotaskQueue.size(), 1);

  // ── enqueue second item ──
  const t2 = { id: 2, type: 'microtask', label: ".then(res => {})", queue: 'microtask', status: 'pending' };
  MicrotaskQueue.enqueue(t2);
  check('size is 2 after second enqueue', MicrotaskQueue.size(), 2);

  // ── FIFO: dequeue returns FIRST enqueued ──
  const dequeued = MicrotaskQueue.dequeue();
  check('dequeue returns first enqueued (FIFO)', dequeued.label,          "Promise.resolve()");
  check('size is 1 after dequeue',               MicrotaskQueue.size(),   1);

  // ── dequeue last item ──
  MicrotaskQueue.dequeue();
  check('isEmpty after all items dequeued', MicrotaskQueue.isEmpty(), true);

  // ── dequeue on empty returns null ──
  check('dequeue on empty returns null', MicrotaskQueue.dequeue(), null);

  // ── peek on empty returns null ──
  check('peek on empty returns null', MicrotaskQueue.peek(), null);

  // ── drain returns all items and empties queue ──
  MicrotaskQueue.clear();
  const t3 = { id: 3, type: 'microtask', label: 'first',  queue: 'microtask', status: 'pending' };
  const t4 = { id: 4, type: 'microtask', label: 'second', queue: 'microtask', status: 'pending' };
  const t5 = { id: 5, type: 'microtask', label: 'third',  queue: 'microtask', status: 'pending' };
  MicrotaskQueue.enqueue(t3);
  MicrotaskQueue.enqueue(t4);
  MicrotaskQueue.enqueue(t5);

  const drained = MicrotaskQueue.drain();
  check('drain returns 3 items',             drained.length,          3);
  check('drain index 0 is first enqueued',   drained[0].label,        'first');
  check('drain index 2 is last enqueued',    drained[2].label,        'third');
  check('queue is empty after drain',        MicrotaskQueue.isEmpty(), true);

  // ── snapshot is a copy, not a reference ──
  MicrotaskQueue.clear();
  const t6 = { id: 6, type: 'microtask', label: 'snap-test', queue: 'microtask', status: 'pending' };
  MicrotaskQueue.enqueue(t6);
  const snap = MicrotaskQueue.snapshot();
  snap.pop();
  check('snapshot mutation does not affect queue', MicrotaskQueue.size(), 1);

  // ── FIFO ordering: 5 items in order ──
  MicrotaskQueue.clear();
  ['a','b','c','d','e'].forEach((label, i) => {
    MicrotaskQueue.enqueue({ id: i, type: 'microtask', label, queue: 'microtask', status: 'pending' });
  });
  const order = [];
  while (!MicrotaskQueue.isEmpty()) {
    order.push(MicrotaskQueue.dequeue().label);
  }
  check('FIFO order preserved across 5 items', order.join(','), 'a,b,c,d,e');

  // ── clear wipes everything ──
  MicrotaskQueue.enqueue(t1);
  MicrotaskQueue.clear();
  check('clear empties the queue', MicrotaskQueue.isEmpty(), true);

  // ── summary ──
  const passed = results.filter(r => r.pass).length;
  console.log(`\n${passed}/${results.length} tests passed`);
  return results;
};