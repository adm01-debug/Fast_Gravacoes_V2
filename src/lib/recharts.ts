// Centralized Recharts entrypoint.
//
// Production builds previously split Recharts' ESM graph across route/vendor
// chunks, which exposed a TDZ/circular-initialization bug in minified output
// (`Cannot access 'A' before initialization`). Importing Recharts' CommonJS
// bundle here creates one stable boundary and avoids the broken ESM inter-chunk
// initialization order seen in production previews.
import * as Recharts from 'recharts/lib';
import type { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';
import type { LegendProps } from 'recharts';

export const Area = Recharts.Area;
export const AreaChart = Recharts.AreaChart;
export const Bar = Recharts.Bar;
export const BarChart = Recharts.BarChart;
export const CartesianGrid = Recharts.CartesianGrid;
export const Cell = Recharts.Cell;
export const ComposedChart = Recharts.ComposedChart;
export const Legend = Recharts.Legend;
export const Line = Recharts.Line;
export const LineChart = Recharts.LineChart;
export const Pie = Recharts.Pie;
export const PieChart = Recharts.PieChart;
export const PolarAngleAxis = Recharts.PolarAngleAxis;
export const PolarGrid = Recharts.PolarGrid;
export const PolarRadiusAxis = Recharts.PolarRadiusAxis;
export const Radar = Recharts.Radar;
export const RadarChart = Recharts.RadarChart;
export const ReferenceLine = Recharts.ReferenceLine;
export const ResponsiveContainer = Recharts.ResponsiveContainer;
export const Tooltip = Recharts.Tooltip;
export const XAxis = Recharts.XAxis;
export const YAxis = Recharts.YAxis;

export type { LegendProps, NameType, ValueType };
export type TooltipProps<TValue extends ValueType, TName extends NameType> =
  Recharts.TooltipProps<TValue, TName>;
