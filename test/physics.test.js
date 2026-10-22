import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rectsOverlap, checkCollisions } from '../public/js/engine/physics.js';
import { PLAYER_Y, PLAYER_HEIGHT, PLAYER_WIDTH, OBSTACLE_WIDTH, OBSTACLE_HEIGHT, laneCenterX } from '../public/js/config/constants.js';

test('rectsOverlap returns true for overlapping boxes', () => {
  const overlap = rectsOverlap(10, 10, 50, 50, 30, 30, 50, 50);
  assert.equal(overlap, true);
});

test('rectsOverlap returns false for non-overlapping boxes', () => {
  const overlap = rectsOverlap(0, 0, 20, 20, 100, 100, 20, 20);
  assert.equal(overlap, false);
});

test('rectsOverlap returns false when edge-to-edge (no volume overlap)', () => {
  const overlap = rectsOverlap(0, 0, 10, 10, 10, 0, 10, 10);
  assert.equal(overlap, false);
});

test('checkCollisions detects collision when obstacle occupies player coordinates', () => {
  const obstacles = [
    { lane: 1, y: PLAYER_Y }
  ];
  const collision = checkCollisions(1, obstacles);
  assert.equal(collision, true);
});

test('checkCollisions returns false when obstacle is in a different lane', () => {
  const obstacles = [
    { lane: 0, y: PLAYER_Y }
  ];
  const collision = checkCollisions(1, obstacles);
  assert.equal(collision, false);
});

test('checkCollisions returns false when obstacle in same lane is far ahead', () => {
  const obstacles = [
    { lane: 1, y: 100 }
  ];
  const collision = checkCollisions(1, obstacles);
  assert.equal(collision, false);
});
