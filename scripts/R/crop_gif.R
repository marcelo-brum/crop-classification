
library(terra)
library(gifski)

#arquivos gerados no código do gee
dir_tif <- "C:/SEUARQUIVO/"

files <- c(
  "Stage_Nov2023.tif",
  "Stage_Dez2023.tif",
  "Stage_Jan2024.tif",
  "Stage_Fev2024.tif",
  "Stage_Mar2024.tif"
)

labels <- c("Nov/2023","Dez/2023","Jan/2024","Fev/2024","Mar/2024")

# pasta temporária para frames
frames_dir <- file.path(dir_tif, "frames_tmp")
dir.create(frames_dir, showWarnings = FALSE)

# cores dos estágios
cols <- c("#D9D9D9","#FFF3B0","#7FC97F","#1B7837")

# -----------------------------------------------------
# 1. Gerar imagens frame a frame
# -----------------------------------------------------
for(i in seq_along(files)){
  
  r <- rast(file.path(dir_tif, files[i]))
  
  png(
    filename = file.path(frames_dir, sprintf("frame_%02d.png", i)),
    width = 900,
    height = 700
  )
  
  plot(
    r,
    col = cols,
    main = paste("Evolução espacial da safra —", labels[i]),
    axes = FALSE,
    legend = FALSE
  )
  
  legend(
    x = par("usr")[1] + 0.80 * diff(par("usr")[1:2]),  
    y = par("usr")[3] + 0.15 * diff(par("usr")[3:4]),  
    
    legend = c("Pousio / preparo","Emergência",
               "Desenvolvimento","Pico vegetativo"),
    fill   = cols,
    bg     = "white",
    horiz  = FALSE,
    cex    = 0.9,
    bty    = "n"
  )
  
  
  
  
  dev.off()
}

# -----------------------------------------------------
# 2. Criar GIF a partir dos frames
# -----------------------------------------------------
png_files <- list.files(frames_dir, full.names = TRUE, pattern = "png$")

gifski(
  png_files,
  gif_file = file.path(dir_tif, "Evolucao_Safra2324_SantaMaria.gif"),
  width = 900,
  height = 700,
  delay = 2   
)
