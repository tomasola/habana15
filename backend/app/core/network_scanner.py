import os
import socket
import concurrent.futures
import logging
from typing import Optional, Dict

logger = logging.getLogger("NetworkScanner")

def get_local_subnet() -> str:
    """Retorna la subred local (ej. '192.168.1.') basada en la IP de la máquina."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        # Conectar a una IP externa (no envía datos realmente) para determinar la interfaz local
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
        parts = local_ip.split('.')
        return f"{parts[0]}.{parts[1]}.{parts[2]}."
    except Exception as e:
        logger.error(f"Error obteniendo subred local: {e}")
        return "192.168.1." # Fallback común

def check_port(ip: str, port: int, timeout: float = 0.5) -> bool:
    """Verifica si un puerto está abierto en una IP específica."""
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.settimeout(timeout)
            result = s.connect_ex((ip, port))
            return result == 0
    except:
        return False

def scan_network_for_services() -> Dict[str, Optional[str]]:
    """
    Escanea la subred local buscando los puertos 8123 (HA) y 8006 (Proxmox).
    Retorna un diccionario con las IPs encontradas.
    """
    subnet = get_local_subnet()
    logger.info(f"Iniciando auto-descubrimiento en la subred {subnet}0/24...")
    
    ips = [f"{subnet}{i}" for i in range(1, 255)]
    found = {"ha_ip": None, "proxmox_ip": None}
    
    def scan_ip(ip):
        # Scan HA (8123)
        if not found["ha_ip"] and check_port(ip, 8123):
            found["ha_ip"] = ip
            logger.info(f"Home Assistant descubierto en: {ip}")
        # Scan Proxmox (8006)
        if not found["proxmox_ip"] and check_port(ip, 8006):
            found["proxmox_ip"] = ip
            logger.info(f"Proxmox descubierto en: {ip}")
            
    with concurrent.futures.ThreadPoolExecutor(max_workers=50) as executor:
        executor.map(scan_ip, ips)
        
    return found

def update_env_file(updates: Dict[str, str], env_path: str = ".env"):
    """
    Actualiza el archivo .env con nuevos valores de manera segura,
    sin borrar el resto de las variables de entorno.
    """
    if not os.path.exists(env_path):
        logger.error(f"El archivo {env_path} no existe.")
        return False

    with open(env_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    new_lines = []
    updated_keys = set()
    
    for line in lines:
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            new_lines.append(line)
            continue
            
        key = stripped.split('=')[0].strip()
        if key in updates:
            new_lines.append(f"{key}={updates[key]}\n")
            updated_keys.add(key)
        else:
            new_lines.append(line)
            
    # Añadir keys nuevas que no estaban en el archivo original
    for key, val in updates.items():
        if key not in updated_keys:
            new_lines.append(f"{key}={val}\n")
            
    with open(env_path, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
        
    logger.info("Archivo .env actualizado exitosamente.")
    return True

if __name__ == "__main__":
    # Test script locally
    res = scan_network_for_services()
    print("Resultados de escaneo:", res)
