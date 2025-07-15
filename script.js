document.addEventListener('DOMContentLoaded', function() {
    // Check for saved theme or use preferred color scheme
    const savedTheme = localStorage.getItem('theme') || 
                      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);

    // DOM Elements
    const themeToggle = document.getElementById('theme-toggle');
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');
    const prevYearBtn = document.getElementById('prev-year');
    const nextYearBtn = document.getElementById('next-year');
    const addYearBtn = document.getElementById('add-year');
    const currentYearEl = document.getElementById('current-year');
    const monthSelect = document.getElementById('month');
    const electricityInput = document.getElementById('electricity');
    const gasInput = document.getElementById('gas');
    const addEntryBtn = document.getElementById('add-entry');
    const entriesContainer = document.getElementById('entries-container');
    const exportBtn = document.getElementById('export-data');
    const importBtn = document.getElementById('import-data');
    const importFile = document.getElementById('import-file');
    const clearBtn = document.getElementById('clear-data');
    const totalElectricityEl = document.getElementById('total-electricity');
    const totalGasEl = document.getElementById('total-gas');
    const avgElectricityEl = document.getElementById('avg-electricity');
    const avgGasEl = document.getElementById('avg-gas');
    const usageChartCtx = document.getElementById('usage-chart').getContext('2d');

    // State
    let currentYear = new Date().getFullYear();
    let usageData = {};
    let usageChart = null;

    // Initialize
    loadData();
    renderYear();
    updateStats();
    renderChart();

    // Event Listeners
    themeToggle.addEventListener('click', toggleTheme);
    tabs.forEach(tab => tab.addEventListener('click', switchTab));
    prevYearBtn.addEventListener('click', () => changeYear(-1));
    nextYearBtn.addEventListener('click', () => changeYear(1));
    addYearBtn.addEventListener('click', addYear);
    addEntryBtn.addEventListener('click', addEntry);
    exportBtn.addEventListener('click', exportData);
    importBtn.addEventListener('click', importData);
    clearBtn.addEventListener('click', clearData);

    // Functions
    function toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcon(newTheme);
        renderChart(); // Re-render chart with new theme colors
    }

    function updateThemeIcon(theme) {
        const themeToggle = document.getElementById('theme-toggle');
        const icon = themeToggle.querySelector('i');
        icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }

    function switchTab(e) {
        const tabId = e.target.getAttribute('data-tab');
        
        tabs.forEach(tab => tab.classList.remove('active'));
        e.target.classList.add('active');
        
        tabContents.forEach(content => content.classList.remove('active'));
        document.getElementById(`${tabId}-tab`).classList.add('active');

        if (tabId === 'stats') {
            updateStats();
            renderChart();
        }
    }

    function loadData() {
        const savedData = localStorage.getItem('energyUsageData');
        if (savedData) {
            usageData = JSON.parse(savedData);
        } else {
            // Initialize with current year if no data exists
            usageData = {
                [currentYear]: {}
            };
            saveData();
        }
    }

    function saveData() {
        localStorage.setItem('energyUsageData', JSON.stringify(usageData));
    }

    function renderYear() {
        currentYearEl.textContent = currentYear;
        
        // Check if year exists in data, if not create it
        if (!usageData[currentYear]) {
            usageData[currentYear] = {};
            saveData();
        }
        
        renderEntries();
    }

    function changeYear(change) {
        currentYear += change;
        renderYear();
    }

    function addYear() {
        const newYear = parseInt(prompt('Enter the year to add:', currentYear + 1));
        if (!isNaN(newYear) && newYear > 0) {
            if (!usageData[newYear]) {
                usageData[newYear] = {};
                saveData();
            }
            currentYear = newYear;
            renderYear();
        } else {
            alert('Please enter a valid year.');
        }
    }

    function addEntry() {
        const month = parseInt(monthSelect.value);
        const electricity = parseFloat(electricityInput.value);
        const gas = parseFloat(gasInput.value);
        
        if (isNaN(electricity)) {
            alert('Please enter a valid electricity reading.');
            return;
        }
        
        if (isNaN(gas)) {
            alert('Please enter a valid gas reading.');
            return;
        }
        
        if (!usageData[currentYear]) {
            usageData[currentYear] = {};
        }
        
        usageData[currentYear][month] = {
            electricity,
            gas,
            date: new Date().toISOString()
        };
        
        saveData();
        renderEntries();
        updateStats();
        renderChart();
        
        // Reset form
        electricityInput.value = '';
        gasInput.value = '';
    }

    function renderEntries() {
        entriesContainer.innerHTML = '';
        
        if (!usageData[currentYear] || Object.keys(usageData[currentYear]).length === 0) {
            entriesContainer.innerHTML = '<p>No entries for this year yet.</p>';
            return;
        }
        
        const months = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        
        // Sort months in descending order (newest first)
        const sortedMonths = Object.keys(usageData[currentYear])
            .map(month => parseInt(month))
            .sort((a, b) => b - a);
        
        sortedMonths.forEach(month => {
            const entry = usageData[currentYear][month];
            const entryCard = document.createElement('div');
            entryCard.className = 'entry-card';
            
            entryCard.innerHTML = `
                <h4>${months[month]}</h4>
                <p><strong>Electricity:</strong> ${entry.electricity} kWh</p>
                <p><strong>Gas:</strong> ${entry.gas} m³</p>
                <div class="entry-actions">
                    <button class="secondary edit-entry" data-month="${month}">Edit</button>
                    <button class="danger delete-entry" data-month="${month}">Delete</button>
                </div>
            `;
            
            entriesContainer.appendChild(entryCard);
        });
        
        // Add event listeners to new buttons
        document.querySelectorAll('.edit-entry').forEach(btn => {
            btn.addEventListener('click', editEntry);
        });
        
        document.querySelectorAll('.delete-entry').forEach(btn => {
            btn.addEventListener('click', deleteEntry);
        });
    }

    function editEntry(e) {
        const month = parseInt(e.target.getAttribute('data-month'));
        const entry = usageData[currentYear][month];
        
        monthSelect.value = month;
        electricityInput.value = entry.electricity;
        gasInput.value = entry.gas;
        
        // Change add button to update
        addEntryBtn.textContent = 'Update Reading';
        addEntryBtn.removeEventListener('click', addEntry);
        addEntryBtn.addEventListener('click', function updateEntry() {
            const newElectricity = parseFloat(electricityInput.value);
            const newGas = parseFloat(gasInput.value);
            
            if (isNaN(newElectricity) || isNaN(newGas)) {
                alert('Please enter valid readings.');
                return;
            }
            
            usageData[currentYear][month] = {
                electricity: newElectricity,
                gas: newGas,
                date: new Date().toISOString()
            };
            
            saveData();
            renderEntries();
            updateStats();
            renderChart();
            
            // Reset form
            monthSelect.value = '0';
            electricityInput.value = '';
            gasInput.value = '';
            addEntryBtn.textContent = 'Add Reading';
            addEntryBtn.removeEventListener('click', updateEntry);
            addEntryBtn.addEventListener('click', addEntry);
        });
    }

    function deleteEntry(e) {
        if (confirm('Are you sure you want to delete this entry?')) {
            const month = parseInt(e.target.getAttribute('data-month'));
            delete usageData[currentYear][month];
            saveData();
            renderEntries();
            updateStats();
            renderChart();
        }
    }

    function updateStats() {
        if (!usageData[currentYear] || Object.keys(usageData[currentYear]).length === 0) {
            totalElectricityEl.textContent = '0 kWh';
            totalGasEl.textContent = '0 m³';
            avgElectricityEl.textContent = '0 kWh';
            avgGasEl.textContent = '0 m³';
            return;
        }
        
        const entries = Object.values(usageData[currentYear]);
        const totalElectricity = entries.reduce((sum, entry) => sum + entry.electricity, 0);
        const totalGas = entries.reduce((sum, entry) => sum + entry.gas, 0);
        const avgElectricity = totalElectricity / entries.length;
        const avgGas = totalGas / entries.length;
        
        totalElectricityEl.textContent = `${totalElectricity.toFixed(2)} kWh`;
        totalGasEl.textContent = `${totalGas.toFixed(2)} m³`;
        avgElectricityEl.textContent = `${avgElectricity.toFixed(2)} kWh`;
        avgGasEl.textContent = `${avgGas.toFixed(2)} m³`;
    }

    function getThemeColors() {
        const style = getComputedStyle(document.documentElement);
        return {
            textColor: style.getPropertyValue('--text-color'),
            borderColor: style.getPropertyValue('--border-color')
        };
    }

    function renderChart() {
        if (usageChart) {
            usageChart.destroy();
        }
        
        if (!usageData[currentYear] || Object.keys(usageData[currentYear]).length === 0) {
            return;
        }
        
        const months = [
            'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
            'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
        ];
        
        // Prepare data for all months, even those without entries
        const electricityData = [];
        const gasData = [];
        
        for (let i = 0; i < 12; i++) {
            if (usageData[currentYear][i]) {
                electricityData.push(usageData[currentYear][i].electricity);
                gasData.push(usageData[currentYear][i].gas);
            } else {
                electricityData.push(null);
                gasData.push(null);
            }
        }
        
        const { textColor, borderColor } = getThemeColors();
        
        usageChart = new Chart(usageChartCtx, {
            type: 'line',
            data: {
                labels: months,
                datasets: [
                    {
                        label: 'Electricity (kWh)',
                        data: electricityData,
                        borderColor: '#4285f4',
                        backgroundColor: 'rgba(66, 133, 244, 0.1)',
                        tension: 0.3,
                        fill: true
                    },
                    {
                        label: 'Gas (m³)',
                        data: gasData,
                        borderColor: '#34a853',
                        backgroundColor: 'rgba(52, 168, 83, 0.1)',
                        tension: 0.3,
                        fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: textColor
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            color: textColor
                        },
                        grid: {
                            color: borderColor
                        }
                    },
                    x: {
                        ticks: {
                            color: textColor
                        },
                        grid: {
                            color: borderColor
                        }
                    }
                }
            }
        });
    }

    function exportData() {
        const dataStr = JSON.stringify(usageData);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = `energy-usage-data-${new Date().toISOString().split('T')[0]}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    }

    function importData() {
        const file = importFile.files[0];
        if (!file) {
            alert('Please select a file to import.');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const importedData = JSON.parse(e.target.result);
                
                // Validate the imported data structure
                if (typeof importedData !== 'object' || importedData === null) {
                    throw new Error('Invalid data format.');
                }
                
                for (const year in importedData) {
                    if (isNaN(parseInt(year))) {
                        throw new Error('Year keys must be numbers.');
                    }
                    
                    if (typeof importedData[year] !== 'object' || importedData[year] === null) {
                        throw new Error('Year data must be an object.');
                    }
                    
                    for (const month in importedData[year]) {
                        if (isNaN(parseInt(month)) || parseInt(month) < 0 || parseInt(month) > 11) {
                            throw new Error('Month keys must be numbers between 0 and 11.');
                        }
                        
                        const entry = importedData[year][month];
                        if (typeof entry.electricity !== 'number' || typeof entry.gas !== 'number') {
                            throw new Error('Electricity and gas must be numbers.');
                        }
                    }
                }
                
                if (confirm('This will overwrite your current data. Continue?')) {
                    usageData = importedData;
                    saveData();
                    
                    // Update the current year to the most recent year in the imported data
                    const years = Object.keys(usageData).map(Number).sort((a, b) => b - a);
                    if (years.length > 0) {
                        currentYear = years[0];
                    }
                    
                    renderYear();
                    updateStats();
                    renderChart();
                    alert('Data imported successfully!');
                }
            } catch (error) {
                alert(`Error importing data: ${error.message}`);
            }
        };
        reader.readAsText(file);
    }

    function clearData() {
        if (confirm('Are you sure you want to delete ALL your energy usage data? This cannot be undone.')) {
            localStorage.removeItem('energyUsageData');
            usageData = {
                [currentYear]: {}
            };
            saveData();
            renderEntries();
            updateStats();
            renderChart();
        }
    }
});