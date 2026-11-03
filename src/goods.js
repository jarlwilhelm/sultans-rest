// Real wares on the market tables and real cargo on the quay (Quaternius models, CC0),
// placed once the models have loaded. No plain shapes: everything is a model.
import { groundHeight, QUAY_Y } from './land.js';
import { prop, instanced } from './interiors.js';
import { plants } from './city.js';
import { makeRng, pick, range } from './noise.js';

// What lies on the table for each kind of stall: [model, height in metres].
const WARES = {
  food: [['Apple_Harvested', 0.22], ['Orange_Harvested', 0.22], ['Watermelon_Harvested', 0.3], ['Pumpkin_Harvested', 0.3], ['Coconut_Half', 0.14], ['Carrot_4', 0.25], ['Corn_Harvested', 0.2], ['Tomato_Harvested', 0.2]],
  craft: [['Pot', 0.32], ['Pan', 0.12], ['Chalice', 0.28], ['Potion2_Empty', 0.28], ['Book1_Closed', 0.1], ['Pot_Small', 0.22]],
  curio: [['Potion1_Filled', 0.28], ['Potion3_Filled', 0.28], ['Potion6_Filled', 0.3], ['Crystal1', 0.3], ['Scroll', 0.12], ['Chest_Closed', 0.3], ['Necklace1', 0.08], ['Coin', 0.04]],
  spice: [['Pouch', 0.2], ['Pot_Small', 0.22], ['Bags', 0.35], ['Pot', 0.3], ['Mushroom_Harvested', 0.18], ['BushBerries_Harvested', 0.18]],
  cloth: [['cloth', 0], ['cloth', 0], ['cloth', 0], ['Necklace1', 0.08], ['Pouch', 0.2], ['Chest_Closed', 0.3]],
};
const CLOTHS = ['#7a4ab0', '#b8382b', '#2e6c8e', '#d7a33a', '#2f9c9a', '#8e3b6c', '#e9e2cf'];   // tints for folded fabric

export function placeGoods(scene) {
  instanced(scene, 'market_stall', scene.userData.marketStalls);
  instanced(scene, 'palm', plants.palms);
  instanced(scene, 'bush_green', plants.bushes.filter(b => !b.bloom));
  instanced(scene, 'bush_flower', plants.bushes.filter(b => b.bloom));
  instanced(scene, 'shrub_dry', plants.dry);
  const rng = makeRng(808);
  for (const st of scene.userData.stalls || []) {
    const tz = st.z - 1.3, y = groundHeight(st.x, tz) + 0.95;
    const list = WARES[st.kind] || WARES.food;
    for (let i = 0; i < 6; i++) {
      const gx = st.x - 1.6 + i * 0.64 + range(rng, -0.08, 0.08), gz = tz + range(rng, -0.25, 0.25);
      const [name, h] = pick(rng, list);
      if (name === 'cloth') prop(scene, pick(rng, ['Carpet_1', 'Carpet_2', 'Carpet_Round']), gx, y, gz, { len: 0.55, ry: range(rng, -0.3, 0.3), tint: pick(rng, CLOTHS) });   // folded fabric
      else prop(scene, name, gx, y, gz, { h, ry: range(rng, 0, Math.PI * 2) });
    }
    // Stock under and beside the stall.
    prop(scene, pick(rng, ['Crate', 'Barrel', 'Bags']), st.x + range(rng, -1.8, 1.8), groundHeight(st.x, st.z + 0.8), st.z + range(rng, 0.4, 0.9), { h: 0.65, ry: range(rng, 0, 3) });
  }
  // Cargo along the quay.
  for (const c of scene.userData.cargo || []) {
    if (c.k < 0.42) {
      prop(scene, 'Crate', c.x, QUAY_Y, c.z, { h: 0.85, ry: c.ry });
      if (c.stack) prop(scene, 'Crate', c.x + 0.05, QUAY_Y + 0.85, c.z - 0.05, { h: 0.7, ry: c.ry + 0.4 });
    } else if (c.k < 0.7) {
      prop(scene, 'Barrel', c.x, QUAY_Y, c.z, { h: 1.0, ry: c.ry });
    } else if (c.k < 0.9) {
      prop(scene, 'Bags', c.x, QUAY_Y, c.z, { h: 0.5, ry: c.ry });
    } else {
      for (let i = 0; i < 3; i++) prop(scene, 'WoodLog', c.x, QUAY_Y + i * 0.22, c.z + (i % 2) * 0.1, { len: 1.6, ry: c.ry });
    }
  }
}
