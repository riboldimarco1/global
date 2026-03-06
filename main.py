def main():
    print("Hello from repl-nix-workspace!")


if __name__ == "__main__":
    main()

import requests
import os

def enviar_telegram(mensaje):
    # Guárdalos en Secrets: TELEGRAM_TOKEN y TELEGRAM_CHAT_ID
    bot_token = os.environ['TELEGRAM_TOKEN']
    chat_id = os.environ['TELEGRAM_CHAT_ID']

    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": mensaje
    }

    try:
        requests.post(url, json=payload)
        print("✅ Alerta enviada a Telegram")
    except Exception as e:
        print(f"❌ Error enviando a Telegram: {e}")

# Prueba
# enviar_telegram("⚠️ Alerta: El proceso de conciliación bancaria terminó.")
import os
import requests  # Librería estándar para peticiones HTTP

def enviar_telegram(mensaje):
    """
    Envía un mensaje a tu Telegram personal usando el Bot que creaste.
    Retorna True si fue exitoso, False si falló.
    """
    try:
        # Recuperamos las credenciales de los Secrets de Replit
        token = os.environ['TELEGRAM_TOKEN']
        chat_id = os.environ['TELEGRAM_CHAT_ID']

        # URL oficial de la API de Telegram
        url = f"https://api.telegram.org/bot{token}/sendMessage"

        # Datos a enviar (payload)
        data = {
            "chat_id": chat_id,
            "text": mensaje
        }

        # Hacemos la petición POST (más segura que GET para textos largos)
        response = requests.post(url, data=data)

        if response.status_code == 200:
            print(f"✅ Mensaje enviado a Telegram: '{mensaje}'")
            return True
        else:
            print(f"❌ Error de Telegram (Código {response.status_code}): {response.text}")
            return False

    except KeyError:
        print("❌ Error: No encontré los Secrets. Revisa que TELEGRAM_TOKEN y TELEGRAM_CHAT_ID existan.")
        return False
    except Exception as e:
        print(f"❌ Error de conexión: {e}")
        return False

# --- BLOQUE DE PRUEBA ---
if __name__ == "__main__":
    print("Iniciando prueba de comunicación...")

    # Intenta enviar un mensaje
    enviar_telegram("Ingeniero, el sistema de notificaciones está operativo. 🚜")