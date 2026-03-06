import os
import json
import asyncio
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import (
    Application, CommandHandler, MessageHandler,
    filters, ContextTypes, CallbackQueryHandler
)

try:
    from core.logger import logger
except ImportError:
    import logging
    logger = logging.getLogger("selfer")


class TelegramInterface:
    """
    Full-featured async Telegram Bot Interface with:
    - Authorization whitelist
    - /start, /status, /queue, /stop, /task, /agents, /help commands
    - Live progress message edits (simulating a spinner on Telegram)
    - Two-way integration with the Selfer Event Queue for parallel task execution
    """

    def __init__(self):
        self.token = os.getenv("TELEGRAM_BOT_TOKEN")
        self.authorized_users = self._load_authorized_users()
        self.app = None

    def _load_authorized_users(self) -> list:
        cfg_path = os.path.join(os.getcwd(), ".selfer", "config.json")
        if os.path.exists(cfg_path):
            try:
                with open(cfg_path) as f:
                    return json.load(f).get("authorized_telegram_users", [])
            except Exception as e:
                logger.warning(f"Failed loading authorized users: {e}")
        return []

    def _is_authorized(self, username: str) -> bool:
        if not self.authorized_users:
            return True  # Open mode if no whitelist configured
        return username in self.authorized_users

    async def _auth_check(self, update: Update) -> bool:
        username = update.effective_user.username or ""
        if not self._is_authorized(username):
            await update.message.reply_text("⛔ Unauthorized. Contact the system administrator.")
            return False
        return True

    # ─── Commands ────────────────────────────────────────────────────────────
    async def cmd_start(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        if not await self._auth_check(update):
            return
        keyboard = [
            [InlineKeyboardButton("📊 Status", callback_data="status"),
             InlineKeyboardButton("📋 Queue", callback_data="queue")],
            [InlineKeyboardButton("🤖 Agents", callback_data="agents"),
             InlineKeyboardButton("❓ Help", callback_data="help")],
        ]
        reply_markup = InlineKeyboardMarkup(keyboard)
        await update.message.reply_text(
            "⚡ *Selfer is online and ready, Master.*\n\nWhat shall I do?",
            parse_mode="Markdown",
            reply_markup=reply_markup,
        )

    async def cmd_help(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        if not await self._auth_check(update):
            return
        text = (
            "🤖 *Selfer Commands:*\n\n"
            "/start — Welcome screen\n"
            "/status — View all job statuses\n"
            "/queue — View pending/running jobs\n"
            "/stop — Cancel all queued jobs\n"
            "/task `<description>` — Enqueue a new task\n"
            "/agents — List all registered agents\n"
            "/help — Show this message\n\n"
            "Or just *send me a message* and I'll handle it!"
        )
        await update.message.reply_text(text, parse_mode="Markdown")

    async def cmd_status(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        if not await self._auth_check(update):
            return
        from core.queue import queue_manager
        jobs = queue_manager.get_all_jobs()
        if not jobs:
            await update.message.reply_text("📭 No jobs in the event queue.")
            return
        lines = []
        for j in jobs:
            icon = {"Pending": "⏳", "Running": "🔄", "Completed": "✅", "Failed": "❌"}.get(j["status"], "•")
            lines.append(f"{icon} `{j['id']}` — {j['description'][:40]} — *{j['status']}*")
        await update.message.reply_text("📊 *Job Queue Status:*\n\n" + "\n".join(lines), parse_mode="Markdown")

    async def cmd_queue(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        await self.cmd_status(update, context)

    async def cmd_stop(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        if not await self._auth_check(update):
            return
        from core.queue import queue_manager
        await queue_manager.stop_worker()
        queue_manager.start_worker()
        await update.message.reply_text("🛑 Event queue flushed and worker restarted.")

    async def cmd_task(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        if not await self._auth_check(update):
            return
        task_desc = " ".join(context.args)
        if not task_desc:
            await update.message.reply_text("Usage: /task <your task description>")
            return
        await self._run_task(update, task_desc)

    async def cmd_agents(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        if not await self._auth_check(update):
            return
        text = (
            "🤖 *Registered Selfer Agents:*\n\n"
            "• `router` — Intent classifier\n"
            "• `planner` — Task decomposer\n"
            "• `executor` — Step runner with tools\n"
            "• `tools` — File IO, Git, Shell, Search\n"
            "• `interrogate` — User question blocker\n"
            "• `summarizer` — Context compactor\n"
            "• `retriever` — ChromaDB RAG engine\n"
        )
        await update.message.reply_text(text, parse_mode="Markdown")

    # ─── Message Handler ───────────────────────────────────────────────────────
    async def handle_message(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        if not await self._auth_check(update):
            return
        text = update.message.text
        await self._run_task(update, text)

    async def _run_task(self, update: Update, task_desc: str):
        """Enqueues a LangGraph task and updates the Telegram message as progress happens."""
        from langchain_core.messages import HumanMessage
        from core.graph import run_agent_async
        from core.queue import queue_manager

        sent = await update.message.reply_text(f"⏳ Queuing task: _{task_desc[:60]}_...", parse_mode="Markdown")

        job_id = queue_manager.enqueue(
            description=task_desc,
            coro=run_agent_async([HumanMessage(content=task_desc)])
        )

        # Live-edit the Telegram message as the job progresses
        spinners = ["🌑", "🌒", "🌓", "🌔", "🌕", "🌖", "🌗", "🌘"]
        spin_i = 0
        while True:
            j = queue_manager.get_job_status(job_id)
            if j["status"] == "Running":
                spin = spinners[spin_i % len(spinners)]
                spin_i += 1
                try:
                    await sent.edit_text(
                        f"{spin} *Running* `[{job_id}]`\n_{task_desc[:60]}_",
                        parse_mode="Markdown"
                    )
                except Exception:
                    pass
            elif j["status"] == "Completed":
                result = j.get("result") or {}
                final_msgs = result.get("messages", [])
                reply_text = final_msgs[-1].content if final_msgs else "Task complete."
                await sent.edit_text(
                    f"✅ *Done* `[{job_id}]`\n\n{reply_text[:4000]}",
                    parse_mode="Markdown"
                )
                break
            elif j["status"] == "Failed":
                await sent.edit_text(
                    f"❌ *Failed* `[{job_id}]`\n\n{j.get('error', 'Unknown error')}",
                    parse_mode="Markdown"
                )
                break
            await asyncio.sleep(0.8)

    # ─── Inline Button Callbacks ───────────────────────────────────────────────
    async def callback_query_handler(self, update: Update, context: ContextTypes.DEFAULT_TYPE):
        query = update.callback_query
        await query.answer()
        data = query.data

        if data == "status":
            await self.cmd_status(query, context)
        elif data == "queue":
            await self.cmd_queue(query, context)
        elif data == "agents":
            await self.cmd_agents(query, context)
        elif data == "help":
            await self.cmd_help(query, context)

    # ─── Polling ──────────────────────────────────────────────────────────────
    async def start_polling(self):
        if not self.token:
            logger.warning("TELEGRAM_BOT_TOKEN not set. Telegram interface disabled.")
            return

        logger.info("Starting Full-Featured Telegram Bot...")
        self.app = Application.builder().token(self.token).build()

        self.app.add_handler(CommandHandler("start", self.cmd_start))
        self.app.add_handler(CommandHandler("help", self.cmd_help))
        self.app.add_handler(CommandHandler("status", self.cmd_status))
        self.app.add_handler(CommandHandler("queue", self.cmd_queue))
        self.app.add_handler(CommandHandler("stop", self.cmd_stop))
        self.app.add_handler(CommandHandler("task", self.cmd_task))
        self.app.add_handler(CommandHandler("agents", self.cmd_agents))
        self.app.add_handler(CallbackQueryHandler(self.callback_query_handler))
        self.app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, self.handle_message))

        await self.app.initialize()
        await self.app.start()
        await self.app.updater.start_polling()

        logger.info("Telegram bot is polling for updates.")

        try:
            while True:
                await asyncio.sleep(3600)
        except asyncio.CancelledError:
            logger.info("Stopping Telegram Bot...")
            await self.app.updater.stop()
            await self.app.stop()
            await self.app.shutdown()

