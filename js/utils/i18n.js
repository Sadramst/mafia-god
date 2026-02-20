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
    assignTab: { fa: 'تخصیص', en: 'Assign' },
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
    assignRolesTitle: { fa: 'تخصیص نقش‌ها', en: 'Role Assignment' },
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
    person: { fa: 'نفر', en: 'people' },
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
    setup: { fa: 'تنظیمات', en: 'Setup' },
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
