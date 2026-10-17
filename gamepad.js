const BUTTONS = new Map([
  [0, 'activate'], [1, 'back'], [2, 'undo'],
  [4, 'previous-section'], [5, 'next-section'], [9, 'play'],
  [12, 'up'], [13, 'down'], [14, 'left'], [15, 'right']
]);
const DIRECTIONS = new Set(['up', 'down', 'left', 'right']);

export class GamepadReader {
  constructor() { this.held = new Map(); this.index = null; }
  read(pad, now) {
    if (!pad?.connected || pad.mapping !== 'standard') {
      this.held.clear(); this.index = null;
      return [];
    }
    if (this.index !== pad.index) this.held.clear();
    this.index = pad.index;
    const pressed = new Set();
    for (const [number, action] of BUTTONS) if (pad.buttons[number]?.pressed) pressed.add(action);
    const [x = 0, y = 0] = pad.axes;
    if (x < -0.6) pressed.add('left');
    if (x > 0.6) pressed.add('right');
    if (y < -0.6) pressed.add('up');
    if (y > 0.6) pressed.add('down');
    const actions = [];
    for (const action of pressed) {
      const held = this.held.get(action);
      if (!held) {
        actions.push(action);
        this.held.set(action, { repeatAt: now + 380 });
      } else if (DIRECTIONS.has(action) && now >= held.repeatAt) {
        actions.push(action);
        held.repeatAt = now + 130;
      }
    }
    for (const action of this.held.keys()) if (!pressed.has(action)) this.held.delete(action);
    return actions;
  }
}
