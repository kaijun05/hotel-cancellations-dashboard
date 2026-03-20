export function renderMonthlyCancellationLineChart(data, selectedYear) {
    // Update the card title based on selected year
    updateChartTitle(selectedYear);

    // Month names for x-axis
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    // Month mapping for data processing
    const monthMap = {
        'January': '01', 'February': '02', 'March': '03', 'April': '04',
        'May': '05', 'June': '06', 'July': '07', 'August': '08',
        'September': '09', 'October': '10', 'November': '11', 'December': '12'
    };

    // Process data based on whether we're showing all years or a specific year
    const processedData = processRawData(data, monthMap, selectedYear);

    if (processedData.length === 0) {
        console.warn("No Processed Data Available for Chart");
        d3.select("#monthly-cancellation-chart").html("<p>No data available for the selected year.</p>");
        return;
    }

    const monthlyAverages = calculateMonthlyAverages(processedData);
    drawLineChart(monthlyAverages, monthNames);

    function processRawData(data, monthMap, selectedYear) {
        const processedData = [];

        // Filter data by year if not 'all'
        let filteredData = data;
        if (selectedYear !== 'all') {
            filteredData = data.filter(d => d.arrival_date_year === parseInt(selectedYear));
        }

        if (filteredData.length === 0) {
            console.warn("No data after year filtering");
            return processedData;
        }

        // Group by year --> month --> hotel
        const grouped = d3.group(filteredData,
            d => d.arrival_date_year,
            d => d.arrival_date_month,
            d => d.hotel
        );

        // Process each year
        grouped.forEach((yearData, year) => {
            // Skip if we're filtering by year and this isn't the selected year
            if (selectedYear !== 'all' && year !== parseInt(selectedYear)) {
                return;
            }

            yearData.forEach((monthData, month) => {
                monthData.forEach((hotelData, hotel) => {
                    const total = hotelData.length;
                    const canceled = hotelData.filter(d => +d.is_canceled === 1).length;

                    const monthNumber = monthMap[month];
                    if (!monthNumber) {
                        console.warn("Unknown month:", month);
                        return;
                    }

                    processedData.push({
                        year: year,
                        month: monthNumber,
                        hotel: hotel,
                        canceled: canceled,
                        total: total
                    });
                });
            });
        });

        return processedData;
    }

    function calculateMonthlyAverages(data) {
        const processedData = [];
        // Group by hotel and month
        const groupedByHotel = d3.group(data, d => d.hotel);

        groupedByHotel.forEach((hotelData, hotel) => {
            const monthlyData = d3.group(hotelData, d => d.month);

            // For each month (1-12), calculate average cancellation rate
            for (let month = 1; month <= 12; month++) {
                const monthStr = month.toString().padStart(2, '0');
                const monthData = monthlyData.get(monthStr) || [];

                let avgCancellationRate = 0;
                if (monthData.length > 0) {
                    // Calculate average cancellation rate for this month across all data points
                    const totalCanceled = d3.sum(monthData, d => d.canceled);
                    const totalBookings = d3.sum(monthData, d => d.total);
                    avgCancellationRate = totalBookings > 0 ? totalCanceled / totalBookings : 0;
                }

                processedData.push({
                    hotel: hotel,
                    month: month,
                    monthName: monthNames[month - 1],
                    cancellationRate: avgCancellationRate,
                    totalBookings: d3.sum(monthData, d => d.total)
                });
            }
        });

        return processedData;
    }

    function updateChartTitle(selectedYear) {
        // Find the card header for the monthly cancellation chart
        const cardHeader = d3.select("#monthly-cancellation-chart")
            .node()
            ?.closest('.card')
            ?.querySelector('.card-header h5');

        if (cardHeader) {
            let titleText = "Monthly Cancellation Trends";
            if (selectedYear === 'all') {
                titleText += " (All Years)";
            } else {
                titleText += ` (${selectedYear})`;
            }
            cardHeader.textContent = titleText;
        }
    }

    function drawLineChart(data, monthNames) {
        const container = d3.select("#monthly-cancellation-chart");

        // Clear any existing chart
        container.selectAll("*").remove();

        // Get the actual container dimensions 
        const containerNode = container.node();
        const containerRect = containerNode.getBoundingClientRect();

        const totalWidth = 600;
        const totalHeight = 400;

        // Adjusted margins to fit better in card
        const margin = {
            top: 20,
            right: 120,
            bottom: 50,
            left: 60
        };

        // Calculate dimensions based on container
        const width = totalWidth - margin.left - margin.right; // Extra padding
        const height = totalHeight - margin.top - margin.bottom; // Reduced total height

        // Create SVG with responsive viewBox
        const svg = container
            .append("svg")
            .attr("width", totalWidth)
            .attr("height", totalHeight)
            .attr("viewBox", `0 0 ${totalWidth} ${totalHeight}`)
            .attr("preserveAspectRatio", "xMidYMid meet")
            .style("width", "100%")
            .style("height", "auto");

        const g = svg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        const maxRate = d3.max(data, d => d.cancellationRate) || 0.5;

        // Create scales
        const x = d3.scaleLinear().domain([1, 12]).range([0, width]);
        const y = d3.scaleLinear()
            .domain([0, maxRate]).nice()
            .range([height, 0]);

        const color = d3.scaleOrdinal()
            .domain([...new Set(data.map(d => d.hotel))])
            .range(["#3498db", "#FF007F"]); // Resort Hotel: blue, City Hotel: pink

        // Create line generator
        const line = d3.line()
            .x(d => x(d.month))
            .y(d => y(d.cancellationRate));

        // Group data by hotel
        const hotels = Array.from(d3.group(data, d => d.hotel));

        // Add axes
        g.append("g")
            .attr("class", "monthly-x-axis")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x)
                .tickValues(d3.range(1, 13))
                .tickFormat(d => monthNames[d - 1]))
            .selectAll("text")
            .style("font-size", "11px");
            

        g.append("g")
            .attr("class", "monthly-y-axis")
            .call(d3.axisLeft(y).tickFormat(d => `${(d * 100).toFixed(0)}%`))
            .selectAll("text")
            .style("font-size", "11px");

        // Add axis labels
        g.append("text")
            .attr("class", "monthly-x-axis-label")
            .attr("x", width / 2)
            .attr("y", height + 40)
            .attr("text-anchor", "middle")
            .style("font-size", "12px")
            .style("font-weight", "bold")
            .text("Month");

        g.append("text")
            .attr("class", "monthly-y-axis-label")
            .attr("transform", "rotate(-90)")
            .attr("x", -height / 2)
            .attr("y", -40)
            .attr("text-anchor", "middle")
            .style("font-size", "12px")
            .style("font-weight", "bold")
            .text("Average Cancellation Rate");

        // Create tooltip (remove any existing ones first)
        d3.selectAll(".monthly-cancellation-tooltip").remove();
        const tooltip = d3.select("body").append("div")
            .attr("class", "monthly-cancellation-tooltip")
            .style("position", "absolute")
            .style("background", "rgba(0, 0, 0, 0.9)")
            .style("color", "white")
            .style("font-family", "var(--bs-body-font-family)")
            .style("padding", "12px")
            .style("border-radius", "8px")
            .style("font-size", "12px")
            .style("pointer-events", "none")
            .style("opacity", 0)
            .style("transition", "opacity 0.3s")
            .style("max-width", "200px")
            .style("box-shadow", "0 4px 12px rgba(0, 0, 0, 0.3)")
            .style("z-index", "1000");

        // Draw lines and points for each hotel
        hotels.forEach(([hotel, values]) => {
            // Sort by month to ensure proper line drawing
            const sortedValues = values.sort((a, b) => a.month - b.month);

            // Add animated line
            const path = g.append("path")
                .datum(sortedValues)
                .attr("class", "line")
                .attr("stroke", color(hotel))
                .attr("fill", "none")
                .attr("stroke-width", 3)
                .attr("d", line);

            const totalLength = path.node().getTotalLength();
            path
                .attr("stroke-dasharray", `${totalLength} ${totalLength}`)
                .attr("stroke-dashoffset", totalLength)
                .transition()
                .duration(1500)
                .ease(d3.easeCubic)
                .attr("stroke-dashoffset", 0);

            // Add visible dots at each data point
            g.selectAll(`.monthly-dot-${hotel.replace(/\s+/g, '')}`)
                .data(sortedValues)
                .enter().append("circle")
                .attr("class", `monthly-cancellation-dot monthly-dot-${hotel.replace(/\s+/g, '')}`)
                .attr("cx", d => x(d.month))
                .attr("cy", d => y(d.cancellationRate))
                .attr("fill", color(hotel))
                .attr("r", 3)
                .attr("fill", color(hotel))
                .attr("stroke", "white")
                .attr("stroke-width", 1.5);

            // Add invisible larger circles for easier hovering
            g.selectAll(`.monthly-hover-${hotel.replace(/\s+/g, '')}`)
                .data(sortedValues)
                .enter().append("circle")
                .attr("class", `monthly-cancellation-hover monthly-hover-${hotel.replace(/\s+/g, '')}`)
                .attr("cx", d => x(d.month))
                .attr("cy", d => y(d.cancellationRate))
                .attr("r", 8)
                .attr("fill", "transparent")
                .style("cursor", "pointer")
                .on("mouseover", function (event, d) {
                    tooltip.transition().duration(200).style("opacity", 1);
                    tooltip.html(`
                        <div style="margin-bottom: 8px; font-size: 14px;">
                            <strong>${hotel}</strong>
                        </div>
                        <div style="margin-bottom: 4px;">
                            <span style="font-weight: bold;">Month:</span> 
                            ${d.monthName}
                        </div>
                        <div style="margin-bottom: 4px;">
                            <span style="font-weight: bold;">Cancellation Rate:</span> 
                            ${(d.cancellationRate * 100).toFixed(1)}%
                        </div>
                        <div>
                            <span style="font-weight: bold;">Total Bookings:</span> 
                            ${d.totalBookings.toLocaleString()}
                        </div>
                    `)
                        .style("left", (event.pageX + 10) + "px")
                        .style("top", (event.pageY - 10) + "px");
                })
                .on("mousemove", function (event) {
                    tooltip.style("left", (event.pageX + 10) + "px")
                        .style("top", (event.pageY - 10) + "px");
                })
                .on("mouseout", function () {
                    tooltip.transition().duration(200).style("opacity", 0);
                });
        });

        // Add legend
        const legend = g.selectAll(".monthly-cancellation-legend")
            .data(color.domain())
            .enter().append("g")
            .attr("class", "monthly-cancellation-legend")
            .attr("transform", (d, i) => `translate(${width + 20}, ${20 + i * 25})`);

        legend.append("rect")
            .attr("class", "monthly-cancellation-legend-rect")
            .attr("x", 0)
            .attr("y", 0)
            .attr("width", 14)
            .attr("height", 14)
            .style("fill", color);

        legend.append("text")
            .attr("class", "monthly-cancellation-legend-text")
            .attr("x", 20)
            .attr("y", 7)
            .attr("dy", ".35em")
            .style("font-size", "11px")
            .style("font-weight", "600")
            .text(d => d === 'Resort Hote' ? 'Resort Hotel' : d);
    }
}