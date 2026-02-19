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
      description: 'رهبر مافیا. در استعلام کارآگاه، شهروند نشان داده می‌شود.',
      nightAction: 'kill',
      nightOrder: 1,
      maxCount: 1,
      unique: true,
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
      description: 'روی یک بازیکن بمب می‌گذارد. اگر بمب‌گذار بمیرد، آن بازیکن هم می‌میرد.',
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
      description: 'قاتل سریالی. مستقل عمل می‌کند و هر شب یک نفر را می‌کشد.',
      nightAction: 'soloKill',
      nightOrder: 20,
      maxCount: 1,
      unique: true,
    },
    zodiac: {
      id: 'zodiac',
      name: 'زودیاک',
      team: 'independent',
      icon: '♈',
      description: 'قاتل مستقل. هر شب می‌تواند یک نفر را بکشد.',
      nightAction: 'soloKill',
      nightOrder: 21,
      maxCount: 1,
      unique: true,
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
      description: 'از یک بازیکن محافظت می‌کند. اگر آن بازیکن مورد حمله قرار بگیرد، محافظ می‌میرد.',
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
      description: 'نشانه می‌گیرد. اگر هدف مافیا باشد کشته می‌شود، اگر شهروند باشد تک‌تیرانداز می‌میرد.',
      nightAction: 'snipe',
      nightOrder: 13,
      maxCount: 1,
      unique: true,
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
