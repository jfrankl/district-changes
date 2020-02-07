var state = {};

var map = L.map('map', {
  center: [40.227, -76.585246],
  zoom: 9,
  // zoomSnap: 0,
  attributionControl: true,
  zoomControl: false
});

if (!!navigator.userAgent.match(/Trident\/7\./)) {
  $("#range").hide();
}

map.keyboard.disable();

new L.Control.Zoom({ position: 'bottomleft' }).addTo(map);

_.onceEvery= function(times, func) {
  var orig = times;
  return function() {
    if (--times < 1) {
      times=orig;
      return func.apply(this, arguments);
    }
  };
};

function nth(d) {
  if(d>3 && d<21) return 'th'; // thanks kennebec
  switch (d % 10) {
    case 1:  return "st";
    case 2:  return "nd";
    case 3:  return "rd";
    default: return "th";
  }
}

var playControl = document.getElementById('button-play');
var range = document.getElementById('range');
var time = document.getElementById('time');

var playback = false;
var max = range.max;

var $body = $("body");
var $select = $("#select");

map.createPane('labels');

map.getPane('labels').style.zIndex = 2650;

map.getPane('labels').style.pointerEvents = 'none';

var retinaString = "";
if (L.Browser.retina) {
  retinaString = "@2x";
}

var cartodbAttribution = '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; <a href="https://carto.com/attribution">CARTO</a>';

var positron = L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_nolabels/{z}/{x}/{y}'+retinaString+'.png', {
  attribution: cartodbAttribution
}).addTo(map);

var positronLabels = L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_only_labels/{z}/{x}/{y}'+retinaString+'.png', {
  attribution: cartodbAttribution,
  pane: 'labels'
}).addTo(map);

state.carto = [
  {
    id: "pacd_1951",
    year: 1951,
    color: "#2a5674"
  },
  {
    id: "pacd_1962",
    year: 1962,
    color: "#2a5674"
  },
  {
    id: "pacd_1972",
    year: 1972,
    color: "#2a5674"
  },
  {
    id: "pacd_1982",
    year: 1982,
    color: "#2a5674"
  },
  {
    id: "pacd_1992",
    year: 1992,
    color: "#2a5674"
  },
  {
    id: "pacd_2002",
    year: 2002,
    color: "#2a5674"
  },
  {
    id: "pacd_2011",
    year: 2011,
    color: "#2a5674"
  },
  {
    id: "pacd_2019",
    year: 2019,
    color: "#2a5674"
  },
];

state.layerGroup = L.layerGroup([]).addTo(map);

var countLoadedDistrict = _.onceEvery(state.carto.length, function(){
  range.value = 7;
  state.layerGroup.clearLayers();
  state.layerGroup.addLayer(state.carto[7].layer);
  map.flyToBounds(state.carto[7].layer, { padding: [10, 10] });
  generateButtons();
  onYearChange();
});

var loadData = function(nice) {
  _.each(state.carto, function(carto, key) {
    var temp = $.getJSON("https://jefffrankl.carto.com:443/api/v2/sql?format=GeoJSON&q=SELECT the_geom FROM "+carto.id+" WHERE district_number in ("+nice+")", function(a) {
      var layers = L.geoJson(a, {color: carto.color, strokeOpacity: 1, fillOpacity: 0.1, weight: 5});
      state.carto[key].layer = layers;
      carto.isThere = a.features.length;
      countLoadedDistrict();
    });
  })
}

var onDistrictButtonClick = function() {
  range.value = $(this).data('id');
  onYearChange();
  if (playback) clearPlayback();
}

var generateButtons = function() {
  var buttonsHtml = "";
    _.each(state.carto, function(carto, key) {
      var hasData = "";
      if (carto.isThere === 0) hasData = " disabled "
      buttonsHtml += "<button"+hasData+" data-id='"+key+"'>"+carto.year+"</button>";
    });
  $("#buttons-year").html(buttonsHtml);

  $buttons = $("#buttons-year button");

  $buttons.click(onDistrictButtonClick);
}

loadData(1);

var districts = _.range(1, 30, 1);

var selectHtml = "<select id='select-district'>";
_.each(districts, function(districtNumber) {
  selectHtml += "<option value='"+districtNumber+"'>"+districtNumber+nth(districtNumber)+" Congressional District"+"</option>";
})
selectHtml += "</select>";
$select.html(selectHtml);

$('#select-district').selectize({
    onChange: function() {
      loadData(this.items[0]);
      if (playback) clearPlayback();
    }
});

// Keyboard controls

$body.keydown(function(e) {
  if(e.keyCode == 37) { // left
    var previousValue = parseInt(range.value) - 1;
    if ((previousValue >= 0) && (state.carto[previousValue].isThere)) {
      range.value--;
      onYearChange();
    }
  }
  else if(e.keyCode == 39) { // right
    var nextValue = parseInt(range.value) + 1;
    if ((nextValue <= max) && (state.carto[nextValue].isThere)) {
      range.value++;
      onYearChange();
    }
  }
});


playControl.addEventListener('click', setPlay);

var onYearChange = function() {
  loadStuff(range.value);
  $buttons.removeClass('active');
  var $activeButton = $buttons.filter(function(e) {
    return e.toString() === range.value.toString();
  });
  $activeButton.addClass('active');
}

var onInput = function() {
  if (playback) clearPlayback();
  if (state.carto[range.value].isThere) onYearChange();
}

range.addEventListener('input', onInput);

var loadStuff = function(stuff) {
  time.innerHTML = state.carto[stuff].year;
  state.layerGroup.clearLayers();
  var bounds = state.carto[stuff].layer.getBounds();
  map.flyToBounds(bounds, { padding: [10, 10] });
  state.layerGroup.addLayer(state.carto[stuff].layer);
}

var play = function(v) {
  range.value = v;
  max = parseInt(range.max)+1;
  if (v === max) {
    range.value = 0;
    loadStuff(0);
  }
  else {
    loadStuff(v);
  }
  onYearChange();
}

function clearPlayback() {
  window.clearInterval(playback);
  playControl.classList.remove('pause');
  playControl.classList.add('play');
  playback = false;
}

function setPlay() {
  if (playback) return clearPlayback();
  playControl.classList.remove('play');
  playControl.classList.add('pause');
  playback = window.setInterval(function() {
    var value = parseInt(range.value, 10);
    play(value + 1);
  }, 1000);
}
