export function renderMonthlyCancellationLineChart(data, selectedYear) {
    updateChartTitle(selectedYear);

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    const monthMap = {
        'January': '01', 'February': '02', 'March': '03', 'April': '04',
        'May': '05', 'June': '06', 'July': '07', 'August': '08',
        'September': '09', 'October': '10', 'November': '11', 'December': '12'
    };

    const processedData = processRawData(data, monthMap, selectedYear);

    if (processedData.length === 0) {
        d3.select("#monthly-cancellation-chart").html("<p>No data available for the selected year.</p>");
        return;
    }

    const monthlyAverages = calculateMonthlyAverages(processedData);

    drawLineChart(monthlyAverages, monthNames);

    function processRawData(data, monthMap, selectedYear) {
        const processedData = [];

        let filteredData = data;
        if (selectedYear !== 'all') {
            filteredData = data.filter(d => d.arrival_date_year === parseInt(selectedYear));
        }

        if (filteredData.length === 0) return processedData;

        const grouped = d3.group(filteredData,
            d => d.arrival_date_year,
            d => d.arrival_date_month,
            d => d.hotel
        );

        grouped.forEach((yearData, year) => {
            if (selectedYear !== 'all' && year !== parseInt(selectedYear)) return;

            yearData.forEach((monthData, month) => {
                monthData.forEach((hotelData, hotel) => {
                    const total = hotelData.length;
                    const canceled = hotelData.filter(d => +d.is_canceled === 1).length;
                    const monthNumber = monthMap[month];
                    if (!monthNumber) return;

                    processedData.push({
                        year,
                        month: monthNumber,
                        hotel,
                        canceled,
                        total
                    });
                });
            });
        });

        return processedData;
    }

    function calculateMonthlyAverages(data) {
        const processedData = [];
        const groupedByHotel = d3.group(data, d => d.hotel);

        groupedByHotel.forEach((hotelData, hotel) => {
            const monthlyData = d3.group(hotelData, d => d.month);

            for (let month = 1; month <= 12; month++) {
                const monthStr = month.toString().padStart(2, '0');
                const monthData = monthlyData.get(monthStr) || [];

                let avgCancellationRate = 0;
                if (monthData.length > 0) {
                    const totalCanceled = d3.sum(monthData, d => d.canceled);
                    const totalBookings = d3.sum(monthData, d => d.total);
                    avgCancellationRate = totalBookings > 0 ? totalCanceled / totalBookings : 0;
                }

                processedData.push({
                    hotel,
                    month,
                    monthName: monthNames[month - 1],
                    cancellationRate: avgCancellationRate,
                    totalBookings: d3.sum(monthData, d => d.total)
                });
            }
        });

        return processedData;
    }

    function updateChartTitle(selectedYear) {
        const cardHeader = d3.select("#monthly-cancellation-chart")
            .node()
            ?.closest('.card')
            ?.querySelector('.card-header h5');

        if (cardHeader) {
            let titleText = "Monthly Cancellation Trends";
            titleText += selectedYear === 'all' ? " (All Years)" : ` (${selectedYear})`;
            cardHeader.textContent = titleText;
        }
    }

    function drawLineChart(data, monthNames) {
        const margin = { top: 40, right: 120, bottom: 60, left: 80 };
        const width = 800 - margin.left - margin.right;
        const height = 400 - margin.top - margin.bottom;

        d3.select("#monthly-cancellation-chart").selectAll("*").remove();

        const svg = d3.select("#monthly-cancellation-chart")
             .append("svg")
             .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
             .attr("preserveAspectRatio", "xMidYMid meet")
             .style("width", "100%")
             .style("height", "auto")
             .append("g")
             .attr("transform", `translate(${margin.left},${margin.top})`);

        const maxRate = d3.max(data, d => d.cancellationRate) || 0.5;

        const x = d3.scaleLinear().domain([1, 12]).range([0, width]);
        const y = d3.scaleLinear().domain([0, maxRate]).nice().range([height, 0]);

        const color = d3.scaleOrdinal()
            .domain([...new Set(data.map(d => d.hotel))])
            .range(["#3498db", "#FF007F"]);

        const line = d3.line()
            .x(d => x(d.month))
            .y(d => y(d.cancellationRate));

        const hotels = Array.from(d3.group(data, d => d.hotel));

        svg.append("g")
            .attr("transform", `translate(0,${height})`)
            .call(d3.axisBottom(x).tickValues(d3.range(1, 13)).tickFormat(d => monthNames[d - 1]));

        svg.append("g")
            .call(d3.axisLeft(y).tickFormat(d => `${(d * 100).toFixed(1)}%`));

        svg.append("text")
            .attr("x", width / 2)
            .attr("y", height + 50)
            .attr("text-anchor", "middle")
            .attr("class", "axis-label")
            .style("font-size", "14px")
            .style("font-weight", "bold")
            .text("Month");

        svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("x", -height / 2)
            .attr("y", -60)
            .attr("text-anchor", "middle")
            .attr("class", "axis-label")
            .style("font-size", "14px")
            .style("font-weight", "bold")
            .text("Average Cancellation Rate");

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

        hotels.forEach(([hotel, values]) => {
            const sortedValues = values.sort((a, b) => a.month - b.month);

            // Add animated line
            const path = svg.append("path")
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

            svg.selectAll(`.dot-${hotel.replace(/\s+/g, '')}`)
                .data(sortedValues)
                .enter().append("circle")
                .attr("class", `dot-${hotel.replace(/\s+/g, '')}`)
                .attr("cx", d => x(d.month))
                .attr("cy", d => y(d.cancellationRate))
                .attr("r", 4)
                .attr("fill", color(hotel))
                .attr("stroke", "white")
                .attr("stroke-width", 2);

            svg.selectAll(`.hover-${hotel.replace(/\s+/g, '')}`)
                .data(sortedValues)
                .enter().append("circle")
                .attr("class", `hover-${hotel.replace(/\s+/g, '')}`)
                .attr("cx", d => x(d.month))
                .attr("cy", d => y(d.cancellationRate))
                .attr("r", 10)
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
                            ${d.totalBookings}
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
                    tooltip.transition().duration(300).style("opacity", 0);
                });
        });

        const legend = svg.selectAll(".legend")
            .data(color.domain())
            .enter().append("g")
            .attr("class", "legend")
            .attr("transform", (d, i) => `translate(${width + 20}, ${20 + i * 30})`);

        legend.append("rect")
            .attr("x", 0)
            .attr("width", 20)
            .attr("height", 20)
            .style("fill", color)
            .attr("stroke", "#333")
            .attr("stroke-width", 1)
            .attr("rx", 3)
            .attr("ry", 3);

        legend.append("text")
            .attr("x", 30)
            .attr("y", 10)
            .attr("dy", ".35em")
            .style("text-anchor", "start")
            .style("font-size", "12px")
            .style("font-weight", "600")
            .style("fill", "#333")
            .text(d => d);
    }
}
