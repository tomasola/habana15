import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "HABANA 15 - Master Concentrated Edition"
    VERSION: str = "15.0.0"
    
    # AI & LLM Providers
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    OLLAMA_HOST: str = os.getenv("OLLAMA_HOST", "http://localhost:11434")
    
    # Zigbee2MQTT & MQTT Broker (COM9 Sonoff Dongle-P)
    MQTT_BROKER: str = os.getenv("MQTT_BROKER", "localhost")
    MQTT_PORT: int = int(os.getenv("MQTT_PORT", 1883))
    ZIGBEE2MQTT_URL: str = os.getenv("ZIGBEE2MQTT_URL", "http://localhost:8080")
    
    # Home Assistant Bridge / Fallback
    HOME_ASSISTANT_URL: str = os.getenv("HOME_ASSISTANT_URL", "http://localhost:8123")
    HOME_ASSISTANT_TOKEN: str = os.getenv("HOME_ASSISTANT_TOKEN", "")
    
    # WhatsApp Local Bridge & Proxmox Node
    WA_BRIDGE_URL: str = "http://127.0.0.1:3000"
    PROXMOX_HOST: str = os.getenv("PROXMOX_HOST", "")
    PROXMOX_USER: str = os.getenv("PROXMOX_USER", "")
    PROXMOX_PASS: str = os.getenv("PROXMOX_PASS", "")
    CT_ID: str = os.getenv("CT_ID", "800")

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore"
    )

settings = Settings()
