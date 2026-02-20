/**
 * Enums.js — Enumeration types for the Mafia game
 * Provides type safety and clear constants
 */

/**
 * Night Action Types
 * Defines what special action a role can perform during the night phase
 */
export const NightAction = Object.freeze({
  NONE: null,
  KILL: 'kill',                           // Godfather's kill/salakhi
  MAFIA_HEAL: 'mafiaHeal',               // Dr. Lecter heals mafia members
  BOMB: 'bomb',                          // Bomber plants a bomb
  SILENCE: 'silence',                    // Matador silences a player
  BLOCK: 'block',                        // Jadoogar blocks a player's ability
  CURSE: 'curse',                        // Zodiac curses a player
  SOLO_KILL: 'soloKill',                 // Jack's independent kill
  HEAL: 'heal',                          // Doctor heals citizens
  INVESTIGATE: 'investigate',            // Detective investigates a player
  KANE_REVEAL: 'kaneReveal',             // Kane reveals a role
  REVIVE: 'revive',                      // Constantine revives a dead player
  GIVE_BULLET: 'giveBullet',             // Tofangdar gives bullets
  FRAMASON_RECRUIT: 'framasonRecruit',   // Framason recruits a player
  CHECK_NEGOTIATION: 'checkNegotiation', // Reporter checks for negotiation
  SNIPE: 'snipe',                        // Sniper shoots with limited bullets
});

/**
 * Team Types
 * Three main factions in the game
 */
export const Team = Object.freeze({
  MAFIA: 'mafia',
  CITIZEN: 'citizen',
  INDEPENDENT: 'independent',
});

/**
 * Team Display Names
 */
export const TeamNames = Object.freeze({
  [Team.MAFIA]: {
    fa: 'تیم مافیا',
    en: 'Mafia Team',
  },
  [Team.CITIZEN]: {
    fa: 'تیم شهروند',
    en: 'Citizen Team',
  },
  [Team.INDEPENDENT]: {
    fa: 'مستقل',
    en: 'Independent',
  },
});
