import { useState } from 'react'
import FilterDropdown from '../components/FilterDropdown'
import './SearchPage.css'

const FILTER_CATEGORIES = {
  cuisine: {
    label: 'cuisine',
    options: [
      'Italian', 'Japanese', 'Mexican', 'Indian', 'Thai',
      'French', 'Chinese', 'Korean', 'American', 'Mediterranean',
    ],
  },
  price: {
    label: 'price',
    options: ['$', '$$', '$$$', '$$$$'],
  },
  rating: {
    label: 'rating',
    options: ['4.5+', '4.0+', '3.5+', '3.0+'],
  },
  location: {
    label: 'location',
    options: [
      'Philadelphia, PA', 'New York, NY', 'Los Angeles, CA',
      'Chicago, IL', 'San Francisco, CA', 'Seattle, WA',
    ],
  },
}

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState({
    cuisine: [],
    price: [],
    rating: [],
    location: [],
  })

  function toggleFilter(category, value) {
    setFilters((prev) => {
      const current = prev[category]
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value]
      return { ...prev, [category]: next }
    })
  }

  function removeFilter(category, value) {
    setFilters((prev) => ({
      ...prev,
      [category]: prev[category].filter((v) => v !== value),
    }))
  }

  function clearAll() {
    setFilters({ cuisine: [], price: [], rating: [], location: [] })
  }

  const allSelected = Object.entries(filters).flatMap(([cat, vals]) =>
    vals.map((v) => ({ category: cat, value: v }))
  )

  function handleSearch() {
    console.log('Search:', { query: searchQuery, filters })
  }

  return (
    <div className="search-page">
      {/* Decorative canopy arch */}
      <div className="search-page__arch">
        <p className="search-page__arch-welcome">welcome to</p>
        <p className="search-page__arch-title">our app!</p>
      </div>

      {/* Tagline */}
      <h1 className="search-page__tagline">find your next best eat</h1>

      {/* Search bar */}
      <div className="search-page__search-bar">
        <div className="search-page__search-input-wrap">
          <input
            type="text"
            className="search-page__search-input"
            placeholder="search by name, cuisine, or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>
        <button className="search-page__search-btn" onClick={handleSearch}>
          🔍&nbsp;&nbsp;search
        </button>
      </div>

      {/* Filter dropdowns */}
      <div className="search-page__filters">
        {Object.entries(FILTER_CATEGORIES).map(([key, { label, options }]) => (
          <FilterDropdown
            key={key}
            label={label}
            options={options}
            selected={filters[key]}
            onToggle={(val) => toggleFilter(key, val)}
          />
        ))}
      </div>

      {/* Selected filter chips */}
      {allSelected.length > 0 && (
        <div className="search-page__selected">
          {allSelected.map(({ category, value }) => (
            <button
              key={`${category}-${value}`}
              className="selected-chip"
              onClick={() => removeFilter(category, value)}
            >
              {value}
              <span className="selected-chip__x">×</span>
            </button>
          ))}
          <button className="selected-chip selected-chip--clear" onClick={clearAll}>
            clear all
          </button>
        </div>
      )}

      {/* Results placeholder */}
      <div className="search-page__results-area">
        <p className="search-page__results-empty">
          select some filters and search to find restaurants!
        </p>
      </div>
    </div>
  )
}
