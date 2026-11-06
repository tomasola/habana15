import logging
import os
import threading
import time
import subprocess
import socket
from typing import Optional

logger = logging.getLogger("StreamService")

STREAM_PORT = 8001
STREAM_PUBLIC_URL = f"http://192.168.1.139:{STREAM_PORT}/habana"
SILENCE_FILE = os.path.join(os.path.dirname(__file__), "silence.mp3")
FFMPEG_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "bin", "ffmpeg.exe")

class StreamService:
    def __init__(self):
        self._lock = threading.Lock()
        self._process: Optional[subprocess.Popen] = None
        self._clients = set()
        self._server_socket = None
        self._streaming = False
        self._server_thread = None
        logger.info("StreamService: Inicializando Mini-Icecast local en Python")
        
        # Start server loop
        self._start_server()
        
    def _generate_silence(self):
        try:
            logger.info("Generando silence.mp3...")
            subprocess.run([
                FFMPEG_PATH, "-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono", 
                "-t", "5", "-q:a", "9", "-acodec", "libmp3lame", SILENCE_FILE
            ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except Exception as e:
            logger.error(f"Error generando silencio: {e}")

    def _start_server(self):
        def _server_loop():
            self._server_socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self._server_socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            self._server_socket.bind(("0.0.0.0", STREAM_PORT))
            self._server_socket.listen(5)
            logger.info(f"Mini-Icecast escuchando en el puerto {STREAM_PORT}")
            
            while True:
                try:
                    client, addr = self._server_socket.accept()
                    threading.Thread(target=self._handle_client, args=(client,), daemon=True).start()
                except Exception as e:
                    logger.error(f"Error aceptando cliente: {e}")
                    break
                    
        self._server_thread = threading.Thread(target=_server_loop, daemon=True)
        self._server_thread.start()

    def _handle_client(self, client: socket.socket):
        try:
            req = client.recv(1024)
            if b"GET /habana" in req:
                logger.info("Nuevo oyente conectado al stream")
                client.sendall(b"HTTP/1.0 200 OK\r\nContent-Type: audio/mpeg\r\nConnection: keep-alive\r\n\r\n")
                with self._lock:
                    self._clients.add(client)
            else:
                client.close()
        except Exception:
            client.close()

    def _broadcast_loop(self, filepath: str, is_silence: bool):
        if not os.path.exists(FFMPEG_PATH):
            logger.error(f"FFmpeg no encontrado en {FFMPEG_PATH}")
            return
            
        cmd = [
            FFMPEG_PATH, "-y", "-re",
            "-stream_loop", "-1" if is_silence else "0",
            "-i", filepath,
            "-c:a", "libmp3lame",
            "-b:a", "128k",
            "-ar", "24000",
            "-ac", "1",
            "-f", "mp3",
            "-"
        ]
        
        self._process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
        
        while self._streaming:
            chunk = self._process.stdout.read(4096)
            if not chunk:
                break
                
            dead_clients = set()
            with self._lock:
                for c in self._clients:
                    try:
                        c.sendall(chunk)
                    except Exception:
                        dead_clients.add(c)
                
                for c in dead_clients:
                    self._clients.remove(c)
                    c.close()
                    
        if self._process.poll() is None:
            self._process.kill()

    def _stop_current_stream(self):
        self._streaming = False
        if self._process and self._process.poll() is None:
            self._process.kill()
            self._process.wait()

    def prepare_and_stream(self, filepath: str, connect_wait: float = 3.0):
        if not os.path.exists(SILENCE_FILE):
            self._generate_silence()
            
        self._stop_current_stream()
        
        self._streaming = True
        threading.Thread(target=self._broadcast_loop, args=(SILENCE_FILE, True), daemon=True).start()
        
        def _delayed_audio():
            logger.info(f"Esperando {connect_wait}s para que los altavoces conecten...")
            time.sleep(connect_wait)
            
            self._stop_current_stream()
            self._streaming = True
            
            logger.info(f"Inyectando audio real en el stream: {filepath}")
            self._broadcast_loop(filepath, False)
            
            logger.info("Audio terminado. Volviendo a inyectar silencio...")
            self._streaming = True
            threading.Thread(target=self._broadcast_loop, args=(SILENCE_FILE, True), daemon=True).start()

        threading.Thread(target=_delayed_audio, daemon=True).start()

        return STREAM_PUBLIC_URL

    def stop(self):
        self._stop_current_stream()
        with self._lock:
            for c in self._clients:
                try:
                    c.close()
                except:
                    pass
            self._clients.clear()

stream_service = StreamService()
