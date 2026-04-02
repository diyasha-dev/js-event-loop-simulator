// core/CallStack.js
// LIFO stack — Last In First Out (like a stack of plates)
// Handles all synchronous tasks

const CallStack = (() => {

  // ── INTERNAL STATE ──
  let _stack = [];
  const MAX_SIZE = 50; // prevent infinite loop stack overflow

  // ── PUSH ──
  // Adds a task to the TOP of the stack
  const push = (task) => {
    if (_stack.length >= MAX_SIZE) {
      throw new Error(`Stack overflow — max size ${MAX_SIZE} reached`);
    }
    const entry = { ...task, status: 'pending' };
    _stack.push(entry);
    return entry;
  };

  // ── POP ──
  // Removes and returns the TOP item (LIFO)
  const pop = () => {
    if (isEmpty()) return null;
    return _stack.pop();
  };

  // ── PEEK ──
  // Read top item WITHOUT removing it
  const peek = () => {
    if (isEmpty()) return null;
    return _stack[_stack.length - 1];
  };

  // ── HELPERS ──
  const isEmpty = () => _stack.length === 0;
  const size     = () => _stack.length;

  // ── CLEAR ──
  const clear = () => { _stack = []; };

  // ── SNAPSHOT ──
  // Returns a copy of the stack (top first) for the UI renderer
  // We reverse so index 0 = top of stack (most recent)
  const snapshot = () => [..._stack].reverse();

  // ── PUBLIC API ──
  return {
    push,
    pop,
    peek,
    isEmpty,
    size,
    clear,
    snapshot,
  };

})();