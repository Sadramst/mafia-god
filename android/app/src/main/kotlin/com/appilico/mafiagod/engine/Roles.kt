package com.appilico.mafiagod.engine

/** Ported 1:1 from js/models/Roles.js — all 23 roles, exact fa/en text preserved. */
object Roles {
    val ALL: Map<String, Role> = listOf(
        Role(
            id = "godfather", nameEn = "Godfather", nameFa = "پدرخوانده", team = Team.MAFIA, icon = "🎩",
            nightAction = NightAction.KILL, nightOrder = 1, maxCount = 1, unique = true, hasShield = true,
            descEn = "Leader of the mafia. Each night has one shot OR can perform \"salakhi\" (exact role guess). If salakhi is correct, target is eliminated bypassing doctor and shield. On salakhi nights, mafia has no regular shot. Mafia shot doesn't affect Jack or Zodiac, but salakhi does. Has one-time shield. Appears as citizen in detective investigation.",
            descFa = "رهبر مافیا. هر شب یک شلیک دارد یا می‌تواند سلاخی کند (حدس نقش دقیق). اگر سلاخی درست باشد، هدف حذف می‌شود و دکتر و سپر تأثیری ندارد. در شب سلاخی مافیا شلیک ندارد. شلیک مافیا روی جک و زودیاک تأثیر ندارد ولی سلاخی دارد. یک‌بار سپر دارد. در استعلام کارآگاه، شهروند نشان داده می‌شود.",
        ),
        Role(
            id = "negotiator", nameEn = "Negotiator", nameFa = "مذاکره‌کننده", team = Team.MAFIA, icon = "🤝",
            nightAction = NightAction.NEGOTIATE, nightOrder = 2, maxCount = 1, unique = true,
            descEn = "Mafia member. When alive mafia count reaches threshold (default 2, configurable) and negotiator is alive, negotiator wakes up and selects a target to recruit. If target is simple citizen or suspect → joins mafia team. Otherwise negotiation fails. On a negotiate night, mafia loses their regular shot.",
            descFa = "عضو تیم مافیا. وقتی تعداد اعضای زنده مافیا به حد مشخصی برسد (پیش‌فرض ۲، قابل تنظیم) و مذاکره‌کننده زنده باشد، مذاکره‌کننده بیدار شده و هدف انتخاب می‌کند. اگر هدف شهروند ساده یا مظنون باشد → به تیم مافیا اضافه می‌شود. در غیر این صورت مذاکره شکست. در شب مذاکره، مافیا شلیک ندارد.",
        ),
        Role(
            id = "drLecter", nameEn = "Dr. Lecter", nameFa = "دکتر لکتر", team = Team.MAFIA, icon = "💉",
            nightAction = NightAction.MAFIA_HEAL, nightOrder = 3, maxCount = 1, unique = true,
            descEn = "Mafia doctor. Each night heals one mafia member (or self). Can heal others unlimited times, but can only self-heal a limited number of times (default 2, configurable). Heal remains until morning — if someone shoots the healed player, they survive and the heal is consumed.",
            descFa = "دکتر مافیا. هر شب یکی از اعضای مافیا (یا خودش) را نجات می‌دهد. می‌تواند هر فرد دیگر را بدون محدودیت نجات دهد اما خودش را فقط تعداد محدود (پیش‌فرض ۲ بار، قابل تنظیم). هیل تا صبح باقی می‌ماند — اگر کسی به فرد هیل‌شده شلیک کند، فرد زنده می‌ماند و هیل مصرف می‌شود.",
        ),
        Role(
            id = "bomber", nameEn = "Bomber", nameFa = "بمب‌گذار", team = Team.MAFIA, icon = "💣",
            nightAction = NightAction.BOMB, nightOrder = 4, maxCount = 1, unique = true,
            descEn = "Once per game, plants a bomb on a player and sets a code (1-4). In the morning, God announces who has the bomb. Before voting, during noon nap: first, bodyguard can guess the code (correct → defused, wrong → bodyguard eliminated). If no bodyguard or no guess, the bombed player guesses (correct → defused, wrong → eliminated).",
            descFa = "یک‌بار در بازی روی یک بازیکن بمب می‌گذارد و رمز ۱ تا ۴ تعیین می‌کند. صبح خدا اعلام می‌کند بمب جلوی کیست. قبل از رأی‌گیری خواب نیم‌روزی: اول محافظ می‌تواند رمز را حدس بزند (درست → خنثی، غلط → محافظ حذف). اگر محافظ نباشد یا حدس نزند، خود فرد بمب‌شده حدس می‌زند (درست → خنثی، غلط → حذف).",
        ),
        Role(
            id = "matador", nameEn = "Silencer", nameFa = "سایلنسر", team = Team.MAFIA, icon = "🤐",
            nightAction = NightAction.SILENCE, nightOrder = 5, maxCount = 1, unique = true,
            descEn = "Each night silences one player — can be mafia, citizen, or independent. That player cannot speak the next day.",
            descFa = "هر شب بیدار می‌شود و یک نفر را سکوت می‌کند — فرقی نمی‌کند مافیا، شهروند یا مستقل باشد. آن بازیکن فردا حق صحبت ندارد.",
        ),
        Role(
            id = "jadoogar", nameEn = "Sorcerer", nameFa = "جادوگر", team = Team.MAFIA, icon = "🧙",
            nightAction = NightAction.BLOCK, nightOrder = 6, maxCount = 1, unique = true,
            descEn = "Each night blocks one citizen or independent player's night action. ONLY blocks night actions — day actions (morning shots, cowboy ability, etc.) are NOT affected. If blocks Gunner → Gunner cannot give bullets that night. Cannot block same person two nights in a row.",
            descFa = "هر شب اقدام شبانه یک شهروند یا مستقل را خنثی می‌کند. فقط اقدام شب را بلاک می‌کند — اقدامات روز (تیر صبحگاهی، کابوی و غیره) تحت تأثیر قرار نمی‌گیرد. اگر تفنگدار بلاک شود → آن شب نمی‌تواند تیر بدهد. نمی‌تواند دو شب متوالی یک نفر را بلاک کند.",
        ),
        Role(
            id = "joker", nameEn = "Joker", nameFa = "جوکر", team = Team.MAFIA, icon = "🃏",
            nightAction = NightAction.JOKER_REVERSE, nightOrder = 7, maxCount = 1, unique = true,
            descEn = "Each night targets a player. If detective investigates the same player that night, the investigation result is reversed. Cannot target the same person two nights in a row.",
            descFa = "هر شب یک نفر را هدف می‌گیرد. اگر کارآگاه همان شب همان فرد را استعلام بزند، نتیجه استعلام برعکس می‌شود. نمی‌تواند دو شب متوالی یک نفر را هدف بگیرد.",
        ),
        Role(
            id = "simpleMafia", nameEn = "Simple Mafia", nameFa = "مافیای ساده", team = Team.MAFIA, icon = "🔫",
            nightAction = null, nightOrder = 99, maxCount = 10, unique = false,
            descEn = "Regular mafia member. Participates in mafia night voting.",
            descFa = "عضو عادی مافیا. در رأی‌گیری شبانه مافیا شرکت می‌کند.",
        ),
        Role(
            id = "spy", nameEn = "Spy", nameFa = "جاسوس", team = Team.MAFIA, icon = "🕵️",
            nightAction = null, nightOrder = 99, maxCount = 1, unique = true,
            descEn = "Mafia member with no night action. If Freemason recruits the spy, the spy joins the Freemason alliance without contaminating the team and can see alliance members while working for the mafia.",
            descFa = "عضو تیم مافیاست ولی اقدام شبانه ندارد. اگر فراماسون جاسوس را بیدار کند، جاسوس بدون آلوده کردن تیم وارد اتحاد فراماسون می‌شود و می‌تواند اعضای اتحاد را بشناسد و به نفع مافیا عمل کند.",
        ),
        Role(
            id = "jack", nameEn = "Jack", nameFa = "جک", team = Team.INDEPENDENT, icon = "🔪",
            nightAction = NightAction.CURSE, nightOrder = 21, maxCount = 1, unique = true,
            shootImmune = true, voteImmune = true,
            descEn = "Independent role. Each night curses one person. If the cursed person is killed or voted out (night or day), Jack is also eliminated. Jack can also be killed by correct salakhi. Jack is immune to all other forms of death (shoot, vote, morning shots, last action cards, etc.). Cannot curse the same person again unless no other option. If shot in day → survives but curse is permanently locked. If targeted by vote → survives but curse is permanently locked. If Citizen Kane reveals Jack → curse is permanently locked and God announces it. When curse is locked, if the cursed player dies Jack is immediately eliminated. Wins if all mafia die or if Jack reaches Chaos (3 players).",
            descFa = "نقش مستقل. هر شب روی یک نفر طلسم می‌گذارد. اگر فرد طلسم‌شده کشته شود (شب یا روز)، جک هم حذف می‌شود. جک با سلاخی صحیح هم قابل حذف است. جک از تمام انواع دیگر مرگ مصون است (شلیک، رأی، تیر صبحگاهی، کارت حرکت آخر و غیره). نمی‌تواند روی یک نفر دوباره طلسم بگذارد مگر گزینه دیگری نباشد. اگر در روز تیر بخورد → زنده می‌ماند ولی طلسم برای همیشه ثابت می‌شود. اگر هدف رأی قرار بگیرد → زنده می‌ماند ولی طلسم ثابت می‌شود. اگر همشهری کین جک را افشا کند → طلسم ثابت می‌شود و خدا اعلام می‌کند. وقتی طلسم ثابت شود، اگر فرد طلسم‌شده بمیرد جک فوراً حذف می‌شود. برنده می‌شود اگر تمام مافیا بمیرند یا جک به آشوب (۳ نفر) برسد.",
        ),
        Role(
            id = "zodiac", nameEn = "Zodiac", nameFa = "زودیاک", team = Team.INDEPENDENT, icon = "♈",
            nightAction = NightAction.SOLO_KILL, nightOrder = 20, maxCount = 1, unique = true,
            shootImmune = true, voteImmune = false,
            descEn = "Independent killer. Has shots (every night, odd/even nights based on settings). Immune to night shots but CAN be killed by day shoot (morning bullet) and by vote. If shoots bodyguard → zodiac dies, bodyguard survives. Can be eliminated by correct salakhi. Zodiac does NOT auto-win when mafia dies — must keep killing until 3 players remain, then win through Chaos.",
            descFa = "قاتل مستقل. شلیک دارد (هر شب، شب‌های فرد یا زوج بر اساس تنظیمات). با شلیک شبانه کشته نمی‌شود اما با تیر صبحگاهی (جنگی) و با رأی روز قابل حذف است. اگر به محافظ شلیک کند → زودیاک حذف، محافظ زنده. با سلاخی صحیح قابل حذف است. زودیاک با مرگ مافیا خودکار برنده نمی‌شود — باید کشتن ادامه دهد تا ۳ نفر باقی بمانند و از طریق آشوب برنده شود.",
        ),
        Role(
            id = "drWatson", nameEn = "Dr. Watson", nameFa = "دکتر واتسون", team = Team.CITIZEN, icon = "⚕️",
            nightAction = NightAction.HEAL, nightOrder = 9, maxCount = 1, unique = true,
            descEn = "Each night heals one person (or self). Can heal others unlimited times, but can only self-heal a limited number of times (default 2, configurable). Heal remains until morning — if someone shoots the healed player, they survive and the heal is consumed.",
            descFa = "هر شب یک نفر (یا خودش) را نجات می‌دهد. می‌تواند هر فرد دیگر را بدون محدودیت نجات دهد اما خودش را فقط تعداد محدود (پیش‌فرض ۲ بار، قابل تنظیم). هیل تا صبح باقی می‌ماند — اگر کسی به فرد هیل‌شده شلیک کند، فرد زنده می‌ماند و هیل مصرف می‌شود.",
        ),
        Role(
            id = "detective", nameEn = "Detective", nameFa = "کارآگاه", team = Team.CITIZEN, icon = "🔍",
            nightAction = NightAction.INVESTIGATE, nightOrder = 10, maxCount = 1, unique = true,
            descEn = "Each night investigates one player. If target is mafia (not godfather) or suspect → God shows 👍. If target is godfather, independent, or citizen (not suspect) → God shows 👎. If blocked by sorcerer → God shows ✊ (closed fist).",
            descFa = "هر شب یک بازیکن را استعلام می‌کند. اگر هدف مافیای غیر پدرخوانده یا مظنون باشد → خدا 👍 نشان می‌دهد. اگر هدف پدرخوانده، مستقل یا شهروند (غیر مظنون) باشد → خدا 👎 نشان می‌دهد. اگر توسط جادوگر بلاک شده باشد → خدا ✊ (مشت بسته) نشان می‌دهد.",
        ),
        Role(
            id = "kane", nameEn = "Citizen Kane", nameFa = "همشهری کین", team = Team.CITIZEN, icon = "🎖️",
            nightAction = NightAction.KANE_REVEAL, nightOrder = 11, maxCount = 1, unique = true,
            descEn = "Once per game can select someone. Wakes every night until ability is used. If target survives until morning and is mafia or independent → God announces role. Next night God eliminates Kane (Constantine can revive Kane). If target dies same night → ability returns. If blocked by sorcerer → cannot act that night. If Kane reveals Jack → Jack's curse becomes permanently locked.",
            descFa = "یک‌بار در بازی می‌تواند کسی را انتخاب کند. هر شب بیدار می‌شود تا از توانایی استفاده کند. اگر هدف تا صبح زنده بماند و مافیا یا مستقل باشد → خدا نقش را اعلام می‌کند. شب بعد خدا کین را حذف می‌کند (کنستانتین می‌تواند کین را احیا کند). اگر هدف در همان شب بمیرد → توانایی برمی‌گردد. اگر بلاک شود → آن شب نمی‌تواند اقدام کند. اگر کین جک را افشا کند → طلسم جک ثابت می‌شود.",
        ),
        Role(
            id = "sniper", nameEn = "Sniper", nameFa = "اسنایپر", team = Team.CITIZEN, icon = "🎯",
            nightAction = NightAction.SNIPE, nightOrder = 12, maxCount = 1, unique = true, hasShield = true,
            descEn = "Has limited shots (default 2, configurable). Can target anyone. If target is Jack or Zodiac → nothing happens, bullet spent. If target is mafia healed → bullet spent. If target is mafia without protection → killed. If target is citizen → sniper dies as penalty (Constantine can revive sniper). Has one-time shield.",
            descFa = "تعداد شلیک محدود دارد (پیش‌فرض ۲، قابل تنظیم). می‌تواند هر کسی را هدف بگیرد. اگر هدف جک یا زودیاک باشد → هیچ اتفاقی نمی‌افتد، تیر مصرف می‌شود. اگر مافیا هیل‌شده باشد → تیر مصرف. اگر مافیا بدون محافظت → کشته. اگر شهروند → اسنایپر خودش می‌میرد (کنستانتین می‌تواند اسنایپر را احیا کند). یک‌بار سپر دارد.",
        ),
        Role(
            id = "gunner", nameEn = "Gunner", nameFa = "تفنگدار", team = Team.CITIZEN, icon = "🔫",
            nightAction = NightAction.GIVE_BULLET, nightOrder = 15, maxCount = 1, unique = true,
            descEn = "Each night can give bullets (practice or war) to players — max one bullet per person. In the morning, bullet holder can shoot. Unused war bullet explodes at voting start, eliminating its holder.",
            descFa = "هر شب می‌تواند تیر (مشقی یا جنگی) به بازیکنان بدهد — حداکثر یک تیر به هر نفر. صبح، دارنده تیر می‌تواند شلیک کند. تیر جنگی استفاده‌نشده تا شروع رأی‌گیری منفجر می‌شود و دارنده‌اش حذف می‌شود.",
        ),
        Role(
            id = "freemason", nameEn = "Freemason", nameFa = "فراماسون", team = Team.CITIZEN, icon = "🔺",
            nightAction = NightAction.FRAMASON_RECRUIT, nightOrder = 13, maxCount = 1, unique = true,
            descEn = "Each night can add one person to their team (default max 2, configurable). If recruits citizen or spy → safe. If recruits mafia (except spy) or independent → next morning entire Freemason team is eliminated, but that mafia/independent survives.",
            descFa = "هر شب می‌تواند یک نفر را به تیمش اضافه کند (پیش‌فرض حداکثر ۲ نفر، قابل تنظیم). اگر شهروند یا جاسوس را بیدار کند → امن. اگر مافیا (غیر از جاسوس) یا مستقل را بیدار کند → صبح فردا تمام تیم فراماسون حذف می‌شوند ولی آن مافیا/مستقل زنده می‌ماند.",
        ),
        Role(
            id = "bodyguard", nameEn = "Bodyguard", nameFa = "محافظ", team = Team.CITIZEN, icon = "🛡️",
            nightAction = null, nightOrder = 99, maxCount = 1, unique = true,
            descEn = "No night action. During noon nap when someone is bombed, bodyguard can guess the bomb code — correct → defused, wrong → bodyguard eliminated instead. If zodiac shoots bodyguard, zodiac is eliminated and bodyguard survives.",
            descFa = "اقدام شبانه ندارد. در خواب نیم‌روزی وقتی کسی بمب‌گذاری شده، محافظ می‌تواند رمز بمب را حدس بزند — درست → بمب خنثی، غلط → محافظ حذف می‌شود. اگر زودیاک به محافظ شلیک کند، زودیاک حذف می‌شود و محافظ زنده می‌ماند.",
        ),
        Role(
            id = "reporter", nameEn = "Reporter", nameFa = "خبرنگار", team = Team.CITIZEN, icon = "📰",
            nightAction = NightAction.CHECK_NEGOTIATION, nightOrder = 8, maxCount = 1, unique = true,
            descEn = "After negotiation, if alive, has a chance to ask God whether negotiation was successful or not. God responds with 👍 or 👎.",
            descFa = "بعد از خریداری، اگر زنده باشد، این امکان را دارد که از خدا بپرسد آیا خریداری موفق بوده یا نه. خدا با 👍 یا 👎 پاسخ می‌دهد.",
        ),
        Role(
            id = "constantine", nameEn = "Constantine", nameFa = "کنستانتین", team = Team.CITIZEN, icon = "✝️",
            nightAction = NightAction.REVIVE, nightOrder = 14, maxCount = 1, unique = true,
            descEn = "Once per game can revive one player who died before the current night. Cannot revive salakhi victims. CAN revive Citizen Kane (even after Kane sacrifice). If blocked by sorcerer → cannot revive that night.",
            descFa = "یک‌بار در بازی می‌تواند یک بازیکن مرده را احیا کند (از دورهای قبلی). نمی‌تواند قربانیان سلاخی را احیا کند. می‌تواند همشهری کین را احیا کند. اگر بلاک شود → آن شب نمی‌تواند احیا کند.",
        ),
        Role(
            id = "cowboy", nameEn = "Cowboy", nameFa = "کابوی", team = Team.CITIZEN, icon = "🤠",
            nightAction = null, nightOrder = 99, maxCount = 1, unique = true,
            descEn = "Day action only (once per game). Declares and chooses any player → that player is eliminated immediately. God announces the eliminated player's exact side. Jack survives but his curse is permanently locked. Citizens can be revived by Constantine. Sorcerer CANNOT block this (day action).",
            descFa = "اقدام روزانه (یک‌بار در بازی). اعلام می‌کند و یک نفر را انتخاب می‌کند → آن شخص فوراً حذف می‌شود. خدا سمت دقیق فرد حذف‌شده را اعلام می‌کند. جک زنده می‌ماند ولی طلسمش برای همیشه قفل می‌شود. شهروندان توسط کنستانتین قابل احیا هستند. جادوگر نمی‌تواند این اقدام را بلاک کند.",
        ),
        Role(
            id = "simpleCitizen", nameEn = "Simple Citizen", nameFa = "شهروند ساده", team = Team.CITIZEN, icon = "👤",
            nightAction = null, nightOrder = 99, maxCount = 10, unique = false,
            descEn = "Regular citizen with no special abilities.",
            descFa = "شهروند عادی بدون توانایی ویژه.",
        ),
        Role(
            id = "suspect", nameEn = "Suspect", nameFa = "مظنون", team = Team.CITIZEN, icon = "🔎",
            nightAction = null, nightOrder = 99, maxCount = 10, unique = false,
            descEn = "Citizen with no special abilities. Only difference: in detective investigation, appears as mafia (false positive).",
            descFa = "شهروند بدون توانایی ویژه. تنها تفاوت: در استعلام کارآگاه، مافیا نشان داده می‌شود (مثبت کاذب).",
        ),
    ).associateBy { it.id }

    fun get(id: String?): Role? = if (id == null) null else ALL[id]

    fun getByTeam(team: String): List<Role> = ALL.values.filter { it.team == team }

    /** Wake/UI order — ascending nightOrder. NOT the resolution order (see Game.resolveNight). */
    fun getNightRoles(): List<Role> = ALL.values.filter { it.hasNightAction() }.sortedBy { it.nightOrder }
}
