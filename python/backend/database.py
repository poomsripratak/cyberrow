"""SQLite database for session persistence."""

import sqlite3
import json
import os
from typing import List, Optional
from dataclasses import dataclass, asdict
from datetime import datetime


@dataclass
class SessionMetrics:
    avg_stroke_rate: float = 0
    avg_power: float = 0
    avg_split: float = 0
    peak_power: float = 0
    avg_stroke_length: float = 0
    avg_drive_recovery: float = 0
    avg_smoothness: float = 0
    avg_symmetry: float = 0
    avg_trunk_stability: float = 0
    avg_seat_stability: float = 0
    avg_peak_force: float = 0
    # Advanced metrics
    avg_consistency_index: float = 85
    avg_time_to_peak_force: float = 0.35
    power_decline: float = 0
    avg_postural_deviation: float = 5
    avg_range_of_motion: float = 120
    avg_load_distribution: float = 90
    avg_stroke_efficiency: float = 75
    force_curve_type: str = "Balanced"
    symmetry_drift: float = 0
    peak_handle_force: float = 0
    min_time_to_peak_force: float = 0.35
    # Seat sensor metrics
    avg_seat_total_load: float = 0
    avg_seat_left_right_balance: float = 50
    avg_seat_front_back_balance: float = 50
    avg_seat_center_x: float = 0
    avg_seat_center_y: float = 0
    # Foot force metrics
    avg_foot_force_left: float = 0
    avg_foot_force_right: float = 0
    avg_foot_force_total: float = 0
    avg_foot_force_symmetry: float = 100
    peak_foot_force: float = 0
    # Force curve visualization
    avg_force_curve_samples: list = None

    def __post_init__(self):
        if self.avg_force_curve_samples is None:
            self.avg_force_curve_samples = []


@dataclass
class Session:
    id: int
    date: str
    duration: float
    distance: float
    calories: float
    strokes: int
    data_points: List[dict]
    seat_points: List[dict]
    metrics: SessionMetrics

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "date": self.date,
            "duration": self.duration,
            "distance": self.distance,
            "calories": self.calories,
            "strokes": self.strokes,
            "dataPoints": self.data_points,
            "seatPoints": self.seat_points,
            "metrics": {
                "avgStrokeRate": self.metrics.avg_stroke_rate,
                "avgPower": self.metrics.avg_power,
                "avgSplit": self.metrics.avg_split,
                "peakPower": self.metrics.peak_power,
                "avgStrokeLength": self.metrics.avg_stroke_length,
                "avgDriveRecovery": self.metrics.avg_drive_recovery,
                "avgSmoothness": self.metrics.avg_smoothness,
                "avgSymmetry": self.metrics.avg_symmetry,
                "avgTrunkStability": self.metrics.avg_trunk_stability,
                "avgSeatStability": self.metrics.avg_seat_stability,
                "avgPeakForce": self.metrics.avg_peak_force,
                # Advanced metrics
                "avgConsistencyIndex": self.metrics.avg_consistency_index,
                "avgTimeToPeakForce": self.metrics.avg_time_to_peak_force,
                "powerDecline": self.metrics.power_decline,
                "avgPosturalDeviation": self.metrics.avg_postural_deviation,
                "avgRangeOfMotion": self.metrics.avg_range_of_motion,
                "avgLoadDistribution": self.metrics.avg_load_distribution,
                "avgStrokeEfficiency": self.metrics.avg_stroke_efficiency,
                "forceCurveType": self.metrics.force_curve_type,
                "symmetryDrift": self.metrics.symmetry_drift,
                "peakHandleForce": self.metrics.peak_handle_force,
                "minTimeToPeakForce": self.metrics.min_time_to_peak_force,
                # Seat sensor metrics
                "avgSeatTotalLoad": self.metrics.avg_seat_total_load,
                "avgSeatLeftRightBalance": self.metrics.avg_seat_left_right_balance,
                "avgSeatFrontBackBalance": self.metrics.avg_seat_front_back_balance,
                "avgSeatCenterX": self.metrics.avg_seat_center_x,
                "avgSeatCenterY": self.metrics.avg_seat_center_y,
                # Foot force metrics
                "avgFootForceLeft": self.metrics.avg_foot_force_left,
                "avgFootForceRight": self.metrics.avg_foot_force_right,
                "avgFootForceTotal": self.metrics.avg_foot_force_total,
                "avgFootForceSymmetry": self.metrics.avg_foot_force_symmetry,
                "peakFootForce": self.metrics.peak_foot_force,
                "forceCurveSamples": self.metrics.avg_force_curve_samples,
            },
        }


class Database:
    def __init__(self, db_path: str = "cyberrow.db"):
        self.db_path = db_path
        self._init_db()

    def _init_db(self):
        """Initialize the database schema."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                id INTEGER PRIMARY KEY,
                date TEXT NOT NULL,
                duration REAL NOT NULL,
                distance REAL NOT NULL,
                calories INTEGER NOT NULL,
                strokes INTEGER NOT NULL,
                data_points TEXT NOT NULL,
                metrics TEXT NOT NULL,
                seat_points TEXT NOT NULL DEFAULT '[]'
            )
        """)

        # Migration: add seat_points column to existing DBs that don't have it
        try:
            cursor.execute("ALTER TABLE sessions ADD COLUMN seat_points TEXT NOT NULL DEFAULT '[]'")
            conn.commit()
        except Exception:
            pass  # Column already exists

        conn.commit()
        conn.close()

    def save_session(self, session: Session) -> int:
        """Save a session to the database. Returns session id, or -1 on failure."""
        conn = None
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            cursor.execute(
                """
                INSERT INTO sessions (id, date, duration, distance, calories, strokes, data_points, metrics, seat_points)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
                (
                    session.id,
                    session.date,
                    session.duration,
                    session.distance,
                    session.calories,
                    session.strokes,
                    json.dumps(session.data_points),
                    json.dumps(asdict(session.metrics)),
                    json.dumps(session.seat_points),
                ),
            )

            conn.commit()
            return cursor.lastrowid or session.id
        except Exception as e:
            logging.getLogger(__name__).error(f"Failed to save session {session.id}: {e}")
            return -1
        finally:
            if conn:
                conn.close()

    def get_sessions(self, limit: int = 50) -> List[Session]:
        """Get recent sessions from the database."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute(
            """
            SELECT id, date, duration, distance, calories, strokes, data_points, metrics, seat_points
            FROM sessions
            ORDER BY date DESC
            LIMIT ?
        """,
            (limit,),
        )

        rows = cursor.fetchall()
        conn.close()

        sessions = []
        for row in rows:
            metrics_data = json.loads(row[7])
            metrics = SessionMetrics(
                avg_stroke_rate=metrics_data.get("avg_stroke_rate", 0),
                avg_power=metrics_data.get("avg_power", 0),
                avg_split=metrics_data.get("avg_split", 0),
                peak_power=metrics_data.get("peak_power", 0),
                avg_stroke_length=metrics_data.get("avg_stroke_length", 0),
                avg_drive_recovery=metrics_data.get("avg_drive_recovery", 0),
                avg_smoothness=metrics_data.get("avg_smoothness", 0),
                avg_symmetry=metrics_data.get("avg_symmetry", 0),
                avg_trunk_stability=metrics_data.get("avg_trunk_stability", 0),
                avg_seat_stability=metrics_data.get("avg_seat_stability", 0),
                avg_peak_force=metrics_data.get("avg_peak_force", 0),
                # Advanced metrics with defaults for backwards compatibility
                avg_consistency_index=metrics_data.get("avg_consistency_index", 85),
                avg_time_to_peak_force=metrics_data.get("avg_time_to_peak_force", 0.35),
                power_decline=metrics_data.get("power_decline", 0),
                avg_postural_deviation=metrics_data.get("avg_postural_deviation", 5),
                avg_range_of_motion=metrics_data.get("avg_range_of_motion", 120),
                avg_load_distribution=metrics_data.get("avg_load_distribution", 90),
                avg_stroke_efficiency=metrics_data.get("avg_stroke_efficiency", 75),
                force_curve_type=metrics_data.get("force_curve_type", "Balanced"),
                symmetry_drift=metrics_data.get("symmetry_drift", 0),
                peak_handle_force=metrics_data.get("peak_handle_force", 0),
                min_time_to_peak_force=metrics_data.get("min_time_to_peak_force", 0.35),
                # Seat sensor metrics
                avg_seat_total_load=metrics_data.get("avg_seat_total_load", 0),
                avg_seat_left_right_balance=metrics_data.get("avg_seat_left_right_balance", 50),
                avg_seat_front_back_balance=metrics_data.get("avg_seat_front_back_balance", 50),
                avg_seat_center_x=metrics_data.get("avg_seat_center_x", 0),
                avg_seat_center_y=metrics_data.get("avg_seat_center_y", 0),
                # Foot force metrics
                avg_foot_force_left=metrics_data.get("avg_foot_force_left", 0),
                avg_foot_force_right=metrics_data.get("avg_foot_force_right", 0),
                avg_foot_force_total=metrics_data.get("avg_foot_force_total", 0),
                avg_foot_force_symmetry=metrics_data.get("avg_foot_force_symmetry", 100),
                peak_foot_force=metrics_data.get("peak_foot_force", 0),
                avg_force_curve_samples=metrics_data.get("avg_force_curve_samples", []),
            )

            sessions.append(
                Session(
                    id=row[0],
                    date=row[1],
                    duration=row[2],
                    distance=row[3],
                    calories=row[4],
                    strokes=row[5],
                    data_points=json.loads(row[6]),
                    seat_points=json.loads(row[8]) if row[8] else [],
                    metrics=metrics,
                )
            )

        return sessions

    def get_session(self, session_id: int) -> Optional[Session]:
        """Get a specific session by ID."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute(
            """
            SELECT id, date, duration, distance, calories, strokes, data_points, metrics, seat_points
            FROM sessions
            WHERE id = ?
        """,
            (session_id,),
        )

        row = cursor.fetchone()
        conn.close()

        if not row:
            return None

        metrics_data = json.loads(row[7])
        valid_fields = {f.name for f in SessionMetrics.__dataclass_fields__.values()}
        metrics = SessionMetrics(**{k: v for k, v in metrics_data.items() if k in valid_fields})

        return Session(
            id=row[0],
            date=row[1],
            duration=row[2],
            distance=row[3],
            calories=row[4],
            strokes=row[5],
            data_points=json.loads(row[6]),
            seat_points=json.loads(row[8]) if row[8] else [],
            metrics=metrics,
        )

    def delete_session(self, session_id: int) -> bool:
        """Delete a session by ID."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
        affected = cursor.rowcount

        conn.commit()
        conn.close()

        return affected > 0
