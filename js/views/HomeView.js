/**
 * HomeView.js — Welcome / Home screen
 */
import { BaseView } from './BaseView.js';
import { Storage } from '../utils/Storage.js';
import { Settings, Language } from '../utils/Settings.js';
import { t, translations as tr, toEnDigits } from '../utils/i18n.js';

export class HomeView extends BaseView {

  render() {
    const hasSave = Storage.hasSave();

    this.container.innerHTML = `
      <div class="view hero">
        <div class="hero__icon">🎭</div>
        <h1 class="hero__title">${t(tr.home.title)}</h1>
        <p class="hero__subtitle">
          ${t(tr.home.subtitle)}
          <br>${t(tr.home.subtitle2)}
        </p>
        <div class="hero__actions">
          <button class="btn btn--primary btn--lg btn--block" id="btn-new-game">
            🎮 ${t(tr.home.newGame)}
          </button>
          ${hasSave ? `
            <button class="btn btn--secondary btn--block" id="btn-continue">
              ▶️ ${t(tr.home.continueGame)}
            </button>
          ` : ''}
          <button class="btn btn--ghost btn--block" id="btn-history">
            📊 ${t(tr.home.history)}
          </button>
          <button class="btn btn--ghost btn--block" id="btn-settings">
            ⚙️ ${t(tr.home.settings)}
          </button>
        </div>
      </div>
    `;

    // Event listeners
    this.container.querySelector('#btn-new-game')?.addEventListener('click', () => {
      // Start a fresh game but preserve the persisted roster (player names/order)
      if (hasSave) {
        this.confirm(
          t(tr.home.newGameConfirm),
          t(tr.home.newGameMessage),
          () => {
            Storage.deleteSave();
            this.app.game.reset();
            const roster = Storage.loadRoster();
            if (roster && roster.length) {
              roster.forEach(r => this.app.game.addPlayer(r.name));
            }
            this.app.navigate('setup');
          }
        );
      } else {
        this.app.game.reset();
        const roster = Storage.loadRoster();
        if (roster && roster.length) {
          roster.forEach(r => this.app.game.addPlayer(r.name));
        }
        this.app.navigate('setup');
      }
    });

    this.container.querySelector('#btn-continue')?.addEventListener('click', () => {
      const saved = Storage.loadGame();
      if (saved) {
        this.app.game.loadFromJSON(saved);
        // Navigate to the appropriate phase
        const phase = this.app.game.phase;
        if (phase === 'night') this.app.navigate('night');
        else if (phase === 'day') this.app.navigate('day');
        else if (phase === 'ended') this.app.navigate('summary');
        else this.app.navigate('setup');
      }
    });

    this.container.querySelector('#btn-history')?.addEventListener('click', () => {
      this._showHistory();
    });

    this.container.querySelector('#btn-settings')?.addEventListener('click', () => {
      this._showSettings();
    });
  }

  _showHistory() {
    const history = Storage.getHistory();

    if (history.length === 0) {
      this.container.innerHTML = `
        <div class="view">
          <button class="btn btn--ghost mb-lg" id="btn-back-home">→ ${t(tr.common.back)}</button>
          <div class="empty-state">
            <div class="empty-state__icon">📭</div>
            <div class="empty-state__text">${t(tr.home.noHistory)}</div>
          </div>
        </div>
      `;
    } else {
      this.container.innerHTML = `
        <div class="view">
          <button class="btn btn--ghost mb-lg" id="btn-back-home">→ ${t(tr.common.back)}</button>
          <div class="section">
            <h2 class="section__title">📊 ${t(tr.home.historyTitle)}</h2>
            <div class="player-list">
              ${history.map(g => `
                <div class="card mb-sm">
                  <div class="flex justify-between items-center mb-sm">
                    <span class="font-bold">${g.winner === 'mafia' ? `🔴 ${t(tr.home.mafiaWon)}` : g.winner === 'citizen' ? `🔵 ${t(tr.home.citizenWon)}` : `🟣 ${t(tr.home.independentWon)}`}</span>
                    <span class="text-muted text-sm">${new Date(g.date).toLocaleDateString('en-US')}</span>
                  </div>
                  <div class="text-secondary" style="font-size: var(--text-sm)">
                    ${toEnDigits(g.playerCount)} ${t(tr.home.players)} · ${toEnDigits(g.rounds)} ${t(tr.home.rounds)}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `;
    }

    this.container.querySelector('#btn-back-home')?.addEventListener('click', () => {
      this.render();
    });
  }

  _showSettings() {
    const currentLang = Settings.getLanguage();

    this.container.innerHTML = `
      <div class="view">
        <button class="btn btn--ghost mb-lg" id="btn-back-home">→ ${t(tr.common.back)}</button>
        <div class="section">
          <h2 class="section__title">⚙️ ${t(tr.settings.title)}</h2>
          
          <div class="card mb-md">
            <h3 class="mb-sm" style="font-size: var(--text-md); font-weight: 600;">🌐 ${t(tr.settings.languageTitle)}</h3>
            <p class="text-muted mb-md" style="font-size: var(--text-sm);">
              ${t(tr.settings.languageDescription)}
            </p>
            
            <div class="radio-group">
              <label class="radio-option ${currentLang === Language.FARSI ? 'radio-option--active' : ''}">
                <input type="radio" name="language" value="${Language.FARSI}" ${currentLang === Language.FARSI ? 'checked' : ''}>
                <span class="radio-option__label">
                  <span class="radio-option__title">🇮🇷 ${t(tr.settings.farsi)}</span>
                  <span class="radio-option__desc">${t(tr.settings.farsiDesc)}</span>
                </span>
              </label>
              
              <label class="radio-option ${currentLang === Language.ENGLISH ? 'radio-option--active' : ''}">
                <input type="radio" name="language" value="${Language.ENGLISH}" ${currentLang === Language.ENGLISH ? 'checked' : ''}>
                <span class="radio-option__label">
                  <span class="radio-option__title">🇬🇧 ${t(tr.settings.english)}</span>
                  <span class="radio-option__desc">${t(tr.settings.englishDesc)}</span>
                </span>
              </label>
              
              <!-- BOTH option removed; default is English -->
            </div>
          </div>

          <button class="btn btn--primary btn--block" id="btn-save-settings">✓ ${t(tr.settings.save)}</button>
        </div>
      </div>
    `;

    // Event listeners
    this.container.querySelector('#btn-back-home')?.addEventListener('click', () => {
      this.render();
    });

    // Handle radio button visual feedback
    this.container.querySelectorAll('input[name="language"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        this.container.querySelectorAll('.radio-option').forEach(opt => {
          opt.classList.remove('radio-option--active');
        });
        e.target.closest('.radio-option').classList.add('radio-option--active');
      });
    });

    this.container.querySelector('#btn-save-settings')?.addEventListener('click', () => {
      const selected = this.container.querySelector('input[name="language"]:checked')?.value;
      if (selected) {
        Settings.setLanguage(selected);
        if (this.app && typeof this.app.onLanguageChange === 'function') this.app.onLanguageChange();
        this.app.showToast(t(tr.settings.saved), 'success');
        this.render();
      }
    });
  }
}
