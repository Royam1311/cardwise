import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';
import './benefy-catalog-results.css';
import './benefy-autocomplete.css';
import './benefy-product-card-luxury.css';
import './benefy-product-variants.css';
import * as AutocompleteSearch from './autocompleteSearch';
import { initProductVariantSelector } from './productVariantSelector';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

let cleanAutocomplete;
let cleanVariants;

function getAutocompleteInitializer() {
  const candidates = [
    AutocompleteSearch.initAutocompleteSearch,
    AutocompleteSearch.initProductAutocomplete,
    AutocompleteSearch.initAutocomplete,
    AutocompleteSearch.default
  ];

  return candidates.find(candidate => typeof candidate === 'function') || null;
}

function startEnhancements() {
  cleanAutocomplete?.();
  cleanVariants?.();

  const initAutocomplete = getAutocompleteInitializer();
  cleanAutocomplete = initAutocomplete?.();
  cleanVariants = initProductVariantSelector?.();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startEnhancements, { once: true });
} else {
  startEnhancements();
}
