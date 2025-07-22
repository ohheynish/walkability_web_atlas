import * as pmtiles from "pmtiles";
import * as maplibregl from "maplibre-gl";

const walkabilityColors = [
  1, "#d73027", 2, "#f46d43", 3, "#fdae61", 4, "#fee08b", 5, "#ffffbf",
  6, "#d9ef8b", 7, "#a6d96a", 8, "#66bd63", 9, "#1a9850", 10, "#006837"
];

const dou_labels = {
  11: "Very low density rural", 12: "Low density rural", 13: "Rural cluster",
  21: "Suburban or peri-urban", 22: "Semi-dense urban cluster",
  23: "Dense urban cluster", 30: "Urban centre"
};

const douColors = [
  11, "#cdf57a", 12, "#abcd66", 13, "#375623",
  21, "#ffff00", 22, "#a87000", 23, "#732600", 30, "#ff0000"
];

const protocol = new pmtiles.Protocol();
maplibregl.addProtocol("pmtiles", protocol.tile.bind(protocol));

// PMTiles Sources
const pmtilesUrlLau = "pmtiles://https://storage.googleapis.com/tileserve-nishit/lau_walk.pmtiles";
const pmtilesUrlCities = "pmtiles://https://storage.googleapis.com/tileserve-nishit/test_t_20_units.pmtiles";
const pmtilesUrlNuts3 = "pmtiles://https://storage.googleapis.com/tileserve-nishit/nuts3_walk.pmtiles";

const map = new maplibregl.Map({
  container: "map",
  style: {
    version: 8,
    sources: {
      osm: {
        type: "raster",
        tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
        tileSize: 256
      },
      satellite: {
        type: "raster",
        tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
        tileSize: 256
      },
      lau_walk: { type: "vector", url: pmtilesUrlLau },
      cities: { type: "vector", url: pmtilesUrlCities },
      nuts3_walk: { type: "vector", url: pmtilesUrlNuts3 }
    },
    layers: [
      {
        id: "osm-layer",
        type: "raster",
        source: "osm",
        paint: { "raster-opacity": 1 }
      },
      {
        id: "satellite-layer",
        type: "raster",
        source: "satellite",
        paint: { "raster-opacity": 1 }
      },
      {
        id: "nuts3-walk-fill",
        type: "fill",
        source: "nuts3_walk",
        "source-layer": "nuts3_walk_4326",
        paint: {
          "fill-color": ["match", ["get", "walk_decile"], ...walkabilityColors, "#cccccc"],
          "fill-outline-color": "#000",
          "fill-opacity": 0.8
        }
      },
      {
        id: "lau-walk-fill",
        type: "fill",
        source: "lau_walk",
        "source-layer": "lau_walk_4326",
        paint: {
          "fill-color": ["match", ["get", "walk_decile"], ...walkabilityColors, "#cccccc"],
          "fill-outline-color": "#000",
          "fill-opacity": 0.8
        }
      },
      {
        id: "cities-walk-fill",
        type: "fill",
        source: "cities",
        "source-layer": "test_t_20_units_4326",
        paint: {
          "fill-color": ["match", ["get", "walk_decile"], ...walkabilityColors, "#cccccc"],
          "fill-outline-color": "#000",
          "fill-opacity": 0.8
        }
      },
      {
        id: "cities-dou-fill",
        type: "fill",
        source: "cities",
        "source-layer": "test_t_20_units_4326",
        paint: {
          "fill-color": ["match", ["get", "dou"], ...douColors, "#cccccc"],
          "fill-outline-color": "#000",
          "fill-opacity": 0.8
        }
      },
    ]
  },
  center: [0, 0],
  zoom: 2
});

// Interactions
map.on("click", (e) => {
  const zoom = map.getZoom();

  let targetLayer = null;

  if (zoom < 6) {
    targetLayer = "nuts3-walk-fill";
  } else if (zoom < 15) {
    targetLayer = "lau-walk-fill";
  } else {
    targetLayer = "cities-walk-fill"; // includes DOU info
  }

  const features = map.queryRenderedFeatures(e.point, { layers: [targetLayer] });
  if (!features.length) return;

  const feature = features[0];
  const props = feature.properties;
  let html = "";

  switch (targetLayer) {
    case "nuts3-walk-fill":
      html = `
        <b>NUTS3 Region:</b> ${props.NUTS_NAME || "Unknown"}<br>
        <b>Walkability Decile:</b> ${props.walk_decile}
      `;
      break;
    case "lau-walk-fill":
      html = `
        <b>Location:</b> ${props.LAU_NAME || "Unknown"}<br>
        <b>Walkability Decile:</b> ${props.walk_decile}
      `;
      break;
    case "cities-walk-fill":
      const dou = props.dou;
      const douLabel = dou_labels[dou] || "Unknown";
      html = `
        <b>Walkability Decile:</b> ${props.walk_decile}<br>
        <b>Degree of Urbanization:</b> ${douLabel} (${dou})
      `;
      break;
  }

  new maplibregl.Popup()
    .setLngLat(e.lngLat)
    .setHTML(html)
    .addTo(map);
});

// toggles & sliders
const layerControls = [
  { id: "osm", layer: "osm-layer", prop: "raster-opacity" },
  { id: "satellite", layer: "satellite-layer", prop: "raster-opacity" },
  { id: "lau", layer: "lau-walk-fill", prop: "fill-opacity" },
  { id: "cities-walk", layer: "cities-walk-fill", prop: "fill-opacity" },
  { id: "cities-dou", layer: "cities-dou-fill", prop: "fill-opacity" },
  { id: "nuts3", layer: "nuts3-walk-fill", prop: "fill-opacity" }
];

layerControls.forEach(({ id, layer, prop }) => {
  const opacitySlider = document.getElementById(`${id}-opacity`);
  const toggleCheckbox = document.getElementById(`${id}-toggle`);

  if (opacitySlider) {
    opacitySlider.addEventListener("input", (e) => {
      const value = parseFloat(e.target.value);
      map.setPaintProperty(layer, prop, value);
    });
  }

  if (toggleCheckbox) {
    toggleCheckbox.addEventListener("change", (e) => {
      const visible = e.target.checked;
      map.setLayoutProperty(layer, "visibility", visible ? "visible" : "none");
    });
  }
});

// search
document.getElementById("searchBtn").addEventListener("click", async () => {
  const query = document.getElementById("searchBox").value;
  if (!query) return;
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
    const results = await res.json();
    if (results.length > 0) {
      const { lat, lon } = results[0];
      map.flyTo({ center: [parseFloat(lon), parseFloat(lat)], zoom: 10 });
    } else {
      alert("Location not found.");
    }
  } catch (err) {
    console.error(err);
    alert("Search failed.");
  }
});
