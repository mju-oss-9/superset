/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import {
  DEFAULT_COLOR_RANGE,
  NEUTRAL_COLOR,
  formatSigned,
  getConventionColors,
  getDivergingColor,
  normalizeColorRange,
} from '../../src/Treemap/colorUtils';
import { EchartsTreemapColorConvention } from '../../src/Treemap/types';

const { Kr, Us } = EchartsTreemapColorConvention;

describe('Treemap getDivergingColor', () => {
  test('returns the neutral color for 0 and non-numbers', () => {
    expect(getDivergingColor(0, 5, Kr)).toBe(NEUTRAL_COLOR);
    expect(getDivergingColor(null, 5, Kr)).toBe(NEUTRAL_COLOR);
    expect(getDivergingColor(undefined, 5, Kr)).toBe(NEUTRAL_COLOR);
    expect(getDivergingColor(NaN, 5, Kr)).toBe(NEUTRAL_COLOR);
  });

  test('kr: increase red, decrease blue at full range', () => {
    const { increase, decrease } = getConventionColors(Kr);
    expect(getDivergingColor(5, 5, Kr)).toBe(increase);
    expect(getDivergingColor(-5, 5, Kr)).toBe(decrease);
    expect(increase).toBe('#d63c3c');
    expect(decrease).toBe('#2b62c4');
  });

  test('us: increase green, decrease red at full range', () => {
    const { increase, decrease } = getConventionColors(Us);
    expect(getDivergingColor(5, 5, Us)).toBe(increase);
    expect(getDivergingColor(-5, 5, Us)).toBe(decrease);
    expect(increase).toBe('#30aa5a');
    expect(decrease).toBe('#de3c40');
  });

  test('clamps values beyond the range to the darkest color', () => {
    expect(getDivergingColor(30, 5, Kr)).toBe(getDivergingColor(5, 5, Kr));
    expect(getDivergingColor(-30, 5, Kr)).toBe(getDivergingColor(-5, 5, Kr));
  });

  test('values inside the range are between neutral and full color', () => {
    const half = getDivergingColor(2.5, 5, Kr);
    expect(half).not.toBe(NEUTRAL_COLOR);
    expect(half).not.toBe(getDivergingColor(5, 5, Kr));
    // halfway between #4c545e and #d63c3c
    expect(half).toBe('#91484d');
  });
});

describe('Treemap formatSigned', () => {
  const fmt = (v: number) => v.toFixed(1);
  test('adds + only to positive values', () => {
    expect(formatSigned(fmt, 2.1)).toBe('+2.1');
    expect(formatSigned(fmt, -2.1)).toBe('-2.1');
    expect(formatSigned(fmt, 0)).toBe('0.0');
  });
});

describe('Treemap normalizeColorRange', () => {
  test('accepts positive numbers and numeric strings', () => {
    expect(normalizeColorRange(3)).toBe(3);
    expect(normalizeColorRange('0.5')).toBe(0.5);
  });

  test('falls back to the default for invalid input', () => {
    expect(normalizeColorRange(0)).toBe(DEFAULT_COLOR_RANGE);
    expect(normalizeColorRange(-2)).toBe(DEFAULT_COLOR_RANGE);
    expect(normalizeColorRange('abc')).toBe(DEFAULT_COLOR_RANGE);
    expect(normalizeColorRange(undefined)).toBe(DEFAULT_COLOR_RANGE);
  });
});
