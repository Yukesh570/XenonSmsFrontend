export type EntityGroupBy = "vendor" | "client" | "country" | "failure_reason" | "overview";

export type MetricType =
  | "dlr_percent"
  | "attempts"
  | "delivered"
  | "failed"
  | "rejected"
  | "profit_margin"
  | "margin_percent"
  | "revenue"
  | "vendor_cost";

export type VisualizationType = "table" | "bar" | "donut" | "kpi";

export type ConditionOperator = "none" | "lt" | "lte" | "gt" | "gte" | "eq";
export type ConditionMode = "filter" | "highlight";

export interface CustomWidgetCondition {
  metric: MetricType;
  operator: ConditionOperator;
  value: number;
  mode: ConditionMode; // "filter" shows only matching records; "highlight" flags them
}

export interface CustomWidgetFilters {
  client?: string;
  vendor?: string;
  country?: string;
  datePreset?: "today" | "yesterday" | "7d" | "30d" | "all";
  startDate?: string;
  endDate?: string;
}

export interface CustomWidgetDefinition {
  id: string;
  title: string;
  entity: EntityGroupBy;
  primaryMetric: MetricType;
  visualization: VisualizationType;
  size: "small" | "medium" | "large";
  filters: CustomWidgetFilters;
  condition?: CustomWidgetCondition;
  sortBy?: "metric_desc" | "metric_asc" | "attempts_desc" | "name_asc";
  limit?: number;
}

export interface WorkspaceTab {
  id: string;
  name: string;
  description?: string;
  widgets: CustomWidgetDefinition[];
}

export const METRIC_LABELS: Record<MetricType, string> = {
  dlr_percent: "Delivery Rate (DLR %)",
  attempts: "Total Attempts / Volume",
  delivered: "Delivered Messages",
  failed: "Failed Messages",
  rejected: "Rejected Messages",
  profit_margin: "Profit Margin ($)",
  margin_percent: "Margin %",
  revenue: "Revenue ($)",
  vendor_cost: "Vendor Cost ($)",
};

export const ENTITY_LABELS: Record<EntityGroupBy, string> = {
  vendor: "By Vendor (Trunk / Route)",
  client: "By Client (Account)",
  country: "By Country (Destination)",
  failure_reason: "By Failure Reason",
  overview: "Overall Summary (Single Aggregate)",
};

export const OPERATOR_LABELS: Record<ConditionOperator, string> = {
  none: "No Condition (Show All)",
  lt: "Less Than (<)",
  lte: "Less Than or Equal (<=)",
  gt: "Greater Than (>)",
  gte: "Greater Than or Equal (>=)",
  eq: "Equals (=)",
};

export const DEFAULT_WORKSPACE_TABS: WorkspaceTab[] = [
  {
    id: "tab-vendor-watch",
    name: "Vendor Quality Watchlist",
    description: "Custom monitor tracking low-performing vendor routes with DLR < 90%",
    widgets: [
      {
        id: "w-vendor-below-90",
        title: "Degraded Vendors — DLR < 90%",
        entity: "vendor",
        primaryMetric: "dlr_percent",
        visualization: "table",
        size: "medium",
        filters: { datePreset: "all" },
        condition: {
          metric: "dlr_percent",
          operator: "lt",
          value: 90,
          mode: "filter",
        },
        sortBy: "metric_asc",
        limit: 20,
      },
      {
        id: "w-vendor-dlr-bar",
        title: "Vendor Delivery Rate Ranking",
        entity: "vendor",
        primaryMetric: "dlr_percent",
        visualization: "bar",
        size: "medium",
        filters: { datePreset: "all" },
        condition: {
          metric: "dlr_percent",
          operator: "lt",
          value: 90,
          mode: "highlight",
        },
        sortBy: "metric_asc",
        limit: 10,
      },
      {
        id: "w-vendor-high-traffic",
        title: "Top Vendors by Volume & Deliverability",
        entity: "vendor",
        primaryMetric: "attempts",
        visualization: "table",
        size: "large",
        filters: { datePreset: "all" },
        sortBy: "attempts_desc",
        limit: 15,
      },
    ],
  },
  {
    id: "tab-client-margin",
    name: "Client Profitability & Margin",
    description: "Custom breakdown of clients, profit margins, and traffic volumes",
    widgets: [
      {
        id: "w-client-margin-table",
        title: "Client Margin Performance",
        entity: "client",
        primaryMetric: "profit_margin",
        visualization: "table",
        size: "medium",
        filters: { datePreset: "all" },
        sortBy: "metric_desc",
        limit: 15,
      },
      {
        id: "w-client-volume-bar",
        title: "Top Clients by Message Volume",
        entity: "client",
        primaryMetric: "attempts",
        visualization: "bar",
        size: "medium",
        filters: { datePreset: "all" },
        sortBy: "attempts_desc",
        limit: 10,
      },
      {
        id: "w-client-negative-margin",
        title: "Negative Margin Watchlist",
        entity: "client",
        primaryMetric: "profit_margin",
        visualization: "table",
        size: "large",
        filters: { datePreset: "all" },
        condition: {
          metric: "profit_margin",
          operator: "lt",
          value: 0,
          mode: "filter",
        },
        sortBy: "metric_asc",
        limit: 15,
      },
    ],
  },
  {
    id: "tab-troubleshooting",
    name: "Failures & Troubleshooting",
    description: "Deep dive into SMS failure reasons and destination failure spikes",
    widgets: [
      {
        id: "w-failures-donut",
        title: "Failure Reasons Breakdown",
        entity: "failure_reason",
        primaryMetric: "failed",
        visualization: "donut",
        size: "medium",
        filters: { datePreset: "all" },
        limit: 10,
      },
      {
        id: "w-failures-table",
        title: "Failure Code Details & Occurrences",
        entity: "failure_reason",
        primaryMetric: "failed",
        visualization: "table",
        size: "medium",
        filters: { datePreset: "all" },
        limit: 15,
      },
      {
        id: "w-country-failures-table",
        title: "Destinations with Highest Failures",
        entity: "country",
        primaryMetric: "failed",
        visualization: "table",
        size: "large",
        filters: { datePreset: "all" },
        condition: {
          metric: "failed",
          operator: "gt",
          value: 0,
          mode: "highlight",
        },
        sortBy: "metric_desc",
        limit: 20,
      },
    ],
  },
];
