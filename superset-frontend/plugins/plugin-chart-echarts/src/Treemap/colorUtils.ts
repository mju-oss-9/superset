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
import { EchartsTreemapColorConvention } from './types';

/** Color used for a value of exactly 0 and for parent (group) nodes. */
export const NEUTRAL_COLOR = '#8c8c8c';
const RED = '#d7301f';
const BLUE = '#2166ac';
const GREEN = '#1a9850';

export const DEFAULT_COLOR_RANGE = 5;

/**
 * Colors for increase / decrease, per convention.
 * - kr: increase red, decrease blue (Korean stock market style)
 * - us: increase green, decrease red (US stock market style)
 */
export function getConventionColors(
  convention: EchartsTreemapColorConvention = EchartsTreemapColorConvention.Kr,
): { increase: string; decrease: string } {
  return convention === EchartsTreemapColorConvention.Us
    ? { increase: GREEN, decrease: RED }
    : { increase: RED, decrease: BLUE };
}

function hexToRgb(hex: string): [number, number, number] {
  const value = parseInt(hex.slice(1), 16);
  // eslint-disable-next-line no-bitwise
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function rgbToHex([r, g, b]: [number, number, number]): string {
  return `#${[r, g, b]
    .map(c => Math.round(c).toString(16).padStart(2, '0'))
    .join('')}`;
}

function mix(from: string, to: string, ratio: number): string {
  const a = hexToRgb(from);
  const b = hexToRgb(to);
  return rgbToHex([
    a[0] + (b[0] - a[0]) * ratio,
    a[1] + (b[1] - a[1]) * ratio,
    a[2] + (b[2] - a[2]) * ratio,
  ]);
}

/**
 * Returns a normalized color range: a positive finite number,
 * falling back to DEFAULT_COLOR_RANGE for invalid input.
 */
export function normalizeColorRange(range: unknown): number {
  const parsed = typeof range === 'string' ? parseFloat(range) : range;
  return typeof parsed === 'number' && Number.isFinite(parsed) && parsed > 0
    ? parsed
    : DEFAULT_COLOR_RANGE;
}

/**
 * Diverging color centered at 0.
 * - value 0 (or not a number) -> neutral gray
 * - |value| / range decides how close the color gets to the
 *   increase / decrease color
 * - |value| >= range -> the darkest color (clamped)
 */
export function getDivergingColor(
  value: number | null | undefined,
  range: number,
  convention: EchartsTreemapColorConvention = EchartsTreemapColorConvention.Kr,
): string {
  if (typeof value !== 'number' || !Number.isFinite(value) || value === 0) {
    return NEUTRAL_COLOR;
  }
  const { increase, decrease } = getConventionColors(convention);
  const ratio = Math.min(Math.abs(value) / normalizeColorRange(range), 1);
  return mix(NEUTRAL_COLOR, value > 0 ? increase : decrease, ratio);
}
