// The six shops you can walk into in Sultan's Rest, at the user's map pins (docs/sultans-rest-pins.md).
// The house nearest each pin is built hollow (city.js), furnished in shops.js; who works there: game/shops.js.
// Kept free of imports so city.js can read it early. Names and colours are DRAFT (Claude's).
export const SHOP_PINS = {
  tailor:     { title: "Samira's", pin: [32, 50],   name: "SAMIRA'S",      sub: 'Tailor · Hats · Dyes',       wall: '#efe4cf', door: '#7a2a5c', sign: '#7a2a5c' },
  barber:     { title: "Doss the barber", pin: [-15.9, 50.9],  name: 'DOSS',           sub: 'Barber · Beards trimmed',    wall: '#e2cfa9', door: '#1f4f78', sign: '#1f4f78' },
  smith:      { title: "The smithy", pin: [80, 51],   name: 'THE SMITHY',     sub: 'Locks · Tools · Iron',       wall: '#b99a6c', door: '#3a2a20', sign: '#3a3a3c' },
  apothecary: { title: "The apothecary", pin: [132, 161], name: 'APOTHECARY',     sub: 'Balms · Leaves · Tinctures', wall: '#dcc499', door: '#2f6b5a', sign: '#2f6b5a' },
  bakery:     { title: "The bakery", pin: [157, 204], name: 'BAKERY',         sub: 'Bread at dawn · Dates',      wall: '#e6d3ad', door: '#8e5a3a', sign: '#b8382b' },
  curio:      { title: "The curio shop", pin: [156, 271], name: 'CURIOS',         sub: 'From every shore of Lavine', wall: '#bfa071', door: '#4b2a6b', sign: '#4b2a6b' },
  // Not a shop: the condemned house where you first meet Redman (pin 26, the user's call). Opens at level 7.
  condemned:  { title: 'A condemned house', pin: [-164, 205], kind: 'condemned', lock: 7, wall: '#a6875c', door: '#3a2a20' },
};
// The houses you go INTO to find someone (the user's to-do: 'some of them open to someone with a small side quest,
// or a special mini-game you play against them'): side-quest people and street players (game/sidequests.js,
// game/players.js). Built hollow like the shops, furnished as homes in shops.js. Hesper (watches the street at
// night) and Pia (sells tea on the street) stay outside on purpose. Pins must match those files.
export const HOUSE_PINS = {
  tamsin: { pin: [-111, 115], title: "Tamsin's house" },     kadir: { pin: [52, 159], title: "Kadir's house" },
  brothers: { pin: [124, 94], title: "Omar and Yusuf's house" }, dalia: { pin: [-117, 183], title: "Dalia's house" },
  benedek: { pin: [-140, 139], title: "Benedek's house" },    zahra: { pin: [-84, 139], title: "Zahra's house" },
  cyrus: { pin: [-12, 203], title: "Cyrus's pottery" },
  selim: { pin: [-82, 247], title: "Old Selim's house" },    tova: { pin: [-160, 51], title: "Big Tova's house" },
  nadim: { pin: [-68, 161], title: "Quick Nadim's house" },  rhea: { pin: [80, 117], title: "Rhea's house" },
};
for (const [id, h] of Object.entries(HOUSE_PINS)) SHOP_PINS[id] = { ...h, kind: 'home', wall: '#e2cfa9', door: '#5a3a20' };
// Which shop (if any) a house lot at x, z is (pins sit on house centres; a little slack).
export function shopFor(x, z) {
  for (const [id, s] of Object.entries(SHOP_PINS)) if (Math.hypot(s.pin[0] - x, s.pin[1] - z) < 2.8) return id;   // under half the gap between houses
  return null;
}

// The Great Luminous Shrine of King Shou (the user, 2026-11-04: in Lavine people have no gods; they worship their
// rulers, who will one day become gods). West of the main avenue, two thirds of the way back toward the desert wall.
// Every house whose middle is inside this box is built as a ghost; the shrine stands there instead (city.js).
export const SHRINE = { x0: 10, x1: 24.5, z0: 180, z1: 206 };
export const inShrine = (x, z) => x > SHRINE.x0 && x < SHRINE.x1 && z > SHRINE.z0 - 2 && z < SHRINE.z1 + 2;
