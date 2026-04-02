// tests/unit/parser.test.js
// Run with: npx vitest (after npm init + npm install vitest)
// For now you can also just open browser console and run testParser()

const testParser = () => {
  const results = [];

  const check = (desc, got, expected) => {
    const pass = got === expected;
    results.push({ pass, desc, got, expected });
    console.log(pass ? `✅ ${desc}` : `❌ ${desc} — got "${got}", expected "${expected}"`);
  };

  // ── classifyLine tests ──
  check('console.log is sync',
    Parser.classifyLine("console.log('hello')"), 'sync');

  check('Promise.resolve is microtask',
    Parser.classifyLine("Promise.resolve().then(() => {})"), 'microtask');

  check('.then() is microtask',
    Parser.classifyLine("  .then(res => console.log(res))"), 'microtask');

  check('setTimeout is macrotask',
    Parser.classifyLine("setTimeout(() => {}, 0)"), 'macrotask');

  check('setInterval is macrotask',
    Parser.classifyLine("setInterval(() => tick(), 1000)"), 'macrotask');

  check('async function is microtask',
    Parser.classifyLine("async function fetchData() {"), 'microtask');

  check('await is microtask',
    Parser.classifyLine("  const data = await fetch(url)"), 'microtask');

  check('blank line is null',
    Parser.classifyLine(""), null);

  check('comment line is null',
    Parser.classifyLine("// this is a comment"), null);

  check('closing brace is null',
    Parser.classifyLine("}"), null);

  check('const declaration is sync',
    Parser.classifyLine("const x = 42"), 'sync');

  // ── parse() output shape tests ──
  const tasks = Parser.parse(`console.log('a');\nsetTimeout(() => {}, 0);\nPromise.resolve();`);

  check('parse returns 3 tasks', String(tasks.length), '3');
  check('first task is sync',      tasks[0].type,  'sync');
  check('second task is macrotask',tasks[1].type,  'macrotask');
  check('third task is microtask', tasks[2].type,  'microtask');
  check('first task has id 1',     String(tasks[0].id), '1');
  check('first task queue is callStack', tasks[0].queue, 'callStack');
  check('task has status pending', tasks[0].status, 'pending');

  // ── summary ──
  const passed = results.filter(r => r.pass).length;
  console.log(`\n${passed}/${results.length} tests passed`);
  return results;
};