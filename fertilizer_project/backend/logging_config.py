"""
Production logging configuration for FastAPI application.
"""

import logging
import os
from logging.handlers import RotatingFileHandler

# Create logs directory if it doesn't exist
LOG_DIR = "logs"
os.makedirs(LOG_DIR, exist_ok=True)

# Log format
LOG_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
DATE_FORMAT = "%Y-%m-%d %H:%M:%S"

# Configure root logger
def setup_logging() -> logging.Logger:
    """Configure and return the application logger."""
    logger = logging.getLogger("agriadvisor")
    logger.setLevel(logging.INFO)
    
    # Prevent duplicate handlers
    if logger.handlers:
        return logger
    
    # File handler with rotation (10MB max, keep 5 backups)
    file_handler = RotatingFileHandler(
        os.path.join(LOG_DIR, "app.log"),
        maxBytes=10 * 1024 * 1024,
        backupCount=5,
        encoding="utf-8"
    )
    file_handler.setLevel(logging.INFO)
    file_handler.setFormatter(logging.Formatter(LOG_FORMAT, DATE_FORMAT))
    
    # Console handler for development
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(logging.Formatter(LOG_FORMAT, DATE_FORMAT))
    
    logger.addHandler(file_handler)
    logger.addHandler(console_handler)
    
    return logger


# Initialize logger
logger = setup_logging()


def log_request(method: str, path: str, status_code: int, duration_ms: float):
    """Log API request details."""
    logger.info(f"API Request: {method} {path} - Status: {status_code} - Duration: {duration_ms:.2f}ms")


def log_error(error: Exception, context: str = ""):
    """Log error with context."""
    logger.error(f"Error in {context}: {type(error).__name__} - {str(error)}", exc_info=True)


def log_ml_prediction(model_name: str, input_data: dict, prediction: any, duration_ms: float):
    """Log ML prediction requests."""
    logger.info(f"ML Prediction: model={model_name} - input={input_data} - result={prediction} - Duration: {duration_ms:.2f}ms")
