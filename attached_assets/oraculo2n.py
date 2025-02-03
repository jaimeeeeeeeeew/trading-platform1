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
import csv

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


import csv
import json
from datetime import datetime

def write_market_data_csv():
    global cvd_futures, cvd_spot, current_price, trades_data, top_asks, top_bids, top_asks_spot, top_bids_spot

    try:
        # Preparar los datos del libro de órdenes
        order_book_data = {
            'direccion': current_price,
            'dominancia_left': sum_compras if sum_compras > 0 else 50,
            'dominancia_right': sum_ventas if sum_ventas > 0 else 50,
            'delta_futuros_positivo': sum_compras,
            'delta_futuros_negativo': sum_ventas,
            'delta_spot_positivo': sum_compras_spot,
            'delta_spot_negativo': sum_ventas_spot,
            'transacciones': json.dumps(trades_data.to_dict('records') if not trades_data.empty else []),
            # Añadir datos del libro de órdenes límite
            'ordenes_limite': json.dumps({
                'futures': {
                    'asks': top_asks.to_dict('records') if top_asks is not None and not top_asks.empty else [],
                    'bids': top_bids.to_dict('records') if top_bids is not None and not top_bids.empty else []
                },
                'spot': {
                    'asks': top_asks_spot.to_dict('records') if top_asks_spot is not None and not top_asks_spot.empty else [],
                    'bids': top_bids_spot.to_dict('records') if top_bids_spot is not None and not top_bids_spot.empty else []
                }
            }) if all(x is not None for x in [top_asks, top_bids, top_asks_spot, top_bids_spot]) else '[]'
        }

        # Escribir en el CSV
        csv_path = 'market_data.csv'
        file_exists = os.path.exists(csv_path)

        with open(csv_path, 'a', newline='') as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=order_book_data.keys())

            if not file_exists:
                writer.writeheader()

            writer.writerow(order_book_data)

    except Exception as e:
        print(f"Error escribiendo datos en CSV: {e}")

# Modificar la función nodos para incluir la escritura del CSV
def nodos(market):
    global primera_vez_sesgo, last_print_time_sesgo, top_asks, top_bids, df_1m, current_price, max_bids, max_asks, df_asks, df_bids, df_asks, df_bids, vwap, cvd_futures, order_flow_500, order_flow_2000, previous_max_bids, previous_max_asks, order_flow_bids_500, order_flow_asks_500, zonas_liquidacion_sell, zonas_liquidacion_buy, max_ask_liq, max_bid_liq, cantidad_en_tp_short_1, cantidad_en_tp_short_2, cantidad_en_tp_long_1, cantidad_en_tp_long_2, tipo_sesgo_anterior, tiempo_transcurrido, accumulated_volume_b_25, accumulated_volume_25, accumulated_volume_b, accumulated_volume_a, total_volume_a, total_volume_b, sesgo_alcista, sesgo_bajista, sesgo_medio, foto_png, ultimo_cambio_sesgo, top_bids_spot, top_asks_spot
    
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
            
            # Agregar la escritura del CSV cada segundo
        current_time = time.time()
        if not hasattr(nodos, 'last_csv_write') or current_time - nodos.last_csv_write >= 1:
            write_market_data_csv()
            nodos.last_csv_write = current_time

        
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
  
if __name__ == "__main__":
    run_program()