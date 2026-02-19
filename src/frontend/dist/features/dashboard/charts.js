import { renderWindRoseChart } from "../wind_rose.js";
import { renderCoreCharts } from "./chart_core.js";
import { renderTimeframeTrendChart } from "./chart_timeframe.js";
export class DashboardCharts {
    constructor(windChartCanvas, weatherChartCanvas, roseChartCanvas, timeframeTrendWrapEl, timeframeTrendCanvas) {
        this.windChartCanvas = windChartCanvas;
        this.weatherChartCanvas = weatherChartCanvas;
        this.roseChartCanvas = roseChartCanvas;
        this.timeframeTrendWrapEl = timeframeTrendWrapEl;
        this.timeframeTrendCanvas = timeframeTrendCanvas;
        this.windChart = null;
        this.weatherChart = null;
        this.roseChart = null;
        this.timeframeTrendChart = null;
    }
    resetAll() {
        if (this.windChart)
            this.windChart.destroy();
        if (this.weatherChart)
            this.weatherChart.destroy();
        if (this.roseChart)
            this.roseChart.destroy();
        if (this.timeframeTrendChart)
            this.timeframeTrendChart.destroy();
        this.windChart = null;
        this.weatherChart = null;
        this.roseChart = null;
        this.timeframeTrendChart = null;
    }
    clearTimeframeTrend() {
        this.timeframeTrendWrapEl.classList.add("hidden");
        if (this.timeframeTrendChart) {
            this.timeframeTrendChart.destroy();
            this.timeframeTrendChart = null;
        }
    }
    renderCore(snapshot) {
        if (this.windChart)
            this.windChart.destroy();
        if (this.weatherChart)
            this.weatherChart.destroy();
        if (this.roseChart)
            this.roseChart.destroy();
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
    renderTimeframeTrend(payload) {
        if (this.timeframeTrendChart)
            this.timeframeTrendChart.destroy();
        this.timeframeTrendChart = null;
        if (!payload.buckets.length) {
            this.timeframeTrendWrapEl.classList.add("hidden");
            return;
        }
        this.timeframeTrendWrapEl.classList.remove("hidden");
        this.timeframeTrendChart = renderTimeframeTrendChart(payload, this.timeframeTrendCanvas);
    }
    renderRose(rose) {
        if (this.roseChart)
            this.roseChart.destroy();
        this.roseChart = renderWindRoseChart(this.roseChartCanvas, rose);
    }
}
