import { useState, useEffect, useMemo } from 'react'
import FilterDropdown from '../components/FilterDropdown'
import ApiTimingLabel from '../components/ApiTimingLabel'
import '../components/ApiTimingLabel.css'
import './SearchPage.css'

/** ~20 common cuisines; merged with DB list but only labels in this set are kept from the API. */
const FALLBACK_CUISINES = [
  'American',
  'Chinese',
  'Italian',
  'Mexican',
  'Japanese',
  'Indian',
  'Thai',
  'French',
  'Korean',
  'Mediterranean',
  'Greek',
  'Spanish',
  'Vietnamese',
  'Middle Eastern',
  'Seafood',
  'Pizza',
  'Burgers',
  'Steakhouses',
  'Latin American',
  'Caribbean',
]

/** Extra metros shown after DB-backed cities (avoids empty dropdown when subset has few cities). Roughly ordered by restaurant volume from project DB snapshot. */
const FALLBACK_LOCATIONS = [
  'Philadelphia, PA',
  'Tampa, FL',
  'Indianapolis, IN',
  'Nashville, TN',
  'Tucson, AZ',
  'New Orleans, LA',
  'Edmonton, AB',
  'Saint Louis, MO',
  'Reno, NV',
  'Boise, ID',
  'Santa Barbara, CA',
  'Clearwater, FL',
  'Wilmington, DE',
  'St. Louis, MO',
  'Metairie, LA',
  'Saint Petersburg, FL',
  'Franklin, TN',
  'St. Petersburg, FL',
  'Sparks, NV',
  'Brandon, FL',
  'Pittsburgh, PA',
  'New York, NY',
  'Brooklyn, NY',
  'Los Angeles, CA',
  'San Diego, CA',
  'San Francisco, CA',
  'San Jose, CA',
  'Sacramento, CA',
  'Chicago, IL',
  'Houston, TX',
  'Dallas, TX',
  'Austin, TX',
  'San Antonio, TX',
  'Phoenix, AZ',
  'Seattle, WA',
  'Denver, CO',
  'Boston, MA',
  'Miami, FL',
  'Orlando, FL',
  'Atlanta, GA',
  'Charlotte, NC',
  'Raleigh, NC',
  'Columbus, OH',
  'Cleveland, OH',
  'Cincinnati, OH',
  'Detroit, MI',
  'Minneapolis, MN',
  'Milwaukee, WI',
  'Baltimore, MD',
  'Washington, DC',
  'Portland, OR',
  'Las Vegas, NV',
  'Louisville, KY',
  'Memphis, TN',
  'Kansas City, MO',
  'Salt Lake City, UT',
  'Honolulu, HI',
  'Albuquerque, NM',
  'Omaha, NE',
  'Oklahoma City, OK',
]

/**
 * Parses the search bar when users type "Restaurant, City, ST" or "Restaurant, City".
 * Location segment uses standard City + optional 2-letter state when comma-separated.
 */
function parseTypedSearch(raw) {
  const s = raw.trim()
  if (!s) return { name: '', city: '', state: '' }
  const parts = s.split(',').map((p) => p.trim()).filter((p) => p.length > 0)
  if (parts.length === 1) {
    const only = parts[0]
    const tail = only.match(/^(.+?)\s+([A-Za-z]{2})$/)
    if (tail && /^[A-Za-z]{2}$/.test(tail[2])) {
      return { name: '', city: tail[1].trim(), state: tail[2].toUpperCase() }
    }
    return { name: only, city: '', state: '' }
  }
  const last = parts[parts.length - 1]
  const secondLast = parts[parts.length - 2]

  const compactTail = last.match(/^(.+?)\s+([A-Za-z]{2})$/)
  if (compactTail && /^[A-Za-z]{2}$/.test(compactTail[2])) {
    const cityFromTail = compactTail[1].trim()
    const stateFromTail = compactTail[2].toUpperCase()
    const name = parts.slice(0, -1).join(', ').trim()
    return { name, city: cityFromTail, state: stateFromTail }
  }

  if (/^[a-z]{2}$/i.test(last)) {
    const city = secondLast
    const state = last.toUpperCase()
    const name = parts.slice(0, -2).join(', ')
    return { name: name.trim(), city, state }
  }
  const city = parts[parts.length - 1]
  const name = parts.slice(0, -1).join(', ')
  return { name: name.trim(), city, state: '' }
}

function mergeCuisineOptions(primaryFromDb, fallback) {
  const allowed = new Set(fallback.map((c) => c.toLowerCase()))
  const filtered = primaryFromDb.filter(
    (c) => typeof c === 'string' && allowed.has(c.trim().toLowerCase()),
  )
  return mergeOptionLists(filtered, fallback, true)
}

function priceTierSortKey(price_range) {
  const p = String(price_range ?? '')
    .trim()
    .toLowerCase()
  if (p === '$' || p === '1') return 1
  if (p === '$$' || p === '2') return 2
  if (p === '$$$' || p === '3') return 3
  if (p === '$$$$' || p === '4') return 4
  return null
}

function nameCompareRows(a, b) {
  return (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' })
}

/** Readable tier for UI ($$, maps Yelp-style 1–4). */
function formatPriceDisplay(raw) {
  if (raw == null) return null
  const s = String(raw).trim()
  if (!s) return null
  const lower = s.toLowerCase()
  if (lower === 'unknown') return null
  if (/^[1-4]$/.test(s)) return '$'.repeat(Number.parseInt(s, 10))
  return s
}

function sortSearchResults(rows, sortBy) {
  if (!sortBy || sortBy === 'default') return [...rows]
  const out = [...rows]
  if (sortBy === 'rating_desc') {
    out.sort((a, b) => {
      const ra = parseFloat(a.avg_rating)
      const rb = parseFloat(b.avg_rating)
      const ha = Number.isFinite(ra)
      const hb = Number.isFinite(rb)
      if (!ha && !hb) return nameCompareRows(a, b)
      if (!ha) return 1
      if (!hb) return -1
      if (rb !== ra) return rb - ra
      return nameCompareRows(a, b)
    })
  } else if (sortBy === 'rating_asc') {
    out.sort((a, b) => {
      const ra = parseFloat(a.avg_rating)
      const rb = parseFloat(b.avg_rating)
      const ha = Number.isFinite(ra)
      const hb = Number.isFinite(rb)
      if (!ha && !hb) return nameCompareRows(a, b)
      if (!ha) return 1
      if (!hb) return -1
      if (ra !== rb) return ra - rb
      return nameCompareRows(a, b)
    })
  } else if (sortBy === 'price_asc') {
    out.sort((a, b) => {
      const pa = priceTierSortKey(a.price_range)
      const pb = priceTierSortKey(b.price_range)
      if (pa == null && pb == null) return nameCompareRows(a, b)
      if (pa == null) return 1
      if (pb == null) return -1
      if (pa !== pb) return pa - pb
      return nameCompareRows(a, b)
    })
  } else if (sortBy === 'price_desc') {
    out.sort((a, b) => {
      const pa = priceTierSortKey(a.price_range)
      const pb = priceTierSortKey(b.price_range)
      if (pa == null && pb == null) return nameCompareRows(a, b)
      if (pa == null) return 1
      if (pb == null) return -1
      if (pb !== pa) return pb - pa
      return nameCompareRows(a, b)
    })
  }
  return out
}

/** Street + city/state for result cards (API returns city, state from Location). */
function formatResultAddress(row) {
  const street = row.address != null ? String(row.address).trim() : ''
  const city = row.city != null ? String(row.city).trim() : ''
  const state = row.state != null ? String(row.state).trim() : ''
  const locality = [city, state].filter(Boolean).join(', ')
  if (street && locality) return `${street}, ${locality}`
  if (street) return street
  if (locality) return locality
  return ''
}

function mergeOptionLists(primaryFromDb, fallback, sortAlphabetical = false) {
  const seen = new Set()
  const out = []
  for (const item of primaryFromDb) {
    const key = item.toLowerCase()
    if (!seen.has(key)) {
      seen.add(key)
      out.push(item)
    }
  }
  for (const item of fallback) {
    const key = item.toLowerCase()
    if (!seen.has(key)) {
      seen.add(key)
      out.push(item)
    }
  }
  if (sortAlphabetical) out.sort((a, b) => a.localeCompare(b))
  return out
}

function buildInitialFilterCategories() {
  return {
    cuisine: {
      label: 'cuisine',
      options: [...FALLBACK_CUISINES].sort((a, b) => a.localeCompare(b)),
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
      options: [...FALLBACK_LOCATIONS],
    },
  }
}

export default function SearchPage() {
  const [filterCategories, setFilterCategories] = useState(buildInitialFilterCategories)
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState({
    cuisine: [],
    price: [],
    rating: [],
    location: [],
  })
  const [results, setResults] = useState([])
  const [queryTime, setQueryTime] = useState(null)
  const [cached, setCached] = useState(false)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [searchError, setSearchError] = useState(null)
  const [sortBy, setSortBy] = useState('default')

  const displayedResults = useMemo(() => sortSearchResults(results, sortBy), [results, sortBy])

  useEffect(() => {
    let cancelled = false
    fetch('/api/filters/search-options')
      .then((res) => res.json())
      .then((data) => {
        if (cancelled || !data) return
        const loc = Array.isArray(data.locations) ? data.locations : []
        const cui = Array.isArray(data.cuisines) ? data.cuisines : []
        setFilterCategories((prev) => ({
          ...prev,
          location: {
            ...prev.location,
            options: mergeOptionLists(loc, FALLBACK_LOCATIONS, false),
          },
          cuisine: {
            ...prev.cuisine,
            options: mergeCuisineOptions(cui, FALLBACK_CUISINES),
          },
        }))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

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

  function parseLocationChoice(label) {
    const parts = label.split(',').map((s) => s.trim()).filter(Boolean)
    return {
      city: parts[0] || '',
      state: parts[1] || '',
    }
  }

  async function handleSearch() {
    const typed = parseTypedSearch(searchQuery)
    const dropdownLoc =
      filters.location.length > 0 ? parseLocationChoice(filters.location[0]) : { city: '', state: '' }
    const city = typed.city || dropdownLoc.city
    const stateAbbr = typed.state || dropdownLoc.state
    const cuisine = filters.cuisine.length > 0
      ? filters.cuisine[0]
      : ''
    const minRating = filters.rating.length > 0
      ? parseFloat(filters.rating[0].replace('+', ''))
      : 0

    const hasName = Boolean(typed.name)
    const hasCuisine = Boolean(cuisine)
    const hasPrice = filters.price.length > 0
    const hasMinRating = minRating > 0
    const hasMetro = Boolean(city && stateAbbr)
    const hasNarrowing =
      hasCuisine || hasName || hasPrice || hasMinRating || hasMetro

    if (!city) {
      setSearchError('Add a location.')
      setSearched(true)
      setResults([])
      setQueryTime(null)
      setCached(false)
      return
    }

    if (!hasNarrowing) {
      setSearchError('Need metro (City + ST) or another filter.')
      setSearched(true)
      setResults([])
      setQueryTime(null)
      setCached(false)
      return
    }

    setLoading(true)
    setSearched(true)
    setSearchError(null)

    const params = new URLSearchParams()
    params.set('city', city)
    if (stateAbbr) params.set('state', stateAbbr)
    params.set('cuisine', cuisine)
    params.set('min_rating', String(minRating))
    if (typed.name) params.set('name', typed.name)
    for (const p of filters.price) {
      params.append('price', p)
    }

    const clientStart = performance.now()
    try {
      const resp = await fetch(`/api/restaurants/search?${params}`)
      const data = await resp.json().catch(() => ({}))
      const clientMs = parseFloat((performance.now() - clientStart).toFixed(2))

      if (!resp.ok) {
        setResults([])
        setQueryTime(null)
        setCached(false)
        setSearchError('Check filters and try again.')
        return
      }

      setResults(Array.isArray(data.results) ? data.results : [])
      setQueryTime({
        server: typeof data.queryTime === 'number' ? data.queryTime : null,
        client: clientMs,
      })
      setCached(Boolean(data.cached))
    } catch (err) {
      console.error('Search failed:', err)
      setResults([])
      setQueryTime(null)
      setCached(false)
      setSearchError('Network error — is the server running?')
    } finally {
      setLoading(false)
    }
  }

  function renderStars(rating) {
    const num = parseFloat(rating)
    if (!Number.isFinite(num) || num <= 0) return ''
    const full = Math.floor(num)
    const half = num - full >= 0.25
    const stars = []
    for (let i = 0; i < full; i++) stars.push('★')
    if (half) stars.push('½')
    return stars.join('')
  }

  return (
    <div className="search-page">
      {/* Decorative canopy arch */}
      <div className="search-page__arch">
        <p className="search-page__arch-welcome">welcome to</p>
        <div className="search-page__arch-title-row">
          <svg className="search-page__arch-logo" viewBox="0 0 36 54" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M1.0045 11.485C1.0224 13.6225 1.10676 17.2053 1.16153 19.4547C1.15052 20.1201 1.13986 20.7679 1.13547 21.8492C1.13291 24.4127 1.33295 26.6745 1.6757 27.9245C1.93134 28.6245 2.12656 29.006 2.82013 29.6241C4.344 30.9822 5.91336 32.2861 7.02228 32.782C8.10874 33.2679 8.70085 33.6007 9.73702 33.7634C11.0241 33.9655 13.4547 33.3632 13.5423 34.8665C13.6536 36.7769 13.5201 38.471 13.4768 40.6353C13.4421 42.3713 13.373 45.3276 13.4392 46.9569C13.4998 48.4477 13.2924 51.1714 15.3166 51.5052C16.0387 51.6242 17.9729 52.0582 19.3553 52.0504C21.1301 52.0404 22.5119 52.1561 23.4672 50.9555C23.9566 50.3404 24.2229 48.3857 24.2552 44.8148C24.2725 42.9028 24.2324 39.5862 24.216 37.7096C24.2126 37.3181 23.6689 33.8599 24.4637 33.7529C25.2555 33.6463 26.2623 33.7324 27.3223 33.5368C28.4391 33.3307 29.5265 33.0289 30.3039 32.3896C31.6717 31.2649 33.18 30.1401 33.4945 29.23C33.8097 28.3177 33.9302 27.6658 34.5429 24.1813C34.6939 23.3226 34.9286 22.411 34.9626 20.4597C35.0113 17.6626 34.9358 15.781 34.9349 15.2855C34.9331 14.2344 35.0378 11.3149 34.6098 9.19081C33.8747 5.54292 33.3977 3.7806 32.325 3.17474C31.2407 2.56226 29.8749 2.39657 28.9919 2.83838C28.6835 2.99273 28.2994 3.3509 28.0011 4.06973C27.6569 4.89875 27.4838 7.14073 26.8112 9.72222C26.4033 11.2878 26.0011 12.0841 25.3027 12.5789C24.7601 12.9635 22.0753 14.5665 21.7458 12.9647C21.4996 11.7676 21.6502 10.2605 21.2775 6.63377C21.0633 4.54944 20.9271 3.32118 20.6757 3.01349C20.2075 2.4404 19.4405 1.25637 18.5654 1.13189C17.5264 0.98407 15.8177 0.83496 15.4125 1.43599C15.0051 2.04011 14.5442 2.66569 14.3667 3.58711C13.9647 5.67313 13.8117 8.15461 13.3223 9.88689C13.071 10.7766 13.1748 13.4253 12.0015 13.9591C11.3222 14.2681 10.0863 14.3825 9.54885 13.9036C9.08642 13.4914 8.71724 12.8842 8.52124 11.3105C8.40368 10.3666 8.37086 9.57316 8.20118 8.6495C7.89945 7.00699 7.5236 5.4563 6.70325 5.03341C5.8237 4.57999 4.0583 4.12579 2.94857 4.77421C0.922898 5.95783 0.988191 9.5375 1.0045 11.485Z" fill="#FFF6E0"/>
            <path d="M1.23172 22.3527C1.23172 22.3372 1.23172 22.3216 1.17993 20.2075C1.12814 18.0933 1.02457 13.881 1.0045 11.485C0.988191 9.5375 0.922898 5.95783 2.94857 4.77421C4.0583 4.12579 5.8237 4.57999 6.70325 5.03341C7.5236 5.4563 7.89945 7.00699 8.20118 8.6495C8.37086 9.57316 8.40368 10.3666 8.52124 11.3105C8.71724 12.8842 9.08642 13.4914 9.54885 13.9036C10.0863 14.3825 11.3222 14.2681 12.0015 13.9591C13.1748 13.4253 13.071 10.7766 13.3223 9.88689C13.8117 8.15461 13.9647 5.67313 14.3667 3.58711C14.5442 2.66569 15.0051 2.04011 15.4125 1.43599C15.8177 0.83496 17.5264 0.98407 18.5654 1.13189C19.4405 1.25637 20.2075 2.4404 20.6757 3.01349C20.9271 3.32118 21.0633 4.54944 21.2775 6.63377C21.6502 10.2605 21.4996 11.7676 21.7458 12.9647C22.0753 14.5665 24.7601 12.9635 25.3027 12.5789C26.0011 12.0841 26.4033 11.2878 26.8112 9.72222C27.4838 7.14073 27.6569 4.89875 28.0011 4.06973C28.2994 3.3509 28.6835 2.99273 28.9919 2.83838C29.8749 2.39657 31.2407 2.56226 32.325 3.17474C33.3977 3.7806 33.8747 5.54292 34.6098 9.19081C35.0378 11.3149 34.9331 14.2344 34.9349 15.2855C34.9358 15.781 35.0113 17.6626 34.9626 20.4597C34.9286 22.411 34.6939 23.3226 34.5429 24.1813C33.9302 27.6658 33.8097 28.3177 33.4945 29.23C33.18 30.1401 31.6717 31.2649 30.3039 32.3896C29.5265 33.0289 28.4391 33.3307 27.3223 33.5368C26.2623 33.7324 25.2555 33.6463 24.4637 33.7529C23.6689 33.8599 24.2126 37.3181 24.216 37.7096C24.2324 39.5862 24.2725 42.9028 24.2552 44.8148C24.2229 48.3857 23.9566 50.3404 23.4672 50.9555C22.5119 52.1561 21.1301 52.0404 19.3553 52.0504C17.9729 52.0582 16.0387 51.6242 15.3166 51.5052C13.2924 51.1714 13.4998 48.4477 13.4392 46.9569C13.373 45.3276 13.4421 42.3713 13.4768 40.6353C13.5201 38.471 13.6536 36.7769 13.5423 34.8665C13.4547 33.3632 11.0241 33.9655 9.73702 33.7634C8.70085 33.6007 8.10874 33.2679 7.02228 32.782C5.91336 32.2861 4.344 30.9822 2.82013 29.6241C2.12656 29.006 1.93134 28.6245 1.6757 27.9245C1.33295 26.6745 1.13291 24.4127 1.13547 21.8492C1.13988 20.7636 1.15061 20.1149 1.16166 19.4466" stroke="#FFF6E0" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <p className="search-page__arch-title">forkcast!</p>
        </div>
      </div>

      {/* Tagline */}
      <h1 className="search-page__tagline">find your next best eat</h1>

      {/* Search bar */}
      <div className="search-page__search-bar">
        <div className="search-page__search-input-wrap">
          <input
            type="text"
            className="search-page__search-input"
            placeholder='Name — or "Name, City, ST"'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>
        <button className="search-page__search-btn" onClick={handleSearch}>
          <span className="search-page__search-btn-emoji">🔍</span>
          &nbsp;&nbsp;search
        </button>
      </div>

      {/* Filter dropdowns */}
      <div className="search-page__filters">
        {Object.entries(filterCategories).map(([key, { label, options }]) => (
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

      {/* Results area */}
      <div className="search-page__results-area">
        {loading && (
          <p className="search-page__results-empty">searching...</p>
        )}

        {!loading && !searched && (
          <p className="search-page__results-empty">
            Type “Name, City, ST” or pick filters.
          </p>
        )}

        {searchError && (
          <p className="search-page__results-empty">{searchError}</p>
        )}

        {!loading && searched && !searchError && results.length === 0 && (
          <p className="search-page__results-empty">
            Nothing matched.
          </p>
        )}

        {!loading && results.length > 0 && (
          <div className="search-page__sort-row">
            <label htmlFor="search-sort" className="search-page__sort-label">
              Sort
            </label>
            <select
              id="search-sort"
              className="search-page__sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="default">Name</option>
              <option value="rating_desc">Top rated</option>
              <option value="rating_asc">Lowest rated</option>
              <option value="price_asc">Cheapest</option>
              <option value="price_desc">Priciest</option>
            </select>
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="search-page__results-grid">
            {displayedResults.map((r, i) => {
              const reviewCount = Number(r.review_count) || 0
              const hasReviews = reviewCount > 0 && r.avg_rating != null && r.avg_rating !== ''
              const priceShown = formatPriceDisplay(r.price_range)
              return (
              <div key={`${r.name}-${i}`} className="result-card">
                <div className="result-card__header">
                  <h3 className="result-card__name">{r.name}</h3>
                  <span className="result-card__stars">
                    {hasReviews ? (
                      <>
                        {renderStars(r.avg_rating)}{' '}
                        <span className="result-card__rating-num">
                          {parseFloat(r.avg_rating).toFixed(1)}
                        </span>
                      </>
                    ) : (
                      <span className="result-card__rating-num">no reviews in DB</span>
                    )}
                  </span>
                </div>
                <p className="result-card__address">{formatResultAddress(r) || '—'}</p>
                <p className="result-card__meta">
                  <span className="result-card__meta-label">Price</span>
                  <span className="result-card__meta-value">{priceShown ?? '—'}</span>
                </p>
              </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Timing label */}
      {queryTime && queryTime.server != null && (
        <ApiTimingLabel
          serverMs={queryTime.server}
          clientMs={queryTime.client}
          cached={cached}
        />
      )}
    </div>
  )
}
