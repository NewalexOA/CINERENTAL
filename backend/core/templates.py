"""Templates configuration module."""

from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

# Initialize templates
templates = Jinja2Templates(directory='frontend/templates')

# Initialize static files
static_files = StaticFiles(directory='frontend/static')
