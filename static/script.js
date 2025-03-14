document.addEventListener('DOMContentLoaded', function() {
    // Initialize the form with current date
    initializeForm();
    
    // Add event listeners
    document.getElementById('fill-dummy-data').addEventListener('click', fillDummyData);
    document.getElementById('prediction-form').addEventListener('submit', handleSubmit);
    
    // Hide results section initially
    document.getElementById('results-section').style.display = 'none';
});

function initializeForm() {
    // Set current date and time
    const now = new Date();
    const dateTimeString = now.toISOString().slice(0, 16);
    document.getElementById('start-date').value = dateTimeString;
    
    // Generate historical data input fields
    const historicalDataInputs = document.getElementById('historical-data-inputs');
    
    for (let i = 0; i < 24; i++) {
        const hourIndex = 23 - i;  // Reverse order (most recent first)
        const hourTime = new Date(now.getTime() - (i + 1) * 60 * 60 * 1000);
        const hourString = hourTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${hourString}</td>
            <td><input type="number" name="temp_${hourIndex}" min="-50" max="150" step="0.1" required></td>
            <td><input type="number" name="humidity_${hourIndex}" min="0" max="100" step="0.1" required></td>
            <td><input type="number" name="wind_${hourIndex}" min="0" max="200" step="0.1" required></td>
            <td><input type="number" name="precip_${hourIndex}" min="0" max="100" step="0.1" required></td>
            <td><input type="checkbox" name="weekend_${hourIndex}" value="1"></td>
        `;
        
        historicalDataInputs.appendChild(row);
    }
}

function fillDummyData() {
    // Generate realistic dummy data for all inputs
    for (let i = 0; i < 24; i++) {
        // Temperature varies between 60-85°F with some hourly fluctuation
        const baseTemp = 70 + Math.sin(i / 4) * 10;
        const temp = baseTemp + (Math.random() * 5 - 2.5);
        
        // Humidity varies between 40-80% with some correlation to temperature
        const humidity = 60 + (Math.random() * 20) - ((temp - 70) * 1.5);
        
        // Wind speed between 5-15 mph
        const windSpeed = 5 + Math.random() * 10;
        
        // Precipitation mostly 0, but occasionally up to 0.5
        const precipitation = Math.random() > 0.8 ? Math.random() * 0.5 : 0;
        
        // Weekend/Holiday (roughly 2/7 days)
        const isWeekend = Math.random() > 0.7;
        
        // Set the form values
        document.querySelector(`input[name="temp_${i}"]`).value = temp.toFixed(1);
        document.querySelector(`input[name="humidity_${i}"]`).value = Math.min(100, Math.max(0, humidity)).toFixed(1);
        document.querySelector(`input[name="wind_${i}"]`).value = windSpeed.toFixed(1);
        document.querySelector(`input[name="precip_${i}"]`).value = precipitation.toFixed(1);
        document.querySelector(`input[name="weekend_${i}"]`).checked = isWeekend;
    }
}

function handleSubmit(event) {
    event.preventDefault();
    
    // Show loading indicator
    document.getElementById('results-section').style.display = 'block';
    document.getElementById('loader').style.display = 'block';
    
    // Get form data
    const formData = new FormData(event.target);
    
    // Make AJAX request to server
    fetch('/predict', {
        method: 'POST',
        body: formData
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        // Hide loader
        document.getElementById('loader').style.display = 'none';
        
        // Display results
        displayResults(data);
    })
    .catch(error => {
        console.error('Error:', error);
        document.getElementById('loader').style.display = 'none';
        alert('An error occurred while making the prediction. Please try again.');
    });
}

function displayResults(data) {
    // Display prediction chart
    createChart(data.timestamps, data.predictions);
    
    // Display prediction table
    const tableBody = document.getElementById('prediction-results');
    tableBody.innerHTML = '';
    
    for (let i = 0; i < data.timestamps.length; i++) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${data.timestamps[i]}</td>
            <td>${data.predictions[i].toFixed(2)} MW</td>
        `;
        tableBody.appendChild(row);
    }
}

function createChart(labels, values) {
    // Get the canvas element
    const ctx = document.getElementById('prediction-chart').getContext('2d');
    
    // Check if chart already exists and destroy it
    if (window.predictionChart) {
        window.predictionChart.destroy();
    }
    
    // Create a new chart
    window.predictionChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Predicted Energy Consumption (MW)',
                data: values,
                backgroundColor: 'rgba(42, 82, 152, 0.2)',
                borderColor: 'rgba(42, 82, 152, 1)',
                borderWidth: 2,
                pointRadius: 3,
                pointBackgroundColor: 'rgba(42, 82, 152, 1)',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: false,
                    title: {
                        display: true,
                        text: 'Energy Consumption (MW)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Time'
                    },
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Energy Consumption Forecast',
                    font: {
                        size: 16
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Energy: ${context.parsed.y.toFixed(2)} MW`;
                        }
                    }
                }
            }
        }
    });
}