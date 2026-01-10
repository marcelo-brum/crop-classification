// =====================================================
// 0. AOI — Santa Maria
// =====================================================
var aoi = ee.FeatureCollection(
  'projects/'// suba o shapefile em wgs84 para seu ambiente gee
);

// =====================================================
// 1. MÁSCARA AGRÍCOLA — MapBiomas
// classe 19 = lavouras temporárias
// =====================================================
var mb = ee.Image(
  'projects/ee-marcelolvtb/assets/mapbiomas_10m_collection2_integration_v1-classification_2023'// suba a máscara do MapBiomas ou outro de sua preferência
);
var agri = mb.eq(19).clip(aoi);

// =====================================================
// 2. FUNÇÕES AUXILIARES ROBUSTAS
// =====================================================

// ---- cria imagem vazia com banda
function emptyImg(name){
  return ee.Image.constant(0).rename(name).clip(aoi);
}

// ---- NDVI Sentinel-2 (garantido)
function ndviMonth(y, m){
  var start = ee.Date.fromYMD(y, m, 1);
  var end   = start.advance(1, 'month');

  var col = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filterBounds(aoi)
    .filterDate(start, end)
    .map(function(img){
      var qa = img.select('QA60');
      var msk = qa.bitwiseAnd(1<<10).eq(0)
                .and(qa.bitwiseAnd(1<<11).eq(0));
      return img.updateMask(msk)
        .divide(10000)
        .normalizedDifference(['B8','B4'])
        .rename('NDVI');
    });

  return ee.Image(
    ee.Algorithms.If(
      col.size().gt(0),
      col.mean().clip(aoi),
      emptyImg('NDVI')
    )
  );
}

// ---- VV Sentinel-1 (garantido)
function vvMonth(y, m){
  var start = ee.Date.fromYMD(y, m, 1);
  var end   = start.advance(1, 'month');

  var col = ee.ImageCollection('COPERNICUS/S1_GRD')
    .filterBounds(aoi)
    .filterDate(start, end)
    .filter(ee.Filter.eq('instrumentMode','IW'))
    .filter(ee.Filter.listContains('transmitterReceiverPolarisation','VV'))
    .select('VV');

  return ee.Image(
    ee.Algorithms.If(
      col.size().gt(0),
      col.mean().clip(aoi),
      emptyImg('VV')
    )
  );
}

// =====================================================
// 3. IMAGENS MENSAIS — OUT/23 → MAR/24
// =====================================================
var ndvi_oct = ndviMonth(2023,10).rename('NDVI_oct');
var ndvi_nov = ndviMonth(2023,11).rename('NDVI_nov');
var ndvi_dec = ndviMonth(2023,12).rename('NDVI_dec');
var ndvi_jan = ndviMonth(2024, 1).rename('NDVI_jan');
var ndvi_feb = ndviMonth(2024, 2).rename('NDVI_feb');
var ndvi_mar = ndviMonth(2024, 3).rename('NDVI_mar');

var vv_oct = vvMonth(2023,10).rename('VV_oct');
var vv_nov = vvMonth(2023,11).rename('VV_nov');
var vv_dec = vvMonth(2023,12).rename('VV_dec');
var vv_jan = vvMonth(2024, 1).rename('VV_jan');
var vv_feb = vvMonth(2024, 2).rename('VV_feb');
var vv_mar = vvMonth(2024, 3).rename('VV_mar');

// =====================================================
// 4. VARIAÇÕES TEMPORAIS
// =====================================================
function diff(cur, prev){ return cur.subtract(prev); }

var dNDVI_nov = diff(ndvi_nov, ndvi_oct);
var dNDVI_dec = diff(ndvi_dec, ndvi_nov);
var dNDVI_jan = diff(ndvi_jan, ndvi_dec);
var dNDVI_feb = diff(ndvi_feb, ndvi_jan);
var dNDVI_mar = diff(ndvi_mar, ndvi_feb);

var dVV_nov = diff(vv_nov, vv_oct);
var dVV_dec = diff(vv_dec, vv_nov);
var dVV_jan = diff(vv_jan, vv_dec);
var dVV_feb = diff(vv_feb, vv_jan);
var dVV_mar = diff(vv_mar, vv_feb);

// =====================================================
// 5. REGRA UNIFICADA DE ESTÁGIO (NDVI + RADAR)
// =====================================================
// 1 = pousio / preparo
// 2 = emergência
// 3 = desenvolvimento
// 4 = pico vegetativo

function stageMonth(ndvi, dndvi, dvv){
  
  var stage = ee.Image(0)
    
    // 1 — pousio / preparo (solo exposto)
    .where(ndvi.lt(0.30).and(dvv.lt(-0.8)), 1)
    
    // 2 — emergência (NDVI começa a subir)
    .where(ndvi.gte(0.30).and(ndvi.lt(0.50)).and(dndvi.gt(0)), 2)
    
    // 3 — desenvolvimento (NDVI alto e crescendo)
    .where(ndvi.gte(0.50).and(dndvi.gt(0)), 3)
    
    // 4 — pico vegetativo (NDVI alto e estabiliza/declina)
    .where(ndvi.gte(0.65).and(dndvi.lte(0)), 4)
    
    .updateMask(agri)
    .clip(aoi);
    
  return stage.rename('stage');
}

// estágios por mês
var stage_nov = stageMonth(ndvi_nov, dNDVI_nov, dVV_nov);
var stage_dec = stageMonth(ndvi_dec, dNDVI_dec, dVV_dec);
var stage_jan = stageMonth(ndvi_jan, dNDVI_jan, dVV_jan);
var stage_feb = stageMonth(ndvi_feb, dNDVI_feb, dVV_feb);
var stage_mar = stageMonth(ndvi_mar, dNDVI_mar, dVV_mar);

// =====================================================
// 6. VISUALIZAÇÃO
// =====================================================
Map.centerObject(aoi, 10);

var visStage = {
  min: 1, max: 4,
  palette: ['#D9D9D9', '#FFF3B0', '#7FC97F', '#1B7837']
};

Map.addLayer(stage_nov, visStage, 'Estágio — Nov/23');
Map.addLayer(stage_dec, visStage, 'Estágio — Dez/23');
Map.addLayer(stage_jan, visStage, 'Estágio — Jan/24');
Map.addLayer(stage_feb, visStage, 'Estágio — Fev/24');
Map.addLayer(stage_mar, visStage, 'Estágio — Mar/24');

Map.addLayer(aoi, {color:'red'}, 'Limite Santa Maria');

// =====================================================
// 7. ÁREA POR ESTÁGIO (ha)
// =====================================================
var pixelArea = ee.Image.pixelArea();

function areaByStage(stageImg, label){
  
  stageImg = stageImg.rename('stage');
  
  var feats = ee.List.sequence(1,4).map(function(c){
    
    var mask = stageImg.eq(ee.Number(c));
    
    var area = mask.multiply(pixelArea)
      .reduceRegion({
        reducer: ee.Reducer.sum(),
        geometry: aoi,
        scale: 30,
        maxPixels: 1e13
      })
      .getNumber('stage')
      .divide(10000);
      
    return ee.Feature(null, {
      mes: label,
      classe: ee.Number(c),
      area_ha: area
    });
  });
  
  return ee.FeatureCollection(feats);
}

// =====================================================
// 8. TABELA FINAL
// =====================================================
var table = areaByStage(stage_nov,'2023-11')
  .merge(areaByStage(stage_dec,'2023-12'))
  .merge(areaByStage(stage_jan,'2024-01'))
  .merge(areaByStage(stage_feb,'2024-02'))
  .merge(areaByStage(stage_mar,'2024-03'));

// =====================================================
// 9. EXPORTAR CSV
// =====================================================
Export.table.toDrive({
  collection: table,
  description: 'Estagios_Safra2324_NDVI_Radar_SantaMaria',
  fileFormat: 'CSV'
});

// =====================================================
// 10. EXPORTAR MAPAS
// =====================================================
function exportImg(img, name){
  Export.image.toDrive({
    image: img,
    description: name,
    folder: 'GEE_Exports',
    region: aoi.geometry(),
    scale: 10,
    maxPixels: 1e13
  });
}

exportImg(stage_nov,'Stage_Nov2023');
exportImg(stage_dec,'Stage_Dez2023');
exportImg(stage_jan,'Stage_Jan2024');
exportImg(stage_feb,'Stage_Fev2024');
exportImg(stage_mar,'Stage_Mar2024');
