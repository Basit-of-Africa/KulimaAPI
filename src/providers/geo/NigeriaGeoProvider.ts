import type { GeoProvider, GeoLocation, GeoBoundary } from './GeoProvider.js';
import { createChildLogger } from '../../logger.js';

const log = createChildLogger('nigeria-geo');

/**
 * Nigeria GeoProvider — resolves Nigerian locations by name or coordinates.
 *
 * Phase 1 implementation uses a lightweight dataset of major Nigerian states,
 * LGAs and cities. This can be swapped for a full PostGIS-backed dataset later.
 */

const NIGERIAN_STATES: Record<string, { lat: number; lng: number; lgas?: string[] }> = {
  'Abia': { lat: 5.1, lng: 7.5, lgas: ['Aba North', 'Aba South', 'Isiala Ngwa North', 'Isiala Ngwa South', 'Obi Ngwa', 'Ohafia', 'Osisioma', 'Ugwunagbo', 'Ukwa East', 'Ukwa West', 'Umuahia North', 'Umuahia South', 'Umu Nneochi'] },
  'Adamawa': { lat: 9.3, lng: 12.4, lgas: ['Demsa', 'Fufure', 'Ganye', 'Girei', 'Gombi', 'Hong', 'Jada', 'Lamurde', 'Madagali', 'Maiha', 'Mayo Belwa', 'Michika', 'Mubi North', 'Mubi South', 'Numan', 'Shelleng', 'Song', 'Toungo', 'Yola North', 'Yola South'] },
  'Akwa Ibom': { lat: 5.0, lng: 7.9, lgas: ['Abak', 'Eastern Obolo', 'Eket', 'Esit Eket', 'Essien Udim', 'Etim Ekpo', 'Etinan', 'Ibeno', 'Ibesikpo Asutan', 'Ibiono Ibom', 'Ika', 'Ikono', 'Ikot Abasi', 'Ikot Ekpene', 'Ini', 'Itu', 'Mbo', 'Mkpat Enin', 'Nsit Atai', 'Nsit Ibom', 'Nsit Ubium', 'Obot Akara', 'Okobo', 'Onna', 'Oron', 'Oruk Anam', 'Udung Uko', 'Ukanafun', 'Uren', 'Uruan', 'Urue Offong Oruko', 'Uyo'] },
  'Anambra': { lat: 6.2, lng: 6.9, lgas: ['Aguata', 'Anambra East', 'Anambra West', 'Anaocha', 'Awka North', 'Awka South', 'Ayamelum', 'Dunukofia', 'Ekwusigo', 'Idemili North', 'Idemili South', 'Ihiala', 'Njikoka', 'Nnewi North', 'Nnewi South', 'Ogbaru', 'Onitsha North', 'Onitsha South', 'Orumba North', 'Orumba South', 'Oyi'] },
  'Bauchi': { lat: 10.3, lng: 9.8, lgas: ['Alkaleri', 'Bauchi', 'Bogoro', 'Dass', 'Darazo', 'Gamawa', 'Ganjuwa', 'Giade', 'Itas/Gadau', 'Jama\'are', 'Katagum', 'Kirfi', 'Misau', 'Ningi', 'Shira', 'Tafawa Balewa', ' Toro', ' Warji', ' Zaki'] },
  'Bayelsa': { lat: 6.3, lng: 4.7, lgas: ['Brass', 'Ekeremor', 'Kolokuma/Opokuma', 'Nembe', 'Ogbia', 'Sagbama', 'Southern Ijaw', 'Yenagoa'] },
  'Benue': { lat: 7.7, lng: 8.5, lgas: ['Agatu', 'Apa', 'Ado', 'Buruku', 'Gboko', 'Guma', 'Gwer East', 'Gwer West', 'Katsina-Ala', 'Konshisha', 'Kwande', 'Logo', 'Makurdi', 'Obi', 'Ogbadibo', 'Ohimini', 'Oju', 'Okpokwu', 'Oturkpo', 'Tarka', 'Ukum', 'Ushongo', 'Vandeikya'] },
  'Borno': { lat: 11.8, lng: 13.2, lgas: ['Abadam', 'Askira/Uba', 'Bama', 'Bayo', 'Biu', 'Chibok', 'Damboa', 'Dikwa', 'Gubio', 'Guzamala', 'Gwoza', 'Hubba', 'Jere', 'Kaga', 'Kala/Balge', 'Konduga', 'Kukawa', 'Kwaya Kusar', 'Mafa', 'Magumeri', 'Maiduguri', 'Marte', 'Mobbar', 'Monguno', 'Ngala', 'Nganzai', 'Shani'] },
  'Cross River': { lat: 5.9, lng: 8.3, lgas: ['Abi', 'Akamkpa', 'Akpabuyo', 'Bakassi', 'Bekwarra', 'Biase', 'Boki', 'Calabar Municipal', 'Calabar South', 'Etung', 'Ikom', 'Obanliku', 'Obudu', 'Odukpani', 'Ogoja', 'Yakuur', 'Yala'] },
  'Delta': { lat: 5.5, lng: 5.7, lgas: ['Aniocha North', 'Aniocha South', 'Bomadi', 'Burutu', 'Ethiope East', 'Ethiope West', 'Ika North East', 'Ika South', 'Isoko North', 'Isoko South', 'Ndokwa East', 'Ndokwa West', 'Okpe', 'Oshimili North', 'Oshimili South', 'Patani', 'Sapele', 'Udu', 'Ughelli North', 'Ughelli South', 'Ukwuani', 'Uvwie', 'Warri North', 'Warri South', 'Warri South West'] },
  'Ebonyi': { lat: 6.3, lng: 8.0, lgas: ['Abakaliki', 'Afikpo North', 'Afikpo South', 'Ebonyi', 'Ezza North', 'Ezza South', 'Ikwo', 'Ishielu', 'Ivo', 'Izzi', 'Ohaozara', 'Ohaukwu', 'Onicha'] },
  'Edo': { lat: 6.3, lng: 5.6, lgas: ['Akoko-Edo', 'Egor', 'Esan Central', 'Esan North-East', 'Esan South-East', 'Esan West', 'Etsako Central', 'Etsako East', 'Etsako West', 'Igueben', 'Ikpoba-Okha', 'Oredo', 'Orhionmwon', 'Ovia North-East', 'Ovia South-West', 'Owan East', 'Owan West', 'Uhunmwonde'] },
  'Ekiti': { lat: 7.6, lng: 5.2, lgas: ['Ado Ekiti', 'Efon', 'Ekiti East', 'Ekiti South-West', 'Ekiti West', 'Emure', 'Gbonyin', 'Ido Osi', 'Ijero', 'Ikere', 'Ikole', 'Ilejemeje', 'Irepodun/Ifelodun', 'Ise/Orun', 'Moba', 'Oye'] },
  'Enugu': { lat: 6.4, lng: 7.5, lgas: ['Aninri', 'Awgu', 'Enugu East', 'Enugu North', 'Enugu South', 'Ezeagu', 'Igbo Etiti', 'Igbo Eze North', 'Igbo Eze South', 'Isi Uzo', 'Nkanu East', 'Nkanu West', 'Nsukka', 'Oji River', 'Udenu', 'Udi', 'Uzo-Uwani'] },
  'FCT': { lat: 9.1, lng: 7.5, lgas: ['Abaji', 'Bwari', 'Gwagwalada', 'Kuje', 'Kwali', 'Municipal Area Council'] },
  'Gombe': { lat: 10.3, lng: 11.2, lgas: ['Akko', 'Balanga', 'Billiri', 'Dukku', 'Funakaye', 'Gombe', 'Kaltungo', 'Kwami', 'Nafada', 'Shongom', 'Tumba', 'Yamaltu/Deba'] },
  'Imo': { lat: 5.5, lng: 7.0, lgas: ['Ahiazu Mbaise', 'Ehime Mbano', 'Ezinihitte', 'Ideato North', 'Ideato South', 'Ihitte Uboma', 'Ikeduru', 'Isu', 'Mbaitoli', 'Ngo Okwa/Ngor Okpala', 'Njaba', 'Nkwerre', 'Nwangele', 'Obowo', 'Oguta', 'Ohaji/Egbema', 'Okigwe', 'Onuimo', 'Orlu', 'Orsu', 'Oru East', 'Oru West', 'Owerri Municipal', 'Owerri North', 'Owerri West', 'Unuimo'] },
  'Jigawa': { lat: 12.2, lng: 9.3, lgas: ['Auyo', 'Babura', 'Biriniwa', 'Birnin Kudu', 'Buji', 'Dutse', 'Garki', 'Gumel', 'Guri', 'Gwaram', 'Gwiwa', 'Hadejia', 'Jahun', 'Kafin Hausa', 'Kaugama', 'Kazaure', 'Kiri Kasama', 'Maigatari', 'Malam Madori', 'Miga', 'Roni', 'Sule Tankarkar', 'Taura', 'Yankwashi'] },
  'Kaduna': { lat: 10.5, lng: 7.4, lgas: ['Birnin Gwari', 'Chikun', 'Giwa', 'Igabi', 'Ikara', 'Jaba', 'Jema\'a', 'Kachia', 'Kaduna North', 'Kaduna South', 'Kagarko', 'Kajuru', 'Kaura', 'Kauru', 'Kubau', 'Kudan', 'Lere', 'Makarfi', 'Sabon Gari', 'Sanga', 'Soba', 'Zangon-Kataf', 'Zaria'] },
  'Kano': { lat: 12.0, lng: 8.5, lgas: ['Ajingi', 'Albasu', 'Bagwai', 'Bebeji', 'Bichi', 'Bunkure', 'Dala', 'Dambatta', 'Dawakin Kudu', 'Dawakin Tofa', 'Doguwa', 'Fagge', 'Gabasawa', 'Garko', 'Garum Mallam', 'Gaya', 'Gezawa', 'Gwale', 'Gwarzo', 'Kabo', 'Kano Municipal', 'Karaye', 'Kibiya', 'Kiru', 'Kumbotso', 'Kunchi', 'Kura', 'Madobi', 'Makoda', 'Minjibir', 'Nasarawa', 'Rano', 'Rimin Gado', 'Shanono', 'Sumaila', 'Takai', 'Tarauni', 'Tofa', 'Tudun Wada', 'Ungogo', 'Warawa', 'Wudil'] },
  'Katsina': { lat: 12.9, lng: 7.6, lgas: ['Batagarawa', 'Batsari', 'Baure', 'Bindawa', 'Charanchi', 'Dandume', 'Danja', 'Dan Musa', 'Daura', 'Dutsin-Ma', 'Faskari', 'Funtua', 'Ingawa', 'Jibia', 'Kafur', 'Kaita', 'Kankara', 'Kankia', 'Katsina', 'Kurfi', 'Kusada', 'Mai\'Adua', 'Malumfashi', 'Mani', 'Mashi', 'Matazu', 'Musawa', 'Rimi', 'Sabuwa', 'Safana', 'Sandamu', 'Zango'] },
  'Kebbi': { lat: 12.4, lng: 4.2, lgas: ['Aleiro', 'Arewa Dandi', 'Argungu', 'Augie', 'Bagudo', 'Birnin Kebbi', 'Bunza', 'Dandi', 'Fakai', 'Gwandu', 'Jega', 'Kalgo', 'Koko/Besse', 'Maiyama', 'Ngaski', 'Shanga', 'Sakaba', 'Suru', 'Wasagu/Danko', 'Yauri', 'Zuru'] },
  'Kogi': { lat: 7.8, lng: 6.7, lgas: ['Adavi', 'Ajaokuta', 'Ankpa', 'Bassa', 'Dekina', 'Ibaji', 'Idah', 'Igalamela Odolu', 'Ijumu', 'Kabba/Bunu', 'Kogi', 'Lokoja', 'Mopa-Muro', 'Ofu', 'Ogori/Magongo', 'Okehi', 'Okene', 'Olamabolo', 'Omala', 'Yagba East', 'Yagba West'] },
  'Kwara': { lat: 8.5, lng: 4.6, lgas: ['Asa', 'Baruten', 'Edu', 'Ekiti', 'Ifelodun', 'Ilorin East', 'Ilorin South', 'Ilorin West', 'Irepodun', 'Isin', 'Kaiama', 'Moro', 'Offa', 'Oke-Ero', 'Oyun', 'Pategi'] },
  'Lagos': { lat: 6.5, lng: 3.4, lgas: ['Agege', 'Ajeromi-Ifelodun', 'Alimosho', 'Amuwo-Odofin', 'Apapa', 'Badagry', 'Epe', 'Eti-Osa', 'Ibeju-Lekki', 'Ikeja', 'Ikorodu', 'Kosofe', 'Lagos Island', 'Lagos Mainland', 'Mushin', 'Ojo', 'Oshodi-Isolo', 'Shomolu', 'Surulere'] },
  'Nasarawa': { lat: 8.3, lng: 8.5, lgas: ['Akwanga', 'Awe', 'Doma', 'Karu', 'Keana', 'Keffi', 'Kokona', 'Lafia', 'Nasarawa', 'Nasarawa-Eggon', 'Obi', 'Toto', 'Wamba'] },
  'Niger': { lat: 9.6, lng: 6.6, lgas: ['Agaie', 'Agwara', 'Bida', 'Borgu', 'Bosso', 'Chanchaga', 'Edati', 'Gbako', 'Gurara', 'Katcha', 'Kontagora', 'Lapai', 'Lavun', 'Magama', 'Mariga', 'Mashegu', 'Mokwa', 'Muya', 'Paikoro', 'Rafi', 'Rijau', 'Shiroro', 'Suleja', 'Tafa', 'Wushishi'] },
  'Ogun': { lat: 7.2, lng: 3.3, lgas: ['Abeokuta North', 'Abeokuta South', 'Ado-Odo/Ota', 'Ewekoro', 'Ifo', 'Ijebu East', 'Ijebu North', 'Ijebu North-East', 'Ijebu-Ode', 'Ikenne', 'Imeko-Afon', 'Ipokia', 'Obafemi-Owode', 'Odeda', 'Odogbolu', 'Ogun Waterside', 'Remo North', 'Sagamu', 'Shagamu'] },
  'Ondo': { lat: 7.3, lng: 5.2, lgas: ['Akoko North-East', 'Akoko North-West', 'Akoko South-East', 'Akoko South-West', 'Akure North', 'Akure South', 'Ese-Odo', 'Idanre', 'Ifedore', 'Ilaje', 'Ile-Oluji/Okeigbo', 'Irele', 'Odigbo', 'Okitipupa', 'Ondo East', 'Ondo West', 'Ose', 'Owo'] },
  'Osun': { lat: 7.6, lng: 4.6, lgas: ['Atakumosa East', 'Atakumosa West', 'Ayedaade', 'Ayedire', 'Boluwaduro', 'Boripe', 'Ede North', 'Ede South', 'Egbedore', 'Ejigbo', 'Ife Central', 'Ife East', 'Ife North', 'Ife South', 'Ifedayo', 'Ifelodun', 'Ila', 'Ilesa East', 'Ilesa West', 'Irepodun', 'Irewole', 'Isokan', 'Itesuwaju', 'Iwo', 'Obokun', 'Odo-Otin', 'Ola-Oluwa', 'Olorunda', 'Oriade', 'Orolu', 'Osogbo'] },
  'Oyo': { lat: 8.0, lng: 4.0, lgas: ['Afijio', 'Akinyele', 'Atiba', 'Atigbo', 'Egbeda', 'Ibadan North', 'Ibadan North-East', 'Ibadan North-West', 'Ibadan South-East', 'Ibadan South-West', 'Ibarapa Central', 'Ibarapa East', 'Ibarapa North', 'Ido', 'Irepo', 'Iseyin', 'Itesiwaju', 'Iwajowa', 'Lagelu', 'Ogo-Oluwa', 'Ogbomosho North', 'Ogbomosho South', 'Olorunsogo', 'Oluyole', 'Ona Ara', 'Orelope', 'Ori Ire', 'Oyo East', 'Oyo West', 'Saki East', 'Saki West', 'Surulere'] },
  'Plateau': { lat: 9.9, lng: 8.9, lgas: ['Barkin Ladi', 'Bassa', 'Bokkos', 'Jos East', 'Jos North', 'Jos South', 'Kanam', 'Kanke', 'Langtang North', 'Langtang South', 'Mangu', 'Mikang', 'Pankshin', 'Qua\'an Pan', 'Riyom', 'Shendam', 'Wase'] },
  'Rivers': { lat: 4.8, lng: 7.0, lgas: ['Abua/Odual', 'Ahoada East', 'Ahoada West', 'Akuku-Toru', 'Andoni', 'Asari-Toru', 'Bonny', 'Degema', 'Emohua', 'Eleme', 'Etche', 'Gokana', 'Ikwerre', 'Khana', 'Obio/Akpor', 'Ogba/Egbema/Ndoni', 'Ogu/Bolo', 'Okrika', 'Omuma', 'Opobo/Nkoro', 'Oyigbo', 'Port Harcourt', 'Tai'] },
  'Sokoto': { lat: 13.1, lng: 5.2, lgas: ['Binji', 'Bodinga', 'Dange-Shuni', 'Gada', 'Goronyo', 'Gudu', 'Gwadabawa', 'Illela', 'Isa', 'Kebbe', 'Kware', 'Rabah', 'Sabon Birni', 'Shagari', 'Silame', 'Sokoto North', 'Sokoto South', 'Tambuwal', 'Tangaza', 'Tureta', 'Wamako', 'Wurno', 'Yabo'] },
  'Taraba': { lat: 7.9, lng: 10.8, lgas: ['Ardo Kola', 'Bali', 'Donga', 'Gashaka', 'Gassol', 'Ibi', 'Jalingo', 'Karim Lamido', 'Kurmi', 'Lau', 'Sardauna', 'Takum', 'Ussa', 'Wukari', 'Yorro', 'Zing'] },
  'Yobe': { lat: 12.3, lng: 11.0, lgas: ['Bade', 'Bursari', 'Damaturu', 'Fika', 'Fune', 'Geidam', 'Gujba', 'Gulani', 'Jakusko', 'Karasuwa', 'Machina', 'Nangere', 'Nguru', 'Potiskum', 'Tarmuwa', 'Yunusari', 'Yusufari'] },
  'Zamfara': { lat: 12.2, lng: 6.7, lgas: ['Anka', 'Bakura', 'Birnin Magaji/Kiyaw', 'Bukkuyum', 'Bungudu', 'Gummi', 'Gusau', 'Isah', 'Kaura Namoda', 'Kiyawa', 'Maradun', 'Maru', 'Shinkafi', 'Talata Mafara', 'Tsafe', 'Zurmi'] },
};

// Fallback list for quick name lookups
const STATE_NAMES = Object.keys(NIGERIAN_STATES);

export class NigeriaGeoProvider implements GeoProvider {
  name = 'nigeria-geo';
  private available = true;

  isAvailable(): boolean {
    return this.available;
  }

  async resolveLocation(query: string): Promise<GeoLocation | null> {
    const normalised = query.trim().toLowerCase();

    // Direct state match
    for (const state of STATE_NAMES) {
      if (state.toLowerCase() === normalised) {
        const data = NIGERIAN_STATES[state];
        return {
          name: state,
          country: 'Nigeria',
          state,
          latitude: data.lat,
          longitude: data.lng,
          timezone: 'Africa/Lagos',
          locationType: 'state',
        };
      }
    }

    // Partial match — e.g. "Lagos" matches "Lagos"
    for (const state of STATE_NAMES) {
      if (state.toLowerCase().includes(normalised) || normalised.includes(state.toLowerCase())) {
        const data = NIGERIAN_STATES[state];
        return {
          name: state,
          country: 'Nigeria',
          state,
          latitude: data.lat,
          longitude: data.lng,
          timezone: 'Africa/Lagos',
          locationType: 'state',
        };
      }
    }

    // LGA match
    for (const state of STATE_NAMES) {
      const lgas = NIGERIAN_STATES[state].lgas || [];
      for (const lga of lgas) {
        if (lga.toLowerCase().includes(normalised) || normalised.includes(lga.toLowerCase())) {
          return {
            name: `${lga}, ${state}`,
            country: 'Nigeria',
            state,
            lga,
            latitude: NIGERIAN_STATES[state].lat,
            longitude: NIGERIAN_STATES[state].lng,
            timezone: 'Africa/Lagos',
            locationType: 'lga',
          };
        }
      }
    }

    log.debug({ query }, 'No location found');
    return null;
  }

  async reverseGeocode(latitude: number, longitude: number): Promise<GeoLocation | null> {
    // Simple nearest-state lookup (by haversine distance)
    let closest = '';
    let minDist = Infinity;

    for (const state of STATE_NAMES) {
      const data = NIGERIAN_STATES[state];
      const dist = Math.sqrt(
        Math.pow(data.lat - latitude, 2) + Math.pow(data.lng - longitude, 2)
      );
      if (dist < minDist) {
        minDist = dist;
        closest = state;
      }
    }

    if (!closest) return null;

    const data = NIGERIAN_STATES[closest];
    return {
      name: closest,
      country: 'Nigeria',
      state: closest,
      latitude: data.lat,
      longitude: data.lng,
      timezone: 'Africa/Lagos',
      locationType: 'state',
    };
  }

  async getBoundary(_name: string, _type: 'state' | 'lga' | 'ward'): Promise<GeoBoundary | null> {
    // Stub — will be populated with actual GeoJSON data in a later phase
    log.warn('getBoundary not yet implemented — returning null');
    return null;
  }
}
