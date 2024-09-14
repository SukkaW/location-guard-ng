const $ = window.$;

// Requiring the plugins extends Leaflet automatically
const L = window.L;

// const Browser = require('../common/browser');
// const PlanarLaplace = window.PlanarLaplace;

const locationGuardReady = new Promise((resolve) => {
  if ('$locationGuard' in window && window.$locationGuard.ready) {
    resolve();
  } else {
    window.addEventListener('location-guard-config-ui-ready', resolve, { once: true });
  }

  // eslint-disable-next-line sukka/prefer-timer-id -- safe
  setTimeout(() => {
    if (!('$locationGuard' in window)) {
      window.alert('Location Guard UserScript is missing, please install it first!');
      window.location.assign('https://location-guard-ng.skk.moe');
      resolve();
    }
  }, 1000);
});

// const geocoderKey = '5b3ce3597851110001cf6248dc55f0492abe4923aa33f4ca1722acb8';
// const geocoderUrl = 'https://api.openrouteservice.org/geocode';

let levelMap, fixedPosMap;
// let epsilon;
let activeLevel = 'medium';
const inited = {};
let sliderRadius, sliderCacheTime;

// default pos
let currentPos = {
  latitude: 48.860_141_066_724_41,
  longitude: 2.356_910_705_566_406
};

// slider wrapper class, cause sGlide interface sucks
function Slider(opt) {
  this.opt = opt;
  this.value = opt.min;

  const obj = this;
  $('#' + opt.id).sGlide({
    totalRange: [opt.min, opt.max],
    drag(e) {
      let value = Math.round(e.custom);
      value -= value % opt.step;
      opt.slide(value);
    },
    drop(e) {
      obj.value = Math.round(e.custom);
      obj.value -= obj.value % opt.step;
      opt.change(obj.value);
    }
  });

  this.set = function (value) {
    this.value = value;
    const pct = 100 * (value - opt.min) / (opt.max - opt.min);
    $('#' + opt.id).sGlide('startAt', pct);
  };
}

async function saveOptions() {
  await locationGuardReady;

  window.$locationGuard.setValue('defaultLevel', $('#defaultLevel').val());
  window.$locationGuard.setValue('paused', $('#paused').prop('checked'));

  const updateAccuracy = $('#updateAccuracy').prop('checked');
  if (await window.$locationGuard.getValue('updateAccuracy') !== updateAccuracy) {
    const PlanarLaplace = window.$locationGuard.PlanarLaplace;
    const $epsilon = window.$locationGuard.epsilon;
    const $levels = await window.$locationGuard.getValue('levels');
    const $cachedPos = await window.$locationGuard.getValue('cachedPos');

    // update accuracy of cached positions to reflect the change
    // eslint-disable-next-line guard-for-in -- plain object
    for (const level in $cachedPos) {
      const epsilon = $epsilon / $levels[level].radius;
      $cachedPos[level].position.coords.accuracy // add/remove the .9 accuracy
        += (updateAccuracy ? 1 : -1) * Math.round(PlanarLaplace.alphaDeltaAccuracy(epsilon, .9));
    }

    await window.$locationGuard.setValue('cachedPos', $cachedPos);
    await window.$locationGuard.setValue('updateAccuracy', updateAccuracy);
  }
}

async function saveLevel() {
  await locationGuardReady;
  const $levels = await window.$locationGuard.getValue('levels');
  const $cachedPos = await window.$locationGuard.getValue('cachedPos');

  const radius = sliderRadius.value;
  const ct = sliderCacheTime.value;
  const cacheTime = ct <= 59 ? ct : 60 * (ct - 59);

  updateRadius(radius, true);

  // delete cache for that level if radius changes
  if ($levels[activeLevel].radius !== radius) {
    delete $cachedPos[activeLevel];
  }

  $levels[activeLevel] = {
    radius,
    cacheTime
  };

  await window.$locationGuard.setValue('levels', $levels);
  await window.$locationGuard.setValue('cachedPos', $cachedPos);
}

function initLevelMap() {
  const latlng = [currentPos.latitude, currentPos.longitude];

  // map
  levelMap = L.map('levelMap')
    .addLayer(new L.TileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      { attribution: 'Map data © OpenStreetMap contributors' }
    ))
    .setView(latlng, 13)
    .on('dragstart', () => {
      levelMap.closePopup();
    })
    .on('click', (e) => {
      if (levelMap.popup._isOpen) { // if popup is open, close it
        levelMap.closePopup();
        return;
      }
      handleChangePosEvent(e);
    });

  // marker
  // eslint-disable-next-line new-cap -- third party library
  levelMap.marker = new L.marker(latlng, { draggable: true })
    .addTo(levelMap)
    .on('click', () => {
      showPopup(levelMap);
    })
    .on('drag', handleChangePosEvent);

  // popup
  const popupHtml
    = '<div class="map-popup">'
    + '<p><b>Protection area (red)</b> and <b>accuracy (blue)</b> around some (hypothetical) location.</p>'
    + '<p>Click on the map or drag the marker to change the location. Click on'
    + '<a href="#" id="levelMapCurrentPos" class="popup-location-btn ui-btn ui-btn-inline ui-icon-location ui-btn-icon-notext"></a>'
    + 'to show your current location.</p>'
    + '</div>';

  levelMap.popup = L.popup({
    autoPan: false,
    closeOnClick: false, // we'll close it ourselves
    maxWidth: Math.min($('#levelMap').width() - 50, 300)
  })
    .setContent(popupHtml);

  // circles (accuracy circle first to be on bottom)
  levelMap.accuracy = new L.Circle(latlng, 1500, {
    color: null,
    fillColor: 'blue',
    fillOpacity: 0.4,
    clickable: false
  })
    .addTo(levelMap);

  levelMap.protection = new L.Circle(latlng, 500, {
    color: null,
    fillColor: '#f03',
    fillOpacity: 0.4,
    clickable: false
  })
    .addTo(levelMap);

  // extend the Locate control and override the "start" method, so that it sets the marker to the user's location
  // see https://github.com/domoritz/leaflet-locatecontrol
  //
  const myLocate = L.Control.Locate.extend({
    start: showCurrentPosition
  });
  // eslint-disable-next-line new-cap -- third party library
  new myLocate({
    icon: 'icon-trans ui-btn-icon-notext ui-icon-location', // use jqm's icons to avoid loading
    iconLoading: 'icon-trans ui-btn-icon-notext ui-icon-location' // font awesome
  })
    .addTo(levelMap);

  // geocoder control
  // TODO: use a new key
  // L.control.geocoder(geocoderKey, {
  //   url: geocoderUrl,
  //   markers: false,
  //   autocomplete: false
  // }).on('highlight', handleChangePosEvent)
  //   .on('select', handleChangePosEvent)
  //   .addTo(levelMap);
}

async function initFixedPosMap() {
  await locationGuardReady;

  const $fixedPos = await window.$locationGuard.getValue('fixedPos');
  const latlng = [$fixedPos.latitude, $fixedPos.longitude];

  // eslint-disable-next-line new-cap -- third party library
  fixedPosMap = new L.map('fixedPosMap')
    .addLayer(new L.TileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      { attribution: 'Map data © OpenStreetMap contributors' }
    ))
    .setView(latlng, 14)
    .on('dragstart', () => {
      fixedPosMap.closePopup();
    })
    .on('click', (e) => {
      if (fixedPosMap.popup._isOpen) { // if popup is open, close it
        fixedPosMap.closePopup();
        return;
      }
      saveFixedPos(e.latlng);
    });

  // marker
  // eslint-disable-next-line new-cap -- third party library
  fixedPosMap.marker = new L.marker(latlng, { draggable: true })
    .addTo(fixedPosMap)
    .on('click', () => {
      showPopup(fixedPosMap);
    })
    .on('dragend', (e) => {
      saveFixedPos(e.target._latlng);
    });

  // popup
  const popupHtml
    = '<div class="map-popup">'
    + '<p>This is the location reported when the privacy level is set to <b>"Use fixed location"</b>.</p>'
    + '<p>Click on the map or drag the marker to set a new fixed location.</p>'
    + '</div>';

  fixedPosMap.popup = L.popup({
    autoPan: false,
    closeOnClick: false, // we'll close it ourselves
    maxWidth: Math.min($('#fixedPosMap').width() - 50, 300)
  })
    .setContent(popupHtml);

  showPopup(fixedPosMap);

  // locate control
  L.control.locate({
    drawCircle: false,
    follow: false,
    icon: 'icon-trans ui-btn-icon-notext ui-icon-location', // use jqm's icons to avoid loading
    iconLoading: 'icon-trans ui-btn-icon-notext ui-icon-location' // font awesome
  }).addTo(fixedPosMap);

  // geocoder control
  // L.control.geocoder(geocoderKey, {
  //   url: geocoderUrl,
  //   markers: false,
  //   autocomplete: false
  // }).on('results', function (e) {
  //   // directly set position if the text is a latlon
  //   // eslint-disable-next-line regexp/no-super-linear-backtracking, regexp/no-misleading-capturing-group -- safe
  //   const res = e.params.text.match(/^([+-]?\d+\.\d+)\s*(?:,\s*)?([+-]?\d+\.\d+)$/);
  //   if (!res) return;

  //   const latlng = L.latLng(Number.parseFloat(res[1]), Number.parseFloat(res[2]));
  //   saveFixedPos(latlng);
  //   fixedPosMap.setView(latlng, 14);
  //   this.collapse(); // close the geocoder search
  // }).addTo(fixedPosMap);
}

async function saveFixedPos(latlng) {
  await locationGuardReady;
  const wrapped = latlng.wrap(); // force within normal range
  const $fixedPos = { latitude: wrapped.lat, longitude: wrapped.lng };

  fixedPosMap.marker.setLatLng(latlng);

  await window.$locationGuard.setValue('fixedPos', $fixedPos);
}

async function showLevelInfo() {
  await locationGuardReady;
  const $levels = await window.$locationGuard.getValue('levels');

  // set sliders' value
  const radius = $levels[activeLevel].radius;
  const cacheTime = $levels[activeLevel].cacheTime;
  const ct = cacheTime <= 59 // 0-59 are mins, 60 and higher are hours
    ? cacheTime
    : 59 + Math.floor(cacheTime / 59);

  sliderRadius.set(radius);
  sliderCacheTime.set(ct);

  updateRadius(radius, true);
  updateCache(ct);
}

// change current pos as a reaction to a Leaflet event
function handleChangePosEvent(e) {
  currentPos = { latitude: e.latlng.lat, longitude: e.latlng.lng };
  moveCircles();
}

function moveCircles() {
  const latlng = [currentPos.latitude, currentPos.longitude];

  levelMap.marker.setLatLng(latlng);
  levelMap.protection.setLatLng(latlng);
  levelMap.accuracy.setLatLng(latlng);
}

function showPopup(map) {
  const smallSize = $(map._container).width() < 500 || $(map._container).height() < 450;

  // on small screens we center the popup at the bottom of the map
  // on large screens we open at the marker
  //
  let latlng;
  if (smallSize) {
    const bounds = map.getBounds();
    latlng = bounds.getCenter();
    latlng.lat = bounds.getSouth();
  } else {
    // get pos 30 pixes above the marker
    const pos = map.latLngToLayerPoint(map.marker._latlng);
    pos.y -= 30;
    latlng = map.layerPointToLatLng(pos);
  }

  map.popup
    .setLatLng(latlng)
    .openOn(map);

  // hide popup "arrow" on small screens
  $('.leaflet-popup-tip-container').css({ visibility: (smallSize ? 'hidden' : 'visible') });
}

async function updateRadius(radius, fit) {
  await locationGuardReady;
  const PlanarLaplace = window.$locationGuard.PlanarLaplace;
  const epsilon = window.$locationGuard.epsilon;

  // update radius text and map
  const acc = Math.round(PlanarLaplace.alphaDeltaAccuracy(epsilon / radius, .95));

  moveCircles();

  levelMap.protection.setRadius(radius);
  levelMap.accuracy.setRadius(acc);

  const firstView = !inited.radius;
  inited.radius = true;

  if (fit) levelMap.fitBounds(levelMap.accuracy.getBounds(), { animate: !firstView });

  if (firstView) showPopup(levelMap);

  $('#radius').text(radius);
  $('#accuracy').text(acc);
}

function updateCache(ct) {
  // update cache time text
  const h = ct - 59;

  $('#cacheTime').text(
    ct === 0 ? 'don\'t cache'
      : (ct < 60 ? ct + ' minute' + (ct > 1 ? 's' : '')
        : h + ' hour' + (h > 1 ? 's' : ''))
  );
}

function initPages() {
  $.mobile.ajaxEnabled = false;
  // $.mobile.hideUrlBar = false;
  // $.mobile.defaultPageTransition = "none";

  $(document).on('pagecontainershow', async (e, ui) => {
    const page = ui.toPage[0].id;

    if (inited[page]) {
      // page already inited. only call invalidateSize on maps
      if (page === 'levels') levelMap.invalidateSize();
      if (page === 'fixedPos') fixedPosMap.invalidateSize();
      return;
    }
    inited[page] = true;

    // page initialization
    //
    switch (page) {
      case 'options': {
        await locationGuardReady;
        const $defaultLevel = await window.$locationGuard.getValue('defaultLevel');
        const $paused = await window.$locationGuard.getValue('paused');
        const $updateAccuracy = await window.$locationGuard.getValue('updateAccuracy');

        $('#defaultLevel').val($defaultLevel).selectmenu('refresh');
        $('#paused').prop('checked', $paused).checkboxradio('refresh');
        $('#updateAccuracy').prop('checked', $updateAccuracy).checkboxradio('refresh');

        break;
      }
      case 'levels': {
        sliderRadius = new Slider({
          id: 'setRadius',
          min: 40,
          max: 3000,
          step: 20,
          slide(value) {
            levelMap.closePopup();
            updateRadius(value, false);
          },
          change: saveLevel
        });
        sliderCacheTime = new Slider({
          id: 'setCacheTime',
          min: 0,
          max: 69,
          step: 1,
          slide: updateCache,
          change: saveLevel
        });

        initLevelMap();
        showLevelInfo();

        break;
      }
      case 'fixedPos': {
        initFixedPosMap();

        break;
      }
      default:
        break;
    // No default
    }
  });
}

function showCurrentPosition() {
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      levelMap.closePopup();
      currentPos = pos.coords;
      showLevelInfo(); // moves circles and also centers map
    },
    (err) => {
      console.log('cannot get location', err);
    }
  );
}

async function restoreDefaults() {
  if (window.confirm('Are you sure you want to restore the default options?')) {
    await locationGuardReady;
    await window.$locationGuard.resetConfig();
    location.reload();
  }
}

async function deleteCache() {
  await locationGuardReady;
  await window.$locationGuard.emptyCachedPos();
  window.alert('Location cache was deleted');
}

// set page events before "ready"
//
initPages();

$(document).ready(() => {
  $('#left-panel').panel().enhanceWithin(); // initialize panel

  // open panel on swipe
  $(document).on('swiperight', () => {
    if ($('#left-panel').css('visibility') !== 'visible') {
      // check if already open (manually or due to large screen)
      $('#left-panel').panel('open');
    }
  });

  $('#options input, #options select').change(saveOptions);

  $('#restoreDefaults').click(restoreDefaults);
  $('#deleteCache').click(deleteCache);

  $('#activeLevel a').click((e) => {
    levelMap.closePopup();

    activeLevel = $(e.target).attr('level');
    showLevelInfo();
  });

  $('.reportIssue').click(() => {
    window.open('https://github.com/SukkaW/location-guard-ng/issues', '_blank');
  });

  $(document).on('click', '#levelMapCurrentPos', showCurrentPosition); // this doesn't exist yet (it's inside the popup), so we set in document
});
