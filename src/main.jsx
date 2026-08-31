import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';
import './benefy-luxury.css';
import './benefy-blue-theme.css';
import './benefy-typography.css';
import './benefy-header-v5.css';
import './benefy-search-dark.css';
import './benefy-header-tokens.css';
import './benefy-login-cinematic.css';
import { enableCompactHeader } from './compactHeader';
import { enableProfilePopover } from './profileEnhancer';
import { enableBenefyTokens } from './benefyTokens';

function Root() {
  useEffect(() => {
    const disableCompactHeader = enableCompactHeader();
    const disableProfilePopover = enableProfilePopover();
    const disableBenefyTokens = enableBenefyTokens();
    return () => {
      disableCompactHeader?.();
      disableProfilePopover?.();
      disableBenefyTokens?.();
    };
  }, []);
  return <App />;
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><Root /></React.StrictMode>
);
