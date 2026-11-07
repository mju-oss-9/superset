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
import { ChartProps, getNumberFormatter } from '@superset-ui/core';
import { supersetTheme } from '@apache-superset/core/theme';
import {
  EchartsTreemapChartProps,
  EchartsTreemapColorConvention,
  EchartsTreemapLabelType,
} from '../../src/Treemap/types';
import transformProps, {
  formatLabel,
  formatLabelTemplate,
} from '../../src/Treemap/transformProps';
import { NEUTRAL_COLOR, getDivergingColor } from '../../src/Treemap/colorUtils';

describe('Treemap transformProps', () => {
  const formData = {
    colorScheme: 'bnbColors',
    datasource: '3__table',
    granularity_sqla: 'ds',
    metric: 'sum__num',
    groupby: ['foo', 'bar'],
  };
  const chartProps = new ChartProps({
    formData,
    width: 800,
    height: 600,
    queriesData: [
      {
        data: [
          { foo: 'Sylvester', bar: 'bar1', sum__num: 10 },
          { foo: 'Arnold', bar: 'bar2', sum__num: 2.5 },
        ],
      },
    ],
    theme: supersetTheme,
  });

  test('should transform chart props for viz', () => {
    expect(transformProps(chartProps as EchartsTreemapChartProps)).toEqual(
      expect.objectContaining({
        width: 800,
        height: 600,
        echartOptions: expect.objectContaining({
          series: [
            expect.objectContaining({
              data: expect.arrayContaining([
                expect.objectContaining({
                  name: 'sum__num',
                  children: expect.arrayContaining([
                    expect.objectContaining({
                      name: 'Sylvester',
                      children: expect.arrayContaining([
                        expect.objectContaining({
                          name: 'bar1',
                          value: 10,
                        }),
                      ]),
                    }),
                  ]),
                }),
              ]),
            }),
          ],
        }),
      }),
    );
  });
});

describe('Treemap transformProps with color metric', () => {
  const baseFormData = {
    colorScheme: 'bnbColors',
    datasource: '3__table',
    granularity_sqla: 'ds',
    metric: 'market_cap',
    groupby: ['sector', 'ticker'],
  };
  const data = [
    { sector: 'Tech', ticker: 'AAA', market_cap: 100, change_pct: 5 },
    { sector: 'Tech', ticker: 'BBB', market_cap: 50, change_pct: -5 },
    { sector: 'Bank', ticker: 'CCC', market_cap: 30, change_pct: 0 },
    { sector: 'Bank', ticker: 'DDD', market_cap: 20, change_pct: 2.5 },
  ];
  const getProps = (formData: Record<string, unknown>) =>
    new ChartProps({
      formData: { ...baseFormData, ...formData },
      width: 800,
      height: 600,
      queriesData: [{ data }],
      theme: supersetTheme,
    }) as EchartsTreemapChartProps;

  const getLeaves = (result: ReturnType<typeof transformProps>) => {
    const [series] = result.echartOptions.series as any[];
    const [root] = series.data;
    const leaves: Record<string, any> = {};
    root.children.forEach((group: any) =>
      group.children.forEach((leaf: any) => {
        leaves[leaf.name] = leaf;
      }),
    );
    return { series, root, leaves };
  };

  test('keeps categorical colors when no color metric is set', () => {
    const result = transformProps(getProps({}));
    const { leaves, series } = getLeaves(result);
    expect(leaves.AAA.secondaryValue).toBeUndefined();
    expect(leaves.AAA.colorSaturation).toBeDefined();
    expect(leaves.AAA.itemStyle.color).not.toBe(
      getDivergingColor(5, 5, EchartsTreemapColorConvention.Kr),
    );
    expect(series.height).toBe('100%');
    expect(result.echartOptions.graphic).toBeUndefined();
  });

  test('colors leaves by the color metric (kr by default)', () => {
    const result = transformProps(getProps({ secondary_metric: 'change_pct' }));
    const { leaves, root } = getLeaves(result);
    const kr = EchartsTreemapColorConvention.Kr;
    expect(leaves.AAA.itemStyle.color).toBe('#d7301f');
    expect(leaves.BBB.itemStyle.color).toBe('#2166ac');
    expect(leaves.CCC.itemStyle.color).toBe(NEUTRAL_COLOR);
    expect(leaves.DDD.itemStyle.color).toBe(getDivergingColor(2.5, 5, kr));
    expect(leaves.AAA.secondaryValue).toBe(5);
    expect(leaves.AAA.value).toBe(100);
    // groups get a neutral background
    root.children.forEach((group: any) =>
      expect(group.itemStyle.color).toBe(NEUTRAL_COLOR),
    );
    expect(result.echartOptions.graphic).toBeDefined();
  });

  test('applies color range and us convention', () => {
    const result = transformProps(
      getProps({
        secondary_metric: 'change_pct',
        color_range: 2.5,
        color_convention: 'us',
      }),
    );
    const { leaves } = getLeaves(result);
    expect(leaves.AAA.itemStyle.color).toBe('#1a9850');
    expect(leaves.BBB.itemStyle.color).toBe('#d7301f');
    // 2.5 is now the full range
    expect(leaves.DDD.itemStyle.color).toBe('#1a9850');
  });

  test('shows the color metric in the tooltip of a leaf', () => {
    const result = transformProps(getProps({ secondary_metric: 'change_pct' }));
    const { leaves } = getLeaves(result);
    const html = (result.echartOptions.tooltip as any).formatter({
      name: 'AAA',
      value: 100,
      data: leaves.AAA,
      treePathInfo: [
        { name: 'market_cap', value: 200 },
        { name: 'Tech', value: 150 },
        { name: 'AAA', value: 100 },
      ],
    });
    expect(html).toContain('change_pct');
  });
});

describe('Treemap formatLabel template', () => {
  const numberFormatter = getNumberFormatter('SMART_NUMBER');

  test('fills {name}, {size}, {color} and new lines', () => {
    const label = formatLabel({
      params: {
        name: 'AAA',
        value: 1000,
        data: { secondaryValue: 2.5 },
      } as any,
      labelType: EchartsTreemapLabelType.Template,
      labelTemplate: '{name}\\n{size} / {color}',
      numberFormatter,
    });
    expect(label).toBe('AAA\n1k / 2.5');
  });

  test('empty {color} when there is no color metric value', () => {
    expect(
      formatLabelTemplate('{name} {color}', {
        name: 'AAA',
        size: '1k',
        color: '',
      }),
    ).toBe('AAA ');
  });

  test('falls back to the name when the template is empty', () => {
    const label = formatLabel({
      params: { name: 'AAA', value: 1 } as any,
      labelType: EchartsTreemapLabelType.Template,
      labelTemplate: '',
      numberFormatter,
    });
    expect(label).toBe('AAA');
  });
});
