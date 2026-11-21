/* origin-map.js — reusable farm-location map (Russell Home Roasting)

   Page needs, before this file:
     leaflet.css, leaflet.js, leaflet-gesture-handling (css + js)
   and origin-map.css.

   Usage:
     const map = OriginMap.render(document.getElementById('origin-map'), coffee);
       coffee = one entry from origins.json, or an array of entries (one pin each;
                entries sharing a location share a pin).
       options (3rd arg): { zoom: 7, openPopup: true }
       Returns the Leaflet map, or null if no entry has coordinates.
       To redraw, call map.remove() first.

   Coordinates are read from lat/lng (also lon, latitude, longitude) at the top
   level of an entry, or inside one nested object such as "location". */

const OriginMap = (() => {
  const COORD_KEYS = ['lat', 'lng', 'lon', 'latitude', 'longitude'];

  function esc(value) {
    return String(value).replace(/[&<>"']/g, c => (
      { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
  }

  function readCoords(obj) {
    if (!obj || typeof obj !== 'object') return null;
    const get = names => {
      const k = Object.keys(obj).find(key => names.includes(key.toLowerCase()));
      const n = k != null ? parseFloat(obj[k]) : NaN;
      return isNaN(n) ? null : n;
    };
    const lat = get(['lat', 'latitude']);
    const lng = get(['lng', 'lon', 'longitude']);
    return (lat != null && lng != null) ? [lat, lng] : null;
  }

  function findCoords(coffee) {
    if (!coffee) return null;
    const top = readCoords(coffee);
    if (top) return top;
    for (const v of Object.values(coffee)) {
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        const nested = readCoords(v);
        if (nested) return nested;
      }
    }
    return null;
  }

  function popupHtml(coffee) {
    const title = coffee.subregion || coffee.region || coffee.country || 'Origin';
    const sub = [coffee.region, coffee.country].filter(x => x && x !== title).join(' · ');
    return `<div class="map-pop-item"><div class="map-pop-title">${esc(title)}</div>` +
           (sub ? `<div class="map-pop-sub">${esc(sub)}</div>` : '') + `</div>`;
  }

  function render(el, coffees, options = {}) {
    if (!el || typeof L === 'undefined') return null;
    const list = (Array.isArray(coffees) ? coffees : [coffees]).filter(Boolean);

    // Group entries that share a location so they share one pin.
    const groups = {};
    list.forEach(c => {
      const coords = findCoords(c);
      if (!coords) return;
      const key = coords.join(',');
      (groups[key] = groups[key] || { coords, items: [] }).items.push(c);
    });
    const pins = Object.values(groups);
    if (!pins.length) return null;

    const map = L.map(el, { gestureHandling: true, worldCopyJump: true });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    const icon = L.divIcon({
      className: '', html: '<div class="origin-pin"></div>',
      iconSize: [14, 14], iconAnchor: [7, 7], popupAnchor: [0, -8]
    });

    const markers = pins.map(g => L.marker(g.coords, { icon, title: g.items[0].region || '' })
      .bindPopup(g.items.map(popupHtml).join(''), { autoClose: false, closeOnClick: false })
      .addTo(map));

    if (pins.length === 1) {
      map.setView(pins[0].coords, options.zoom || 7);
      if (options.openPopup !== false) markers[0].openPopup();   // open by default
    } else {
      map.fitBounds(pins.map(g => g.coords), { padding: [40, 40], maxZoom: 6 });
    }

    setTimeout(() => map.invalidateSize(), 300);
    return map;
  }

  return { render, findCoords, COORD_KEYS };
})();
