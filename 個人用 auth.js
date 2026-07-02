// ================================================================
//  auth.js — 匿名認証 & セーブデータ連携 (Supabase)
//  依存: なし（CDNで読み込んだ supabase-js を使用）
// ================================================================

// ▼▼▼ ここを自分のSupabaseプロジェクトの値に書き換えてください ▼▼▼
const SUPABASE_URL = 'https://wllgcgkgfxwzzaudqyga.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndsbGdjZ2tnZnh3enphdWRxeWdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3OTkwNTYsImV4cCI6MjA5ODM3NTA1Nn0.L1cQZ0L5iV2LjzZ2bMCF49aB7cdR6TYCtfo0sNpq344';
// ▲▲▲ Supabaseダッシュボード → Project Settings → API から取得 ▲▲▲

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;

// 匿名ログイン（既存セッションがあれば再利用）
async function initPlayer() {
  try {
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (session) {
      currentUser = session.user;
      return currentUser;
    }

    const { data, error } = await supabaseClient.auth.signInAnonymously();
    if (error) {
      console.error('ログイン失敗:', error);
      return null;
    }
    currentUser = data.user;
    return currentUser;
  } catch (e) {
    console.error('initPlayer エラー:', e);
    return null;
  }
}

// 進行状況をクラウドに保存
async function saveProgress(nextStage = null) {
  if (!currentUser) return;
  const saveData = {
    stage: nextStage !== null ? nextStage : state.stage,
    moves: state.moves,
  };
  try {
    const { error } = await supabaseClient
      .from('player_saves')
      .upsert({ user_id: currentUser.id, save_data: saveData, updated_at: new Date() });
    if (error) console.error('保存失敗:', error);
  } catch (e) {
    console.error('saveProgress エラー:', e);
  }
}

// 進行状況をクラウドから読み込み
async function loadProgress() {
  if (!currentUser) return null;
  try {
    const { data, error } = await supabaseClient
      .from('player_saves')
      .select('save_data')
      .eq('user_id', currentUser.id)
      .single();
    if (error) return null; // 初回プレイなど、データがまだない場合
    return data?.save_data ?? null;
  } catch (e) {
    console.error('loadProgress エラー:', e);
    return null;
  }
}

// ステージクリア記録をランキングに登録
async function submitScore(stage, moves) {
  if (!currentUser) return;
  try {
    const { error } = await supabaseClient
      .from('leaderboard')
      .insert({ user_id: currentUser.id, stage, moves });
    if (error) console.error('スコア登録失敗:', error);
  } catch (e) {
    console.error('submitScore エラー:', e);
  }
}

// 指定ステージの上位ランキングを取得（デフォルト5件）
async function getLeaderboard(stage, limit = 5) {
  try {
    const { data, error } = await supabaseClient
      .from('leaderboard')
      .select('moves, created_at')
      .eq('stage', stage)
      .order('moves', { ascending: true })
      .limit(limit);
    if (error) {
      console.error('ランキング取得失敗:', error);
      return [];
    }
    return data ?? [];
  } catch (e) {
    console.error('getLeaderboard エラー:', e);
    return [];
  }
}
