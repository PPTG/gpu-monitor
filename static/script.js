// static/script.js

// Konfiguracja
let settings = {
    params: {
        temperature: true,
        power: true,
        utilization: true,
        memory: true,
        pcie: true
    },
    charts: {
        power: true,
        utilization: true
    },
    timeRange: 20,
    refreshRate: 5000  // standardowe odświeżanie co 5 sekund
};

let charts = {};
let updateInterval;

// Obsługa menu ustawień
function toggleSettings() {
    const panel = document.getElementById('settingsPanel');
    panel.classList.toggle('visible');
}

// Zamykanie menu po kliknięciu poza nim
document.addEventListener('click', (event) => {
    const panel = document.getElementById('settingsPanel');
    const button = document.querySelector('.settings-button');
    
    if (!panel.contains(event.target) && !button.contains(event.target) && panel.classList.contains('visible')) {
        panel.classList.remove('visible');
    }
});

// Tworzenie elementów wykresów
function createChartWrapper(id) {
    const wrapper = document.createElement('div');
    wrapper.className = 'chart-wrapper';
    const canvas = document.createElement('canvas');
    canvas.id = id;
    wrapper.appendChild(canvas);
    return wrapper;
}

// Konfiguracja wykresu liniowego
function createChartConfig(title, type = 'line') {
    return {
        type: type,
        data: {
            labels: [],
            datasets: []
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 750,
                easing: 'easeInOutQuart'
            },
            plugins: {
                title: {
                    display: true,
                    text: title,
                    color: '#e0e0e0'
                },
                legend: {
                    labels: {
                        color: '#e0e0e0'
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: '#404040' },
                    ticks: { color: '#e0e0e0' }
                },
                x: {
                    grid: { color: '#404040' },
                    ticks: { color: '#e0e0e0' }
                }
            }
        }
    };
}

// Konfiguracja wykresu wykorzystania
function createUtilizationChartConfig() {
    return {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Wykorzystanie GPU (%)',
                data: [],
                backgroundColor: '#4a9eff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 750,
                easing: 'easeInOutQuart'
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Wykorzystanie GPU',
                    color: '#e0e0e0'
                },
                legend: {
                    labels: {
                        color: '#e0e0e0'
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    grid: { color: '#404040' },
                    ticks: { 
                        color: '#e0e0e0',
                        callback: function(value) {
                            return value + '%';
                        }
                    }
                },
                x: {
                    grid: { color: '#404040' },
                    ticks: { color: '#e0e0e0' }
                }
            }
        }
    };
}

// Inicjalizacja wykresów
function initCharts() {
    const chartsContainer = document.getElementById('charts-container');
    if (!chartsContainer) return;
    
    chartsContainer.innerHTML = '';

    try {
        if (settings.charts.power) {
            const powerWrapper = createChartWrapper('powerChart');
            chartsContainer.appendChild(powerWrapper);
            const ctx = document.getElementById('powerChart').getContext('2d');
            charts.power = new Chart(ctx, createChartConfig('Zużycie mocy w czasie (W)'));
        }

        if (settings.charts.utilization) {
            const utilizationWrapper = createChartWrapper('utilizationChart');
            chartsContainer.appendChild(utilizationWrapper);
            const ctx = document.getElementById('utilizationChart').getContext('2d');
            charts.utilization = new Chart(ctx, createUtilizationChartConfig());
        }
    } catch (error) {
        console.error('Błąd podczas inicjalizacji wykresów:', error);
    }
}

// Wskaźniki temperatury
function getTemperatureClass(temp) {
    temp = parseFloat(temp);
    if (temp < 50) return 'temperature-normal';
    if (temp < 80) return 'temperature-warm';
    return 'temperature-hot';
}

// Parsowanie wartości
function parseValue(value, unit) {
    if (!value || value === 'N/A') return 0;
    return parseFloat(value.replace(unit, '')) || 0;
}

// Aktualizacja dashboardu
function updateDashboard(data) {
    document.getElementById('total-power').textContent = data.summary.total_power + ' W';
    document.getElementById('gpu-count').textContent = data.summary.gpu_count;
    document.getElementById('avg-temp').textContent = data.summary.average_temperature.toFixed(1) + '°C';
}

// Aktualizacja wykresów
function updateCharts(gpus) {
    if (!gpus || !Array.isArray(gpus)) return;
    
    const timestamp = new Date().toLocaleTimeString();
    
    try {
        // Wykres mocy
        if (charts.power && settings.charts.power) {
            if (charts.power.data.labels.length > settings.timeRange) {
                charts.power.data.labels.shift();
                charts.power.data.datasets.forEach(dataset => dataset.data.shift());
            }
            
            charts.power.data.labels.push(timestamp);
            
            gpus.forEach((gpu, index) => {
                if (!charts.power.data.datasets[index]) {
                    charts.power.data.datasets[index] = {
                        label: `GPU ${index}`,
                        data: [],
                        borderColor: `hsl(${index * 360 / gpus.length}, 70%, 60%)`,
                        tension: 0.4,
                        fill: false
                    };
                }
                const powerValue = parseFloat(gpu.power.power_draw);
                charts.power.data.datasets[index].data.push(powerValue);
            });
            
            charts.power.update();
        }

        // Wykres wykorzystania
        if (charts.utilization && settings.charts.utilization) {
            charts.utilization.data.labels = gpus.map((gpu, index) => `GPU ${index}`);
            charts.utilization.data.datasets[0].data = gpus.map(gpu => 
                parseFloat(gpu.utilization.gpu_util)
            );
            charts.utilization.update();
        }
    } catch (error) {
        console.error('Błąd podczas aktualizacji wykresów:', error);
    }
}

// Aktualizacja informacji o GPU
function updateGPUInfo() {
    fetch('/api/gpu')
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                console.error(data.error);
                return;
            }

            const gpus = data.gpus;
            updateDashboard(data);
            updateCharts(gpus);

            const container = document.getElementById('gpu-container');
            container.innerHTML = '';

            gpus.forEach((gpu, index) => {
                const gpuUtil = parseValue(gpu.utilization.gpu_util, ' %');
                const memUtil = parseValue(gpu.utilization.memory_util, ' %');
                const temperature = parseValue(gpu.temperature.gpu_temp, ' C');
                const power = parseValue(gpu.power.power_draw, ' W');
                
                const card = document.createElement('div');
                card.className = 'gpu-card';
                card.innerHTML = `
                    <div class="card-header">
                        <span class="gpu-name">${gpu.name}</span>
                        <span class="metric-value ${getTemperatureClass(temperature)}">${temperature}°C</span>
                    </div>
                    <div class="metric-grid">
                        <div class="metric">
                            <div class="metric-label">Wykorzystanie GPU</div>
                            <div class="metric-value">${gpuUtil}%</div>
                            <div class="bar-container">
                                <div class="bar" style="width: ${gpuUtil}%"></div>
                            </div>
                        </div>
                        <div class="metric">
                            <div class="metric-label">Wykorzystanie pamięci</div>
                            <div class="metric-value">${memUtil}%</div>
                            <div class="bar-container">
                                <div class="bar" style="width: ${memUtil}%"></div>
                            </div>
                        </div>
                        <div class="metric">
                            <div class="metric-label">Pamięć używana</div>
                            <div class="metric-value">${gpu.memory.used}</div>
                        </div>
                        <div class="metric">
                            <div class="metric-label">Moc</div>
                            <div class="metric-value">${power}W</div>
                        </div>
                        ${settings.params.pcie ? `
                        <div class="metric" style="grid-column: 1 / -1">
                            <div class="metric-label">PCIe</div>
                            <div class="pcie-stats">
                                <div>
                                    <div class="metric-label">Transfer</div>
                                    <div class="metric-value">TX: ${gpu.pcie.tx_util} | RX: ${gpu.pcie.rx_util}</div>
                                </div>
                                <div>
                                    <div class="metric-label">Gen ${gpu.pcie.gen}</div>
                                    <div class="metric-value">Bus: ${gpu.pcie.width}</div>
                                </div>
                            </div>
                        </div>` : ''}
                    </div>
                `;
                container.appendChild(card);
            });
        })
        .catch(error => {
            const container = document.getElementById('gpu-container');
            container.innerHTML = `
                <div class="gpu-card">
                    <div class="warning">Błąd połączenia z serwerem: ${error.message}</div>
                </div>
            `;
        });
}

// Zapisywanie ustawień
function saveSettings() {
    // Zapisz ustawienia z checkboxów
    document.querySelectorAll('[data-param]').forEach(checkbox => {
        settings.params[checkbox.dataset.param] = checkbox.checked;
    });
    document.querySelectorAll('[data-chart]').forEach(checkbox => {
        settings.charts[checkbox.dataset.chart] = checkbox.checked;
    });

    // Zapisz inne ustawienia
    settings.timeRange = parseInt(document.getElementById('chartTimeRange').value);

    // Przeładuj wykresy i interfejs
    initCharts();
    updateGPUInfo();
    
    // Zamknij menu ustawień
    document.getElementById('settingsPanel').classList.remove('visible');
}

// Inicjalizacja po załadowaniu strony
document.addEventListener('DOMContentLoaded', () => {
    initCharts();
    updateGPUInfo();
    updateInterval = setInterval(updateGPUInfo, settings.refreshRate);
});
