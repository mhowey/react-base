import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

const script = fs.readFileSync(new URL('./check-node.mjs', import.meta.url), 'utf8');
const engines = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8')).engines.node;

test('runtime policy matches the dependency engine requirements', () => {
  assert.equal(engines, '^22.12.0 || ^24.0.0 || >=26.0.0');
});

for (const [version, supported] of [
  ['18.20.0', false],
  ['20.19.6', false],
  ['22.11.0', false],
  ['22.12.0', true],
  ['22.22.0', true],
  ['23.0.0', false],
  ['24.0.0', true],
  ['24.22.2', true],
  ['25.0.0', false],
  ['26.0.0', true],
  ['27.0.0', true],
]) {
  test(`Node ${version} is ${supported ? 'accepted' : 'rejected'}`, () => {
    let exitCode;
    let message;
    vm.runInNewContext(script, {
      process: { versions: { node: version }, exit: (code) => { exitCode = code; } },
      console: { error: (text) => { message = text; } },
    });
    assert.equal(exitCode, supported ? undefined : 1);
    if (!supported) {
      assert.match(message, /Unsupported Node.js/);
      assert.ok(message.includes(version));
      assert.match(message, /npm ci/);
    }
  });
}