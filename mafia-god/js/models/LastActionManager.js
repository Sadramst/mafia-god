export const CARD = Object.freeze({
  FINAL_SHOOT:  1,
  SKIP_NIGHT:   2,
  REVEAL:       3,
  BEAUTIFUL_MIND: 4,
  FACE_OFF:     5,
});

export class LastActionManager {
  constructor(cards = null) {
    if (cards && Array.isArray(cards)) {
      this.cards = cards.map(c => ({ id: c.id, name: c.name, used: !!c.used }));
    } else {
      this.cards = [
        { id: CARD.FINAL_SHOOT,    name: 'final_shoot',    used: false },
        { id: CARD.SKIP_NIGHT,     name: 'skip_night',     used: false },
        { id: CARD.REVEAL,         name: 'reveal',         used: false },
        { id: CARD.BEAUTIFUL_MIND, name: 'beautiful_mind',  used: false },
        { id: CARD.FACE_OFF,       name: 'face_off',       used: false },
      ];
    }
  }

  getRemainingCards() {
    return this.cards.filter(c => !c.used);
  }

  remainingCount() {
    return this.getRemainingCards().length;
  }

  hasRemaining() {
    return this.remainingCount() > 0;
  }

  /** Draw a random remaining card. Returns { id, name } or null. */
  drawRandom() {
    const remaining = this.getRemainingCards();
    if (remaining.length === 0) return null;
    const card = remaining[Math.floor(Math.random() * remaining.length)];
    const orig = this.cards.find(c => c.id === card.id);
    if (orig) orig.used = true;
    return { ...card };
  }

  /** Whether the given card requires a follow-up target selection. */
  static needsTarget(cardId) {
    return cardId === CARD.FINAL_SHOOT || cardId === CARD.BEAUTIFUL_MIND || cardId === CARD.FACE_OFF;
  }

  toJSON() {
    return { cards: this.cards.map(c => ({ id: c.id, name: c.name, used: !!c.used })) };
  }

  static fromJSON(data) {
    if (!data) return new LastActionManager();
    return new LastActionManager(data.cards || null);
  }
}
