import { renderWindRoseChart } from "../wind_rose.js";
function parseIsoDate(value) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}
function timeSpanDays(labels) {
    if (labels.length < 2)
        return 0;
    const start = parseIsoDate(labels[0]);
    const end = parseIsoDate(labels[labels.length - 1]);
    if (!start || !end)
        return 0;
    return Math.max(0, (end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
}
function formatAxisDateLabel(value, spanDays) {
    const date = parseIsoDate(value);
    if (!date)
        return "";
    if (spanDays > 540) {
        return new Intl.DateTimeFormat("en-GB", { month: "short", year: "2-digit" }).format(date);
    }
    if (spanDays > 120) {
        return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "2-digit" }).format(date);
    }
    if (spanDays > 14) {
        return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short" }).format(date);
    }
    return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(date);
}
function timeAxisConfig(labels, spanDays) {
    const maxTicksLimit = spanDays > 540 ? 9 : spanDays > 180 ? 10 : spanDays > 30 ? 12 : 16;
    const dense = labels.length > maxTicksLimit * 3;
    return {
        grid: { color: "rgba(148, 163, 184, 0.18)" },
        ticks: {
            autoSkip: true,
            autoSkipPadding: 12,
            sampleSize: Math.min(120, Math.max(30, labels.length)),
            maxTicksLimit,
            maxRotation: dense ? 38 : 0,
            minRotation: 0,
            padding: 6,
            color: "#475569",
            callback: (_, index) => formatAxisDateLabel(labels[index] ?? "", spanDays),
        },
        title: { display: true, text: "Time (Europe/Madrid)", color: "#334155", font: { size: 11, weight: "700" } },
    };
}
function granularityForSpan(spanDays) {
    if (spanDays <= 10)
        return "hour";
    if (spanDays <= 180)
        return "day";
    if (spanDays <= 1080)
        return "week";
    return "month";
}
function floorToGranularity(value, granularity) {
    const date = new Date(value.getTime());
    if (granularity === "hour") {
        date.setMinutes(0, 0, 0);
        return date;
    }
    if (granularity === "day") {
        date.setHours(0, 0, 0, 0);
        return date;
    }
    if (granularity === "week") {
        const day = date.getDay();
        const shift = (day + 6) % 7;
        date.setDate(date.getDate() - shift);
        date.setHours(0, 0, 0, 0);
        return date;
    }
    date.setDate(1);
    date.setHours(0, 0, 0, 0);
    return date;
}
function envelopeFromBuckets(valuesByBucket) {
    const min = [];
    const avg = [];
    const max = [];
    valuesByBucket.forEach((values) => {
        if (values.length === 0) {
            min.push(null);
            avg.push(null);
            max.push(null);
            return;
        }
        const low = Math.min(...values);
        const high = Math.max(...values);
        const mean = values.reduce((sum, item) => sum + item, 0) / values.length;
        min.push(Number(low.toFixed(3)));
        avg.push(Number(mean.toFixed(3)));
        max.push(Number(high.toFixed(3)));
    });
    return { min, avg, max };
}
function aggregateRowsToEnvelopes(rows) {
    const labels = rows.map((row) => row.datetime);
    const spanDays = timeSpanDays(labels);
    const granularity = granularityForSpan(spanDays);
    const buckets = new Map();
    rows.forEach((row) => {
        const date = parseIsoDate(row.datetime);
        if (!date)
            return;
        const bucketDate = floorToGranularity(date, granularity);
        const key = bucketDate.getTime();
        let accumulator = buckets.get(key);
        if (!accumulator) {
            accumulator = { speed: [], temperature: [], pressure: [] };
            buckets.set(key, accumulator);
        }
        if (typeof row.speed === "number" && Number.isFinite(row.speed))
            accumulator.speed.push(row.speed);
        if (typeof row.temperature === "number" && Number.isFinite(row.temperature))
            accumulator.temperature.push(row.temperature);
        if (typeof row.pressure === "number" && Number.isFinite(row.pressure))
            accumulator.pressure.push(row.pressure);
    });
    const ordered = Array.from(buckets.entries()).sort((left, right) => left[0] - right[0]);
    const bucketLabels = ordered.map(([timestamp]) => new Date(timestamp).toISOString());
    const speedBuckets = ordered.map(([, values]) => values.speed);
    const temperatureBuckets = ordered.map(([, values]) => values.temperature);
    const pressureBuckets = ordered.map(([, values]) => values.pressure);
    return {
        labels: bucketLabels,
        granularity,
        speed: envelopeFromBuckets(speedBuckets),
        temperature: envelopeFromBuckets(temperatureBuckets),
        pressure: envelopeFromBuckets(pressureBuckets),
    };
}
function envelopeSummary(envelope) {
    const lows = envelope.min.filter((value) => typeof value === "number" && Number.isFinite(value));
    const means = envelope.avg.filter((value) => typeof value === "number" && Number.isFinite(value));
    const highs = envelope.max.filter((value) => typeof value === "number" && Number.isFinite(value));
    if (!lows.length && !means.length && !highs.length)
        return null;
    const min = lows.length ? Math.min(...lows) : means.length ? Math.min(...means) : Math.min(...highs);
    const max = highs.length ? Math.max(...highs) : means.length ? Math.max(...means) : Math.max(...lows);
    const avg = means.length ? (means.reduce((sum, value) => sum + value, 0) / means.length) : (min + max) / 2;
    return { min, max, avg };
}
function computeNumericStats(values) {
    const numeric = values.filter((value) => typeof value === "number" && Number.isFinite(value));
    if (!numeric.length)
        return null;
    const min = Math.min(...numeric);
    const max = Math.max(...numeric);
    const avg = numeric.reduce((sum, value) => sum + value, 0) / numeric.length;
    return { min, max, avg };
}
function granularityLabel(granularity) {
    if (granularity === "hour")
        return "hourly";
    if (granularity === "day")
        return "daily";
    if (granularity === "week")
        return "weekly";
    return "monthly";
}
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
        const selected = snapshot.stations.find((station) => station.stationId === snapshot.selectedStationId);
        const rows = selected?.data ?? [];
        const aggregated = aggregateRowsToEnvelopes(rows);
        const labels = aggregated.labels;
        const spanDays = timeSpanDays(labels);
        const granularityText = granularityLabel(aggregated.granularity);
        const hasSpeedData = rows.some((row) => row.speed != null);
        const hasWeatherData = rows.some((row) => row.temperature != null || row.pressure != null);
        const hasDirectionData = rows.some((row) => row.direction != null);
        const windCtx = this.windChartCanvas.getContext("2d");
        if (hasSpeedData && windCtx) {
            const speedStats = envelopeSummary(aggregated.speed);
            const windDatasets = [
                {
                    label: "__speed_floor",
                    data: aggregated.speed.min,
                    borderColor: "rgba(15, 23, 42, 0)",
                    backgroundColor: "rgba(15, 23, 42, 0)",
                    borderWidth: 0.8,
                    spanGaps: true,
                    pointRadius: 0,
                    fill: false,
                },
                {
                    label: "Speed range (min-max)",
                    data: aggregated.speed.max,
                    borderColor: "rgba(14, 165, 233, 0.45)",
                    backgroundColor: "rgba(14, 165, 233, 0.18)",
                    borderWidth: 1.4,
                    spanGaps: true,
                    pointRadius: 0,
                    fill: "-1",
                    tension: 0.2,
                },
                {
                    label: "Avg speed",
                    data: aggregated.speed.avg,
                    borderColor: "#0f766e",
                    borderWidth: 2.2,
                    pointRadius: 0,
                    fill: false,
                    tension: 0.22,
                    spanGaps: true,
                },
            ];
            this.windChart = new Chart(windCtx, {
                type: "line",
                data: {
                    labels,
                    datasets: windDatasets,
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: { mode: "index", intersect: false },
                    plugins: {
                        decimation: { enabled: labels.length > 300, algorithm: "lttb", samples: 220 },
                        legend: {
                            position: "top",
                            labels: {
                                usePointStyle: true,
                                boxWidth: 8,
                                font: { size: 11 },
                                filter: (item) => !(item.text ?? "").startsWith("__"),
                            },
                        },
                        subtitle: speedStats
                            ? {
                                display: true,
                                text: `${granularityText} min/avg/max ${speedStats.min.toFixed(2)} / ${speedStats.avg.toFixed(2)} / ${speedStats.max.toFixed(2)} m/s`,
                                color: "#475569",
                                padding: { bottom: 8 },
                                font: { size: 11, weight: "600" },
                            }
                            : { display: false },
                    },
                    scales: {
                        x: timeAxisConfig(labels, spanDays),
                        y: {
                            grid: { color: "rgba(148, 163, 184, 0.22)" },
                            ticks: { callback: (value) => `${value} m/s` },
                            title: { display: true, text: "Wind speed (m/s)", color: "#334155", font: { size: 11, weight: "700" } },
                        },
                    },
                },
            });
        }
        const weatherCtx = this.weatherChartCanvas.getContext("2d");
        if (hasWeatherData && weatherCtx) {
            const temperatureStats = envelopeSummary(aggregated.temperature);
            const pressureStats = envelopeSummary(aggregated.pressure);
            const weatherDatasets = [
                {
                    label: "__temp_floor",
                    data: aggregated.temperature.min,
                    borderColor: "rgba(220, 38, 38, 0)",
                    yAxisID: "yTemp",
                    borderWidth: 0.8,
                    pointRadius: 0,
                    spanGaps: true,
                    fill: false,
                },
                {
                    label: "Temp range (min-max)",
                    data: aggregated.temperature.max,
                    borderColor: "rgba(220, 38, 38, 0.5)",
                    backgroundColor: "rgba(248, 113, 113, 0.14)",
                    yAxisID: "yTemp",
                    borderWidth: 1.2,
                    fill: "-1",
                    pointRadius: 0,
                    spanGaps: true,
                    tension: 0.2,
                },
                {
                    label: "Avg temp",
                    data: aggregated.temperature.avg,
                    borderColor: "#dc2626",
                    yAxisID: "yTemp",
                    borderWidth: 2.1,
                    pointRadius: 0,
                    tension: 0.22,
                    spanGaps: true,
                },
                {
                    label: "__press_floor",
                    data: aggregated.pressure.min,
                    borderColor: "rgba(2, 132, 199, 0)",
                    yAxisID: "yPress",
                    borderWidth: 0.8,
                    pointRadius: 0,
                    fill: false,
                    spanGaps: true,
                },
                {
                    label: "Pressure range (min-max)",
                    data: aggregated.pressure.max,
                    borderColor: "rgba(2, 132, 199, 0.55)",
                    backgroundColor: "rgba(56, 189, 248, 0.14)",
                    yAxisID: "yPress",
                    borderWidth: 1.2,
                    pointRadius: 0,
                    fill: "-1",
                    spanGaps: true,
                    tension: 0.2,
                },
                {
                    label: "Avg pressure",
                    data: aggregated.pressure.avg,
                    borderColor: "#0284c7",
                    yAxisID: "yPress",
                    borderWidth: 2.1,
                    pointRadius: 0,
                    tension: 0.22,
                    spanGaps: true,
                },
            ];
            const subtitleParts = [];
            if (temperatureStats) {
                subtitleParts.push(`Temp min/avg/max ${temperatureStats.min.toFixed(1)} / ${temperatureStats.avg.toFixed(1)} / ${temperatureStats.max.toFixed(1)} ºC`);
            }
            if (pressureStats) {
                subtitleParts.push(`Pressure min/avg/max ${pressureStats.min.toFixed(1)} / ${pressureStats.avg.toFixed(1)} / ${pressureStats.max.toFixed(1)} hPa`);
            }
            this.weatherChart = new Chart(weatherCtx, {
                type: "line",
                data: {
                    labels,
                    datasets: weatherDatasets,
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: { mode: "index", intersect: false },
                    plugins: {
                        decimation: { enabled: labels.length > 300, algorithm: "lttb", samples: 220 },
                        legend: {
                            position: "top",
                            labels: {
                                usePointStyle: true,
                                boxWidth: 8,
                                font: { size: 11 },
                                filter: (item) => !(item.text ?? "").startsWith("__"),
                            },
                        },
                        subtitle: subtitleParts.length
                            ? {
                                display: true,
                                text: `${granularityText} buckets · ${subtitleParts.join(" · ")}`,
                                color: "#475569",
                                padding: { bottom: 8 },
                                font: { size: 11, weight: "600" },
                            }
                            : { display: false },
                    },
                    scales: {
                        x: timeAxisConfig(labels, spanDays),
                        yTemp: {
                            type: "linear",
                            position: "left",
                            grid: { color: "rgba(248, 113, 113, 0.18)" },
                            ticks: { callback: (value) => `${value} ºC` },
                            title: { display: true, text: "Temperature (ºC)", color: "#991b1b", font: { size: 11, weight: "700" } },
                        },
                        yPress: {
                            type: "linear",
                            position: "right",
                            grid: { drawOnChartArea: false },
                            ticks: { callback: (value) => `${value} hPa` },
                            title: { display: true, text: "Pressure (hPa)", color: "#0369a1", font: { size: 11, weight: "700" } },
                        },
                    },
                },
            });
        }
        return { hasSpeedData, hasWeatherData, hasDirectionData };
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
        const ctx = this.timeframeTrendCanvas.getContext("2d");
        if (!ctx)
            return;
        const labels = payload.buckets.map((bucket) => bucket.label);
        const minSpeedSeries = payload.buckets.map((bucket) => bucket.minSpeed);
        const avgSpeedSeries = payload.buckets.map((bucket) => bucket.avgSpeed);
        const maxSpeedSeries = payload.buckets.map((bucket) => bucket.maxSpeed);
        const p90Series = payload.buckets.map((bucket) => bucket.p90Speed);
        const avgTempSeries = payload.buckets.map((bucket) => bucket.avgTemperature);
        const minTempSeries = payload.buckets.map((bucket) => bucket.minTemperature);
        const maxTempSeries = payload.buckets.map((bucket) => bucket.maxTemperature);
        const generationSeries = payload.buckets.map((bucket) => bucket.estimatedGenerationMwh);
        const speedStats = computeNumericStats(avgSpeedSeries);
        const generationStats = computeNumericStats(generationSeries);
        const datasets = [
            {
                type: "line",
                label: "__speed_floor",
                data: minSpeedSeries,
                borderColor: "rgba(15, 23, 42, 0)",
                borderWidth: 0.8,
                pointRadius: 0,
                tension: 0.18,
                yAxisID: "ySpeed",
                spanGaps: true,
            },
            {
                type: "line",
                label: "Speed range (min-max)",
                data: maxSpeedSeries,
                borderColor: "rgba(14, 165, 233, 0.45)",
                backgroundColor: "rgba(14, 165, 233, 0.18)",
                borderWidth: 1.3,
                pointRadius: 0,
                fill: "-1",
                tension: 0.2,
                yAxisID: "ySpeed",
                spanGaps: true,
            },
            {
                type: "line",
                label: "Avg speed",
                data: avgSpeedSeries,
                borderColor: "#0f766e",
                borderWidth: 2.2,
                pointRadius: 1.5,
                pointHoverRadius: 3,
                tension: 0.24,
                yAxisID: "ySpeed",
                spanGaps: true,
            },
            {
                type: "line",
                label: "P90 speed",
                data: p90Series,
                borderColor: "#0ea5e9",
                borderWidth: 1.6,
                borderDash: [5, 4],
                pointRadius: 0,
                tension: 0.2,
                yAxisID: "ySpeed",
                spanGaps: true,
            },
            {
                type: "line",
                label: "__temp_floor",
                data: minTempSeries,
                borderColor: "rgba(59, 130, 246, 0)",
                borderWidth: 0.8,
                pointRadius: 0,
                tension: 0.16,
                yAxisID: "yTemp",
                spanGaps: true,
            },
            {
                type: "line",
                label: "Temp range (min-max)",
                data: maxTempSeries,
                borderColor: "rgba(239, 68, 68, 0.56)",
                backgroundColor: "rgba(248, 113, 113, 0.12)",
                borderWidth: 1.2,
                pointRadius: 0,
                fill: "-1",
                tension: 0.16,
                yAxisID: "yTemp",
                spanGaps: true,
            },
            {
                type: "line",
                label: "Avg temp",
                data: avgTempSeries,
                borderColor: "rgba(185, 28, 28, 0.92)",
                borderWidth: 1.5,
                borderDash: [4, 4],
                pointRadius: 0,
                tension: 0.16,
                yAxisID: "yTemp",
                spanGaps: true,
            },
        ];
        if (generationStats) {
            datasets.push({
                type: "bar",
                label: "Generation (MWh)",
                data: generationSeries,
                yAxisID: "yGeneration",
                backgroundColor: "rgba(14, 165, 233, 0.25)",
                borderColor: "rgba(14, 165, 233, 0.8)",
                borderWidth: 1,
                borderRadius: 4,
                barThickness: 14,
            });
        }
        this.timeframeTrendChart = new Chart(ctx, {
            type: "line",
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: "index", intersect: false },
                plugins: {
                    legend: {
                        position: "top",
                        labels: {
                            usePointStyle: true,
                            boxWidth: 8,
                            font: { size: 11 },
                            filter: (item) => !(item.text ?? "").startsWith("__"),
                        },
                    },
                    subtitle: speedStats
                        ? {
                            display: true,
                            text: `Avg-speed min/avg/max ${speedStats.min.toFixed(2)} / ${speedStats.avg.toFixed(2)} / ${speedStats.max.toFixed(2)} m/s`,
                            color: "#475569",
                            padding: { bottom: 8 },
                            font: { size: 11, weight: "600" },
                        }
                        : { display: false },
                },
                scales: {
                    x: {
                        grid: { color: "rgba(148, 163, 184, 0.16)" },
                        ticks: {
                            color: "#475569",
                            maxRotation: labels.length > 10 ? 32 : 0,
                            minRotation: 0,
                            autoSkip: true,
                            maxTicksLimit: 14,
                            padding: 5,
                        },
                    },
                    ySpeed: {
                        type: "linear",
                        position: "left",
                        grid: { color: "rgba(148, 163, 184, 0.24)" },
                        title: { display: true, text: "Wind speed (m/s)", color: "#0f766e", font: { size: 11, weight: "700" } },
                        ticks: { callback: (value) => `${value}` },
                    },
                    yTemp: {
                        type: "linear",
                        position: "right",
                        grid: { drawOnChartArea: false },
                        title: { display: true, text: "Temperature (ºC)", color: "#b91c1c", font: { size: 11, weight: "700" } },
                        ticks: { callback: (value) => `${value}` },
                    },
                    yGeneration: {
                        type: "linear",
                        position: "right",
                        display: Boolean(generationStats),
                        grid: { drawOnChartArea: false },
                        title: { display: Boolean(generationStats), text: "Generation (MWh)", color: "#0369a1", font: { size: 11, weight: "700" } },
                        ticks: { callback: (value) => `${value}` },
                    },
                },
            },
        });
    }
    renderRose(rose) {
        if (this.roseChart)
            this.roseChart.destroy();
        this.roseChart = renderWindRoseChart(this.roseChartCanvas, rose);
    }
}
