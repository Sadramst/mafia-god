export class LastActionManager {
  constructor(cards = null) {
    // cards: array of { id, name, used }
    if (cards && Array.isArray(cards)) {
      this.cards = cards.map(c => ({ id: c.id, name: c.name, used: !!c.used }));
    } else {
      this.cards = [
        { id: 1, name: 'final_shoot', used: false },
        { id: 2, name: 'skip_night', used: false },
        { id: 3, name: 'reveal_and_permanent', used: false },
        { id: 4, name: 'guess_independent', used: false },
        { id: 5, name: 'face_off', used: false },
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

  // Draw a random remaining card. chosenNumber is only used for UI mapping
  drawRandom(chosenNumber = null) {
    const remaining = this.getRemainingCards();
    if (remaining.length === 0) return null;
    const idx = Math.floor(Math.random() * remaining.length);
    const card = remaining[idx];
    // mark used in underlying cards array
    const orig = this.cards.find(c => c.id === card.id);
    if (orig) orig.used = true;
    return { ...card };
  }

  toJSON() {
    return { cards: this.cards.map(c => ({ id: c.id, name: c.name, used: !!c.used })) };
  }

  static fromJSON(data) {
    if (!data) return new LastActionManager();
    return new LastActionManager(data.cards || null);
  }
}
