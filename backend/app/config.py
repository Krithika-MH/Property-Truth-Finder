from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

_env_file = str(Path(__file__).resolve().parent.parent / ".env")

class Settings(BaseSettings):
    TINYFISH_API_KEY: str = ""
    TINYFISH_BASE_URL: str = "https://agent.tinyfish.ai"
    TINYFISH_MOCK: int = 0
    MAX_CONCURRENT_RUNS: int = 3
    INVESTIGATION_TIMEOUT_SECONDS: int = 600
    
    LLM_PROVIDER: str = "gemini" # anthropic, gemini, or mock
    LLM_MODEL: str = "gemini-flash-latest"
    LLM_API_KEY: str = ""
    
    MANUAL_BASELINE_MINUTES: int = 45
    ALLOWED_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"
    DATA_DIR: str = "./data"
    
    @property
    def allowed_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]
    
    @property
    def is_mock_mode(self) -> bool:
        return bool(self.TINYFISH_MOCK) or not bool(self.TINYFISH_API_KEY)

    model_config = SettingsConfigDict(env_file=_env_file, extra="ignore")

settings = Settings()
