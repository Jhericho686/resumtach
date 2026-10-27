import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search } from 'lucide-react';
import api from '../../services/api';

// Module-level cache so active jobs are only fetched once across component mounts
let cachedActiveJobs = null;

const JobSearchAutocomplete = ({
  value,
  onChange,
  onSelect,
  suggestions = null,
  placeholder = 'Job title, keywords...',
  className = '',
  inputClassName = '',
  onSubmit,
}) => {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [activeJobs, setActiveJobs] = useState(cachedActiveJobs || []);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  // Fetch only the real active jobs that currently exist in the database
  useEffect(() => {
    let isMounted = true;
    if (cachedActiveJobs && cachedActiveJobs.length > 0) {
      setActiveJobs(cachedActiveJobs);
      return;
    }

    const fetchActiveJobs = async () => {
      try {
        const response = await api.get('/jobs?status=active&limit=100');
        const jobs = response.data.jobs || [];
        const cleanJobs = jobs
          .map(j => ({
            title: (j.title || '').trim(),
            department: (j.department || '').trim(),
            id: j.id
          }))
          .filter(j => j.title.length > 0);

        cachedActiveJobs = cleanJobs;
        if (isMounted) {
          setActiveJobs(cleanJobs);
        }
      } catch (err) {
        console.warn('Failed to fetch active job titles for autocomplete:', err.message);
      }
    };

    fetchActiveJobs();
    return () => { isMounted = false; };
  }, []);

  // Suggestions master list contains ONLY actual active jobs that exist in the system
  const masterList = useMemo(() => {
    if (suggestions && suggestions.length > 0) {
      return suggestions.map(s => typeof s === 'string' ? { title: s.trim() } : s);
    }

    const seen = new Set();
    const result = [];

    activeJobs.forEach(j => {
      const norm = (j.title || '').trim();
      const lower = norm.toLowerCase();
      if (norm && !seen.has(lower)) {
        seen.add(lower);
        result.push({ title: norm, department: j.department || '' });
      }
    });

    return result;
  }, [activeJobs, suggestions]);

  // Filter suggestions strictly against actual available jobs
  const filtered = useMemo(() => {
    const rawVal = (value || '').trim();
    const term = rawVal.toLowerCase();

    // When search is empty, show available active jobs
    if (term.length === 0) {
      return masterList;
    }

    const scored = [];

    for (const item of masterList) {
      const title = item.title;
      const titleLower = title.toLowerCase().trim();

      let score = 0;

      // 1. Exact match
      if (titleLower === term) {
        score = 1000;
      }
      // 2. Starts with typed term (e.g. "T" -> "Tourism and Travel Associate", "IT" -> "IT Support")
      else if (titleLower.startsWith(term)) {
        score = 800;
      }
      // 3. Word starts with typed term (e.g. "Support" for "S", "Associate" for "A")
      else if (new RegExp(`(^|\\s)${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i').test(titleLower)) {
        score = 600;
      }
      // 4. Substring anywhere inside title (only for queries with 2+ characters)
      else if (term.length > 1 && titleLower.includes(term)) {
        score = 200;
      }

      if (score > 0) {
        scored.push({
          title,
          score
        });
      }
    }

    scored.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
    return scored;
  }, [value, masterList]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleChange = (e) => {
    onChange(e.target.value);
    setOpen(true);
    setActiveIndex(-1);
  };

  const handleSelect = (item) => {
    const title = typeof item === 'string' ? item : item.title;
    (onSelect || onChange)(title);
    setOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (!open || filtered.length === 0) {
      if (e.key === 'Enter' && onSubmit) onSubmit(e);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0) {
        e.preventDefault();
        handleSelect(filtered[activeIndex]);
      } else {
        setOpen(false);
        if (onSubmit) onSubmit(e);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
      setActiveIndex(-1);
    }
  };

  // Highlight the matched letters
  const highlight = (text) => {
    const query = (value || '').trim();
    if (!query) return text;

    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;

    return (
      <>
        {text.slice(0, idx)}
        <span className="font-bold text-primary-600 dark:text-primary-400 underline decoration-primary-400 decoration-2 underline-offset-2">
          {text.slice(idx, idx + query.length)}
        </span>
        {text.slice(idx + query.length)}
      </>
    );
  };

  return (
    <div ref={wrapperRef} className={`relative flex-1 ${className}`}>
      {/* Search icon inside input */}
      <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10" size={20} />
      
      <input
        ref={inputRef}
        type="text"
        autoComplete="off"
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => { if (filtered.length > 0) setOpen(true); }}
        onClick={() => { if (filtered.length > 0) setOpen(true); }}
        className={`w-full pl-12 pr-4 py-3 rounded-xl outline-none transition ${
          inputClassName || 'border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-400'
        }`}
        aria-autocomplete="list"
        aria-expanded={open && filtered.length > 0}
        role="combobox"
      />

      {/* Dropdown with ONLY actual jobs */}
      {open && filtered.length > 0 && (
        <ul
          role="listbox"
          className="absolute left-0 top-full z-50 mt-1.5 w-full min-w-[320px] md:min-w-[420px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl overflow-hidden py-1 max-h-72 overflow-y-auto text-left divide-y divide-gray-50 dark:divide-gray-700/50"
        >
          {filtered.map((item, i) => {
            const title = typeof item === 'string' ? item : item.title;

            return (
              <li
                key={title + i}
                role="option"
                aria-selected={i === activeIndex}
                onMouseDown={(e) => { e.preventDefault(); handleSelect(item); }}
                onMouseEnter={() => setActiveIndex(i)}
                className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer text-sm transition-colors ${
                  i === activeIndex
                    ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-800 dark:text-primary-200'
                    : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/60'
                }`}
              >
                <Search size={14} className="text-gray-400 flex-shrink-0" />
                <span className="truncate">{highlight(title)}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default JobSearchAutocomplete;
