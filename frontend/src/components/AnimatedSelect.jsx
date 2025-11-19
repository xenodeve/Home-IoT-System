import { useState, useRef, useEffect } from 'react';
import './AnimatedSelect.css';

const AnimatedSelect = ({ value, onChange, options, label, placeholder = 'เลือกค่า' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    const selected = options.find(opt => opt.value === value);
    setSelectedLabel(selected ? selected.label : placeholder);
  }, [value, options, placeholder]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (optionValue) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div className="animated-select" ref={dropdownRef}>
      {label && <label className="animated-select__label">{label}</label>}
      <div 
        className={`animated-select__trigger ${isOpen ? 'animated-select__trigger--open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={value ? '' : 'animated-select__placeholder'}>{selectedLabel}</span>
        <svg 
          className="animated-select__arrow" 
          width="12" 
          height="8" 
          viewBox="0 0 12 8" 
          fill="none"
        >
          <path d="M1 1L6 6L11 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </div>
      {isOpen && (
        <ul className="animated-select__dropdown">
          {options.map((option, index) => (
            <li
              key={option.value}
              className={`animated-select__option animated-select__option--${index + 1} ${
                option.value === value ? 'animated-select__option--selected' : ''
              }`}
              onClick={() => handleSelect(option.value)}
              style={{ animationDelay: `${index * 60}ms` }}
            >
              {option.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AnimatedSelect;
