import { useState, useMemo, useEffect, useRef } from 'react';
import './DateDropdown.css';

const WEEKDAY_LABELS = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'];

const normalizeDate = (date) => {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
};

const formatDateValue = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getMonthMatrix = (year, month) => {
  const firstOfMonth = new Date(year, month, 1);
  firstOfMonth.setHours(0, 0, 0, 0);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const startOffset = (firstOfMonth.getDay() + 6) % 7; // Monday as first day
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

  const matrix = [];
  for (let cell = 0; cell < totalCells; cell += 1) {
    const dayNumber = cell - startOffset + 1;
    let date;
    let type;

    if (dayNumber < 1) {
      date = new Date(year, month - 1, daysInPrevMonth + dayNumber);
      type = 'prev';
    } else if (dayNumber > daysInMonth) {
      date = new Date(year, month + 1, dayNumber - daysInMonth);
      type = 'next';
    } else {
      date = new Date(year, month, dayNumber);
      type = 'current';
    }

    matrix.push({
      date: normalizeDate(date),
      type
    });
  }

  return matrix;
};

const DateDropdown = ({ value, onChange, label }) => {
  const initialDate = value ? normalizeDate(new Date(`${value}T00:00:00`)) : null;
  const today = useMemo(() => normalizeDate(new Date()), []);

  const [isOpen, setIsOpen] = useState(false);
  const [viewYear, setViewYear] = useState(initialDate ? initialDate.getFullYear() : today.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate ? initialDate.getMonth() : today.getMonth());

  const containerRef = useRef(null);

  useEffect(() => {
    if (!value) return;
    const parsed = normalizeDate(new Date(`${value}T00:00:00`));
    if (!Number.isNaN(parsed.getTime())) {
      setViewYear(parsed.getFullYear());
      setViewMonth(parsed.getMonth());
    }
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const monthMatrix = useMemo(() => getMonthMatrix(viewYear, viewMonth), [viewYear, viewMonth]);
  const selectedDate = useMemo(() => {
    if (!value) return null;
    const parsed = normalizeDate(new Date(`${value}T00:00:00`));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }, [value]);

  const monthLabel = useMemo(() => {
    const localeDate = new Date(viewYear, viewMonth, 1);
    return new Intl.DateTimeFormat('th-TH', { month: 'long' }).format(localeDate);
  }, [viewYear, viewMonth]);

  const yearLabel = useMemo(() => {
    const localeDate = new Date(viewYear, viewMonth, 1);
    return new Intl.DateTimeFormat('th-TH', { year: 'numeric' }).format(localeDate);
  }, [viewYear, viewMonth]);

  const displayValue = selectedDate
    ? new Intl.DateTimeFormat('th-TH', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }).format(selectedDate)
    : 'เลือกวันที่';

  const toggleOpen = () => setIsOpen((prev) => !prev);

  const handlePrevMonth = () => {
    setViewMonth((prev) => {
      if (prev === 0) {
        setViewYear((year) => year - 1);
        return 11;
      }
      return prev - 1;
    });
  };

  const handleNextMonth = () => {
    setViewMonth((prev) => {
      if (prev === 11) {
        setViewYear((year) => year + 1);
        return 0;
      }
      return prev + 1;
    });
  };

  const handleSelectDate = (date) => {
    onChange(formatDateValue(date));
    setIsOpen(false);
  };

  return (
    <div className="date-dropdown" ref={containerRef}>
      {label && <label className="date-dropdown__label">{label}</label>}
      <button
        type="button"
        className={`date-dropdown__trigger ${isOpen ? 'date-dropdown__trigger--open' : ''}`}
        onClick={toggleOpen}
      >
        <span>{displayValue}</span>
        <svg className="date-dropdown__arrow" width="12" height="8" viewBox="0 0 12 8" fill="none">
          <path d="M1 1L6 6L11 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
      {isOpen && (
        <div className="date-dropdown__panel">
          <div className="date-dropdown__panel-header">
            <button type="button" className="date-dropdown__nav" onClick={handlePrevMonth} aria-label="เดือนก่อนหน้า">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M10 3L6 8L10 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <div className="date-dropdown__panel-title">
              <span className="date-dropdown__panel-month">{monthLabel}</span>
              <span className="date-dropdown__panel-year">{yearLabel}</span>
            </div>
            <button type="button" className="date-dropdown__nav" onClick={handleNextMonth} aria-label="เดือนถัดไป">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6 3L10 8L6 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
          <div className="date-dropdown__weekdays">
            {WEEKDAY_LABELS.map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="date-dropdown__grid">
            {monthMatrix.map(({ date, type }) => {
              const isSelected = selectedDate && date.getTime() === selectedDate.getTime();
              const isToday = date.getTime() === today.getTime();
              const key = date.toISOString();

              return (
                <button
                  type="button"
                  key={key}
                  className={`date-dropdown__day date-dropdown__day--${type}${
                    isSelected ? ' date-dropdown__day--selected' : ''
                  }${isToday ? ' date-dropdown__day--today' : ''}`}
                  onClick={() => handleSelectDate(date)}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default DateDropdown;
