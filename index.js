import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import swaggerUi from 'swagger-ui-express';
import Database from 'better-sqlite3';
import { supabase } from './supabaseClient.js';
import { requireAuth } from './middleware/auth.js';

export { supabase };

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize SQLite database
const db = new Database('tasks.db');

// Create table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    done INTEGER DEFAULT 0
  )
`);

// Seed initial tasks if table is empty
const rowCount = db.prepare('SELECT COUNT(*) as count FROM tasks').get().count;
if (rowCount === 0) {
  const insert = db.prepare('INSERT INTO tasks (id, title, done) VALUES (?, ?, ?)');
  insert.run(1, 'Learn the basics of Express.js', 1);
  insert.run(2, 'Build a simple CRUD API', 0);
  insert.run(3, 'Deploy the backend to staging', 0);
}

// Load OpenAPI spec
const openapiSpec = JSON.parse(
  fs.readFileSync(new URL('./openapi.json', import.meta.url), 'utf8')
);

// Enable parsing of JSON request bodies
app.use(express.json());

// Serve Swagger UI
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec));

// Metadata endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    name: "Task API",
    version: "1.0",
    endpoints: ["/tasks"]
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: "ok"
  });
});

// POST /auth/signup
app.post('/auth/signup', async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || typeof email !== 'string' || email.trim() === '' ||
      !password || typeof password !== 'string' || password.trim() === '') {
    return res.status(400).json({
      error: "Email and password are required"
    });
  }

  if (!supabase) {
    return res.status(500).json({
      error: "Supabase client is not configured"
    });
  }

  try {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password
    });

    if (error) {
      return res.status(400).json({
        error: error.message
      });
    }

    if (!data.user) {
      return res.status(400).json({
        error: "Failed to create user"
      });
    }

    return res.status(201).json(data.user);
  } catch (err) {
    return res.status(500).json({
      error: err.message
    });
  }
});

// POST /auth/login
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || typeof email !== 'string' || email.trim() === '' ||
      !password || typeof password !== 'string' || password.trim() === '') {
    return res.status(400).json({
      error: "Email and password are required"
    });
  }

  if (!supabase) {
    return res.status(500).json({
      error: "Supabase client is not configured"
    });
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    });

    if (error || !data || !data.session) {
      return res.status(401).json({
        error: "Invalid login credentials"
      });
    }

    return res.status(200).json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token
    });
  } catch (err) {
    return res.status(500).json({
      error: err.message
    });
  }
});

// POST /auth/logout
app.post('/auth/logout', requireAuth, async (req, res) => {
  if (!supabase) {
    return res.status(500).json({
      error: "Supabase client is not configured"
    });
  }

  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      return res.status(500).json({
        error: error.message
      });
    }

    return res.status(204).send();
  } catch (err) {
    return res.status(500).json({
      error: err.message
    });
  }
});

// GET /public/info
app.get('/public/info', (req, res) => {
  res.status(200).json({
    message: "Welcome stranger! This info is public."
  });
});

// GET /protected/profile
app.get('/protected/profile', requireAuth, (req, res) => {
  res.status(200).json({
    id: req.user.id,
    email: req.user.email,
    created_at: req.user.created_at
  });
});

// GET /protected/dashboard
app.get('/protected/dashboard', requireAuth, (req, res) => {
  res.status(200).json({
    message: `Welcome to your dashboard, ${req.user.email}!`,
    user: {
      id: req.user.id,
      email: req.user.email,
      created_at: req.user.created_at
    }
  });
});

// GET /tasks (SQLite)
app.get('/tasks', (req, res) => {
  const { done, search } = req.query;
  
  // Validation and filtering of the 'done' parameter
  if (done !== undefined) {
    if (done !== 'true' && done !== 'false') {
      return res.status(400).json({
        error: "Query parameter 'done' must be either 'true' or 'false'"
      });
    }
  }

  let query = 'SELECT * FROM tasks';
  const params = [];
  const conditions = [];

  if (done !== undefined) {
    conditions.push('done = ?');
    params.push(done === 'true' ? 1 : 0);
  }

  if (search !== undefined) {
    conditions.push('title LIKE ?');
    params.push(`%${search}%`);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  try {
    const rows = db.prepare(query).all(params);
    const mappedRows = rows.map(r => ({
      id: r.id,
      title: r.title,
      done: r.done === 1
    }));
    res.status(200).json(mappedRows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /tasks/:id (SQLite)
app.get('/tasks/:id', (req, res) => {
  const idParam = req.params.id;
  const taskId = parseInt(idParam, 10);
  
  try {
    const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
    if (!row) {
      return res.status(404).json({
        error: `Task ${idParam} not found`
      });
    }
    res.status(200).json({
      id: row.id,
      title: row.title,
      done: row.done === 1
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /tasks (SQLite)
app.post('/tasks', (req, res) => {
  const { title } = req.body;
  
  // Validation: Missing, empty, or whitespace-only title
  if (!title || typeof title !== 'string' || title.trim() === '') {
    return res.status(400).json({
      error: "Title is required and cannot be empty or whitespace only"
    });
  }
  
  try {
    const trimmedTitle = title.trim();
    const info = db.prepare('INSERT INTO tasks (title, done) VALUES (?, 0)').run(trimmedTitle);
    const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(Number(info.lastInsertRowid));
    
    res.status(201).json({
      id: row.id,
      title: row.title,
      done: row.done === 1
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /tasks/:id (SQLite)
app.put('/tasks/:id', (req, res) => {
  const idParam = req.params.id;
  const taskId = parseInt(idParam, 10);
  
  try {
    const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
    if (!row) {
      return res.status(404).json({
        error: `Task ${idParam} not found`
      });
    }
    
    const { title, done } = req.body;
    
    // Validation: body must contain at least one valid field to update
    if (title === undefined && done === undefined) {
      return res.status(400).json({
        error: "At least one field (title or done) must be provided for update"
      });
    }
    
    // Validation: If title is provided, it must not be empty or whitespace only
    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim() === '') {
        return res.status(400).json({
          error: "Title must be a non-empty string"
        });
      }
    }
    
    // Validation: If done is provided, it must be a boolean
    if (done !== undefined) {
      if (typeof done !== 'boolean') {
        return res.status(400).json({
          error: "Done status must be a boolean value"
        });
      }
    }
    
    const updatedTitle = title !== undefined ? title.trim() : row.title;
    const updatedDone = done !== undefined ? (done ? 1 : 0) : row.done;
    
    db.prepare('UPDATE tasks SET title = ?, done = ? WHERE id = ?').run(updatedTitle, updatedDone, taskId);
    
    res.status(200).json({
      id: taskId,
      title: updatedTitle,
      done: updatedDone === 1
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /tasks/:id (SQLite)
app.delete('/tasks/:id', (req, res) => {
  const idParam = req.params.id;
  const taskId = parseInt(idParam, 10);
  
  try {
    const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
    if (!row) {
      return res.status(404).json({
        error: `Task ${idParam} not found`
      });
    }
    
    db.prepare('DELETE FROM tasks WHERE id = ?').run(taskId);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get task statistics (SQLite)
app.get('/stats', (req, res) => {
  try {
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN done = 1 THEN 1 ELSE 0 END) as done
      FROM tasks
    `).get();
    
    const total = stats.total || 0;
    const done = stats.done || 0;
    const open = total - done;
    
    res.status(200).json({
      total,
      done,
      open
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reset tasks list (SQLite)
app.post('/reset', (req, res) => {
  try {
    db.prepare('DELETE FROM tasks').run();
    
    const insert = db.prepare('INSERT INTO tasks (id, title, done) VALUES (?, ?, ?)');
    insert.run(1, 'Learn the basics of Express.js', 1);
    insert.run(2, 'Build a simple CRUD API', 0);
    insert.run(3, 'Deploy the backend to staging', 0);
    
    res.status(200).json({
      message: "Tasks list has been reset to default values"
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
