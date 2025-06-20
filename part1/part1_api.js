const express = require('express');
const mysql = require('mysql');
const app = express();

// Create MySQL connection pool
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  database: 'DogWalkService'
});

// Utility to query the DB with error handling
function queryDB(sql, params = []) {
  return new Promise((resolve, reject) => {
    pool.query(sql, params, (err, results) => {
      if (err) return reject(err);
      resolve(results);
    });
  });
}

// Route 1: /api/dogs
app.get('/api/dogs', async (req, res) => {
  try {
    const results = await queryDB(\`
      SELECT d.name AS dog_name, d.size, u.username AS owner_username
      FROM Dogs d
      JOIN Users u ON d.owner_id = u.user_id
    \`);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch dogs' });
  }
});

// Route 2: /api/walkrequests/open
app.get('/api/walkrequests/open', async (req, res) => {
  try {
    const results = await queryDB(\`
      SELECT wr.request_id, d.name AS dog_name, wr.requested_time,
             wr.duration_minutes, wr.location, u.username AS owner_username
      FROM WalkRequests wr
      JOIN Dogs d ON wr.dog_id = d.dog_id
      JOIN Users u ON d.owner_id = u.user_id
      WHERE wr.status = 'open'
    \`);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch open walk requests' });
  }
});

// Route 3: /api/walkers/summary
app.get('/api/walkers/summary', async (req, res) => {
  try {
    const results = await queryDB(\`
      SELECT u.username AS walker_username,
             COUNT(r.rating_id) AS total_ratings,
             ROUND(AVG(r.rating), 1) AS average_rating,
             (
               SELECT COUNT(*)
               FROM WalkRequests wr
               JOIN WalkApplications wa ON wr.request_id = wa.request_id
               WHERE wr.status = 'completed' AND wa.status = 'accepted' AND wa.walker_id = u.user_id
             ) AS completed_walks
      FROM Users u
      LEFT JOIN WalkRatings r ON u.user_id = r.walker_id
      WHERE u.role = 'walker'
      GROUP BY u.user_id
    \`);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch walker summaries' });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log('API server running on http://localhost:' + PORT);
});
