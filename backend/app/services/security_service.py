import sqlite3
import logging
import json
import numpy as np
from typing import Optional, Dict, List, Any
try:
    import face_recognition
except ImportError:
    face_recognition = None

logger = logging.getLogger("SecurityService")

class SecurityService:
    def __init__(self, db_path="tracker.db"):
        self.db_path = db_path
        self.known_face_encodings = []
        self.known_face_names = []
        self.load_known_faces()

    def load_known_faces(self):
        """Load known faces from the database."""
        if not face_recognition:
            logger.warning("face_recognition not installed, skipping face loading.")
            return

        self.known_face_encodings = []
        self.known_face_names = []
        
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute("SELECT name, face_encoding FROM authorized_users WHERE face_encoding IS NOT NULL")
                rows = cursor.fetchall()
                
                for row in rows:
                    if row["face_encoding"]:
                        # Convert bytes back to numpy array
                        encoding = np.frombuffer(row["face_encoding"], dtype=np.float64)
                        self.known_face_encodings.append(encoding)
                        self.known_face_names.append(row["name"])
        except Exception as e:
            logger.error(f"Error loading known faces: {e}")

    def add_authorized_user(self, name: str, pin: str, image_path: Optional[str] = None) -> bool:
        """Add a new authorized user with a PIN and optional face image."""
        face_encoding_bytes = None
        if image_path and face_recognition:
            try:
                image = face_recognition.load_image_file(image_path)
                encodings = face_recognition.face_encodings(image)
                if encodings:
                    face_encoding_bytes = encodings[0].tobytes()
                else:
                    logger.warning(f"No face found in image: {image_path}")
            except Exception as e:
                logger.error(f"Error processing image {image_path}: {e}")

        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute(
                    "INSERT OR REPLACE INTO authorized_users (name, pin, face_encoding) VALUES (?, ?, ?)",
                    (name, pin, face_encoding_bytes)
                )
                conn.commit()
            
            # Reload faces
            self.load_known_faces()
            return True
        except Exception as e:
            logger.error(f"Error adding authorized user: {e}")
            return False

    def validate_pin(self, pin: str) -> Optional[str]:
        """Validate a PIN and return the user's name if valid."""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT name FROM authorized_users WHERE pin = ?", (pin,))
                row = cursor.fetchone()
                if row:
                    return row[0]
        except Exception as e:
            logger.error(f"Error validating PIN: {e}")
        return None

    def recognize_face(self, image_data: np.ndarray) -> Optional[str]:
        """Recognize a face from an image array."""
        if not face_recognition or not self.known_face_encodings:
            return None
            
        try:
            face_locations = face_recognition.face_locations(image_data)
            face_encodings = face_recognition.face_encodings(image_data, face_locations)

            for face_encoding in face_encodings:
                matches = face_recognition.compare_faces(self.known_face_encodings, face_encoding)
                name = None

                face_distances = face_recognition.face_distance(self.known_face_encodings, face_encoding)
                if len(face_distances) > 0:
                    best_match_index = np.argmin(face_distances)
                    if matches[best_match_index]:
                        name = self.known_face_names[best_match_index]
                        return name
        except Exception as e:
            logger.error(f"Error recognizing face: {e}")
            
    def get_users(self) -> List[Dict[str, Any]]:
        """Return a list of authorized users (without encodings)."""
        users = []
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute("SELECT id, name, pin, CASE WHEN face_encoding IS NOT NULL THEN 1 ELSE 0 END as has_face FROM authorized_users")
                rows = cursor.fetchall()
                for row in rows:
                    users.append({
                        "id": row["id"],
                        "name": row["name"],
                        "pin": row["pin"],
                        "has_face": bool(row["has_face"])
                    })
        except Exception as e:
            logger.error(f"Error getting users: {e}")
        return users

    def delete_user(self, user_id: int) -> bool:
        """Delete an authorized user by ID."""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()
                cursor.execute("DELETE FROM authorized_users WHERE id = ?", (user_id,))
                conn.commit()
            self.load_known_faces()
            return True
        except Exception as e:
            logger.error(f"Error deleting user: {e}")
            return False

security_service = SecurityService()
