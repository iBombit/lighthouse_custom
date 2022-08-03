class CurrencyExchangeSelectors {
  get currExc()     { return ".usd-to-byn.buy.show-map"};
  get ymapsPoints() { return ".ymaps-point-overlay"};
  get scale()       { return ".ymaps-b-zoom__scale-bg"};
  get zoomIn()      { return "//*[@class='ymaps-b-zoom__hint-text' and contains(text(),'дом')]"};
}

module.exports = CurrencyExchangeSelectors;
