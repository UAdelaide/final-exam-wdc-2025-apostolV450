// This is the main server file for the Dog Walk Service API
// It sets up the Express app, connects to the MySQL database,
// and defines the API endpoints for managing dogs, walk requests, and walkers.
// It also includes a function to insert test data into the database when the server starts.

const express = require('express');
const mysql = require('mysql');
const app = express(); // create our Express app

// Set up mysql connection pool
// this lets program reuse DB connections instead of opening a new one each time
const db = mysql.createPool({
  host: 'localhost',
  user: 'root',
  database: 'DogWalkService'

});

//helper function to run SQL queries
function queryDB(sql, params = []) {
  return new Promise((resolve, reject) =>
     {
    db.query(sql, params, (err, results) =>
      {
      if (err) return reject(err); // error occurred during query
      resolve(results); // successful query
    });
  });

}

// This function inserts sample data into the database when the server starts
// Im just doing what I saw in the starthere app.js file
async function insertTestData(){
  try {
    // Only add test users if there aren't any yet
    const users = await queryDB('SELECT COUNT(*) AS count FROM Users');
    if (users[0].count === 0) {
      await queryDB(`
        INSERT INTO Users (username, email, password_hash, role) VALUES
        ('alice123', 'alice@example.com', 'hashed123', 'owner'),
        ('bobwalker', 'bob@example.com', 'hashed456', 'walker'),
        ('carol123', 'carol@example.com', 'hashed789', 'owner'),
        ('daviddog', 'david@example.com', 'hashed000', 'walker'),
        ('emilyowner', 'emily@example.com', 'hashed999', 'owner')
      `);

    }

    // Same logic for the Dogs table
    // Only insert dogs if there are none yet
    const dogs = await queryDB('SELECT COUNT(*) AS count FROM Dogs');
    if (dogs[0].count === 0) {
      await queryDB(`
        INSERT INTO Dogs (owner_id, name, size) VALUES
        ((SELECT user_id FROM Users WHERE username = 'alice123'), 'Max', 'medium'),
        ((SELECT user_id FROM Users WHERE username = 'carol123'), 'Bella', 'small'),
        ((SELECT user_id FROM Users WHERE username = 'emilyowner'), 'Rocky', 'large'),
        ((SELECT user_id FROM Users WHERE username = 'alice123'), 'Buddy', 'medium'),
        ((SELECT user_id FROM Users WHERE username = 'carol123'), 'Daisy', 'small')
      `);
    }

    // Insert walk requests only if there are none yet
    // This ensures we don't duplicate test data every time the server starts
    const walkRequests = await queryDB('SELECT COUNT(*) AS count FROM WalkRequests');
    if (walkRequests[0].count === 0) {
      await queryDB(`
        INSERT INTO WalkRequests (dog_id, requested_time, duration_minutes, location, status) VALUES
        ((SELECT dog_id FROM Dogs WHERE name = 'Max'), '2025-06-10 08:00:00', 30, 'Parklands', 'open'),
        ((SELECT dog_id FROM Dogs WHERE name = 'Bella'), '2025-06-10 09:30:00', 45, 'Beachside Ave', 'accepted'),
        ((SELECT dog_id FROM Dogs WHERE name = 'Rocky'), '2025-06-11 10:00:00', 60, 'City Park', 'open'),
        ((SELECT dog_id FROM Dogs WHERE name = 'Buddy'), '2025-06-12 14:00:00', 20, 'Greenwood Trail', 'open'),
        ((SELECT dog_id FROM Dogs WHERE name = 'Daisy'), '2025-06-13 15:00:00', 40, 'Riverbend Walk', 'cancelled')
      `);


    }

  } catch (err) {
    // If there's an error inserting test data, log it but don't crash the server
    console.error('Couldnt insert test data:', err.message);
  }

 const applications = await queryDB('SELECT COUNT(*) AS count FROM WalkApplications');
    if (applications[0].count === 0) {
      await queryDB(`
        INSERT INTO WalkApplications (request_id, walker_id, status) VALUES
        ((SELECT request_id FROM WalkRequests WHERE dog_id = (SELECT dog_id FROM Dogs WHERE name = 'Bella')),
           (SELECT user_id FROM Users WHERE username = 'bobwalker'), NOW(), 'accepted'),
          ((SELECT request_id FROM WalkRequests WHERE dog_id = (SELECT dog_id FROM Dogs WHERE name = 'Daisy')),
           (SELECT user_id FROM Users WHERE username = 'bobwalker'), NOW(), 'accepted')
      `);
      

// GET /api/dogs
// This route gives us a list of all the dogs and their owners
app.get('/api/dogs', async (req, res) => {
  try {
    const results = await queryDB(`
      SELECT d.name AS dog_name, d.size, u.username AS owner_username
      FROM Dogs d
      JOIN Users u ON d.owner_id = u.user_id
    `);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch dogs', details: err.message });
  }

});

// GET /api/walkrequests/open
// This route gives a list of walk requests that are still open
// It includes the dog's name, requested time, duration, location, and owner's username
app.get('/api/walkrequests/open', async (req, res) => {
  try {
    const results = await queryDB(`
      SELECT wr.request_id, d.name AS dog_name, wr.requested_time,
             wr.duration_minutes, wr.location, u.username AS owner_username
      FROM WalkRequests wr
      JOIN Dogs d ON wr.dog_id = d.dog_id
      JOIN Users u ON d.owner_id = u.user_id
      WHERE wr.status = 'open'
    `);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch open walk requests', details: err.message });
  }

});

// GET /api/walkers/summary
// This route gives a summary of each walker: total ratings, average rating, completed walks
app.get('/api/walkers/summary', async (req, res) => {
  try {
    const results = await queryDB(`
      SELECT u.username AS walker_username,
             COUNT(r.rating_id) AS total_ratings,
             ROUND(AVG(r.rating), 1) AS average_rating,
             (
               SELECT COUNT(*)
               FROM WalkRequests wr
               JOIN WalkApplications wa ON wr.request_id = wa.request_id
               WHERE wr.status = 'completed'
                 AND wa.status = 'accepted'
                 AND wa.walker_id = u.user_id
             ) AS completed_walks
      FROM Users u
      LEFT JOIN WalkRatings r ON u.user_id = r.walker_id
      WHERE u.role = 'walker'
      GROUP BY u.user_id
    `);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch walker summary', details: err.message });
  }
});

// starts the server and inserts test data
const PORT = process.env.PORT || 8080;
insertTestData().then(() => {
  app.listen(PORT, () => {
    console.log(`Server at http://localhost:${PORT}`);
  }
);

});
