Set WshShell = CreateObject("WScript.Shell")

' 1. Broker MQTT (1883)
WshShell.CurrentDirectory = "F:\Habana 13\backend"
WshShell.Run """F:\Habana 8\backend\venv\Scripts\python.exe"" run_mqtt_broker.py", 0, False
WScript.Sleep 1500

' 2. Zigbee2MQTT (8090)
WshShell.CurrentDirectory = "F:\Habana 13\services\zigbee2mqtt"
WshShell.Run "node index.js", 0, False
WScript.Sleep 2000

' 3. Puente WhatsApp (3000)
WshShell.CurrentDirectory = "F:\Habana 8\backend"
WshShell.Run "node wa_index_current.js", 0, False
WScript.Sleep 1000

' 4. Backend Habana 13 (8050)
WshShell.CurrentDirectory = "F:\Habana 13\backend"
WshShell.Run """F:\Habana 8\backend\venv\Scripts\python.exe"" main.py", 0, False
WScript.Sleep 2000

' 5. Frontend Vite (5175)
WshShell.CurrentDirectory = "F:\Habana 13\frontend"
WshShell.Run "cmd /c npm.cmd run dev", 0, False
