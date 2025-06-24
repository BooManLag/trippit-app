class App {
  constructor() {
    this.output = document.querySelector('#messageOutput');
    this.cityList = document.querySelector('#cityList');

    addEventListener('message', this.#onMessage);
    addEventListener('load', () => {
      postWebViewMessage({ type: 'webViewReady' });
    });
  }

  #onMessage = (ev) => {
    if (ev.data.type !== 'devvit-message') return;
    const { message } = ev.data.data;
    this.output.replaceChildren(JSON.stringify(message, undefined, 2));

    switch (message.type) {
      case 'initialCityData':
        this.renderCityChart(message.data);
        break;
      default:
        const _ = message;
        break;
    }
  };

  renderCityChart(data) {
    this.cityList.innerHTML = '';
    data.forEach(({ city, country, trip_count }) => {
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.alignItems = 'center';
      row.style.marginBottom = '8px';

      const label = document.createElement('div');
      label.textContent = `${city}, ${country}`;
      label.style.flex = '1';

      const bar = document.createElement('div');
      bar.style.height = '16px';
      bar.style.width = `${Math.min(trip_count * 10, 300)}px`;
      bar.style.backgroundColor = 'yellow';
      bar.style.border = '1px solid black';
      bar.style.borderRadius = '4px';

      const count = document.createElement('div');
      count.textContent = `${trip_count}`;
      count.style.marginLeft = '12px';

      row.append(label, bar, count);
      this.cityList.append(row);
    });
  }
}

function postWebViewMessage(msg) {
  parent.postMessage(msg, '*');
}

new App();
