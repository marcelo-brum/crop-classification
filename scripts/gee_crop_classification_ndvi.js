// =========================================================
// Project: Crop Classification using NDVI (Soybean & Maize)
// Location: Santa Maria - RS, Brazil
// Data: Sentinel-2 + MapBiomas
// Platform: Google Earth Engine
// Method: Rule-based phenological classification (no ML)
// Author: Marcelo Lovato Brum
// =========================================================

// =========================================================
// 0. Area of Interest (AOI)
// =========================================================
var aoi = ee.FeatureCollection(
  'projects/ee-marcelolvtb/assets/Santa_Maria_RS_WGS84'
);

// =========================================================
// 1. Agricultural mask from MapBiomas (10 m)
// Class 19 = temporary crops
// =========================================================
var mb = ee.Image(
  'projects/ee-marcelolvtb/assets/mapbiomas_10m_collection2_integration_v1-classification_2023'
);

var agri = mb.eq(19).clip(aoi);

// =========================================================
// 2. NDVI function (Sentinel-2)
// Cloud masking based on QA60 band
// =========================================================
function ndviS2(img){
  var qa = img.select('QA60');
  var mask = qa.bitwiseAnd(1 << 10).eq(0)
               .and(qa.bitwiseAnd(1 << 11).eq(0));

  return img.updateMask(mask)
    .divide(10000)
    .normalizedDifference(['B8', 'B4'])
    .rename('NDVI');
}

// =========================================================
// 3. Monthly NDVI composites
// =========================================================
function ndviMonth(year, month){
  var start = ee.Date.fromYMD(year, month, 1);
  var end   = start.advance(1, 'month');

  return ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filterBounds(aoi)
    .filterDate(start, end)
    .map(ndviS2)
    .mean()
    .clip(aoi);
}

var ndvi_dec = ndviMonth(2023, 12).rename('NDVI_dec');
var ndvi_jan = ndviMonth(2024,  1).rename('NDVI_jan');
var ndvi_feb = ndviMonth(2024,  2).rename('NDVI_feb');

// =========================================================
// 4. NDVI temporal stack (agricultural areas only)
// =========================================================
var stack = ndvi_dec
  .addBands([ndvi_jan, ndvi_feb])
  .updateMask(agri);

// =========================================================
// 5. Phenological rules (simplified)
// =========================================================

// Maize: early NDVI peak
var maize = stack.select('NDVI_jan')
  .gte(stack.select('NDVI_feb'))
  .and(stack.select('NDVI_jan')
  .gte(stack.select('NDVI_dec')))
  .and(stack.select('NDVI_jan').gte(0.45));

// Soybean: late NDVI peak
var soybean = stack.select('NDVI_feb')
  .gt(stack.select('NDVI_jan'))
  .and(stack.select('NDVI_feb').gte(0.45));

// =========================================================
// 6. Final crop map
// 1 = soybean | 2 = maize
// =========================================================
var crop = ee.Image(0)
  .where(soybean, 1)
  .where(maize,   2)
  .updateMask(soybean.or(maize))
  .clip(aoi)
  .rename('crop');

// =========================================================
// 7. Visualization
// =========================================================
Map.centerObject(aoi, 10);

Map.addLayer(
  crop,
  {min: 1, max: 2, palette: ['#228B22', '#FFD700']},
  'Soybean (green) | Maize (yellow) — NDVI'
);

Map.addLayer(aoi, {color: 'red'}, 'Santa Maria boundary');

// =========================================================
// 8. Area estimation (hectares)
// =========================================================

// Pixel area image
var pixelArea = ee.Image.pixelArea();

// Crop masks
var soybeanMask = crop.eq(1);
var maizeMask   = crop.eq(2);

// Soybean area (m² → ha)
var areaSoybean = soybeanMask
  .multiply(pixelArea)
  .reduceRegion({
    reducer: ee.Reducer.sum(),
    geometry: aoi,
    scale: 30,        // 30 m used due to GEE processing constraints
    maxPixels: 1e13
  })
  .getNumber('crop')
  .divide(10000);

// Maize area (m² → ha)
var areaMaize = maizeMask
  .multiply(pixelArea)
  .reduceRegion({
    reducer: ee.Reducer.sum(),
    geometry: aoi,
    scale: 30,        // 30 m used due to GEE processing constraints
    maxPixels: 1e13
  })
  .getNumber('crop')
  .divide(10000);

// =========================================================
// 9. Export results table (CSV)
// =========================================================
var result = ee.FeatureCollection([
  ee.Feature(null, {
    municipality: 'Santa Maria - RS',
    season: '2023/2024',
    soybean_area_ha: areaSoybean,
    maize_area_ha: areaMaize,
    method: 'NDVI phenological rule-based classification (no ML)'
  })
]);

Export.table.toDrive({
  collection: result,
  description: 'Area_Soybean_Maize_SantaMaria_2324_NDVI',
  fileFormat: 'CSV'
});

// =========================================================
// 10. Export classified map (GeoTIFF)
// =========================================================
Export.image.toDrive({
  image: crop,
  description: 'CropMap_Soybean_Maize_SantaMaria_2324_NDVI',
  folder: 'GEE_exports',
  fileNamePrefix: 'crop_soybean_maize_santamaria_2324',
  region: aoi.geometry(),
  scale: 30,              // kept at 30 m for computational feasibility
  crs: 'EPSG:4326',
  maxPixels: 1e13
});
