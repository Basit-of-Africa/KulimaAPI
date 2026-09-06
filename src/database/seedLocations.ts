/**
 * Nigerian States, LGAs, and major agricultural zones with coordinates.
 * These are representative centroids for each LGA.
 *
 * Source: National Bureau of Statistics (NBS) and INEC boundary data.
 * For production, replace with full GeoJSON polygons from
 * https://github.com/africaopendata/admin-boundaries
 */

export interface LgaData {
  name: string;
  state: string;
  lat: number;
  lng: number;
  agriculturalZone: string;
}

/**
 * Major Nigerian states with LGA centroids and agricultural zones.
 * Agricultural zones:
 *   - Sudan Savanna (northernmost)
 *   - Northern Guinea Savanna
 *   - Southern Guinea Savanna
 *   - Derived Savanna
 *   - Humid Forest (southernmost/coastal)
 */
export const NIGERIAN_LGAS: LgaData[] = [
  // ─── Abia ─────────────────────────────────────────────────────────────
  { name: 'Aba North', state: 'Abia', lat: 5.11, lng: 7.37, agriculturalZone: 'Humid Forest' },
  { name: 'Aba South', state: 'Abia', lat: 5.08, lng: 7.36, agriculturalZone: 'Humid Forest' },
  { name: 'Isiala Ngwa North', state: 'Abia', lat: 5.22, lng: 7.47, agriculturalZone: 'Humid Forest' },
  { name: 'Isiala Ngwa South', state: 'Abia', lat: 5.13, lng: 7.49, agriculturalZone: 'Humid Forest' },
  { name: 'Obi Ngwa', state: 'Abia', lat: 5.03, lng: 7.48, agriculturalZone: 'Humid Forest' },
  { name: 'Ohafia', state: 'Abia', lat: 5.38, lng: 7.83, agriculturalZone: 'Humid Forest' },
  { name: 'Osisioma', state: 'Abia', lat: 5.15, lng: 7.31, agriculturalZone: 'Humid Forest' },
  { name: 'Ukwunagbo', state: 'Abia', lat: 5.08, lng: 7.27, agriculturalZone: 'Humid Forest' },
  { name: 'Ukwa East', state: 'Abia', lat: 5.01, lng: 7.23, agriculturalZone: 'Humid Forest' },
  { name: 'Ukwa West', state: 'Abia', lat: 5.07, lng: 7.15, agriculturalZone: 'Humid Forest' },
  { name: 'Umuahia North', state: 'Abia', lat: 5.17, lng: 7.49, agriculturalZone: 'Humid Forest' },
  { name: 'Umuahia South', state: 'Abia', lat: 5.12, lng: 7.52, agriculturalZone: 'Humid Forest' },
  { name: 'Umu Nneochi', state: 'Abia', lat: 5.28, lng: 7.66, agriculturalZone: 'Humid Forest' },

  // ─── Adamawa ──────────────────────────────────────────────────────────
  { name: 'Demsa', state: 'Adamawa', lat: 9.45, lng: 12.12, agriculturalZone: 'Sudan Savanna' },
  { name: 'Fufure', state: 'Adamawa', lat: 9.75, lng: 12.65, agriculturalZone: 'Sudan Savanna' },
  { name: 'Ganye', state: 'Adamawa', lat: 8.80, lng: 12.07, agriculturalZone: 'Northern Guinea Savanna' },
  { name: 'Girei', state: 'Adamawa', lat: 9.37, lng: 12.54, agriculturalZone: 'Sudan Savanna' },
  { name: 'Gombi', state: 'Adamawa', lat: 10.07, lng: 13.13, agriculturalZone: 'Sudan Savanna' },
  { name: 'Hong', state: 'Adamawa', lat: 10.20, lng: 13.30, agriculturalZone: 'Sudan Savanna' },
  { name: 'Jada', state: 'Adamawa', lat: 8.77, lng: 11.90, agriculturalZone: 'Northern Guinea Savanna' },
  { name: 'Lamurde', state: 'Adamawa', lat: 9.18, lng: 11.62, agriculturalZone: 'Northern Guinea Savanna' },
  { name: 'Madagali', state: 'Adamawa', lat: 10.50, lng: 13.62, agriculturalZone: 'Sudan Savanna' },
  { name: 'Maiha', state: 'Adamawa', lat: 8.55, lng: 12.40, agriculturalZone: 'Northern Guinea Savanna' },
  { name: 'Mayo Belwa', state: 'Adamawa', lat: 9.10, lng: 12.25, agriculturalZone: 'Northern Guinea Savanna' },
  { name: 'Michika', state: 'Adamawa', lat: 10.57, lng: 13.57, agriculturalZone: 'Sudan Savanna' },
  { name: 'Mubi North', state: 'Adamawa', lat: 10.27, lng: 13.38, agriculturalZone: 'Sudan Savanna' },
  { name: 'Mubi South', state: 'Adamawa', lat: 10.13, lng: 13.30, agriculturalZone: 'Sudan Savanna' },
  { name: 'Numan', state: 'Adamawa', lat: 9.46, lng: 11.97, agriculturalZone: 'Northern Guinea Savanna' },
  { name: 'Shelleng', state: 'Adamawa', lat: 9.50, lng: 12.20, agriculturalZone: 'Sudan Savanna' },
  { name: 'Song', state: 'Adamawa', lat: 9.80, lng: 12.70, agriculturalZone: 'Sudan Savanna' },
  { name: 'Toungo', state: 'Adamawa', lat: 8.77, lng: 12.10, agriculturalZone: 'Northern Guinea Savanna' },
  { name: 'Yola North', state: 'Adamawa', lat: 9.23, lng: 12.48, agriculturalZone: 'Northern Guinea Savanna' },
  { name: 'Yola South', state: 'Adamawa', lat: 9.17, lng: 12.47, agriculturalZone: 'Northern Guinea Savanna' },

  // ─── Bauchi ───────────────────────────────────────────────────────────
  { name: 'Alkaleri', state: 'Bauchi', lat: 10.10, lng: 10.10, agriculturalZone: 'Sudan Savanna' },
  { name: 'Bauchi', state: 'Bauchi', lat: 10.31, lng: 9.84, agriculturalZone: 'Sudan Savanna' },
  { name: 'Bogoro', state: 'Bauchi', lat: 9.78, lng: 9.62, agriculturalZone: 'Northern Guinea Savanna' },
  { name: 'Dass', state: 'Bauchi', lat: 9.88, lng: 9.68, agriculturalZone: 'Northern Guinea Savanna' },
  { name: 'Darazo', state: 'Bauchi', lat: 10.85, lng: 10.35, agriculturalZone: 'Sudan Savanna' },
  { name: 'Gamawa', state: 'Bauchi', lat: 11.17, lng: 11.03, agriculturalZone: 'Sudan Savanna' },
  { name: 'Ganjuwa', state: 'Bauchi', lat: 10.30, lng: 10.60, agriculturalZone: 'Sudan Savanna' },
  { name: 'Giade', state: 'Bauchi', lat: 11.30, lng: 10.20, agriculturalZone: 'Sudan Savanna' },
  { name: 'Itas/Gadau', state: 'Bauchi', lat: 11.45, lng: 10.40, agriculturalZone: 'Sudan Savanna' },
  { name: "Jama'are", state: 'Bauchi', lat: 11.55, lng: 10.50, agriculturalZone: 'Sudan Savanna' },
  { name: 'Katagum', state: 'Bauchi', lat: 11.20, lng: 10.25, agriculturalZone: 'Sudan Savanna' },
  { name: 'Kirfi', state: 'Bauchi', lat: 10.07, lng: 10.55, agriculturalZone: 'Sudan Savanna' },
  { name: 'Misau', state: 'Bauchi', lat: 11.32, lng: 10.42, agriculturalZone: 'Sudan Savanna' },
  { name: 'Ningi', state: 'Bauchi', lat: 10.65, lng: 9.77, agriculturalZone: 'Northern Guinea Savanna' },
  { name: 'Shira', state: 'Bauchi', lat: 11.08, lng: 10.45, agriculturalZone: 'Sudan Savanna' },
  { name: 'Tafawa Balewa', state: 'Bauchi', lat: 10.05, lng: 9.50, agriculturalZone: 'Northern Guinea Savanna' },
  { name: 'Toro', state: 'Bauchi', lat: 10.20, lng: 9.40, agriculturalZone: 'Northern Guinea Savanna' },
  { name: 'Warji', state: 'Bauchi', lat: 10.55, lng: 9.87, agriculturalZone: 'Sudan Savanna' },
  { name: 'Zaki', state: 'Bauchi', lat: 11.38, lng: 10.30, agriculturalZone: 'Sudan Savanna' },

  // ─── Kano ─────────────────────────────────────────────────────────────
  { name: 'Ajingi', state: 'Kano', lat: 11.73, lng: 8.93, agriculturalZone: 'Sudan Savanna' },
  { name: 'Albasu', state: 'Kano', lat: 11.60, lng: 8.98, agriculturalZone: 'Sudan Savanna' },
  { name: 'Bagwai', state: 'Kano', lat: 11.98, lng: 8.42, agriculturalZone: 'Sudan Savanna' },
  { name: 'Bebeji', state: 'Kano', lat: 11.62, lng: 8.45, agriculturalZone: 'Sudan Savanna' },
  { name: 'Bichi', state: 'Kano', lat: 12.10, lng: 8.22, agriculturalZone: 'Sudan Savanna' },
  { name: 'Bunkure', state: 'Kano', lat: 11.67, lng: 8.67, agriculturalZone: 'Sudan Savanna' },
  { name: 'Dala', state: 'Kano', lat: 12.00, lng: 8.52, agriculturalZone: 'Sudan Savanna' },
  { name: 'Dambatta', state: 'Kano', lat: 12.33, lng: 8.50, agriculturalZone: 'Sudan Savanna' },
  { name: 'Dawakin Kudu', state: 'Kano', lat: 11.65, lng: 8.77, agriculturalZone: 'Sudan Savanna' },
  { name: 'Dawakin Tofa', state: 'Kano', lat: 12.08, lng: 8.43, agriculturalZone: 'Sudan Savanna' },
  { name: 'Doguwa', state: 'Kano', lat: 11.23, lng: 8.12, agriculturalZone: 'Sudan Savanna' },
  { name: 'Fagge', state: 'Kano', lat: 11.98, lng: 8.57, agriculturalZone: 'Sudan Savanna' },
  { name: 'Gabasawa', state: 'Kano', lat: 12.08, lng: 8.80, agriculturalZone: 'Sudan Savanna' },
  { name: 'Garko', state: 'Kano', lat: 11.30, lng: 8.70, agriculturalZone: 'Sudan Savanna' },
  { name: 'Garum Mallam', state: 'Kano', lat: 11.58, lng: 8.65, agriculturalZone: 'Sudan Savanna' },
  { name: 'Gaya', state: 'Kano', lat: 11.55, lng: 8.95, agriculturalZone: 'Sudan Savanna' },
  { name: 'Gezawa', state: 'Kano', lat: 12.08, lng: 8.73, agriculturalZone: 'Sudan Savanna' },
  { name: 'Gwale', state: 'Kano', lat: 11.97, lng: 8.53, agriculturalZone: 'Sudan Savanna' },
  { name: 'Gwarzo', state: 'Kano', lat: 12.05, lng: 8.13, agriculturalZone: 'Sudan Savanna' },
  { name: 'Kabo', state: 'Kano', lat: 12.00, lng: 8.28, agriculturalZone: 'Sudan Savanna' },
  { name: 'Kano Municipal', state: 'Kano', lat: 12.00, lng: 8.52, agriculturalZone: 'Sudan Savanna' },
  { name: 'Karaye', state: 'Kano', lat: 11.67, lng: 8.15, agriculturalZone: 'Sudan Savanna' },
  { name: 'Kibiya', state: 'Kano', lat: 11.55, lng: 8.50, agriculturalZone: 'Sudan Savanna' },
  { name: 'Kiru', state: 'Kano', lat: 11.55, lng: 8.30, agriculturalZone: 'Sudan Savanna' },
  { name: 'Kumbotso', state: 'Kano', lat: 11.95, lng: 8.58, agriculturalZone: 'Sudan Savanna' },
  { name: 'Kunchi', state: 'Kano', lat: 12.27, lng: 8.08, agriculturalZone: 'Sudan Savanna' },
  { name: 'Kura', state: 'Kano', lat: 11.70, lng: 8.70, agriculturalZone: 'Sudan Savanna' },
  { name: 'Madobi', state: 'Kano', lat: 11.70, lng: 8.63, agriculturalZone: 'Sudan Savanna' },
  { name: 'Makoda', state: 'Kano', lat: 12.22, lng: 8.72, agriculturalZone: 'Sudan Savanna' },
  { name: 'Minjibir', state: 'Kano', lat: 12.18, lng: 8.77, agriculturalZone: 'Sudan Savanna' },
  { name: 'Nasarawa', state: 'Kano', lat: 11.87, lng: 8.53, agriculturalZone: 'Sudan Savanna' },
  { name: 'Rano', state: 'Kano', lat: 11.30, lng: 8.35, agriculturalZone: 'Sudan Savanna' },
  { name: 'Rimin Gado', state: 'Kano', lat: 11.87, lng: 8.52, agriculturalZone: 'Sudan Savanna' },
  { name: 'Shanono', state: 'Kano', lat: 12.00, lng: 8.03, agriculturalZone: 'Sudan Savanna' },
  { name: 'Sumaila', state: 'Kano', lat: 11.50, lng: 8.70, agriculturalZone: 'Sudan Savanna' },
  { name: 'Takai', state: 'Kano', lat: 11.43, lng: 8.73, agriculturalZone: 'Sudan Savanna' },
  { name: 'Tarauni', state: 'Kano', lat: 11.92, lng: 8.55, agriculturalZone: 'Sudan Savanna' },
  { name: 'Tofa', state: 'Kano', lat: 12.03, lng: 8.28, agriculturalZone: 'Sudan Savanna' },
  { name: 'Tudun Wada', state: 'Kano', lat: 11.60, lng: 8.55, agriculturalZone: 'Sudan Savanna' },
  { name: 'Ungogo', state: 'Kano', lat: 12.05, lng: 8.65, agriculturalZone: 'Sudan Savanna' },
  { name: 'Warawa', state: 'Kano', lat: 11.80, lng: 8.78, agriculturalZone: 'Sudan Savanna' },
  { name: 'Wudil', state: 'Kano', lat: 11.72, lng: 8.95, agriculturalZone: 'Sudan Savanna' },

  // ─── Lagos ────────────────────────────────────────────────────────────
  { name: 'Agege', state: 'Lagos', lat: 6.61, lng: 3.33, agriculturalZone: 'Humid Forest' },
  { name: 'Ajeromi-Ifelodun', state: 'Lagos', lat: 6.45, lng: 3.33, agriculturalZone: 'Humid Forest' },
  { name: 'Alimosho', state: 'Lagos', lat: 6.54, lng: 3.27, agriculturalZone: 'Humid Forest' },
  { name: 'Amuwo-Odofin', state: 'Lagos', lat: 6.42, lng: 3.30, agriculturalZone: 'Humid Forest' },
  { name: 'Apapa', state: 'Lagos', lat: 6.45, lng: 3.37, agriculturalZone: 'Humid Forest' },
  { name: 'Badagry', state: 'Lagos', lat: 6.42, lng: 2.88, agriculturalZone: 'Humid Forest' },
  { name: 'Epe', state: 'Lagos', lat: 6.59, lng: 3.85, agriculturalZone: 'Humid Forest' },
  { name: 'Eti-Osa', state: 'Lagos', lat: 6.45, lng: 3.48, agriculturalZone: 'Humid Forest' },
  { name: 'Ibeju-Lekki', state: 'Lagos', lat: 6.48, lng: 3.65, agriculturalZone: 'Humid Forest' },
  { name: 'Ikeja', state: 'Lagos', lat: 6.60, lng: 3.35, agriculturalZone: 'Humid Forest' },
  { name: 'Ikorodu', state: 'Lagos', lat: 6.63, lng: 3.51, agriculturalZone: 'Humid Forest' },
  { name: 'Kosofe', state: 'Lagos', lat: 6.54, lng: 3.42, agriculturalZone: 'Humid Forest' },
  { name: 'Lagos Island', state: 'Lagos', lat: 6.45, lng: 3.40, agriculturalZone: 'Humid Forest' },
  { name: 'Lagos Mainland', state: 'Lagos', lat: 6.50, lng: 3.38, agriculturalZone: 'Humid Forest' },
  { name: 'Mushin', state: 'Lagos', lat: 6.54, lng: 3.35, agriculturalZone: 'Humid Forest' },
  { name: 'Ojo', state: 'Lagos', lat: 6.47, lng: 3.18, agriculturalZone: 'Humid Forest' },
  { name: 'Oshodi-Isolo', state: 'Lagos', lat: 6.56, lng: 3.32, agriculturalZone: 'Humid Forest' },
  { name: 'Shomolu', state: 'Lagos', lat: 6.53, lng: 3.38, agriculturalZone: 'Humid Forest' },
  { name: 'Surulere', state: 'Lagos', lat: 6.52, lng: 3.36, agriculturalZone: 'Humid Forest' },

  // ─── Kaduna ───────────────────────────────────────────────────────────
  { name: 'Birnin Gwari', state: 'Kaduna', lat: 10.57, lng: 6.70, agriculturalZone: 'Northern Guinea Savanna' },
  { name: 'Chikun', state: 'Kaduna', lat: 10.28, lng: 7.27, agriculturalZone: 'Northern Guinea Savanna' },
  { name: 'Giwa', state: 'Kaduna', lat: 10.82, lng: 7.18, agriculturalZone: 'Northern Guinea Savanna' },
  { name: 'Igabi', state: 'Kaduna', lat: 10.70, lng: 7.30, agriculturalZone: 'Northern Guinea Savanna' },
  { name: 'Ikara', state: 'Kaduna', lat: 11.02, lng: 7.98, agriculturalZone: 'Sudan Savanna' },
  { name: 'Jaba', state: 'Kaduna', lat: 9.68, lng: 7.98, agriculturalZone: 'Derived Savanna' },
  { name: "Jema'a", state: 'Kaduna', lat: 9.58, lng: 8.07, agriculturalZone: 'Derived Savanna' },
  { name: 'Kachia', state: 'Kaduna', lat: 9.82, lng: 7.82, agriculturalZone: 'Derived Savanna' },
  { name: 'Kaduna North', state: 'Kaduna', lat: 10.52, lng: 7.43, agriculturalZone: 'Northern Guinea Savanna' },
  { name: 'Kaduna South', state: 'Kaduna', lat: 10.43, lng: 7.42, agriculturalZone: 'Northern Guinea Savanna' },
  { name: 'Kagarko', state: 'Kaduna', lat: 9.90, lng: 7.63, agriculturalZone: 'Derived Savanna' },
  { name: 'Kajuru', state: 'Kaduna', lat: 10.05, lng: 7.68, agriculturalZone: 'Derived Savanna' },
  { name: 'Kaura', state: 'Kaduna', lat: 9.88, lng: 8.08, agriculturalZone: 'Derived Savanna' },
  { name: 'Kauru', state: 'Kaduna', lat: 10.17, lng: 7.97, agriculturalZone: 'Northern Guinea Savanna' },
  { name: 'Kubau', state: 'Kaduna', lat: 10.68, lng: 8.22, agriculturalZone: 'Sudan Savanna' },
  { name: 'Kudan', state: 'Kaduna', lat: 10.97, lng: 7.87, agriculturalZone: 'Sudan Savanna' },
  { name: 'Lere', state: 'Kaduna', lat: 10.38, lng: 8.48, agriculturalZone: 'Sudan Savanna' },
  { name: 'Makarfi', state: 'Kaduna', lat: 11.15, lng: 8.12, agriculturalZone: 'Sudan Savanna' },
  { name: 'Sabon Gari', state: 'Kaduna', lat: 10.70, lng: 7.78, agriculturalZone: 'Northern Guinea Savanna' },
  { name: 'Sanga', state: 'Kaduna', lat: 9.82, lng: 8.18, agriculturalZone: 'Derived Savanna' },
  { name: 'Soba', state: 'Kaduna', lat: 10.58, lng: 8.15, agriculturalZone: 'Sudan Savanna' },
  { name: 'Zangon-Kataf', state: 'Kaduna', lat: 9.80, lng: 8.07, agriculturalZone: 'Derived Savanna' },
  { name: 'Zaria', state: 'Kaduna', lat: 11.08, lng: 7.72, agriculturalZone: 'Sudan Savanna' },

  // ─── Niger ────────────────────────────────────────────────────────────
  { name: 'Agaie', state: 'Niger', lat: 9.25, lng: 6.45, agriculturalZone: 'Southern Guinea Savanna' },
  { name: 'Agwara', state: 'Niger', lat: 9.92, lng: 5.88, agriculturalZone: 'Southern Guinea Savanna' },
  { name: 'Bida', state: 'Niger', lat: 9.08, lng: 6.02, agriculturalZone: 'Southern Guinea Savanna' },
  { name: 'Borgu', state: 'Niger', lat: 9.85, lng: 5.35, agriculturalZone: 'Southern Guinea Savanna' },
  { name: 'Bosso', state: 'Niger', lat: 9.12, lng: 6.72, agriculturalZone: 'Southern Guinea Savanna' },
  { name: 'Chanchaga', state: 'Niger', lat: 9.60, lng: 6.55, agriculturalZone: 'Southern Guinea Savanna' },
  { name: 'Edati', state: 'Niger', lat: 9.12, lng: 6.27, agriculturalZone: 'Southern Guinea Savanna' },
  { name: 'Gbako', state: 'Niger', lat: 9.05, lng: 6.22, agriculturalZone: 'Southern Guinea Savanna' },
  { name: 'Gurara', state: 'Niger', lat: 9.38, lng: 6.82, agriculturalZone: 'Southern Guinea Savanna' },
  { name: 'Katcha', state: 'Niger', lat: 8.80, lng: 6.18, agriculturalZone: 'Derived Savanna' },
  { name: 'Kontagora', state: 'Niger', lat: 10.40, lng: 6.02, agriculturalZone: 'Sudan Savanna' },
  { name: 'Lapai', state: 'Niger', lat: 9.18, lng: 6.72, agriculturalZone: 'Southern Guinea Savanna' },
  { name: 'Lavun', state: 'Niger', lat: 9.07, lng: 6.35, agriculturalZone: 'Southern Guinea Savanna' },
  { name: 'Magama', state: 'Niger', lat: 9.85, lng: 6.40, agriculturalZone: 'Sudan Savanna' },
  { name: 'Mariga', state: 'Niger', lat: 9.92, lng: 6.15, agriculturalZone: 'Sudan Savanna' },
  { name: 'Mashegu', state: 'Niger', lat: 9.95, lng: 6.12, agriculturalZone: 'Sudan Savanna' },
  { name: 'Mokwa', state: 'Niger', lat: 9.20, lng: 5.68, agriculturalZone: 'Southern Guinea Savanna' },
  { name: 'Muya', state: 'Niger', lat: 9.68, lng: 6.35, agriculturalZone: 'Southern Guinea Savanna' },
  { name: 'Paikoro', state: 'Niger', lat: 9.48, lng: 6.60, agriculturalZone: 'Southern Guinea Savanna' },
  { name: 'Rafi', state: 'Niger', lat: 9.92, lng: 6.52, agriculturalZone: 'Sudan Savanna' },
  { name: 'Rijau', state: 'Niger', lat: 10.02, lng: 5.97, agriculturalZone: 'Sudan Savanna' },
  { name: 'Shiroro', state: 'Niger', lat: 9.27, lng: 6.77, agriculturalZone: 'Southern Guinea Savanna' },
  { name: 'Suleja', state: 'Niger', lat: 9.35, lng: 6.92, agriculturalZone: 'Southern Guinea Savanna' },
  { name: 'Tafa', state: 'Niger', lat: 9.28, lng: 6.97, agriculturalZone: 'Southern Guinea Savanna' },
  { name: 'Wushishi', state: 'Niger', lat: 9.63, lng: 6.22, agriculturalZone: 'Southern Guinea Savanna' },

  // ─── Plateau ──────────────────────────────────────────────────────────
  { name: 'Barkin Ladi', state: 'Plateau', lat: 9.68, lng: 8.67, agriculturalZone: 'Derived Savanna' },
  { name: 'Bassa', state: 'Plateau', lat: 9.48, lng: 8.73, agriculturalZone: 'Derived Savanna' },
  { name: 'Bokkos', state: 'Plateau', lat: 9.60, lng: 8.92, agriculturalZone: 'Derived Savanna' },
  { name: 'Jos East', state: 'Plateau', lat: 9.88, lng: 9.12, agriculturalZone: 'Derived Savanna' },
  { name: 'Jos North', state: 'Plateau', lat: 9.90, lng: 8.87, agriculturalZone: 'Derived Savanna' },
  { name: 'Jos South', state: 'Plateau', lat: 9.80, lng: 8.85, agriculturalZone: 'Derived Savanna' },
  { name: 'Kanam', state: 'Plateau', lat: 9.67, lng: 9.48, agriculturalZone: 'Derived Savanna' },
  { name: 'Kanke', state: 'Plateau', lat: 9.72, lng: 9.37, agriculturalZone: 'Derived Savanna' },
  { name: 'Langtang North', state: 'Plateau', lat: 9.13, lng: 9.18, agriculturalZone: 'Derived Savanna' },
  { name: 'Langtang South', state: 'Plateau', lat: 8.97, lng: 9.17, agriculturalZone: 'Derived Savanna' },
  { name: 'Mangu', state: 'Plateau', lat: 9.52, lng: 8.93, agriculturalZone: 'Derived Savanna' },
  { name: 'Mikang', state: 'Plateau', lat: 9.33, lng: 9.10, agriculturalZone: 'Derived Savanna' },
  { name: 'Pankshin', state: 'Plateau', lat: 9.50, lng: 9.27, agriculturalZone: 'Derived Savanna' },
  { name: "Qua'an Pan", state: 'Plateau', lat: 9.37, lng: 9.05, agriculturalZone: 'Derived Savanna' },
  { name: 'Riyom', state: 'Plateau', lat: 9.63, lng: 8.62, agriculturalZone: 'Derived Savanna' },
  { name: 'Shendam', state: 'Plateau', lat: 8.73, lng: 9.40, agriculturalZone: 'Derived Savanna' },
  { name: 'Wase', state: 'Plateau', lat: 9.42, lng: 9.80, agriculturalZone: 'Sudan Savanna' },

  // ─── Rivers ───────────────────────────────────────────────────────────
  { name: 'Abua/Odual', state: 'Rivers', lat: 4.87, lng: 6.52, agriculturalZone: 'Humid Forest' },
  { name: 'Ahoada East', state: 'Rivers', lat: 5.12, lng: 6.47, agriculturalZone: 'Humid Forest' },
  { name: 'Ahoada West', state: 'Rivers', lat: 5.08, lng: 6.33, agriculturalZone: 'Humid Forest' },
  { name: 'Akuku-Toru', state: 'Rivers', lat: 4.70, lng: 6.48, agriculturalZone: 'Humid Forest' },
  { name: 'Andoni', state: 'Rivers', lat: 4.47, lng: 7.18, agriculturalZone: 'Humid Forest' },
  { name: 'Asari-Toru', state: 'Rivers', lat: 4.67, lng: 6.77, agriculturalZone: 'Humid Forest' },
  { name: 'Bonny', state: 'Rivers', lat: 4.43, lng: 7.17, agriculturalZone: 'Humid Forest' },
  { name: 'Degema', state: 'Rivers', lat: 4.78, lng: 6.73, agriculturalZone: 'Humid Forest' },
  { name: 'Emohua', state: 'Rivers', lat: 4.92, lng: 6.92, agriculturalZone: 'Humid Forest' },
  { name: 'Eleme', state: 'Rivers', lat: 4.73, lng: 7.10, agriculturalZone: 'Humid Forest' },
  { name: 'Etche', state: 'Rivers', lat: 5.00, lng: 7.07, agriculturalZone: 'Humid Forest' },
  { name: 'Gokana', state: 'Rivers', lat: 4.57, lng: 7.18, agriculturalZone: 'Humid Forest' },
  { name: 'Ikwerre', state: 'Rivers', lat: 5.10, lng: 6.93, agriculturalZone: 'Humid Forest' },
  { name: 'Khana', state: 'Rivers', lat: 4.72, lng: 7.30, agriculturalZone: 'Humid Forest' },
  { name: 'Obio/Akpor', state: 'Rivers', lat: 4.88, lng: 7.02, agriculturalZone: 'Humid Forest' },
  { name: 'Ogba/Egbema/Ndoni', state: 'Rivers', lat: 5.02, lng: 6.55, agriculturalZone: 'Humid Forest' },
  { name: 'Ogu/Bolo', state: 'Rivers', lat: 4.63, lng: 7.10, agriculturalZone: 'Humid Forest' },
  { name: 'Okrika', state: 'Rivers', lat: 4.60, lng: 7.10, agriculturalZone: 'Humid Forest' },
  { name: 'Omuma', state: 'Rivers', lat: 5.02, lng: 7.10, agriculturalZone: 'Humid Forest' },
  { name: 'Opobo/Nkoro', state: 'Rivers', lat: 4.55, lng: 7.15, agriculturalZone: 'Humid Forest' },
  { name: 'Oyigbo', state: 'Rivers', lat: 4.82, lng: 7.13, agriculturalZone: 'Humid Forest' },
  { name: 'Port Harcourt', state: 'Rivers', lat: 4.82, lng: 7.05, agriculturalZone: 'Humid Forest' },
  { name: 'Tai', state: 'Rivers', lat: 4.73, lng: 7.15, agriculturalZone: 'Humid Forest' },

  // ─── Cross River ──────────────────────────────────────────────────────
  { name: 'Abi', state: 'Cross River', lat: 5.93, lng: 8.02, agriculturalZone: 'Humid Forest' },
  { name: 'Akamkpa', state: 'Cross River', lat: 5.47, lng: 8.27, agriculturalZone: 'Humid Forest' },
  { name: 'Akpabuyo', state: 'Cross River', lat: 5.22, lng: 8.28, agriculturalZone: 'Humid Forest' },
  { name: 'Bakassi', state: 'Cross River', lat: 4.77, lng: 8.43, agriculturalZone: 'Humid Forest' },
  { name: 'Bekwarra', state: 'Cross River', lat: 6.48, lng: 8.82, agriculturalZone: 'Derived Savanna' },
  { name: 'Biase', state: 'Cross River', lat: 5.68, lng: 8.22, agriculturalZone: 'Humid Forest' },
  { name: 'Boki', state: 'Cross River', lat: 6.02, lng: 8.52, agriculturalZone: 'Humid Forest' },
  { name: 'Calabar Municipal', state: 'Cross River', lat: 4.98, lng: 8.30, agriculturalZone: 'Humid Forest' },
  { name: 'Calabar South', state: 'Cross River', lat: 4.92, lng: 8.30, agriculturalZone: 'Humid Forest' },
  { name: 'Etung', state: 'Cross River', lat: 5.83, lng: 8.42, agriculturalZone: 'Humid Forest' },
  { name: 'Ikom', state: 'Cross River', lat: 5.97, lng: 8.62, agriculturalZone: 'Humid Forest' },
  { name: 'Obanliku', state: 'Cross River', lat: 6.53, lng: 8.80, agriculturalZone: 'Derived Savanna' },
  { name: 'Obudu', state: 'Cross River', lat: 6.62, lng: 8.90, agriculturalZone: 'Derived Savanna' },
  { name: 'Odukpani', state: 'Cross River', lat: 5.02, lng: 8.25, agriculturalZone: 'Humid Forest' },
  { name: 'Ogoja', state: 'Cross River', lat: 6.65, lng: 8.80, agriculturalZone: 'Derived Savanna' },
  { name: 'Yakuur', state: 'Cross River', lat: 5.13, lng: 8.22, agriculturalZone: 'Humid Forest' },
  { name: 'Yala', state: 'Cross River', lat: 6.47, lng: 8.60, agriculturalZone: 'Derived Savanna' },

  // ─── Benue ────────────────────────────────────────────────────────────
  { name: 'Agatu', state: 'Benue', lat: 7.52, lng: 8.23, agriculturalZone: 'Southern Guinea Savanna' },
  { name: 'Apa', state: 'Benue', lat: 7.17, lng: 8.02, agriculturalZone: 'Derived Savanna' },
  { name: 'Ado', state: 'Benue', lat: 7.07, lng: 7.98, agriculturalZone: 'Derived Savanna' },
  { name: 'Buruku', state: 'Benue', lat: 7.47, lng: 8.53, agriculturalZone: 'Southern Guinea Savanna' },
  { name: 'Gboko', state: 'Benue', lat: 7.35, lng: 8.72, agriculturalZone: 'Southern Guinea Savanna' },
  { name: 'Guma', state: 'Benue', lat: 7.55, lng: 8.72, agriculturalZone: 'Southern Guinea Savanna' },
  { name: 'Gwer East', state: 'Benue', lat: 7.52, lng: 8.32, agriculturalZone: 'Southern Guinea Savanna' },
  { name: 'Gwer West', state: 'Benue', lat: 7.42, lng: 8.20, agriculturalZone: 'Southern Guinea Savanna' },
  { name: 'Katsina-Ala', state: 'Benue', lat: 7.30, lng: 8.80, agriculturalZone: 'Southern Guinea Savanna' },
  { name: 'Konshisha', state: 'Benue', lat: 7.22, lng: 8.75, agriculturalZone: 'Southern Guinea Savanna' },
  { name: 'Kwande', state: 'Benue', lat: 7.10, lng: 8.90, agriculturalZone: 'Southern Guinea Savanna' },
  { name: 'Logo', state: 'Benue', lat: 7.65, lng: 8.85, agriculturalZone: 'Southern Guinea Savanna' },
  { name: 'Makurdi', state: 'Benue', lat: 7.32, lng: 8.53, agriculturalZone: 'Southern Guinea Savanna' },
  { name: 'Obi', state: 'Benue', lat: 7.40, lng: 8.25, agriculturalZone: 'Derived Savanna' },
  { name: 'Ogbadibo', state: 'Benue', lat: 7.05, lng: 7.93, agriculturalZone: 'Derived Savanna' },
  { name: 'Ohimini', state: 'Benue', lat: 7.12, lng: 7.90, agriculturalZone: 'Derived Savanna' },
  { name: 'Oju', state: 'Benue', lat: 6.87, lng: 8.30, agriculturalZone: 'Derived Savanna' },
  { name: 'Okpokwu', state: 'Benue', lat: 7.05, lng: 8.10, agriculturalZone: 'Derived Savanna' },
  { name: 'Oturkpo', state: 'Benue', lat: 7.18, lng: 8.13, agriculturalZone: 'Derived Savanna' },
  { name: 'Tarka', state: 'Benue', lat: 7.48, lng: 8.45, agriculturalZone: 'Southern Guinea Savanna' },
  { name: 'Ukum', state: 'Benue', lat: 7.42, lng: 8.97, agriculturalZone: 'Southern Guinea Savanna' },
  { name: 'Ushongo', state: 'Benue', lat: 7.25, lng: 8.62, agriculturalZone: 'Southern Guinea Savanna' },
  { name: 'Vandeikya', state: 'Benue', lat: 6.97, lng: 8.48, agriculturalZone: 'Derived Savanna' },
];

/**
 * Get all unique agricultural zones.
 */
export function getAgriculturalZones(): string[] {
  return [...new Set(NIGERIAN_LGAS.map((lga) => lga.agriculturalZone))];
}

/**
 * Get LGAs in a specific agricultural zone.
 */
export function getLgasByZone(zone: string): LgaData[] {
  return NIGERIAN_LGAS.filter((lga) => lga.agriculturalZone === zone);
}

/**
 * Get LGAs in a specific state.
 */
export function getLgasByState(state: string): LgaData[] {
  return NIGERIAN_LGAS.filter((lga) => lga.state === state);
}
