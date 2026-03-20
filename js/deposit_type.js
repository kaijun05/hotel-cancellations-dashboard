export function renderDepositTypeChart(data, selectedYear) {
  // Clear any existing chart content
  d3.select("#deposit-type-chart").selectAll("*").remove();
  d3.selectAll(".deposit-tooltip").remove();

  // Filter data by selected year
  let filteredData = data;
  if (selectedYear !== 'all') {
    filteredData = data.filter(d => +d.arrival_date_year === +selectedYear);
  }

  // Check if we have data
  if (!filteredData || filteredData.length === 0) {
    d3.select("#deposit-type-chart")
      .append("div")
      .style("padding", "40px")
      .style("text-align", "center")
      .style("color", "#666")
      .html("<h5>No Data Available</h5><p>Please check your data source.</p>");
    return;
  }

  // Update the card title based on selected year
  function updateChartTitle(selectedYear) {
    const cardHeader = d3.select("#deposit-type-chart")
      .node()
      ?.closest('.card')
      ?.querySelector('.card-header h5');

    if (cardHeader) {
      let titleText = "Deposit Type Distribution";
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
  const width = 225;
  const height = 225;
  const radius = Math.min(width, height) / 2 - 60;

  // Create chart container
  const chartContainer = d3.select("#deposit-type-chart")
    .append("div")
    .attr("class", "deposit-chart-container");

  // Append SVG
  const svg = chartContainer
   .append("svg")
   .attr("class", "deposit-chart-svg")
   .attr("viewBox", `0 0 ${width} ${height}`)
   .attr("preserveAspectRatio", "xMidYMid meet")
   .style("width", "75%")
   .style("height", "auto");

  // Properly declare g variable
  const g = svg.append("g")
    .attr("transform", `translate(${width / 2}, ${height / 2})`);

  // Process data - group by deposit type
  const depositData = d3.rollups(
    filteredData,
    v => v.length,
    d => d.deposit_type
  );

  // Debug: Check what deposit types we have
  // console.log("Deposit types found:", depositData);
  // console.log("Sample data deposit_type values:", [...new Set(filteredData.map(d => d.deposit_type))]);

  const pieData = depositData.map(([key, value]) => ({
    label: key,
    value: value,
    percentage: (value / filteredData.length * 100).toFixed(1)
  }));

  // Manual color scheme
  const colorScheme = {
    'No Deposit': '#3498db',
    'Non Refund': '#e91e63',
    'Refundable': '#1e3a8a'
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
    .attr("class", "deposit-tooltip")
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

  // Generate pie data
  const pieSlices = pie(pieData);

  // Create pie slices
  const slices = g.selectAll(".slice")
    .data(pieSlices)
    .enter()
    .append("g")
    .attr("class", "slice");

  // Add paths with animation
  slices.append("path")
    .attr("class", "deposit-arc")
    .attr("fill", d => colorScheme[d.data.label] || '#95a5a6')
    .attr("stroke", "white")
    .attr("stroke-width", 3)
    .each(function(d) {
      // Store original angles
      this._startAngle = d.startAngle;
      this._endAngle = d.endAngle;
      // Start with collapsed arc
      d.startAngle = 0;
      d.endAngle = 0;
    })
    .attr("d", arc)
    .style("opacity", 0)
    .transition()
    .duration(800)
    .ease(d3.easeBackOut)
    .style("opacity", 1)
    .tween("arc", function(d) {
      const element = this;
      const startInterpolate = d3.interpolate(0, element._startAngle);
      const endInterpolate = d3.interpolate(0, element._endAngle);
      
      return function(t) {
        d.startAngle = startInterpolate(t);
        d.endAngle = endInterpolate(t);
        d3.select(element).attr("d", arc(d));
      };
    });

  // Add center text
  const centerText = g.append("g")
    .attr("class", "center-text");

  centerText.append("text")
    .attr("text-anchor", "middle")
    .attr("dy", "-0.5em")
    .style("font-size", "12px")
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
    .style("font-size", "8px")
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
        .attr("transform", function(d) {
          const centroid = arc.centroid(d);
          return `translate(${centroid[0] * 0.1}, ${centroid[1] * 0.1})`;
        })
        .style("opacity", 0.8);

      tooltip
        .style("opacity", 1)
        .html(`
          <div style="margin-bottom: 8px;">
            <strong>${d.data.label}</strong>
          </div>
          <div style="margin-bottom: 4px;">
            <strong>Count:</strong> ${d.data.value.toLocaleString()}
          </div>
          <div style="margin-bottom: 4px;">
            <strong>Percentage:</strong> ${d.data.percentage}%
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

  // Add legend
  const legend = chartContainer
    .append("div")
    .attr("class", "deposit-legend");

  pieData.forEach(d => {
    const legendItem = legend
      .append("div")
      .attr("class", "deposit-legend-item");

    // Square color indicator - only dynamic background color in JS
    legendItem
      .append("div")
      .attr("class", "deposit-legend-color")
      .style("background-color", colorScheme[d.label]);

    // Legend text
    legendItem
      .append("span")
      .text(`${d.label} (${d.value.toLocaleString()})`);
  });
}