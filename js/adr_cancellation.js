export function renderAdrByCancellationStatusChart(data, selectedYear) {
  // Clear any existing chart content
  d3.select("#adr-cancellation").selectAll("*").remove();
  d3.selectAll(".adr-tooltip").remove();

  // Update the card title based on selected year
  updateChartTitle(selectedYear);

  function updateChartTitle(selectedYear) {
    // Find the card header for the ADR cancellation chart
    const cardHeader = d3.select("#adr-cancellation")
      .node()
      ?.closest('.card')
      ?.querySelector('.card-header h5');

    if (cardHeader) {
      let titleText = "ADR vs Cancellation Rate";
      if (selectedYear === 'all') {
        titleText += " (All Years)";
      } else {
        titleText += ` (${selectedYear})`;
      }
      cardHeader.textContent = titleText;
    }
  }

  // Filter data by selected year FIRST
  let filteredData = data;
  if (selectedYear !== 'all') {
    filteredData = data.filter(d => +d.arrival_date_year === +selectedYear);
  }

  // Check if we have data
  if (!filteredData || filteredData.length === 0) {
    d3.select("#adr-cancellation")
      .append("div")
      .style("padding", "40px")
      .style("text-align", "center")
      .style("color", "#666")
      .html("<h5>No data available</h5><p>Please check your data source.</p>");
    return;
  }

  // Set dimensions and margins
  const margin = { top: 60, right: 30, bottom: 60, left: 80 },
    width = 800 - margin.left - margin.right,
    height = 405 - margin.top - margin.bottom;

  // Create chart container
  const chartContainer = d3.select("#adr-cancellation")
    .append("div")
    .attr("class", "adr-chart-container")
    .style("position", "relative");

  // Create hotel dropdown with better styling
  const dropdownContainer = chartContainer
    .append("div")
    .attr("class", "adr-dropdown-container")
    .style("margin-bottom", "15px")
    .style("text-align", "center");

  dropdownContainer
    .append("label")
    .attr("for", "hotel-dropdown")
    .attr("class", "adr-dropdown-label")
    .style("margin-right", "10px")
    .style("font-weight", "500")
    .text("Filter by Hotel Type:");

  const dropdown = dropdownContainer
    .append("select")
    .attr("id", "hotel-dropdown")
    .attr("class", "adr-dropdown form-select")
    .style("padding", "5px 10px")
    .style("border-radius", "4px")
    .style("border", "1px solid #ddd");

  // Get unique hotel types from filtered data
  const hotelTypes = [...new Set(filteredData.map(d => d.hotel))].sort();
  
  dropdown.selectAll("option")
    .data(["All Hotels", ...hotelTypes])
    .enter()
    .append("option")
    .attr("value", (d, i) => i === 0 ? "All" : d)
    .text(d => d);

  // Append SVG
  const svg = chartContainer
    .append("svg")
    .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .attr("class", "adr-chart-svg")
    .style("width", "100%")
    .style("height", "auto")
    .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

  // Tooltip
  const tooltip = d3.select("body").append("div")
    .attr("class", "adr-cancellation-tooltip")
    .style("position", "absolute")
    .style("background", "rgba(0, 0, 0, 0.9)")
    .style("color", "white")
    .style("padding", "8px 12px")
    .style("border-radius", "8px")
    .style("font-size", "14px")
    .style("pointer-events", "none")
    .style("opacity", 0)
    .style("transition", "opacity 0.3s")
    .style("max-width", "200px")
    .style("box-shadow", "0 4px 12px rgba(0, 0, 0, 0.3)")
    .style("z-index", "1000");

  // Manual color scheme - change these colors as needed
  const colorScheme = {
    'Canceled': '#e91e63',      // Pink
    'Not Canceled': '#3498db'   // Blue
  };

  // Add axis labels (static)
  svg.append("text")
    .attr("class", "x-axis-label")
    .attr("x", width / 2)
    .attr("y", height + margin.bottom - 20)
    .style("text-anchor", "middle")
    .style("font-size", "14px")
    .style("font-weight", "bold")
    .style("fill", "#333")
    .text("Cancellation Status");

  svg.append("text")
    .attr("class", "y-axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -margin.left + 20)
    .style("text-anchor", "middle")
    .style("font-size", "14px")
    .style("font-weight", "bold")
    .style("fill", "#333")
    .text("Average Daily Rate (ADR) $");

  // Update chart function
  function updateChart(dataToUse, hotelType = "All Hotels") {
    // Clear previous chart elements
    svg.selectAll(".bar").remove();
    svg.selectAll(".x-axis").remove();
    svg.selectAll(".y-axis").remove();
    svg.selectAll(".chart-title").remove();
    svg.selectAll(".value-label").remove();

    // Add dynamic title showing current filter
    svg.append("text")
      .attr("class", "chart-title")
      .attr("x", width / 2)
      .attr("y", -20)
      .style("text-anchor", "middle")
      .style("font-size", "16px")
      .style("font-weight", "bold")
      .style("fill", "#2c3e50")
      .text(hotelType === "All Hotels" ? "All Hotel Types" : hotelType);

    // Process data - filter out invalid ADR values and convert to numbers
    const validData = dataToUse.filter(d => {
      const adr = +d.adr;
      return adr && adr > 0 && !isNaN(adr);
    });

    if (validData.length === 0) {
      svg.append("text")
        .attr("x", width / 2)
        .attr("y", height / 2)
        .style("text-anchor", "middle")
        .style("fill", "#666")
        .text("No valid data for selected filters");
      return;
    }

    // Group data by cancellation status
    const groupedData = d3.rollups(
      validData,
      v => ({
        avgADR: d3.mean(v, d => +d.adr),
        count: v.length,
        cancellationRate: (v.filter(d => +d.is_canceled === 1).length / v.length) * 100
      }),
      d => +d.is_canceled
    ).map(([key, value]) => ({
      status: key === 1 ? "Canceled" : "Not Canceled",
      avgADR: value.avgADR,
      count: value.count,
      cancellationRate: value.cancellationRate,
      rawKey: key
    }));

    // Scales
    const x = d3.scaleBand()
      .domain(groupedData.map(d => d.status))
      .range([0, width])
      .padding(0.3);

    const maxADR = d3.max(groupedData, d => d.avgADR);
    const y = d3.scaleLinear()
      .domain([0, maxADR * 1.1])
      .nice()
      .range([height, 0]);

    // Add axes
    svg.append("g")
      .attr("class", "x-axis")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x))
      .selectAll("text")
      .style("font-size", "12px")
      .style("fill", "#333");

    svg.append("g")
      .attr("class", "y-axis")
      .call(d3.axisLeft(y).tickFormat(d => `$${d.toFixed(0)}`))
      .selectAll("text")
      .style("font-size", "12px")
      .style("fill", "#333");

    // Create bars
    const bars = svg.selectAll(".bar")
      .data(groupedData)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", d => x(d.status))
      .attr("y", height)
      .attr("width", x.bandwidth())
      .attr("height", 0)
      .attr("fill", d => colorScheme[d.status])
      .attr("stroke", "white")
      .attr("stroke-width", 2)
      .attr("rx", 4)
      .attr("ry", 4)
      .style("cursor", "pointer");

    // Animate bars
    bars.transition()
      .duration(800)
      .ease(d3.easeBackOut)
      .attr("y", d => y(d.avgADR))
      .attr("height", d => height - y(d.avgADR));

    // Add value labels on bars
    svg.selectAll(".value-label")
      .data(groupedData)
      .enter()
      .append("text")
      .attr("class", "value-label")
      .attr("x", d => x(d.status) + x.bandwidth() / 2)
      .attr("y", d => y(d.avgADR) - 5)
      .style("text-anchor", "middle")
      .style("font-size", "12px")
      .style("font-weight", "bold")
      .style("fill", "#333")
      .style("opacity", 0)
      .text(d => `$${d.avgADR.toFixed(0)}`)
      .transition()
      .delay(400)
      .duration(400)
      .style("opacity", 1);

    // Add hover effects
    bars
      .on("mouseover", function (event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("opacity", 0.8);

        tooltip
          .style("opacity", 1)
          .html(`
            <div style="margin-bottom: 8px;">
              <strong>${d.status} Bookings</strong>
            </div>
            <div style="margin-bottom: 4px;">
              <strong>Average ADR:</strong> $${d.avgADR.toFixed(2)}
            </div>
            <div style="margin-bottom: 4px;">
              <strong>Total Bookings:</strong> ${d.count.toLocaleString()}
            </div>
          `)
          .style("left", (event.pageX + 15) + "px")
          .style("top", (event.pageY - 10) + "px");
      })
      .on("mousemove", function (event) {
        tooltip
          .style("left", (event.pageX + 15) + "px")
          .style("top", (event.pageY - 10) + "px");
      })
      .on("mouseout", function () {
        d3.select(this)
          .transition()
          .duration(200)
          .attr("opacity", 1);

        tooltip
          .style("opacity", 0);
      });
  }

  // Initial chart render with filtered data
  updateChart(filteredData);

  // Dropdown interaction
  dropdown.on("change", function () {
    const selected = this.value;
    const selectedText = this.options[this.selectedIndex].text;
    const filtered = selected === "All" ? filteredData : filteredData.filter(d => d.hotel === selected);
    updateChart(filtered, selectedText);
  });
}
