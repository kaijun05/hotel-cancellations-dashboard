export function renderBookingOutcomesChart(data, selectedYear) {
  // Clear any existing chart content
  d3.select("#booking-outcomes").selectAll("*").remove();
  d3.selectAll(".booking-tooltip").remove();

  // Filter data by selected year
  let filteredData = data;
  if (selectedYear !== 'all') {
    filteredData = data.filter(d => +d.arrival_date_year === +selectedYear);
  }

  // Check if we have data
  if (!filteredData || filteredData.length === 0) {
    d3.select("#booking-outcomes")
      .append("div")
      .style("padding", "40px")
      .style("text-align", "center")
      .style("color", "#666")
      .html("<h5>No data available</h5><p>Please check your data source.</p>");
    return;
  }

  // Update the card title based on selected year
  function updateChartTitle(selectedYear) {
    const cardHeader = d3.select("#booking-outcomes")
      .node()
      ?.closest('.card')
      ?.querySelector('.card-header h5');

    if (cardHeader) {
      let titleText = "Booking Outcomes Overview";
      if (selectedYear === 'all') {
        titleText += " (All Years)";
      } else {
        titleText += ` (${selectedYear})`;
      }
      cardHeader.textContent = titleText;
    }
  }

  updateChartTitle(selectedYear);

  // Set dimensions and margins
  const width = 400;
  const height = 400;
  const radius = Math.min(width, height) / 2 - 40;

  // Create chart container
  const chartContainer = d3.select("#booking-outcomes")
    .append("div")
    .attr("class", "booking-outcomes-container");

  // Append SVG
  const svg = chartContainer
    .append("svg")
    .attr("class", "outcomes-chart-svg")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet")
    .style("width", "100%")
    .style("height", "auto");

  const g = svg.append("g")
    .attr("transform", `translate(${width / 2}, ${height / 2})`);

  // Process data
  const bookingOutcomes = d3.rollups(
    filteredData,
    v => v.length,
    d => +d.is_canceled === 1 ? "Canceled" : "Not Canceled"
  );

  const pieData = bookingOutcomes.map(([key, value]) => ({
    label: key,
    value: value,
    percentage: (value / filteredData.length * 100).toFixed(1)
  }));

  // Manual color scheme
  const colorScheme = {
    'Canceled': '#e91e63',      // Pink
    'Not Canceled': '#3498db'   // Blue
  };

  // Create pie generator
  const pie = d3.pie()
    .value(d => d.value)
    .sort(null);

  // Create arc generator
  const arc = d3.arc()
    .innerRadius(radius * 0.5)
    .outerRadius(radius);

  // Create tooltip
  const tooltip = d3.select("body").append("div")
    .attr("class", "booking-tooltip")
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

  // Create pie slices
  const slices = g.selectAll(".slice")
    .data(pie(pieData))
    .enter()
    .append("g")
    .attr("class", "slice");

  // Add paths
  slices.append("path")
    .attr("class", "booking-outcomes-arc")
    .attr("d", arc)
    .attr("fill", d => colorScheme[d.data.label])
    .attr("stroke", "white")
    .attr("stroke-width", 3)
    .style("opacity", 0)
    .transition()
    .duration(800)
    .ease(d3.easeBackOut)
    .style("opacity", 1)
    /* 
      Reference: https://observablehq.com/@d3/arc-tween 
      - Creating an interpolator from 0 to actual arc angles, using it over time (t), and updating the path (d) attribute with each frame.
    */
    .attrTween("d", function (d) {
      const interpolate = d3.interpolate({ startAngle: 0, endAngle: 0 }, d);
      return function (t) {
        return arc(interpolate(t));
      };
    });

  // Add center text
  const centerText = g.append("g")
    .attr("class", "center-text");

  centerText.append("text")
    .attr("text-anchor", "middle")
    .attr("dy", "-0.5em")
    .style("font-size", "24px")
    .style("font-weight", "bold")
    .style("fill", "#2c3e50")
    .style("opacity", 0)
    .text(filteredData.length.toLocaleString())
    .transition()
    .delay(400)
    .duration(400)
    .style("opacity", 1);

  centerText.append("text")
    .attr("text-anchor", "middle")
    .attr("dy", "1em")
    .style("font-size", "14px")
    .style("fill", "#7f8c8d")
    .style("opacity", 0)
    .text("Total Bookings")
    .transition()
    .delay(600)
    .duration(400)
    .style("opacity", 1);

  // Add hover effects
  slices.selectAll("path")
    .on("mouseover", function (event, d) {
      d3.select(this)
        .transition()
        .duration(200)
        .attr("transform", function (d) {
          const centroid = arc.centroid(d);
          return `translate(${centroid[0] * 0.1}, ${centroid[1] * 0.1})`;
        })
        .style("opacity", 0.8);

      tooltip
        .style("opacity", 1)
        .html(`
          <div style="margin-bottom: 8px; font-size: 14px;">
            <strong>${d.data.label}</strong>
          </div>
          <div style="margin-bottom: 4px;">
            <span style="font-weight: bold;">Count:</span> 
            ${d.data.value.toLocaleString()}
          </div>
          <div>
            <span style="font-weight: bold;">Percentage:</span> 
            ${d.data.percentage}%
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
        .attr("transform", "translate(0,0)")
        .style("opacity", 1);

      tooltip
        .style("opacity", 0);
    });

  // Add legend - Clean CSS-only approach
  const legend = chartContainer
    .append("div")
    .attr("class", "booking-outcomes-legend");

  pieData.forEach(d => {
    const legendItem = legend
      .append("div")
      .attr("class", "booking-outcomes-legend-item");

    // Square color indicator - only dynamic background color in JS
    legendItem
      .append("div")
      .attr("class", "booking-outcomes-legend-color")
      .style("background-color", colorScheme[d.label]);

    // Legend text
    legendItem
      .append("span")
      .text(`${d.label} (${d.value.toLocaleString()})`);
  });
}