export function renderCancellationMap(data, selectedYear) {
    d3.json("data/world.geojson").then(world => {
        // Set SVG dimensions and select the CORRECT map container
        const width = 800;
        const height = 400;

        // Clear existing content first
        d3.select("#cancellation-map").selectAll("*").remove();

        // Create SVG element inside the div - FIXED SELECTOR
        const svg = d3.select("#cancellation-map")
            .append("svg")
            .attr("viewBox", `0 0 ${width} ${height}`)
            .attr("preserveAspectRatio", "xMidYMid meet")
            .style("width", "100%")
            .style("height", "100%")
            .style("max-height", "500px")
            .style("display", "block");

        // Update the card title based on selected year
        updateChartTitle(selectedYear);

        function updateChartTitle(selectedYear) {
            // Find the card header - FIXED SELECTOR
            const cardHeader = d3.select("#cancellation-map")
                .node()
                ?.closest('.card')
                ?.querySelector('.card-header h5');

            if (cardHeader) {
                let titleText = "Hotel Cancellation Volume by Country";
                if (selectedYear === 'all') {
                    titleText += " (All Years)";
                } else {
                    titleText += ` (${selectedYear})`;
                }
                cardHeader.textContent = titleText;
            }
        }

        // Set the tooltip
        let tooltip = d3.select("body").select("#map-tooltip");
        if (tooltip.empty()) {
            tooltip = d3.select("body").append("div")
                .attr("id", "map-tooltip")
                .attr("class", "map-tooltip")
                .style("font-family", "var(--bs-body-font-family)")
                .style("position", "absolute")
                .style("background", "rgba(0, 0, 0, 0.9)")
                .style("color", "white")
                .style("padding", "12px")
                .style("border-radius", "8px")
                .style("font-size", "12px")
                .style("pointer-events", "none")
                .style("transition", "opacity 0.3s")
                .style("max-width", "200px")
                .style("box-shadow", "0 4px 12px rgba(0, 0, 0, 0.3)")
                .style("z-index", "1000");
        }

        // Group data by year and country
        const cancellationStats = new Map();

        data.forEach(d => {
            const year = d.arrival_date_year;
            const country = d.country;
            const isCanceled = +d.is_canceled; // Convert to number

            if (!cancellationStats.has(year)) {
                cancellationStats.set(year, new Map());
            }
            const yearMap = cancellationStats.get(year);

            if (!yearMap.has(country)) {
                yearMap.set(country, { total: 0, canceled: 0 });
            }
            const stats = yearMap.get(country);

            stats.total++;
            if (isCanceled === 1) {
                stats.canceled++;
            }
        });

        // Function to compute cancellation rates for a selected year or all years
        function getCancellationRates(year) {
            if (year === "all") {
                const allData = new Map();
                for (let [_, countryMap] of cancellationStats.entries()) {
                    for (let [country, stats] of countryMap.entries()) {
                        if (!allData.has(country)) {
                            allData.set(country, { total: 0, canceled: 0 });
                        }
                        const agg = allData.get(country);
                        agg.total += stats.total;
                        agg.canceled += stats.canceled;
                    }
                }
                return allData;
            } else {
                return cancellationStats.get(+year) || new Map();
            }
        }

        // Define color scale based on cancellation volume thresholds
        function getColorByVolume(volume) {
            if (volume < 50) return "#e3f2fd";
            if (volume >= 50 && volume <= 200) return "#90caf9";
            if (volume >= 201 && volume <= 1000) return "#42a5f5";
            if (volume >= 1001 && volume <= 5000) return "#1976d2";
            if (volume >= 5000) return "#0d47a1";
            return "#A9A9A9"; // No data
        }

        // Creates a Natural Earth projection and fits the GeoJSON data to the SVG dimensions
        const projection = d3.geoNaturalEarth1().fitExtent([[10, 10], [width - 10, height - 10]], world);
        const path = d3.geoPath().projection(projection);

        // Add a group to hold the map content
        const mapGroup = svg.append("g");
        const countries = world.features;

        // Create legend
        function createLegend(maxVolume) {
            // Remove existing legend
            d3.select("#map-legend").remove();

            const mapContainer = d3.select("#cancellation-map").node();
            // Create legend container next to the map
            const legendContainer = d3.select(mapContainer)
                .append("div")
                .attr("id", "map-legend")
                .style("position", "absolute")
                .style("bottom", "15px")
                .style("left", "12px")
                .style("max-width", "100px")
                .style("background", "rgba(255, 255, 255, 0.95)")
                .style("padding", "10px")
                .style("border-radius", "5px")
                .style("box-shadow", "0 2px 10px rgba(0,0,0,0.1)")
                .style("backdrop-filter", "blur(5px)")
                .style("z-index", "10");

            // Legend title
            legendContainer.append("h6")
                .style("margin", "0 0 6px 0")
                .style("font-weight", "600")
                .style("color", "#2c3e50")
                .style("font-size", "10px")
                .text("Cancellation Volume");

            // Define legend data
            const legendData = [
                { range: "< 50", color: "#e3f2fd" },
                { range: "50 - 200", color: "#90caf9" },
                { range: "201 - 1000", color: "#42a5f5" },
                { range: "1001 - 5000", color: "#1976d2" },
                { range: "5000+", color: "#0d47a1" },
                { range: "No Data", color: "#A9A9A9" }
            ];

            const legendItems = legendContainer.selectAll(".legend-item")
                .data(legendData)
                .enter()
                .append("div")
                .attr("class", "legend-item")
                .style("display", "flex")
                .style("align-items", "center")
                .style("margin-bottom", "3px");

            legendItems.append("div")
                .style("width", "10px")
                .style("height", "10px")
                .style("background-color", d => d.color)
                .style("border", "1px solid #ccc")
                .style("margin-right", "5px")
                .style("border-radius", "2px");

            legendItems.append("span")
                .style("font-size", "10px")
                .style("color", "#555")
                .text(d => d.range);
        }

        // Function to render map by year
        function renderMap(year) {
            const currentRates = getCancellationRates(year);
            const rateValues = Array.from(currentRates.values()).map(d => (d.canceled / d.total) * 100);
            const volumeValues = Array.from(currentRates.values()).map(d => d.canceled);

            const avg = d3.mean(rateValues);
            const max = d3.max(rateValues);
            const maxVolume = d3.max(volumeValues) || 0;

            // Clear previous paths
            mapGroup.selectAll("path").remove();

            // Draw countries
            mapGroup.selectAll("path")
                .data(countries)
                .join("path")
                .attr("class", "country")
                .attr("d", path)
                .attr("fill", d => {
                    const iso = d.id;
                    const stats = currentRates.get(iso);
                    if (!stats) {
                        return "#A9A9A9";
                    }
                    const volume = stats.canceled;
                    return getColorByVolume(volume);
                })
                .attr("stroke", "#fff")
                .attr("stroke-width", 0.5)
                .style("cursor", "pointer")
                .on("mouseover", (event, d) => {
                    const iso = d.id;
                    const stats = currentRates.get(iso);
                    const countryName = d.properties.name;

                    d3.select(event.currentTarget)
                        .attr("stroke", "#2c3e50")
                        .attr("stroke-width", 2);

                    let html = `<div style="font-weight: bold; margin-bottom: 8px; font-size: 14px;">
                                    <strong>${countryName}</strong>
                                </div>`;
                    if (stats) {
                        const rate = (stats.canceled / stats.total) * 100;
                        html += `<div style="margin-bottom: 4px;">
                                    <span style="font-weight: bold;">Cancellations:</span> 
                                    ${stats.canceled.toLocaleString()}
                                </div>`
                            + `<div style="margin-bottom: 4px;">
                                    <span style="font-weight: bold;">Cancellation Rate:</span> 
                                    ${rate.toFixed(1)}%
                                </div>`
                            + `<div>
                                    <span style="font-weight: bold;">Total:</span> 
                                    ${stats.total.toLocaleString()}
                                </div>`;
                    } else {
                        html += `No Data Available`;
                    }

                    tooltip.html(html)
                        .style("left", (event.pageX + 15) + "px")
                        .style("top", (event.pageY - 28) + "px")
                        .style("visibility", "visible")
                        .style("opacity", 0)
                        .transition()
                        .duration(200)
                        .style("opacity", 1);
                })
                .on("mousemove", (event) => {
                    tooltip
                        .style("left", (event.pageX + 15) + "px")
                        .style("top", (event.pageY - 28) + "px");
                })
                .on("mouseout", (event) => {
                    d3.select(event.currentTarget)
                        .attr("stroke", "#fff")
                        .attr("stroke-width", 0.5);
                    tooltip.transition()
                        .duration(150)
                        .style("opacity", 0)
                        .on("end", function () {
                            tooltip.style("visibility", "hidden");
                        });
                });

            // Create legend
            createLegend(maxVolume);
        }

        // Define zoom behavior
        const zoom = d3.zoom()
            .scaleExtent([1, 8])
            .on("zoom", (event) => {
                mapGroup.attr("transform", event.transform);
            });

        // Apply zoom behavior to the SVG
        svg.call(zoom);

        // Initial render
        renderMap(selectedYear);
    }).catch(error => {
        console.error("Error loading world.geojson:", error);
        // Display error message in the map container
        d3.select("#cancellation-map")
            .append("div")
            .style("padding", "20px")
            .style("text-align", "center")
            .style("color", "#dc3545")
            .html("<h5>Error Loading Map Data...</h5><p>Please check if the world.geojson file exists in the data folder.</p>");
    });
}