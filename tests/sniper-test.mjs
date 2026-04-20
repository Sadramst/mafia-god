import { Game } from '../js/models/Game.js';

function printStatus(game, label) {
  console.log('---', label, '---');
  console.log('Round:', game.round, 'Phase:', game.phase);
  console.log('Players:');
  for (const p of game.players) {
    console.log(`  [${p.id}] ${p.name} - role=${p.roleId} alive=${p.isAlive} deathCause=${p.deathCause}`);
  }
}

async function run() {
  // Case 1: sniper targets a mafia -> mafia should die
  const g1 = new Game();
  const sniper = g1.addPlayer('Sniper'); sniper.roleId = 'sniper';
  const mafia = g1.addPlayer('Mafioso'); mafia.roleId = 'simpleMafia';
  g1.startNight();
  // record sniper action
  g1.nightActions.sniper = { actorIds: [sniper.id], targetId: mafia.id };
  printStatus(g1, 'Before sniper (mafia target)');
  const r1 = g1.resolveNight();
  console.log('Results:', r1);
  printStatus(g1, 'After sniper (mafia target)');

  // Case 2: sniper targets a citizen -> sniper should die
  const g2 = new Game();
  const sniper2 = g2.addPlayer('Sniper2'); sniper2.roleId = 'sniper';
  const citizen = g2.addPlayer('Citizen'); citizen.roleId = 'simpleCitizen';
  g2.startNight();
  g2.nightActions.sniper = { actorIds: [sniper2.id], targetId: citizen.id };
  printStatus(g2, 'Before sniper (citizen target)');
  const r2 = g2.resolveNight();
  console.log('Results:', r2);
  printStatus(g2, 'After sniper (citizen target)');
}

run().catch(err => { console.error(err); process.exit(1); });
