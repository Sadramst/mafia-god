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
      descriptionEn: 'Leader of the mafia. Each night has one shot OR can perform "salakhi" (exact role guess). If salakhi is correct, target is eliminated bypassing doctor and shield. On salakhi nights, mafia has no regular shot. Mafia shot doesn\'t affect Jack or Zodiac, but salakhi does. Has one-time shield. Appears as citizen in detective investigation. When Negotiator is alive and mafia count ≤ threshold, choose "negotiate" instead of shoot/salakhi.',
      descriptionFa: 'رهبر مافیا. هر شب یک شلیک دارد یا می‌تواند سلاخی کند (حدس نقش دقیق). اگر سلاخی درست باشد، هدف حذف می‌شود و دکتر و سپر تأثیری ندارد. در شب سلاخی مافیا شلیک ندارد. شلیک مافیا روی جک و زودیاک تأثیر ندارد ولی سلاخی دارد. یک‌بار سپر دارد. در استعلام کارآگاه، شهروند نشان داده می‌شود. وقتی مذاکره‌کننده زنده باشد و مافیا ≤ آستانه، می‌تواند به‌جای شلیک/سلاخی «مذاکره» را انتخاب کند.',
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
      nameEn: 'Silencer',
      nameFa: 'سایلنسر',
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
      descriptionEn: 'Each night blocks one citizen or independent player\'s night action. ONLY blocks night actions — day actions (morning shots, cowboy ability, etc.) are NOT affected. If blocks Gunner → Gunner cannot give bullets that night. ⚠️ Cannot block same person two nights in a row.',
      descriptionFa: 'هر شب اقدام شبانه یک شهروند یا مستقل را خنثی می‌کند. فقط اقدام شب را بلاک می‌کند — اقدامات روز (تیر صبحگاهی، کابوی و غیره) تحت تأثیر قرار نمی‌گیرد. اگر تفنگدار بلاک شود → آن شب نمی‌تواند تیر بدهد. ⚠️ نمی‌تواند دو شب متوالی یک نفر را بلاک کند.',
      nightAction: NightAction.BLOCK,
      nightOrder: 6,
      maxCount: 1,
      unique: true,
    }),

    joker: new Role({
      id: 'joker',
      nameEn: 'Joker',
      nameFa: 'جوکر',
      team: Team.MAFIA,
      icon: '🃏',
      descriptionEn: 'Each night targets a player. If detective investigates the same player that night, the investigation result is reversed. ⚠️ Cannot target the same person two nights in a row.',
      descriptionFa: 'هر شب یک نفر را هدف می‌گیرد. اگر کارآگاه همان شب همان فرد را استعلام بزند، نتیجه استعلام برعکس می‌شود. ⚠️ نمی‌تواند دو شب متوالی یک نفر را هدف بگیرد.',
      nightAction: NightAction.JOKER_REVERSE,
      nightOrder: 7,
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
      descriptionEn: 'Independent role. Each night curses one person. If the cursed person is killed or voted out (night or day), Jack is also eliminated. Jack can also be killed by correct salakhi. Jack is immune to all other forms of death (shoot, vote, morning shots, last action cards, etc.). Cannot curse the same person again unless no other option. If shot in day → survives but curse is permanently locked. If targeted by vote → survives but curse is permanently locked. Wins if all mafia die or if Jack reaches Chaos (3 players).',
      descriptionFa: 'نقش مستقل. هر شب روی یک نفر طلسم می‌گذارد. اگر فرد طلسم‌شده کشته شود (شب یا روز)، جک هم حذف می‌شود. جک با سلاخی صحیح هم قابل حذف است. جک از تمام انواع دیگر مرگ مصون است (شلیک، رأی، تیر صبحگاهی، کارت حرکت آخر و غیره). نمی‌تواند روی یک نفر دوباره طلسم بگذارد مگر گزینه دیگری نباشد. اگر در روز تیر بخورد → زنده می‌ماند ولی طلسم برای همیشه ثابت می‌شود. اگر هدف رأی قرار بگیرد → زنده می‌ماند ولی طلسم ثابت می‌شود. برنده می‌شود اگر تمام مافیا بمیرند یا جک به آشوب (۳ نفر) برسد.',
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
      descriptionEn: 'Independent killer. Has shots (every night, odd/even nights based on settings). Immune to night shots but CAN be killed by day shoot (morning bullet) and by vote. If shoots bodyguard → zodiac dies, bodyguard survives. Can be eliminated by correct salakhi. Zodiac does NOT auto-win when mafia dies — must keep killing until 3 players remain, then win through Chaos.',
      descriptionFa: 'قاتل مستقل. شلیک دارد (هر شب، شب‌های فرد یا زوج بر اساس تنظیمات). با شلیک شبانه کشته نمی‌شود اما با تیر صبحگاهی (جنگی) و با رأی روز قابل حذف است. اگر به محافظ شلیک کند → زودیاک حذف، محافظ زنده. با سلاخی صحیح قابل حذف است. زودیاک با مرگ مافیا خودکار برنده نمی‌شود — باید کشتن ادامه دهد تا ۳ نفر باقی بمانند و از طریق آشوب برنده شود.',
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
      descriptionEn: 'Once per game can select someone. Wakes every night (from night 1) until ability is used. If target survives until morning and is mafia or independent → God announces role. Target stays in game. Next night God eliminates Kane (but Constantine CAN revive Kane). If target dies same night → ability returns. If Kane dies without using ability and is revived → still has the ability. If blocked by sorcerer → cannot act that night.',
      descriptionFa: 'یک‌بار در بازی می‌تواند کسی را انتخاب کند. هر شب بیدار می‌شود تا از توانایی استفاده کند. اگر هدف تا صبح زنده بماند و مافیا یا مستقل باشد → خدا نقش را اعلام می‌کند. هدف در بازی می‌ماند. شب بعد خدا کین را حذف می‌کند (کنستانتین می‌تواند کین را احیا کند). اگر هدف در همان شب بمیرد → توانایی برمی‌گردد. اگر کین بدون استفاده از توانایی بمیرد و احیا شود → هنوز توانایی دارد. اگر بلاک شود → آن شب نمی‌تواند اقدام کند.',
      nightAction: NightAction.KANE_REVEAL,
      nightOrder: 12,
      maxCount: 1,
      unique: true,
    }),

    sniper: new Role({
      id: 'sniper',
      nameEn: 'Sniper',
      nameFa: 'اسنایپر',
      team: Team.CITIZEN,
      icon: '🎯',
      descriptionEn: 'Has limited shots (default 2, configurable). Can target anyone. If target is Jack or Zodiac → nothing happens, bullet spent. If target is Godfather with shield → shield absorbs, bullet spent. If target is mafia healed by Dr. Lecter → bullet spent. If target is mafia without protection → killed. If target is citizen → sniper dies as penalty (Constantine can revive sniper). Has one-time shield.',
      descriptionFa: 'تعداد شلیک محدود دارد (پیش‌فرض ۲، قابل تنظیم). می‌تواند هر کسی را هدف بگیرد. اگر هدف جک یا زودیاک باشد → هیچ اتفاقی نمی‌افتد، تیر مصرف می‌شود. اگر هدف پدرخوانده با سپر باشد → سپر جذب می‌کند، تیر مصرف. اگر مافیا هیل‌شده باشد → تیر مصرف. اگر مافیا بدون محافظت → کشته. اگر شهروند → اسنایپر خودش می‌میرد (کنستانتین می‌تواند اسنایپر را احیا کند). یک‌بار سپر دارد.',
      nightAction: NightAction.SNIPE,
      nightOrder: 13,
      maxCount: 1,
      unique: true,
      hasShield: true,
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
      nightOrder: 6.5,
      maxCount: 1,
      unique: true,
    }),

    constantine: new Role({
      id: 'constantine',
      nameEn: 'Constantine',
      nameFa: 'کنستانتین',
      team: Team.CITIZEN,
      icon: '✝️',
      descriptionEn: 'Once per game can revive one player who died before the current night (any earlier round). Cannot revive salakhi victims. CAN revive Citizen Kane (even after Kane sacrifice). If Kane had unused ability → preserved after revival. If blocked by sorcerer → cannot revive that night.',
      descriptionFa: 'یک‌بار در بازی می‌تواند یک بازیکن مرده را احیا کند (از دورهای قبلی). نمی‌تواند قربانیان سلاخی را احیا کند. می‌تواند همشهری کین را احیا کند (حتی بعد از فدای کین). اگر کین توانایی استفاده‌نشده داشته باشد → بعد از احیا حفظ می‌شود. اگر بلاک شود → آن شب نمی‌تواند احیا کند.',
      nightAction: NightAction.REVIVE,
      nightOrder: 15,
      maxCount: 1,
      unique: true,
    }),

    cowboy: new Role({
      id: 'cowboy',
      nameEn: 'Cowboy',
      nameFa: 'کابوی',
      team: Team.CITIZEN,
      icon: '🤠',
      descriptionEn: 'Day action only (once per game). Declares "I am Cowboy" and chooses any player → that player is eliminated immediately. God announces the eliminated player\'s exact side: "mafia" / "Jack" / "Zodiac". Jack survives but his curse is permanently locked. Citizens can be revived by Constantine. Sorcerer CANNOT block this (day action).',
      descriptionFa: 'اقدام روزانه (یک‌بار در بازی). اعلام می‌کند «من کابوی‌ام» و یک نفر را انتخاب می‌کند → آن شخص فوراً حذف می‌شود. خدا سمت دقیق فرد حذف‌شده را اعلام می‌کند: «مافیا» / «جک» / «زودیاک». جک زنده می‌ماند ولی طلسمش برای همیشه قفل می‌شود. شهروندان توسط کنستانتین قابل احیا هستند. جادوگر نمی‌تواند این اقدام را بلاک کند (اقدام روزانه).',
      nightAction: NightAction.NONE,
      nightOrder: 99,
      maxCount: 1,
      unique: true,
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
