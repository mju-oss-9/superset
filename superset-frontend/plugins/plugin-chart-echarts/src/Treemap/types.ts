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
  ChartDataResponseResult,
  ChartProps,
  QueryFormColumn,
  QueryFormData,
  QueryFormMetric,
} from '@superset-ui/core';
import type { CallbackDataParams } from 'echarts/types/src/util/types';
import {
  BaseTransformedProps,
  ContextMenuTransformedProps,
  CrossFilterTransformedProps,
  LabelPositionEnum,
  TreePathInfo,
} from '../types';

export type EchartsTreemapFormData = QueryFormData & {
  colorScheme?: string;
  groupby: QueryFormColumn[];
  metric?: QueryFormMetric;
  labelType: EchartsTreemapLabelType;
  labelPosition: LabelPositionEnum;
  showLabels: boolean;
  showUpperLabels: boolean;
  numberFormat: string;
  dateFormat: string;
  dashboardId?: number;
  /** Metric that decides cell color (size still comes from `metric`). */
  secondaryMetric?: QueryFormMetric | null;
  /** |value| at or above this gets the darkest color. Same unit as the metric. */
  colorRange?: number | string;
  colorConvention?: EchartsTreemapColorConvention;
  /** Used when labelType is Template. Variables: {name}, {size}, {color}. */
  labelTemplate?: string | null;
};

export enum EchartsTreemapLabelType {
  Key = 'key',
  Value = 'value',
  KeyValue = 'key_value',
  Template = 'template',
}

export enum EchartsTreemapColorConvention {
  /** increase red, decrease blue */
  Kr = 'kr',
  /** increase green, decrease red */
  Us = 'us',
}

export interface EchartsTreemapChartProps extends ChartProps<EchartsTreemapFormData> {
  formData: EchartsTreemapFormData;
  queriesData: ChartDataResponseResult[];
}

export const DEFAULT_FORM_DATA: Partial<EchartsTreemapFormData> = {
  groupby: [],
  labelType: EchartsTreemapLabelType.KeyValue,
  labelPosition: LabelPositionEnum.InsideTopLeft,
  numberFormat: 'SMART_NUMBER',
  showLabels: true,
  showUpperLabels: true,
  dateFormat: 'smart_date',
  secondaryMetric: null,
  colorRange: 5,
  colorConvention: EchartsTreemapColorConvention.Kr,
  labelTemplate: null,
};
export interface TreemapSeriesCallbackDataParams extends CallbackDataParams {
  treePathInfo?: TreePathInfo[];
}

export type TreemapTransformedProps =
  BaseTransformedProps<EchartsTreemapFormData> &
    ContextMenuTransformedProps &
    CrossFilterTransformedProps;
