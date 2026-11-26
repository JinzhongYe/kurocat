import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { after, test } from 'node:test';
import ts from 'typescript';

const compiled = mkdtempSync(join(tmpdir(), 'kurocat-test-'));
after(() => {
  assert.ok(resolve(compiled).startsWith(resolve(tmpdir()) + sep));
  rmSync(compiled, { recursive: true, force: true });
});
for (const name of ['keyboardLayout', 'catSkins', 'starDoctorRenderer', 'catEngine']) {
  const source = readFileSync(new URL(`../src/${name}.ts`, import.meta.url), 'utf8')
    .replace(/import (\w+) from '[^']+\.png';/g, 'const $1 = "sprite.png";' );
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText.replace(/from '(\.\/[^']+)'/g, "from '$1.mjs'");
  writeFileSync(join(compiled, `${name}.mjs`), code);
}
writeFileSync(join(compiled, 'audio.mjs'), 'export const catAudio = new Proxy({}, { get: () => () => {} });');
writeFileSync(join(compiled, 'dafeiyuRenderer.mjs'), 'export class DaFeiYuRenderer { releaseSprites() {} onKeyUp() {} onPrivacyModeChanged() {} resetLeftHandForMouse() {} onMouseAction() {} }');
const { STAR_DOCTOR_SKIN } = await import(pathToFileURL(join(compiled, 'catSkins.mjs')));
const { KuroCatEngine } = await import(pathToFileURL(join(compiled, 'catEngine.mjs')));

function mockBrowser(t) {
  const original = { Image: globalThis.Image, window: globalThis.window, document: globalThis.document };
  globalThis.Image = class { complete = true; naturalWidth = 1280; };
  const calls = [];
  const ctx = new Proxy({}, { get: (_, key) => (...args) => {
    calls.push([key, ...args]);
    if (String(key).startsWith('create')) return { addColorStop() {} };
    if (key === 'measureText') return { width: String(args[0]).length * 6 };
  } });
  const canvas = () => ({ width: 420, height: 440, clientWidth: 420, clientHeight: 440, getContext: () => ctx });
  globalThis.window = { devicePixelRatio: 1, innerWidth: 420, innerHeight: 440, addEventListener() {} };
  globalThis.document = { createElement: canvas };
  t.after(() => Object.assign(globalThis, original));
  return { calls, canvas };
}

test('both layouts and orientations use independent hands, held keys and tailless Enter fallback', t => {
  const { canvas } = mockBrowser(t);
  for (const layout of ['65', '108']) for (const orientation of ['cat', 'viewer']) {
    const engine = new KuroCatEngine(canvas());
    engine.setCatAppearance('star-doctor', STAR_DOCTOR_SKIN);
    engine.setKeyboardConfig(layout, orientation);
    engine.onKeyDown(0x41, false);
    engine.onKeyDown(0x08, false);
    assert.notEqual(engine.heldKeys.get(0x41).side, engine.heldKeys.get(0x08).side);
    engine.onKeyDown(0x41, true);
    assert.equal(engine.heldKeys.size, 2);
    engine.update(0.05, performance.now() + 60);
    assert.notDeepEqual(engine.leftPaw.pos, engine.rightPaw.pos);
    assert.ok(engine.keyAnims.get(engine.heldKeys.get(0x41).specId).pressed);
    engine.onKeyUp(0x41);
    engine.onKeyUp(0x08);
    assert.equal(engine.heldKeys.size, 0);
    engine.setTailKeyConfig('custom', ['enter']);
    engine.onKeyDown(0x0d, false);
    assert.ok(engine.heldKeys.has(0x0d), 'Enter always reaches a visible hand');
    assert.equal(engine.catTail.heldVks.size, 0);
    engine.onKeyUp(0x0d);
    engine.releaseCachedResources();
  }
});

test('cat sleep, wake, curious, angry, happy, gaze, mouse and privacy state are shared', t => {
  const { canvas, calls } = mockBrowser(t);
  const engine = new KuroCatEngine(canvas());
  engine.setCatAppearance('star-doctor', STAR_DOCTOR_SKIN);
  engine.triggerSleepDemo();
  engine.update(0.05, performance.now());
  assert.ok(engine.asleep && engine.sleepAmount > 0);
  engine.triggerWakeDemo();
  assert.equal(engine.asleep, false);
  engine.triggerCuriousDemo();
  assert.ok(engine.curiousUntil > performance.now());
  engine.triggerCrossDemo();
  assert.ok(engine.isCross);
  engine.triggerHappyDemo();
  assert.ok(engine.petEnergy > 0);
  engine.onWindowCursor(0.9, 0.1, false);
  engine.update(0.05, performance.now() + 100);
  assert.ok(Number.isFinite(engine.eyeLookX) && engine.eyeLookX !== 0);
  engine.setPrivacyMode(true);
  engine.onKeyDown(0x41, false);
  assert.equal(engine.heldKeys.size, 0);
  engine.update(0.05, performance.now() + 150);
  assert.ok(engine.privacyClose > 0);
  engine.render();
  assert.ok(calls.some(c => c[0] === 'drawImage'), 'body and keyboard are drawn');
  assert.ok(calls.some(c => c[0] === 'ellipse'), 'shared arms and eyes are drawn');
  engine.setPrivacyMode(false);
  engine.onMouseDown('left');
  assert.equal(engine.leftPaw.mode, 'mouse');
  engine.onMouseUp('left');
  engine.releaseCachedResources();
});
