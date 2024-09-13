// backend/server.js

require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

app.use(cors({ origin: 'https://aousabdo.github.io' }));
app.use(express.json());

// Helper function to run queries
const query = async (text, params) => {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
};

// Routes

// Initial signup
app.post('/api/initial-signup', async (req, res) => {
  const { name, email } = req.body;
  try {
    console.log('Received signup request:', { name, email });
    // Check if the email already exists
    const existingApplicant = await pool.query('SELECT id FROM applicants WHERE email = $1', [email]);
    
    if (existingApplicant.rows.length > 0) {
      console.log('Applicant already exists:', existingApplicant.rows[0]);
      res.status(200).json({ id: existingApplicant.rows[0].id, message: 'Applicant already exists' });
    } else {
      console.log('Creating new applicant');
      const result = await pool.query(
        'INSERT INTO applicants (name, email) VALUES ($1, $2) RETURNING id',
        [name, email]
      );
      console.log('New applicant created:', result.rows[0]);
      res.status(201).json({ id: result.rows[0].id, message: 'Applicant created successfully' });
    }
  } catch (err) {
    console.error('Error in /api/initial-signup:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// Submit assessment
app.post('/api/submit-assessment', async (req, res) => {
  const { 
    applicant_id, 
    technical_background, 
    aiml_knowledge, 
    career_goals, 
    time_commitment, 
    learning_style, 
    fit_score, 
    feedback 
  } = req.body;
  try {
    console.log('Received assessment data:', req.body); // Add this line for debugging
    const result = await pool.query(
      'INSERT INTO assessments (applicant_id, technical_background, aiml_knowledge, career_goals, time_commitment, learning_style, fit_score, feedback) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id',
      [applicant_id, technical_background, aiml_knowledge, career_goals, time_commitment, learning_style, fit_score, feedback]
    );
    res.status(201).json({ id: result.rows[0].id, message: 'Assessment submitted successfully' });
  } catch (err) {
    console.error('Error in /api/submit-assessment:', err);
    res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

// Submit full application
app.post('/api/submit-application', async (req, res) => {
  const { applicant_id, education, experience, motivation } = req.body;
  try {
    await query(
      'INSERT INTO applications (applicant_id, education, experience, motivation) VALUES ($1, $2, $3, $4)',
      [applicant_id, education, experience, motivation]
    );
    res.status(201).json({ message: 'Application submitted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all applicants (for admin dashboard)
app.get('/api/applicants', async (req, res) => {
  try {
    const result = await query('SELECT * FROM applicants');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Server is running' });
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});