// core/parser.js
// Reads code line by line, identifies task type, returns structured task list

const Parser = (() => {

  // ── TASK COUNTER (gives each task a unique ID) ──
  let _id = 0;
  const nextId = () => ++_id;
  const resetId = () => { _id = 0; };

  // ── PATTERN MATCHERS ──
  const patterns = {
    sync: [
      /console\.(log|warn|error|info)\s*\(/,
      /^(const|let|var)\s+\w+\s*=/,
      /^function\s+\w+/,
      /^return\s+/,
      /^throw\s+/,
    ],
    microtask: [
      /Promise\s*\.\s*(resolve|reject|all|race|allSettled|any)\s*\(/,
      /\.then\s*\(/,
      /\.catch\s*\(/,
      /\.finally\s*\(/,
      /async\s+function/,
      /await\s+/,
      /new\s+Promise\s*\(/,
    ],
    macrotask: [
      /setTimeout\s*\(/,
      /setInterval\s*\(/,
      /setImmediate\s*\(/,
      /requestAnimationFrame\s*\(/,
      /queueMicrotask\s*\(/,          // actually microtask but shown here for awareness
    ],
  };

  // ── CLASSIFY A SINGLE LINE ──
  // Returns: 'microtask' | 'macrotask' | 'sync' | null
  const classifyLine = (line) => {
    const trimmed = line.trim();

    // skip empty lines and pure comments
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*')) {
      return null;
    }

    // microtask checked FIRST (higher priority than sync)
    for (const pattern of patterns.microtask) {
      if (pattern.test(trimmed)) return 'microtask';
    }

    // macrotask second
    for (const pattern of patterns.macrotask) {
      if (pattern.test(trimmed)) return 'macrotask';
    }

    // sync last (catch-all for meaningful lines)
    for (const pattern of patterns.sync) {
      if (pattern.test(trimmed)) return 'sync';
    }

    // lines like closing braces, semicolons alone — skip
    if (/^[{}();,\[\]]+$/.test(trimmed)) return null;

    // anything else with real content → treat as sync
    if (trimmed.length > 1) return 'sync';

    return null;
  };

  // ── EXTRACT DISPLAY LABEL ──
  // Strips noise so the card shows clean readable text
 // ── EXTRACT DISPLAY LABEL ──
  // Shows clean readable text on each task card
  const extractLabel = (line) => {
    const trimmed = line.trim();

    // console calls — show method + content cleanly
    const consoleMatch = trimmed.match(/console\.\w+\s*\(\s*(.*?)\s*\)/);
    if (consoleMatch) return `console.log(${consoleMatch[1]})`;

    // macrotask wrappers — show short label
    if (/setTimeout/.test(trimmed))  return 'setTimeout(callback)';
    if (/setInterval/.test(trimmed)) return 'setInterval(callback)';

    // promise patterns
    if (/Promise\.resolve/.test(trimmed)) return 'Promise.resolve()';
    if (/Promise\.reject/.test(trimmed))  return 'Promise.reject()';
    if (/new\s+Promise/.test(trimmed))    return 'new Promise(...)';
    if (/\.then/.test(trimmed))           return '.then(callback)';
    if (/\.catch/.test(trimmed))          return '.catch(callback)';
    if (/\.finally/.test(trimmed))        return '.finally(callback)';

    // async/await
    if (/async\s+function/.test(trimmed)) return trimmed.slice(0, 40);
    if (/await/.test(trimmed))            return trimmed.slice(0, 40);

    // fallback
    return trimmed.length > 48 ? trimmed.slice(0, 45) + '...' : trimmed;
  };

  // ── QUEUE MAPPING ──
  const queueFor = (type) => {
    if (type === 'sync')      return 'callStack';
    if (type === 'microtask') return 'microtask';
    if (type === 'macrotask') return 'macrotask';
    return null;
  };

  // ── MAIN PARSE FUNCTION ──
  // ── MAIN PARSE FUNCTION ──
  const parse = (code) => {
    resetId();
    if (!code || typeof code !== 'string') return [];

    const lines  = code.split('\n');
    const tasks  = [];

    // track nesting context to detect deferred (callback) tasks
    let insideSetTimeout  = false;
    let insidePromiseThen = false;
    let braceDepth        = 0;
    let contextStack      = []; // stack of active contexts

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('//')) return;

      // ── track brace depth for context detection ──
      const openBraces  = (trimmed.match(/\{/g) || []).length;
      const closeBraces = (trimmed.match(/\}/g) || []).length;

      // detect entering a setTimeout callback
      if (/setTimeout\s*\(/.test(trimmed)) {
        contextStack.push('macrotask');
      }

      // detect entering a .then / .catch / Promise callback
      if (/\.then\s*\(|\.catch\s*\(|\.finally\s*\(|new\s+Promise\s*\(/.test(trimmed)) {
        contextStack.push('microtask');
      }

      const currentContext = contextStack[contextStack.length - 1] || null;

      const type = classifyLine(line);
      if (!type) {
        braceDepth += openBraces - closeBraces;
        if (closeBraces > 0 && contextStack.length > 0) {
          // rough heuristic: pop context when we close a brace
          if (braceDepth <= contextStack.length - 1) {
            contextStack.pop();
          }
        }
        return;
      }

      // ── determine effective queue ──
      // if this task lives inside a callback, it is deferred
      let effectiveQueue = null;
      let effectiveType  = type;

      if (currentContext === 'macrotask') {
        // task is inside setTimeout — it only runs when that macro fires
        effectiveQueue = type === 'microtask' ? 'microtask' : 'macrotask';
        effectiveType  = type;
      } else if (currentContext === 'microtask') {
        // task is inside .then — it is itself a microtask or nested macro
        effectiveQueue = type === 'macrotask' ? 'macrotask' : 'microtask';
        effectiveType  = type;
      } else {
        effectiveQueue = type === 'sync'      ? 'callStack'
                       : type === 'microtask' ? 'microtask'
                       : 'macrotask';
        effectiveType = type;
      }

      tasks.push({
        id:        nextId(),
        type:      effectiveType,
        queue:     effectiveQueue,
        label:     extractLabel(line),
        raw:       trimmed,
        lineIndex: index,
        status:    'pending',
        context:   currentContext,   // null | 'microtask' | 'macrotask'
      });

      braceDepth += openBraces - closeBraces;
      if (closeBraces > 0 && contextStack.length > 0) {
        if (braceDepth <= contextStack.length - 1) {
          contextStack.pop();
        }
      }
    });

    return tasks;
  };


  // ── PUBLIC API ──
  return {
    parse,
    classifyLine,   // exposed for unit testing
    extractLabel,   // exposed for unit testing
  };

})();