// core/MicrotaskQueue.js
// FIFO queue — First In First Out
// Handles Promise.then(), .catch(), .finally(), async/await
// HIGH PRIORITY — always drained completely before any macrotask runs

const MicrotaskQueue = (() => {

  // ── INTERNAL STATE ──
  let _queue = [];

  // ── ENQUEUE ──
  // Adds a task to the END of the queue (back of the line)
  const enqueue = (task) => {
    const entry = { ...task, status: 'pending' };
    _queue.push(entry);
    return entry;
  };

  // ── DEQUEUE ──
  // Removes and returns the FRONT item (FIFO)
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

  // ── DRAIN ──
  // Returns ALL items in order and empties the queue
  // This mirrors real JS behavior — microtasks are fully
  // drained before the event loop moves to macrotasks
  const drain = () => {
    const all = [..._queue];
    _queue = [];
    return all;
  };

  // ── HELPERS ──
  const isEmpty = () => _queue.length === 0;
  const size     = () => _queue.length;
  const clear    = () => { _queue = []; };

  // ── SNAPSHOT ──
  // Returns a copy of the queue front-to-back for the UI renderer
  // index 0 = next to execute (front of queue)
  const snapshot = () => [..._queue];

  // ── PUBLIC API ──
  return {
    enqueue,
    dequeue,
    peek,
    drain,
    isEmpty,
    size,
    clear,
    snapshot,
  };

})();