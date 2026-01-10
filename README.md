# Monitoramento da Safra Agrícola com Sensoriamento Remoto  
### Estudo de caso: Santa Maria (RS) — Safra 2023/2024

Este projeto apresenta um **pipeline completo de monitoramento agrícola** baseado em **imagens de satélite** e **regras fenológicas**, integrando dados de **Sentinel-2 (NDVI)**, **Sentinel-1 (radar)** e **MapBiomas**, com foco em:

- acompanhamento **mensal** da safra,
- identificação de **estágios fenológicos**,
- quantificação de **área por estágio**,
- visualização da **dinâmica espacial** da lavoura.

O objetivo é demonstrar um **produto técnico aplicável** para:
- gestão agrícola,
- planejamento territorial,
- monitoramento de safras,
- e apoio à tomada de decisão no agro.

---

## 🎯 Objetivos

- Mapear áreas agrícolas usando **MapBiomas (10 m)**  
- Classificar os **estágios da cultura** ao longo da safra:
  - Pousio / preparo  
  - Emergência  
  - Desenvolvimento  
  - Pico vegetativo  
- Estimar **área (ha)** por estágio em cada mês  
- Produzir:
  - mapas mensais,
  - séries temporais,
  - animações (GIF),
  - tabelas para análise e relatório.

---

## 🛰️ Dados utilizados

| Fonte | Produto | Uso no projeto |
|------|---------|----------------|
| Sentinel-2 | Reflectância de superfície | Cálculo do NDVI |
| Sentinel-1 | Banda VV (radar) | Detecção de preparo e estrutura da vegetação |
| MapBiomas | Cobertura do solo (10 m) | Máscara de áreas agrícolas |
| IBGE | Limites municipais | Recorte espacial |

---

## 🧠 Metodologia (resumo)

1. **Definição da área de estudo** (Santa Maria – RS)  
2. Aplicação de **máscara agrícola** com MapBiomas  
3. Cálculo mensal de:
   - NDVI (Sentinel-2)
   - VV (Sentinel-1)  
4. Derivação de **variações temporais** (ΔNDVI, ΔVV)  
5. Classificação dos pixels em **estágios fenológicos** por regras:

| Condição | Estágio |
|----------|---------|
NDVI baixo + VV reduzido | Pousio / preparo |
NDVI em ascensão | Emergência |
NDVI alto e crescente | Desenvolvimento |
NDVI alto e estável/decrescente | Pico vegetativo |

6. Cálculo de **área por estágio**  
7. Geração de:
   - mapas mensais,
   - tabelas,
   - gráficos,
   - GIF de evolução espacial.

## 📊 Principais resultados

- Mapas mensais dos estágios da safra  
- Tabela de área (ha) por estágio e por mês  
- Gráfico de evolução temporal da safra  
- Animação espacial mostrando a dinâmica da lavoura

> ⚠️ Observação: resultados dependem da disponibilidade de imagens e condições atmosféricas. Meses com maior cobertura de nuvens apresentam maior incerteza.

---

##  Aplicações

Este produto pode ser utilizado para:

- monitoramento operacional de safras,  
- estimativa precoce de área cultivada,  
- suporte à tomada de decisão no agronegócio,  
- análise territorial e planejamento agrícola,  
- demonstração técnica de soluções em sensoriamento remoto.

---

## 👤 Autor

**Marcelo Lovato Brum**  
Doutorando em Engenharia Agrícola — UFSM  
Área de atuação: sensoriamento remoto, geoprocessamento, modelagem ambiental, machine learning aplicado ao agro.

---

## 📜 Licença

Este projeto é disponibilizado para fins **educacionais e demonstrativos**.  
O uso comercial dos resultados deve considerar as licenças das bases de dados utilizadas.
## 📁 Estrutura do repositório

