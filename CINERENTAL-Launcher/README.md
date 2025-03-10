# CINERENTAL Launcher

An application for managing CINERENTAL Docker containers. Makes it easy to start, stop, and monitor the status of containers without using the command line.

## Features

- Starting and stopping CINERENTAL containers
- Monitoring Docker and container status
- Viewing container logs
- Automatic opening of the application in a browser

## Requirements

- macOS 10.14 or newer
- Docker Desktop for Mac

## Installation

### For users

1. Download the latest version of the application from the [Releases](https://github.com/yourusername/CINERENTAL-Launcher/releases) section
2. Unpack the archive
3. Drag the `CINERENTAL Launcher.app` to the Applications folder
4. Launch the application

### For developers

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/CINERENTAL-Launcher.git
   cd CINERENTAL-Launcher
   ```

2. Create a virtual environment and install dependencies:
   ```
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

3. Run the application in development mode:
   ```
   python src/main.py
   ```

## Building the application

To build a standalone macOS application, py2app is used:

1. Install py2app:
   ```
   pip install py2app
   ```

2. Build the application:
   ```
   python setup.py py2app
   ```

3. The finished application will be located in the `dist/CINERENTAL Launcher.app` folder

## Configuration

By default, the application looks for the CINERENTAL project in the `~/Github/CINERENTAL` directory. If your project is located elsewhere, you can change the path in the `src/docker_manager.py` file.

## License

MIT
