-- Task comments: each task can have its own comments (separate from lead history)

CREATE TABLE task_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  text text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE agency_task_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES agency_tasks(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  text text NOT NULL,
  created_at timestamptz DEFAULT now()
);
