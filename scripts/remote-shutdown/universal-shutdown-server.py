#!/usr/bin/env python3
"""
Discord Maid Bot - Universal Remote Shutdown Server
====================================================

Cross-platform remote shutdown server that integrates with Discord Maid Bot.
Receives shutdown/restart commands from the Discord bot via HTTP.

Features:
- Cross-platform (Windows, Linux, macOS)
- Discord bot integration via HTTP API
- Authentication with API key
- Status reporting
- Graceful shutdown with countdown
- Comprehensive logging

Version: 1.0.0.0-beta
Author: Discord Maid Bot Team
License: MIT
"""

import os
import sys
import json
import time
import logging
import threading
import argparse
from datetime import datetime
from flask import Flask, request, jsonify
from functools import wraps

app = Flask(__name__)

# Configuration
CONFIG = {
    'port': 5000,
    'host': '0.0.0.0',
    'api_key': 'change-this-secret-key',  # IMPORTANT: Change this!
    'device_name': os.environ.get('COMPUTERNAME', os.environ.get('HOSTNAME', 'Unknown')),
    'shutdown_delay': 5,  # Seconds before shutdown
    'log_file': 'shutdown-server.log',
}

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(CONFIG['log_file']),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


def load_config(config_file='shutdown-config.json'):
    """Load configuration from JSON file"""
    if os.path.exists(config_file):
        try:
            with open(config_file, 'r') as f:
                loaded_config = json.load(f)
                CONFIG.update(loaded_config)
                logger.info(f"Configuration loaded from {config_file}")
        except Exception as e:
            logger.error(f"Failed to load config: {e}")


def save_config(config_file='shutdown-config.json'):
    """Save configuration to JSON file"""
    try:
        with open(config_file, 'w') as f:
            json.dump(CONFIG, f, indent=2)
            logger.info(f"Configuration saved to {config_file}")
    except Exception as e:
        logger.error(f"Failed to save config: {e}")


def require_api_key(f):
    """Decorator to require API key authentication"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Check for API key in header
        api_key = request.headers.get('X-API-Key')
        
        # Check for API key in query parameter
        if not api_key:
            api_key = request.args.get('api_key')
        
        # Check for API key in JSON body
        if not api_key and request.is_json:
            api_key = request.get_json().get('api_key')
        
        if api_key != CONFIG['api_key']:
            logger.warning(f"Unauthorized access attempt from {request.remote_addr}")
            return jsonify({'error': 'Unauthorized', 'message': 'Invalid API key'}), 401
        
        return f(*args, **kwargs)
    return decorated_function


def shutdown_system():
    """Shutdown the system based on platform"""
    logger.info(f"Initiating system shutdown on {sys.platform}...")
    
    # Countdown
    for i in range(CONFIG['shutdown_delay'], 0, -1):
        logger.info(f"Shutting down in {i} seconds...")
        time.sleep(1)
    
    logger.info("Executing shutdown command...")
    
    try:
        if sys.platform == 'win32':
            # Windows
            logger.info("Executing Windows shutdown")
            os.system('shutdown /s /t 1 /c "Remote shutdown via Discord Maid Bot"')
        elif sys.platform == 'linux':
            # Linux
            logger.info("Executing Linux shutdown")
            os.system('sudo shutdown -h now')
        elif sys.platform == 'darwin':
            # macOS
            logger.info("Executing macOS shutdown")
            os.system('sudo shutdown -h now')
        else:
            logger.error(f"Unsupported platform: {sys.platform}")
            return False
        return True
    except Exception as e:
        logger.error(f"Shutdown command failed: {e}")
        return False


def restart_system():
    """Restart the system based on platform"""
    logger.info(f"Initiating system restart on {sys.platform}...")
    
    # Countdown
    for i in range(CONFIG['shutdown_delay'], 0, -1):
        logger.info(f"Restarting in {i} seconds...")
        time.sleep(1)
    
    logger.info("Executing restart command...")
    
    try:
        if sys.platform == 'win32':
            # Windows
            logger.info("Executing Windows restart")
            os.system('shutdown /r /t 1 /c "Remote restart via Discord Maid Bot"')
        elif sys.platform == 'linux':
            # Linux
            logger.info("Executing Linux restart")
            os.system('sudo shutdown -r now')
        elif sys.platform == 'darwin':
            # macOS
            logger.info("Executing macOS restart")
            os.system('sudo shutdown -r now')
        else:
            logger.error(f"Unsupported platform: {sys.platform}")
            return False
        return True
    except Exception as e:
        logger.error(f"Restart command failed: {e}")
        return False


@app.route('/shutdown', methods=['POST', 'GET'])
@require_api_key
def shutdown():
    """Handle shutdown request"""
    try:
        logger.info(f"Shutdown request received from {request.remote_addr}")
        
        # Start shutdown in separate thread to allow response to be sent
        shutdown_thread = threading.Thread(target=shutdown_system)
        shutdown_thread.daemon = True
        shutdown_thread.start()
        
        return jsonify({
            'status': 'success',
            'message': 'Shutdown initiated',
            'device': CONFIG['device_name'],
            'delay': CONFIG['shutdown_delay'],
            'timestamp': datetime.now().isoformat()
        }), 200
    
    except Exception as e:
        logger.error(f"Error processing shutdown request: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route('/restart', methods=['POST', 'GET'])
@require_api_key
def restart():
    """Handle restart request"""
    try:
        logger.info(f"Restart request received from {request.remote_addr}")
        
        # Start restart in separate thread to allow response to be sent
        restart_thread = threading.Thread(target=restart_system)
        restart_thread.daemon = True
        restart_thread.start()
        
        return jsonify({
            'status': 'success',
            'message': 'Restart initiated',
            'device': CONFIG['device_name'],
            'delay': CONFIG['shutdown_delay'],
            'timestamp': datetime.now().isoformat()
        }), 200
    
    except Exception as e:
        logger.error(f"Error processing restart request: {e}")
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route('/status', methods=['GET'])
def status():
    """Health check endpoint (no auth required)"""
    return jsonify({
        'status': 'online',
        'device': CONFIG['device_name'],
        'platform': sys.platform,
        'version': '1.0.0.0-beta',
        'timestamp': datetime.now().isoformat()
    }), 200


@app.route('/ping', methods=['GET'])
def ping():
    """Simple ping endpoint (no auth required)"""
    return jsonify({
        'pong': True,
        'device': CONFIG['device_name'],
        'timestamp': datetime.now().isoformat()
    }), 200


@app.route('/config', methods=['GET'])
@require_api_key
def get_config():
    """Get current configuration (auth required)"""
    safe_config = CONFIG.copy()
    safe_config['api_key'] = '***hidden***'
    return jsonify(safe_config), 200


def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(description='Discord Maid Bot Remote Shutdown Server')
    parser.add_argument('--port', type=int, help='Port to listen on')
    parser.add_argument('--api-key', help='API key for authentication')
    parser.add_argument('--device-name', help='Device name')
    parser.add_argument('--delay', type=int, help='Shutdown delay in seconds')
    parser.add_argument('--config', default='shutdown-config.json', help='Config file path')
    args = parser.parse_args()
    
    # Load config from file
    load_config(args.config)
    
    # Override with command line arguments
    if args.port:
        CONFIG['port'] = args.port
    if args.api_key:
        CONFIG['api_key'] = args.api_key
    if args.device_name:
        CONFIG['device_name'] = args.device_name
    if args.delay:
        CONFIG['shutdown_delay'] = args.delay
    
    # Save config
    save_config(args.config)
    
    # Log startup
    logger.info("=" * 60)
    logger.info("Discord Maid Bot - Remote Shutdown Server")
    logger.info("=" * 60)
    logger.info(f"Device: {CONFIG['device_name']}")
    logger.info(f"Platform: {sys.platform}")
    logger.info(f"Port: {CONFIG['port']}")
    logger.info(f"Shutdown Delay: {CONFIG['shutdown_delay']}s")
    logger.info(f"Log File: {CONFIG['log_file']}")
    logger.info("=" * 60)
    logger.info("Server ready! Listening for shutdown commands...")
    logger.info("Press Ctrl+C to stop")
    
    try:
        # Run Flask server
        app.run(
            host=CONFIG['host'],
            port=CONFIG['port'],
            debug=False,
            threaded=True
        )
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
    except Exception as e:
        logger.error(f"Server error: {e}")


if __name__ == '__main__':
    main()
