import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildJevPrompt } from '../server/services/jevService.js';

test('buildJevPrompt formats clear lanes when no obstacles ahead', () => {
  const result = buildJevPrompt({ playerLane: 1, speed: 4, obstacles: [] });
  assert.ok(result.stateSummary.includes('Lane 0: CLEAR'));
  assert.ok(result.stateSummary.includes('Lane 1: CLEAR'));
  assert.ok(result.stateSummary.includes('Lane 2: CLEAR'));
  assert.equal(result.laneDistance[0], Infinity);
  assert.equal(result.laneDistance[1], Infinity);
  assert.equal(result.laneDistance[2], Infinity);
});

test('buildJevPrompt identifies critical danger when obstacle is < 180px away', () => {
  const obstacles = [
    { lane: 1, distance: 120 }
  ];
  const result = buildJevPrompt({ playerLane: 1, speed: 5, obstacles });
  assert.ok(result.stateSummary.includes('Lane 1: CRITICAL DANGER! Obstacle is 120px away!'));
  assert.equal(result.laneDistance[1], 120);
});

test('buildJevPrompt restricts steering choices to stay and right when in Lane 0', () => {
  const result = buildJevPrompt({ playerLane: 0 });
  assert.ok(result.criteria.stay, 'Lane 0 must have stay option');
  assert.ok(result.criteria.right, 'Lane 0 must have right option');
  assert.equal(result.criteria.left, undefined, 'Lane 0 cannot steer left');
});

test('buildJevPrompt restricts steering choices to left and stay when in Lane 2', () => {
  const result = buildJevPrompt({ playerLane: 2 });
  assert.ok(result.criteria.left, 'Lane 2 must have left option');
  assert.ok(result.criteria.stay, 'Lane 2 must have stay option');
  assert.equal(result.criteria.right, undefined, 'Lane 2 cannot steer right');
});

test('buildJevPrompt provides left, stay, and right options when in Lane 1', () => {
  const result = buildJevPrompt({ playerLane: 1 });
  assert.ok(result.criteria.left, 'Lane 1 must have left option');
  assert.ok(result.criteria.stay, 'Lane 1 must have stay option');
  assert.ok(result.criteria.right, 'Lane 1 must have right option');
});
