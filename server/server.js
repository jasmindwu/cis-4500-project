const express = require('express');
const cors = require('cors');
const config = require('./config.json');
const routes = require('./routes');

const app = express();
app.use(cors({ exposedHeaders: ['X-Query-Time'] }));
app.use(express.json());

app.use((req, res, next) => {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6;
    console.log(`${req.method} ${req.originalUrl} — ${ms.toFixed(2)}ms`);
  });
  next();
});

// Static paths before /:name routes to avoid accidental captures

// Distinct cities / cuisines from DB (only places & labels that actually return results)
app.get('/api/filters/search-options', routes.getSearchFilterOptions);

// Route 1 – search restaurants by city, cuisine, min rating
app.get('/api/restaurants/search', routes.searchRestaurants);

// Route 3 – top-rated restaurants in a state
app.get('/api/restaurants/top-rated/:state', routes.getTopRatedRestaurantsByState);

// Route 4 – restaurants above their city's average rating
app.get('/api/restaurants/above-average', routes.getRestaurantsAboveCityAverage);

// Route 2 – dietary restrictions for a restaurant
app.get('/api/restaurants/:name/dietary-restrictions', routes.getRestaurantDietaryRestrictions);

// Route 8 – reviews for a restaurant
app.get('/api/restaurants/:name/reviews', routes.getRestaurantReviews);

// Route 9 – similar restaurants
app.get('/api/restaurants/:name/similar', routes.getSimilarRestaurants);

// Route 5 – most reviewed cuisine per city
app.get('/api/stats/top-cuisine-by-city', routes.getTopCuisineByCity);

// Route 6 – cuisine distribution (count + percentage) by city
app.get('/api/stats/cuisine-distribution', routes.getCuisineDistribution);

// Route 7 – restaurant counts by city
app.get('/api/stats/restaurants-by-city', routes.getRestaurantCountsByCity);

// Route 10 – average rating by cuisine
app.get('/api/stats/average-rating-by-cuisine', routes.getAverageRatingByCuisine);

routes
  .applyPerformanceIndexes()
  .catch((err) => {
    console.error('applyPerformanceIndexes failed:', err);
  })
  .finally(() => {
    const server = app.listen(config.server_port, config.server_host, () => {
      console.log(`Server running at http://${config.server_host}:${config.server_port}/`);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(
          `Port ${config.server_port} is already in use — another process is listening there.\n` +
            `  Fix: stop the old server (Terminal: Ctrl+C), or find and quit it:\n` +
            `       lsof -i :${config.server_port}\n` +
            `       kill <PID>\n` +
            `  Or change "server_port" in server/config.json.`
        );
        process.exit(1);
      }
      console.error(err);
      process.exit(1);
    });
  });
