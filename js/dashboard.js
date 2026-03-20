// dashboard.js
import { renderSummaryKPIs } from './summary_kpi.js';
import { renderCancellationSummaryTable } from './summary_table.js';
import { renderHotelTypeCancellationComparison } from './hotel_type_comparison.js';
import { renderCancellationMap } from './hotel_cancellation_rate.js';
import { renderMonthlyCancellationLineChart } from './monthly_line.js';
import { renderCancellationRateLeadTime } from './cancellation_rate_lead_time_heatmap.js';
import { renderDepositTypeChart } from './deposit_type.js';
import { renderBookingOutcomesChart } from './booking_outcomes.js';
import { renderMarketSegmentChart } from './market_segment.js';
import { renderAdrByCancellationStatusChart } from './adr_cancellation.js';

class DashboardController {
  constructor() {
    this.data = null;
    this.filteredData = null;
    this.charts = {};
    this.filters = { year: 'all', country: 'all'};
    this.init();
  }

  async init() {
    try {
      const [csvData, geoData] = await Promise.all([
        d3.csv("./data/Cleaned_Hotel_Booking_Demand_Dataset.csv", d => ({
          ...d,
          adr: +d.adr,
          is_canceled: +d.is_canceled,
          arrival_date_year: +d.arrival_date_year
        })),
        d3.json("./data/world.geojson")
      ]);

      if (!csvData || csvData.length === 0) throw new Error("Dataset is empty or not found.");

      this.data = csvData;

      // Create a lookup map: { "PRT": "Portugal", "GBR": "United Kingdom", ... }
      this.countryLookup = {};
      geoData.features.forEach(feature => {
        // Use 'id'
        const code = feature.id || feature.properties.name; 
        const name = feature.properties.name;
        this.countryLookup[code] = name;
      });

      // Prepare the UI
      this.populateCountryDropdown();
      this.setupFilters();
      this.initCharts();
      this.applyFilters();
    } catch (err) {
      console.error("Error Loading Data:", err);
    }
  }

  populateCountryDropdown() {
    const countrySelect = document.getElementById('country-select');
    if (!countrySelect) return;

    // Get unique country IDs, filter out nulls and sort it alphabetically
    // ... converts the Set to Array to use array methods like .filter()
    const uniqueCodes = [...new Set(this.data.map(d => d.country))] 
      .filter(c => c && c.trim() !== "")  // "=>" as the word "becomes", return True if not empty
      .sort();  // sort by alphabetical order

    uniqueCodes.forEach(code => {
      const option = document.createElement('option');
      option.value = code;
      // Use the name from the lookup, fallback to the code if not found
      option.textContent = this.countryLookup[code] || code;
      countrySelect.appendChild(option);
    })
  }

  setupFilters() {
    const yearSelect = document.getElementById('year-select');
    const countrySelect = document.getElementById('country-select');

    if (yearSelect) {
      yearSelect.value = 'all';
      this.filters.year = 'all';

      yearSelect.addEventListener('change', () => {
        this.filters.year = yearSelect.value;
        this.applyFilters();
      });
    }
    
    if (countrySelect) {
      countrySelect.value = 'all';
      this.filters.country = 'all';

      countrySelect.addEventListener('change', () => {
        this.filters.country = countrySelect.value;
        this.applyFilters();
      });
    }
  }

  applyFilters() {
    // Apply dual-filtering logic: (Year Match) AND (Country Match)
    this.filteredData = this.data.filter(d => {
      const yearMatch = this.filters.year === 'all' || d.arrival_date_year === +this.filters.year;
      const countryMatch = this.filters.country === 'all' || d.country === this.filters.country;
      return yearMatch && countryMatch;
    });

    // Update the main header text
    this.updatePageTitle();

    // Re-draw all charts
    this.renderCharts();
  }

  initCharts() {
    this.charts.summaryKPI = renderSummaryKPIs;
    this.charts.monthlyCancellation = renderMonthlyCancellationLineChart;
    this.charts.cancellationSummary = renderCancellationSummaryTable;
    this.charts.leadTimeCancellation = renderCancellationRateLeadTime;

    this.charts.depositType = renderDepositTypeChart;
    this.charts.marketSegment = renderMarketSegmentChart;
    this.charts.hotelTypeCancellation = renderHotelTypeCancellationComparison;
    this.charts.hotelCancellationRate = renderCancellationMap;
    this.charts.bookingOutcomes = renderBookingOutcomesChart;
    this.charts.adrCancellation = renderAdrByCancellationStatusChart;
  }

  renderCharts() {
    try {
      const animateChart = (containerId) => {
        const container = document.getElementById(containerId);
        if (!container) return;
        container.classList.remove("fade-in");
        void container.offsetWidth;
        container.classList.add("fade-in");
      };

      animateChart("summary-kpi");
      this.charts.summaryKPI(this.filteredData, this.filters.year);

      animateChart("monthly-cancellation-chart");
      this.charts.monthlyCancellation(this.filteredData, this.filters.year);

      animateChart("summary-table");
      this.charts.cancellationSummary(this.filteredData, this.filters.year);

      animateChart("lead-time-chart");
      this.charts.leadTimeCancellation(this.filteredData, this.filters.year);

      animateChart("deposit-type-chart");
      d3.select("#deposit-type-chart").selectAll("*").remove();
      this.charts.depositType(this.filteredData, this.filters.year);

      animateChart("market-segment-chart");
      d3.select("#market-segment-chart").selectAll("*").remove();
      this.charts.marketSegment(this.filteredData, this.filters.year);

      animateChart("hotel-type-cancellation-bubble");
      d3.select("#hotel-type-cancellation-bubble").selectAll("*").remove();
      this.charts.hotelTypeCancellation(this.filteredData, this.filters.year);

      animateChart("cancellation-map");
      d3.select("#cancellation-map").selectAll("*").remove();
      this.charts.hotelCancellationRate(this.filteredData, this.filters.year);

      animateChart("booking-outcomes");
      d3.select("#booking-outcomes").selectAll("*").remove();
      this.charts.bookingOutcomes(this.filteredData, this.filters.year);

      animateChart("adr-cancellation");
      d3.select("#adr-cancellation").selectAll("*").remove();
      this.charts.adrCancellation(this.filteredData, this.filters.year);
    } catch (error) {
      console.error("Error in renderCharts:", error);
    }
  }

  updatePageTitle() {
    const titleElement = document.getElementById('main-title');
    if (!titleElement) return;

    const baseTitle = "Booked Today, Gone Tomorrow? Insights on Hotel Cancellations";
    
    // Logic for Country Name
    const countryName = this.filters.country === 'all' 
        ? "All Countries" 
        : (this.countryLookup[this.filters.country] || this.filters.country);

    // Update the text
    titleElement.textContent = `${baseTitle} [${countryName}]`;
  }
}

let dashboard;

document.addEventListener("DOMContentLoaded", function () {
  dashboard = new DashboardController();

  const analysisTab = document.querySelector('button[data-bs-target="#analysis"]');
  const overviewTab = document.querySelector('button[data-bs-target="#overview"]');

  let debounceTimeout;
  const debounceRender = () => {
    if (debounceTimeout) clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
      dashboard.renderCharts();
    }, 150);
  };

  analysisTab?.addEventListener('shown.bs.tab', debounceRender);
  overviewTab?.addEventListener('shown.bs.tab', debounceRender);
});
