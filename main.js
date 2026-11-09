const RAW_CITIES = [
  ["HONOLULU", "Pacific/Honolulu"],
  ["ANCHORAGE", "America/Anchorage"],
  ["LOS ANGELES", "America/Los_Angeles"],
  ["VANCOUVER", "America/Vancouver"],
  ["DENVER", "America/Denver"],
  ["CHICAGO", "America/Chicago"],
  ["MEXICO CITY", "America/Mexico_City"],
  ["NEW YORK", "America/New_York"],
  ["TORONTO", "America/Toronto"],
  ["LIMA", "America/Lima"],
  ["BOGOTA", "America/Bogota"],
  ["SANTIAGO", "America/Santiago"],
  ["SAO PAULO", "America/Sao_Paulo"],
  ["BUENOS AIRES", "America/Argentina/Buenos_Aires"],
  ["ST JOHNS", "America/St_Johns"],
  ["REYKJAVIK", "Atlantic/Reykjavik"],
  ["LONDON", "Europe/London"],
  ["LISBON", "Europe/Lisbon"],
  ["LAGOS", "Africa/Lagos"],
  ["PARIS", "Europe/Paris"],
  ["MADRID", "Europe/Madrid"],
  ["BERLIN", "Europe/Berlin"],
  ["ROME", "Europe/Rome"],
  ["CAIRO", "Africa/Cairo"],
  ["JOHANNESBURG", "Africa/Johannesburg"],
  ["KYIV", "Europe/Kyiv"],
  ["ATHENS", "Europe/Athens"],
  ["MOSCOW", "Europe/Moscow"],
  ["ISTANBUL", "Europe/Istanbul"],
  ["RIYADH", "Asia/Riyadh"],
  ["NAIROBI", "Africa/Nairobi"],
  ["TEHRAN", "Asia/Tehran"],
  ["DUBAI", "Asia/Dubai"],
  ["SAMARA", "Europe/Samara"],
  ["KARACHI", "Asia/Karachi"],
  ["NEW DELHI", "Asia/Kolkata"],
  ["YEKATERINBURG", "Asia/Yekaterinburg"],
  ["KATHMANDU", "Asia/Kathmandu"],
  ["DHAKA", "Asia/Dhaka"],
  ["NOVOSIBIRSK", "Asia/Novosibirsk"],
  ["BANGKOK", "Asia/Bangkok"],
  ["JAKARTA", "Asia/Jakarta"],
  ["SINGAPORE", "Asia/Singapore"],
  ["HONG KONG", "Asia/Hong_Kong"],
  ["SHANGHAI", "Asia/Shanghai"],
  ["TAIPEI", "Asia/Taipei"],
  ["TOKYO", "Asia/Tokyo"],
  ["SEOUL", "Asia/Seoul"],
  ["ADELAIDE", "Australia/Adelaide"],
  ["VLADIVOSTOK", "Asia/Vladivostok"],
  ["SYDNEY", "Australia/Sydney"],
  ["MELBOURNE", "Australia/Melbourne"],
  ["MAGADAN", "Asia/Magadan"],
  ["AUCKLAND", "Pacific/Auckland"],
  ["FIJI", "Pacific/Fiji"],
];

const HAND_KEYS = ["zone", "hour", "minute", "second"];
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const clock = document.getElementById("clock");
const hub = document.getElementById("hub");
const handsEl = document.getElementById("hands");
const wheel = document.getElementById("wheel");
const citiesEl = document.getElementById("cities");
const marker = document.getElementById("marker");
const handEls = {
  zone: document.getElementById("handZone"),
  hour: document.getElementById("handHour"),
  minute: document.getElementById("handMinute"),
  second: document.getElementById("handSecond"),
};

const startedAt = performance.now();
let introDone = reduce;
const track = {
  ready: false,
  prev: {},
  acc: {},
};

let cities = [];
let activeIndex = 0;
let activeTz = "UTC";
let currentOffset = 0;
let offsetCheckedAt = 0;

let openTarget = 0;
let openAnim = { from: 0, to: 0, start: startedAt, dur: 1 };

let corr = null;
let shown = { zone: 0, hour: 0, minute: 0, second: 0 };

let scrollPos = 0;
let scrollVel = 0;
let lastInput = 0;
let lastLoopIndex = null;
let audioCtx = null;
let clickBuffer = null;
let pointer = null;
let suppressClick = false;

let metrics = computeMetrics();

function computeMetrics() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const fontSize = Math.max(38, Math.min(h * 0.066, w * 0.042, 86));
  const fallbackClock = Math.min(h * 0.74, w * 0.62, 920);
  const clockSize = clock.getBoundingClientRect().width || fallbackClock;
  const shiftPx = Math.min(120, Math.max(72, w * 0.045));
  const boxRight = (w - clockSize) / 2 - shiftPx + clockSize;
  return {
    w,
    h,
    fontSize,
    spacing: fontSize * 1.18,
    shiftPx,
    anchorX: boxRight + fontSize * 0.28,
    curve: fontSize * 0.042,
    rot: 2.05,
  };
}

function timezoneOffsetMs(timeZone, date) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = Object.fromEntries(dtf.formatToParts(date).map((part) => [part.type, part.value]));
  let hour = Number(parts.hour);
  if (hour === 24) hour = 0;
  const asUTC = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    hour,
    Number(parts.minute),
    Number(parts.second)
  );
  return asUTC - (date.getTime() - date.getMilliseconds());
}

function prettyZone(timeZone) {
  const name = timeZone.split("/").pop().replace(/_/g, " ");
  return name.toUpperCase();
}

const FACE = {
  "Pacific/Honolulu": ["HNL", "HAWAII T.", "HAWAII", "PACIFIC"],
  "America/Anchorage": ["ANC", "ALASKA T.", "ALASKA", "PACIFIC"],
  "America/Los_Angeles": ["LA T.", "PACIFIC T.", "WEST A.", "PACIFIC"],
  "America/Vancouver": ["YVR", "PACIFIC T.", "CANADA", "PACIFIC"],
  "America/Denver": ["DEN", "MOUNTAIN", "ROCKIES", "AMERICAS"],
  "America/Chicago": ["CHI", "CENT. TIME", "MIDWEST", "AMERICAS"],
  "America/Mexico_City": ["MEX", "CENT. TIME", "MEXICO", "AMERICAS"],
  "America/New_York": ["NY T.", "EAST TIME", "NORTH A.", "AMERICAS"],
  "America/Toronto": ["YTO", "EAST TIME", "CANADA", "AMERICAS"],
  "America/Lima": ["LIM", "PERU TIME", "PERU", "SOUTH A."],
  "America/Bogota": ["BOG", "COLOMBIA", "COLOMB.", "SOUTH A."],
  "America/Santiago": ["SCL", "CHILE T.", "CHILE", "SOUTH A."],
  "America/Sao_Paulo": ["SAO", "BRASILIA", "BRAZIL", "SOUTH A."],
  "America/Argentina/Buenos_Aires": ["BUE", "ARGENTINA", "ARGENT.", "SOUTH A."],
  "America/St_Johns": ["YYT", "NEWFOUND.", "CANADA", "ATLANTIC"],
  "Atlantic/Reykjavik": ["REK", "GMT TIME", "ICELAND", "ATLANTIC"],
  "Europe/London": ["LON", "GMT TIME", "BRITAIN", "EUROPE"],
  "Europe/Lisbon": ["LIS", "WEST EUR.", "PORTUGAL", "EUROPE"],
  "Africa/Lagos": ["LOS", "WEST AFR.", "NIGERIA", "AFRICA"],
  "Europe/Paris": ["PAR", "CENT. EUR.", "FRANCE", "EUROPE"],
  "Europe/Madrid": ["MAD", "CENT. EUR.", "SPAIN", "EUROPE"],
  "Europe/Berlin": ["BER", "CENT. EUR.", "GERMANY", "EUROPE"],
  "Europe/Rome": ["ROM", "CENT. EUR.", "ITALY", "EUROPE"],
  "Africa/Cairo": ["CAI", "EAST EUR.", "EGYPT", "AFRICA"],
  "Africa/Johannesburg": ["JNB", "SOUTH AFR.", "S. AFRICA", "AFRICA"],
  "Europe/Kyiv": ["IEV", "EAST EUR.", "UKRAINE", "EUROPE"],
  "Europe/Athens": ["ATH", "EAST EUR.", "GREECE", "EUROPE"],
  "Europe/Moscow": ["MOW", "MOSCOW T.", "RUSSIA", "EUROPE"],
  "Europe/Istanbul": ["IST", "TURKIYE T.", "TURKIYE", "EUROPE"],
  "Asia/Riyadh": ["RUH", "ARABIA T.", "ARABIA", "ASIA"],
  "Africa/Nairobi": ["NBO", "EAST AFR.", "KENYA", "AFRICA"],
  "Asia/Tehran": ["THR", "IRAN TIME", "IRAN", "ASIA"],
  "Asia/Dubai": ["DXB", "GULF TIME", "EMIRATES", "ASIA"],
  "Europe/Samara": ["KUF", "SAMARA T.", "RUSSIA", "EUROPE"],
  "Asia/Karachi": ["KHI", "PAKISTAN", "PAKISTAN", "ASIA"],
  "Asia/Kolkata": ["DEL", "INDIA T.", "INDIA", "ASIA"],
  "Asia/Yekaterinburg": ["SVX", "YEKAT. T.", "RUSSIA", "ASIA"],
  "Asia/Kathmandu": ["KTM", "NEPAL T.", "NEPAL", "ASIA"],
  "Asia/Dhaka": ["DAC", "BANGLAD.", "BANGLAD.", "ASIA"],
  "Asia/Novosibirsk": ["OVB", "NOVOSIB.", "SIBERIA", "ASIA"],
  "Asia/Bangkok": ["BKK", "INDOCHINA", "THAILAND", "ASIA"],
  "Asia/Jakarta": ["JKT", "WEST INDO.", "INDONES.", "ASIA"],
  "Asia/Singapore": ["SIN", "SINGAPORE", "SINGAP.", "ASIA"],
  "Asia/Hong_Kong": ["HKG", "HONG KONG", "HONG K.", "ASIA"],
  "Asia/Shanghai": ["SHA", "CHINA T.", "CHINA", "ASIA"],
  "Asia/Taipei": ["TPE", "TAIWAN T.", "TAIWAN", "ASIA"],
  "Asia/Tokyo": ["TYO", "JAPAN T.", "JAPAN", "ASIA"],
  "Asia/Seoul": ["SEL", "KOREA T.", "KOREA", "ASIA"],
  "Australia/Adelaide": ["ADL", "CENT. AUS.", "AUSTRAL.", "AUSTRAL"],
  "Asia/Vladivostok": ["VVO", "VLADIV. T.", "RUSSIA", "ASIA"],
  "Australia/Sydney": ["SYD", "EAST AUS.", "AUSTRAL.", "AUSTRAL"],
  "Australia/Melbourne": ["MEL", "EAST AUS.", "AUSTRAL.", "AUSTRAL"],
  "Asia/Magadan": ["GDX", "MAGADAN", "RUSSIA", "ASIA"],
  "Pacific/Auckland": ["AKL", "N. ZEALAND", "N.Z.", "PACIFIC"],
  "Pacific/Fiji": ["NAN", "FIJI T.", "FIJI", "PACIFIC"],
  "Europe/Minsk": ["MSQ", "MINSK T.", "BELARUS", "EUROPE"],
};

let faceReady = false;

function loopMod(value, size) {
  return ((value % size) + size) % size;
}

function loopDelta(index, pos) {
  const size = cities.length || 1;
  let delta = index - pos;
  delta -= size * Math.round(delta / size);
  return delta;
}

function formatOffset(hours, bracket) {
  const sign = hours < 0 ? "-" : "+";
  const abs = Math.abs(hours);
  let whole = Math.trunc(abs);
  let mins = Math.round((abs - whole) * 60);
  if (mins === 60) {
    whole += 1;
    mins = 0;
  }
  const body = mins ? `${whole}:${String(mins).padStart(2, "0")}` : String(whole);
  return bracket ? `[${sign}]${body}` : `${sign}${body}`;
}

function zoneAbbr(timeZone, date) {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "short",
    }).formatToParts(date);
    const found = parts.find((part) => part.type === "timeZoneName");
    const name = (found && found.value) || "UTC";
    return name.replace("GMT", "UTC").slice(0, 9);
  } catch {
    return "UTC";
  }
}

function faceMeta(city) {
  const known = FACE[city.tz];
  if (known) {
    return { place: known[0], desc: known[1], bottom: known[2], side: known[3] };
  }
  const words = city.name.split(" ");
  const place = words.length > 1 ? `${words[0].slice(0, 2)}${words[1][0]}.` : city.name.slice(0, 3);
  const area = city.tz.split("/")[0].toUpperCase().slice(0, 8);
  return {
    place,
    desc: `${words[0].slice(0, 6)} T.`,
    bottom: area,
    side: area,
  };
}

function writeFace(id, text) {
  const el = document.getElementById(id);
  if (!el || el.dataset.value === text) return;
  el.dataset.value = text;
  el.textContent = text;
  if (!faceReady) return;
  el.classList.remove("face-swap");
  void el.offsetWidth;
  el.classList.add("face-swap");
}

function applyFace(city) {
  if (!city) return;
  const hours = city.offset / 3600000;
  const base = Math.round(hours);
  const meta = faceMeta(city);
  const abbr = zoneAbbr(city.tz, new Date());
  writeFace("face-mark", meta.place);
  writeFace("face-sub", formatOffset(hours, false));
  writeFace("face-world", `> ${meta.side}`);
  writeFace("face-zone", meta.bottom);
  writeFace("face-offset", formatOffset(hours, false));
  writeFace("face-left-a", formatOffset(base + 1, false));
  writeFace("face-left-b", formatOffset(base - 1, true));
  writeFace("face-left-name", meta.side);
  writeFace("face-right-a", formatOffset(base - 2, true));
  writeFace("face-right-b", formatOffset(base - 4, true));
  writeFace("face-place", meta.place);
  writeFace("face-desc", meta.desc);
  writeFace("face-code", `> ${abbr}`);
  writeFace("face-bottom", meta.bottom);
  faceReady = true;
}

function norm(angle) {
  return ((angle % 360) + 360) % 360;
}

function wrapTo180(delta) {
  return ((delta + 180) % 360 + 360) % 360 - 180;
}

function easeOutQuint(t) {
  return 1 - Math.pow(1 - t, 5);
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function anglesFor(utcMs, offsetMs) {
  const wall = new Date(utcMs + offsetMs);
  const ms = wall.getUTCMilliseconds();
  const second = wall.getUTCSeconds() + ms / 1000;
  const minute = wall.getUTCMinutes() + second / 60;
  const hour = (wall.getUTCHours() % 12) + minute / 60;
  return {
    second: second * 6,
    minute: minute * 6,
    hour: hour * 30,
    zone: (offsetMs / 3600000) * 30,
  };
}

function buildRing() {
  const svg = document.getElementById("ring");
  const count = 112;
  const radius = 39.2;
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
    const dot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    dot.setAttribute("cx", (50 + radius * Math.cos(angle)).toFixed(3));
    dot.setAttribute("cy", (50 + radius * Math.sin(angle)).toFixed(3));
    dot.setAttribute("r", "0.33");
    dot.setAttribute("fill", "#ffffff");
    dot.style.animationDelay = `${(i / count) * 1.05}s`;
    svg.appendChild(dot);
  }
}

function safeOffset(timeZone, date) {
  try {
    return timezoneOffsetMs(timeZone, date);
  } catch {
    return null;
  }
}

function buildCities() {
  const now = new Date();
  const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const source = RAW_CITIES.map(([name, tz]) => ({ name, tz }));
  if (!source.some((city) => city.tz === localTz)) {
    source.push({ name: prettyZone(localTz), tz: localTz });
  }

  cities = source
    .map((city) => ({ ...city, offset: safeOffset(city.tz, now) }))
    .filter((city) => city.offset !== null)
    .sort((a, b) => a.offset - b.offset || a.name.localeCompare(b.name));

  citiesEl.replaceChildren();
  cities.forEach((city, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "city";
    button.role = "option";
    button.textContent = city.name;
    button.addEventListener("click", () => {
      if (suppressClick) return;
      selectCity(index);
    });
    citiesEl.appendChild(button);
    city.el = button;
  });

  activeIndex = Math.max(0, cities.findIndex((city) => city.tz === localTz));
  activeTz = cities[activeIndex].tz;
  currentOffset = cities[activeIndex].offset;
  scrollPos = activeIndex;
  offsetCheckedAt = performance.now();
  applyFace(cities[activeIndex]);
}

function sampleOpen(now) {
  const t = Math.min(1, (now - openAnim.start) / openAnim.dur);
  const eased = easeOutQuint(Math.max(0, t));
  return openAnim.from + (openAnim.to - openAnim.from) * eased;
}

function setOpen(target) {
  const now = performance.now();
  openAnim = {
    from: sampleOpen(now),
    to: target,
    start: now,
    dur: reduce ? 1 : 980,
  };
  openTarget = target;
  hub.setAttribute("aria-expanded", target === 1 ? "true" : "false");
  wheel.setAttribute("aria-hidden", target === 1 ? "false" : "true");
  document.body.classList.toggle("is-open", target === 1);
  if (target === 1) {
    scrollPos = activeIndex;
    scrollVel = 0;
    lastLoopIndex = activeIndex;
  }
}

function openList() {
  setOpen(1);
}

function closeList() {
  setOpen(0);
}

function beginCorrection(newOffset) {
  introDone = true;
  const live = anglesFor(Date.now(), newOffset);
  const from = {};
  HAND_KEYS.forEach((key) => {
    from[key] = wrapTo180(shown[key] - norm(live[key]));
  });
  const travel = Math.max(...HAND_KEYS.map((key) => Math.abs(from[key])));
  corr = {
    from,
    start: performance.now(),
    dur: reduce ? 1 : Math.min(1650, 760 + travel * 3.1),
  };
  currentOffset = newOffset;
  offsetCheckedAt = performance.now();
}

function correctionAt(now) {
  const zero = { zone: 0, hour: 0, minute: 0, second: 0 };
  if (!corr) return zero;
  const t = (now - corr.start) / corr.dur;
  if (t >= 1) {
    corr = null;
    return zero;
  }
  const inv = 1 - easeInOutCubic(Math.max(0, t));
  return {
    zone: corr.from.zone * inv,
    hour: corr.from.hour * inv,
    minute: corr.from.minute * inv,
    second: corr.from.second * inv,
  };
}

function selectCity(index) {
  if (openTarget !== 1) return;
  const city = cities[index];
  if (!city) return;
  activeIndex = index;
  activeTz = city.tz;
  city.offset = timezoneOffsetMs(city.tz, new Date());
  beginCorrection(city.offset);
  applyFace(city);
  closeList();
}

function introEase(now) {
  if (introDone) return 1;
  const t = (now - (startedAt + 420)) / 1650;
  if (t <= 0) return 0;
  if (t >= 1) {
    introDone = true;
    return 1;
  }
  return easeInOutCubic(t);
}

function tracked(key, angle) {
  const value = norm(angle);
  if (!track.ready) {
    track.prev[key] = value;
    track.acc[key] = value;
    return value;
  }
  let delta = value - track.prev[key];
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  track.prev[key] = value;
  track.acc[key] += delta;
  return track.acc[key];
}

function renderHands(now) {
  const live = anglesFor(Date.now(), currentOffset);
  const intro = introEase(now);
  const next = { zone: 0, hour: 0, minute: 0, second: 0 };

  if (intro < 1) {
    HAND_KEYS.forEach((key) => {
      next[key] = tracked(key, live[key]) * intro;
    });
    track.ready = true;
  } else {
    const extra = correctionAt(now);
    HAND_KEYS.forEach((key) => {
      next[key] = norm(live[key]) + extra[key];
    });
  }

  shown = next;
  HAND_KEYS.forEach((key) => {
    handEls[key].style.transform = `rotate(${next[key].toFixed(3)}deg)`;
  });

  const fade = Math.min(1, Math.max(0, (now - startedAt) / 380));
  handsEl.style.opacity = String(fade);
}

function refreshOffset(now) {
  if (corr || now - offsetCheckedAt < 30000) return;
  offsetCheckedAt = now;
  const next = timezoneOffsetMs(activeTz, new Date());
  if (Math.abs(next - currentOffset) > 1000) {
    const city = cities[activeIndex];
    if (city) {
      city.offset = next;
      applyFace(city);
    }
    beginCorrection(next);
  } else currentOffset = next;
}

function stepScroll(now, dt) {
  if (openTarget !== 1) return;
  const size = cities.length || 1;
  scrollVel *= Math.exp(-dt / 290);
  scrollPos += scrollVel * dt;

  if (!pointer && now - lastInput > 80) {
    const target = Math.round(scrollPos);
    scrollPos += (target - scrollPos) * (1 - Math.exp(-dt / 150));
    scrollVel *= Math.exp(-dt / 90);
  }

  scrollPos -= size * Math.floor(scrollPos / size);
  tickPassedCities();
}

function ensureClick() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return null;
  if (!audioCtx) {
    audioCtx = new Ctx();
    const rate = audioCtx.sampleRate;
    const len = Math.floor(rate * 0.02);
    clickBuffer = audioCtx.createBuffer(1, len, rate);
    const data = clickBuffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) {
      const env = Math.exp(-i / (rate * 0.0026));
      data[i] = (Math.random() * 2 - 1) * env;
    }
  }
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

function playCityClick() {
  const ctx = ensureClick();
  if (!ctx || !clickBuffer) return;
  const src = ctx.createBufferSource();
  src.buffer = clickBuffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = 1400;
  const gain = ctx.createGain();
  gain.gain.value = 0.28;
  src.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  src.start();
}

function tickPassedCities() {
  if (openTarget !== 1 || !cities.length) return;
  const index = loopMod(Math.round(scrollPos), cities.length);
  if (lastLoopIndex === null) {
    lastLoopIndex = index;
    return;
  }
  if (index === lastLoopIndex) return;
  let steps = index - lastLoopIndex;
  const size = cities.length;
  if (steps > size / 2) steps -= size;
  if (steps < -size / 2) steps += size;
  lastLoopIndex = index;
  const count = Math.min(Math.abs(steps), 8);
  for (let i = 0; i < count; i += 1) window.setTimeout(playCityClick, i * 22);
}

function renderCities(openE) {
  const { h, fontSize, spacing, anchorX, curve, rot } = metrics;
  const enter = (1 - openE) * Math.min(metrics.w * 0.46, 520);
  const reveal = Math.min(1, Math.max(0, (openE - 0.04) / 0.55));

  const focus = cities.length ? loopMod(Math.round(scrollPos), cities.length) : 0;
  cities.forEach((city, index) => {
    const delta = loopDelta(index, scrollPos);
    const y = h / 2 + delta * spacing;
    const x = anchorX + delta * delta * curve + enter;
    const angle = delta * rot;
    const onScreen = y > -140 && y < h + 140;
    const distance = Math.abs(delta);
    const edge = distance > 7.6 ? 0 : 1 - Math.pow(distance / 9.2, 2.35);
    const fromCenter = Math.abs(y - h / 2);
    const sharpPx = spacing * 1.35;
    const edgePx = Math.max(sharpPx + 40, h * 0.46);
    const falloff = fromCenter <= sharpPx ? 0 : Math.min(1, (fromCenter - sharpPx) / (edgePx - sharpPx));
    const blur = falloff * falloff * 13;
    city.el.style.fontSize = `${fontSize}px`;
    city.el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) translateY(-50%) rotate(${angle.toFixed(3)}deg)`;
    city.el.style.filter = blur < 0.35 ? "none" : `blur(${blur.toFixed(2)}px)`;
    city.el.style.opacity = String(edge * reveal);
    city.el.style.pointerEvents = openTarget === 1 && onScreen && reveal > 0.35 ? "auto" : "none";
    const selected = index === focus;
    city.el.setAttribute("aria-selected", selected ? "true" : "false");
  });

  marker.style.opacity = String(reveal);
  marker.style.transform = `translate3d(${(anchorX - Math.max(28, fontSize * 0.42) + enter).toFixed(2)}px, ${(h / 2).toFixed(2)}px, 0) translate(-50%, -50%)`;
}

function frame(now) {
  const dt = Math.min(34, now - (frame.last || now));
  frame.last = now;
  const openE = sampleOpen(now);

  refreshOffset(now);
  renderHands(now);
  stepScroll(now, dt);
  renderCities(openE);

  clock.style.transform = `translate3d(${(-metrics.shiftPx * openE).toFixed(2)}px, 0, 0)`;
  requestAnimationFrame(frame);
}

function onWheel(event) {
  if (openTarget !== 1) return;
  ensureClick();
  event.preventDefault();
  let delta = event.deltaY;
  if (event.deltaMode === 1) delta *= 18;
  if (event.deltaMode === 2) delta *= metrics.h;
  if (event.shiftKey && Math.abs(event.deltaX) < 1) delta = event.deltaY;
  if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) delta = event.deltaX;
  scrollVel += delta * 0.000034;
  scrollVel = Math.max(-0.028, Math.min(0.028, scrollVel));
  lastInput = performance.now();
}

function onPointerDown(event) {
  if (openTarget !== 1) return;
  if (event.button !== undefined && event.button !== 0) return;
  if (event.target.closest(".hub")) return;
  pointer = {
    id: event.pointerId,
    origin: event.clientY,
    y: event.clientY,
    t: performance.now(),
    moved: false,
  };
}

function onPointerMove(event) {
  if (!pointer || event.pointerId !== pointer.id) return;
  const total = event.clientY - pointer.origin;
  if (!pointer.moved) {
    if (Math.abs(total) < 6) return;
    pointer.moved = true;
    ensureClick();
    pointer.y = event.clientY;
    pointer.t = performance.now();
    document.body.classList.add("is-dragging");
    return;
  }
  const now = performance.now();
  const dy = event.clientY - pointer.y;
  const dt = Math.max(8, now - pointer.t);
  scrollPos -= dy / metrics.spacing;
  scrollVel = Math.max(-0.025, Math.min(0.025, -dy / metrics.spacing / dt));
  pointer.y = event.clientY;
  pointer.t = now;
  lastInput = now;
}

function endPointer(event) {
  if (!pointer || (event && event.pointerId !== undefined && event.pointerId !== pointer.id)) return;
  if (pointer.moved) {
    suppressClick = true;
    window.setTimeout(() => {
      suppressClick = false;
    }, 50);
  }
  pointer = null;
  document.body.classList.remove("is-dragging");
}

function onKey(event) {
  if (openTarget !== 1) return;
  if (event.key === "Escape") {
    closeList();
    return;
  }
  if (event.key === "ArrowDown") {
    ensureClick();
    scrollPos += 1;
    scrollVel = 0;
    lastInput = performance.now();
    event.preventDefault();
  } else if (event.key === "ArrowUp") {
    ensureClick();
    scrollPos -= 1;
    scrollVel = 0;
    lastInput = performance.now();
    event.preventDefault();
  } else if (event.key === "Enter") {
    selectCity(loopMod(Math.round(scrollPos), cities.length));
  }
}

hub.addEventListener("click", () => {
  if (openTarget === 0) openList();
  else closeList();
});

window.addEventListener("wheel", onWheel, { passive: false });
window.addEventListener("pointerdown", onPointerDown);
window.addEventListener("pointermove", onPointerMove);
window.addEventListener("pointerup", endPointer);
window.addEventListener("pointercancel", endPointer);
window.addEventListener("keydown", onKey);
window.addEventListener("resize", () => {
  metrics = computeMetrics();
});

buildRing();
buildCities();
requestAnimationFrame(frame);
