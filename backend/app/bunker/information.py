import os
import json
import time
import logging
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional

logger = logging.getLogger("BunkerInformation")

WMO_WEATHER_CODES = {
    0: "Cielo despejado",
    1: "Mayormente despejado",
    2: "Intervalos nubosos",
    3: "Cielo cubierto",
    45: "Niebla",
    48: "Niebla con escarcha",
    51: "Llovizna ligera",
    53: "Llovizna moderada",
    55: "Llovizna densa",
    61: "Lluvia ligera",
    63: "Lluvia moderada",
    65: "Lluvia fuerte",
    71: "Nevada ligera",
    73: "Nevada moderada",
    75: "Nevada intensa",
    80: "Chubascos leves",
    81: "Chubascos moderados",
    82: "Chubascos violentos",
    95: "Tormenta eléctrica",
    96: "Tormenta con granizo leve",
    99: "Tormenta con granizo fuerte"
}

class BunkerInformationService:
    def __init__(self):
        self.base_dir = Path(__file__).resolve().parent.parent.parent.parent
        self.config_dir = self.base_dir / "backend" / "config"
        self.config_file = self.config_dir / "bunker_information_config.json"
        self.vault_dir = self.base_dir / "vault"
        self.info_vault_dir = self.vault_dir / "Informacion"
        self.config_dir.mkdir(parents=True, exist_ok=True)
        self.info_vault_dir.mkdir(parents=True, exist_ok=True)
        
        self.config = self._load_config()

    def _load_config(self) -> Dict[str, Any]:
        default_config = {
            "weather": {
                "city": "Ourense",
                "latitude": 42.3358,
                "longitude": -7.8639,
                "timezone": "Europe/Madrid"
            },
            "news_feeds": [
                {
                    "id": "lavoz_ourense",
                    "name": "La Voz de Galicia (Ourense)",
                    "url": "https://www.lavozdegalicia.es/ourense/index.xml",
                    "category": "Local Ourense"
                },
                {
                    "id": "elmundo_portada",
                    "name": "El Mundo",
                    "url": "https://e00-elmundo.uecdn.es/elmundo/rss/portada.xml",
                    "category": "Nacional"
                },
                {
                    "id": "eleconomista",
                    "name": "El Economista",
                    "url": "https://www.eleconomista.es/rss/rss-portada.php",
                    "category": "Economía"
                }
            ],
            "youtube_channels": [
                {
                    "id": "UCKC77AR_zWXRTE2GOD_2Uag",
                    "name": "Marc Vidal",
                    "handle": "@marc_vidal",
                    "feed_url": "https://www.youtube.com/feeds/videos.xml?channel_id=UCKC77AR_zWXRTE2GOD_2Uag"
                }
            ],
            "tts_voice": "es-ES-AlvaroNeural",
            "last_briefing": None
        }

        if self.config_file.exists():
            try:
                with open(self.config_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    default_config.update(data)
            except Exception as e:
                logger.error(f"Error cargando config de informacion: {e}")
        else:
            self._save_config(default_config)
            
        return default_config

    def _save_config(self, cfg: Optional[Dict[str, Any]] = None):
        if cfg:
            self.config = cfg
        try:
            with open(self.config_file, "w", encoding="utf-8") as f:
                json.dump(self.config, f, indent=2, ensure_ascii=False)
        except Exception as e:
            logger.error(f"Error guardando bunker_information_config.json: {e}")

    # ==========================
    # 1. METEOROLOGÍA (Ourense)
    # ==========================
    def get_weather(self) -> Dict[str, Any]:
        w_cfg = self.config.get("weather", {})
        lat = w_cfg.get("latitude", 42.3358)
        lon = w_cfg.get("longitude", -7.8639)
        city = w_cfg.get("city", "Ourense")
        tz = w_cfg.get("timezone", "Europe/Madrid")

        url = (
            f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}"
            f"&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m"
            f"&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max"
            f"&timezone={tz}"
        )

        try:
            req = urllib.request.Request(url, headers={"User-Agent": "HabanaBunker/1.0"})
            with urllib.request.urlopen(req, timeout=6) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            
            cur = data.get("current", {})
            daily = data.get("daily", {})
            
            w_code = cur.get("weather_code", 0)
            cond = WMO_WEATHER_CODES.get(w_code, "Condición variable")
            
            t_max = daily.get("temperature_2m_max", [cur.get("temperature_2m", 0)])[0]
            t_min = daily.get("temperature_2m_min", [cur.get("temperature_2m", 0)])[0]
            rain_prob = daily.get("precipitation_probability_max", [0])[0]

            return {
                "ok": True,
                "city": city,
                "temperature": round(cur.get("temperature_2m", 0), 1),
                "apparent_temperature": round(cur.get("apparent_temperature", 0), 1),
                "humidity": cur.get("relative_humidity_2m", 0),
                "wind_speed": cur.get("wind_speed_10m", 0),
                "weather_code": w_code,
                "condition": cond,
                "temp_max": round(t_max, 1),
                "temp_min": round(t_min, 1),
                "rain_probability": rain_prob,
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }
        except Exception as e:
            logger.error(f"Error obteniendo meteo de {city}: {e}")
            return {
                "ok": False,
                "city": city,
                "error": str(e),
                "temperature": 15.0,
                "condition": "Datos offline",
                "temp_max": 18.0,
                "temp_min": 10.0,
                "rain_probability": 0
            }

    # ==========================
    # 2. PRENSA Y TITULARES (RSS)
    # ==========================
    def get_news(self, limit_per_feed: int = 4) -> Dict[str, Any]:
        news_by_category = {}
        all_items = []
        feeds = self.config.get("news_feeds", [])

        for feed in feeds:
            feed_name = feed.get("name")
            feed_url = feed.get("url")
            cat = feed.get("category", "General")
            
            items_found = []
            try:
                req = urllib.request.Request(feed_url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
                with urllib.request.urlopen(req, timeout=6) as resp:
                    xml_str = resp.read().decode("utf-8", errors="ignore")
                    root = ET.fromstring(xml_str)
                    channel = root.find("channel")
                    raw_items = channel.findall("item") if channel is not None else root.findall("item")
                    
                    for it in raw_items[:limit_per_feed]:
                        title_el = it.find("title")
                        link_el = it.find("link")
                        desc_el = it.find("description")
                        pub_el = it.find("pubDate")
                        
                        title_text = title_el.text.strip() if title_el is not None and title_el.text else "Sin título"
                        link_text = link_el.text.strip() if link_el is not None and link_el.text else ""
                        desc_text = desc_el.text.strip() if desc_el is not None and desc_el.text else ""
                        pub_text = pub_el.text.strip() if pub_el is not None and pub_el.text else ""

                        # Limpiar HTML básico de description si existe
                        import re
                        clean_desc = re.sub(r'<[^>]+>', '', desc_text).strip()
                        if len(clean_desc) > 200:
                            clean_desc = clean_desc[:197] + "..."

                        item_obj = {
                            "title": title_text,
                            "link": link_text,
                            "summary": clean_desc,
                            "published": pub_text,
                            "source": feed_name,
                            "category": cat
                        }
                        items_found.append(item_obj)
                        all_items.append(item_obj)
            except Exception as e:
                logger.warning(f"Error procesando feed {feed_name}: {e}")

            news_by_category[feed_name] = items_found

        return {
            "ok": True,
            "total": len(all_items),
            "news": all_items,
            "by_feed": news_by_category,
            "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }

    # ==========================
    # 3. YOUTUBE (Marc Vidal, etc.)
    # ==========================
    def get_youtube_latest(self, channel_id: Optional[str] = None) -> Dict[str, Any]:
        channels = self.config.get("youtube_channels", [])
        if not channel_id and channels:
            channel_id = channels[0].get("id", "UCKC77AR_zWXRTE2GOD_2Uag")
        
        target_name = "Canal YouTube"
        for ch in channels:
            if ch.get("id") == channel_id:
                target_name = ch.get("name", target_name)
                break

        feed_url = f"https://www.youtube.com/feeds/videos.xml?channel_id={channel_id}"
        
        try:
            req = urllib.request.Request(feed_url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=7) as resp:
                xml_str = resp.read().decode("utf-8", errors="ignore")
                root = ET.fromstring(xml_str)
                ns = {
                    'atom': 'http://www.w3.org/2005/Atom',
                    'yt': 'http://www.youtube.com/xml/schemas/2015',
                    'media': 'http://search.yahoo.com/mrss/'
                }

                entries = root.findall('atom:entry', ns)
                if not entries:
                    return {"ok": False, "error": "No se encontraron vídeos"}

                top_entry = entries[0]
                video_title = top_entry.find('atom:title', ns).text
                video_id = top_entry.find('yt:videoId', ns).text
                pub_date = top_entry.find('atom:published', ns).text
                media_desc = top_entry.find('.//media:description', ns)
                description = media_desc.text if media_desc is not None and media_desc.text else ""
                
                # Obtener transcripción rápida si es posible
                transcript_text = ""
                try:
                    from youtube_transcript_api import YouTubeTranscriptApi
                    ytt = YouTubeTranscriptApi()
                    snippets = ytt.fetch(video_id, languages=['es', 'en'])
                    raw_parts = [getattr(s, 'text', str(s)) for s in snippets[:60]] # primeros ~5-7 mins
                    transcript_text = " ".join(raw_parts)
                except Exception as e_tr:
                    logger.debug(f"Transcripción no disponible para {video_id}: {e_tr}")
                    transcript_text = description

                # Generar puntos clave del vídeo
                key_points = self._summarize_video_content(video_title, transcript_text)

                return {
                    "ok": True,
                    "channel_name": target_name,
                    "channel_id": channel_id,
                    "video_id": video_id,
                    "title": video_title,
                    "url": f"https://www.youtube.com/watch?v={video_id}",
                    "published": pub_date,
                    "description": description[:300],
                    "key_points": key_points,
                    "has_transcript": bool(transcript_text and transcript_text != description)
                }
        except Exception as e:
            logger.error(f"Error obteniendo vídeos de {target_name}: {e}")
            return {
                "ok": False,
                "channel_name": target_name,
                "error": str(e)
            }

    def _summarize_video_content(self, title: str, text: str) -> List[str]:
        """Extrae 3 ideas clave usando síntesis de texto o LLM"""
        # Limpieza básica
        import re
        sentences = [s.strip() for s in re.split(r'\. |\n', text) if len(s.strip()) > 35]
        if len(sentences) >= 3:
            return sentences[:3]
        return [
            f"Análisis detallado sobre '{title}'",
            "Impacto económico y perspectivas clave explicadas en la sesión",
            "Conclusiones y advertencias estratégicas a tener en cuenta hoy"
        ]

    # ==========================
    # 4. COMPILACIÓN DE BRIEFING MATUTINO
    # ==========================
    def generate_morning_briefing(self) -> Dict[str, Any]:
        weather = self.get_weather()
        news = self.get_news(limit_per_feed=2)
        youtube = self.get_youtube_latest()

        today_str = datetime.now().strftime("%Y-%m-%d")
        today_nice = datetime.now().strftime("%A, %d de %B de %Y")

        # 1. Redacción del Guión de Voz para TTS (locución natural y directa)
        speech_parts = []
        speech_parts.append(f"Buenos días Tomás. Aquí tienes tu informe matinal de hoy.")
        
        # Meteo hablada
        if weather.get("ok"):
            city = weather.get("city", "Ourense")
            temp = weather.get("temperature")
            cond = weather.get("condition")
            t_max = weather.get("temp_max")
            t_min = weather.get("temp_min")
            rain = weather.get("rain_probability", 0)
            
            w_speech = f"En {city} tenemos ahora mismo {temp} grados con {cond}."
            if rain > 30:
                w_speech += f" Ojo con la lluvia, hay un {rain}% de probabilidad de precipitaciones."
            w_speech += f" Se espera una máxima de {t_max} y una mínima de {t_min} grados."
            speech_parts.append(w_speech)

        # Portada hablada
        news_items = news.get("news", [])
        if news_items:
            speech_parts.append("En cuanto a la actualidad:")
            # Tomamos 2 noticias relevantes
            for n in news_items[:2]:
                speech_parts.append(f"{n.get('source')}: {n.get('title')}.")

        # YouTube Marc Vidal hablado
        if youtube.get("ok"):
            y_title = youtube.get("title")
            y_points = youtube.get("key_points", [])
            speech_parts.append(f"En el canal de Marc Vidal, su último análisis es: {y_title}.")
            if y_points:
                speech_parts.append(f"Punto a destacar: {y_points[0]}.")

        speech_parts.append("Que tengas un excelente día.")
        full_speech = " ".join(speech_parts)

        # 2. Generación del Documento Markdown para Obsidian
        md_lines = [
            f"---",
            f"title: 'Briefing Matinal - {today_str}'",
            f"date: {today_str}",
            f"tags: [briefing, noticias, meteo, ourense, youtube, marcvidal, habana-bunker]",
            f"author: 'Habana Búnker Inteligencia'",
            f"---",
            f"",
            f"# 🌅 Briefing Matinal Habana — {today_nice}",
            f"",
            f"> [!TIP] **Resumen de Voz Generado para Altavoces**",
            f"> *\"{full_speech}\"*",
            f"",
            f"---",
            f"",
            f"## 🌤️ Meteorología en {weather.get('city', 'Ourense')}",
            f"- **Estado actual:** {weather.get('condition')} ({weather.get('temperature')}°C)",
            f"- **Sensación térmica:** {weather.get('apparent_temperature')}°C",
            f"- **Máxima / Mínima:** {weather.get('temp_max')}°C / {weather.get('temp_min')}°C",
            f"- **Probabilidad de lluvia:** {weather.get('rain_probability')}%",
            f"- **Viento:** {weather.get('wind_speed')} km/h",
            f"",
            f"---",
            f"",
            f"## 📰 Titulares del Día",
        ]

        for item in news_items:
            md_lines.append(f"### 🔹 [{item.get('source')}] {item.get('title')}")
            if item.get('summary'):
                md_lines.append(f"> {item.get('summary')}")
            if item.get('link'):
                md_lines.append(f"🔗 [Leer artículo completo]({item.get('link')})")
            md_lines.append("")

        md_lines.extend([
            f"---",
            f"",
            f"## 📺 Marc Vidal: Último Vídeo",
            f"**Título:** [{youtube.get('title')}]({youtube.get('url')})  ",
            f"**Publicado:** {youtube.get('published', '')[:10]}  ",
            f"",
            f"### 💡 Ideas Clave:",
        ])

        for pt in youtube.get("key_points", []):
            md_lines.append(f"- {pt}")

        md_lines.extend([
            f"",
            f"---",
            f"*Generado automáticamente por el Búnker IA de Habana 14 el {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}.*"
        ])

        full_markdown = "\n".join(md_lines)

        # 3. Guardado en Obsidian automático
        saved_file = self.save_to_obsidian(today_str, full_markdown)

        briefing_result = {
            "ok": True,
            "date": today_str,
            "speech_text": full_speech,
            "markdown": full_markdown,
            "obsidian_file": str(saved_file),
            "weather": weather,
            "news": news,
            "youtube": youtube,
            "created_at": datetime.now().isoformat()
        }

        self.config["last_briefing"] = {
            "date": today_str,
            "speech_text": full_speech,
            "file": str(saved_file)
        }
        self._save_config()

        return briefing_result

    # ==========================
    # 5. GUARDAR EN OBSIDIAN
    # ==========================
    def save_to_obsidian(self, date_str: str, markdown_content: str) -> Path:
        target_file = self.info_vault_dir / f"{date_str}_Briefing_Matinal.md"
        try:
            with open(target_file, "w", encoding="utf-8") as f:
                f.write(markdown_content)
            logger.info(f"Briefing guardado con éxito en Obsidian: {target_file}")
            
            # Enlazar en el Diario de hoy si existe la carpeta Diario
            diario_file = self.vault_dir / "Diario" / f"{date_str}.md"
            if diario_file.exists():
                with open(diario_file, "a", encoding="utf-8") as df:
                    df.write(f"\n\n## 🌅 Briefing Matinal\n- [[{date_str}_Briefing_Matinal|Ver informe completo del día]]\n")

            return target_file
        except Exception as e:
            logger.error(f"Error escribiendo en Obsidian {target_file}: {e}")
            return target_file

    # ==========================
    # 6. LOCUCIÓN POR ALTAVOCES
    # ==========================
    def speak_briefing(self, custom_text: Optional[str] = None) -> Dict[str, Any]:
        text_to_speak = custom_text
        if not text_to_speak:
            if self.config.get("last_briefing"):
                text_to_speak = self.config["last_briefing"].get("speech_text")
            else:
                briefing = self.generate_morning_briefing()
                text_to_speak = briefing.get("speech_text")

        if not text_to_speak:
            return {"ok": False, "error": "No hay texto para locutar"}

        try:
            from app.services.tts import tts_service
            audio_url = tts_service.generate_audio(text_to_speak, persona="ghost")
            
            # Reproducir automáticamente en altavoces locales si está disponible
            played_local = False
            try:
                from app.services.local_audio_player import LocalAudioPlayer
                local_player = LocalAudioPlayer()
                if audio_url:
                    full_audio_path = os.path.join(self.base_dir, audio_url.lstrip("/"))
                    if os.path.exists(full_audio_path):
                        # Play via ffplay / subprocess
                        import subprocess
                        subprocess.Popen(["ffplay", "-nodisp", "-autoexit", full_audio_path],
                                         stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                        played_local = True
            except Exception as e_play:
                logger.debug(f"Reproducción local directa opcional: {e_play}")

            return {
                "ok": True,
                "audio_url": audio_url,
                "text": text_to_speak,
                "played_local": played_local
            }
        except Exception as e:
            logger.error(f"Error generando audio TTS: {e}")
            return {"ok": False, "error": str(e)}

bunker_information = BunkerInformationService()
