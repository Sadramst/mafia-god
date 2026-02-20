/**
 * SummaryView.js — Game summary, history timeline, and win screen
 */
import { BaseView } from './BaseView.js';
import { Roles } from '../models/Roles.js';
import { Storage } from '../utils/Storage.js';

export class SummaryView extends BaseView {

  render() {
    const game = this.app.game;

    if (game.phase === 'ended' && game.winner) {
      this._renderWinScreen();
    } else {
      this._renderGameLog();
    }
  }

  _renderWinScreen() {
    const game = this.app.game;
    const counts = game.getTeamCounts();

    const winnerData = {
      mafia: { icon: '🔴', title: 'تیم مافیا پیروز شد!', class: 'mafia' },
      citizen: { icon: '🔵', title: 'تیم شهروند پیروز شد!', class: 'citizen' },
      independent: { icon: '🟣', title: 'بازیکن مستقل پیروز شد!', class: 'independent' },
    };
    const w = winnerData[game.winner] || winnerData.citizen;

    // Save to history
    Storage.addToHistory({
      date: Date.now(),
      winner: game.winner,
      rounds: game.round,
      playerCount: game.players.length,
    });
    Storage.deleteSave();

    this.container.innerHTML = `
      <div class="view">
        <div class="win-screen">
          <div class="win-screen__icon">${w.icon}</div>
          <h1 class="win-screen__title win-screen__title--${w.class}">${w.title}</h1>
          <p class="win-screen__subtitle">بعد از ${game.round} دور</p>
        </div>

        <!-- All players final state -->
        <div class="section mt-lg">
          <h2 class="section__title">👥 وضعیت نهایی بازیکنان</h2>
          <div class="player-list">
            ${game.players.map(p => {
              const role = Roles.get(p.roleId);
              return `
                <div class="player-item ${!p.isAlive ? 'player-item--dead' : ''}">
                  <span class="dot ${p.isAlive ? 'dot--alive' : 'dot--dead'}"></span>
                  <div class="player-item__name">${p.name}</div>
                  <span class="role-badge role-badge--${role?.team || 'citizen'}">
                    ${role?.icon || ''} ${role?.getLocalizedName() || ''}
                  </span>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Game History Timeline -->
        ${this._renderTimeline()}

        <div class="mt-lg">
          <button class="btn btn--primary btn--lg btn--block" id="btn-new-game-summary">
            🎮 بازی جدید
          </button>
          <button class="btn btn--ghost btn--block mt-sm" id="btn-home-summary">
            ← بازگشت به خانه
          </button>
        </div>
      </div>
    `;

    this.container.querySelector('#btn-new-game-summary')?.addEventListener('click', () => {
      game.reset();
      this.app.navigate('setup');
    });

    this.container.querySelector('#btn-home-summary')?.addEventListener('click', () => {
      game.reset();
      this.app.navigate('home');
    });
  }

  _renderGameLog() {
    const game = this.app.game;

    this.container.innerHTML = `
      <div class="view">
        <h2 class="section__title">📜 گزارش بازی</h2>
        
        <!-- Stats -->
        <div class="stats-row">
          <div class="stat-card">
            <div class="stat-card__value">${game.round}</div>
            <div class="stat-card__label">دور</div>
          </div>
          <div class="stat-card">
            <div class="stat-card__value">${game.getAlivePlayers().length}</div>
            <div class="stat-card__label">زنده</div>
          </div>
          <div class="stat-card">
            <div class="stat-card__value">${game.getDeadPlayers().length}</div>
            <div class="stat-card__label">مرده</div>
          </div>
        </div>

        ${this._renderTimeline()}

        <button class="btn btn--ghost btn--block mt-lg" id="btn-back-game">
          ← بازگشت به بازی
        </button>
      </div>
    `;

    this.container.querySelector('#btn-back-game')?.addEventListener('click', () => {
      if (game.phase === 'night') this.app.navigate('night');
      else if (game.phase === 'day') this.app.navigate('day');
      else this.app.navigate('home');
    });
  }

  _renderTimeline() {
    const game = this.app.game;
    if (game.history.length === 0) {
      return `
        <div class="empty-state">
          <div class="empty-state__icon">📭</div>
          <div class="empty-state__text">هنوز رویدادی ثبت نشده</div>
        </div>
      `;
    }

    return `
      <div class="section mt-lg">
        <h2 class="section__title">📜 خط زمانی بازی</h2>
        <div class="timeline">
          ${game.history.map(h => {
            const itemClass = h.type.includes('death') || h.type === 'death'
              ? 'timeline-item--death'
              : h.phase === 'night'
                ? 'timeline-item--night'
                : 'timeline-item--day';

            return `
              <div class="timeline-item ${itemClass}">
                <div class="timeline-item__title">دور ${h.round}</div>
                <div class="timeline-item__desc">${h.text}</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }
}
