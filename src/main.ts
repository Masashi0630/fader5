import { PROFILE_IDS } from './core/profiles';
import type { WeekdayProfileId } from './core/types';
import { localDateString, parseDate } from './daily/date';
import { loadSettings } from './storage/storage';
import { App, type Source } from './ui/app';
import './ui/style.css';

const params = new URLSearchParams(location.search);
const debug = params.get('debug') === '1';
const today = localDateString(new Date());

/**
 * 既定は今日のデイリー(初回だけ先にチュートリアル)。?practice=sat(&seed=123) で練習。
 * ?debug=1&date=YYYY-MM-DD で別の日のデイリーを開ける(記録・途中経過は残さない)
 */
function initialSource(): Source {
  const practice = params.get('practice');
  if (practice && (PROFILE_IDS as readonly string[]).includes(practice)) {
    const seed = Number(params.get('seed'));
    const valid = params.has('seed') && Number.isInteger(seed) && seed >= 0 && seed <= 0xffffffff;
    return { kind: 'practice', profile: practice as WeekdayProfileId, seed: valid ? seed : undefined };
  }
  const date = params.get('date');
  if (debug && date && parseDate(date)) return { kind: 'daily', date };
  if (!loadSettings().tutorialDone) return { kind: 'tutorial', step: 0 };
  return { kind: 'daily', date: today };
}

new App(document.getElementById('app')!, { source: initialSource(), today, debug });
