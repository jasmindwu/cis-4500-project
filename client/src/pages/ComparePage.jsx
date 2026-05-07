import { useState } from 'react'
import ApiTimingLabel from '../components/ApiTimingLabel'
import '../components/ApiTimingLabel.css'
import './dataPages.css'

async function fetchApi(url) {
  const t0 = performance.now()
  const resp = await fetch(url)
  const data = await resp.json().catch(() => ({}))
  const clientMs = parseFloat((performance.now() - t0).toFixed(2))
  const serverMs = typeof data.queryTime === 'number' ? data.queryTime : null
  const cached = Boolean(data.cached)
  const results = Array.isArray(data.results) ? data.results : []
  return { results, serverMs, clientMs, cached, ok: resp.ok }
}

export default function ComparePage() {
  const [restaurantName, setRestaurantName] = useState('')
  const [cityFilter, setCityFilter] = useState('')

  const [similar, setSimilar] = useState([])
  const [similarTiming, setSimilarTiming] = useState(null)

  const [aboveAvg, setAboveAvg] = useState([])
  const [aboveTiming, setAboveTiming] = useState(null)

  const [loadingSimilar, setLoadingSimilar] = useState(false)
  const [loadingAbove, setLoadingAbove] = useState(false)

  function similarUrl() {
    const enc = encodeURIComponent(restaurantName.trim())
    const qs = new URLSearchParams({ limit: '10', optimized: '1' })
    return `/api/restaurants/${enc}/similar?${qs}`
  }

  function aboveAvgUrl() {
    const qs = new URLSearchParams({ optimized: '1' })
    if (cityFilter.trim()) qs.set('city', cityFilter.trim())
    return `/api/restaurants/above-average?${qs}`
  }

  async function loadSimilar() {
    if (!restaurantName.trim()) return
    setLoadingSimilar(true)
    setSimilarTiming(null)
    const out = await fetchApi(similarUrl())
    setSimilar(out.results)
    setSimilarTiming({
      serverMs: out.serverMs,
      clientMs: out.clientMs,
      cached: out.cached,
    })
    setLoadingSimilar(false)
  }

  async function loadAboveAverage() {
    setLoadingAbove(true)
    setAboveTiming(null)
    const out = await fetchApi(aboveAvgUrl())
    setAboveAvg(out.results)
    setAboveTiming({
      serverMs: out.serverMs,
      clientMs: out.clientMs,
      cached: out.cached,
    })
    setLoadingAbove(false)
  }

  return (
    <div className="data-page">
      <h1 className="data-page__title">compare</h1>
      <p className="data-page__lead">
        Two tools, two routes. Use either section below.
      </p>

      <section className="data-page__panel">
        <div className="data-page__tool-head">
          <span className="data-page__tool-num">1</span>
          <div>
            <h2 className="data-page__section-title data-page__section-title--inline">Similar restaurants</h2>
            <p className="data-page__section-desc">
              Enter your favorite restaurant name. We list other rows that share a cuisine :)
            </p>
          </div>
        </div>
        <div className="data-page__row">
          <div className="data-page__field-grow">
            <label className="data-page__label" htmlFor="compare-name">
              Restaurant name
            </label>
            <input
              id="compare-name"
              className="data-page__input data-page__input--wide"
              placeholder="e.g. Zahav"
              value={restaurantName}
              onChange={(e) => setRestaurantName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadSimilar()}
            />
          </div>
          <button type="button" className="data-page__btn" onClick={loadSimilar}>
            Find similar
          </button>
        </div>
        {loadingSimilar && <p className="data-page__loading">loading…</p>}
        {!loadingSimilar && similar.length === 0 && (
          <p className="data-page__empty">
            Enter a name, then <strong>Find similar</strong>.
          </p>
        )}
        {similar.length > 0 && (
          <div className="data-table-wrap" style={{ marginTop: 16 }}>
            <table className="data-table">
              <caption className="data-table__caption">
                Shared cuisine with &quot;{restaurantName.trim()}&quot;
              </caption>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>City</th>
                  <th>Cuisine</th>
                  <th>Avg rating</th>
                  <th>Price</th>
                </tr>
              </thead>
              <tbody>
                {similar.map((row, i) => (
                  <tr key={`${row.name}-${i}`}>
                    <td>{row.name}</td>
                    <td>{row.city}</td>
                    <td>{row.cuisine}</td>
                    <td>{row.avg_rating != null ? Number(row.avg_rating).toFixed(2) : '—'}</td>
                    <td>{row.price_range ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {similarTiming && (
          <ApiTimingLabel
            serverMs={similarTiming.serverMs}
            clientMs={similarTiming.clientMs}
            cached={similarTiming.cached}
          />
        )}
      </section>

      <section className="data-page__panel">
        <div className="data-page__tool-head">
          <span className="data-page__tool-num">2</span>
          <div>
            <h2 className="data-page__section-title data-page__section-title--inline">Above city average</h2>
            <p className="data-page__section-desc">
              Rows where mean rating beats that city&apos;s overall mean. Blank city runs all cities (slower).
            </p>
          </div>
        </div>
        <div className="data-page__row">
          <div className="data-page__field-grow">
            <label className="data-page__label" htmlFor="compare-city">
              City (optional)
            </label>
            <input
              id="compare-city"
              className="data-page__input data-page__input--wide"
              placeholder="Philadelphia or blank for all"
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadAboveAverage()}
            />
          </div>
          <button type="button" className="data-page__btn" onClick={loadAboveAverage}>
            Load list
          </button>
        </div>
        {loadingAbove && <p className="data-page__loading">loading…</p>}
        {!loadingAbove && aboveAvg.length === 0 && (
          <p className="data-page__empty">
            <strong>Load list</strong> for places above their city mean.
          </p>
        )}
        {aboveAvg.length > 0 && (
          <div className="data-table-wrap" style={{ marginTop: 16 }}>
            <table className="data-table">
              <caption className="data-table__caption">
                {cityFilter.trim()
                  ? `${cityFilter.trim()}: above city mean`
                  : 'Above city mean, all cities'}
              </caption>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>City</th>
                  <th>Avg rating</th>
                </tr>
              </thead>
              <tbody>
                {aboveAvg.map((row, i) => (
                  <tr key={`${row.name}-${row.city}-${i}`}>
                    <td>{row.name}</td>
                    <td>{row.city}</td>
                    <td>{row.avg_rating != null ? Number(row.avg_rating).toFixed(2) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {aboveTiming && (
          <ApiTimingLabel
            serverMs={aboveTiming.serverMs}
            clientMs={aboveTiming.clientMs}
            cached={aboveTiming.cached}
          />
        )}
      </section>
    </div>
  )
}
