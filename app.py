# app.py
from flask import Flask, render_template, jsonify, send_from_directory
import subprocess
import json
import xml.etree.ElementTree as ET
import re
import os

app = Flask(__name__, static_folder='static')

def convert_to_mbps(value_str):
    """Konwertuje wartość z KB/s na MB/s"""
    if not value_str or value_str == 'N/A':
        return '0 MB/s'
    try:
        value = float(value_str.replace(' KB/s', ''))
        return f"{value/1024:.1f} MB/s"
    except:
        return '0 MB/s'

def parse_numeric(value_str, unit=''):
    """Parsuje wartość numeryczną z tekstu, usuwa jednostkę"""
    if not value_str or value_str == 'N/A':
        return 0
    try:
        clean_str = value_str.replace(unit, '').replace(',', '.').strip()
        return float(clean_str)
    except:
        return 0

def safe_find_text(element, path, default='N/A'):
    """Bezpiecznie znajduje i zwraca tekst z elementu XML."""
    try:
        found = element.find(path)
        if found is not None:
            return found.text
        return default
    except Exception as e:
        return default

def get_gpu_info():
    try:
        result = subprocess.run(['nvidia-smi', '-q', '-x'], capture_output=True, text=True)
        if result.returncode != 0:
            return {'error': 'Nie można uruchomić nvidia-smi'}
        
        root = ET.fromstring(result.stdout)
        gpus = []
        total_power = 0
        total_temp = 0
        
        for gpu in root.findall('gpu'):
            # Odczyt podstawowych parametrów
            temp = safe_find_text(gpu, 'temperature/gpu_temp', '0 C')
            power_draw = safe_find_text(gpu, 'gpu_power_readings/power_draw', '0 W')
            
            temp_value = parse_numeric(temp, ' C')
            power_value = parse_numeric(power_draw, ' W')
            
            total_power += power_value
            total_temp += temp_value
            
            # Odczyt PCIe
            pcie_tx = convert_to_mbps(safe_find_text(gpu, 'pci/tx_util', '0 KB/s'))
            pcie_rx = convert_to_mbps(safe_find_text(gpu, 'pci/rx_util', '0 KB/s'))
            pcie_gen = safe_find_text(gpu, 'pci/pci_gpu_link_info/pcie_gen/current_link_gen', 'N/A')
            pcie_width = safe_find_text(gpu, 'pci/pci_gpu_link_info/link_widths/current_link_width', 'N/A')
            
            gpu_info = {
                'id': gpu.attrib.get('id', 'N/A'),
                'name': safe_find_text(gpu, 'product_name'),
                'uuid': safe_find_text(gpu, 'uuid'),
                'temperature': {
                    'gpu_temp': temp
                },
                'power': {
                    'power_draw': f"{power_value:.1f} W",
                    'power_limit': safe_find_text(gpu, 'gpu_power_readings/power_limit', '0 W')
                },
                'memory': {
                    'total': safe_find_text(gpu, 'fb_memory_usage/total', '0 MiB'),
                    'used': safe_find_text(gpu, 'fb_memory_usage/used', '0 MiB'),
                    'free': safe_find_text(gpu, 'fb_memory_usage/free', '0 MiB')
                },
                'utilization': {
                    'gpu_util': safe_find_text(gpu, 'utilization/gpu_util', '0 %'),
                    'memory_util': safe_find_text(gpu, 'utilization/memory_util', '0 %')
                },
                'pcie': {
                    'tx_util': pcie_tx,
                    'rx_util': pcie_rx,
                    'gen': pcie_gen,
                    'width': pcie_width
                }
            }
            gpus.append(gpu_info)
        
        gpu_count = len(gpus)
        avg_temp = total_temp / gpu_count if gpu_count > 0 else 0
        
        summary = {
            'total_power': f"{total_power:.1f}",
            'gpu_count': gpu_count,
            'average_temperature': avg_temp
        }
        
        return {'gpus': gpus, 'summary': summary}
    except Exception as e:
        print(f"Wystąpił błąd: {str(e)}")
        return {'error': f'Błąd: {str(e)}'}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/gpu')
def gpu_data():
    return jsonify(get_gpu_info())

@app.route('/static/<path:path>')
def send_static(path):
    return send_from_directory('static', path)

if __name__ == '__main__':
    # Upewnij się, że katalogi istnieją
    os.makedirs('static', exist_ok=True)
    os.makedirs('templates', exist_ok=True)
    
    # Uruchom aplikację
    app.run(host='0.0.0.0', port=5000, debug=True)
