
# ---------------------------------------------
# GRÁFICO — ÁREA x MÊS
# ---------------------------------------------
fig <- ggplot(df, aes(x = mes, y = area_ha, color = estagio)) +
  
  geom_line(linewidth = 1.2) +
  geom_point(size = 3) +
  
  scale_color_manual(values = cores, name = "Estágio fenológico") +
  
  scale_x_date(
    date_labels = "%b/%Y",
    breaks = unique(df$mes)
  ) +
  
  scale_y_continuous(
    labels = comma_format(decimal.mark = ",", big.mark = ".")
  ) +
  
  labs(
    title = "Evolução mensal da safra 2025/2026 — Santa Maria (RS)",
    subtitle = "Monitoramento de áreas agrícolas por estágios fenológicos (Set–Dez/2025)",
    x = "Mês",
    y = "Área (ha)",
    caption = "Autor: Marcelo Lovato Brum\nFonte: Sentinel-2, MapBiomas"
  ) +
  
  theme_minimal(base_size = 12) +
  theme(
    legend.position = "right",
    legend.title = element_text(face = "bold"),
    
    plot.title = element_text(face = "bold", size = 14),
    plot.subtitle = element_text(size = 11),
    plot.caption = element_text(size = 9)
  )

# ---------------------------------------------
# VISUALIZAR
# ---------------------------------------------
print(fig)

# ---------------------------------------------
# SALVAR
# ---------------------------------------------
ggsave(
  "Evolucao_Safra2526_SetDez2025.png",
  fig,
  width = 10,
  height = 6,
  dpi = 300
)
