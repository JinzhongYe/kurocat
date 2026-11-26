import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';

async function loadTs(path, transform = s => s) {
  const code = ts.transpileModule(transform(readFileSync(new URL(path, import.meta.url), 'utf8')), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
}

const { DEFAULT_BUILTIN_CATS, is2DOnlySkin } = await loadTs('../src/catSkins.ts');
const { StarDoctorRenderer, starDoctorPoint, starDoctorArm } = await loadTs('../src/starDoctorRenderer.ts', s =>
  s.replace(/import (\w+) from '[^']+\.png';/g, 'const $1 = "sprite.png";'));

test('Star Doctor has its own selectable ID and uses 2D in every locale', () => {
  assert.equal(DEFAULT_BUILTIN_CATS.filter(c => c.id === 'star-doctor').length, 1);
  assert.equal(is2DOnlySkin('star-doctor'), true);
  assert.equal(is2DOnlySkin('dafeiyu'), true);
  assert.equal(is2DOnlySkin('black'), false);
  for (const locale of ['zh-CN', 'zh-TW', 'en-US', 'ja-JP', 'ko-KR']) {
    const catalog = JSON.parse(readFileSync(new URL(`../locales/${locale}.json`, import.meta.url)));
    assert.ok(catalog.breeds['star-doctor']);
    assert.ok(!catalog.breeds['star-doctor'].includes('?'));
  }
});

test('sleeves stay attached to the artwork during body movement and preserve exact key targets', () => {
  for (const tilt of [-0.5, 0, 0.5]) {
    const pose = { x: 200, y: 240, size: 300, tilt };
    const angle = Math.max(-0.08, Math.min(0.08, tilt * 0.4));
    for (const side of ['left', 'right']) {
      const hand = { side, x: side === 'left' ? 35 : 460, y: 355, squash: 0 };
      const arm = starDoctorArm(pose, hand, 0);
      const offset = (side === 'left' ? 0.38 - 0.485 : 0.59 - 0.485) * 300;
      assert.ok(Math.abs(arm.shoulder.x - (200 + offset * Math.cos(angle))) < 1e-9);
      assert.ok(Math.abs(arm.shoulder.y - (240 + offset * Math.sin(angle))) < 1e-9);
      assert.deepEqual(arm.target, { x: hand.x, y: hand.y });
      assert.ok(Math.abs(arm.elbow.x - (arm.shoulder.x + hand.x) / 2) <= 18);
      const moved = starDoctorArm({ ...pose, x: 207, y: 251 }, hand, 0);
      assert.ok(Math.abs(moved.shoulder.x - arm.shoulder.x - 7) < 1e-9);
      assert.ok(Math.abs(moved.shoulder.y - arm.shoulder.y - 11) < 1e-9);
      const covered = starDoctorArm(pose, hand, 1);
      const eye = starDoctorPoint(pose, 0.485 + (side === 'left' ? -19.95 : 19.95) / 300, 0.425);
      assert.deepEqual(covered.target, eye);
    }
  }
});

test('renderer loads once, draws the body and shared face, and releases its image', t => {
  const previousImage = globalThis.Image;
  let image;
  const images = [];
  globalThis.Image = class {
    complete = false;
    naturalWidth = 0;
    constructor() { image = this; images.push(this); }
  };
  t.after(() => { globalThis.Image = previousImage; });
  let ready = 0;
  const renderer = new StarDoctorRenderer(() => { ready++; });
  const calls = [];
  const ctx = new Proxy({}, { get: (_, key) => (...args) => calls.push([key, ...args]) });
  const pose = { x: 196, y: 230, size: 296, tilt: 0 };
  let faces = 0;
  const drawFace = () => { faces++; };
  renderer.prepare();
  image = images[0];
  const originalImage = image;
  renderer.prepare();
  assert.equal(image, originalImage);
  assert.equal(images.length, 2, 'body and mitten are loaded once each');
  renderer.render(ctx, pose, drawFace);
  assert.equal(calls.length, 0, 'never draw an unloaded image');
  image.complete = true;
  image.naturalWidth = 1254;
  image.onload();
  assert.equal(ready, 1);
  images[1].complete = true;
  images[1].naturalWidth = 1280;
  images[1].onload();
  assert.equal(ready, 2);
  calls.length = 0;
  renderer.render(ctx, pose, drawFace);
  assert.equal(faces, 1);
  assert.equal(calls.filter(c => c[0] === 'drawImage').length, 1);
  assert.equal(calls[0][0], 'save');
  assert.equal(calls.at(-1)[0], 'restore');
  const hands = [{ side: 'left', x: 80, y: 350, squash: 0 }];
  calls.length = 0;
  renderer.renderSleeves(ctx, pose, hands, 0, 'lower');
  assert.equal(calls.filter(c => c[0] === 'stroke').length, 1, 'one continuous sleeve outline');
  assert.ok(calls.some(c => c[0] === 'drawImage' && c[1] === images[1]));
  assert.ok(calls.some(c => c[0] === 'scale' && c[1] === -1), 'left mitten is mirrored');
  calls.length = 0;
  renderer.renderSleeves(ctx, pose, hands, 1, 'lower');
  assert.equal(calls.filter(c => c[0] === 'stroke').length, 1, 'raised arm keeps a continuous outline');
  assert.ok(calls.some(c => c[0] === 'drawImage' && c[1] === images[1]));
  renderer.release();
  assert.equal(image.onload, null);
  assert.equal(image.onerror, null);
  assert.equal(image.src, '');
  assert.equal(images[1].src, '');
  assert.equal(images[1].onload, null);
  renderer.prepare();
  assert.notEqual(image, originalImage, 'can switch away and back');
  renderer.release();
});
