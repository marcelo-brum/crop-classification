// =========================================
// 0. AOI — Santa Maria
// =========================================
var aoi = ee.FeatureCollection(
  'projects/' // suba o shapefile em wgs84 para seu ambiente gee
);

// =========================================
// 1. MAPBIOMAS 10 m — base agrícola
// classe 19 = lavouras temporárias
// =========================================
var mb = ee.Image(
  'projects/ee-marcelolvtb/assets/mapbiomas_10m_collection2_integration_v1-classification_2023' // suba a máscara do MapBiomas ou outro de sua preferência
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

// --- safra principal
var ndvi_dec = ndviMonth(2023,12).rename('NDVI_dec');
var ndvi_jan = ndviMonth(2024, 1).rename('NDVI_jan');
var ndvi_feb = ndviMonth(2024, 2).rename('NDVI_feb');

// --- safrinha
var ndvi_mar = ndviMonth(2024, 3).rename('NDVI_mar');
var ndvi_apr = ndviMonth(2024, 4).rename('NDVI_apr');
var ndvi_may = ndviMonth(2024, 5).rename('NDVI_may');

// =========================================
// 4. STACKS
// =========================================
var stack_main = ndvi_dec.addBands([ndvi_jan, ndvi_feb])
  .updateMask(agri);

var stack_safrinha = ndvi_mar.addBands([ndvi_apr, ndvi_may])
  .updateMask(agri);

// =========================================
// 5. REGRAS FENOLÓGICAS
// =========================================

// --- Milho 1ª safra: pico cedo
var milho_1 = stack_main.select('NDVI_jan')
  .gte(stack_main.select('NDVI_feb'))
  .and(stack_main.select('NDVI_jan')
  .gte(stack_main.select('NDVI_dec')))
  .and(stack_main.select('NDVI_jan').gte(0.45));

// --- Soja: pico tardio
var soja = stack_main.select('NDVI_feb')
  .gt(stack_main.select('NDVI_jan'))
  .and(stack_main.select('NDVI_feb').gte(0.45));

// --- Milho safrinha: crescimento mar → abr
var milho_2 = stack_safrinha.select('NDVI_apr')
  .gt(stack_safrinha.select('NDVI_mar'))
  .and(stack_safrinha.select('NDVI_apr').gte(0.45));

// =========================================
// 6. MAPA FINAL
// 1 = soja | 2 = milho 1ª safra | 3 = milho safrinha
// =========================================
var crop = ee.Image(0)
  .where(soja, 1)
  .where(milho_1, 2)
  .where(milho_2, 3)
  .updateMask(soja.or(milho_1).or(milho_2))
  .clip(aoi)
  .rename('crop');

// =========================================
// 6b. LAYER — MILHO SAFRINHA APENAS
// =========================================
var safrinha_only = crop.eq(3)
  .selfMask()     // deixa só onde é safrinha
  .rename('milho_safrinha');

// =========================================
// 7. VISUALIZAÇÃO
// =========================================
Map.centerObject(aoi, 10);

Map.addLayer(crop,
  {min: 1, max: 3, palette: ['#228B22', '#FFD700', '#FF8C00']},
  'Soja | Milho 1ª safra | Milho safrinha'
);

Map.addLayer(
  safrinha_only,
  {palette: ['#FF8C00']},
  'Milho safrinha (somente)'
);

Map.addLayer(aoi, {color: 'red'}, 'Limite Santa Maria');

// =========================================
// 8. ÁREA (ha)
// =========================================
var pixelArea = ee.Image.pixelArea();

var areaSoja = crop.eq(1)
  .multiply(pixelArea)
  .reduceRegion({
    reducer: ee.Reducer.sum(),
    geometry: aoi,
    scale: 30,
    maxPixels: 1e13
  })
  .getNumber('crop')
  .divide(10000);

var areaMilho1 = crop.eq(2)
  .multiply(pixelArea)
  .reduceRegion({
    reducer: ee.Reducer.sum(),
    geometry: aoi,
    scale: 30,
    maxPixels: 1e13
  })
  .getNumber('crop')
  .divide(10000);

var areaMilho2 = crop.eq(3)
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
    area_milho_1safra_ha: areaMilho1,
    area_milho_safrinha_ha: areaMilho2,
    area_milho_total_ha: areaMilho1.add(areaMilho2),
    metodo: 'MapBiomas + NDVI (fenologia: safra principal + safrinha)'
  })
]);

Export.table.toDrive({
  collection: result,
  description: 'Area_Soja_Milho_SantaMaria_2324_NDVI_ComSafrinha',
  fileFormat: 'CSV'
});

// =========================================
// 10. EXPORTAR GEOTIFF — MILHO SAFRINHA
// =========================================
Export.image.toDrive({
  image: safrinha_only,
  description: 'Milho_Safrinha_SantaMaria_2324_GeoTIFF',
  folder: 'GEE_Exports',
  region: aoi.geometry(),
  scale: 10,
  maxPixels: 1e13,
  fileFormat: 'GeoTIFF'
});
