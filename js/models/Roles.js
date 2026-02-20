/**
 * Roles.js — Role definitions for the Mafia game
 * Object-oriented design with bilingual support (Farsi & English)
 */
import { NightAction, Team, TeamNames } from './Enums.js';
import { Role } from './Role.js';

/**
 * Roles Registry
 * Manages all game roles with OO structure
 */
export class Roles {

  /** All available roles in the game */
  static ALL = {

    // ─── Mafia Team ───────────────────────────────────────────────────

    godfather: new Role({
      id: 'godfather',
      nameEn: 'Godfather',
      nameFa: 'پدرخوانده',
      team: Team.MAFIA,
      icon: '🎩',
      descriptionEn: 'Leader of the mafia. Each night has one shot OR can perform "salakhi" (exact role guess). If salakhi is correct, target is eliminated bypassing doctor and shield. On salakhi nights, mafia has no regular shot. Mafia shot doesn\'t affect Jack or Zodiac, but salakhi does. Has one-time shield. Appears as citizen in detective investigation.',
      descriptionFa: 'رهبر مافیا. هر شب یک شلیک دارد یا می‌تواند سلاخی کند (حدس نقش دقیق). اگر سلاخی درست باشد، هدف حذف می‌شود و دکتر و سپر تأثیری ندارد. در شب سلاخی مافیا شلیک ندارد. شلیک مافیا روی جک و زودیاک تأثیر ندارد ولی سلاخی دارد. یک‌بار سپر دارد. در استعلام کارآگاه، شهروند نشان داده می‌شود.',
      nightAction: NightAction.KILL,
      nightOrder: 1,
      maxCount: 1,
      unique: true,
      hasShield: true,
    }),

    drLecter: new Role({
      id: 'drLecter',
      nameEn: 'Dr. Lecter',
      nameFa: 'دکتر لکتر',
      team: Team.MAFIA,
      icon: '💉',
      descriptionEn: 'Mafia doctor. Each night heals one mafia member (or self). Can heal others unlimited times, but can only self-heal a limited number of times (default 2, configurable). Heal remains until morning — if someone shoots the healed player, they survive and the heal is consumed.',
      descriptionFa: 'دکتر مافیا. هر شب یکی از اعضای مافیا (یا خودش) را نجات می‌دهد. می‌تواند هر فرد دیگر را بدون محدودیت نجات دهد اما خودش را فقط تعداد محدود (پیش‌فرض ۲ بار، قابل تنظیم). هیل تا صبح باقی می‌ماند — اگر کسی به فرد هیل‌شده شلیک کند، فرد زنده می‌ماند و هیل مصرف می‌شود.',
      nightAction: NightAction.MAFIA_HEAL,
      nightOrder: 2,
      maxCount: 1,
      unique: true,
    }),

    bomber: new Role({
      id: 'bomber',
      nameEn: 'Bomber',
      nameFa: 'بمب‌گذار',
      team: Team.MAFIA,
      icon: '💣',
      descriptionEn: 'Once per game, plants a bomb on a player and sets a code (1-4). In the morning, God announces who has the bomb. Before voting, during noon nap: first, bodyguard can guess the code (correct → defused, wrong → bodyguard eliminated). If no bodyguard or no guess, the bombed player guesses (correct → defused, wrong → eliminated).',
      descriptionFa: 'یک‌بار در بازی روی یک بازیکن بمب می‌گذارد و رمز ۱ تا ۴ تعیین می‌کند. صبح خدا اعلام می‌کند بمب جلوی کیست. قبل از رأی‌گیری خواب نیم‌روزی: اول محافظ می‌تواند رمز را حدس بزند (درست → خنثی، غلط → محافظ حذف). اگر محافظ نباشد یا حدس نزند، خود فرد بمب‌شده حدس می‌زند (درست → خنثی، غلط → حذف).',
      nightAction: NightAction.BOMB,
      nightOrder: 3,
      maxCount: 1,
      unique: true,
    }),

    spy: new Role({
      id: 'spy',
      nameEn: 'Spy',
      nameFa: 'جاسوس',
      team: Team.MAFIA,
      icon: '🕵️',
      descriptionEn: 'Mafia member with no night action. If Freemason recruits the spy, the spy joins the Freemason alliance without contaminating the team and can see alliance members while working for the mafia.',
      descriptionFa: 'عضو تیم مافیاست ولی اقدام شبانه ندارد. اگر فراماسون جاسوس را بیدار کند، جاسوس بدون آلوده کردن تیم وارد اتحاد فراماسون می‌شود و می‌تواند اعضای اتحاد را بشناسد و به نفع مافیا عمل کند.',
      nightAction: NightAction.NONE,
      nightOrder: 99,
      maxCount: 1,
      unique: true,
    }),

    matador: new Role({
      id: 'matador',
      nameEn: 'Matador',
      nameFa: 'ماتادور',
      team: Team.MAFIA,
      icon: '🤐',
      descriptionEn: 'Each night silences one player — can be mafia, citizen, or independent. That player cannot speak the next day.',
      descriptionFa: 'هر شب بیدار می‌شود و یک نفر را سکوت می‌کند — فرقی نمی‌کند مافیا، شهروند یا مستقل باشد. آن بازیکن فردا حق صحبت ندارد.',
      nightAction: NightAction.SILENCE,
      nightOrder: 5,
      maxCount: 1,
      unique: true,
    }),

    jadoogar: new Role({
      id: 'jadoogar',
      nameEn: 'Sorcerer',
      nameFa: 'جادوگر',
      team: Team.MAFIA,
      icon: '🧙',
      descriptionEn: 'Each night blocks one citizen or independent player\'s night action. That player cannot perform their action that night. If that player has bullets, they can still shoot but it counts as a practice shot. ⚠️ Cannot block the same person two nights in a row.',
      descriptionFa: 'هر شب بیدار می‌شود و اقدام شبانه یک شهروند یا مستقل را خنثی می‌کند. آن بازیکن آن شب نمی‌تواند کاری انجام دهد. اگر آن بازیکن تیر داشته باشد، می‌تواند شلیک کند ولی تیرش مشقی حساب می‌شود. ⚠️ نمی‌تواند دو شب پشت سر هم روی یک نفر اقدام کند.',
      nightAction: NightAction.BLOCK,
      nightOrder: 6,
      maxCount: 1,
      unique: true,
    }),

    negotiator: new Role({
      id: 'negotiator',
      nameEn: 'Negotiator',
      nameFa: 'مذاکره‌کننده',
      team: Team.MAFIA,
      icon: '🤝',
      descriptionEn: 'Mafia member. When alive mafia count reaches threshold (default 2, configurable) and negotiator is alive, mafia can negotiate instead of shooting/salakhi. If target is simple citizen or suspect → joins mafia team. Otherwise negotiation fails and mafia loses that night\'s shot.',
      descriptionFa: 'عضو تیم مافیا. وقتی تعداد اعضای زنده مافیا به حد مشخصی برسد (پیش‌فرض ۲، قابل تنظیم) و مذاکره‌کننده زنده باشد، مافیا به‌جای شلیک یا سلاخی می‌تواند مذاکره کند. اگر هدف شهروند ساده یا مظنون باشد → به تیم مافیا اضافه می‌شود. در غیر این صورت مذاکره شکست می‌خورد و شلیک مافیا آن شب از دست می‌رود.',
      nightAction: NightAction.NONE,
      nightOrder: 99,
      maxCount: 1,
      unique: true,
    }),

    simpleMafia: new Role({
      id: 'simpleMafia',
      nameEn: 'Simple Mafia',
      nameFa: 'مافیای ساده',
      team: Team.MAFIA,
      icon: '🔫',
      descriptionEn: 'Regular mafia member. Participates in mafia night voting.',
      descriptionFa: 'عضو عادی مافیا. در رأی‌گیری شبانه مافیا شرکت می‌کند.',
      nightAction: NightAction.NONE,
      nightOrder: 99,
      maxCount: 10,
      unique: false,
    }),

    // ─── Independent Team ─────────────────────────────────────────────

    jack: new Role({
      id: 'jack',
      nameEn: 'Jack',
      nameFa: 'جک',
      team: Team.INDEPENDENT,
      icon: '🔪',
      descriptionEn: 'Independent serial killer. Each night curses one person. If cursed person is killed or voted out, Jack is also eliminated. Jack is immune to night shots and day votes. Only way to eliminate: correct salakhi or cursed person\'s death.',
      descriptionFa: 'قاتل سریالی مستقل. هر شب روی یک نفر طلسم می‌گذارد. اگر فرد طلسم‌شده کشته شود یا رأی بگیرد، جک هم حذف می‌شود. جک با شلیک شبانه و رأی روز کشته نمی‌شود. تنها راه حذف: سلاخی درست یا مرگ فرد طلسم‌شده.',
      nightAction: NightAction.CURSE,
      nightOrder: 20,
      maxCount: 1,
      unique: true,
      shootImmune: true,
      voteImmune: true,
    }),

    zodiac: new Role({
      id: 'zodiac',
      nameEn: 'Zodiac',
      nameFa: 'زودیاک',
      team: Team.INDEPENDENT,
      icon: '♈',
      descriptionEn: 'Independent killer. Has shots (every night, odd/even nights based on settings). Immune to night shots. If shoots bodyguard, zodiac is eliminated and bodyguard survives. Can be eliminated by day vote.',
      descriptionFa: 'قاتل مستقل. شلیک دارد (هر شب، شب‌های فرد یا زوج بر اساس تنظیمات). با شلیک شبانه کشته نمی‌شود. اگر به محافظ (نقش بادیگارد) شلیک کند، زودیاک حذف می‌شود و محافظ زنده می‌ماند. با رأی روز قابل حذف است.',
      nightAction: NightAction.SOLO_KILL,
      nightOrder: 21,
      maxCount: 1,
      unique: true,
      shootImmune: true,
      voteImmune: false,
    }),

    // ─── Citizen Team ─────────────────────────────────────────────────

    drWatson: new Role({
      id: 'drWatson',
      nameEn: 'Dr. Watson',
      nameFa: 'دکتر واتسون',
      team: Team.CITIZEN,
      icon: '⚕️',
      descriptionEn: 'Each night heals one person (or self). Can heal others unlimited times, but can only self-heal a limited number of times (default 2, configurable). Heal remains until morning — if someone shoots the healed player, they survive and the heal is consumed.',
      descriptionFa: 'هر شب یک نفر (یا خودش) را نجات می‌دهد. می‌تواند هر فرد دیگر را بدون محدودیت نجات دهد اما خودش را فقط تعداد محدود (پیش‌فرض ۲ بار، قابل تنظیم). هیل تا صبح باقی می‌ماند — اگر کسی به فرد هیل‌شده شلیک کند، فرد زنده می‌ماند و هیل مصرف می‌شود.',
      nightAction: NightAction.HEAL,
      nightOrder: 10,
      maxCount: 1,
      unique: true,
    }),

    detective: new Role({
      id: 'detective',
      nameEn: 'Detective',
      nameFa: 'کارآگاه',
      team: Team.CITIZEN,
      icon: '🔍',
      descriptionEn: 'Each night investigates one player. If target is mafia (not godfather) or suspect → God shows 👍. If target is godfather, independent, or citizen (not suspect) → God shows 👎. If blocked by sorcerer → God shows ✊ (closed fist).',
      descriptionFa: 'هر شب یک بازیکن را استعلام می‌کند. اگر هدف مافیای غیر پدرخوانده یا مظنون باشد → خدا 👍 نشان می‌دهد. اگر هدف پدرخوانده، مستقل یا شهروند (غیر مظنون) باشد → خدا 👎 نشان می‌دهد. اگر توسط جادوگر بلاک شده باشد → خدا ✊ (مشت بسته) نشان می‌دهد.',
      nightAction: NightAction.INVESTIGATE,
      nightOrder: 11,
      maxCount: 1,
      unique: true,
    }),

    kane: new Role({
      id: 'kane',
      nameEn: 'Citizen Kane',
      nameFa: 'همشهری کین',
      team: Team.CITIZEN,
      icon: '🎖️',
      descriptionEn: 'Once per game can select someone. Wakes every night (from night 1) until ability is used. If target survives until morning and is mafia or independent → God announces in the morning: "By order of Citizen Kane, [name] had the role of [role]." Target stays in game unless people vote them out. The night after reveal, God eliminates Citizen Kane. If target is killed the same night → ability returns. If blocked by sorcerer → cannot act that night.',
      descriptionFa: 'یک‌بار در بازی می‌تواند کسی را انتخاب کند. هر شب (از شب اول) بیدار می‌شود تا زمانی که از توانایی استفاده کند. اگر هدف تا صبح زنده بماند و مافیا یا مستقل باشد → خدا صبح اعلام می‌کند: «به دستور همشهری کین، فلانی نقش فلان را داشته.» هدف در بازی می‌ماند مگر مردم رأی بدهند. شب بعد از افشا، خدا همشهری کین را حذف می‌کند. اگر هدف در همان شب کشته شود → توانایی برمی‌گردد. اگر توسط جادوگر بلاک شود → آن شب نمی‌تواند اقدام کند.',
      nightAction: NightAction.KANE_REVEAL,
      nightOrder: 12,
      maxCount: 1,
      unique: true,
    }),

    constantine: new Role({
      id: 'constantine',
      nameEn: 'Constantine',
      nameFa: 'کنستانتین',
      team: Team.CITIZEN,
      icon: '✝️',
      descriptionEn: 'Once per game can revive one player who died that same night. Cannot revive: salakhi victims or Citizen Kane eliminated by God. If blocked by sorcerer → cannot revive that night. Only players who died that same night can be revived.',
      descriptionFa: 'یک‌بار در بازی می‌تواند یک بازیکن را که در همان شب کشته شده زنده کند. نمی‌تواند کسی را که با سلاخی کشته شده یا همشهری کین که توسط خدا حذف شده احیا کند. اگر توسط جادوگر بلاک شود → نمی‌تواند آن شب احیا کند. فقط اعضای شبی که مردند قابل احیا هستند.',
      nightAction: NightAction.REVIVE,
      nightOrder: 15,
      maxCount: 1,
      unique: true,
    }),

    gunner: new Role({
      id: 'gunner',
      nameEn: 'Gunner',
      nameFa: 'تفنگدار',
      team: Team.CITIZEN,
      icon: '🔫',
      descriptionEn: 'Each night can give bullets (practice or war) to players — as many as they have, but max one bullet per person. In the morning, bullet holder can shoot. If war bullet and target has no heal/shield → target eliminated and role announced. Unused war bullet explodes at voting start, eliminating its holder. ⚠️ If bullet holder is blocked by sorcerer, can still shoot but bullet counts as practice.',
      descriptionFa: 'هر شب می‌تواند تیر (مشقی یا جنگی) به بازیکنان بدهد — هر چند تا که تیر داشته باشد ولی حداکثر یک تیر به هر نفر. صبح، دارنده تیر می‌تواند شلیک کند. اگر تیر جنگی باشد و هدف هیل/سپر نداشته باشد → هدف حذف و سمتش اعلام می‌شود. تیر جنگی استفاده‌نشده تا شروع رأی‌گیری منفجر می‌شود و دارنده‌اش حذف می‌شود. ⚠️ اگر دارنده تیر توسط جادوگر بلاک شده باشد، می‌تواند شلیک کند ولی تیرش مشقی حساب می‌شود.',
      nightAction: NightAction.GIVE_BULLET,
      nightOrder: 16,
      maxCount: 1,
      unique: true,
    }),

    freemason: new Role({
      id: 'freemason',
      nameEn: 'Freemason',
      nameFa: 'فراماسون',
      team: Team.CITIZEN,
      icon: '🔺',
      descriptionEn: 'Each night can add one person to their team (default max 2, configurable). God wakes the new member and members can talk. If recruits citizen or spy → safe. If recruits mafia (except spy) or independent → next morning entire Freemason team (self + previous allies) is eliminated, but that mafia/independent survives.',
      descriptionFa: 'هر شب بیدار می‌شود و می‌تواند یک نفر را به تیمش اضافه کند (پیش‌فرض حداکثر ۲ نفر، قابل تنظیم). خدا فرد جدید را بیدار می‌کند و اعضا می‌توانند صحبت کنند. اگر شهروند یا جاسوس را بیدار کند → امن. اگر مافیا (غیر از جاسوس) یا مستقل را بیدار کند → صبح فردا تمام تیم فراماسون (خودش + متحدان قبلی) حذف می‌شوند ولی آن مافیا/مستقل زنده می‌ماند.',
      nightAction: NightAction.FRAMASON_RECRUIT,
      nightOrder: 14,
      maxCount: 1,
      unique: true,
    }),

    bodyguard: new Role({
      id: 'bodyguard',
      nameEn: 'Bodyguard',
      nameFa: 'محافظ',
      team: Team.CITIZEN,
      icon: '🛡️',
      descriptionEn: 'No night action. Has two abilities: 1) During noon nap when someone is bombed, bodyguard can guess the bomb code — correct → defused, wrong → bodyguard eliminated instead of bombed person. 2) If zodiac shoots bodyguard, zodiac is eliminated and bodyguard survives.',
      descriptionFa: 'اقدام شبانه ندارد. دو توانایی دارد: ۱) در خواب نیم‌روزی وقتی کسی بمب‌گذاری شده، محافظ می‌تواند رمز بمب را حدس بزند — درست → بمب خنثی، غلط → محافظ به جای فرد بمب‌شده حذف می‌شود. ۲) اگر زودیاک به محافظ شلیک کند، زودیاک حذف می‌شود و محافظ زنده می‌ماند.',
      nightAction: NightAction.NONE,
      nightOrder: 99,
      maxCount: 1,
      unique: true,
    }),

    reporter: new Role({
      id: 'reporter',
      nameEn: 'Reporter',
      nameFa: 'خبرنگار',
      team: Team.CITIZEN,
      icon: '📰',
      descriptionEn: 'After negotiation, if alive, has one chance to ask God whether negotiation was successful or not. God responds with 👍 or 👎.',
      descriptionFa: 'بعد از خریداری، اگر زنده باشد، یک بار این امکان را دارد که از خدا بپرسد آیا خریداری موفق بوده یا نه. خدا با 👍 یا 👎 پاسخ می‌دهد.',
      nightAction: NightAction.CHECK_NEGOTIATION,
      nightOrder: 1.5,
      maxCount: 1,
      unique: true,
    }),

    sniper: new Role({
      id: 'sniper',
      nameEn: 'Sniper',
      nameFa: 'اسنایپر',
      team: Team.CITIZEN,
      icon: '🎯',
      descriptionEn: 'Has limited shots (default 2, configurable). Can target anyone. If target is independent → nothing happens. If target is godfather with shield → nothing happens. If target is mafia healed by Dr. Lecter → shot wasted. If target is mafia without heal/shield → killed. If target is citizen → sniper dies. Has one-time shield.',
      descriptionFa: 'تعداد شلیک محدود دارد (پیش‌فرض ۲، قابل تنظیم). می‌تواند هر کسی را هدف بگیرد. اگر هدف مستقل باشد → هیچ اتفاقی نمی‌افتد. اگر هدف پدرخوانده باشد و هنوز سپر داشته باشد → هیچ اتفاقی نمی‌افتد. اگر هدف مافیایی باشد که دکتر لکتر هیل کرده → تیر هدر می‌رود. اگر هدف مافیا بدون هیل/سپر باشد → کشته می‌شود. اگر هدف شهروند باشد → اسنایپر خودش می‌میرد. یک‌بار سپر دارد.',
      nightAction: NightAction.SNIPE,
      nightOrder: 13,
      maxCount: 1,
      unique: true,
      hasShield: true,
    }),

    simpleCitizen: new Role({
      id: 'simpleCitizen',
      nameEn: 'Simple Citizen',
      nameFa: 'شهروند ساده',
      team: Team.CITIZEN,
      icon: '👤',
      descriptionEn: 'Regular citizen with no special abilities.',
      descriptionFa: 'شهروند عادی بدون توانایی ویژه.',
      nightAction: NightAction.NONE,
      nightOrder: 99,
      maxCount: 10,
      unique: false,
    }),

    suspect: new Role({
      id: 'suspect',
      nameEn: 'Suspect',
      nameFa: 'مظنون',
      team: Team.CITIZEN,
      icon: '🔎',
      descriptionEn: 'Citizen with no special abilities. Only difference: in detective investigation, appears as mafia (false positive).',
      descriptionFa: 'شهروند بدون توانایی ویژه. تنها تفاوت: در استعلام کارآگاه، مافیا نشان داده می‌شود (مثبت کاذب).',
      nightAction: NightAction.NONE,
      nightOrder: 99,
      maxCount: 10,
      unique: false,
    }),
  };

  /** Get role definition by id */
  static get(roleId) {
    return Roles.ALL[roleId] || null;
  }

  /** Get all roles for a team */
  static getByTeam(team) {
    return Object.values(Roles.ALL).filter(r => r.team === team);
  }

  /** Get roles that have night actions, sorted by nightOrder */
  static getNightRoles() {
    return Object.values(Roles.ALL)
      .filter(r => r.hasNightAction())
      .sort((a, b) => a.nightOrder - b.nightOrder);
  }

  /** Get team display name (Farsi by default, or bilingual) */
  static getTeamName(team, bilingual = false) {
    const teamName = TeamNames[team];
    if (!teamName) return team;
    return bilingual ? `${teamName.fa} / ${teamName.en}` : teamName.fa;
  }

  /** Get team color CSS class */
  static getTeamClass(team) {
    return `--${team}`;
  }

  /** Get all role IDs */
  static getAllIds() {
    return Object.keys(Roles.ALL);
  }
}
