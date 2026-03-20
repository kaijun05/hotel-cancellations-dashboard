export function renderSummaryKPIs(data, selectedYear) {
    // Function to compute the KPIs for a given year - "all" by default
    function calculateKPIs(year = "all") {
        let filteredData = data

        // Filter by year if specified
        if (year !== "all") {
            filteredData = data.filter(d => d.arrival_date_year === parseInt(year))
        }

        // Calculate the total bookings
        const totalBookings = filteredData.length

        // Calculate cancellations (is_canceled = 1)
        const cancellations = filteredData.filter(d => d.is_canceled === 1).length

        // Calculate the check-outs and no-shows based on the reservation_status
        const checkOuts = filteredData.filter(d =>
            d.reservation_status === "Check-Out"
        ).length

        const noShows = filteredData.filter(d =>
            d.reservation_status === "No-Show"
        ).length

        // Return the calculated variables
        return {
            checkOuts,
            cancellations,
            noShows,
            totalBookings,
        }
    }

    // Test Hotel KPI data output
    // console.log("Hotel KPI Data:", hotelData)

    // Function to update the KPI dashboard
    function updateKPIDashboard(selectedYear = "all") {
        const kpi = calculateKPIs(selectedYear);

        // Calculate rates
        const checkOutRate = ((kpi.checkOuts / kpi.totalBookings) * 100).toFixed(1);
        const cancellationRate = ((kpi.cancellations / kpi.totalBookings) * 100).toFixed(1);
        const noShowRate = ((kpi.noShows / kpi.totalBookings) * 100).toFixed(1);

        // Update HTML elements
        document.getElementById("kpi-total-bookings").textContent = kpi.totalBookings.toLocaleString();
        document.getElementById("kpi-success-rate").textContent = checkOutRate + "%";
        document.getElementById("kpi-cancellation-rate").textContent = cancellationRate + "%";
        document.getElementById("kpi-noshow-rate").textContent = noShowRate + "%";

        // Update the card title
        updateChartTitle(selectedYear);
    }

    // Function to update the card title for KPI section
    function updateChartTitle(selectedYear) {
        const cardHeader = d3.select(".kpi-summary-bar")
            .node()
            ?.closest('.card')
            ?.querySelector('.card-header h5');
        if (cardHeader) {
            let titleText = "At a Glance";
            titleText += selectedYear === 'all' ? " (All Years)" : ` (${selectedYear})`;
            cardHeader.textContent = titleText;
        }
    }

    // Initialize dashboard with all years data
    updateKPIDashboard(selectedYear);
}