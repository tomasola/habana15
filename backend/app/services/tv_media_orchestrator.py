"""
Habana 15 - Unified Smart TV & Media Orchestrator
Control unificado para:
1. TV Salón (Samsung Smart TV UE43J5500 via DLNA MPEG-TS Live Proxy)
2. TV Habitación Principal (Xiaomi Android TV 192.168.1.136 via Google Cast + Local HLS Proxy)
3. TV Cocina (Xiaomi Android TV 192.168.1.135 via Google Cast + Local HLS Proxy)
"""

import html
import http.server
import json
import logging
import os
import re
import socket
import socketserver
import threading
import time
import urllib.parse
import urllib.request
from typing import Dict, Any, Optional, List

logger = logging.getLogger("habana.tv_manager")

FAVORITES_FILE = r"F:\Habana 15\backend\data\tv_favorites.json"
M3U8_FILE = r"F:\Habana 15\media\television\canales_tdt_espana.m3u8"

DEFAULT_FAVORITES = [
    "la1", "la2", "antena3", "cuatro", "telecinco", "lasexta",
    "la7cyl", "7tv_andalucia", "trece", "fdf", "energy", "neox",
    "nova", "mega", "atreseries", "divinity", "bemad", "boing",
    "clan", "24h", "teledeporte", "tvg", "telemadrid"
]

# Canales Principales y Nacionales (con soporte para resolución dinámica Atresmedia / Mediaset / La 7)
FEATURED_CHANNELS: Dict[str, Dict[str, Any]] = {
    "la1": {
        "id": "la1",
        "name": "La 1 HD",
        "category": "Generalista",
        "stream": "https://rtvelivestream.rtve.es/rtvesec/la1/la1_main_dvr_720.m3u8",
        "ts_stream": "https://rtvelivestream.rtve.es/rtvesec/la1/la1_main_dvr_720.m3u8",
        "logo": "https://graph.facebook.com/la1detve/picture?width=200&height=200",
        "featured": True
    },
    "la2": {
        "id": "la2",
        "name": "La 2 HD",
        "category": "Generalista",
        "stream": "https://rtvelivestream.rtve.es/rtvesec/la2/la2_main_dvr_720.m3u8",
        "ts_stream": "https://rtvelivestream.rtve.es/rtvesec/la2/la2_main_dvr_720.m3u8",
        "logo": "https://graph.facebook.com/la2detve/picture?width=200&height=200",
        "featured": True
    },
    "antena3": {
        "id": "antena3",
        "name": "Antena 3 HD",
        "category": "Generalista",
        "resolver": "atresmedia",
        "atres_id": "5a6a165a7ed1a834493ebf6a",
        "stream": "https://api.atresplayer.com/player/v1/live/5a6a165a7ed1a834493ebf6a",
        "logo": "https://graph.facebook.com/antena3/picture?width=200&height=200",
        "featured": True
    },
    "cuatro": {
        "id": "cuatro",
        "name": "Cuatro HD",
        "category": "Generalista",
        "resolver": "mediaset",
        "smil_url": "https://link.api.eu.theplatform.com/s/RJmEdr/DRmQSlYWOr9L?format=SMIL",
        "stream": "https://link.api.eu.theplatform.com/s/RJmEdr/DRmQSlYWOr9L?format=SMIL",
        "logo": "https://graph.facebook.com/cuatro/picture?width=200&height=200",
        "featured": True
    },
    "telecinco": {
        "id": "telecinco",
        "name": "Telecinco HD",
        "category": "Generalista",
        "resolver": "mediaset",
        "smil_url": "https://link.api.eu.theplatform.com/s/RJmEdr/UfjS5SPg1R1j?format=SMIL",
        "stream": "https://link.api.eu.theplatform.com/s/RJmEdr/UfjS5SPg1R1j?format=SMIL",
        "logo": "https://graph.facebook.com/tele5/picture?width=200&height=200",
        "featured": True
    },
    "lasexta": {
        "id": "lasexta",
        "name": "laSexta HD",
        "category": "Generalista",
        "resolver": "atresmedia",
        "atres_id": "5a6a172c7ed1a834493ebf6b",
        "stream": "https://api.atresplayer.com/player/v1/live/5a6a172c7ed1a834493ebf6b",
        "logo": "https://graph.facebook.com/laSexta/picture?width=200&height=200",
        "featured": True
    },
    "la7cyl": {
        "id": "la7cyl",
        "name": "La 7 (Castilla y León)",
        "category": "Autonómicas",
        "resolver": "la7cyl",
        "stream": "https://www.cyltvplay.es/player/d3badef6-d229-4a27-9609-03df3d17ca3/la7/la7",
        "logo": "https://graph.facebook.com/cyltv/picture?width=200&height=200",
        "featured": True
    },
    "7tv_andalucia": {
        "id": "7tv_andalucia",
        "name": "7TV Andalucía",
        "category": "Autonómicas",
        "stream": "https://especial7tv.gestec-video.com/hls/regional.m3u8",
        "ts_stream": "https://especial7tv.gestec-video.com/hls/regional.m3u8",
        "logo": "https://graph.facebook.com/7TVAndalucia/picture?width=200&height=200",
        "featured": True
    },
    "7tv_valencia": {
        "id": "7tv_valencia",
        "name": "La 7 TeleValencia",
        "category": "Autonómicas",
        "stream": "https://play.cdn.enetres.net/9E9557EFCEBB43A89CEC8FBD3C500247022/028/playlist.m3u8",
        "ts_stream": "https://play.cdn.enetres.net/9E9557EFCEBB43A89CEC8FBD3C500247022/028/playlist.m3u8",
        "logo": "https://graph.facebook.com/7Televalencia/picture?width=200&height=200",
        "featured": True
    },
    "tele7_bizkaia": {
        "id": "tele7_bizkaia",
        "name": "Tele 7",
        "category": "Autonómicas",
        "stream": "https://ingest2-video.streaming-pro.com/tele7_ABR/stream/playlist.m3u8",
        "ts_stream": "https://ingest2-video.streaming-pro.com/tele7_ABR/stream/playlist.m3u8",
        "logo": "https://graph.facebook.com/Tele7Radio7/picture?width=200&height=200",
        "featured": True
    },
    "tpa7": {
        "id": "tpa7",
        "name": "TPA 7 Asturias",
        "category": "Autonómicas",
        "resolver": "tpa7",
        "stream": "https://www.rtpa.es/tpa-television",
        "logo": "https://graph.facebook.com/rtpaoficial/picture?width=200&height=200",
        "featured": True
    },
    "trece": {
        "id": "trece",
        "name": "TRECE TV",
        "category": "Generalista",
        "stream": "https://play.cdn.enetres.net/091DB7AFBD77442B9BA2F141DCC182F5021/021/playlist.m3u8",
        "ts_stream": "https://play.cdn.enetres.net/091DB7AFBD77442B9BA2F141DCC182F5021/021/playlist.m3u8",
        "logo": "https://graph.facebook.com/TRECEtves/picture?width=200&height=200",
        "featured": True
    },
    "fdf": {
        "id": "fdf",
        "name": "FDF (Factoría de Ficción)",
        "category": "Cine y Series",
        "resolver": "mediaset",
        "smil_url": "https://link.api.eu.theplatform.com/s/RJmEdr/sAsYtk16k6wc?format=SMIL",
        "stream": "https://link.api.eu.theplatform.com/s/RJmEdr/sAsYtk16k6wc?format=SMIL",
        "logo": "https://graph.facebook.com/factoriadeficcion/picture?width=200&height=200",
        "featured": True
    },
    "energy": {
        "id": "energy",
        "name": "Energy",
        "category": "Cine y Series",
        "resolver": "mediaset",
        "smil_url": "https://link.api.eu.theplatform.com/s/RJmEdr/yqtjIv38RfbY?format=SMIL",
        "stream": "https://link.api.eu.theplatform.com/s/RJmEdr/yqtjIv38RfbY?format=SMIL",
        "logo": "https://graph.facebook.com/EnegyTv/picture?width=200&height=200",
        "featured": True
    },
    "neox": {
        "id": "neox",
        "name": "Neox",
        "category": "Cine y Series",
        "resolver": "atresmedia",
        "atres_id": "5a6a17da7ed1a834493ebf6d",
        "stream": "https://api.atresplayer.com/player/v1/live/5a6a17da7ed1a834493ebf6d",
        "logo": "https://graph.facebook.com/neox/picture?width=200&height=200",
        "featured": True
    },
    "nova": {
        "id": "nova",
        "name": "Nova",
        "category": "Cine y Series",
        "resolver": "atresmedia",
        "atres_id": "5a6a180b7ed1a834493ebf6e",
        "stream": "https://api.atresplayer.com/player/v1/live/5a6a180b7ed1a834493ebf6e",
        "logo": "https://graph.facebook.com/novatdt/picture?width=200&height=200",
        "featured": True
    },
    "mega": {
        "id": "mega",
        "name": "Mega",
        "category": "Cine y Series",
        "resolver": "atresmedia",
        "atres_id": "5a6a18357ed1a834493ebf6f",
        "stream": "https://api.atresplayer.com/player/v1/live/5a6a18357ed1a834493ebf6f",
        "logo": "https://graph.facebook.com/megaTDT/picture?width=200&height=200",
        "featured": True
    },
    "atreseries": {
        "id": "atreseries",
        "name": "Atreseries",
        "category": "Cine y Series",
        "resolver": "atresmedia",
        "atres_id": "5a6a189a7ed1a834493ebf70",
        "stream": "https://api.atresplayer.com/player/v1/live/5a6a189a7ed1a834493ebf70",
        "logo": "https://graph.facebook.com/atreseries/picture?width=200&height=200",
        "featured": True
    },
    "divinity": {
        "id": "divinity",
        "name": "Divinity",
        "category": "Cine y Series",
        "resolver": "mediaset",
        "smil_url": "https://link.api.eu.theplatform.com/s/RJmEdr/gRZgQfU_5Q_a?format=SMIL",
        "stream": "https://link.api.eu.theplatform.com/s/RJmEdr/gRZgQfU_5Q_a?format=SMIL",
        "logo": "https://graph.facebook.com/divinityes/picture?width=200&height=200",
        "featured": True
    },
    "bemad": {
        "id": "bemad",
        "name": "Be Mad HD",
        "category": "Cine y Series",
        "resolver": "mediaset",
        "smil_url": "https://link.api.eu.theplatform.com/s/RJmEdr/EFaN27sPbtbU?format=SMIL",
        "stream": "https://link.api.eu.theplatform.com/s/RJmEdr/EFaN27sPbtbU?format=SMIL",
        "logo": "https://graph.facebook.com/BeMadTV/picture?width=200&height=200",
        "featured": True
    },
    "boing": {
        "id": "boing",
        "name": "Boing",
        "category": "Infantil",
        "resolver": "mediaset",
        "smil_url": "https://link.api.eu.theplatform.com/s/RJmEdr/7l8znttEB_Xe?format=SMIL",
        "stream": "https://link.api.eu.theplatform.com/s/RJmEdr/7l8znttEB_Xe?format=SMIL",
        "logo": "https://graph.facebook.com/boinges/picture?width=200&height=200",
        "featured": True
    },
    "clan": {
        "id": "clan",
        "name": "Clan TVE",
        "category": "Infantil",
        "stream": "https://rtvelivestream.rtve.es/rtvesec/clan/clan_main_dvr_720.m3u8",
        "ts_stream": "https://rtvelivestream.rtve.es/rtvesec/clan/clan_main_dvr_720.m3u8",
        "logo": "https://graph.facebook.com/clantve/picture?width=200&height=200",
        "featured": True
    },
    "24h": {
        "id": "24h",
        "name": "24 Horas TVE",
        "category": "Noticias",
        "stream": "https://rtvelivestream.rtve.es/rtvesec/24h/24h_main_dvr_720.m3u8",
        "ts_stream": "https://rtvelivestream.rtve.es/rtvesec/24h/24h_main_dvr_720.m3u8",
        "logo": "https://pbs.twimg.com/profile_images/1634293543987453954/mb1Rzmso_200x200.jpg",
        "featured": True
    },
    "teledeporte": {
        "id": "teledeporte",
        "name": "Teledeporte",
        "category": "Deportes",
        "stream": "https://rtvelivestream.rtve.es/rtvesec/tdp/tdp_main_dvr_720.m3u8",
        "ts_stream": "https://rtvelivestream.rtve.es/rtvesec/tdp/tdp_main_dvr_720.m3u8",
        "logo": "https://graph.facebook.com/teledeporteRTVE/picture?width=200&height=200",
        "featured": True
    },
    "realmadrid": {
        "id": "realmadrid",
        "name": "Real Madrid TV",
        "category": "Deportes",
        "stream": "https://rmtv.akamaized.net/hls/live/2043153/rmtv-es-web/master.m3u8",
        "ts_stream": "https://rmtv.akamaized.net/hls/live/2043153/rmtv-es-web/master.m3u8",
        "logo": "https://graph.facebook.com/RealMadrid/picture?width=200&height=200",
        "featured": True
    },
    "telemadrid": {
        "id": "telemadrid",
        "name": "Telemadrid HD",
        "category": "Autonómicas",
        "stream": "https://live.telemadrid.cross-media.es/6389770581112/eu-central-1/6416060453001/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJob3N0IjoiajI5YjgyLmVncmVzcy5haGc3NmwiLCJhY2NvdW50X2lkIjoiNjQxNjA2MDQ1MzAwMSIsImVobiI6ImxpdmUudGVsZW1hZHJpZC5jcm9zcy1tZWRpYS5lcyIsImlzcyI6ImJsaXZlLXBsYXliYWNrLXNvdXJjZS1hcGkiLCJzdWIiOiJwYXRobWFwdG9rZW4iLCJhdWQiOlsiNjQxNjA2MDQ1MzAwMSJdLCJqdGkiOiI2Mzg5NzcwNTgxMTEyIn0.kqriAMUkHT6m0V6wkCHJum_EUyL4PAi1zJMKlfmYHEU/playlist-hls.m3u8",
        "ts_stream": "https://live.telemadrid.cross-media.es/6389770581112/eu-central-1/6416060453001/eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJob3N0IjoiajI5YjgyLmVncmVzcy5haGc3NmwiLCJhY2NvdW50X2lkIjoiNjQxNjA2MDQ1MzAwMSIsImVobiI6ImxpdmUudGVsZW1hZHJpZC5jcm9zcy1tZWRpYS5lcyIsImlzcyI6ImJsaXZlLXBsYXliYWNrLXNvdXJjZS1hcGkiLCJzdWIiOiJwYXRobWFwdG9rZW4iLCJhdWQiOlsiNjQxNjA2MDQ1MzAwMSJdLCJqdGkiOiI2Mzg5NzcwNTgxMTEyIn0.kqriAMUkHT6m0V6wkCHJum_EUyL4PAi1zJMKlfmYHEU/playlist-hls.m3u8",
        "logo": "https://graph.facebook.com/telemadrid/picture?width=200&height=200",
        "featured": True
    },
    "tvg": {
        "id": "tvg",
        "name": "TVG Galicia",
        "category": "Autonómicas",
        "stream": "https://crtvg-europa.flumotion.cloud/playlist_dvr.m3u8",
        "ts_stream": "https://crtvg-europa.flumotion.cloud/playlist_dvr.m3u8",
        "logo": "https://graph.facebook.com/TVGalicia/picture?width=200&height=200",
        "featured": True
    },
    "tvg2": {
        "id": "tvg2",
        "name": "TVG 2 Galicia",
        "category": "Autonómicas",
        "stream": "https://crtvg-tvg2.flumotion.cloud/playlist_dvr.m3u8",
        "ts_stream": "https://crtvg-tvg2.flumotion.cloud/playlist_dvr.m3u8",
        "logo": "https://graph.facebook.com/TVGalicia/picture?width=200&height=200",
        "featured": True
    },
    "canalsur": {
        "id": "canalsur",
        "name": "Canal Sur Andalucía",
        "category": "Autonómicas",
        "stream": "https://dfk2a268yviz9.cloudfront.net/v1/master/3722c60a815c199d9c0ef36c5b73da68a62b09d1/cc-ddiii1m6jt6of/CanalSurAndaluciaES.m3u8",
        "ts_stream": "https://dfk2a268yviz9.cloudfront.net/v1/master/3722c60a815c199d9c0ef36c5b73da68a62b09d1/cc-ddiii1m6jt6of/CanalSurAndaluciaES.m3u8",
        "logo": "https://graph.facebook.com/canalsurradioytv/picture?width=200&height=200",
        "featured": True
    },
    "etb1": {
        "id": "etb1",
        "name": "ETB 1",
        "category": "Autonómicas",
        "stream": "https://cdn1.etbon.eus/etb1/index.m3u8",
        "ts_stream": "https://cdn1.etbon.eus/etb1/index.m3u8",
        "logo": "https://graph.facebook.com/euskaltelebista/picture?width=200&height=200",
        "featured": True
    },
    "etb2": {
        "id": "etb2",
        "name": "ETB 2",
        "category": "Autonómicas",
        "stream": "https://cdn1.etbon.eus/etb2/index.m3u8",
        "ts_stream": "https://cdn1.etbon.eus/etb2/index.m3u8",
        "logo": "https://graph.facebook.com/euskaltelebista/picture?width=200&height=200",
        "featured": True
    },
    "tv3": {
        "id": "tv3",
        "name": "TV3 (3Cat)",
        "category": "Autonómicas",
        "stream": "https://directes-tv-es.3catdirectes.cat/live-origin/tv3-hls/master.m3u8",
        "ts_stream": "https://directes-tv-es.3catdirectes.cat/live-origin/tv3-hls/master.m3u8",
        "logo": "https://graph.facebook.com/som3cat/picture?width=200&height=200",
        "featured": True
    },
    "apunt": {
        "id": "apunt",
        "name": "À Punt Valencia",
        "category": "Autonómicas",
        "stream": "https://bcovlive-a.akamaihd.net/4497151092e54e1b8fb4638c7f7c91a4/eu-central-1/6057955885001/playlist_dvr.m3u8",
        "ts_stream": "https://bcovlive-a.akamaihd.net/4497151092e54e1b8fb4638c7f7c91a4/eu-central-1/6057955885001/playlist_dvr.m3u8",
        "logo": "https://graph.facebook.com/apuntmedia/picture?width=200&height=200",
        "featured": True
    },
    "cmm": {
        "id": "cmm",
        "name": "CMM Castilla-La Mancha",
        "category": "Autonómicas",
        "stream": "https://cdnapi.kaltura.com/p/2288691/sp/228869100/playManifest/entryId/1_01fn4910/format/applehttp/protocol/https/a.m3u8",
        "ts_stream": "https://cdnapi.kaltura.com/p/2288691/sp/228869100/playManifest/entryId/1_01fn4910/format/applehttp/protocol/https/a.m3u8",
        "logo": "https://graph.facebook.com/CMMediaes/picture?width=200&height=200",
        "featured": True
    },
    "extremadura": {
        "id": "extremadura",
        "name": "Canal Extremadura",
        "category": "Autonómicas",
        "stream": "https://cdn-canalextremadura.watchity.net/ssai/event/h135G32bR1K8dD14p9lO9A/master.m3u8",
        "ts_stream": "https://cdn-canalextremadura.watchity.net/ssai/event/h135G32bR1K8dD14p9lO9A/master.m3u8",
        "logo": "https://graph.facebook.com/CanalExtremadura/picture?width=200&height=200",
        "featured": True
    },
    "somoscine": {
        "id": "somoscine",
        "name": "Somos Cine (RTVE)",
        "category": "Cine y Series",
        "stream": "https://ztnr.rtve.es/ztnr/6909845.m3u8",
        "ts_stream": "https://ztnr.rtve.es/ztnr/6909845.m3u8",
        "logo": "https://graph.facebook.com/somoscine/picture?width=200&height=200",
        "featured": True
    },
    "mitele_comedia": {
        "id": "mitele_comedia",
        "name": "Infinity Comedia 24h",
        "category": "Cine y Series",
        "stream": "https://fast.mediasetinfinity.es/mitele-comedia.isml/ctv.m3u8",
        "ts_stream": "https://fast.mediasetinfinity.es/mitele-comedia.isml/ctv.m3u8",
        "logo": "https://graph.facebook.com/tele5/picture?width=200&height=200",
        "featured": True
    },
    "mitele_series": {
        "id": "mitele_series",
        "name": "Infinity Top Series 24h",
        "category": "Cine y Series",
        "stream": "https://fast.mediasetinfinity.es/mitele-top-series.isml/ctv.m3u8",
        "ts_stream": "https://fast.mediasetinfinity.es/mitele-top-series.isml/ctv.m3u8",
        "logo": "https://graph.facebook.com/tele5/picture?width=200&height=200",
        "featured": True
    },
    "cuentame": {
        "id": "cuentame",
        "name": "Cuéntame 24h (RTVE)",
        "category": "Cine y Series",
        "stream": "https://ztnr.rtve.es/ztnr/6909843.m3u8",
        "ts_stream": "https://ztnr.rtve.es/ztnr/6909843.m3u8",
        "logo": "https://graph.facebook.com/cuentametve/picture?width=200&height=200",
        "featured": True
    },
    "lapromesa": {
        "id": "lapromesa",
        "name": "La Promesa 24h (RTVE)",
        "category": "Cine y Series",
        "stream": "https://ztnr.rtve.es/ztnr/2472039.m3u8",
        "ts_stream": "https://ztnr.rtve.es/ztnr/2472039.m3u8",
        "logo": "https://graph.facebook.com/la1detve/picture?width=200&height=200",
        "featured": True
    },
    "doraemon": {
        "id": "doraemon",
        "name": "Canal Doraemon",
        "category": "Infantil",
        "stream": "https://fast-tailor.3catdirectes.cat/v1/channel/doraemon/hls.m3u8",
        "ts_stream": "https://fast-tailor.3catdirectes.cat/v1/channel/doraemon/hls.m3u8",
        "logo": "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/Doraemon_logo.svg/320px-Doraemon_logo.svg.png",
        "featured": True
    },
    "xabarin": {
        "id": "xabarin",
        "name": "TVG Xabarín",
        "category": "Infantil",
        "stream": "https://crtvg-infantil-schlive.flumotion.cloud/crtvglive/smil:channel5PRG.smil/playlist.m3u8",
        "ts_stream": "https://crtvg-infantil-schlive.flumotion.cloud/crtvglive/smil:channel5PRG.smil/playlist.m3u8",
        "logo": "https://graph.facebook.com/TVGalicia/picture?width=200&height=200",
        "featured": True
    },
    "euronews": {
        "id": "euronews",
        "name": "Euronews Español",
        "category": "Noticias",
        "stream": "https://euronews-live-spa-es.fast.rakuten.tv/v1/master/0547f18649bd788bec7b67b746e47670f558b6b2/production-LiveChannel-6571/bitok/eyJzdGlkIjoiMDA0YjY0NTMtYjY2MC00ZTZkLTlkNzEtMTk3YTM3ZDZhZWIxIiwibWt0IjoiZXMiLCJjaCI6NjU3MSwicHRmIjoxfQ==/26034/euronews-es.m3u8",
        "ts_stream": "https://euronews-live-spa-es.fast.rakuten.tv/v1/master/0547f18649bd788bec7b67b746e47670f558b6b2/production-LiveChannel-6571/bitok/eyJzdGlkIjoiMDA0YjY0NTMtYjY2MC00ZTZkLTlkNzEtMTk3YTM3ZDZhZWIxIiwibWt0IjoiZXMiLCJjaCI6NjU3MSwicHRmIjoxfQ==/26034/euronews-es.m3u8",
        "logo": "https://graph.facebook.com/es.euronews/picture?width=200&height=200",
        "featured": True
    },
    "elpais": {
        "id": "elpais",
        "name": "El País TV",
        "category": "Noticias",
        "stream": "https://d2epgk1fomaa1g.cloudfront.net/v1/master/3722c60a815c199d9c0ef36c5b73da68a62b09d1/cc-9n8y4tw0bk3an/live/fast-channel-el-pais/fast-channel-el-pais.m3u8",
        "ts_stream": "https://d2epgk1fomaa1g.cloudfront.net/v1/master/3722c60a815c199d9c0ef36c5b73da68a62b09d1/cc-9n8y4tw0bk3an/live/fast-channel-el-pais/fast-channel-el-pais.m3u8",
        "logo": "https://graph.facebook.com/elpais/picture?width=200&height=200",
        "featured": True
    }
}


def _slugify(text: str) -> str:
    s = text.lower()
    s = re.sub(r'[áàäâ]', 'a', s)
    s = re.sub(r'[éèëê]', 'e', s)
    s = re.sub(r'[íìïî]', 'i', s)
    s = re.sub(r'[óòöô]', 'o', s)
    s = re.sub(r'[úùüû]', 'u', s)
    s = re.sub(r'[ñ]', 'n', s)
    s = re.sub(r'[^a-z0-9]+', '_', s).strip('_')
    return s or "ch"


def _map_m3u8_category(grp: str, name: str) -> str:
    g = grp.lower()
    n = name.lower()
    if "general" in g:
        return "Generalista"
    if "inform" in g or "notic" in g:
        return "Noticias"
    if "deport" in g:
        return "Deportes"
    if "infant" in g:
        return "Infantil"
    if "music" in g:
        return "Música"
    if "cine" in n or "serie" in n or "pel" in n or "cuéntame" in n or "promesa" in n or "revuelta" in n:
        return "Cine y Series"
    if "eventual" in g:
        return "Entretenimiento"
    if "int." in g:
        return "Internacional"
    return "Autonómicas"


def _build_full_channel_catalog() -> Dict[str, Dict[str, Any]]:
    catalog: Dict[str, Dict[str, Any]] = {}
    seen_names = set()

    for cid, ch in FEATURED_CHANNELS.items():
        catalog[cid] = dict(ch)
        seen_names.add(ch["name"].lower())

    # Nombres base ya cubiertos para no duplicar con entradas genéricas del M3U8
    covered_keywords = {
        "la 1", "la 2", "antena 3", "cuatro", "telecinco", "lasexta", "la sexta",
        "trece", "clan", "24h", "teledeporte", "real madrid tv", "euronews", "el país",
        "la 7", "7tv", "7 televalencia", "tele 7", "telemadrid", "tvg", "canal sur",
        "etb 1", "etb 2", "tv3", "à punt", "castilla-la mancha", "canal extremadura"
    }

    if os.path.exists(M3U8_FILE):
        try:
            with open(M3U8_FILE, "r", encoding="utf-8", errors="ignore") as f:
                lines = [l.strip() for l in f if l.strip()]
            i = 0
            while i < len(lines):
                line = lines[i]
                if line.startswith("#EXTINF:"):
                    grp_m = re.search(r'group-title="([^"]+)"', line)
                    logo_m = re.search(r'tvg-logo="([^"]+)"', line)
                    name_m = re.search(r'tvg-name="([^"]+)"', line)
                    comma_name = line.split(",")[-1].strip()
                    name = (name_m.group(1) if name_m else comma_name).strip()
                    grp = grp_m.group(1) if grp_m else "Autonómicas"
                    logo = logo_m.group(1) if logo_m else ""

                    j = i + 1
                    while j < len(lines) and lines[j].startswith("#"):
                        j += 1
                    if j < len(lines):
                        url = lines[j]
                        if url.startswith("http") and "[" not in url and "youtube.com" not in url and "twitch.tv" not in url:
                            low_name = name.lower()
                            if low_name not in seen_names and not any(k == low_name for k in covered_keywords):
                                seen_names.add(low_name)
                                cid = _slugify(name)
                                if cid in catalog:
                                    cid = f"{cid}_{len(catalog)}"
                                cat = _map_m3u8_category(grp, name)
                                catalog[cid] = {
                                    "id": cid,
                                    "name": name if grp in ("Generalistas", "Informativos", "Deportivos", "Infantiles", "Eventuales", "Musicales") else f"{name} ({grp})",
                                    "category": cat,
                                    "region": grp,
                                    "stream": url,
                                    "ts_stream": url,
                                    "logo": logo,
                                    "featured": False
                                }
                    i = j + 1
                else:
                    i += 1
        except Exception as e:
            logger.warning(f"Error leyendo catálogo M3U8: {e}")

    return catalog


CHANNELS = _build_full_channel_catalog()

TV_DEVICES = {
    "salon": {
        "id": "salon",
        "name": "TV Salón",
        "room": "Salón y Comedor",
        "brand": "Samsung Smart TV",
        "model": "UE43J5500",
        "ip": "192.168.1.245",
        "mac": "14:BB:6E:78:FB:48",
        "type": "samsung_tizen",
        "icon": "📺",
        "speaker": "Salón",
        "speaker_ip": "192.168.1.131"
    },
    "habitacion": {
        "id": "habitacion",
        "name": "TV Habitación Principal",
        "room": "Dormitorio Principal",
        "brand": "Xiaomi Android TV",
        "model": "MiTV-MSSP2",
        "ip": "192.168.1.136",
        "mac": "60:1D:9D:41:C3:0C",
        "type": "chromecast",
        "cast_name": "mi tv",
        "icon": "🛏️",
        "speaker": "Dormitorio",
        "speaker_ip": "192.168.1.132"
    },
    "cocina": {
        "id": "cocina",
        "name": "TV Cocina",
        "room": "Cocina",
        "brand": "Xiaomi Android TV",
        "model": "MiTV-MSSP2",
        "ip": "192.168.1.135",
        "mac": "60:1D:9D:80:0F:E9",
        "type": "chromecast",
        "cast_name": "TV del dormitorio",
        "icon": "🍳",
        "speaker": "Cocina",
        "speaker_ip": "192.168.1.130"
    }
}

# Caché en memoria de URLs dinámicas resueltas (expira cada 60 segundos)
_STREAM_CACHE: Dict[str, Dict[str, Any]] = {}


def _get_headers_for_url(url: str) -> Dict[str, str]:
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
    if "mediaset" in url or "theplatform" in url:
        headers["Origin"] = "https://www.mediasetinfinity.es"
        headers["Referer"] = "https://www.mediasetinfinity.es/"
    elif "atresmedia" in url or "atresplayer" in url:
        headers["Origin"] = "https://www.atresplayer.com"
        headers["Referer"] = "https://www.atresplayer.com/"
    elif "eitb" in url or "etbon" in url:
        headers["Referer"] = "https://www.eitb.eus/"
    return headers


def _resolve_dynamic_master_url(ch: Dict[str, Any]) -> str:
    resolver = ch.get("resolver")
    if not resolver:
        return ch.get("ts_stream") or ch["stream"]

    cid = ch["id"]
    now = time.time()
    cached = _STREAM_CACHE.get(cid)
    if cached and now - cached["ts"] < 120:
        return cached["url"]

    resolved_url = ch["stream"]
    try:
        if resolver == "atresmedia":
            api_url = f"https://api.atresplayer.com/player/v1/live/{ch['atres_id']}"
            req = urllib.request.Request(api_url, headers=_get_headers_for_url(api_url))
            with urllib.request.urlopen(req, timeout=5) as r:
                data = json.loads(r.read().decode("utf-8", errors="ignore"))
            sources = data.get("sourcesLive", [])
            # Priorizar hlslegacy (video+audio muxed en un solo track TS sin DRM)
            legacy = [s["src"] for s in sources if "hlslegacy" in s.get("src", "")]
            any_hls = [s["src"] for s in sources if ".m3u8" in s.get("src", "")]
            if legacy:
                resolved_url = legacy[0]
            elif any_hls:
                resolved_url = any_hls[0]

        elif resolver == "mediaset":
            smil_url = ch["smil_url"]
            req = urllib.request.Request(smil_url, headers=_get_headers_for_url(smil_url))
            with urllib.request.urlopen(req, timeout=5) as r:
                smil_text = r.read().decode("utf-8", errors="ignore")
            m = re.search(r'src="(https://[^"]+\.m3u8[^"]*)"', smil_text)
            if m:
                resolved_url = html.unescape(m.group(1))

        elif resolver == "la7cyl":
            req = urllib.request.Request(ch["stream"], headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=5) as r:
                html_text = r.read().decode("utf-8", errors="ignore")
            m = re.search(r'https://[^\s"\'<>]+playlist\.m3u8[^\s"\'<>]*', html_text)
            if m:
                resolved_url = m.group(0)

        elif resolver == "tpa7":
            req = urllib.request.Request(ch["stream"], headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=5) as r:
                html_text = r.read().decode("utf-8", errors="ignore")
            m = re.search(r'https://[^\s"\'<>]+\.m3u8[^\s"\'<>]*', html_text)
            if m:
                resolved_url = m.group(0)
    except Exception as e:
        logger.warning(f"Error resolviendo stream dinámico para {cid}: {e}")

    _STREAM_CACHE[cid] = {"url": resolved_url, "ts": now}
    return resolved_url


def _resolve_sub_playlist(url: str) -> str:
    headers = _get_headers_for_url(url)
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=5) as r:
        text = r.read().decode('utf-8', errors='ignore')
        final_url = r.geturl()

    if '#EXT-X-STREAM-INF' in text:
        lines = [l.strip() for l in text.splitlines() if l.strip()]
        candidates = []
        for i, l in enumerate(lines):
            if l.startswith('#EXT-X-STREAM-INF') and i + 1 < len(lines):
                sub = lines[i + 1]
                if sub.startswith('#'):
                    continue
                full_sub = urllib.parse.urljoin(final_url, sub)
                # Descartar variantes solo-audio
                if 'video=' not in sub and 'CODECS="mp4a' in l and 'avc1' not in l:
                    continue
                bw_m = re.search(r'BANDWIDTH=(\d+)', l)
                bw = int(bw_m.group(1)) if bw_m else 1500000
                has_muxed = ('audio' in sub and 'video' in sub)
                candidates.append((has_muxed, bw, full_sub))

        if candidates:
            # Preferir variantes muxed con ancho de banda medio-alto (1.5M a 3.5M) para máxima fluidez
            muxed = [c for c in candidates if c[0]]
            pool = muxed if muxed else candidates
            pool.sort(key=lambda x: abs(x[1] - 2500000))
            return pool[0][2]

    return final_url


class _UniversalStreamProxyHandler(http.server.BaseHTTPRequestHandler):
    """
    Servidor Proxy en puerto 8899 para Habana 15:
    - /live/<channel_key>.ts   -> Flujo continuo MPEG-TS con cabeceras DLNA (para Samsung Smart TV y Xiaomi Cast)
    - /hls/<channel_key>.m3u8  -> Manifiesto HLS single-track con URLs absolutas y CORS abierto (para Xiaomi Cast)
    """
    def log_message(self, format, *args):
        pass

    def _send_cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')

    def do_OPTIONS(self):
        self.send_response(200)
        self._send_cors()
        self.end_headers()

    def do_HEAD(self):
        self.send_response(200)
        self._send_cors()
        if '.m3u8' in self.path:
            self.send_header('Content-Type', 'application/vnd.apple.mpegurl')
        else:
            self.send_header('Content-Type', 'video/mpeg')
            self.send_header('transferMode.dlna.org', 'Streaming')
            self.send_header('contentFeatures.dlna.org', 'DLNA.ORG_PN=MPEG_TS_HD_NA_ISO;DLNA.ORG_OP=00;DLNA.ORG_CI=0;DLNA.ORG_FLAGS=01700000000000000000000000000000')
        self.end_headers()

    def do_GET(self):
        path_clean = self.path.split('?')[0].strip('/')
        parts = path_clean.split('/')

        # Modo 1: /hls/<channel_key>.m3u8 (Manifiesto HLS limpio para Chromecast)
        if len(parts) >= 2 and parts[0] == 'hls':
            ch_key = parts[1].replace('.m3u8', '')
            ch = CHANNELS.get(ch_key) or CHANNELS.get("la1")
            try:
                master_url = _resolve_dynamic_master_url(ch)
                sub_url = _resolve_sub_playlist(master_url)
                headers = _get_headers_for_url(sub_url)
                req = urllib.request.Request(sub_url, headers=headers)
                with urllib.request.urlopen(req, timeout=5) as r:
                    pl_text = r.read().decode('utf-8', errors='ignore')
                    base_url = r.geturl()

                out_lines = []
                for line in pl_text.splitlines():
                    s = line.strip()
                    if not s:
                        continue
                    if s.startswith('#'):
                        # Reescribir URI="..." si existe
                        if 'URI="' in s:
                            s = re.sub(
                                r'URI="([^"]+)"',
                                lambda m: f'URI="{urllib.parse.urljoin(base_url, m.group(1))}"',
                                s
                            )
                        out_lines.append(s)
                    else:
                        out_lines.append(urllib.parse.urljoin(base_url, s))

                body = ("\n".join(out_lines) + "\n").encode('utf-8')
                self.send_response(200)
                self._send_cors()
                self.send_header('Content-Type', 'application/vnd.apple.mpegurl')
                self.send_header('Content-Length', str(len(body)))
                self.send_header('Cache-Control', 'no-cache')
                self.end_headers()
                self.wfile.write(body)
            except Exception as e:
                self.send_response(502)
                self._send_cors()
                self.end_headers()
            return

        # Modo 2: /live/<channel_key>.ts (Flujo continuo MPEG-TS para Samsung DLNA & Xiaomi Cast)
        ch_key = "la1"
        if len(parts) >= 2:
            ch_key = parts[1].replace('.ts', '')

        ch = CHANNELS.get(ch_key) or CHANNELS.get("la1")

        self.send_response(200)
        self._send_cors()
        self.send_header('Content-Type', 'video/mpeg')
        self.send_header('transferMode.dlna.org', 'Streaming')
        self.send_header('contentFeatures.dlna.org', 'DLNA.ORG_PN=MPEG_TS_HD_NA_ISO;DLNA.ORG_OP=00;DLNA.ORG_CI=0;DLNA.ORG_FLAGS=01700000000000000000000000000000')
        self.end_headers()

        seen_segments = set()
        try:
            master_url = _resolve_dynamic_master_url(ch)
            sub_url = _resolve_sub_playlist(master_url)
            headers = _get_headers_for_url(sub_url)
            while True:
                req = urllib.request.Request(sub_url, headers=headers)
                with urllib.request.urlopen(req, timeout=5) as r:
                    pl_text = r.read().decode('utf-8', errors='ignore')
                segments = [
                    urllib.parse.urljoin(sub_url, l.strip())
                    for l in pl_text.splitlines()
                    if l.strip() and not l.startswith('#')
                ]
                if not seen_segments and len(segments) > 2:
                    for old_s in segments[:-2]:
                        seen_segments.add(old_s)

                new_segs = [s for s in segments if s not in seen_segments]
                for seg_url in new_segs:
                    seen_segments.add(seg_url)
                    s_req = urllib.request.Request(seg_url, headers=headers)
                    with urllib.request.urlopen(s_req, timeout=5) as sr:
                        while True:
                            chunk = sr.read(65536)
                            if not chunk:
                                break
                            self.wfile.write(chunk)
                        self.wfile.flush()
                time.sleep(1.0)
        except Exception:
            pass


class HabanaTVManager:
    """Gestor maestro multimedia para Habana 15"""

    def __init__(self):
        self._proxy_started = False
        self._proxy_port = 8899
        self._favorites: List[str] = self._load_favorites()
        self._current_tv_channel: Dict[str, str] = {
            "salon": "la1",
            "habitacion": "la1",
            "cocina": "la1"
        }
        self.last_target_tv: str = "salon"
        self.last_target_speaker: str = "Salón"
        self.last_action_ts: float = 0.0
        self._start_dlna_proxy()

    def get_associated_speaker(self, tv_key: str) -> str:
        """Devuelve el nombre del altavoz Google Cast asociado a una televisión."""
        key = (tv_key or "salon").lower().strip()
        if key in ("todas", "todos", "all"):
            return "todos"
        dev = TV_DEVICES.get(key)
        if dev and dev.get("speaker"):
            return dev["speaker"]
        mapping = {
            "salon": "Salón",
            "habitacion": "Dormitorio",
            "cocina": "Cocina"
        }
        return mapping.get(key, "Salón")

    def mark_active_tv(self, tv_key: str) -> str:
        """Registra la TV/estancia activa y devuelve el altavoz asociado de esa estancia."""
        spk = self.get_associated_speaker(tv_key)
        self.last_target_tv = (tv_key or "salon").lower().strip()
        self.last_target_speaker = spk
        self.last_action_ts = time.time()
        return spk

    def detect_room_speaker_from_text(self, text: str) -> Optional[str]:
        """
        Detecta si en una frase se menciona explícitamente una de las estancias con TV+Altavoz
        (Salón, Habitación Principal/Dormitorio, Cocina, Despacho, o Todas) y devuelve el altavoz correspondiente.
        """
        t = self._norm(text)
        if any(w in t for w in ("todas las tele", "todos los televisores", "todas las televisiones", "toda la casa", "todos los altavoces")):
            return "todos"
        if "cocina" in t:
            return "Cocina"
        if any(w in t for w in ("habitacion", "dormitorio", "cuarto", "cama", "principal", "mi tv")):
            return "Dormitorio"
        if "despacho" in t:
            return "Despacho"
        if any(w in t for w in ("salon", "comedor", "samsung", "sala")):
            return "Salón"
        # Si acaba de ejecutarse una orden de TV hace menos de 4 segundos, usar el altavoz de esa TV
        if (time.time() - getattr(self, "last_action_ts", 0.0)) < 4.0 and getattr(self, "last_target_speaker", None):
            return self.last_target_speaker
        return None

    def _load_favorites(self) -> List[str]:
        try:
            if os.path.exists(FAVORITES_FILE):
                with open(FAVORITES_FILE, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if isinstance(data, list):
                        return data
        except Exception as e:
            logger.warning(f"No se pudo leer favoritos de TV: {e}")
        self._save_favorites(DEFAULT_FAVORITES)
        return list(DEFAULT_FAVORITES)

    def _save_favorites(self, favs: List[str]):
        try:
            os.makedirs(os.path.dirname(FAVORITES_FILE), exist_ok=True)
            with open(FAVORITES_FILE, "w", encoding="utf-8") as f:
                json.dump(favs, f, ensure_ascii=False, indent=2)
        except Exception as e:
            logger.warning(f"No se pudo guardar favoritos de TV: {e}")

    def get_favorites(self) -> List[str]:
        return self._favorites

    def toggle_favorite(self, channel_key: str) -> Dict[str, Any]:
        cid = channel_key.lower()
        if cid in self._favorites:
            self._favorites.remove(cid)
            is_fav = False
        else:
            self._favorites.append(cid)
            is_fav = True
        self._save_favorites(self._favorites)
        return {"ok": True, "channel_key": cid, "is_favorite": is_fav, "favorites": self._favorites}

    def _start_dlna_proxy(self):
        if self._proxy_started:
            return
        try:
            socketserver.ThreadingTCPServer.allow_reuse_address = True
            self._server = socketserver.ThreadingTCPServer(('0.0.0.0', self._proxy_port), _UniversalStreamProxyHandler)
            t = threading.Thread(target=self._server.serve_forever, daemon=True)
            t.start()
            self._proxy_started = True
            logger.info(f"📺 [Habana TV Stream Proxy] Activo en puerto {self._proxy_port}")
        except Exception as e:
            logger.warning(f"No se pudo iniciar Stream Proxy en {self._proxy_port}: {e}")

    def _get_local_ip(self) -> str:
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(('192.168.1.1', 80))
            ip = s.getsockname()[0]
            s.close()
            return ip
        except Exception:
            return "192.168.1.139"

    def get_devices(self) -> Dict[str, Any]:
        return TV_DEVICES

    def get_channels(self) -> Dict[str, Any]:
        fav_set = set(self._favorites)
        out = {}
        for k, v in CHANNELS.items():
            item = dict(v)
            item["is_favorite"] = (k in fav_set)
            out[k] = item
        return out

    def wake_on_lan(self, mac_str: str):
        try:
            clean_mac = mac_str.replace(":", "").replace("-", "")
            mac_bytes = bytes.fromhex(clean_mac)
            packet = b'\xff' * 6 + mac_bytes * 16
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
            s.sendto(packet, ('192.168.1.255', 9))
            s.close()
            return True
        except Exception as e:
            logger.error(f"Error en WoL: {e}")
            return False

    def power_control(self, target_tv: str, action: str) -> Dict[str, Any]:
        tv = TV_DEVICES.get(target_tv.lower())
        if not tv:
            return {"ok": False, "error": f"TV '{target_tv}' no encontrada"}

        if action.lower() == "on":
            wol_ok = self.wake_on_lan(tv.get("mac", ""))
            return {"ok": True, "tv": tv["name"], "action": "power_on_sent", "wol": wol_ok}
        elif action.lower() == "off":
            if tv["type"] == "samsung_tizen":
                try:
                    control_url = f"http://{tv['ip']}:9197/upnp/control/AVTransport1"
                    stop_body = '''<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
  <s:Body><u:Stop xmlns:u="urn:schemas-upnp-org:service:AVTransport:1"><InstanceID>0</InstanceID></u:Stop></s:Body>
</s:Envelope>'''
                    urllib.request.urlopen(urllib.request.Request(control_url, data=stop_body.encode('utf-8'), headers={
                        'Content-Type': 'text/xml; charset="utf-8"',
                        'SOAPAction': '"urn:schemas-upnp-org:service:AVTransport:1#Stop"'
                    }), timeout=2)
                except Exception:
                    pass
            elif tv["type"] == "chromecast":
                try:
                    import pychromecast
                    chromecasts, browser = pychromecast.get_chromecasts(timeout=3)
                    found = [c for c in chromecasts if str(c.cast_info.host) == tv["ip"] or c.name == tv.get("cast_name")]
                    if found:
                        found[0].wait()
                        found[0].quit_app()
                    pychromecast.stop_discovery(browser)
                except Exception:
                    pass
            return {"ok": True, "tv": tv["name"], "action": "power_off_sent"}

        return {"ok": False, "error": "Acción no válida (usar 'on' o 'off')"}

    def volume_control(self, target_tv: str, level: Optional[float] = None, step: Optional[str] = None) -> Dict[str, Any]:
        tv = TV_DEVICES.get(target_tv.lower())
        if not tv:
            return {"ok": False, "error": f"TV '{target_tv}' no encontrada"}

        if tv["type"] == "chromecast":
            try:
                import pychromecast
                chromecasts, browser = pychromecast.get_chromecasts(timeout=3)
                found = [c for c in chromecasts if str(c.cast_info.host) == tv["ip"] or c.name == tv.get("cast_name")]
                if found:
                    c = found[0]
                    c.wait()
                    if level is not None:
                        c.set_volume(max(0.0, min(1.0, level)))
                    elif step == "up":
                        c.volume_up()
                    elif step == "down":
                        c.volume_down()
                    elif step == "mute":
                        c.set_volume_muted(not c.status.volume_muted)
                pychromecast.stop_discovery(browser)
                return {"ok": True, "tv": tv["name"], "volume_action": step or level}
            except Exception as e:
                return {"ok": False, "error": str(e)}
        elif tv["type"] == "samsung_tizen":
            try:
                url = f"http://{tv['ip']}:9197/upnp/control/RenderingControl1"
                get_b = '''<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
  <s:Body><u:GetVolume xmlns:u="urn:schemas-upnp-org:service:RenderingControl:1"><InstanceID>0</InstanceID><Channel>Master</Channel></u:GetVolume></s:Body>
</s:Envelope>'''
                req = urllib.request.Request(url, data=get_b.encode('utf-8'), headers={
                    'Content-Type': 'text/xml; charset="utf-8"',
                    'SOAPAction': '"urn:schemas-upnp-org:service:RenderingControl:1#GetVolume"'
                })
                with urllib.request.urlopen(req, timeout=2) as r:
                    m = re.search(r'<CurrentVolume>(\d+)</CurrentVolume>', r.read().decode('utf-8'))
                    cur_vol = int(m.group(1)) if m else 15

                if step == "up":
                    new_vol = min(100, cur_vol + 3)
                elif step == "down":
                    new_vol = max(0, cur_vol - 3)
                elif step == "mute":
                    new_vol = 0
                elif level is not None:
                    new_vol = int(level * 100)
                else:
                    new_vol = cur_vol

                set_b = f'''<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
  <s:Body><u:SetVolume xmlns:u="urn:schemas-upnp-org:service:RenderingControl:1"><InstanceID>0</InstanceID><Channel>Master</Channel><DesiredVolume>{new_vol}</DesiredVolume></u:SetVolume></s:Body>
</s:Envelope>'''
                urllib.request.urlopen(urllib.request.Request(url, data=set_b.encode('utf-8'), headers={
                    'Content-Type': 'text/xml; charset="utf-8"',
                    'SOAPAction': '"urn:schemas-upnp-org:service:RenderingControl:1#SetVolume"'
                }), timeout=2)
                return {"ok": True, "tv": tv["name"], "volume": new_vol}
            except Exception as e:
                return {"ok": False, "error": str(e)}

        return {"ok": True, "tv": tv["name"]}

    def play_channel(self, target_tv: str, channel_key: str) -> Dict[str, Any]:
        ch = CHANNELS.get(channel_key.lower())
        if not ch:
            return {"ok": False, "error": f"Canal '{channel_key}' no encontrado"}

        tv = TV_DEVICES.get(target_tv.lower())
        if not tv:
            return {"ok": False, "error": f"Dispositivo TV '{target_tv}' no encontrado"}

        self.mark_active_tv(target_tv)
        self._current_tv_channel[target_tv.lower()] = channel_key.lower()

        if tv["type"] == "chromecast":
            return self._play_chromecast(tv, ch)
        elif tv["type"] == "samsung_tizen":
            return self._play_samsung(tv, ch)

        return {"ok": False, "error": "Tipo de TV desconocido"}

    def _play_chromecast(self, tv: Dict[str, Any], ch: Dict[str, Any]) -> Dict[str, Any]:
        try:
            self._start_dlna_proxy()
            import pychromecast
            chromecasts, browser = pychromecast.get_chromecasts(timeout=4)
            found = [c for c in chromecasts if str(c.cast_info.host) == tv["ip"] or c.name == tv.get("cast_name")]

            if not found:
                pychromecast.stop_discovery(browser)
                return {"ok": False, "error": f"TV {tv['name']} ({tv['ip']}) no respondió en red"}

            cast = found[0]
            cast.wait()

            # Si el canal requiere cabeceras Origin/Referer (Mediaset, Atresmedia) o para evitar
            # bloqueos CORS en Xiaomi Android TV tras reinicio en frío, servimos a través del proxy local /hls/
            local_ip = self._get_local_ip()
            if ch.get("resolver") in ("mediaset", "atresmedia"):
                stream_url = f"http://{local_ip}:{self._proxy_port}/hls/{ch['id']}.m3u8?t={int(time.time())}"
            else:
                master_url = _resolve_dynamic_master_url(ch)
                try:
                    stream_url = _resolve_sub_playlist(master_url)
                except Exception:
                    stream_url = master_url

            mc = cast.media_controller
            mc.play_media(
                stream_url,
                content_type="application/x-mpegURL",
                stream_type="LIVE",
                title=ch["name"],
                thumb=ch.get("logo")
            )
            mc.block_until_active(timeout=8)

            # Verificar transición a BUFFERING/PLAYING; si tras arranque en frío da IDLE, reintentar con proxy local
            for attempt in range(7):
                time.sleep(1.0)
                st = mc.status.player_state
                if st in ("BUFFERING", "PLAYING"):
                    break
                if st == "IDLE" and attempt >= 2:
                    fallback_url = f"http://{local_ip}:{self._proxy_port}/hls/{ch['id']}.m3u8?t={int(time.time())}"
                    mc.play_media(
                        fallback_url,
                        content_type="application/x-mpegURL",
                        stream_type="LIVE",
                        title=ch["name"],
                        thumb=ch.get("logo")
                    )
                    time.sleep(2.0)
                    break

            pychromecast.stop_discovery(browser)
            return {"ok": True, "tv": tv["name"], "channel": ch["name"], "status": "playing"}
        except Exception as e:
            return {"ok": False, "error": str(e)}

    def _play_samsung(self, tv: Dict[str, Any], ch: Dict[str, Any]) -> Dict[str, Any]:
        try:
            self._start_dlna_proxy()
            local_ip = self._get_local_ip()
            proxy_url = f"http://{local_ip}:{self._proxy_port}/live/{ch['id']}.ts?t={int(time.time())}"
            control_url = f"http://{tv['ip']}:9197/upnp/control/AVTransport1"

            # 1. Stop previo para limpiar sesión anterior
            stop_body = '''<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
  <s:Body><u:Stop xmlns:u="urn:schemas-upnp-org:service:AVTransport:1"><InstanceID>0</InstanceID></u:Stop></s:Body>
</s:Envelope>'''
            try:
                urllib.request.urlopen(urllib.request.Request(control_url, data=stop_body.encode('utf-8'), headers={
                    'Content-Type': 'text/xml; charset="utf-8"',
                    'SOAPAction': '"urn:schemas-upnp-org:service:AVTransport:1#Stop"'
                }), timeout=2)
            except Exception:
                pass

            # 2. Configurar URI con perfil DLNA MPEG_TS_HD_NA_ISO
            didl = html.escape(f'''<DIDL-Lite xmlns="urn:schemas-upnp-org:metadata-1-0/DIDL-Lite/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:upnp="urn:schemas-upnp-org:metadata-1-0/upnp/">
  <item id="1" parentID="0" restricted="1">
    <dc:title>{ch["name"]}</dc:title>
    <upnp:class>object.item.videoItem.videoBroadcast</upnp:class>
    <res protocolInfo="http-get:*:video/mpeg:DLNA.ORG_PN=MPEG_TS_HD_NA_ISO;DLNA.ORG_OP=00;DLNA.ORG_CI=0;DLNA.ORG_FLAGS=01700000000000000000000000000000">{proxy_url}</res>
  </item>
</DIDL-Lite>''')

            set_uri_body = f'''<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
  <s:Body>
    <u:SetAVTransportURI xmlns:u="urn:schemas-upnp-org:service:AVTransport:1">
      <InstanceID>0</InstanceID>
      <CurrentURI>{proxy_url}</CurrentURI>
      <CurrentURIMetaData>{didl}</CurrentURIMetaData>
    </u:SetAVTransportURI>
  </s:Body>
</s:Envelope>'''

            urllib.request.urlopen(urllib.request.Request(control_url, data=set_uri_body.encode('utf-8'), headers={
                'Content-Type': 'text/xml; charset="utf-8"',
                'SOAPAction': '"urn:schemas-upnp-org:service:AVTransport:1#SetAVTransportURI"'
            }), timeout=4)

            # 3. Play
            play_body = '''<?xml version="1.0" encoding="utf-8"?>
<s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/">
  <s:Body><u:Play xmlns:u="urn:schemas-upnp-org:service:AVTransport:1"><InstanceID>0</InstanceID><Speed>1</Speed></u:Play></s:Body>
</s:Envelope>'''
            urllib.request.urlopen(urllib.request.Request(control_url, data=play_body.encode('utf-8'), headers={
                'Content-Type': 'text/xml; charset="utf-8"',
                'SOAPAction': '"urn:schemas-upnp-org:service:AVTransport:1#Play"'
            }), timeout=4)

            return {"ok": True, "tv": tv["name"], "channel": ch["name"], "method": "dlna_mpegts_proxy"}
        except Exception as e:
            return {"ok": False, "error": f"Samsung DLNA: {e}"}

    # =========================================================================
    # MOTOR DE LENGUAJE NATURAL POR VOZ PARA LAS 3 TELEVISIONES (MICRÓFONOS)
    # =========================================================================
    @staticmethod
    def _norm(text: str) -> str:
        s = (text or "").lower().strip()
        s = re.sub(r'[áàäâ]', 'a', s)
        s = re.sub(r'[éèëê]', 'e', s)
        s = re.sub(r'[íìïî]', 'i', s)
        s = re.sub(r'[óòöô]', 'o', s)
        s = re.sub(r'[úùüû]', 'u', s)
        s = re.sub(r'[ñ]', 'n', s)
        return s

    def resolve_tv_target(self, text: str, default_tv: str = "salon") -> str:
        """Determina a qué televisión o estancia se refiere una orden de voz."""
        t = self._norm(text)
        if any(w in t for w in ("todas las tele", "todos los televisores", "todas las televisiones", "toda la casa", "en todas", "las tres tele")):
            return "todas"
        if any(w in t for w in ("cocina",)):
            return "cocina"
        if any(w in t for w in ("habitacion", "dormitorio", "cuarto", "cama", "principal", "mi tv")):
            return "habitacion"
        if any(w in t for w in ("salon", "comedor", "samsung", "sala")):
            return "salon"
        return default_tv

    def resolve_channel_by_voice(self, query: str) -> Optional[str]:
        """
        Resuelve el nombre hablado de un canal de TV a su clave exacta en CHANNELS.
        Soporta nombres formales, coloquiales ('la primera', 'la dos', 'la tres', 'la cuatro', 'la cinco', 'la sexta'),
        alias numéricos ('canal 1', 'canal 5'), temáticas ('noticias', 'deportes', 'dibujos', 'cine', 'futbol')
        y variaciones de entonación / transcripción de Whisper.
        """
        raw = self._norm(query)
        if not raw:
            return None

        # Diccionario ampliado de alias fonéticos directos (alta prioridad)
        VOICE_ALIASES = {
            "la1": [
                "la 1", "la uno", "la primera", "primera", "primera cadena", "tve 1", "tve1",
                "television espanola", "tve", "uno", "1", "canal 1", "cadena 1"
            ],
            "la2": [
                "la 2", "la dos", "la segunda", "segunda", "segunda cadena", "tve 2", "tve2",
                "la 2 de tve", "dos", "2", "canal 2", "cadena 2"
            ],
            "antena3": [
                "antena 3", "antena tres", "la 3", "la tres", "tercera", "la tercera",
                "a3", "atresmedia", "tres", "3", "canal 3", "cadena 3"
            ],
            "cuatro": [
                "cuatro", "la 4", "la cuatro", "cuarta", "la cuarta", "canal cuatro",
                "canal 4", "4", "cadena 4"
            ],
            "telecinco": [
                "telecinco", "tele cinco", "tele 5", "la 5", "la cinco", "quinta", "la quinta",
                "t5", "cinco", "5", "canal 5", "cadena 5"
            ],
            "lasexta": [
                "la sexta", "lasexta", "sexta", "la 6", "la seis", "seis", "6",
                "canal 6", "cadena 6"
            ],
            "la7cyl": [
                "la 7", "la siete", "siete", "7", "séptima", "septima", "castilla y leon",
                "cyltv", "la 7 castilla y leon", "canal 7", "cadena 7"
            ],
            "7tv_andalucia": [
                "7tv", "7 tv", "siete tv", "7tv andalucia", "siete andalucia", "la 7 andalucia"
            ],
            "7tv_valencia": [
                "7 televalencia", "la 7 valencia", "televalencia", "siete valencia"
            ],
            "tele7_bizkaia": [
                "tele 7", "telesiete", "tele siete"
            ],
            "tpa7": [
                "tpa", "tpa 7", "asturias", "television asturias", "rtpa"
            ],
            "trece": [
                "trece", "13 tv", "13tv", "la 13", "la trece", "trece tv", "trecetv", "canal trece", "13", "canal 13"
            ],
            "fdf": [
                "fdf", "factoria de ficcion", "factoria ficcion", "f d f", "la fdf", "el fdf"
            ],
            "energy": [
                "energy", "energi", "energia", "canal energy"
            ],
            "neox": [
                "neox", "neo"
            ],
            "nova": [
                "nova", "noba"
            ],
            "mega": [
                "mega"
            ],
            "atreseries": [
                "atreseries", "a tres series", "atres series", "a3series", "series de atresmedia"
            ],
            "divinity": [
                "divinity", "diviniti"
            ],
            "bemad": [
                "be mad", "bemad", "bimad", "bi mad"
            ],
            "boing": [
                "boing", "boin"
            ],
            "clan": [
                "clan", "tlan", "klan", "clam", "clang", "cland", "c clan", "canal clan",
                "el clan", "clann", "clan tve", "clan tv", "dibujos clan", "dibujos",
                "los dibujos", "dibujos animados", "infantil", "los ninos", "de los ninos", "para ninos"
            ],
            "24h": [
                "24 horas", "24h", "veinticuatro horas", "canal 24 horas", "noticias tve", "noticias", "las noticias", "el telediario", "los telediarios", "telediario", "informativo", "informativos", "canal de noticias"
            ],
            "teledeporte": [
                "teledeporte", "tdp", "tele deporte", "deportes", "los deportes", "el deporte", "canal de deportes", "futbol", "el futbol", "partido"
            ],
            "realmadrid": [
                "real madrid", "real madrid tv", "madrid tv", "television del real madrid", "canal del madrid"
            ],
            "telemadrid": [
                "telemadrid", "tele madrid", "madrid"
            ],
            "tvg": [
                "tvg", "television de galicia", "galicia", "tv galicia", "la gallega", "gallega"
            ],
            "tvg2": [
                "tvg 2", "tvg2", "galicia 2", "la gallega 2"
            ],
            "canalsur": [
                "canal sur", "canalsur", "andalucia tv", "television de andalucia"
            ],
            "etb1": [
                "etb 1", "etb1", "etb uno"
            ],
            "etb2": [
                "etb 2", "etb2", "etb dos", "etb"
            ],
            "tv3": [
                "tv3", "tv 3", "3cat", "television cataluna", "la catalana"
            ],
            "apunt": [
                "a punt", "apunt", "punt", "valenciana", "television valenciana"
            ],
            "cmm": [
                "cmm", "castilla la mancha", "television de castilla la mancha"
            ],
            "extremadura": [
                "extremadura", "canal extremadura"
            ],
            "somoscine": [
                "somos cine", "cine tve", "cine", "peliculas", "pelicula", "una pelicula"
            ],
            "mitele_comedia": [
                "comedia", "infinity comedia", "la que se avecina", "lqsa"
            ],
            "mitele_series": [
                "top series", "infinity series"
            ],
            "cuentame": [
                "cuentame", "cuentame como paso"
            ],
            "lapromesa": [
                "la promesa", "promesa"
            ],
            "doraemon": [
                "doraemon"
            ],
            "xabarin": [
                "xabarin", "xabarin club"
            ],
            "euronews": [
                "euronews", "euro news"
            ],
            "elpais": [
                "el pais", "elpais"
            ]
        }

        # PASO 1: Búsqueda directa sobre el texto normalizado completo (antes de limpiar)
        all_pairs = []
        for cid, aliases in VOICE_ALIASES.items():
            for a in aliases:
                all_pairs.append((len(a), cid, a))
        all_pairs.sort(reverse=True, key=lambda x: x[0])

        for _, cid, a in all_pairs:
            if re.search(rf'\b{re.escape(a)}\b', raw):
                return cid

        # PASO 2: Limpieza de prefijos de petición y sufijos de estancia para búsqueda refinada
        clean = re.sub(
            r'\b(puedes|podrias|quiero|vamos|ver|pon|poner|ponme|ponlo|ponla|sintoniza|sintonizar|sintonizame|'
            r'cambia|cambiar|cambiame|coloca|pasa|pasame|en|el|la|los|las|un|una|de|del|al|por|favor|'
            r'tele|television|televisor|tv|canal|cadena|directo|hd|'
            r'salon|comedor|habitacion|dormitorio|principal|cocina|cuarto|cama|samsung|xiaomi|todas|todos)\b',
            ' ',
            raw
        )
        clean = re.sub(r'\s+', ' ', clean).strip()

        if clean:
            for cid, aliases in VOICE_ALIASES.items():
                if clean == cid or clean in aliases:
                    return cid

            for _, cid, a in all_pairs:
                if re.search(rf'\b{re.escape(a)}\b', clean):
                    return cid

        # PASO 3: Catálogo completo de 450 canales
        target_check = clean if clean else raw
        if target_check in CHANNELS:
            return target_check

        # Priorizar canales con featured=True
        featured_matches = []
        regular_matches = []
        for cid, ch in CHANNELS.items():
            ch_norm = self._norm(ch.get("name", ""))
            ch_clean = re.sub(r'\([^)]*\)', '', ch_norm).strip()
            is_match = (
                target_check == ch_clean or target_check == ch_norm or
                (len(target_check) >= 4 and (target_check in ch_clean or ch_clean in target_check))
            )
            if is_match:
                if ch.get("featured"):
                    featured_matches.append(cid)
                else:
                    regular_matches.append(cid)

        if featured_matches:
            return featured_matches[0]
        if regular_matches:
            return regular_matches[0]

        return None

    def try_handle_voice_command(self, user_text: str) -> Optional[str]:
        """
        Analiza si una frase hablada al micrófono de la bola o esfera Xiaozhi es una orden de TV
        (sintonizar canal, encender/apagar TV, zapping siguiente/anterior canal, o subir/bajar volumen de la TV)
        y la ejecuta al instante en segundo plano.
        Devuelve el texto de respuesta hablado si era una orden de TV, o None si no lo era.
        """
        raw = (user_text or "").strip()
        if not raw:
            return None

        t = self._norm(raw)

        # Ignorar si habla explícitamente de tiras LED, luces, persianas, radio, etc.
        if any(w in t for w in ("tira led", "tiras led", "led de la tele", "led tv", "luz de la tele", "persiana", "persianas", "radio", "emisora", "los 40", "cadena ser", "alarma", "recordatorio", "whatsapp", "boton", "widget", "bunker", "informe")):
            return None

        has_tv_word = bool(re.search(r'\b(tele|television|televisor|tv|teles|televisores|pantalla)\b', t))
        target_tv = self.resolve_tv_target(t, default_tv=self.last_target_tv or "salon")

        def _get_tv_targets(tv_key: str) -> List[str]:
            if tv_key == "todas":
                return ["salon", "habitacion", "cocina"]
            return [tv_key]

        def _get_tv_label(tv_key: str) -> str:
            if tv_key == "todas":
                return "todas las televisiones"
            dev = TV_DEVICES.get(tv_key)
            return dev["name"] if dev else "la televisión"

        # 1. Zapping de canales por voz ("siguiente canal", "canal siguiente", "cambia de canal", "otro canal", "canal anterior")
        is_next_cmd = bool(re.search(r'\b(siguiente\s+canal|canal\s+siguiente|cambia\s+de\s+canal|cambiar\s+de\s+canal|pasa\s+de\s+canal|pasa\s+el\s+canal|otro\s+canal|siguiente)\b', t))
        is_prev_cmd = bool(re.search(r'\b(canal\s+anterior|anterior\s+canal|vuelve\s+al\s+canal|canal\s+previo|canal\s+atras|anterior)\b', t))

        if is_next_cmd or is_prev_cmd:
            curr_favs = self._favorites if (self._favorites and len(self._favorites) > 0) else DEFAULT_FAVORITES
            curr_key = self._current_tv_channel.get(target_tv, "la1")
            try:
                curr_idx = curr_favs.index(curr_key) if curr_key in curr_favs else 0
                step_idx = (curr_idx + 1) if is_next_cmd else (curr_idx - 1)
                new_key = curr_favs[step_idx % len(curr_favs)]
            except Exception:
                new_key = curr_favs[0]

            self.mark_active_tv(target_tv)
            self._current_tv_channel[target_tv] = new_key
            for tk in _get_tv_targets(target_tv):
                threading.Thread(target=self._wake_and_play_bg, args=(tk, new_key), daemon=True).start()
            new_name = CHANNELS.get(new_key, {}).get("name", new_key)
            return f"Hecho. Sintonizando {new_name} en {_get_tv_label(target_tv)}."

        # 2. Control de Volumen de la TV ("sube el volumen", "baja la tele", "dale más voz", "silencia la tele")
        has_volume_words = any(w in t for w in ("volumen", "voz", "sonido", "audio"))
        has_step_words = any(w in t for w in ("sube", "subir", "mas", "dale mas", "alto", "baja", "bajar", "menos", "dale menos", "silencia", "silenciar", "mute", "mutea", "calla", "quita el sonido", "sin sonido"))
        if (has_tv_word and has_step_words) or (has_volume_words and has_step_words):
            step = "up"
            action_desc = "Subiendo el volumen"
            if any(w in t for w in ("baja", "bajar", "menos", "dale menos", "minimo", "bajito")):
                step = "down"
                action_desc = "Bajando el volumen"
            elif any(w in t for w in ("silencia", "silenciar", "mute", "mutea", "calla", "quita el sonido", "sin sonido", "silencio")):
                step = "mute"
                action_desc = "Silenciando"

            self.mark_active_tv(target_tv)
            for tk in _get_tv_targets(target_tv):
                threading.Thread(target=self.volume_control, args=(tk, None, step), daemon=True).start()
            return f"Hecho. {action_desc} en {_get_tv_label(target_tv)}."

        # 3. Apagar la TV ("apaga la tele", "apagar el televisor", "apaga todas las teles", "quita la tele")
        if has_tv_word and re.search(r'\b(apaga|apagar|para|parar|deten|detener|quita|quitar|cierra|desactiva)\b', t):
            self.mark_active_tv(target_tv)
            for tk in _get_tv_targets(target_tv):
                threading.Thread(target=self.power_control, args=(tk, "off"), daemon=True).start()
            return f"Hecho. Apagando {_get_tv_label(target_tv)}."

        # 4. Sintonizar un canal de TV por voz
        # "pon Telecinco", "puedes poner La 1", "vamos a ver Antena 3", "cambia a Cuatro", "sintoniza La Sexta", "pon el canal 5", "pon la primera", etc.
        verb_match = re.search(r'\b(pon|poner|ponme|ponlo|ponla|puedes\s+poner|quiero\s+ver|vamos\s+a\s+ver|me\s+pones|sintoniza|sintonizar|sintonizame|cambia|cambiar|reproduce|reproducir|ver)\b', t)
        ch_key = self.resolve_channel_by_voice(raw)

        if ch_key:
            # Comprobar que no sea simplemente "enciende la tele" sin canal
            is_pure_power = has_tv_word and re.search(r'^\s*(enciende|encender|prende|prender|activa|activar)\s+(la\s+|el\s+|las\s+|los\s+)?(tele|television|televisor|tv|teles)(\s+(del|de\s+la|de)\s+(salon|comedor|habitacion|dormitorio|principal|cocina|casa))?\s*$', t)
            if not is_pure_power:
                ch_obj = CHANNELS.get(ch_key)
                if ch_obj:
                    is_explicit_tv = has_tv_word or ("canal" in t) or ("cadena" in t) or ("sintoniza" in t) or ("ver" in t)
                    is_featured_ch = bool(ch_obj.get("featured")) or (ch_key in DEFAULT_FAVORITES)
                    has_room = any(r in t for r in ("salon", "comedor", "habitacion", "dormitorio", "principal", "cocina", "cuarto"))
                    
                    if verb_match or is_explicit_tv or is_featured_ch or has_room:
                        self.mark_active_tv(target_tv)
                        self._current_tv_channel[target_tv] = ch_key
                        targets = _get_tv_targets(target_tv)
                        for tk in targets:
                            threading.Thread(target=self._wake_and_play_bg, args=(tk, ch_key), daemon=True).start()
                        return f"Hecho. Sintonizando {ch_obj['name']} en {_get_tv_label(target_tv)}."

        # 5. Encender o "Poner la tele" genérico sin canal específico ("pon la tele", "enciende la tele del salón")
        if has_tv_word and re.search(r'\b(enciende|encender|prende|prender|activa|activar|pon|poner|ponme)\b', t):
            self.mark_active_tv(target_tv)
            default_ch = self._current_tv_channel.get(target_tv, "la1")
            for tk in _get_tv_targets(target_tv):
                threading.Thread(target=self._wake_and_play_bg, args=(tk, default_ch), daemon=True).start()
            ch_name = CHANNELS.get(default_ch, {}).get("name", "La 1 HD")
            return f"Hecho. Encendiendo {_get_tv_label(target_tv)} y sintonizando {ch_name}."

        return None

    def _wake_and_play_bg(self, tv_key: str, channel_key: str):
        try:
            tv = TV_DEVICES.get(tv_key)
            if tv and tv.get("mac"):
                self.wake_on_lan(tv["mac"])
            self.play_channel(tv_key, channel_key)
        except Exception as e:
            logger.error(f"Error en _wake_and_play_bg ({tv_key}, {channel_key}): {e}")


tv_manager = HabanaTVManager()
