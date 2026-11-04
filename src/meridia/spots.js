// Named places in Meridia (Chapter Two): the city's landmarks, your plots, the gates. Used by the city,
// its people, the map and the compass.
import { C, R_OUT, R_MID, R_IN } from './layout.js';

export const SPOTS = {
  inn: { x: -52, z: 46, name: 'The Brine & Barrel (inn)' },
  popup: { x: -18, z: 20, name: 'Your pop-up stand' },
  customs: { x: 88, z: 50, name: 'Customs House' },
  warehouses: { x: 150, z: 60, name: 'Warehouse row' },
  harbor: { x: 0, z: -40, name: 'Grand Pier (your ship)' },
  outerGate: { x: 0, z: C.z - R_OUT, name: 'Outer Gate' },
  midGate: { x: 0, z: C.z - R_MID, name: 'Middle Gate' },
  innerGate: { x: 0, z: C.z - R_IN, name: 'Inner Gate' },
  market: { x: 0, z: 157, name: 'Market' },
  exchange: { x: -46, z: 160, name: 'The Exchange' },
  tavern: { x: 46, z: 158, name: 'The Gilded Gull' },
  bakery: { x: 30, z: 184, name: 'The Lantern Bakery' },
  hall: { x: 0, z: 262, name: 'Republic Hall' },
  home: { x: -58, z: 118, name: 'Your house' },
  store: { x: -30, z: 176, name: 'Your store' },
};
// Each size of house and store is a different place in the city (the user, 2026-11-04: a new house means a new
// location, not building onto the old one): a cottage in the outer ring, a house in the middle ring, a townhouse
// on the Hill; a small shop by the market, a bigger store across the avenue, a trading house on the Hill.
export const HOME_SPOTS = [null, { x: -58, z: 118 }, { x: -62, z: 196 }, { x: -28, z: 236 }];
export const STORE_SPOTS = [null, { x: -30, z: 176 }, { x: 62, z: 200 }, { x: 28, z: 236 }];
export const homeSpot = (tier) => HOME_SPOTS[tier] || HOME_SPOTS[1];
export const storeSpot = (tier) => STORE_SPOTS[tier] || STORE_SPOTS[1];
