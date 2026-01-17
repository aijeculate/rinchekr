/**
 * CS.RIN.RU Post Scorer & Filter
 * Implements a weighted scoring system to detect valid update posts
 * and filter out junk/questions.
 */

// 1. POSITIVE INDICATORS (The "Good Stuff")

// Valid File Hosts (Common on RIN)
const VALID_HOSTS = [
    'pixeldrain', 'mega.nz', 'gofile.io', '1fichier', 'rapidgator',
    'qiwi.gg', 'doodrive', 'send.cm', 'clicknupload', 'bowfile',
    'katfile', 'userscloud', 'mixdrop', 'drop.download', 'multiup',
    'buzzheavier', 'mediafire', 'zippyshare' // (Legacy support)
];

// Active Scene Groups & Repackers (2024-2026 era)
const SCENE_GROUPS = [
    'TENOKE', 'RUNE', 'SKIDROW', 'GOLDBERG', 'KAOS',
    'FitGirl', 'DODI', 'ElAmigos', 'GOG', 'Razor1911',
    'FLT', 'CPY', 'PLAZA', 'TiNYiSO', 'DARKSiDERS',
    'I_KnoW', 'Omni', 'InsaneRamZes', 'AR-81'
];

// Technical Keywords (Update Evidence)
const RELEASE_TERMS = [
    'Crack Only', 'CSF', 'Clean Steam Files', 'Repack', 'Portable',
    'Build', 'Update v', 'Hotfix', 'Changelog', 'Patch',
    'DLC Unlocker', 'Steam-Rip', 'AIO Update', 'No-DVD',
    'Goldberg Emu', 'SmartSteamEmu', 'SSE', 'Online-Fix'
];

// 2. NEGATIVE INDICATORS (The "Junk")

// The "Beggar" List (Immediate Negative Score)
const JUNK_TERMS = [
    'eta?', 'any news', 'dead link', 'reupload', 'doesn\'t work',
    'help please', 'password?', 'rar password', 'virus?', 'trojan',
    'is this safe', 'multiplayer?', 'co-op?', 'when is',
    'update please', 'anyone have', 'can someone', 'seed please',
    'link expired', 'part 2 missing', 'google drive quota'
];

/**
 * Calculates a score for a forum post to determine if it's a valid update.
 * @param postHtml The raw HTML of the post content (to check links/structure)
 * @param postText The plain text content of the post (to check keywords)
 * @returns {number} The calculated score. > 15 is typically considered a match.
 */
export function calculatePostScore(postHtml: string, postText: string): number {
    const lowerHtml = postHtml.toLowerCase();
    const lowerText = postText.toLowerCase();

    // 1. Hard Fail (Gatekeeper)
    // Must contain a link OR a code box
    if (!lowerHtml.includes('http') && !lowerHtml.includes('class="codebox"')) {
        return 0;
    }

    // Hard Fail: Short "Thanks" posts
    if (postText.length < 50 && (lowerText.includes('thanks') || lowerText.includes('thx') || lowerText.includes('ty'))) {
        return -100;
    }

    let score = 0;

    // 2. Scoring Logic

    // Host Match (+25)
    // Check HTML for links to hosts, or text mentions
    if (VALID_HOSTS.some(host => lowerHtml.includes(host) || lowerText.includes(host))) {
        score += 25;
    }

    // Scene Group Match (+15)
    if (SCENE_GROUPS.some(group => lowerText.includes(group.toLowerCase()))) {
        score += 15;
    }

    // Release Terms Match (+10)
    if (RELEASE_TERMS.some(term => lowerText.includes(term.toLowerCase()))) {
        score += 10;
    }

    // Password Markers (+5)
    // From original request step 2
    if (['pw:', 'password:', 'pass:'].some(marker => lowerText.includes(marker))) {
        score += 5;
    }

    // 3. Penalty Logic

    // Junk Terms (-40)
    if (JUNK_TERMS.some(term => lowerText.includes(term))) {
        score -= 40;
    }

    // Short Question Penalty (-50)
    // Text < 100 chars AND ends with ?
    if (postText.length < 100 && postText.trim().endsWith('?')) {
        score -= 50;
    }

    return score;
}
