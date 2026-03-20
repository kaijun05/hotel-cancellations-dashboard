export function renderCancellationRateLeadTime(data, selectedYear) {
    // Update the card title based on selected year
    updateChartTitle(selectedYear);

    // Define lead time ranges
    const leadTimeRanges = [
        { label: "0-7 days", min: 0, max: 7 },
        { label: "8-30 days", min: 8, max: 30 },
        { label: "31-60 days", min: 31, max: 60 },
        { label: "61-90 days", min: 61, max: 90 },
        { label: "91-120 days", min: 91, max: 120 },
        { label: "121-180 days", min: 121, max: 180 },
        { label: "181-270 days", min: 181, max: 270 },
        { label: "270+ days", min: 271, max: Infinity }
    ];

    // Process data to calculate cancellation rates by lead time ranges
    const processedData = processLeadTimeData(data, leadTimeRanges, selectedYear);

    // Render the heatmap
    renderHeatmap(processedData);

    function processLeadTimeData(data, ranges, selectedYear) {
        // Filter data by year if specified
        let filteredData = data;
        if (selectedYear !== 'all') {
            filteredData = data.filter(d => d.arrival_date_year === parseInt(selectedYear));
        }

        const results = [];

        ranges.forEach(range => {
            // Filter bookings within this lead time range
            const rangeBookings = filteredData.filter(d => {
                const leadTime = +d.lead_time;
                return leadTime >= range.min && (range.max === Infinity ? true : leadTime <= range.max);
            });

            const totalBookings = rangeBookings.length;
            const canceledBookings = rangeBookings.filter(d => +d.is_canceled === 1).length;
            const cancellationRate = totalBookings > 0 ? (canceledBookings / totalBookings) * 100 : 0;

            // Determine risk level based on cancellation rate
            let riskClass = "risk-low";
            
            if (cancellationRate >= 75) {
                riskClass = "risk-very-high";
            } else if (cancellationRate >= 50) {
                riskClass = "risk-high";
            } else if (cancellationRate >= 25) {
                riskClass = "risk-medium";
            }

            results.push({
                label: range.label,
                totalBookings: totalBookings,
                canceledBookings: canceledBookings,
                cancellationRate: cancellationRate,
                riskClass: riskClass
            });
        });

        return results;
    }

    function updateChartTitle(selectedYear) {
        const cardHeader = d3.select("#lead-time-chart")
            .node()
            ?.closest('.card')
            ?.querySelector('.card-header h5');
        
        if (cardHeader) {
            let titleText = "Lead Time vs Cancellation Rate Heatmap";
            if (selectedYear === 'all') {
                titleText += " (All Years)";
            } else {
                titleText += ` (${selectedYear})`;
            }
            cardHeader.textContent = titleText;
        }
    }

    function renderHeatmap(data) {
        // Clear existing content
        d3.select("#lead-time-chart").selectAll("*").remove();

        // Create container
        const container = d3.select("#lead-time-chart")
            .attr("class", "lead-time-heatmap-container");

        // Create grid container
        const gridContainer = container.append("div")
            .attr("class", "lead-time-grid");

        // Create heatmap cards
        const cards = gridContainer.selectAll(".lead-time-heatmap-card")
            .data(data)
            .enter()
            .append("div")
            .attr("class", d => `lead-time-heatmap-card ${d.riskClass}`);

        // Add lead time range labels
        cards.append("div")
            .attr("class", "lead-time-range-label")
            .text(d => d.label);

        // Add cancellation rate
        cards.append("div")
            .attr("class", "lead-time-cancellation-rate")
            .text(d => `${d.cancellationRate.toFixed(1)}%`);

        // Add booking count
        cards.append("div")
            .attr("class", "lead-time-booking-count")
            .text(d => `${d.totalBookings.toLocaleString()} bookings`);

        // Create legend - FIXED: Apply classes properly
        const legendContainer = container.append("div")
            .attr("class", "lead-time-legend");

        const legendItems = [
            { label: "Low Risk (≤25%)", class: "risk-low" },
            { label: "Medium Risk (25-50%)", class: "risk-medium" },
            { label: "High Risk (50-75%)", class: "risk-high" },
            { label: "Very High Risk (>75%)", class: "risk-very-high" }
        ];

        const legend = legendContainer.selectAll(".lead-time-legend-item")
            .data(legendItems)
            .enter()
            .append("div")
            .attr("class", "lead-time-legend-item");

        // FIXED: Apply the risk class to the legend color box
        legend.append("div")
            .attr("class", d => `lead-time-legend-color ${d.class}`);

        legend.append("span")
            .attr("class", "lead-time-legend-text")
            .text(d => d.label);

        // Add summary statistics
        const totalBookings = d3.sum(data, d => d.totalBookings);
        const totalCanceled = d3.sum(data, d => d.canceledBookings);
        const overallRate = totalBookings > 0 ? (totalCanceled / totalBookings) * 100 : 0;

        const summary = container.append("div")
            .attr("class", "lead-time-summary");

        summary.append("div")
            .attr("class", "lead-time-summary-label")
            .text("Overall Statistics");

        summary.append("div")
            .attr("class", "lead-time-summary-value")
            .text(`${overallRate.toFixed(1)}% cancellation rate across ${totalBookings.toLocaleString()} bookings`);
    }
}