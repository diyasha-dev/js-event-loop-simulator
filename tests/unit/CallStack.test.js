// tests/unit/CallStack.test.js
// Run in browser console: testCallStack()

const testCallStack = () => {
  const results = [];

  const check = (desc, got, expected) => {
    // JSON.stringify handles object comparison cleanly
    const g = typeof got      === 'object' ? JSON.stringify(got)      : String(got);
    const e = typeof expected === 'object' ? JSON.stringify(expected) : String(expected);
    const pass = g === e;
    results.push({ pass, desc });
    console.log(pass ? `✅ ${desc}` : `❌ ${desc}\n   got:      ${g}\n   expected: ${e}`);
  };

  // always start clean
  CallStack.clear();

  // ── isEmpty on fresh stack ──
  check('isEmpty returns true when empty', CallStack.isEmpty(), true);
  check('size is 0 when empty',            CallStack.size(),    0);

  // ── push one item ──
  const t1 = { id: 1, type: 'sync', label: "console.log('a')", queue: 'callStack', status: 'pending' };
  CallStack.push(t1);
  check('not empty after push',  CallStack.isEmpty(), false);
  check('size is 1 after push',  CallStack.size(),    1);

  // ── peek does not remove ──
  const peeked = CallStack.peek();
  check('peek returns top item label', peeked.label, "console.log('a')");
  check('size still 1 after peek',     CallStack.size(), 1);

  // ── push second item ──
  const t2 = { id: 2, type: 'sync', label: "console.log('b')", queue: 'callStack', status: 'pending' };
  CallStack.push(t2);
  check('size is 2 after second push', CallStack.size(), 2);

  // ── LIFO: pop returns LAST pushed ──
  const popped = CallStack.pop();
  check('pop returns last pushed (LIFO)',  popped.label,     "console.log('b')");
  check('size is 1 after pop',             CallStack.size(), 1);

  // ── pop the last item ──
  CallStack.pop();
  check('isEmpty after all items popped', CallStack.isEmpty(), true);

  // ── pop on empty returns null ──
  const nullResult = CallStack.pop();
  check('pop on empty stack returns null', nullResult, null);

  // ── peek on empty returns null ──
  const nullPeek = CallStack.peek();
  check('peek on empty stack returns null', nullPeek, null);

  // ── snapshot returns copy, top first ──
  CallStack.clear();
  const t3 = { id: 3, type: 'sync', label: 'first',  queue: 'callStack', status: 'pending' };
  const t4 = { id: 4, type: 'sync', label: 'second', queue: 'callStack', status: 'pending' };
  const t5 = { id: 5, type: 'sync', label: 'third',  queue: 'callStack', status: 'pending' };
  CallStack.push(t3);
  CallStack.push(t4);
  CallStack.push(t5);
  const snap = CallStack.snapshot();
  check('snapshot index 0 is top (last pushed)', snap[0].label, 'third');
  check('snapshot index 2 is bottom',            snap[2].label, 'first');
  check('snapshot length matches size',          snap.length,   3);

  // ── snapshot is a copy, not reference ──
  snap.pop();
  check('snapshot mutation does not affect stack', CallStack.size(), 3);

  // ── clear wipes everything ──
  CallStack.clear();
  check('clear empties the stack', CallStack.isEmpty(), true);

  // ── overflow protection ──
  CallStack.clear();
  let overflowCaught = false;
  try {
    for (let i = 0; i < 55; i++) {
      CallStack.push({ id: i, type: 'sync', label: `task ${i}`, queue: 'callStack', status: 'pending' });
    }
  } catch (e) {
    overflowCaught = e.message.includes('Stack overflow');
  }
  check('throws on stack overflow (> 50 items)', overflowCaught, true);

  // ── summary ──
  CallStack.clear();
  const passed = results.filter(r => r.pass).length;
  console.log(`\n${passed}/${results.length} tests passed`);
  return results;
};