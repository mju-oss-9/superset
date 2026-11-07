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
  CategoricalColorNamespace,
  getColumnLabel,
  getMetricLabel,
  getNumberFormatter,
  getTimeFormatter,
  NumberFormats,
  ValueFormatter,
  getValueFormatter,
  tooltipHtml,
} from '@superset-ui/core';
import type { TreemapSeriesNodeItemOption } from 'echarts/types/src/chart/treemap/TreemapSeries';
import type { EChartsCoreOption } from 'echarts/core';
import type { TreemapSeriesOption } from 'echarts/charts';
import {
  DEFAULT_FORM_DATA as DEFAULT_TREEMAP_FORM_DATA,
  EchartsTreemapChartProps,
  EchartsTreemapColorConvention,
  EchartsTreemapFormData,
  EchartsTreemapLabelType,
  TreemapSeriesCallbackDataParams,
  TreemapTransformedProps,
} from './types';
import { formatSeriesName, getColtypesMapping } from '../utils/series';
import {
  COLOR_SATURATION,
  BORDER_WIDTH,
  GAP_WIDTH,
  LABEL_FONTSIZE,
  extractTreePathInfo,
} from './constants';
import { OpacityEnum } from '../constants';
import { getDefaultTooltip } from '../utils/tooltip';
import { Refs } from '../types';
import { treeBuilder, TreeNode } from '../utils/treeBuilder';
import {
  NEUTRAL_COLOR,
  getConventionColors,
  getDivergingColor,
  normalizeColorRange,
} from './colorUtils';

/** Height reserved under the treemap for the color legend. */
const COLOR_LEGEND_HEIGHT = 24;

/**
 * Treemap node with the value of the color metric attached, so that the
 * label and tooltip formatters can read it back from `params.data`.
 */
type TreemapNodeItem = TreemapSeriesNodeItemOption & {
  secondaryValue?: number;
};

function getColorValue(
  params: TreemapSeriesCallbackDataParams,
): number | undefined {
  const data = params.data as TreemapNodeItem | undefined;
  return typeof data?.secondaryValue === 'number'
    ? data.secondaryValue
    : undefined;
}

/**
 * Fills a label template.
 * Variables: {name} (cell name), {size} (size metric), {color} (color
 * metric, empty when there is none). `\n` means a new line.
 */
export function formatLabelTemplate(
  template: string,
  values: { name: string; size: string; color: string },
): string {
  const items: Record<string, string> = {
    '{name}': values.name,
    '{size}': values.size,
    '{color}': values.color,
    '\\n': '\n',
  };
  return Object.entries(items).reduce(
    (acc, [key, value]) => acc.replaceAll(key, value),
    template,
  );
}

export function formatLabel({
  params,
  labelType,
  numberFormatter,
  labelTemplate,
  colorFormatter,
}: {
  params: TreemapSeriesCallbackDataParams;
  labelType: EchartsTreemapLabelType;
  numberFormatter: ValueFormatter;
  labelTemplate?: string | null;
  colorFormatter?: ValueFormatter;
}): string {
  const { name = '', value } = params;
  const formattedValue = numberFormatter(value as number);

  switch (labelType) {
    case EchartsTreemapLabelType.Key:
      return name;
    case EchartsTreemapLabelType.Value:
      return formattedValue;
    case EchartsTreemapLabelType.KeyValue:
      return `${name}: ${formattedValue}`;
    case EchartsTreemapLabelType.Template: {
      if (!labelTemplate) {
        return name;
      }
      const colorValue = getColorValue(params);
      return formatLabelTemplate(labelTemplate, {
        name,
        size: formattedValue,
        color:
          colorValue === undefined
            ? ''
            : (colorFormatter ?? numberFormatter)(colorValue),
      });
    }
    default:
      return name;
  }
}

export function formatTooltip({
  params,
  numberFormatter,
  colorMetricLabel,
  colorFormatter,
}: {
  params: TreemapSeriesCallbackDataParams;
  numberFormatter: ValueFormatter;
  colorMetricLabel?: string;
  colorFormatter?: ValueFormatter;
}): string {
  const { value, treePathInfo = [] } = params;
  const formattedValue = numberFormatter(value as number);
  const { metricLabel, treePath } = extractTreePathInfo(treePathInfo);
  const percentFormatter = getNumberFormatter(NumberFormats.PERCENT_2_POINT);

  let formattedPercent = '';
  // the last item is current node, here we should find the parent node
  const currentNode = treePathInfo[treePathInfo.length - 1];
  const parentNode = treePathInfo[treePathInfo.length - 2];
  if (parentNode) {
    const percent: number = parentNode.value
      ? (currentNode.value as number) / (parentNode.value as number)
      : 0;
    formattedPercent = percentFormatter(percent);
  }
  const row = [metricLabel, formattedValue];
  if (formattedPercent) {
    row.push(formattedPercent);
  }
  const rows = [row];
  const colorValue = getColorValue(params);
  if (colorMetricLabel && colorValue !== undefined) {
    rows.push([
      colorMetricLabel,
      (colorFormatter ?? numberFormatter)(colorValue),
    ]);
  }
  return tooltipHtml(rows, treePath.join(' ▸ '));
}

export default function transformProps(
  chartProps: EchartsTreemapChartProps,
): TreemapTransformedProps {
  const {
    formData,
    height,
    queriesData,
    width,
    hooks,
    filterState,
    theme,
    inContextMenu,
    emitCrossFilters,
    datasource,
  } = chartProps;
  const { data = [], detected_currency: detectedCurrency } = queriesData[0];
  const {
    columnFormats = {},
    currencyFormats = {},
    currencyCodeColumn,
  } = datasource;
  const { setDataMask = () => {}, onContextMenu } = hooks;
  const coltypeMapping = getColtypesMapping(queriesData[0]);
  const BORDER_COLOR = theme.colorBgBase;

  const {
    colorScheme,
    groupby = [],
    metric = '',
    labelType,
    labelPosition,
    numberFormat,
    currencyFormat,
    dateFormat,
    showLabels,
    showUpperLabels,
    dashboardId,
    sliceId,
    secondaryMetric,
    colorRange,
    colorConvention = EchartsTreemapColorConvention.Kr,
    labelTemplate,
  }: EchartsTreemapFormData = {
    ...DEFAULT_TREEMAP_FORM_DATA,
    ...formData,
  };
  const refs: Refs = {};
  const colorFn = CategoricalColorNamespace.getScale(colorScheme as string);
  const numberFormatter = getValueFormatter(
    metric,
    currencyFormats,
    columnFormats,
    numberFormat,
    currencyFormat,
    undefined,
    data,
    currencyCodeColumn,
    detectedCurrency,
  );

  // Color metric: when set, leaf color follows its value (diverging around 0)
  // instead of the categorical color of its name.
  const useColorMetric = Boolean(secondaryMetric);
  const colorMetricLabel = secondaryMetric
    ? getMetricLabel(secondaryMetric)
    : undefined;
  const range = normalizeColorRange(colorRange);
  const colorFormatter = getNumberFormatter(numberFormat);

  const formatter = (params: TreemapSeriesCallbackDataParams) =>
    formatLabel({
      params,
      numberFormatter,
      labelType,
      labelTemplate,
      colorFormatter,
    });

  const columnsLabelMap = new Map<string, string[]>();
  const metricLabel = getMetricLabel(metric);
  const groupbyLabels = groupby.map(getColumnLabel);
  const treeData = treeBuilder(
    data,
    groupbyLabels,
    metricLabel,
    colorMetricLabel,
  );
  const labelProps = {
    color: theme.colorText,
  };
  const getNodeColor = (treeNode: TreeNode, name: string) => {
    if (!useColorMetric) {
      return colorFn(name, sliceId);
    }
    // Parent (group) cells get a neutral background so the leaf colors
    // stand out; their summed value has no meaning for ratio metrics.
    return treeNode.children?.length
      ? NEUTRAL_COLOR
      : getDivergingColor(treeNode.secondaryValue, range, colorConvention);
  };
  const traverse = (treeNodes: TreeNode[], path: string[]): TreemapNodeItem[] =>
    treeNodes.map(treeNode => {
      const { name: nodeName, value, groupBy } = treeNode;
      const name = formatSeriesName(nodeName, {
        timeFormatter: getTimeFormatter(dateFormat),
        ...(coltypeMapping[groupBy] && {
          coltype: coltypeMapping[groupBy],
        }),
      });
      const newPath = path.concat(name);
      let item: TreemapNodeItem = {
        name,
        value,
        // colorSaturation would shift the value-based colors, so it is only
        // used with categorical colors.
        ...(!useColorMetric && { colorSaturation: COLOR_SATURATION }),
        itemStyle: {
          borderColor: BORDER_COLOR,
          color: getNodeColor(treeNode, name),
          borderWidth: BORDER_WIDTH,
          gapWidth: GAP_WIDTH,
        },
        ...(useColorMetric &&
          !treeNode.children?.length && {
            secondaryValue: treeNode.secondaryValue,
          }),
      };
      if (treeNode.children?.length) {
        item = {
          ...item,
          children: traverse(treeNode.children, newPath),
        };
      } else {
        const joinedName = newPath.join(',');
        // map(joined_name: [columnLabel_1, columnLabel_2, ...])
        columnsLabelMap.set(joinedName, newPath);
        if (
          filterState.selectedValues &&
          !filterState.selectedValues.includes(joinedName)
        ) {
          item = {
            ...item,
            itemStyle: {
              colorAlpha: OpacityEnum.SemiTransparent,
              color: theme.colorText,
              borderColor: theme.colorBgBase,
              borderWidth: 2,
            },
            label: {
              ...labelProps,
            },
          };
        }
      }
      return item;
    });

  const transformedData: TreemapSeriesNodeItemOption[] = [
    {
      name: metricLabel,
      ...(!useColorMetric && { colorSaturation: COLOR_SATURATION }),
      itemStyle: {
        borderColor: BORDER_COLOR,
        color: useColorMetric
          ? NEUTRAL_COLOR
          : colorFn(`${metricLabel}`, sliceId),
        borderWidth: BORDER_WIDTH,
        gapWidth: GAP_WIDTH,
      },
      upperLabel: {
        show: false,
      },
      children: traverse(treeData, []),
    },
  ];

  // set a default color when metric values are 0 over all.
  const levels = [
    {
      upperLabel: {
        show: false,
      },
      label: {
        show: false,
      },
      itemStyle: {
        color: theme.colorPrimary,
      },
    },
  ];

  const series: TreemapSeriesOption[] = [
    {
      type: 'treemap',
      width: '100%',
      // leave room for the color legend at the bottom
      ...(useColorMetric
        ? { top: 0, bottom: COLOR_LEGEND_HEIGHT }
        : { height: '100%' }),
      nodeClick: undefined,
      roam: !dashboardId,
      breadcrumb: {
        show: false,
        emptyItemWidth: 25,
      },
      emphasis: {
        label: {
          ...labelProps,
          show: true,
        },
      },
      levels,
      label: {
        ...labelProps,
        show: showLabels,
        position: labelPosition,
        formatter,
        fontSize: LABEL_FONTSIZE,
      },
      upperLabel: {
        ...labelProps,
        show: showUpperLabels,
        formatter,
        textBorderColor: 'transparent',
        fontSize: LABEL_FONTSIZE,
      },
      data: transformedData,
    },
  ];

  // Color legend: decrease color -> neutral -> increase color, with the
  // color range as end labels.
  const { increase, decrease } = getConventionColors(colorConvention);
  const legendLabelStyle = {
    fill: theme.colorText,
    fontSize: LABEL_FONTSIZE,
    verticalAlign: 'middle',
  };
  const graphic = useColorMetric
    ? [
        {
          type: 'group',
          right: 8,
          bottom: 4,
          children: [
            {
              type: 'text',
              x: 0,
              y: 8,
              style: {
                ...legendLabelStyle,
                text: `${colorMetricLabel}  ${colorFormatter(-range)}`,
                align: 'right',
              },
            },
            {
              type: 'rect',
              x: 6,
              y: 3,
              shape: { width: 120, height: 10 },
              style: {
                fill: {
                  type: 'linear',
                  x: 0,
                  y: 0,
                  x2: 1,
                  y2: 0,
                  colorStops: [
                    { offset: 0, color: decrease },
                    { offset: 0.5, color: NEUTRAL_COLOR },
                    { offset: 1, color: increase },
                  ],
                },
              },
            },
            {
              type: 'text',
              x: 132,
              y: 8,
              style: {
                ...legendLabelStyle,
                text: `+${colorFormatter(range)}`,
                align: 'left',
              },
            },
          ],
        },
      ]
    : undefined;

  const echartOptions: EChartsCoreOption = {
    tooltip: {
      ...getDefaultTooltip(refs),
      show: !inContextMenu,
      trigger: 'item',
      formatter: (params: any) =>
        formatTooltip({
          params,
          numberFormatter,
          colorMetricLabel,
          colorFormatter,
        }),
    },
    series,
    ...(graphic && { graphic }),
  };
  return {
    formData,
    width,
    height,
    echartOptions,
    setDataMask,
    emitCrossFilters,
    labelMap: Object.fromEntries(columnsLabelMap),
    groupby,
    selectedValues: filterState.selectedValues || [],
    onContextMenu,
    refs,
    coltypeMapping,
  };
}
