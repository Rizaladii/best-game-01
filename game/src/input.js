// input.js — keyboard and mouse state for LUMEN.
// The game reads this each frame; it never reads events directly, so the
// shot-mode scenes can feed it scripted input instead.
export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.mouseX = 0;
    this.mouseY = 0;
    this.mouseDown = false;
    // Edge-triggered presses, consumed once per frame by the game loop.
    this._pressed = new Set();
    this._clicked = false;
    this._wheel = 0;
    this._onKeyDown = (e) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault();
      if (!e.repeat) {
        this.keys.add(k);
        this._pressed.add(k);
      }
    };
    this._onKeyUp = (e) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      this.keys.delete(k);
    };
    this._onMouseMove = (e) => {
      const r = this.canvas.getBoundingClientRect();
      this.mouseX = (e.clientX - r.left) * (this.canvas.width / r.width);
      this.mouseY = (e.clientY - r.top) * (this.canvas.height / r.height);
    };
    this._onMouseDown = (e) => {
      if (e.button === 0) { this.mouseDown = true; this._clicked = true; this._onMouseMove(e); }
    };
    this._onMouseUp = (e) => { if (e.button === 0) this.mouseDown = false; };
    this._onBlur = () => { this.keys.clear(); this.mouseDown = false; };
    this._onWheel = (e) => { this._wheel += Math.sign(e.deltaY); };
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('blur', this._onBlur);
    canvas.addEventListener('mousemove', this._onMouseMove);
    canvas.addEventListener('mousedown', this._onMouseDown);
    window.addEventListener('mouseup', this._onMouseUp);
    canvas.addEventListener('wheel', this._onWheel, { passive: true });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  down(...names) { return names.some((n) => this.keys.has(n)); }
  // True once, on the frame the key went down.
  pressed(...names) { return names.some((n) => this._pressed.has(n)); }
  clicked() { return this._clicked; }
  wheel() { const w = this._wheel; this._wheel = 0; return w; }

  // Movement vector from WASD / arrows, normalized.
  moveVector() {
    let x = 0, y = 0;
    if (this.down('a', 'ArrowLeft')) x -= 1;
    if (this.down('d', 'ArrowRight')) x += 1;
    if (this.down('w', 'ArrowUp')) y -= 1;
    if (this.down('s', 'ArrowDown')) y += 1;
    if (x !== 0 && y !== 0) { x *= Math.SQRT1_2; y *= Math.SQRT1_2; }
    return { x, y };
  }

  endFrame() { this._pressed.clear(); this._clicked = false; }
}
