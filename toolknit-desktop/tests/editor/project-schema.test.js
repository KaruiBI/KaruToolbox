import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  KARUI_PROJECT_VERSION,
  createEmptyProject,
  parseProject,
  serializeProject,
  validateProject,
} from '../../src/features/editor/project-schema.js';

const fixtures = new URL('../fixtures/projects/', import.meta.url);

async function loadFixture(name) {
  return JSON.parse(await readFile(new URL(name, fixtures), 'utf8'));
}

test('createEmptyProject 生成可用的 v1 工程', () => {
  let id = 0;
  const ids = [
    '00000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000003',
    '00000000-0000-4000-8000-000000000004',
    '00000000-0000-4000-8000-000000000005',
  ];
  const project = createEmptyProject({
    name: '测试工程',
    now: '2026-09-23T00:00:00.000Z',
    idFactory: () => ids[id++],
  });
  const result = validateProject(project);
  assert.equal(result.valid, true, JSON.stringify(result.errors));
  assert.equal(project.schemaVersion, KARUI_PROJECT_VERSION);
  assert.equal(project.sequences[project.activeSequenceId].tracks.length, 3);
});

for (const name of ['empty-project.json', 'three-clips-project.json', 'subtitle-project.json']) {
  test(`fixture ${name} 通过校验`, async () => {
    const project = await loadFixture(name);
    const result = validateProject(project);
    assert.equal(result.valid, true, JSON.stringify(result.errors));
  });
}

test('损坏工程能返回路径化错误', async () => {
  const project = await loadFixture('invalid-project.json');
  const result = validateProject(project);
  assert.equal(result.valid, false);
  assert.ok(result.errors.length >= 5);
  assert.ok(result.errors.some((error) => error.path === 'activeSequenceId'));
  assert.ok(result.errors.some((error) => error.code === 'item.asset.missing'));
});

test('高版本工程默认拒绝，但可用于只读预检', async () => {
  const project = await loadFixture('empty-project.json');
  project.schemaVersion = KARUI_PROJECT_VERSION + 1;
  assert.equal(validateProject(project).valid, false);
  const result = validateProject(project, { allowFutureVersion: true });
  assert.equal(result.valid, true);
  assert.equal(result.warnings[0].code, 'schema.version.future');
});

test('序列引用不存在的素材会失败', async () => {
  const project = await loadFixture('three-clips-project.json');
  const sequence = project.sequences[project.activeSequenceId];
  sequence.tracks[0].items[0].assetId = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
  const result = validateProject(project);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((error) => error.code === 'item.asset.missing'));
});

test('序列化结果稳定并可往返解析', async () => {
  const source = await loadFixture('subtitle-project.json');
  const once = serializeProject(source);
  const parsed = parseProject(once);
  const twice = serializeProject(parsed);
  assert.equal(twice, once);
});

test('非法 JSON 返回专用解析错误', () => {
  assert.throws(
    () => parseProject('{ broken'),
    (error) => error.name === 'KaruiProjectParseError',
  );
});

