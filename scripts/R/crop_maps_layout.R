library(terra)
library(sf)
library(ggplot2)
library(ggspatial)

# ---------------------------------------------
# CAMINHOS
# ---------------------------------------------
raster_path <- "C:/Users/marce/OneDrive/Documentos/Areas cultivadas/Santa Maria - RS/Mapa_Soja_Milho_SantaMaria_2324_GeoTIFF.tif"
shp_path    <- "C:/shapefile/Santa_Maria_RS_WGS84/Santa_Maria_RS_WGS84.shp"

# ---------------------------------------------
# LEITURA DOS DADOS
# ---------------------------------------------
crop <- rast(raster_path)

mun <- st_read(shp_path)
mun <- st_transform(mun, crs(crop))

# ---------------------------------------------
# MASCARAR O RASTER PELO MUNICÍPIO
# ---------------------------------------------
crop_mun <- mask(crop, vect(mun))

# ---------------------------------------------
# RASTER → DATAFRAME
# ---------------------------------------------
df <- as.data.frame(crop_mun, xy = TRUE)
colnames(df) <- c("x", "y", "classe")

df$classe_f <- factor(df$classe,
                      levels = c(1, 2),
                      labels = c("Soja", "Milho"))

# remover NA para não entrar na legenda
df <- df[!is.na(df$classe_f), ]

# ---------------------------------------------
# CORES
# ---------------------------------------------
cores <- c(
  "Soja"  = "#2E8B57",
  "Milho" = "#EE9A00"
)

# ---------------------------------------------
# MAPA
# ---------------------------------------------
fig <- ggplot() +
  
  # fundo do município em cinza claro
  geom_sf(data = mun, fill = "#F0F0F0", color = NA) +
  
  # raster (áreas cultivadas)
  geom_tile(
    data = df,
    aes(x = x, y = y, fill = classe_f)
  ) +
  
  # ----------------------------
# LIMITE MUNICIPAL NO MAPA
# (sem legenda aqui)
# ----------------------------
geom_sf(
  data = mun,
  fill = NA,
  color = "black",
  linewidth = 0.6,
  show.legend = FALSE
) +
  
  # ----------------------------
# CAMADA FAKE SÓ PARA A LEGENDA
# (gera símbolo de LINHA)
# ----------------------------
geom_segment(
  aes(x = Inf, xend = Inf, y = Inf, yend = Inf, color = "Limite municipal"),
  linewidth = 1
) +
  
  # ----------------------------
# ESCALAS
# ----------------------------
  scale_color_manual(
    values = c("Limite municipal" = "black"),
    name = "Legenda"
  ) +
  scale_fill_manual(
  values = cores,
  name = NULL
)+
  # ----------------------------
# SISTEMA DE COORDENADAS
# ----------------------------
coord_sf() +
  
  # ----------------------------
# TÍTULOS
# ----------------------------
labs(
  title = "Área plantada de soja e milho — Santa Maria (RS)",
  subtitle = "Safra 2023/2024 | Método: MapBiomas 10 m + Sentinel-2 (NDVI)",
  caption  = "Autor: Marcelo Lovato Brum\nFonte: MapBiomas, Sentinel-2, IBGE"
) +
  
  # ----------------------------
# TEMA
# ----------------------------
theme_minimal(base_size = 12) +
  theme(
    axis.title = element_blank(),
    
    # linhas de coordenadas
    panel.grid.major = element_line(color = "grey70", linewidth = 0.3),
    panel.grid.minor = element_blank(),
    
    legend.position = "right",
    legend.title = element_text(face = "bold"),
    
    plot.title = element_text(face = "bold", size = 14),
    plot.subtitle = element_text(size = 11),
    plot.caption = element_text(size = 9)
  )


# ---------------------------------------------
# VISUALIZAR
# ---------------------------------------------
dev.off()
print(fig)

# ---------------------------------------------
# SALVAR
# ---------------------------------------------
setwd("C:/Users/marce/OneDrive/Documentos/Areas cultivadas/Santa Maria - RS")
ggsave(
  "Mapa_Soja_Milho_SantaMaria_2324_FINAL.png",
  fig,
  width = 10,
  height = 8,
  dpi = 300
)



#----
##---- SAFRINHA
#----


raster_path <- "C:/Users/marce/OneDrive/Documentos/Areas cultivadas/Santa Maria - RS/Milho_Safrinha_SantaMaria_2324_GeoTIFF.tif"
shp_path    <- "C:/shapefile/Santa_Maria_RS_WGS84/Santa_Maria_RS_WGS84.shp"

# ---------------------------------------------
# LEITURA DOS DADOS
# ---------------------------------------------
safrinha <- rast(raster_path)

mun <- st_read(shp_path)
mun <- st_transform(mun, crs(safrinha))

# ---------------------------------------------
# MASCARAR RASTER PELO MUNICÍPIO
# ---------------------------------------------
safrinha_mun <- mask(safrinha, vect(mun))

safrinha_bin <- ifel(safrinha_mun == 1, 1, NA)
safrinha_bin <- mask(safrinha_bin, vect(mun))

# ---------------------------------------------
# RASTER → DATAFRAME
# ---------------------------------------------
df <- as.data.frame(safrinha_bin, xy = TRUE)
colnames(df) <- c("x", "y", "valor")

df <- df[!is.na(df$valor), ]
df$classe <- "Milho safrinha"


# ---------------------------------------------
# CORES
# ---------------------------------------------
cores <- c("Milho safrinha" = "#FF8C00")

# ---------------------------------------------
# MAPA
# ---------------------------------------------
fig_safrinha <- ggplot() +
  
  # fundo do município
  geom_sf(data = mun, fill = "#F0F0F0", color = NA) +
  
  # raster da safrinha (área)
  geom_tile(
    data = df,
    aes(x = x, y = y, fill = "Milho safrinha")
  ) +
  
  # limite municipal no mapa (sem legenda)
  geom_sf(
    data = mun,
    fill = NA,
    color = "black",
    linewidth = 0.6,
    show.legend = FALSE
  ) +
  
  # camada fake só para legenda do limite (LINHA)
  geom_segment(
    aes(x = Inf, xend = Inf, y = Inf, yend = Inf, color = "Limite municipal"),
    linewidth = 1
  ) +
  
  # escalas
  scale_fill_manual(
    values = c("Milho safrinha" = "#FF8C00"),
    name = NULL
  ) +
  
  scale_color_manual(
    values = c("Limite municipal" = "black"),
    name = "Legenda"
  ) +
  
  coord_sf() +
  
  labs(
    title = "Área plantada de milho safrinha — Santa Maria (RS)",
    subtitle = "Safra 2023/2024 | Método: MapBiomas 10 m + Sentinel-2 (NDVI)",
    caption  = "Autor: Marcelo Lovato Brum\nFonte: MapBiomas, Sentinel-2"
  ) +
  
  theme_minimal(base_size = 12) +
  theme(
    axis.title = element_blank(),
    
    panel.grid.major = element_line(color = "grey70", linewidth = 0.3),
    panel.grid.minor = element_blank(),
    
    legend.position = "right",
    legend.title = element_text(face = "bold"),
    
    plot.title = element_text(face = "bold", size = 14),
    plot.subtitle = element_text(size = 11),
    plot.caption = element_text(size = 9)
  )

# ---------------------------------------------
# VISUALIZAR
# ---------------------------------------------
dev.off()
print(fig_safrinha)

# ---------------------------------------------
# SALVAR
# ---------------------------------------------
setwd("C:/Users/marce/OneDrive/Documentos/Areas cultivadas/Santa Maria - RS")
ggsave(
  "Mapa_Milho_Safrinha_SantaMaria_2324_FINAL.png",
  fig_safrinha,
  width = 10,
  height = 8,
  dpi = 300
)

