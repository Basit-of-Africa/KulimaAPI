import { describe, it, expect } from 'vitest';
import {
  NIGERIAN_LGAS,
  getAgriculturalZones,
  getLgasByZone,
  getLgasByState,
  type LgaData,
} from './seedLocations.js';

describe('Nigerian LGAs Seed Data', () => {
  describe('NIGERIAN_LGAS', () => {
    it('should have LGAs for all major states', () => {
      const states = new Set(NIGERIAN_LGAS.map((l) => l.state));
      expect(states.has('Kano')).toBe(true);
      expect(states.has('Lagos')).toBe(true);
      expect(states.has('Kaduna')).toBe(true);
      expect(states.has('Adamawa')).toBe(true);
      expect(states.has('Bauchi')).toBe(true);
      expect(states.has('Niger')).toBe(true);
      expect(states.has('Plateau')).toBe(true);
      expect(states.has('Rivers')).toBe(true);
      expect(states.has('Cross River')).toBe(true);
      expect(states.has('Benue')).toBe(true);
      expect(states.has('Abia')).toBe(true);
    });

    it('should have valid coordinates for all LGAs', () => {
      for (const lga of NIGERIAN_LGAS) {
        expect(lga.lat).toBeGreaterThan(3);
        expect(lga.lat).toBeLessThan(15);
        expect(lga.lng).toBeGreaterThan(2);
        expect(lga.lng).toBeLessThan(15);
      }
    });

    it('should have agricultural zones for all LGAs', () => {
      const validZones = [
        'Sudan Savanna',
        'Northern Guinea Savanna',
        'Southern Guinea Savanna',
        'Derived Savanna',
        'Humid Forest',
      ];
      for (const lga of NIGERIAN_LGAS) {
        expect(validZones).toContain(lga.agriculturalZone);
      }
    });

    it('should have non-empty names', () => {
      for (const lga of NIGERIAN_LGAS) {
        expect(lga.name.length).toBeGreaterThan(0);
        expect(lga.state.length).toBeGreaterThan(0);
      }
    });
  });

  describe('getAgriculturalZones', () => {
    it('should return all 5 zones', () => {
      const zones = getAgriculturalZones();
      expect(zones).toHaveLength(5);
      expect(zones).toContain('Sudan Savanna');
      expect(zones).toContain('Northern Guinea Savanna');
      expect(zones).toContain('Southern Guinea Savanna');
      expect(zones).toContain('Derived Savanna');
      expect(zones).toContain('Humid Forest');
    });
  });

  describe('getLgasByZone', () => {
    it('should return LGAs for Sudan Savanna', () => {
      const lgas = getLgasByZone('Sudan Savanna');
      expect(lgas.length).toBeGreaterThan(0);
      for (const lga of lgas) {
        expect(lga.agriculturalZone).toBe('Sudan Savanna');
      }
    });

    it('should return LGAs for Humid Forest', () => {
      const lgas = getLgasByZone('Humid Forest');
      expect(lgas.length).toBeGreaterThan(0);
      for (const lga of lgas) {
        expect(lga.agriculturalZone).toBe('Humid Forest');
      }
    });

    it('should return empty for unknown zone', () => {
      const lgas = getLgasByZone('Arctic Tundra');
      expect(lgas).toHaveLength(0);
    });
  });

  describe('getLgasByState', () => {
    it('should return LGAs for Kano', () => {
      const lgas = getLgasByState('Kano');
      expect(lgas.length).toBeGreaterThan(10);
      for (const lga of lgas) {
        expect(lga.state).toBe('Kano');
      }
    });

    it('should return LGAs for Lagos', () => {
      const lgas = getLgasByState('Lagos');
      expect(lgas.length).toBe(19);
    });

    it('should return empty for unknown state', () => {
      const lgas = getLgasByState('Atlantis');
      expect(lgas).toHaveLength(0);
    });
  });
});
