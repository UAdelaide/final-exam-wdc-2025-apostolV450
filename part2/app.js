const express = require('express');
////////////////
const session = require('express-session'); // Import express-session
///////////////////////////
const path = require('path');
require('dotenv').config();
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, '/public')));

/////////////////////////////////

app.use(session({ // Configure session middleware
  secret: 'imhungryrn', // Secret key for signing the session ID cookie
  resave: false, // Don't save session if unmodified
  saveUninitialized: true

}));


///////////////////////////

// Routes
const walkRoutes = require('./routes/walkRoutes');
const userRoutes = require('./routes/userRoutes');

app.use('/api/walks', walkRoutes);
app.use('/api/users', userRoutes);
///////////////////////
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
/////////////////////////////////////////
// Export the app instead of listening here
module.exports = app;