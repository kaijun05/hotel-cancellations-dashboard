# Hotel Booking Data Visualizations

This folder contains multiple interactive visualizations created using D3.js to explore hotel booking data. 

## Project Structure
```plaintext
CDS6324-Project/
├── css/ # CSS styles for charts and tables
│ ├── adr_cancellation.css
| ├── booking_outcomes.css
| ├── cancellation_rate_lead_time_heatmap.css
| ├── dashboard.css
| ├── hotel_cancellation_rate.css
| ├── hotel_type_comparison.css
| ├── market_segment.css
| ├── monthly_line.css
| ├── summary_kpi.css
│ └── summarytable.css
├── data/ # CSV datasets
│ ├── Cleaned_Hotel_Booking_Demand_Dataset.csv
│ └── world.geojson
├── js/ # JavaScript files for each visualization
│ ├── adr_cancellation.js
| ├── booking_outcomes.js
| ├── cancellation_rate_lead_time_heatmap.js
| ├── dashboard.js
| ├── hotel_cancellation_rate.js
| ├── hotel_type_comparison.js
| ├── market_segment.js
| ├── monthly_line.js
| ├── summary_kpi.js
│ └── summarytable.js
└── index.html # Dashboard html file
```

##  How to Open the Visualizations

1. Open your terminal
2. Navigate to the project directory:

- cd path/to/Project 

3. Run a simple HTTP server:
python -m http.server 8000

4. Open your browser and visit:
- http://localhost:8000/index.html
