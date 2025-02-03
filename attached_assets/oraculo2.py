from unicorn_binance_local_depth_cache import BinanceLocalDepthCacheManager, DepthCacheOutOfSync
from typing import Optional
import asyncio
import logging
import os
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import asyncio
import websockets
import json
from itertools import groupby
import mplfinance as mpf
import matplotlib.image as mpimg  # para cargar imágenes
from matplotlib.animation import FuncAnimation
from datetime import datetime, timedelta
import ccxt
from binance.client import Client
from binance.enums import HistoricalKlinesType, FuturesType, ContractType
from unicorn_binance_local_depth_cache import BinanceLocalDepthCacheManager, DepthCacheOutOfSync
from lucit_licensing_python.exceptions import NoValidatedLucitLicense
from datetime import datetime
from threading import Timer
import requests
import logging
import os
import sys
import time 
import threading
from matplotlib.table import Table
from matplotlib.ticker import FixedLocator, FixedFormatter
from matplotlib.ticker import MaxNLocator
from matplotlib.lines import Line2D
import matplotlib.dates as mdates
from matplotlib.patches import Rectangle
from matplotlib import font_manager
import mpld3
import hmac
import hashlib
import matplotlib.patches as patches
from matplotlib.offsetbox import OffsetImage, AnnotationBbox
from PIL import Image

BASE_URL_BITMART = 'https://api-cloud-v2.bitmart.com'
API_KEY_BITMART_ = '85e0944d4a6bee88ead267f9c48129eb992bb337'
SECRET_KEY_BITMART_ = 'df02462696edb4001d4edcd2b56d8197b3681dd9073b63870bf41794017ed521'
MEMO_BITMART_ = 'nueva'
API_KEY_BITMART = '0cc891a42ea056227a8e99418f9d47f2e850f196'
SECRET_KEY_BITMART = '1d9d9ada8bfdfc8b3562388b57c780491dc2e7b813cd2b1f95546ec284b62982'
MEMO_BITMART = 'JAIME'


binance = ccxt.binance({
    'apiKey': 'FdK01H27sFzNrjeM2gwUBPtSVxBHyWIj1GqhNHABgybjRg9gsONR2ghR1tf7YxJR',
    'secret': 'Hojy60DIsEEvgzZFmaWgJIGDskVHegTTkpPu3lL49THBb2fZFo2WojF7O445EFF0',
})
api_key = 'FdK01H27sFzNrjeM2gwUBPtSVxBHyWIj1GqhNHABgybjRg9gsONR2ghR1tf7YxJR'
api_secret = 'Hojy60DIsEEvgzZFmaWgJIGDskVHegTTkpPu3lL49THBb2fZFo2WojF7O445EFF0'
client = Client(api_key, api_secret)
amount_test_caches: int = None
exchange_spot: str = "binance.com"
exchange: str = "binance.com-futures"
limit_count: int = None
update_interval_ms: Optional[int] = None
desired_symbols = ["BTCUSDT"] #, "ETHUSDT"] #, "SHIBAUSDT", "DOGEUSDT", "DOTUSDT", "SOLUSDT", "ADAUSDT", "XRPUSDT"]
# Configuración del logger
top_asks = None
top_bids = None
top_bids_spot = None
top_asks_spot = None
order_flow_bids_500 = 1
order_flow_asks_500 = 1
zonas_liquidacion_sell = pd.DataFrame(columns=['Price', 'Quantity'])
zonas_liquidacion_buy = pd.DataFrame(columns=['Price', 'Quantity'])
prueba = False
max_ask_liq = 0
max_bid_liq = 0
# Parámetros del mercado
market = 'BTCUSDT'
symboloo = 'btcusdt'
bucket_size = 50 # Tamaño de agrupación en los niveles de precios (100 USD)
bucket_size_10 = 10
# Variables globales
cvd_spot = 0
cvd_futures = 0
vwap = 0
cvd_futures_color = '#089981'
previous_table_data = []
max_asks = pd.DataFrame()
max_bids = pd.DataFrame()
df_asks = pd.DataFrame()
df_bids = pd.DataFrame()
current_time_last = time.time()
green_cells1 = 0
green_cells = 0
green_cells2 = 0
sum_ventas_spot= 0
sum_compras_spot= 0
sum_compras= 0
sum_ventas = 0
tiempo_transcurrido =  time.time()  # Marca el tiempo del último cambio de sesgo
accumulated_volume_b_25 = 0
accumulated_volume_25 = 0
total_volume_a = 0
total_volume_b = 0
accumulated_volume_b = 0
accumulated_volume_a = 0
foto_png = False
diferencia_numero_spot = 0
diferencia_numero_fut = 0
last_print_time = time.time() 
last_print_time_sesgo = time.time() 
primera_vez_sesgo = False
last_print_time1 = time.time()
last_print_time2 = time.time() # Tiempo inicial
primera_vez = False
sesgo_bajista = False
sesgo_alcista = False
sesgo_medio = False
ultimo_cambio_sesgo = time.time()
tipo_sesgo_anterior = "ninguno"
accumulated_volume_b_25 = 0
accumulated_volume_25 = 0
total_volume_a = 0
total_volume_b = 0
accumulated_volume_b = 0
accumulated_volume_a = 0        
                        

if prueba == True:
    # Simulación de datos de Bids (compradores)
    bids_data = {
        'Price': [56050, 56500, 56950, 57100, 57850 ,58050, 58200, 58500, 58900, 59850 ,60050, 62000, 61950, 61900, 61850 ,62050, 62000, 61950, 58600, 57850 ,56250, 57400, 58350, 58700, 61850, 61800, 61750, 61700, 61650, 61600, 61550, 61500, 
                61450, 61400, 61350, 61300, 61250, 61200, 61150, 61100, 61050],
        'Quantity': [118.609, 122.541, 181.218 , 293.393, 42.227, 35.572, 30.322, 11.992, 77.112, 36.725 , 293.393, 42.227, 35.572, 30.322, 11.992, 43.561, 36.910, 7.851, 8.176, 1.765, 
                    2.872, 293.393 , 293.393, 42.227, 35.572, 30.322, 11.992, 42.227, 35.572, 30.322, 11.992 , 293.393, 42.227, 35.572, 30.322, 11.992, 7.904, 27.159, 19.939, 12.382, 13.028]
    }

    # Simulación de datos de Asks (vendedores)
    asks_data = {
        'Price': [62100, 62150, 62200, 62250, 62300, 62350, 62400, 62450, 62500, 62550, 62600, 62650, 
                62700, 62750, 62800, 62850, 62900, 62950, 63000, 63050, 63100, 62750, 62800, 62850, 62900, 62950, 62750, 62800, 62550, 65900, 66150, 65250, 63800, 64550, 63900, 64950, 65750, 66800, 67350, 67500, 67750],
        'Quantity': [118.609, 122.541, 181.218 , 293.393, 42.227, 35.572, 30.322, 11.992, 77.112, 36.725 , 293.393, 42.227, 35.572, 30.322, 11.992, 43.561, 36.910, 7.851, 8.176, 1.765, 
                    2.872, 293.393 , 293.393, 42.227, 35.572, 30.322, 11.992, 42.227, 35.572, 30.322, 11.992 , 293.393, 42.227, 35.572, 30.322, 11.992, 7.904, 27.159, 19.939, 12.382, 13.028]
    }

    # Crear DataFrames
    df_bids_10 = pd.DataFrame(bids_data)
    df_asks_10 = pd.DataFrame(asks_data)
    df_bids = pd.DataFrame(bids_data)
    df_asks = pd.DataFrame(asks_data)

#else:
  #  try:
        #ubldc = BinanceLocalDepthCacheManager(exchange="binance.com-futures")
        #ubldcspot = BinanceLocalDepthCacheManager(exchange="binance.com")
  #  except NoValidatedLucitLicense as error_msg:
   #     print(f"ERROR: {error_msg}")
    #    sys.exit(1)
    #time.sleep(10)
    #try:

#        ubldc.create_depthcache(markets=market)
 #   except Exception as e:
  #      print("1",e)
   # try:

#3        ubldcspot.create_depthcache(markets=market)
 #   except Exception as e:
  #      print("2",e)


# Configuración inicial
fondo_color = '#111320'
color_verde = '#089981'
color_rojo = '#F23645'
fondo_color = '#111320'
color_blanco = '#FFFFFF'
color_amarillo = '#F2E205'   # Amarillo brillante
# Crear la figura y el gridspec con la proporción de 3/5 y 1/5
fig = plt.figure(figsize=(18, 10), dpi=100)
fig.canvas.manager.set_window_title("BITCOIN 1H")  # Cambia el nombre de la ventana aquí
#fig1 = plt.figure(figsize=(18, 10), dpi=100)
#fig1.canvas.manager.set_window_title("ETH 1H")  # Cambia el nombre de la ventana aquí
#gs1 = fig1.add_gridspec(1, 2, width_ratios=[3, 1], wspace=0.15)
#gs_left1 = gs1[0].subgridspec(1, 2, width_ratios=[2, 1], wspace=0.0)

gs = fig.add_gridspec(1, 2, width_ratios=[3, 1], wspace=0.15)
gs_left = gs[0].subgridspec(1, 2, width_ratios=[2, 1], wspace=0.0)
#fig.suptitle("BITCOIN 1H", fontsize=16)  # Añadir el título aquí

# Asegúrate de que la fuente esté instalada en el sistema
plt.rcParams['font.family'] = 'Bebas Neue'
plt.rcParams['text.antialiased'] = True  # Antialiasing para mejorar la visualización
plt.rcParams['font.weight'] = 'light' 
font_path = '/Users/jaimegarcia/Desktop/fonts/bebas_neue/BebasNeue-Regular.ttf'
# Registrar la nueva fuente manualmente en Matplotlib
font_manager.fontManager.addfont(font_path)
# Crear un objeto FontProperties con la ruta de la fuente
bebas_neue = font_manager.FontProperties(fname=font_path)
available_fonts = sorted([f.name for f in font_manager.fontManager.ttflist])
font_prop = font_manager.FontProperties(family='Avenir Next', weight='light', size=18)

plt.subplots_adjust(left=0.02, right=0.98, top=0.98, bottom=0.07)
# Crear los subplots
ax_candles_left = fig.add_subplot(gs_left[0])
ax_volume = fig.add_subplot(gs_left[1], sharey=ax_candles_left)
ax_simulation = fig.add_subplot(gs[1], sharey=ax_candles_left)
logo_ax = fig.add_axes([0.05, 0.3, 0.5, 0.4], anchor='C', zorder=5)  # Ajusta los valores para centrar y escalar
        
#ax_candles_left1 = fig1.add_subplot(gs_left1[0])
#ax_volume1 = fig1.add_subplot(gs_left1[1], sharey=ax_candles_left1)
#ax_simulation1 = fig1.add_subplot(gs1[1], sharey=ax_candles_left1)
#logo_ax1 = fig1.add_axes([0.05, 0.3, 0.5, 0.4], anchor='C', zorder=5)  # Ajusta los valores para centrar y escalar
        
# Cambiar la tipografía de las etiquetas del eje Y
#for label in ax_volume1.get_yticklabels():
#    label.set_fontproperties(bebas_neue)
## Cambiar la tipografía de las etiquetas del eje Y
#for label in ax_candles_left1.get_yticklabels():
#    label.set_fontproperties(bebas_neue)
#for label in ax_simulation1.get_yticklabels():
#    label.set_fontproperties(bebas_neue)


# Cambiar la tipografía de las etiquetas del eje Y
for label in ax_volume.get_yticklabels():
    label.set_fontproperties(bebas_neue)
# Cambiar la tipografía de las etiquetas del eje Y
for label in ax_candles_left.get_yticklabels():
    label.set_fontproperties(bebas_neue)
for label in ax_simulation.get_yticklabels():
    label.set_fontproperties(bebas_neue)

try:
    ax_candles_left.spines['top'].set_color(color_blanco)    # Cambiar color del borde superior
    ax_candles_left.spines['bottom'].set_color(color_blanco) # Cambiar color del borde inferior
    ax_candles_left.spines['left'].set_color(color_blanco)   # Cambiar color del borde izquierdo

    # Cambiar el color de los bordes del gráfico de volumen
    ax_volume.spines['top'].set_color(color_blanco)
    ax_volume.spines['bottom'].set_color(color_blanco)
#  ax_volume.spines['left'].set_color('#FFFFFF')
    ax_volume.spines['right'].set_color(color_blanco)

    ax_simulation.spines['top'].set_color(color_blanco)    # Cambiar color del borde superior
    ax_simulation.spines['bottom'].set_color(color_blanco) # Cambiar color del borde inferior
    ax_simulation.spines['left'].set_color(color_blanco)   # Cambiar color del borde izquierdo
    ax_simulation.spines['right'].set_color(color_blanco)  # Cambiar color del borde derecho

except Exception as e:
    input("fcxn")

#try:
 #   ax_candles_left1.spines['top'].set_color(color_blanco)    # Cambiar color del borde superior
 #   ax_candles_left1.spines['bottom'].set_color(color_blanco) # Cambiar color del borde inferior
 #   ax_candles_left1.spines['left'].set_color(color_blanco)   # Cambiar color del borde izquierdo

    # Cambiar el color de los bordes del gráfico de volumen
#    ax_volume1.spines['top'].set_color(color_blanco)
 #   ax_volume1.spines['bottom'].set_color(color_blanco)
#  ax_volume.spines['left'].set_color('#FFFFFF')
  #  ax_volume1.spines['right'].set_color(color_blanco)

#    ax_simulation1.spines['top'].set_color(color_blanco)    # Cambiar color del borde superior
 #   ax_simulation1.spines['bottom'].set_color(color_blanco) # Cambiar color del borde inferior
  #  ax_simulation1.spines['left'].set_color(color_blanco)   # Cambiar color del borde izquierdo
   # ax_simulation1.spines['right'].set_color(color_blanco)  # Cambiar color del borde derecho

except Exception as e:
    input("fcxn")







trades_data = pd.DataFrame(columns=['Tipo', 'Monto', 'Precio'])  # DataFrame para almacenar las transacciones
trades_data_1 = pd.DataFrame(columns=['Tipo', 'Monto', 'Precio', 'Tiempo'])  # DataFrame para almacenar las transacciones
# Actualizar el DataFrame de trades para incluir la hora de cada operación
trades_data_1_spot = pd.DataFrame(columns=['Tipo', 'Monto', 'Precio', 'Tiempo'])




def update_trade_df(trade_type, quantity, price):
    global cvd_futures, trades_data_1,cvd_futures_color,sum_compras,sum_ventas,diferencia_numero_fut
    # Crear nuevo trade
    current_time = datetime.now()
    new_trade = pd.DataFrame([[trade_type, quantity, price, current_time]], columns=['Tipo', 'Monto', 'Precio', 'Tiempo'])
    # Concatenar nuevo trade
    # Asegurarse de que trades_data_1 sea un DataFrame
    if trades_data_1.empty:
        trades_data_1 = pd.DataFrame(columns=['Tipo', 'Monto', 'Precio', 'Tiempo'])
        trades_data_1 = pd.DataFrame([[trade_type, quantity, price, current_time]], columns=['Tipo', 'Monto', 'Precio', 'Tiempo'])
    
    else:

        trades_data_1 = pd.concat([new_trade, trades_data_1]).reset_index(drop=True)
    # Mantener solo las transacciones de los últimos 5 minutos
    five_minutes_ago = datetime.now() - timedelta(minutes=10)
    trades_data_1 = trades_data_1[trades_data_1['Tiempo'] >= five_minutes_ago]
    # Sumar las compras y ventas por separado
    sum_compras = trades_data_1[trades_data_1['Tipo'] == 'Compra Futuros']['Monto'].astype(float).sum()
    sum_ventas = trades_data_1[trades_data_1['Tipo'] == 'Venta Futuros']['Monto'].astype(float).sum()
    # Calcular el ratio de compras a ventas (evitar división por cero)
    # Calcular el ratio de compras a ventas y el porcentaje de diferencia
    if sum_ventas > 0 and sum_compras > 0:
        if sum_compras > sum_ventas:
            diferencia = sum_compras - sum_ventas
            porcentaje_diferencia = (diferencia / sum_ventas) * 100
            cvd_futures_color = '#104d00'
            cvd_futures = porcentaje_diferencia
            
            
            diferencia_numero_fut = round(diferencia)
         #   print(f"diferencia_numero_fut:{diferencia_numero_fut}")
         #   print(f"sum_compras_fut:{sum_compras}")
         #   print(f"sum_ventas_fut:{sum_ventas}")
        elif sum_ventas > sum_compras:
            diferencia = sum_ventas - sum_compras
            porcentaje_diferencia = (diferencia / sum_compras) * 100
            cvd_futures = porcentaje_diferencia
            cvd_futures_color = '#610108'
            diferencia_numero_fut = round(diferencia)
            #print(f"diferencia_numero_fut:{diferencia_numero_fut}")
            #print(f"sum_compras_fut:{sum_compras}")
            #print(f"sum_ventas_fut:{sum_ventas}")
        else:
            pass
            #print("Compras y ventas son iguales.")
    #print(f"Suma de Compras: {sum_compras}, Suma de Ventas: {sum_ventas}, Ratio Compras/Ventas: {cvd_futures:.2f}")
    return cvd_futures

def update_trade_df_spot(trade_type, quantity, price):
    global cvd_spot, trades_data_1_spot,cvd_spot_color,sum_ventas_spot,sum_compras_spot,diferencia_numero_spot
    # Crear nuevo trade
    current_time = datetime.now()
    
    # Asegurarse de que trades_data_1 sea un DataFrame
    if trades_data_1_spot.empty:
        trades_data_1_spot = pd.DataFrame(columns=['Tipo', 'Monto', 'Precio', 'Tiempo'])
        trades_data_1_spot = pd.DataFrame([[trade_type, quantity, price, current_time]], columns=['Tipo', 'Monto', 'Precio', 'Tiempo'])
    else:

        # Concatenar nuevo trade
        new_trade = pd.DataFrame([[trade_type, quantity, price, current_time]], columns=['Tipo', 'Monto', 'Precio', 'Tiempo'])
    
        trades_data_1_spot = pd.concat([new_trade, trades_data_1_spot]).reset_index(drop=True)
    # Mantener solo las transacciones de los últimos 5 minutos
    five_minutes_ago_spot = datetime.now() - timedelta(minutes=10)
    trades_data_1_spot = trades_data_1_spot[trades_data_1_spot['Tiempo'] >= five_minutes_ago_spot]
    # Sumar las compras y ventas por separado
    sum_compras_spot = trades_data_1_spot[trades_data_1_spot['Tipo'] == 'Compra Spot']['Monto'].astype(float).sum()
    sum_ventas_spot = trades_data_1_spot[trades_data_1_spot['Tipo'] == 'Venta Spot']['Monto'].astype(float).sum()
    # Calcular el ratio de compras a ventas (evitar división por cero)
    # Calcular el ratio de compras a ventas y el porcentaje de diferencia
    if sum_ventas_spot > 0 and sum_compras_spot > 0:
        if sum_compras_spot > sum_ventas_spot:
            diferencia_spot = sum_compras_spot - sum_ventas_spot
            porcentaje_diferencia_spot = (diferencia_spot / sum_ventas_spot) * 100
            cvd_spot_color = '#104d00'
            cvd_spot = porcentaje_diferencia_spot
            diferencia_numero_spot = round(diferencia_spot)
            #print(f"diferencia_numero_spot:{diferencia_numero_spot}")
            #print(f"sum_compras_spot:{sum_compras_spot}")
            #print(f"sum_ventas_spot:{sum_ventas_spot}")
        elif sum_ventas_spot > sum_compras_spot:
            diferencia_spot = sum_ventas_spot - sum_compras_spot
            porcentaje_diferencia_spot = (diferencia_spot / sum_compras_spot) * 100
            cvd_spot = porcentaje_diferencia_spot
            cvd_spot_color = '#610108'
            diferencia_numero_spot = round(diferencia_spot)
            #print(f"diferencia_numero_spot:{diferencia_numero_spot}")
            #print(f"sum_compras_spot:{sum_compras_spot}")
            #print(f"sum_ventas_spot:{sum_ventas_spot}")
        else:
            pass
            #print("Compras y ventas son iguales.")
    #print(f"Suma de Compras: {sum_compras}, Suma de Ventas: {sum_ventas}, Ratio Compras/Ventas: {cvd_futures:.2f}")
    return cvd_spot


def update_trades_df_(trade_type, quantity, price):
    global trades_data
    if trades_data.empty:
        trades_data = pd.DataFrame([[trade_type, quantity, price]], columns=['Tipo', 'Monto', 'Precio'])
        trades_data = pd.DataFrame([[trade_type, quantity, price]], columns=['Tipo', 'Monto', 'Precio'])
        
    else:

        new_trade = pd.DataFrame([[trade_type, quantity, price]], columns=['Tipo', 'Monto', 'Precio'])
        trades_data = pd.concat([new_trade, trades_data]).reset_index(drop=True)
        if len(trades_data) > 8:  # Mantener solo las últimas 8 transacciones
            trades_data = trades_data.iloc[:8]
# Función principal para iniciar las tareas de seguimiento de datos
# Definimos el número de reintentos máximo antes de forzar el reinicio del ciclo


async def track_market_buys_futures(symboloo):
    global cvd_futures, trades_data_1, cvd_futures_color,current_price,zonas_liquidacion_sell,zonas_liquidacion_buy
    url = f'wss://fstream.binance.com/ws/{symboloo}@trade'
    retries = 0  # Contador de reintentos
    current_price = 0
    MAX_RETRIES = 5
    while True:
        try:
            print(f"Conectando a WebSocket para Futuros ({retries} reintentos)...")
            async with websockets.connect(url) as websocket:
                retries = 0  # Reiniciar contador de reintentos al conectar correctamente
                print(f"Conectado para Futuros")
                
                while True:
                    try:
                            
                        trade = await websocket.recv()
                        trades_data = json.loads(trade)
                        price = float(trades_data['p'])
                        quantity = float(trades_data['q'])
                        is_market_buy = not trades_data['m']
                        monto_dolares = price * quantity

                        monto_dolares_str = (
                            f"{monto_dolares / 1_000_000:.1f}M" if monto_dolares >= 1_000_000
                            else f"{monto_dolares / 1000:.1f}K" if monto_dolares >= 1000
                            else f"{monto_dolares:.2f}"
                        )

                        

                        if is_market_buy:
                      #      print(f"1")
                            nivel = float(price * (1 - 1 / 100))
                      #      print(f"2")
                            rango_precio = round((nivel // 25) * 25)
                      #      print(f"3")
                            volumen = float(quantity) 
                      #      print(f"4")
                            #zonas_liquidacion_buy.append({'Price': nivel, 'Quantity': volumen})
                            # Suponiendo que zonas_liquidacion_buy es un DataFrame inicial
                            if zonas_liquidacion_buy.empty:
                                zonas_liquidacion_buy = pd.DataFrame([{'Price': nivel, 'Quantity': volumen}])  # Crear DataFrame con la nueva fila

                            else:
                                nueva_fila = pd.DataFrame([{'Price': nivel, 'Quantity': volumen}])  # Crear DataFrame con la nueva fila

                            # Concatenar la nueva fila al DataFrame original y reasignarlo
                                zonas_liquidacion_buy = pd.concat([zonas_liquidacion_buy, nueva_fila], ignore_index=True)

                      #      print(f"5")
                            cvd_futures = update_trade_df('Compra Futuros', quantity, price)
                            if monto_dolares > 100000:
                                update_trades_df_('Compra Futuros', monto_dolares_str, price)
                        else:
                            #print(f"6")
                            nivel = float(price * (1 + 1 / 100))
                            #print(f"7")
                            rango_precio = round((nivel // 25) * 25)
                           # print(f"8")
                            volumen = float(quantity) 
                           # print(f"9")
                            if zonas_liquidacion_sell.empty:
                                zonas_liquidacion_sell = pd.DataFrame([{'Price': nivel, 'Quantity': volumen}])  # Crear DataFrame con la nueva fila

                            else:

                            #zonas_liquidacion_sell.append({'Price': nivel, 'Quantity': volumen})
                           # print(f"10")
                                nueva_fila = pd.DataFrame([{'Price': nivel, 'Quantity': volumen}])  # Crear DataFrame con la nueva fila

                            # Concatenar la nueva fila al DataFrame original y reasignarlo
                                zonas_liquidacion_sell = pd.concat([zonas_liquidacion_sell, nueva_fila], ignore_index=True)


                            cvd_futures = update_trade_df('Venta Futuros', quantity, price)
                            if monto_dolares > 100000:
                                update_trades_df_('Venta Futuros', monto_dolares_str, price)

                    except websockets.ConnectionClosed as e:
                        print(f"WebSocket cerrado: {e}")
                        break  # Salir del bucle interior para intentar reconectar
                    except Exception as e:
                        print(f"Error inesperado procesando trade de futuros: {e}")
                        await asyncio.sleep(2)  # Pequeña espera antes de continuar el bucle interno
        except (websockets.ConnectionClosed, asyncio.TimeoutError) as e:
            print(f"Error de conexión para futuros: {e}. Intentando reconectar...")
        except Exception as e:
            print(f"Error inesperado: {e}. Intentando reconectar...")
        finally:
            retries += 1
            if retries >= MAX_RETRIES:
                print(f"Máximo número de reintentos alcanzado ({MAX_RETRIES}). Reiniciando la conexión...")
                await asyncio.sleep(10)
                retries = 0  # Reiniciar el contador después de esperar
            else:
                await asyncio.sleep(5)  # Esperar 5 segundos antes de intentar reconectar

async def track_market_buys_spot(symboloo):
    global cvd_spot, trades_data_1_spot, cvd_spot_color
    url = f'wss://stream.binance.com/ws/{symboloo}@trade'
    retries = 0  # Contador de reintentos
    MAX_RETRIES = 5
    while True:
        try:
            print(f"Conectando a WebSocket para Spot ({retries} reintentos)...")
            async with websockets.connect(url) as websocket:
                print(f"Conectado para Spot")
                retries = 0  # Reiniciar contador de reintentos al conectar correctamente
                while True:
                    try:
                        trade_spot = await websocket.recv()
                        trades_data_spot = json.loads(trade_spot)
                        price_spot = float(trades_data_spot['p'])
                        quantity_spot = float(trades_data_spot['q'])
                        is_market_buy_spot = not trades_data_spot['m']
                        monto_dolares_spot = price_spot * quantity_spot

                        monto_dolares_str_spot = (
                            f"{monto_dolares_spot / 1_000_000:.1f}M" if monto_dolares_spot >= 1_000_000
                            else f"{monto_dolares_spot / 1000:.1f}K" if monto_dolares_spot >= 1000
                            else f"{monto_dolares_spot:.2f}"
                        )

                        if is_market_buy_spot:
                            cvd_spot = update_trade_df_spot('Compra Spot', quantity_spot, price_spot)
                            if monto_dolares_spot > 100000:
                                update_trades_df_('Compra Spot', monto_dolares_str_spot, price_spot)
                        else:
                            cvd_spot = update_trade_df_spot('Venta Spot', quantity_spot, price_spot)
                            if monto_dolares_spot > 100000:
                                update_trades_df_('Venta Spot', monto_dolares_str_spot, price_spot)
                    except websockets.ConnectionClosed as e:
                        print(f"WebSocket cerrado: {e}")
                        break  # Salir del bucle interior para intentar reconectar
                    except Exception as e:
                        print(f"Error inesperado procesando trade de spot: {e}")
                        await asyncio.sleep(2)  # Pequeña espera antes de continuar el bucle interno
        except (websockets.ConnectionClosed, asyncio.TimeoutError) as e:
            print(f"Error de conexión para spot: {e}. Intentando reconectar...")
        except Exception as e:
            print(f"Error inesperado: {e}. Intentando reconectar...")
        finally:
            retries += 1
            if retries >= MAX_RETRIES:
                print(f"Máximo número de reintentos alcanzado ({MAX_RETRIES}). Reiniciando la conexión...")
                await asyncio.sleep(10)
                retries = 0  # Reiniciar el contador después de esperar
            else:
                await asyncio.sleep(5)  # Esperar 5 segundos antes de intentar reconectar

# Hilo para ejecutar las tareas asíncronas
def start_async_tasks():
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(main())

async def main():
    await asyncio.gather(
        track_market_buys_spot(symboloo),
        track_market_buys_futures(symboloo)
        
    )

async_thread = threading.Thread(target=start_async_tasks)
async_thread.start()
def obtener_velass(client, symbol, interval):
    return client.get_historical_klines(symbol, interval,limit=72,klines_type = HistoricalKlinesType.FUTURES)
def procesar_velass(klines):
    df = pd.DataFrame(klines, columns=[
        'timestamp', 'open', 'high', 'low', 'close', 'volume', 
        'close_time', 'quote_asset_volume', 'number_of_trades', 
        'taker_buy_base_asset_volume', 'taker_buy_quote_asset_volume', 'ignore'
    ])
    df = df[['timestamp', 'open', 'high', 'low', 'close', 'volume']].astype(float)
    return df
def obtener_multiples_velass(client, symbol, interval, num_velas):
    df_total = pd.DataFrame()
    
    while len(df_total) < num_velas:
        #print(len(df_total))
        klines = obtener_velass(client, symbol, interval)
        
        df_iteracion = procesar_velass(klines)
        
        df_total = pd.concat([df_iteracion, df_total])
    
       # print(df_total)
    return df_total
# Definir la función para calcular VWAP y el volumen acumulado hasta el precio VWAP
def calculate_vwap_a(order_book_side):
    # Asegúrate de que el DataFrame tenga las columnas 'Price' y 'Quantity'
    if 'Price' not in order_book_side or 'Quantity' not in order_book_side:
        raise ValueError("El DataFrame debe contener las columnas 'Price' y 'Quantity'.")

    total_volume = 0
    total_value = 0

    # Iterar sobre las filas del DataFrame para calcular VWAP
    for index, row in order_book_side.iterrows():
        price = float(row['Price'])
        quantity = float(row['Quantity'])
        total_volume += quantity
        total_value += price * quantity

    # Calcular el VWAP
    vwap = total_value / total_volume if total_volume != 0 else 0
 
    upper_bound = current_price * 1.025  # 2.5% por encima

    accumulated_volume_25 = 0
    for index, row in order_book_side.iterrows():
        price = float(row['Price'])
        quantity = float(row['Quantity'])
        if price <= upper_bound:
            accumulated_volume_25 += quantity
        
      

    # Calcular el volumen acumulado hasta el precio VWAP
    accumulated_volume = 0
    for index, row in order_book_side.iterrows():
        price = float(row['Price'])
        quantity = float(row['Quantity'])
        accumulated_volume += quantity
        if price >= vwap:
            break

    return vwap, accumulated_volume,total_volume,accumulated_volume_25
def calculate_vwap_b(order_book_side):
    
    # Asegúrate de que el DataFrame tenga las columnas 'Price' y 'Quantity'
    if 'Price' not in order_book_side or 'Quantity' not in order_book_side:
        raise ValueError("El DataFrame debe contener las columnas 'Price' y 'Quantity'.")

    total_volume = 0
    total_value = 0
    
    accumulated_volume_b_25 = 0

    # Iterar sobre las filas del DataFrame para calcular VWAP
    for index, row in order_book_side.iterrows():
        price = float(row['Price'])
        quantity = float(row['Quantity'])
        total_volume += quantity
        total_value += price * quantity

    # Calcular el VWAP
    vwap = total_value / total_volume if total_volume != 0 else 0
    lower_bound = current_price * 0.975  # 2.5% por debajo
    
    for index, row in order_book_side.iterrows():
        price = float(row['Price'])
        quantity = float(row['Quantity'])
        if price >= lower_bound:
            accumulated_volume_b_25 += quantity
        if price <= lower_bound:
            break

    # Calcular el volumen acumulado hasta el precio VWAP
    accumulated_volume = 0
    for index, row in order_book_side.iterrows():
        price = float(row['Price'])
        quantity = float(row['Quantity'])
        accumulated_volume += quantity
        if price <= vwap:
            break

    return vwap, accumulated_volume,total_volume,accumulated_volume_b_25

# Función para agrupar el libro de órdenes por niveles de precios de $100
def es_numero(valor):
    """Verifica si el valor es convertible a float."""
    return isinstance(valor, (int, float)) or (isinstance(valor, str) and valor.replace('.', '', 1).isdigit())

def group_by_price_level_a(order_book, bucket_size):
    grouped_orders_a = {}
    for order in order_book:
        price = float(order[0])  # Obtener el precio de la lista
        quantity = float(order[1])  # Obtener la cantidad de la lista
        # Determinar el bucket (nivel de precio), redondeando hacia arriba para el lado ask
        bucket = (int((price + bucket_size - 1) // bucket_size * bucket_size))
        # Sumar la cantidad al bucket correspondiente
        if bucket not in grouped_orders_a:
            grouped_orders_a[bucket] = 0
        grouped_orders_a[bucket] += quantity
    return grouped_orders_a
# Función para agrupar el libro de órdenes por niveles de precios de $100
def group_by_price_level_b(order_book, bucket_size):
    grouped_orders_b = {}
    for order in order_book:
        price = float(order[0])  # Obtener el precio de la lista
        quantity = float(order[1])  # Obtener la cantidad de la lista
        # Determinar el bucket (nivel de precio)
        bucket = (int(price // bucket_size * bucket_size))
        # Sumar la cantidad al bucket correspondiente
        if bucket not in grouped_orders_b:
            grouped_orders_b[bucket] = 0
        grouped_orders_b[bucket] += quantity
    return grouped_orders_b
# Función para convertir el libro agrupado a un DataFrame
def group_by_price_level_b_liq(zonas_liquidacion_buy, bucket_size):
    grouped_orders_b = {}

    # Itera sobre las filas de zonas_liquidacion_buy usando itertuples()
    for order in zonas_liquidacion_buy.itertuples(index=False):
        price = order.Price  # Acceder al precio desde la tupla
        quantity = order.Quantity  # Acceder a la cantidad desde la tupla


        # Filtrar solo si ambos son numéricos
        if es_numero(price) and es_numero(quantity):
            price = float(price)
            quantity = float(quantity)

            # Determinar el bucket (nivel de precio)
            bucket = int(price // bucket_size * bucket_size)
            
            # Sumar la cantidad al bucket correspondiente
            if bucket not in grouped_orders_b:
                grouped_orders_b[bucket] = 0
            grouped_orders_b[bucket] += quantity

    return grouped_orders_b

def group_by_price_level_a_liq(zonas_liquidacion_sell, bucket_size):
    grouped_orders_a = {}
    for order in zonas_liquidacion_sell.itertuples(index=False):
        price = order.Price  # Acceder al precio desde la tupla
        quantity = order.Quantity  # Acceder a la cantidad desde la tupla

        # Filtrar solo si ambos son numéricos
        if es_numero(price) and es_numero(quantity):
            price = float(price)
            quantity = float(quantity)

            # Determinar el bucket (nivel de precio)
            bucket = int(price // bucket_size * bucket_size)
            
            # Sumar la cantidad al bucket correspondiente
            if bucket not in grouped_orders_a:
                grouped_orders_a[bucket] = 0
            grouped_orders_a[bucket] += quantity

    return grouped_orders_a

# Función para convertir el libro agrupado a un DataFrame
def order_book_to_dataframe(grouped_orders, side):
    df = pd.DataFrame(grouped_orders.items(), columns=['Price', 'Quantity'])
    df = df.sort_values(by='Price', ascending=(side == 'bids'))  # Ordenar según el lado (bids ascendente)
    return df

def sign_message(timestamp, memo, query_string, secret_key):
    message = f"{timestamp}#{memo}#{query_string}"
   # print(f"Message to sign: {message}")
    return hmac.new(secret_key.encode(), message.encode(), hashlib.sha256).hexdigest()
def get_headers(path, body, api_key, secret_key, memo):
    timestamp = str(int(time.time() * 1000))
    body_str = json.dumps(body, separators=(',', ':')) if body else ""
    sign = sign_message(timestamp, memo, body_str, secret_key)
    headers = {
        'X-BM-KEY': api_key,
        'X-BM-TIMESTAMP': timestamp,
        'X-BM-SIGN': sign,  # Añadir el UID a las cabeceras
        'Content-Type': 'application/json'
    }
   # print(f"Headers: {headers}")
    return headers
# /contract/private/get-open-orders
def revisar_tp(symbol):
    global current_amount_long,current_amount_short,cantidad_en_tp_short,cantidad_en_tp_long
    cantidad_en_tp_short = 0
    cantidad_en_tp_long = 0
    cantidad_en_tp_short_1 = 0
    cantidad_en_tp_long_1 = 0
    cantidad_en_tp_short_2 = 0
    cantidad_en_tp_long_2 = 0
    cantidad_en_tp_short_3 = 0
    cantidad_en_tp_long_3 = 0
    cantidad_en_tp_short_4 = 0
    cantidad_en_tp_long_4 = 0
    cantidad_en_tp_short_5 = 0
    cantidad_en_tp_long_5 = 0
    cantidad_en_tp_short_6 = 0
    cantidad_en_tp_long_6 = 0
    cantidad_en_tp_short_7 = 0
    cantidad_en_tp_long_7 = 0
    order_id_short_tp = 0
    order_id_long_tp = 0
    order_id_short_tp_1 = 0
    order_id_long_tp_1 = 0
    order_id_short_tp_2 = 0
    order_id_long_tp_2 = 0
    order_id_short_tp_3 = 0
    order_id_long_tp_3 = 0
    order_id_short_tp_4 = 0
    order_id_long_tp_4 = 0
    order_id_short_tp_5 = 0
    order_id_long_tp_5 = 0
    order_id_short_tp_6 = 0
    order_id_long_tp_6 = 0
    order_id_short_tp_7 = 0
    order_id_long_tp_7 = 0
    path = '/contract/private/get-open-orders'
   # print("symbol",symbol)
    query = f'symbol={symbol}'
    url = f'https://api-cloud-v2.bitmart.com{path}?{query}'
    
    headers = get_headers(path, query, API_KEY_BITMART, SECRET_KEY_BITMART, MEMO_BITMART)
    response = requests.get(url, headers=headers)
    
    if response.status_code == 200:
        data = response.json().get('data', [])
        
        if data:
            for position in data:
                #print("position",position)
                position_type = position.get('side')
                #print("position_type",position_type)
                if position_type == 3 : # 4 abrir corto , 2 cerrar corto , 1 abrir largo , 3 cerrar largo
                    if order_id_long_tp == 0 and order_id_long_tp_1 == 0 and order_id_long_tp_2 == 0 and order_id_long_tp_3 == 0 : #and order_id_long_tp_4 == 0 and order_id_long_tp_5 == 0 and order_id_long_tp_6 == 0 and order_id_long_tp_7 == 0:
                        cantidad_en_tp_long= position.get('size')
                        order_id_long_tp= position.get('order_id')
                        cantidad_en_tp_long = float(cantidad_en_tp_long)
                        #print("cantidad_en_tp_long",cantidad_en_tp_long)
                    elif order_id_long_tp_1 == 0 and order_id_long_tp_2 == 0 and order_id_long_tp_3 == 0 : #and order_id_long_tp_4 == 0 and order_id_long_tp_5 == 0 and order_id_long_tp_6 == 0 and order_id_long_tp_7 == 0:
                        cantidad_en_tp_long_1= position.get('size')
                        order_id_long_tp_1= position.get('order_id')
                        cantidad_en_tp_long_1 = float(cantidad_en_tp_long_1)
                    elif order_id_long_tp_2 == 0 and order_id_long_tp_3 == 0: # and order_id_long_tp_4 == 0 and order_id_long_tp_5 == 0 and order_id_long_tp_6 == 0 and order_id_long_tp_7 == 0:
                        cantidad_en_tp_long_2= position.get('size')
                        order_id_long_tp_2= position.get('order_id')
                        cantidad_en_tp_long_2 = float(cantidad_en_tp_long_2)
                    elif order_id_long_tp_3 == 0 : #and order_id_long_tp_4 == 0 and order_id_long_tp_5 == 0 and order_id_long_tp_6 == 0 and order_id_long_tp_7 == 0:
                        cantidad_en_tp_long_3= position.get('size')
                        order_id_long_tp_3= position.get('order_id')
                        cantidad_en_tp_long_3 = float(cantidad_en_tp_long_3)
         

                    else:
                        break

                    
                   
                if position_type == 2  :
                    if order_id_short_tp == 0 and order_id_short_tp_1 == 0 and order_id_short_tp_2 == 0 and order_id_short_tp_3 == 0 : #and order_id_short_tp_4 == 0 and order_id_short_tp_5 == 0 and order_id_short_tp_6 == 0 and order_id_short_tp_7 == 0:
                        cantidad_en_tp_short= position.get('size')
                        order_id_short_tp= position.get('order_id')
                        cantidad_en_tp_short = float(cantidad_en_tp_short)
                        #print("cantidad_en_tp_short",cantidad_en_tp_short)
                    elif order_id_short_tp_1 == 0 and order_id_short_tp_2 == 0 and order_id_short_tp_3 == 0 : #and order_id_short_tp_4 == 0 and order_id_short_tp_5 == 0 and order_id_short_tp_6 == 0 and order_id_short_tp_7 == 0:
                        cantidad_en_tp_short_1= position.get('size')
                        order_id_short_tp_1= position.get('order_id')
                        cantidad_en_tp_short_1 = float(cantidad_en_tp_short_1)
                    elif order_id_short_tp_2 == 0 and order_id_short_tp_3 == 0 : #and order_id_short_tp_4 == 0 and order_id_short_tp_5 == 0 and order_id_short_tp_6 == 0 and order_id_short_tp_7 == 0:
                        cantidad_en_tp_short_2= position.get('size')
                        order_id_short_tp_2= position.get('order_id')
                        cantidad_en_tp_short_2 = float(cantidad_en_tp_short_2)
                    elif order_id_short_tp_3 == 0: # and order_id_short_tp_4 == 0 and order_id_short_tp_5 == 0 and order_id_short_tp_6 == 0 and order_id_short_tp_7 == 0:
                        cantidad_en_tp_short_3= position.get('size')
                        order_id_short_tp_3= position.get('order_id')
                        cantidad_en_tp_short_3 = float(cantidad_en_tp_short_3)
           
                
                    else:
                        break
                    
                    
                    
                  
    return cantidad_en_tp_short,cantidad_en_tp_long,cantidad_en_tp_short_1,cantidad_en_tp_long_1,cantidad_en_tp_short_2,cantidad_en_tp_long_2,cantidad_en_tp_short_3,cantidad_en_tp_long_3,order_id_short_tp,order_id_long_tp,order_id_short_tp_1,order_id_long_tp_1,order_id_short_tp_2,order_id_long_tp_2,order_id_short_tp_3,order_id_long_tp_3
def revisar_ordenes(symbol):
    global current_amount_long,current_amount_short,cantidad_en_tp_short,cantidad_en_tp_long
    cantidad_en_short = 0
    cantidad_en_long = 0
    path = '/contract/private/get-open-orders'
    #print("symbol",symbol)
    query = f'symbol={symbol}'
    url = f'https://api-cloud-v2.bitmart.com{path}?{query}'
    
    headers = get_headers(path, query, API_KEY_BITMART, SECRET_KEY_BITMART, MEMO_BITMART)
    response = requests.get(url, headers=headers)
    
    if response.status_code == 200:
        data = response.json().get('data', [])
        
        if data:
            for position in data:
                #print("position",position)
                position_type = position.get('side')
                #print("position_type",position_type)
                if position_type == 1 : # 4 abrir corto , 2 cerrar corto , 1 abrir largo , 3 cerrar largo

                    cantidad_en_long= position.get('size')
                    cantidad_en_long = float(cantidad_en_long)
                    #print("cantidad_en_tp_long",cantidad_en_long)
                    
                   
                if position_type == 4  :
                    
                    cantidad_en_short= position.get('size')
                    cantidad_en_short = float(cantidad_en_short)
                    #print("cantidad_en_tp_short",cantidad_en_short)
                    
                    
                    
                  
    return cantidad_en_short,cantidad_en_long

def cancelar_longs(symbol):
    global current_amount_long,current_amount_short,cantidad_en_tp_short,cantidad_en_tp_long
  
    path = '/contract/private/get-open-orders'
    #print("symbol",symbol)
    query = f'symbol={symbol}'
    url = f'https://api-cloud-v2.bitmart.com{path}?{query}'
    
    headers = get_headers(path, query, API_KEY_BITMART, SECRET_KEY_BITMART, MEMO_BITMART)
    response = requests.get(url, headers=headers)
    
    if response.status_code == 200:
        data = response.json().get('data', [])
    
        if data:
            for position in data:
                position_type = position.get('side')
                if position_type == 1 : # 4 abrir corto , 2 cerrar corto , 1 abrir largo , 3 cerrar largo

                    order_id= position.get('order_id')
                    cancel_futures_order(API_KEY_BITMART, SECRET_KEY_BITMART, MEMO_BITMART, symbol,order_id)
def cancelar_shorts(symbol):
    global current_amount_long,current_amount_short,cantidad_en_tp_short,cantidad_en_tp_long
  
    path = '/contract/private/get-open-orders'
    #print("symbol",symbol)
    query = f'symbol={symbol}'
    url = f'https://api-cloud-v2.bitmart.com{path}?{query}'
    
    headers = get_headers(path, query, API_KEY_BITMART, SECRET_KEY_BITMART, MEMO_BITMART)
    response = requests.get(url, headers=headers)
    
    if response.status_code == 200:
        data = response.json().get('data', [])
    
        if data:
            for position in data:
                position_type = position.get('side')
                if position_type == 4 : # 4 abrir corto , 2 cerrar corto , 1 abrir largo , 3 cerrar largo

                    order_id= position.get('order_id')
                    cancel_futures_order(API_KEY_BITMART, SECRET_KEY_BITMART, MEMO_BITMART, symbol,order_id)
                    
def get_amount(symbol):
    global current_amount_long,current_amount_short
    path_ = '/contract/private/position'
    url_ = BASE_URL_BITMART + path_
    headers = get_headers(path_, None, API_KEY_BITMART, SECRET_KEY_BITMART, MEMO_BITMART)
    response = requests.get(url_, headers=headers)
    precio_entrada_long = 0
    precio_entrada_short = 0
    current_amount_long = 0
    current_amount_short = 0

    if response.status_code == 200:
        data = response.json().get('data', [])
        
        if data:
            for position in data:
                position_type = position.get('position_type')
                symbol = position.get('symbol')
                
                if position_type == 1 and symbol == 'BTCUSDT' :
                    current_amount_long= position.get('current_amount')
                    precio_entrada_long = position.get('entry_price')
                   
                if position_type == 2 and symbol == 'BTCUSDT' :
                    current_amount_short = position.get('current_amount')
                    precio_entrada_short = position.get('entry_price')
                    
               
                              
    return precio_entrada_long,precio_entrada_short,current_amount_long,current_amount_short
def cancel_futures_order(api_key, secret_key, memo, symbol, id):
    path = '/contract/private/cancel-order'
    url = BASE_URL_BITMART + path
   
    body = {
        "symbol": symbol,
        "order_id": id
    }
    body_str = json.dumps(body, separators=(',', ':'))
    headers = get_headers(path, body, api_key, secret_key, memo)

    #print(f"Request URL: {url}")
    #print(f"Request Headers: {headers}")
    #print(f"Request Body: {body_str}")

    response = requests.post(url, data=body_str, headers=headers)

    #print(f"Response Status Code: {response.status_code}")
    #print(f"Response Headers: {response.headers}")

    id = None
    if response.status_code == 200:
        try:
            response_json = response.json()
            
           
        except json.JSONDecodeError:
            print('Error: Invalid JSON response')
            print('Response Text:', response.text)
        
    else:
        try:
            response_json = response.json()

            #print(f"Error en la respuesta: {response_json}")
        except json.JSONDecodeError:
            print('Error: Invalid JSON response')
            print('Response Text:', response.text)

    return response
def place_futures_order_with_stop_tp(api_key, secret_key, memo, symbol, side, size,precio_compra,stop_loss):
    path = '/contract/private/submit-order'
    url = BASE_URL_BITMART + path
    entrada = round(precio_compra)
    entrada = str(entrada)
    #take_profit = str(take_profit)
    stop_loss = str(stop_loss)
    
    size = (size)
    body = {
        "symbol": symbol,
        "side": side,  # Modo de operación
        "size": size,
        "type": "limit",
        "price": str(entrada),
        "preset_stop_loss_price": str(stop_loss)

    }
    body_str = json.dumps(body, separators=(',', ':'))
    headers = get_headers(path, body, api_key, secret_key, memo)
    response = requests.post(url, data=body_str, headers=headers)

    if response.status_code == 200:
        try:
            response_json = response.json()
            #print('response_json:',response_json)
            order_id = response.json().get('data', {}).get('order_id', [])
        
        except json.JSONDecodeError:
            print('Error: Invalid JSON response')
            print('Response Text:', response.text)
    else:
        try:
            response_json = response.json()
            print('Error:', response_json)
        except json.JSONDecodeError:
            print('Error: Invalid JSON response')
            print('Response Text:', response.text)

    estado = 'pendiente'
    
    return order_id
def place_futures_tp(api_key, secret_key, memo, symbol, side, size,precio_compra):
    path = '/contract/private/submit-order'
    url = BASE_URL_BITMART + path
    
    entrada = str(precio_compra)
    
    size = (size)
    body = {
        "symbol": symbol,
        "side": side,  # Modo de operación
        "size": size,
        "type": "limit",
        "price": str(entrada)

    }
    body_str = json.dumps(body, separators=(',', ':'))
    headers = get_headers(path, body, api_key, secret_key, memo)
    response = requests.post(url, data=body_str, headers=headers)

    if response.status_code == 200:
        try:
            response_json = response.json()
            #print('response_json:',response_json)
            order_id = response.json().get('data', {}).get('order_id', [])
        
        except json.JSONDecodeError:
            print('Error: Invalid JSON response')
            print('Response Text:', response.text)
    else:
        try:
            response_json = response.json()
            print('Error:', response_json)
        except json.JSONDecodeError:
            print('Error: Invalid JSON response')
            print('Response Text:', response.text)

    estado = 'pendiente'
    
    return order_id
def balance_():
    
    path_ = '/contract/private/assets-detail'
    url_ = BASE_URL_BITMART + path_
    headers = get_headers(path_, None, API_KEY_BITMART, SECRET_KEY_BITMART, MEMO_BITMART)
    response = requests.get(url_, headers=headers)
    if response.status_code == 200:
        
        data = response.json().get('data', [])
        
        for balance in data:
            currency = balance.get('currency')
            
            if currency == 'USDT':
                available_balance = balance.get('available_balance')
                
               
    else:
        print('Error:', response.json())


    return available_balance
def calcular_tamaño_posicion(riesgo, available_balance, precio_entrada, stop):
    distancia_stop = abs(precio_entrada - stop)
    tamaño_posicion = ((riesgo * float(available_balance)) / distancia_stop)
    return tamaño_posicion

def get_symbol_details(symbol):
    url = f"{BASE_URL_BITMART}//contract/public/details?symbol={symbol}"
    
    response = requests.get(url)
    
    if response.status_code == 200:
        data = response.json().get('data', [])
        #print("data",data)
        # Extraer la precisión de precio y el tamaño del contrato
        symbol_data = data['symbols'][0]  # Accedemos al primer (y único) elemento de la lista
        price_precision = symbol_data['price_precision']

        price_precision = num_decimales = len(str(price_precision).split('.')[1])


        contract_size_minimo = symbol_data['contract_size']
        current_price = symbol_data['last_price']
        
        return price_precision, contract_size_minimo,current_price
    else:
        print("Error:", response.status_code, response.text)
        return None, None


# Función para obtener los datos de bids y asks con manejo de excepciones
def get_depth_data_with_retry():
    MAX_RETRIES = 5
    retries = 0
    market = 'BTCUSDT'
    symboloo = 'btcusdt'
    ubra = ubldc.get_ubra_manager()
    exchange_info = ubra.futures_exchange_info()
    markets = []
    for item in exchange_info['symbols']:
        if item['symbol'].endswith("USDT") and item['status'] == "TRADING":
            markets.append(item['symbol'])
            #print(markets)
    while retries < MAX_RETRIES:
        try:
            
            # Obtener bids y asks para futuros y spot
            try:
                top_bids = ubldc.get_bids('BTCUSDT')
            except Exception as e:
                print("3",e)
            try:
                top_asks = ubldc.get_asks('BTCUSDT')
            except Exception as e:
                print("4",e)
            try: 
                top_bids_spot = ubldcspot.get_bids('BTCUSDT')
            except Exception as e:
                print("5",e)
            try:
                top_asks_spot = ubldcspot.get_asks('BTCUSDT')
            except Exception as e:
                print("6",e)

            # Si no hay excepción, los datos están sincronizados y podemos salir del bucle
            return top_bids, top_asks, top_bids_spot, top_asks_spot

        except Exception as e:
            print(f"Error al obtener datos: {e}. Reintentando... ({retries+1}/{MAX_RETRIES})")
            retries += 1
            time.sleep(2)  # Esperar 2 segundos antes de intentar de nuevo

    # Si alcanzamos el número máximo de reintentos, reiniciar el Depth Cache
    print("El Depth Cache está fuera de sincronización. Reinicializando...")
    try:
        ubldc.stop_depth_cache()
    except Exception as e:
        print("7",e)
    try:
        ubldc.create_depth_cache(markets=market)
    except Exception as e:
        print("8",e)

    try:
        ubldcspot.stop_depth_cache()
    except Exception as e:
        print("9",e)
    try:
        ubldcspot.create_depth_cache(markets=market)
    except Exception as e:
        print("10",e)

def correr():
    global df_1m,current_price,max_bids,max_asks,df_asks_10,df_bids_10,df_asks,df_bids,vwap,cvd_futures,order_flow_500,order_flow_2000,previous_max_bids,previous_max_asks,order_flow_bids_500,order_flow_asks_500,zonas_liquidacion_sell,zonas_liquidacion_buy,max_ask_liq,max_bid_liq,cantidad_en_tp_short_1,cantidad_en_tp_short_2,cantidad_en_tp_long_1,cantidad_en_tp_long_2,tipo_sesgo_anterior,tiempo_transcurrido,accumulated_volume_b_25,accumulated_volume_25,accumulated_volume_b,accumulated_volume_a,total_volume_a,total_volume_b,sesgo_alcista,sesgo_bajista,sesgo_medio,foto_png
    
    try:
        ultimo_cambio_sesgo = cargar_fecha('fecha_guardada.txt')
    except Exception as e:
        print(e)

    tiempo_actual = time.time()

    if ultimo_cambio_sesgo:
       # print("hay fecha guardada, usar la fecha actual o un valor por defecto")
        ultimo_cambio_sesgo = float(ultimo_cambio_sesgo)
        tiempo_transcurrido = tiempo_actual - ultimo_cambio_sesgo
       # print(f"hace {int(tiempo_transcurrido // 3600)} H Y {int((tiempo_transcurrido % 3600) // 60)} M")
        pass
    else:
       # print("Si no hay fecha guardada, usar la fecha actual o un valor por defecto")
        ultimo_cambio_sesgo = time.time()
        tiempo_transcurrido = tiempo_actual - ultimo_cambio_sesgo
     #   print(f" hace {int(tiempo_transcurrido // 3600)} H Y {int((tiempo_transcurrido % 3600) // 60)} M")
#
        guardar_fecha('fecha_guardada.txt', ultimo_cambio_sesgo)
# Inicializar la variable de tiempo para control de impresión
    last_print_time = time.time() 
    last_print_time_sesgo = time.time() 
    last_print_time1 = time.time()
    last_print_time2 = time.time() # Tiempo inicial
    primera_vez_sesgo = False
    primera_vez = False
    sesgo_bajista = False
    sesgo_alcista = False
    sesgo_medio = False
    ultimo_cambio_sesgo = time.time()
    tipo_sesgo_anterior = "ninguno"
    accumulated_volume_b_25 = 0
    accumulated_volume_25 = 0
    total_volume_a = 0
    total_volume_b = 0
    accumulated_volume_b = 0
    accumulated_volume_a = 0
    try:
        symbolo = 'BTC/USDT'

        while True:
            try:
                try:
                    #current_price = round(get_current_price('BTCUSDT'))
                    price_precision, contract_size_minimo,current_price = get_symbol_details(symbol)
                    current_price = round(float(current_price))
                    current_price = int(current_price)
                    #print("ultimo_precio",current_price)
                except Exception as e:
                    print("1",e)
                

                if not zonas_liquidacion_buy.empty:
                    zonas_liquidacion_buy['Price'] = pd.to_numeric(zonas_liquidacion_buy['Price'], errors='coerce')
                    zonas_liquidacion_buy['Quantity'] = pd.to_numeric(zonas_liquidacion_buy['Quantity'], errors='coerce')

                    #print("zonas_liquidacion_buy",zonas_liquidacion_buy)
                    # Eliminar filas con NaN en 'Price' o 'Quantity'
                   
                    grouped_bids_liq = group_by_price_level_b_liq(zonas_liquidacion_buy, bucket_size)
                    # Convierte el diccionario resultante en un DataFrame
                    grouped_bids_liq = pd.DataFrame(list(grouped_bids_liq.items()), columns=['Price', 'Quantity'])

                    # Filtrar los valores de 'Price' que son menores o iguales al precio actual
                    grouped_bids_liq = grouped_bids_liq[grouped_bids_liq['Price'] <= current_price]

                   # df_bids_liq = order_book_to_dataframe(grouped_bids_liq, side='bids')

                    #zonas_liquidacion_buy = [zona for zona in zonas_liquidacion_buy if zona['Price'] <= current_price]
                    #
                   # print("grouped_bids_liq",grouped_bids_liq)
                    max_quantity_row = grouped_bids_liq.nlargest(1, 'Quantity')

                   # print("Fila con la mayor cantidad:", max_quantity_row)
                # Verificar que `zonas_liquidacion_sell` no esté vacía antes de filtrar
                if not zonas_liquidacion_sell.empty:
                    zonas_liquidacion_sell['Price'] = pd.to_numeric(zonas_liquidacion_sell['Price'], errors='coerce')
                    zonas_liquidacion_sell['Quantity'] = pd.to_numeric(zonas_liquidacion_sell['Quantity'], errors='coerce')

                    #zonas_liquidacion_sell = [zona for zona in zonas_liquidacion_sell if zona['Price'] >= current_price]
                    
                                
            #                if not zonas_liquidacion_sell.empty:
                    grouped_asks_liq = group_by_price_level_a_liq(zonas_liquidacion_sell, bucket_size)
                    grouped_asks_liq = pd.DataFrame(list(grouped_asks_liq.items()), columns=['Price', 'Quantity'])
                    grouped_asks_liq = grouped_asks_liq[grouped_asks_liq['Price'] >= current_price]
                    max_quantity_row_a = grouped_asks_liq.nlargest(1, 'Quantity')

                #    print("Fila con la mayor cantidad:", max_quantity_row_a)
                        

               # asyncio.run(fetch_order_book())
                  
                
                if prueba == False:
                    rango_y = 0.05 * current_price  # Margen del 2% del precio actual
                    y_min = current_price - rango_y
                    y_max = current_price + rango_y
                    rango_500 = 500
                    rango_2000 = 2000
                    
                    try:
                        
                        try:
                            top_bids, top_asks, top_bids_spot, top_asks_spot = get_depth_data_with_retry()
                        except Exception as e:
                            print("esrs",e)

                        # Filtrar los bids por debajo del precio actual
                        try:
                            filtered_bids = [order for order in top_bids if float(order[0]) < current_price and float(order[0]) > y_min ]
                            filtered_bids_spot = [order for order in top_bids_spot if float(order[0]) < current_price and float(order[0]) > y_min ]
                        except Exception as e:
                            print("esrds",e)
                        try:
                            # Filtrar los asks por encima del precio actual
                            filtered_asks = [order for order in top_asks if float(order[0]) > current_price and float(order[0]) < y_max]
                            filtered_asks_spot = [order for order in top_asks_spot if float(order[0]) > current_price and float(order[0]) < y_max]
                        except Exception as e:
                            print("cesrs",e)
                    
          #              zonas_liquidacion_buy = pd.DataFrame(zonas_liquidacion_buy, columns=['Price', 'Quantity'])
          #              zonas_liquidacion_sell = pd.DataFrame(zonas_liquidacion_sell, columns=['Price', 'Quantity'])
          #              filtered_bids = pd.DataFrame(filtered_bids, columns=['Price', 'Quantity'])
          #              filtered_bids_spot = pd.DataFrame(filtered_bids_spot, columns=['Price', 'Quantity'])
          #              filtered_asks = pd.DataFrame(filtered_asks, columns=['Price', 'Quantity'])
          #              filtered_asks_spot = pd.DataFrame(filtered_asks_spot, columns=['Price', 'Quantity'])

                        # Agrupar órdenes por niveles de $100
                        try:
                            grouped_bids = group_by_price_level_b(filtered_bids, bucket_size)
                            grouped_asks = group_by_price_level_a(filtered_asks, bucket_size)
                            grouped_bids_spot = group_by_price_level_b(filtered_bids_spot, bucket_size)
                            grouped_asks_spot = group_by_price_level_a(filtered_asks_spot, bucket_size)
         #                   

                            df_bids = order_book_to_dataframe(grouped_bids, side='bids')
                            df_asks = order_book_to_dataframe(grouped_asks, side='asks')
                            df_bids_spot = order_book_to_dataframe(grouped_bids_spot, side='bids')
                            df_asks_spot = order_book_to_dataframe(grouped_asks_spot, side='asks')
                           
                                
                        except Exception as e:
                            print("4",e)
                        try:
                        # Ordenar Bids por precio en orden descendente
                            df_bids = df_bids.sort_values(by='Price', ascending=False)

                            # Ordenar Asks por precio en orden ascendente
                            df_asks = df_asks.sort_values(by='Price', ascending=True)
                            df_bids_spot = df_bids_spot.sort_values(by='Price', ascending=False)

                            # Ordenar Asks por precio en orden ascendente
                            df_asks_spot = df_asks_spot.sort_values(by='Price', ascending=True)
                            
                            
                            
                            # Calcular el umbral mínimo (0.3%)
                            threshold = current_price * 0.003  # 0.3% del precio actual
                        except Exception as e:
                            print("ceccsrs",e)
                        try:

                            df_bids['Quantity'] = pd.to_numeric(df_bids['Quantity'], errors='coerce')
                            # Asegúrate de que los datos sean numéricos, convirtiendo la columna 'Quantity'
                            df_asks['Quantity'] = pd.to_numeric(df_asks['Quantity'], errors='coerce')
                            df_bids_spot['Quantity'] = pd.to_numeric(df_bids_spot['Quantity'], errors='coerce')
                            # Asegúrate de que los datos sean numéricos, convirtiendo la columna 'Quantity'
                            df_asks_spot['Quantity'] = pd.to_numeric(df_asks_spot['Quantity'], errors='coerce')
            #              if not df_bids_liq.empty:
            #                 df_bids_liq['Quantity'] = pd.to_numeric(df_bids_liq['Quantity'], errors='coerce')
                #                max_bid_liq = df_bids_liq.nlargest(1, 'Quantity').sort_values(by='Price', ascending=False)
                #               print("max_bid_liq",max_bid_liq)
                            # Asegúrate de que los datos sean numéricos, convirtiendo la columna 'Quantity'
                #          if not df_asks_liq.empty:
                #             df_asks_liq['Quantity'] = pd.to_numeric(df_asks_liq['Quantity'], errors='coerce')
                    #            max_ask_liq = df_asks_liq.nlargest(1, 'Quantity').sort_values(by='Price', ascending=True)
                            
                    #           print("max_ask_liq",max_ask_liq)

                            # Filtrar bids y asks que están a más del 0.3% de distancia del precio actual
                            df_bidss = df_bids[df_bids['Price'] <= (current_price - threshold)]
                            df_askss = df_asks[df_asks['Price'] >= (current_price + threshold)]
                            
                            df_bidss = pd.concat([df_bidss, df_bids_spot], ignore_index=True)
                            df_askss = pd.concat([df_askss, df_asks_spot], ignore_index=True)

                            df_bids = pd.concat([df_bids, df_bids_spot], ignore_index=True)
                            df_asks = pd.concat([df_asks, df_asks_spot], ignore_index=True)

                            df_bids['Quantity'] = pd.to_numeric(df_bids['Quantity'], errors='coerce')
                            # Asegúrate de que los datos sean numéricos, convirtiendo la columna 'Quantity'
                            df_asks['Quantity'] = pd.to_numeric(df_asks['Quantity'], errors='coerce')

                            max_bids = df_bids.nlargest(6, 'Quantity')
                            max_bids = max_bids.sort_values(by='Price', ascending=False)
                            max_asks = df_asks.nlargest(6, 'Quantity')
                            max_asks = max_asks.sort_values(by='Price', ascending=True)
            
            

                            order_flow_bids_500 = df_bids['Quantity'].sum()
                            order_flow_asks_500 = df_asks['Quantity'].sum()

                            # Calcular el order flow para cada rango
                            order_flow_500 = float(order_flow_bids_500 - order_flow_asks_500)
                    
                            vwap_bids, accumulated_volume_b,total_volume_b,accumulated_volume_b_25 = (calculate_vwap_b(df_bids))
                            vwap_asks, accumulated_volume_a,total_volume_a,accumulated_volume_25 = (calculate_vwap_a(df_asks))

                            vwap_asks = round(vwap_asks)
                            vwap_bids = round(vwap_bids)
                            total_volume_b = round(total_volume_b)
                            total_volume_a = round(total_volume_a)
                            accumulated_volume_b = round(accumulated_volume_b)
                            accumulated_volume_a = round(accumulated_volume_a)
                            accumulated_volume_b_25 = round(accumulated_volume_b_25)
                            accumulated_volume_25 = round(accumulated_volume_25)


                        except Exception as e:
                            print("cedsdsrs",e)





                        
                       











                    #    print("vwap_asks",vwap_asks)
                        #   print("vwap_bids",vwap_bids)
                        #  print("accumulated_volume_a",accumulated_volume_a)
                        # print("accumulated_volume_b",accumulated_volume_b)
                        
                        try:
                        # Calcular la distancia porcentual desde el precio actual hasta el VWAP (arriba y abajo)
                            distance_to_vwap_up = abs(vwap_asks - current_price) / current_price
                            distance_to_vwap_down = abs(vwap_bids - current_price) / current_price

                    #        print("distance_to_vwap_up",distance_to_vwap_up)
                        #       print("distance_to_vwap_down",distance_to_vwap_down)

                            # Calcular la eficiencia como el volumen acumulado dividido por la distancia porcentual al VWAP
                            efficiency_up = accumulated_volume_a / distance_to_vwap_up if distance_to_vwap_up != 0 else float('inf')
                            efficiency_down = accumulated_volume_b / distance_to_vwap_down if distance_to_vwap_down != 0 else float('inf')

                            # Decidir hacia dónde sería más eficiente mover el precio
                            if efficiency_up > efficiency_down:
                                vwap = vwap_asks
                                #print(f"Es más eficiente mover el precio hacia los asks {vwap_asks}.")
                            
                            elif efficiency_up < efficiency_down:
                                vwap = vwap_bids
                                # print(f"Es más eficiente mover el precio hacia los bids {vwap_bids}.")

                        except Exception as e:
                            print("cesrddds",e)

                        current_time = time.time()
                        if (current_time - last_print_time_sesgo >= 300) or primera_vez_sesgo == True:
                            last_print_time_sesgo = current_time
                            primera_vez_sesgo = True

                            

                            if abs((total_volume_b)-(total_volume_a)) > 3000 and  (total_volume_b) > (total_volume_a*2) and accumulated_volume_b_25 > total_volume_b*0.6 and vwap < current_price:
                                
                                if sesgo_bajista == False:
                                    tiempo_actuala = time.time()
                                    #print("sesgo bajista , liquidez abajo")
                                    sesgo_bajista = True
                                    sesgo_medio = False
                                    ultimo_cambio_sesgo = tiempo_actuala
                                    ultimo_cambio_sesgo_str = str(ultimo_cambio_sesgo)
                                    guardar_fecha('fecha_guardada.txt', ultimo_cambio_sesgo_str)
                                    tipo_sesgo_anterior = "bajista"
                                    foto_png = True
                                
                            elif abs((total_volume_b)-(total_volume_a)) > 3000 and   (total_volume_a) > (total_volume_b*2) and accumulated_volume_25 > total_volume_a*0.6 and vwap > current_price:
                                
                                if sesgo_alcista == False:
                                    tiempo_actuala = time.time()
                                    #print("sesgo_alcista , liquidez arriba")
                                    sesgo_alcista = True
                                    sesgo_medio = False
                                    ultimo_cambio_sesgo = tiempo_actuala
                                    ultimo_cambio_sesgo_str = str(ultimo_cambio_sesgo)

                                    guardar_fecha('fecha_guardada.txt', ultimo_cambio_sesgo_str)
                                    tipo_sesgo_anterior = "alcista"
                                    foto_png = True

                            elif vwap < current_price and sesgo_alcista == True:
                                tiempo_actuala = time.time()
                                #print("sesgo_medio , reversion")
                                sesgo_medio = True
                                sesgo_alcista = False
                                sesgo_bajista = False
                                ultimo_cambio_sesgo = tiempo_actuala
                                ultimo_cambio_sesgo_str = str(ultimo_cambio_sesgo)
                                guardar_fecha('fecha_guardada.txt', ultimo_cambio_sesgo_str)
                                tipo_sesgo_anterior = "medio"
                                foto_png = True
                            
                            elif vwap > current_price and sesgo_bajista == True:
                                tiempo_actuala = time.time()
                                #print("sesgo_medio , reversion")
                                sesgo_medio = True
                                sesgo_alcista = False
                                sesgo_bajista = False
                                ultimo_cambio_sesgo = tiempo_actuala
                                ultimo_cambio_sesgo_str = str(ultimo_cambio_sesgo)
                                guardar_fecha('fecha_guardada.txt', ultimo_cambio_sesgo_str)
                                tipo_sesgo_anterior = "medio"
                                foto_png = True
                            
                        

             #           tiempo_actual = time.time()
             #           tiempo_transcurrido = tiempo_actual - ultimo_cambio_sesgo
                        
                        



                        
                        #print("\nTop 2 Asks:")
                        #print(df_asks_10)
                        #print(f"\nPrecio: {current_price}")
                        #print("\nTop 2 Bids:")
                        #print(df_bids_10)
                        # Crear DataFrames
                    except Exception as e:
                        print("2",e)
                    # Filtrar bids y asks para el rango de $500
                    

                        #print("max_asks",max_asks_spot)
                        #print("max_bids",max_bids_spot)

                else:
                    
                    
                    # Precios de bids y asks
                    bids_prices = [80000, 85000, 85500, 86500]
                    asks_prices = [91000, 92000, 91500, 92500]

                    # Cantidades simuladas para cada precio
                    bids_quantities = [0.005, 0.001, 0.001, 0.001]  # Cantidades en cada nivel de bid
                    asks_quantities = [0.005, 0.001, 0.005, 0.001]  # Cantidades en cada nivel de ask

                    # Creamos DataFrames para bids y asks
                    df_bids = pd.DataFrame({'Price': bids_prices, 'Quantity': bids_quantities})
                    df_asks = pd.DataFrame({'Price': asks_prices, 'Quantity': asks_quantities})

                    df_bids['Quantity'] = pd.to_numeric(df_bids['Quantity'], errors='coerce')
                    # Asegúrate de que los datos sean numéricos, convirtiendo la columna 'Quantity'
                    df_asks['Quantity'] = pd.to_numeric(df_asks['Quantity'], errors='coerce')

                    # Obtener los dos mayores 'quantity' en bids y asks
                    max_bids = df_bids.nlargest(3, 'Quantity')
                    max_asks = df_asks.nlargest(3, 'Quantity')

                    # Ordenar por precio
                    max_bids = max_bids.sort_values(by='Price', ascending=False)
                    max_asks = max_asks.sort_values(by='Price', ascending=True)

                    order_flow_bids_500 = 1000
                    order_flow_asks_500 = 2000

                    # Datos para bids (precios decrecientes)
                    bid_prices = [83000, 78800, 79100, 78000, 77800, 85550, 79700, 79650, 79600, 79550]
                    bid_quantities = [500, 200, 700, 150, 900, 300, 800, 400, 100, 600]
                    max_bids = pd.DataFrame({'Price': bid_prices, 'Quantity': bid_quantities}).sort_values(by='Price', ascending=False)

                    # Datos para asks (precios crecientes)
                    ask_prices = [90500, 91600, 91700, 91800, 91900, 97000, 95100, 93200, 93300, 93400]
                    ask_quantities = [400, 100, 700, 200, 800, 300, 900, 600, 500, 1000]
                    max_asks = pd.DataFrame({'Price': ask_prices, 'Quantity': ask_quantities}).sort_values(by='Price', ascending=True)

                    # Filtrar los bids con diferencia de precio menor a 200, conservando el de mayor 'Quantity'
                    filtered_bids = []
                    previous_bid = None

                    for _, row in max_bids.iterrows():
                        if previous_bid is None : #or abs(previous_bid['Price'] - row['Price']) > 200 or abs(previous_bid['Price'] - row['Price']) > 200:
                            filtered_bids.append(row)
                            previous_bid = row
                        elif abs(previous_bid['Price'] - row['Price']) > 400:
                            filtered_bids.append(row)
                            previous_bid = row
                        elif row['Quantity'] > previous_bid['Quantity']:
                            filtered_bids[-1] = row
                            previous_bid = row

                        
                            # Reemplaza la entrada anterior si el actual tiene mayor cantidad
                            

                    

                    # Convertir filtered_bids de nuevo a un DataFrame
                    filtered_bids = pd.DataFrame(filtered_bids)

                    # Filtrar los asks con diferencia de precio menor a 200, conservando el de mayor 'Quantity'
                    filtered_asks = []
                    previous_ask = None

                    for _, row in max_asks.iterrows():
                        if previous_ask is None or abs(previous_ask['Price'] - row['Price']) > 400:
                            filtered_asks.append(row)
                            previous_ask = row
                        elif row['Quantity'] > previous_ask['Quantity']:
                            # Reemplaza la entrada anterior si el actual tiene mayor cantidad
                            filtered_asks[-1] = row
                            previous_ask = row

                    # Convertir filtered_asks de nuevo a un DataFrame
                    filtered_asks = pd.DataFrame(filtered_asks)

                    max_bids = filtered_bids.nlargest(4, 'Quantity')
                    max_asks = filtered_asks.nlargest(4, 'Quantity')
                    #print("max_bids",max_bids)
                    #print("max_asks",max_asks)
                    
                    
                    

                opera = False
                if opera == True:         
                    try:
                        precio_entrada_long,precio_entrada_short,current_amount_long,current_amount_short= get_amount(symbol)
                        try:
                            cantidad_en_tp_short,cantidad_en_tp_long,cantidad_en_tp_short_1,cantidad_en_tp_long_1,cantidad_en_tp_short_2,cantidad_en_tp_long_2,cantidad_en_tp_short_3,cantidad_en_tp_long_3,order_id_short_tp,order_id_long_tp,order_id_short_tp_1,order_id_long_tp_1,order_id_short_tp_2,order_id_long_tp_2,order_id_short_tp_3,order_id_long_tp_3 = revisar_tp(symbol)
                        except Exception as e:
                            print("aqui",e)
                        cantidad_en_short,cantidad_en_long = revisar_ordenes(symbol)
                        available_balance = balance_()
                        print("current_amount_short",current_amount_short)
                        print("current_amount_long",current_amount_long)
                        current_time = time.time()
                        if (current_time - last_print_time >= 30):
                            last_print_time = current_time
                            
                        
                            
                            print("balance",available_balance)
                            

                            
                            
                            #input("okokoko")
                            # Comparar precios actuales con los anteriores
                            current_max_bids_prices = max_bids['Price'].tolist()
                            current_max_asks_prices = max_asks['Price'].tolist()

                            
                            # Ordenar precios de las ofertas de compra (bids) de mayor a menor
                            current_max_bids_prices = sorted(current_max_bids_prices, reverse=True)

                            # Ordenar precios de las ofertas de venta (asks) de mayor a menor
                            current_max_asks_prices = sorted(current_max_asks_prices, reverse=False)

                            # Asignar los precios a variables long1, long2, y long3
                            long1 = 0
                            long2 = 0
                            long3 = 0
                            long4 = 0

                            short1 = 0
                            short2 = 0
                            short3 = 0
                            short4 = 0


                            if len(current_max_bids_prices) >= 3:
                                # Tomar hasta los primeros 5 elementos, redondear y ajustar
                                longs = [round(price) + 55 for price in current_max_bids_prices[:5]]

                                # Filtrar para asegurar diferencias de al menos 0.5%
                                filtered_longs = []
                                for price in longs:
                                    if long1 == 0:
                                        long1 = int(price)
                                        continue
                                    elif long2 == 0:
                                        if price < long1*0.995:
                                            long2 = int(price)
                                            continue
                                        else:
                                            continue
                                    elif long3 == 0:
                                        if price < long2*0.995:
                                            long3 = int(price)
                                            continue
                                        else:
                                            continue
                                    elif long4 == 0:
                                        if price < long3*0.995:
                                            long4 = int(price)
                                            continue
                                        else:
                                            continue
                                    

                                            

                     
                                # Imprimir resultados
                                print(f"long1: {long1}")
                                print(f"long2: {long2}")
                                print(f"long3: {long3}")
                                print(f"long4: {long4}")


                            if len(current_max_asks_prices) >= 3:
                                # Tomar hasta los primeros 5 elementos, redondear y ajustar
                                shorts = [round(price) - 55 for price in current_max_asks_prices[:5]]

                                # Filtrar para asegurar diferencias de al menos 0.5%
                                filtered_shorts = []
                                for price in shorts:
                                    if short1 == 0:
                                        short1 = int(price)
                                        continue
                                    elif short2 == 0:
                                        if price > short1*1.005:
                                            short2 = int(price)
                                            continue
                                        else:
                                            continue
                                    elif short3 == 0:
                                        if price > short2*1.005:
                                            short3 = int(price)
                                            continue
                                        else:
                                            continue
                                    elif short4 == 0:
                                        if price > short3*1.005:
                                            short4 = int(price)
                                            continue
                                        else:
                                            continue
                                # Imprimir resultados
                                print(f"short1: {short1}")
                                print(f"short2: {short2}")
                                print(f"short3: {short3}")
                                print(f"short4: {short4}")

                                # Verificar si no se lograron suficientes precios
                         

                            unidad_de_riesgo = 10 # 1% = 1
                            riesgo_1 = ((unidad_de_riesgo/10)*2.5)/100
                            riesgo_2 = ((unidad_de_riesgo/10)*2.5)/100
                            riesgo_3 = ((unidad_de_riesgo/10)*2.5)/100
                            riesgo_4 = ((unidad_de_riesgo/10)*2.5)/100
                          

                            if current_amount_long == 0 and long1!= 0 and long2 != 0 and long3 != 0 and long4!= 0:
               #                 print("current_amount_long = 0",current_amount_long)
                                if abs(current_price - long1) / current_price < 0.005 and cantidad_en_long != 0 :
                                    print(f"El precio más cercano en Max Bids ({long1}) está a menos del 0.5% de {current_price}.")
                                    pass
                                else:
                                    try:
                                        cancelar_longs(symbol)

                                    except Exception as e:
                                        #pass
                                        print("111",e)
                                    
                                    minim_stop_long = float(long1)*0.9
                                    
                                    stop_long = float(long4)*0.95
                                    if stop_long < minim_stop_long:
                                        pass
                                    else:
                                        stop_long = minim_stop_long

                                    stop_long = round(stop_long)
                                    # Calculamos el tamaño de posición para cada compra

                                    tamaño_long_1 = calcular_tamaño_posicion(riesgo_1, available_balance, long1, stop_long)
                                    tamaño_long_2 = calcular_tamaño_posicion(riesgo_2, available_balance, long2, stop_long)
                                    tamaño_long_3 = calcular_tamaño_posicion(riesgo_3, available_balance, long3, stop_long)
                                    tamaño_long_4 = calcular_tamaño_posicion(riesgo_4, available_balance, long4, stop_long)
                                 

                                    if tamaño_long_1 < float(contract_size_minimo):
                                        tamaño_long_1 = float(contract_size_minimo)
                                    
                                    tamaño_long_1 = int(round(tamaño_long_1,3)/float(contract_size_minimo))
                                    tamaño_long_2 = int(round(tamaño_long_2,3)/float(contract_size_minimo))
                                    tamaño_long_3 = int(round(tamaño_long_3,3)/float(contract_size_minimo))
                                    tamaño_long_4 = int(round(tamaño_long_4,3)/float(contract_size_minimo))
                                 
                    #             print("long1",long1)
                    #             print("long2",long2)
                    #             print("long3",long3)
                    #             print(f"Tamaño de posición Long 1: {tamaño_long_1}")
                    #             print(f"Tamaño de posición Long 2: {tamaño_long_2}")
                    #             print(f"Tamaño de posición Long 3: {tamaño_long_3}")


                                    try:
                                        print("long1",long1)
                                        print("long2",long2)
                                        print("long3",long3)
                                        print("stop_long",stop_long)

                                        place_futures_order_with_stop_tp(API_KEY_BITMART, SECRET_KEY_BITMART, MEMO_BITMART, symbol, 1, tamaño_long_1,long1 ,stop_long)
                                        place_futures_order_with_stop_tp(API_KEY_BITMART, SECRET_KEY_BITMART, MEMO_BITMART, symbol, 1, tamaño_long_2,long2 ,stop_long)
                                        place_futures_order_with_stop_tp(API_KEY_BITMART, SECRET_KEY_BITMART, MEMO_BITMART, symbol, 1, tamaño_long_3,long3 ,stop_long )
                                        place_futures_order_with_stop_tp(API_KEY_BITMART, SECRET_KEY_BITMART, MEMO_BITMART, symbol, 1, tamaño_long_4,long4 ,stop_long)
                                       
                                    except Exception as e:
                                        print("112",e)

                            if current_amount_short == 0 and short1 != 0 and short2 != 0 and short3 != 0 and short4 != 0  :
                          #      print("current_amount_short = 0",current_amount_short)
                                if abs(current_price - short1) / current_price < 0.005 and cantidad_en_short != 0:
                                    print(f"El precio más cercano en Max asks ({short1}) está a menos del 0.5% de {current_price}.")
                                    pass
                                else:
                                    try:
                                        cancelar_shorts(symbol)

                                    except Exception as e:
                                        print("114",e)

                                    stop_short = float(short4)*1.05
                                    minim_stop_short = float(short1)*1.1

                                    if minim_stop_short > stop_short:
                                        stop_short = minim_stop_short
                                    stop_short = round(stop_short)
                                    
                                    # Calculamos el tamaño de posición para cada compra
                                    tamaño_short_1 = calcular_tamaño_posicion(riesgo_1, available_balance, short1, stop_short)
                                    tamaño_short_2 = calcular_tamaño_posicion(riesgo_2, available_balance, short2, stop_short)
                                    tamaño_short_3 = calcular_tamaño_posicion(riesgo_3, available_balance, short3, stop_short)
                                    tamaño_short_4 = calcular_tamaño_posicion(riesgo_4, available_balance, short4, stop_short)
                                 
                                    if tamaño_short_1 < float(contract_size_minimo):
                                        tamaño_short_1 = float(contract_size_minimo)

                                    tamaño_short_1 = int(round(tamaño_short_1,3)/float(contract_size_minimo))
                                    tamaño_short_2 = int(round(tamaño_short_2,3)/float(contract_size_minimo))
                                    tamaño_short_3 = int(round(tamaño_short_3,3)/float(contract_size_minimo))
                                    tamaño_short_4 = int(round(tamaño_short_4,3)/float(contract_size_minimo))
                                 
                    #                print("short1",short1)
                    #                print("short2",short2)
                    #                print("short3",short3)
                    #                print(f"Tamaño de posición Short 1: {tamaño_short_1}")
                    #                print(f"Tamaño de posición Short 2: {tamaño_short_2}")
                    #                print(f"Tamaño de posición Short 3: {tamaño_short_3}")
                    
                                        

                                    try:
                                        print("stop_short",stop_short)
                                        print("short3",short3)
                                        print("short2",short2)
                                        print("short1",short1)
                                        #print("ossjhdghjskjhdgfdhjsk")
                                        place_futures_order_with_stop_tp(API_KEY_BITMART, SECRET_KEY_BITMART, MEMO_BITMART, symbol, 4, tamaño_short_1,short1 ,stop_short)
                                        place_futures_order_with_stop_tp(API_KEY_BITMART, SECRET_KEY_BITMART, MEMO_BITMART, symbol, 4, tamaño_short_2,short2 ,stop_short)
                                        place_futures_order_with_stop_tp(API_KEY_BITMART, SECRET_KEY_BITMART, MEMO_BITMART, symbol, 4, tamaño_short_3,short3 ,stop_short )
                                        place_futures_order_with_stop_tp(API_KEY_BITMART, SECRET_KEY_BITMART, MEMO_BITMART, symbol, 4, tamaño_short_4,short4 ,stop_short)
                                     
                                    except Exception as e:
                                        print("115",e)
                    
                        if int(current_amount_long) >= 1:
                            #print("current_amount_long 1",current_amount_long)
                            if float(current_amount_long) == (float(cantidad_en_tp_long)+float(cantidad_en_tp_long_1)+float(cantidad_en_tp_long_2)+float(cantidad_en_tp_long_3)):
                                pass
                            else:
                                try:
                                    if float(cantidad_en_tp_long) != 0:
                                    
                                        try:
                                            cancel_futures_order(API_KEY_BITMART, SECRET_KEY_BITMART, MEMO_BITMART, symbol,order_id_long_tp)
                                        except Exception as e:
                                            pass
                                    if float(cantidad_en_tp_long_1) != 0:
                                    
                                        try:
                                            cancel_futures_order(API_KEY_BITMART, SECRET_KEY_BITMART, MEMO_BITMART, symbol,order_id_long_tp_1)
                                        except Exception as e:
                                            pass 
                                    if float(cantidad_en_tp_long_2) != 0:
                                        try:
                                            cancel_futures_order(API_KEY_BITMART, SECRET_KEY_BITMART, MEMO_BITMART, symbol,order_id_long_tp_2)
                                        except Exception as e:
                                            pass
                                    if float(cantidad_en_tp_long_3) != 0:
                                        try:
                                            cancel_futures_order(API_KEY_BITMART, SECRET_KEY_BITMART, MEMO_BITMART, symbol,order_id_long_tp_3)
                                        except Exception as e:
                                            pass
                      
                                except Exception as e:
                                    print(e)
                                try:
                                    tp_long = float(precio_entrada_long)*1.005
                                    tp_long = round(tp_long)
                                    current_amount_long = int(current_amount_long)
                                    #print("tp_long",tp_long)
                                    place_futures_tp(API_KEY_BITMART, SECRET_KEY_BITMART, MEMO_BITMART, symbol, 3, current_amount_long,tp_long )

                                except Exception as e:
                                    print(e)
                        #print("2")
                        if int(current_amount_short) >= 1:
                            #print("current_amount_short 2",current_amount_short)
                            if int(current_amount_short) == (float(cantidad_en_tp_short)+float(cantidad_en_tp_short_1)+float(cantidad_en_tp_short_2)+float(cantidad_en_tp_short_3)):
                                pass
                            else:
                                try:
                                    if float(cantidad_en_tp_short) != 0: #
                                        
                                        
                                        try:
                                            cancel_futures_order(API_KEY_BITMART, SECRET_KEY_BITMART, MEMO_BITMART, symbol,order_id_short_tp)
                                        except Exception as e:
                                            pass
                                    if float(cantidad_en_tp_short_1) != 0: 
                                        
                                        
                                        try:
                                            cancel_futures_order(API_KEY_BITMART, SECRET_KEY_BITMART, MEMO_BITMART, symbol,order_id_short_tp_1)
                                        except Exception as e:
                                            pass 
                                    if float(cantidad_en_tp_short_2) != 0:
                                        
                                        try:
                                            cancel_futures_order(API_KEY_BITMART, SECRET_KEY_BITMART, MEMO_BITMART, symbol,order_id_short_tp_2)
                                        except Exception as e:
                                            pass
                                    if float(cantidad_en_tp_short_3) != 0:
                                        
                                        try:
                                            cancel_futures_order(API_KEY_BITMART, SECRET_KEY_BITMART, MEMO_BITMART, symbol,order_id_short_tp_3)
                                        except Exception as e:
                                            pass

                                except Exception as e:
                                    print(e)
                                try:
                                    tp_short = float(precio_entrada_short)*0.995
                                    tp_short = round(tp_short)
                                    current_amount_short = int(current_amount_short)
                                    place_futures_tp(API_KEY_BITMART, SECRET_KEY_BITMART, MEMO_BITMART, symbol, 2, current_amount_short,tp_short )

                                except Exception as e:
                                    print(e)
                            # print("5")   

                    except Exception as e:
                        print("7",e)

            except DepthCacheOutOfSync:
                pass  # Ignorar errores temporales de sincronización

    except KeyboardInterrupt:
        print("Gracefully stopping...")

    # Detener la instancia y cerrar todos los manejadores
    ubldc.stop_manager()


symbol = 'BTCUSDT'
interval = "1h"
cantidad_total = 72 # 1444 ( 1min ), 288 ( si es 5min ), 96 ( si es 15min)
df_1m = obtener_multiples_velass(client, symbol, interval, cantidad_total)
offset = 0
primera_vuelta_1m = False
df_1m['timestamp'] = pd.to_datetime(df_1m['timestamp'], unit='ms')
df_1m['timestamp'] = df_1m['timestamp'] - pd.DateOffset(hours=4)  # Sumar 4 ho
df_1m.set_index('timestamp', inplace=True)

maxs_1m = []
mins_1m = []
ll_values_1m = []
lh_values_1m = []
hh_values_1m = []
hl_values_1m = []
order_flow_500 = 0
order_flow_2000 = 0

# Función para aplicar el efecto flash a una celda

# Función para restaurar el color original de la celda
def reset_cell_color(table_cell, original_color):
    #print("ghjhgbnmb")
    table_cell.set_facecolor(original_color)
    fig.canvas.draw()  # Actualizar la visualización

# Función de actualización
def actualizar_grafico(i):
    global df_1m,current_price,max_bids,max_asks,df_asks_10,df_bids_10,df_asks,df_bids,trades_data,vwap,cvd_futures,hh_values_1m, ll_values_1m,order_flow_500,order_flow_2000,cvd_futures_color,previous_table_data,previous_max_bids,previous_max_asks,order_flow_bids_500,order_flow_asks_500,sum_ventas,sum_compras,sum_ventas_spot,sum_compras_spot,last_text,current_time_last,green_cells1,green_cells,green_cells2,sum_compras,sum_compras_spot,sum_ventas,sum_ventas_spot,max_ask_liq,max_bid_liq,tipo_sesgo_anterior,tiempo_transcurrido,sesgo_alcista,sesgo_bajista,sesgo_medio,foto_png,diferencia_numero_fut,diferencia_numero_spot,ultimo_cambio_sesgo
    # Cargar la fecha guardada
    
    price_precision, contract_size_minimo,current_price = get_symbol_details(symbol)
    current_price = round(float(current_price))
    current_price = int(current_price)
    #print(trades_data)
    
    #input("ojghhj")
    #current_price = round(get_current_price('BTCUSDT'), 2)
    

    interval = "1h"
    cantidad_total = 72 # 1444 ( 1min ), 288 ( si es 5min ), 96 ( si es 15min)
    df_1m = obtener_multiples_velass(client, symbol, interval, cantidad_total)
    offset = 0
    primera_vuelta_1m = False
    df_1m['timestamp'] = pd.to_datetime(df_1m['timestamp'], unit='ms')
    df_1m['timestamp'] = df_1m['timestamp'] - pd.DateOffset(hours=4)  # Sumar 4 ho
    df_1m.set_index('timestamp', inplace=True)
    timestamps_1m = df_1m.index
    highs_1m  = df_1m['high']
    lows_1m = df_1m['low']
    open_1m = df_1m['open']
    closes_1m = df_1m['close']
    sesgo_color = '#FFFF00'

    
    if prueba == True:
        order_flow_2000 = 2000
        order_flow_500 = 500
        vwap = round(current_price*1.2)
        sum_compras = 500
        sum_compras_spot = 500
        sum_ventas = 750
        sum_ventas_spot = 750

    # Cambiar el grosor del borde si es necesario
 #   ax_volume.spines['top'].set_linewidth(1.5)
 #   ax_volume.spines['bottom'].set_linewidth(1.5)
 #   ax_volume.spines['left'].set_linewidth(1.5)
 #   ax_volume.spines['right'].set_linewidth(1.5)
    # Actualizar velas a la izquierda
    ax_candles_left.clear()
    # Limitar el número máximo de etiquetas del eje Y
    # Limitar el número máximo de etiquetas del eje Y
    ax_candles_left.yaxis.set_major_locator(MaxNLocator(nbins=20))

    # Cambiar el color de las etiquetas del eje Y
    ax_candles_left.tick_params(axis='y', colors=fondo_color)

   #  Calcular el rango del eje Y para centrar el precio actual
    rango_y = 0.05* current_price  # Margen del 2% del precio actual
    y_min = current_price - rango_y
    y_max = current_price + rango_y
    numero_barras = 80
    rango_total = y_max - y_min
    grosor_barras = rango_total / numero_barras
    # Ajustar los límites del eje Y
    ax_candles_left.set_ylim([y_min, y_max])
    

    # Añadir un grid al fondo del gráfico con alta transparencia y cada 200 dólares
    # Añadir solo el grid horizontal al fondo del gráfico
    #ax_candles_left.grid(True, axis='y', linestyle='--', linewidth=0.4, color='gray', alpha=0.3)
    
    # Calcular precios de referencia que terminen en "00"
    precio_inicial = (y_min // 200) * 200  # Redondear hacia abajo al múltiplo de 100 más cercano
    precios_referencia = np.arange(precio_inicial, y_max, 200)  # Generar etiquetas cada 100 dólares
    ax_candles_left.set_yticklabels([]) 
    # Añadir solo un grid horizontal en los precios que terminan en "00", con alta transparencia
    for precio in precios_referencia:
        if precio % 200 == 0:  # Asegurarse de que el precio termine en "00"
           # print("tengo que activar ")
            
            ax_candles_left.axhline(precio, color='gray', linestyle='--', linewidth=0.4, alpha=0.3)
            #
            ax_volume.text(0.09, (precio), f'{round(precio)}', verticalalignment='center', color=color_blanco, fontsize=16, transform=ax_volume.get_yaxis_transform())

    # Establecer etiquetas en el eje Y para precios que terminen en "00"
    #ax_candles_left.set_yticks(precios_referencia)
    #ax_candles_left.set_yticklabels([f'{precio:.2f}' for precio in precios_referencia], fontsize=10, color=color_blanco)



    mc = mpf.make_marketcolors(up='#00FF00', down='#FF0000', wick='inherit', edge='inherit', volume='inherit')
    s = mpf.make_mpf_style(marketcolors=mc, facecolor=fondo_color)
   # ax_candles_left.axhline(current_price, color=color_blanco, linestyle='-', linewidth=1)
   # ax_candles_left.text(-0.1, current_price, f'{current_price}', verticalalignment='center', color=color_blanco, fontsize=10, transform=ax_candles_left.get_yaxis_transform())
    
    # Extraer los tres precios más grandes de bids (verde) y asks (rojo)
     # Asegúrate de que los datos sean numéricos, convirtiendo la columna 'Quantity'
    if not max_bids.empty and not max_asks.empty:
        
        # Convertir 'Price' a numérico en ambas DataFrames
        df_bids['Price'] = pd.to_numeric(df_bids['Price'], errors='coerce')
        df_asks['Price'] = pd.to_numeric(df_asks['Price'], errors='coerce')

        # Calcular el spread como la diferencia entre el precio más bajo en las órdenes de venta y el precio más alto en las órdenes de compra
        spread = df_asks['Price'].min() - df_bids['Price'].max()

        #print("Spread:", spread)
  
        # Máximos HH y HL
        # Filtrar los bids con diferencia de precio menor a 200, conservando el de mayor 'Quantity'
        filtered_bids = []
        previous_bid = None

        for _, row in max_bids.iterrows():
            if previous_bid is None : #or abs(previous_bid['Price'] - row['Price']) > 200 or abs(previous_bid['Price'] - row['Price']) > 200:
                filtered_bids.append(row)
                previous_bid = row
            elif abs(previous_bid['Price'] - row['Price']) > 400:
                filtered_bids.append(row)
                previous_bid = row
            elif row['Quantity'] > previous_bid['Quantity']:
                filtered_bids[-1] = row
                previous_bid = row

            
                # Reemplaza la entrada anterior si el actual tiene mayor cantidad
                

        

        # Convertir filtered_bids de nuevo a un DataFrame
        filtered_bids = pd.DataFrame(filtered_bids)

        # Filtrar los asks con diferencia de precio menor a 200, conservando el de mayor 'Quantity'
        filtered_asks = []
        previous_ask = None

        for _, row in max_asks.iterrows():
            if previous_ask is None or abs(previous_ask['Price'] - row['Price']) > 400:
                filtered_asks.append(row)
                previous_ask = row
            elif row['Quantity'] > previous_ask['Quantity']:
                # Reemplaza la entrada anterior si el actual tiene mayor cantidad
                filtered_asks[-1] = row
                previous_ask = row

        # Convertir filtered_asks de nuevo a un DataFrame
        filtered_asks = pd.DataFrame(filtered_asks)

        max_bids = filtered_bids.nlargest(3, 'Quantity')
        max_asks = filtered_asks.nlargest(3, 'Quantity')
        #print("max_bids",max_bids)
        #print("max_asks",max_asks)


    
        # Extraer los precios para las líneas verdes y rojas, y ordenar los precios
        precios_verdes = max_bids['Price'].sort_values(ascending=False).tolist()  # Los precios de los 3 bids más grandes ordenados en orden descendente
        precios_rojos = max_asks['Price'].sort_values(ascending=True).tolist()  # Los precios de los 3 asks más grandes ordenados en orden ascendente
        
        y_offset = 100

        for precio in precios_verdes:
            
            # Ajustar el offset vertical si hay líneas cercanas para evitar superposición
            
            # Añadir la etiqueta de texto para el precio
            #print("tengo que activar ")
            #if precio < current_price*0.997:
            ax_candles_left.text(0.01, (precio ), f'{round(precio)}', verticalalignment='center', color='#59cd4d', fontsize=18, transform=ax_candles_left.get_yaxis_transform())

            # Añadir la línea verde, desplazada para comenzar después de la etiqueta
            x_start_offset = 0.07  # Ajusta este valor para desplazar la línea desde el borde izquierdo (0.05 es un ejemplo)
            ax_candles_left.axhline(precio, xmin=x_start_offset, xmax=1.0, color='#59cd4d', linestyle='-', linewidth=2.0, alpha=0.5)


            previous_price = precio

        y_offset = 100

        for precio in precios_rojos:
            
            
            ax_candles_left.text(0.01, (precio + y_offset), f'{round(precio)}', verticalalignment='center', color='#ea3643', fontsize=18, transform=ax_candles_left.get_yaxis_transform())

            # Añadir la línea roja, desplazada para comenzar después de la etiqueta
            x_start_offset = 0.07  # Ajusta este valor para desplazar la línea desde el borde izquierdo (0.05 es un ejemplo)
            ax_candles_left.axhline(precio, xmin=x_start_offset, xmax=1.0, color='#ea3643', linestyle='-', linewidth=2.0, alpha=0.5)


            previous_price = precio
        # Mantienes la línea para el precio actual, si es necesario
        #print("tengo que activar ")
        ax_candles_left.axhline(current_price, color=color_blanco, linestyle='--', linewidth=0.2)
        ax_candles_left.text(0.08, current_price, f'{round(current_price)}', verticalalignment='center', color=color_blanco, fontsize=18, transform=ax_candles_left.get_yaxis_transform())

    

        ax_candles_left.axhline(vwap, color=color_amarillo, linestyle='--', linewidth=0.5)
        #ax_candles_left.text(0.01, current_price, f'{round(current_price)}', verticalalignment='center', color=color_amarillo, fontsize=18, transform=ax_candles_left.get_yaxis_transform())

        #ax_volume.text(0.01, current_price, f'{round(current_price)}', verticalalignment='center', color=color_blanco, fontsize=18, transform=ax_candles_left.get_yaxis_transform())

        # Cambiar el formato de las fechas del eje X
        ax_candles_left.xaxis.set_major_formatter(mdates.DateFormatter('%d %H:%M'))  # Cambiar el formato a 'Año-Mes-Día Hora:Minuto'
        ax_candles_left.tick_params(axis='x', colors=color_blanco)
        mpf.plot(df_1m, type='candle', ax=ax_candles_left, style=s, volume=False, mav=(5, 10), show_nontrading=True)

        # Ajustar el límite del eje X para que las barras comiencen desde la derecha
        #max_bid_quantity = df_bids_10['Quantity'].max()
        #max_ask_quantity = df_asks_10['Quantity'].max()
        ax_volume.clear()
        ax_volume.set_ylim([y_min, y_max])
        ax_volume.axhline(vwap, color=color_amarillo, linestyle='--', linewidth=0.5)
        
        # Graficar el volumen de Bids (compras) como barras verdes hacia la izquierda (debajo del precio)
        ax_volume.barh(df_bids['Price'], df_bids['Quantity'], color='#59cd4d', height=grosor_barras * 0.4) 

        # Graficar el volumen de Asks (ventas) como barras rojas hacia la izquierda (encima del precio)
        ax_volume.barh(df_asks['Price'], df_asks['Quantity'], color='#ea3643', height=grosor_barras * 0.4)

        # Ajustar los límites del eje X para que comiencen desde el borde derecho
        max_quantity = max(df_bids['Quantity'].max(), df_asks['Quantity'].max())
        #print(max_quantity)
        ax_volume.set_xlim([max_quantity * 1, 0]) 
        ax_volume.tick_params(axis='x', colors=color_blanco)
        
        if max_quantity < 500:
            max_quantity = 500
        # Calcular los valores de xticks basados en el máximo dividido por 6, redondeando
        step = np.ceil(max_quantity / 10)  # Divide por 6 y redondea hacia arriba
        xticks = np.arange(0, max_quantity + step, step)  # Genera los ticks de 0 al máximo, con un paso de 'step'

        # Definir los valores de las etiquetas en el eje X
        ax_volume.set_xticks(xticks)
        ax_volume.grid(True, axis='y', linestyle='--', linewidth=0.4, color='gray', alpha=0.3)
        # Calcular precios de referencia que terminen en "00"
        precio_inicial = (y_min // 200) * 200  # Redondear hacia abajo al múltiplo de 100 más cercano
        precios_referencia = np.arange(precio_inicial, y_max, 200)  # Generar etiquetas cada 100 dólares
        ax_volume.set_yticklabels([]) 
        # Añadir solo un grid horizontal en los precios que terminan en "00", con alta transparencia
        for precio in precios_referencia:
            if precio % 200 == 0:  # Asegurarse de que el precio termine en "00"
            # print("tengo que activar ")
                ax_volume.axhline(precio, color='gray', linestyle='--', linewidth=0.4, alpha=0.3)
                #
                ax_volume.text(1.05, (precio), f'{round(precio)}', verticalalignment='center', color=color_blanco, fontsize=18, transform=ax_volume.get_yaxis_transform())



        # Actualizar el gráfico de simulación en el tercer gráfico (derecha)
        ax_simulation.clear()
        
        ax_simulation.set_axis_off()

        
        # Obtener los datos de trades_data y ajustarlos para la tabla
        table = trades_data.values.tolist()  # Convertir DataFrame a lista de listas
        table_1 = trades_data.iloc[:, 1:].values.tolist()

        # Extraer los precios para las líneas verdes y rojas (top 3 bids y asks)
        precios_verdes = max_bids['Price'].tolist()  # Los precios de los 3 bids más grandes
        precios_rojos = max_asks['Price'].tolist()  # Los precios de los 3 asks más grandes

        #print(f"{tipo_sesgo_anterior} hace {int(tiempo_transcurrido // 3600)} H Y {int((tiempo_transcurrido % 3600) // 60)} M")
        tiempo = int(tiempo_transcurrido // 3600)
        tiempo_str = str(tiempo)

        tiempo_m = int((tiempo_transcurrido % 3600) // 60)
        tiempo_m_str = str(tiempo_m)
        tiempo_final = (tiempo_str + "H Y "+tiempo_m_str + "M" )
        #diferencia_numero_spot = 100
        #diferencia_numero_fut = 1000
        if tipo_sesgo_anterior == "bajista":
            additional_data = [
                ['D I R E C C I O N                      ', vwap],
                ['            D O M I N A N C I A                  '],
                ['S E S G O   B A J I S T A',tiempo_final],
                ['D E L T A   F U T U R O S                   ',diferencia_numero_fut],
                ['D E L T A   S P O T                              ',diferencia_numero_spot]
                
                
            ]
            additional_data_1 = [
                ['D I R E C C I O N                      ', vwap],
                ['            D O M I N A N C I A                  '],
                ['S E S G O   B A J I S T A',tiempo_final],
                ['D E L T A   F U T U R O S                   ',diferencia_numero_fut],
                ['D E L T A   S P O T                              ',diferencia_numero_spot]
            ]
        
        elif tipo_sesgo_anterior == "alcista":
            additional_data = [
                ['D I R E C C I O N                      ', vwap],
                ['            D O M I N A N C I A                  '],
                ['S E S G O   A L C I S T A',tiempo_final],
                ['D E L T A   F U T U R O S                   ',diferencia_numero_fut],
                ['D E L T A   S P O T                              ',diferencia_numero_spot]
                
                
            ]
            additional_data_1 = [
                ['D I R E C C I O N                      ', vwap],
                ['            D O M I N A N C I A                  '],
                ['S E S G O   A L C I S T A',tiempo_final],
                ['D E L T A   F U T U R O S                   ',diferencia_numero_fut],
                ['D E L T A   S P O T                              ',diferencia_numero_spot]
            ]
        
        elif tipo_sesgo_anterior == "medio":
            additional_data = [
                ['D I R E C C I O N                      ', vwap],
                ['            D O M I N A N C I A                  '],
                ['S E S G O   M E D I O',tiempo_final],
                ['D E L T A   F U T U R O S                   ',diferencia_numero_fut],
                ['D E L T A   S P O T                              ',diferencia_numero_spot]
                
                
            ]
            additional_data_1 = [
                ['D I R E C C I O N                      ', vwap],
                ['            D O M I N A N C I A                  '],
                ['S E S G O   M E D I O',tiempo_final],
                ['D E L T A   F U T U R O S                   ',diferencia_numero_fut],
                ['D E L T A   S P O T                              ',diferencia_numero_spot]
            ]
        else:
            additional_data = [
                ['D I R E C C I O N                      ', vwap],
                ['            D O M I N A N C I A                  '],
                ['S E S G O   M E D I O',tiempo_final],
                ['D E L T A   F U T U R O S                   ',diferencia_numero_fut],
                ['D E L T A   S P O T                              ',diferencia_numero_spot]
                
                
            ]
            additional_data_1 = [
                ['D I R E C C I O N                      ', vwap],
                ['            D O M I N A N C I A                  '],
                ['S E S G O   M E D I O',tiempo_final],
                ['D E L T A   F U T U R O S                   ',diferencia_numero_fut],
                ['D E L T A   S P O T                              ',diferencia_numero_spot]
            ]
            
        
        
        additional= [
            ['  ',''],
            ['      T R A N S A C C I O N E S','']
        ]
        additional_12= [
            ['                       ',''],
            ['      T R A N S A C C I O N E S','']
        ]
        additional.extend(table)
        additional_data.extend(additional)

        additional_12.extend(table_1)
        additional_data_1.extend(additional_12)
        

        table_data = additional_data
        
        table_data_1 = additional_data_1

        
        if sesgo_alcista == True:
          sesgo_color = '#104d00'
        elif sesgo_bajista == True:
            sesgo_color = '#610108'
        else:
            sesgo_color = fondo_color

          

        vwap_color = '#104d00' if vwap > current_price else '#610108'
        order_flow_500_color = '#104d00' if order_flow_500 > 0 else '#610108'
        order_flow_2000_color = '#104d00' if order_flow_2000 > 0 else '#610108'

        single_column_data = []
        label_font_size = 35       # Tamaño de la fuente para las etiquetas
        alignment_point_x = 35     # Punto X donde deben comenzar todos los valores (fijo)
        num_filas = 15             # Número fijo de filas

        # Procesar los datos existentes
        for row in table_data_1[:num_filas]:
            label = row[0] if len(row) > 0 else ''  # Si la fila tiene datos, usar el primer elemento
            value = row[1] if len(row) > 1 else ''  # Si la fila tiene un valor, usarlo, de lo contrario dejar vacío

            # Generar los espacios necesarios para que el valor comience en el punto X deseado
            spaces_to_value = ' ' * (alignment_point_x - len(label))

            # Combinar la etiqueta con los espacios y el valor
            combined_text = f"{label}{spaces_to_value}{value}"
            single_column_data.append([combined_text])

        # Si hay menos de 14 filas de datos, agregar filas vacías para completar
        while len(single_column_data) < num_filas:
            label = '  '  # Etiqueta vacía
            value = ''  # Valor vacío
            #spaces_to_value = ' ' * (alignment_point_x - len(label))
            combined_text = f"{label}{value}"
            single_column_data.append([combined_text])

        
        colors = [
            '#610108' if (row[0].startswith('Venta') and 500000 > float(row[1].replace('K','e3').replace('M','e6')) >= 100000) else
            '#7b0810' if (row[0].startswith('Venta') and 1000000 > float(row[1].replace('K','e3').replace('M','e6')) >= 500000) else
            '#910e18' if (row[0].startswith('Venta') and float(row[1].replace('K','e3').replace('M','e6')) >= 1000000) else
            '#104d00' if (row[0].startswith('Compra') and 500000 >float(row[1].replace('K','e3').replace('M','e6')) >= 100000) else
            '#1a6207' if (row[0].startswith('Compra') and 1000000 > float(row[1].replace('K','e3').replace('M','e6')) >= 500000) else
            '#24780d' if (row[0].startswith('Compra') and float(row[1].replace('K','e3').replace('M','e6')) >= 1000000) else
        #   '#FF6347' if row[0].startswith('NODO BAJ.') else
        #   '#32CD32' if row[0].startswith('NODO ALC.') else
            #order_flow_500_color if row[0] == 'D O M I N A N C I A   5 %                            ' else
        # order_flow_2000_color if row[0] == 'D O M I N A N C I A   1 0 %                        ' else
            sesgo_color if row[0].startswith('S E S G O') else
            vwap_color if row[0] == 'D I R E C C I O N                      ' else
            #cvd_futures_color if row[0] == 'D E L T A   C V D                                          ' else
            fondo_color if row[0] == '      T R A N S A C C I O N E S' else
            fondo_color if row[0] == '  ' else
            '#F5DEB3'
            for row in table_data
        ]

        nuevas_compras = []
        # Iterar sobre los datos actuales y comparar con los datos previos
        for row in table_data:
            if (row[0] == 'Compra Futuros' or row[0] == 'Venta Futuros')  and  row not in previous_table_data:
                nuevas_compras.append(row)
                previous_table_data.append(row)
        #print("previous_table_data",previous_table_data)

    
        for nueva_compra in nuevas_compras:
            #print("Nueva compra detectada:", nueva_compra)
            nueva_compra_cantidad = nueva_compra[1]
            nueva_compra_precio = nueva_compra[2]
            break

            
        #,order_flow_bids_500,order_flow_asks_500
        # Añadir celdas a la tabla (una sola columna con la información combinada)
        for i, row in enumerate(single_column_data):



            # Definir el espaciado y la altura constantes para todas las tablas
            table_height = 0.065  # Altura consistente para todas las tablas
            vertical_spacing = 0.067  # Espaciado constante entre cada tabla

            # Añadir celdas a la tabla (una sola columna con la información combinada)
            current_time = time.time()
            
            for i, row in enumerate(single_column_data):
                y_position = (14 - i) * vertical_spacing  # Calcular la posición vertical para cada tabla de manera consistente
                table = Table(ax_simulation, bbox=[0.004, y_position, 1, table_height])  # Aplicar un bbox consistente para todas las tablas
                
                

                
                
                if i in [1]:  # Si es la fila "Dominancia 5%"
                    

                    total_cells = 100
                    

                    if order_flow_bids_500 > order_flow_asks_500:
                        doble = order_flow_bids_500*2
                        green_cells = 100-(int((order_flow_asks_500/doble)*100))
                    else:
                        doble = order_flow_asks_500*2
                        green_cells = (int((order_flow_bids_500/doble)*100))

                    
                   # order_flow_500_1 = order_flow_asks_500*2
                    
                    #green_cells = int((order_flow_bids_500/order_flow_500_1)*100)
                    #print("green_cells",green_cells)
                    # Añadir celdas verdes y rojas con la misma altura
                    for a in range(green_cells):
                        table.add_cell(1, a, width=0.01, height=table_height, text='', loc='center', facecolor='#104d00', edgecolor='none')

                    for a in range(green_cells, total_cells):
                        table.add_cell(1, a, width=0.01, height=table_height, text='', loc='center', facecolor='#610108', edgecolor='none')

                    
                    # Eliminar el texto anterior en la celda específica donde `i == 1`
                    for text in ax_simulation.texts:
                        if text.get_position()[1] == y_position + (table_height / 2):
                            text.remove()

                    # Añadir un texto superpuesto sobre la celda "Dominancia 5%"
                    text = row[0]
                    ax_simulation.text(0.5, y_position + (table_height / 2), f'{text}', ha='center', va='center',
                                    transform=ax_simulation.transAxes, fontsize=12, color='white', fontproperties=font_prop)
                    

                    ax_simulation.text(0.1, y_position + (table_height / 2), f'{round(order_flow_bids_500)}', ha='center', va='center',
                                    transform=ax_simulation.transAxes, fontsize=18, color='white', fontproperties=font_prop)
                
                    ax_simulation.text(0.9, y_position + (table_height / 2), f'{(round(order_flow_asks_500))}', ha='center', va='center',
                                    transform=ax_simulation.transAxes, fontsize=18, color='white', fontproperties=font_prop)


                    


                elif i in [3] and sum_compras != 0 and sum_ventas != 0:  # Si es la fila "Dominancia 5%"
                    total_cells = 100

                    
                   
                    green_cells1_1 = int((sum_compras / (sum_compras + sum_ventas)) * total_cells)
                    if green_cells1_1 > (green_cells1+2) or green_cells1_1 < (green_cells1-2):

                        green_cells1 = int((sum_compras / (sum_compras + sum_ventas)) * total_cells)
                    
                    # Añadir celdas verdes y rojas con la misma altura
                    for s in range(green_cells1):
                        table.add_cell(1, s, width=0.01, height=table_height, text='', loc='center', facecolor='#104d00', edgecolor='none')

                    for s in range(green_cells1, total_cells):
                        table.add_cell(1, s, width=0.01, height=table_height, text='', loc='center', facecolor='#610108', edgecolor='none')

                    # Añadir un texto superpuesto sobre la celda "Dominancia 5%"
                    text = row[0]
                    ax_simulation.text(0.05, y_position + (table_height / 2), f'{text}', ha='left', va='center',
                                    transform=ax_simulation.transAxes, fontsize=14, color='white', fontproperties=font_prop)
                    
        #            ax_simulation.text(0.04, y_position + (table_height / 2), f'{green_cells1}', ha='left', va='center',
         #                           transform=ax_simulation.transAxes, fontsize=18, color='white', fontproperties=font_prop)
                
        #            ax_simulation.text(0.89, y_position + (table_height / 2), f'{(100-green_cells1)}', ha='left', va='center',
       #                             transform=ax_simulation.transAxes, fontsize=18, color='white', fontproperties=font_prop)
                
                

                elif i in [4] and sum_compras_spot != 0 and sum_ventas_spot != 0:  # Si es la fila "Dominancia 5%"
                    total_cells = 100

                    
                    
                    green_cells2_2 = int((sum_compras_spot / (sum_compras_spot + sum_ventas_spot)) * total_cells)

                    if green_cells2_2 > (green_cells2+2) or green_cells2_2 < (green_cells2-2) :

                        green_cells2 = int((sum_compras_spot / (sum_compras_spot + sum_ventas_spot)) * total_cells)
                    
                   

                    # Añadir celdas verdes y rojas con la misma altura
                    for d in range(green_cells2):
                        table.add_cell(1, d, width=0.01, height=table_height, text='', loc='center', facecolor='#104d00', edgecolor='none')

                    for d in range(green_cells2, total_cells):
                        table.add_cell(1, d, width=0.01, height=table_height, text='', loc='center', facecolor='#610108', edgecolor='none')

                    # Añadir un texto superpuesto sobre la celda "Dominancia 5%"
                    text = row[0]
                    ax_simulation.text(0.05, y_position + (table_height / 2), f'{text}', ha='left', va='center',
                                    transform=ax_simulation.transAxes, fontsize=14, color='white', fontproperties=font_prop)
                    
    #                ax_simulation.text(0.04, y_position + (table_height / 2), f'{green_cells2}', ha='left', va='center',
     #                               transform=ax_simulation.transAxes, fontsize=18, color='white', fontproperties=font_prop)
                
    #                ax_simulation.text(0.89, y_position + (table_height / 2), f'{(100-green_cells2)}', ha='left', va='center',
     #                               transform=ax_simulation.transAxes, fontsize=18, color='white', fontproperties=font_prop)
                
                
                
                    
                
                

                
                else:
                    

                    # Añadir una sola celda que ocupe toda la fila para otras filas
                    if row[0].strip() == '':
                        facecolor = fondo_color  # Fondo para filas vacías
                    else:
                        facecolor = colors[i % len(colors)]

                    text = row[0]
                    table.add_cell(0, 0, width=1, height=table_height, loc='center', facecolor=facecolor, edgecolor='none')
                    if i in [6]: 
                        ax_simulation.text(0, y_position + (table_height / 2), f'{text}', ha='left', va='center',
                                        transform=ax_simulation.transAxes, fontsize=20, color='white', fontproperties=font_prop)
                    else:
                        ax_simulation.text(0.08, y_position + (table_height / 2), f'{text}', ha='left', va='center',
                                    transform=ax_simulation.transAxes, fontsize=14, color='white', fontproperties=font_prop)

                
                        # Añadir la tabla al gráfico `ax_simulation`
                ax_simulation.add_table(table)
                current_time_last = current_time

        # Carga tu logo
        logo = mpimg.imread('/Users/jaimegarcia/Desktop/codigos/oraculo/logo_gon1.png')  # Reemplaza con la ruta de tu logo
        # Elimina el logo actual
        
        # Añadir el logo en el gráfico usando un nuevo `Axes`
        # Añadir el logo centrado en el gráfico principal
        #logo_ax.remove()
        logo_ax.clear()  # Limpia el eje antes de mostrar el nuevo logo
    
        logo_ax.imshow(logo, alpha=0.03)
        logo_ax.axis('off')  # Oculta los ejes del logo

        # Ajustar la posición de los gráficos de velas y volumen
        pos_left = ax_candles_left.get_position()
        pos_volume = ax_volume.get_position()
        ax_volume.set_position([pos_left.x1, pos_volume.y0, pos_volume.width, pos_volume.height])

        # Hacer que los bordes entre las gráficas coincidan con el color del fondo
        ax_candles_left.spines['right'].set_color(fondo_color)
        ax_volume.spines['left'].set_color(fondo_color)
        ax_volume.get_yaxis().set_visible(False)

    if foto_png == True:
        foto_png = False
        guardar_grafico_en_carpeta()

def actualizar_grafico_ETH(i):
    global df_1m,current_price,max_bids,max_asks,df_asks_10,df_bids_10,df_asks,df_bids,trades_data,vwap,cvd_futures,hh_values_1m, ll_values_1m,order_flow_500,order_flow_2000,cvd_futures_color,previous_table_data,previous_max_bids,previous_max_asks,order_flow_bids_500,order_flow_asks_500,sum_ventas,sum_compras,sum_ventas_spot,sum_compras_spot,last_text,current_time_last,green_cells1,green_cells,green_cells2,sum_compras,sum_compras_spot,sum_ventas,sum_ventas_spot,max_ask_liq,max_bid_liq,tipo_sesgo_anterior,tiempo_transcurrido,sesgo_alcista,sesgo_bajista,sesgo_medio,foto_png,diferencia_numero_fut,diferencia_numero_spot,ultimo_cambio_sesgo
    # Cargar la fecha guardada
    
    price_precision, contract_size_minimo,current_price = get_symbol_details(symbol)
    current_price = round(float(current_price))
    current_price = int(current_price)
    #print(trades_data)
    
    #input("ojghhj")
    #current_price = round(get_current_price('BTCUSDT'), 2)
    

    interval = "1h"
    cantidad_total = 72 # 1444 ( 1min ), 288 ( si es 5min ), 96 ( si es 15min)
    df_1m = obtener_multiples_velass(client, symbol, interval, cantidad_total)
    offset = 0
    primera_vuelta_1m = False
    df_1m['timestamp'] = pd.to_datetime(df_1m['timestamp'], unit='ms')
    df_1m['timestamp'] = df_1m['timestamp'] - pd.DateOffset(hours=4)  # Sumar 4 ho
    df_1m.set_index('timestamp', inplace=True)
    timestamps_1m = df_1m.index
    highs_1m  = df_1m['high']
    lows_1m = df_1m['low']
    open_1m = df_1m['open']
    closes_1m = df_1m['close']
    sesgo_color = '#FFFF00'

    
    if prueba == True:
        order_flow_2000 = 2000
        order_flow_500 = 500
        vwap = round(current_price*1.2)
        sum_compras = 500
        sum_compras_spot = 500
        sum_ventas = 750
        sum_ventas_spot = 750

    # Cambiar el grosor del borde si es necesario
 #   ax_volume.spines['top'].set_linewidth(1.5)
 #   ax_volume.spines['bottom'].set_linewidth(1.5)
 #   ax_volume.spines['left'].set_linewidth(1.5)
 #   ax_volume.spines['right'].set_linewidth(1.5)
    # Actualizar velas a la izquierda
    ax_candles_left1.clear()
    # Limitar el número máximo de etiquetas del eje Y
    # Limitar el número máximo de etiquetas del eje Y
    ax_candles_left1.yaxis.set_major_locator(MaxNLocator(nbins=20))

    # Cambiar el color de las etiquetas del eje Y
    ax_candles_left1.tick_params(axis='y', colors=fondo_color)

   #  Calcular el rango del eje Y para centrar el precio actual
    rango_y = 0.05* current_price  # Margen del 2% del precio actual
    y_min = current_price - rango_y
    y_max = current_price + rango_y
    numero_barras = 80
    rango_total = y_max - y_min
    grosor_barras = rango_total / numero_barras
    # Ajustar los límites del eje Y
    ax_candles_left1.set_ylim([y_min, y_max])
    

    # Añadir un grid al fondo del gráfico con alta transparencia y cada 200 dólares
    # Añadir solo el grid horizontal al fondo del gráfico
    #ax_candles_left.grid(True, axis='y', linestyle='--', linewidth=0.4, color='gray', alpha=0.3)
    
    # Calcular precios de referencia que terminen en "00"
    precio_inicial = (y_min // 200) * 200  # Redondear hacia abajo al múltiplo de 100 más cercano
    precios_referencia = np.arange(precio_inicial, y_max, 200)  # Generar etiquetas cada 100 dólares
    ax_candles_left1.set_yticklabels([]) 
    # Añadir solo un grid horizontal en los precios que terminan en "00", con alta transparencia
    for precio in precios_referencia:
        if precio % 200 == 0:  # Asegurarse de que el precio termine en "00"
           # print("tengo que activar ")
            
            ax_candles_left1.axhline(precio, color='gray', linestyle='--', linewidth=0.4, alpha=0.3)
            #
            ax_volume1.text(0.09, (precio), f'{round(precio)}', verticalalignment='center', color=color_blanco, fontsize=16, transform=ax_volume.get_yaxis_transform())

    # Establecer etiquetas en el eje Y para precios que terminen en "00"
    #ax_candles_left.set_yticks(precios_referencia)
    #ax_candles_left.set_yticklabels([f'{precio:.2f}' for precio in precios_referencia], fontsize=10, color=color_blanco)



    mc = mpf.make_marketcolors(up='#00FF00', down='#FF0000', wick='inherit', edge='inherit', volume='inherit')
    s = mpf.make_mpf_style(marketcolors=mc, facecolor=fondo_color)
   # ax_candles_left.axhline(current_price, color=color_blanco, linestyle='-', linewidth=1)
   # ax_candles_left.text(-0.1, current_price, f'{current_price}', verticalalignment='center', color=color_blanco, fontsize=10, transform=ax_candles_left.get_yaxis_transform())
    
    # Extraer los tres precios más grandes de bids (verde) y asks (rojo)
     # Asegúrate de que los datos sean numéricos, convirtiendo la columna 'Quantity'
    if not max_bids.empty and not max_asks.empty:
        
        # Convertir 'Price' a numérico en ambas DataFrames
        df_bids['Price'] = pd.to_numeric(df_bids['Price'], errors='coerce')
        df_asks['Price'] = pd.to_numeric(df_asks['Price'], errors='coerce')

        # Calcular el spread como la diferencia entre el precio más bajo en las órdenes de venta y el precio más alto en las órdenes de compra
        spread = df_asks['Price'].min() - df_bids['Price'].max()

        #print("Spread:", spread)
  
        # Máximos HH y HL
        # Filtrar los bids con diferencia de precio menor a 200, conservando el de mayor 'Quantity'
        filtered_bids = []
        previous_bid = None

        for _, row in max_bids.iterrows():
            if previous_bid is None : #or abs(previous_bid['Price'] - row['Price']) > 200 or abs(previous_bid['Price'] - row['Price']) > 200:
                filtered_bids.append(row)
                previous_bid = row
            elif abs(previous_bid['Price'] - row['Price']) > 400:
                filtered_bids.append(row)
                previous_bid = row
            elif row['Quantity'] > previous_bid['Quantity']:
                filtered_bids[-1] = row
                previous_bid = row

            
                # Reemplaza la entrada anterior si el actual tiene mayor cantidad
                

        

        # Convertir filtered_bids de nuevo a un DataFrame
        filtered_bids = pd.DataFrame(filtered_bids)

        # Filtrar los asks con diferencia de precio menor a 200, conservando el de mayor 'Quantity'
        filtered_asks = []
        previous_ask = None

        for _, row in max_asks.iterrows():
            if previous_ask is None or abs(previous_ask['Price'] - row['Price']) > 400:
                filtered_asks.append(row)
                previous_ask = row
            elif row['Quantity'] > previous_ask['Quantity']:
                # Reemplaza la entrada anterior si el actual tiene mayor cantidad
                filtered_asks[-1] = row
                previous_ask = row

        # Convertir filtered_asks de nuevo a un DataFrame
        filtered_asks = pd.DataFrame(filtered_asks)

        max_bids = filtered_bids.nlargest(3, 'Quantity')
        max_asks = filtered_asks.nlargest(3, 'Quantity')
        #print("max_bids",max_bids)
        #print("max_asks",max_asks)


    
        # Extraer los precios para las líneas verdes y rojas, y ordenar los precios
        precios_verdes = max_bids['Price'].sort_values(ascending=False).tolist()  # Los precios de los 3 bids más grandes ordenados en orden descendente
        precios_rojos = max_asks['Price'].sort_values(ascending=True).tolist()  # Los precios de los 3 asks más grandes ordenados en orden ascendente
        
        y_offset = 100

        for precio in precios_verdes:
            
            # Ajustar el offset vertical si hay líneas cercanas para evitar superposición
            
            # Añadir la etiqueta de texto para el precio
            #print("tengo que activar ")
            #if precio < current_price*0.997:
            ax_candles_left1.text(0.01, (precio ), f'{round(precio)}', verticalalignment='center', color='#59cd4d', fontsize=18, transform=ax_candles_left.get_yaxis_transform())

            # Añadir la línea verde, desplazada para comenzar después de la etiqueta
            x_start_offset = 0.07  # Ajusta este valor para desplazar la línea desde el borde izquierdo (0.05 es un ejemplo)
            ax_candles_left1.axhline(precio, xmin=x_start_offset, xmax=1.0, color='#59cd4d', linestyle='-', linewidth=2.0, alpha=0.5)


            previous_price = precio

        y_offset = 100

        for precio in precios_rojos:
            
            
            ax_candles_left1.text(0.01, (precio + y_offset), f'{round(precio)}', verticalalignment='center', color='#ea3643', fontsize=18, transform=ax_candles_left.get_yaxis_transform())

            # Añadir la línea roja, desplazada para comenzar después de la etiqueta
            x_start_offset = 0.07  # Ajusta este valor para desplazar la línea desde el borde izquierdo (0.05 es un ejemplo)
            ax_candles_left1.axhline(precio, xmin=x_start_offset, xmax=1.0, color='#ea3643', linestyle='-', linewidth=2.0, alpha=0.5)


            previous_price = precio
        # Mantienes la línea para el precio actual, si es necesario
        #print("tengo que activar ")
        ax_candles_left1.axhline(current_price, color=color_blanco, linestyle='--', linewidth=0.2)
        ax_candles_left1.text(0.08, current_price, f'{round(current_price)}', verticalalignment='center', color=color_blanco, fontsize=18, transform=ax_candles_left.get_yaxis_transform())

    

        ax_candles_left1.axhline(vwap, color=color_amarillo, linestyle='--', linewidth=0.5)
        #ax_candles_left.text(0.01, current_price, f'{round(current_price)}', verticalalignment='center', color=color_amarillo, fontsize=18, transform=ax_candles_left.get_yaxis_transform())

        #ax_volume.text(0.01, current_price, f'{round(current_price)}', verticalalignment='center', color=color_blanco, fontsize=18, transform=ax_candles_left.get_yaxis_transform())

        # Cambiar el formato de las fechas del eje X
        ax_candles_left1.xaxis.set_major_formatter(mdates.DateFormatter('%d %H:%M'))  # Cambiar el formato a 'Año-Mes-Día Hora:Minuto'
        ax_candles_left1.tick_params(axis='x', colors=color_blanco)
        mpf.plot(df_1m, type='candle', ax=ax_candles_left1, style=s, volume=False, mav=(5, 10), show_nontrading=True)

        # Ajustar el límite del eje X para que las barras comiencen desde la derecha
        #max_bid_quantity = df_bids_10['Quantity'].max()
        #max_ask_quantity = df_asks_10['Quantity'].max()
        ax_volume1.clear()
        ax_volume1.set_ylim([y_min, y_max])
        ax_volume1.axhline(vwap, color=color_amarillo, linestyle='--', linewidth=0.5)
        
        # Graficar el volumen de Bids (compras) como barras verdes hacia la izquierda (debajo del precio)
        ax_volume1.barh(df_bids['Price'], df_bids['Quantity'], color='#59cd4d', height=grosor_barras * 0.4) 

        # Graficar el volumen de Asks (ventas) como barras rojas hacia la izquierda (encima del precio)
        ax_volume1.barh(df_asks['Price'], df_asks['Quantity'], color='#ea3643', height=grosor_barras * 0.4)

        # Ajustar los límites del eje X para que comiencen desde el borde derecho
        max_quantity = max(df_bids['Quantity'].max(), df_asks['Quantity'].max())
        #print(max_quantity)
        ax_volume1.set_xlim([max_quantity * 1, 0]) 
        ax_volume1.tick_params(axis='x', colors=color_blanco)
        
        if max_quantity < 500:
            max_quantity = 500
        # Calcular los valores de xticks basados en el máximo dividido por 6, redondeando
        step = np.ceil(max_quantity / 10)  # Divide por 6 y redondea hacia arriba
        xticks = np.arange(0, max_quantity + step, step)  # Genera los ticks de 0 al máximo, con un paso de 'step'

        # Definir los valores de las etiquetas en el eje X
        ax_volume1.set_xticks(xticks)
        ax_volume1.grid(True, axis='y', linestyle='--', linewidth=0.4, color='gray', alpha=0.3)
        # Calcular precios de referencia que terminen en "00"
        precio_inicial = (y_min // 200) * 200  # Redondear hacia abajo al múltiplo de 100 más cercano
        precios_referencia = np.arange(precio_inicial, y_max, 200)  # Generar etiquetas cada 100 dólares
        ax_volume1.set_yticklabels([]) 
        # Añadir solo un grid horizontal en los precios que terminan en "00", con alta transparencia
        for precio in precios_referencia:
            if precio % 200 == 0:  # Asegurarse de que el precio termine en "00"
            # print("tengo que activar ")
                ax_volume1.axhline(precio, color='gray', linestyle='--', linewidth=0.4, alpha=0.3)
                #
                ax_volume1.text(1.05, (precio), f'{round(precio)}', verticalalignment='center', color=color_blanco, fontsize=18, transform=ax_volume.get_yaxis_transform())



        # Actualizar el gráfico de simulación en el tercer gráfico (derecha)
        ax_simulation1.clear()
        
        ax_simulation1.set_axis_off()

        
        # Obtener los datos de trades_data y ajustarlos para la tabla
        table = trades_data.values.tolist()  # Convertir DataFrame a lista de listas
        table_1 = trades_data.iloc[:, 1:].values.tolist()

        # Extraer los precios para las líneas verdes y rojas (top 3 bids y asks)
        precios_verdes = max_bids['Price'].tolist()  # Los precios de los 3 bids más grandes
        precios_rojos = max_asks['Price'].tolist()  # Los precios de los 3 asks más grandes

        #print(f"{tipo_sesgo_anterior} hace {int(tiempo_transcurrido // 3600)} H Y {int((tiempo_transcurrido % 3600) // 60)} M")
        tiempo = int(tiempo_transcurrido // 3600)
        tiempo_str = str(tiempo)

        tiempo_m = int((tiempo_transcurrido % 3600) // 60)
        tiempo_m_str = str(tiempo_m)
        tiempo_final = (tiempo_str + "H Y "+tiempo_m_str + "M" )
        #diferencia_numero_spot = 100
        #diferencia_numero_fut = 1000
        if tipo_sesgo_anterior == "bajista":
            additional_data = [
                ['D I R E C C I O N                      ', vwap],
                ['            D O M I N A N C I A                  '],
                ['S E S G O   B A J I S T A',tiempo_final],
                ['D E L T A   F U T U R O S                   ',diferencia_numero_fut],
                ['D E L T A   S P O T                              ',diferencia_numero_spot]
                
                
            ]
            additional_data_1 = [
                ['D I R E C C I O N                      ', vwap],
                ['            D O M I N A N C I A                  '],
                ['S E S G O   B A J I S T A',tiempo_final],
                ['D E L T A   F U T U R O S                   ',diferencia_numero_fut],
                ['D E L T A   S P O T                              ',diferencia_numero_spot]
            ]
        
        elif tipo_sesgo_anterior == "alcista":
            additional_data = [
                ['D I R E C C I O N                      ', vwap],
                ['            D O M I N A N C I A                  '],
                ['S E S G O   A L C I S T A',tiempo_final],
                ['D E L T A   F U T U R O S                   ',diferencia_numero_fut],
                ['D E L T A   S P O T                              ',diferencia_numero_spot]
                
                
            ]
            additional_data_1 = [
                ['D I R E C C I O N                      ', vwap],
                ['            D O M I N A N C I A                  '],
                ['S E S G O   A L C I S T A',tiempo_final],
                ['D E L T A   F U T U R O S                   ',diferencia_numero_fut],
                ['D E L T A   S P O T                              ',diferencia_numero_spot]
            ]
        
        elif tipo_sesgo_anterior == "medio":
            additional_data = [
                ['D I R E C C I O N                      ', vwap],
                ['            D O M I N A N C I A                  '],
                ['S E S G O   M E D I O',tiempo_final],
                ['D E L T A   F U T U R O S                   ',diferencia_numero_fut],
                ['D E L T A   S P O T                              ',diferencia_numero_spot]
                
                
            ]
            additional_data_1 = [
                ['D I R E C C I O N                      ', vwap],
                ['            D O M I N A N C I A                  '],
                ['S E S G O   M E D I O',tiempo_final],
                ['D E L T A   F U T U R O S                   ',diferencia_numero_fut],
                ['D E L T A   S P O T                              ',diferencia_numero_spot]
            ]
        else:
            additional_data = [
                ['D I R E C C I O N                      ', vwap],
                ['            D O M I N A N C I A                  '],
                ['S E S G O   M E D I O',tiempo_final],
                ['D E L T A   F U T U R O S                   ',diferencia_numero_fut],
                ['D E L T A   S P O T                              ',diferencia_numero_spot]
                
                
            ]
            additional_data_1 = [
                ['D I R E C C I O N                      ', vwap],
                ['            D O M I N A N C I A                  '],
                ['S E S G O   M E D I O',tiempo_final],
                ['D E L T A   F U T U R O S                   ',diferencia_numero_fut],
                ['D E L T A   S P O T                              ',diferencia_numero_spot]
            ]
            
        
        
        additional= [
            ['  ',''],
            ['      T R A N S A C C I O N E S','']
        ]
        additional_12= [
            ['                       ',''],
            ['      T R A N S A C C I O N E S','']
        ]
        additional.extend(table)
        additional_data.extend(additional)

        additional_12.extend(table_1)
        additional_data_1.extend(additional_12)
        

        table_data = additional_data
        
        table_data_1 = additional_data_1

        
        if sesgo_alcista == True:
          sesgo_color = '#104d00'
        elif sesgo_bajista == True:
            sesgo_color = '#610108'
        else:
            sesgo_color = fondo_color

          

        vwap_color = '#104d00' if vwap > current_price else '#610108'
        order_flow_500_color = '#104d00' if order_flow_500 > 0 else '#610108'
        order_flow_2000_color = '#104d00' if order_flow_2000 > 0 else '#610108'

        single_column_data = []
        label_font_size = 35       # Tamaño de la fuente para las etiquetas
        alignment_point_x = 35     # Punto X donde deben comenzar todos los valores (fijo)
        num_filas = 15             # Número fijo de filas

        # Procesar los datos existentes
        for row in table_data_1[:num_filas]:
            label = row[0] if len(row) > 0 else ''  # Si la fila tiene datos, usar el primer elemento
            value = row[1] if len(row) > 1 else ''  # Si la fila tiene un valor, usarlo, de lo contrario dejar vacío

            # Generar los espacios necesarios para que el valor comience en el punto X deseado
            spaces_to_value = ' ' * (alignment_point_x - len(label))

            # Combinar la etiqueta con los espacios y el valor
            combined_text = f"{label}{spaces_to_value}{value}"
            single_column_data.append([combined_text])

        # Si hay menos de 14 filas de datos, agregar filas vacías para completar
        while len(single_column_data) < num_filas:
            label = '  '  # Etiqueta vacía
            value = ''  # Valor vacío
            #spaces_to_value = ' ' * (alignment_point_x - len(label))
            combined_text = f"{label}{value}"
            single_column_data.append([combined_text])

        
        colors = [
            '#610108' if (row[0].startswith('Venta') and 500000 > float(row[1].replace('K','e3').replace('M','e6')) >= 100000) else
            '#7b0810' if (row[0].startswith('Venta') and 1000000 > float(row[1].replace('K','e3').replace('M','e6')) >= 500000) else
            '#910e18' if (row[0].startswith('Venta') and float(row[1].replace('K','e3').replace('M','e6')) >= 1000000) else
            '#104d00' if (row[0].startswith('Compra') and 500000 >float(row[1].replace('K','e3').replace('M','e6')) >= 100000) else
            '#1a6207' if (row[0].startswith('Compra') and 1000000 > float(row[1].replace('K','e3').replace('M','e6')) >= 500000) else
            '#24780d' if (row[0].startswith('Compra') and float(row[1].replace('K','e3').replace('M','e6')) >= 1000000) else
        #   '#FF6347' if row[0].startswith('NODO BAJ.') else
        #   '#32CD32' if row[0].startswith('NODO ALC.') else
            #order_flow_500_color if row[0] == 'D O M I N A N C I A   5 %                            ' else
        # order_flow_2000_color if row[0] == 'D O M I N A N C I A   1 0 %                        ' else
            sesgo_color if row[0].startswith('S E S G O') else
            vwap_color if row[0] == 'D I R E C C I O N                      ' else
            #cvd_futures_color if row[0] == 'D E L T A   C V D                                          ' else
            fondo_color if row[0] == '      T R A N S A C C I O N E S' else
            fondo_color if row[0] == '  ' else
            '#F5DEB3'
            for row in table_data
        ]

        nuevas_compras = []
        # Iterar sobre los datos actuales y comparar con los datos previos
        for row in table_data:
            if (row[0] == 'Compra Futuros' or row[0] == 'Venta Futuros')  and  row not in previous_table_data:
                nuevas_compras.append(row)
                previous_table_data.append(row)
        #print("previous_table_data",previous_table_data)

    
        for nueva_compra in nuevas_compras:
            #print("Nueva compra detectada:", nueva_compra)
            nueva_compra_cantidad = nueva_compra[1]
            nueva_compra_precio = nueva_compra[2]
            break

            
        #,order_flow_bids_500,order_flow_asks_500
        # Añadir celdas a la tabla (una sola columna con la información combinada)
        for i, row in enumerate(single_column_data):



            # Definir el espaciado y la altura constantes para todas las tablas
            table_height = 0.065  # Altura consistente para todas las tablas
            vertical_spacing = 0.067  # Espaciado constante entre cada tabla

            # Añadir celdas a la tabla (una sola columna con la información combinada)
            current_time = time.time()
            
            for i, row in enumerate(single_column_data):
                y_position = (14 - i) * vertical_spacing  # Calcular la posición vertical para cada tabla de manera consistente
                table = Table(ax_simulation, bbox=[0.004, y_position, 1, table_height])  # Aplicar un bbox consistente para todas las tablas
                
                

                
                
                if i in [1]:  # Si es la fila "Dominancia 5%"
                    

                    total_cells = 100
                    

                    if order_flow_bids_500 > order_flow_asks_500:
                        doble = order_flow_bids_500*2
                        green_cells = 100-(int((order_flow_asks_500/doble)*100))
                    else:
                        doble = order_flow_asks_500*2
                        green_cells = (int((order_flow_bids_500/doble)*100))

                    
                   # order_flow_500_1 = order_flow_asks_500*2
                    
                    #green_cells = int((order_flow_bids_500/order_flow_500_1)*100)
                    #print("green_cells",green_cells)
                    # Añadir celdas verdes y rojas con la misma altura
                    for a in range(green_cells):
                        table.add_cell(1, a, width=0.01, height=table_height, text='', loc='center', facecolor='#104d00', edgecolor='none')

                    for a in range(green_cells, total_cells):
                        table.add_cell(1, a, width=0.01, height=table_height, text='', loc='center', facecolor='#610108', edgecolor='none')

                    
                    # Eliminar el texto anterior en la celda específica donde `i == 1`
                    for text in ax_simulation1.texts:
                        if text.get_position()[1] == y_position + (table_height / 2):
                            text.remove()

                    # Añadir un texto superpuesto sobre la celda "Dominancia 5%"
                    text = row[0]
                    ax_simulation1.text(0.5, y_position + (table_height / 2), f'{text}', ha='center', va='center',
                                    transform=ax_simulation1.transAxes, fontsize=12, color='white', fontproperties=font_prop)
                    

                    ax_simulation1.text(0.1, y_position + (table_height / 2), f'{round(order_flow_bids_500)}', ha='center', va='center',
                                    transform=ax_simulation1.transAxes, fontsize=18, color='white', fontproperties=font_prop)
                
                    ax_simulation1.text(0.9, y_position + (table_height / 2), f'{(round(order_flow_asks_500))}', ha='center', va='center',
                                    transform=ax_simulation1.transAxes, fontsize=18, color='white', fontproperties=font_prop)


                    


                elif i in [3] and sum_compras != 0 and sum_ventas != 0:  # Si es la fila "Dominancia 5%"
                    total_cells = 100

                    
                   
                    green_cells1_1 = int((sum_compras / (sum_compras + sum_ventas)) * total_cells)
                    if green_cells1_1 > (green_cells1+2) or green_cells1_1 < (green_cells1-2):

                        green_cells1 = int((sum_compras / (sum_compras + sum_ventas)) * total_cells)
                    
                    # Añadir celdas verdes y rojas con la misma altura
                    for s in range(green_cells1):
                        table.add_cell(1, s, width=0.01, height=table_height, text='', loc='center', facecolor='#104d00', edgecolor='none')

                    for s in range(green_cells1, total_cells):
                        table.add_cell(1, s, width=0.01, height=table_height, text='', loc='center', facecolor='#610108', edgecolor='none')

                    # Añadir un texto superpuesto sobre la celda "Dominancia 5%"
                    text = row[0]
                    ax_simulation1.text(0.05, y_position + (table_height / 2), f'{text}', ha='left', va='center',
                                    transform=ax_simulation.transAxes, fontsize=14, color='white', fontproperties=font_prop)
                    
        #            ax_simulation.text(0.04, y_position + (table_height / 2), f'{green_cells1}', ha='left', va='center',
         #                           transform=ax_simulation.transAxes, fontsize=18, color='white', fontproperties=font_prop)
                
        #            ax_simulation.text(0.89, y_position + (table_height / 2), f'{(100-green_cells1)}', ha='left', va='center',
       #                             transform=ax_simulation.transAxes, fontsize=18, color='white', fontproperties=font_prop)
                
                

                elif i in [4] and sum_compras_spot != 0 and sum_ventas_spot != 0:  # Si es la fila "Dominancia 5%"
                    total_cells = 100

                    
                    
                    green_cells2_2 = int((sum_compras_spot / (sum_compras_spot + sum_ventas_spot)) * total_cells)

                    if green_cells2_2 > (green_cells2+2) or green_cells2_2 < (green_cells2-2) :

                        green_cells2 = int((sum_compras_spot / (sum_compras_spot + sum_ventas_spot)) * total_cells)
                    
                   

                    # Añadir celdas verdes y rojas con la misma altura
                    for d in range(green_cells2):
                        table.add_cell(1, d, width=0.01, height=table_height, text='', loc='center', facecolor='#104d00', edgecolor='none')

                    for d in range(green_cells2, total_cells):
                        table.add_cell(1, d, width=0.01, height=table_height, text='', loc='center', facecolor='#610108', edgecolor='none')

                    # Añadir un texto superpuesto sobre la celda "Dominancia 5%"
                    text = row[0]
                    ax_simulation1.text(0.05, y_position + (table_height / 2), f'{text}', ha='left', va='center',
                                    transform=ax_simulation1.transAxes, fontsize=14, color='white', fontproperties=font_prop)
                    
    #                ax_simulation.text(0.04, y_position + (table_height / 2), f'{green_cells2}', ha='left', va='center',
     #                               transform=ax_simulation.transAxes, fontsize=18, color='white', fontproperties=font_prop)
                
    #                ax_simulation.text(0.89, y_position + (table_height / 2), f'{(100-green_cells2)}', ha='left', va='center',
     #                               transform=ax_simulation.transAxes, fontsize=18, color='white', fontproperties=font_prop)
                
                
                
                    
                
                

                
                else:
                    

                    # Añadir una sola celda que ocupe toda la fila para otras filas
                    if row[0].strip() == '':
                        facecolor = fondo_color  # Fondo para filas vacías
                    else:
                        facecolor = colors[i % len(colors)]

                    text = row[0]
                    table.add_cell(0, 0, width=1, height=table_height, loc='center', facecolor=facecolor, edgecolor='none')
                    if i in [6]: 
                        ax_simulation1.text(0, y_position + (table_height / 2), f'{text}', ha='left', va='center',
                                        transform=ax_simulation1.transAxes, fontsize=20, color='white', fontproperties=font_prop)
                    else:
                        ax_simulation1.text(0.08, y_position + (table_height / 2), f'{text}', ha='left', va='center',
                                    transform=ax_simulation1.transAxes, fontsize=14, color='white', fontproperties=font_prop)

                
                        # Añadir la tabla al gráfico `ax_simulation`
                ax_simulation1.add_table(table)
                current_time_last = current_time

        # Carga tu logo
        logo = mpimg.imread('/Users/jaimegarcia/Desktop/codigos/oraculo/logo_gon1.png')  # Reemplaza con la ruta de tu logo
        # Elimina el logo actual
        
        # Añadir el logo en el gráfico usando un nuevo `Axes`
        # Añadir el logo centrado en el gráfico principal
        #logo_ax.remove()
        logo_ax.clear()  # Limpia el eje antes de mostrar el nuevo logo
    
        logo_ax.imshow(logo, alpha=0.03)
        logo_ax.axis('off')  # Oculta los ejes del logo

        # Ajustar la posición de los gráficos de velas y volumen
        pos_left = ax_candles_left1.get_position()
        pos_volume = ax_volume1.get_position()
        ax_volume1.set_position([pos_left.x1, pos_volume.y0, pos_volume.width, pos_volume.height])

        # Hacer que los bordes entre las gráficas coincidan con el color del fondo
        ax_candles_left1.spines['right'].set_color(fondo_color)
        ax_volume1.spines['left'].set_color(fondo_color)
        ax_volume1.get_yaxis().set_visible(False)

    if foto_png == True:
        foto_png = False
        guardar_grafico_en_carpeta()


def cargar_fecha(nombre_archivo):
    try:
        with open(nombre_archivo, 'r') as archivo:
            fecha = archivo.read()
       # print(f"Fecha cargada desde {nombre_archivo}: {fecha}")
        return fecha
    except FileNotFoundError:
        print(f"El archivo {nombre_archivo} no existe. Usando fecha actual.")
        return None
    
def guardar_fecha(nombre_archivo, fecha):
    with open(nombre_archivo, 'w') as archivo:
        fecha = str(fecha)
        archivo.write(fecha)
    #print(f"Fecha guardada en {nombre_archivo}: {fecha}")

def guardar_grafico_en_carpeta(carpeta="graficos", nombre_base="grafico"):
    """
    Guarda la figura actual como un archivo PNG en una carpeta específica con un nombre basado en la fecha.
    
    :param carpeta: Nombre de la carpeta donde se guardará la imagen.
    :param nombre_base: Nombre base para el archivo (se añadirá la fecha y hora).
    """
    # Crear la carpeta si no existe
    if not os.path.exists(carpeta):
        os.makedirs(carpeta)
    
    # Generar el nombre del archivo con la fecha y hora actual
    fecha_actual = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    nombre_archivo = f"{fecha_actual}.png"
    ruta_archivo = os.path.join(carpeta, nombre_archivo)
    
    # Guardar el gráfico
    plt.savefig(ruta_archivo, format='png', dpi=300)
    print(f"Gráfico guardado en {ruta_archivo}")

# Función para iniciar la animación
def animar_grafico():
    global df_1m,current_price,max_bids,max_asks,df_asks_10,df_bids_10,vwap,previous_table_data,last_text,green_cells1,green_cells,green_cells2,sum_compras,sum_compras_spot,sum_ventas,sum_ventas_spot,max_asks,max_bids,top_asks_spot,top_bids_spot,top_asks,top_bids
    ani = FuncAnimation(fig, actualizar_grafico, interval=1000, cache_frame_data=False)
   #ani = FuncAnimation(fig1, actualizar_grafico_ETH, interval=1000, cache_frame_data=False)
    plt.show()
    # Guardar el gráfico como HTML interactivo usando mpld3
   # html_str = mpld3.fig_to_html(fig)
  #  with open("grafico_interactivo.html", "w") as f:
 #       f.write(html_str)
#    print("Gráfico interactivo guardado como grafico_interactivo.html")

# Colores y estilo de los gráficos
fig.patch.set_facecolor(fondo_color)
ax_candles_left.set_facecolor(fondo_color)
ax_volume.set_facecolor(fondo_color)
ax_simulation.set_facecolor(fondo_color)

#fig1.patch.set_facecolor(fondo_color)
#ax_candles_left1.set_facecolor(fondo_color)
#ax_volume1.set_facecolor(fondo_color)
#ax_simulation1.set_facecolor(fondo_color)


def nodos(market):
    global primera_vez_sesgo,last_print_time_sesgo,top_asks,top_bids,df_1m,current_price,max_bids,max_asks,df_asks,df_bids,df_asks,df_bids,vwap,cvd_futures,order_flow_500,order_flow_2000,previous_max_bids,previous_max_asks,order_flow_bids_500,order_flow_asks_500,zonas_liquidacion_sell,zonas_liquidacion_buy,max_ask_liq,max_bid_liq,cantidad_en_tp_short_1,cantidad_en_tp_short_2,cantidad_en_tp_long_1,cantidad_en_tp_long_2,tipo_sesgo_anterior,tiempo_transcurrido,accumulated_volume_b_25,accumulated_volume_25,accumulated_volume_b,accumulated_volume_a,total_volume_a,total_volume_b,sesgo_alcista,sesgo_bajista,sesgo_medio,foto_png,ultimo_cambio_sesgo,top_bids_spot,top_asks_spot
    if top_asks and top_bids and top_bids_spot and top_asks_spot:
        

        try:
            ultimo_cambio_sesgo = cargar_fecha('fecha_guardada.txt')
        except Exception as e:
            print(e)

        tiempo_actual = time.time()

        if ultimo_cambio_sesgo:
        # print("hay fecha guardada, usar la fecha actual o un valor por defecto")
            ultimo_cambio_sesgo = float(ultimo_cambio_sesgo)
            tiempo_transcurrido = tiempo_actual - ultimo_cambio_sesgo
        # print(f"hace {int(tiempo_transcurrido // 3600)} H Y {int((tiempo_transcurrido % 3600) // 60)} M")
            pass
        else:
        # print("Si no hay fecha guardada, usar la fecha actual o un valor por defecto")
            ultimo_cambio_sesgo = time.time()
            tiempo_transcurrido = tiempo_actual - ultimo_cambio_sesgo
        #   print(f" hace {int(tiempo_transcurrido // 3600)} H Y {int((tiempo_transcurrido % 3600) // 60)} M")
    #
            guardar_fecha('fecha_guardada.txt', ultimo_cambio_sesgo)
            


        # Filtrar los bids por debajo del precio actual
        try:
            url = f"{BASE_URL_BITMART}//contract/public/details?symbol={market}"
            
            response = requests.get(url)
            
            if response.status_code == 200:
                data = response.json().get('data', [])
                #print("data",data)
                # Extraer la precisión de precio y el tamaño del contrato
                symbol_data = data['symbols'][0]  # Accedemos al primer (y único) elemento de la lista
                

                current_price = float(symbol_data['last_price'])
                print("preciooooooooooooo",current_price)
                rango_y = 0.05 * float(current_price)  # Margen del 2% del precio actual
                print("preciooooooooooooo",rango_y)
                y_min = current_price - rango_y
                y_max = current_price + rango_y
                print(market,current_price)

        except Exception as e:
            print("dssssd",e) 
        try:

            filtered_bids = [order for order in top_bids if float(order[0]) < current_price and float(order[0]) > y_min ]
            filtered_bids_spot = [order for order in top_bids_spot if float(order[0]) < current_price and float(order[0]) > y_min ]

            # Filtrar los asks por encima del precio actual
            filtered_asks = [order for order in top_asks if float(order[0]) > current_price and float(order[0]) < y_max]
            filtered_asks_spot = [order for order in top_asks_spot if float(order[0]) > current_price and float(order[0]) < y_max]
        except Exception as e:
            print("ddddd",e)
                        # Agrupar órdenes por niveles de $100
        try:
            grouped_bids = group_by_price_level_b(filtered_bids, bucket_size)
            grouped_asks = group_by_price_level_a(filtered_asks, bucket_size)
            grouped_bids_spot = group_by_price_level_b(filtered_bids_spot, bucket_size)
            grouped_asks_spot = group_by_price_level_a(filtered_asks_spot, bucket_size)
#                   

            df_bids = order_book_to_dataframe(grouped_bids, side='bids')
            df_asks = order_book_to_dataframe(grouped_asks, side='asks')
            df_bids_spot = order_book_to_dataframe(grouped_bids_spot, side='bids')
            df_asks_spot = order_book_to_dataframe(grouped_asks_spot, side='asks')
            
                
        except Exception as e:
            print("4",e)

        try:
        # Ordenar Bids por precio en orden descendente
            df_bids = df_bids.sort_values(by='Price', ascending=False)

            # Ordenar Asks por precio en orden ascendente
            df_asks = df_asks.sort_values(by='Price', ascending=True)
            df_bids_spot = df_bids_spot.sort_values(by='Price', ascending=False)

            # Ordenar Asks por precio en orden ascendente
            df_asks_spot = df_asks_spot.sort_values(by='Price', ascending=True)
            
            
            
            # Calcular el umbral mínimo (0.3%)
            threshold = current_price * 0.003  # 0.3% del precio actual

                            
            df_bids['Quantity'] = pd.to_numeric(df_bids['Quantity'], errors='coerce')
            # Asegúrate de que los datos sean numéricos, convirtiendo la columna 'Quantity'
            df_asks['Quantity'] = pd.to_numeric(df_asks['Quantity'], errors='coerce')

            # Filtrar bids y asks que están a más del 0.3% de distancia del precio actual
            df_bidss = df_bids[df_bids['Price'] <= (current_price - threshold)]
            df_askss = df_asks[df_asks['Price'] >= (current_price + threshold)]
            
            df_bidss = pd.concat([df_bidss, df_bids_spot], ignore_index=True)
            df_askss = pd.concat([df_askss, df_asks_spot], ignore_index=True)

            df_bids = pd.concat([df_bids, df_bids_spot], ignore_index=True)
            df_asks = pd.concat([df_asks, df_asks_spot], ignore_index=True)

            df_bids['Quantity'] = pd.to_numeric(df_bids['Quantity'], errors='coerce')
            # Asegúrate de que los datos sean numéricos, convirtiendo la columna 'Quantity'
            df_asks['Quantity'] = pd.to_numeric(df_asks['Quantity'], errors='coerce')

            max_bids = df_bids.nlargest(6, 'Quantity')
            max_bids = max_bids.sort_values(by='Price', ascending=False)
            max_asks = df_asks.nlargest(6, 'Quantity')
            max_asks = max_asks.sort_values(by='Price', ascending=True)



            order_flow_bids_500 = df_bids['Quantity'].sum()
            order_flow_asks_500 = df_asks['Quantity'].sum()

            # Calcular el order flow para cada rango
            order_flow_500 = float(order_flow_bids_500 - order_flow_asks_500)
        
            vwap_bids, accumulated_volume_b,total_volume_b,accumulated_volume_b_25 = (calculate_vwap_b(df_bids))
            vwap_asks, accumulated_volume_a,total_volume_a,accumulated_volume_25 = (calculate_vwap_a(df_asks))

            vwap_asks = round(vwap_asks)
            vwap_bids = round(vwap_bids)
            total_volume_b = round(total_volume_b)
            total_volume_a = round(total_volume_a)
            accumulated_volume_b = round(accumulated_volume_b)
            accumulated_volume_a = round(accumulated_volume_a)
            accumulated_volume_b_25 = round(accumulated_volume_b_25)
            accumulated_volume_25 = round(accumulated_volume_25)

            # Calcular la distancia porcentual desde el precio actual hasta el VWAP (arriba y abajo)
            distance_to_vwap_up = abs(vwap_asks - current_price) / current_price
            distance_to_vwap_down = abs(vwap_bids - current_price) / current_price

    #        print("distance_to_vwap_up",distance_to_vwap_up)
        #       print("distance_to_vwap_down",distance_to_vwap_down)

            # Calcular la eficiencia como el volumen acumulado dividido por la distancia porcentual al VWAP
            efficiency_up = accumulated_volume_a / distance_to_vwap_up if distance_to_vwap_up != 0 else float('inf')
            efficiency_down = accumulated_volume_b / distance_to_vwap_down if distance_to_vwap_down != 0 else float('inf')

            # Decidir hacia dónde sería más eficiente mover el precio
            if efficiency_up > efficiency_down:
                vwap = vwap_asks
                #print(f"Es más eficiente mover el precio hacia los asks {vwap_asks}.")
            
            elif efficiency_up < efficiency_down:
                vwap = vwap_bids
                # print(f"Es más eficiente mover el precio hacia los bids {vwap_bids}.")


        except Exception as e:
            print("ddddd",e)
        


        current_time = time.time()
        if (current_time - last_print_time_sesgo >= 300) or primera_vez_sesgo == True:
            last_print_time_sesgo = current_time
            primera_vez_sesgo = True

            if (total_volume_b) > (total_volume_a*2) and accumulated_volume_b_25 > total_volume_b*0.6 and vwap < current_price:
                
                if sesgo_bajista == False:
                    tiempo_actuala = time.time()
                    #print("sesgo bajista , liquidez abajo")
                    sesgo_bajista = True
                    sesgo_medio = False
                    ultimo_cambio_sesgo = tiempo_actuala
                    ultimo_cambio_sesgo_str = str(ultimo_cambio_sesgo)
                    guardar_fecha('fecha_guardada.txt', ultimo_cambio_sesgo_str)
                    tipo_sesgo_anterior = "bajista"
                    foto_png = True
                
            elif (total_volume_a) > (total_volume_b*2) and accumulated_volume_25 > total_volume_a*0.6 and vwap > current_price:
                
                if sesgo_alcista == False:
                    tiempo_actuala = time.time()
                    #print("sesgo_alcista , liquidez arriba")
                    sesgo_alcista = True
                    sesgo_medio = False
                    ultimo_cambio_sesgo = tiempo_actuala
                    ultimo_cambio_sesgo_str = str(ultimo_cambio_sesgo)

                    guardar_fecha('fecha_guardada.txt', ultimo_cambio_sesgo_str)
                    tipo_sesgo_anterior = "alcista"
                    foto_png = True

            elif vwap < current_price and sesgo_alcista == True:
                tiempo_actuala = time.time()
                #print("sesgo_medio , reversion")
                sesgo_medio = True
                sesgo_alcista = False
                sesgo_bajista = False
                ultimo_cambio_sesgo = tiempo_actuala
                ultimo_cambio_sesgo_str = str(ultimo_cambio_sesgo)
                guardar_fecha('fecha_guardada.txt', ultimo_cambio_sesgo_str)
                tipo_sesgo_anterior = "medio"
                foto_png = True
            
            elif vwap > current_price and sesgo_bajista == True:
                tiempo_actuala = time.time()
                #print("sesgo_medio , reversion")
                sesgo_medio = True
                sesgo_alcista = False
                sesgo_bajista = False
                ultimo_cambio_sesgo = tiempo_actuala
                ultimo_cambio_sesgo_str = str(ultimo_cambio_sesgo)
                guardar_fecha('fecha_guardada.txt', ultimo_cambio_sesgo_str)
                tipo_sesgo_anterior = "medio"
                foto_png = True

async def main_monitor(ubldc):
    global current_time_last,green_cells1,green_cells,green_cells2,sum_compras,sum_compras_spot,sum_ventas,sum_ventas_spot,max_asks,max_bids,ultimo_cambio_sesgo,top_asks,top_bids,df_asks,df_bids
        
    print("Iniciando la función main()")
    print("Obteniendo el gestor UBRA desde ubldc")
    ubra = ubldc.get_ubra_manager()
    
    print("Obteniendo información de intercambio de futuros")
    try:
        exchange_info = ubra.futures_exchange_info()
    except Exception as e:
        print("dd",e)
    markets = []
    print("Filtrando mercados que terminan con 'USDT' y están en estado 'TRADING'")
    try:
        for item in exchange_info['symbols']:
            if item['symbol'] in desired_symbols and item['status'] == "TRADING":
                markets.append(item['symbol'])
    except Exception as e:
        print("dd",e)
    try:

        markets = markets[:amount_test_caches]
        print(f"Mercados seleccionados ({len(markets)}): {markets}")

        print(f"Creando DepthCaches para el intercambio: {exchange}")
        ubldc.create_depth_cache(markets=markets)
        print("DepthCaches creados exitosamente")

        print("Entrando al bucle principal para actualizar DepthCaches")
    except Exception as e:
        print("ddd",e)

    while not ubldc.is_stop_request():
        print("Actualizando resumen de DepthCaches")
        add_string = (f"binance_api_status={ubra.get_used_weight(cached=True)}\r\n"
                      f"---------------------------------------------------------------------------------------------")
        
        for market in markets:
            print(f"Procesando mercado: {market}")
            try:
                print(f"Obteniendo top asks para {market}")
                try:
                
                    top_asks = ubldc.get_asks(market=market)
                    #print(f"Top Asks para {market}: {top_asks}")
                    print(f"Obteniendo top bids para {market}")
                    top_bids = ubldc.get_bids(market=market)
                    #print(f"Top Bids para {market}: {top_bids}")
                    if market== "BTSUSDT":
                        nodos(market)
                except Exception as e:
                    print("dsd",e)

                #print(max_bids,max_asks)
            except DepthCacheOutOfSync:
                print(f"DepthCache fuera de sincronización para {market}")
                top_asks = "Out of sync!"
                top_bids = "Out of sync!"
            
            depth = (f"depth_cache '{market}' está sincronizado: {ubldc.is_depth_cache_synchronized(market=market)}\r\n")
                #     f" - top  asks: {max_asks}\r\n"
                #     f" - top  bids: {max_bids}")
            add_string = f"{add_string}\r\n {depth}"
            print(f"Resumen parcial para {market}:\n{depth}")
            
                
               # animar_grafico()


        print("Enviando resumen completo de DepthCaches")
        ubldc.print_summary(add_string=add_string)
        print("Resumen enviado. Esperando 1 segundo antes de la siguiente actualización.")
        await asyncio.sleep(1)

async def main_monitor_spot(ubldc_spot):
    global current_time_last,green_cells1,green_cells,green_cells2,sum_compras,sum_compras_spot,sum_ventas,sum_ventas_spot,max_asks,max_bids,ultimo_cambio_sesgo,top_asks,top_bids,df_asks,df_bids,top_asks_spot,top_bids_spot
        
    print("Iniciando la función main()")
    print("Obteniendo el gestor UBRA desde ubldc")
    try:
        ubra = ubldc_spot.get_ubra_manager()
        
        print("Obteniendo información de intercambio de futuros")
        exchange_info = ubra.futures_exchange_info()
    except Exception as e:
        print("dssd",e)
    markets = []
    print("Filtrando mercados que terminan con 'USDT' y están en estado 'TRADING'")
    for item in exchange_info['symbols']:
        if item['symbol'] in desired_symbols and item['status'] == "TRADING":
            markets.append(item['symbol'])
    
   # markets = markets[:amount_test_caches]
    markets = desired_symbols

    print(f"Mercados seleccionados ({len(markets)}): {markets}")

    print(f"Creando DepthCaches para el intercambio: {exchange}")
    ubldc_spot.create_depth_cache(markets=markets)
    print("DepthCaches creados exitosamente")

    print("Entrando al bucle principal para actualizar DepthCaches")
    while not ubldc_spot.is_stop_request():
        print("Actualizando resumen de DepthCaches")
        add_string = (f"binance_api_status={ubra.get_used_weight(cached=True)}\r\n"
                      f"---------------------------------------------------------------------------------------------")
        
        for market in markets:
            print(f"Procesando mercado: {market}")
            try:

                print(f"Obteniendo top asks para {market}")
                try:
                    top_asks_spot = ubldc_spot.get_asks(market=market)
                    #print(f"Top Asks para {market}: {top_asks}")
                    print(f"Obteniendo top bids para {market}")
                    top_bids_spot = ubldc_spot.get_bids(market=market)
                    #print(f"Top Bids para {market}: {top_bids}")
                    nodos(market)
                except Exception as e:
                    print("ddddd",e)

                #print(max_bids_spot,max_asks_spot)
            except DepthCacheOutOfSync:
                print(f"DepthCache fuera de sincronización para {market}")
                top_asks_spot = "Out of sync!"
                top_bids_spot = "Out of sync!"
            
            depth = (f"depth_cache '{market}' está sincronizado: {ubldc_spot.is_depth_cache_synchronized(market=market)}\r\n")
                #     f" - top  asks: {max_asks}\r\n"
                #     f" - top  bids: {max_bids}")
            add_string = f"{add_string}\r\n {depth}"
            print(f"Resumen parcial para {market}:\n{depth}")
            
                
               # animar_grafico()


        print("Enviando resumen completo de DepthCaches")
        ubldc_spot.print_summary(add_string=add_string)
        print("Resumen enviado. Esperando 1 segundo antes de la siguiente actualización.")
        await asyncio.sleep(1)


def monitor_spot():
    print("Configurando BinanceLocalDepthCacheManager")
    with BinanceLocalDepthCacheManager(
        exchange=exchange_spot,
        init_time_window=5,
        websocket_ping_interval=10,
        websocket_ping_timeout=15,
        depth_cache_update_interval=update_interval_ms
    ) as ubldc_spot:
        print("BinanceLocalDepthCacheManager configurado correctamente")
        try:
            print("Iniciando el bucle de eventos asyncio")
            asyncio.run(main_monitor_spot(ubldc_spot))
        except KeyboardInterrupt:
            print("\nInterrupción del teclado recibida. Deteniendo el programa de manera segura...")
        except Exception as e:
            print(f"\nERROR: {e}")
            print("Deteniendo el programa de manera segura debido a un error.")
  
def monitor():
    print("Configurando BinanceLocalDepthCacheManager")
    with BinanceLocalDepthCacheManager(
        exchange=exchange,
        init_time_window=5,
        websocket_ping_interval=10,
        websocket_ping_timeout=15,
        depth_cache_update_interval=update_interval_ms
    ) as ubldc:
        print("BinanceLocalDepthCacheManager configurado correctamente")
        try:
            print("Iniciando el bucle de eventos asyncio")
            asyncio.run(main_monitor(ubldc))
        except KeyboardInterrupt:
            print("\nInterrupción del teclado recibida. Deteniendo el programa de manera segura...")
        except Exception as e:
            print(f"\nERROR: {e}")
            print("Deteniendo el programa de manera segura debido a un error.")

def run_program():
    global df_bids,df_asks,max_asks,max_bids,current_price,top_asks_spot,top_bids_spot,top_asks,top_bids
    print("Iniciando el programa")
    monitor_thread = threading.Thread(target=monitor, daemon=True)
    monitor_thread.start()
    monitor_thread = threading.Thread(target=monitor_spot, daemon=True)
    monitor_thread.start()
  #  if market == "BTCUSDT":
    fig.patch.set_facecolor(fondo_color)
    ax_candles_left.set_facecolor(fondo_color)
    ax_volume.set_facecolor(fondo_color)
    ax_simulation.set_facecolor(fondo_color)

   # fig1.patch.set_facecolor(fondo_color)
   # ax_candles_left1.set_facecolor(fondo_color)
   # ax_volume1.set_facecolor(fondo_color)
   # ax_simulation1.set_facecolor(fondo_color)

    print("Iniciando el gráfico en el hilo principal")
    animar_grafico()

if __name__ == "__main__":
    run_program()
