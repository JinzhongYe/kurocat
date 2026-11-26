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
const { StarDoctorRenderer } = await loadTs('../src/starDoctorRenderer.ts', s =>
  s.replace("import doctorUrl from './assets/star-doctor-body.png';", "const doctorUrl = 'star-doctor-body.png';"));

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

test('renderer loads once, draws the body and shared face, and releases its image', t => {
  const previousImage = globalThis.Image;
  let image;
  globalThis.Image = class {
    complete = false;
    naturalWidth = 0;
    constructor() { image = this; }
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
  const originalImage = image;
  renderer.prepare();
  assert.equal(image, originalImage);
  renderer.render(ctx, pose, drawFace);
  assert.equal(calls.length, 0, 'never draw an unloaded image');
  image.complete = true;
  image.naturalWidth = 1254;
  image.onload();
  assert.equal(ready, 1);
  calls.length = 0;
  renderer.render(ctx, pose, drawFace);
  assert.equal(faces, 1);
  assert.equal(calls.filter(c => c[0] === 'drawImage').length, 1);
  assert.equal(calls[0][0], 'save');
  assert.equal(calls.at(-1)[0], 'restore');
  renderer.release();
  assert.equal(image.onload, null);
  assert.equal(image.onerror, null);
  assert.equal(image.src, '');
  renderer.prepare();
  assert.notEqual(image, originalImage, 'can switch away and back');
  renderer.release();
});
