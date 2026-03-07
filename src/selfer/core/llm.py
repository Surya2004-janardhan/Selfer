import os
import json
from typing import Optional, Any
from langchain_ollama import ChatOllama
from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_groq import ChatGroq
from langchain_anthropic import ChatAnthropic

try:
    from selfer.core.logger import logger
except ImportError:
    class DummyLogger:
        def info(self, msg): print(msg)
        def warning(self, msg): print(msg)
        def error(self, msg): print(msg)
    logger = DummyLogger()

class LLMFactory:
    """
    Factory pattern for managing dynamic fallback / override LLM provisioning,
    mimicking OpenClaw's robust multi-provider strategy.
    Defaults to Ollama (local) if cloud APIs are not strictly set.
    """
    
    @staticmethod
    def _get_config() -> dict:
        """Retrieves global repo configuration if initialized."""
        config_path = os.path.join(os.getcwd(), '.selfer', 'config.json')
        if os.path.exists(config_path):
            try:
                with open(config_path, 'r') as f:
                    return json.load(f)
            except Exception as e:
                logger.warning(f"Failed to read selfer config: {e}")
        return {}

    @classmethod
    def create_llm(cls, provider: Optional[str] = None, model_name: Optional[str] = None) -> Any:
        """
        Instantiates a ChatModel object. Reads from `.selfer/config.json` `llm` block 
        first, then falls back to ENV variables.
        """
        config = cls._get_config()
        llm_cfg = config.get("llm", {})
        
        provider = (provider or llm_cfg.get("provider") or "ollama").lower()
        model_name = model_name or llm_cfg.get("model")
        temperature = llm_cfg.get("temperature", 0.0)
        
        if provider == "ollama":
            base_url = llm_cfg.get("ollama_url") or os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
            model = model_name or "llama3"
            logger.info(f"Initializing Local Ollama model: {model} at {base_url}")
            return ChatOllama(model=model, base_url=base_url, temperature=temperature)
            
        elif provider == "openai":
            api_key = llm_cfg.get("openai_api_key") or os.getenv("OPENAI_API_KEY")
            if not api_key:
                logger.error("OPENAI_API_KEY missing. Falling back to Ollama.")
                return cls.create_llm("ollama")
            model = model_name or "gpt-4o"
            logger.info(f"Initializing Remote OpenAI model: {model}")
            return ChatOpenAI(model=model, api_key=api_key, temperature=temperature)
            
        elif provider in ("anthropic", "claude"):
            api_key = llm_cfg.get("anthropic_api_key") or os.getenv("ANTHROPIC_API_KEY")
            if not api_key:
                logger.error("ANTHROPIC_API_KEY missing. Falling back to Ollama.")
                return cls.create_llm("ollama")
            model = model_name or "claude-3-5-sonnet-20240620"
            logger.info(f"Initializing Remote Anthropic model: {model}")
            return ChatAnthropic(model=model, api_key=api_key, temperature=temperature)
            
        elif provider == "gemini" or provider == "google":
            api_key = llm_cfg.get("gemini_api_key") or os.getenv("GOOGLE_API_KEY")
            if not api_key:
                logger.error("GEMINI_API_KEY missing. Falling back to Ollama.")
                return cls.create_llm("ollama")
            model = model_name or "gemini-1.5-pro"
            logger.info(f"Initializing Remote Google Gemini model: {model}")
            return ChatGoogleGenerativeAI(model=model, google_api_key=api_key, temperature=temperature)
            
        elif provider == "groq":
            api_key = llm_cfg.get("groq_api_key") or os.getenv("GROQ_API_KEY")
            if not api_key:
                logger.error("GROQ_API_KEY missing. Falling back to Ollama.")
                return cls.create_llm("ollama")
            model = model_name or "llama3-70b-8192"
            logger.info(f"Initializing Groq API model: {model}")
            return ChatGroq(model=model, groq_api_key=api_key, temperature=temperature)
            
        else:
            logger.warning(f"Unknown provider '{provider}', defaulting to Ollama.")
            return cls.create_llm("ollama")


