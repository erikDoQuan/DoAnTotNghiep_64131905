const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://jttmfdyyehzmjlysucid.supabase.co',
  'sb_publishable_9SKuUkb04r7N8MoKPDkAfg_5K4_-P-7'
);

const USER_ID = '486fcee0-96b6-472c-b7cd-a954210290ed';

// 10 ngày: 19-28/05/2026 — ml uống thực tế (goal 2000ml/ngày)
const WATER_DATA = [
  { date: '2026-05-19', ml: 1750 },
  { date: '2026-05-20', ml: 2000 },
  { date: '2026-05-21', ml: 1500 },
  { date: '2026-05-22', ml: 2000 },
  { date: '2026-05-23', ml: 1750 },
  { date: '2026-05-24', ml: 2000 },
  { date: '2026-05-25', ml: 1250 },
  { date: '2026-05-26', ml: 1750 },
  { date: '2026-05-27', ml: 2000 },
  { date: '2026-05-28', ml: 1750 },
];

async function seedWater() {
  console.log('💧 Thêm dữ liệu uống nước...');

  for (const entry of WATER_DATA) {
    const { error } = await supabase.from('water_records').upsert(
      {
        user_id: USER_ID,
        record_date: entry.date,
        ml_consumed: entry.ml,
        created_at: `${entry.date}T21:00:00`,
        updated_at: `${entry.date}T21:00:00`,
      },
      { onConflict: 'user_id,record_date' }
    );

    if (error) {
      console.error(`✗ Lỗi ngày ${entry.date}:`, error.message);
    } else {
      const status = entry.ml >= 2000 ? '✓ Đủ mục tiêu' : '~ Chưa đủ';
      console.log(`${status}  ${entry.date}: ${entry.ml}ml`);
    }
  }

  console.log('\n✅ Seed nước hoàn tất!');
}

seedWater().catch(console.error);
