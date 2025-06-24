class App {
  constructor() {
    this.chartContainer = document.querySelector('#chart-container');
    this.loadingElement = document.querySelector('#loading');
    this.errorElement = document.querySelector('#error');

    addEventListener('message', this.#onMessage);
    addEventListener('load', () => {
      postWebViewMessage({ type: 'webViewReady' });
    });
  }

  #onMessage = (ev) => {
    if (ev.data.type !== 'devvit-message') return;
    const { message } = ev.data.data;

    switch (message.type) {
      case 'initialCityData':
        this.renderPeeChart(message.data);
        break;
      default:
        console.warn(`Unknown message type: ${message.type}`);
        break;
    }
  };

  renderPeeChart(data) {
    this.loadingElement.style.display = 'none';
    
    if (!data || data.length === 0) {
      this.errorElement.style.display = 'block';
      return;
    }

    // Sort by trip count descending
    const sortedData = [...data].sort((a, b) => b.trip_count - a.trip_count);
    
    // Find the maximum count for scaling
    const maxCount = Math.max(...sortedData.map(item => item.trip_count));
    
    // Clear previous content
    this.chartContainer.innerHTML = '';
    
    // Create chart
    sortedData.forEach(({ city, country, trip_count }) => {
      // Create container for this city
      const cityContainer = document.createElement('div');
      cityContainer.className = 'city-container';
      
      // Create label
      const label = document.createElement('div');
      label.className = 'city-label';
      label.textContent = `${city}, ${country}`;
      
      // Create chart area
      const chartArea = document.createElement('div');
      chartArea.className = 'chart-area';
      
      // Calculate height percentage (max height is 200px)
      const heightPercentage = (trip_count / maxCount) * 100;
      const maxHeight = 200;
      const barHeight = Math.max(20, (heightPercentage / 100) * maxHeight);
      
      // Create person icon
      const personContainer = document.createElement('div');
      personContainer.className = 'person-container';
      personContainer.style.bottom = `${barHeight + 10}px`;
      
      const personIcon = document.createElement('div');
      personIcon.className = 'person-icon';
      personContainer.appendChild(personIcon);
      
      // Create pee stream
      const peeStream = document.createElement('div');
      peeStream.className = 'pee-stream';
      peeStream.style.height = `${barHeight}px`;
      
      // Create puddle
      const puddle = document.createElement('div');
      puddle.className = 'puddle';
      puddle.style.width = `${Math.max(30, trip_count * 5)}px`;
      
      // Create count label
      const countLabel = document.createElement('div');
      countLabel.className = 'count-label';
      countLabel.textContent = trip_count;
      
      // Assemble chart
      chartArea.appendChild(personContainer);
      chartArea.appendChild(peeStream);
      chartArea.appendChild(puddle);
      chartArea.appendChild(countLabel);
      
      // Assemble city container
      cityContainer.appendChild(label);
      cityContainer.appendChild(chartArea);
      
      // Add to chart container
      this.chartContainer.appendChild(cityContainer);
    });
  }
}

function postWebViewMessage(msg) {
  parent.postMessage(msg, '*');
}

new App();