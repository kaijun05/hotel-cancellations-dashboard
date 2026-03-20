export function renderCancellationSummaryTable(data, selectedYear) {
  // Clear existing table before re-rendering
  d3.select("#summary-table").html("");  // Clear all contents

  // Update the card title based on selected year
  updateChartTitle(selectedYear);

  function updateChartTitle(selectedYear) {
    // Find the card header for the monthly cancellation chart
    const cardHeader = d3.select("#summary-table")
      .node()
      .closest('.card')
      .querySelector('.card-header h5');

    if (cardHeader) {
      let titleText = "Monthly Trends";
      if (selectedYear === 'all') {
        titleText += " (All Years)";
      } else {
        titleText += ` (${selectedYear})`;
      }
      cardHeader.textContent = titleText;
    }
  }

  // Mapping the months to numbers
  const monthNameToNumber = {
    'January': '01', 'February': '02', 'March': '03', 'April': '04',
    'May': '05', 'June': '06', 'July': '07', 'August': '08',
    'September': '09', 'October': '10', 'November': '11', 'December': '12'
  };

  const filteredData = selectedYear === 'all'
    ? data
    : data.filter(d => +d.arrival_date_year === +selectedYear);

  // Calculate monthly cancellation rates
  const bookingsGroupedByMonth = d3.group(filteredData, d => d.arrival_date_year, d => d.arrival_date_month);
  const monthlyCancellationSummary = [];

  bookingsGroupedByMonth.forEach((yearBookings, year) => {
    yearBookings.forEach((monthBookings, monthName) => {
      // Count total and canceled bookings for this month
      const total = monthBookings.length;
      const canceled = monthBookings.filter(b => +b.is_canceled === 1).length;

      // Calculate cancellation rate (as decimal: 0.0 to 1.0)
      const rate = canceled / total;

      // Create summary record
      monthlyCancellationSummary.push({
        year,
        monthNumber: monthNameToNumber[monthName],
        displayLabel: selectedYear === 'all' ? `${monthName.slice(0, 3)} ${year}` : `${monthName.slice(0, 3)}`,
        totalBookings: total,
        canceledBookings: canceled,
        cancellationRate: rate
      });
    });
  });

  // Sort chronologically
  monthlyCancellationSummary.sort((a, b) => a.year - b.year || a.monthNumber - b.monthNumber);

  // Draw table
  // Create table structure
  const scrollContainer = d3.select("#summary-table")
    .append("div")
    .attr("class", "summary-scroll-container");
  const table = scrollContainer
    .append("table")
    .attr("class", "summary-table");
  const header = table.append("thead").append("tr");
  const headers = selectedYear === 'all' ? ["Period", "Cancellation Rate", "MoM Change"] : ["Month", "Cancellation Rate", "MoM Change"];
  header.selectAll("th").data(headers).enter().append("th").text(d => d);

  const body = table.append("tbody");
  let prevRate = null;

  // Populate table rows
  monthlyCancellationSummary.forEach(month => {
    // Calculate month-over-month change
    let mom = prevRate !== null ? (month.cancellationRate - prevRate) * 100 : null;

    const row = body.append("tr");

    // Period/Month column
    row.append("td").text(month.displayLabel);
    // Cancellation Rate column (convert decimal to percentage)
    row.append("td").text((month.cancellationRate * 100).toFixed(1) + "%");
    // Month-over-Month Change column
    const changeCell = row.append("td");

    // Color coding: Red = increase (bad), Green = decrease (good), Gray = no change
    if (prevRate !== null) {
      const text = (mom >= 0 ? "+" : "") + mom.toFixed(1) + "%";
      changeCell.text(text).style("color", mom > 0 ? "#d73027" : mom < 0 ? "#1a9850" : "#999999").style("font-weight", "bold");
    } else {
      changeCell.text("--").style("color", "#999999"); // First month has no previous comparison
    }

    // Store current rate for next iteration
    prevRate = month.cancellationRate;
  });
}