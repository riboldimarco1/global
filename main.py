def main():
    print("Hello from repl-nix-workspace!")


if __name__ == "__main__":
    main()
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
    import requests
    import urllib.parse  # Vital para codificar espacios y caracteres especiales
    import os            # Para leer los Secrets

    def enviar_whatsapp(mensaje):
        # 1. Recuperamos las credenciales de los Secrets
        phone = os.environ['WHATSAPP_PHONE']
        apikey = os.environ['CALLMEBOT_API_KEY']

        # 2. Codificamos el mensaje para que sea válido en una URL
        # "Hola Mundo" se convierte en "Hola%20Mundo"
        mensaje_codificado = urllib.parse.quote(mensaje)

        # 3. Construimos la URL
        url = f"https://api.callmebot.com/whatsapp.php?phone={phone}&text={mensaje_codificado}&apikey={apikey}"

        # 4. Hacemos la petición
        try:
            response = requests.get(url, timeout=10) # Timeout para evitar bloqueos

            if response.status_code == 200:
                print("✅ Mensaje enviado con éxito a WhatsApp.")
                return True
            else:
                print(f"❌ Error al enviar. Código: {response.status_code}")
                print(f"Respuesta: {response.text}")
                return False

        except Exception as e:
            print(f"❌ Error de conexión: {e}")
            return False

    # --- ZONA DE PRUEBA ---
    if __name__ == "__main__":
        # Puedes cambiar este texto por lo que quieras
        enviar_whatsapp("Hola ingeniero, tu proceso en Replit ha finalizado correctamente. 🚀")