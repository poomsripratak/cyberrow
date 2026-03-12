"""Main entry point for the CyberRow Flow backend."""

import asyncio
import logging
import signal

from .server import Server

# Configure logging - only show warnings and errors
logging.basicConfig(
    level=logging.WARNING,
    format='%(levelname)s [%(name)s] %(message)s'
)


def main():
    """Run the backend server."""
    server = Server()

    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    def shutdown_handler():
        loop.create_task(server.stop())

    for sig in (signal.SIGINT, signal.SIGTERM):
        try:
            loop.add_signal_handler(sig, shutdown_handler)
        except NotImplementedError:
            signal.signal(sig, lambda s, f: shutdown_handler())

    try:
        loop.run_until_complete(server.start())
    except KeyboardInterrupt:
        pass
    finally:
        loop.run_until_complete(server.stop())
        loop.close()


if __name__ == "__main__":
    main()
