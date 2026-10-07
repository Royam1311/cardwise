import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';
import './benefy-catalog-results.css';
import './benefy-autocomplete.css';
import './benefy-product-card-luxury.css';
import './benefy-product-variants.css';
import './benefy-catalog-infinite-scroll.css';
import { initProductAutocomplete } from './autocompleteSearch';
import { initProductVariantSelector } from './productVariantSelector';
import { initCatalogInfiniteScroll } from './catalogInfiniteScroll';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><App /></React.StrictMode>
);

let cleanAutocomplete;
let cleanVariants;
let cleanInfinite;
function startEnhancements() {
  cleanAutocomplete?.();
  cleanVariants?.();
  cleanInfinite?.();
  cleanAutocomplete = initProductAutocomplete?.();
  cleanVariants = initProductVariantSelector?.();
  cleanInfinite = initCatalogInfiniteScroll?.();
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startEnhancements, { once: true });
else startEnhancements();
