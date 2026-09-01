/**
 * SummaryView.js — Game summary, history timeline, and win screen
 */
import { BaseView } from './BaseView.js';
import { Roles } from '../models/Roles.js';
import { Storage } from '../utils/Storage.js';
import { t, translations as tr } from '../utils/i18n.js';
import { Settings, Language } from '../utils/Settings.js';

export class SummaryView extends BaseView {

  destroy() {
    super.destroy();
    this._historyRecorded = false;
  }

  render() {
    // If a history preview is set (from Home history), render that snapshot instead of the active game
    const preview = this.app._historyPreview;
    if (preview) {
      this._renderSnapshot(preview);
      // clear preview after rendering
      this.app._historyPreview = null;
      return;
    }

    const game = this.game;

    if (game.phase === 'handshake') {
      this._renderHandshake();
    } else if (game.phase === 'ended' && game.winner) {
      this._renderWinScreen();
    } else {
      this._renderGameLog();
    }
  }

  /** Render a saved snapshot object (history entry) as a full summary without loading into game */
  _renderSnapshot(snapshot) {
    const g = snapshot;
    const title = g.winner === 'mafia' ? t(tr.summary.mafiaWins) : g.winner === 'citizen' ? t(tr.summary.citizenWins) : t(tr.summary.independentWins);

    this.container.innerHTML = `
      <div class="view">
        <div class="win-screen">
          <div class="win-screen__icon">${g.winner === 'mafia' ? '🔴' : g.winner === 'citizen' ? '🔵' : '🟣'}</div>
          <h1 class="win-screen__title">${title}</h1>
          <p class="win-screen__subtitle">${t(tr.summary.afterRounds).replace('%d', g.rounds || g.round || 0)}</p>
        </div>

        <div class="section mt-lg">
          <h2 class="section__title">${t(tr.summary.finalPlayerStatus)}</h2>
          <div class="player-list">
            ${ (g.players || []).map(p => {
              const role = Roles.get(p.roleId);
              const roleName = role ? (Settings.getLanguage() === Language.ENGLISH ? role.getLocalizedName() : role.getLocalizedName()) : (p.roleId || '—');
              return `
                <div class="player-item ${!p.isAlive ? 'player-item--dead' : ''}">
                  <span class="dot ${p.isAlive ? 'dot--alive' : 'dot--dead'}"></span>
                  <div class="player-item__name">${p.name}</div>
                  <span class="role-badge role-badge--${role?.team || 'citizen'}">
                    ${role?.icon || ''} ${roleName}
                  </span>
                </div>
              `;
            }).join('') }
          </div>
        </div>

        <div class="section mt-lg">
          <h2 class="section__title">${t(tr.summary.timeline)}</h2>
          <div class="timeline">
            ${ (g.history || []).map(h => {
                const when = h.timestamp ? new Date(h.timestamp).toLocaleString() : '';
                const phaseLabel = h.phase ? ` (${h.phase})` : '';
                const text = h.text || '';
                const itemClass = h.type && (h.type.includes('death') || h.type === 'death') ? 'timeline-item--death' : (h.phase === 'night' ? 'timeline-item--night' : 'timeline-item--day');
                return `
                  <div class="timeline-item ${itemClass}">
                    <div class="timeline-item__title">${t(tr.summary.roundInTimeline).replace('%d', h.round)}${phaseLabel} <span style="font-weight:400; color:var(--text-secondary);">${when}</span></div>
                    <div class="timeline-item__desc">${text || ''}</div>
                  </div>
                `;
              }).join('') }
          </div>
        </div>

        <div class="mt-lg">
          <button class="btn btn--ghost btn--block mt-sm" id="btn-home-summary">${t(tr.summary.backHome)}</button>
        </div>
      </div>
    `;

    this.listen('#btn-home-summary', 'click', () => this.navigate('home'));
  }

  _renderHandshake() {
    const game = this.game;
    const hs = game.handshakeState;
    if (!hs) { this._renderGameLog(); return; }

    const alivePlayers = hs.players.map(id => game.getPlayer(id)).filter(Boolean);

    this.container.innerHTML = `
      <div class="view">
        <div class="win-screen">
          <div class="win-screen__icon">🌀</div>
          <h1 class="win-screen__title">${t({ fa: 'آشوب', en: 'Chaos' })}</h1>
          <p class="win-screen__subtitle">${t({ fa: '۳ نفر باقی مانده‌اند. ۲ دقیقه صحبت آزاد، سپس دو نفر دست می‌دهند و نفر سوم حذف می‌شود.', en: '3 players remain. 2 minutes of free talk, then two shake hands and the third is eliminated.' })}</p>
        </div>

        <div class="section mt-lg">
          <h2 class="section__title">${t({ fa: 'بازیکنان باقی‌مانده', en: 'Remaining Players' })}</h2>
          <div class="player-list">
            ${alivePlayers.map(p => {
              const role = Roles.get(p.roleId);
              return `<div class="player-item"><span class="dot dot--alive"></span><div class="player-item__name">${p.name}</div><span class="role-badge role-badge--${role?.team || 'citizen'}">${role?.icon || ''} ${role?.getLocalizedName() || p.roleId}</span></div>`;
            }).join('')}
          </div>
        </div>

        <div class="section mt-lg">
          <h2 class="section__title">${t({ fa: 'انتخاب جفت متحد', en: 'Choose Allied Pair' })}</h2>
          <p style="color:var(--text-secondary); margin-bottom:.75rem;">
            ${t({ fa: 'دو بازیکنی که دست می‌دهند را انتخاب کنید:', en: 'Select the two players who shake hands:' })}
          </p>
          ${alivePlayers.map((p, i) => alivePlayers.slice(i + 1).map(q => `
            <button class="btn btn--primary btn--block mt-sm handshake-pair" data-p1="${p.id}" data-p2="${q.id}">
              🤝 ${p.name} + ${q.name}
            </button>
          `).join('')).join('')}
        </div>
      </div>
    `;

    this.container.querySelectorAll('.handshake-pair').forEach(btn => {
      btn.addEventListener('click', () => {
        const p1 = Number(btn.dataset.p1);
        const p2 = Number(btn.dataset.p2);
        game.resolveHandshake(p1, p2);
        this.app.saveGame();
        this.render(); // Re-render to show win screen
      });
    });
  }

  _renderWinScreen() {
    const game = this.game;
    const counts = game.getTeamCounts();

    const winnerData = {
      mafia: { icon: '🔴', title: t(tr.summary.mafiaWins), class: 'mafia' },
      citizen: { icon: '🔵', title: t(tr.summary.citizenWins), class: 'citizen' },
      independent: { icon: '🟣', title: t(tr.summary.independentWins), class: 'independent' },
    };
    const w = winnerData[game.winner] || winnerData.citizen;

    // Save full game snapshot to history exactly once per finished game — render() can run
    // again for the same win (language toggle, re-navigating to 'summary'), which must not
    // re-add a duplicate entry.
    if (!this._historyRecorded) {
      this._historyRecorded = true;
      Storage.addToHistory({
        date: Date.now(),
        winner: game.winner,
        rounds: game.round,
        playerCount: game.players.length,
        history: game.history.slice(),
        players: game.players.map(p => ({ id: p.id, name: p.name, roleId: p.roleId, isAlive: p.isAlive })),
      });
      Storage.deleteSave();
    }

    this.container.innerHTML = `
      <div class="view">
        <div class="win-screen">
          <div class="win-screen__icon">${w.icon}</div>
          <h1 class="win-screen__title win-screen__title--${w.class}">${w.title}</h1>
          <p class="win-screen__subtitle">${t(tr.summary.afterRounds).replace('%d', game.round)}</p>
        </div>

        <!-- All players final state -->
        <div class="section mt-lg">
          <h2 class="section__title">${t(tr.summary.finalPlayerStatus)}</h2>
          <div class="player-list">
            ${game.players.map(p => {
              const role = Roles.get(p.roleId);
              return `
                <div class="player-item ${!p.isAlive ? 'player-item--dead' : ''}">
                  <span class="dot ${p.isAlive ? 'dot--alive' : 'dot--dead'}"></span>
                  <div class="player-item__name">${p.name}</div>
                  <span class="role-badge role-badge--${role?.team || 'citizen'}">
                    ${role?.icon || ''} ${Settings.getLanguage() === Language.ENGLISH ? `<span class="ltr-inline">${role?.getLocalizedName() || ''}</span>` : (role?.getLocalizedName() || '')}
                  </span>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Game History Timeline -->
        ${this._renderTimeline()}

        <div class="mt-lg">
          <button class="btn btn--accent btn--lg btn--block" id="btn-new-game-summary">
            ${t(tr.summary.newGame)}
          </button>
          <button class="btn btn--ghost btn--block mt-sm" id="btn-home-summary">
            ${t(tr.summary.backHome)}
          </button>
        </div>
      </div>
    `;

    this.listen('#btn-new-game-summary', 'click', () => {
      game.reset();
      this.navigate('setup');
    });

    this.listen('#btn-home-summary', 'click', () => {
      game.reset();
      this.navigate('home');
    });
  }

  _renderGameLog() {
    const game = this.game;

    this.container.innerHTML = `
      <div class="view">
        <h2 class="section__title">${t(tr.summary.gameReport)}</h2>
        
        <!-- Stats -->
        <div class="stats-row">
          <div class="stat-card">
            <div class="stat-card__value">${game.round}</div>
            <div class="stat-card__label">${t(tr.summary.roundLabel)}</div>
          </div>
          <div class="stat-card">
            <div class="stat-card__value">${game.getAlivePlayers().length}</div>
            <div class="stat-card__label">${t(tr.summary.aliveLabel)}</div>
          </div>
          <div class="stat-card">
            <div class="stat-card__value">${game.getDeadPlayers().length}</div>
            <div class="stat-card__label">${t(tr.summary.deadLabel)}</div>
          </div>
        </div>

        ${this._renderTimeline()}

        <button class="btn btn--ghost btn--block mt-lg" id="btn-back-game">
          ${t(tr.summary.backGame)}
        </button>
      </div>
    `;

    this.listen('#btn-back-game', 'click', () => {
      if (game.phase === 'night') this.navigate('night');
      else if (game.phase === 'day') this.navigate('day');
      else this.navigate('home');
    });
  }

  _renderTimeline() {
    const game = this.game;
    if (game.history.length === 0) {
      return `
        <div class="empty-state">
          <div class="empty-state__icon">📭</div>
          <div class="empty-state__text">${t(tr.summary.noEvents)}</div>
        </div>
      `;
    }

    return `
      <div class="section mt-lg">
        <h2 class="section__title">${t(tr.summary.timeline)}</h2>
        <div class="timeline">
          ${game.history.map(h => {
            const itemClass = h.type.includes('death') || h.type === 'death'
              ? 'timeline-item--death'
              : h.phase === 'night'
                ? 'timeline-item--night'
                : 'timeline-item--day';

            const when = h.timestamp ? new Date(h.timestamp).toLocaleString() : '';
            const phaseLabel = h.phase ? ` (${h.phase})` : '';
            const mainText = h.text && h.text.length ? h.text : null;
            const fallback = () => {
              const parts = [];
              if (h.type) parts.push(t(tr.summary.eventType) + ': ' + h.type);
              if (h.actor) parts.push(t(tr.summary.actor) + ': ' + h.actor);
              if (h.target) parts.push(t(tr.summary.target) + ': ' + h.target);
              if (h.extra) parts.push(JSON.stringify(h.extra));
              return parts.join(' — ') || JSON.stringify(h);
            };

            return `
              <div class="timeline-item ${itemClass}">
                <div class="timeline-item__title">${t(tr.summary.roundInTimeline).replace('%d', h.round)}${phaseLabel} <span style="font-weight:400; color:var(--text-secondary);">${when}</span></div>
                <div class="timeline-item__desc">${mainText || fallback()}</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }
}
