from pydantic import BaseModel, Field
from typing import Dict, Any, Optional, List
import threading

class SystemState(BaseModel):
    is_active: bool = True
    active_persona: str = "friday"
    voice_gender: str = "female"
    active_mode: str = "neural" # neural, dashboard, provisioning, whatsapp
    voice_engine: str = "groq"  # groq (ultrarrápido ~250ms), gemini, ollama
    audio_output: str = "local" # local, google_cast
    current_speaker_ip: Optional[str] = None
    latest_audio: str = ""
    presence_room: str = "despacho_2"
    global_theme: str = "megaluxury"
    server_mode: str = "local" # local or proxmox
    device_connection_mode: str = "hybrid" # direct, home_assistant, hybrid
    global_tab: str = "neural"
    global_chat_history: List[Dict[str, Any]] = Field(default_factory=list)
    global_radio_station: Optional[str] = None
    notification_audio_url: str = ""
    notification_timestamp: float = 0.0
    whatsapp_muted: bool = False
    ai_warning: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        if hasattr(self, "model_dump"):
            return self.model_dump()
        return self.dict()

class StateManager:
    _instance = None
    _lock = threading.RLock()
    
    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super(StateManager, cls).__new__(cls)
                    cls._instance.state = SystemState()
                    cls._instance.subscribers = []
        return cls._instance

    def get_state(self) -> SystemState:
        with self._lock:
            return self.state

    def update_state(self, updates: Dict[str, Any]):
        with self._lock:
            current_state_dict = self.state.to_dict()
            current_state_dict.update(updates)
            self.state = SystemState(**current_state_dict)
            current_state = self.state
            subscribers_snapshot = list(self.subscribers)
        self._notify_subscribers(current_state, subscribers_snapshot)

    def subscribe(self, callback):
        with self._lock:
            if callback not in self.subscribers:
                self.subscribers.append(callback)

    def unsubscribe(self, callback):
        with self._lock:
            if callback in self.subscribers:
                self.subscribers.remove(callback)

    def _notify_subscribers(self, state: SystemState = None, subscribers_list: list = None):
        if state is None:
            state = self.get_state()
        if subscribers_list is None:
            with self._lock:
                subscribers_list = list(self.subscribers)
        for callback in subscribers_list:
            try:
                callback(state)
            except Exception:
                pass

state_manager = StateManager()
