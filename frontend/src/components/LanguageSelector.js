import React from 'react';
import { useTranslation } from 'react-i18next';
import './LanguageSelector.css';

const LanguageSelector = () => {
  const { i18n } = useTranslation();

  const languages = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'ta', name: 'தமிழ்', flag: '🇮🇳' },
    { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' }
  ];

  const handleLanguageChange = (langCode) => {
    i18n.changeLanguage(langCode);
    localStorage.setItem('language', langCode);
    // Update HTML lang attribute
    document.documentElement.lang = langCode;
  };

  return (
    <div className="language-selector">
      <div className="current-language">
        {languages.find(lang => lang.code === i18n.language)?.flag} 
        {languages.find(lang => lang.code === i18n.language)?.name}
      </div>
      <div className="language-dropdown">
        {languages.map(lang => (
          <button
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            className={`language-option ${i18n.language === lang.code ? 'active' : ''}`}
          >
            <span className="flag">{lang.flag}</span>
            <span className="name">{lang.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default LanguageSelector;