require('dotenv').config();
const express = require('express');
const app = express();
const port = process.env.PORT || 3100;
const pool = require('./database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;

const { authenticateToken, authorizeRole } = require('./middleware/auth.js');

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Selamat datang di Rest API!');
});

app.get('/directors', async (req, res) => {
  const sql = "SELECT * FROM directors ORDER BY id ASC";
  try {
    const result = await pool.query(sql);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/directors/:id', async (req, res) => {
  const sql = "SELECT * FROM directors WHERE id = $1";
  const id = Number(req.params.id);
  try {
    const result = await pool.query(sql, [id]);
    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ error: 'Sutradara tidak ditemukan' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/directors', authenticateToken, async (req, res) => {
  const { name, birthYear } = req.body;
  if (!name || !birthYear) return res.status(400).json({ error: 'name dan birthYear wajib diisi' });
  const sql = 'INSERT INTO directors (name, birthYear) VALUES ($1, $2) RETURNING id';
  try {
    const result = await pool.query(sql, [name, birthYear]);
    res.status(201).json({ id: result.rows[0].id, name, birthYear });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/directors/:id', [authenticateToken, authorizeRole('admin')], async (req, res) => {
  const { name, birthYear } = req.body;
  const id = Number(req.params.id);
  if (!name || !birthYear) return res.status(400).json({ error: 'name dan birthYear wajib diisi' });
  const sql = 'UPDATE directors SET name = $1, birthYear = $2 WHERE id = $3';
  try {
    const result = await pool.query(sql, [name, birthYear, id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Sutradara tidak ditemukan' });
    res.json({ id, name, birthYear });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/directors/:id', [authenticateToken, authorizeRole('admin')], async (req, res) => {
  const sql = 'DELETE FROM directors WHERE id = $1';
  const id = Number(req.params.id);
  try {
    const result = await pool.query(sql, [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Sutradara tidak ditemukan' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/movies', async (req, res) => {
  const sql = "SELECT * FROM movies ORDER BY id ASC";
  try {
    const result = await pool.query(sql);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/movies/:id', async (req, res) => {
  const sql = "SELECT * FROM movies WHERE id = $1";
  const id = Number(req.params.id);
  try {
    const result = await pool.query(sql, [id]);
    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ error: 'Film tidak ditemukan' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/movies', authenticateToken, async (req, res) => {
  const { title, director, year } = req.body;
  if (!title || !director || !year) return res.status(400).json({ error: 'title, director, dan year wajib diisi' });
  const sql = 'INSERT INTO movies (title, director, year) VALUES ($1, $2, $3) RETURNING id';
  try {
    const result = await pool.query(sql, [title, director, year]);
    res.status(201).json({ id: result.rows[0].id, title, director, year });
  } catch (err)
 {
    res.status(500).json({ error: err.message });
  }
});

app.put('/movies/:id', [authenticateToken, authorizeRole('admin')], async (req, res) => {
  const { title, director, year } = req.body;
  const id = Number(req.params.id);
  if (!title || !director || !year) return res.status(400).json({ error: 'title, director, dan year wajib diisi' });
  const sql = 'UPDATE movies SET title = $1, director = $2, year = $3 WHERE id = $4';
  try {
    const result = await pool.query(sql, [title, director, year, id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Film tidak ditemukan' });
    res.json({ id, title, director, year });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/movies/:id', [authenticateToken, authorizeRole('admin')], async (req, res) => {
  const sql = 'DELETE FROM movies WHERE id = $1';
  const id = Number(req.params.id);
  try {
    const result = await pool.query(sql, [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Film tidak ditemukan' });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/auth/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password || password.length < 6) return res.status(400).json({ error: 'Username dan password (min 6 char) harus diisi' });
  
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const sql = 'INSERT INTO users (username, password, role) VALUES ($1, $2, $3) RETURNING id';
    const params = [username.toLowerCase(), hashedPassword, 'user'];
    
    const result = await pool.query(sql, params);
    res.status(201).json({ message: 'Registrasi berhasil', userId: result.rows[0].id });
  
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Username sudah digunakan' });
    }
    res.status(500).json({ error: 'Gagal memproses pendaftaran' });
  }
});

app.post('/auth/register-admin', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password || password.length < 6) return res.status(400).json({ error: 'Username dan password (min 6 char) harus diisi' });

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const sql = 'INSERT INTO users (username, password, role) VALUES ($1, $2, $3) RETURNING id';
    const params = [username.toLowerCase(), hashedPassword, 'admin'];
    
    const result = await pool.query(sql, params);
    res.status(201).json({ message: 'Admin berhasil dibuat', userId: result.rows[0].id });

  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Username admin sudah ada' });
    }
    res.status(500).json({ error: 'Gagal memproses pendaftaran admin' });
  }
});


app.post('/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username dan password harus diisi' });
  
  const sql = 'SELECT * FROM users WHERE username = $1';
  
  try {
    const result = await pool.query(sql, [username.toLowerCase()]);
    const user = result.rows[0];
    
    if (!user) return res.status(401).json({ error: 'Kredensial tidak valid' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Kredensial tidak valid' });

    const payload = { 
      user: { 
        id: user.id, 
        username: user.username,
        role: user.role
      } 
    };

    jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' }, (err, token) => {
      if (err) return res.status(500).json({ error: 'Gagal membuat token' });
      res.json({ message: 'Login berhasil', token: token });
    });
  
  } catch (err) {
    res.status(401).json({ error: 'Kredensial tidak valid' });
  }
});

app.get('/profile', authenticateToken, (req, res) => {
  res.json({
    message: 'Token Valid', 
    user: req.user
  });
});

module.exports = app;