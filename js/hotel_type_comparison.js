export function renderHotelTypeCancellationComparison(data, selectedYear) {
    // Update the card title based on selected year
    updateChartTitle(selectedYear);

    function updateChartTitle(selectedYear) {
        const cardHeader = d3.select("#hotel-type-cancellation-bubble")
            .node()
            ?.closest('.card')
            ?.querySelector('.card-header h5');

        if (cardHeader) {
            let titleText = "Cancellation Volume by Hotel Type";
            if (selectedYear === 'all') {
                titleText += " (All Years)";
            } else {
                titleText += ` (${selectedYear})`;
            }
            cardHeader.textContent = titleText;
        }
    }

    // Chart dimensions
    const width = 300; 
    const height = 280; 

    // Clear existing content first
    d3.select("#hotel-type-cancellation-bubble").selectAll("*").remove();

    const svg = d3.select("#hotel-type-cancellation-bubble")
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("preserveAspectRatio", "xMidYMid meet")
        .style("width", "100%")
        .style("height", "auto");

    // Create or select tooltip - PLAIN STYLING
    let tooltip = d3.select("#tooltip");
    if (tooltip.empty()) {
        tooltip = d3.select("body").append("div")
            .attr("id", "tooltip")
            .style("font-family", "var(--bs-body-font-family)")
            .style("position", "absolute")
            .style("visibility", "hidden")
            .style("background", "rgba(0, 0, 0, 0.9)")
            .style("color", "white")
            .style("padding", "12px")
            .style("border-radius", "8px")
            .style("font-size", "12px")
            .style("transition", "opacity 0.3s")
            .style("max-width", "200px")
            .style("box-shadow", "0 4px 12px rgba(0,0,0,0.3)")
            .style("pointer-events", "none")
            .style("z-index", "1000");
    }

    // Function to calculate hotel type statistics
    function calculateHotelTypeStats(dataset) {
        const stats = {};
        const groupedData = d3.group(dataset, d => d.hotel);

        groupedData.forEach((records, hotelType) => {
            const totalBookings = records.length;
            const cancellations = records.filter(d => +d.is_canceled === 1).length;
            const cancellationRate = ((cancellations / totalBookings) * 100).toFixed(1);

            stats[hotelType] = {
                type: hotelType === "City Hotel" ? "City Hotel" : "Resort Hotel",
                totalBookings: totalBookings,
                cancellations: cancellations,
                cancellationRate: parseFloat(cancellationRate),
                color: hotelType === "City Hotel" ? "#FF007F" : "#3498db"
            };
        });

        return Object.values(stats);
    }

    // Filter data by selected year if not 'all'
    const filteredData = selectedYear === "all"
        ? data
        : data.filter(d => String(d.arrival_date_year) === selectedYear);

    // Prepare the data
    const currentData = calculateHotelTypeStats(filteredData);

    // Create pack layout
    const pack = d3.pack()
        .size([width - 60, height - 60])  
        .padding(20); 

    // Create hierarchy
    const root = d3.hierarchy({ children: currentData })
        .sum(d => d.cancellations);

    // Generate packed layout
    const nodes = pack(root).leaves();

    // Create bubbles group
    const bubbles = svg.selectAll(".bubble")
        .data(nodes)
        .enter()
        .append("g")
        .attr("class", "bubble")
        .attr("transform", d => `translate(${d.x + 30}, ${d.y + 30})`);

    // Add circles with hover effects
    bubbles.append("circle")
        .attr("r", 0)
        .attr("fill", d => d.data.color)
        .attr("stroke", "white")
        .attr("stroke-width", 2)
        .style("filter", "drop-shadow(0 4px 8px rgba(0,0,0,0.2))")
        .style("cursor", "pointer")
        .style("transition", "all 0.3s ease")
        .on("mouseover", function (event, d) {
            // Enhanced hover effect
            d3.select(this)
                .transition()
                .duration(200)
                .attr("stroke", "#2c3e50")
                .attr("stroke-width", 4)
                .style("filter", "drop-shadow(0 6px 16px rgba(0,0,0,0.4))")
                .attr("transform", "scale(1.05)");

            // Show tooltip with PLAIN formatting
            tooltip.html(`
                <div style="font-weight: bold; margin-bottom: 8px; font-size: 14px;">
                    ${d.data.type}
                </div>
                <div style="margin-bottom: 4px;">
                    <span style="font-weight: bold;">Total Bookings:</span> 
                    ${d.data.totalBookings.toLocaleString()}
                </div>
                <div style="margin-bottom: 4px;">
                    <span style="font-weight: bold;">Cancellations:</span> 
                    ${d.data.cancellations.toLocaleString()}
                </div>
                <div>
                    <span style="font-weight: bold;">Cancellation Rate:</span> 
                    ${d.data.cancellationRate}%
                </div>
            `)
                .style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 100) + "px")
                .style("visibility", "visible")
                .style("opacity", 0)
                .transition()
                .duration(200)
                .style("opacity", 1);
        })
        .on("mousemove", function (event) {
            // Update tooltip position as mouse moves
            tooltip
                .style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 100) + "px");
        })
        .on("mouseout", function () {
            // Reset hover effect
            d3.select(this)
                .transition()
                .duration(200)
                .attr("stroke", "white")
                .attr("stroke-width", 2)
                .style("filter", "drop-shadow(0 4px 8px rgba(0,0,0,0.2))")
                .attr("transform", "scale(1)");

            // Hide tooltip
            tooltip
                .transition()
                .duration(150)
                .style("opacity", 0)
                .on("end", function () {
                    tooltip.style("visibility", "hidden");
                });
        })
        .transition()
        .duration(1000)
        .delay((d, i) => i * 200)
        .attr("r", d => d.r)
        .ease(d3.easeBackOut);

    // Add main text labels (Hotel Type)
    bubbles.append("text")
        .attr("class", "bubble-text")
        .attr("dy", "-0.5em")
        .text(d => d.data.type)
        .style("font-size", d => Math.min(d.r / 3.5, 20) + "px")
        .style("font-weight", "600")
        .style("fill", "white")
        .style("text-anchor", "middle")
        .style("dominant-baseline", "middle")
        .style("pointer-events", "none")
        .style("text-shadow", "1px 1px 2px rgba(0,0,0,0.5)")
        .style("opacity", 0)
        .transition()
        .duration(1000)
        .delay((d, i) => i * 200 + 500)
        .style("opacity", 1);

    // Add cancellation count
    bubbles.append("text")
        .attr("class", "bubble-subtext")
        .attr("dy", "1.8em")
        .text(d => `${d.data.cancellations.toLocaleString()} Cancellations`)
        .style("font-size", d => Math.min(d.r / 5.5, 14) + "px")
        .style("font-weight", "bold")
        .style("fill", "white")
        .style("text-anchor", "middle")
        .style("dominant-baseline", "middle")
        .style("pointer-events", "none")
        .style("text-shadow", "1px 1px 2px rgba(0,0,0,0.5)")
        .style("opacity", 0)
        .transition()
        .duration(1000)
        .delay((d, i) => i * 200 + 700)
        .style("opacity", 1);
}