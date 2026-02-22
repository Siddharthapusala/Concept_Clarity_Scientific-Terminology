import React, { useState, useRef, useEffect } from 'react';

/**
 * CustomSelect - A premium, professional dropdown component
 * @param {string} value - Selected value
 * @param {function} onChange - Callback for value change
 * @param {Array} options - List of { value, label } options
 * @param {string} placeholder - Placeholder text
 * @param {boolean} disabled - Disabled state
 * @param {string} className - Additional CSS classes
 */
export default function CustomSelect({
    name,
    value,
    onChange,
    options,
    placeholder = 'Select an option',
    disabled = false,
    className = ''
}) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    const selectedOption = options.find(opt => opt.value === value);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleToggle = () => {
        if (!disabled) setIsOpen(!isOpen);
    };

    const handleSelect = (val) => {
        onChange({ target: { name: name || '', value: val } });
        setIsOpen(false);
    };

    return (
        <div
            className={`custom-select-container ${className} ${disabled ? 'disabled' : ''} ${isOpen ? 'open' : ''}`}
            ref={containerRef}
        >
            <div className="custom-select-trigger" onClick={handleToggle}>
                <span className="selected-value">
                    {selectedOption ? selectedOption.label : placeholder}
                </span>
                <span className="custom-select-arrow">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </span>
            </div>

            {isOpen && (
                <div className="custom-select-menu">
                    {options.map((opt) => (
                        <div
                            key={opt.value}
                            className={`custom-select-option ${opt.value === value ? 'selected' : ''}`}
                            onClick={() => handleSelect(opt.value)}
                        >
                            {opt.label}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
