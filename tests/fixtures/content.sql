CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  author_id INTEGER NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  view_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  published_at TEXT
);

CREATE TABLE comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL REFERENCES posts(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE likes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL REFERENCES posts(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(post_id, user_id)
);

CREATE TABLE tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE post_tags (
  post_id INTEGER NOT NULL REFERENCES posts(id),
  tag_id INTEGER NOT NULL REFERENCES tags(id),
  PRIMARY KEY (post_id, tag_id)
);

CREATE TABLE subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  plan TEXT NOT NULL DEFAULT 'free',
  started_at TEXT DEFAULT (datetime('now')),
  expires_at TEXT
);

-- Indexes
CREATE INDEX idx_posts_author_id ON posts(author_id);
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_comments_post_id ON comments(post_id);
CREATE INDEX idx_likes_post_id ON likes(post_id);

-- Test data
INSERT INTO users (username, email, created_at) VALUES
  ('alice', 'alice@blog.com', '2025-01-01'),
  ('bob', 'bob@blog.com', '2025-02-01'),
  ('charlie', 'charlie@blog.com', '2025-03-01'),
  ('diana', 'diana@blog.com', '2025-04-01'),
  ('eve', 'eve@blog.com', '2025-05-01');

INSERT INTO posts (author_id, title, content, status, view_count, created_at, published_at) VALUES
  (1, 'Getting Started with TypeScript', 'TypeScript is a typed superset of JavaScript...', 'published', 1500, '2025-06-01', '2025-06-01'),
  (1, 'Advanced TypeScript Patterns', 'Let us explore advanced patterns...', 'published', 800, '2025-07-15', '2025-07-15'),
  (2, 'Introduction to React', 'React is a JavaScript library...', 'published', 2000, '2025-06-15', '2025-06-15'),
  (2, 'React Hooks Deep Dive', 'Hooks let you use state...', 'published', 1200, '2025-08-01', '2025-08-01'),
  (3, 'Node.js Best Practices', 'Here are some best practices...', 'published', 900, '2025-09-01', '2025-09-01'),
  (1, 'Draft Post', 'This is a draft...', 'draft', 0, '2026-05-01', NULL),
  (4, 'Python for Data Science', 'Python is great for data...', 'published', 3000, '2025-10-01', '2025-10-01'),
  (5, 'Docker Essentials', 'Docker containers...', 'published', 600, '2025-11-01', '2025-11-01');

INSERT INTO comments (post_id, user_id, content, created_at) VALUES
  (1, 2, 'Great article!', '2025-06-02'),
  (1, 3, 'Very helpful', '2025-06-03'),
  (1, 4, 'Thanks for sharing', '2025-06-04'),
  (3, 1, 'Well explained', '2025-06-16'),
  (3, 5, 'Looking forward to more', '2025-06-17'),
  (4, 1, 'Hooks are amazing', '2025-08-02'),
  (7, 2, 'Python is great!', '2025-10-02'),
  (7, 3, 'Data science FTW', '2025-10-03'),
  (7, 4, 'More pandas content please', '2025-10-04'),
  (7, 5, 'Bookmarked!', '2025-10-05');

INSERT INTO likes (post_id, user_id, created_at) VALUES
  (1, 2, '2025-06-02'), (1, 3, '2025-06-02'), (1, 4, '2025-06-03'), (1, 5, '2025-06-03'),
  (3, 1, '2025-06-16'), (3, 4, '2025-06-16'), (3, 5, '2025-06-17'),
  (4, 1, '2025-08-01'), (4, 3, '2025-08-02'),
  (7, 1, '2025-10-01'), (7, 2, '2025-10-02'), (7, 3, '2025-10-02'), (7, 5, '2025-10-03');

INSERT INTO tags (name) VALUES ('typescript'), ('react'), ('node'), ('python'), ('docker'), ('tutorial');

INSERT INTO post_tags (post_id, tag_id) VALUES
  (1, 1), (1, 6), (2, 1), (3, 2), (3, 6), (4, 2), (5, 3), (7, 4), (8, 5);

INSERT INTO subscriptions (user_id, plan, started_at, expires_at) VALUES
  (1, 'pro', '2025-01-01', '2026-01-01'),
  (2, 'pro', '2025-02-01', '2026-02-01'),
  (3, 'free', '2025-03-01', NULL),
  (4, 'pro', '2025-04-01', '2025-07-01'),
  (5, 'free', '2025-05-01', NULL);
