import isString from 'lodash/isString';
import { alignmentPeriods } from './constants';
import StackdriverDatasource from './datasource';
import { MetricFindQueryTypes, VariableQueryData } from './types';
import {
  getMetricTypesByService,
  getAlignmentOptionsByMetric,
  getAggregationOptionsByMetric,
  extractServicesFromMetricDescriptors,
  getLabelKeys,
} from './functions';

export default class StackdriverMetricFindQuery {
  constructor(private datasource: StackdriverDatasource) {}

  async execute(query: VariableQueryData) {
    try {
      switch (query.selectedQueryType) {
        case MetricFindQueryTypes.Projects:
          return this.handleProjectsQuery();
        case MetricFindQueryTypes.Services:
          return this.handleServiceQuery(query);
        case MetricFindQueryTypes.MetricTypes:
          return this.handleMetricTypesQuery(query);
        case MetricFindQueryTypes.LabelKeys:
          return this.handleLabelKeysQuery(query);
        case MetricFindQueryTypes.LabelValues:
          return this.handleLabelValuesQuery(query);
        case MetricFindQueryTypes.ResourceTypes:
          return this.handleResourceTypeQuery(query);
        case MetricFindQueryTypes.Aligners:
          return this.handleAlignersQuery(query);
        case MetricFindQueryTypes.AlignmentPeriods:
          return this.handleAlignmentPeriodQuery();
        case MetricFindQueryTypes.Aggregations:
          return this.handleAggregationQuery(query);
        default:
          return [];
      }
    } catch (error) {
      console.error(`Could not run StackdriverMetricFindQuery ${query}`, error);
      return [];
    }
  }

  async handleProjectsQuery() {
    const projects = await this.datasource.getProjects();
    return projects.map((s: any) => ({
      text: s.label,
      value: s.value,
      expandable: true,
    }));
  }

  async handleServiceQuery({ defaultProject }: VariableQueryData) {
    const metricDescriptors = await this.datasource.getMetricTypes(defaultProject);
    const services: any[] = extractServicesFromMetricDescriptors(metricDescriptors);
    return services.map(s => ({
      text: s.serviceShortName,
      value: s.service,
      expandable: true,
    }));
  }

  async handleMetricTypesQuery({ selectedService, defaultProject }: VariableQueryData) {
    if (!selectedService) {
      return [];
    }
    const metricDescriptors = await this.datasource.getMetricTypes(defaultProject);
    return getMetricTypesByService(metricDescriptors, this.datasource.templateSrv.replace(selectedService)).map(
      (s: any) => ({
        text: s.displayName,
        value: s.type,
        expandable: true,
      })
    );
  }

  async handleLabelKeysQuery({ selectedMetricType, defaultProject }: VariableQueryData) {
    if (!selectedMetricType) {
      return [];
    }
    const labelKeys = await getLabelKeys(this.datasource, selectedMetricType, defaultProject);
    return labelKeys.map(this.toFindQueryResult);
  }

  async handleLabelValuesQuery({ selectedMetricType, labelKey, defaultProject }: VariableQueryData) {
    if (!selectedMetricType) {
      return [];
    }
    const refId = 'handleLabelValuesQuery';
    const labels = await this.datasource.getLabels(selectedMetricType, refId, defaultProject, [labelKey]);
    const interpolatedKey = this.datasource.templateSrv.replace(labelKey);
    const values = labels.hasOwnProperty(interpolatedKey) ? labels[interpolatedKey] : [];
    return values.map(this.toFindQueryResult);
  }

  async handleResourceTypeQuery({ selectedMetricType }: VariableQueryData) {
    if (!selectedMetricType) {
      return [];
    }
    const refId = 'handleResourceTypeQueryQueryType';
    const labels = await this.datasource.getLabels(selectedMetricType, refId);
    return labels['resource.type'].map(this.toFindQueryResult);
  }

  async handleAlignersQuery({ selectedMetricType, defaultProject }: VariableQueryData) {
    if (!selectedMetricType) {
      return [];
    }
    const metricDescriptors = await this.datasource.getMetricTypes(defaultProject);
    const { valueType, metricKind } = metricDescriptors.find(
      (m: any) => m.type === this.datasource.templateSrv.replace(selectedMetricType)
    );
    return getAlignmentOptionsByMetric(valueType, metricKind).map(this.toFindQueryResult);
  }

  async handleAggregationQuery({ selectedMetricType, defaultProject }: VariableQueryData) {
    if (!selectedMetricType) {
      return [];
    }
    const metricDescriptors = await this.datasource.getMetricTypes(defaultProject);
    const { valueType, metricKind } = metricDescriptors.find(
      (m: any) => m.type === this.datasource.templateSrv.replace(selectedMetricType)
    );
    return getAggregationOptionsByMetric(valueType, metricKind).map(this.toFindQueryResult);
  }

  handleAlignmentPeriodQuery() {
    return alignmentPeriods.map(this.toFindQueryResult);
  }

  toFindQueryResult(x: any) {
    return isString(x) ? { text: x, expandable: true } : { ...x, expandable: true };
  }
}
