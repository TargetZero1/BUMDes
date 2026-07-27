CREATE TABLE IF NOT EXISTS import_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  imported_by UUID NOT NULL REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  file_name TEXT,
  total_rows INT,
  warnings TEXT[],
  status TEXT DEFAULT 'completed',
  notes TEXT,
  CONSTRAINT status_check CHECK (status IN ('completed', 'failed', 'pending'))
);

ALTER TABLE import_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view import history for accessible units"
  ON import_history
  FOR SELECT
  USING (
    unit_id IN (
      SELECT unit_id FROM profiles
      WHERE id = auth.uid()
      UNION ALL
      SELECT id FROM units WHERE (SELECT can_view_all FROM profiles WHERE id = auth.uid()) = TRUE
    )
  );

CREATE POLICY "Only super admin manages import history"
  ON import_history
  FOR ALL
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin'
  );

CREATE INDEX idx_import_history_unit_id ON import_history(unit_id);
CREATE INDEX idx_import_history_created_at ON import_history(created_at DESC);
CREATE INDEX idx_import_history_imported_by ON import_history(imported_by);
