// core/MacrotaskQueue.js
// FIFO queue — First In First Out
// Handles setTimeout(), setInterval(), requestAnimationFrame()
// LOW PRIORITY — only one task is taken per event loop tick
// (unlike microtasks which are fully drained each tick)

const MacrotaskQueue = (() => {

  // ── INTERNAL STATE ──
  let _queue = [];

  // ── ENQUEUE ──
  // Adds a task to the END of the queue
  const enqueue = (task) => {
    const entry = { ...task, status: 'pending' };
    _queue.push(entry);
    return entry;
  };

  // ── DEQUEUE ──
  // Removes and returns ONE item from the FRONT
  // This is intentional — the event loop only processes
  // ONE macrotask per tick, then checks microtasks again
  const dequeue = () => {
    if (isEmpty()) return null;
    return _queue.shift();
  };

  // ── PEEK ──
  // Read front item WITHOUT removing it
  const peek = () => {
    if (isEmpty()) return null;
    return _queue[0];
  };

  // ── PEEK NEXT N ──
  // Preview upcoming tasks without removing them
  // Useful for the UI to show "what's coming next"
  const peekNext = (n = 3) => {
    return _queue.slice(0, n);
  };

  // ── HELPERS ──
  const isEmpty = () => _queue.length === 0;
  const size     = () => _queue.length;
  const clear    = () => { _queue = []; };

  // ── SNAPSHOT ──
  // Returns a copy front-to-back for the UI renderer
  // index 0 = next to execute
  const snapshot = () => [..._queue];

  // ── PUBLIC API ──
  return {
    enqueue,
    dequeue,
    peek,
    peekNext,
    isEmpty,
    size,
    clear,
    snapshot,
  };

})();