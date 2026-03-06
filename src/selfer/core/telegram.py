import os
import json
import asyncio
from telegram import Update
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes

try:
    from selfer.core.logger import logger
except ImportError:
    class DummyLogger:
        def info(self, msg): print(msg)
        def warning(self, msg): print(msg)
        def error(self, msg): print(msg)
    logger = DummyLogger()

class TelegramInterface:
    """
    Handles background polling and asynchronous webhook-style interactions
    with the Selfer core, validating against authorized users.
    """
    
    def __init__(self):
        self.token = os.getenv("TELEGRAM_BOT_TOKEN")
        self.authorized_users = self._load_authorized_users()
        self.app = None

    def _load_authorized_users(self) -> list:
        config_path = os.path.join(os.getcwd(), ".selfer", "config.json")
        if os.path.exists(config_path):
            try:
                with open(config_path, "r") as f:
                    config = json.load(f)
                    return config.get("authorized_telegram_users", [])
            except Exception as e:
                logger.warning(f"Failed loading authorized users: {e}")
        return []

    def _is_authorized(self, username: str) -> bool:
        if not self.authorized_users:
            return True  # If no whitelist exists, allow all (or default block depending on strictness)
        return username in self.authorized_users

    async def start_command(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        username = update.effective_user.username
        if not self._is_authorized(username):
            await update.message.reply_text("Unauthorized access.")
            return
            
        await update.message.reply_text("Selfer is online and listening to your commands, Master.")

    async def handle_message(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        username = update.effective_user.username
        if not self._is_authorized(username):
            return
            
        text = update.message.text
        logger.info(f"Received Telegram instruction from {username}: {text}")
        
        # Future Hook: Route this text into the LangGraph orchestrator
        # For now, echo acknowledgment.
        await update.message.reply_text(f"Processing your request: {text[:20]}...")

    async def start_polling(self):
        if not self.token:
            logger.warning("TELEGRAM_BOT_TOKEN not found in environment. Telegram interface disabled.")
            return

        logger.info("Starting Telegram Bot Interface...")
        self.app = Application.builder().token(self.token).build()

        self.app.add_handler(CommandHandler("start", self.start_command))
        self.app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, self.handle_message))

        await self.app.initialize()
        await self.app.start()
        await self.app.updater.start_polling()
        
        # Keep the loop running until externally cancelled
        try:
            while True:
                await asyncio.sleep(3600)
        except asyncio.CancelledError:
            logger.info("Stopping Telegram Bot Interface...")
            await self.app.updater.stop()
            await self.app.stop()
            await self.app.shutdown()
