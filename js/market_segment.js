export function renderMarketSegmentChart(data, selectedYear) {
  d3.select("#market-segment-chart").selectAll("*").remove();
  d3.selectAll(".market-tooltip").remove();

  updateChartTitle(selectedYear);

  function updateChartTitle(selectedYear) {
    const cardHeader = d3.select("#market-segment-chart")
      .node()
      .closest('.card')
      .querySelector('.card-header h5');

    if (cardHeader) {
      let titleText = "Bookings Cancellation by Market Segment";
      titleText += selectedYear === 'all' ? " (All Years)" : ` (${selectedYear})`;
      cardHeader.textContent = titleText;
    }
  }

  const grouped = d3.rollups(
    data.filter(d => d.market_segment && d.market_segment !== 'Undefined' && d.market_segment.trim() !== ''),
    v => ({
      cancelled: v.filter(d => d.is_canceled === 1).length,
      notCancelled: v.filter(d => d.is_canceled === 0).length
    }),
    d => d.market_segment
  );

  let finalData = grouped.map(([segment, counts]) => ({
    segment,
    Cancelled: counts.cancelled,
    "Not Cancelled": counts.notCancelled,
    total: counts.cancelled + counts.notCancelled,
    rate: counts.cancelled / (counts.cancelled + counts.notCancelled)
  }));

  // Default sort by total bookings (descending)
  let currentSort = 'total-desc';

  function sortData(sortType) {
    switch (sortType) {
      case 'total-desc':
        finalData.sort((a, b) => b.total - a.total);
        break;
      case 'total-asc':
        finalData.sort((a, b) => a.total - b.total);
        break;
      case 'name-asc':
        finalData.sort((a, b) => a.segment.localeCompare(b.segment));
        break;
      case 'name-desc':
        finalData.sort((a, b) => b.segment.localeCompare(a.segment));
        break;
    }
    currentSort = sortType;
  }

  // Initial sort
  sortData(currentSort);

  const subgroups = ["Cancelled", "Not Cancelled"];

  // Container with sorting controls
  const container = d3.select("#market-segment-chart")
    .append("div")
    .style("width", "100%")
    .style("display", "flex")
    .style("flex-direction", "column")
    .style("align-items", "center");

  // Sorting controls
  const sortControls = container
    .append("div")
    .style("margin-bottom", "15px")
    .style("display", "flex")
    .style("align-items", "center")
    .style("gap", "10px")
    .style("flex-wrap", "wrap")
    .style("justify-content", "center");

  sortControls.append("span")
    .style("font-size", "12px")
    .style("font-weight", "600")
    .style("color", "#666")
    .text("Sort by:");

  const sortOptions = [
    { value: 'total-desc', label: 'Total Bookings ↓' },
    { value: 'total-asc', label: 'Total Bookings ↑' },
    { value: 'name-asc', label: 'Name A-Z' },
    { value: 'name-desc', label: 'Name Z-A' }
  ];

  sortOptions.forEach(option => {
    sortControls.append("button")
      .style("background", option.value === currentSort ? "#3498db" : "#f8f9fa")
      .style("color", option.value === currentSort ? "white" : "#333")
      .style("border", "1px solid #ddd")
      .style("border-radius", "4px")
      .style("padding", "4px 8px")
      .style("font-size", "11px")
      .style("cursor", "pointer")
      .style("transition", "all 0.2s")
      .text(option.label)
      .on("click", function () {
        // Update button styles
        sortControls.selectAll("button")
          .style("background", "#f8f9fa")
          .style("color", "#333");

        d3.select(this)
          .style("background", "#3498db")
          .style("color", "white");

        // Re-sort and re-render
        sortData(option.value);
        renderChart();
      })
      .on("mouseover", function () {
        if (option.value !== currentSort) {
          d3.select(this)
            .style("background", "#e9ecef")
            .style("border-color", "#adb5bd");
        }
      })
      .on("mouseout", function () {
        if (option.value !== currentSort) {
          d3.select(this)
            .style("background", "#f8f9fa")
            .style("border-color", "#ddd");
        }
      });
  });

  // Chart container
  const chartContainer = container
    .append("div")
    .style("width", "100%")
    .style("display", "flex")
    .style("justify-content", "center");

  function renderChart() {
    // Clear previous chart
    chartContainer.selectAll("*").remove();

    const groups = finalData.map(d => d.segment);

    const margin = { top: 20, right: 30, bottom: 80, left: 120 },
      width = 580 - margin.left - margin.right,
      height = 400 - margin.top - margin.bottom;

    const svg = chartContainer
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .style("display", "block")
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const y = d3.scaleBand().domain(groups).range([0, height]).padding(0.2);

    const x = d3.scaleLinear()
      .domain([0, d3.max(finalData, d => d.Cancelled + d["Not Cancelled"])])
      .nice()
      .range([0, width]);

    const color = d3.scaleOrdinal()
      .domain(subgroups)
      .range(['#e91e63', '#3498db']);

    const stackedData = d3.stack().keys(subgroups)(finalData);

    // Tooltip
    const tooltip = d3.select("body").append("div")
      .attr("class", "market-tooltip")
      .style("position", "absolute")
      .style("background", "rgba(0, 0, 0, 0.9)")
      .style("color", "white")
      .style("padding", "10px 15px")
      .style("border-radius", "8px")
      .style("font-size", "13px")
      .style("line-height", "1.4")
      .style("pointer-events", "none")
      .style("opacity", 0)
      .style("transition", "opacity 0.3s")
      .style("max-width", "250px")
      .style("box-shadow", "0 4px 12px rgba(0, 0, 0, 0.3)")
      .style("z-index", "1000");

    // Add grid lines
    svg.append("g")
      .attr("class", "grid")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x)
        .tickSize(-height)
        .tickFormat("")
        .ticks(8)
      )
      .style("stroke-dasharray", "3,3")
      .style("opacity", 0.3);

    // Y-axis with better formatting
    const yAxis = svg.append("g")
      .call(d3.axisLeft(y).tickSize(0));
    
    yAxis.selectAll("text")
      .style("font-size", "12px")
      .style("fill", "#333")
      .style("font-weight", "500")
      .each(function(d) {
        // Wrap long text labels
        const text = d3.select(this);
        const words = d.split(/\s+/);
        if (words.length > 2) {
          text.text('');
          const tspan1 = text.append('tspan').text(words.slice(0, 2).join(' '));
          const tspan2 = text.append('tspan')
            .attr('x', 0)
            .attr('dy', '1.2em')
            .text(words.slice(2).join(' '));
        }
      });

    yAxis.select(".domain").remove();

    // X-axis with better formatting
    const xAxis = svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(8).tickFormat(d3.format(",d")));
    
    xAxis.selectAll("text")
      .style("font-size", "11px")
      .style("fill", "#666");

    xAxis.select(".domain")
      .style("stroke", "#ddd");

    // Axis labels with better positioning
    svg.append("text")
      .attr("transform", `translate(${width / 2}, ${height + margin.bottom - 35})`)
      .style("text-anchor", "middle")
      .style("font-size", "13px")
      .style("font-weight", "bold")
      .style("fill", "#333")
      .text("Number of Bookings");

    svg.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2)
      .attr("y", -margin.left + 15)
      .style("text-anchor", "middle")
      .style("font-size", "13px")
      .style("font-weight", "bold")
      .style("fill", "#333")
      .text("Market Segment");

    // Draw bars with animation
    svg.selectAll("g.layer")
      .data(stackedData)
      .enter()
      .append("g")
      .attr("fill", d => color(d.key))
      .selectAll("rect")
      .data(d => d)
      .enter()
      .append("rect")
      .attr("y", d => y(d.data.segment))
      .attr("x", x(0))
      .attr("width", 0)
      .attr("height", y.bandwidth())
      .style("cursor", "pointer")
      .on("mouseover", function (event, d) {
        const total = d.data.Cancelled + d.data["Not Cancelled"];
        const cancelRate = (d.data.Cancelled / total * 100).toFixed(1);
        const status = d[1] - d[0] === d.data.Cancelled ? "Cancelled" : "Not Cancelled";
        
        tooltip.transition().duration(200).style("opacity", 1);
        tooltip.html(
          `<div style="font-weight: bold; margin-bottom: 4px;">${d.data.segment}</div>
           <div style="margin-bottom: 4px;"><strong>Total Bookings:</strong> ${total.toLocaleString()}</div>
           <div style="margin-bottom: 4px;"><strong>Cancelled:</strong> ${d.data.Cancelled.toLocaleString()} (${cancelRate}%)</div>
           <div style="margin-bottom: 4px;"><strong>Not Cancelled:</strong> ${d.data["Not Cancelled"].toLocaleString()} (${(100-cancelRate).toFixed(1)}%)</div>
           <div style="margin-top: 4px; font-size: 11px; color: #ccc;">Hovering: ${status}</div>`
        )
          .style("left", (event.pageX + 10) + "px")
          .style("top", (event.pageY - 40) + "px");
        
        d3.select(this).attr("opacity", 0.8);
      })
      .on("mouseout", function () {
        tooltip.transition().duration(200).style("opacity", 0);
        d3.select(this).attr("opacity", 1);
      })
      .transition()
      .duration(800)
      .delay((d, i) => i * 50)
      .attr("x", d => x(d[0]))
      .attr("width", d => x(d[1]) - x(d[0]));

    // Improved value labels with better overlap prevention
    svg.selectAll(".label-group")
      .data(stackedData)
      .enter()
      .append("g")
      .attr("class", "label-group")
      .selectAll("text")
      .data(d => d)
      .enter()
      .append("text")
      .attr("y", d => y(d.data.segment) + y.bandwidth() / 2 + 4)
      .attr("x", d => {
        const barWidth = x(d[1]) - x(d[0]);
        const value = d[1] - d[0];
        
        // Only place label inside if bar is wide enough (minimum 80px) and value is significant
        if (barWidth >= 80 && value >= 200) {
          return x(d[0]) + barWidth / 2;
        }
        // For small bars, don't show label to avoid overlap
        return null;
      })
      .attr("text-anchor", "middle")
      .style("fill", "white")
      .style("font-size", "10px")
      .style("font-weight", "600")
      .style("opacity", 0)
      .text(d => {
        const val = d[1] - d[0];
        const barWidth = x(d[1]) - x(d[0]);
        // Only show label if bar is wide enough and value is significant
        return (barWidth >= 80 && val >= 200) ? val.toLocaleString() : "";
      })
      .filter(function() { return d3.select(this).attr("x") !== null; }) // Remove elements with null x
      .transition()
      .duration(800)
      .delay((d, i) => i * 50 + 400)
      .style("opacity", 1);

    // Enhanced legend with better positioning
    const legend = svg.append("g")
      .attr("transform", `translate(${width - 345}, ${height + 60})`);

    subgroups.forEach((label, i) => {
      const legendItem = legend.append("g")
        .attr("transform", `translate(${i * 140}, 0)`);

      legendItem.append("rect")
        .attr("width", 14)
        .attr("height", 14)
        .attr("fill", color(label))
        .attr("rx", 3)
        .attr("ry", 3);

      legendItem.append("text")
        .attr("x", 20)
        .attr("y", 12)
        .text(label)
        .style("font-size", "12px")
        .style("fill", "#333")
        .style("font-weight", "500");
    });
  }

  // Initial render
  renderChart();
}