const { Pool } = require('pg');
const config = require('./config.json');

const pool = new Pool({
  host: config.host,
  port: config.port,
  database: config.database,
  user: config.user,
  password: config.password,
  ssl: { rejectUnauthorized: false },
});

const CACHE_TTL_MS = 60_000;
const statsCache = new Map();

function isOptimized(req) {
  const v = req.query.optimized;
  return v === '1' || v === 'true';
}

function cacheGet(key) {
  const row = statsCache.get(key);
  if (!row) return null;
  if (Date.now() > row.expires) {
    statsCache.delete(key);
    return null;
  }
  return row.payload;
}

function cacheSet(key, payload) {
  statsCache.set(key, { expires: Date.now() + CACHE_TTL_MS, payload });
}

function sendResults(res, results, queryTime, cached = false) {
  const body = { results, queryTime, cached };
  res.setHeader('X-Query-Time', String(queryTime));
  res.json(body);
}

const ALLOWED_PRICE_TIERS = new Set(['$', '$$', '$$$', '$$$$']);

/** Parses repeated ?price=$ or comma-separated tiers from Express req.query. */
function parsePriceFilters(priceQuery) {
  if (priceQuery === undefined || priceQuery === null || priceQuery === '') return [];
  const raw = Array.isArray(priceQuery) ? priceQuery : [priceQuery];
  const out = [];
  for (const p of raw) {
    if (typeof p !== 'string') continue;
    for (const part of p.split(',')) {
      const t = part.trim();
      if (ALLOWED_PRICE_TIERS.has(t)) out.push(t);
    }
  }
  return [...new Set(out)];
}

/** Escape % and _ for use in ILIKE ... ESCAPE '\\'. */
function escapeLikePattern(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

async function timeQuery(text, params) {
  const start = process.hrtime.bigint();
  const result = await pool.query(text, params);
  const ms = Number(process.hrtime.bigint() - start) / 1e6;
  return { rows: result.rows, queryTime: parseFloat(ms.toFixed(2)) };
}

const INDEX_STATEMENTS = [
  'CREATE INDEX IF NOT EXISTS idx_location_city ON Location(city)',
  'CREATE INDEX IF NOT EXISTS idx_location_state ON Location(state)',
  'CREATE INDEX IF NOT EXISTS idx_cuisine_type ON Cuisine(type)',
  'CREATE INDEX IF NOT EXISTS idx_restaurant_name ON Restaurant(name)',
  'CREATE INDEX IF NOT EXISTS idx_rating_restaurant_id ON Rating(restaurant_id)',
  'CREATE INDEX IF NOT EXISTS idx_restaurantcuisine_restaurant_id ON RestaurantCuisine(restaurant_id)',
  'CREATE INDEX IF NOT EXISTS idx_restaurantcuisine_cuisine_id ON RestaurantCuisine(cuisine_id)',
  'CREATE INDEX IF NOT EXISTS idx_restaurantdietaryrestriction_restaurant_id ON RestaurantDietaryRestriction(restaurant_id)',
  'CREATE INDEX IF NOT EXISTS idx_restaurantcategory_restaurant_id ON RestaurantCategory(restaurant_id)',
];

async function normalizedRestaurantTablesExist() {
  const { rows } = await pool.query(`
    SELECT lower(table_name) AS t
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND lower(table_name) IN (
        'restaurant',
        'location',
        'cuisine',
        'rating',
        'restaurantcuisine',
        'restaurantdietaryrestriction',
        'restaurantcategory'
      )
  `);
  const have = new Set(rows.map((r) => r.t));
  const required = ['restaurant', 'location', 'cuisine', 'rating', 'restaurantcuisine'];
  return required.every((t) => have.has(t));
}

async function applyPerformanceIndexes() {
  if (config.enable_performance_indexes === false) {
    console.log('Skipping performance indexes (enable_performance_indexes is false).');
    return;
  }

  let schemaReady = false;
  try {
    schemaReady = await normalizedRestaurantTablesExist();
  } catch (e) {
    console.warn('Skipping performance indexes (could not reach database):', e.message);
    return;
  }

  if (!schemaReady) {
    console.warn(
      'Skipping performance indexes: Milestone 2 tables (restaurant, location, cuisine, …) are not in this database yet.\n' +
        '  After you load DDL + data into RDS, restart the server — indexes will apply automatically.'
    );
    return;
  }

  let ok = 0;
  for (const sql of INDEX_STATEMENTS) {
    try {
      await pool.query(sql);
      ok += 1;
    } catch (e) {
      console.warn('Index creation skipped:', e.message.split('\n')[0]);
    }
  }

  if (ok === INDEX_STATEMENTS.length) {
    console.log(`Performance indexes OK (${ok}/${INDEX_STATEMENTS.length}).`);
  } else {
    console.log(`Performance indexes: ${ok}/${INDEX_STATEMENTS.length} applied (others skipped if optional tables are missing).`);
  }
}

// Route 1 – GET /api/restaurants/search?city=&cuisine=&min_rating=&state=&price=&name=
// Requires city + min_rating. Narrow with any of: cuisine, name, price tier(s), min_rating > 0,
// or a state code (city + state scopes the query enough for “browse this metro”).
const searchRestaurants = async function (req, res) {
  const { city, cuisine, min_rating, state } = req.query;
  const cuisineTrim = typeof cuisine === 'string' ? cuisine.trim() : '';
  const nameRaw = typeof req.query.name === 'string' ? req.query.name.trim() : '';
  const minR = parseFloat(min_rating);
  const priceFilters = parsePriceFilters(req.query.price);

  if (!city || min_rating === undefined || min_rating === '' || Number.isNaN(minR)) {
    return res.status(400).json({});
  }

  const stateNorm = typeof state === 'string' && state.trim() !== '' ? state.trim() : null;

  const hasNarrowing =
    cuisineTrim !== '' ||
    nameRaw !== '' ||
    priceFilters.length > 0 ||
    minR > 0 ||
    stateNorm != null;
  if (!hasNarrowing) {
    return res.status(400).json({});
  }

  const params = [city, cuisineTrim, minR, stateNorm];
  let extraWhere = '';
  let idx = 5;

  if (priceFilters.length > 0) {
    extraWhere += `
      AND (
        r.price_range = ANY($${idx}::text[])
        OR (
          CASE TRIM(COALESCE(r.price_range::text, ''))
            WHEN '1' THEN '$'
            WHEN '2' THEN '$$'
            WHEN '3' THEN '$$$'
            WHEN '4' THEN '$$$$'
            ELSE NULL
          END
        ) = ANY($${idx}::text[])
      )`;
    params.push(priceFilters);
    idx += 1;
  }

  if (nameRaw !== '') {
    extraWhere += `
      AND r.name ILIKE $${idx} ESCAPE '\\'`;
    params.push(`%${escapeLikePattern(nameRaw)}%`);
    idx += 1;
  }

  try {
    const { rows, queryTime } = await timeQuery(
      `
    SELECT r.name,
           r.address,
           l.city AS city,
           l.state AS state,
           r.price_range,
           COUNT(rt.id)::int AS review_count,
           CASE WHEN COUNT(rt.id) = 0 THEN NULL ELSE AVG(rt.rating) END::numeric AS avg_rating
    FROM Restaurant r
    JOIN Location l ON r.location_id = l.id
    LEFT JOIN Rating rt ON r.id = rt.restaurant_id
    WHERE LOWER(TRIM(l.city)) = LOWER(TRIM($1::text))
      AND ($4::text IS NULL OR UPPER(TRIM(l.state)) = UPPER(TRIM($4::text)))
      AND (
        TRIM(COALESCE($2::text, '')) = ''
        OR EXISTS (
          SELECT 1 FROM RestaurantCuisine rc
          JOIN Cuisine c ON rc.cuisine_id = c.id
          WHERE rc.restaurant_id = r.id
            AND (
              LOWER(TRIM(c.type)) = LOWER(TRIM($2::text))
              OR LOWER(COALESCE(c.type, '')) LIKE '%' || LOWER(TRIM($2::text)) || '%'
            )
        )
      )
      ${extraWhere}
    GROUP BY r.id, r.name, r.address, r.price_range, l.city, l.state
    HAVING COALESCE(AVG(rt.rating), 0) >= $3
  `,
      params,
    );

    sendResults(res, rows, queryTime, false);
  } catch (e) {
    console.error(e);
    res.status(500).json({ results: [], queryTime: 0 });
  }
};

// Route 2 – GET /api/restaurants/:name/dietary-restrictions
const getRestaurantDietaryRestrictions = async function (req, res) {
  const { name } = req.params;
  if (!name) {
    return res.status(400).json({});
  }

  try {
    const { rows, queryTime } = await timeQuery(
      `
    SELECT r.name, dr.restriction
    FROM Restaurant r
    JOIN RestaurantDietaryRestriction rdr ON r.id = rdr.restaurant_id
    JOIN DietaryRestriction dr ON rdr.restriction_id = dr.id
    WHERE r.name = $1
  `,
      [name],
    );

    sendResults(res, rows, queryTime, false);
  } catch (e) {
    console.error(e);
    res.status(500).json({ results: [], queryTime: 0 });
  }
};

// Route 3 – GET /api/restaurants/top-rated/:state?limit=
const getTopRatedRestaurantsByState = async function (req, res) {
  const { state } = req.params;
  if (!state) {
    return res.status(400).json({});
  }
  const limit = parseInt(req.query.limit, 10) || 10;

  try {
    const { rows, queryTime } = await timeQuery(
      `
    SELECT r.name, l.city, AVG(rt.rating) AS avg_rating
    FROM Restaurant r
    JOIN Location l ON r.location_id = l.id
    JOIN Rating rt ON r.id = rt.restaurant_id
    WHERE l.state = $1
    GROUP BY r.id, r.name, l.city
    ORDER BY avg_rating DESC
    LIMIT $2
  `,
      [state, limit],
    );

    sendResults(res, rows, queryTime, false);
  } catch (e) {
    console.error(e);
    res.status(500).json({ results: [], queryTime: 0 });
  }
};

// Route 4 – GET /api/restaurants/above-average?city=&optimized=
const getRestaurantsAboveCityAverage = async function (req, res) {
  const { city } = req.query;
  const useCte = isOptimized(req);

  let query;
  let params;
  try {
    if (useCte) {
      if (city) {
        query = `
          WITH city_avg AS (
            SELECT l_inner.city, AVG(rt_inner.rating) AS avg_rating
            FROM Restaurant r_inner
            JOIN Location l_inner ON r_inner.location_id = l_inner.id
            JOIN Rating rt_inner ON r_inner.id = rt_inner.restaurant_id
            GROUP BY l_inner.city
          )
          SELECT r.name, l.city, AVG(rt.rating) AS avg_rating
          FROM Restaurant r
          JOIN Location l ON r.location_id = l.id
          JOIN Rating rt ON r.id = rt.restaurant_id
          JOIN city_avg ca ON l.city = ca.city
          WHERE l.city = $1
          GROUP BY r.id, r.name, l.city, ca.avg_rating
          HAVING AVG(rt.rating) > ca.avg_rating
        `;
        params = [city];
      } else {
        query = `
          WITH city_avg AS (
            SELECT l_inner.city, AVG(rt_inner.rating) AS avg_rating
            FROM Restaurant r_inner
            JOIN Location l_inner ON r_inner.location_id = l_inner.id
            JOIN Rating rt_inner ON r_inner.id = rt_inner.restaurant_id
            GROUP BY l_inner.city
          )
          SELECT r.name, l.city, AVG(rt.rating) AS avg_rating
          FROM Restaurant r
          JOIN Location l ON r.location_id = l.id
          JOIN Rating rt ON r.id = rt.restaurant_id
          JOIN city_avg ca ON l.city = ca.city
          GROUP BY r.id, r.name, l.city, ca.avg_rating
          HAVING AVG(rt.rating) > ca.avg_rating
        `;
        params = [];
      }
    } else if (city) {
      query = `
      SELECT r.name, l.city, AVG(rt.rating) AS avg_rating
      FROM Restaurant r
      JOIN Location l ON r.location_id = l.id
      JOIN Rating rt ON r.id = rt.restaurant_id
      WHERE l.city = $1
      GROUP BY r.id, r.name, l.city
      HAVING AVG(rt.rating) > (
        SELECT AVG(rt2.rating)
        FROM Restaurant r2
        JOIN Location l2 ON r2.location_id = l2.id
        JOIN Rating rt2 ON r2.id = rt2.restaurant_id
        WHERE l2.city = $1
      )
    `;
      params = [city];
    } else {
      query = `
      SELECT r.name, l.city, AVG(rt.rating) AS avg_rating
      FROM Restaurant r
      JOIN Location l ON r.location_id = l.id
      JOIN Rating rt ON r.id = rt.restaurant_id
      GROUP BY r.id, r.name, l.city
      HAVING AVG(rt.rating) > (
        SELECT AVG(rt2.rating)
        FROM Restaurant r2
        JOIN Location l2 ON r2.location_id = l2.id
        JOIN Rating rt2 ON r2.id = rt2.restaurant_id
        WHERE l2.city = l.city
      )
    `;
      params = [];
    }

    const cacheKey = `above_avg:${useCte ? 'cte' : 'sub'}:${city || 'ALL'}`;
    if (isOptimized(req)) {
      const hit = cacheGet(cacheKey);
      if (hit) {
        return sendResults(res, hit.rows, hit.queryTime, true);
      }
    }

    const { rows, queryTime } = await timeQuery(query, params);
    if (isOptimized(req)) {
      cacheSet(cacheKey, { rows, queryTime });
    }
    sendResults(res, rows, queryTime, false);
  } catch (e) {
    console.error(e);
    res.status(500).json({ results: [], queryTime: 0 });
  }
};

// Route 5 – GET /api/stats/top-cuisine-by-city?city=&state=&optimized=
const getTopCuisineByCity = async function (req, res) {
  const cityRaw = typeof req.query.city === 'string' ? req.query.city.trim() : '';
  const stateRaw = typeof req.query.state === 'string' ? req.query.state.trim() : '';
  const cacheKey = `top_cuisine:${cityRaw}:${stateRaw}`;

  try {
    if (isOptimized(req)) {
      const hit = cacheGet(cacheKey);
      if (hit) {
        return sendResults(res, hit.rows, hit.queryTime, true);
      }
    }

    const conditions = [];
    const params = [];
    let p = 1;
    if (cityRaw !== '') {
      conditions.push(`LOWER(TRIM(l.city)) = LOWER(TRIM($${p}::text))`);
      params.push(cityRaw);
      p += 1;
    }
    if (stateRaw !== '') {
      conditions.push(`UPPER(TRIM(l.state)) = UPPER(TRIM($${p}::text))`);
      params.push(stateRaw);
      p += 1;
    }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT city, state, cuisine_type, total_reviews, avg_rating, rank
      FROM (
        SELECT l.city AS city,
               l.state AS state,
               c.type AS cuisine_type,
               COUNT(rt.id)::int AS total_reviews,
               AVG(rt.rating) AS avg_rating,
               RANK() OVER (PARTITION BY l.city, l.state ORDER BY COUNT(rt.id) DESC) AS rank
        FROM Restaurant r
        JOIN Location l ON r.location_id = l.id
        JOIN RestaurantCuisine rc ON r.id = rc.restaurant_id
        JOIN Cuisine c ON rc.cuisine_id = c.id
        JOIN Rating rt ON r.id = rt.restaurant_id
        ${whereClause}
        GROUP BY l.city, l.state, c.type
      ) subquery
      WHERE rank = 1
      ORDER BY city, state
    `;

    const { rows, queryTime } = await timeQuery(query, params);
    if (isOptimized(req)) {
      cacheSet(cacheKey, { rows, queryTime });
    }
    sendResults(res, rows, queryTime, false);
  } catch (e) {
    console.error(e);
    res.status(500).json({ results: [], queryTime: 0 });
  }
};

// Route 6 – GET /api/stats/cuisine-distribution?city=&state=&optimized=
const getCuisineDistribution = async function (req, res) {
  const cityRaw = typeof req.query.city === 'string' ? req.query.city.trim() : '';
  const stateRaw = typeof req.query.state === 'string' ? req.query.state.trim() : '';
  const cacheKey = `cuisine_dist:${cityRaw}:${stateRaw}`;

  try {
    if (isOptimized(req)) {
      const hit = cacheGet(cacheKey);
      if (hit) {
        return sendResults(res, hit.rows, hit.queryTime, true);
      }
    }

    const conditions = [];
    const params = [];
    let p = 1;
    if (cityRaw !== '') {
      conditions.push(`LOWER(TRIM(l.city)) = LOWER(TRIM($${p}::text))`);
      params.push(cityRaw);
      p += 1;
    }
    if (stateRaw !== '') {
      conditions.push(`UPPER(TRIM(l.state)) = UPPER(TRIM($${p}::text))`);
      params.push(stateRaw);
      p += 1;
    }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const query = `
      SELECT l.city AS city,
             l.state AS state,
             c.type AS cuisine,
             COUNT(r.id)::int AS count,
             ROUND(
               COUNT(r.id) * 100.0 / SUM(COUNT(r.id)) OVER (PARTITION BY l.city, l.state),
               2
             ) AS percentage
      FROM Restaurant r
      JOIN Location l ON r.location_id = l.id
      JOIN RestaurantCuisine rc ON r.id = rc.restaurant_id
      JOIN Cuisine c ON rc.cuisine_id = c.id
      ${whereClause}
      GROUP BY l.city, l.state, c.type
      ORDER BY l.city, l.state, percentage DESC
    `;

    const { rows, queryTime } = await timeQuery(query, params);
    if (isOptimized(req)) {
      cacheSet(cacheKey, { rows, queryTime });
    }
    sendResults(res, rows, queryTime, false);
  } catch (e) {
    console.error(e);
    res.status(500).json({ results: [], queryTime: 0 });
  }
};

// Route 7 – GET /api/stats/restaurants-by-city
const getRestaurantCountsByCity = async function (req, res) {
  const cacheKey = 'restaurants_by_city';

  try {
    if (isOptimized(req)) {
      const hit = cacheGet(cacheKey);
      if (hit) {
        return sendResults(res, hit.rows, hit.queryTime, true);
      }
    }

    const { rows, queryTime } = await timeQuery(
      `
    SELECT l.city, l.state, COUNT(r.id) AS restaurant_count
    FROM Restaurant r
    JOIN Location l ON r.location_id = l.id
    GROUP BY l.city, l.state
    ORDER BY restaurant_count DESC
  `,
      [],
    );

    if (isOptimized(req)) {
      cacheSet(cacheKey, { rows, queryTime });
    }
    sendResults(res, rows, queryTime, false);
  } catch (e) {
    console.error(e);
    res.status(500).json({ results: [], queryTime: 0 });
  }
};

// Route 8 – GET /api/restaurants/:name/reviews?limit=&min_stars=
const getRestaurantReviews = async function (req, res) {
  const { name } = req.params;
  const limit = req.query.limit ? parseInt(req.query.limit, 10) : null;
  const minStars = req.query.min_stars ? parseFloat(req.query.min_stars) : null;

  let query = `
    SELECT '' AS reviewer_name,
           rt.rating AS stars,
           rt.description AS review_text,
           rt.date::text AS review_date
    FROM Rating rt
    JOIN Restaurant r ON rt.restaurant_id = r.id
    WHERE r.name = $1
  `;
  const params = [name];
  let paramIdx = 2;

  if (minStars !== null && !Number.isNaN(minStars)) {
    query += ` AND rt.rating >= $${paramIdx}`;
    params.push(minStars);
    paramIdx += 1;
  }

  query += ` ORDER BY rt.date DESC`;

  if (limit !== null && !Number.isNaN(limit)) {
    query += ` LIMIT $${paramIdx}`;
    params.push(limit);
  }

  try {
    const { rows, queryTime } = await timeQuery(query, params);
    sendResults(res, rows, queryTime, false);
  } catch (e) {
    console.error(e);
    res.status(500).json({ results: [], queryTime: 0 });
  }
};

// Route 9 – GET /api/restaurants/:name/similar?limit=&optimized=
const getSimilarRestaurants = async function (req, res) {
  const { name } = req.params;
  const limit = parseInt(req.query.limit, 10) || 10;

  try {
    const { rows, queryTime } = await timeQuery(
      `
    SELECT DISTINCT r2.name,
           l2.city,
           c2.type AS cuisine,
           AVG(rt2.rating) AS avg_rating,
           r2.price_range
    FROM Restaurant r
    JOIN RestaurantCuisine rc ON r.id = rc.restaurant_id
    JOIN Cuisine c ON rc.cuisine_id = c.id
    JOIN RestaurantCuisine rc2 ON rc2.cuisine_id = c.id
    JOIN Restaurant r2 ON rc2.restaurant_id = r2.id
    JOIN Location l2 ON r2.location_id = l2.id
    JOIN Rating rt2 ON r2.id = rt2.restaurant_id
    LEFT JOIN Cuisine c2 ON rc2.cuisine_id = c2.id
    WHERE r.name = $1 AND r2.name <> $1
    GROUP BY r2.id, r2.name, l2.city, c2.type, r2.price_range
    ORDER BY avg_rating DESC
    LIMIT $2
  `,
      [name, limit],
    );

    sendResults(res, rows, queryTime, false);
  } catch (e) {
    console.error(e);
    res.status(500).json({ results: [], queryTime: 0 });
  }
};

// Route 10 – GET /api/stats/average-rating-by-cuisine?city=&state=&optimized=
const getAverageRatingByCuisine = async function (req, res) {
  const cityRaw = typeof req.query.city === 'string' ? req.query.city.trim() : '';
  const stateRaw = typeof req.query.state === 'string' ? req.query.state.trim() : '';
  const cacheKey = `avg_rating_cuisine:${cityRaw}:${stateRaw}`;

  try {
    if (isOptimized(req)) {
      const hit = cacheGet(cacheKey);
      if (hit) {
        return sendResults(res, hit.rows, hit.queryTime, true);
      }
    }

    let query = `
    SELECT c.type AS cuisine, AVG(rt.rating) AS avg_rating, COUNT(DISTINCT r.id) AS restaurant_count
    FROM Restaurant r
    JOIN RestaurantCuisine rc ON r.id = rc.restaurant_id
    JOIN Cuisine c ON rc.cuisine_id = c.id
    JOIN Rating rt ON r.id = rt.restaurant_id
    JOIN Location l ON r.location_id = l.id
  `;
    const conditions = [];
    const params = [];
    let paramIdx = 1;

    if (cityRaw !== '') {
      conditions.push(`LOWER(TRIM(l.city)) = LOWER(TRIM($${paramIdx}::text))`);
      params.push(cityRaw);
      paramIdx += 1;
    }
    if (stateRaw !== '') {
      conditions.push(`UPPER(TRIM(l.state)) = UPPER(TRIM($${paramIdx}::text))`);
      params.push(stateRaw);
      paramIdx += 1;
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    query += `
    GROUP BY c.type
    ORDER BY avg_rating DESC
  `;

    const { rows, queryTime } = await timeQuery(query, params);
    if (isOptimized(req)) {
      cacheSet(cacheKey, { rows, queryTime });
    }
    sendResults(res, rows, queryTime, false);
  } catch (e) {
    console.error(e);
    res.status(500).json({ results: [], queryTime: 0 });
  }
};

const getSearchFilterOptions = async function (req, res) {
  try {
    const start = process.hrtime.bigint();

    const locResult = await pool.query(`
      SELECT TRIM(l.city) AS city, TRIM(l.state) AS state, COUNT(r.id)::int AS cnt
      FROM Location l
      JOIN Restaurant r ON r.location_id = l.id
      WHERE TRIM(COALESCE(l.city, '')) <> '' AND TRIM(COALESCE(l.state, '')) <> ''
      GROUP BY TRIM(l.city), TRIM(l.state)
      ORDER BY cnt DESC
      LIMIT 250
    `);

    const cuResult = await pool.query(`
      SELECT DISTINCT TRIM(c.type) AS cuisine
      FROM Cuisine c
      INNER JOIN RestaurantCuisine rc ON rc.cuisine_id = c.id
      WHERE TRIM(COALESCE(c.type, '')) <> ''
      ORDER BY cuisine
    `);

    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    const queryTime = parseFloat(ms.toFixed(2));
    const locations = locResult.rows.map((row) => `${row.city}, ${row.state}`);
    const cuisines = cuResult.rows.map((row) => row.cuisine);
    res.setHeader('X-Query-Time', String(queryTime));
    res.json({ locations, cuisines, queryTime });
  } catch (e) {
    console.error(e);
    res.status(500).json({ locations: [], cuisines: [], queryTime: 0 });
  }
};

module.exports = {
  applyPerformanceIndexes,
  getSearchFilterOptions,
  searchRestaurants,
  getRestaurantDietaryRestrictions,
  getTopRatedRestaurantsByState,
  getRestaurantsAboveCityAverage,
  getTopCuisineByCity,
  getCuisineDistribution,
  getRestaurantCountsByCity,
  getRestaurantReviews,
  getSimilarRestaurants,
  getAverageRatingByCuisine,
};
