// Fullstack My News Post: Node.js + Express + SQLite backend + frontend support (Updated)

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'public'))); // Serve frontend from public folder

// SQLite setup
const dbFile = './news.db';
const db = new sqlite3.Database(dbFile);
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    image TEXT,
    created DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

// File upload setup
if (!fs.existsSync('./uploads')) fs.mkdirSync('./uploads');
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// Routes
// Get all posts
app.get('/posts', (req, res) => {
  db.all(`SELECT * FROM posts ORDER BY datetime(created) DESC`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Create new post
app.post('/posts', upload.single('image'), (req, res) => {
  const { title, description } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });
  const imagePath = req.file ? '/uploads/' + req.file.filename : null;
  db.run(`INSERT INTO posts (title, description, image) VALUES (?, ?, ?)`, [title, description, imagePath], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    db.get(`SELECT * FROM posts WHERE id = ?`, [this.lastID], (err, row) => res.json(row));
  });
});

// Delete post
app.delete('/posts/:id', (req, res) => {
  const id = req.params.id;
  db.get(`SELECT image FROM posts WHERE id = ?`, [id], (err, row) => {
    if (row && row.image && fs.existsSync('.' + row.image)) fs.unlinkSync('.' + row.image);
    db.run(`DELETE FROM posts WHERE id = ?`, [id], (err2) => {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json({ deleted: true });
    });
  });
});

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
