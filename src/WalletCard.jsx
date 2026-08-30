import React from 'react';
import { Check, Plus, Trash2, Wifi } from 'lucide-react';

const CARD_META = {
  visa: {
    label: 'VISA',
    subtitle: 'PERSONAL CREDIT',
    theme: 'visa',
    monogram: 'V'
  },
  max: {
    label: 'MAX',
    subtitle: 'PREMIUM CREDIT',
    theme: 'max',
    monogram: 'M'
  },
  haver: {
    label: 'חבר',
    subtitle: 'CONSUMER CLUB',
    theme: 'haver',
    monogram: 'ח'
  },
  isracard: {
    label: 'ישראכרט',
    subtitle: 'PERSONAL CREDIT',
    theme: 'isracard',
    monogram: 'י'
  },
  htz: {
    label: 'הייטקזון',
    subtitle: 'TECH BENEFITS',
    theme: 'htz',
    monogram: 'H'
  },
  tav: {
    label: 'תו הזהב',
    subtitle: 'GIFT BENEFITS',
    theme: 'tav',
    monogram: 'ת'
  },
  behatsdaa: {
    label: 'בהצדעה',
    subtitle: 'CONSUMER CLUB',
    theme: 'behatsdaa',
    monogram: 'ב'
  }
};

export default function WalletCard({ code, name, selected, onToggle }) {
  const meta = CARD_META[code] || {
    label: name,
    subtitle: 'BENEFIT PROGRAM',
    theme: 'default',
    monogram: String(name || '?').slice(0, 1)
  };

  return (
    <button
      type="button"
      className={`wallet-card wallet-card--${meta.theme} ${selected ? 'is-selected' : ''}`}
      onClick={onToggle}
      aria-pressed={selected}
      aria-label={`${selected ? 'הסר' : 'הוסף'} ${name}`}
    >
      <span className="wallet-card__shine" aria-hidden="true" />

      <span className="wallet-card__top">
        <span className="wallet-card__brand">
          <span className="wallet-card__monogram" aria-hidden="true">{meta.monogram}</span>
          <span>
            <strong>{meta.label}</strong>
            <small>{meta.subtitle}</small>
          </span>
        </span>

        <span className={`wallet-card__status ${selected ? 'is-active' : ''}`}>
          {selected ? <><Check /> פעיל</> : 'זמין'}
        </span>
      </span>

      <span className="wallet-card__middle">
        <span className="wallet-card__chip" aria-hidden="true">
          <i /><i /><i /><i />
        </span>
        <Wifi className="wallet-card__contactless" aria-hidden="true" />
      </span>

      <span className="wallet-card__bottom">
        <span>
          <small>BENEFY WALLET</small>
          <strong>•••• &nbsp; BENEFITS</strong>
        </span>
        <span className="wallet-card__action">
          {selected ? <Trash2 /> : <Plus />}
          {selected ? 'הסר מהארנק' : 'הוסף לארנק'}
        </span>
      </span>
    </button>
  );
}
