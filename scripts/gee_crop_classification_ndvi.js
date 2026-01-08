// =========================================================
// Project: Crop Classification using NDVI (Soybean & Maize)
// Location: Santa Maria - RS, Brazil
// Data: Sentinel-2 + MapBiomas
// Platform: Google Earth Engine
// Method: Rule-based phenological classification (no ML)
// Author: Marcelo Lovato Brum
// =========================================================
// =========================================
// 0. AOI — Santa Maria
// =========================================
var aoi = ee.FeatureCollection(
  'projects/ee-marcelolvtb/assets/Santa_Maria_RS_WGS84'
);

// =========================================
// 1. MAPBIOMAS 10 m — base agrícola
// classe 19 = lavouras temporárias
// =========================================
var mb = ee.Image(
  'projects/ee-marcelolvtb/assets/mapbiomas_10m_collection2_integration_v1-classification_2023'
);

var agri = mb.eq(19).clip(aoi);

// =========================================
// 2. FUNÇÃO NDVI (Sentinel-2)
// =========================================
function ndviS2(img){
  var qa = img.select('QA60');
  var m = qa.bitwiseAnd(1<<10).eq(0)
           .and(qa.bitwiseAnd(1<<11).eq(0));
  return img.updateMask(m)
    .divide(10000)
    .normalizedDifference(['B8','B4'])
    .rename('NDVI');
}

// =========================================
// 3. NDVI POR MÊS
// =========================================
function ndviMonth(y, m){
  var start = ee.Date.fromYMD(y, m, 1);
  var end   = start.advance(1, 'month');
  return ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filterBounds(aoi)
    .filterDate(start, end)
    .map(ndviS2)
    .mean()
    .clip(aoi);
}

var ndvi_dec = ndviMonth(2023,12).rename('NDVI_dec');
var ndvi_jan = ndviMonth(2024, 1).rename('NDVI_jan');
var ndvi_feb = ndviMonth(2024, 2).rename('NDVI_feb');

// =========================================
// 4. STACK (apenas área agrícola)
// =========================================
var stack = ndvi_dec.addBands([ndvi_jan, ndvi_feb])
  .updateMask(agri);

// =========================================
// 5. REGRA FENOLÓGICA (SIMPLIFICADA)
// =========================================

// milho: pico cedo
var milho = stack.select('NDVI_jan')
  .gte(stack.select('NDVI_feb'))
  .and(stack.select('NDVI_jan')
  .gte(stack.select('NDVI_dec')))
  .and(stack.select('NDVI_jan').gte(0.45));

// soja: pico tardio
var soja = stack.select('NDVI_feb')
  .gt(stack.select('NDVI_jan'))
  .and(stack.select('NDVI_feb').gte(0.45));

// =========================================
// 6. MAPA FINAL
// 1 = soja | 2 = milho
// =========================================
var crop = ee.Image(0)
  .where(soja, 1)
  .where(milho, 2)
  .updateMask(soja.or(milho))
  .clip(aoi)
  .rename('crop');

// =========================================
// 7. VISUALIZAÇÃO
// =========================================
Map.centerObject(aoi, 10);

Map.addLayer(crop,
  {min: 1, max: 2, palette: ['#228B22', '#FFD700']},
  'Soja (verde) | Milho (amarelo) — NDVI'
);

Map.addLayer(aoi, {color: 'red'}, 'Limite Santa Maria');

// =========================================
// 8. ÁREA (ha) — SOJA e MILHO
// =========================================

// área por pixel
var pixelArea = ee.Image.pixelArea();

// máscaras
var sojaMask  = crop.eq(1);
var milhoMask = crop.eq(2);

// área soja (m² → ha)
var areaSoja = sojaMask
  .multiply(pixelArea)
  .reduceRegion({
    reducer: ee.Reducer.sum(),
    geometry: aoi,
    scale: 30,
    maxPixels: 1e13
  })
  .getNumber('crop')
  .divide(10000);

// área milho (m² → ha)
var areaMilho = milhoMask
  .multiply(pixelArea)
  .reduceRegion({
    reducer: ee.Reducer.sum(),
    geometry: aoi,
    scale: 30,
    maxPixels: 1e13
  })
  .getNumber('crop')
  .divide(10000);

// =========================================
// 9. EXPORTAR CSV
// =========================================
var result = ee.FeatureCollection([
  ee.Feature(null, {
    municipio: 'Santa Maria - RS',
    safra: '2023/2024',
    area_soja_ha: areaSoja,
    area_milho_ha: areaMilho,
    metodo: 'MapBiomas + NDVI (regra fenológica, sem ML)'
  })
]);

Export.table.toDrive({
  collection: result,
  description: 'Area_Soja_Milho_SantaMaria_2324_NDVI',
  fileFormat: 'CSV'
});
