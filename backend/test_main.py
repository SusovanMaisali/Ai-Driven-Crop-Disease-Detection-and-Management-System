import os
import pytest
from fastapi.testclient import TestClient
from main import app, class_names, load_users, save_users

# Temporary override users file for testing
@pytest.fixture(autouse=True)
def setup_test_users(tmp_path):
    # Backup users.json if exists
    users_file = "history/users.json"
    backup_file = "history/users.json.bak"
    has_backup = False
    
    if os.path.exists(users_file):
        os.rename(users_file, backup_file)
        has_backup = True
        
    yield
    
    # Restore users.json
    if os.path.exists(users_file):
        os.remove(users_file)
    if has_backup:
        os.rename(backup_file, users_file)

client = TestClient(app)

def test_register_and_login():
    # Register a new user
    reg_response = client.post("/api/auth/register", json={
        "name": "Test Farmer",
        "mobile": "1234567890",
        "email": "test@cropsense.ai"
    })
    assert reg_response.status_code == 200
    assert reg_response.json()["success"] is True

    # Try duplicate registration
    reg_response_dup = client.post("/api/auth/register", json={
        "name": "Test Farmer",
        "mobile": "1234567890",
        "email": "test@cropsense.ai"
    })
    assert reg_response_dup.status_code == 400

    # Request OTP
    login_response = client.post("/api/auth/login", json={
        "mobile": "1234567890"
    })
    assert login_response.status_code == 200
    assert "otp" in login_response.json()
    otp = login_response.json()["otp"]

    # Verify OTP
    verify_response = client.post("/api/auth/verify-otp", json={
        "mobile": "1234567890",
        "otp": otp
    })
    assert verify_response.status_code == 200
    assert verify_response.json()["user"]["name"] == "Test Farmer"
    assert "history" in verify_response.json()

def test_weather_and_suggestions():
    # Get weather data (using mock or real Open-Meteo call)
    weather_resp = client.get("/api/weather?lat=22.5726&lon=88.3639")
    assert weather_resp.status_code == 200
    w_data = weather_resp.json()
    assert "weather" in w_data
    assert "agri" in w_data
    assert "alerts" in w_data

    # Get location autocomplete suggestions
    sugg_resp = client.get("/api/location/suggestions?query=Kolkata")
    assert sugg_resp.status_code == 200
    assert isinstance(sugg_resp.json(), list)

def test_chatbot_offline():
    # Chat endpoint
    chat_resp = client.post("/api/chat", json={
        "user_message": "How do I grow potatoes?",
        "lang_code": "en"
    })
    assert chat_resp.status_code == 200
    assert "reply" in chat_resp.json()
