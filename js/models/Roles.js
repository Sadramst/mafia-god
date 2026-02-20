/**
 * Roles.js — Role definitions for the Mafia game
 * 
 * Three teams: mafia, citizen, independent
 * Each role has: id, name, team, icon, description, nightAction, maxCount
 */
export class Roles {

  /** All available roles in the game */
  static ALL = {

    // ─── تیم مافیا (Mafia Team) ───
    godfather: {
      id: 'godfather',
      name: 'پدرخوانده',
      team: 'mafia',
      icon: '🎩',
      description: 'رهبر مافیا. هر شب یک شلیک دارد یا می‌تواند سلاخی کند (حدس نقش دقیق). اگر سلاخی درست باشد، هدف حذف می‌شود و دکتر و سپر تأثیری ندارد. در شب سلاخی مافیا شلیک ندارد. شلیک مافیا روی جک و زودیاک تأثیر ندارد ولی سلاخی دارد. یک‌بار سپر دارد. در استعلام کارآگاه، شهروند نشان داده می‌شود.',
      nightAction: 'kill',
      nightOrder: 1,
      maxCount: 1,
      unique: true,
      hasShield: true,
    },
    drLecter: {
      id: 'drLecter',
      name: 'دکتر لکتر',
      team: 'mafia',
      icon: '💉',
      description: 'دکتر مافیا. می‌تواند یکی از اعضای مافیا را نجات دهد.',
      nightAction: 'mafiaHeal',
      nightOrder: 2,
      maxCount: 1,
      unique: true,
    },
    bomber: {
      id: 'bomber',
      name: 'بمب‌گذار',
      team: 'mafia',
      icon: '💣',
      description: 'یک‌بار در بازی روی یک بازیکن بمب می‌گذارد و رمز ۱ تا ۴ تعیین می‌کند. صبح خدا اعلام می‌کند بمب جلوی کیست. قبل از رأی‌گیری خواب نیم‌روزی: اول محافظ می‌تواند رمز را حدس بزند (درست → خنثی، غلط → محافظ حذف). اگر محافظ نباشد یا حدس نزند، خود فرد بمب‌شده حدس می‌زند (درست → خنثی، غلط → حذف).',
      nightAction: 'bomb',
      nightOrder: 3,
      maxCount: 1,
      unique: true,
    },
    spy: {
      id: 'spy',
      name: 'جاسوس',
      team: 'mafia',
      icon: '🕵️',
      description: 'می‌تواند ببیند یک بازیکن در شب چه کسی را ویزیت کرده.',
      nightAction: 'spy',
      nightOrder: 4,
      maxCount: 1,
      unique: true,
    },
    matador: {
      id: 'matador',
      name: 'ماتادور',
      team: 'mafia',
      icon: '🤐',
      description: 'می‌تواند یک بازیکن را سکوت کند (نمی‌تواند در روز صحبت کند).',
      nightAction: 'silence',
      nightOrder: 5,
      maxCount: 1,
      unique: true,
    },
    sorcerer: {
      id: 'sorcerer',
      name: 'جادوگر',
      team: 'mafia',
      icon: '🧙',
      description: 'می‌تواند اقدام شبانه یک بازیکن را خنثی کند.',
      nightAction: 'block',
      nightOrder: 6,
      maxCount: 1,
      unique: true,
    },
    simpleMafia: {
      id: 'simpleMafia',
      name: 'مافیای ساده',
      team: 'mafia',
      icon: '🔫',
      description: 'عضو عادی مافیا. در رأی‌گیری شبانه مافیا شرکت می‌کند.',
      nightAction: null,
      nightOrder: 99,
      maxCount: 10,
      unique: false,
    },

    // ─── تیم مستقل (Independent Team) ───
    jack: {
      id: 'jack',
      name: 'جک',
      team: 'independent',
      icon: '🔪',
      description: 'قاتل سریالی مستقل. هر شب روی یک نفر طلسم می‌گذارد. اگر فرد طلسم‌شده کشته شود یا رأی بگیرد، جک هم حذف می‌شود. جک با شلیک شبانه و رأی روز کشته نمی‌شود. تنها راه حذف: سلاخی درست یا مرگ فرد طلسم‌شده.',
      nightAction: 'telesm',
      nightOrder: 20,
      maxCount: 1,
      unique: true,
      shootImmune: true,
      voteImmune: true,
    },
    zodiac: {
      id: 'zodiac',
      name: 'زودیاک',
      team: 'independent',
      icon: '♈',
      description: 'قاتل مستقل. شلیک دارد (هر شب، شب‌های فرد یا زوج بر اساس تنظیمات). با شلیک شبانه کشته نمی‌شود. اگر به محافظ (نقش بادیگارد) شلیک کند، زودیاک حذف می‌شود و محافظ زنده می‌ماند. با رأی روز قابل حذف است.',
      nightAction: 'soloKill',
      nightOrder: 21,
      maxCount: 1,
      unique: true,
      shootImmune: true,
      voteImmune: false,
    },

    // ─── تیم شهروند (Citizen Team) ───
    drWatson: {
      id: 'drWatson',
      name: 'دکتر واتسون',
      team: 'citizen',
      icon: '⚕️',
      description: 'هر شب یک نفر را نجات می‌دهد. نمی‌تواند دو شب پشت سر هم یک نفر را نجات دهد.',
      nightAction: 'heal',
      nightOrder: 10,
      maxCount: 1,
      unique: true,
    },
    detective: {
      id: 'detective',
      name: 'کارآگاه',
      team: 'citizen',
      icon: '🔍',
      description: 'هر شب یک بازیکن را استعلام می‌کند و طرف او را می‌فهمد.',
      nightAction: 'investigate',
      nightOrder: 11,
      maxCount: 1,
      unique: true,
    },
    kane: {
      id: 'kane',
      name: 'همشهری کین',
      team: 'citizen',
      icon: '🎖️',
      description: 'رأی او در رأی‌گیری روز دو تا حساب می‌شود.',
      nightAction: null,
      nightOrder: 99,
      maxCount: 1,
      unique: true,
    },
    constantine: {
      id: 'constantine',
      name: 'کنستانتین',
      team: 'citizen',
      icon: '✝️',
      description: 'یک بار در بازی می‌تواند یک بازیکن مرده را زنده کند.',
      nightAction: 'revive',
      nightOrder: 15,
      maxCount: 1,
      unique: true,
    },
    gunner: {
      id: 'gunner',
      name: 'تفنگدار',
      team: 'citizen',
      icon: '🔫',
      description: 'یک بار در بازی می‌تواند در روز یک بازیکن را بکشد.',
      nightAction: null,
      nightOrder: 99,
      maxCount: 1,
      unique: true,
    },
    freemason: {
      id: 'freemason',
      name: 'فراماسون',
      team: 'citizen',
      icon: '🔺',
      description: 'فراماسون‌ها همدیگر را می‌شناسند.',
      nightAction: null,
      nightOrder: 99,
      maxCount: 3,
      unique: false,
    },
    bodyguard: {
      id: 'bodyguard',
      name: 'محافظ',
      team: 'citizen',
      icon: '🛡️',
      description: 'هر شب از یک بازیکن محافظت می‌کند — اگر هدف حمله باشد، محافظ جان می‌دهد. در خواب نیم‌روزی می‌تواند رمز بمب را حدس بزند: درست → بمب خنثی، غلط → محافظ حذف می‌شود به جای فرد بمب‌شده. اگر زودیاک به محافظ شلیک کند، زودیاک حذف می‌شود.',
      nightAction: 'protect',
      nightOrder: 12,
      maxCount: 1,
      unique: true,
    },
    sniper: {
      id: 'sniper',
      name: 'تک‌تیرانداز',
      team: 'citizen',
      icon: '🎯',
      description: 'نشانه می‌گیرد. اگر هدف مافیا یا مستقل باشد کشته می‌شود، اگر شهروند باشد تک‌تیرانداز می‌میرد. یک‌بار سپر دارد.',
      nightAction: 'snipe',
      nightOrder: 13,
      maxCount: 1,
      unique: true,
      hasShield: true,
    },
    simpleCitizen: {
      id: 'simpleCitizen',
      name: 'شهروند ساده',
      team: 'citizen',
      icon: '👤',
      description: 'شهروند عادی بدون توانایی ویژه.',
      nightAction: null,
      nightOrder: 99,
      maxCount: 10,
      unique: false,
    },
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
      .filter(r => r.nightAction)
      .sort((a, b) => a.nightOrder - b.nightOrder);
  }

  /** Get team display name in Farsi */
  static getTeamName(team) {
    const names = {
      mafia: 'تیم مافیا',
      citizen: 'تیم شهروند',
      independent: 'مستقل',
    };
    return names[team] || team;
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
