-- Tạo bảng lưu lịch sử uống nước theo ngày
CREATE TABLE IF NOT EXISTS water_records (
  id          bigint primary key generated always as identity,
  user_id     uuid   not null references profiles(id) on delete cascade,
  record_date date   not null,
  ml_consumed int    not null default 0,
  goal_ml     int    not null default 2000,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  CONSTRAINT water_records_user_date_unique UNIQUE(user_id, record_date)
);

-- Bật Row Level Security
ALTER TABLE water_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own water records"
  ON water_records FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own water records"
  ON water_records FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own water records"
  ON water_records FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own water records"
  ON water_records FOR DELETE USING (auth.uid() = user_id);
