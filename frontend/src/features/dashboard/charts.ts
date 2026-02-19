import { FeasibilitySnapshotResponse, TimeframeAnalyticsResponse } from "../../core/types.js";
import { renderWindRoseChart } from "../wind_rose.js";
import { renderCoreCharts } from "./chart_core.js";
import { renderTimeframeTrendChart } from "./chart_timeframe.js";

export class DashboardCharts {
  private windChart: any = null;
  private weatherChart: any = null;
  private roseChart: any = null;
  private timeframeTrendChart: any = null;

  constructor(
    private readonly windChartCanvas: HTMLCanvasElement,
    private readonly weatherChartCanvas: HTMLCanvasElement,
    private readonly roseChartCanvas: HTMLCanvasElement,
    private readonly timeframeTrendWrapEl: HTMLDivElement,
    private readonly timeframeTrendCanvas: HTMLCanvasElement,
  ) {}

  resetAll(): void {
    if (this.windChart) this.windChart.destroy();
    if (this.weatherChart) this.weatherChart.destroy();
    if (this.roseChart) this.roseChart.destroy();
    if (this.timeframeTrendChart) this.timeframeTrendChart.destroy();
    this.windChart = null;
    this.weatherChart = null;
    this.roseChart = null;
    this.timeframeTrendChart = null;
  }

  clearTimeframeTrend(): void {
    this.timeframeTrendWrapEl.classList.add("hidden");
    if (this.timeframeTrendChart) {
      this.timeframeTrendChart.destroy();
      this.timeframeTrendChart = null;
    }
  }

  renderCore(snapshot: FeasibilitySnapshotResponse): { hasSpeedData: boolean; hasWeatherData: boolean; hasDirectionData: boolean } {
    if (this.windChart) this.windChart.destroy();
    if (this.weatherChart) this.weatherChart.destroy();
    if (this.roseChart) this.roseChart.destroy();
    this.windChart = null;
    this.weatherChart = null;
    this.roseChart = null;

    const rendered = renderCoreCharts(snapshot, this.windChartCanvas, this.weatherChartCanvas);
    this.windChart = rendered.windChart;
    this.weatherChart = rendered.weatherChart;
    return {
      hasSpeedData: rendered.hasSpeedData,
      hasWeatherData: rendered.hasWeatherData,
      hasDirectionData: rendered.hasDirectionData,
    };
  }

  renderTimeframeTrend(payload: TimeframeAnalyticsResponse): void {
    if (this.timeframeTrendChart) this.timeframeTrendChart.destroy();
    this.timeframeTrendChart = null;

    if (!payload.buckets.length) {
      this.timeframeTrendWrapEl.classList.add("hidden");
      return;
    }

    this.timeframeTrendWrapEl.classList.remove("hidden");
    this.timeframeTrendChart = renderTimeframeTrendChart(payload, this.timeframeTrendCanvas);
  }

  renderRose(rose: TimeframeAnalyticsResponse["windRose"]): void {
    if (this.roseChart) this.roseChart.destroy();
    this.roseChart = renderWindRoseChart(this.roseChartCanvas, rose);
  }
}
