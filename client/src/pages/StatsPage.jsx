import { useCallback, useEffect, useState } from 'react'
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

export default function StatsPage() {
  const [cityFilter, setCityFilter] = useState('')
  const [stateFilter, setStateFilter] = useState('')

  const [byCity, setByCity] = useState([])
  const [byCityTiming, setByCityTiming] = useState(null)

  const [cuisineDist, setCuisineDist] = useState([])
  const [cuisineDistTiming, setCuisineDistTiming] = useState(null)

  const [topCuisine, setTopCuisine] = useState([])
  const [topCuisineTiming, setTopCuisineTiming] = useState(null)

  const [avgByCuisine, setAvgByCuisine] = useState([])
  const [avgByCuisineTiming, setAvgByCuisineTiming] = useState(null)

  const [loading, setLoading] = useState(false)

  const optSuffix = useCallback((params = {}) => {
    const qs = new URLSearchParams()
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        qs.set(key, String(val))
      }
    })
    qs.set('optimized', '1')
    const s = qs.toString()
    return s ? `?${s}` : '?optimized=1'
  }, [])

  const refreshAll = useCallback(async () => {
    setLoading(true)
    try {
      const statsQsParts = {}
      if (cityFilter.trim()) statsQsParts.city = cityFilter.trim()
      if (stateFilter.trim()) statsQsParts.state = stateFilter.trim()
      const statsQs = optSuffix(statsQsParts)

      const [r1, r2, r3, r4] = await Promise.all([
        fetchApi(`/api/stats/restaurants-by-city${optSuffix({})}`),
        fetchApi(`/api/stats/cuisine-distribution${statsQs}`),
        fetchApi(`/api/stats/top-cuisine-by-city${statsQs}`),
        fetchApi(`/api/stats/average-rating-by-cuisine${statsQs}`),
      ])

      setByCity(r1.results)
      setByCityTiming({
        serverMs: r1.serverMs,
        clientMs: r1.clientMs,
        cached: r1.cached,
      })

      setCuisineDist(r2.results)
      setCuisineDistTiming({
        serverMs: r2.serverMs,
        clientMs: r2.clientMs,
        cached: r2.cached,
      })

      setTopCuisine(r3.results)
      setTopCuisineTiming({
        serverMs: r3.serverMs,
        clientMs: r3.clientMs,
        cached: r3.cached,
      })

      setAvgByCuisine(r4.results)
      setAvgByCuisineTiming({
        serverMs: r4.serverMs,
        clientMs: r4.clientMs,
        cached: r4.cached,
      })
    } finally {
      setLoading(false)
    }
  }, [cityFilter, stateFilter, optSuffix])

  useEffect(() => {
    refreshAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- initial load only
  }, [])

  return (
    <div className="data-page">
      <h1 className="data-page__title">stats</h1>
      <p className="data-page__hint">
        Use city and/or state, then <strong>refresh data</strong> — applies to cuisine distribution, top cuisines, and averages (case-insensitive match).
      </p>

      <div className="data-page__panel">
        <div className="data-page__row">
          <div>
            <label className="data-page__label" htmlFor="stats-city">city</label>
            <input
              id="stats-city"
              className="data-page__input"
              placeholder="e.g. Philadelphia"
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && refreshAll()}
            />
          </div>
          <div>
            <label className="data-page__label" htmlFor="stats-state">state</label>
            <input
              id="stats-state"
              className="data-page__input"
              placeholder="e.g. PA (narrows all three tables)"
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && refreshAll()}
            />
          </div>
          <button type="button" className="data-page__btn" onClick={refreshAll}>
            refresh data
          </button>
        </div>
        {loading && <p className="data-page__loading">loading…</p>}
      </div>

      <div className="data-page__panel">
        <h2 className="data-page__section-title">restaurants by city</h2>
        {byCity.length === 0 && !loading && (
          <p className="data-page__empty">no rows returned.</p>
        )}
        {byCity.length > 0 && (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>city</th>
                  <th>state</th>
                  <th>count</th>
                </tr>
              </thead>
              <tbody>
                {byCity.slice(0, 25).map((row, i) => (
                  <tr key={`${row.city}-${row.state}-${i}`}>
                    <td>{row.city}</td>
                    <td>{row.state}</td>
                    <td>{row.restaurant_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {byCityTiming && (
          <ApiTimingLabel
            serverMs={byCityTiming.serverMs}
            clientMs={byCityTiming.clientMs}
            cached={byCityTiming.cached}
          />
        )}
      </div>

      <div className="data-page__panel">
        <h2 className="data-page__section-title">cuisine distribution</h2>
        {cuisineDist.length === 0 && !loading && (
          <p className="data-page__empty">no rows for this filter.</p>
        )}
        {cuisineDist.length > 0 && (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>city</th>
                  <th>state</th>
                  <th>cuisine</th>
                  <th>count</th>
                  <th>%</th>
                </tr>
              </thead>
              <tbody>
                {cuisineDist.slice(0, 40).map((row, i) => (
                  <tr key={`${row.city}-${row.state}-${row.cuisine}-${i}`}>
                    <td>{row.city}</td>
                    <td>{row.state}</td>
                    <td>{row.cuisine}</td>
                    <td>{row.count}</td>
                    <td>{row.percentage}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {cuisineDistTiming && (
          <ApiTimingLabel
            serverMs={cuisineDistTiming.serverMs}
            clientMs={cuisineDistTiming.clientMs}
            cached={cuisineDistTiming.cached}
          />
        )}
      </div>

      <div className="data-page__panel">
        <h2 className="data-page__section-title">top cuisine by reviews (per city)</h2>
        {topCuisine.length === 0 && !loading && (
          <p className="data-page__empty">no rows for this filter.</p>
        )}
        {topCuisine.length > 0 && (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>city</th>
                  <th>state</th>
                  <th>cuisine</th>
                  <th>reviews</th>
                  <th>avg rating</th>
                  <th>rank</th>
                </tr>
              </thead>
              <tbody>
                {topCuisine.slice(0, 40).map((row, i) => (
                  <tr key={`${row.city}-${row.state}-${row.cuisine_type}-${i}`}>
                    <td>{row.city}</td>
                    <td>{row.state}</td>
                    <td>{row.cuisine_type}</td>
                    <td>{row.total_reviews}</td>
                    <td>{row.avg_rating != null ? Number(row.avg_rating).toFixed(2) : ''}</td>
                    <td>{row.rank}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {topCuisineTiming && (
          <ApiTimingLabel
            serverMs={topCuisineTiming.serverMs}
            clientMs={topCuisineTiming.clientMs}
            cached={topCuisineTiming.cached}
          />
        )}
      </div>

      <div className="data-page__panel">
        <h2 className="data-page__section-title">average rating by cuisine</h2>
        {avgByCuisine.length === 0 && !loading && (
          <p className="data-page__empty">no rows for this filter.</p>
        )}
        {avgByCuisine.length > 0 && (
          <div className="data-table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>cuisine</th>
                  <th>avg rating</th>
                  <th>restaurants</th>
                </tr>
              </thead>
              <tbody>
                {avgByCuisine.slice(0, 40).map((row, i) => (
                  <tr key={`${row.cuisine}-${i}`}>
                    <td>{row.cuisine}</td>
                    <td>{row.avg_rating != null ? Number(row.avg_rating).toFixed(2) : ''}</td>
                    <td>{row.restaurant_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {avgByCuisineTiming && (
          <ApiTimingLabel
            serverMs={avgByCuisineTiming.serverMs}
            clientMs={avgByCuisineTiming.clientMs}
            cached={avgByCuisineTiming.cached}
          />
        )}
      </div>
    </div>
  )
}
