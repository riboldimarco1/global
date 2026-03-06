#!/usr/bin/env python3
"""
Agente de Ping Local para Agrodata
Este script se conecta al servidor web y ejecuta pings en tu red local.

Uso:
1. Instala las dependencias: pip install websocket-client
2. Ejecuta: python ping-agent.py <URL_DEL_SERVIDOR>
   Ejemplo: python ping-agent.py https://tu-app.replit.app
3. El agente se conectará automáticamente y esperará comandos.

Para cerrar: Ctrl+C
"""

import subprocess
import re
import json
import time
import sys
import platform

try:
    import websocket
except ImportError:
    print("=" * 50)
    print("ERROR: Falta la librería 'websocket-client'")
    print("=" * 50)
    print("")
    print("Instálala ejecutando:")
    print("  pip install websocket-client")
    print("")
    sys.exit(1)

def get_server_url():
    if len(sys.argv) > 1:
        url = sys.argv[1]
        if url.startswith("http://"):
            return url.replace("http://", "ws://") + "/ws"
        elif url.startswith("https://"):
            return url.replace("https://", "wss://") + "/ws"
        elif not url.startswith("ws"):
            return f"wss://{url}/ws"
        return url
    
    print("=" * 50)
    print("AGENTE DE PING LOCAL - Agrodata")
    print("=" * 50)
    print("")
    print("Uso: python ping-agent.py <URL_DEL_SERVIDOR> <TOKEN>")
    print("")
    print("Ejemplo:")
    print("  python ping-agent.py https://tu-app.replit.app ABC123")
    print("")
    print("La URL y el TOKEN los obtienes de la ventana de Ping en la aplicación web.")
    print("")
    sys.exit(1)

def get_token():
    if len(sys.argv) > 2:
        return sys.argv[2].upper()
    
    print("=" * 50)
    print("AGENTE DE PING LOCAL - Agrodata")
    print("=" * 50)
    print("")
    print("Falta el TOKEN de autenticación.")
    print("")
    print("Uso: python ping-agent.py <URL_DEL_SERVIDOR> <TOKEN>")
    print("")
    print("Ejemplo:")
    print("  python ping-agent.py https://tu-app.replit.app ABC123")
    print("")
    print("El TOKEN aparece en la ventana de Ping de la aplicación web.")
    print("")
    sys.exit(1)

def do_ping(ip):
    """Ejecuta ping a una IP y retorna el resultado."""
    if not ip or not re.match(r'^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$', ip.strip()):
        return {
            "success": False,
            "latencia": "IP inválida",
            "mac": None,
            "estado": "cortado"
        }
    
    ip = ip.strip()
    system = platform.system().lower()
    
    try:
        if system == "windows":
            ping_cmd = ["ping", "-n", "1", "-w", "2000", ip]
        else:
            ping_cmd = ["ping", "-c", "1", "-W", "2", ip]
        
        result = subprocess.run(
            ping_cmd,
            capture_output=True,
            text=True,
            timeout=5
        )
        
        if result.returncode == 0:
            output = result.stdout
            # Debug: print the raw ping output to help diagnose latency extraction
            print(f"    [DEBUG] Ping output: {repr(output[:200])}...")
            
            # Try multiple patterns for different locales
            # English: time=45ms or time<1ms
            # Spanish: tiempo=45ms or tiempo<1ms
            # Also handle "Tiempo=" with capital T
            patterns = [
                r'time[=<](\d+\.?\d*)\s*ms',      # English
                r'tiempo[=<](\d+\.?\d*)\s*ms',    # Spanish lowercase
                r'Tiempo[=<](\d+\.?\d*)\s*ms',    # Spanish capitalized
                r'=(\d+\.?\d*)\s*ms',             # Fallback: any =Xms pattern
                r'<(\d+\.?\d*)\s*ms',             # Fallback: any <Xms pattern
            ]
            latencia = None
            for pattern in patterns:
                time_match = re.search(pattern, output, re.IGNORECASE)
                if time_match:
                    latencia = f"{time_match.group(1)}ms"
                    print(f"    [DEBUG] Pattern '{pattern}' matched, latencia={latencia}")
                    break
            if not latencia:
                latencia = "ok"
                print(f"    [DEBUG] No pattern matched, using default 'ok'")
            
            mac = get_mac(ip, system)
            
            return {
                "success": True,
                "latencia": latencia,
                "mac": mac,
                "estado": "activo"
            }
        else:
            return {
                "success": False,
                "latencia": "timeout",
                "mac": None,
                "estado": "cortado"
            }
            
    except subprocess.TimeoutExpired:
        return {
            "success": False,
            "latencia": "timeout",
            "mac": None,
            "estado": "cortado"
        }
    except Exception as e:
        return {
            "success": False,
            "latencia": str(e)[:20],
            "mac": None,
            "estado": "cortado"
        }

def get_mac(ip, system):
    """Intenta obtener la MAC address usando arp."""
    try:
        if system == "windows":
            # On Windows, run 'arp -a' and look for the specific IP
            arp_cmd = ["arp", "-a"]
        else:
            arp_cmd = ["arp", "-n", ip]
        
        result = subprocess.run(
            arp_cmd,
            capture_output=True,
            text=True,
            timeout=3
        )
        
        output = result.stdout
        
        if system == "windows":
            # Windows arp output format:
            # 192.168.1.1           00-1a-2b-3c-4d-5e     dynamic
            # Look for the line containing our IP
            for line in output.splitlines():
                if ip in line:
                    # Match MAC with dashes (Windows format) or colons
                    mac_match = re.search(r'([0-9a-fA-F]{2}[-:]){5}[0-9a-fA-F]{2}', line)
                    if mac_match:
                        mac = mac_match.group(0).upper().replace("-", ":")
                        return mac
        else:
            # Linux/Mac format
            mac_match = re.search(r'([0-9a-fA-F]{2}[:-]){5}[0-9a-fA-F]{2}', output)
            if mac_match:
                return mac_match.group(0).upper().replace("-", ":")
    except Exception:
        pass
    return None

class PingAgent:
    def __init__(self, server_url, token):
        self.server_url = server_url
        self.token = token
        self.ws = None
        self.connected = False
        self.should_reconnect = True
        
    def on_message(self, ws, message):
        try:
            data = json.loads(message)
            msg_type = data.get("type")
            
            if msg_type == "agent_registered":
                print("[OK] Agente registrado correctamente")
                
            elif msg_type == "agent_rejected":
                error = data.get("error", "Token rechazado")
                print(f"\n[ERROR] {error}")
                print("Verifica que el TOKEN sea correcto.")
                self.should_reconnect = False
                ws.close()
                
            elif msg_type == "ping_request":
                records = data.get("records", [])
                session_id = data.get("sessionId")
                session_token = data.get("sessionToken")
                print(f"\n[PING] Recibida solicitud para {len(records)} dispositivos")
                
                for record in records:
                    record_id = record.get("id")
                    ip = record.get("ip")
                    nombre = record.get("nombre", ip)
                    
                    print(f"  Haciendo ping a {nombre} ({ip})...", end=" ", flush=True)
                    
                    result = do_ping(ip)
                    result["id"] = record_id
                    
                    if result["success"]:
                        mac_info = f", MAC: {result['mac']}" if result.get('mac') else " (sin MAC)"
                        print(f"OK - Latencia: {result['latencia']}{mac_info}")
                    else:
                        print(f"FAIL - {result['latencia']}")
                    
                    ws.send(json.dumps({
                        "type": "ping_result",
                        "sessionId": session_id,
                        "sessionToken": session_token,
                        "result": result
                    }))
                
                ws.send(json.dumps({
                    "type": "ping_complete",
                    "sessionId": session_id,
                    "sessionToken": session_token
                }))
                print("[PING] Completado\n")
                
            elif msg_type == "heartbeat":
                ws.send(json.dumps({"type": "heartbeat_response"}))
                
        except json.JSONDecodeError:
            print(f"Error: mensaje no válido: {message}")
        except Exception as e:
            print(f"Error procesando mensaje: {e}")
    
    def on_error(self, ws, error):
        print(f"\n[ERROR] {error}")
    
    def on_close(self, ws, close_status_code, close_msg):
        self.connected = False
        print(f"\n[DESCONECTADO] Código: {close_status_code}")
        if self.should_reconnect:
            print("Reconectando en 5 segundos...")
            time.sleep(5)
            self.connect()
    
    def on_open(self, ws):
        self.connected = True
        print("\n" + "="*50)
        print("  AGENTE DE PING - Conectando...")
        print("="*50)
        
        ws.send(json.dumps({
            "type": "agent_hello",
            "platform": platform.system(),
            "version": "1.0.0",
            "token": self.token
        }))
        
        print("Esperando comandos desde la web...")
        print("Presiona Ctrl+C para salir")
        print("="*50 + "\n")
    
    def connect(self):
        try:
            origin = self.server_url.replace("wss://", "https://").replace("ws://", "http://")
            if "/ws" in origin:
                origin = origin.split("/ws")[0]
            
            self.ws = websocket.WebSocketApp(
                self.server_url,
                on_open=self.on_open,
                on_message=self.on_message,
                on_error=self.on_error,
                on_close=self.on_close,
                header={"Origin": origin}
            )
            self.ws.run_forever(ping_interval=30, ping_timeout=10)
        except KeyboardInterrupt:
            self.should_reconnect = False
            print("\n[SALIENDO] Agente detenido por el usuario")
        except Exception as e:
            print(f"Error de conexión: {e}")
            if self.should_reconnect:
                print("Reintentando en 5 segundos...")
                time.sleep(5)
                self.connect()
    
    def stop(self):
        self.should_reconnect = False
        if self.ws:
            self.ws.close()

def main():
    server_url = get_server_url()
    token = get_token()
    
    print(f"\nConectando a: {server_url}")
    print(f"Token: {token}")
    
    agent = PingAgent(server_url, token)
    try:
        agent.connect()
    except KeyboardInterrupt:
        agent.stop()
        print("\nAgente detenido.")

if __name__ == "__main__":
    main()
