/**
 * Convert all digits in a string to English (0-9)
 */
export function toEnDigits(str) {
  return String(str).replace(/[\u06F0-\u06F9\u0660-\u0669\d]/g, d =>
    String('0123456789'[Number(d)])
  );
}

/**
 * Set <html lang=... dir=...> based on language
 */
export function setDocumentDirection(lang) {
  const html = document.documentElement;
  if (lang === 'en') {
    html.setAttribute('lang', 'en');
    html.setAttribute('dir', 'ltr');
  } else {
    html.setAttribute('lang', 'fa');
    html.setAttribute('dir', 'rtl');
  }
}
/**
 * i18n.js — Internationalization (Bilingual Support)
 * Contains all UI text labels in Farsi and English
 */
import { Settings, Language } from './Settings.js';

/**
 * Translation Dictionary
 * All UI text organized by category
 */
export const translations = {
  // Home Screen
  home: {
    title: { fa: 'خدای مافیا', en: 'Mafia God' },
    subtitle: { fa: 'ابزار حرفه‌ای مدیریت بازی مافیا', en: 'Professional Mafia Game Management Tool' },
    subtitle2: { fa: 'همه چیز زیر کنترل شماست', en: 'Everything under your control' },
    newGame: { fa: 'بازی جدید', en: 'New Game' },
    continueGame: { fa: 'ادامه بازی', en: 'Continue Game' },
    history: { fa: 'تاریخچه بازی‌ها', en: 'Game History' },
    settings: { fa: 'تنظیمات', en: 'Settings' },
    newGameConfirm: { fa: 'بازی جدید', en: 'New Game' },
    newGameMessage: { fa: 'بازی ذخیره‌شده پاک خواهد شد. ادامه می‌دهید؟', en: 'Saved game will be deleted. Continue?' },
    noHistory: { fa: 'هنوز بازی‌ای انجام نشده است.', en: 'No games played yet.' },
    historyTitle: { fa: 'تاریخچه بازی‌ها', en: 'Game History' },
    players: { fa: 'بازیکن', en: 'players' },
    rounds: { fa: 'دور', en: 'rounds' },
    mafiaWon: { fa: 'مافیا برد', en: 'Mafia Won' },
    citizenWon: { fa: 'شهروند برد', en: 'Citizen Won' },
    independentWon: { fa: 'مستقل برد', en: 'Independent Won' },
    openSnapshot: { fa: 'نمایش کامل خلاصه', en: 'Open full summary' },
    openSnapshotConfirm: { fa: 'این خلاصه ذخیره‌شده را برای نمایش کامل باز می‌کنیم. ادامه می‌دهید؟', en: 'Open this saved summary for full view? (No changes will be applied to the active game)' },
  },
  // Setup-specific messages
  setupExtras: {
    negotiatorRequiredForReporter: { fa: 'برای انتخاب خبرنگار ابتدا مذاکره‌کننده را انتخاب کنید.', en: 'Select Negotiator first to enable Reporter.' },
    reporterRemovedWhenNegotiatorDeselected: { fa: 'خبرنگار حذف شد چون مذاکره‌کننده انتخاب نشده است.', en: 'Reporter removed because Negotiator was deselected.' },
  },
  // Last Action Cards
  lastAction: {
    title: { fa: 'کارت‌های حرکت آخر', en: 'Last Action Cards' },
    drawPrompt: { fa: '%s یک عدد از ۱ تا %n انتخاب کن', en: '%s pick a number from 1 to %n' },
    cardRevealed: { fa: 'کارت شما: %s', en: 'Your card: %s' },
    selectTarget: { fa: 'یک بازیکن انتخاب کنید', en: 'Select a player' },
    cards: {
      1: {
        name: { fa: 'شلیک نهایی', en: 'Final Shoot' },
        desc: { fa: 'یک بازیکن زنده را انتخاب کن — فوری شلیک می‌شود. اگر هدف مصون باشد بی‌اثر است. شب بعد مافیا نمی‌تواند شلیک کند.', en: 'Choose an alive player — they are immediately shot. No effect if the target is shoot-immune. Mafia loses their shot the following night.' }
      },
      2: {
        name: { fa: 'بی‌خوابی', en: 'Insomnia' },
        desc: { fa: 'شب بعد کاملاً حذف می‌شود — هیچ اقدام شبانه‌ای انجام نمی‌شود و مستقیم به روز بعد می‌رویم.', en: 'The next night is completely skipped — no night actions occur and the game goes directly to the next day.' }
      },
      3: {
        name: { fa: 'افشای هویت', en: 'Reveal Identity' },
        desc: { fa: 'خدا نقش واقعی بازیکن حذف‌شده را به همه اعلام می‌کند. این بازیکن دیگر قابل احیا نیست.', en: 'God announces the eliminated player\'s true role to everyone. This player can no longer be revived.' }
      },
      4: {
        name: { fa: 'ذهن زیبا', en: 'Beautiful Mind' },
        desc: { fa: 'یک بازیکن زنده را انتخاب کن و حدس بزن آیا مستقل (جک/زودیاک) است. اگر درست باشد آن بازیکن حذف می‌شود و بازیکن اخراجی به بازی برمی‌گردد!', en: 'Choose an alive player and guess if they are independent (Jack/Zodiac). If correct, that player is eliminated and the voted-out player is revived!' }
      },
      5: {
        name: { fa: 'تغییر چهره', en: 'Face Off' },
        desc: { fa: 'یک بازیکن زنده را انتخاب کن — نقش بازیکن حذف‌شده کاملاً به آن بازیکن منتقل می‌شود (شامل سپر و توانایی‌ها). بازیکن حذف‌شده قابل احیا نیست.', en: 'Choose an alive player — the eliminated player\'s role is fully transferred to them (including shield and abilities). The eliminated player cannot be revived.' }
      },
    }
  },

  // Settings
  settings: {
    title: { fa: 'تنظیمات', en: 'Settings' },
    languageTitle: { fa: 'زبان', en: 'Language' },
    languageDescription: { fa: 'انتخاب زبان نمایش نام و توضیحات نقش‌ها\nChoose the display language for role names and descriptions', en: 'Choose the display language for role names and descriptions\nانتخاب زبان نمایش نام و توضیحات نقش‌ها' },
    farsi: { fa: 'فارسی', en: 'Farsi' },
    farsiDesc: { fa: 'نمایش فقط به فارسی', en: 'Display in Farsi only' },
    english: { fa: 'English', en: 'English' },
    englishDesc: { fa: 'Display in English only', en: 'Display in English only' },
    both: { fa: 'هر دو', en: 'Both' },
    bothDesc: { fa: 'نمایش فارسی و انگلیسی با هم', en: 'Display both languages' },
    save: { fa: 'ذخیره', en: 'Save' },
    saved: { fa: '✓ تنظیمات ذخیره شد', en: '✓ Settings saved' },
  },

  // Setup Screen
  setup: {
    title: { fa: 'راه‌اندازی بازی', en: 'Game Setup' },
    playersTab: { fa: 'بازیکنان', en: 'Players' },
    rolesTab: { fa: 'نقش‌ها', en: 'Roles' },
    assignTab: { fa: 'پخش نقش', en: 'Deal' },
    playersTitle: { fa: 'بازیکنان', en: 'Players' },
    playersSubtitle: { fa: 'اسم بازیکنان را اضافه کنید', en: 'Add player names' },
    playerName: { fa: 'نام بازیکن...', en: 'Player name...' },
    addButton: { fa: 'افزودن', en: 'Add' },
    add: { fa: 'افزودن', en: 'Add' },
    noPlayersYet: { fa: 'هنوز بازیکنی اضافه نشده', en: 'No players added yet' },
    removePlayer: { fa: 'حذف', en: 'Remove' },
    playerExists: { fa: 'این اسم قبلاً اضافه شده!', en: 'This name already exists!' },
    selectRoles: { fa: 'انتخاب نقش‌ها', en: 'Select Roles' },
    selectRolesTitle: { fa: 'انتخاب نقش‌ها', en: 'Select Roles' },
    playersLabel: { fa: 'بازیکنان:', en: 'Players:' },
    selectedRolesLabel: { fa: 'نقش‌های انتخاب شده:', en: 'Selected Roles:' },
    shouldBe: { fa: '(باید %d باشد)', en: '(should be %d)' },
    roleInfo: { fa: 'توضیحات', en: 'Info' },
    gunnerBlankBullets: { fa: '🟡 مشقی:', en: '🟡 Blank:' },
    gunnerLiveBullets: { fa: '🔴 جنگی:', en: '🔴 Live:' },
    framasonAllies: { fa: '👥 متحدان:', en: '👥 Allies:' },
    negotiatorThreshold: { fa: '📉 آستانه:', en: '📉 Threshold:' },
    sniperShots: { fa: '🎯 تیرها:', en: '🎯 Shots:' },
    assignRolesTitle: { fa: 'پخش نقش‌ها', en: 'Role Deal' },
    playerSingular: { fa: 'بازیکن', en: 'Player' },
    roleSingular: { fa: 'نقش', en: 'Role' },
    matchLabel: { fa: 'تطابق', en: 'Match' },
    selectedRoles: { fa: 'نقش‌های انتخاب‌شده', en: 'Selected Roles' },
    noRoleSelected: { fa: 'نقشی انتخاب نشده', en: 'No roles selected' },
    zodiacSettings: { fa: 'تنظیمات زودیاک — دوره شلیک:', en: 'Zodiac Settings — Shooting Cycle:' },
    everyNight: { fa: 'هر شب', en: 'Every Night' },
    oddNights: { fa: 'شب‌های فرد', en: 'Odd Nights' },
    evenNights: { fa: 'شب‌های زوج', en: 'Even Nights' },
    drWatsonSettings: { fa: 'دکتر واتسون — حداکثر هیل خود:', en: 'Dr. Watson — Max Self-Heals:' },
    drLecterSettings: { fa: 'دکتر لکتر — حداکثر هیل خود:', en: 'Dr. Lecter — Max Self-Heals:' },
    freemasonSettings: { fa: 'تنظیمات فراماسون — حداکثر تعداد متحدان:', en: 'Freemason Settings — Max Allies:' },
    gunnerSettings: { fa: 'تنظیمات تفنگدار:', en: 'Gunner Settings:' },
    morningShotImmunity: { fa: 'مصونیت از تیر صبحگاهی:', en: 'Morning Shot Immunity:' },
    randomAssignAndStart: { fa: 'تخصیص تصادفی و شروع', en: 'Random Assign & Start' },
    backHome: { fa: 'بازگشت به خانه', en: 'Back to Home' },
    startGame: { fa: 'شروع بازی', en: 'Start Game' },
    mafia: { fa: 'مافیا', en: 'Mafia' },
    citizen: { fa: 'شهروند', en: 'Citizen' },
    independent: { fa: 'مستقل', en: 'Independent' },
    warning: { fa: 'هشدار', en: 'Warning' },
    warningMismatch: { fa: 'تعداد نقش‌ها با تعداد بازیکنان یکسان نیست!', en: 'Number of roles doesn\'t match number of players!' },
    minPlayers: { fa: 'حداقل %d بازیکن نیاز است.', en: 'Minimum %d players required.' },
    rolesMismatch: { fa: 'تعداد نقش‌ها (%d) با تعداد بازیکنان (%d) برابر نیست.', en: 'Number of roles (%d) does not equal number of players (%d).' },
    mafiaRequired: { fa: 'حداقل یک نقش مافیا باید انتخاب شود.', en: 'At least one Mafia role must be selected.' },
    mustChooseMafia: { fa: 'باید دقیقاً %d نقش مافیا انتخاب شود.', en: 'Must choose exactly %d Mafia roles.' },
    mustChooseCitizen: { fa: 'باید دقیقاً %d نقش شهروند انتخاب شود.', en: 'Must choose exactly %d Citizen roles.' },
    cannotAddMafia: { fa: 'نمیتوان بیش از %d نقش مافیا انتخاب کرد.', en: 'Cannot add more than %d Mafia roles.' },
    cannotAddCitizen: { fa: 'نمیتوان بیش از %d نقش شهروند انتخاب کرد.', en: 'Cannot add more than %d Citizen roles.' },
    remainingRoles: { fa: 'باید %d نقش دیگر انتخاب کنید', en: 'Select %d more roles' },
    rosterSaved: { fa: 'فهرست بازیکنان ذخیره شد', en: 'Roster saved' },
    rosterLoaded: { fa: 'فهرست بازی‌کنان بارگذاری شد (%d)', en: 'Loaded roster (%d)' },
    clearRosterConfirm: { fa: 'پاک‌کردن فهرست بازیکنان؟', en: 'Clear saved roster?' },
    clearRosterCleared: { fa: 'فهرست بازیکنان پاک شد', en: 'Roster cleared' },
    dragHandle: { fa: 'جابجایی', en: 'Reorder' },
    suggestedPlayersTitle: { fa: 'اسامی پیشنهادی', en: 'Suggested players' },
    person: { fa: 'نفر', en: 'people' },
    zodiacRequiresBodyguard: { fa: 'زودیاک نیاز به محافظ دارد — محافظ به‌طور خودکار اضافه شد.', en: 'Zodiac requires Bodyguard — Bodyguard was added automatically.' },
    cannotRemoveBodyguardWhenZodiac: { fa: 'در حالی که زودیاک انتخاب شده، نمی‌توان محافظ را حذف کرد.', en: 'Cannot remove Bodyguard while Zodiac is selected.' },
    roleInfoTooltip: { fa: 'توضیحات', en: 'Info' },
    jackImmune: { fa: '🔪 جک', en: '🔪 Jack' },
    zodiacImmune: { fa: '♈ زودیاک', en: '♈ Zodiac' },
    teamMafia: { fa: 'تیم مافیا', en: 'Mafia Team' },
    teamCitizen: { fa: 'تیم شهروند', en: 'Citizen Team' },
    teamIndependent: { fa: 'مستقل', en: 'Independent' },
  },

  // Role Reveal
  roleReveal: {
    playerOfTotal: { fa: 'بازیکن %d از %d', en: 'Player %d of %d' },
    rememberRole: { fa: 'نقش خود را به خاطر بسپارید', en: 'Remember your role' },
    tapToReveal: { fa: 'برای دیدن نقش، کارت را لمس کنید', en: 'Tap the card to reveal your role' },
    tapCard: { fa: 'لمس کنید', en: 'Tap to Reveal' },
    nextPlayer: { fa: 'بازیکن بعدی ←', en: 'Next Player ←' },
    startGame: { fa: '🎮 شروع بازی', en: '🎮 Start Game' },
    onlyPlayerShouldSee: { fa: 'فقط %s باید صفحه را ببیند', en: 'Only %s should see the screen' },
    allRevealed: { fa: 'همه نقش‌ها مشخص شد', en: 'All roles revealed' },
    readyForBlindDay: { fa: 'آماده‌اید برای روز کور؟', en: 'Ready for the blind day?' },
    startBlindDay: { fa: '☀️ شروع روز کور', en: '☀️ Start Blind Day' },
    playerName: { fa: 'فقط %s باید صفحه را ببیند', en: 'Only %s should see the screen' },
    next: { fa: 'نفر بعدی', en: 'Next' },
    startNight: { fa: 'شب اول شروع شود', en: 'Start Night 1' },
    warning: { fa: 'قبل از شب', en: 'Before Night' },
    hidePhone: { fa: 'گوشی را مخفی کنید تا بعد از شمارش شب اول را شروع کنید!', en: 'Hide phone and start night 1 after countdown!' },
  },

  // Night Phase
  night: {
    title: { fa: 'شب %d', en: 'Night %d' },
    blindNight: { fa: 'شب کور', en: 'Blind Night' },
    blindNightTitle: { fa: '🌙 شب کور', en: '🌙 Blind Night' },
    nightActionsTitle: { fa: '🎬 اقدامات شبانه', en: '🎬 Night Actions' },
    roundNumber: { fa: 'دور %d', en: 'Round %d' },
    hideDashboard: { fa: '🙈 مخفی کردن داشبورد', en: '🙈 Hide Dashboard' },
    showDashboard: { fa: '👁️ نمایش داشبورد خدا', en: '👁️ Show God Dashboard' },
    endBlindNight: { fa: '☀️ پایان شب کور → روز', en: '☀️ End Blind Night → Day' },
    resolveNightGoToDay: { fa: '☀️ حل شب و رفتن به روز', en: '☀️ Resolve Night & Go to Day' },
    completeSteps: { fa: 'مراحل شبانه را کامل کنید', en: 'Complete night steps' },
    godDashboardTitle: { fa: '👁️ داشبورد خدا — فقط شما می‌بینید', en: '👁️ God Dashboard — Only you see this' },
    noActiveRoles: { fa: 'هیچ نقشی با اقدام شبانه فعال نیست', en: 'No active roles with night actions' },
    wakeUp: { fa: 'بیدار شود', en: 'Wake up' },
    targetSelected: { fa: '✓ هدف: %s', en: '✓ Target: %s' },
    skipped: { fa: '✓ رد شد', en: '✓ Skipped' },
    waiting: { fa: 'در انتظار...', en: 'Waiting...' },
    mafiaTeamMembers: { fa: 'اعضای تیم مافیا:', en: 'Mafia team members:' },
    mafiaKnowEachOther: { fa: 'مافیا همدیگر را شناختند. تأیید کنید.', en: 'Mafia know each other. Confirm.' },
    confirmButton: { fa: '✓ تأیید', en: '✓ Confirm' },
    jackCurseDescription: { fa: '🔪 جک طلسم خود را روی یک نفر می‌گذارد. اگر آن فرد کشته شود یا رأی بگیرد، جک هم حذف می‌شود.', en: '🔪 Jack places his curse on someone. If that person is killed or voted,Jack is also eliminated.' },
    confirmCurse: { fa: '✓ تأیید طلسم', en: '✓ Confirm Curse' },
    skipAction: { fa: 'رد شدن', en: 'Skip' },
    jadoogarBlocked: { fa: '✊ رد شدن — امشب نمی‌توانید اقدام کنید.', en: '✊ Blocked — you cannot act tonight.' },
    jadoogarBlockedBtn: { fa: 'رد شدن', en: 'Blocked' },
    godfatherShoot: { fa: '🔫 شلیک', en: '🔫 Shoot' },
    godfatherSalakhi: { fa: '🗡️ سلاخی', en: '🗡️ Salakhi' },
    godfatherNegotiate: { fa: '🤝 مذاکره', en: '🤝 Negotiate' },
    selectActionFirst: { fa: 'ابتدا نوع اقدام را انتخاب کنید:', en: 'First select action type:' },
    guessedRole: { fa: 'نقش حدس‌زده:', en: 'Guessed role:' },
    salakhiWarning: { fa: '⚠️ در شب سلاخی مافیا شلیک ندارد. اگر حدس درست باشد هدف حذف می‌شود (دکتر و سپر تأثیری ندارد).', en: '⚠️ On salakhi night, mafia has no shoot. If guess is correct, target is eliminated (doctor and shield have no effect).' },
    negotiateInfo: { fa: '🤝 اگر هدف شهروند ساده یا مظنون باشد → به مافیا اضافه می‌شود. در غیر این صورت مذاکره شکست می‌خورد و شلیک مافیا از دست می‌رود.', en: '🤝 If target is simple citizen or suspect → added to mafia. Otherwise negotiation fails and mafia loses their shoot.' },
    bomberDescription: { fa: '💣 بمب‌گذار یک‌بار بمب روی کسی می‌گذارد و رمز ۱ تا ۴ تعیین می‌کند. خدا رمز را به خاطر بسپارد!', en: '💣 Bomber places bomb on someone once and sets password 1-4. God remember the password!' },
    bombPassword: { fa: '🔑 رمز بمب:', en: '🔑 Bomb password:' },
    confirmBomb: { fa: '✓ تأیید بمب', en: '✓ Confirm Bomb' },
    framasonWarning: { fa: '🔺 فراماسون یک نفر را بیدار می‌کند. اگر مافیا (غیر جاسوس) یا مستقل باشد، صبح فردا تمام تیم فراماسون حذف می‌شوند!', en: '🔺 Freemason wakes someone. If mafia (not spy) or independent, tomorrow morning all freemason team is eliminated!' },
    framasonTeam: { fa: '👥 تیم فراماسون (%d نفر):', en: '👥 Freemason team (%d members):' },
    framasonCapacity: { fa: 'ظرفیت باقی‌مانده: %d نفر', en: 'Remaining capacity: %d members' },
    wakeAndAddToTeam: { fa: '✓ بیدار کردن و اضافه به تیم', en: '✓ Wake & Add to Team' },
    skipRecruitment: { fa: 'رد شدن (امشب کسی اضافه نکن)', en: 'Skip (don\'t recruit anyone tonight)' },
    gunnerDescription: { fa: '🔫 تفنگدار تیر به بازیکنان می‌دهد — هر چند تا که دارد ولی حداکثر یک تیر به هر نفر. دارنده صبح می‌تواند شلیک کند.', en: '🔫 Gunner gives bullets to players — any amount they have but max one bullet per person. Holder can shoot in morning.' },
    gunnerInventory: { fa: '📦 موجودی:', en: '📦 Inventory:' },
    assignedBullets: { fa: '📋 تیرهای تخصیص‌داده‌شده:', en: '📋 Assigned bullets:' },
    addBullet: { fa: '➕ اضافه کردن تیر:', en: '➕ Add bullet:' },
    blankBullet: { fa: '🟡 مشقی (%d)', en: '🟡 Blank (%d)' },
    liveBullet: { fa: '🔴 جنگی (%d)', en: '🔴 Live (%d)' },
    confirmBullets: { fa: '✓ تأیید تیرها (%d)', en: '✓ Confirm Bullets (%d)' },
    skipGunner: { fa: 'رد شدن', en: 'Skip' },
    blockedBySorcerer: { fa: 'شما توسط جادوگر بلاک شده‌اید — امشب نمی‌توانید اقدام کنید.', en: 'You were blocked by the Sorcerer — you cannot act tonight.' },
    negotiationSuccess: { fa: '👍 خریداری انجام شده است!', en: '👍 Negotiation succeeded!' },
    negotiationFailed: { fa: '👎 خریداری انجام نشده.', en: '👎 Negotiation failed.' },
    showToReporter: { fa: 'نتیجه را به خبرنگار نشان دهید و تأیید کنید.', en: 'Show result to reporter and confirm.' },
    announceAloud: { fa: 'با صدای بلند اعلام کنید:', en: 'Announce aloud:' },
    mafiaIsNegotiating: { fa: '«مافیا در حال خریداری است»', en: '"Mafia is negotiating"' },
    announced: { fa: '✓ اعلام کردم', en: '✓ Announced' },
    godView: { fa: 'نمای خدا — همه نقش‌ها', en: 'God View — All Roles' },
    alive: { fa: 'زنده', en: 'Alive' },
    dead: { fa: 'مرده', en: 'Dead' },
    nightSteps: { fa: 'مراحل شب', en: 'Night Steps' },
    completed: { fa: 'انجام‌شده', en: 'Completed' },
    target: { fa: 'هدف:', en: 'Target:' },
    mafiaVote: { fa: 'رأی‌گیری مافیا', en: 'Mafia Vote' },
    mafiaMembers: { fa: 'اعضای مافیا', en: 'Mafia Members' },
    chooseAction: { fa: 'انتخاب اقدام', en: 'Choose Action' },
    shoot: { fa: 'شلیک', en: 'Shoot' },
    salakhi: { fa: 'سلاخی', en: 'Salakhi' },
    negotiate: { fa: 'مذاکره', en: 'Negotiate' },
    negotiationLocked: { fa: 'مذاکره قفل شده', en: 'Negotiation Locked' },
    mafiaCount: { fa: 'مافیای زنده', en: 'Alive Mafia' },
    selectTarget: { fa: 'انتخاب هدف', en: 'Select Target' },
    guessRole: { fa: 'حدس نقش دقیق', en: 'Guess Exact Role' },
    actions: { fa: 'اقدامات', en: 'Actions' },
    confirm: { fa: 'تأیید', en: 'Confirm' },
    skip: { fa: 'رد کردن', en: 'Skip' },
    finishNight: { fa: 'پایان شب', en: 'Finish Night' },
    startDay: { fa: 'صبح شود', en: 'Start Morning' },
  },

  // Day Phase
  day: {
    title: { fa: 'روز %d', en: 'Day %d' },
    blindDay: { fa: 'روز کور', en: 'Blind Day' },
    round1: { fa: 'دور ۱', en: 'Round 1' },
    roundNumber: { fa: 'دور %d', en: 'Round %d' },
    resultsTab: { fa: 'نتایج شب', en: 'Night Results' },
    discussionTab: { fa: 'بحث', en: 'Discussion' },
    siestaTab: { fa: '💣 خواب نیم‌روزی', en: '💣 Noon Nap' },
    votingTab: { fa: 'رأی‌گیری', en: 'Voting' },
    blindDayTitle: { fa: '☀️ روز کور — بدون چالش', en: '☀️ Blind Day — No Challenge' },
    blindDayDescription: { fa: 'بازیکنان ۱ دقیقه فرصت صحبت آزاد دارند. هیچ رأی‌گیری یا چالشی انجام نمی‌شود.', en: 'Players have 1 minute for free talk. No voting or challenge happens.' },
    timerStart: { fa: '▶️ شروع', en: '▶️ Start' },
    timerPause: { fa: '⏸️ توقف', en: '⏸️ Pause' },
    timerReset: { fa: '🔄 ریست', en: '🔄 Reset' },
    endBlindDay: { fa: '🌙 پایان روز کور → شب کور', en: '🌙 End Blind Day → Blind Night' },
    blindDayTimeUp: { fa: '⏰ وقت روز کور تمام شد!', en: '⏰ Blind day time is up!' },
    announceResults: { fa: '📢 اعلام نتایج شب', en: '📢 Announce Night Results' },
    salakhiLabel: { fa: '🗡️ سلاخی:', en: '🗡️ Salakhi:' },
    salakhied: { fa: 'سلاخی شد!', en: 'Salakhi\'d!' },
    salakhiFailed: { fa: '🗡️ سلاخی انجام شد اما نادرست بود — کسی حذف نشد.', en: '🗡️ Salakhi attempted but was wrong — no one eliminated.' },
    killedLastNight: { fa: '☠️ کشته‌شدگان شب:', en: '☠️ Killed last night:' },
    noKills: { fa: '✨ کسی در شب نمرد!', en: '✨ No one died at night!' },
    shieldActivated: { fa: '🛡️ سپر فعال شد:', en: '🛡️ Shield activated:' },
    shieldDescription: { fa: 'یک نفر مورد حمله قرار گرفت اما سپرش ضربه را جذب کرد (سپر از بین رفت)', en: 'Someone was attacked but their shield absorbed the hit (shield destroyed)' },
    savedLabel: { fa: '⚕️ نجات‌یافتگان:', en: '⚕️ Saved:' },
    savedDescription: { fa: 'یک نفر مورد حمله قرار گرفت اما نجات یافت (بدون فاش کردن نام)', en: 'Someone was attacked but saved (without revealing name)' },
    silencedToday: { fa: '%s امروز حق صحبت ندارد!', en: '%s cannot speak today!' },
    revivedAnnouncement: { fa: '✝️ %s زنده شد!', en: '✝️ %s was revived!' },
    jackCurseTriggered: { fa: '🔪 طلسم جک فعال شد — جک هم از بازی خارج شد!', en: '🔪 Jack\'s curse triggered — Jack is also eliminated!' },
    framasonContaminated: { fa: '🔺 تیم فراماسون آلوده شد!', en: '🔺 Freemason team contaminated!' },
    framasonContaminationDesc: { fa: 'فراماسون یک بازیکن خطرناک را بیدار کرد — تمام اعضای تیم فراماسون حذف خواهند شد.\n(دکمه «حل فراماسون» در پایین)', en: 'Freemason woke a dangerous player — all freemason team members will be eliminated.\n(button "Resolve Freemason" below)' },
    kaneRevealLabel: { fa: '🎖️ اعلام همشهری کین:', en: '🎖️ Citizen Kane Reveal:' },
    kaneRevealNote: { fa: 'هدف در بازی می‌ماند — مردم می‌توانند رأی بدهند. شب بعد همشهری کین حذف می‌شود.', en: 'Target remains in game — people can vote. Next night Citizen Kane is eliminated.' },
    godSecretInfo: { fa: '👁️ اطلاعات محرمانه خدا', en: '👁️ God\'s Secret Info' },
    godTools: { fa: 'ابزار خدا', en: 'God Tools' },
    setRole: { fa: 'تنظیم نقش', en: 'Set role' },
    setAlive: { fa: 'زنده', en: 'Alive' },
    setSilenced: { fa: 'ساکت', en: 'Silenced' },
    setHealed: { fa: 'در حال درمان', en: 'Healed' },
    setShield: { fa: 'سپر فعال', en: 'Shield active' },
    saveGodSettings: { fa: 'ذخیره تنظیمات خدا', en: 'Save God Settings' },
    investigationResult: { fa: '🔍 نتیجه استعلام کارآگاه:', en: '🔍 Detective investigation result:' },
    blocked: { fa: '✊ بلاک شده', en: '✊ Blocked' },
    bombPlanted: { fa: '💣 بمب روی:', en: '💣 Bomb on:' },
    blockAction: { fa: '🧙 اقدام خنثی‌شده:', en: '🧙 Action blocked:' },
    jackCurseOn: { fa: '🔪 طلسم جک روی:', en: '🔪 Jack\'s curse on:' },
    framasonTeamLabel: { fa: '🔺 تیم فراماسون:', en: '🔺 Freemason team:' },
    contaminated: { fa: '⚠️ آلوده!', en: '⚠️ Contaminated!' },
    activeBullets: { fa: '🔫 تیرهای فعال:', en: '🔫 Active bullets:' },
    resolveFramason: { fa: '🔺 حل فراماسون — حذف تیم آلوده', en: '🔺 Resolve Freemason — Eliminate Contaminated Team' },
    startDiscussion: { fa: '💬 شروع بحث روز', en: '💬 Start Day Discussion' },
    framasonEliminated: { fa: '🔺 تیم فراماسون حذف شد: %s', en: '🔺 Freemason team eliminated: %s' },
    freeDiscussion: { fa: '💬 بحث آزاد', en: '💬 Free Discussion' },
    startTimer: { fa: '▶️ شروع', en: '▶️ Start' },
    pauseTimer: { fa: '⏸️ توقف', en: '⏸️ Pause' },
    resetTimer: { fa: '🔄 ریست', en: '🔄 Reset' },
    alivePlayers: { fa: 'بازیکنان زنده (%d نفر):', en: 'Alive players (%d):' },
    morningShot: { fa: '🔫 تیر صبحگاهی', en: '🔫 Morning Shot' },
    morningShotDescription: { fa: 'بازیکنان دارای تیر می‌توانند اعلام کنند. تیر جنگی استفاده‌نشده در شروع رأی‌گیری منفجر می‌شود!', en: 'Players with bullets can announce. Unused live bullets explode at voting start!' },
    bulletsGodOnly: { fa: '👁️ تیرها (فقط خدا)', en: '👁️ Bullets (God only)' },
    announced: { fa: 'اعلام کرد 🔫', en: 'Announced 🔫' },
    startVoting: { fa: '🗳️ شروع رأی‌گیری', en: '🗳️ Start Voting' },
    liveBulletExploded: { fa: '💥 تیر جنگی منفجر شد: %s', en: '💥 Live bullet exploded: %s' },
    discussionTimeUp: { fa: '⏰ وقت بحث تمام شد!', en: '⏰ Discussion time is up!' },
    whoToShoot: { fa: '🎯 %s به چه کسی شلیک می‌کند؟', en: '🎯 %s shoots who?' },
    shootingInstructions: { fa: 'هدف پس از انتخاب فرصت وصیت دارد. سپس نتیجه اعلام می‌شود.', en: 'Target has will opportunity after selection. Then result is announced.' },
    shootAfterWill: { fa: '💥 شلیک (پس از وصیت)', en: '💥 Shoot (after will)' },
    cancel: { fa: 'لغو', en: 'Cancel' },
    liveBulletWas: { fa: '💥 تیر جنگی بود!', en: '💥 Was a live bullet!' },
    eliminatedSide: { fa: '%s حذف شد — سمت: %s', en: '%s eliminated — side: %s' },
    blankBulletWas: { fa: '🟡 تیر مشقی بود!', en: '🟡 Was a blank bullet!' },
    survived: { fa: '%s زنده ماند.', en: '%s survived.' },
    votingTitle: { fa: '🗳️ رأی‌گیری', en: '🗳️ Voting' },
    votingSubtitle: { fa: 'روی هر بازیکن ضربه بزنید تا رأی‌دهندگان را مدیریت کنید', en: 'Tap each player to manage voters' },
    votingStageFirst: { fa: 'مرحله اول رأی‌گیری', en: 'First Stage Voting' },
    voteCountLabel: { fa: 'تعداد آرا', en: 'Vote Count' },
    enterVotesHelp: { fa: 'برای هر بازیکن، تعداد رأی را وارد کنید', en: 'Enter number of votes for each player' },
    thresholdInfo: { fa: 'آستانه عبور: %d رأی (50%+1)', en: 'Threshold to advance: %d votes (50%+1)' },
    continueToRunoff: { fa: '🗳️ ادامه به دور نهایی', en: '🗳️ Continue to Runoff' },
    runoffTitle: { fa: 'دور نهایی — دفاع و رأی‌گیری', en: 'Runoff — Defense & Voting' },
    executeRunoff: { fa: '⚖️ اعدام (دور نهایی)', en: '⚖️ Execute (Runoff)' },
    runoffTie: { fa: 'مساوی — هیچ‌کس اعدام نمی‌شود', en: 'Tie — no execution' },
    runoffMultiTie: { fa: 'رأی برابر بین: %s — خدا تصمیم بگیرد', en: 'Tied between: %s — God decides' },
    shir: { fa: 'شیر', en: 'Shir (Heads)' },
    khat: { fa: 'خط', en: 'Khat (Tails)' },
    coinTossTitle: { fa: 'شیر یا خط — تصمیم خدا', en: 'Heads or Tails — God decides' },
    coinTossChoose: { fa: 'خدا یکی را انتخاب کند: شیر یا خط', en: 'God: pick Shir or Khat to decide the tie' },
    coinTossResult: { fa: 'نتیجه قرعه: %s — برنده: %s', en: 'Coin toss result: %s — Winner: %s' },
    vote: { fa: 'رأی', en: 'vote' },
    voters: { fa: 'رأی‌دهندگان: %s', en: 'Voters: %s' },
    whoVotedForPlayer: { fa: 'چه کسانی به این بازیکن رأی دادند؟', en: 'Who voted for this player?' },
    doubleVote: { fa: '(×۲)', en: '(×2)' },
    close: { fa: 'بستن', en: 'Close' },
    executeTopVoted: { fa: '⚖️ اعدام بازیکن با بیشترین رأی', en: '⚖️ Execute Top Voted Player' },
    noElimination: { fa: '✋ بدون اعدام', en: '✋ No Elimination' },
    backToDiscussion: { fa: '← بازگشت به بحث', en: '← Back to Discussion' },
    immuneVote: { fa: '%s مصونیت از رأی دارد و قابل اعدام نیست!', en: '%s has vote immunity and cannot be executed!' },
    confirmExecution: { fa: 'تأیید اعدام', en: 'Confirm Execution' },
    executeConfirm: { fa: 'آیا %s اعدام شود؟', en: 'Execute %s?' },
    bombSiestaTitle: { fa: '💣 خواب نیم‌روزی', en: '💣 Noon Nap' },
    siestaAllEyesClosed: { fa: 'همه چشم‌ها بسته! فقط محافظ بیدار است.', en: 'All eyes closed! Only guardian is awake.' },
    bombInFrontOf: { fa: '💣 بمب جلوی: %s', en: '💣 Bomb in front of: %s' },
    guardianWantGuess: { fa: '🛡️ محافظ، آیا می‌خواهید رمز بمب را حدس بزنید؟', en: '🛡️ Guardian, do you want to guess bomb password?' },
    guardianGuessConsequence: { fa: 'حدس درست → بمب خنثی | حدس غلط → محافظ حذف می‌شود', en: 'Correct guess → bomb defused | Wrong guess → guardian eliminated' },
    yesGuess: { fa: 'بله، حدس می‌زنم', en: 'Yes, I guess' },
    noSkip: { fa: 'خیر، رد می‌کنم', en: 'No, I skip' },
    guardianGuessing: { fa: 'محافظ در حال حدس زدن رمز بمب...', en: 'Guardian is guessing bomb password...' },
    guardianSelectCode: { fa: '🛡️ محافظ، رمز را انتخاب کنید:', en: '🛡️ Guardian, select the password:' },
    confirmGuess: { fa: '✅ تأیید حدس', en: '✅ Confirm Guess' },
    guardianSkipped: { fa: 'محافظ رد کرد. ', en: 'Guardian skipped. ' },
    targetsTurn: { fa: 'نوبت فرد بمب‌شده است.', en: 'Target\'s turn now.' },
    targetGuessCode: { fa: '💣 %s، رمز بمب را حدس بزنید!', en: '💣 %s, guess the bomb password!' },
    targetGuessConsequence: { fa: 'حدس درست → بمب خنثی | حدس غلط → حذف می‌شوید', en: 'Correct guess → bomb defused | Wrong guess → you\'re eliminated' },
    selectCode: { fa: 'رمز را انتخاب کنید:', en: 'Select password:' },
    bombDefused: { fa: '✅ بمب خنثی شد!', en: '✅ Bomb defused!' },
    correctCode: { fa: 'رمز درست حدس زده شد.', en: 'Correct code guessed.' },
    guardianWrong: { fa: '💥 محافظ اشتباه زد!', en: '💥 Guardian was wrong!' },
    guardianKilled: { fa: '🛡️ %s (محافظ) به جای فرد بمب‌شده حذف شد.', en: '🛡️ %s (guardian) was eliminated instead of bomb target.' },
    bombExplodedTitle: { fa: '💥 بمب منفجر شد!', en: '💥 Bomb exploded!' },
    wrongCode: { fa: '💣 %s رمز اشتباه زد و حذف شد.', en: '💣 %s guessed wrong code and was eliminated.' },
    siestaResult: { fa: '💣 نتیجه خواب نیم‌روزی', en: '💣 Noon Nap Result' },
    continueToVoting: { fa: '🗳️ ادامه به رأی‌گیری', en: '🗳️ Continue to Voting' },
    morning: { fa: 'صبح', en: 'Morning' },
    announcements: { fa: 'اعلام‌ها', en: 'Announcements' },
    killed: { fa: 'کشته‌شدگان شب', en: 'Killed Last Night' },
    revived: { fa: 'زنده شد', en: 'Revived' },
    silenced: { fa: 'امروز حق صحبت ندارد', en: 'Cannot speak today' },
    kaneReveal: { fa: 'به دستور همشهری کین، %s نقش %s را داشته', en: 'By order of Citizen Kane, %s had the role %s' },
    investigated: { fa: 'استعلام کارآگاه', en: 'Detective Investigation' },
    bombed: { fa: 'بمب روی', en: 'Bomb on' },
    jackCurse: { fa: 'طلسم جک روی', en: 'Jack\'s curse on' },
    discussion: { fa: 'بحث', en: 'Discussion' },
    noonNap: { fa: 'خواب نیم‌روزی', en: 'Noon Nap' },
    voting: { fa: 'رأی‌گیری', en: 'Voting' },
    bombExploded: { fa: 'بمب منفجر شد', en: 'Bomb exploded' },
    nextNight: { fa: 'شب بعد', en: 'Next Night' },
  },

  // Summary
  summary: {
    title: { fa: 'پایان بازی', en: 'Game Over' },
    winner: { fa: 'برنده', en: 'Winner' },
    mafiaWins: { fa: '🔴 تیم مافیا پیروز شد!', en: '🔴 Mafia Team Wins!' },
    citizenWins: { fa: '🔵 تیم شهروند پیروز شد!', en: '🔵 Citizen Team Wins!' },
    independentWins: { fa: '🟣 بازیکن مستقل پیروز شد!', en: '🟣 Independent Player Wins!' },
    afterRounds: { fa: 'بعد از %d دور', en: 'After %d rounds' },
    finalPlayerStatus: { fa: '👥 وضعیت نهایی بازیکنان', en: '👥 Final Player Status' },
    gameReport: { fa: '📜 گزارش بازی', en: '📜 Game Report' },
    roundLabel: { fa: 'دور', en: 'Round' },
    aliveLabel: { fa: 'زنده', en: 'Alive' },
    deadLabel: { fa: 'مرده', en: 'Dead' },
    noEvents: { fa: 'هنوز رویدادی ثبت نشده', en: 'No events recorded yet' },
    timeline: { fa: '📜 خط زمانی بازی', en: '📜 Game Timeline' },
    roundInTimeline: { fa: 'دور %d', en: 'Round %d' },
    rounds: { fa: 'تعداد دورها', en: 'Rounds' },
    players: { fa: 'بازیکنان', en: 'Players' },
    alive: { fa: 'زنده', en: 'Alive' },
    dead: { fa: 'مرده', en: 'Dead' },
    newGame: { fa: '🎮 بازی جدید', en: '🎮 New Game' },
    backHome: { fa: '← بازگشت به خانه', en: '← Back to Home' },
    backGame: { fa: 'بازگشت به بازی', en: 'Back to Game' },
    viewRaw: { fa: 'نمایش خام', en: 'View raw' },
    hideRaw: { fa: 'پنهان کردن خام', en: 'Hide raw' },
    eventType: { fa: 'نوع رویداد', en: 'Event Type' },
    actor: { fa: 'عامل', en: 'Actor' },
    target: { fa: 'هدف', en: 'Target' },
    viewRole: { fa: 'نمایش نقش', en: 'View role' },
    hideRole: { fa: 'پنهان کردن نقش', en: 'Hide role' },
  },

  // Teams
  teams: {
    mafia: { fa: '🔴 تیم مافیا', en: '🔴 Mafia Team' },
    citizen: { fa: '🔵 تیم شهروند', en: '🔵 Citizen Team' },
    independent: { fa: '🟣 مستقل', en: '🟣 Independent' },
    mafiaShort: { fa: 'مافیا', en: 'Mafia' },
    citizenShort: { fa: 'شهروند', en: 'Citizen' },
    independentShort: { fa: 'مستقل', en: 'Independent' },
    mafiaName: { fa: 'تیم مافیا', en: 'Mafia Team' },
    citizenName: { fa: 'تیم شهروند', en: 'Citizen Team' },
    independentName: { fa: 'مستقل', en: 'Independent' },
  },

  // Common
  common: {
    back: { fa: 'بازگشت', en: 'Back' },
    confirm: { fa: 'تأیید', en: 'Confirm' },
    cancel: { fa: 'لغو', en: 'Cancel' },
    save: { fa: 'ذخیره', en: 'Save' },
    delete: { fa: 'حذف', en: 'Delete' },
    edit: { fa: 'ویرایش', en: 'Edit' },
    close: { fa: 'بستن', en: 'Close' },
    ok: { fa: 'باشه', en: 'OK' },
    loading: { fa: 'در حال بارگذاری...', en: 'Loading...' },
    modalConfirm: { fa: 'تأیید', en: 'Confirm' },
    modalCancel: { fa: 'انصراف', en: 'Cancel' },
  },

  // Navigation & Headers
  nav: {
    home: { fa: 'خانه', en: 'Home' },
    setup: { fa: 'چیدمان بازی', en: 'Game Setup' },
    night: { fa: 'شب', en: 'Night' },
    day: { fa: 'روز', en: 'Day' },
    summary: { fa: 'خلاصه', en: 'Summary' },
  },

  header: {
    home: { fa: 'خدای مافیا', en: 'Mafia God' },
    setup: { fa: 'تنظیمات بازی', en: 'Game Setup' },
    roleReveal: { fa: 'نمایش نقش‌ها', en: 'Role Reveal' },
    nightRound: { fa: 'شب %d', en: 'Night %d' },
    dayRound: { fa: 'روز %d', en: 'Day %d' },
    blindNight: { fa: 'شب کور', en: 'Blind Night' },
    blindDay: { fa: 'روز کور', en: 'Blind Day' },
    summary: { fa: 'خلاصه بازی', en: 'Game Summary' },
  },

  // History / Timeline entries
  history: {
    blindDayStart: { fa: '☀️ روز کور آغاز شد — ۱ دقیقه بدون چالش.', en: '☀️ Blind day started — 1 minute no challenge.' },
    blindNightStart: { fa: '🌙 شب کور — فقط تیم مافیا بیدار می‌شوند.', en: '🌙 Blind night — only the Mafia wakes.' },
    nightStart: { fa: '🌙 شب %d آغاز شد.', en: '🌙 Night %d began.' },
    kaneSacrifice: { fa: '🎖️ همشهری کین به دستور خدا حذف شد (بهای افشاگری).', en: '🎖️ Citizen Kane was eliminated by God (cost of reveal).' },
    salakhiDeath: { fa: '🗡️ %s سلاخی شد. (%s)', en: '🗡️ %s salakhi\'d. (%s)' },
    salakhiFail: { fa: '🗡️ سلاخی نادرست بود — %s زنده ماند.', en: '🗡️ Salakhi failed — %s survived.' },
    negotiateSuccess: { fa: '🤝 %s توسط مذاکره به تیم مافیا پیوست.', en: '🤝 %s joined the Mafia via negotiation.' },
    negotiateFail: { fa: '🤝 مذاکره با %s شکست خورد — شلیک مافیا از دست رفت.', en: '🤝 Negotiation with %s failed — Mafia loses shoot.' },
    immune: { fa: '🔫 شلیک مافیا به %s تأثیری نداشت (مصونیت).', en: '🔫 Mafia shoot at %s had no effect (immune).' },
    saveByDoctor: { fa: '⚕️ %s توسط دکتر نجات یافت.', en: '⚕️ %s was saved by a doctor.' },
    mafiaKill: { fa: '🔫 %s توسط مافیا کشته شد.', en: '🔫 %s was killed by the Mafia.' },
    shielded: { fa: '🛡️ سپر %s شلیک را دفع کرد.', en: '🛡️ %s\'s shield absorbed the shot.' },
    cursePlaced: { fa: '🔪 جک طلسم خود را روی %s گذاشت.', en: '🔪 Jack placed his curse on %s.' },
    zodiacBodyguard: { fa: '♈ زودیاک به محافظ شلیک کرد و خودش حذف شد.', en: '♈ Zodiac shot the bodyguard and died.' },
    zodiacKilled: { fa: '♈ %s توسط زودیاک کشته شد.', en: '♈ %s was killed by Zodiac.' },
    sniper_independent: { fa: '🎯 اسنایپر به %s شلیک کرد — مستقل است، هیچ اتفاقی نیفتاد.', en: '🎯 Sniper shot %s — independent, nothing happened.' },
    sniper_godfather_shield: { fa: '🎯 اسنایپر به %s شلیک کرد — پدرخوانده سپر دارد، هیچ اتفاقی نیفتاد.', en: '🎯 Sniper shot %s — Godfather has shield, nothing happened.' },
    sniper_healed: { fa: '🎯 اسنایپر به %s شلیک کرد ولی دکتر لکتر نجاتش داد — تیر هدر رفت.', en: '🎯 Sniper shot %s but Dr Lecter saved them — shot wasted.' },
    sniper_killed: { fa: '🎯 %s توسط اسنایپر کشته شد.', en: '🎯 %s was killed by the Sniper.' },
    sniper_shielded: { fa: '🛡️ سپر %s تیر اسنایپر را دفع کرد.', en: '🛡️ %s\'s shield blocked the Sniper shot.' },
    sniper_miss: { fa: '🎯 اسنایپر اشتباه زد و خودش مرد.', en: '🎯 Sniper missed and died.' },
    investigate_blocked: { fa: '🔍 کارآگاه بلاک شده بود — نتیجه‌ای ندارد. ✊', en: '🔍 Detective was blocked — no result. ✊' },
    investigate_result: { fa: '🔍 کارآگاه %s را بررسی کرد: %s', en: '🔍 Detective checked %s: %s' },
    silence: { fa: '🤐 %s توسط ماتادور سکوت شد.', en: '🤐 %s was silenced by the Matador.' },
    bomb_planted: { fa: '💣 بمب روی %s کار گذاشته شد (رمز: %s).', en: '💣 Bomb planted on %s (code: %s).' },
    revive: { fa: '✝️ %s توسط کنستانتین زنده شد.', en: '✝️ %s was revived by Constantine.' },
    framason_add: { fa: '🔺 فراماسون %s را به تیم اضافه کرد.', en: '🔺 Freemason added %s to the team.' },
    framason_contaminated: { fa: '🔺⚠️ فراماسون %s را بیدار کرد — تیم آلوده شد!', en: '🔺⚠️ Freemason woke %s — team contaminated!' },
    kane_return: { fa: '🎖️ هدف همشهری کین در شب کشته شد — توانایی برگشت.', en: '🎖️ Citizen Kane\'s target died during the night — ability returns.' },
    kane_reveal_success: { fa: '🎖️ همشهری کین %s را افشا کرد: %s', en: '🎖️ Citizen Kane revealed %s: %s' },
    kane_reveal_fail: { fa: '🎖️ همشهری کین اقدام کرد اما هدف شهروند بود — هیچ اعلامی نمی‌شود.', en: '🎖️ Citizen Kane acted but the target was a citizen — no announcement.' },
    jack_curse_chain: { fa: '🔪 %s کشته شد و به همراه آن جک هم از بازی خارج شد (طلسم).', en: '🔪 %s was killed and Jack was eliminated as well (curse).' },
    day_start: { fa: '☀️ روز %d آغاز شد.', en: '☀️ Day %d began.' },
    framason_member_death: { fa: '🔺 %s (تیم فراماسون) حذف شد.', en: '🔺 %s (Freemason team) was eliminated.' },
    vote_immune: { fa: '⚖️ رأی‌گیری علیه %s — اما حذف نشد (مصونیت از رأی).', en: '⚖️ Vote against %s — but not executed (vote immunity).' },
    vote_executed: { fa: '⚖️ %s با رأی‌گیری اعدام شد. (%s)', en: '⚖️ %s was executed by vote. (%s)' },
    execution_with_curse: { fa: '🔪 %s اعدام شد و جک هم به همراه او از بازی خارج شد (طلسم).', en: '🔪 %s was executed and Jack was eliminated as well (curse).' },
    gunner_gave: { fa: '🔫 تفنگدار یک تیر %s به %s داد.', en: '🔫 Gunner gave a %s bullet to %s.' },
    morning_shot_blank: { fa: '🔫 تیر مشقی بود — %s زنده ماند.', en: '🔫 It was a blank — %s survived.' },
    morning_shot_wizard: { fa: '🔫 تیر مشقی بود — %s زنده ماند. (جادوگر تیر را خنثی کرد)', en: '🔫 It was a blank — %s survived. (Sorcerer neutralized the shot)' },
    morning_shot_healed: { fa: '🔫 تیر مشقی بود — %s زنده ماند. (هیل فعال)', en: '🔫 It was a blank — %s survived. (Healed active)' },
    morning_shot_shield: { fa: '🔫 تیر مشقی بود — %s زنده ماند. (سپر)', en: '🔫 It was a blank — %s survived. (Shield)' },
    morning_shot_jack_immune: { fa: '🔫 تیر مشقی بود — %s زنده ماند. (مصونیت جک)', en: '🔫 It was a blank — %s survived. (Jack immunity)' },
    morning_shot_zodiac_immune: { fa: '🔫 تیر مشقی بود — %s زنده ماند. (مصونیت زودیاک)', en: '🔫 It was a blank — %s survived. (Zodiac immunity)' },
    warshot_death: { fa: '🔫 تیر جنگی بود — %s حذف شد. (%s)', en: '🔫 It was a live bullet — %s eliminated. (%s)' },
    jack_curse_activated: { fa: '🔪 طلسم جک فعال شد — جک هم حذف شد!', en: '🔪 Jack\'s curse activated — Jack eliminated!' },
    live_explosion: { fa: '💥 تیر جنگی در دست %s منفجر شد!', en: '💥 Live bullet in %s exploded!' },
    bomb_defused: { fa: '🛡️💣 محافظ رمز بمب را درست حدس زد — بمب خنثی شد!', en: '🛡️💣 Bodyguard guessed the bomb code correctly — bomb defused!' },
    bomb_defused_incorrect: { fa: '🛡️💥 محافظ رمز بمب را اشتباه زد — محافظ حذف شد.', en: '🛡️💥 Bodyguard guessed wrong — bodyguard eliminated.' },
    bomb_skip: { fa: '🛡️ محافظ تصمیم گرفت رمز بمب را حدس نزند.', en: '🛡️ Bodyguard decided not to guess the bomb code.' },
    bomb_defused_named: { fa: '💣✅ %s رمز بمب را درست حدس زد — بمب خنثی شد!', en: '💣✅ %s guessed the bomb code correctly — bomb defused!' },
    bomb_wrong_pw_death: { fa: '💥 %s رمز بمب را اشتباه زد — حذف شد.', en: '💥 %s guessed the bomb code incorrectly — eliminated.' },
    win_citizen: { fa: '🏆 تیم شهروند پیروز شد!', en: '🏆 Citizen Team Wins!' },
    win_mafia: { fa: '🏆 تیم مافیا پیروز شد!', en: '🏆 Mafia Team Wins!' },
    win_independent: { fa: '🏆 بازیکن مستقل پیروز شد!', en: '🏆 Independent Player Wins!' },
    win_jack_chaos: { fa: '🏆 جک وارد آشوب شد — جک فوراً برنده!', en: '🏆 Jack entered Chaos — Jack wins immediately!' },
    chaos_triggered: { fa: '🌀 آشوب — ۳ نفر باقی مانده‌اند. ۲ دقیقه صحبت آزاد و سپس انتخاب متحد.', en: '🌀 Chaos — 3 players remain. 2 minutes free talk, then choose your ally.' },
    handshake_triggered: { fa: '🌀 آشوب — ۳ نفر باقی مانده‌اند. ۲ دقیقه صحبت آزاد و سپس انتخاب متحد.', en: '🌀 Chaos — 3 players remain. 2 minutes free talk, then choose your ally.' },
    reveal_jack: { fa: '🔪 %s revealed as Jack — طلسم ثابت شد.', en: '🔪 %s revealed as Jack — curse confirmed.' },
    jack_blocked_curse_preserved: { fa: '✊ جادوگر طلسم جک را مسدود کرد؛ طلسم بدون تغییر باقی ماند (%s).', en: '✊ Sorcerer blocked Jack — his curse remained unchanged (%s).' },
    lastActionDraw: { fa: '🃏 کارت حرکت آخر کشیده شد: %s', en: '🃏 Last Action card drawn: %s' },
    lastActionSkipNight: { fa: '🃏 کارت بی‌خوابی: شب بعد لغو شد — هیچ اقدامی انجام نمی‌شود.', en: '🃏 Insomnia card: Next night skipped — no night actions will occur.' },
    lastActionReveal: { fa: '🃏 افشای هویت: نقش %s فاش شد — %s.', en: '🃏 Reveal Identity: %s\'s role revealed — %s.' },
    lastActionFinalShootKill: { fa: '🃏 شلیک نهایی: %s کشته شد.', en: '🃏 Final Shoot: %s was killed.' },
    lastActionFinalShootImmune: { fa: '🃏 شلیک نهایی بی‌اثر — %s مصون بود.', en: '🃏 Final Shoot had no effect — %s was immune.' },
    lastActionFinalShootHealed: { fa: '🃏 شلیک نهایی بی‌اثر — %s توسط دکتر نجات یافت.', en: '🃏 Final Shoot had no effect — %s was healed.' },
    lastActionFinalShootShielded: { fa: '🃏 شلیک نهایی بی‌اثر — %s محافظت شد.', en: '🃏 Final Shoot had no effect — %s was protected.' },
    lastActionGuessSuccess: { fa: '🃏 ذهن زیبا: حدس درست! %s حذف شد.', en: '🃏 Beautiful Mind: Correct guess! %s eliminated.' },
    lastActionVictimSaved: { fa: '🃏 ذهن زیبا: %s به بازی برگشت!', en: '🃏 Beautiful Mind: %s returned to the game!' },
    lastActionGuessFail: { fa: '🃏 ذهن زیبا: حدس نادرست — %s مستقل نبود.', en: '🃏 Beautiful Mind: Wrong guess — %s is not independent.' },
    lastActionFaceOffApplied: { fa: '🃏 تغییر چهره: نقش %s به %s منتقل شد (%s).', en: '🃏 Face Off: %s\'s role transferred to %s (%s).' },
  },

  // Rulebook
  rulebook: {
    title: { fa: '📖 کتاب قوانین', en: '📖 Rulebook' },
    btnLabel: { fa: '📖 کتاب قوانین بازی', en: '📖 Game Rulebook' },
    overview: {
      title: { fa: '🎯 هدف بازی', en: '🎯 Game Objective' },
      body: {
        fa: 'مافیا یک بازی گروهی بین سه تیم است: مافیا، شهروند و مستقل. بازی توسط یک «خدا» (گرداننده) مدیریت می‌شود.\n\n• تیم مافیا: در تاریکی شب اعضای شهروند و مستقل را حذف می‌کنند.\n• تیم شهروند: تلاش می‌کنند اعضای مافیا و مستقل را شناسایی و حذف کنند.\n• مستقل‌ها: هر مستقل می‌خواهد خودش برنده شود — تلاش برای برنده شدن به تنهایی.\n\nبازی بین فازهای شب و روز جابجا می‌شود تا یکی از تیم‌ها به شرایط پیروزی برسد.',
        en: 'Mafia is a party game between three teams: Mafia, Citizens, and Independents. The game is managed by a "God" (moderator).\n\n• Mafia Team: Eliminates citizens and independents during the night.\n• Citizen Team: Tries to identify and eliminate mafia and independents.\n• Independents: Each independent tries to win on their own — striving to be the sole winner.\n\nThe game alternates between night and day phases until one team meets their victory condition.'
      }
    },
    victory: {
      title: { fa: '🏆 شرایط پیروزی', en: '🏆 Victory Conditions' },
      body: {
        fa: '🔵 پیروزی شهروندان:\nتمام اعضای مافیا و تمام مستقل‌ها (جک و زودیاک) حذف شوند.\n\n🔴 پیروزی مافیا:\nمافیا فقط زمانی برنده می‌شود که هیچ مستقلی در بازی زنده نباشد و تعداد مافیای زنده ≥ تعداد شهروندان زنده. تا زمانی که مستقل زنده باشد، مافیا نمی‌تواند برنده شود.\n\n🟣 پیروزی جک (فوری):\nاگر تمام مافیا بمیرند و جک زنده باشد → جک فوراً برنده می‌شود. همچنین اگر جک به آشوب برسد (۳ نفر) → جک فوراً برنده!\n\n🟣 پیروزی زودیاک:\nزودیاک با مرگ مافیا خودکار برنده نمی‌شود. باید کشتن ادامه دهد تا ۳ نفر باقی بمانند، سپس از طریق آشوب برنده شود.\n\n🌀 آشوب (۳ نفر باقی):\nوقتی دقیقاً ۳ نفر باقی بمانند و هیچ تیمی هنوز برنده نشده باشد: ۲ دقیقه صحبت آزاد، سپس ۳ نفر تصمیم می‌گیرند یک نفر حذف شود (دو نفر دست می‌دهند). دو نفر باقی‌مانده برنده هستند:\n• شهروند + شهروند → شهروند برنده\n• شهروند + مافیا → مافیا برنده\n• شهروند + مستقل → مستقل برنده\n• مافیا + مستقل → مستقل برنده\n• اگر جک در آشوب باشد → جک فوراً برنده (بدون دست‌دادن)',
        en: '🔵 Citizen Victory:\nAll mafia members AND all independents (Jack & Zodiac) are eliminated.\n\n🔴 Mafia Victory:\nMafia only wins when there are no independents alive AND alive mafia count ≥ alive citizen count. As long as any independent is alive, mafia cannot win.\n\n🟣 Jack Instant Win:\nIf all mafia die while Jack is still alive → Jack wins immediately. Also if Jack reaches Chaos (3 players) → Jack wins immediately!\n\n🟣 Zodiac Victory:\nZodiac does NOT auto-win when mafia dies. Must keep killing until 3 players remain, then win through Chaos.\n\n🌀 Chaos (3 Players Remain):\nWhen exactly 3 players remain and no team has won yet: 2 minutes of free talk, then the 3 players decide to eliminate one (two shake hands). The remaining pair wins:\n• Citizen + Citizen → Citizens win\n• Citizen + Mafia → Mafia wins\n• Citizen + Independent → Independent wins\n• Mafia + Independent → Independent wins\n• If Jack is in Chaos → Jack wins immediately (no handshake needed)'
      }
    },
    phases: {
      title: { fa: '🔄 فازهای بازی', en: '🔄 Game Phases' },
      body: {
        fa: '1️⃣ راه‌اندازی: بازیکنان اضافه، نقش‌ها انتخاب و تخصیص داده می‌شوند (حداقل ۸ بازیکن).\n\n2️⃣ نمایش نقش‌ها: هر بازیکن به ترتیب نقش خود را می‌بیند.\n\n3️⃣ روز کور (۱ دقیقه): بحث آزاد بدون رأی‌گیری یا چالش.\n\n4️⃣ شب کور: فقط مافیا بیدار می‌شوند و همدیگر را می‌شناسند. جک هم طلسم می‌گذارد.\n\n5️⃣ شب (دورهای بعد): تمام نقش‌های دارای اقدام شبانه بیدار می‌شوند و عمل می‌کنند.\n\n6️⃣ روز: نتایج شب اعلام، بحث، خواب نیم‌روزی (اگر بمب باشد)، تیر صبحگاهی (اگر کسی تیر داشته باشد)، و سپس رأی‌گیری.\n\n7️⃣ پایان بازی: وقتی شرایط پیروزی یکی از تیم‌ها برقرار شود.',
        en: '1️⃣ Setup: Players are added, roles are selected and assigned (minimum 8 players).\n\n2️⃣ Role Reveal: Each player sees their role in order.\n\n3️⃣ Blind Day (1 minute): Free discussion, no voting or challenges.\n\n4️⃣ Blind Night: Only mafia wakes up and sees each other. Jack also places his curse.\n\n5️⃣ Night (subsequent rounds): All roles with night actions wake up and act.\n\n6️⃣ Day: Night results announced, discussion, noon nap (if bomb), morning shots (if bullets exist), then voting.\n\n7️⃣ Game End: When any team\'s victory condition is met.'
      }
    },
    nightOrder: {
      title: { fa: '🌙 ترتیب اقدامات شبانه', en: '🌙 Night Action Order' },
      body: {
        fa: 'نقش‌ها به ترتیب زیر بیدار و عمل می‌کنند:\n\n1. پدرخوانده (شلیک / سلاخی)\n2. خبرنگار (بررسی مذاکره)\n3. دکتر لکتر (هیل مافیا)\n4. بمب‌گذار (کارگذاری بمب)\n5. ماتادور (سکوت)\n6. جادوگر (بلاک)\n7. دکتر واتسون (هیل)\n8. کارآگاه (استعلام)\n9. همشهری کین (افشا)\n10. اسنایپر (شلیک)\n11. فراماسون (عضوگیری)\n12. کنستانتین (احیا)\n13. تفنگدار (دادن تیر)\n14. جک (طلسم)\n15. زودیاک (شلیک)\n\nترتیب حل اقدامات (ریزالو):\nبلاک جادوگر → هیل واتسون → هیل لکتر → اقدام پدرخوانده → طلسم جک → شلیک زودیاک → شلیک اسنایپر → استعلام کارآگاه → سکوت ماتادور → بمب‌گذاری → احیای کنستانتین → عضوگیری فراماسون → تیر تفنگدار → افشای کین → زنجیره طلسم جک',
        en: 'Roles wake and act in this order:\n\n1. Godfather (shoot / salakhi)\n2. Reporter (check negotiation)\n3. Dr. Lecter (heal mafia)\n4. Bomber (plant bomb)\n5. Matador (silence)\n6. Sorcerer (block)\n7. Dr. Watson (heal)\n8. Detective (investigate)\n9. Citizen Kane (reveal)\n10. Sniper (shoot)\n11. Freemason (recruit)\n12. Constantine (revive)\n13. Gunner (give bullets)\n14. Jack (curse)\n15. Zodiac (shoot)\n\nResolution order:\nSorcerer block → Watson heal → Lecter heal → Godfather action → Jack curse → Zodiac kill → Sniper shoot → Detective investigate → Matador silence → Bomb plant → Constantine revive → Freemason recruit → Gunner bullets → Kane reveal → Jack curse chain'
      }
    },
    dayRules: {
      title: { fa: '☀️ قوانین روز', en: '☀️ Day Rules' },
      body: {
        fa: '📢 اعلام نتایج شب:\nخدا اعلام می‌کند چه کسانی کشته شدند، نجات یافتند، سپرشان فعال شد، سکوت شدند، و افشاگری کین.\n\n💬 بحث:\nبازیکنان بحث می‌کنند (زمان پیش‌فرض ۶۰ ثانیه). بازیکنان سکوت‌شده حق صحبت ندارند.\n\n🔫 تیر صبحگاهی:\nاگر کسی تیر داشته باشد، می‌تواند اعلام کرده و شلیک کند:\n• تیر مشقی → هدف زنده می‌ماند\n• تیر جنگی بدون محافظت → هدف حذف و سمتش اعلام می‌شود\n• تیر جنگی با هیل/سپر/بلاک → مشقی حساب می‌شود\n• ⚠️ تیرهای جنگی استفاده‌نشده در شروع رأی‌گیری منفجر شده و دارنده‌شان حذف می‌شوند!\n\n💣 خواب نیم‌روزی (اگر بمب فعال باشد):\nمرحله ۱: محافظ رمز بمب را حدس می‌زند (درست → خنثی، غلط → محافظ حذف)\nمرحله ۲: اگر محافظ نباشد یا رد کند، فرد بمب‌شده حدس می‌زند (درست → خنثی، غلط → حذف)\n\n🗳️ رأی‌گیری:\nهر بازیکن زنده به یک نفر رأی می‌دهد یا رأی نمی‌دهد.\n• جک: مصونیت از رأی دارد (قابل حذف نیست)\n• تساوی آرا: تمام بازیکنان با بیشترین رأی حذف می‌شوند\n• بدون رأی: اگر کسی رأی کافی نداشته باشد، کسی حذف نمی‌شود',
        en: '📢 Night Results Announcement:\nGod announces who was killed, saved, whose shield activated, who is silenced, and Kane\'s reveal.\n\n💬 Discussion:\nPlayers discuss (default 60 seconds). Silenced players cannot speak.\n\n🔫 Morning Shots:\nIf anyone has bullets, they can announce and shoot:\n• Blank bullet → target survives\n• Live bullet without protection → target eliminated, side revealed\n• Live bullet with heal/shield/block → treated as blank\n• ⚠️ Unused live bullets explode at voting start, eliminating their holders!\n\n💣 Noon Nap (if bomb active):\nStage 1: Bodyguard guesses bomb code (correct → defused, wrong → bodyguard eliminated)\nStage 2: If no bodyguard or skips, bombed player guesses (correct → defused, wrong → eliminated)\n\n🗳️ Voting:\nEach alive player votes for one player or abstains.\n• Jack: Has vote immunity (cannot be executed)\n• Tied votes: ALL tied players are eliminated\n• No votes: If no one gets enough votes, no one is eliminated'
      }
    },
    mafiaRoles: {
      title: { fa: '🔴 نقش‌های تیم مافیا', en: '🔴 Mafia Team Roles' },
      body: {
        fa: '🎩 پدرخوانده:\nرهبر مافیا. هر شب یکی از دو کار: شلیک یا سلاخی.\n• شلیک: کشتن معمولی (روی جک و زودیاک بی‌تأثیر)\n• سلاخی: حدس نقش دقیق هدف. اگر درست باشد → حذف بدون هیچ محافظتی (دکتر/سپر/محافظ بی‌تأثیر). اگر غلط → هیچ اتفاقی نمی‌افتد. در شب سلاخی مافیا شلیک ندارد. مرگ سلاخی قابل احیا نیست.\nیک‌بار سپر دارد. در استعلام کارآگاه شهروند نشان داده می‌شود.\n\n💉 دکتر لکتر:\nهر شب یک عضو مافیا (یا خودش) را هیل می‌کند. هیل دیگران نامحدود، هیل خود محدود (پیش‌فرض ۲). هیل تا صبح باقی می‌ماند.\n\n💣 بمب‌گذار:\nیک‌بار در بازی بمب با رمز ۱ تا ۴ روی کسی می‌گذارد. صبح خدا اعلام می‌کند. نتیجه در خواب نیم‌روزی مشخص می‌شود.\n\n🕵️ جاسوس:\nاقدام شبانه ندارد. اگر فراماسون بیدارش کند، بدون آلودگی وارد تیم فراماسون می‌شود و به نفع مافیا عمل می‌کند.\n\n🤐 ماتادور:\nهر شب یک بازیکن (مافیا/شهروند/مستقل) را سکوت می‌کند. آن بازیکن فردا حق صحبت ندارد.\n\n🧙 جادوگر:\nهر شب اقدام شبانه یک شهروند یا مستقل را بلاک می‌کند. نمی‌تواند دو شب متوالی یک نفر را بلاک کند. تیر بلاک‌شده مشقی حساب می‌شود. طلسم بلاک‌شده جک قفل و ثابت می‌ماند.\n\n🤝 مذاکره‌کننده:\nوقتی زنده باشد و تعداد مافیای زنده ≤ آستانه، امکان مذاکره در شب فعال می‌شود. در شبی که مذاکره انجام شود، مافیا شلیک و سلاخی ندارد.\n• هدف شهروند ساده یا مظنون → به مافیا اضافه می‌شود\n• هدف غیر این‌ها → مذاکره شکست و شلیک مافیا از دست می‌رود\nفقط یک‌بار در بازی قابل استفاده.\n\n🔫 مافیای ساده:\nعضو عادی بدون توانایی خاص (حداکثر ۱۰ نفر).',
        en: '🎩 Godfather:\nMafia leader. Each night chooses one of two: shoot or salakhi.\n• Shoot: Regular kill (no effect on Jack or Zodiac)\n• Salakhi: Guess exact role of target. If correct → eliminated, bypasses ALL protections (doctor/shield/bodyguard). If wrong → nothing happens. On salakhi night, mafia has no regular shot. Salakhi death is NOT revivable.\nHas one-time shield. Appears as citizen in detective investigation.\n\n💉 Dr. Lecter:\nEach night heals one mafia member (or self). Unlimited heals on others, limited self-heal (default 2). Heal persists until morning.\n\n💣 Bomber:\nOnce per game, plants bomb on someone with code 1-4. God announces in morning. Result determined during noon nap.\n\n🕵️ Spy:\nNo night action. If recruited by Freemason, joins without contamination and works for mafia.\n\n🤐 Matador:\nEach night silences one player (mafia/citizen/independent). That player cannot speak next day.\n\n🧙 Sorcerer:\nEach night blocks one citizen or independent\'s night action. Cannot block same person two nights in a row. Blocked bullets become blank. Blocked Jack\'s curse is locked and preserved.\n\n🤝 Negotiator:\nWhen alive and alive mafia ≤ threshold, enables negotiation at night. On a negotiate night, mafia has no shoot or salakhi.\n• Target simple citizen or suspect → joins mafia\n• Others → negotiation fails, mafia loses shot\nOne-time use only.\n\n🔫 Simple Mafia:\nRegular member with no special abilities (up to 10).'
      }
    },
    citizenRoles: {
      title: { fa: '🔵 نقش‌های تیم شهروند', en: '🔵 Citizen Team Roles' },
      body: {
        fa: '⚕️ دکتر واتسون:\nهر شب یک نفر (یا خودش) را هیل می‌کند. هیل دیگران نامحدود، هیل خود محدود (پیش‌فرض ۲). هدف هیل‌شده اگر مورد شلیک قرار بگیرد زنده می‌ماند.\n\n🔍 کارآگاه:\nهر شب یک بازیکن را استعلام می‌کند.\n• مافیا (غیر پدرخوانده) یا مظنون → 👍\n• پدرخوانده، مستقل یا شهروند (غیر مظنون) → 👎\n• بلاک‌شده توسط جادوگر → ✊\n\n🎖️ همشهری کین:\nیک‌بار در بازی هدفی را انتخاب می‌کند. اگر هدف تا صبح زنده بماند و مافیا یا مستقل باشد → خدا صبح نقشش را اعلام می‌کند. هدف در بازی می‌ماند. شب بعد خدا کین را حذف می‌کند (قابل احیا نیست). اگر هدف همان شب بمیرد → توانایی برمی‌گردد.\n\n🎯 اسنایپر:\nتعداد شلیک محدود (پیش‌فرض ۲).\n• هدف مستقل → هیچ اتفاقی نمی‌افتد\n• هدف پدرخوانده با سپر → هیچ اتفاقی نمی‌افتد\n• هدف مافیا هیل‌شده → تیر هدر\n• هدف مافیا بدون محافظت → کشته\n• هدف شهروند → اسنایپر خودش می‌میرد\nیک‌بار سپر دارد.\n\n🔫 تفنگدار:\nهر شب تیر (مشقی یا جنگی) به بازیکنان می‌دهد — حداکثر یک تیر به هر نفر. صبح دارنده شلیک می‌کند. تیر جنگی استفاده‌نشده در شروع رأی‌گیری منفجر می‌شود!\n\n🔺 فراماسون:\nهر شب یک نفر عضو‌گیری. حداکثر ۲ متحد (قابل تنظیم).\n• شهروند یا جاسوس → امن\n• مافیا (غیر جاسوس) یا مستقل → صبح تمام تیم فراماسون حذف (آلودگی)\n\n🛡️ محافظ:\nاقدام شبانه ندارد.\n۱) خواب نیم‌روزی: حدس رمز بمب (درست → خنثی، غلط → محافظ حذف)\n۲) اگر زودیاک به محافظ شلیک → زودیاک حذف، محافظ زنده\n\n📰 خبرنگار:\nبعد از خریداری، یک بار از خدا می‌پرسد آیا موفق بوده. خدا 👍 یا 👎 نشان می‌دهد. نیاز به مذاکره‌کننده دارد.\n\n✝️ کنستانتین:\nیک‌بار در بازی یک مرده را احیا می‌کند. نمی‌تواند قربانیان سلاخی یا کین را احیا کند.\n\n👤 شهروند ساده:\nبدون توانایی (حداکثر ۱۰).\n\n🔎 مظنون:\nبدون توانایی. تفاوت: در استعلام کارآگاه مافیا نشان داده می‌شود (مثبت کاذب). قابل خریداری توسط مذاکره‌کننده.',
        en: '⚕️ Dr. Watson:\nEach night heals one person (or self). Unlimited heals on others, limited self-heal (default 2). Healed target survives one lethal shot.\n\n🔍 Detective:\nEach night investigates one player.\n• Mafia (not Godfather) or Suspect → 👍\n• Godfather, independent, or citizen (not Suspect) → 👎\n• Blocked by Sorcerer → ✊\n\n🎖️ Citizen Kane:\nOnce per game, selects a target. If target survives until morning and is mafia or independent → God announces their role. Target stays in game. Next night, God eliminates Kane (NOT revivable). If target dies same night → ability returns.\n\n🎯 Sniper:\nLimited shots (default 2).\n• Independent target → nothing happens\n• Godfather with shield → nothing happens\n• Mafia healed by Dr. Lecter → shot wasted\n• Mafia unprotected → killed\n• Citizen target → sniper dies instead\nHas one-time shield.\n\n🔫 Gunner:\nEach night gives bullets (blank or live) to players — max one per person. Morning: holder shoots. Unused live bullets explode at voting start!\n\n🔺 Freemason:\nEach night recruits one person. Max 2 allies (configurable).\n• Citizen or Spy → safe\n• Mafia (not spy) or independent → morning: entire freemason team eliminated (contamination)\n\n🛡️ Bodyguard:\nNo night action.\n1) Noon nap: Guesses bomb code (correct → defused, wrong → bodyguard eliminated)\n2) If Zodiac shoots bodyguard → Zodiac dies, bodyguard survives\n\n📰 Reporter:\nAfter negotiation, one chance to ask God if it succeeded. God shows 👍 or 👎. Requires Negotiator.\n\n✝️ Constantine:\nOnce per game, revives one dead player. Cannot revive salakhi victims or Kane.\n\n👤 Simple Citizen:\nNo abilities (up to 10).\n\n🔎 Suspect:\nNo abilities. Difference: Appears as mafia in detective investigation (false positive). Recruitable via negotiation.'
      }
    },
    independentRoles: {
      title: { fa: '🟣 نقش‌های مستقل', en: '🟣 Independent Roles' },
      body: {
        fa: '🔪 جک:\nهر شب روی یک نفر طلسم می‌گذارد. اگر فرد طلسم‌شده کشته شود یا رأی بگیرد → جک هم حذف می‌شود.\n• مصونیت از شلیک شبانه (مافیا/زودیاک/اسنایپر)\n• مصونیت از رأی روز\n• نمی‌تواند دو شب متوالی یک نفر را طلسم کند\n• تنها راه حذف: سلاخی صحیح پدرخوانده، زنجیره طلسم، یا کارت‌های حرکت آخر\n• اگر جادوگر بلاک کند: طلسم قفل می‌شود و جابجا نمی‌شود\n• 🏆 پیروزی: اگر تمام مافیا بمیرند و جک زنده باشد → جک فوراً برنده! اگر جک به آشوب برسد (۳ نفر) → جک فوراً برنده بدون نیاز به دست‌دادن!\n\n♈ زودیاک:\nقاتل مستقل. شلیک بر اساس تنظیمات (هر شب / فرد / زوج).\n• مصونیت از شلیک شبانه\n• اگر به محافظ شلیک کند → زودیاک حذف، محافظ زنده\n• با رأی روز قابل حذف است\n• با سلاخی صحیح قابل حذف است\n• 🏆 پیروزی: با مرگ مافیا خودکار برنده نمی‌شود. باید کشتن ادامه دهد تا ۳ نفر باقی بمانند و از طریق آشوب برنده شود.',
        en: '🔪 Jack:\nEach night curses one person. If cursed player is killed or voted out → Jack is also eliminated.\n• Immune to night shots (mafia/zodiac/sniper)\n• Immune to day votes\n• Cannot curse same person two nights in a row\n• Only ways to eliminate: correct salakhi by Godfather, curse chain, or last action cards\n• If blocked by Sorcerer: curse is locked and cannot be moved\n• 🏆 Victory: If all mafia die and Jack is alive → Jack wins instantly! If Jack reaches Chaos (3 players) → Jack wins immediately without handshake!\n\n♈ Zodiac:\nIndependent killer. Shoots based on settings (every night / odd / even).\n• Immune to night shots\n• If shoots Bodyguard → Zodiac dies, bodyguard survives\n• Can be voted out during day\n• Can be eliminated by correct salakhi\n• 🏆 Victory: Does NOT auto-win when mafia dies. Must keep killing until 3 players remain and win through Chaos.'
      }
    },
    specialMechanics: {
      title: { fa: '⚡ مکانیک‌های ویژه', en: '⚡ Special Mechanics' },
      body: {
        fa: '🗡️ سلاخی:\nپدرخوانده نقش دقیق هدف را حدس می‌زند. درست → حذف بدون محافظت. غلط → هیچی. در شب سلاخی مافیا شلیک ندارد. مرگ غیرقابل احیا. می‌تواند جک و زودیاک را حذف کند.\n\n🤝 مذاکره (خریداری):\nوقتی مافیای زنده ≤ آستانه و مذاکره‌کننده زنده باشد. فقط شهروند ساده یا مظنون قابل خریداری. هر نقش دیگر → شکست و از دست رفتن شلیک.\n\n💣 بمب:\nبمب‌گذار یک‌بار بمب با رمز ۱-۴ می‌گذارد. صبح اعلام. در خواب نیم‌روزی: محافظ → فرد بمب‌شده حدس می‌زنند.\n\n🔪 طلسم جک:\nهر شب روی یک نفر. اگر آن فرد بمیرد → جک هم می‌میرد. بلاک جادوگر → طلسم ثابت.\n\n🛡️ سپر:\nپدرخوانده و اسنایپر هر کدام یک‌بار سپر دارند. یک شلیک شبانه را جذب می‌کند. سلاخی/بمب/رأی/انفجار تیر از سپر رد می‌شوند.\n\n🔺 اتحاد فراماسون:\nهر شب یک عضوگیری. شهروند/جاسوس → امن. مافیا/مستقل → آلودگی (تمام تیم فردا حذف). اگر رهبر بمیرد → اتحاد غیرفعال.\n\n🔫 تیر صبحگاهی:\nتفنگدار شب تیر می‌دهد. صبح دارنده شلیک می‌کند. مشقی = امن. جنگی = کشنده اگر بدون محافظت. جنگی استفاده‌نشده = انفجار در رأی‌گیری.\n\n🌀 آشوب:\nوقتی دقیقاً ۳ نفر باقی بمانند و هیچ تیمی برنده نشده باشد: بازی وارد فاز آشوب می‌شود. اگر جک زنده باشد → جک فوراً برنده! در غیر این صورت ۲ دقیقه صحبت آزاد. ۳ نفر تصمیم می‌گیرند یک نفر حذف شود (دو نفر دست می‌دهند). دو نفر باقی‌مانده برنده:\n• شهروند + شهروند → شهروند برنده\n• شهروند + مافیا → مافیا برنده\n• شهروند + مستقل → مستقل برنده\n• مافیا + مستقل → مستقل برنده',
        en: '🗡️ Salakhi:\nGodfather guesses exact role. Correct → eliminated, bypasses all protection. Wrong → nothing. On salakhi night, mafia has no shot. Death NOT revivable. Can kill Jack and Zodiac.\n\n🤝 Negotiation:\nWhen alive mafia ≤ threshold and Negotiator alive. Only simple citizen or suspect can be recruited. Any other role → fails, mafia loses shot.\n\n💣 Bomb:\nBomber plants once with code 1-4. Morning: announced. Noon nap: Bodyguard → bombed player guess.\n\n🔪 Jack\'s Curse:\nEach night on one person. If that person dies → Jack dies too. Sorcerer block → curse locked.\n\n🛡️ Shield:\nGodfather and Sniper each have one-time shield. Absorbs one night shot. Salakhi/bomb/vote/bullet explosion bypass shield.\n\n🔺 Freemason Alliance:\nEach night recruits one. Citizen/spy → safe. Mafia/independent → contamination (entire team eliminated next morning). If leader dies → alliance inactive.\n\n🔫 Morning Shots:\nGunner gives bullets at night. Morning: holder shoots. Blank = safe. Live = lethal if unprotected. Unused live = explosion at voting.\n\n🌀 Chaos:\nWhen exactly 3 players remain and no team has won: game enters Chaos phase. If Jack is alive → Jack wins immediately! Otherwise 2 minutes of free talk. The 3 players decide to eliminate one (two shake hands). The remaining pair wins:\n• Citizen + Citizen → Citizens win\n• Citizen + Mafia → Mafia wins\n• Citizen + Independent → Independent wins\n• Mafia + Independent → Independent wins'
      }
    },
    lastActionCards: {
      title: { fa: '🃏 کارت‌های حرکت آخر', en: '🃏 Last Action Cards' },
      body: {
        fa: 'وقتی بازیکنی با رأی حذف می‌شود، عدد ۱ تا تعداد کارت‌های باقیمانده را انتخاب می‌کند و یک کارت تصادفی می‌کشد. در هر بازی ۵ کارت وجود دارد و هر کارت فقط یک بار استفاده می‌شود.\n\n1️⃣ شلیک نهایی:\nبازیکن حذف‌شده فوراً یک بازیکن زنده را انتخاب و شلیک می‌کند. اگر هدف مصون از شلیک باشد بی‌اثر است. شب بعد مافیا نمی‌تواند شلیک کند.\n\n2️⃣ بی‌خوابی:\nشب بعد کاملاً حذف می‌شود — هیچ اقدام شبانه‌ای انجام نمی‌شود و مستقیم به روز بعد می‌رویم.\n\n3️⃣ افشای هویت:\nخدا نقش واقعی بازیکن حذف‌شده را به همه اعلام می‌کند. این بازیکن دیگر قابل احیا نیست.\n\n4️⃣ ذهن زیبا:\nبازیکن حذف‌شده یک بازیکن زنده را انتخاب و حدس می‌زند آیا مستقل (جک/زودیاک) است. اگر درست باشد آن بازیکن حذف می‌شود و بازیکن اخراجی به بازی برمی‌گردد!\n\n5️⃣ تغییر چهره:\nبازیکن حذف‌شده یک بازیکن زنده را انتخاب می‌کند — نقش بازیکن حذف‌شده کاملاً به آن بازیکن منتقل می‌شود (شامل سپر و توانایی‌ها). بازیکن حذف‌شده قابل احیا نیست.',
        en: 'When a player is eliminated by vote, they choose a number from 1 to the number of remaining cards and draw a random card. Each game has 5 cards and each card can only be used once.\n\n1️⃣ Final Shoot:\nThe eliminated player immediately chooses an alive player and shoots them. No effect if the target is shoot-immune. Mafia loses their shot the following night.\n\n2️⃣ Insomnia:\nThe next night is completely skipped — no night actions occur and the game goes directly to the next day.\n\n3️⃣ Reveal Identity:\nGod announces the eliminated player\'s true role to everyone. This player can no longer be revived.\n\n4️⃣ Beautiful Mind:\nThe eliminated player chooses an alive player and guesses if they are independent (Jack/Zodiac). If correct, that player is eliminated and the voted-out player is revived!\n\n5️⃣ Face Off:\nThe eliminated player chooses an alive player — their role is fully transferred to the chosen player (including shield and abilities). The eliminated player cannot be revived.'
      }
    },
    setupRules: {
      title: { fa: '⚙️ قوانین راه‌اندازی', en: '⚙️ Setup Rules' },
      body: {
        fa: '• حداقل ۸ بازیکن\n• حداقل ۱ نقش مافیا الزامی\n• حداکثر مافیا: floor((کل بازیکنان - مستقل‌ها - ۱) / ۲)\n• زودیاک نیاز به محافظ دارد (خودکار اضافه)\n• خبرنگار نیاز به مذاکره‌کننده دارد\n• تعداد نقش‌ها باید دقیقاً برابر تعداد بازیکنان باشد\n\nتنظیمات قابل تغییر:\n• تیر مشقی تفنگدار: ۰ تا ۵ (پیش‌فرض ۲)\n• تیر جنگی تفنگدار: ۰ تا ۵ (پیش‌فرض ۲)\n• هیل خود واتسون: ۱ تا ۵ (پیش‌فرض ۲)\n• هیل خود لکتر: ۱ تا ۵ (پیش‌فرض ۲)\n• متحدان فراماسون: ۱ تا ۵ (پیش‌فرض ۲)\n• آستانه مذاکره: ۱ تا ۵ (پیش‌فرض ۲)\n• شلیک اسنایپر: ۱ تا ۵ (پیش‌فرض ۲)\n• دوره شلیک زودیاک: هر شب / فرد / زوج\n• مصونیت صبحگاهی جک: بله / خیر\n• مصونیت صبحگاهی زودیاک: بله / خیر',
        en: '• Minimum 8 players\n• At least 1 Mafia role required\n• Max mafia: floor((total players - independents - 1) / 2)\n• Zodiac requires Bodyguard (auto-added)\n• Reporter requires Negotiator\n• Role count must exactly match player count\n\nConfigurable settings:\n• Gunner blank bullets: 0-5 (default 2)\n• Gunner live bullets: 0-5 (default 2)\n• Watson self-heals: 1-5 (default 2)\n• Lecter self-heals: 1-5 (default 2)\n• Freemason allies: 1-5 (default 2)\n• Negotiation threshold: 1-5 (default 2)\n• Sniper shots: 1-5 (default 2)\n• Zodiac frequency: Every / Odd / Even nights\n• Jack morning immunity: Yes / No\n• Zodiac morning immunity: Yes / No'
      }
    },
    sections: {
      fa: ['overview', 'victory', 'phases', 'nightOrder', 'dayRules', 'mafiaRoles', 'citizenRoles', 'independentRoles', 'specialMechanics', 'lastActionCards', 'setupRules'],
      en: ['overview', 'victory', 'phases', 'nightOrder', 'dayRules', 'mafiaRoles', 'citizenRoles', 'independentRoles', 'specialMechanics', 'lastActionCards', 'setupRules'],
    },
  },
};

/**
 * Get translated text based on current language setting
 * @param {Object} textObj - Object with fa and en properties
 * @returns {string} Translated text
 */
export function t(textObj) {
  if (!textObj || typeof textObj !== 'object') return '';
  
  const lang = Settings.getLanguage();
  
  if (lang === Language.ENGLISH) {
    return textObj.en || textObj.fa || '';
  }
  
  // BOTH mode removed — default behavior: English or Farsi only
  
  // Default: FARSI
  return textObj.fa || textObj.en || '';
}

/**
 * Get team name translation
 * @param {string} team - Team ID
 * @returns {string} Translated team name
 */
export function teamName(team) {
  const teamNames = {
    mafia: { fa: 'تیم مافیا', en: 'Mafia Team' },
    citizen: { fa: 'تیم شهروند', en: 'Citizen Team' },
    independent: { fa: 'مستقل', en: 'Independent' },
  };
  return t(teamNames[team] || { fa: team, en: team });
}
