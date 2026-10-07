import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';
import './benefy-catalog-results.css';
import './benefy-autocomplete.css';
import './benefy-product-card-luxury.css';
import './benefy-product-variants.css';
import './benefy-catalog-infinite-scroll.css';
import * as AutocompleteModule from './autocompleteSearch';
import * as VariantModule from './productVariantSelector';
import { initCatalogInfiniteScroll } from './catalogInfiniteScroll';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

let cleanAutocomplete;
let cleanVariants;
let cleanInfinite;

function resolveInitializer(module, preferredNames) {
  for (const name of preferredNames) {
    if (typeof module?.[name] === 'function') return module[name];
  }
  if (typeof module?.default === 'function') return module.default;
  return null;
}

function startEnhancements() {
  cleanAutocomplete?.();
  cleanVariants?.();
  cleanInfinite?.();

  const initAutocomplete = resolveInitializer(AutocompleteModule, [
    'initProductAutocomplete',
    'initAutocompleteSearch',
    'initAutocomplete'
  ]);
  const initVariants = resolveInitializer(VariantModule, [
    'initProductVariantSelector',
    'initVariantSelector'
  ]);

  cleanAutocomplete = initAutocomplete?.();
  cleanVariants = initVariants?.();
  cleanInfinite = initCatalogInfiniteScroll?.();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startEnhancements, { once: true });
} else {
  startEnhancements();
}
