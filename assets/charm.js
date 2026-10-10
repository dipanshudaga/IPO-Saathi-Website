// A nimbu-mirchi (lemon and green chillies on a thread, hung to keep the evil eye away) that hangs from the top edge
// of its tile on the home page. It is a small physics toy, the same one as on the app's Profile screen: two masses
// on springs, a light breeze, and a finger (or mouse) that can pick it up and swing it.
(function () {
  var host = document.querySelector('[data-charm]');
  if (!host) return;
  var art = host.querySelector('.art'), thread = host.querySelector('.thread');
  var RIGHT = 96, DROP = 52; // distance of the string from the tile's right edge (set by layout()), and its length
  var C = { stringLen: DROP, linkLen: 91, m1: 1, m2: 1.4, gravity: 3400, kString: 700, cString: 7, kLink: 2200, cLink: 16, airDrag: 1.6, kGrab: 1400, cGrab: 70, reach1: DROP + 120, reach2: DROP + 235 };
  var REST_Y1 = C.stringLen + ((C.m1 + C.m2) * C.gravity) / C.kString;
  var REST_LINK = C.linkLen + (C.m2 * C.gravity) / C.kLink;
  var REST_Y2 = REST_Y1 + REST_LINK;
  var SUBSTEP = 1 / 240, GRAB_RADIUS = 62, TIE_X = 80;

  function rest() { return { x1: 0, y1: REST_Y1, x2: 0, y2: REST_Y2, vx1: 0, vy1: 0, vx2: 0, vy2: 0 }; }

  function step(s, dt, grab, tx, ty, limL, limR, wind) {
    var steps = Math.max(1, Math.ceil(dt / SUBSTEP)), h = dt / steps;
    for (var i = 0; i < steps; i++) {
      var l1 = Math.hypot(s.x1, s.y1) || 1e-6, n1x = s.x1 / l1, n1y = s.y1 / l1;
      var along1 = s.vx1 * n1x + s.vy1 * n1y;
      var fs = -(C.kString * (l1 - C.stringLen) + C.cString * along1);
      var fx1 = fs * n1x, fy1 = fs * n1y;
      var dx = s.x2 - s.x1, dy = s.y2 - s.y1, l2 = Math.hypot(dx, dy) || 1e-6, nx = dx / l2, ny = dy / l2;
      var along2 = (s.vx2 - s.vx1) * nx + (s.vy2 - s.vy1) * ny;
      var fl = C.kLink * (l2 - C.linkLen) + C.cLink * along2;
      fx1 += fl * nx; fy1 += fl * ny;
      var fx2 = -fl * nx, fy2 = -fl * ny;
      fx1 += C.m1 * wind; fx2 += C.m2 * wind;
      fy1 += C.m1 * C.gravity - C.airDrag * C.m1 * s.vy1;
      fy2 += C.m2 * C.gravity - C.airDrag * C.m2 * s.vy2;
      fx1 -= C.airDrag * C.m1 * s.vx1; fx2 -= C.airDrag * C.m2 * s.vx2;
      if (grab === 1) { fx1 += C.kGrab * (tx - s.x1) - C.cGrab * s.vx1; fy1 += C.kGrab * (ty - s.y1) - C.cGrab * s.vy1; }
      else if (grab === 2) { fx2 += C.kGrab * (tx - s.x2) - C.cGrab * s.vx2; fy2 += C.kGrab * (ty - s.y2) - C.cGrab * s.vy2; }
      s.vx1 += (fx1 / C.m1) * h; s.vy1 += (fy1 / C.m1) * h; s.vx2 += (fx2 / C.m2) * h; s.vy2 += (fy2 / C.m2) * h;
      s.x1 += s.vx1 * h; s.y1 += s.vy1 * h; s.x2 += s.vx2 * h; s.y2 += s.vy2 * h;
      var r1 = Math.hypot(s.x1, s.y1); if (r1 > C.reach1) { var k1 = C.reach1 / r1; s.x1 *= k1; s.y1 *= k1; }
      var r2 = Math.hypot(s.x2, s.y2); if (r2 > C.reach2) { var k2 = C.reach2 / r2; s.x2 *= k2; s.y2 *= k2; }
      if (s.x1 < -limL) { s.x1 = -limL; s.vx1 = 0; } else if (s.x1 > limR) { s.x1 = limR; s.vx1 = 0; }
      if (s.x2 < -limL) { s.x2 = -limL; s.vx2 = 0; } else if (s.x2 > limR) { s.x2 = limR; s.vx2 = 0; }
      if (s.y1 < 0) { s.y1 = 0; s.vy1 = Math.max(0, s.vy1); }
    }
  }
  function atRest(s) {
    return Math.abs(s.x1) < 0.15 && Math.abs(s.x2) < 0.15 && Math.abs(s.y1 - REST_Y1) < 0.3 && Math.abs(s.y2 - REST_Y2) < 0.3 && Math.hypot(s.vx1, s.vy1) < 3 && Math.hypot(s.vx2, s.vy2) < 3;
  }
  function ambientWind(t) { return 260 * Math.sin((2 * Math.PI * t) / 4.3) * (0.65 + 0.35 * Math.sin((2 * Math.PI * t) / 13)); }
  function pick(s, px, py) {
    var dx = s.x2 - s.x1, dy = s.y2 - s.y1, len2 = dx * dx + dy * dy || 1;
    var t = Math.max(0, Math.min(1, ((px - s.x1) * dx + (py - s.y1) * dy) / len2));
    if (Math.hypot(px - (s.x1 + dx * t), py - (s.y1 + dy * t)) > GRAB_RADIUS) return 0;
    return t < 0.45 ? 1 : 2;
  }

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var s = rest(), grab = 0, tx = 0, ty = 0, awake = true, still = 0, nextGust = 0, last = 0, t0 = 0, visible = true;
  s.vx1 += 120; s.vx2 += 260; // a small nudge on arrival: it says "touch me" without a label
  if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }).observe(host);

  // The string hangs a little in from the tile's right edge; the headline wraps around the space it swings in.
  // Wide screens: the string hangs near the tile's right edge and the headline wraps around it. Phones (the stacked
  // layout): the tile is centred, so the string hangs from the middle.
  var narrow = window.matchMedia('(max-width: 899px)');
  function layout() { RIGHT = host.clientWidth > 520 ? 120 : 96; host.style.setProperty('--charm-w', RIGHT + 84 + 'px'); }
  layout(); window.addEventListener('resize', layout);
  function pivot() { return narrow.matches ? host.clientWidth / 2 : host.clientWidth - RIGHT; }
  function local(e) { var r = host.getBoundingClientRect(); return { x: e.clientX - r.left - host.clientLeft - pivot(), y: e.clientY - r.top - host.clientTop }; }
  host.addEventListener('pointerdown', function (e) {
    var p = local(e), n = pick(s, p.x, p.y);
    if (!n) return;
    grab = n; tx = p.x; ty = p.y; awake = true; host.setPointerCapture(e.pointerId); host.style.cursor = 'grabbing'; e.preventDefault();
  });
  host.addEventListener('pointermove', function (e) {
    // A mouse button let go outside the window sends no pointerup: no button down means the charm is no longer held.
    if (grab && e.pointerType === 'mouse' && e.buttons === 0) release();
    var p = local(e);
    if (grab) { tx = p.x; ty = p.y; } else host.style.cursor = pick(s, p.x, p.y) ? 'grab' : '';
  });
  function release() { grab = 0; host.style.cursor = ''; }
  host.addEventListener('pointerup', release);
  host.addEventListener('pointercancel', release);
  host.addEventListener('lostpointercapture', release);
  window.addEventListener('blur', release);
  document.addEventListener('visibilitychange', release);

  function frame(now) {
    if (!t0) { t0 = now; last = now; }
    var dt = Math.min((now - last) / 1000, 1 / 30), seconds = (now - t0) / 1000; last = now;
    var ambient = !reduce, idle = ambient && grab === 0;
    if (visible && (grab !== 0 || awake || ambient)) {
      // free swing: only the edges of the window stop it (the tile does not clip it)
      var px = pivot(), r = host.getBoundingClientRect(), x0 = r.left + host.clientLeft + px, vw = document.documentElement.clientWidth;
      step(s, dt, grab, tx, ty, Math.max(30, x0 - 88), Math.max(30, vw - x0 - 88), idle ? ambientWind(seconds) : 0);
      if (idle && seconds > nextGust) {
        if (nextGust > 0) { var dir = Math.random() < 0.5 ? -1 : 1; s.vx2 += dir * 170; s.vx1 += dir * 70; }
        nextGust = seconds + 6 + Math.random() * 4;
      }
      if (!ambient && grab === 0 && atRest(s)) { if (++still > 20) { s = rest(); awake = false; } } else still = 0;
      var stretch = Math.min(1.5, Math.max(0.75, Math.hypot(s.x2 - s.x1, s.y2 - s.y1) / REST_LINK));
      var angle = -Math.atan2(s.x2 - s.x1, s.y2 - s.y1);
      art.style.left = px - TIE_X + 'px';
      art.style.transform = 'translate(' + s.x1 + 'px,' + s.y1 + 'px) rotate(' + angle + 'rad) scale(' + 1 / Math.sqrt(stretch) + ',' + stretch + ')';
      thread.style.left = px - 1 + 'px';
      thread.style.height = Math.hypot(s.x1, s.y1) + 'px';
      thread.style.transform = 'rotate(' + Math.atan2(-s.x1, s.y1) + 'rad)';
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
