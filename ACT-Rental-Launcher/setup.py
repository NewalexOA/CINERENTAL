"""Script for building the ACT-Rental Launcher application using py2app."""

from setuptools import setup

APP = ['main.py']
DATA_FILES = [
    ('assets', ['../assets/README.md']),
]
OPTIONS = {
    'argv_emulation': False,
    'packages': ['PyQt5'],
    'includes': [
        'sip',
        'typing',
        'sys',
        'os',
        'subprocess',
        'logging',
        'json',
        're',
        'datetime',
        'email',
    ],
    'excludes': [
        'tkinter',
        'distutils',
        'unittest',
        'test',
        'PySide2',
        'PySide6',
        'PyQt6',
    ],
    'strip': False,  # Disable stripping to help with debugging
    'iconfile': '../assets/icon.iconset/icon.icns',  # Icon file for the application
    'resources': [],
    'plist': {
        'CFBundleName': 'ACT-Rental Launcher',
        'CFBundleDisplayName': 'ACT-Rental Launcher',
        'CFBundleVersion': '1.0.0',
        'CFBundleShortVersionString': '1.0.0',
        'CFBundleIdentifier': 'com.act-rental.launcher',
        'NSHumanReadableCopyright': 'Copyright © 2023',
        'NSHighResolutionCapable': True,
        'NSRequiresAquaSystemAppearance': False,
        'LSBackgroundOnly': False,
        'LSEnvironment': {'PYTHONIOENCODING': 'UTF-8'},
        'LSUIElement': False,
        'NSPrincipalClass': 'NSApplication',
        'NSAppleScriptEnabled': False,
    },
}

setup(
    name='ACT-Rental Launcher',
    app=APP,
    data_files=DATA_FILES,
    options={'py2app': OPTIONS},
    setup_requires=['py2app'],
    install_requires=[
        'PyQt5',
    ],
)
