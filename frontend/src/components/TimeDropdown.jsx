import { useState, useEffect, useMemo, useRef } from 'react';
import './TimeDropdown.css';

const HOURS = Array.from({ length: 24 }, (_, index) => index);
const MINUTES = Array.from({ length: 60 }, (_, index) => index);

const pad = (number) => number.toString().padStart(2, '0');

const parseTime = (value) => {
  if (!value) return { hour: null, minute: null };
  const [hourStr, minuteStr] = value.split(':');
  const hour = Number.parseInt(hourStr, 10);
  const minute = Number.parseInt(minuteStr, 10);
  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return { hour: null, minute: null };
  }
  return { hour, minute };
};

const TimeDropdown = ({ value, onChange, label, placeholder = 'เลือกเวลา (24 ชม.)' }) => {
  const { hour: initialHour, minute: initialMinute } = useMemo(() => parseTime(value), [value]);

  const [isOpen, setIsOpen] = useState(false);
  const [activeHour, setActiveHour] = useState(initialHour);
  const [activeMinute, setActiveMinute] = useState(initialMinute);
  const dropdownRef = useRef(null);

  useEffect(() => {
    setActiveHour(initialHour);
    setActiveMinute(initialMinute);
  }, [initialHour, initialMinute]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayLabel = useMemo(() => {
    if (activeHour === null || activeMinute === null) return placeholder;
    return `${pad(activeHour)}:${pad(activeMinute)}`;
  }, [activeHour, activeMinute, placeholder]);

  const commitTime = (hour, minute, shouldClose = true) => {
    if (hour === null || minute === null) return;
    const formatted = `${pad(hour)}:${pad(minute)}`;
    onChange(formatted);
    if (shouldClose) {
      setIsOpen(false);
    }
  };

  const handleHourClick = (hour) => {
    setActiveHour(hour);
    if (activeMinute !== null) {
      commitTime(hour, activeMinute);
    }
  };

  const handleMinuteClick = (minute) => {
    const hourToUse = activeHour ?? 0;
    if (activeHour === null) {
      setActiveHour(hourToUse);
    }
    setActiveMinute(minute);
    commitTime(hourToUse, minute);
  };

  return (
    <div className="time-dropdown" ref={dropdownRef}>
      {label && <label className="time-dropdown__label">{label}</label>}
      <button
        type="button"
        className={`time-dropdown__trigger ${isOpen ? 'time-dropdown__trigger--open' : ''}`}
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <span className={value ? '' : 'time-dropdown__placeholder'}>{displayLabel}</span>
        <svg className="time-dropdown__arrow" width="12" height="8" viewBox="0 0 12 8" fill="none">
          <path d="M1 1L6 6L11 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
      {isOpen && (
        <div className="time-dropdown__panel">
          <div className="time-dropdown__panel-header">
            <div>
              <span className="time-dropdown__panel-title">เลือกเวลา</span>
              <span className="time-dropdown__panel-caption">ระบบ 24 ชั่วโมง</span>
            </div>
            {activeHour !== null && activeMinute !== null && (
              <span className="time-dropdown__panel-selected">{pad(activeHour)}:{pad(activeMinute)}</span>
            )}
          </div>
          <div className="time-dropdown__columns">
            <div className="time-dropdown__column">
              <div className="time-dropdown__column-title">ชั่วโมง</div>
              <div className="time-dropdown__list">
                {HOURS.map((hour) => {
                  const isSelected = hour === activeHour;
                  return (
                    <button
                      type="button"
                      key={hour}
                      className={`time-dropdown__chip ${isSelected ? 'time-dropdown__chip--selected' : ''}`}
                      onClick={() => handleHourClick(hour)}
                    >
                      {pad(hour)}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="time-dropdown__column">
              <div className="time-dropdown__column-title">นาที</div>
              <div className="time-dropdown__list time-dropdown__list--minutes">
                {MINUTES.map((minute) => {
                  const isSelected = minute === activeMinute;
                  return (
                    <button
                      type="button"
                      key={minute}
                      className={`time-dropdown__chip ${isSelected ? 'time-dropdown__chip--selected' : ''}`}
                      onClick={() => handleMinuteClick(minute)}
                    >
                      {pad(minute)}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimeDropdown;
